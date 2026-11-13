from __future__ import annotations
import shutil
import subprocess
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..ai import providers, router as ai_router, secrets
from ..ai.providers import ProviderError
from ..core import tasks, timeline as tl, system
from ..core.config import ensure_dirs
from ..core.security import SecurityError, safe_write_path
from ..database.models import MediaFile, Project, TaskLog, TimelineClip
from ..database.session import get_session
from ..davinci import adapter, detect

router = APIRouter(prefix="/api")


def _media(db: Session, mid: int) -> MediaFile:
    m = db.get(MediaFile, mid)
    if not m:
        raise HTTPException(404, "Media not found")
    return m


def _project(db: Session, pid: int) -> Project:
    p = db.get(Project, pid)
    if not p:
        raise HTTPException(404, "Project not found")
    return p


# ---- media serving (only files registered in the library) ----
@router.get("/media/{mid}/file")
def media_file(mid: int, db: Session = Depends(get_session)):
    m = _media(db, mid)
    if not Path(m.path).is_file():
        raise HTTPException(404, "File missing on disk")
    return FileResponse(m.path)


@router.get("/media/{mid}/thumbnail")
def media_thumb(mid: int, db: Session = Depends(get_session)):
    m = _media(db, mid)
    if m.kind not in ("video", "image") or not Path(m.path).is_file():
        raise HTTPException(404, "No thumbnail")
    out = safe_write_path(ensure_dirs() / "thumbnails" / f"{m.sha256[:16]}.jpg")
    if not out.exists():
        ff = shutil.which("ffmpeg")
        if not ff:
            raise HTTPException(503, "ffmpeg not installed")
        ss = ["-ss", str(min(1.0, (m.duration or 0) / 2))] if m.kind == "video" else []
        r = subprocess.run([ff, "-v", "error", "-y", *ss, "-i", m.path, "-frames:v", "1", "-vf", "scale=320:-2", str(out)],
                           capture_output=True, timeout=30)
        if r.returncode != 0 or not out.exists():
            raise HTTPException(500, "Thumbnail generation failed")
    return FileResponse(out, media_type="image/jpeg")


@router.get("/media/{mid}/analysis")
def media_analysis(mid: int, db: Session = Depends(get_session)):
    return _media(db, mid).analysis or {}


# ---- tasks ----
@router.post("/media/{mid}/analyze")
def analyze(mid: int, db: Session = Depends(get_session)):
    m = _media(db, mid)
    if m.kind not in ("video", "audio") or not Path(m.path).is_file():
        raise HTTPException(400, "Only existing video/audio files can be analyzed")
    return {"task_id": tasks.start_analysis(m.id, m.path, m.duration, m.kind == "video")}


@router.get("/tasks")
def get_tasks():
    return tasks.list_tasks()


@router.post("/tasks/{tid}/cancel")
def cancel_task(tid: int):
    if not tasks.cancel(tid):
        raise HTTPException(409, "Task is not running")
    return {"cancelling": tid}


# ---- overview & timeline ----
@router.get("/projects/{pid}/overview")
def overview(pid: int, db: Session = Depends(get_session)):
    p = _project(db, pid)
    media = db.scalars(select(MediaFile).where(MediaFile.project_id == pid)).all()
    v = next((m for m in media if m.kind == "video" and m.width), None)
    cl = tl.clips(db, pid)
    return {"project": {"id": p.id, "name": p.name, "stage": p.stage, "updated_at": p.updated_at.isoformat()},
            "resolution": f"{v.width} × {v.height}" if v else None, "fps": v.fps if v else None,
            "target": {"aspect": p.aspect, "width": p.width, "height": p.height, "fps": p.fps},
            "timeline_duration": tl.total_duration(cl), "clip_count": len(cl), "media_count": len(media),
            "thumb_media_id": v.id if v else None}


class ClipIn(BaseModel):
    media_id: int
    track: str
    start: float | None = None
    in_point: float = 0.0
    out_point: float | None = None


@router.get("/projects/{pid}/timeline")
def get_timeline(pid: int, db: Session = Depends(get_session)):
    _project(db, pid)
    cl = tl.clips(db, pid)
    return {"clips": cl, "duration": tl.total_duration(cl), "tracks": tl.VIDEO_TRACKS + tl.AUDIO_TRACKS}


@router.post("/projects/{pid}/timeline/clips", status_code=201)
def add_clip(pid: int, body: ClipIn, db: Session = Depends(get_session)):
    p = _project(db, pid)
    try:
        c = tl.add_clip(db, p, _media(db, body.media_id), body.track, body.start, body.in_point, body.out_point)
    except SecurityError as e:
        raise HTTPException(400, str(e))
    return {"id": c.id}


@router.delete("/projects/{pid}/timeline/clips/{cid}")
def delete_clip(pid: int, cid: int, db: Session = Depends(get_session)):
    c = db.get(TimelineClip, cid)
    if not c or c.project_id != pid:
        raise HTTPException(404, "Clip not found")
    db.delete(c)
    db.commit()
    return {"deleted": cid}


