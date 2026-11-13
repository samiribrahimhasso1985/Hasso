# Architecture
Electron main (sandboxed renderer, `contextIsolation`, minimal preload: `pickFile`, `apiBase`) → spawns Python backend on 127.0.0.1:8765 → React talks to it via HTTP.

Backend layers (`backend/app`): `api/` routes+schemas · `core/` config, security (path guard, file-type allowlist), projects service, diagnostics · `database/` SQLAlchemy models (Project, MediaFile, TaskLog, Approval) · `video/ffprobe.py` · `davinci/detect.py` · `ai/local.py`. Other packages (camera, lighting, production, storyboard, audio, subtitles, quality) are empty placeholders for later phases.

Rules enforced in code: originals are never modified or moved (import = reference + hash); writes/deletes only inside the data dir; delete needs `confirm=true` and makes a backup first; metadata reports `meta_source` so unprobed values are never presented as real.
