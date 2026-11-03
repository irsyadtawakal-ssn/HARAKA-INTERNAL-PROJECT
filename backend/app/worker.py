import logging
import subprocess
import tempfile
import time
import uuid
from pathlib import Path

from celery import Celery
from sqlalchemy import select

from app import audit, ingest, media, storage
from app.config import get_settings
from app.db import get_sessionmaker
from app.models import Asset

celery_app = Celery("harka", broker=get_settings().redis_url, backend=get_settings().redis_url)
celery_app.conf.update(
    task_always_eager=get_settings().celery_eager,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_serializer="json",
    accept_content=["json"],
    beat_schedule={
        # expires: saat worker tertinggal, scan lama dibuang alih-alih menumpuk.
        "render-ingest-downloads": {"task": "render.ingest_downloads", "schedule": 5.0, "options": {"expires": 5}},
    },
)
log = logging.getLogger("harka.worker")


@celery_app.task(name="assets.process", bind=True, max_retries=3, default_retry_delay=30)
def process_asset(self, asset_id: str) -> None:
    """Checksum, deteksi duplikat, metadata (durasi/resolusi), dan thumbnail. Status akhir: ready / failed."""
    Session = get_sessionmaker()
    with Session() as db:
        asset = db.get(Asset, uuid.UUID(asset_id))
        if asset is None or asset.status != "processing":
            return
        try:
            with tempfile.TemporaryDirectory() as tmp:
                src = Path(tmp) / f"original.{asset.storage_key.rsplit('.', 1)[-1]}"
                storage.download(asset.storage_key, src)

                asset.checksum_sha256 = media.sha256_of(src)
                asset.duplicate_of_id = db.scalar(
                    select(Asset.id)
                    .where(Asset.checksum_sha256 == asset.checksum_sha256, Asset.id != asset.id)
                    .order_by(Asset.created_at)
                    .limit(1)
                )

                info = media.probe(src)
                asset.duration_s = info.duration_s if asset.type == "video" else None
                asset.width, asset.height = info.width, info.height

                thumb = Path(tmp) / "thumb.jpg"
                media.make_thumbnail(src, thumb, is_video=asset.type == "video", duration_s=info.duration_s)
                asset.thumbnail_key = f"assets/{asset.id}/thumb.jpg"
                storage.upload(thumb, asset.thumbnail_key, "image/jpeg")

            asset.status = "ready"
            asset.error = None
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
            # File rusak / bukan media yang valid: tidak ada gunanya dicoba ulang.
            asset.status = "failed"
            stderr = getattr(e, "stderr", None)
            detail = stderr.decode(errors="replace") if isinstance(stderr, bytes) else (stderr or str(e))
            asset.error = f"File tidak bisa dibaca sebagai media: {detail.strip()[:500]}"
        except Exception as e:
            db.rollback()
            if self.request.retries < self.max_retries:
                raise self.retry(exc=e)
            asset = db.get(Asset, uuid.UUID(asset_id))
            asset.status = "failed"
            asset.error = f"Gagal memproses aset: {e}"[:500]

        audit.record(
            db,
            actor_type="system",
            actor_id="worker",
            action="asset.processed",
            entity="asset",
            entity_id=asset.id,
            after={"status": asset.status, "duplicate_of_id": str(asset.duplicate_of_id) if asset.duplicate_of_id else None},
        )
        db.commit()


@celery_app.task(name="render.ingest_downloads")
def ingest_downloads() -> list[str]:
    """Pindai folder unduhan Chrome (FLOW_DOWNLOAD_DIR). Dijadwalkan celery beat tiap 5 detik."""
    folder = get_settings().flow_download_dir
    if not folder:
        return []
    root = Path(folder)
    if not root.is_dir():
        log.warning("FLOW_DOWNLOAD_DIR %s tidak ditemukan", folder)
        return []
    with get_sessionmaker()() as db:
        actions = ingest.scan_download_dir(db, root, now=time.time())
    for action in actions:
        log.info("ingest render: %s", action)
    return actions
