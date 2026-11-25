"""Daily data step: ONE polite attempt per symbol at the Yahoo chart API.

  python3 fetch_yahoo.py            # writes ../trading-data/latest/*.json
Exit code 0 = all symbols fetched; 2 = at least one failed (e.g. HTTP 429):
then ask the boss session for the data (see README, Phase 2 runbook). No retries,
no other hosts, no changing user agents.
"""
import sys, time, urllib.parse, urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "trading-data" / "latest"
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
# file name -> (symbol, range, interval)
SYMBOLS = {
    "GC_F_1h.json": ("GC=F", "60d", "1h"),
    "GC_F_daily.json": ("GC=F", "1y", "1d"),
    "DXY_daily.json": ("DX-Y.NYB", "1y", "1d"),
    "TNX_daily.json": ("^TNX", "1y", "1d"),
    "USDTHB_daily.json": ("THB=X", "1y", "1d"),
    "SI_F_daily.json": ("SI=F", "1y", "1d"),
    "SP500_daily.json": ("^GSPC", "1y", "1d"),
    "GLD_daily.json": ("GLD", "1y", "1d"),
}

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    failed = []
    for name, (sym, rng, iv) in SYMBOLS.items():
        url = (f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(sym)}"
               f"?range={rng}&interval={iv}")
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}),
                                        timeout=30) as r:
                (OUT / name).write_bytes(r.read())
            print(f"{name}: ok")
        except Exception as e:  # noqa: BLE001
            failed.append(f"{sym} range={rng} interval={iv}")
            print(f"{name}: FAILED ({e})")
        time.sleep(2)
    if failed:
        print("NEED DATA:", "; ".join(failed))
        sys.exit(2)
