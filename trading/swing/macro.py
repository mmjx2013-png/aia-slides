"""Macro drivers for the swing and news briefs, from FRED (fredgraph.csv; daily, about 1 day lag).
Cached in data/cache/fred_<ID>.csv, fetched at most once a day. PAPER desk helper.
"""
import io
import time
import urllib.request

import numpy as np
import pandas as pd

import env  # noqa: F401
from common import CACHE

SERIES = {"DFII10": "10y real yield %", "DTWEXBGS": "broad USD index", "T10YIE": "10y breakeven %", "DGS10": "10y nominal %"}
URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={id}&cosd={start}"


def series(sid, max_age_h=20):
    f = CACHE / f"fred_{sid}.csv"
    if not f.exists() or time.time() - f.stat().st_mtime > max_age_h * 3600:
        start = (pd.Timestamp.now("UTC") - pd.Timedelta(days=400)).strftime("%Y-%m-%d")
        try:
            # FRED times out on the desk's custom User-Agent; Python's default one is answered
            with urllib.request.urlopen(URL.format(id=sid, start=start), timeout=20) as r:
                txt = r.read().decode()
            pd.read_csv(io.StringIO(txt))            # must parse before it replaces the cache
            f.write_text(txt)
        except Exception:
            if not f.exists():
                return None
    df = pd.read_csv(f)
    df.columns = ["date", "v"]
    df["v"] = pd.to_numeric(df["v"], errors="coerce")
    df = df.dropna()
    return pd.Series(df["v"].values, index=pd.to_datetime(df["date"]).dt.tz_localize("UTC"))


def block(asof_ms, d1):
    """Compact Macro section. d1 = PAXG daily bars (closed as of asof). Only FRED dates < the as-of day."""
    asof = pd.Timestamp(asof_ms, unit="ms", tz="UTC").normalize()
    rows, chg = [], {}
    for sid, name in SERIES.items():
        s = series(sid)
        if s is None or not len(s):
            rows.append(f"- {sid} ({name}): unavailable")
            continue
        s = s[s.index < asof]
        last = s.iloc[-1]

        def back(days):
            x = s[s.index <= s.index[-1] - pd.Timedelta(days=days)]
            return last - x.iloc[-1] if len(x) else np.nan
        unit = "" if "index" in name else " pp"
        rows.append(f"- {sid} ({name}): {last:.2f} on {s.index[-1].date()}; 1w {back(7):+.2f}{unit}, 1m {back(30):+.2f}{unit}")
        chg[sid] = s.diff()
    px = pd.Series(d1["c"].values, index=d1.index.normalize()).pct_change()
    cors = []
    for sid in ("DFII10", "DTWEXBGS"):
        if sid in chg:
            j = pd.concat([px, chg[sid]], axis=1, join="inner").dropna().iloc[-20:]
            cors.append(f"{sid} {j.iloc[:, 0].corr(j.iloc[:, 1]):+.2f} (n={len(j)})" if len(j) >= 10 else f"{sid} n/a")
    return ("## Macro (FRED, daily, about 1 day lag)\n" + "\n".join(rows) +
            f"\n- 20-day correlation of PAXG daily returns with daily changes: {', '.join(cors) or 'n/a'}"
            "\n- Rising real yields and a rising dollar are headwinds for gold; falling ones are tailwinds.")


if __name__ == "__main__":
    import market
    print(block(int(time.time() * 1000), market.frames(int(time.time() * 1000))["1d"]))
