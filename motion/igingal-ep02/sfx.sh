#!/usr/bin/env bash
# Synthesised transition sound effects for episode 2 (no narration, no music — the voice-over is added later).
# Each cue time/kind mirrors SHOTS in index.html.  Usage: ./sfx.sh out.wav
set -euo pipefail
OUT=${1:-sfx.wav}
DUR=120
CUES=(0:open 9:dissolve 15:whip 21:dissolve 27:glow 33:dissolve 39:dissolve 45:whip 51:dissolve 57:glow
      63:dissolve 69:dissolve 75:black 82:dissolve 88:dissolve 94:glow 100:black 107:dissolve 114:end)
TMP=$(mktemp -d)
R=48000

# boom: low sine sweeping down with a long decay (title / end card)
ffmpeg -loglevel error -y -f lavfi -i "aevalsrc='0.9*sin(2*PI*(55-20*t)*t)*exp(-1.4*t)+0.25*sin(2*PI*110*t)*exp(-3*t)':s=$R:d=4" -af "lowpass=f=400" "$TMP/open.wav"
cp "$TMP/open.wav" "$TMP/end.wav"
# whip: short bright whoosh, peak in the middle (0.35 s)
ffmpeg -loglevel error -y -f lavfi -i "anoisesrc=color=white:amplitude=0.8:d=0.7:r=$R" \
  -af "bandpass=f=2500:width_type=o:w=2.5,afade=t=in:d=0.35:curve=exp,afade=t=out:st=0.35:d=0.35:curve=exp" "$TMP/whip.wav"
# dissolve: soft airy whoosh (1.6 s, peak at 0.9 s)
ffmpeg -loglevel error -y -f lavfi -i "anoisesrc=color=pink:amplitude=0.5:d=1.6:r=$R" \
  -af "highpass=f=300,lowpass=f=3500,afade=t=in:d=0.9:curve=qsin,afade=t=out:st=0.9:d=0.7:curve=qsin,volume=0.6" "$TMP/dissolve.wav"
# glow: rising shimmer (Hijaz chord partials + air), peak at 0.5 s
ffmpeg -loglevel error -y -f lavfi -i "aevalsrc='(0.12*sin(2*PI*1174.7*t)+0.1*sin(2*PI*1480*t)+0.08*sin(2*PI*1760*t)+0.06*sin(2*PI*2349*t))*if(lt(t,0.5),t/0.5,exp(-2.2*(t-0.5)))':s=$R:d=2.5" \
  -af "aecho=0.8:0.7:120|240:0.4|0.25" "$TMP/glow.wav"
# black: muffled low thump at the cut
ffmpeg -loglevel error -y -f lavfi -i "aevalsrc='0.8*sin(2*PI*(70-30*t)*t)*exp(-4*t)':s=$R:d=1.8" -af "lowpass=f=300" "$TMP/black.wav"

declare -A LEAD=([open]=0 [end]=0 [whip]=350 [dissolve]=900 [glow]=500 [black]=0)
inputs=(-f lavfi -t $DUR -i "anullsrc=r=$R:cl=mono"); filters=""; mix="[0]"; n=1
for c in "${CUES[@]}"; do
  t=${c%%:*}; k=${c##*:}
  ms=$(( t * 1000 - ${LEAD[$k]} )); [ $ms -lt 0 ] && ms=0
  inputs+=(-i "$TMP/$k.wav")
  filters+="[$n]adelay=${ms}|${ms}[x$n];"; mix+="[x$n]"; n=$((n + 1))
done
ffmpeg -loglevel error -y "${inputs[@]}" -filter_complex \
  "${filters}${mix}amix=inputs=$n:normalize=0,alimiter=limit=0.9,aformat=channel_layouts=stereo" -t $DUR "$OUT"
rm -rf "$TMP"
echo "wrote $OUT"
