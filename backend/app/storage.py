"""Object storage S3-compatible. Browser upload/download langsung ke storage lewat presigned URL,
jadi file besar tidak pernah lewat API."""

from functools import lru_cache
from pathlib import Path

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.config import get_settings


def _client(endpoint_url: str | None):
    s = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=s.s3_access_key,
        aws_secret_access_key=s.s3_secret_key,
        region_name=s.s3_region,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


@lru_cache
def internal_client():
    return _client(get_settings().s3_endpoint_url)


@lru_cache
def public_client():
    # Signature presigned URL mengikat host, jadi URL untuk browser harus ditandatangani dengan host publik.
    s = get_settings()
    return _client(s.s3_public_endpoint_url or s.s3_endpoint_url)


def ensure_bucket() -> None:
    s = get_settings()
    client = internal_client()
    try:
        client.head_bucket(Bucket=s.s3_bucket)
    except ClientError:
        client.create_bucket(Bucket=s.s3_bucket)
    client.put_bucket_cors(
        Bucket=s.s3_bucket,
        CORSConfiguration={
            "CORSRules": [
                {
                    "AllowedOrigins": s.cors_origins,
                    "AllowedMethods": ["GET", "PUT", "HEAD"],
                    "AllowedHeaders": ["*"],
                    "ExposeHeaders": ["ETag"],
                    "MaxAgeSeconds": 3000,
                }
            ]
        },
    )


def presign_put(key: str, content_type: str) -> str:
    s = get_settings()
    return public_client().generate_presigned_url(
        "put_object",
        Params={"Bucket": s.s3_bucket, "Key": key, "ContentType": content_type},
        ExpiresIn=s.presign_ttl_seconds,
    )


def presign_get(key: str) -> str:
    s = get_settings()
    return public_client().generate_presigned_url(
        "get_object", Params={"Bucket": s.s3_bucket, "Key": key}, ExpiresIn=s.presign_ttl_seconds
    )


def head(key: str) -> dict | None:
    try:
        return internal_client().head_object(Bucket=get_settings().s3_bucket, Key=key)
    except ClientError:
        return None


def download(key: str, dest: Path) -> None:
    internal_client().download_file(get_settings().s3_bucket, key, str(dest))


def upload(src: Path, key: str, content_type: str) -> None:
    internal_client().upload_file(
        str(src), get_settings().s3_bucket, key, ExtraArgs={"ContentType": content_type}
    )
