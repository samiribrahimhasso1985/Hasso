from __future__ import annotations
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database.models import TimelineClip, MediaFile, Project
from .security import SecurityError

VIDEO_TRACKS = ["V1", "V2", "V3"]
AUDIO_TRACKS = ["A1", "A2"]


def add_clip(db: Session, project: Project, media: MediaFile, track: str, start: float | None = None,
             in_point: float = 0.0, out_point: float | None = None) -> TimelineClip:
    if media.project_id != project.id:
        raise SecurityError("Media does not belong to this project")
    ok = AUDIO_TRACKS if media.kind == "audio" else VIDEO_TRACKS if media.kind in ("video", "image") else []
    if track not in ok:
        raise SecurityError(f"A {media.kind} file cannot be placed on track {track}")
    src_len = media.duration or 5.0  # still images: default 5 s
    out = src_len if out_point is None else out_point
    if not (0 <= in_point < out <= src_len + 0.001):
        raise SecurityError("Invalid in/out points")
    if start is None:
        existing = db.scalars(select(TimelineClip).where(TimelineClip.project_id == project.id, TimelineClip.track == track)).all()
        start = max((c.start + c.out_point - c.in_point for c in existing), default=0.0)
    c = TimelineClip(project_id=project.id, media_id=media.id, track=track, start=start, in_point=in_point, out_point=out)
    db.add(c)
    db.commit()
    return c


def clips(db: Session, pid: int) -> list[dict]:
    rows = db.execute(select(TimelineClip, MediaFile).join(MediaFile, MediaFile.id == TimelineClip.media_id)
                      .where(TimelineClip.project_id == pid).order_by(TimelineClip.track, TimelineClip.start)).all()
    return [{"id": c.id, "media_id": m.id, "name": Path(m.path).name, "kind": m.kind, "track": c.track,
             "start": c.start, "in_point": c.in_point, "out_point": c.out_point,
             "duration": round(c.out_point - c.in_point, 3), "path": m.path, "fps": m.fps} for c, m in rows]


def total_duration(cl: list[dict]) -> float:
    return round(max((c["start"] + c["duration"] for c in cl), default=0.0), 3)


def tc(seconds: float, fps: float) -> str:
    f = round(seconds * fps)
    n = round(fps)
    return f"{f // (n * 3600):02d}:{f // (n * 60) % 60:02d}:{f // n % 60:02d}:{f % n:02d}"


def to_edl(title: str, cl: list[dict], fps: float = 25.0) -> str:
    """CMX3600 EDL for video-track cuts (V1) - a helper interchange file, not a Resolve integration."""
    lines = [f"TITLE: {title}", "FCM: NON-DROP FRAME", ""]
    for i, c in enumerate([c for c in cl if c["track"] == "V1"], 1):
        reel = (Path(c["name"]).stem[:8].upper() or "AX").ljust(8)
        lines.append(f"{i:03d}  {reel} V     C        {tc(c['in_point'], fps)} {tc(c['out_point'], fps)} "
                     f"{tc(c['start'], fps)} {tc(c['start'] + c['duration'], fps)}")
        lines.append(f"* FROM CLIP NAME: {c['name']}")
    return "\n".join(lines) + "\n"
