import os
import shutil
import time

from app.ingest import scan_download_dir
from app.models import Asset


def _drop(src, dest, *, age_s: float = 10) -> None:
    shutil.copy(src, dest)
    t = time.time() - age_s
    os.utime(dest, (t, t))


def test_file_stabil_dipasang_ke_job_downloading(db, tmp_path, downloading_job, media_dir):
    _drop(media_dir / "clip.mp4", tmp_path / "Flow_video.mp4")
    actions = scan_download_dir(db, tmp_path, now=time.time())
    assert actions == [f"attached:Flow_video.mp4:{downloading_job.id}"]
    assert (tmp_path / "processed" / "Flow_video.mp4").exists()
    assert not (tmp_path / "Flow_video.mp4").exists()

    db.refresh(downloading_job)
    assert downloading_job.status == "done"
    asset = db.get(Asset, downloading_job.result_asset_id)
    assert asset.storage_key.startswith(f"renders/{downloading_job.id}/")
    assert asset.size_bytes == (media_dir / "clip.mp4").stat().st_size
    assert asset.status == "ready"  # process_asset eager


def test_unduhan_belum_selesai_dilewati(db, tmp_path, downloading_job, media_dir):
    _drop(media_dir / "clip.mp4", tmp_path / "Flow_video.mp4.crdownload")
    _drop(media_dir / "clip.mp4", tmp_path / "baru.mp4", age_s=1)
    assert scan_download_dir(db, tmp_path, now=time.time()) == []
    db.refresh(downloading_job)
    assert downloading_job.status == "downloading"
    assert (tmp_path / "baru.mp4").exists()


def test_file_tanpa_job_masuk_orphans(db, tmp_path, media_dir):
    _drop(media_dir / "clip.mp4", tmp_path / "manual.mp4")
    assert scan_download_dir(db, tmp_path, now=time.time()) == ["orphan:manual.mp4"]
    assert (tmp_path / "orphans" / "manual.mp4").exists()


def test_dua_job_downloading_tidak_dipasangkan(client, db, tmp_path, media_dir, downloading_job, second_device, queued_jobs):
    queued_jobs(1)
    job2 = client.post("/flow/claim", headers=second_device["headers"]).json()["job"]
    client.post(f"/flow/jobs/{job2['job_id']}/status", headers=second_device["headers"],
                json={"stage": "downloading", "message": "x"})
    _drop(media_dir / "clip.mp4", tmp_path / "siapa.mp4")
    assert scan_download_dir(db, tmp_path, now=time.time()) == ["ambiguous:siapa.mp4"]
    assert (tmp_path / "siapa.mp4").exists()


def test_folder_proses_tidak_dipindai_ulang(db, tmp_path, media_dir):
    (tmp_path / "processed").mkdir()
    _drop(media_dir / "clip.mp4", tmp_path / "processed" / "lama.mp4")
    assert scan_download_dir(db, tmp_path, now=time.time()) == []
