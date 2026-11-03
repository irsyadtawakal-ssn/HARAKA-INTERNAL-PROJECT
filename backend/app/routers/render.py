"""Pengelolaan render Google Flow oleh manusia: device, job, kuota. Selama pilot hanya owner (spec §3.5)."""

import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import audit
from app.db import get_db
from app.deps import client_ip, require_roles
from app.models import RENDER_STATUSES, Asset, RenderDevice, RenderJob, User
from app.render import hash_token, normalize_job_fields, validate_reference
from app.schemas import (
    RenderDeviceCreated,
    RenderDeviceIn,
    RenderDeviceOut,
    RenderDeviceUpdate,
    RenderJobIn,
    RenderJobOut,
)

router = APIRouter(tags=["render"])

can_manage_render = require_roles("owner")


@router.post("/render-devices", response_model=RenderDeviceCreated, status_code=status.HTTP_201_CREATED)
def create_device(
    body: RenderDeviceIn, request: Request, db: Session = Depends(get_db), user: User = Depends(can_manage_render)
) -> RenderDeviceCreated:
    token = secrets.token_urlsafe(32)
    device = RenderDevice(name=body.name, token_hash=hash_token(token))
    db.add(device)
    db.flush()
    audit.record(
        db, actor_type="user", actor_id=user.id, action="render_device.create", entity="render_device",
        entity_id=device.id, after={"name": device.name}, ip=client_ip(request),
    )
    db.commit()
    return RenderDeviceCreated(**RenderDeviceOut.model_validate(device).model_dump(), token=token)


@router.get("/render-devices", response_model=list[RenderDeviceOut])
def list_devices(db: Session = Depends(get_db), _: User = Depends(can_manage_render)) -> list[RenderDevice]:
    return list(db.scalars(select(RenderDevice).order_by(RenderDevice.created_at)))


@router.patch("/render-devices/{device_id}", response_model=RenderDeviceOut)
def update_device(
    device_id: uuid.UUID,
    body: RenderDeviceUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(can_manage_render),
) -> RenderDevice:
    device = db.get(RenderDevice, device_id)
    if device is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Device tidak ditemukan.")
    before = {"is_active": device.is_active}
    device.is_active = body.is_active
    audit.record(
        db, actor_type="user", actor_id=user.id, action="render_device.update", entity="render_device",
        entity_id=device.id, before=before, after={"is_active": device.is_active}, ip=client_ip(request),
    )
    db.commit()
    return device


def _get_job(db: Session, job_id: uuid.UUID) -> RenderJob:
    job = db.get(RenderJob, job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job render tidak ditemukan.")
    return job


@router.post("/render-jobs", response_model=RenderJobOut, status_code=status.HTTP_201_CREATED)
def create_job(
    body: RenderJobIn, request: Request, db: Session = Depends(get_db), user: User = Depends(can_manage_render)
) -> RenderJob:
    asset = db.get(Asset, body.reference_asset_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Aset referensi tidak ditemukan.")
    validate_reference(asset, body.mode)
    target_duration = normalize_job_fields(body.mode, body.slot, body.prompt, body.target_duration)
    job = RenderJob(
        mode=body.mode,
        slot=body.slot,
        prompt=body.prompt,
        target_duration=target_duration,
        reference_asset_id=asset.id,
        requested_by_id=user.id,
    )
    db.add(job)
    db.flush()
    audit.record(
        db, actor_type="user", actor_id=user.id, action="render_job.create", entity="render_job", entity_id=job.id,
        after={"mode": job.mode, "slot": job.slot, "reference_asset_id": str(asset.id)}, ip=client_ip(request),
    )
    db.commit()
    return job


@router.get("/render-jobs", response_model=list[RenderJobOut])
def list_jobs(
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(can_manage_render),
) -> list[RenderJob]:
    query = select(RenderJob).order_by(RenderJob.created_at.desc(), RenderJob.id.desc()).limit(100)
    if status_filter:
        if status_filter not in RENDER_STATUSES:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Status job tidak dikenal.")
        query = query.where(RenderJob.status == status_filter)
    return list(db.scalars(query))


@router.get("/render-jobs/{job_id}", response_model=RenderJobOut)
def get_job(job_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(can_manage_render)) -> RenderJob:
    return _get_job(db, job_id)
