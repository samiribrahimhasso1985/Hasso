"""Run: python -m discoveries_engine  (binds to 127.0.0.1 only)."""
import os

import uvicorn


def main() -> None:
    port = int(os.environ.get("DISCOVERIES_ENGINE_PORT", "8765"))
    uvicorn.run("discoveries_engine.app:app", host="127.0.0.1", port=port, log_level="info")


if __name__ == "__main__":
    main()
