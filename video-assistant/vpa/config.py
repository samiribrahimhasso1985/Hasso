"""Configuration: defaults + optional user override file (no code editing needed)."""

from __future__ import annotations

import copy
import json
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG = APP_ROOT / "config" / "default_config.json"
USER_CONFIG = APP_ROOT / "config" / "user_config.json"


def _merge(base: dict, override: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in override.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _merge(out[k], v)
        else:
            out[k] = v
    return out


def load_config(extra: Path | None = None) -> dict:
    cfg = json.loads(DEFAULT_CONFIG.read_text(encoding="utf-8"))
    for path in (USER_CONFIG, extra):
        if path and Path(path).is_file():
            cfg = _merge(cfg, json.loads(Path(path).read_text(encoding="utf-8")))
    root = Path(cfg["projects_root"])
    if not root.is_absolute():
        root = APP_ROOT / root
    cfg["projects_root"] = str(root)
    return cfg
