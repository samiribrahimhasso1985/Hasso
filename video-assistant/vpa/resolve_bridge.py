"""Connection to DaVinci Resolve Studio through the official scripting API.

Finds DaVinciResolveScript and fusionscript.dll in their default Windows
locations and sets the environment for this process only, so the user does
not need to edit system environment variables.

`check()` is read-only: it does not create, modify or render anything.
"""

from __future__ import annotations

import importlib
import logging
import os
import sys
from pathlib import Path

from .errors import VPAError

log = logging.getLogger("vpa.resolve")

WIN_API = Path(os.environ.get("PROGRAMDATA", r"C:\ProgramData")) / \
    "Blackmagic Design/DaVinci Resolve/Support/Developer/Scripting"
WIN_LIB = Path(os.environ.get("PROGRAMFILES", r"C:\Program Files")) / \
    "Blackmagic Design/DaVinci Resolve/fusionscript.dll"


class ResolveError(VPAError):
    pass


def _configure_env() -> None:
    api = Path(os.environ.get("RESOLVE_SCRIPT_API", WIN_API))
    lib = Path(os.environ.get("RESOLVE_SCRIPT_LIB", WIN_LIB))
    modules = api / "Modules"
    if not (modules / "DaVinciResolveScript.py").exists():
        raise ResolveError(
            f"DaVinciResolveScript.py not found in {modules}",
            "لم يتم العثور على ملفات السكربت الخاصة بـ DaVinci Resolve. "
            "تأكد أن DaVinci Resolve Studio مثبّت في مكانه الافتراضي.",
        )
    if not lib.exists():
        raise ResolveError(
            f"fusionscript library not found: {lib}",
            "لم يتم العثور على fusionscript.dll. تأكد من تثبيت DaVinci Resolve Studio.",
        )
    os.environ["RESOLVE_SCRIPT_API"] = str(api)
    os.environ["RESOLVE_SCRIPT_LIB"] = str(lib)
    if str(modules) not in sys.path:
        sys.path.append(str(modules))


def connect():
    """Return the Resolve object, or raise ResolveError with an Arabic hint."""
    _configure_env()
    try:
        dvr = importlib.import_module("DaVinciResolveScript")
    except Exception as e:
        raise ResolveError(
            f"Could not import DaVinciResolveScript: {e}",
            "تعذّر تحميل واجهة السكربت. قد تكون نسخة Python غير متوافقة مع DaVinci Resolve.",
        ) from e
    resolve = dvr.scriptapp("Resolve")
    if resolve is None:
        raise ResolveError(
            "scriptapp('Resolve') returned None",
            "تعذّر الاتصال بـ DaVinci Resolve. تأكد أن:\n"
            "  1) البرنامج مفتوح الآن.\n"
            "  2) في Preferences ← System ← General: خيار "
            "«External scripting using» مضبوط على Local.\n"
            "  3) أعدت تشغيل البرنامج بعد تغيير الخيار.",
        )
    return resolve


def check() -> dict:
    """Read-only connection test. Reports what it sees; changes nothing."""
    resolve = connect()
    pm = resolve.GetProjectManager()
    project = pm.GetCurrentProject() if pm else None
    info = {
        "product": resolve.GetProductName(),
        "version": resolve.GetVersionString(),
        "page": resolve.GetCurrentPage(),
        "current_project": project.GetName() if project else None,
        "timeline_count": project.GetTimelineCount() if project else None,
        "python": sys.version.split()[0],
    }
    if info["product"] and "Studio" not in info["product"]:
        log.warning("⚠️ النسخة المكتشفة ليست Studio (%s). التحكم الخارجي قد لا يعمل.",
                    info["product"])
    return info
