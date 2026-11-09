"""Arabic speech transcription with word-level timestamps.

Backends
--------
* ``whisperx``  – Whisper (faster-whisper) + wav2vec2 forced alignment
  (``jonatasgrosman/wav2vec2-large-xlsr-53-arabic`` by default). Preferred:
  word boundaries come from acoustic alignment.
* ``faster_whisper`` – Whisper's own word timestamps (cross-attention). Used
  as a fallback when WhisperX/torch is not installed. Timing is less precise.

Both are normalized to the same schema (see ``normalize_*``). Nothing here
fills in words that the model did not hear: if a word has no timing it is
left with ``start``/``end`` = None and flagged for review.
"""

from __future__ import annotations

import importlib.util
import logging
from typing import Any

from .errors import DependencyError, TranscriptionError

log = logging.getLogger("vpa.transcribe")


def available_backends() -> list[str]:
    out = []
    if importlib.util.find_spec("whisperx"):
        out.append("whisperx")
    if importlib.util.find_spec("faster_whisper"):
        out.append("faster_whisper")
    return out


def pick_backend(requested: str) -> str:
    avail = available_backends()
    if requested == "auto":
        if not avail:
            raise DependencyError(
                "Neither whisperx nor faster_whisper is installed",
                "محرك التفريغ الصوتي غير مثبت. شغّل setup_windows.bat أولاً.",
            )
        return avail[0]
    if requested not in avail:
        raise DependencyError(
            f"Backend {requested} not installed (available: {avail})",
            f"المحرك {requested} غير مثبت. المتوفر: {avail or 'لا شيء'}",
        )
    return requested


def resolve_device(device: str, compute_type: str) -> tuple[str, str]:
    if device == "auto":
        device = "cpu"
        try:
            import torch  # noqa: WPS433

            if torch.cuda.is_available():
                device = "cuda"
        except Exception:  # torch absent (faster_whisper-only install)
            try:
                import ctranslate2

                if ctranslate2.get_cuda_device_count() > 0:
                    device = "cuda"
            except Exception:
                pass
    if compute_type == "auto":
        compute_type = "float16" if device == "cuda" else "int8"
    return device, compute_type


# --------------------------------------------------------------------------
# Backends – return (raw_result, normalized_segments, info)
# --------------------------------------------------------------------------

def run_whisperx(wav: str, cfg: dict) -> tuple[dict, list[dict], dict]:
    import whisperx

    device, compute_type = resolve_device(cfg["device"], cfg["compute_type"])
    log.info("WhisperX: model=%s device=%s compute=%s", cfg["model"], device, compute_type)
    asr_options = {}
    if cfg.get("initial_prompt"):
        asr_options["initial_prompt"] = cfg["initial_prompt"]

    audio = whisperx.load_audio(wav)
    model = whisperx.load_model(
        cfg["model"], device, compute_type=compute_type,
        language=None if cfg["language"] == "auto" else cfg["language"],
        asr_options=asr_options or None,
    )
    detected = None
    try:
        detected = model.detect_language(audio)
    except Exception as e:  # informative only
        log.debug("language detection failed: %s", e)

    language = detected if cfg["language"] == "auto" else cfg["language"]
    result = model.transcribe(audio, batch_size=cfg.get("batch_size", 8), language=language)
    log.info("التفريغ الأولي انتهى: %d مقطع. جارٍ محاذاة الكلمات...", len(result["segments"]))

    try:
        align_model, meta = whisperx.load_align_model(
            language_code=language, device=device, model_name=cfg.get("align_model")
        )
    except Exception as e:
        raise TranscriptionError(
            f"Could not load alignment model for {language}: {e}",
            "تعذّر تحميل نموذج محاذاة الكلمات العربية. تحقق من الاتصال بالإنترنت في أول تشغيل.",
        ) from e
    aligned = whisperx.align(result["segments"], align_model, meta, audio, device,
                             return_char_alignments=False)
    raw = {"asr": _jsonable(result), "aligned": _jsonable(aligned)}
    info = {
        "backend": "whisperx",
        "model": cfg["model"],
        "align_model": cfg.get("align_model") or "whisperx-default",
        "device": device,
        "compute_type": compute_type,
        "language": language,
        "detected_language": detected,
        "timing_method": "forced_alignment_wav2vec2",
    }
    return raw, normalize_whisperx(aligned), info


