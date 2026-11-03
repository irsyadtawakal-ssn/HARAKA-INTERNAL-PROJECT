from sqlalchemy import select

from app.models import AuditLog


def test_login_berhasil_dan_me(client, make_user, login):
    make_user("marketing", "Mkt@uji-harka.id")
    headers = login("mkt@uji-harka.id")  # email tidak peka huruf besar/kecil
    r = client.get("/auth/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["role"] == "marketing"
    assert r.json()["last_login_at"] is not None


def test_login_gagal_pesan_sama_untuk_email_tidak_ada_dan_password_salah(client, make_user):
    make_user("sales")
    salah_pw = client.post("/auth/login", json={"email": "sales@uji-harka.id", "password": "salah"})
    tidak_ada = client.post("/auth/login", json={"email": "siapa@uji-harka.id", "password": "salah"})
    assert salah_pw.status_code == tidak_ada.status_code == 401
    assert salah_pw.json() == tidak_ada.json()


def test_user_nonaktif_tidak_bisa_login(client, make_user):
    make_user("viewer", active=False)
    assert client.post("/auth/login", json={"email": "viewer@uji-harka.id", "password": "uji-password-panjang"}).status_code == 401


def test_tanpa_token_atau_token_palsu_ditolak(client):
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Bearer palsu"}).status_code == 401
    assert client.get("/assets").status_code == 401


def test_hanya_owner_yang_bisa_kelola_user(client, as_role):
    for role in ("marketing", "creator", "ads_admin", "sales", "viewer"):
        headers = as_role(role)
        r = client.post("/users", headers=headers, json={"email": "x@uji-harka.id", "password": "password-baru-123", "role": "viewer"})
        assert r.status_code == 403, role
        assert client.get("/users", headers=headers).status_code == 403


def test_owner_buat_user_dan_email_duplikat_ditolak(client, as_role, db):
    owner = as_role("owner")
    body = {"email": "Baru@uji-harka.id", "name": "Baru", "password": "password-baru-123", "role": "creator"}
    r = client.post("/users", headers=owner, json=body)
    assert r.status_code == 201
    assert r.json()["email"] == "baru@uji-harka.id"
    assert client.post("/users", headers=owner, json=body).status_code == 409
    assert db.scalar(select(AuditLog).where(AuditLog.action == "user.create")) is not None


def test_ganti_password_atau_nonaktif_mencabut_token_lama(client, as_role, make_user, login):
    owner = as_role("owner")
    target = make_user("marketing")
    lama = login(target.email)
    assert client.get("/auth/me", headers=lama).status_code == 200

    r = client.patch(f"/users/{target.id}", headers=owner, json={"password": "password-baru-123"})
    assert r.status_code == 200
    assert client.get("/auth/me", headers=lama).status_code == 401
    baru = login(target.email, "password-baru-123")

    client.patch(f"/users/{target.id}", headers=owner, json={"is_active": False})
    assert client.get("/auth/me", headers=baru).status_code == 401


def test_owner_tidak_bisa_menurunkan_dirinya_sendiri(client, make_user, login):
    owner = make_user("owner")
    headers = login(owner.email)
    assert client.patch(f"/users/{owner.id}", headers=headers, json={"role": "viewer"}).status_code == 400
    assert client.patch(f"/users/{owner.id}", headers=headers, json={"is_active": False}).status_code == 400
