from datetime import date, timedelta
from decimal import Decimal

import httpx
from sqlalchemy import select

from app.models import Asset, AuditLog


def test_upload_video_diproses_lengkap(client, as_role, upload, media_dir, db):
    headers = as_role("creator")
    res = upload(headers, media_dir / "clip.mp4", "video/mp4", creator_name="Tim Pabrik", funnel="B", license_status="internal")
    r = res["response"]
    assert r.status_code == 200, r.text

    asset_id = res["ticket"]["asset_id"]
    detail = client.get(f"/assets/{asset_id}", headers=headers).json()
    assert detail["status"] == "ready"
    assert detail["type"] == "video"
    assert Decimal(detail["duration_s"]) == Decimal("3.000")
    assert (detail["width"], detail["height"]) == (320, 240)
    assert len(detail["checksum_sha256"]) == 64
    assert detail["funnel"] == "B" and detail["creator_name"] == "Tim Pabrik"

    # Thumbnail dan file asli bisa diunduh browser lewat presigned URL.
    thumb = httpx.get(detail["thumbnail_url"])
    assert thumb.status_code == 200 and thumb.content[:2] == b"\xff\xd8"  # JPEG
    assert httpx.get(detail["original_url"]).content == (media_dir / "clip.mp4").read_bytes()

    actions = db.scalars(select(AuditLog.action).where(AuditLog.entity_id == asset_id)).all()
    assert {"asset.upload_url", "asset.complete", "asset.processed"} <= set(actions)


def test_definition_of_done_1_video_3_foto_masuk_galeri(client, as_role, upload, media_dir):
    headers = as_role("marketing")
    files = [("clip.mp4", "video/mp4"), ("photo.jpg", "image/jpeg"), ("photo.png", "image/png"), ("photo.jpg", "image/jpeg")]
    for name, mime in files:
        assert upload(headers, media_dir / name, mime)["response"].status_code == 200

    page = client.get("/assets", headers=headers).json()
    assert page["total"] == 4
    assert all(a["status"] == "ready" and a["thumbnail_url"] for a in page["items"])
    assert sorted(a["type"] for a in page["items"]) == ["photo", "photo", "photo", "video"]


def test_file_sama_ditandai_duplikat(client, as_role, upload, media_dir):
    headers = as_role("marketing")
    pertama = upload(headers, media_dir / "photo.jpg", "image/jpeg")["ticket"]["asset_id"]
    kedua = upload(headers, media_dir / "photo.jpg", "image/jpeg")["ticket"]["asset_id"]
    assert client.get(f"/assets/{pertama}", headers=headers).json()["duplicate_of_id"] is None
    assert client.get(f"/assets/{kedua}", headers=headers).json()["duplicate_of_id"] == pertama


def test_format_dan_ukuran_divalidasi(client, as_role):
    headers = as_role("marketing")
    gif = client.post("/assets/upload-url", headers=headers, json={"filename": "a.gif", "mime": "image/gif", "size_bytes": 10})
    assert gif.status_code == 415
    besar = client.post(
        "/assets/upload-url", headers=headers, json={"filename": "a.jpg", "mime": "image/jpeg", "size_bytes": 26 * 1024 * 1024}
    )
    assert besar.status_code == 413


def test_konfirmasi_tanpa_file_atau_ukuran_beda_ditolak(client, as_role, upload, media_dir):
    headers = as_role("marketing")
    tanpa_file = upload(headers, media_dir / "photo.jpg", "image/jpeg", put=False)
    assert tanpa_file["response"].status_code == 400

    r = client.post("/assets/upload-url", headers=headers, json={"filename": "x.jpg", "mime": "image/jpeg", "size_bytes": 999})
    ticket = r.json()
    httpx.put(ticket["upload_url"], content=(media_dir / "photo.jpg").read_bytes(), headers=ticket["upload_headers"])
    beda = client.post(f"/assets/{ticket['asset_id']}/complete", headers=headers, json={})
    assert beda.status_code == 400
    assert "tidak sama" in beda.json()["detail"]


def test_file_rusak_berstatus_failed(client, as_role, upload, media_dir):
    headers = as_role("marketing")
    res = upload(headers, media_dir / "broken.mp4", "video/mp4")
    detail = client.get(f"/assets/{res['ticket']['asset_id']}", headers=headers).json()
    assert detail["status"] == "failed"
    assert "tidak bisa dibaca" in detail["error"]


def test_konfirmasi_dua_kali_ditolak(client, as_role, upload, media_dir):
    headers = as_role("marketing")
    asset_id = upload(headers, media_dir / "photo.jpg", "image/jpeg")["ticket"]["asset_id"]
    assert client.post(f"/assets/{asset_id}/complete", headers=headers, json={}).status_code == 409


