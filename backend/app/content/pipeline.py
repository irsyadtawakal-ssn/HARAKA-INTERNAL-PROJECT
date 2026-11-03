"""Gerbang 1 dan perakitan job (spec §3.4): cek klaim, simpan script, buat render_jobs."""

import hashlib
import json
import logging
import re
import uuid
from collections.abc import Callable
from datetime import date

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app import audit
from app.content.analysis import AnalysisError, analyze_reference
from app.content.writer import DURATION_BY_TYPE, ScriptDraft, WriterError, flow_slot, write_script
from app.llm import LLMError
from app.models import Approval, Asset, AssetAnalysis, Claim, ContentJob, RenderJob, Script
from app.render import normalize_job_fields, validate_reference

log = logging.getLogger("harka.content")


def render_mode(content_type: str) -> str:
    return "talking_head" if content_type == "talking_head" else "broll"


def usable_claims(db: Session, today: date) -> list[Claim]:
    """Klaim yang boleh dipakai: approved dan dalam masa berlaku (kolom kosong = tidak dibatasi)."""
    return list(
        db.scalars(
            select(Claim)
            .where(
                Claim.status == "approved",
                or_(Claim.valid_from.is_(None), Claim.valid_from <= today),
                or_(Claim.valid_until.is_(None), Claim.valid_until >= today),
            )
            .order_by(Claim.created_at)
        )
    )


# Kata yang lazim dipakai sebagai klaim (legal, sertifikasi, janji hasil). Dicari di teks yang diucapkan/tampil agar
# gerbang tidak hanya percaya pada klaim yang dilaporkan sendiri oleh writer.
RISK_TOKENS = re.compile(r"bpom|halal|mui|sertifikaw*|dijamin|terbukti|klinis|iso|gmp|cpkb|d+s?%", re.I)


def find_new_claims(draft: ScriptDraft, usable: list[Claim], lookup: Callable[[str], Claim | None] | None = None) -> list[str]:
    """Klaim di luar library: teks baru dari writer, claim_id yang tidak boleh dipakai, dan kata berisiko di teks
    yang tidak tercakup klaim terdaftar. `lookup` memetakan id ke klaim agar yang kedaluwarsa/pensiun tampil dengan teksnya."""
    known = {str(c.id) for c in usable}
    library_text = " ".join(c.text.lower() for c in usable)
    found: list[str] = []
    for slot in draft.slots:
        for cid in slot.claim_ids:
            if cid in known:
                continue
            claim = lookup(cid) if lookup else None
            reason = None if claim is None else (claim.status if claim.status != "approved" else "kedaluwarsa")
            found.append(f"(id tidak dikenal) {cid}" if claim is None else f"(tidak berlaku: {reason}) {claim.text}")
        found += [text for text in slot.new_claims if text.strip()]
        found += _risky_tokens(f"{slot.slot}", [slot.dialog or "", slot.overlay_text], library_text)
    found += _risky_tokens("headline/caption", [draft.headline, draft.caption], library_text)
    return list(dict.fromkeys(found))


def _risky_tokens(where: str, texts: list[str], library_text: str) -> list[str]:
    tokens = {m.group(0).lower() for t in texts for m in RISK_TOKENS.finditer(t)}
    return [f"(terdeteksi otomatis) {tok} pada {where}" for tok in sorted(tokens) if tok not in library_text]


def _lookup(db: Session) -> Callable[[str], Claim | None]:
    def find(claim_id: str) -> Claim | None:
        try:
            return db.get(Claim, uuid.UUID(claim_id))
        except ValueError:
            return None

    return find


def _slot_text(draft: ScriptDraft, name: str) -> str:
    slot = next((s for s in draft.slots if s.slot == name), None)
    return (slot.dialog or slot.overlay_text) if slot else ""


def save_script(db: Session, job: ContentJob, draft: ScriptDraft, *, version: int, parent: Script | None) -> Script:
    script = Script(
        funnel=job.funnel,
        duration_s=DURATION_BY_TYPE[job.type],
        hooks=[{"slot": s.slot, "dialog": s.dialog, "overlay_text": s.overlay_text} for s in draft.slots if s.slot.startswith("hook")],
        body=_slot_text(draft, "body"),
        shot_list=[s.model_dump(mode="json") for s in draft.slots],
        caption=draft.caption,
        headline=draft.headline,
        cta=_slot_text(draft, "cta"),
        source_asset_ids=[a for a in (job.reference_asset_id, job.start_asset_id) if a],
        version=version,
        parent_script_id=parent.id if parent else None,
        agent_run_id=db.info.get("last_agent_run_id"),
        status="draft",
    )
    db.add(script)
    db.flush()
    return script


