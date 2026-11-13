"""Project folders, safe import (originals never touched), backup & restore."""
from __future__ import annotations
import hashlib
import re
import zipfile
from datetime import datetime
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database.models import Project, MediaFile, TaskLog
from ..video.ffprobe import probe
from .config import ensure_dirs
from .formats import FPS, resolve_format
from .security import classify, is_inside, safe_write_path, validate_source_file, SecurityError

SUBFOLDERS = ["storyboard", "timeline", "subtitles", "audio", "exports"]


def _slug(name: str) -> str:
    s = re.sub(r"[^\w\-]+", "_", name.strip(), flags=re.UNICODE).strip("_")
    if not s:
        raise SecurityError("Invalid project name")
    return s


def create_project(db: Session, name: str, description: str = "", language: str = "ar",
                   format_id: str = "hd169", width: int | None = None, height: int | None = None, fps: float = 25.0) -> Project:
    fmt = resolve_format(format_id, width, height)
    if fps not in FPS:
        raise SecurityError(f"Unsupported frame rate: {fps}")
    if db.scalar(select(Project).where(Project.name == name)):
        raise SecurityError("Project name already exists")
    folder = safe_write_path(ensure_dirs() / "projects" / _slug(name))
    if folder.exists():
        raise SecurityError("Project folder already exists")
    for sub in SUBFOLDERS:
        (folder / sub).mkdir(parents=True)
    p = Project(name=name, description=description, language=language, folder=str(folder), format_id=fmt["id"],
                aspect=fmt["aspect"], width=fmt["width"], height=fmt["height"], fps=fps)
    db.add(p)
    db.add(TaskLog(name="create_project", detail=name))
    db.commit()
    return p


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def import_media(db: Session, project: Project, path_str: str,
                 source: str = "", license_: str = "") -> tuple[MediaFile, bool]:
    """Register (by reference) a real file. Returns (record, is_duplicate)."""
    path = validate_source_file(path_str)
    digest = _sha256(path)
    dup = db.scalar(select(MediaFile).where(MediaFile.project_id == project.id,
                                            MediaFile.sha256 == digest))
    if dup:
        return dup, True
    info = probe(path) if classify(path) in ("video", "audio", "image") else None
    m = MediaFile(project_id=project.id, path=str(path), kind=classify(path),
                  size_bytes=path.stat().st_size, sha256=digest, source=source, license=license_)
    if info:
        m.duration, m.width, m.height, m.fps, m.codec, m.meta_source = (
            info.duration, info.width, info.height, info.fps, info.codec, info.source)
    db.add(m)
    db.add(TaskLog(project_id=project.id, name="import_media", detail=str(path)))
    db.commit()
    return m, False


def media_status(m: MediaFile) -> str:
    return "ok" if Path(m.path).is_file() else "missing"


def backup_project(db: Session, project: Project) -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    dest = safe_write_path(ensure_dirs() / "backups" / f"{_slug(project.name)}-{stamp}.zip")
    folder = Path(project.folder)
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
        for f in folder.rglob("*"):
            if f.is_file():
                z.write(f, f.relative_to(folder.parent))
    db.add(TaskLog(project_id=project.id, name="backup", detail=str(dest)))
    db.commit()
    return dest


def restore_backup(zip_path: Path) -> Path:
    """Restore project files into projects/ (never overwrites an existing folder)."""
    zp = safe_write_path(zip_path)
    root = safe_write_path(ensure_dirs() / "projects")
    with zipfile.ZipFile(zp) as z:
        tops = {Path(n).parts[0] for n in z.namelist() if n.strip("/")}
        if len(tops) != 1:
            raise SecurityError("Invalid backup layout")
        top = tops.pop()
        if (root / top).exists():
            raise SecurityError("Project folder already exists; refusing to overwrite")
        for n in z.namelist():
            if not is_inside(root / n, root / top):  # blocks zip-slip
                raise SecurityError(f"Unsafe path in backup: {n}")
        z.extractall(root)
    return root / top
