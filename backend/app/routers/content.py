"""Tab Pembuatan Konten: setting LLM, content_jobs, keputusan klaim. Selama pilot hanya owner (spec §3.5)."""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import audit, llm
from app.content.pipeline import enqueue_renders, render_mode
from app.content.writer import ScriptDraft, SlotDraft
from app.db import get_db
from app.deps import client_ip, require_roles
from app.models import Approval, Asset, Claim, ContentJob, GuardrailSetting, RenderJob, Script, User
from app.render import REFERENCE_STATUSES, TALKING_HEAD_LICENSES, validate_reference
from app.schemas import ContentJobIn, ContentJobOut, ContentLlmIn, ContentLlmOut, RenderJobOut, ScriptOut
from app.worker import generate_content

router = APIRouter(tags=["content"])

can_manage_content = require_roles("owner")
# Job yang diam selama ini dianggap macet (worker mati / galat tak tertangkap) dan boleh diulang.
STUCK_AFTER = timedelta(minutes=15)


@router.get("/settings/content-llm", response_model=ContentLlmOut)
def get_content_llm(db: Session = Depends(get_db), _: User = Depends(can_manage_content)) -> dict:
    return llm.get_models(db)


@router.put("/settings/content-llm", response_model=ContentLlmOut)
def put_content_llm(
    body: ContentLlmIn, request: Request, db: Session = Depends(get_db), user: User = Depends(can_manage_content)
) -> dict:
    before = llm.get_models(db)
    value = {"analysis_model": body.analysis_model.strip(), "writer_model": body.writer_model.strip()}
    db.merge(GuardrailSetting(key=llm.SETTING_KEY, value=value, updated_by_id=user.id))
    audit.record(
        db, actor_type="user", actor_id=user.id, action="content_llm.update", entity="guardrail_setting",
        entity_id=llm.SETTING_KEY, before=before, after=value, ip=client_ip(request),
    )
    db.commit()
    return value


def _out(db: Session, job: ContentJob) -> ContentJobOut:
    renders = db.scalars(
        select(RenderJob).where(RenderJob.content_job_id == job.id).order_by(RenderJob.created_at, RenderJob.content_slot)
    )
    return ContentJobOut.model_validate(job).model_copy(update={"render_jobs": [RenderJobOut.model_validate(r) for r in renders]})


def _get(db: Session, job_id: uuid.UUID, *, lock: bool = False) -> ContentJob:
    job = db.get(ContentJob, job_id, with_for_update=lock)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job konten tidak ditemukan.")
    return job


def _check_reference(asset: Asset, content_type: str) -> None:
    """Tolak sebelum biaya LLM keluar (spec §3.1): foto lewat aturan render Fase 1; video cukup soal lisensi."""
    mode = render_mode(content_type)
    if asset.type == "photo":
        validate_reference(asset, mode)
        return
    if asset.status not in REFERENCE_STATUSES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Video referensi belum selesai diproses atau sudah tidak aktif.")
    if mode == "talking_head" and asset.license_status not in TALKING_HEAD_LICENSES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Video orang untuk talking head wajib berizin kreator atau testimoni.")
    if asset.license_status == "unknown":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Lisensi referensi belum jelas. Lengkapi izin sebelum dipakai.")


