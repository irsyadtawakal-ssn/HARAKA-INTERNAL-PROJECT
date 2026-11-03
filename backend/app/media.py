"""Metadata dan thumbnail lewat ffprobe/ffmpeg (harus ada di PATH worker)."""

import hashlib
import json
import subprocess
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

VIDEO_MIMES = {"video/mp4": "mp4", "video/quicktime": "mov"}
PHOTO_MIMES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
THUMB_WIDTH = 480
_TIMEOUT_S = 120


@dataclass
class MediaInfo:
    duration_s: Decimal | None
    width: int | None
    height: int | None


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def probe(path: Path) -> MediaInfo:
    out = subprocess.run(
        [
            "ffprobe", "-v", "error", "-print_format", "json",
            "-show_entries", "format=duration:stream=codec_type,width,height,duration",
            str(path),
        ],
        capture_output=True, text=True, timeout=_TIMEOUT_S, check=True,
    )
    data = json.loads(out.stdout or "{}")
    stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), {})
    raw_duration = data.get("format", {}).get("duration") or stream.get("duration")
    duration = Decimal(raw_duration).quantize(Decimal("0.001")) if raw_duration not in (None, "N/A") else None
    return MediaInfo(duration_s=duration, width=stream.get("width"), height=stream.get("height"))


def make_thumbnail(src: Path, dest: Path, *, is_video: bool, duration_s: Decimal | None) -> None:
    """Thumbnail JPEG lebar 480 px. Untuk video diambil frame di detik ke-1 (atau tengah bila video sangat pendek)."""
    seek: list[str] = []
    if is_video:
        at = 1.0 if duration_s is None or duration_s > 2 else float(duration_s) / 2
        seek = ["-ss", f"{at:.3f}"]
    subprocess.run(
        [
            "ffmpeg", "-v", "error", "-y", *seek, "-i", str(src),
            "-frames:v", "1", "-vf", f"scale={THUMB_WIDTH}:-2", "-q:v", "4", str(dest),
        ],
        capture_output=True, timeout=_TIMEOUT_S, check=True,
    )
