"""Market data for the swing desk: 1m cache (14 days, from the intraday code) plus 1h/4h/1d
history. The 1h/4h/1d series come from one seed request each (limit 1000, refreshed only when
the 1m cache no longer reaches back to the seed's end), extended with complete buckets
resampled from the 1m bars. Everything is cut AS OF a time, so a replay sees no future data.
PAPER ONLY. Binance public data (data-api.binance.vision), at most 1 request per minute.
"""
import json
import time
import urllib.request

import pandas as pd

import env  # noqa: F401
from common import CACHE, SYMBOL, URL, _frame, _pace, load_cache, update_cache, backfill

TF = {"1h": 60, "4h": 240, "1d": 1440}


def _seed_file(tf):
    return CACHE / f"{SYMBOL}_{tf}_seed.csv"


def seed(tf, force=False):
    f = _seed_file(tf)
    if f.exists() and not force:
        return
    _pace()
    req = urllib.request.Request(f"{URL}?symbol={SYMBOL}&interval={tf}&limit=1000", headers={"User-Agent": "paper-desk/1.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        rows = json.load(r)
    now = time.time() * 1000
    df = _frame([[x[0], *map(float, x[1:6])] for x in rows if x[6] + 1500 < now])
    df[["t", "o", "h", "l", "c", "v"]].to_csv(f, index=False)


def sync(days=6):
    """Bring the 1m cache up to the last closed bar (paged, 1 request/min). Re-seed the higher
    timeframes if the 1m cache no longer joins up with them."""
    m1 = backfill(days) if not len(load_cache()) else update_cache(load_cache())
    for tf in TF:
        f = _seed_file(tf)
        if not f.exists() or pd.read_csv(f, usecols=["t"])["t"].iloc[-1] + TF[tf] * 60_000 < m1["t"].iloc[0]:
            seed(tf, force=True)
    return m1


def _bars(m1, minutes):
    r = m1.resample(f"{minutes}min", label="left", closed="left", origin="epoch").agg(
        {"o": "first", "h": "max", "l": "min", "c": "last", "v": "sum", "t": "count"})
    r = r[r["t"] == minutes]
    r["t"] = (r.index - pd.Timestamp(0, tz="UTC")) // pd.Timedelta(milliseconds=1)
    return r


def frames(asof_ms, m1=None):
    """Closed bars known at asof_ms: dict 1m/1h/4h/1d, each indexed by UTC open time with t,o,h,l,c,v."""
    m1 = load_cache() if m1 is None else m1
    m1 = m1[m1["t"] + 60_000 <= asof_ms]
    out = {"1m": m1}
    for tf, mins in TF.items():
        f = _seed_file(tf)
        s = _frame(pd.read_csv(f)[["t", "o", "h", "l", "c", "v"]].values.tolist()) if f.exists() else m1.iloc[:0]
        r = _bars(m1, mins)
        df = pd.concat([s, r[["t", "o", "h", "l", "c", "v"]]])
        df = df[~df.index.duplicated(keep="last")].sort_index()
        out[tf] = df[df["t"] + mins * 60_000 <= asof_ms]
    return out
