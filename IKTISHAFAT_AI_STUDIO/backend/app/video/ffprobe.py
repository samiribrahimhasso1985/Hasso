"""Real media metadata via ffprobe. Returns None fields when ffprobe is unavailable."""
from __future__ import annotations
import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass
class MediaInfo:
    duration: float | None = None
    width: int | None = None
    height: int | None = None
    fps: float | None = None
    codec: str | None = None
    source: str = "none"  # "ffprobe" only when really probed


def ffprobe_path() -> str | None:
    return shutil.which("ffprobe")


def _fps(rate: str | None) -> float | None:
    try:
        n, d = (rate or "0/0").split("/")
        return round(int(n) / int(d), 3) if int(d) else None
    except (ValueError, ZeroDivisionError):
        return None


def probe(path: Path, timeout: int = 30) -> MediaInfo:
    exe = ffprobe_path()
    if not exe:
        return MediaInfo()
    try:
        out = subprocess.run(
            [exe, "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
            capture_output=True, text=True, timeout=timeout, check=True).stdout
        data = json.loads(out)
    except (subprocess.SubprocessError, json.JSONDecodeError):
        return MediaInfo()
    info = MediaInfo(source="ffprobe")
    fmt = data.get("format", {})
    if fmt.get("duration"):
        info.duration = round(float(fmt["duration"]), 3)
    streams = data.get("streams", [])
    v = next((s for s in streams if s.get("codec_type") == "video"), None)
    a = next((s for s in streams if s.get("codec_type") == "audio"), None)
    main = v or a
    if v:
        info.width, info.height = v.get("width"), v.get("height")
        info.fps = _fps(v.get("avg_frame_rate") or v.get("r_frame_rate"))
    if main:
        info.codec = main.get("codec_name")
    return info
