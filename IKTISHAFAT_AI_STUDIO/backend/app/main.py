from __future__ import annotations
import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router
from .core.config import ensure_dirs
from .database.session import init_db


def create_app() -> FastAPI:
    root = ensure_dirs()
    logging.basicConfig(filename=str(root / "logs" / "backend.log"), level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    init_db()
    app = FastAPI(title="IKTISHAFAT AI STUDIO", version="0.1.0")
    # Local-only app: allow the Vite dev server and the Electron file:// origin.
    app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "null"],
                       allow_methods=["*"], allow_headers=["*"])
    app.include_router(router)
    return app


app = create_app() if os.environ.get("IKTISHAFAT_NO_AUTOINIT") != "1" else None


def run():
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=int(os.environ.get("IKTISHAFAT_PORT", "8765")))


if __name__ == "__main__":
    run()
