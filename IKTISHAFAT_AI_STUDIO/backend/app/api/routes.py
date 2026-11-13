from __future__ import annotations
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from ..core import diagnostics, projects as svc
from ..core.formats import PRESETS, FPS, aspect_fit
from ..core.security import SecurityError, safe_write_path
from ..database.models import Project, MediaFile, TaskLog
from ..database.session import get_session
from .schemas import ProjectIn, ProjectOut, MediaImportIn, MediaOut

router = APIRouter(prefix="/api")


def _project(db: Session, pid: int) -> Project:
    p = db.get(Project, pid)
    if not p:
        raise HTTPException(404, "Project not found")
    return p


def _media_out(m: MediaFile, dup: bool = False) -> MediaOut:
    out = MediaOut.model_validate(m)
    if m.kind in ("video", "image") and m.project:
        out.fit = aspect_fit(m.width, m.height, m.project.width, m.project.height)
    out.status = svc.media_status(m)
    out.duplicate = dup
    return out


@router.get("/health")
def health():
    return {"status": "ok", "app": "IKTISHAFAT AI STUDIO", "version": "0.1.0"}


@router.get("/diagnostics")
def get_diagnostics():
    return diagnostics.run()


@router.get("/formats")
def formats():
    return {"presets": PRESETS, "fps": FPS}


@router.get("/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_session)):
    return db.scalars(select(Project).order_by(Project.updated_at.desc())).all()


@router.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(body: ProjectIn, db: Session = Depends(get_session)):
    try:
        return svc.create_project(db, body.name, body.description, body.language,
                                  body.format_id, body.width, body.height, body.fps)
    except SecurityError as e:
        raise HTTPException(400, str(e))


@router.get("/projects/{pid}", response_model=ProjectOut)
def get_project(pid: int, db: Session = Depends(get_session)):
    return _project(db, pid)


@router.delete("/projects/{pid}")
def delete_project(pid: int, confirm: bool = False, db: Session = Depends(get_session)):
    """Destructive: requires confirm=true, makes a backup first, never touches original media."""
    p = _project(db, pid)
    if not confirm:
        raise HTTPException(409, "Confirmation required (confirm=true)")
    backup = svc.backup_project(db, p)
    folder = safe_write_path(Path(p.folder))
    db.delete(p)
    db.commit()
    shutil.rmtree(folder, ignore_errors=True)
    return {"deleted": pid, "backup": str(backup)}


@router.post("/projects/{pid}/backup")
def backup(pid: int, db: Session = Depends(get_session)):
    return {"backup": str(svc.backup_project(db, _project(db, pid)))}


@router.get("/projects/{pid}/media", response_model=list[MediaOut])
def list_media(pid: int, kind: str | None = None, q: str | None = None,
               db: Session = Depends(get_session)):
    _project(db, pid)
    stmt = select(MediaFile).where(MediaFile.project_id == pid)
    if kind:
        stmt = stmt.where(MediaFile.kind == kind)
    if q:
        stmt = stmt.where(MediaFile.path.ilike(f"%{q}%"))
    return [_media_out(m) for m in db.scalars(stmt.order_by(MediaFile.added_at.desc()))]


@router.post("/projects/{pid}/media", response_model=MediaOut, status_code=201)
def import_media(pid: int, body: MediaImportIn, db: Session = Depends(get_session)):
    p = _project(db, pid)
    try:
        m, dup = svc.import_media(db, p, body.path, body.source, body.license)
    except SecurityError as e:
        raise HTTPException(400, str(e))
    return _media_out(m, dup)


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_session)):
    recent = db.scalars(select(Project).order_by(Project.updated_at.desc()).limit(5)).all()
    counts = dict(db.execute(select(MediaFile.kind, func.count()).group_by(MediaFile.kind)).all())
    missing = sum(1 for m in db.scalars(select(MediaFile)) if svc.media_status(m) == "missing")
    tasks = db.scalars(select(TaskLog).order_by(TaskLog.id.desc()).limit(10)).all()
    diag = diagnostics.run()
    return {
        "project_count": db.scalar(select(func.count()).select_from(Project)),
        "current_project": ProjectOut.model_validate(recent[0]).model_dump(mode="json") if recent else None,
        "recent_projects": [ProjectOut.model_validate(p).model_dump(mode="json") for p in recent],
        "media_counts": counts, "media_missing": missing,
        "tasks": [{"name": t.name, "status": t.status, "detail": t.detail,
                   "at": t.created_at.isoformat()} for t in tasks],
        "davinci": diag["davinci"]["status"], "storage": diag["storage"],
        "local_ai": diag["local_ai"]["reachable"],
    }
