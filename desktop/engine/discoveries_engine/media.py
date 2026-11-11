"""Media helpers built on FFprobe. Files are only ever opened for reading."""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from pathlib import Path
from typing import Any


class ToolMissingError(RuntimeError):
    pass


def tool_path(name: str) -> str | None:
    return shutil.which(name)


def sha256_file(path: Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while block := f.read(chunk):
            h.update(block)
    return h.hexdigest()


def probe(path: Path, timeout: float = 30.0) -> dict[str, Any]:
    """Return a compact summary of ffprobe's output for a media file."""
    ffprobe = tool_path("ffprobe")
    if ffprobe is None:
        raise ToolMissingError("ffprobe not found on PATH")
    proc = subprocess.run(
        [ffprobe, "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
        capture_output=True, text=True, timeout=timeout, check=False,
    )
    if proc.returncode != 0:
        raise ValueError(proc.stderr.strip() or "ffprobe failed")
    raw = json.loads(proc.stdout or "{}")
    fmt = raw.get("format", {})
    streams = raw.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)

    def fps(rate: str | None) -> float | None:
        if not rate or rate in ("0/0",):
            return None
        num, _, den = rate.partition("/")
        try:
            return round(float(num) / float(den or 1), 3)
        except (ValueError, ZeroDivisionError):
            return None

    return {
        "path": str(path),
        "format": fmt.get("format_name"),
        "duration_seconds": float(fmt["duration"]) if fmt.get("duration") else None,
        "size_bytes": int(fmt["size"]) if fmt.get("size") else None,
        "tags": fmt.get("tags", {}),
        "video": None if video is None else {
            "codec": video.get("codec_name"),
            "width": video.get("width"),
            "height": video.get("height"),
            "fps": fps(video.get("avg_frame_rate") or video.get("r_frame_rate")),
            "pix_fmt": video.get("pix_fmt"),
            "color_transfer": video.get("color_transfer"),
        },
        "audio": None if audio is None else {
            "codec": audio.get("codec_name"),
            "sample_rate": int(audio["sample_rate"]) if audio.get("sample_rate") else None,
            "channels": audio.get("channels"),
        },
    }
