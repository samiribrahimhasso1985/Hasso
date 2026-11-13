import hashlib
from pathlib import Path
import pytest
from app.core.security import safe_write_path, SecurityError, validate_source_file
from app.davinci.detect import detect


def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"


def test_project_create_list_duplicate(client):
    r = client.post("/api/projects", json={"name": "فيلم تجريبي", "language": "ar"})
    assert r.status_code == 201
    assert Path(r.json()["folder"], "storyboard").is_dir()
    assert client.post("/api/projects", json={"name": "فيلم تجريبي"}).status_code == 400
    assert len(client.get("/api/projects").json()) == 1


def test_invalid_language_rejected(client):
    assert client.post("/api/projects", json={"name": "x", "language": "fr"}).status_code == 422


def test_import_real_video_with_ffprobe(client, sample_video):
    pid = client.post("/api/projects", json={"name": "p"}).json()["id"]
    before = hashlib.sha256(sample_video.read_bytes()).hexdigest()
    r = client.post(f"/api/projects/{pid}/media", json={"path": str(sample_video)})
    assert r.status_code == 201
    m = r.json()
    assert m["kind"] == "video" and m["meta_source"] == "ffprobe"
    assert (m["width"], m["height"]) == (320, 240)
    assert m["fps"] == 25.0 and 1.9 < m["duration"] < 2.2
    assert hashlib.sha256(sample_video.read_bytes()).hexdigest() == before  # original untouched
    again = client.post(f"/api/projects/{pid}/media", json={"path": str(sample_video)}).json()
    assert again["duplicate"] is True and again["id"] == m["id"]
    assert len(client.get(f"/api/projects/{pid}/media?kind=video").json()) == 1


def test_missing_file_detected(client, sample_video):
    pid = client.post("/api/projects", json={"name": "p"}).json()["id"]
    client.post(f"/api/projects/{pid}/media", json={"path": str(sample_video)})
    sample_video.unlink()
    assert client.get(f"/api/projects/{pid}/media").json()[0]["status"] == "missing"


def test_rejects_bad_files(client, tmp_path):
    pid = client.post("/api/projects", json={"name": "p"}).json()["id"]
    exe = tmp_path / "x.exe"; exe.write_bytes(b"MZ")
    assert client.post(f"/api/projects/{pid}/media", json={"path": str(exe)}).status_code == 400
    assert client.post(f"/api/projects/{pid}/media", json={"path": "relative.mp4"}).status_code == 400
    assert client.post(f"/api/projects/{pid}/media", json={"path": str(tmp_path / "nope.mp4")}).status_code == 400


def test_write_path_guard(client, tmp_path):
    with pytest.raises(SecurityError):
        safe_write_path(tmp_path / "outside.txt")
    with pytest.raises(SecurityError):
        validate_source_file("../etc/passwd")


def test_delete_requires_confirm_and_backs_up(client):
    p = client.post("/api/projects", json={"name": "del"}).json()
    assert client.delete(f"/api/projects/{p['id']}").status_code == 409
    r = client.delete(f"/api/projects/{p['id']}?confirm=true")
    assert r.status_code == 200 and Path(r.json()["backup"]).is_file()
    assert not Path(p["folder"]).exists()
    assert client.get(f"/api/projects/{p['id']}").status_code == 404


def test_backup_restore_roundtrip(client):
    from app.core.projects import restore_backup
    p = client.post("/api/projects", json={"name": "rt"}).json()
    (Path(p["folder"]) / "storyboard" / "a.txt").write_text("hello")
    bak = client.post(f"/api/projects/{p['id']}/backup").json()["backup"]
    import shutil; shutil.rmtree(p["folder"])
    restored = restore_backup(Path(bak))
    assert (restored / "storyboard" / "a.txt").read_text() == "hello"
    with pytest.raises(SecurityError):  # refuses to overwrite
        restore_backup(Path(bak))


