"""Project folders, persistent stage state and recovery.

Every project lives in its own folder:

    projects/<name>/
        00_source/      original media (read-only copy) + source_info.json
        01_audio/       extracted analysis audio
        02_transcript/  raw + normalized transcript, review page
        03_subtitles/   (stage 3)
        04_stickers/    (stage 4)
        05_resolve/     (stage 5)
        06_color/       (stage 6)
        07_export/      (final export, only after approval)
        logs/
        state.json      which steps finished / failed, so a rerun resumes

A step that completed is skipped on rerun unless forced. A failed step is
recorded with its error so the user (or Claude) can see where it stopped.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from .errors import ProjectError

FOLDERS = [
    "00_source",
    "01_audio",
    "02_transcript",
    "03_subtitles",
    "04_stickers",
    "05_resolve",
    "06_color",
    "07_export",
    "logs",
]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def safe_name(name: str) -> str:
    # Keep Arabic letters; drop characters Windows forbids in folder names.
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name).strip(" .")
    return name or "project"


def write_json_atomic(path: Path, data) -> None:
    """Write via temp file + rename so a crash never leaves half a JSON file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".tmp_", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, path)
    except BaseException:
        Path(tmp).unlink(missing_ok=True)
        raise


class Project:
    def __init__(self, root: Path):
        self.root = Path(root)
        self.state_path = self.root / "state.json"

    # -- creation ---------------------------------------------------------
    @classmethod
    def create_or_open(cls, projects_root: Path, name: str) -> "Project":
        p = cls(Path(projects_root) / safe_name(name))
        for f in FOLDERS:
            (p.root / f).mkdir(parents=True, exist_ok=True)
        if not p.state_path.exists():
            write_json_atomic(
                p.state_path,
                {"name": name, "created": _now(), "steps": {}},
            )
        return p

    @classmethod
    def open(cls, path: Path) -> "Project":
        p = cls(path)
        if not p.state_path.exists():
            raise ProjectError(
                f"Not a project folder: {path}",
                f"هذا المجلد ليس مشروعاً صالحاً: {path}",
            )
        return p

    def dir(self, key: str) -> Path:
        return self.root / key

    # -- state ------------------------------------------------------------
    def state(self) -> dict:
        try:
            return json.loads(self.state_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            raise ProjectError(
                f"state.json is corrupted: {e}",
                "ملف حالة المشروع state.json تالف. أعد تشغيل التحليل مع الخيار --force",
            ) from e

    def _save(self, st: dict) -> None:
        write_json_atomic(self.state_path, st)

    def step_done(self, step: str) -> bool:
        return self.state()["steps"].get(step, {}).get("status") == "done"

    def mark(self, step: str, status: str, **info) -> None:
        st = self.state()
        entry = st["steps"].get(step, {})
        entry.update(info)
        entry["status"] = status
        entry["updated"] = _now()
        if status != "failed":
            entry.pop("error", None)
        st["steps"][step] = entry
        self._save(st)

    def set_meta(self, **meta) -> None:
        st = self.state()
        st.update(meta)
        self._save(st)