@router.post("/projects/{pid}/export/edl")
def export_edl(pid: int, db: Session = Depends(get_session)):
    p = _project(db, pid)
    cl = tl.clips(db, pid)
    if not [c for c in cl if c["track"] == "V1"]:
        raise HTTPException(400, "Timeline has no clips on V1")
    fps = next((c["fps"] for c in cl if c["fps"]), 25.0)
    out = safe_write_path(Path(p.folder) / "exports" / "timeline.edl")
    out.write_text(tl.to_edl(p.name, cl, fps), encoding="utf-8")
    db.add(TaskLog(project_id=pid, name="export_edl", detail=str(out)))
    db.commit()
    return {"path": str(out)}


# ---- system ----
@router.get("/system/resources")
def resources():
    return system.resources()


# ---- AI ----
@router.get("/ai/providers")
def ai_status():
    return {"providers": ai_router.status(), "secure_store": secrets.secure_store_available()}


class KeyIn(BaseModel):
    key: str = Field(min_length=8, max_length=500)


@router.put("/ai/providers/{p}/key")
def ai_set_key(p: str, body: KeyIn):
    if p not in providers.PROVIDERS or p == "ollama":
        raise HTTPException(404, "Provider takes no API key")
    try:
        secrets.set_key(p, body.key.strip())
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    return {"configured": True}  # the key is never echoed back


@router.delete("/ai/providers/{p}/key")
def ai_del_key(p: str):
    secrets.delete_key(p)
    return {"configured": bool(secrets.get_key(p))}


@router.post("/ai/providers/{p}/test")
def ai_test(p: str):
    if p not in providers.PROVIDERS:
        raise HTTPException(404, "Unknown provider")
    return ai_router.test(p)


class AssistIn(BaseModel):
    project_id: int | None = None
    provider: str
    model: str
    prompt: str = Field(min_length=1, max_length=8000)
    history: list[dict] = []
    allow_fallback: bool = False
    fallback_models: dict[str, str] = {}


def _context(db: Session, pid: int | None) -> str:
    if not pid:
        return "No project is open."
    p = _project(db, pid)
    media = db.scalars(select(MediaFile).where(MediaFile.project_id == pid)).all()
    cl = tl.clips(db, pid)
    r = detect.detect()
    lines = [f"Project: {p.name} (stage: {p.stage}). Description: {p.description or '-'}",
             f"Target video format: {p.aspect} ({p.width}x{p.height}) at {p.fps} fps",
             "Media pool:"]
    for m in media[:40]:
        a = m.analysis or {}
        lines.append(f"- {Path(m.path).name} [{m.kind}] {m.width}x{m.height} {m.fps}fps {m.duration}s"
                     + (f" scenes={len(a.get('scene_changes', []))} silences={len(a.get('silences', []))}" if a else ""))
    lines.append("Timeline clips: " + ("; ".join(f"{c['track']} {c['name']} @{c['start']}s len {c['duration']}s" for c in cl[:60]) or "none"))
    lines.append(f"DaVinci Resolve install status: {r['status']}.")
    return "\n".join(lines)


SYSTEM = ("You are the assistant inside IKTISHAFAT AI STUDIO, a cinematic video production app. "
          "Answer in the user's language. Base advice on the project context below; never invent facts about the footage "
          "that the context does not state. All suggestions are proposals for the user to approve.\n\nCONTEXT\n")


@router.post("/assistant")
def assistant(body: AssistIn, db: Session = Depends(get_session)):
    history = [m for m in body.history if m.get("role") in ("user", "assistant") and isinstance(m.get("content"), str)][-10:]
    msgs = history + [{"role": "user", "content": body.prompt}]
    try:
        res = ai_router.route(body.provider, body.model, msgs, SYSTEM + _context(db, body.project_id),
                              body.allow_fallback, body.fallback_models)
    except ProviderError as e:
        raise HTTPException(502, str(e))
    # privacy: log metadata only, never prompt or answer content
    db.add(TaskLog(project_id=body.project_id, name="ai_request",
                   detail=f"{res['provider']}/{res['model']} in={len(body.prompt)}ch out={len(res['text'])}ch"))
    db.commit()
    return res


# ---- DaVinci ----
@router.get("/davinci/status")
def davinci_status():
    return {**detect.detect(), "connection": adapter.status()}


class TimelineIn(BaseModel):
    approved: bool = False
    name: str | None = None


@router.post("/projects/{pid}/davinci/timeline")
def davinci_timeline(pid: int, body: TimelineIn, db: Session = Depends(get_session)):
    p = _project(db, pid)
    if not body.approved:
        raise HTTPException(409, "User approval required before sending the timeline to Resolve")
    cl = tl.clips(db, pid)
    if not cl:
        raise HTTPException(400, "Timeline is empty")
    try:
        res = adapter.build_timeline(body.name or p.name, cl, p.fps, size=(p.width, p.height))
    except adapter.ResolveError as e:
        raise HTTPException(502, str(e))
    db.add(TaskLog(project_id=pid, name="davinci_timeline", detail=f"{res['timeline']} ({res['clips']} clips, verified)"))
    db.commit()
    return res
