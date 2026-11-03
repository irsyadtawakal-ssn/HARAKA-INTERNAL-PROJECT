"""Logika domain render Google Flow: token device, antrian, lease, kuota, dan hasil render (spec §4.2-4.3)."""

import hashlib
import re
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import audit
from app.config import get_settings
from app.models import RENDER_ACTIVE_STATUSES, RENDER_INGEST_STATUSES, Asset, AuditLog, GuardrailSetting, RenderDevice, RenderJob

# WIB tanpa DST; dipakai untuk batas hari kuota (00:00 WIB).
WIB = timezone(timedelta(hours=7))
QUOTA_KEY = "flow_daily_clip_limit"


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# Status aset yang sudah selesai diproses dan boleh jadi referensi.
REFERENCE_STATUSES = ("ready", "analyzed", "approved")
# Wajah yang "bicara" di iklan wajib berizin (spec §3.1, PRD A-03).
TALKING_HEAD_LICENSES = ("testimonial_consented", "creator_licensed")
_DIALOG = re.compile(r'"[^"]+"')


def validate_reference(asset: Asset, mode: str) -> None:
    def reject(detail: str) -> None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail)

    if asset.type != "photo":
        reject("Referensi render harus foto. Video dipakai sebagai inspirasi di tahap analisis, bukan dikirim ke Flow.")
    if asset.status not in REFERENCE_STATUSES:
        reject("Foto referensi belum selesai diproses atau sudah tidak aktif.")
    if mode == "talking_head" and asset.license_status not in TALKING_HEAD_LICENSES:
        reject("Foto orang untuk talking head wajib berizin kreator atau testimoni.")
    if mode == "broll" and asset.license_status == "unknown":
        reject("Lisensi foto referensi belum jelas. Lengkapi izin sebelum dipakai.")


def normalize_job_fields(mode: str, slot: str, prompt: str, target_duration: str | None) -> str | None:
    """Cek kombinasi mode/slot/prompt dan kembalikan target_duration yang dipakai."""
    if mode == "broll":
        if slot != "broll":
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Job B-roll harus memakai slot broll.")
        return target_duration or "8s"
    if slot == "broll":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Slot broll hanya untuk mode B-roll.")
    if not _DIALOG.search(prompt):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, 'Prompt talking head wajib memuat dialog dalam tanda kutip, misalnya She says: "...".'
        )
    return target_duration


def daily_limit(db: Session) -> int:
    setting = db.get(GuardrailSetting, QUOTA_KEY)
    if setting and isinstance(setting.value, dict) and isinstance(setting.value.get("limit"), int):
        return setting.value["limit"]
    return get_settings().flow_default_daily_limit


def used_today(db: Session, now: datetime) -> int:
    """Jumlah klaim (= klip yang memakan kredit Flow) sejak 00:00 WIB hari ini."""
    start = now.astimezone(WIB).replace(hour=0, minute=0, second=0, microsecond=0)
    return db.scalar(
        select(func.count()).select_from(AuditLog).where(AuditLog.action == "render_job.claimed", AuditLog.at >= start)
    )


def register_attempt_failure(db: Session, job: RenderJob, reason: str) -> None:
    """Satu percobaan gagal: kembali ke antrian, atau failed bila jatah percobaan habis."""
    before = {"status": job.status, "attempts": job.attempts}
    job.download_filename = None
    if job.attempts < get_settings().flow_max_attempts:
        job.status = "queued"
        job.device_id = None
        job.stage_message = reason
    else:
        job.status = "failed"
        job.error = reason
        job.stage_message = reason
    audit.record(
        db, actor_type="system", actor_id="render", action="render_job.attempt_failed", entity="render_job",
        entity_id=job.id, before=before, after={"status": job.status, "reason": reason},
    )


def requeue_stale(db: Session, now: datetime) -> int:
    minutes = get_settings().flow_lease_minutes
    stale = db.scalars(
        select(RenderJob)
        .where(
            RenderJob.status.in_((*RENDER_ACTIVE_STATUSES, "downloaded")),
            RenderJob.heartbeat_at < now - timedelta(minutes=minutes),
        )
        .with_for_update(skip_locked=True)
    ).all()
    for job in stale:
        if job.status == "downloaded":
            reason = f"File hasil tidak muncul di folder unduhan selama {minutes} menit"
        else:
            reason = f"Tidak ada kabar dari extension selama {minutes} menit"
        register_attempt_failure(db, job, reason)
    return len(stale)