def run_faster_whisper(wav: str, cfg: dict) -> tuple[dict, list[dict], dict]:
    from faster_whisper import WhisperModel

    device, compute_type = resolve_device(cfg["device"], cfg["compute_type"])
    log.info("faster-whisper: model=%s device=%s compute=%s", cfg["model"], device, compute_type)
    model = WhisperModel(cfg["model"], device=device, compute_type=compute_type)
    segments, fw_info = model.transcribe(
        wav,
        language=None if cfg["language"] == "auto" else cfg["language"],
        word_timestamps=True,
        vad_filter=True,
        initial_prompt=cfg.get("initial_prompt") or None,
        condition_on_previous_text=False,  # reduces repetition/hallucination loops
    )
    seg_list = []
    for s in segments:
        seg_list.append({
            "start": s.start, "end": s.end, "text": s.text,
            "avg_logprob": s.avg_logprob, "no_speech_prob": s.no_speech_prob,
            "compression_ratio": s.compression_ratio,
            "words": [{"word": w.word, "start": w.start, "end": w.end,
                       "probability": w.probability} for w in (s.words or [])],
        })
    info = {
        "backend": "faster_whisper",
        "model": cfg["model"],
        "device": device,
        "compute_type": compute_type,
        "language": fw_info.language,
        "detected_language": fw_info.language,
        "language_probability": round(fw_info.language_probability, 3),
        "timing_method": "whisper_cross_attention",
    }
    return {"segments": seg_list}, normalize_faster_whisper(seg_list), info


def transcribe(wav: str, cfg: dict) -> tuple[dict, list[dict], dict]:
    backend = pick_backend(cfg.get("backend", "auto"))
    try:
        if backend == "whisperx":
            return run_whisperx(wav, cfg)
        return run_faster_whisper(wav, cfg)
    except (DependencyError, TranscriptionError):
        raise
    except MemoryError as e:
        raise TranscriptionError(str(e), "الذاكرة غير كافية. جرّب نموذجاً أصغر (medium) في الإعدادات.") from e
    except Exception as e:
        msg = str(e)
        hint = "فشل التفريغ الصوتي. راجع ملف السجل logs/vpa.log."
        low = msg.lower()
        if any(k in low for k in ("403", "connection", "huggingface", "timed out", "resolve")):
            hint = ("تعذّر تحميل نموذج التفريغ من الإنترنت. أول تشغيل يحتاج اتصالاً بالإنترنت "
                    "لتحميل النموذج (مرة واحدة فقط). تحقق من الاتصال وأعد المحاولة.")
        elif "cudnn" in low or "cublas" in low:
            hint = ("مكتبات CUDA ناقصة لمحرك faster-whisper. جرّب: analyze_video.bat مع الجهاز cpu "
                    "أو راجع قسم حل المشاكل في الدليل.")
        elif "cuda" in low:
            hint = "خطأ في كرت الشاشة (CUDA). جرّب ضبط device على cpu في الإعدادات."
        raise TranscriptionError(f"{backend} failed: {msg}", hint) from e


# --------------------------------------------------------------------------
# Normalization
# --------------------------------------------------------------------------

def _num(x: Any) -> float | None:
    try:
        f = float(x)
    except (TypeError, ValueError):
        return None
    return None if f != f else round(f, 3)  # NaN check


def normalize_whisperx(aligned: dict) -> list[dict]:
    """WhisperX words: {word, start?, end?, score?}.

    In WhisperX >=3.8 a word with no alignable characters gets an
    *interpolated* start/end but no ``score``; we record that so it is flagged.
    """
    segs = []
    for s in aligned.get("segments", []):
        words = []
        for w in s.get("words", []):
            score = _num(w.get("score"))
            start, end = _num(w.get("start")), _num(w.get("end"))
            words.append({
                "text": str(w.get("word", "")).strip(),
                "start": start,
                "end": end,
                "align_score": score,
                "probability": None,
                "timing": "aligned" if score is not None and start is not None
                          else ("interpolated" if start is not None else "missing"),
            })
        segs.append({"start": _num(s.get("start")), "end": _num(s.get("end")),
                     "text": str(s.get("text", "")).strip(), "words": words,
                     "avg_logprob": _num(s.get("avg_logprob"))})
    return segs


def normalize_faster_whisper(seg_list: list[dict]) -> list[dict]:
    segs = []
    for s in seg_list:
        words = [{
            "text": str(w["word"]).strip(),
            "start": _num(w.get("start")),
            "end": _num(w.get("end")),
            "align_score": None,
            "probability": _num(w.get("probability")),
            "timing": "whisper" if w.get("start") is not None else "missing",
        } for w in s.get("words", [])]
        segs.append({"start": _num(s["start"]), "end": _num(s["end"]),
                     "text": str(s["text"]).strip(), "words": words,
                     "avg_logprob": _num(s.get("avg_logprob")),
                     "no_speech_prob": _num(s.get("no_speech_prob")),
                     "compression_ratio": _num(s.get("compression_ratio"))})
    return segs


def _jsonable(obj):
    if isinstance(obj, dict):
        return {k: _jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_jsonable(v) for v in obj]
    if hasattr(obj, "item"):  # numpy scalar
        return obj.item()
    return obj
