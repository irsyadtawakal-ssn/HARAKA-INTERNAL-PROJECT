import uuid

import httpx

from app.models import Asset


def _upload_clip(client, dev, job, media_dir) -> str:
    r = client.post(f"/flow/jobs/{job.id}/upload-url", headers=dev)
    assert r.status_code == 200, r.text
    t = r.json()
    put = httpx.put(t["upload_url"], content=(media_dir / "clip.mp4").read_bytes(), headers=t["upload_headers"])
    assert put.status_code == 200, put.text
    return t["storage_key"]


def test_upload_cadangan_membuat_aset_turunan_referensi(client, db, flow_device, downloading_job, media_dir, photo_asset):
    dev = flow_device["headers"]
    key = _upload_clip(client, dev, downloading_job, media_dir)
    r = client.post(f"/flow/jobs/{downloading_job.id}/uploaded", headers=dev,
                    json={"storage_key": key, "width": 720, "height": 1280})
    assert r.status_code == 200, r.text
    job = r.json()
    assert job["status"] == "done" and job["stage_message"] == "Selesai"

    asset = db.get(Asset, uuid.UUID(job["result_asset_id"]))
    assert asset.type == "video" and asset.storage_key == key
    assert asset.parent_asset_id == photo_asset.id and asset.license_status == "internal"
    assert asset.funnel == photo_asset.funnel and asset.uploaded_by_id == downloading_job.requested_by_id
    assert asset.status == "ready"  # process_asset jalan eager di tes


def test_uploaded_tanpa_file_di_storage_ditolak_422(client, flow_device, downloading_job):
    dev = flow_device["headers"]
    key = client.post(f"/flow/jobs/{downloading_job.id}/upload-url", headers=dev).json()["storage_key"]
    r = client.post(f"/flow/jobs/{downloading_job.id}/uploaded", headers=dev, json={"storage_key": key})
    assert r.status_code == 422


def test_storage_key_job_lain_ditolak_422(client, flow_device, downloading_job):
    r = client.post(f"/flow/jobs/{downloading_job.id}/uploaded", headers=flow_device["headers"],
                    json={"storage_key": "assets/lain/original.mp4"})
    assert r.status_code == 422


def test_resolusi_rendah_diberi_tanda(client, db, flow_device, downloading_job, media_dir):
    dev = flow_device["headers"]
    key = _upload_clip(client, dev, downloading_job, media_dir)
    r = client.post(f"/flow/jobs/{downloading_job.id}/uploaded", headers=dev,
                    json={"storage_key": key, "width": 360, "height": 640})
    assert r.status_code == 200, r.text
    assert "di bawah 720p (360x640)" in r.json()["stage_message"]


def test_upload_url_hanya_untuk_job_downloading(client, flow_device, claimed_job):
    r = client.post(f"/flow/jobs/{claimed_job.id}/upload-url", headers=flow_device["headers"])
    assert r.status_code == 409
