"""Daily prices from the boss's Yahoo pack (claude/fervent-ramanujan-qp1d26 @de3ddcf,
trading-data/fund-prices-2026-11-27.tgz -> data/yahoo-fund/). We never call Yahoo ourselves.
File names: '.' and '=' become '_' (BRK.B -> BRK_B.json, THB=X -> THB_X.json)."""
import json
import subprocess
import tarfile
from functools import lru_cache
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
DIR = HERE / "data" / "yahoo-fund"
PACK = ("de3ddcf", "trading-data/fund-prices-2026-11-27.tgz")


def unpack():
    if DIR.exists():
        return
    (HERE / "data").mkdir(exist_ok=True)
    tgz = HERE / "data" / "prices.tgz"
    subprocess.run(["git", "fetch", "-q", "origin", "claude/fervent-ramanujan-qp1d26"], cwd=HERE, check=True)
    with open(tgz, "wb") as f:
        subprocess.run(["git", "show", f"{PACK[0]}:{PACK[1]}"], cwd=HERE, stdout=f, check=True)
    with tarfile.open(tgz) as t:
        t.extractall(HERE / "data", filter="data")


@lru_cache(maxsize=None)
def load(ticker):
    """DataFrame close (raw) and adj (total return), indexed by date; None if missing."""
    unpack()
    names = {ticker, ticker.replace(".", "_").replace("=", "_"), ticker.replace(".", "-"), ticker.replace("-", "_")}
    f = next((DIR / f"{n}.json" for n in names if (DIR / f"{n}.json").exists()), None)
    if f is None:
        return None
    r = json.loads(f.read_text())["chart"]["result"][0]
    q = r["indicators"]["quote"][0]
    adj = r["indicators"].get("adjclose", [{}])[0].get("adjclose", q["close"])
    df = pd.DataFrame({"close": q["close"], "adj": adj}, index=pd.to_datetime(r["timestamp"], unit="s").normalize()).dropna()
    return df[~df.index.duplicated(keep="last")]


def price_at(ticker, date, col="close"):
    """Last close on or before `date` (raw close: matches the share counts of that time)."""
    df = load(ticker)
    if df is None:
        return None
    x = df[df.index <= pd.Timestamp(date)]
    return float(x[col].iloc[-1]) if len(x) else None
