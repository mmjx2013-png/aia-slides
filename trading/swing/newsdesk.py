"""NEWS DESK (PAPER ONLY): a separate book, "news", 10,000 USD, 1% risk per trade. It never touches
the main book, whose calendar guard is unchanged.

  python3 newsdesk.py next                 -> 'PLAYBOOK <brief.md>' for a USD High event before the next
                                              wake (+5 min), or 'NONE <next event and time>'
  python3 newsdesk.py playbook <id> '<json>' <tokens>
                                           -> validates and saves news/<id>/playbook.json; prints the
                                              send_later time (T-5 min) for news_exec.py
  python3 newsdesk.py upcoming             the next USD High events in the calendar feed
Event id: YYYYMMDD-HHMM (Bangkok) of the release; events at the same minute are one event group.
"""
import json
import re
import sys
import time
from pathlib import Path

import pandas as pd

import env  # noqa: F401
import calendar_guard
import rules as R
from brief import trend
from common import bkk, jlines, load_cache
from market import frames

HERE = env.HERE
NEWS = HERE / "news"
WAKE_GAP_MS = 4 * 3600_000 + 5 * 60_000
CAPITAL, RISK = 10_000.0, 0.01


def groups(t_from=None, t_to=None):
    """USD High events grouped by release minute: [(t_ms, [event dicts])]."""
    f = calendar_guard.CACHE / "calendar_archive.json"
    f = f if f.exists() else calendar_guard.CACHE / "calendar.json"
    out = {}
    for e in json.loads(f.read_text()) if f.exists() else []:
        if e.get("country") != "USD" or e.get("impact") != "High":
            continue
        t = int(pd.Timestamp(e["date"]).tz_convert("UTC").value // 10**6)
        if (t_from is None or t > t_from) and (t_to is None or t <= t_to):
            out.setdefault(t, []).append(dict(title=e["title"], forecast=e.get("forecast", ""), previous=e.get("previous", "")))
    return sorted(out.items())


def eid(t_ms):
    return bkk(t_ms).strftime("%Y%m%d-%H%M")


def reactions(m1, before_ms, n=4):
    """Recent USD High releases with 1m data: the move at +2, +15 and +30 min and the 30-min range."""
    rows = []
    for t, evs in groups(t_to=before_ms)[::-1]:
        x = m1[(m1["t"] >= t - 60_000) & (m1["t"] < t + 30 * 60_000)]
        if len(x) < 25:
            continue
        p0 = x["o"].iloc[1] if len(x) > 1 else x["o"].iloc[0]

        def at(k):
            y = x[x["t"] < t + k * 60_000]
            return y["c"].iloc[-1] - p0
        rows.append(f"- {bkk(t).strftime('%a %d %b %H:%M')} {', '.join(e['title'] for e in evs)}: +2m {at(2):+.1f}, "
                    f"+15m {at(15):+.1f}, +30m {at(30):+.1f} USD; 30-min high/low {x['h'].max() - p0:+.1f} / {x['l'].min() - p0:+.1f}")
        if len(rows) >= n:
            break
    return "\n".join(rows) or "- none with 1m data in the cache"


def brief(t_ev, evs, asof_ms, m1=None, heads=True):
    m1 = load_cache() if m1 is None else m1
    fr = frames(asof_ms, m1)
    t1, t4 = trend(fr["1h"]), trend(fr["4h"])
    px = float(fr["1m"]["c"].iloc[-1])
    hl = "(not fetched in this replay)"
    if heads:
        from news import headlines
        hl = headlines(asof_ms, days=2, per_day=(5, 3))
    ev = "\n".join(f"- {e['title']}: forecast {e['forecast'] or 'n/a'}, previous {e['previous'] or 'n/a'}" for e in evs)
    return f"""# PAPER news desk playbook, event {eid(t_ev)}
Release: {bkk(t_ev).strftime('%a %Y-%m-%d %H:%M')} Bangkok ({pd.Timestamp(t_ev, unit='ms', tz='UTC').strftime('%H:%M')} UTC), {(t_ev - asof_ms) / 60000:.0f} min from now.
{ev}
PAXG price {px:.2f} (about 1:1 with spot gold).

## Trend
- 4h: {t4['regime']}, ADX {t4['adx']:.0f}, ATR14 {t4['atr']:.2f} USD, close vs EMA20/50 {100 * (px / t4['e'][20] - 1):+.2f}% / {100 * (px / t4['e'][50] - 1):+.2f}%
- 1h: {t1['regime']}, ADX {t1['adx']:.0f}, ATR14 {t1['atr']:.2f} USD, close vs EMA20/50 {100 * (px / t1['e'][20] - 1):+.2f}% / {100 * (px / t1['e'][50] - 1):+.2f}%

## Recent reactions to USD High releases (PAXG, from the release-minute open)
{reactions(m1, asof_ms)}

## Headlines (positioning context)
{hl}

{(HERE / 'prompts' / 'news_playbook.md').read_text()}"""


def validate(pb, evs):
    """Code checks on Opus's playbook. Returns (playbook, problems)."""
    bad = []
    names = {e["title"] for e in evs}
    sc = pb.get("scenarios") or []
    if not sc:
        bad.append("no scenarios")
    for s in sc:
        tr = s.get("trigger") or {}
        if tr.get("type") not in ("surprise", "reaction"):
            bad.append(f"{s.get('name')}: trigger type must be surprise or reaction")
        if tr.get("type") == "surprise" and tr.get("indicator") not in names:
            bad.append(f"{s.get('name')}: indicator must be one of {sorted(names)}")
        if s.get("direction") not in ("buy", "sell", "none"):
            bad.append(f"{s.get('name')}: direction buy/sell/none")
        if s.get("direction") != "none":
            for k in ("stop_usd", "target_usd", "max_hold_min"):
                if not isinstance(s.get(k), (int, float)) or s[k] <= 0:
                    bad.append(f"{s.get('name')}: {k} must be > 0")
            s["max_hold_min"] = min(float(s.get("max_hold_min") or 30), 30)
    c = pb.setdefault("contingency", {})
    c["max_reversals"] = min(int(c.get("max_reversals", 1) or 0), 1)
    fb = pb.setdefault("fallback", {})
    fb.setdefault("no_actual_after_s", 90)
    if fb.get("mode") not in ("reaction_only", "stay_out"):
        fb["mode"] = "stay_out"
    return pb, bad


def save_playbook(event_id, reply, tokens):
    meta = json.loads((NEWS / event_id / "event.json").read_text())
    m = re.search(r"\{.*\}", reply, re.S)
    try:
        pb = json.loads(m.group(0)) if m else {}
    except json.JSONDecodeError:
        pb = {}
    pb, bad = validate(pb, meta["events"])
    pb.update(event_id=event_id, saved_ms=int(time.time() * 1000), opus_tokens=int(tokens), problems=bad)
    (NEWS / event_id / "playbook.json").write_text(json.dumps(pb, indent=1))
    t5 = meta["t_ms"] - 5 * 60_000
    return f"SAVED {NEWS / event_id / 'playbook.json'} problems={bad or 'none'}; send_later at " \
           f"{pd.Timestamp(t5, unit='ms', tz='UTC').strftime('%Y-%m-%dT%H:%M:%SZ')} (T-5 min) to run news_exec.py run {event_id}"


def next_event(now_ms=None, heads=True):
    now_ms = int(time.time() * 1000) if now_ms is None else now_ms
    g = groups(now_ms, now_ms + WAKE_GAP_MS)
    if not g:
        nxt = groups(now_ms)
        return "NONE " + (f"next USD High: {eid(nxt[0][0])} Bangkok {', '.join(e['title'] for e in nxt[0][1])}" if nxt
                          else "no USD High event left in the calendar feed (the next week's file appears on Sunday)")
    t, evs = g[0]
    d = NEWS / eid(t)
    if (d / "playbook.json").exists():
        return f"NONE playbook already saved for {eid(t)}"
    d.mkdir(parents=True, exist_ok=True)
    (d / "event.json").write_text(json.dumps(dict(t_ms=t, events=evs)))
    (d / "brief.md").write_text(brief(t, evs, now_ms, heads=heads))
    return f"PLAYBOOK {d / 'brief.md'}"


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[0] == "next":
        print(next_event())
    elif a[0] == "playbook":
        print(save_playbook(a[1], a[2], a[3]))
    elif a[0] == "upcoming":
        for t, evs in groups(int(time.time() * 1000))[:5]:
            print(eid(t), ", ".join(e["title"] for e in evs))
