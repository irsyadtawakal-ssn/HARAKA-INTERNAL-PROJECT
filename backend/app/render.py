"""Logika domain render Google Flow: token device, antrian, lease, kuota, dan hasil render (spec §4.2-4.3)."""

import hashlib
import re
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import audit
from app.config import get_settings
from app.models import RENDER_ACTIVE_STATUSES, Asset, AuditLog, GuardrailSetting, RenderDevice, RenderJob

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
        .where(RenderJob.status.in_(RENDER_ACTIVE_STATUSES), RenderJob.heartbeat_at < now - timedelta(minutes=minutes))
        .with_for_update(skip_locked=True)
    ).all()
    for job in stale:
        register_attempt_failure(db, job, f"Tidak ada kabar dari extension selama {minutes} menit")
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