def test_approve_wajib_lisensi_jelas_dan_belum_kedaluwarsa(client, as_role, upload, media_dir):
    headers = as_role("marketing")
    asset_id = upload(headers, media_dir / "photo.jpg", "image/jpeg")["ticket"]["asset_id"]

    r = client.post(f"/assets/{asset_id}/review", headers=headers, json={"action": "approve"})
    assert r.status_code == 409 and "lisensi" in r.json()["detail"]

    kemarin = (date.today() - timedelta(days=1)).isoformat()
    client.patch(f"/assets/{asset_id}", headers=headers, json={"license_status": "creator_licensed", "license_expires_at": kemarin})
    r = client.post(f"/assets/{asset_id}/review", headers=headers, json={"action": "approve"})
    assert r.status_code == 409 and "kedaluwarsa" in r.json()["detail"]

    client.patch(f"/assets/{asset_id}", headers=headers, json={"license_expires_at": None})
    r = client.post(f"/assets/{asset_id}/review", headers=headers, json={"action": "approve", "note": "ok untuk funnel B"})
    assert r.status_code == 200 and r.json()["status"] == "approved"

    # Respons review & update tetap membawa URL file asli (dashboard memakainya untuk pratinjau).
    assert r.json()["original_url"]

    # Lisensi diubah setelah approve -> wajib direview ulang.
    r = client.patch(f"/assets/{asset_id}", headers=headers, json={"license_status": "unknown"})
    assert r.json()["status"] == "ready"
    assert r.json()["original_url"]


def test_aset_ditolak_bisa_disetujui_ulang_tapi_gagal_proses_tidak(client, as_role, upload, media_dir):
    headers = as_role("marketing")
    asset_id = upload(headers, media_dir / "photo.jpg", "image/jpeg", license_status="internal")["ticket"]["asset_id"]
    assert client.post(f"/assets/{asset_id}/review", headers=headers, json={"action": "reject"}).json()["status"] == "rejected"
    assert client.post(f"/assets/{asset_id}/review", headers=headers, json={"action": "approve"}).json()["status"] == "approved"
    sudah = client.post(f"/assets/{asset_id}/review", headers=headers, json={"action": "approve"})
    assert sudah.status_code == 409 and "sudah disetujui" in sudah.json()["detail"]

    rusak = upload(headers, media_dir / "broken.mp4", "video/mp4", license_status="internal")["ticket"]["asset_id"]
    r = client.post(f"/assets/{rusak}/review", headers=headers, json={"action": "approve"})
    assert r.status_code == 409 and "gagal diproses" in r.json()["detail"]


def test_hak_akses_per_peran(client, as_role, upload, media_dir):
    creator_a = as_role("creator", "a@uji-harka.id")
    creator_b = as_role("creator", "b@uji-harka.id")
    viewer = as_role("viewer")
    sales = as_role("sales")

    asset_id = upload(creator_a, media_dir / "photo.jpg", "image/jpeg", license_status="internal")["ticket"]["asset_id"]

    # Viewer & sales hanya bisa melihat.
    for headers in (viewer, sales):
        assert client.get(f"/assets/{asset_id}", headers=headers).status_code == 200
        assert client.post("/assets/upload-url", headers=headers, json={"filename": "a.jpg", "mime": "image/jpeg", "size_bytes": 10}).status_code == 403
        assert client.patch(f"/assets/{asset_id}", headers=headers, json={"notes": "x"}).status_code == 403

    # Kreator tidak bisa menyetujui, dan tidak bisa mengubah aset kreator lain.
    assert client.post(f"/assets/{asset_id}/review", headers=creator_a, json={"action": "approve"}).status_code == 403
    assert client.patch(f"/assets/{asset_id}", headers=creator_b, json={"notes": "x"}).status_code == 403
    assert client.patch(f"/assets/{asset_id}", headers=creator_a, json={"notes": "footage line 2"}).status_code == 200


def test_filter_galeri(client, as_role, upload, media_dir, db):
    headers = as_role("marketing")
    upload(headers, media_dir / "clip.mp4", "video/mp4", funnel="A")
    upload(headers, media_dir / "photo.jpg", "image/jpeg", funnel="B")
    upload(headers, media_dir / "photo.png", "image/png", funnel="both")
    # Aset yang URL-nya dibuat tapi belum dikonfirmasi tidak muncul di galeri.
    client.post("/assets/upload-url", headers=headers, json={"filename": "z.jpg", "mime": "image/jpeg", "size_bytes": 10})

    def ids(**params):
        return {a["original_filename"] for a in client.get("/assets", headers=headers, params=params).json()["items"]}

    assert ids() == {"clip.mp4", "photo.jpg", "photo.png"}
    assert ids(funnel="A") == {"clip.mp4", "photo.png"}
    assert ids(funnel="B") == {"photo.jpg", "photo.png"}
    assert ids(type="video") == {"clip.mp4"}
    assert db.scalar(select(Asset).where(Asset.status == "uploading")) is not None


def test_versi_aset_dari_induk(client, as_role, upload, media_dir):
    headers = as_role("marketing")
    induk = upload(headers, media_dir / "clip.mp4", "video/mp4")["ticket"]["asset_id"]
    for expected in (2, 3):
        r = client.post(
            "/assets/upload-url",
            headers=headers,
            json={"filename": "clip-v.mp4", "mime": "video/mp4", "size_bytes": 100, "parent_asset_id": induk},
        )
        assert r.status_code == 201
        assert client.get(f"/assets/{r.json()['asset_id']}", headers=headers).json()["version"] == expected
