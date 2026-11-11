import hashlib
import shutil
import subprocess

import pytest
from fastapi.testclient import TestClient

from discoveries_engine.app import app

TOKEN = "test-token-123"


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("DISCOVERIES_ENGINE_TOKEN", TOKEN)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-secret-value")
    return TestClient(app)


def auth():
    return {"X-Engine-Token": TOKEN}


def test_health_is_public(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["token_configured"] is True


def test_protected_endpoints_require_token(client):
    assert client.get("/providers").status_code == 401
    assert client.get("/providers", headers={"X-Engine-Token": "wrong"}).status_code == 401
    assert client.post("/media/hash", json={"path": "x"}).status_code == 401


def test_without_configured_token_everything_protected_is_closed(monkeypatch):
    monkeypatch.delenv("DISCOVERIES_ENGINE_TOKEN", raising=False)
    c = TestClient(app)
    assert c.get("/providers", headers=auth()).status_code == 503


def test_providers_never_leak_keys(client):
    r = client.get("/providers", headers=auth())
    assert r.status_code == 200
    data = {p["id"]: p["configured"] for p in r.json()["providers"]}
    assert data == {"openai": False, "anthropic": True, "gemini": False}
    assert "sk-secret-value" not in r.text


def test_hash_matches_and_file_untouched(client, tmp_path):
    f = tmp_path / "clip.bin"
    f.write_bytes(b"abc")
    mtime = f.stat().st_mtime_ns
    r = client.post("/media/hash", json={"path": str(f)}, headers=auth())
    assert r.status_code == 200
    assert r.json()["sha256"] == hashlib.sha256(b"abc").hexdigest()
    assert f.read_bytes() == b"abc"
    assert f.stat().st_mtime_ns == mtime


def test_missing_file_is_404(client, tmp_path):
    r = client.post("/media/probe", json={"path": str(tmp_path / "none.mp4")}, headers=auth())
    assert r.status_code == 404


@pytest.mark.skipif(shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None,
                    reason="ffmpeg/ffprobe not installed")
def test_probe_real_vertical_video(client, tmp_path):
    clip = tmp_path / "vertical.mp4"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=108x192:rate=25:duration=1",
         "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(clip)],
        check=True,
    )
    r = client.post("/media/probe", json={"path": str(clip)}, headers=auth())
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["video"]["width"] == 108
    assert body["video"]["height"] == 192
    assert body["video"]["fps"] == 25.0
    assert body["audio"]["codec"] == "aac"
    assert 0.9 < body["duration_seconds"] < 1.2


def test_probe_rejects_non_media(client, tmp_path):
    if shutil.which("ffprobe") is None:
        pytest.skip("ffprobe not installed")
    f = tmp_path / "notes.txt"
    f.write_text("hello")
    r = client.post("/media/probe", json={"path": str(f)}, headers=auth())
    assert r.status_code == 422
