"""Detect DaVinci Resolve install and scripting API availability (no fake success)."""
from __future__ import annotations
import os
import sys
from pathlib import Path

WIN_APP = Path(os.environ.get("PROGRAMFILES", r"C:\Program Files")) / "Blackmagic Design" / "DaVinci Resolve"
WIN_SCRIPT = Path(os.environ.get("PROGRAMDATA", r"C:\ProgramData")) / "Blackmagic Design" / "DaVinci Resolve" / "Support" / "Developer" / "Scripting"
MAC_APP = Path("/Applications/DaVinci Resolve/DaVinci Resolve.app")
MAC_SCRIPT = Path("/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting")
LINUX_APP = Path("/opt/resolve")
LINUX_SCRIPT = LINUX_APP / "Developer" / "Scripting"


def candidates() -> tuple[Path, Path]:
    if sys.platform == "win32":
        return WIN_APP, WIN_SCRIPT
    if sys.platform == "darwin":
        return MAC_APP, MAC_SCRIPT
    return LINUX_APP, LINUX_SCRIPT


def detect() -> dict:
    app, script = candidates()
    env_mod = os.environ.get("RESOLVE_SCRIPT_API")
    script_dir = Path(env_mod) if env_mod else script
    module_dir = script_dir / "Modules"
    installed = app.exists()
    module_found = (module_dir / "DaVinciResolveScript.py").is_file()
    status = "connected_ready" if installed and module_found else (
        "installed_no_scripting_api" if installed else "not_installed")
    return {
        "status": status,
        "installed": installed,
        "install_path": str(app) if installed else None,
        "scripting_module_found": module_found,
        "scripting_module_path": str(module_dir) if module_found else None,
        "live_connection": False,  # a real connection is only tested in Phase 5 with Resolve running
        "note": "Installation detected only; connection to a running Resolve is verified in Phase 5."
                if installed else "DaVinci Resolve not detected on this machine. Mock adapter only (not a real integration test).",
    }
