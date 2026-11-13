@echo off
REM IKTISHAFAT AI STUDIO - Windows 11 launcher (checks dependencies first)
cd /d "%~dp0\.."
where python >nul 2>nul || (echo [ERROR] Python 3.11+ not found. Install from python.org & pause & exit /b 1)
where node >nul 2>nul || (echo [ERROR] Node.js 20+ not found. Install from nodejs.org & pause & exit /b 1)
where ffprobe >nul 2>nul || echo [WARN] FFmpeg/FFprobe not found - media metadata will be unavailable.
if not exist backend\.venv python -m venv backend\.venv
backend\.venv\Scripts\pip install -q -r backend\requirements.txt || (echo [ERROR] pip failed & pause & exit /b 1)
cd desktop
if not exist node_modules call npm install --no-audit --no-fund
call npm run start
