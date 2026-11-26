"""INFLUENTIAL STATEMENTS block for the swing and news Opus briefs. PAPER desk helper. Allowed hosts only:
federalreserve.gov feeds (speeches, monetary press releases, last 48 h) and Google News RSS (last 24 h, <= 5 per
query in people.json). No x.com, no truthsocial. Each headline is classified in ONE ultrafast Venice call:
topic (tariffs/geopolitics/Fed/inflation/central-bank-gold/other) and gold impact (bullish/bearish/neutral, confidence).
"""
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

import env  # noqa: F401
import venice

CFG = env.HERE / "people.json"
UA = {"User-Agent": "paper-desk/1.0"}
TOPICS = ["tariffs", "geopolitics", "Fed", "inflation", "central-bank-gold", "other"]
CSCHEMA = {"type": "object", "additionalProperties": False, "required": ["items"], "properties": {"items": {"type": "array", "items": {
    "type": "object", "additionalProperties": False, "required": ["i", "topic", "impact", "confidence"],
    "properties": {"i": {"type": "integer"}, "topic": {"type": "string", "enum": TOPICS},
                   "impact": {"type": "string", "enum": ["bullish", "bearish", "neutral"]}, "confidence": {"type": "number"}}}}}}


def _rss(url, timeout=10):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return ET.fromstring(r.read())


def gnews(q, asof_ms, hours, n):
    u = "https://news.google.com/rss/search?" + urllib.parse.urlencode({"q": f"{q} when:{max(1, hours // 24)}d" if hours >= 24 else f"{q} when:{hours}h",
                                                                         "hl": "en-US", "gl": "US", "ceid": "US:en"})
    out = []
    for it in _rss(u).iter("item"):
        ts = parsedate_to_datetime(it.findtext("pubDate")).timestamp() * 1000
        if asof_ms - hours * 3600_000 <= ts <= asof_ms:
            out.append((ts, (it.findtext("title") or "").strip()))
    return sorted(out, reverse=True)[:n]


def fed(asof_ms, hours=48):
    out = []
    for f in json.loads(CFG.read_text())["fed_feeds"]:
        try:
            root = _rss("https://www.federalreserve.gov/feeds/" + f)
        except Exception:
            continue
        for it in root.iter("item"):
            ts = parsedate_to_datetime(it.findtext("pubDate").strip()).timestamp() * 1000
            if asof_ms - hours * 3600_000 <= ts <= asof_ms:
                out.append((ts, "Fed: " + re.sub(r"\s+", " ", it.findtext("title") or "")))
    return sorted(out, reverse=True)


def classify(titles):
    """One Venice call for all titles -> list of dicts (or [] on failure)."""
    if not titles:
        return []
    body = {"model": venice.PRIMARY, "temperature": 0, "max_tokens": 40 * len(titles) + 60,
            "messages": [{"role": "system", "content": "You label news headlines for a gold trader. JSON only."},
                         {"role": "user", "content": "For each numbered headline give topic (" + "/".join(TOPICS) +
                          ") and its likely impact on the gold price (bullish/bearish/neutral) with confidence 0-1.\n" +
                          "\n".join(f"{i}. {t}" for i, t in enumerate(titles))}],
            "response_format": {"type": "json_schema", "json_schema": {"name": "labels", "strict": True, "schema": CSCHEMA}},
            "venice_parameters": {"include_venice_system_prompt": False, "disable_thinking": True}}
    try:
        venice.calls["n"] += 1
        r = venice._req("/chat/completions", body, timeout=30)
        return json.loads(r["choices"][0]["message"]["content"])["items"]
    except Exception:
        return []


def collect(asof_ms):
    rows = [("Fed feeds", ts, t) for ts, t in fed(asof_ms)]
    for q in json.loads(CFG.read_text())["queries"]:
        try:
            rows += [(q["label"], ts, t) for ts, t in gnews(q["q"], asof_ms, 24, 5)]
        except Exception:
            rows.append((q["label"], None, "(fetch failed)"))
    return rows


def block(asof_ms, rows=None):
    rows = collect(asof_ms) if rows is None else rows
    real = [r for r in rows if r[1] is not None]
    lab = {x["i"]: x for x in classify([t for _, _, t in real])}
    lines, cur = ["## Influential statements (Fed feeds 48 h; Google News 24 h, <= 5 per person/topic; labels by a fast model)"], None
    for i, (who, ts, t) in enumerate(real):
        if who != cur:
            lines.append(f"[{who}]")
            cur = who
        l = lab.get(i)
        tag = f" [{l['topic']}, gold {l['impact']} {l['confidence']:.1f}]" if l else ""
        lines.append(f"- {(asof_ms - ts) / 3600_000:.0f} h ago: {t[:120]}{tag}")
    if lab:
        imp = [l["impact"] for l in lab.values() if l["confidence"] >= 0.6]
        lines.append(f"Tally (confidence >= 0.6): {imp.count('bullish')} bullish, {imp.count('bearish')} bearish, {imp.count('neutral')} neutral.")
    return "\n".join(lines)


if __name__ == "__main__":
    import time
    t = int(time.time() * 1000)
    b = block(t)
    print(b, f"\n~{len(b) // 4} tokens, Venice calls {venice.calls['n']}")


def trim(block_text, max_chars):
    """Drop the oldest headline lines until the block fits in max_chars (keeps the header and the tally)."""
    lines = block_text.splitlines()
    while len("\n".join(lines)) > max(max_chars, 0):
        ages = [(float(m.group(1)), i) for i, l in enumerate(lines) if (m := re.match(r"- (\d+) h ago:", l))]
        if not ages:
            break
        lines.pop(max(ages)[1])
    return "\n".join(lines)
