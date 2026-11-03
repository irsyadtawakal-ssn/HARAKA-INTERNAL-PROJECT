import os
import shutil
import time

from app import ingest as ingest_module
from app.ingest import scan_download_dir
from app.models import Asset
from app.worker import celery_app


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


def test_file_diklaim_sebelum_diunggah(db, tmp_path, downloading_job, media_dir, monkeypatch):
    # Scan yang tumpang-tindih tidak boleh melihat file yang sedang diunggah scan lain.
    _drop(media_dir / "clip.mp4", tmp_path / "Flow_video.mp4")
    real_upload = ingest_module.storage.upload

    def upload_while_checking(src, key, content_type):
        assert not (tmp_path / "Flow_video.mp4").exists(), "file belum diklaim saat diunggah"
        assert scan_download_dir(db, tmp_path, now=time.time()) == []
        real_upload(src, key, content_type)

    monkeypatch.setattr(ingest_module.storage, "upload", upload_while_checking)
    assert scan_download_dir(db, tmp_path, now=time.time()) == [f"attached:Flow_video.mp4:{downloading_job.id}"]
    assert (tmp_path / "processed" / "Flow_video.mp4").exists()


def test_nama_file_unduhan_menentukan_job(client, db, tmp_path, media_dir, flow_device, claimed_job, queued_jobs):
    # Job A sudah dilaporkan downloaded (nama file dicatat), job B sudah ikut downloading sebelum file A mendarat.
    dev = flow_device["headers"]
    client.post(f"/flow/jobs/{claimed_job.id}/status", headers=dev, json={"stage": "downloading", "message": "x"})
    client.post(f"/flow/jobs/{claimed_job.id}/status", headers=dev,
                json={"stage": "downloaded", "message": "x", "filename": "/srv/flow-downloads/video_A.mp4"})
    queued_jobs(1)
    job_b = client.post("/flow/claim", headers=dev).json()["job"]["job_id"]
    client.post(f"/flow/jobs/{job_b}/status", headers=dev, json={"stage": "downloading", "message": "x"})

    _drop(media_dir / "clip.mp4", tmp_path / "video_A.mp4")
    assert scan_download_dir(db, tmp_path, now=time.time()) == [f"attached:video_A.mp4:{claimed_job.id}"]
    _drop(media_dir / "clip.mp4", tmp_path / "video_B.mp4")
    assert scan_download_dir(db, tmp_path, now=time.time()) == [f"attached:video_B.mp4:{job_b}"]


def test_jadwal_ingest_kedaluwarsa_saat_worker_tertinggal():
    entry = celery_app.conf.beat_schedule["render-ingest-downloads"]
    assert entry["options"]["expires"] <= 5


def test_folder_proses_tidak_dipindai_ulang(db, tmp_path, media_dir):
    (tmp_path / "processed").mkdir()
    _drop(media_dir / "clip.mp4", tmp_path / "processed" / "lama.mp4")
    assert scan_download_dir(db, tmp_path, now=time.time()) == []
