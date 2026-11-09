@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo [X] Run setup_windows.bat first.
  pause & exit /b 1
)
".venv\Scripts\python.exe" -m vpa check
pause
