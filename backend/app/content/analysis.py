"""Analisis referensi (spec §3.1, §4.1): foto langsung dilihat model; video diwakili frame kunci, bukan filenya."""

import base64
import tempfile
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import llm, media, storage
from app.config import get_settings
from app.models import Asset, AssetAnalysis, ContentJob

PROMPT_VERSION = "analysis-v1"
FOOTAGE_TYPES = ("person", "product", "factory", "other")
FRAME_COUNT = 6

SYSTEM_PROMPT = (
    "Kamu analis konten iklan maklon skincare. Lihat gambar referensi (untuk video: frame berurutan) dan balas HANYA JSON: "
    '{"footage_type": "person|product|factory|other", "best_frame": <indeks frame terbaik untuk start frame video, mulai 0>, '
    '"hook_3s": "<hook 3 detik pertama>", "key_message": "<pesan utama>", "tags": ["..."], "quality": {"catatan": "..."}}. '
    "Jangan mengarang klaim yang tidak terlihat."
)


class AnalysisError(Exception):
    pass


def _image_part(path: Path) -> dict:
    data = base64.b64encode(path.read_bytes()).decode()
    return {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{data}"}}


def _existing(db: Session, ref: Asset) -> tuple[AssetAnalysis, Asset] | None:
    found = db.scalar(select(AssetAnalysis).where(AssetAnalysis.asset_id == ref.id).order_by(AssetAnalysis.created_at.desc()))
    if found is None:
        return None
    if ref.type == "photo":
        return found, ref
    start_id = (found.quality or {}).get("start_asset_id")
    start = db.get(Asset, uuid.UUID(start_id)) if start_id else None
    return (found, start) if start else None


def analyze_reference(db: Session, job: ContentJob) -> tuple[AssetAnalysis, Asset]:
    """Kembalikan analisis dan aset foto yang dikirim ke Flow (foto itu sendiri, atau frame terbaik video)."""
    ref = db.get(Asset, job.reference_asset_id)
    if (reused := _existing(db, ref)) is not None:
        return reused
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        src = tmp_dir / f"ref.{ref.storage_key.rsplit('.', 1)[-1]}"
        storage.download(ref.storage_key, src)
        if ref.type == "video":
            frames = media.extract_frames(src, tmp_dir, FRAME_COUNT)
            if not frames:
                raise AnalysisError("Tidak ada frame yang bisa diambil dari video referensi. Pastikan file videonya tidak rusak.")
            transcript = llm.transcribe(db, src)
        else:
            thumb = tmp_dir / "ref_thumb.jpg"
            media.make_thumbnail(src, thumb, is_video=False, duration_s=None)
            frames, transcript = [thumb], None

        content = [{"type": "text", "text": f"Tipe konten: {job.type}. Funnel {job.funnel}." + (f"\nTranskrip audio: {transcript}" if transcript else "")}]
        content += [_image_part(f) for f in frames]
        result = llm.complete(
            db, agent="content_analysis", slot="analysis", prompt_version=PROMPT_VERSION,
            messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": content}],
        )
        if not isinstance(result, dict):
            raise AnalysisError("Hasil analisis referensi tidak berbentuk objek JSON.")
        footage = result.get("footage_type") if result.get("footage_type") in FOOTAGE_TYPES else "other"
        best = result.get("best_frame")
        best = best if isinstance(best, int) and 0 <= best < len(frames) else len(frames) // 2

        quality = dict(result.get("quality") or {})
        start = ref
        if ref.type == "video":
            start = _store_frame(db, job, ref, frames[best])
            quality["start_asset_id"] = str(start.id)
        found = AssetAnalysis(
            asset_id=ref.id,
            agent_run_id=db.info.get("last_agent_run_id"),
            transcript=transcript,
            hook_3s=result.get("hook_3s"),
            key_message=result.get("key_message"),
            footage_type=footage,
            quality=quality,
            tags=[str(t) for t in result.get("tags") or []],
        )
        db.add(found)
        db.flush()
        return found, start


def _store_frame(db: Session, job: ContentJob, video: Asset, frame: Path) -> Asset:
    asset_id = uuid.uuid4()
    key = f"assets/{asset_id}/original.jpg"
    storage.upload(frame, key, "image/jpeg")
    info = media.probe(frame)
    start = Asset(
        id=asset_id, type="photo", status="ready", storage_key=key, original_filename=f"frame-{video.id}.jpg",
        mime="image/jpeg", size_bytes=frame.stat().st_size, width=info.width, height=info.height,
        uploaded_by_id=job.requested_by_id, license_status=video.license_status, parent_asset_id=video.id,
        funnel=video.funnel or job.funnel, notes="Frame terbaik dari video referensi (start frame Flow)",
    )
    db.add(start)
    db.flush()
    return start
