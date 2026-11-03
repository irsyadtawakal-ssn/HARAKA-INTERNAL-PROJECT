"""Ganti password user dan cabut semua sesi loginnya.

    uv run python -m scripts.set_password owner@contoh.id            # password diminta lewat prompt
    uv run python -m scripts.set_password owner@contoh.id --from-env  # pakai BOOTSTRAP_OWNER_PASSWORD
"""

import argparse
import getpass

from sqlalchemy import func, select

from app.config import get_settings
from app.db import get_sessionmaker
from app.models import User
from app.security import hash_password


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("email")
    parser.add_argument("--from-env", action="store_true")
    args = parser.parse_args()

    password = get_settings().bootstrap_owner_password if args.from_env else getpass.getpass("Password baru: ")
    if not password or len(password) < 10:
        raise SystemExit("Password minimal 10 karakter.")
    with get_sessionmaker()() as db:
        user = db.scalar(select(User).where(func.lower(User.email) == args.email.lower()))
        if user is None:
            raise SystemExit("User tidak ditemukan.")
        user.password_hash = hash_password(password)
        user.token_version += 1
        db.commit()
    print(f"Password {user.email} diganti; sesi lama dicabut.")


if __name__ == "__main__":
    main()
