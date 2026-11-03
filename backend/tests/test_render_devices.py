from sqlalchemy import select

from app.models import RenderDevice
from app.render import hash_token


def test_owner_daftar_device_token_sekali_tampil(client, as_role, db):
    h = as_role("owner")
    r = client.post("/render-devices", headers=h, json={"name": "VPS Flow 1"})
    assert r.status_code == 201, r.text
    token = r.json()["token"]
    assert len(token) >= 40

    listed = client.get("/render-devices", headers=h).json()
    assert [d["name"] for d in listed] == ["VPS Flow 1"]
    assert "token" not in listed[0] and "token_hash" not in listed[0]
    assert db.scalar(select(RenderDevice.token_hash)) == hash_token(token)


def test_ping_dengan_token_valid_mencatat_last_seen(client, flow_device, db):
    r = client.get("/flow/ping", headers=flow_device["headers"])
    assert r.status_code == 200
    assert r.json() == {"ok": True, "device": "VPS Flow Uji"}
    assert db.get(RenderDevice, flow_device["id"]).last_seen_at is not None


def test_token_salah_atau_device_nonaktif_401(client, as_role, flow_device):
    assert client.get("/flow/ping").status_code == 401
    assert client.get("/flow/ping", headers={"X-Device-Token": "token-acak-yang-salah"}).status_code == 401

    r = client.patch(f"/render-devices/{flow_device['id']}", headers=flow_device["owner_headers"], json={"is_active": False})
    assert r.status_code == 200 and r.json()["is_active"] is False
    r = client.get("/flow/ping", headers=flow_device["headers"])
    assert r.status_code == 401
    assert r.json()["detail"] == "Token device tidak valid."


def test_selain_owner_tidak_boleh_kelola_device(client, as_role):
    h = as_role("marketing")
    assert client.post("/render-devices", headers=h, json={"name": "x"}).status_code == 403
    assert client.get("/render-devices", headers=h).status_code == 403
