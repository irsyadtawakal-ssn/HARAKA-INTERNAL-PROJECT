import hmac
import uuid
from collections.abc import Callable
from datetime import UTC, datetime

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import RenderDevice, User
from app.render import hash_token
from app.security import decode_access_token

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesi berakhir. Silakan login kembali.")
    if creds is None:
        raise unauthorized
    claims = decode_access_token(creds.credentials)
    if claims is None:
        raise unauthorized
    try:
        user_id = uuid.UUID(claims["sub"])
    except ValueError:
        raise unauthorized from None
    user = db.get(User, user_id)
    # Token lama ditolak bila user dinonaktifkan atau token_version dinaikkan (ganti password, logout semua).
    if user is None or not user.is_active or claims.get("ver") != user.token_version:
        raise unauthorized
    return user


def require_roles(*roles: str) -> Callable[[User], User]:
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Peran Anda tidak punya akses untuk tindakan ini.")
        return user

    return checker


def client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def get_render_device(x_device_token: str | None = Header(None), db: Session = Depends(get_db)) -> RenderDevice:
    """Autentikasi extension Google Flow lewat header X-Device-Token."""
    invalid = HTTPException(status.HTTP_401_UNAUTHORIZED, "Token device tidak valid.")
    if not x_device_token:
        raise invalid
    token_hash = hash_token(x_device_token)
    device = db.scalar(select(RenderDevice).where(RenderDevice.token_hash == token_hash))
    if device is None or not device.is_active or not hmac.compare_digest(device.token_hash, token_hash):
        raise invalid
    device.last_seen_at = datetime.now(UTC)
    db.commit()
    return device
