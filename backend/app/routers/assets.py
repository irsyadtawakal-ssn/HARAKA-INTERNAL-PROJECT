"""Asset Library (PRD Â§7.1). Alur upload:
1. POST /assets/upload-url  -> baris aset (status uploading) + presigned PUT URL
2. browser PUT file langsung ke object storage
3. POST /assets/{id}/complete -> metadata + lisensi, ukuran file dicek, job pemrosesan dijalankan
"""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import audit, storage
from app.config import get_settings
from app.db import get_db
from app.deps import client_ip, get_current_user, require_roles
from app.media import PHOTO_MIMES, VIDEO_MIMES
from app.models import Asset, User
from app.schemas import (
    AssetMetadataIn,
    AssetOut,
    AssetPage,
    AssetReviewIn,
    AssetUpdate,
    UploadUrlIn,
    UploadUrlOut,
)
from app.worker import process_asset

router = APIRouter(prefix="/assets", tags=["assets"])

can_upload = require_roles("owner", "marketing", "creator")
can_review = require_roles("owner", "marketing")
EDITORS = ("owner", "marketing")
# Status yang masih boleh diubah metadatanya oleh kreator pengunggah.
CREATOR_EDITABLE = ("uploading", "processing", "ready", "analyzed", "failed")


def _to_out(asset: Asset, *, with_original: bool = False) -> AssetOut:
    out = AssetOut.model_validate(asset)
    if asset.thumbnail_key:
        out.thumbnail_url = storage.presign_get(asset.thumbnail_key)
    if with_original and asset.status not in ("uploading",):
        out.original_url = storage.presign_get(asset.storage_key)
    return out


def _get_asset(db: Session, asset_id: uuid.UUID) -> Asset:
    asset = db.get(Asset, asset_id)
    if asset is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Aset tidak ditemukan.")
    return asset


def _ensure_can_edit(asset: Asset, user: User) -> None:
    if user.role in EDITORS:
        return
    if user.role == "creator" and asset.uploaded_by_id == user.id and asset.status in CREATOR_EDITABLE:
        return
    raise HTTPException(status.HTTP_403_FORBIDDEN, "Anda tidak boleh mengubah aset ini.")


def _snapshot(asset: Asset) -> dict:
    return {
        "status": asset.status,
        "funnel": asset.funnel,
        "license_status": asset.license_status,
        "license_expires_at": asset.license_expires_at.isoformat() if asset.license_expires_at else None,
        "creator_name": asset.creator_name,
    }


@router.post("/upload-url", response_model=UploadUrlOut, status_code=status.HTTP_201_CREATED)
def create_upload_url(
    body: UploadUrlIn, request: Request, db: Session = Depends(get_db), user: User = Depends(can_upload)
) -> UploadUrlOut:
    s = get_settings()
    mime = body.mime.lower()
    if mime in VIDEO_MIMES:
        asset_type, ext, limit = "video", VIDEO_MIMES[mime], s.max_video_bytes
    elif mime in PHOTO_MIMES:
        asset_type, ext, limit = "photo", PHOTO_MIMES[mime], s.max_photo_bytes
    else:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "Format tidak didukung. Gunakan video MP4/MOV atau foto JPG/PNG/WebP.",
        )
    if body.size_bytes > limit:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"Ukuran file melebihi batas {limit // (1024 * 1024)} MB."
        )

    version = 1
    if body.parent_asset_id:
        parent = _get_asset(db, body.parent_asset_id)
        version = (db.scalar(select(func.max(Asset.version)).where(Asset.parent_asset_id == parent.id)) or parent.version) + 1

    asset_id = uuid.uuid4()
    asset = Asset(
        id=asset_id,
        type=asset_type,
        status="uploading",
        storage_key=f"assets/{asset_id}/original.{ext}",
        original_filename=body.filename,
        mime=mime,
        size_bytes=body.size_bytes,
        uploaded_by_id=user.id,
        parent_asset_id=body.parent_asset_id,
        version=version,
    )
    db.add(asset)
    audit.record(
        db, actor_type="user", actor_id=user.id, action="asset.upload_url", entity="asset", entity_id=asset_id,
        after={"filename": body.filename, "mime": mime, "size_bytes": body.size_bytes}, ip=client_ip(request),
    )
    db.commit()
    return UploadUrlOut(
        asset_id=asset_id,
        upload_url=storage.presign_put(asset.storage_key, mime),
        upload_headers={"Content-Type": mime},
        expires_in=s.presign_ttl_seconds,
    )


