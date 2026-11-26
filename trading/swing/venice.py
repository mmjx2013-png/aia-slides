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


PRIMARY = "deepseek-v4-1-flash-1017-ultrafast"     # boss's benchmark: median 0.40 s, 5/5 valid (thinking off)
FALLBACK = "mistral-small-3-2-24b-instruct"          # 1.25 s, 3/3


def _chat(model, msgs, max_tokens=120, timeout=15):
    calls["n"] += 1
    vp = {"include_venice_system_prompt": False}
    if model == PRIMARY:
        vp["disable_thinking"] = True                # with thinking on it needs >= 300 tokens and is slower
    body = {"model": model, "messages": msgs, "temperature": 0, "max_tokens": max_tokens,
            "response_format": {"type": "json_schema", "json_schema": {"name": "actual", "strict": True, "schema": SCHEMA}},
            "venice_parameters": vp}
    r = _req("/chat/completions", body, timeout)
    return r["choices"][0]["message"]["content"]


TESTS = [("Core PCE Price Index m/m", "0.3%", "US core PCE prices rose 0.4% in October, above the 0.3% forecast", 0.4),
         ("Non-Farm Employment Change", "150K", "US employers added 212,000 jobs in November", 212.0),
         ("CPI m/m", "0.2%", "Consumer prices climbed 0.3% last month, the Labor Department said", 0.3),
         ("ISM Manufacturing PMI", "48.5", "ISM factory index rises to 49.2 in November", 49.2),
         ("Unemployment Rate", "4.3%", "Jobless rate holds at 4.3%", 4.3)]
BENCH = env.HERE / "news" / "venice_benchmark.json"


def small_models():
    """Small chat models: text, structured output, not reasoning-only, input price <= 0.30 USD per M tokens."""
    out = []
    for m in _req("/models")["data"]:
        s = m.get("model_spec", {})
        c, p = s.get("capabilities", {}), s.get("pricing", {})
        if m.get("type", "text") == "text" and c.get("supportsResponseSchema") and not c.get("supportsReasoning") \
                and p.get("input", {}).get("usd", 99) <= 0.30:
            out.append(m["id"])
    return out


def benchmark():
    """5 test prompts per small model; median seconds to a VALID answer (correct number); failures count as 30 s."""
    import statistics
    rows = []
    for mid in small_models():
        ts, ok = [], 0
        for ind, fc, h, want in TESTS:
            t = time.time()
            r, _ = parse(mid, ind, fc, fc, [h])
            dt = time.time() - t
            good = bool(r) and r.get("actual") is not None and abs(normalize(r["actual"], fc) - want) < 1e-6
            ok += good
            ts.append(dt if good else 30.0)
        rows.append(dict(model=mid, median_s=round(statistics.median(ts), 2), valid=f"{ok}/5", times=[round(x, 2) for x in ts]))
    rows.sort(key=lambda r: (r["median_s"], -int(r["valid"][0])))
    res = dict(measured=time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()), choice=rows[0]["model"] if rows else None, models=rows)
    BENCH.parent.mkdir(parents=True, exist_ok=True)
    BENCH.write_text(json.dumps(res, indent=1))
    return res


def pick_model(max_candidates=None):
    """The primary model (owner's choice); our own small-model benchmark is kept for reference only."""
    return dict(model=PRIMARY, fallback=FALLBACK)


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
        return float(str(x).strip().upper().removesuffix("BPS").rstrip("%KMB").replace(",", ""))
    except ValueError:
        return None


def normalize(actual, forecast):
    """Put the model's number in the forecast's unit: '150K' forecast and 212000 -> 212.0 (the same for M / B)."""
    if actual is None:
        return None
    a, f = float(actual), str(forecast).strip().upper()
    if f.endswith("BPS") and abs(a) < 5:          # '25bps' forecast, model said 0.25 (percent)
        return a * 100
    if f.endswith("%") and 0 < abs(a) < 0.05 and abs(num(forecast) or 0) >= 0.5:   # 0.031 for '3.1%'
        return a * 100
    for suf, k in (("K", 1e3), ("M", 1e6), ("B", 1e9)):
        if f.endswith(suf) and abs(a) >= k:
            return a / k
    return a


def sane(actual, forecast, previous):
    """Ignore a parsed number outside forecast +/- a plausible range."""
    f, p = num(forecast), num(previous)
    if actual is None or f is None:
        return False
    rng = max(1.0 if "%" in str(forecast) else 0.5 * abs(f), 4 * abs(f - p) if p is not None else 0)
    return abs(actual - f) <= rng
