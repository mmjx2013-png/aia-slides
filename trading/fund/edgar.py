"""Polite SEC EDGAR client: generic research User-Agent (never the owner's details), <= 5 requests/s, disk cache.
PAPER research helper."""
import json
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
CACHE = HERE / "data" / "edgar"
UA = {"User-Agent": "aia-research-desk research@example.org", "Accept-Encoding": "identity"}
_last = [0.0]


def get(url, cache_name=None, max_age_h=24):
    f = CACHE / cache_name if cache_name else None
    if f and f.exists() and time.time() - f.stat().st_mtime < max_age_h * 3600:
        return json.loads(f.read_text())
    wait = 0.25 - (time.time() - _last[0])               # 4 requests a second at most
    if wait > 0:
        time.sleep(wait)
    _last[0] = time.time()
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                d = json.load(r)
            break
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            time.sleep(2 * (attempt + 1))
    else:
        return None
    if f:
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(json.dumps(d))
    return d


def tickers():
    d = get("https://www.sec.gov/files/company_tickers.json", "company_tickers.json", 24 * 7)
    out = {}
    for v in d.values():
        out.setdefault(int(v["cik_str"]), v["ticker"])      # first listed = primary share class
    return out


def frame(tag, period, unit="USD"):
    return get(f"https://data.sec.gov/api/xbrl/frames/us-gaap/{tag}/{unit}/{period}.json", f"frame_{tag}_{period}.json", 24 * 7)


def facts(cik):
    return get(f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik:010d}.json", f"facts_{cik}.json", 24)


def submissions(cik):
    return get(f"https://data.sec.gov/submissions/CIK{cik:010d}.json", f"subs_{cik}.json", 12)
