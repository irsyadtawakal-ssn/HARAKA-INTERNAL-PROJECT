from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Semua konfigurasi dibaca dari environment / backend/.env. Credential tidak pernah dikirim ke browser."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    redis_url: str = "redis://localhost:6390/0"

    jwt_secret: str = Field(min_length=32)
    jwt_ttl_minutes: int = 12 * 60

    # S3: endpoint internal (dipakai API/worker) dan endpoint publik (masuk ke presigned URL untuk browser).
    s3_endpoint_url: str | None = None
    s3_public_endpoint_url: str | None = None
    s3_access_key: str
    s3_secret_key: str
    s3_bucket: str = "harka-assets"
    s3_region: str = "us-east-1"
    presign_ttl_seconds: int = 15 * 60

    # Batas upload (PRD A-08).
    max_video_bytes: int = 2 * 1024**3
    max_photo_bytes: int = 25 * 1024**2

    # True = task Celery dijalankan langsung di proses (uji / dev tanpa worker).
    celery_eager: bool = False

    cors_origins: list[str] = ["http://localhost:3010"]

    # Owner pertama dibuat saat tabel users masih kosong.
    bootstrap_owner_email: str | None = None
    bootstrap_owner_password: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
