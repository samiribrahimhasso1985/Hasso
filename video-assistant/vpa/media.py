"""FFmpeg/FFprobe helpers. The original file is only ever read, never modified."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import shutil
import stat
import subprocess
from pathlib import Path

from .errors import DependencyError, MediaError

log = logging.getLogger("vpa.media")

SUPPORTED = {".mp4", ".mov", ".wav"}
ANALYSIS_SR = 16000


def find_tool(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise DependencyError(
            f"{name} not found on PATH",
            f"لم يتم العثور على {name}. شغّل setup_windows.bat أو ثبّت FFmpeg (راجع الدليل).",
        )
    return path


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    log.debug("run: %s", " ".join(cmd))
    proc = subprocess.run(
        cmd, capture_output=True, text=True, encoding="utf-8", errors="replace"
    )
    if proc.returncode != 0:
        log.debug("stderr: %s", proc.stderr[-4000:])
    return proc


def sha256(path: Path, chunk: int = 4 * 1024 * 1024) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while block := f.read(chunk):
            h.update(block)
    return h.hexdigest()


def check_supported(path: Path) -> None:
    if not path.is_file():
        raise MediaError(f"File not found: {path}", f"الملف غير موجود: {path}")
    if path.suffix.lower() not in SUPPORTED:
        raise MediaError(
            f"Unsupported extension {path.suffix}",
            f"صيغة غير مدعومة ({path.suffix}). الصيغ المدعومة: MP4 و MOV و WAV",
        )


def probe(path: Path) -> dict:
    proc = run(
        [find_tool("ffprobe"), "-v", "error", "-print_format", "json",
         "-show_format", "-show_streams", str(path)]
    )
    if proc.returncode != 0:
        raise MediaError(
            f"ffprobe failed: {proc.stderr.strip()[-500:]}",
            "تعذّر قراءة الملف. قد يكون تالفاً أو بصيغة غير مدعومة.",
        )
    data = json.loads(proc.stdout)
    return summarize_probe(data)


def _fps(rate: str | None) -> float | None:
    if not rate or rate in ("0/0",):
        return None
    if "/" in rate:
        n, d = rate.split("/")
        return round(float(n) / float(d), 3) if float(d) else None
    return float(rate)


def summarize_probe(data: dict) -> dict:
    streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"
                  and not s.get("disposition", {}).get("attached_pic")), None)
    audio = [s for s in streams if s.get("codec_type") == "audio"]
    fmt = data.get("format", {})
    out: dict = {
        "container": fmt.get("format_name"),
        "duration_sec": float(fmt["duration"]) if fmt.get("duration") else None,
        "size_bytes": int(fmt["size"]) if fmt.get("size") else None,
        "has_video": video is not None,
        "audio_streams": len(audio),
    }
    if video:
        w, h = int(video.get("width", 0)), int(video.get("height", 0))
        rot = 0
        for sd in video.get("side_data_list", []) or []:
            if "rotation" in sd:
                rot = int(sd["rotation"])
        rot = int(video.get("tags", {}).get("rotate", rot))
        if abs(rot) % 180 == 90:
            w, h = h, w
        out["video"] = {
            "codec": video.get("codec_name"),
            "width": w,
            "height": h,
            "rotation": rot,
            "fps": _fps(video.get("avg_frame_rate")) or _fps(video.get("r_frame_rate")),
            "r_frame_rate": video.get("r_frame_rate"),
            "pix_fmt": video.get("pix_fmt"),
            "color_transfer": video.get("color_transfer"),
            "color_primaries": video.get("color_primaries"),
        }
        out["aspect"] = "9:16" if h > w else ("16:9" if w > h else "1:1")
    if audio:
        a = audio[0]
        out["audio"] = {
            "codec": a.get("codec_name"),
            "sample_rate": int(a.get("sample_rate", 0)),
            "channels": a.get("channels"),
        }
    return out


def preserve_source(src: Path, dest_dir: Path, copy: bool = True) -> dict:
    """Copy the original into the project (read-only) and verify the copy by hash.

    With copy=False the original stays where it is and is only referenced.
    """
    src_hash = sha256(src)
    if not copy:
        return {"original_path": str(src.resolve()), "working_path": str(src.resolve()),
                "sha256": src_hash, "copied": False}

    dest = dest_dir / src.name
    if dest.exists():
        if sha256(dest) == src_hash:
            log.info("النسخة الأصلية موجودة مسبقاً ومطابقة.")
            return {"original_path": str(src.resolve()), "working_path": str(dest),
                    "sha256": src_hash, "copied": True}
        raise MediaError(
            f"{dest} exists with different content",
            f"يوجد ملف بنفس الاسم داخل المشروع لكن محتواه مختلف: {dest.name}. "
            "استخدم اسم مشروع آخر.",
        )
    shutil.copy2(src, dest)
    if sha256(dest) != src_hash:
        dest.unlink(missing_ok=True)
        raise MediaError("Copy verification failed", "فشل التحقق من نسخ الملف الأصلي. أعد المحاولة.")
    os.chmod(dest, stat.S_IREAD | stat.S_IRGRP | stat.S_IROTH)  # read-only
    return {"original_path": str(src.resolve()), "working_path": str(dest),
            "sha256": src_hash, "copied": True}


def extract_audio(src: Path, out_wav: Path, sr: int = ANALYSIS_SR) -> Path:
    """Mono 16 kHz PCM WAV for speech analysis. Source is untouched."""
    out_wav.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_wav.with_suffix(".partial.wav")
    proc = run(
        [find_tool("ffmpeg"), "-hide_banner", "-nostdin", "-y", "-i", str(src),
         "-map", "0:a:0", "-vn", "-ac", "1", "-ar", str(sr),
         "-c:a", "pcm_s16le", str(tmp)]
    )
    if proc.returncode != 0 or not tmp.exists():
        tmp.unlink(missing_ok=True)
        raise MediaError(
            f"Audio extraction failed: {proc.stderr.strip()[-500:]}",
            "فشل استخراج الصوت. تأكد أن الملف يحتوي على مسار صوتي.",
        )
    os.replace(tmp, out_wav)
    return out_wav


_SIL_START = re.compile(r"silence_start:\s*(-?[\d.]+)")
_SIL_END = re.compile(r"silence_end:\s*(-?[\d.]+)")


def audio_levels(wav: Path) -> dict:
    """Loudness/peak stats used to warn about too-quiet or clipped recordings."""
    proc = run([find_tool("ffmpeg"), "-hide_banner", "-nostdin", "-i", str(wav),
                "-af", "volumedetect", "-f", "null", "-"])
    mean = re.search(r"mean_volume:\s*(-?[\d.]+) dB", proc.stderr)
    peak = re.search(r"max_volume:\s*(-?[\d.]+) dB", proc.stderr)
    return {
        "mean_db": float(mean.group(1)) if mean else None,
        "peak_db": float(peak.group(1)) if peak else None,
    }


def detect_sound_regions(wav: Path, duration: float, threshold_db: float = -35,
                         min_silence: float = 0.4) -> list[dict]:
    """Return non-silent regions [{start, end}] using ffmpeg silencedetect.

    Used only to *check* transcript coverage (find audio that has sound but no
    transcribed words), never to create text.
    """
    proc = run([find_tool("ffmpeg"), "-hide_banner", "-nostdin", "-i", str(wav),
                "-af", f"silencedetect=noise={threshold_db}dB:d={min_silence}",
                "-f", "null", "-"])
    starts = [float(x) for x in _SIL_START.findall(proc.stderr)]
    ends = [float(x) for x in _SIL_END.findall(proc.stderr)]
    silences = []
    for i, s in enumerate(starts):
        e = ends[i] if i < len(ends) else duration
        silences.append((max(0.0, s), min(duration, e)))
    regions, cur = [], 0.0
    for s, e in silences:
        if s > cur:
            regions.append({"start": round(cur, 3), "end": round(s, 3)})
        cur = max(cur, e)
    if cur < duration:
        regions.append({"start": round(cur, 3), "end": round(duration, 3)})
    return [r for r in regions if r["end"] - r["start"] > 0.05]
