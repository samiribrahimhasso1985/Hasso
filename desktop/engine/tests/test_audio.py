import shutil
import subprocess

import pytest
from fastapi.testclient import TestClient

from discoveries_engine.app import app

TOKEN = "t"
pytestmark = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("DISCOVERIES_ENGINE_TOKEN", TOKEN)
    return TestClient(app)


def tone(path, volume_db):
    subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=1000:duration=4",
                    "-af", f"volume={volume_db}dB", "-ar", "48000", str(path), "-y"], check=True)


def test_quiet_tone_is_reported_below_target(client, tmp_path):
    f = tmp_path / "quiet.wav"
    tone(f, -20)
    before = f.read_bytes()
    r = client.post("/audio/loudness", json={"path": str(f)}, headers={"X-Engine-Token": TOKEN})
    assert r.status_code == 200, r.text
    body = r.json()
    assert -45 < body["integrated_lufs"] < -35
    assert body["true_peak_dbfs"] < -30
    codes = {i["code"] for i in body["issues"]}
    assert "loudness_off_target" in codes
    gain = next(i for i in body["issues"] if i["code"] == "loudness_off_target")["gain_needed_db"]
    assert 20 < gain < 30
    assert f.read_bytes() == before  # original untouched


def test_hot_tone_flags_true_peak(client, tmp_path):
    f = tmp_path / "hot.wav"
    tone(f, 17.5)  # sine default is -18 dBFS peak -> about -0.5 dBFS
    r = client.post("/audio/loudness", json={"path": str(f), "target_lufs": -3}, headers={"X-Engine-Token": TOKEN})
    body = r.json()
    assert any(i["code"] == "true_peak_too_high" for i in body["issues"])


def test_video_without_audio_is_422(client, tmp_path):
    f = tmp_path / "v.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=64x64:rate=25:duration=1",
                    "-pix_fmt", "yuv420p", str(f), "-y"], check=True)
    r = client.post("/audio/loudness", json={"path": str(f)}, headers={"X-Engine-Token": TOKEN})
    assert r.status_code == 422
