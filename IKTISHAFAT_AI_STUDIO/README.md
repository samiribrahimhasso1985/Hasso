# IKTISHAFAT AI STUDIO — DISCOVER • EXPLORE • REVEAL

Desktop cinematic production assistant (Windows 11 target).
**Stack:** Electron + React + TypeScript + Tailwind (UI) · Python + FastAPI + SQLAlchemy/SQLite (core) · FFmpeg/FFprobe.
The Python core is UI-independent, so a PySide6 shell can later be added on the same core.

## Status (v0.1.0 — Phases 1 & 2 foundation)
| Works and tested | Not implemented yet |
|---|---|
| Local data dir (`%LOCALAPPDATA%\IKTISHAFAT_AI_STUDIO`), SQLite | Camera / Lighting / Background assistants |
| Create / list / delete projects (backup before delete) | Speech, Storyboard, Smart Editor, Subtitles, Audio, Color |
| Backup + restore (zip-slip protected) | Hybrid AI engine (only Ollama *detection* exists) |
| Media import by reference, SHA-256 duplicate detection, missing-file detection | Thumbnails, proxies |
| Real metadata via FFprobe (duration, size, fps, codec) | **DaVinci Resolve integration** (only install detection) |
| Diagnostics: FFmpeg, FFprobe, Resolve install, Ollama, disk | Approval system UI, Quality Control, installer |
| 18-section dashboard shell, Arabic RTL / German / English | |

Unimplemented sections say so on screen — no fake buttons.

## Run
- **Windows:** double-click `scripts\run_windows.bat` (needs Python 3.11+, Node 20+; FFmpeg recommended).
- **Dev (any OS):** `scripts/run_dev.sh` → open http://localhost:5173 (backend on 127.0.0.1:8765).

## Test
```
cd backend && pip install -r requirements-dev.txt && python -m pytest -q
cd desktop && npm install && npm run build && npm test
```
Not verifiable on CI/Linux: Electron window on Windows 11, real DaVinci Resolve (tests marked `resolve`), installer.
