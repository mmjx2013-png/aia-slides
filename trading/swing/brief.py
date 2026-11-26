"""The swing PM brief (<= 3k tokens), built only from bars closed before the wake. PAPER ONLY.

Sections: book and open position; daily/4h/1h trend (EMA20/50/200, ADX, regime, ATR percentile);
key levels (previous UTC day and week high/low, Asian range, VWAP day/week, round numbers);
last 4h and 1h bars; the indicator library (trading/indicators.py) on 4h and 1h; USD High events
in the next 24 h; 3 days of headlines (gold, Fed, USD).
Also returns `facts`: the numbers the code uses to re-check Opus's answer.
"""
import numpy as np
import pandas as pd

import env  # noqa: F401
import indicators as lib
import rules as R
from common import bkk

SKIP = {"turnover_mthb", "rel_ret_3m", "beta_120", "mom_12_1", "ret_12m", "ret_6m", "dd_52w_high", "from_52w_low",
        "williams_r", "stoch_d", "aroon_down", "vol60"}


def _std(d):
    return d.rename(columns={"o": "open", "h": "high", "l": "low", "c": "close", "v": "volume"}).assign(adjclose=lambda x: x["close"])


def _atr(d, n=14):
    pc = d["c"].shift()
    tr = pd.concat([d["h"] - d["l"], (d["h"] - pc).abs(), (d["l"] - pc).abs()], axis=1).max(axis=1)
    return tr.ewm(alpha=1 / n, adjust=False, min_periods=n).mean()


def trend(d):
    c = d["c"]
    e = {n: c.ewm(span=n, adjust=False, min_periods=n).mean().iloc[-1] for n in (20, 50, 200)}
    ind = lib.compute(_std(d))
    atr = _atr(d)
    pct = float((atr.iloc[-250:] <= atr.iloc[-1]).mean() * 100)
    adx, pdi, ndi = (float(ind[k].iloc[-1]) for k in ("adx14", "plus_di", "minus_di"))
    up = e[20] > e[50]
    regime = ("trend " + ("up" if up else "down")) if adx >= 25 else ("weak trend " + ("up" if up else "down")) if adx >= 20 else "range"
    return dict(e=e, adx=adx, pdi=pdi, ndi=ndi, regime=regime, up=up, atr=float(atr.iloc[-1]), pct=pct, ind=ind, c=float(c.iloc[-1]))


def levels(fr, asof_ms):
    m1, d1 = fr["1m"], fr["1d"]
    now = pd.Timestamp(asof_ms, unit="ms", tz="UTC")
    day0 = now.normalize()
    wk0 = day0 - pd.Timedelta(days=day0.weekday())
    prev = d1[d1.index < day0].iloc[-1]
    pw = d1[(d1.index >= wk0 - pd.Timedelta(days=7)) & (d1.index < wk0)]
    tw = m1[m1.index >= wk0]
    today = m1[m1.index >= day0]
    asia = today[today.index < day0 + pd.Timedelta(hours=7)]

    def vwap(x):
        tp = (x["h"] + x["l"] + x["c"]) / 3
        return float((tp * x["v"]).sum() / x["v"].sum()) if len(x) and x["v"].sum() > 0 else float("nan")
    px = float(m1["c"].iloc[-1])
    lv = {"prev day high": prev["h"], "prev day low": prev["l"], "prev day close": prev["c"],
          "prev week high": pw["h"].max() if len(pw) else np.nan, "prev week low": pw["l"].min() if len(pw) else np.nan,
          "week high so far": tw["h"].max() if len(tw) else np.nan, "week low so far": tw["l"].min() if len(tw) else np.nan,
          "Asian range high": asia["h"].max() if len(asia) else np.nan, "Asian range low": asia["l"].min() if len(asia) else np.nan,
          "VWAP today (UTC)": vwap(today), "VWAP this week": vwap(tw),
          "round 50 below": np.floor(px / 50) * 50, "round 50 above": np.floor(px / 50) * 50 + 50}
    return px, {k: round(float(v), 2) for k, v in lv.items() if v == v}


def _bars_txt(d, n):
    return "\n".join(f"{bkk(t).strftime('%a %d %H:%M')} {r.o:.2f} {r.h:.2f} {r.l:.2f} {r.c:.2f}" for t, r in d.iloc[-n:].iterrows())


