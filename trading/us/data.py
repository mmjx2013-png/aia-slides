"""US daily data from the boss's Yahoo chart dump (branch claude/fervent-ramanujan-qp1d26, commit 3fc1638,
trading-data/us-stocks-2026-11-25.tgz). We never fetch Yahoo ourselves. PAPER ONLY.
  python3 data.py     unpack into trading/us/data/yahoo-us/ (gitignored)
Prices are dividend- and split-adjusted: open/high/low are scaled by adjclose/close, so a fill at the adjusted
open plus holding to the adjusted close is a total-return path (dividends reinvested).
"""
import json
import subprocess
import tarfile
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
DIR = HERE / "data" / "yahoo-us"
SRC = ("3fc1638", "trading-data/us-stocks-2026-11-25.tgz")


def unpack():
    if DIR.exists():
        return
    (HERE / "data").mkdir(exist_ok=True)
    tgz = HERE / "data" / "us.tgz"
    subprocess.run(["git", "fetch", "-q", "origin", "claude/fervent-ramanujan-qp1d26"], cwd=HERE, check=True)
    with open(tgz, "wb") as f:
        subprocess.run(["git", "show", f"{SRC[0]}:{SRC[1]}"], cwd=HERE, stdout=f, check=True)
    with tarfile.open(tgz) as t:
        t.extractall(HERE / "data", filter="data")


def load(sym):
    unpack()
    r = json.loads((DIR / f"{sym}.json").read_text())["chart"]["result"][0]
    q = r["indicators"]["quote"][0]
    df = pd.DataFrame({k: q[k] for k in ("open", "high", "low", "close", "volume")},
                      index=pd.to_datetime(r["timestamp"], unit="s").normalize())
    df["adj"] = r["indicators"]["adjclose"][0]["adjclose"] if "adjclose" in r["indicators"] else df["close"]
    df = df.dropna(subset=["open", "close", "adj"])
    df = df[~df.index.duplicated(keep="last")]
    f = df["adj"] / df["close"]
    return pd.DataFrame(dict(o=df["open"] * f, h=df["high"] * f, l=df["low"] * f, c=df["adj"], raw_c=df["close"]))


def panel(syms):
    d = {s: load(s) for s in syms}
    idx = d[syms[0]].index
    for s in syms[1:]:
        idx = idx.union(d[s].index)
    return {k: pd.DataFrame({s: d[s][k].reindex(idx) for s in syms}) for k in ("o", "c")}


ETFS = ["SPY", "QQQ", "IWM", "DIA"]
SECTORS = ["XLB", "XLC", "XLE", "XLF", "XLI", "XLK", "XLP", "XLRE", "XLU", "XLV", "XLY"]
BONDS = ["TLT", "IEF", "HYG"]
LARGE = "AAPL MSFT NVDA AMZN GOOGL META TSLA AVGO BRK_B JPM LLY V UNH XOM MA COST HD PG JNJ NFLX AMD ORCL CRM ADBE WMT KO PEP BAC CVX MRK ABBV TMO INTC CSCO".split()

if __name__ == "__main__":
    unpack()
    s = load("SPY")
    print(len(s), s.index[0].date(), s.index[-1].date(), s.tail(2))
