import subprocess, shutil, time
from pathlib import Path
import pytest
from app.ai import secrets, providers, router as ai_router
from app.davinci import adapter


def test_key_never_returned_and_stored_securely(client, memkeyring, mock_http):
    r = client.put("/api/ai/providers/anthropic/key", json={"key": "sk-ant-good-key"})
    assert r.json() == {"configured": True} and "sk-ant" not in r.text
    st = client.get("/api/ai/providers").text
    assert "sk-ant" not in st
    assert secrets.get_key("anthropic") == "sk-ant-good-key"


def test_ollama_models_and_all_cloud_providers(client, memkeyring, mock_http):
    for p in ("anthropic", "openai", "gemini"):
        client.put(f"/api/ai/providers/{p}/key", json={"key": "sk-ant-good-key"})
        t = client.post(f"/api/ai/providers/{p}/test").json()
        assert t["ok"] and t["models"], p
    assert "whisper-1" not in client.post("/api/ai/providers/openai/test").json()["models"]
    assert client.post("/api/ai/providers/ollama/test").json()["models"] == ["llama3.2:latest"]
    texts = {p: providers.chat(p, "m", [{"role": "user", "content": "hi"}], "sys") for p in ("ollama", "anthropic", "openai", "gemini")}
    assert texts["anthropic"] == "من Claude" and texts["gemini"] == "from Gemini"
    # keys travel in headers, never in URLs
    assert all("sk-ant" not in str(c.url) for c in mock_http)


def test_bad_key_gives_clean_error(client, memkeyring, mock_http):
    client.put("/api/ai/providers/anthropic/key", json={"key": "sk-ant-WRONG-key"})
    t = client.post("/api/ai/providers/anthropic/test").json()
    assert t["ok"] is False and "Authentication" in t["error"] and "WRONG" not in t["error"]


def test_missing_key_and_fallback(client, memkeyring, mock_http):
    client.put("/api/ai/providers/openai/key", json={"key": "sk-ant-good-key"})
    body = {"provider": "anthropic", "model": "m", "prompt": "hi"}
    assert client.post("/api/assistant", json=body).status_code == 502  # no key, fallback off
    res = client.post("/api/assistant", json={**body, "allow_fallback": True, "fallback_models": {"openai": "gpt-x"}}).json()
    assert res["provider"] == "openai" and res["fallback_used"] and res["errors"][0]["provider"] == "anthropic"


def test_assistant_gets_project_context_and_logs_no_content(client, memkeyring, mock_http, sample_video):
    pid = client.post("/api/projects", json={"name": "ctx"}).json()["id"]
    client.post(f"/api/projects/{pid}/media", json={"path": str(sample_video)})
    client.put("/api/ai/providers/anthropic/key", json={"key": "sk-ant-good-key"})
    client.post("/api/assistant", json={"project_id": pid, "provider": "anthropic", "model": "m", "prompt": "SECRET-PROMPT"})
    sent = [c for c in mock_http if c.url.path.endswith("/messages")][0].content.decode()
    assert "clip.mp4" in sent and "320x240" in sent
    tasks = client.get("/api/dashboard").json()["tasks"]
    assert any(t["name"] == "ai_request" for t in tasks)
    assert "SECRET-PROMPT" not in str(tasks)


def test_timeline_rules_and_edl(client, sample_video, tmp_path):
    pid = client.post("/api/projects", json={"name": "tl"}).json()["id"]
    m = client.post(f"/api/projects/{pid}/media", json={"path": str(sample_video)}).json()
    assert client.post(f"/api/projects/{pid}/timeline/clips", json={"media_id": m["id"], "track": "A1"}).status_code == 400
    for _ in range(2):
        assert client.post(f"/api/projects/{pid}/timeline/clips", json={"media_id": m["id"], "track": "V1"}).status_code == 201
    t = client.get(f"/api/projects/{pid}/timeline").json()
    assert [c["start"] for c in t["clips"]] == [0.0, m["duration"]] and abs(t["duration"] - 2 * m["duration"]) < 0.01
    ov = client.get(f"/api/projects/{pid}/overview").json()
    assert ov["resolution"] == "320 × 240" and ov["fps"] == 25.0 and ov["clip_count"] == 2
    p = client.post(f"/api/projects/{pid}/export/edl").json()["path"]
    edl = Path(p).read_text()
    assert "FROM CLIP NAME: clip.mp4" in edl and "00:00:00:00" in edl and "001" in edl and "002" in edl


def test_media_file_thumbnail_and_range(client, sample_video):
    pid = client.post("/api/projects", json={"name": "m"}).json()["id"]
    m = client.post(f"/api/projects/{pid}/media", json={"path": str(sample_video)}).json()
    r = client.get(f"/api/media/{m['id']}/file", headers={"Range": "bytes=0-99"})
    assert r.status_code == 206 and len(r.content) == 100
    th = client.get(f"/api/media/{m['id']}/thumbnail")
    assert th.status_code == 200 and th.content[:2] == b"\xff\xd8"
    assert client.get("/api/media/9999/file").status_code == 404