def position_txt(s, px, asof_ms):
    p = s["pos"]
    if not p:
        return "Open position: none."
    one_r = abs(p["entry"] - p["stop0"]) + R.COST
    u = p["dir"] * p["qty"] * (px - p["entry"])
    held = (asof_ms - p["t"]) / 3600_000
    return (f"Open position: {'LONG' if p['dir'] > 0 else 'SHORT'} {p['qty']:.3f} oz from {p['entry']:.2f} "
            f"({bkk(p['t']).strftime('%a %d %H:%M')} Bangkok, {held:.0f} h ago; max hold 120 h), "
            f"stop {p['stop']:.2f} (initial {p['stop0']:.2f}{', at breakeven' if p['be'] else ''}), target {p['target']:.2f}, "
            f"notional {p['qty'] * px / s['equity']:.2f}x equity. Unrealised {u:+.2f} USD = {p['dir'] * (px - p['entry']) / one_r:+.2f} R.")


def build(asof_ms, fr, state, heads=None, pending=None):
    px, lv = levels(fr, asof_ms)
    tr = {tf: trend(fr[tf]) for tf in ("1d", "4h", "1h")}
    rows = []
    for tf, t in tr.items():
        dist = " / ".join(f"{100 * (px / t['e'][n] - 1):+.2f}%" if t["e"][n] == t["e"][n] else "n/a" for n in (20, 50, 200))
        rows.append(f"| {tf} | {dist} | {t['adx']:.0f} ({t['pdi']:.0f}/{t['ndi']:.0f}) | {t['regime']} | {t['atr']:.2f} | {t['pct']:.0f} |")
    cols = [c for c in tr["4h"]["ind"].columns if c not in SKIP]
    i4, i1 = tr["4h"]["ind"].iloc[-1], tr["1h"]["ind"].iloc[-1]
    s = state
    dd = 100 * (1 - s["equity"] / s["peak"]) if s["peak"] else 0
    up = R.upcoming(asof_ms, 24)
    cal = ("- Calendar unavailable: entries are blocked (fail safe)." if up is None else
           "- None in the next 24 h." if not up else
           "\n".join(f"- {bkk(t).strftime('%a %H:%M')} Bangkok ({(t - asof_ms) / 3600_000:.1f} h): {title}" for t, title in up))
    block = R.calendar_block(asof_ms)
    trend4 = "up" if tr["4h"]["up"] else "down"
    halts = ", ".join(x for x in (s["killed"] and "KILL SWITCH", s["halted_day"] == R.day_key(asof_ms) and "daily halt",
                                  s["halted_week"] == R.week_key(asof_ms) and "weekly halt") if x) or "none"
    txt = f"""# PAPER swing desk (PAXG/USDT, about 1:1 with spot gold), wake {bkk(asof_ms).strftime('%a %Y-%m-%d %H:%M')} Bangkok
Price {px:.2f} (last closed 1m bar). Your decision executes at the next 1m open.

## Book
Equity {s['equity']:.2f} USD (peak {s['peak']:.2f}, drawdown {dd:.1f}%; kill switch at {100 * R.MAIN['kill']:.0f}%; risk {100 * R.MAIN['risk']:.0f}% per trade). Halts: {halts}.
{position_txt(s, px, asof_ms)}{chr(10) + 'Pending, not yet executed: ' + pending['action'] if pending else ''}

## Trend (close vs EMA20 / 50 / 200; ADX14 (+DI/-DI); ATR14 in USD; ATR percentile of the last 250 bars)
| TF | vs EMA20 / 50 / 200 | ADX | Regime | ATR | ATR pct |
|---|---|---|---|---|---|
{chr(10).join(rows)}
Code's 4h trend for the entry rule (EMA20 vs EMA50): {trend4}.

## Key levels (UTC days; weeks start Monday 00:00 UTC)
{'; '.join(f'{k} {v:.2f}' for k, v in lv.items())}

## Last 6 x 4h bars (Bangkok open time, O H L C)
{_bars_txt(fr['4h'], 6)}
## Last 6 x 1h bars
{_bars_txt(fr['1h'], 6)}

## Indicator library (windows in bars of that timeframe)
indicator,4h,1h
{chr(10).join(f'{c},{i4[c]:.3g},{i1[c]:.3g}' for c in cols)}

## USD High-impact events, next 24 h
{cal}
Entry now: {'BLOCKED - ' + block if block else 'allowed by the calendar'}.

## Headlines, last 3 days (Google News; titles only)
{heads or '(none: not fetched in this replay)'}
"""
    facts = dict(px=px, atr1h=tr["1h"]["atr"], atr4h=tr["4h"]["atr"], atr1d=tr["1d"]["atr"], trend4=trend4,
                 levels=lv, asof_ms=int(asof_ms))
    return txt, facts
