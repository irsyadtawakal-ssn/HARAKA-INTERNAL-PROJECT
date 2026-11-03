"""Uji memakai PostgreSQL, object storage S3, dan ffmpeg sungguhan dari docker compose (bukan mock).
Jalankan `docker compose up -d` di root project sebelum `uv run pytest`."""

import os
import subprocess
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
from app.models import User  # noqa: E402
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
