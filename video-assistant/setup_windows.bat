@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo  Video Production Assistant - Setup (Stage 1)
echo ============================================

rem --- Python (3.12 recommended, 3.11 also fine) ---
set "PY="
py -3.12 -c "import sys" >nul 2>&1 && set "PY=py -3.12"
if not defined PY py -3.11 -c "import sys" >nul 2>&1 && set "PY=py -3.11"
if not defined PY (
  echo [X] Python 3.12 or 3.11 not found.
  echo     Install it with:  winget install -e --id Python.Python.3.12
  echo     then run this file again.
  pause & exit /b 1
)
echo [OK] Using %PY%

rem --- FFmpeg ---
where ffmpeg >nul 2>&1
if errorlevel 1 (
  echo [..] FFmpeg not found - installing with winget...
  winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements
  echo.
  echo [!] FFmpeg installed. CLOSE this window and run setup_windows.bat again
  echo     so Windows picks up the new PATH.
  pause & exit /b 1
)
echo [OK] FFmpeg found

rem --- Virtual environment ---
if not exist ".venv\Scripts\python.exe" (
  echo [..] Creating virtual environment .venv
  %PY% -m venv .venv || (echo [X] venv failed & pause & exit /b 1)
)
set "VPY=.venv\Scripts\python.exe"
"%VPY%" -m pip install --upgrade pip

rem --- PyTorch: CUDA build when an NVIDIA GPU is present ---
where nvidia-smi >nul 2>&1
if errorlevel 1 (
  echo [..] No NVIDIA GPU detected - installing CPU PyTorch - transcription will be slower
  "%VPY%" -m pip install torch==2.8.0 torchaudio==2.8.0 torchvision==0.23.0
) else (
  echo [..] NVIDIA GPU detected - installing CUDA PyTorch
  "%VPY%" -m pip install torch==2.8.0 torchaudio==2.8.0 torchvision==0.23.0 --index-url https://download.pytorch.org/whl/cu128
)
if errorlevel 1 (echo [X] PyTorch install failed - see messages above & pause & exit /b 1)

rem --- WhisperX + faster-whisper ---
"%VPY%" -m pip install -r requirements.txt
if errorlevel 1 (
  echo [!] WhisperX install failed. Installing faster-whisper only - fallback with less precise timing.
  "%VPY%" -m pip install "faster-whisper>=1.2.0" pytest || (echo [X] install failed & pause & exit /b 1)
)

echo.
"%VPY%" -m vpa check
echo.
echo Setup finished. Drag a video onto analyze_video.bat to start.
pause
