"""Provider-independent AI layer: Ollama (local), OpenAI/ChatGPT, Anthropic/Claude, Google Gemini."""
from __future__ import annotations
import os
import httpx
from . import secrets

PROVIDERS = ["ollama", "anthropic", "openai", "gemini"]
LABELS = {"ollama": "Local AI (Ollama)", "anthropic": "Claude", "openai": "ChatGPT (OpenAI)", "gemini": "Gemini"}
TIMEOUT = 60.0
_transport = None  # tests inject httpx.MockTransport


class ProviderError(Exception):
    pass


def _client(timeout: float = TIMEOUT) -> httpx.Client:
    return httpx.Client(timeout=timeout, transport=_transport)


def ollama_host() -> str:
    h = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")
    return (h if h.startswith("http") else "http://" + h).rstrip("/")


def _need_key(p: str) -> str:
    k = secrets.get_key(p)
    if not k:
        raise ProviderError(f"{LABELS[p]}: API key not configured")
    return k


def _send(method: str, url: str, **kw) -> dict:
    try:
        with _client(kw.pop("timeout", TIMEOUT)) as c:
            r = c.request(method, url, **kw)
    except httpx.TimeoutException:
        raise ProviderError("Request timed out")
    except httpx.HTTPError as e:
        raise ProviderError(f"Connection failed: {type(e).__name__}")
    if r.status_code in (401, 403):
        raise ProviderError("Authentication failed (check the API key)")
    if r.status_code == 429:
        raise ProviderError("Rate limit or quota exceeded")
    if r.status_code >= 400:
        raise ProviderError(f"Provider returned HTTP {r.status_code}")
    try:
        return r.json()
    except ValueError:
        raise ProviderError("Invalid response from provider")


def list_models(p: str) -> list[str]:
    if p == "ollama":
        d = _send("GET", ollama_host() + "/api/tags", timeout=3)
        return [m["name"] for m in d.get("models", [])]
    if p == "anthropic":
        d = _send("GET", "https://api.anthropic.com/v1/models?limit=100",
                  headers={"x-api-key": _need_key(p), "anthropic-version": "2023-06-01"}, timeout=15)
        return [m["id"] for m in d.get("data", [])]
    if p == "openai":
        d = _send("GET", "https://api.openai.com/v1/models",
                  headers={"Authorization": f"Bearer {_need_key(p)}"}, timeout=15)
        return sorted(m["id"] for m in d.get("data", []) if m["id"].startswith(("gpt", "o1", "o3", "o4")))
    if p == "gemini":
        d = _send("GET", "https://generativelanguage.googleapis.com/v1beta/models",
                  headers={"x-goog-api-key": _need_key(p)}, timeout=15)
        return [m["name"].removeprefix("models/") for m in d.get("models", [])
                if "generateContent" in m.get("supportedGenerationMethods", [])]
    raise ProviderError("Unknown provider")


def chat(p: str, model: str, messages: list[dict], system: str = "") -> str:
    """messages: [{role: 'user'|'assistant', content: str}]. Text only - media is never sent."""
    if p == "ollama":
        msgs = ([{"role": "system", "content": system}] if system else []) + messages
        d = _send("POST", ollama_host() + "/api/chat", json={"model": model, "messages": msgs, "stream": False}, timeout=300)
        return d["message"]["content"]
    if p == "anthropic":
        body = {"model": model, "max_tokens": 2048, "messages": messages}
        if system:
            body["system"] = system
        d = _send("POST", "https://api.anthropic.com/v1/messages", json=body,
                  headers={"x-api-key": _need_key(p), "anthropic-version": "2023-06-01"})
        return "".join(b.get("text", "") for b in d.get("content", []))
    if p == "openai":
        msgs = ([{"role": "system", "content": system}] if system else []) + messages
        d = _send("POST", "https://api.openai.com/v1/chat/completions", json={"model": model, "messages": msgs},
                  headers={"Authorization": f"Bearer {_need_key(p)}"})
        return d["choices"][0]["message"]["content"]
    if p == "gemini":
        contents = [{"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]} for m in messages]
        body = {"contents": contents}
        if system:
            body["systemInstruction"] = {"parts": [{"text": system}]}
        d = _send("POST", f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                  json=body, headers={"x-goog-api-key": _need_key(p)})
        try:
            return "".join(x.get("text", "") for x in d["candidates"][0]["content"]["parts"])
        except (KeyError, IndexError):
            raise ProviderError("Gemini returned no content")
    raise ProviderError("Unknown provider")
