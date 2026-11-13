from __future__ import annotations
import shutil
import subprocess
import psutil


def gpu_percent() -> int | None:
    exe = shutil.which("nvidia-smi")
    if not exe:
        return None
    try:
        out = subprocess.run([exe, "--query-gpu=utilization.gpu", "--format=csv,noheader,nounits"],
                             capture_output=True, text=True, timeout=3).stdout.strip().splitlines()
        return int(out[0]) if out else None
    except (subprocess.SubprocessError, ValueError, OSError):
        return None


def resources() -> dict:
    return {"cpu": round(psutil.cpu_percent(interval=0.2)), "ram": round(psutil.virtual_memory().percent),
            "gpu": gpu_percent()}  # gpu None = no NVIDIA GPU/driver tool available
