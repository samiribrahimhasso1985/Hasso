"""Path safety: writes/deletes are only allowed inside the app data root."""
from __future__ import annotations
from pathlib import Path
from .config import data_root

MEDIA_EXT = {
    "video": {".mp4", ".mov", ".mkv", ".avi", ".mxf", ".webm", ".m4v"},
    "audio": {".wav", ".mp3", ".aac", ".flac", ".m4a", ".ogg"},
    "image": {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp"},
    "subtitle": {".srt", ".vtt"},
    "project": {".drp", ".xml", ".fcpxml", ".edl", ".aaf"},
}


class SecurityError(ValueError):
    pass


def classify(path: Path) -> str:
    ext = path.suffix.lower()
    for kind, exts in MEDIA_EXT.items():
        if ext in exts:
            return kind
    raise SecurityError(f"Unsupported file type: {ext or '(none)'}")


def is_inside(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def safe_write_path(path: Path) -> Path:
    """Resolve and ensure a write/delete target is inside the data root."""
    p = Path(path).resolve()
    if not is_inside(p, data_root()):
        raise SecurityError(f"Path outside application data directory: {p}")
    return p


def validate_source_file(path_str: str) -> Path:
    """Validate a user-chosen media file for read-only import."""
    p = Path(path_str).expanduser()
    if not p.is_absolute():
        raise SecurityError("Absolute path required")
    p = p.resolve()
    if not p.is_file():
        raise SecurityError("File not found")
    classify(p)
    return p
