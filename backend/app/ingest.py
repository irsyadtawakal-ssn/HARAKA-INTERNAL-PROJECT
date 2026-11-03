"""Jalur utama hasil render (spec §4.3): Chrome di mesin yang sama mengunduh 720p ke folder khusus,
worker memasangkan file baru ke satu-satunya job yang sedang diunduh (`downloading` / `downloaded`)."""

from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import storage
from app.models import RENDER_INGEST_STATUSES, RenderJob
from app.render import create_result_asset, result_storage_key

# File yang mtime-nya lebih baru dari ini dianggap masih ditulis Chrome.
STABLE_AFTER_S = 5
CLAIM_SUFFIX = ".ingesting"


def _move(path: Path, subdir: str, name: str) -> None:
    dest = path.parent / subdir
    dest.mkdir(exist_ok=True)
    path.rename(dest / name)


def scan_download_dir(db: Session, root: Path, now: float) -> list[str]:
    """Proses file *.mp4 yang sudah stabil di root (tidak rekursif). Mengembalikan daftar aksi untuk log."""
    from app.worker import process_asset  # impor di sini: worker juga mengimpor modul ini

    actions: list[str] = []
    for path in sorted(root.glob("*.mp4")):
        name = path.name
        try:
            if path.stat().st_mtime > now - STABLE_AFTER_S:
                continue
            # Klaim file lewat rename atomik dulu, supaya scan lain yang tumpang-tindih tidak ikut memprosesnya.
            claimed = path.rename(path.with_name(name + CLAIM_SUFFIX))
        except FileNotFoundError:
            continue
        candidates = db.scalars(
            select(RenderJob)
            .where(RenderJob.status.in_(RENDER_INGEST_STATUSES))
            .with_for_update()
            # Baris yang dikunci harus dibaca ulang, bukan diambil dari cache sesi.
            .execution_options(populate_existing=True)
        ).all()
        # Nama file yang dilaporkan extension menang; tanpa itu, hanya job yang belum melapor nama file.
        jobs = [j for j in candidates if j.download_filename == name] or [
            j for j in candidates if not j.download_filename
        ]
        if not jobs:
            db.rollback()
            _move(claimed, "orphans", name)
            actions.append(f"orphan:{name}")
            continue
        if len(jobs) > 1:
            db.rollback()
            claimed.rename(path)
            actions.append(f"ambiguous:{name}")
            continue
        job = jobs[0]
        key = result_storage_key(job.id)
        try:
            storage.upload(claimed, key, "video/mp4")
            asset = create_result_asset(db, job, storage_key=key, size_bytes=claimed.stat().st_size, filename=name)
            db.commit()
        except Exception:
            db.rollback()
            claimed.rename(path)  # coba lagi di scan berikutnya
            raise
        process_asset.delay(str(asset.id))
        _move(claimed, "processed", name)
        actions.append(f"attached:{name}:{job.id}")
    return actions
