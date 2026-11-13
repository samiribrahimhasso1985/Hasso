from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy import ForeignKey, String, Text, Integer, Float, DateTime, JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")
    stage: Mapped[str] = mapped_column(String(30), default="pre-production")
    language: Mapped[str] = mapped_column(String(5), default="ar")
    format_id: Mapped[str] = mapped_column(String(20), default="hd169")
    aspect: Mapped[str] = mapped_column(String(10), default="16:9")
    width: Mapped[int] = mapped_column(Integer, default=1920)
    height: Mapped[int] = mapped_column(Integer, default=1080)
    fps: Mapped[float] = mapped_column(Float, default=25.0)
    folder: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    media: Mapped[list["MediaFile"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class MediaFile(Base):
    __tablename__ = "media_files"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    path: Mapped[str] = mapped_column(String(1000))  # original, never modified
    kind: Mapped[str] = mapped_column(String(20))
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    sha256: Mapped[str] = mapped_column(String(64), default="")
    duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fps: Mapped[float | None] = mapped_column(Float, nullable=True)
    codec: Mapped[str | None] = mapped_column(String(50), nullable=True)
    meta_source: Mapped[str] = mapped_column(String(20), default="none")  # ffprobe | none
    analysis: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    source: Mapped[str] = mapped_column(String(300), default="")
    license: Mapped[str] = mapped_column(String(300), default="")
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    project: Mapped[Project] = relationship(back_populates="media")


class TaskLog(Base):
    __tablename__ = "task_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="done")  # running|done|failed|cancelled
    detail: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Approval(Base):
    __tablename__ = "approvals"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    subject: Mapped[str] = mapped_column(String(50))  # storyboard, timeline, export...
    ref: Mapped[str] = mapped_column(String(100), default="")
    status: Mapped[str] = mapped_column(String(20), default="pending")
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class TimelineClip(Base):
    __tablename__ = "timeline_clips"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    media_id: Mapped[int] = mapped_column(ForeignKey("media_files.id"))
    track: Mapped[str] = mapped_column(String(4))  # V1..V3, A1..A2
    start: Mapped[float] = mapped_column(Float, default=0.0)      # position on timeline (s)
    in_point: Mapped[float] = mapped_column(Float, default=0.0)   # source in (s)
    out_point: Mapped[float] = mapped_column(Float, default=0.0)  # source out (s)
