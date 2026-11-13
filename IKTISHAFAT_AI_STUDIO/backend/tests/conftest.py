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


@pytest.fixture()
def memkeyring(monkeypatch):
    import keyring
    from keyring.backend import KeyringBackend

    class Mem(KeyringBackend):
        priority = 1
        def __init__(self): self.d = {}
        def get_password(self, s, u): return self.d.get((s, u))
        def set_password(self, s, u, p): self.d[(s, u)] = p
        def delete_password(self, s, u): self.d.pop((s, u), None)
    prev = keyring.get_keyring()
    keyring.set_keyring(Mem())
    for k in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY"):
        monkeypatch.delenv(k, raising=False)
    yield
    keyring.set_keyring(prev)


@pytest.fixture()
def mock_http(monkeypatch):
    """Mock provider HTTP. Records requests; NOT a real provider test."""
    import httpx
    from app.ai import providers
    calls = []

    def handler(req: httpx.Request):
        calls.append(req)
        u = str(req.url)
        if "anthropic.com" in u:
            if req.headers.get("x-api-key") != "sk-ant-good-key":
                return httpx.Response(401, json={})
            return httpx.Response(200, json={"data": [{"id": "claude-x"}], "content": [{"type": "text", "text": "من Claude"}]})
        if "openai.com" in u:
            if req.url.path.endswith("models"):
                return httpx.Response(200, json={"data": [{"id": "gpt-x"}, {"id": "whisper-1"}]})
            return httpx.Response(200, json={"choices": [{"message": {"content": "from GPT"}}]})
        if "googleapis.com" in u:
            if req.url.path.endswith("models"):
                return httpx.Response(200, json={"models": [{"name": "models/gem-x", "supportedGenerationMethods": ["generateContent"]}]})
            return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": "from Gemini"}]}}]})
        if ":11434" in u:
            return httpx.Response(200, json={"models": [{"name": "llama3.2:latest"}], "message": {"content": "from Ollama"}})
        return httpx.Response(404)
    monkeypatch.setattr(providers, "_transport", httpx.MockTransport(handler))
    return calls
