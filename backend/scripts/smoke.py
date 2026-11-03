"""Smoke test API yang sedang berjalan: health, login owner bootstrap, upload foto lewat presigned URL.
Tidak pernah mencetak password atau token.

    uv run python -m scripts.smoke [--base http://127.0.0.1:8010] [--photo path.jpg]
"""

import argparse
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import httpx

from app.config import get_settings


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8010")
    parser.add_argument("--photo", type=Path)
    args = parser.parse_args()
    s = get_settings()
    api = httpx.Client(base_url=args.base, timeout=30)

    health = api.get("/health").json()
    print("health:", health)
    if not health.get("ok"):
        return 1

    r = api.post("/auth/login", json={"email": s.bootstrap_owner_email, "password": s.bootstrap_owner_password})
    print("login owner:", r.status_code)
    if r.status_code != 200:
        return 1
    api.headers["Authorization"] = f"Bearer {r.json()['access_token']}"

    with tempfile.TemporaryDirectory() as tmp:
        photo = args.photo
        if photo is None:
            photo = Path(tmp) / "smoke.jpg"
            subprocess.run(
                ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"testsrc=size=640x480", "-frames:v", "1", str(photo)],
                check=True,
            )
        ticket = api.post(
            "/assets/upload-url", json={"filename": photo.name, "mime": "image/jpeg", "size_bytes": photo.stat().st_size}
        ).json()
        put = httpx.put(ticket["upload_url"], content=photo.read_bytes(), headers=ticket["upload_headers"])
        print("PUT ke storage:", put.status_code)
        done = api.post(f"/assets/{ticket['asset_id']}/complete", json={"license_status": "internal", "funnel": "both"})
        print("complete:", done.status_code)

    # Dengan CELERY_EAGER=false, worker yang memproses: tunggu sebentar sampai status berubah.
    for _ in range(30):
        detail = api.get(f"/assets/{ticket['asset_id']}").json()
        if detail["status"] != "processing":
            break
        time.sleep(1)
    print("status aset:", detail["status"], "| thumbnail:", "ada" if detail.get("thumbnail_url") else "tidak ada")
    return 0 if detail["status"] == "ready" else 1


if __name__ == "__main__":
    sys.exit(main())
