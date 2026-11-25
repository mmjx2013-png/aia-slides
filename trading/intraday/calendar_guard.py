"""Economic calendar guard (code-enforced). PAPER desk.

Source: https://nfs.faireconomy.media/ff_calendar_thisweek.json, cached in data/cache/calendar.json,
refreshed at most every 6 h (polite). Rules (risk.py / paperbroker.py use these):
- no new entries from 30 min before to 30 min after any USD High-impact event;
- open positions are closed 5 min before FOMC rate decisions / statements / press conferences.
If the calendar cannot be loaded, or does not cover the current time, entries are blocked
(fail safe) and the watcher prints an ERROR line.
"""
import json
import time
import urllib.request
from datetime import datetime

from common import CACHE

URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
REFRESH_S = 6 * 3600
WINDOW_MS = 30 * 60_000
FOMC_CLOSE_MS = 5 * 60_000
FOMC_WORDS = ("FOMC", "Federal Funds Rate", "Fed Chair", "Press Conference")
_mem = {"mtime": None, "events": []}


def refresh(force=False):
    """Fetch if the cache is older than 6 h. Returns (ok, message)."""
    f = CACHE / "calendar.json"
    if not force and f.exists() and time.time() - f.stat().st_mtime < REFRESH_S:
        return True, "fresh"
    try:
        req = urllib.request.Request(URL, headers={"User-Agent": "paper-desk/1.0"})
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.load(r)
        assert isinstance(data, list) and data
        CACHE.mkdir(parents=True, exist_ok=True)
        f.write_text(json.dumps(data))
        return True, f"fetched {len(data)} events"
    except Exception as e:
        return False, f"calendar fetch failed: {type(e).__name__}: {e}"


def events():
    """USD High-impact events as (t_ms, title), from the cache (re-read when it changes)."""
    f = CACHE / "calendar.json"
    if not f.exists():
        return None
    m = f.stat().st_mtime
    if _mem["mtime"] != m:
        ev = []
        for e in json.loads(f.read_text()):
            try:
                t = int(datetime.fromisoformat(e["date"]).timestamp() * 1000)
            except Exception:
                continue
            ev.append((t, e.get("title", ""), e.get("country"), e.get("impact")))
        _mem.update(mtime=m, events=ev, span=(min(x[0] for x in ev), max(x[0] for x in ev)) if ev else None)
    return _mem


def entry_block(t_ms):
    """Reason string if entries are blocked at t_ms, else None."""
    m = events()
    if m is None or not m["events"]:
        return "calendar unavailable (fail safe: no entries)"
    lo, hi = m["span"]
    if not (lo - 3 * 86400_000 <= t_ms <= hi + 3 * 86400_000):
        return "calendar does not cover this time (fail safe: no entries)"
    for t, title, cc, imp in m["events"]:
        if cc == "USD" and imp == "High" and abs(t_ms - t) <= WINDOW_MS:
            return f"calendar: USD High '{title}' at {datetime.fromtimestamp(t/1000).strftime('%H:%M')} UTC ±30 min"
    return None


def fomc_close(t_ms):
    """Title of an FOMC event 0-5 min ahead (or up to 30 min past), else None."""
    m = events()
    if not m:
        return None
    for t, title, cc, imp in m["events"]:
        if cc == "USD" and any(w.lower() in title.lower() for w in FOMC_WORDS) and \
                t - FOMC_CLOSE_MS <= t_ms <= t + WINDOW_MS:
            return title
    return None


def next_high(t_ms):
    """(title, minutes until) of the next USD High event, or None."""
    m = events()
    if not m:
        return None
    nxt = sorted((t, title) for t, title, cc, imp in m["events"] if cc == "USD" and imp == "High" and t > t_ms)
    return (nxt[0][1], int((nxt[0][0] - t_ms) / 60000)) if nxt else None
