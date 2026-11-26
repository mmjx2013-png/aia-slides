"""SHOCK DETECTOR (code, at the 1m-replay step). PAPER ONLY.

A shock = an unscheduled move (no USD High calendar event within +/-30 min) of
  more than 5 x ATR14(1m) close-to-close within 5 min, or more than 2% within 30 min.
One shock per 30 min at most. On a shock (code-enforced, AI book and its same-decision books):
  - no new entries for 30 min;
  - an open position on the WRONG side of the shock gets its stop tightened to the tighter of the current stop
    and the larger(long) / smaller(short) of breakeven and price -/+ 0.5R. Never widened. If that level is
    already through the price, the next bar's open takes the position out.
Live, the last hour of headlines (gold, the people list, "breaking") is pulled and classified by Venice; the
shock log goes into the next Opus brief. Log: data/books/shocks.jsonl.
"""
import json

import numpy as np
import pandas as pd

import env  # noqa: F401
from common import bkk, jappend, jlines

ATR_K, MOVE_5M, PCT_30M = 5.0, 5, 0.02
FLOOR_ATR1H = 1.0   # ALSO require the 5-min move >= 1 x ATR14(1h). The rule as specified (5 x ATR(1m) alone) flagged
                    # 690 "shocks" in 30 days (23 a day: quiet-hour ATR(1m) is cents); with this floor: 48 (1.6 a day).
                    # 0 = as specified. See reports/shock_scan_30d.md.
BLOCK_MS, COOLDOWN_MS, CAL_WIN_MS = 30 * 60_000, 30 * 60_000, 30 * 60_000


def scheduled(t_ms):
    """(True/False/None, title): None = the calendar archive does not cover this time."""
    import newsdesk
    g = newsdesk.groups()
    if not g:
        return None, None
    if not (g[0][0] - 2 * 86400_000 <= t_ms <= g[-1][0] + 2 * 86400_000):
        return None, None
    for t, evs in g:
        if abs(t_ms - t) <= CAL_WIN_MS:
            return True, evs[0]["title"]
    return False, None


def scan(m1, from_t=None, last_shock_t=None):
    """Shocks on closed 1m bars with t > from_t. Returns a list of dicts."""
    c, h, l = m1["c"].values, m1["h"].values, m1["l"].values
    pc = np.r_[np.nan, c[:-1]]
    tr = np.maximum(h - l, np.maximum(np.abs(h - pc), np.abs(l - pc)))
    atr = pd.Series(tr).rolling(14).mean().shift(1).values          # ATR of the bars BEFORE this one
    ts = m1["t"].values
    hr = m1.resample("60min").agg({"h": "max", "l": "min", "c": "last"}).dropna()
    hpc = hr["c"].shift()
    htr = np.maximum(hr["h"] - hr["l"], np.maximum((hr["h"] - hpc).abs(), (hr["l"] - hpc).abs()))
    atr1h = htr.rolling(14).mean().shift(1).reindex(m1.index, method="ffill").values   # completed hours only
    out, last = [], last_shock_t
    for k in range(30, len(m1)):
        t = int(ts[k])
        if from_t is not None and t <= from_t:
            continue
        mv5, mv30 = c[k] - c[k - MOVE_5M], c[k] / c[k - 30] - 1
        hit5 = atr[k] > 0 and abs(mv5) > ATR_K * atr[k] and \
            (not FLOOR_ATR1H or (atr1h[k] == atr1h[k] and abs(mv5) >= FLOOR_ATR1H * atr1h[k]))
        hit30 = abs(mv30) > PCT_30M
        if not (hit5 or hit30) or (last is not None and t - last < COOLDOWN_MS):
            continue
        sch, title = scheduled(t)
        if sch:
            continue
        last = t
        out.append(dict(t=str(bkk(t + 60_000))[:16], t_ms=t + 60_000, px=float(c[k]),
                        dir=int(np.sign(mv5 if hit5 else mv30)), move5=round(float(mv5), 2), atr1=round(float(atr[k]), 2),
                        x_atr=round(float(abs(mv5) / atr[k]), 1) if atr[k] > 0 else None, move30_pct=round(100 * float(mv30), 2),
                        rule="5xATR/5m" if hit5 else "2%/30m", calendar="not covered" if sch is None else "clear"))
    return out


def act(broker, sh):
    """Code risk action on one book. Returns a note."""
    s, p = broker.s, broker.s["pos"]
    s["shock_until"] = sh["t_ms"] + BLOCK_MS
    if not p or p["dir"] == sh["dir"]:
        return "entries blocked 30 min"
    one_r = abs(p["entry"] - p["stop0"])
    px = sh["px"]
    cand = max(p["entry"], px - 0.5 * one_r) if p["dir"] > 0 else min(p["entry"], px + 0.5 * one_r)
    new = max(p["stop"], cand) if p["dir"] > 0 else min(p["stop"], cand)
    if new != p["stop"]:
        broker.log("SHOCK_TIGHTEN", sh["t_ms"], old=round(p["stop"], 2), new=round(new, 2), shock=sh["t"])
        p["stop"] = new
        return f"entries blocked 30 min; stop tightened to {new:.2f}"
    return "entries blocked 30 min; stop already tighter"


def headlines(sh):
    """Live only: the hour before the shock, gold + people + 'breaking', classified in one Venice call."""
    import statements as S
    qs = ["gold price", "breaking gold OR dollar OR Fed"] + [q["q"] for q in json.loads(S.CFG.read_text())["queries"]]
    rows = []
    for q in qs:
        try:
            rows += [(ts, t) for ts, t in S.gnews(q, sh["t_ms"] + 5 * 60_000, 2, 5) if ts >= sh["t_ms"] - 3600_000]
        except Exception:
            continue
    seen, uniq = set(), []
    for ts, t in sorted(rows, reverse=True):
        if t not in seen:
            seen.add(t)
            uniq.append((ts, t))
    uniq = uniq[:12]
    lab = {x["i"]: x for x in S.classify([t for _, t in uniq])}
    return [dict(min_before=round((sh["t_ms"] - ts) / 60000), title=t[:120], **({k: lab[i][k] for k in ("topic", "impact", "confidence")} if i in lab else {}))
            for i, (ts, t) in enumerate(uniq)]


def recent_block(root, asof_ms, hours=24):
    rows = [x for x in jlines(root / "shocks.jsonl") if asof_ms - hours * 3600_000 <= x["t_ms"] <= asof_ms]
    if not rows:
        return "## Shocks (unscheduled moves, last 24 h)\n- none"
    out = ["## Shocks (unscheduled moves, last 24 h; code blocked entries 30 min after each)"]
    for x in rows[-5:]:
        hl = "; ".join(f"{h['title'][:70]} [{h.get('impact', '?')}]" for h in (x.get("headlines") or [])[:3]) or "no headlines"
        out.append(f"- {x['t']} {'UP' if x['dir'] > 0 else 'DOWN'} {x['rule']} (5m {x['move5']:+.1f} USD = {x['x_atr']}x ATR, 30m {x['move30_pct']:+.2f}%): {hl}")
    return "\n".join(out)
