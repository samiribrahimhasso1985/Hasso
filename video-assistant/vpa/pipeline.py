"""Stage 1 pipeline: source -> audio -> transcript (word timings) -> review page.

Each step records its result in state.json and is skipped on rerun when it
already finished, so a crash or a closed window can be resumed.
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path

from . import media, transcribe, uncertainty
from .errors import MediaError
from .logging_setup import add_file_log
from .project import Project, write_json_atomic
from .review_html import write_review_html

log = logging.getLogger("vpa.pipeline")

AUDIO_NAME = "audio_16k_mono.wav"


def _step(project: Project, name: str, force: bool, fn):
    if project.step_done(name) and not force:
        log.info("✓ %s (منجزة مسبقاً – تم التخطي)", name)
        return None
    log.info("… %s", name)
    project.mark(name, "running")
    t0 = time.time()
    try:
        result = fn()
    except Exception as e:
        project.mark(name, "failed", error=str(e),
                     error_ar=getattr(e, "message_ar", None))
        raise
    project.mark(name, "done", seconds=round(time.time() - t0, 1))
    log.info("✓ %s (%.1f ث)", name, time.time() - t0)
    return result


def analyze(src: Path, cfg: dict, name: str | None = None, force: bool = False,
            backend_runner=None) -> Project:
    """Run stage 1. `backend_runner(wav, tcfg)` can be injected for tests."""
    src = Path(src)
    media.check_supported(src)
    project = Project.create_or_open(Path(cfg["projects_root"]), name or src.stem)
    add_file_log(project.dir("logs") / "vpa.log")
    log.info("المشروع: %s", project.root)

    src_info_path = project.dir("00_source") / "source_info.json"
    audio_path = project.dir("01_audio") / AUDIO_NAME
    tdir = project.dir("02_transcript")

    # 1. preserve original -------------------------------------------------
    def do_preserve():
        info = media.preserve_source(src, project.dir("00_source"), cfg.get("copy_source", True))
        info["probe"] = media.probe(Path(info["working_path"]))
        p = info["probe"]
        if p["audio_streams"] == 0:
            raise MediaError("No audio stream", "الملف لا يحتوي على صوت.")
        write_json_atomic(src_info_path, info)
        project.set_meta(source=info["working_path"], aspect=p.get("aspect"))
        log.info("المدة %.1f ث | فيديو: %s | النسبة: %s",
                 p["duration_sec"] or 0, p["has_video"], p.get("aspect", "صوت فقط"))
    _step(project, "1_preserve_source", force, do_preserve)
    src_info = json.loads(src_info_path.read_text(encoding="utf-8"))
    duration = src_info["probe"]["duration_sec"] or 0.0

    # 2. extract audio -----------------------------------------------------
    def do_audio():
        media.extract_audio(Path(src_info["working_path"]), audio_path)
        lv = media.audio_levels(audio_path)
        write_json_atomic(project.dir("01_audio") / "levels.json", lv)
        if lv["mean_db"] is not None and lv["mean_db"] < -40:
            log.warning("⚠️ الصوت منخفض جداً (%.1f dB) – قد تقل دقة التفريغ.", lv["mean_db"])
        if lv["peak_db"] is not None and lv["peak_db"] >= -0.1:
            log.warning("⚠️ الصوت يصل للحد الأقصى (تشبع/clipping محتمل).")
    _step(project, "2_extract_audio", force, do_audio)

    # 3. transcribe --------------------------------------------------------
    raw_path = tdir / "transcript.raw.json"
    segs_path = tdir / "segments.normalized.json"

    def do_transcribe():
        runner = backend_runner or transcribe.transcribe
        raw, segs, info = runner(str(audio_path), cfg["transcription"])
        if info.get("detected_language") and info["detected_language"] != "ar":
            log.warning("⚠️ اللغة المكتشفة ليست العربية (%s). تحقق من الملف.",
                        info["detected_language"])
        write_json_atomic(raw_path, raw)
        write_json_atomic(segs_path, {"engine": info, "segments": segs})
    _step(project, "3_transcribe", force, do_transcribe)

    # 4. flag uncertain words + coverage check + review page ---------------
    def do_review():
        n = json.loads(segs_path.read_text(encoding="utf-8"))
        doc = uncertainty.build_transcript(n["segments"], n["engine"], cfg["uncertainty"])
        sc = cfg["speech_coverage"]
        sound = media.detect_sound_regions(audio_path, duration, sc["silence_threshold_db"],
                                           sc["min_silence_sec"])
        doc["sound_regions"] = sound
        doc["uncovered_regions"] = uncertainty.uncovered_regions(
            sound, doc["words"], sc["min_uncovered_sec"])
        doc["source"] = {"sha256": src_info["sha256"], "duration_sec": duration,
                         "aspect": src_info["probe"].get("aspect")}
        doc["summary"] = uncertainty.summary(doc)
        write_json_atomic(tdir / "transcript.json", doc)
        write_review_html(doc, tdir / "review.html", f"../01_audio/{AUDIO_NAME}",
                          is_video=False, title=project.root.name)
        s = doc["summary"]
        log.info("الكلمات: %d | تحتاج مراجعة: %d | مناطق صوت بلا نص: %d",
                 s["word_count"], s["flagged_count"], s["uncovered_regions"])
    # Cheap and derived from step 3, so always rebuilt (picks up new thresholds).
    _step(project, "4_flag_and_review", True, do_review)

    project.set_meta(next_action="review_transcript")
    log.info("\nافتح صفحة المراجعة: %s", tdir / "review.html")
    return project
