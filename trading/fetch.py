"""Download daily bars from the Yahoo Finance chart API and cache the raw JSON.

Only one host is used: query1.finance.yahoo.com. Each file is downloaded once
and kept in data/raw/, so re-running the backtest does not hit the API again.
"""
import json, sys, time, urllib.parse, urllib.request
from pathlib import Path

RAW = Path(__file__).parent / "data" / "raw"
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
START = 1388534400  # 2014-01-01 UTC: two years of warm-up before 2016


def url_for(symbol, period1=START, period2=None):
    period2 = period2 or int(time.time())
    return ("https://query1.finance.yahoo.com/v8/finance/chart/"
            f"{urllib.parse.quote(symbol)}?period1={period1}&period2={period2}"
            "&interval=1d&events=div%7Csplit")


def path_for(symbol):
    return RAW / f"{symbol.replace('^', '_').replace('=', '_')}.json"


def fetch(symbol, refresh=False, tries=6, wait=30, max_age=None):
    """Return the parsed JSON for one symbol, from cache when possible.
    refresh=True re-downloads unless the cached file is younger than max_age s."""
    path = path_for(symbol)
    fresh = path.exists() and max_age and time.time() - path.stat().st_mtime < max_age
    if path.exists() and (not refresh or fresh):
        return json.loads(path.read_text())
    for i in range(tries):
        req = urllib.request.Request(url_for(symbol), headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                body = r.read()
            data = json.loads(body)
            RAW.mkdir(parents=True, exist_ok=True)
            path.write_bytes(body)
            return data
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None          # unknown ticker: report, do not guess
            print(f"  {symbol}: HTTP {e.code}, waiting {wait * (i + 1)} s", flush=True)
            time.sleep(wait * (i + 1))   # polite linear back-off
    raise RuntimeError(f"{symbol}: gave up after {tries} tries")


if __name__ == "__main__":
    from universe import TICKERS, INDEX
    syms = [INDEX, "THB=X"] + [t + ".BK" for t in TICKERS]
    for s in syms:
        cached = path_for(s).exists()
        d = fetch(s, refresh="--refresh" in sys.argv)
        ok = d and d.get("chart", {}).get("result")
        print(f"{s:12s} {'cached' if cached else 'fetched'} {'OK' if ok else 'MISSING'}", flush=True)
        if not cached:
            time.sleep(2)            # at most one request every 2 s
