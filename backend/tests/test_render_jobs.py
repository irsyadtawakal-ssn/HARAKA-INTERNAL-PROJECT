import pytest

TALKING = 'Medium close-up vertical 9:16 video of a woman. She says: "Mau bikin brand skincare sendiri?"'


def _body(asset, **overrides) -> dict:
    body = {"reference_asset_id": str(asset.id), "mode": "talking_head", "slot": "hook", "prompt": TALKING}
    body.update(overrides)
    return body


def test_owner_buat_job_talking_head(client, owner_headers, photo_asset):
    r = client.post("/render-jobs", headers=owner_headers, json=_body(photo_asset))
    assert r.status_code == 201, r.text
    job = r.json()
    assert job["status"] == "queued" and job["attempts"] == 0 and job["target_duration"] is None
    assert job["reference_asset_id"] == str(photo_asset.id)

    assert client.get(f"/render-jobs/{job['id']}", headers=owner_headers).json()["id"] == job["id"]
    assert [j["id"] for j in client.get("/render-jobs", headers=owner_headers).json()] == [job["id"]]


def test_filter_status_dan_urutan_terbaru_dulu(client, owner_headers, photo_asset):
    first = client.post("/render-jobs", headers=owner_headers, json=_body(photo_asset)).json()
    second = client.post("/render-jobs", headers=owner_headers, json=_body(photo_asset, slot="cta")).json()
    listed = client.get("/render-jobs", headers=owner_headers, params={"status": "queued"}).json()
    assert [j["id"] for j in listed] == [second["id"], first["id"]]
    assert client.get("/render-jobs", headers=owner_headers, params={"status": "done"}).json() == []


def test_broll_default_8s_dan_slot_dipaksa(client, owner_headers, photo_asset):
    r = client.post(
        "/render-jobs", headers=owner_headers,
        json=_body(photo_asset, mode="broll", slot="broll", prompt="Slow dolly over serum bottles"),
    )
    assert r.status_code == 201, r.text
    assert r.json()["target_duration"] == "8s"

    r = client.post("/render-jobs", headers=owner_headers, json=_body(photo_asset, mode="broll", slot="hook"))
    assert r.status_code == 422
    r = client.post("/render-jobs", headers=owner_headers, json=_body(photo_asset, slot="broll"))
    assert r.status_code == 422


@pytest.mark.parametrize("kasus", ["video", "lisensi_unknown", "masih_processing", "tanpa_dialog"])
def test_referensi_tidak_layak_ditolak_422(client, owner_headers, db, photo_asset, kasus):
    body = _body(photo_asset)
    if kasus == "video":
        photo_asset.type, photo_asset.mime = "video", "video/mp4"
    elif kasus == "lisensi_unknown":
        photo_asset.license_status = "unknown"
    elif kasus == "masih_processing":
        photo_asset.status = "processing"
    else:
        body["prompt"] = "Medium close-up of a woman smiling at the camera"
    db.commit()
    r = client.post("/render-jobs", headers=owner_headers, json=body)
    assert r.status_code == 422, r.text
    assert isinstance(r.json()["detail"], str)


def test_referensi_tidak_ada_404(client, owner_headers, photo_asset):
    body = _body(photo_asset, reference_asset_id="00000000-0000-0000-0000-000000000000")
    assert client.post("/render-jobs", headers=owner_headers, json=body).status_code == 404


def test_broll_tolak_lisensi_unknown_tapi_terima_internal(client, owner_headers, db, photo_asset):
    body = _body(photo_asset, mode="broll", slot="broll", prompt="Factory b-roll")
    photo_asset.license_status = "unknown"
    db.commit()
    assert client.post("/render-jobs", headers=owner_headers, json=body).status_code == 422
    photo_asset.license_status = "internal"
    db.commit()
    assert client.post("/render-jobs", headers=owner_headers, json=body).status_code == 201


def test_talking_head_tolak_lisensi_internal(client, owner_headers, db, photo_asset):
    # Wajah orang wajib izin kreator/testimoni (spec §3.1), bukan sekadar aset internal.
    photo_asset.license_status = "internal"
    db.commit()
    assert client.post("/render-jobs", headers=owner_headers, json=_body(photo_asset)).status_code == 422


def test_marketing_belum_boleh_buat_job_saat_pilot(client, as_role, photo_asset):
    assert client.post("/render-jobs", headers=as_role("marketing"), json=_body(photo_asset)).status_code == 403