@router.post("/{asset_id}/complete", response_model=AssetOut)
def complete_upload(
    asset_id: uuid.UUID,
    body: AssetMetadataIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(can_upload),
) -> AssetOut:
    asset = _get_asset(db, asset_id)
    _ensure_can_edit(asset, user)
    if asset.status != "uploading":
        raise HTTPException(status.HTTP_409_CONFLICT, "Upload aset ini sudah dikonfirmasi.")

    obj = storage.head(asset.storage_key)
    if obj is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File belum sampai di storage. Ulangi upload.")
    if obj["ContentLength"] != asset.size_bytes:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Ukuran file di storage ({obj['ContentLength']} byte) tidak sama dengan yang dideklarasikan ({asset.size_bytes} byte).",
        )

    for field, value in body.model_dump().items():
        setattr(asset, field, value)
    asset.status = "processing"
    audit.record(
        db, actor_type="user", actor_id=user.id, action="asset.complete", entity="asset", entity_id=asset.id,
        after=_snapshot(asset), ip=client_ip(request),
    )
    db.commit()

    process_asset.delay(str(asset.id))
    db.refresh(asset)
    return _to_out(asset)


@router.get("", response_model=AssetPage)
def list_assets(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    funnel: str | None = Query(default=None, pattern="^(A|B|both)$"),
    status_: str | None = Query(default=None, alias="status"),
    type_: str | None = Query(default=None, alias="type", pattern="^(video|photo)$"),
    license_status: str | None = None,
    include_uploading: bool = False,
    limit: int = Query(default=48, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AssetPage:
    q = select(Asset)
    if funnel:
        # Aset "both" relevan untuk funnel A maupun B.
        q = q.where(Asset.funnel.in_([funnel, "both"]) if funnel != "both" else Asset.funnel == "both")
    if status_:
        q = q.where(Asset.status == status_)
    elif not include_uploading:
        q = q.where(Asset.status != "uploading")
    if type_:
        q = q.where(Asset.type == type_)
    if license_status:
        q = q.where(Asset.license_status == license_status)

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    rows = db.scalars(q.order_by(Asset.created_at.desc(), Asset.id).limit(limit).offset(offset))
    return AssetPage(items=[_to_out(a) for a in rows], total=total)


@router.get("/{asset_id}", response_model=AssetOut)
def get_asset(asset_id: uuid.UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> AssetOut:
    return _to_out(_get_asset(db, asset_id), with_original=True)


@router.patch("/{asset_id}", response_model=AssetOut)
def update_asset(
    asset_id: uuid.UUID,
    body: AssetUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AssetOut:
    asset = _get_asset(db, asset_id)
    _ensure_can_edit(asset, user)
    before = _snapshot(asset)
    changes = body.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(asset, field, value)
    # Aset yang sudah disetujui lalu lisensinya diubah wajib direview ulang.
    if asset.status == "approved" and ("license_status" in changes or "license_expires_at" in changes):
        asset.status = "ready"
    audit.record(
        db, actor_type="user", actor_id=user.id, action="asset.update", entity="asset", entity_id=asset.id,
        before=before, after=_snapshot(asset), ip=client_ip(request),
    )
    db.commit()
    db.refresh(asset)
    return _to_out(asset, with_original=True)


@router.post("/{asset_id}/review", response_model=AssetOut)
def review_asset(
    asset_id: uuid.UUID,
    body: AssetReviewIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(can_review),
) -> AssetOut:
    asset = _get_asset(db, asset_id)
    before = _snapshot(asset)
    if body.action == "approve":
        # Aset yang pernah ditolak/diarsipkan boleh disetujui ulang (reviewer berubah pikiran).
        if asset.status in ("uploading", "processing"):
            raise HTTPException(status.HTTP_409_CONFLICT, "Aset belum selesai diproses.")
        if asset.status == "failed":
            raise HTTPException(status.HTTP_409_CONFLICT, "File aset ini gagal diproses. Unggah ulang file yang benar.")
        if asset.status == "approved":
            raise HTTPException(status.HTTP_409_CONFLICT, "Aset ini sudah disetujui.")
        # PRD A-03: aset tanpa izin pakai tidak boleh dipakai di materi publik.
        if asset.license_status == "unknown":
            raise HTTPException(status.HTTP_409_CONFLICT, "Isi status lisensi/izin pakai aset sebelum menyetujuinya.")
        if asset.license_expires_at and asset.license_expires_at < date.today():
            raise HTTPException(status.HTTP_409_CONFLICT, "Izin pakai aset ini sudah kedaluwarsa.")
        asset.status = "approved"
    elif body.action == "reject":
        if asset.status in ("uploading", "processing"):
            raise HTTPException(status.HTTP_409_CONFLICT, "Aset belum selesai diproses.")
        asset.status = "rejected"
    else:
        asset.status = "archived"
    if body.note:
        asset.notes = body.note
    audit.record(
        db, actor_type="user", actor_id=user.id, action=f"asset.{body.action}", entity="asset", entity_id=asset.id,
        before=before, after={**_snapshot(asset), "note": body.note}, ip=client_ip(request),
    )
    db.commit()
    db.refresh(asset)
    return _to_out(asset, with_original=True)