def claim_next(db: Session, device: RenderDevice, now: datetime) -> tuple[RenderJob | None, str]:
    """Kunci satu job queued tertua untuk device. Reason: ok | empty | quota. Pemanggil yang commit."""
    # Lease habis lebih dulu: alasan kegagalannya lebih jelas daripada "klaim ulang".
    requeue_stale(db, now)
    own_active = db.scalars(
        select(RenderJob)
        .where(RenderJob.device_id == device.id, RenderJob.status.in_(RENDER_ACTIVE_STATUSES))
        .with_for_update()
    ).all()
    for job in own_active:
        register_attempt_failure(db, job, "Device mengklaim ulang (Chrome/extension restart)")
    db.flush()

    if used_today(db, now) >= daily_limit(db):
        return None, "quota"
    job = db.scalar(
        select(RenderJob)
        .where(RenderJob.status == "queued")
        .order_by(RenderJob.created_at, RenderJob.id)
        .limit(1)
        .with_for_update(skip_locked=True)
    )
    if job is None:
        return None, "empty"
    job.status = "claimed"
    job.attempts += 1
    job.device_id = device.id
    job.claimed_at = job.heartbeat_at = now
    job.stage_message = "Diambil extension"
    audit.record(
        db, actor_type="system", actor_id=f"device:{device.id}", action="render_job.claimed", entity="render_job",
        entity_id=job.id, after={"attempt": job.attempts},
    )
    return job, "ok"


def get_device_job(db: Session, job_id, device: RenderDevice) -> RenderJob:
    """Job aktif milik device ini, dikunci untuk diubah. 404 bila tidak ada, 409 bila bukan miliknya / tidak aktif."""
    job = db.get(RenderJob, job_id, with_for_update=True)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job render tidak ditemukan.")
    if job.device_id != device.id or job.status not in RENDER_ACTIVE_STATUSES:
        raise HTTPException(status.HTTP_409_CONFLICT, "Job ini bukan milik device Anda atau sudah tidak aktif.")
    return job


def apply_status(
    db: Session, job: RenderJob, stage: str, message: str, now: datetime, filename: str | None = None
) -> None:
    job.heartbeat_at = now
    if stage == "downloaded" and filename:
        # Chrome di Windows melapor path dengan "\", di Linux dengan "/".
        job.download_filename = re.split(r"[\\/]", filename)[-1][:255]
    job.stage_message = message
    if stage == "failed":
        register_attempt_failure(db, job, message or "Extension melaporkan gagal")
    else:
        # "downloaded" melepas job dari device (klaim berikutnya tidak menggugurkannya); ingest yang menyelesaikan.
        job.status = stage


def reset_for_retry(db: Session, job: RenderJob) -> None:
    if job.status not in ("failed", "done"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Job masih berjalan; render ulang hanya untuk job selesai atau gagal.")
    job.status = "queued"
    job.download_filename = None
    job.attempts = 0
    job.error = None
    job.result_asset_id = None
    job.device_id = None
    job.stage_message = "Dijadwalkan render ulang"


def result_storage_key(job_id) -> str:
    return f"renders/{job_id}/{uuid.uuid4()}.mp4"


def create_result_asset(db: Session, job: RenderJob, *, storage_key: str, size_bytes: int, filename: str) -> Asset:
    """Klip hasil Flow jadi aset turunan foto referensi. Pemanggil commit lalu menjalankan process_asset."""
    reference = db.get(Asset, job.reference_asset_id)
    asset = Asset(
        type="video",
        status="processing",
        storage_key=storage_key,
        original_filename=filename,
        mime="video/mp4",
        size_bytes=size_bytes,
        uploaded_by_id=job.requested_by_id,
        license_status="internal",
        parent_asset_id=reference.id,
        funnel=reference.funnel,
        notes=f"Render Google Flow ({job.mode}/{job.slot}) dari job {job.id}",
    )
    db.add(asset)
    db.flush()
    job.status = "done"
    job.result_asset_id = asset.id
    job.stage_message = "Selesai"
    job.error = None
    audit.record(
        db, actor_type="system", actor_id="render", action="render_job.done", entity="render_job", entity_id=job.id,
        after={"result_asset_id": str(asset.id), "storage_key": storage_key},
    )
    return asset
