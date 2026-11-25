"""Shared bits for the intraday PAXG paper desk: data, cache, indicators, clock.

PAPER ONLY. Data = Binance public market data (data-api.binance.vision), no key.
Politeness: at most one request per minute, enforced here for every process.
"""
import json
import os
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).parent
DATA = Path(os.environ.get("INTRADAY_DATA", HERE / "data"))
CACHE = DATA / "cache"
BKK = timezone(timedelta(hours=7))
SYMBOL = "PAXGUSDT"
URL = "https://data-api.binance.vision/api/v3/klines"
MIN_GAP_S = 60.5          # >= 1 request per symbol per minute, across processes
KEEP_DAYS = 14


def bkk(ts):
    """UTC pandas Timestamp / ms int -> Bangkok datetime."""
    if isinstance(ts, (int, np.integer, float)):
        ts = pd.Timestamp(int(ts), unit="ms", tz="UTC")
    return ts.tz_convert(BKK) if hasattr(ts, "tz_convert") else ts.astimezone(BKK)


def _pace():
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / ".last_request"
    try:
        last = float(f.read_text())
    except Exception:
        last = 0.0
    wait = MIN_GAP_S - (time.time() - last)
    if wait > 0:
        time.sleep(wait)
    f.write_text(str(time.time()))


def fetch(limit=500, start_ms=None):
    """Closed 1m klines as DataFrame indexed by UTC open time. One polite request."""
    _pace()
    q = f"{URL}?symbol={SYMBOL}&interval=1m&limit={limit}"
    if start_ms is not None:
        q += f"&startTime={int(start_ms)}"
    req = urllib.request.Request(q, headers={"User-Agent": "paper-desk/1.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        rows = json.load(r)
    now_ms = time.time() * 1000
    rows = [x for x in rows if x[6] + 1500 < now_ms]          # closed bars only
    return _frame([[x[0], *map(float, x[1:6])] for x in rows])


def _frame(rows):
    df = pd.DataFrame(rows, columns=["t", "o", "h", "l", "c", "v"])
    df["t"] = df["t"].astype("int64")
    df.index = pd.to_datetime(df["t"], unit="ms", utc=True)
    return df


def load_cache():
    f = CACHE / f"{SYMBOL}_1m.csv"
    if not f.exists():
        return _frame([])
    df = pd.read_csv(f)
    return _frame(df[["t", "o", "h", "l", "c", "v"]].values.tolist())


def save_cache(df):
    CACHE.mkdir(parents=True, exist_ok=True)
    df = df[df.index >= df.index.max() - pd.Timedelta(days=KEEP_DAYS)]
    df[["t", "o", "h", "l", "c", "v"]].to_csv(CACHE / f"{SYMBOL}_1m.csv", index=False)


def merge(a, b):
    df = pd.concat([a, b])
    return df[~df.index.duplicated(keep="last")].sort_index()


def update_cache(df, max_requests=20):
    """Fetch everything after the last cached bar (paged, 1 request/min)."""
    for _ in range(max_requests):
        start = int(df["t"].iloc[-1]) + 60_000 if len(df) else None
        new = fetch(limit=1000, start_ms=start) if start else fetch(limit=1000)
        df = merge(df, new)
        if len(new) < 999:
            break
    save_cache(df)
    return df


def backfill(days):
    """Make sure the cache holds `days` days of 1m bars (paged, polite)."""
    df = load_cache()
    want = int((time.time() - days * 86400) * 1000)
    if not len(df) or df["t"].iloc[0] > want:
        start = want
        while True:
            new = fetch(limit=1000, start_ms=start)
            df = merge(df, new)
            if len(new) < 999:
                break
            start = int(new["t"].iloc[-1]) + 60_000
        save_cache(df)
    return update_cache(df)


# ------------------------------------------------------------------ indicators
def resample(df1, minutes):
    r = df1.resample(f"{minutes}min", label="left", closed="left").agg(
        {"o": "first", "h": "max", "l": "min", "c": "last", "v": "sum", "t": "count"})
    r = r[r["t"] == minutes].drop(columns="t")          # complete buckets only
    r["end"] = r.index + pd.Timedelta(minutes=minutes)    # bucket is known at `end`
    return r


def indicators(d):
    d = d.copy()
    pc = d["c"].shift()
    tr = np.maximum(d["h"] - d["l"], np.maximum((d["h"] - pc).abs(), (d["l"] - pc).abs()))
    d["rng"] = d["h"] - d["l"]
    d["atr"] = tr.rolling(14).mean()
    delta = d["c"].diff()
    up = delta.clip(lower=0).rolling(14).mean()
    dn = (-delta.clip(upper=0)).rolling(14).mean()
    d["rsi"] = np.where(dn == 0, np.where(up > 0, 100.0, 50.0), 100 - 100 / (1 + up / dn.replace(0, np.nan)))
    m, s = d["c"].rolling(20).mean(), d["c"].rolling(20).std()
    d["z"] = (d["c"] - m) / s
    d["bbw"] = 4 * s / m
    d["vavg"] = d["v"].rolling(20).mean().shift()
    return d


def frames(df1):
    return indicators(df1), indicators(resample(df1, 5)), indicators(resample(df1, 15))


def jdump(path, obj):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    tmp = Path(str(path) + ".tmp")
    tmp.write_text(json.dumps(obj, indent=1, default=str))
    tmp.replace(path)


def jappend(path, obj):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a") as f:
        f.write(json.dumps(obj, default=str) + "\n")


def jlines(path):
    p = Path(path)
    if not p.exists():
        return []
    return [json.loads(x) for x in p.read_text().splitlines() if x.strip()]


def now_utc():
    return datetime.now(timezone.utc)
