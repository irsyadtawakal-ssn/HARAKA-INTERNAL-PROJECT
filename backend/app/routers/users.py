import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import audit
from app.db import get_db
from app.deps import client_ip, require_roles
from app.models import User
from app.schemas import UserCreate, UserOut, UserUpdate
from app.security import hash_password

router = APIRouter(prefix="/users", tags=["users"])
owner_only = require_roles("owner")


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(owner_only)) -> list[User]:
    return list(db.scalars(select(User).order_by(User.created_at)))


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, request: Request, db: Session = Depends(get_db), actor: User = Depends(owner_only)) -> User:
    if db.scalar(select(User.id).where(func.lower(User.email) == body.email.lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email sudah terdaftar.")
    user = User(email=body.email.lower(), name=body.name, role=body.role, password_hash=hash_password(body.password))
    db.add(user)
    db.flush()
    audit.record(
        db, actor_type="user", actor_id=actor.id, action="user.create", entity="user", entity_id=user.id,
        after={"email": user.email, "role": user.role}, ip=client_ip(request),
    )
    db.commit()
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: uuid.UUID, body: UserUpdate, request: Request, db: Session = Depends(get_db), actor: User = Depends(owner_only)
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User tidak ditemukan.")
    if user.id == actor.id and (body.role not in (None, "owner") or body.is_active is False):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Owner tidak bisa menurunkan peran atau menonaktifkan dirinya sendiri.")

    before = {"name": user.name, "role": user.role, "is_active": user.is_active}
    if body.name is not None:
        user.name = body.name
    if body.role is not None:
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.password is not None:
        user.password_hash = hash_password(body.password)
    if body.password is not None or body.is_active is False or (body.role is not None and body.role != before["role"]):
        user.token_version += 1  # cabut semua sesi login lama

    audit.record(
        db, actor_type="user", actor_id=actor.id, action="user.update", entity="user", entity_id=user.id,
        before=before,
        after={"name": user.name, "role": user.role, "is_active": user.is_active, "password_changed": body.password is not None},
        ip=client_ip(request),
    )
    db.commit()
    return user
