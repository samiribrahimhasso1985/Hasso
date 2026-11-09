"""Build the reviewable transcript and mark everything that needs a human look.

Principle: the system never adds words. It only *flags*:
  - words whose alignment/recognition confidence is low,
  - words whose timing was interpolated or is missing,
  - implausible durations or overlapping times,
  - tokens Arabic alignment cannot handle (digits, Latin script),
  - segments that look like Whisper hallucination (repetition loops),
  - stretches of audio that contain sound but no transcribed words
    (possible missed speech, to be checked by ear).
"""

from __future__ import annotations

import re

FLAG_LABELS_AR = {
    "low_align_score": "محاذاة ضعيفة",
    "low_probability": "ثقة تعرّف منخفضة",
    "timing_interpolated": "توقيت تقديري (غير محاذى)",
    "timing_missing": "بدون توقيت",
    "too_long": "مدة طويلة بشكل غير طبيعي",
    "too_short": "مدة قصيرة جداً",
    "overlap": "تداخل في التوقيت",
    "digits_or_latin": "أرقام أو حروف لاتينية",
    "repetition": "تكرار مشبوه",
    "segment_low_confidence": "مقطع منخفض الثقة",
    "segment_maybe_not_speech": "قد لا يكون كلاماً",
    "segment_maybe_hallucination": "قد يكون نصاً مختلَقاً من النموذج",
}

_LATIN_OR_DIGIT = re.compile(r"[A-Za-z0-9٠-٩۰-۹]")
_ARABIC_DIACRITICS = re.compile(r"[ً-ْٰـ]")  # tashkeel + tatweel
_PUNCT = re.compile(r"[\s\.\,\!\?\:\;،؛؟۔\"'«»()\[\]-]+")


def norm_token(t: str) -> str:
    return _PUNCT.sub("", _ARABIC_DIACRITICS.sub("", t))


def build_transcript(segments: list[dict], info: dict, ucfg: dict) -> dict:
    words_out: list[dict] = []
    segs_out: list[dict] = []
    prev_end = None

    for si, s in enumerate(segments):
        seg_id = f"s{si + 1:04d}"
        seg_flags = []
        if s.get("compression_ratio") and s["compression_ratio"] > 2.4:
            seg_flags.append("segment_maybe_hallucination")
        if s.get("no_speech_prob") and s["no_speech_prob"] > 0.6:
            seg_flags.append("segment_maybe_not_speech")
        if s.get("avg_logprob") is not None and s["avg_logprob"] < -1.0:
            seg_flags.append("segment_low_confidence")

        ids = []
        for w in s["words"]:
            if not w["text"]:
                continue
            flags = []
            if w["align_score"] is not None and w["align_score"] < ucfg["min_align_score"]:
                flags.append("low_align_score")
            if w["probability"] is not None and w["probability"] < ucfg["min_word_probability"]:
                flags.append("low_probability")
            if w["timing"] == "interpolated":
                flags.append("timing_interpolated")
            if w["timing"] == "missing" or w["start"] is None or w["end"] is None:
                flags.append("timing_missing")
            else:
                dur = w["end"] - w["start"]
                if dur > ucfg["max_word_duration_sec"]:
                    flags.append("too_long")
                if dur < ucfg["min_word_duration_sec"]:
                    flags.append("too_short")
                if prev_end is not None and w["start"] < prev_end - 0.02:
                    flags.append("overlap")
                prev_end = w["end"]
            if _LATIN_OR_DIGIT.search(w["text"]):
                flags.append("digits_or_latin")

            wid = f"w{len(words_out) + 1:05d}"
            ids.append(wid)
            words_out.append({
                "id": wid,
                "segment_id": seg_id,
                "text": w["text"],
                "original_text": w["text"],
                "start": w["start"],
                "end": w["end"],
                "align_score": w["align_score"],
                "probability": w["probability"],
                "timing": w["timing"],
                "flags": flags,
                "needs_review": bool(flags or seg_flags),
                "reviewed": False,
            })

        _flag_repetitions(words_out[len(words_out) - len(ids):] if ids else [])
        segs_out.append({
            "id": seg_id, "start": s["start"], "end": s["end"], "text": s["text"],
            "word_ids": ids, "flags": seg_flags,
        })

    return {
        "schema_version": 1,
        "engine": info,
        "segments": segs_out,
        "words": words_out,
    }


def _flag_repetitions(words: list[dict], run_len: int = 3) -> None:
    """Flag the same token repeated `run_len`+ times in a row (classic Whisper loop)."""
    i = 0
    while i < len(words):
        j = i
        key = norm_token(words[i]["text"])
        while j + 1 < len(words) and norm_token(words[j + 1]["text"]) == key and key:
            j += 1
        if j - i + 1 >= run_len:
            for w in words[i:j + 1]:
                if "repetition" not in w["flags"]:
                    w["flags"].append("repetition")
                w["needs_review"] = True
        i = j + 1


def uncovered_regions(sound: list[dict], words: list[dict], min_len: float,
                      pad: float = 0.25) -> list[dict]:
    """Parts of non-silent audio not covered by any timed word (+/- pad)."""
    covered = sorted(
        (max(0.0, w["start"] - pad), w["end"] + pad)
        for w in words if w["start"] is not None and w["end"] is not None
    )
    merged: list[list[float]] = []
    for s, e in covered:
        if merged and s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])

    out = []
    for r in sound:
        cur = r["start"]
        for s, e in merged:
            if e <= cur or s >= r["end"]:
                continue
            if s > cur:
                out.append((cur, s))
            cur = max(cur, e)
        if cur < r["end"]:
            out.append((cur, r["end"]))
    return [{"start": round(s, 3), "end": round(e, 3), "duration": round(e - s, 3)}
            for s, e in out if e - s >= min_len]


def summary(doc: dict) -> dict:
    words = doc["words"]
    flagged = [w for w in words if w["needs_review"]]
    by_flag: dict[str, int] = {}
    for w in flagged:
        for f in w["flags"]:
            by_flag[f] = by_flag.get(f, 0) + 1
    scores = [w["align_score"] for w in words if w["align_score"] is not None]
    return {
        "word_count": len(words),
        "flagged_count": len(flagged),
        "flagged_ratio": round(len(flagged) / len(words), 3) if words else 0,
        "flags": by_flag,
        "mean_align_score": round(sum(scores) / len(scores), 3) if scores else None,
        "uncovered_regions": len(doc.get("uncovered_regions", [])),
        "uncovered_seconds": round(sum(r["duration"] for r in doc.get("uncovered_regions", [])), 2),
    }