def test_analysis_task_real_ffmpeg(client, tmp_path):
    if not shutil.which("ffmpeg"):
        pytest.skip("no ffmpeg")
    f = tmp_path / "scene.mp4"  # 2 s red + 2 s blue (1 scene change), audio: tone 1s, silence 2s, tone 1s
    subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "color=red:s=160x120:d=2:r=25", "-f", "lavfi", "-i", "color=blue:s=160x120:d=2:r=25",
                    "-filter_complex", "[0][1]concat=n=2:v=1:a=0[v]", "-map", "[v]", "-f", "lavfi", "-i",
                    "sine=d=1[a1];anullsrc=d=2[a2];sine=d=1[a3]", "-pix_fmt", "yuv420p", str(tmp_path / "v.mp4")], capture_output=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "color=red:s=160x120:d=2:r=25", "-f", "lavfi", "-i", "color=blue:s=160x120:d=2:r=25",
                    "-f", "lavfi", "-i", "sine=d=1", "-f", "lavfi", "-i", "anullsrc=d=2", "-f", "lavfi", "-i", "sine=d=1",
                    "-filter_complex", "[0][1]concat=n=2:v=1:a=0[v];[2][3][4]concat=n=3:v=0:a=1[a]", "-map", "[v]", "-map", "[a]",
                    "-pix_fmt", "yuv420p", str(f)], check=True)
    pid = client.post("/api/projects", json={"name": "an"}).json()["id"]
    m = client.post(f"/api/projects/{pid}/media", json={"path": str(f)}).json()
    tid = client.post(f"/api/media/{m['id']}/analyze").json()["task_id"]
    for _ in range(100):
        t = next(x for x in client.get("/api/tasks").json() if x["id"] == tid)
        if t["status"] != "running":
            break
        time.sleep(0.1)
    assert t["status"] == "done", t
    a = client.get(f"/api/media/{m['id']}/analysis").json()
    assert any(1.9 < s < 2.1 for s in a["scene_changes"])
    assert any(0.9 < s["start"] < 1.1 and s["duration"] > 1.5 for s in a["silences"])


def test_cancel_unknown_task(client):
    assert client.post("/api/tasks/9999/cancel").status_code == 409


# ---- DaVinci adapter: FAKE module. This verifies our call logic only, NOT a real Resolve integration. ----
class FakeTL:
    def __init__(self): self.items = {}
    def GetItemListInTrack(self, kind, idx): return self.items.get((kind, idx), [])

class FakeMP:
    def __init__(self, drop=False): self.tl = FakeTL(); self.drop = drop
    def ImportMedia(self, paths): return [f"item:{p}" for p in paths]
    def CreateEmptyTimeline(self, n): return self.tl
    def AppendToTimeline(self, infos):
        if self.drop: return
        for i in infos:
            self.tl.items.setdefault(("audio" if i["mediaType"] == 2 else "video", i["trackIndex"]), []).append(i)

class FakeProj:
    def __init__(self, mp): self.mp = mp
    def SetSetting(self, k, v): return True
    def GetMediaPool(self): return self.mp
    def SetCurrentTimeline(self, t): return True
    def GetName(self): return "P"
    def SaveProject(self): return True

class FakeResolve:
    def __init__(self, mp): self.p = FakeProj(mp)
    def GetProjectManager(self): return self
    def GetCurrentProject(self): return self.p
    def GetVersionString(self): return "21.1.1.0"
    def SaveProject(self): return True

class FakeMod:
    def __init__(self, resolve): self.r = resolve
    def scriptapp(self, n): return self.r

CLIPS = [{"path": "/a.mp4", "track": "V1", "in_point": 0, "out_point": 2, "start": 0},
         {"path": "/m.wav", "track": "A1", "in_point": 0, "out_point": 2, "start": 0}]


def test_adapter_logic_verifies_timeline():
    res = adapter.build_timeline("T", CLIPS, 25, module=FakeMod(FakeResolve(FakeMP())))
    assert res == {"verified": True, "timeline": "T", "clips": 2}
    assert adapter.status(FakeMod(FakeResolve(FakeMP())))["version"] == "21.1.1.0"


def test_adapter_reports_failed_verification():
    with pytest.raises(adapter.ResolveError, match="Verification failed"):
        adapter.build_timeline("T", CLIPS, 25, module=FakeMod(FakeResolve(FakeMP(drop=True))))


def test_fps_setting_format():
    assert [adapter.fps_setting(x) for x in (25.0, 24, 23.976, 29.97, 59.94, 30.0)] == ["25", "24", "23.976", "29.97", "59.94", "30"]


def test_adapter_rejected_frame_rate():
    r = FakeResolve(FakeMP()); r.p.SetSetting = lambda k, v: False
    with pytest.raises(adapter.ResolveError, match="frame rate"):
        adapter.build_timeline("T", CLIPS, 25, module=FakeMod(r))


def test_adapter_not_connected():
    assert adapter.status(FakeMod(None))["connected"] is False


def test_davinci_endpoint_requires_approval_and_honest_without_resolve(client, sample_video):
    pid = client.post("/api/projects", json={"name": "dv"}).json()["id"]
    m = client.post(f"/api/projects/{pid}/media", json={"path": str(sample_video)}).json()
    client.post(f"/api/projects/{pid}/timeline/clips", json={"media_id": m["id"], "track": "V1"})
    assert client.post(f"/api/projects/{pid}/davinci/timeline", json={}).status_code == 409
    r = client.post(f"/api/projects/{pid}/davinci/timeline", json={"approved": True})
    assert r.status_code == 502  # no Resolve on this machine: must fail, never fake success
    assert client.get("/api/davinci/status").json()["connection"]["connected"] is False


def test_resources(client):
    r = client.get("/api/system/resources").json()
    assert 0 <= r["cpu"] <= 100 and 0 <= r["ram"] <= 100
