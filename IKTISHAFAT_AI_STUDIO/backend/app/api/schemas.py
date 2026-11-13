from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ProjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    language: str = Field(default="ar", pattern="^(ar|de|en)$")


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str
    stage: str
    language: str
    folder: str
    created_at: datetime
    updated_at: datetime


class MediaImportIn(BaseModel):
    path: str
    source: str = ""
    license: str = ""


class MediaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    path: str
    kind: str
    size_bytes: int
    duration: float | None
    width: int | None
    height: int | None
    fps: float | None
    codec: str | None
    meta_source: str
    source: str
    license: str
    status: str = "ok"
    duplicate: bool = False
