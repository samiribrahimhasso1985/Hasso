# IKTISHAFAT AI STUDIO — DISCOVER • EXPLORE • REVEAL

Desktop cinematic production assistant (Windows 11 target).
**Stack:** Electron + React + TypeScript + Tailwind (UI) · Python + FastAPI + SQLAlchemy/SQLite (core) · FFmpeg/FFprobe.
The Python core is UI-independent, so a PySide6 shell can later be added on the same core.

## Status (v0.2.0)
**Working and tested (26 backend tests, 2 UI tests, live browser run):**
- Dashboard matching the target design: project overview, AI engine status, preview player, AI assistant, processing tasks with real progress + cancel, recent projects, DaVinci status, CPU/RAM/GPU, timeline (V1-V3, A1-A2), media pool.
- **AI link: Claude, ChatGPT, Gemini, Ollama** through one router (fallback optional). Keys live in Windows Credential Manager (keyring), never returned to the UI, never logged. Only text + file names go to the cloud — never video. The assistant receives real project context (media, analysis results, timeline).
- Media: import by reference, FFprobe metadata, thumbnails, duplicate/missing detection, real scene-change + silence analysis (FFmpeg).
- Timeline stored in SQLite; EDL export (interchange helper).
- Projects, backup/restore, diagnostics, 18-section shell, Arabic RTL / German / English (new widgets: Arabic + English; German falls back to English).

**Written but NOT verified against the real thing:**
- Cloud providers: tested with mocked HTTP only. Needs your API key to confirm (AI Models > Save > Test).
- **DaVinci Resolve**: adapter follows the official scripting API and verifies the timeline by reading it back, but it is tested only with a fake module. The "Create Timeline in Resolve" button stays disabled until a live connection exists. Needs Windows + Resolve (Studio) with *External scripting = Local*.
- Electron window / installer on Windows 11.

**Not implemented yet:** camera/lighting/background assistants, storyboard generator, subtitles, audio/color/thumbnail studios, approval UI, installer. These pages say so on screen.

## Video formats
Each project has a target format: 16:9 (HD/4K), **9:16 (1080×1920, Shorts/TikTok/Reels)**, 1:1, 4:5, 21:9, 4:3 or custom size, plus frame rate. The media pool shows how much each clip must be reframed, the preview can show clips inside the project frame, the AI assistant knows the format, and the Resolve timeline is created at that size/rate.

## Build the Windows installer
`scripts\build_windows.bat` (Windows 11 + Python + Node) → `desktop\release\*.exe`. Also available as the GitHub workflow `build-windows.yml` once it is on the default branch. Not yet run on Windows by me: the bundled backend was verified on Linux only.

## Run
- **Windows:** double-click `scripts\run_windows.bat` (needs Python 3.11+, Node 20+; FFmpeg recommended).
- **Dev (any OS):** `scripts/run_dev.sh` → open http://localhost:5173 (backend on 127.0.0.1:8765).

## Test
```
cd backend && pip install -r requirements-dev.txt && python -m pytest -q
cd desktop && npm install && npm run build && npm test
```
Not verifiable on CI/Linux: Electron window on Windows 11, real DaVinci Resolve (tests marked `resolve`), installer.
