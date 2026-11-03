import uuid
from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
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
