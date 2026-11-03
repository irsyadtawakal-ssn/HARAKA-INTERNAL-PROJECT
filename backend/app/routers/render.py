"""Pengelolaan render Google Flow oleh manusia: device, job, kuota. Selama pilot hanya owner (spec §3.5)."""

import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import audit
from app.db import get_db
from app.deps import client_ip, require_roles
from app.models import RenderDevice, User
from app.render import hash_token
from app.schemas import RenderDeviceCreated, RenderDeviceIn, RenderDeviceOut, RenderDeviceUpdate

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
