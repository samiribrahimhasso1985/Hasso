"""Local AI (Ollama) discovery. Reports real reachability only."""
from __future__ import annotations
import json
import os
import urllib.request
import urllib.error


def ollama_status(timeout: float = 1.5) -> dict:
    host = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")
    if not host.startswith("http"):
        host = "http://" + host
    try:
        with urllib.request.urlopen(host.rstrip("/") + "/api/tags", timeout=timeout) as r:
            models = [m.get("name") for m in json.load(r).get("models", [])]
        return {"reachable": True, "host": host, "models": models}
    except (urllib.error.URLError, OSError, ValueError, TimeoutError):
        return {"reachable": False, "host": host, "models": []}
