import os
import shutil
import subprocess
import pytest

@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("IKTISHAFAT_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("IKTISHAFAT_NO_AUTOINIT", "1")
    from app.database import session
    from app.main import create_app
    from fastapi.testclient import TestClient
    app = create_app()
    with TestClient(app) as c:
        yield c
    session._engine.dispose()

@pytest.fixture()
def sample_video(tmp_path):
    if not shutil.which("ffmpeg"):
        pytest.skip("ffmpeg not installed")
    out = tmp_path / "src" / "clip.mp4"
    out.parent.mkdir()
    subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "testsrc=duration=2:size=320x240:rate=25",
                    "-f", "lavfi", "-i", "sine=duration=2", "-shortest", "-pix_fmt", "yuv420p", str(out)], check=True)
    return out
