"""Stage 1 tests. Media handling uses real FFmpeg; the speech model is replaced
by a fake backend (real Arabic speech must be tested on the target machine,
see docs/STAGE1_TEST_AR.md)."""

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

from vpa import media, uncertainty
from vpa.errors import MediaError
from vpa.pipeline import analyze
from vpa.transcribe import normalize_faster_whisper, normalize_whisperx

pytestmark = pytest.mark.skipif(not shutil.which("ffmpeg"), reason="ffmpeg required")

UCFG = {"min_align_score": 0.45, "min_word_probability": 0.5,
        "max_word_duration_sec": 2.5, "min_word_duration_sec": 0.04}


def make_video(path: Path, w=720, h=1280):
    """6 s video: tone 0.5–2.0 s, silence, tone 3.5–5.0 s."""
    expr = "if(between(t,0.5,2)+between(t,3.5,5),0.5*sin(2*PI*220*t),0)"
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
         "-f", "lavfi", "-i", f"color=c=gray:s={w}x{h}:d=6:r=30",
         "-f", "lavfi", "-i", f"aevalsrc='{expr}':s=48000:d=6",
         "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(path)],
        check=True)
    return path


def fake_backend(wav, tcfg):
    # "Hears" only the first tone. Second tone must show up as uncovered audio.
    aligned = {"segments": [{
        "start": 0.5, "end": 2.0, "text": "شلونك اليوم 2024",
        "words": [
            {"word": "شلونك", "start": 0.5, "end": 1.0, "score": 0.91},
            {"word": "اليوم", "start": 1.05, "end": 1.5, "score": 0.30},
            {"word": "2024", "start": 1.5, "end": 2.0},  # interpolated: no score
        ]}]}
    info = {"backend": "fake", "model": "none", "language": "ar", "detected_language": "ar"}
    return aligned, normalize_whisperx(aligned), info


@pytest.fixture
def cfg(tmp_path):
    return {
        "projects_root": str(tmp_path / "projects"),
        "copy_source": True,
        "transcription": {"backend": "auto"},
        "uncertainty": UCFG,
        "speech_coverage": {"silence_threshold_db": -35, "min_silence_sec": 0.4,
                            "min_uncovered_sec": 0.8},
    }


def test_probe_vertical(tmp_path):
    v = make_video(tmp_path / "v.mp4")
    p = media.probe(v)
    assert p["has_video"] and p["aspect"] == "9:16"
    assert p["video"]["fps"] == 30
    assert abs(p["duration_sec"] - 6) < 0.2


def test_unsupported_extension(tmp_path):
    f = tmp_path / "x.avi"
    f.write_bytes(b"x")
    with pytest.raises(MediaError):
        media.check_supported(f)


def test_full_stage1_with_fake_backend(tmp_path, cfg):
    src = make_video(tmp_path / "مقطع تجريبي.mp4")
    before = media.sha256(src)
    proj = analyze(src, cfg, backend_runner=fake_backend)

    # original untouched, copy identical and read-only
    assert media.sha256(src) == before
    info = json.loads((proj.dir("00_source") / "source_info.json").read_text(encoding="utf-8"))
    copy = Path(info["working_path"])
    assert media.sha256(copy) == before
    assert not os.access(copy, os.W_OK) or os.geteuid() == 0  # root ignores perms

    wav = proj.dir("01_audio") / "audio_16k_mono.wav"
    p = media.probe(wav)
    assert p["audio"]["sample_rate"] == 16000 and p["audio"]["channels"] == 1

    doc = json.loads((proj.dir("02_transcript") / "transcript.json").read_text(encoding="utf-8"))
    words = {w["text"]: w for w in doc["words"]}
    assert words["شلونك"]["needs_review"] is False
    assert "low_align_score" in words["اليوم"]["flags"]
    assert "timing_interpolated" in words["2024"]["flags"]
    assert "digits_or_latin" in words["2024"]["flags"]
    # only the words the backend produced – nothing invented
    assert [w["text"] for w in doc["words"]] == ["شلونك", "اليوم", "2024"]

    # second tone (3.5–5.0) has sound but no words -> reported
    gaps = doc["uncovered_regions"]
    assert len(gaps) == 1 and 3.3 < gaps[0]["start"] < 3.8 and 4.8 < gaps[0]["end"] < 5.2

    html = (proj.dir("02_transcript") / "review.html").read_text(encoding="utf-8")
    assert 'dir="rtl"' in html and "شلونك" in html

    st = proj.state()["steps"]
    assert all(st[k]["status"] == "done" for k in st)


def test_resume_skips_finished_steps(tmp_path, cfg):
    src = make_video(tmp_path / "a.mp4")
    calls = []

    def failing(wav, tcfg):
        calls.append(1)
        raise RuntimeError("simulated crash")

    with pytest.raises(RuntimeError):
        analyze(src, cfg, backend_runner=failing)
    from vpa.project import Project
    proj = Project.open(Path(cfg["projects_root"]) / "a")
    st = proj.state()["steps"]
    assert st["1_preserve_source"]["status"] == "done"
    assert st["3_transcribe"]["status"] == "failed"
    assert "simulated crash" in st["3_transcribe"]["error"]

    analyze(src, cfg, backend_runner=fake_backend)
    assert proj.state()["steps"]["3_transcribe"]["status"] == "done"


def test_wav_input(tmp_path, cfg):
    v = make_video(tmp_path / "v.mp4")
    wav = tmp_path / "voice.wav"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(v), "-vn", str(wav)], check=True)
    proj = analyze(wav, cfg, backend_runner=fake_backend)
    assert proj.state()["aspect"] is None


def test_repetition_and_whisper_fallback_flags():
    segs = normalize_faster_whisper([{
        "start": 0, "end": 3, "text": "...", "avg_logprob": -0.2, "no_speech_prob": 0.1,
        "compression_ratio": 3.1,
        "words": [{"word": " يعني", "start": 0.0, "end": 0.3, "probability": 0.9},
                  {"word": " يعني", "start": 0.3, "end": 0.6, "probability": 0.9},
                  {"word": " يعني", "start": 0.6, "end": 0.9, "probability": 0.9},
                  {"word": " هواية", "start": 0.9, "end": 1.4, "probability": 0.2}]}])
    doc = uncertainty.build_transcript(segs, {"backend": "faster_whisper"}, UCFG)
    w = doc["words"]
    assert all("repetition" in x["flags"] for x in w[:3])
    assert "low_probability" in w[3]["flags"]
    assert "segment_maybe_hallucination" in doc["segments"][0]["flags"]
