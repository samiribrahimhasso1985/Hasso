#!/usr/bin/env bash
# Synthesised ambient score (no third-party audio): low drone + soft wind + paper "whoosh" on each tear transition.
# Usage: ./audio.sh out.wav
set -euo pipefail
OUT=${1:-score.wav}
DUR=119
TEARS=(11 40 69 106)   # tear-wipe transitions (seconds), must match index.html

# drone: stacked sines with slow tremolo
ffmpeg -loglevel error -y -f lavfi -i "aevalsrc='0.10*sin(2*PI*55*t)*(0.8+0.2*sin(2*PI*0.07*t))+0.07*sin(2*PI*82.41*t)*(0.7+0.3*sin(2*PI*0.05*t))+0.05*sin(2*PI*110*t)+0.025*sin(2*PI*164.81*t)*(0.5+0.5*sin(2*PI*0.11*t))':s=48000:d=$DUR" \
  -af "lowpass=f=900" /tmp/igingal_drone.wav
# wind: filtered brown noise
ffmpeg -loglevel error -y -f lavfi -i "anoisesrc=color=brown:amplitude=0.25:d=$DUR:r=48000" \
  -af "bandpass=f=400:width_type=o:w=2,volume=0.5,tremolo=f=0.15:d=0.6" /tmp/igingal_wind.wav
# one paper whoosh
ffmpeg -loglevel error -y -f lavfi -i "anoisesrc=color=pink:amplitude=0.6:d=1.4:r=48000" \
  -af "highpass=f=700,lowpass=f=5000,afade=t=in:d=0.6:curve=exp,afade=t=out:st=0.7:d=0.7" /tmp/igingal_whoosh.wav

inputs=(-i /tmp/igingal_drone.wav -i /tmp/igingal_wind.wav)
filters=""; mix="[0][1]"
for i in "${!TEARS[@]}"; do
  inputs+=(-i /tmp/igingal_whoosh.wav)
  ms=$(( (TEARS[$i] * 1000) - 700 ))
  filters+="[$((i + 2))]adelay=${ms}|${ms},volume=0.8[w$i];"
  mix+="[w$i]"
done
ffmpeg -loglevel error -y "${inputs[@]}" -filter_complex \
  "${filters}${mix}amix=inputs=$(( ${#TEARS[@]} + 2 )):normalize=0,afade=t=in:d=3,afade=t=out:st=$((DUR - 4)):d=4,alimiter=limit=0.8,aformat=channel_layouts=stereo" \
  -t $DUR "$OUT"
echo "wrote $OUT"