@router.post("/content-jobs", response_model=ContentJobOut, status_code=status.HTTP_201_CREATED)
def create_content_job(
    body: ContentJobIn, request: Request, db: Session = Depends(get_db), user: User = Depends(can_manage_content)
) -> ContentJobOut:
    asset = db.get(Asset, body.reference_asset_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Aset referensi tidak ditemukan.")
    _check_reference(asset, body.type)
    job = ContentJob(type=body.type, funnel=body.funnel, reference_asset_id=asset.id, requested_by_id=user.id)
    db.add(job)
    db.flush()
    audit.record(
        db, actor_type="user", actor_id=user.id, action="content_job.create", entity="content_job", entity_id=job.id,
        after={"type": job.type, "funnel": job.funnel, "reference_asset_id": str(asset.id)}, ip=client_ip(request),
    )
    db.commit()
    generate_content.delay(str(job.id))
    db.refresh(job)
    return _out(db, job)


@router.get("/content-jobs", response_model=list[ContentJobOut])
def list_content_jobs(db: Session = Depends(get_db), _: User = Depends(can_manage_content)) -> list[ContentJobOut]:
    jobs = db.scalars(select(ContentJob).order_by(ContentJob.created_at.desc(), ContentJob.id.desc()).limit(100))
    return [_out(db, j) for j in jobs]


@router.get("/content-jobs/{job_id}", response_model=ContentJobOut)
def get_content_job(job_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(can_manage_content)) -> ContentJobOut:
    return _out(db, _get(db, job_id))


@router.get("/scripts/{script_id}", response_model=ScriptOut)
def get_script(script_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(can_manage_content)) -> Script:
    script = db.get(Script, script_id)
    if script is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Script tidak ditemukan.")
    return script


@router.post("/content-jobs/{job_id}/retry", response_model=ContentJobOut)
def retry_content_job(
    job_id: uuid.UUID, request: Request, db: Session = Depends(get_db), user: User = Depends(can_manage_content)
) -> ContentJobOut:
    job = _get(db, job_id, lock=True)
    stuck = job.status in ("queued", "analyzing", "writing") and datetime.now(UTC) - job.updated_at > STUCK_AFTER
    if job.status != "failed" and not stuck:
        raise HTTPException(status.HTTP_409_CONFLICT, "Hanya job yang gagal atau macet lebih dari 15 menit yang bisa diulang.")
    before = job.status
    job.status, job.error = "queued", None
    audit.record(
        db, actor_type="user", actor_id=user.id, action="content_job.retry", entity="content_job", entity_id=job.id,
        before={"status": before}, after={"status": "queued"}, ip=client_ip(request),
    )
    db.commit()
    generate_content.delay(str(job.id))
    db.refresh(job)
    return _out(db, job)


class ClaimDecisionIn(BaseModel):
    decision: Literal["approve", "reject"]
    note: str | None = Field(None, max_length=500)


@router.post("/content-jobs/{job_id}/claim-decision", response_model=ContentJobOut)
def decide_claims(
    job_id: uuid.UUID,
    body: ClaimDecisionIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(can_manage_content),
) -> ContentJobOut:
    job = _get(db, job_id, lock=True)
    approval = db.get(Approval, job.claim_approval_id, with_for_update=True) if job.claim_approval_id else None
    if approval is None or approval.status != "pending" or job.pending_script_id is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Tidak ada klaim baru yang menunggu keputusan untuk job ini.")
    original = db.get(Script, job.pending_script_id)
    new_claims = approval.payload_snapshot.get("new_claims", [])
    blocked = [c for c in new_claims if c.startswith(("(tidak berlaku", "(id tidak dikenal"))]
    if body.decision == "approve" and blocked:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Klaim ini tidak bisa disetujui: {'; '.join(blocked)}. Tolak, atau perbarui klaim di library lalu generate ulang.",
        )
    approval.status = "approved" if body.decision == "approve" else "rejected"
    approval.decided_by_id, approval.decided_at, approval.note = user.id, datetime.now(UTC), body.note
    if body.decision == "approve":
        for text in new_claims:
            # Entri berawalan "(" adalah temuan otomatis, bukan teks klaim yang bisa didaftarkan.
            if not text.startswith("("):
                db.add(Claim(category="portfolio", text=text, status="approved", approved_by_id=user.id))
        draft = ScriptDraft(
            headline=original.headline or "", caption=original.caption or "", slots=[SlotDraft(**s) for s in original.shot_list]
        )
        enqueue_renders(db, job, draft, db.get(Asset, job.start_asset_id))
        original.status = "approved"
    else:
        original.status = "rejected"
    original.reviewed_by_id, original.review_comment = user.id, body.note
    job.pending_script_id = None
    audit.record(
        db, actor_type="user", actor_id=user.id, action=f"content_job.claim_{approval.status}", entity="content_job",
        entity_id=job.id, after={"approval_id": str(approval.id)}, ip=client_ip(request),
    )
    db.commit()
    return _out(db, job)
