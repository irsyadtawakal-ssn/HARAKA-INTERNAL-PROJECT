from datetime import date

from scripts.render_trial_report import build_report, format_report


def test_laporan_harian_dari_klaim_gagal_dan_selesai(client, db, flow_device, queued_jobs):
    first, second = queued_jobs(2)
    dev = flow_device["headers"]
    client.post("/flow/claim", headers=dev)
    client.post(f"/flow/jobs/{first.id}/status", headers=dev, json={"stage": "failed", "message": "captcha"})
    client.post("/flow/claim", headers=dev)  # first diambil lagi (tertua)
    client.post(f"/flow/jobs/{first.id}/status", headers=dev, json={"stage": "failed", "message": "captcha"})

    rows = build_report(db, since=date(2026, 1, 1))
    assert len(rows) == 1
    day = rows[0]
    assert day.claims == 2
    assert day.failures == {"captcha": 2}
    assert day.done == 0 and day.failed == 0
    assert day.median_minutes_to_done is None

    text = format_report(rows)
    assert "captcha=2" in text and "klaim=2" in text


def test_laporan_kosong(db):
    assert build_report(db, since=date(2026, 1, 1)) == []
    assert "Belum ada" in format_report([])
