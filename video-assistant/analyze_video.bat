@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo [X] Run setup_windows.bat first.
  pause & exit /b 1
)
set "FILE=%~1"
if "%FILE%"=="" (
  echo Drag a video file onto this .bat, or paste its full path here:
  set /p "FILE=> "
)
if not defined FILE (echo [X] No file given. & pause & exit /b 1)
set "FILE=%FILE:"=%"
".venv\Scripts\python.exe" -m vpa analyze "%FILE%" --open
echo.
pause
