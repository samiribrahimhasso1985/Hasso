"""Application paths and settings. Data lives locally (Windows: %LOCALAPPDATA%)."""
from __future__ import annotations
import os
import sys
from pathlib import Path

APP_NAME = "IKTISHAFAT_AI_STUDIO"
SUBDIRS = ["projects", "media", "thumbnails", "proxies", "models", "cache",
           "logs", "database", "exports", "backups", "settings"]


def data_root() -> Path:
    override = os.environ.get("IKTISHAFAT_DATA_DIR")
    if override:
        return Path(override).expanduser().resolve()
    if sys.platform == "win32":
        base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
    else:
        base = os.environ.get("XDG_DATA_HOME") or str(Path.home() / ".local" / "share")
    return (Path(base) / APP_NAME).resolve()


def ensure_dirs() -> Path:
    root = data_root()
    for sub in SUBDIRS:
        (root / sub).mkdir(parents=True, exist_ok=True)
    return root


def db_url() -> str:
    return f"sqlite:///{(ensure_dirs() / 'database' / 'studio.db').as_posix()}"
