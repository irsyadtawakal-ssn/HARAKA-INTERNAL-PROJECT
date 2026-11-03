"""Gerbang 1 dan perakitan job (spec §3.4): cek klaim, simpan script, buat render_jobs."""

import hashlib
import json
from datetime import date

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app import audit
from app.content.writer import DURATION_BY_TYPE, ScriptDraft, WriterError, flow_slot, write_script
from app.models import Approval, Asset, AssetAnalysis, Claim, ContentJob, RenderJob, Script
from app.render import normalize_job_fields, validate_reference


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


def find_new_claims(draft: ScriptDraft, usable: list[Claim]) -> list[str]:
    """Klaim di luar library: teks baru dari writer, atau claim_id yang tidak ada di daftar yang boleh dipakai."""
    known = {str(c.id) for c in usable}
    found: list[str] = []
    for slot in draft.slots:
        found += [f"(id tidak dikenal) {cid}" for cid in slot.claim_ids if cid not in known]
        found += [text for text in slot.new_claims if text.strip()]
    return list(dict.fromkeys(found))


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
    new_claims = find_new_claims(draft, usable)
    if not new_claims:
        job.script_id = save_script(db, job, draft, version=1, parent=None).id
        enqueue_renders(db, job, draft, start)
        return

    # Alternatif dulu: bila gagal, tidak ada script/approval setengah jadi yang tersisa.
    alt = write_script(
        db, content_type=job.type, funnel=job.funnel, analysis=analysis, mode=render_mode(job.type), claims=usable, forbid_new_claims=True
    )
    if find_new_claims(alt, usable):
        raise WriterError("Versi alternatif masih memuat klaim baru, padahal dilarang. Coba generate ulang.")
    alt_run_id = db.info.get("last_agent_run_id")

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
