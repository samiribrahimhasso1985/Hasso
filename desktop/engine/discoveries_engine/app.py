"""FastAPI application. Listens on loopback only; every endpoint except /health requires
the per-launch token passed by the desktop app in the X-Engine-Token header."""
from __future__ import annotations

import os
import platform
import secrets
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

from . import __version__, media

app = FastAPI(title="DISCOVERIES Engine", version=__version__)

# Provider name -> environment variable that may hold its key. Keys are never returned.
PROVIDERS = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "gemini": "GEMINI_API_KEY",
}


def _expected_token() -> str | None:
    return os.environ.get("DISCOVERIES_ENGINE_TOKEN")


def require_token(x_engine_token: str | None = Header(default=None)) -> None:
    expected = _expected_token()
    if not expected:
        raise HTTPException(status_code=503, detail="engine token not configured")
    if not x_engine_token or not secrets.compare_digest(x_engine_token, expected):
        raise HTTPException(status_code=401, detail="invalid engine token")


class PathRequest(BaseModel):
    path: str


def _existing_file(raw: str) -> Path:
    p = Path(raw)
    if not p.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    return p


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "version": __version__,
        "python": platform.python_version(),
        "ffmpeg": media.tool_path("ffmpeg") is not None,
        "ffprobe": media.tool_path("ffprobe") is not None,
        "token_configured": _expected_token() is not None,
    }


@app.get("/providers", dependencies=[Depends(require_token)])
def providers() -> dict:
    return {
        "providers": [
            {"id": pid, "configured": bool(os.environ.get(env))}
            for pid, env in PROVIDERS.items()
        ]
    }


@app.post("/media/probe", dependencies=[Depends(require_token)])
def media_probe(req: PathRequest) -> dict:
    path = _existing_file(req.path)
    try:
        return media.probe(path)
    except media.ToolMissingError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@app.post("/media/hash", dependencies=[Depends(require_token)])
def media_hash(req: PathRequest) -> dict:
    path = _existing_file(req.path)
    return {"path": str(path), "sha256": media.sha256_file(path), "size_bytes": path.stat().st_size}
