"""Video format presets (aspect ratio + resolution) for projects."""
from __future__ import annotations
from .security import SecurityError

PRESETS = [
    {"id": "hd169", "aspect": "16:9", "width": 1920, "height": 1080, "use": "YouTube / landscape"},
    {"id": "uhd169", "aspect": "16:9", "width": 3840, "height": 2160, "use": "YouTube 4K"},
    {"id": "vert916", "aspect": "9:16", "width": 1080, "height": 1920, "use": "Shorts / TikTok / Reels"},
    {"id": "sq11", "aspect": "1:1", "width": 1080, "height": 1080, "use": "Instagram / Facebook square"},
    {"id": "port45", "aspect": "4:5", "width": 1080, "height": 1350, "use": "Instagram feed portrait"},
    {"id": "cine219", "aspect": "21:9", "width": 2560, "height": 1080, "use": "Cinematic ultrawide"},
    {"id": "std43", "aspect": "4:3", "width": 1440, "height": 1080, "use": "Classic 4:3"},
]
FPS = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60]


def resolve_format(format_id: str, width: int | None = None, height: int | None = None) -> dict:
    if format_id == "custom":
        if not width or not height or not (16 <= width <= 8192 and 16 <= height <= 8192) or width % 2 or height % 2:
            raise SecurityError("Custom size needs even width/height between 16 and 8192")
        from math import gcd
        g = gcd(width, height)
        return {"id": "custom", "aspect": f"{width // g}:{height // g}", "width": width, "height": height}
    p = next((p for p in PRESETS if p["id"] == format_id), None)
    if not p:
        raise SecurityError(f"Unknown format: {format_id}")
    return p


def aspect_fit(src_w: int | None, src_h: int | None, dst_w: int, dst_h: int) -> dict | None:
    """How a source clip fits the project frame (computed, not guessed)."""
    if not src_w or not src_h:
        return None
    s, d = src_w / src_h, dst_w / dst_h
    if abs(s - d) / d < 0.02:
        return {"status": "match"}
    if s > d:  # wider than frame: crop sides to fill
        return {"status": "reframe", "crop_percent": round((1 - d / s) * 100), "axis": "width"}
    return {"status": "reframe", "crop_percent": round((1 - s / d) * 100), "axis": "height"}
