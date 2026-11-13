# Claude Video Production Assistant – instructions for Claude Code

The user does not edit source code. They interact through the .bat launchers,
the review pages, `config/user_config.json`, and by asking Claude Code.
User-facing text (console messages, review pages, docs) is Arabic.

## Rules
- Build one stage at a time (see docs/ROADMAP_AR.md). Do not start a stage before
  the previous one passed the real-video test (docs/STAGE1_TEST_AR.md pattern).
- Never modify or overwrite the user's original media. Work on copies in `00_source/`.
- Never invent speech, words, historical photographs or facts. Flag uncertainty instead.
- Never export a final video without explicit user confirmation.
- Do not claim Arabic alignment or DaVinci Resolve integration works until it was
  tested on real material / real Resolve 21. Say what was and wasn't tested.
- Every step writes state to `state.json` and can resume; errors go to
  `logs/vpa.log` with an Arabic message for the user (`VPAError.message_ar`).

## Layout
- `vpa/media.py` FFmpeg/ffprobe, source preservation, audio extraction, sound regions
- `vpa/transcribe.py` WhisperX / faster-whisper backends → normalized segments
- `vpa/uncertainty.py` flags + uncovered-audio detection (never adds words)
- `vpa/review_html.py` offline RTL review page
- `vpa/pipeline.py` stage 1 steps with resume
- `vpa/project.py` project folders + state
- tests: `python -m pytest` (needs ffmpeg; uses a fake ASR backend)

## Common requests
- "Analyze this video": `.venv\Scripts\python.exe -m vpa analyze "<path>" --open`
- "Project status": `python -m vpa status projects\<name>`
- Settings changes: write `config/user_config.json` (override only changed keys).
