"""Endpoint untuk extension Google Flow di mesin render. Autentikasi lewat header X-Device-Token."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import storage
from app.db import get_db
from app.deps import get_render_device
from app.models import Asset, RenderDevice
from app.render import apply_status, claim_next, get_device_job
from app.schemas import FlowClaimOut, FlowStatusIn, FlowTask

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
    apply_status(db, job, body.stage, body.message, datetime.now(UTC))
    db.commit()
    return {"ok": True}
