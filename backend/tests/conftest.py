"""Uji memakai PostgreSQL, object storage S3, dan ffmpeg sungguhan dari docker compose (bukan mock).
Jalankan `docker compose up -d` di root project sebelum `uv run pytest`."""

import os
import subprocess
import uuid
from pathlib import Path

from dotenv import dotenv_values

_env = dotenv_values(Path(__file__).resolve().parents[1] / ".env")
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or _env.get("TEST_DATABASE_URL") or ""
if not os.environ["DATABASE_URL"]:
    raise RuntimeError("TEST_DATABASE_URL belum diisi di backend/.env")
os.environ["S3_BUCKET"] = "harka-assets-test"
os.environ["CELERY_EAGER"] = "true"
os.environ["BOOTSTRAP_OWNER_EMAIL"] = ""
os.environ["BOOTSTRAP_OWNER_PASSWORD"] = ""

import httpx  # noqa: E402
import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.db import Base, get_engine, get_sessionmaker  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Asset, GuardrailSetting, RenderJob, User  # noqa: E402
from app.security import hash_password  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parents[1]
TEST_PASSWORD = "uji-password-panjang"


@pytest.fixture(scope="session", autouse=True)
def _schema():
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(autouse=True)
def _clean_tables():
    tables = ", ".join(t.name for t in Base.metadata.sorted_tables)
    with get_engine().begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    yield


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db():
    with get_sessionmaker()() as session:
        yield session


@pytest.fixture
def make_user(db):
    def _make(role: str, email: str | None = None, *, active: bool = True) -> User:
        user = User(
            email=email or f"{role}@uji-harka.id",
            name=role.title(),
            role=role,
            is_active=active,
            password_hash=hash_password(TEST_PASSWORD),
        )
        db.add(user)
        db.commit()
        return user

    return _make


@pytest.fixture
def login(client):
    def _login(email: str, password: str = TEST_PASSWORD) -> dict[str, str]:
        r = client.post("/auth/login", json={"email": email, "password": password})
        assert r.status_code == 200, r.text
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    return _login


@pytest.fixture
def as_role(make_user, login):
    """Header Authorization untuk user baru dengan peran tertentu."""

    def _as(role: str, email: str | None = None) -> dict[str, str]:
        user = make_user(role, email)
        return login(user.email)

    return _as


@pytest.fixture
def photo_asset(db, make_user):
    """Foto referensi siap pakai (ready, berlisensi kreator). Hanya baris DB; file S3 tidak diunggah."""
    # Email sendiri supaya tes tetap bebas memanggil make_user("owner") / as_role("owner").
    uploader = make_user("creator", "kreator-foto@uji-harka.id")
    asset_id = uuid.uuid4()
    asset = Asset(
        id=asset_id,
        type="photo",
        status="ready",
        storage_key=f"assets/{asset_id}/original.jpg",
        original_filename="avatar.jpg",
        mime="image/jpeg",
        size_bytes=1234,
        uploaded_by_id=uploader.id,
        license_status="creator_licensed",
        funnel="A",
    )
    db.add(asset)
    db.commit()
    return asset


@pytest.fixture
def owner_headers(make_user, login):
    """Owner tunggal per tes (email tetap), dipakai bersama oleh fixture render."""
    return login(make_user("owner", "owner-render@uji-harka.id").email)


@pytest.fixture
def make_device(client, owner_headers):
    def _make(name: str) -> dict:
        r = client.post("/render-devices", headers=owner_headers, json={"name": name})
        assert r.status_code == 201, r.text
        d = r.json()
        return {"id": uuid.UUID(d["id"]), "headers": {"X-Device-Token": d["token"]}, "owner_headers": owner_headers}

    return _make


@pytest.fixture
def flow_device(make_device):
    """Device render terdaftar: {"id", "headers" (X-Device-Token), "owner_headers"}."""
    return make_device("VPS Flow Uji")


@pytest.fixture
def queued_jobs(client, db, owner_headers, photo_asset):
    """queued_jobs(n) -> n job talking head berstatus queued (lewat API), urut dari yang tertua."""

    def _make(n: int) -> list[RenderJob]:
        ids = []
        for i in range(n):
            r = client.post(
                "/render-jobs",
                headers=owner_headers,
                json={
                    "reference_asset_id": str(photo_asset.id),
                    "mode": "talking_head",
                    "slot": "hook",
                    "prompt": f'Close-up of a woman. She says: "Hook nomor {i + 1}"',
                },
            )
            assert r.status_code == 201, r.text
            ids.append(uuid.UUID(r.json()["id"]))
        return [db.get(RenderJob, job_id) for job_id in ids]

    return _make


@pytest.fixture
def claimed_job(client, db, flow_device, queued_jobs):
    """Satu job yang sudah diklaim flow_device lewat /flow/claim."""
    (job,) = queued_jobs(1)
    r = client.post("/flow/claim", headers=flow_device["headers"])
    assert r.json()["job"]["job_id"] == str(job.id), r.text
    db.refresh(job)
    return job


