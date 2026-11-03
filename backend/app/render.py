"""Logika domain render Google Flow: token device, antrian, lease, kuota, dan hasil render (spec §4.2-4.3)."""

import hashlib
import re

from fastapi import HTTPException, status

from app.models import Asset


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
