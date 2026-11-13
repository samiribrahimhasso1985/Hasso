from __future__ import annotations
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from ..core.config import db_url
from .models import Base

_engine = None
_Session = None


def init_db(url: str | None = None):
    global _engine, _Session
    _engine = create_engine(url or db_url(), connect_args={"check_same_thread": False})
    Base.metadata.create_all(_engine)
    _Session = sessionmaker(_engine, expire_on_commit=False)
    return _engine


def get_session():
    if _Session is None:
        init_db()
    s: Session = _Session()
    try:
        yield s
    finally:
        s.close()