def enqueue_renders(db: Session, job: ContentJob, draft: ScriptDraft, start: Asset) -> list[RenderJob]:
    mode = render_mode(job.type)
    validate_reference(start, mode)
    jobs = []
    for s in draft.slots:
        target = normalize_job_fields(mode, flow_slot(mode, s.slot), s.flow_prompt, s.target_duration)
        jobs.append(
            RenderJob(
                mode=mode, slot=flow_slot(mode, s.slot), prompt=s.flow_prompt, target_duration=target,
                reference_asset_id=start.id, content_job_id=job.id, content_slot=s.slot, requested_by_id=job.requested_by_id,
            )
        )
    db.add_all(jobs)
    db.flush()
    return jobs


def apply_gate(db: Session, job: ContentJob, draft: ScriptDraft, start: Asset, analysis: AssetAnalysis) -> None:
    """Tanpa klaim baru: render langsung. Ada klaim baru: approval `claim` + versi alternatif tanpa klaim baru yang dirender."""
    first_run_id = db.info.get("last_agent_run_id")
    usable = usable_claims(db, date.today())
    lookup = _lookup(db)
    new_claims = find_new_claims(draft, usable, lookup)
    if not new_claims:
        with db.begin_nested():
            job.script_id = save_script(db, job, draft, version=1, parent=None).id
            enqueue_renders(db, job, draft, start)
        return

    # Alternatif dulu, di luar savepoint: panggilan LLM-nya berbayar dan agent_runs-nya harus tetap tercatat walau gagal.
    alt = write_script(
        db, content_type=job.type, funnel=job.funnel, analysis=analysis, mode=render_mode(job.type), claims=usable, forbid_new_claims=True
    )
    if find_new_claims(alt, usable, lookup):
        raise WriterError("Versi alternatif masih memuat klaim baru, padahal dilarang. Coba generate ulang.")
    alt_run_id = db.info.get("last_agent_run_id")
    # Savepoint: kegagalan menyimpan script/approval/render_jobs tidak boleh meninggalkan data setengah jadi.
    with db.begin_nested():
        _persist_pending(db, job, draft, alt, start, new_claims, first_run_id, alt_run_id)


def _persist_pending(
    db: Session, job: ContentJob, draft: ScriptDraft, alt: ScriptDraft, start: Asset, new_claims: list[str],
    first_run_id, alt_run_id,
) -> None:
    db.info["last_agent_run_id"] = first_run_id
    original = save_script(db, job, draft, version=1, parent=None)
    snapshot = {"script_id": str(original.id), "new_claims": new_claims}
    approval = Approval(
        subject_type="script", subject_id=original.id, action="claim", payload_snapshot=snapshot,
        snapshot_hash=hashlib.sha256(json.dumps(snapshot, sort_keys=True).encode()).hexdigest(),
        requested_by_agent_run_id=first_run_id,
    )
    db.add(approval)
    db.flush()
    db.info["last_agent_run_id"] = alt_run_id
    alternative = save_script(db, job, alt, version=2, parent=original)
    job.pending_script_id, job.script_id, job.claim_approval_id = original.id, alternative.id, approval.id
    enqueue_renders(db, job, alt, start)
    audit.record(
        db, actor_type="system", actor_id="content", action="content_job.claim_pending", entity="content_job",
        entity_id=job.id, after={"approval_id": str(approval.id), "new_claims": new_claims},
    )


def _set_status(db: Session, job: ContentJob, status: str, error: str | None = None) -> None:
    before = job.status
    job.status, job.error = status, error
    audit.record(
        db, actor_type="system", actor_id="content", action="content_job.status", entity="content_job", entity_id=job.id,
        before={"status": before}, after={"status": status, "error": error},
    )


def run_generate(db: Session, job_id: uuid.UUID) -> None:
    """Analisis -> writer -> gerbang 1 -> render_jobs. Hanya job `queued` yang jalan; panggilan ulang tidak berefek."""
    job = db.get(ContentJob, job_id, with_for_update=True)
    if job is None or job.status != "queued":
        db.rollback()
        return
    _set_status(db, job, "analyzing")
    db.commit()
    try:
        analysis, start = analyze_reference(db, job)
        job.start_asset_id = start.id
        _set_status(db, job, "writing")
        db.commit()
        draft = write_script(
            db, content_type=job.type, funnel=job.funnel, analysis=analysis, mode=render_mode(job.type),
            claims=usable_claims(db, date.today()),
        )
        apply_gate(db, job, draft, start, analysis)
        _set_status(db, job, "rendering")
    except (AnalysisError, WriterError, LLMError) as e:
        _set_status(db, job, "failed", getattr(e, "message", None) or str(e))
    except HTTPException as e:
        _set_status(db, job, "failed", str(e.detail))
    except Exception:
        # Galat tak terduga (S3, FFmpeg, data aneh dari LLM): job tidak boleh macet di analyzing/writing.
        log.exception("content.generate gagal untuk job %s", job_id)
        db.rollback()
        job = db.get(ContentJob, job_id)
        _set_status(db, job, "failed", "Terjadi galat internal saat memproses job. Coba ulang; bila berulang, hubungi admin.")
    db.commit()
