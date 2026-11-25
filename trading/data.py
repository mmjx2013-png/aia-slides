"""Turn the cached Yahoo JSON into aligned price tables (one column per ticker)."""
import json
from pathlib import Path

import numpy as np
import pandas as pd

RAW = Path(__file__).parent / "data" / "raw"


def load_symbol(symbol):
    path = RAW / f"{symbol.replace('^', '_').replace('=', '_')}.json"
    if not path.exists():
        return None, None
    res = (json.loads(path.read_text()).get("chart") or {}).get("result")
    if not res:
        return None, None
    r = res[0]
    ts = r.get("timestamp")
    if not ts:
        return None, None
    off = r["meta"].get("gmtoffset", 25200)  # Bangkok, UTC+7
    idx = pd.to_datetime(np.array(ts) + off, unit="s").normalize()
    q = r["indicators"]["quote"][0]
    df = pd.DataFrame({k: q.get(k) for k in ("open", "high", "low", "close", "volume")},
                      index=idx, dtype="float64")
    adj = r["indicators"].get("adjclose")
    df["adjclose"] = adj[0]["adjclose"] if adj else df["close"]
    df = df[~df.index.duplicated(keep="last")].dropna(subset=["close"])
    df = df[df["close"] > 0]
    # A missing or zero open (rare Yahoo glitch) is replaced by that day's close.
    bad = df["open"].isna() | (df["open"] <= 0)
    df.loc[bad, "open"] = df.loc[bad, "close"]
    divs = pd.Series(dtype="float64")
    ev = (r.get("events") or {}).get("dividends") or {}
    if ev:
        d = pd.Series({pd.to_datetime(v["date"] + off, unit="s").normalize(): v["amount"]
                       for v in ev.values()})
        divs = d.groupby(level=0).sum().sort_index()
    return df, divs


def load_panels(index_symbol, tickers):
    """Return the index frame and dict of panels aligned on the index calendar.

    A day with no index bar is not a trading day. A stock with no bar on a
    trading day has NaN that day (cannot be traded at that day's open).
    """
    idx_df, _ = load_symbol(index_symbol)
    if idx_df is None:
        raise SystemExit(f"No data for {index_symbol}: run fetch.py first")
    cal = idx_df.index
    o, c, a, v, dv, hi, lo, missing = {}, {}, {}, {}, {}, {}, {}, []
    for t in tickers:
        df, divs = load_symbol(t + ".BK")
        if df is None or len(df) < 250:
            missing.append(t)
            continue
        df = df.reindex(cal)
        o[t], c[t], a[t], v[t] = df["open"], df["close"], df["adjclose"], df["volume"]
        hi[t], lo[t] = df["high"], df["low"]
        dv[t] = divs.reindex(cal).fillna(0.0) if len(divs) else pd.Series(0.0, index=cal)
    P = {k: pd.DataFrame(x) for k, x in
         dict(open=o, close=c, adj=a, volume=v, div=dv, high=hi, low=lo).items()}
    return idx_df, P, missing
