"""Cancellable background tasks with real progress."""
from __future__ import annotations
import itertools
import re
import subprocess
import threading
from pathlib import Path
from ..database.models import MediaFile
from ..database import session as dbs

_tasks: dict[int, dict] = {}
_procs: dict[int, subprocess.Popen] = {}
_ids = itertools.count(1)
_lock = threading.Lock()


def list_tasks() -> list[dict]:
    with _lock:
        return [dict(t) for t in sorted(_tasks.values(), key=lambda t: -t["id"])[:20]]


def cancel(tid: int) -> bool:
    with _lock:
        t = _tasks.get(tid)
        if not t or t["status"] != "running":
            return False
        t["status"] = "cancelling"
    p = _procs.get(tid)
    if p:
        p.kill()
    return True


def start_analysis(media_id: int, path: str, duration: float | None, has_video: bool) -> int:
    tid = next(_ids)
    with _lock:
        _tasks[tid] = {"id": tid, "name": "Analyzing media", "detail": Path(path).name,
                       "status": "running", "progress": 0.0, "remaining_s": None}
    threading.Thread(target=_run_analysis, args=(tid, media_id, path, duration, has_video), daemon=True).start()
    return tid


def _fail(tid, msg):
    with _lock:
        _tasks[tid].update(status="failed", detail=msg)


def _run_analysis(tid, media_id, path, duration, has_video):
    import shutil, time
    ff = shutil.which("ffmpeg")
    if not ff:
        return _fail(tid, "ffmpeg not installed")
    cmd = [ff, "-hide_banner", "-nostdin", "-i", path]
    if has_video:
        cmd += ["-vf", "select='gt(scene,0.35)',showinfo"]
    cmd += ["-af", "silencedetect=n=-35dB:d=0.7", "-f", "null", "-", "-progress", "pipe:2", "-nostats"]
    scenes, silences, cur = [], [], None
    t0 = time.time()
    try:
        p = subprocess.Popen(cmd, stderr=subprocess.PIPE, stdout=subprocess.DEVNULL, text=True, errors="replace")
        _procs[tid] = p
        for line in p.stderr:
            if m := re.search(r"out_time_us=(\d+)", line):
                if duration:
                    prog = min(0.99, int(m.group(1)) / 1e6 / duration)
                    with _lock:
                        _tasks[tid]["progress"] = round(prog, 3)
                        el = time.time() - t0
                        _tasks[tid]["remaining_s"] = round(el / prog - el) if prog > 0.02 else None
            elif m := re.search(r"pts_time:([\d.]+)", line):
                scenes.append(round(float(m.group(1)), 2))
            elif m := re.search(r"silence_start: ([\d.]+)", line):
                cur = round(float(m.group(1)), 2)
            elif (m := re.search(r"silence_end: ([\d.]+) \| silence_duration: ([\d.]+)", line)) and cur is not None:
                silences.append({"start": cur, "end": round(float(m.group(1)), 2), "duration": round(float(m.group(2)), 2)})
                cur = None
        p.wait()
    except OSError as e:
        return _fail(tid, str(e))
    finally:
        _procs.pop(tid, None)
    with _lock:
        if _tasks[tid]["status"] == "cancelling":
            _tasks[tid].update(status="cancelled")
            return
    if p.returncode != 0:
        return _fail(tid, f"ffmpeg exited with {p.returncode}")
    db = next(dbs.get_session())
    try:
        m = db.get(MediaFile, media_id)
        m.analysis = {"scene_changes": scenes, "silences": silences,
                      "note": "Detected automatically. Silences are suggestions only; review before cutting."}
        db.commit()
    finally:
        db.close()
    with _lock:
        _tasks[tid].update(status="done", progress=1.0, remaining_s=0,
                           detail=f"{len(scenes)} scene changes, {len(silences)} silences")
