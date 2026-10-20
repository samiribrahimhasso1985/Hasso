#!/usr/bin/env bash
# Synthesised score (no third-party audio): low drone + warm wind + soft bell notes on a Hijaz scale
# + a paper/air "whoosh" on each stylised transition.
# Usage: ./audio.sh out.wav
set -euo pipefail
OUT=${1:-score.wav}
DUR=119.5
FADE_OUT_AT=115.5
WHOOSH=(21 46 54 63 86 103)                    # glow / slide / tear / burn transitions, must match index.html
# bell notes: "seconds:frequency" — D Hijaz (D Eb F# G A Bb C)
BELLS=(0.8:293.66 5.2:440 13.2:369.99 21.1:587.33 30.4:392 38.3:311.13 46.2:440 54.3:293.66 63.1:587.33
       71.2:349.23 78.3:466.16 86.2:392 95.3:369.99 103.2:311.13 111.3:293.66 114.6:440 116:587.33)
TMP=$(mktemp -d)

ffmpeg -loglevel error -y -f lavfi -i "aevalsrc='0.10*sin(2*PI*73.42*t)*(0.8+0.2*sin(2*PI*0.07*t))+0.06*sin(2*PI*110*t)*(0.7+0.3*sin(2*PI*0.05*t))+0.04*sin(2*PI*146.83*t)+0.02*sin(2*PI*220*t)*(0.5+0.5*sin(2*PI*0.11*t))':s=48000:d=$DUR" \
  -af "lowpass=f=900" "$TMP/drone.wav"
ffmpeg -loglevel error -y -f lavfi -i "anoisesrc=color=brown:amplitude=0.25:d=$DUR:r=48000" \
  -af "bandpass=f=400:width_type=o:w=2,volume=0.45,tremolo=f=0.15:d=0.6" "$TMP/wind.wav"
ffmpeg -loglevel error -y -f lavfi -i "anoisesrc=color=pink:amplitude=0.6:d=1.4:r=48000" \
  -af "highpass=f=700,lowpass=f=5000,afade=t=in:d=0.6:curve=exp,afade=t=out:st=0.7:d=0.7" "$TMP/whoosh.wav"

inputs=(-i "$TMP/drone.wav" -i "$TMP/wind.wav"); filters=""; mix="[0][1]"; n=2
for t in "${WHOOSH[@]}"; do
  ms=$(( t * 1000 - 700 )); inputs+=(-i "$TMP/whoosh.wav")
  filters+="[$n]adelay=${ms}|${ms},volume=0.7[x$n];"; mix+="[x$n]"; n=$((n + 1))
done
for b in "${BELLS[@]}"; do
  t=${b%%:*}; f=${b##*:}
  ms=$(awk "BEGIN{print int($t*1000)}")
  inputs+=(-f lavfi -i "aevalsrc='0.16*exp(-1.6*t)*(sin(2*PI*$f*t)+0.35*sin(2*PI*$f*2.01*t)+0.15*sin(2*PI*$f*3.02*t))':s=48000:d=4")
  filters+="[$n]adelay=${ms}|${ms},aecho=0.8:0.6:180:0.3[x$n];"; mix+="[x$n]"; n=$((n + 1))
done
ffmpeg -loglevel error -y "${inputs[@]}" -filter_complex \
  "${filters}${mix}amix=inputs=$n:normalize=0,afade=t=in:d=2,afade=t=out:st=$FADE_OUT_AT:d=4,alimiter=limit=0.85,aformat=channel_layouts=stereo" \
  -t $DUR "$OUT"
rm -rf "$TMP"
echo "wrote $OUT"
