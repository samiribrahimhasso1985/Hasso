"""DaVinci Resolve adapter using the official scripting API (DaVinciResolveScript).
IMPORTANT: logic is unit-tested with a fake module only. It has NOT been verified against a real
Resolve instance; a real test needs Windows + Resolve (Studio) running with scripting enabled.
Success is reported only after reading the timeline back from Resolve."""
from __future__ import annotations
import importlib
import os
import sys
from .detect import detect


class ResolveError(Exception):
    pass


def _load_module():
    d = detect()
    if not d["scripting_module_found"]:
        raise ResolveError("Resolve scripting module not found (is DaVinci Resolve installed?)")
    sys.path.append(d["scripting_module_path"])
    os.environ.setdefault("RESOLVE_SCRIPT_API", os.path.dirname(d["scripting_module_path"]))
    if sys.platform == "win32":
        lib = os.path.join(d["install_path"], "fusionscript.dll")
        if os.path.isfile(lib):
            os.environ.setdefault("RESOLVE_SCRIPT_LIB", lib)
    try:
        return importlib.import_module("DaVinciResolveScript")
    except Exception as e:  # noqa
        raise ResolveError(f"Cannot import DaVinciResolveScript: {e}")


def fps_setting(fps: float) -> str:
    """Resolve accepts only its listed rates, written like "25", "23.976", "29.97"."""
    return str(int(fps)) if abs(fps - round(fps)) < 0.001 else f"{fps:.3f}".rstrip("0").rstrip(".")


def connect(module=None):
    mod = module or _load_module()
    resolve = mod.scriptapp("Resolve")
    if not resolve:
        raise ResolveError("Could not connect. Start DaVinci Resolve and enable external scripting "
                           "(Preferences > System > General > External scripting using: Local).")
    return resolve


def status(module=None) -> dict:
    try:
        r = connect(module)
        proj = r.GetProjectManager().GetCurrentProject()
        return {"connected": True, "version": r.GetVersionString(),
                "current_project": proj.GetName() if proj else None, "error": None}
    except ResolveError as e:
        return {"connected": False, "version": None, "current_project": None, "error": str(e)}


def build_timeline(name: str, clips: list[dict], fps: float, module=None, size: tuple[int, int] | None = None) -> dict:
    """clips: dicts from core.timeline.clips (video V1..V3 and audio A1..A2). Verifies result."""
    r = connect(module)
    pm = r.GetProjectManager()
    proj = pm.GetCurrentProject() or pm.CreateProject(name)
    if not proj:
        raise ResolveError("No open project and could not create one")
    if not proj.SetSetting("timelineFrameRate", fps_setting(fps)):
        raise ResolveError(f"Resolve rejected timeline frame rate {fps_setting(fps)} "
                           "(unsupported rate, or the open project already has timelines at another rate)")
    if size:  # frame size = project's chosen format (e.g. 1080x1920 for 9:16)
        for k, v in (("timelineResolutionWidth", size[0]), ("timelineResolutionHeight", size[1])):
            if not proj.SetSetting(k, str(v)):
                raise ResolveError(f"Resolve rejected {k}={v}")
    mp = proj.GetMediaPool()
    paths = sorted({c["path"] for c in clips})
    items = mp.ImportMedia(paths)
    if not items or len(items) < len(paths):
        raise ResolveError(f"Resolve imported {len(items or [])} of {len(paths)} media files")
    by_path = {p: it for p, it in zip(paths, items)}
    tl = mp.CreateEmptyTimeline(name)
    if not tl:
        raise ResolveError("Resolve refused to create the timeline (name already used?)")
    proj.SetCurrentTimeline(tl)
    info = []
    for c in clips:
        is_audio = c["track"].startswith("A")
        info.append({"mediaPoolItem": by_path[c["path"]], "startFrame": round(c["in_point"] * fps),
                     "endFrame": round(c["out_point"] * fps), "mediaType": 2 if is_audio else 1,
                     "trackIndex": int(c["track"][1:]), "recordFrame": round(c["start"] * fps)})
    mp.AppendToTimeline(info)
    found = sum(len(tl.GetItemListInTrack("audio" if t.startswith("A") else "video", int(t[1:])) or [])
                for t in sorted({c["track"] for c in clips}))
    if found != len(clips):
        raise ResolveError(f"Verification failed: expected {len(clips)} clips in timeline, Resolve reports {found}")
    if not pm.SaveProject():
        raise ResolveError("Timeline built and verified, but Resolve could not save the project")
    return {"verified": True, "timeline": name, "clips": found}
