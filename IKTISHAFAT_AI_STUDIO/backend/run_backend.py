"""Entry point for the packaged (PyInstaller) backend."""
import os
import uvicorn
from app.main import create_app

if __name__ == "__main__":
    uvicorn.run(create_app(), host="127.0.0.1", port=int(os.environ.get("IKTISHAFAT_PORT", "8765")), log_level="warning")
