"""Bulk 1m PAXGUSDT history for the setup search (code only, 0 tokens).
data-api.binance.vision, 1000 bars per request, at most 1 request per second (boss-approved for this
one-off download; the live watcher keeps its 1/min pace). Cached by month in data/history/*.csv.gz.
  python3 fetch_history.py --months 9
"""
import argparse
import json
import sys
import time
import urllib.request
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "data" / "history"
URL = "https://data-api.binance.vision/api/v3/klines?symbol=PAXGUSDT&interval=1m&limit=1000&startTime={}"


def get(start):
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(URL.format(start), headers={"User-Agent": "paper-desk/1.0"}), timeout=30) as r:
                return json.load(r)
        except Exception as e:
            print(f"retry {attempt}: {e}", file=sys.stderr)
            time.sleep(5 * (attempt + 1))
    raise SystemExit("history fetch failed")


def main(months):
    OUT.mkdir(parents=True, exist_ok=True)
    end = pd.Timestamp.now(tz="UTC").floor("D")
    start = (end - pd.DateOffset(months=months)).normalize()
    for m0 in pd.date_range(start.to_period("M").to_timestamp().tz_localize("UTC"), end, freq="MS"):
        m1 = m0 + pd.DateOffset(months=1)
        f = OUT / f"PAXGUSDT_1m_{m0:%Y%m}.csv.gz"
        if f.exists() and m1 <= end:
            continue
        rows, t = [], int(max(m0, start).value // 10**6)
        stop = int(min(m1, end).value // 10**6)
        while t < stop:
            last = time.time()
            batch = [x for x in get(t) if x[0] < stop]
            if not batch:
                break
            rows += [[x[0], *map(float, x[1:6])] for x in batch]
            t = batch[-1][0] + 60_000
            time.sleep(max(0, 1.05 - (time.time() - last)))
        pd.DataFrame(rows, columns=["t", "o", "h", "l", "c", "v"]).to_csv(f, index=False)
        print(f"{f.name}: {len(rows)} bars", flush=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--months", type=int, default=9)
    main(ap.parse_args().months)
