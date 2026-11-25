"""Market context for the Sonnet/Opus brief (compact, ~2-3k tokens). Uses only bars that
closed before the setup. PAPER desk.

- multi-timeframe trend: EMA20/50/200 distance, ADX14, regime label, ATR percentile (15m, 1h, 4h)
- key levels: previous UTC day H/L/C, Asian range (00-07 UTC), London (07:00 UTC) and NY (13:30 UTC)
  opens, session VWAP from 00:00 UTC, nearest $10/$50 round numbers
- the 45-indicator library from trading/indicators.py on 15m and 1h
- calendar: next USD High-impact event
Limitation: no intraday DXY / US yields on the allowed hosts.
"""
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import indicators as lib                                     # noqa: E402  (trading/indicators.py)

import calendar_guard                                        # noqa: E402
from common import CACHE, bkk, fetch, load_cache, merge, resample, _frame   # noqa: E402

H1 = CACHE / "PAXGUSDT_1h.csv"
SKIP = {"turnover_mthb", "rel_ret_3m", "beta_120", "dd_52w_high", "from_52w_low", "mom_12_1", "ret_12m", "ret_6m"}


def refresh_h1(max_age_h=12):
    """One request (1h klines, 1000 bars ~ 6 weeks) at most every 12 h."""
    if H1.exists() and time.time() - H1.stat().st_mtime < max_age_h * 3600:
        return
    import urllib.request, json
    from common import URL, SYMBOL, _pace
    _pace()
    with urllib.request.urlopen(f"{URL}?symbol={SYMBOL}&interval=1h&limit=1000", timeout=20) as r:
        rows = json.load(r)
    now = time.time() * 1000
    df = _frame([[x[0], *map(float, x[1:6])] for x in rows if x[6] + 1500 < now])
    df[["t", "o", "h", "l", "c", "v"]].to_csv(H1, index=False)


def _h1(df1):
    h = _frame(pd.read_csv(H1)[["t", "o", "h", "l", "c", "v"]].values.tolist()) if H1.exists() else df1.iloc[:0]
    r = resample(df1, 60).drop(columns="end")
    r["t"] = (r.index.view("int64") // 10**6)
    h = merge(h[["t", "o", "h", "l", "c", "v"]], r[["t", "o", "h", "l", "c", "v"]])
    return h


def _std(d):
    return d.rename(columns={"o": "open", "h": "high", "l": "low", "c": "close", "v": "volume"}).assign(adjclose=lambda x: x["close"])


def _trend(d, name):
    c = d["close"]
    e = {n: c.ewm(span=n, adjust=False, min_periods=n).mean() for n in (20, 50, 200)}
    ind = lib.compute(d)
    tr = pd.concat([d["high"] - d["low"], (d["high"] - c.shift()).abs(), (d["low"] - c.shift()).abs()], axis=1).max(axis=1)
    atr = tr.rolling(14).mean()
    pct = (atr.iloc[-100:] <= atr.iloc[-1]).mean() * 100 if len(atr.dropna()) > 20 else np.nan
    adx = ind["adx14"].iloc[-1]
    up = e[20].iloc[-1] > e[50].iloc[-1]
    regime = ("trend " + ("up" if up else "down")) if adx > 25 else "range"
    dist = " ".join(f"EMA{n} {100 * (c.iloc[-1] / e[n].iloc[-1] - 1):+.2f}%" if e[n].iloc[-1] == e[n].iloc[-1] else f"EMA{n} n/a"
                    for n in (20, 50, 200))
    return f"| {name} | {dist} | {adx:.0f} | {regime} | {pct:.0f} |", ind


def context(close_ms, df1=None, replay=False):
    """replay=True: df1 is supplied history (no live caches); the calendar is not replayed."""
    df1 = load_cache() if df1 is None else df1
    df1 = df1[df1["t"] < close_ms]
    m15 = resample(df1, 15).drop(columns="end")
    if replay:
        h1 = resample(df1, 60).drop(columns="end")
        h1["t"] = h1.index.view("int64") // 10**6 if h1.index.dtype.str.endswith("ns]") else h1.index.astype("datetime64[ms, UTC]").view("int64")
    else:
        h1 = _h1(df1)
    h1 = h1[h1["t"] + 3_600_000 <= close_ms]
    h4 = resample(h1.assign(), 240) if False else None
    h4 = h1.resample("4h", label="left", closed="left").agg({"o": "first", "h": "max", "l": "min", "c": "last", "v": "sum", "t": "count"})
    h4 = h4[h4["t"] == 4].drop(columns="t")
    lines = ["## Multi-timeframe trend (close vs EMA, ADX14, regime, ATR14 percentile of last 100 bars)",
             "| TF | Close vs EMA20 / 50 / 200 | ADX | Regime | ATR pct |", "|---|---|---|---|---|"]
    inds = {}
    for name, d in (("15m", m15), ("1h", h1), ("4h", h4)):
        row, ind = _trend(_std(d), name)
        lines.append(row)
        inds[name] = ind
    # key levels
    now = pd.Timestamp(close_ms, unit="ms", tz="UTC")
    day0 = now.normalize()
    prev = df1[(df1.index >= day0 - pd.Timedelta(days=1)) & (df1.index < day0)]
    today = df1[df1.index >= day0]
    asia = today[today.index < day0 + pd.Timedelta(hours=7)]
    px = df1["c"].iloc[-1]
    def at(h, m=0):
        t = day0 + pd.Timedelta(hours=h, minutes=m)
        return f"{df1.loc[t, 'o']:.2f}" if t in df1.index else "not yet"
    tp = (today["h"] + today["l"] + today["c"]) / 3
    vwap = (tp * today["v"]).sum() / today["v"].sum() if today["v"].sum() > 0 else float("nan")
    r10, r50 = np.floor(px / 10) * 10, np.floor(px / 50) * 50
    lines += ["", f"## Key levels (price {px:.2f}; UTC sessions)",
              f"- Previous UTC day: high {prev['h'].max():.2f}, low {prev['l'].min():.2f}, close {prev['c'].iloc[-1]:.2f}" if len(prev) else "- Previous day: n/a",
              f"- Asian range 00-07 UTC: {asia['h'].max():.2f} - {asia['l'].min():.2f}" if len(asia) else "- Asian range: n/a",
              f"- London open 07:00 UTC: {at(7)}; NY open 13:30 UTC: {at(13, 30)}; session VWAP since 00:00 UTC: {vwap:.2f}",
              f"- Round numbers: {r10:.0f} / {r10 + 10:.0f} ($10), {r50:.0f} / {r50 + 50:.0f} ($50)"]
    # indicator library
    cols = [c for c in inds["15m"].columns if c not in SKIP]
    t15, t1 = inds["15m"].iloc[-1], inds["1h"].iloc[-1]
    lines += ["", "## Indicator library (trading/indicators.py; windows are in bars of that timeframe)",
              "indicator,15m,1h", *[f"{c},{t15[c]:.3g},{t1[c]:.3g}" for c in cols]]
    nh = None if replay else calendar_guard.next_high(close_ms)
    lines += ["", "## Calendar", ("- Not available in this replay (no historical calendar on the allowed hosts)." if replay else
                                  f"- Next USD High-impact event: {nh[0]} in {nh[1]} min" if nh else "- No USD High-impact event left this week"),
              "- Limitation: no intraday DXY or US yields available (allowed hosts only)."]
    return "\n".join(lines)


if __name__ == "__main__":
    t = int(sys.argv[1]) if len(sys.argv) > 1 else int(time.time() * 1000)
    print(context(t))
