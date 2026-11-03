"""Endpoint untuk extension Google Flow di mesin render. Autentikasi lewat header X-Device-Token."""

from fastapi import APIRouter, Depends

from app.deps import get_render_device
from app.models import RenderDevice

router = APIRouter(prefix="/flow", tags=["flow"])


@router.get("/ping")
def ping(device: RenderDevice = Depends(get_render_device)) -> dict:
    return {"ok": True, "device": device.name}
