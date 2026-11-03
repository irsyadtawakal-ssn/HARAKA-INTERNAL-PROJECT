import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.models import AuditLog, RenderJob
from app.render import used_today


def _claim(client, device) -> dict:
    r = client.post("/flow/claim", headers=device["headers"])
    assert r.status_code == 200, r.text
    return r.json()


def test_klaim_mengambil_job_tertua_dan_menguncinya(client, db, flow_device, make_device, queued_jobs):
    oldest, newer = queued_jobs(2)
    got = _claim(client, flow_device)
    assert got["reason"] == "ok"
    task = got["job"]
    assert task["job_id"] == str(oldest.id)
    assert task["mode"] == "talking_head" and task["slot"] == "hook" and task["prompt"] == oldest.prompt
    assert task["reference_url"].startswith("http") and task["reference_filename"] == "avatar.jpg"
    # Identitas foto untuk extension: dua aset dengan nama file sama tidak boleh dianggap foto yang sama.
    assert task["reference_asset_id"] == str(oldest.reference_asset_id)

    db.refresh(oldest)
    assert oldest.status == "claimed" and oldest.attempts == 1 and oldest.device_id == flow_device["id"]
    assert oldest.claimed_at is not None and oldest.heartbeat_at is not None

    other = make_device("VPS Flow 2")
    assert _claim(client, other)["job"]["job_id"] == str(newer.id)


def test_antrian_kosong_reason_empty(client, flow_device):
    assert _claim(client, flow_device) == {"job": None, "reason": "empty"}


def test_kuota_habis_job_tetap_queued(client, db, flow_device, make_device, queued_jobs, set_limit):
    _, second = queued_jobs(2)
    set_limit(1)
    assert _claim(client, flow_device)["job"] is not None
    assert _claim(client, make_device("VPS Flow 2")) == {"job": None, "reason": "quota"}
    db.refresh(second)
    assert second.status == "queued" and second.attempts == 0


def test_kuota_default_30_dan_endpoint_kuota(client, owner_headers, flow_device, queued_jobs):
    queued_jobs(1)
    _claim(client, flow_device)
    assert client.get("/render-jobs/quota", headers=owner_headers).json() == {"limit": 30, "used": 1, "remaining": 29}


def test_kuota_pulih_tengah_malam_wib_bukan_utc(db):
    # 2026-11-03 16:30 UTC = 23:30 WIB tanggal 3.
    db.add(AuditLog(actor_type="system", action="render_job.claimed", entity="render_job",
                    entity_id=str(uuid.uuid4()), at=datetime(2026, 11, 3, 16, 30, tzinfo=UTC)))
    db.commit()
    assert used_today(db, datetime(2026, 11, 3, 16, 50, tzinfo=UTC)) == 1  # 23:50 WIB tgl 3
    assert used_today(db, datetime(2026, 11, 3, 17, 5, tzinfo=UTC)) == 0  # 00:05 WIB tgl 4


def test_lease_kedaluwarsa_job_kembali_ke_antrian(client, db, flow_device, make_device, queued_jobs):
    (job,) = queued_jobs(1)
    _claim(client, flow_device)
    job = db.get(RenderJob, job.id)
    job.heartbeat_at = datetime.now(UTC) - timedelta(minutes=16)
    db.commit()

    got = _claim(client, make_device("VPS Flow 2"))
    assert got["job"]["job_id"] == str(job.id)
    db.refresh(job)
    assert job.attempts == 2 and job.status == "claimed"


def test_lease_masih_berlaku_tidak_direbut(client, db, flow_device, make_device, queued_jobs):
    (job,) = queued_jobs(1)
    _claim(client, flow_device)
    job = db.get(RenderJob, job.id)
    job.heartbeat_at = datetime.now(UTC) - timedelta(minutes=14)
    db.commit()
    assert _claim(client, make_device("VPS Flow 2")) == {"job": None, "reason": "empty"}


def test_percobaan_ketiga_gagal_permanen(client, db, flow_device, queued_jobs):
    (job,) = queued_jobs(1)
    job.attempts = 2
    db.commit()
    _claim(client, flow_device)  # percobaan ke-3
    job = db.get(RenderJob, job.id)
    job.heartbeat_at = datetime.now(UTC) - timedelta(minutes=20)
    db.commit()

    assert _claim(client, flow_device) == {"job": None, "reason": "empty"}
    db.refresh(job)
    assert job.status == "failed" and job.attempts == 3 and "15 menit" in job.error


def test_device_klaim_ulang_menggugurkan_job_aktifnya(client, db, flow_device, queued_jobs):
    first, second = queued_jobs(2)
    _claim(client, flow_device)
    # Chrome restart: device yang sama minta job lagi padahal job pertama belum selesai.
    got = _claim(client, flow_device)
    # Job lama digugurkan satu percobaan, kembali ke antrian, lalu (sebagai yang tertua) langsung diambil lagi.
    failure = db.scalar(select(AuditLog).where(AuditLog.action == "render_job.attempt_failed"))
    assert failure.entity_id == str(first.id) and "klaim ulang" in failure.after["reason"]
    assert got["job"]["job_id"] == str(first.id)
    db.refresh(first)
    assert first.attempts == 2 and first.status == "claimed"
    db.refresh(second)
    assert second.status == "queued"
