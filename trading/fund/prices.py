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


LATEST = HERE / "data" / "latest"
BRANCH = "origin/claude/fervent-ramanujan-qp1d26"


def refresh_latest():
    """Unpack the newest trading-data/fund-latest.tgz on the boss's data branch (rebuilt every Friday; newest commit wins).
    Returns the commit id used."""
    subprocess.run(["git", "fetch", "-q", "origin", "claude/fervent-ramanujan-qp1d26"], cwd=HERE, check=True)
    sha = subprocess.run(["git", "log", "-1", "--format=%h", BRANCH, "--", ":/trading-data/fund-latest.tgz"], cwd=HERE,
                         capture_output=True, text=True, check=True).stdout.strip()
    stamp = LATEST / ".sha"
    if sha and not (stamp.exists() and stamp.read_text() == sha):
        import shutil
        shutil.rmtree(LATEST, ignore_errors=True)
        LATEST.mkdir(parents=True)
        tgz = LATEST / "latest.tgz"
        with open(tgz, "wb") as f:
            subprocess.run(["git", "show", f"{sha}:trading-data/fund-latest.tgz"], cwd=HERE, stdout=f, check=True)
        with tarfile.open(tgz) as t:
            t.extractall(LATEST, filter="data")
        stamp.write_text(sha)
        load.cache_clear()
    return sha


def _read(f):
    r = json.loads(f.read_text())["chart"]["result"][0]
    q = r["indicators"]["quote"][0]
    adj = r["indicators"].get("adjclose", [{}])[0].get("adjclose", q["close"])
    q["open"] = q.get("open", q["close"])
    df = pd.DataFrame({"open": q["open"], "close": q["close"], "adj": adj},
                      index=pd.to_datetime(r["timestamp"], unit="s").normalize()).dropna(subset=["close"])
    return df[~df.index.duplicated(keep="last")]


def _find(d, ticker):
    names = {ticker, ticker.replace(".", "_").replace("=", "_"), ticker.replace(".", "-"), ticker.replace("-", "_")}
    for sub in [d, *[p for p in d.glob("*") if p.is_dir()]]:
        for n in names:
            if (sub / f"{n}.json").exists():
                return sub / f"{n}.json"
    return None


@lru_cache(maxsize=None)
def load(ticker):
    """DataFrame open/close (raw) and adj (total return), indexed by date, from the 5y pack plus the newest weekly pack
    (the newer data wins where they overlap); None if missing."""
    unpack()
    parts = [x for x in (_find(DIR, ticker), _find(LATEST, ticker) if LATEST.exists() else None) if x]
    if not parts:
        return None
    df = pd.concat([_read(p) for p in parts])
    df = df[~df.index.duplicated(keep="last")].sort_index()
    return df          # note: 'adj' is re-based per pack; use load_latest() for return series that cross the join


@lru_cache(maxsize=None)
def load_latest(ticker):
    """Only the newest weekly pack (consistent total-return 'adj'); falls back to load()."""
    f = _find(LATEST, ticker) if LATEST.exists() else None
    return _read(f) if f else load(ticker)


def price_at(ticker, date, col="close"):
    """Last close on or before `date` (raw close: matches the share counts of that time)."""
    df = load(ticker)
    if df is None:
        return None
    x = df[df.index <= pd.Timestamp(date)]
    return float(x[col].iloc[-1]) if len(x) else None
