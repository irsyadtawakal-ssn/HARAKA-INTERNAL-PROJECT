import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app import audit, storage
from app.config import get_settings
from app.db import get_db, get_sessionmaker
from app.models import User
from app.routers import assets, auth, users
from app.security import hash_password

log = logging.getLogger("harka")


def bootstrap_owner() -> None:
    """Buat owner pertama dari BOOTSTRAP_OWNER_* hanya bila tabel users masih kosong."""
    s = get_settings()
    if not (s.bootstrap_owner_email and s.bootstrap_owner_password):
        return
    with get_sessionmaker()() as db:
        if db.scalar(select(User.id).limit(1)) is not None:
            return
        owner = User(
            email=s.bootstrap_owner_email.lower(),
            name="Owner",
            role="owner",
            password_hash=hash_password(s.bootstrap_owner_password),
        )
        db.add(owner)
        db.flush()
        audit.record(db, actor_type="system", actor_id="bootstrap", action="user.create", entity="user", entity_id=owner.id, after={"role": "owner"})
        db.commit()
        log.info("Owner pertama dibuat: %s", owner.email)


@asynccontextmanager
async def lifespan(_: FastAPI):
    bootstrap_owner()
    try:
        storage.ensure_bucket()
    except Exception:  # storage mati tidak boleh mencegah API hidup; /health melaporkannya
        log.exception("Bucket storage belum bisa disiapkan")
    yield


app = FastAPI(title="Haraka Erfi AI Marketing Factory", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(assets.router)


@app.get("/health", tags=["health"])
def health(db: Session = Depends(get_db)) -> dict:
    checks = {"db": False, "storage": False}
    try:
        db.execute(text("SELECT 1"))
        checks["db"] = True
    except Exception:
        log.exception("Healthcheck database gagal")
    try:
        storage.internal_client().head_bucket(Bucket=get_settings().s3_bucket)
        checks["storage"] = True
    except Exception:
        log.exception("Healthcheck storage gagal")
    return {"ok": all(checks.values()), **checks}
