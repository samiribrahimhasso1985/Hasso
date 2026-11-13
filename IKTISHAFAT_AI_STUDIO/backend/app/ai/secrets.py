"""API keys live in the OS credential store (Windows Credential Manager via keyring).
Keys are never written to SQLite/logs and never returned by the API."""
from __future__ import annotations
import os

SERVICE = "IKTISHAFAT_AI_STUDIO"
ENV = {"anthropic": "ANTHROPIC_API_KEY", "openai": "OPENAI_API_KEY", "gemini": "GEMINI_API_KEY"}


def _kr():
    try:
        import keyring
        from keyring.backends import fail
        if isinstance(keyring.get_keyring(), fail.Keyring):
            return None
        return keyring
    except Exception:
        return None


def secure_store_available() -> bool:
    return _kr() is not None


def get_key(provider: str) -> str | None:
    kr = _kr()
    if kr:
        try:
            v = kr.get_password(SERVICE, provider)
            if v:
                return v
        except Exception:
            pass
    return os.environ.get(ENV.get(provider, "")) or None


def set_key(provider: str, key: str) -> None:
    kr = _kr()
    if not kr:
        raise RuntimeError("No secure credential store available on this system "
                           f"(set the {ENV.get(provider)} environment variable instead).")
    kr.set_password(SERVICE, provider, key)


def delete_key(provider: str) -> None:
    kr = _kr()
    if kr:
        try:
            kr.delete_password(SERVICE, provider)
        except Exception:
            pass
