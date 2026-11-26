"""Parse a released number from headlines with the owner's Venice API (api.venice.ai; the proxy
injects the key, so the header carries a dummy). PAPER desk helper.

pick_model(): GET /api/v1/models, keep cheap non-reasoning chat models that support a response
schema, time one tiny call on up to 3 of them, keep the fastest (cached for the day).
parse(): temperature 0, strict JSON {"actual": number|null, "unit": "...", "confident": bool}.
"""
import json
import time
import urllib.request

import env  # noqa: F401
from common import CACHE

BASE = "https://api.venice.ai/api/v1"
HDR = {"Authorization": "Bearer proxy-injected", "Content-Type": "application/json", "User-Agent": "paper-desk/1.0"}
SCHEMA = {"type": "object", "additionalProperties": False, "required": ["actual", "unit", "confident"],
          "properties": {"actual": {"type": ["number", "null"]}, "unit": {"type": "string"}, "confident": {"type": "boolean"}}}
calls = {"n": 0}


def _req(path, body=None, timeout=20):
    req = urllib.request.Request(BASE + path, data=None if body is None else json.dumps(body).encode(), headers=HDR)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def _chat(model, msgs, max_tokens=60, timeout=15):
    calls["n"] += 1
    body = {"model": model, "messages": msgs, "temperature": 0, "max_tokens": max_tokens,
            "response_format": {"type": "json_schema", "json_schema": {"name": "actual", "strict": True, "schema": SCHEMA}},
            "venice_parameters": {"include_venice_system_prompt": False}}
    r = _req("/chat/completions", body, timeout)
    return r["choices"][0]["message"]["content"]


def pick_model(max_candidates=3):
    f = CACHE / "venice_model.json"
    if f.exists() and time.time() - f.stat().st_mtime < 86400:
        return json.loads(f.read_text())
    models = _req("/models")["data"]
    cand = []
    for m in models:
        s = m.get("model_spec", {})
        c, p = s.get("capabilities", {}), s.get("pricing", {})
        if m.get("type", "text") != "text" or c.get("supportsReasoning") or not c.get("supportsResponseSchema"):
            continue
        cand.append((p.get("input", {}).get("usd", 99), m["id"]))
    cand.sort()
    timed = []
    for _, mid in cand[:max_candidates]:
        t = time.time()
        try:
            _chat(mid, [{"role": "user", "content": "Headline: 'Payrolls rose 100K'. Extract the number."}])
            timed.append((time.time() - t, mid))
        except Exception:
            continue
    best = dict(model=min(timed)[1], latency_s=round(min(timed)[0], 2), tried=[[m, round(s, 2)] for s, m in timed]) if timed \
        else dict(model=None, latency_s=None, tried=[])
    f.write_text(json.dumps(best))
    return best


def parse(model, indicator, forecast, previous, headlines):
    """Returns (dict, raw) or (None, error)."""
    msg = (f"Extract the ACTUAL released value of the US indicator '{indicator}' (forecast {forecast}, previous {previous}) "
           f"from these headlines. Use the same unit as the forecast. If no headline states the actual value, actual is null "
           f"and confident is false.\n" + "\n".join(f"- {h}" for h in headlines[:10]))
    try:
        raw = _chat(model, [{"role": "system", "content": "You extract numbers. Reply with JSON only."},
                            {"role": "user", "content": msg}])
        return json.loads(raw), raw
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"


def num(x):
    """'0.3%' -> 0.3, '250K' -> 250.0, '' -> None."""
    try:
        return float(str(x).strip().rstrip("%KMBkmb").replace(",", ""))
    except ValueError:
        return None


def sane(actual, forecast, previous):
    """Ignore a parsed number outside forecast +/- a plausible range."""
    f, p = num(forecast), num(previous)
    if actual is None or f is None:
        return False
    rng = max(1.0 if "%" in str(forecast) else 0.5 * abs(f), 4 * abs(f - p) if p is not None else 0)
    return abs(actual - f) <= rng
