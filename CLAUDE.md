# Hasso repository — instructions for Claude

The owner writes in Arabic. Answer in Arabic unless asked otherwise.

Projects here: `DIRECTOR_MODE_PRO/` (Android app, has its own CLAUDE.md), `IKTISHAFAT_AI_STUDIO/`, `quote-images/`.

## Video toolkit — suggest before you start any video work

The owner installed 10 open-source video tools and wants them **offered as options** whenever they ask for
anything about video: editing, reels/Shorts, captions, motion graphics, ads, faceless videos, downloads,
montage, sound, B-roll, or YouTube production.

### First, make sure the toolkit is present
Tools live in `~/video-tools`, skills in `~/.claude/skills`. If `~/video-tools` is missing (fresh cloud
container), run `bash tools/video-tools/install.sh` (5–10 min) and tell the owner it is installing.
Skills linked during a session appear in the skill list after the next session start; until then, read the
tool's `SKILL.md` directly and follow it.

### Then propose 2–3 concrete options before doing the work
For each option give, in Arabic: which tool, what the result will be, what it needs from the owner
(files, API keys, cost), and the caveat. Recommend one. Wait for the owner's choice, then do it.

| Need | Tool | Where | Notes |
|---|---|---|---|
| Download a reference reel/video, audio, subtitles, thumbnail | **yt-dlp** | `yt-dlp` command | Only for reference/analysis; re-publishing others' content breaks copyright. |
| Cut, remove silence, 9:16, Arabic captions, export | **FFmpeg Skill** | skill `ffmpeg-skill` | Local and free. Speech captions need `pip install faster-whisper`. |
| Raw talking-head take → finished reel (best take per sentence) | **Ghost Editor** | skill `ghost-editor` | Built/tested on macOS; Linux untested. Gemini key optional (frames go to Google). |
| Remove pauses/mistakes, storytelling, short-form edits | **Herk Edit Kit** | workspace `~/video-tools/herk-edit-kit` | Work inside that folder. Licence unclear: check before commercial use. ElevenLabs key for transcription script. |
| Animated captions, motion graphics, B-roll, music, MP4 | **HyperFrames** (HeyGen) | skills `hyperframes`, `hyperframes-cli`, … | Apache-2.0. HeyGen HyperFrames MCP may also be connected for hosted projects. |
| Remake a motion video with the owner's brand colours/logo/text | **OpenMotion** | skill `openmotion` | Uses OpenMotion Cloud MCP (OAuth by the owner). Inspire, don't copy others' designs. |
| Charts, kinetic text, shape morphs cut to the music beat | **Claude Motion Design** | skill `motion-design` | Pure code (HTML + Playwright + ffmpeg), MIT. |
| Cinematic product promo / ad from a product page | **Video Shotcraft** | skill `video-shotcraft` | Uses Remotion (company licence may be required). |
| Full video from a one-line description (research, script, voice, shots, captions) | **OpenMontage** | workspace `~/video-tools/OpenMontage` | AGPL-3.0. Some pipelines use paid APIs (~$1–3 per video); free/offline demos exist. |
| Faceless channel: script → stickman animation with voice and captions | **Stickman Video Director** | skill `directing-stickman-videos` | MIT. TTS/voice provider may need a key. |

### Typical combinations to suggest
- **Iktishafat (documentary/history channel):** OpenMontage for a first full draft → HyperFrames for Arabic animated captions and motion → FFmpeg Skill for the 9:16 Shorts versions.
- **Owner on camera:** Ghost Editor or Herk Edit Kit (cut pauses/mistakes) → HyperFrames captions.
- **Multi-camera shoot with Director Mode Pro:** files of one take share the name `TAKE_<date>_<time>_<device>` → sync and cut with FFmpeg Skill / Ghost Editor.
- **Product/brand:** Video Shotcraft or OpenMotion, with Claude Motion Design for charts.

### Rules
- Never claim a render succeeded without the output file existing; report exact errors.
- Ask before using paid APIs or before sending the owner's footage to an external service.
- API keys go in each tool's own `.env` (gitignored) or the environment's secret store, never in this repository.
