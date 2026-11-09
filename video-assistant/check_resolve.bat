@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo [X] Run setup_windows.bat first.
  pause & exit /b 1
)
echo Make sure DaVinci Resolve Studio is OPEN before continuing.
pause
".venv\Scripts\python.exe" -m vpa resolve-check
pause
