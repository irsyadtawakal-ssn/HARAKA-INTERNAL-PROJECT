from datetime import UTC, datetime, timedelta


def _report(client, device, job, stage, message="ok"):
    return client.post(f"/flow/jobs/{job.id}/status", headers=device["headers"], json={"stage": stage, "message": message})


def test_laporan_memperbarui_status_dan_heartbeat(client, db, flow_device, claimed_job):
    claimed_job.heartbeat_at = datetime.now(UTC) - timedelta(minutes=10)
    db.commit()
    for stage in ("uploading_ref", "generating", "downloading"):
        r = _report(client, flow_device, claimed_job, stage, f"tahap {stage}")
        assert r.status_code == 200 and r.json() == {"ok": True}
        db.refresh(claimed_job)
        assert claimed_job.status == stage and claimed_job.stage_message == f"tahap {stage}"
    assert claimed_job.heartbeat_at > datetime.now(UTC) - timedelta(minutes=1)


def test_downloaded_tidak_mengubah_status_downloading(client, db, flow_device, claimed_job):
    _report(client, flow_device, claimed_job, "downloading")
    assert _report(client, flow_device, claimed_job, "downloaded", "Download 720p dipicu").status_code == 200
    db.refresh(claimed_job)
    assert claimed_job.status == "downloading" and claimed_job.stage_message == "Download 720p dipicu"


def test_laporan_failed_captcha_masuk_antrian_lagi(client, db, flow_device, claimed_job):
    assert _report(client, flow_device, claimed_job, "failed", "captcha").status_code == 200
    db.refresh(claimed_job)
    assert claimed_job.status == "queued" and claimed_job.stage_message == "captcha"
    assert claimed_job.attempts == 1 and claimed_job.device_id is None


def test_stage_tidak_dikenal_422(client, flow_device, claimed_job):
    assert _report(client, flow_device, claimed_job, "done").status_code == 422


def test_device_lain_tidak_boleh_lapor_409(client, claimed_job, second_device):
    r = _report(client, second_device, claimed_job, "generating")
    assert r.status_code == 409
    assert r.json()["detail"] == "Job ini bukan milik device Anda atau sudah tidak aktif."


def test_lapor_job_tidak_ada_404(client, flow_device):
    r = client.post(
        "/flow/jobs/00000000-0000-0000-0000-000000000000/status",
        headers=flow_device["headers"], json={"stage": "generating", "message": "x"},
    )
    assert r.status_code == 404


def test_render_ulang_job_selesai(client, owner_headers, db, done_job):
    r = client.post(f"/render-jobs/{done_job.id}/retry", headers=owner_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "queued" and body["attempts"] == 0
    assert body["result_asset_id"] is None and body["error"] is None


def test_render_ulang_job_yang_masih_jalan_ditolak_409(client, owner_headers, claimed_job):
    assert client.post(f"/render-jobs/{claimed_job.id}/retry", headers=owner_headers).status_code == 409