@pytest.fixture
def downloading_job(client, db, flow_device, claimed_job):
    """claimed_job yang sudah melapor stage downloading."""
    r = client.post(
        f"/flow/jobs/{claimed_job.id}/status",
        headers=flow_device["headers"],
        json={"stage": "downloading", "message": "Mengunduh 720p"},
    )
    assert r.status_code == 200, r.text
    db.refresh(claimed_job)
    return claimed_job


@pytest.fixture
def second_device(make_device):
    return make_device("VPS Flow Kedua")


@pytest.fixture
def done_job(db, claimed_job):
    # Hasil render baru tersedia di Task 6; di sini cukup status akhirnya.
    claimed_job.status = "done"
    claimed_job.stage_message = "Selesai"
    db.commit()
    return claimed_job


@pytest.fixture
def set_limit(db):
    def _set(limit: int) -> None:
        db.merge(GuardrailSetting(key="flow_daily_clip_limit", value={"limit": limit}))
        db.commit()

    return _set


@pytest.fixture(scope="session")
def media_dir(tmp_path_factory) -> Path:
    d = tmp_path_factory.mktemp("media")
    run = lambda *args: subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True, capture_output=True)  # noqa: E731
    run("-f", "lavfi", "-i", "testsrc=duration=3:size=320x240:rate=25", "-pix_fmt", "yuv420p", str(d / "clip.mp4"))
    run("-f", "lavfi", "-i", "testsrc=size=640x480", "-frames:v", "1", str(d / "photo.jpg"))
    run("-f", "lavfi", "-i", "color=c=red:size=800x600", "-frames:v", "1", str(d / "photo.png"))
    (d / "broken.mp4").write_bytes(b"ini bukan video" * 100)
    return d


@pytest.fixture
def upload(client):
    """Alur upload lengkap seperti browser: minta URL -> PUT ke storage -> konfirmasi."""

    def _upload(headers: dict, path: Path, mime: str, *, put: bool = True, **metadata) -> dict:
        r = client.post(
            "/assets/upload-url",
            headers=headers,
            json={"filename": path.name, "mime": mime, "size_bytes": path.stat().st_size},
        )
        assert r.status_code == 201, r.text
        ticket = r.json()
        if put:
            put_r = httpx.put(ticket["upload_url"], content=path.read_bytes(), headers=ticket["upload_headers"])
            assert put_r.status_code == 200, put_r.text
        done = client.post(f"/assets/{ticket['asset_id']}/complete", headers=headers, json=metadata)
        return {"ticket": ticket, "response": done}

    return _upload


class FakeLLM:
    """Mengganti satu-satunya jalur HTTP ke LLM (`app.llm._chat`); wrapper `complete` + agent_runs tetap asli."""

    def __init__(self) -> None:
        self.queues: dict[str, list] = {}
        self.calls: list[dict] = []

    def reply(self, slot: str, payload) -> None:
        """payload: dict/list (jadi JSON), str (apa adanya), atau Exception (dilempar)."""
        self.queues.setdefault(slot, []).append(payload)


@pytest.fixture
def fake_llm(monkeypatch, db):
    import json

    from app import llm

    fake = FakeLLM()
    base_settings = llm.get_settings().model_copy(update={"llm_base_url": "http://fake-llm", "llm_api_key": "k"})
    monkeypatch.setattr(llm, "get_settings", lambda: base_settings)
    db.merge(GuardrailSetting(key=llm.SETTING_KEY, value={"analysis_model": "model-analisis", "writer_model": "model-writer"}))
    db.commit()

    def _chat(base_url, api_key, model, messages):
        slot = "analysis" if model == "model-analisis" else "writer"
        fake.calls.append({"slot": slot, "model": model, "messages": messages})
        queue = fake.queues.get(slot) or []
        assert queue, f"fake_llm: tidak ada balasan untuk slot {slot}"
        item = queue.pop(0)
        if isinstance(item, Exception):
            raise item
        text = item if isinstance(item, str) else json.dumps(item)
        return text, {"prompt_tokens": 10, "completion_tokens": 5}

    monkeypatch.setattr(llm, "_chat", _chat)
    return fake


@pytest.fixture
def stored_asset(db, make_user, media_dir):
    """Aset ready dengan file sungguhan di S3 (foto atau video dari media_dir)."""
    from app import storage

    def _make(kind: str = "photo", license_status: str = "creator_licensed") -> Asset:
        uploader = make_user("creator", f"kreator-{uuid.uuid4().hex[:6]}@uji-harka.id")
        asset_id = uuid.uuid4()
        src, ext, mime = (media_dir / "clip.mp4", "mp4", "video/mp4") if kind == "video" else (media_dir / "photo.jpg", "jpg", "image/jpeg")
        key = f"assets/{asset_id}/original.{ext}"
        storage.upload(src, key, mime)
        asset = Asset(
            id=asset_id, type=kind, status="ready", storage_key=key, original_filename=src.name, mime=mime,
            size_bytes=src.stat().st_size, uploaded_by_id=uploader.id, license_status=license_status, funnel="A",
        )
        db.add(asset)
        db.commit()
        return asset

    return _make
