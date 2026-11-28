#!/usr/bin/env bash
# Installs the video-production toolkit (10 open-source tools) for Claude Code.
# Idempotent: safe to run again; it updates existing clones.
# Usage: bash tools/video-tools/install.sh        (VIDEO_TOOLS_DIR overrides ~/video-tools)
# Needs: git, node 22+, npm, python3 + pip, ffmpeg. API keys are never written by this script.
set -u
TOOLS="${VIDEO_TOOLS_DIR:-$HOME/video-tools}"
SKILLS="$HOME/.claude/skills"
mkdir -p "$TOOLS" "$SKILLS"
log() { echo "[video-tools] $*"; }

clone() { # repo dir
  if [ -d "$TOOLS/$2/.git" ]; then git -C "$TOOLS/$2" pull -q --ff-only || log "update skipped: $2"
  else git clone -q --depth 1 "https://github.com/$1.git" "$TOOLS/$2" || log "CLONE FAILED: $1"; fi
}
link() { [ -e "$1" ] && ln -sfn "$1" "$SKILLS/$2" && log "skill: $2"; }

clone yt-dlp/yt-dlp yt-dlp
clone kajisho5/ffmpeg-skill ffmpeg-skill
clone kurbaitaev/ghost-editor ghost-editor
clone nateherkai/herk-edit-kit herk-edit-kit
clone heygen-com/hyperframes hyperframes
clone nexu-io/openmotion openmotion
clone howseen-ai/claude-motion-design claude-motion-design
clone Vincentwei1021/video-shotcraft video-shotcraft
clone OpenMontageInc/OpenMontage OpenMontage
clone kaomei/stickman-video-director stickman-video-director

# 1) yt-dlp: downloader (reference videos, audio, subtitles, thumbnails)
pip install -q -U "yt-dlp[default]" || log "yt-dlp pip failed"

# 2) FFmpeg Skill: 42 local ffmpeg tools (cut, silence removal, 9:16, Arabic captions)
(cd "$TOOLS/ffmpeg-skill" && node bin/install.js --claude >/dev/null) || link "$TOOLS/ffmpeg-skill/skills/ffmpeg-skill" ffmpeg-skill

# 3) Ghost Editor: raw talking-head take -> finished reel
link "$TOOLS/ghost-editor" ghost-editor
pip install -q numpy opencv-python-headless pillow openai-whisper || log "ghost-editor python deps failed"
python3 "$TOOLS/ghost-editor/scripts/library_restore.py" >/dev/null 2>&1 || log "ghost-editor sound library not downloaded"

# 4) HyperFrames (HeyGen): HTML video, animated captions, motion graphics, MP4 export
for s in hyperframes hyperframes-cli hyperframes-registry media-use reverse-any-video remotion-to-hyperframes slideshow style-sampling; do
  link "$TOOLS/hyperframes/skills/$s" "$s"
done

# 5) OpenMotion: brand-kit motion graphics (main skill uses OpenMotion Cloud MCP via OAuth)
for s in openmotion openmotion-design openmotion-director openmotion-media openmotion-production openmotion-recreate openmotion-template-to-video openmotion-video-to-template; do
  link "$TOOLS/openmotion/skills/$s" "$s"
done

# 6) Claude Motion Design: motion design in pure code (HTML + Playwright + ffmpeg)
link "$TOOLS/claude-motion-design/skill/motion-design" motion-design
pip install -q playwright imageio-ffmpeg numpy pillow || log "motion-design python deps failed"

# 7) Video Shotcraft: cinematic product promos (Remotion recipes)
link "$TOOLS/video-shotcraft" video-shotcraft

# 8) Stickman Video Director: script -> stickman animation with voice + captions
link "$TOOLS/stickman-video-director/skills/directing-stickman-videos" directing-stickman-videos

# 9) Herk Edit Kit: workspace (open the folder); 15 editing skills incl. cut-silences / cut-mistakes
(cd "$TOOLS/herk-edit-kit" && npm ci --silent --no-audit --no-fund) || log "herk-edit-kit npm ci failed"

# 10) OpenMontage: workspace (open the folder); full AI video production pipelines (AGPL-3.0)
(cd "$TOOLS/OpenMontage" && pip install -q -r requirements.txt && (cd remotion-composer && npm install --silent --no-audit --no-fund)) || log "OpenMontage setup incomplete"

log "done. Tools: $TOOLS  Skills: $SKILLS"