def test_zip_slip_blocked(client):
    import zipfile
    from app.core.config import data_root
    from app.core.projects import restore_backup
    z = data_root() / "backups" / "evil.zip"
    with zipfile.ZipFile(z, "w") as f:
        f.writestr("proj/../../escape.txt", "x")
    with pytest.raises(SecurityError):
        restore_backup(z)


def test_diagnostics_is_honest(client):
    d = client.get("/api/diagnostics").json()
    assert d["davinci"]["live_connection"] is False
    assert d["davinci"]["status"] in {"not_installed", "installed_no_scripting_api", "connected_ready"}
    assert "reachable" in d["local_ai"]


def test_dashboard(client):
    client.post("/api/projects", json={"name": "d"})
    d = client.get("/api/dashboard").json()
    assert d["project_count"] == 1 and d["current_project"]["name"] == "d"


def test_formats_and_vertical_project(client):
    f = client.get("/api/formats").json()
    assert {"vert916", "hd169", "sq11"} <= {p["id"] for p in f["presets"]}
    r = client.post("/api/projects", json={"name": "v", "format_id": "vert916", "fps": 30})
    assert r.status_code == 201
    p = r.json()
    assert (p["aspect"], p["width"], p["height"], p["fps"]) == ("9:16", 1080, 1920, 30.0)
    c = client.post("/api/projects", json={"name": "c", "format_id": "custom", "width": 1600, "height": 900}).json()
    assert c["aspect"] == "16:9"
    assert client.post("/api/projects", json={"name": "b1", "format_id": "nope"}).status_code == 400
    assert client.post("/api/projects", json={"name": "b2", "format_id": "custom", "width": 1001, "height": 900}).status_code == 400
    assert client.post("/api/projects", json={"name": "b3", "fps": 17}).status_code == 400


def test_aspect_fit_reports_reframe(client, sample_video):
    pid = client.post("/api/projects", json={"name": "v", "format_id": "vert916"}).json()["id"]
    m = client.post(f"/api/projects/{pid}/media", json={"path": str(sample_video)}).json()  # 320x240 (4:3) into 9:16
    assert m["fit"]["status"] == "reframe" and m["fit"]["axis"] == "width" and m["fit"]["crop_percent"] == 58
    pid2 = client.post("/api/projects", json={"name": "s", "format_id": "std43"}).json()["id"]
    assert client.post(f"/api/projects/{pid2}/media", json={"path": str(sample_video)}).json()["fit"]["status"] == "match"
    assert client.get(f"/api/projects/{pid}/overview").json()["target"]["aspect"] == "9:16"


def test_old_database_is_migrated(tmp_path):
    import sqlite3
    from app.database import session
    db = tmp_path / "old.db"
    con = sqlite3.connect(db)
    con.execute("CREATE TABLE projects (id INTEGER PRIMARY KEY, name VARCHAR(200), description TEXT, stage VARCHAR(30), language VARCHAR(5), folder VARCHAR(500), created_at DATETIME, updated_at DATETIME)")
    con.execute("CREATE TABLE media_files (id INTEGER PRIMARY KEY, project_id INTEGER, path VARCHAR(1000), kind VARCHAR(20), size_bytes INTEGER, sha256 VARCHAR(64), duration FLOAT, width INTEGER, height INTEGER, fps FLOAT, codec VARCHAR(50), meta_source VARCHAR(20), source VARCHAR(300), license VARCHAR(300), added_at DATETIME)")
    con.execute("INSERT INTO projects (name,description,stage,language,folder) VALUES ('old','','pre-production','ar','/x')")
    con.commit(); con.close()
    eng = session.init_db(f"sqlite:///{db.as_posix()}")
    cols = {r[1] for r in eng.connect().exec_driver_sql("PRAGMA table_info(projects)")}
    assert {"format_id", "aspect", "width", "height", "fps"} <= cols
    eng.dispose()
