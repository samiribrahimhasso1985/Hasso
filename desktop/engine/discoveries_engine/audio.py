"""Audio mastering analysis — measurements only. The original file is only read; nothing is
written or changed. Targets are editable reference values, not official platform rules."""
from __future__ import annotations

import re
import subprocess
from pathlib import Path
from typing import Any

from .media import ToolMissingError, tool_path

_SUMMARY = re.compile(
    r"Integrated loudness:\s*I:\s*(?P<i>-?[\d.]+|-inf)\s*LUFS.*?"
    r"Loudness range:\s*LRA:\s*(?P<lra>-?[\d.]+)\s*LU.*?"
    r"True peak:\s*Peak:\s*(?P<tp>-?[\d.]+|-inf)\s*dBFS",
    re.S,
)

# Commonly used reference targets. Editable by the caller; not platform guarantees.
DEFAULT_TARGET_LUFS = -14.0
DEFAULT_MAX_TRUE_PEAK = -1.0


def _num(text: str) -> float | None:
    return None if text == "-inf" else float(text)


def loudness(path: Path, target_lufs: float = DEFAULT_TARGET_LUFS,
             max_true_peak: float = DEFAULT_MAX_TRUE_PEAK, timeout: float = 600.0) -> dict[str, Any]:
    ffmpeg = tool_path("ffmpeg")
    if ffmpeg is None:
        raise ToolMissingError("ffmpeg not found on PATH")
    proc = subprocess.run(
        [ffmpeg, "-nostats", "-hide_banner", "-i", str(path), "-vn",
         "-filter_complex", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True, text=True, timeout=timeout, check=False,
    )
    summary = proc.stderr.rsplit("Summary:", 1)[-1] if "Summary:" in proc.stderr else ""
    m = _SUMMARY.search(summary)
    if proc.returncode != 0 or m is None:
        raise ValueError("no audio stream or loudness could not be measured")

    integrated = _num(m["i"])
    true_peak = _num(m["tp"])
    lra = float(m["lra"])
    issues: list[dict[str, Any]] = []
    if integrated is None:
        issues.append({"code": "silent", "detail": "no measurable programme loudness"})
    else:
        diff = round(target_lufs - integrated, 1)
        if abs(diff) > 1.0:
            issues.append({"code": "loudness_off_target", "gain_needed_db": diff})
    if true_peak is not None and true_peak > max_true_peak:
        issues.append({"code": "true_peak_too_high", "true_peak_dbfs": true_peak, "limit": max_true_peak})
    if lra > 15:
        issues.append({"code": "wide_loudness_range", "lra_lu": lra})

    return {
        "path": str(path),
        "integrated_lufs": integrated,
        "loudness_range_lu": lra,
        "true_peak_dbfs": true_peak,
        "target_lufs": target_lufs,
        "max_true_peak_dbfs": max_true_peak,
        "issues": issues,
        "method": "ffmpeg ebur128 (EBU R128 / ITU-R BS.1770)",
    }
