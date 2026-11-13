@echo off
REM Builds the installer: IKTISHAFAT_AI_STUDIO\desktop\release\*.exe  (run on Windows 11)
cd /d "%~dp0\..\backend"
where python >nul 2>nul || (echo [ERROR] Python 3.11+ required & exit /b 1)
where node >nul 2>nul || (echo [ERROR] Node.js 20+ required & exit /b 1)
if not exist .venv python -m venv .venv
call .venv\Scripts\pip install -q -r requirements-dev.txt pyinstaller || exit /b 1
call .venv\Scripts\python -m pytest -q -m "not resolve" || (echo [ERROR] backend tests failed & exit /b 1)
set IKTISHAFAT_NO_AUTOINIT=1
call .venv\Scripts\pyinstaller --noconfirm --clean --onedir --name iktishafat-backend --collect-submodules uvicorn --collect-submodules keyring --hidden-import sqlalchemy.dialects.sqlite --paths . run_backend.py || exit /b 1
cd ..\desktop
call npm install --no-audit --no-fund || exit /b 1
call npm test || exit /b 1
call npm run dist:win || exit /b 1
echo.
echo Installer ready in IKTISHAFAT_AI_STUDIO\desktop\release
