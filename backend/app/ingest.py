"""Jalur utama hasil render (spec §4.3): Chrome di mesin yang sama mengunduh 720p ke folder khusus,
worker memasangkan file baru ke satu-satunya job yang sedang `downloading`."""

from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import storage
from app.models import RenderJob
from app.render import create_result_asset, result_storage_key

# File yang mtime-nya lebih baru dari ini dianggap masih ditulis Chrome.
STABLE_AFTER_S = 5


def _move(path: Path, subdir: str) -> None:
    dest = path.parent / subdir
    dest.mkdir(exist_ok=True)
    path.rename(dest / path.name)


def scan_download_dir(db: Session, root: Path, now: float) -> list[str]:
    """Proses file *.mp4 yang sudah stabil di root (tidak rekursif). Mengembalikan daftar aksi untuk log."""
    from app.worker import process_asset  # impor di sini: worker juga mengimpor modul ini

    actions: list[str] = []
    for path in sorted(root.glob("*.mp4")):
        if path.stat().st_mtime > now - STABLE_AFTER_S:
            continue
        jobs = db.scalars(select(RenderJob).where(RenderJob.status == "downloading").with_for_update()).all()
        if not jobs:
            _move(path, "orphans")
            actions.append(f"orphan:{path.name}")
            continue
        if len(jobs) > 1:
            db.rollback()
            actions.append(f"ambiguous:{path.name}")
            continue
        job = jobs[0]
        key = result_storage_key(job.id)
        storage.upload(path, key, "video/mp4")
        asset = create_result_asset(db, job, storage_key=key, size_bytes=path.stat().st_size, filename=path.name)
        db.commit()
        _move(path, "processed")
        process_asset.delay(str(asset.id))
        actions.append(f"attached:{path.name}:{job.id}")
    return actions
