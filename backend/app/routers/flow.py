"""Endpoint untuk extension Google Flow di mesin render. Autentikasi lewat header X-Device-Token."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import storage
from app.db import get_db
from app.deps import get_render_device
from app.models import Asset, RenderDevice
from app.render import apply_status, claim_next, create_result_asset, get_device_job, result_storage_key
from app.schemas import (
    FlowClaimOut,
    FlowStatusIn,
    FlowTask,
    FlowUploadedIn,
    FlowUploadUrlOut,
    RenderJobOut,
)
from app.worker import process_asset

router = APIRouter(prefix="/flow", tags=["flow"])


@router.get("/ping")
def ping(device: RenderDevice = Depends(get_render_device)) -> dict:
    return {"ok": True, "device": device.name}


@router.post("/claim", response_model=FlowClaimOut)
def claim(db: Session = Depends(get_db), device: RenderDevice = Depends(get_render_device)) -> FlowClaimOut:
    job, reason = claim_next(db, device, datetime.now(UTC))
    db.commit()
    if job is None:
        return FlowClaimOut(job=None, reason=reason)
    reference = db.get(Asset, job.reference_asset_id)
    return FlowClaimOut(
        job=FlowTask(
            job_id=job.id,
            mode=job.mode,
            slot=job.slot,
            prompt=job.prompt,
            target_duration=job.target_duration,
            reference_asset_id=reference.id,
            reference_url=storage.presign_get(reference.storage_key),
            reference_filename=reference.original_filename,
        ),
        reason=reason,
    )


@router.post("/jobs/{job_id}/status")
def report_status(
    job_id: uuid.UUID,
    body: FlowStatusIn,
    db: Session = Depends(get_db),
    device: RenderDevice = Depends(get_render_device),
) -> dict:
    job = get_device_job(db, job_id, device)
    apply_status(db, job, body.stage, body.message, datetime.now(UTC), body.filename)
    db.commit()
    return {"ok": True}


def _downloading_job(db: Session, job_id: uuid.UUID, device: RenderDevice):
    job = get_device_job(db, job_id, device)
    if job.status != "downloading":
        raise HTTPException(status.HTTP_409_CONFLICT, "Upload hasil hanya untuk job yang sedang diunduh.")
    return job


@router.post("/jobs/{job_id}/upload-url", response_model=FlowUploadUrlOut)
def result_upload_url(
    job_id: uuid.UUID, db: Session = Depends(get_db), device: RenderDevice = Depends(get_render_device)
) -> FlowUploadUrlOut:
    """Jalur cadangan (spec §4.3): extension mengunggah blob video sendiri bila unduhan Chrome gagal."""
    job = _downloading_job(db, job_id, device)
    key = result_storage_key(job.id)
    return FlowUploadUrlOut(
        upload_url=storage.presign_put(key, "video/mp4"), upload_headers={"Content-Type": "video/mp4"}, storage_key=key
    )


@router.post("/jobs/{job_id}/uploaded", response_model=RenderJobOut)
def result_uploaded(
    job_id: uuid.UUID,
    body: FlowUploadedIn,
    db: Session = Depends(get_db),
    device: RenderDevice = Depends(get_render_device),
):
    job = _downloading_job(db, job_id, device)
    if not body.storage_key.startswith(f"renders/{job.id}/"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "storage_key bukan milik job ini.")
    obj = storage.head(body.storage_key)
    if obj is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "File hasil belum ada di storage.")
    asset = create_result_asset(
        db, job, storage_key=body.storage_key, size_bytes=obj["ContentLength"], filename=f"Haraka_{job.slot}_{job.id}.mp4"
    )
    w, h = body.width or 0, body.height or 0
    # 720p vertikal = 720x1280: sisi terpendek di bawah 720 berarti bukan file 720p asli.
    if 0 < min(w, h) < 720:
        job.stage_message = f"Selesai — resolusi di bawah 720p ({w}x{h}) — dari jalur cadangan"
    db.commit()
    process_asset.delay(str(asset.id))
    db.refresh(job)
    return job
