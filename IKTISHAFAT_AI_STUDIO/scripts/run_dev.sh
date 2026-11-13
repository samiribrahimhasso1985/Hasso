#!/usr/bin/env bash
# Dev run (Linux/macOS): backend + Vite. For Electron: cd desktop && npm run start
set -e
cd "$(dirname "$0")/.."
python3 -m venv backend/.venv 2>/dev/null || true
backend/.venv/bin/pip install -q -r backend/requirements.txt
(cd backend && .venv/bin/python -m app.main) &
(cd desktop && npm install --no-audit --no-fund && npm run dev)
