from __future__ import annotations
from . import providers, secrets
from .providers import ProviderError

_last_test: dict[str, dict] = {}


def status() -> list[dict]:
    out = []
    for p in providers.PROVIDERS:
        if p == "ollama":
            try:
                models = providers.list_models("ollama"); st = {"configured": True, "reachable": True, "models": models}
            except ProviderError:
                st = {"configured": True, "reachable": False, "models": []}
        else:
            t = _last_test.get(p)
            st = {"configured": bool(secrets.get_key(p)), "reachable": t["ok"] if t else None,
                  "models": t["models"] if t else []}
        out.append({"id": p, "label": providers.LABELS[p], **st})
    return out


def test(p: str) -> dict:
    try:
        models = providers.list_models(p)
        res = {"ok": True, "models": models, "error": None}
    except ProviderError as e:
        res = {"ok": False, "models": [], "error": str(e)}
    _last_test[p] = res
    return res


def route(provider: str, model: str, messages: list[dict], system: str = "",
          allow_fallback: bool = False, fallback_models: dict[str, str] | None = None) -> dict:
    """Try the chosen provider; if allowed, fall back to other usable providers."""
    order = [(provider, model)]
    if allow_fallback:
        for p, m in (fallback_models or {}).items():
            if p != provider and m:
                order.append((p, m))
    errors = []
    for i, (p, m) in enumerate(order):
        try:
            return {"provider": p, "model": m, "text": providers.chat(p, m, messages, system),
                    "fallback_used": i > 0, "errors": errors}
        except ProviderError as e:
            errors.append({"provider": p, "error": str(e)})
    raise ProviderError("; ".join(f"{e['provider']}: {e['error']}" for e in errors))
