from __future__ import annotations
import platform
import shutil
import sys
import subprocess
from .config import data_root, ensure_dirs
from ..davinci.detect import detect
from ..ai.local import ollama_status
from ..video.ffprobe import ffprobe_path


def _version(exe: str | None) -> str | None:
    if not exe:
        return None
    try:
        out = subprocess.run([exe, "-version"], capture_output=True, text=True, timeout=5).stdout
        return out.splitlines()[0] if out else None
    except (subprocess.SubprocessError, OSError):
        return None


def run() -> dict:
    root = ensure_dirs()
    usage = shutil.disk_usage(root)
    return {
        "platform": {"system": platform.system(), "release": platform.release(),
                     "python": sys.version.split()[0], "is_windows": sys.platform == "win32"},
        "ffmpeg": {"path": shutil.which("ffmpeg"), "version": _version(shutil.which("ffmpeg"))},
        "ffprobe": {"path": ffprobe_path(), "version": _version(ffprobe_path())},
        "davinci": detect(),
        "local_ai": ollama_status(),
        "storage": {"data_dir": str(root), "free_gb": round(usage.free / 1e9, 2),
                    "total_gb": round(usage.total / 1e9, 2)},
    }
