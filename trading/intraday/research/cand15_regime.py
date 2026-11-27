"""cand15 by month and gold regime (code only, PAPER). Live rule B, typical swap.  python3 cand15_regime.py
Regime per month: PAXG monthly return (trend), the month's average daily ATR as % of price (volatility), and the
share of days with price below its 50-day average (downtrend share).
Pre-registered regime switches (decided BEFORE looking at the monthly table, using only data known at entry):
  vol_high  - trade only when the trailing 20-day average daily range % is above its trailing 120-day median;
  trend_down- trade only when the close is below its 50-day average.
Judged as in the selectivity test: switch rule chosen on Feb-Jul, kept only if it beats all trades on Aug-Nov
(>= 30 trades, bootstrap 90% band of the avg-R lead above 0).
"""
import numpy as np
import pandas as pd

import cand15_overnight as C
import confidence_tests as T
from common import indicators, resample

rng = np.random.default_rng(21)


def main():
    m1 = C.history()
    m15 = indicators(resample(m1, 15))
    tr, _ = C.sim(m1, m15, "B", C.SWAPS["typical retail (long -0.60, short +0.20 per oz per night)"])
    tr = tr.copy()
    tr["r"] = tr["pnl"] / (C.RISK * C.CAP0)
    tr["date"] = pd.to_datetime(tr["entry_t"], unit="ms", utc=True).dt.tz_convert("Asia/Bangkok")
    d1 = resample(m1, 1440)
    d1.index = pd.DatetimeIndex(d1.index).tz_convert("Asia/Bangkok")
    rngp = (d1["h"] - d1["l"]) / d1["c"]
    sma50 = d1["c"].rolling(50, min_periods=20).mean()
    # known at entry: yesterday's values
    vol20 = rngp.rolling(20).mean().shift(1)
    vol_med = vol20.rolling(120, min_periods=40).median()
    below50 = (d1["c"] < sma50).shift(1)
    day = tr["date"].dt.strftime("%Y-%m-%d")
    key = d1.index.strftime("%Y-%m-%d")
    lookup = lambda s: pd.Series(s.values, index=key).groupby(level=0).last().reindex(day.values).values
    tr["vol_high"] = lookup(vol20 > vol_med)
    tr["trend_down"] = lookup(below50)
    mon = tr.groupby(tr["date"].dt.strftime("%Y-%m"))
    dm = d1.groupby(d1.index.strftime("%Y-%m"))
    L = ["# cand15 (rule B) by month and gold regime", "", "| Month | Trades | Win | Avg R | P&L (10k start) | PAXG return | Avg daily range % | Days below SMA50 |",
         "|---|---|---|---|---|---|---|---|"]
    for m, g in mon:
        x = dm.get_group(m)
        L.append(f"| {m} | {len(g)} | {100 * (g.pnl > 0).mean():.0f}% | {g.r.mean():+.2f} | {g.pnl.sum():+,.0f} | {100 * (x.c.iloc[-1] / x.o.iloc[0] - 1):+.1f}% | "
                 f"{100 * rngp.loc[x.index].mean():.2f}% | {100 * (x.c < sma50.loc[x.index]).mean():.0f}% |")
    months = pd.DataFrame([dict(m=m, r=g.r.mean(), ret=dm.get_group(m).c.iloc[-1] / dm.get_group(m).o.iloc[0] - 1,
                                vol=rngp.loc[dm.get_group(m).index].mean()) for m, g in mon])
    L += ["", f"Correlation across months of cand15 avg R with: PAXG monthly return {months.r.corr(months.ret):+.2f}, "
              f"average daily range {months.r.corr(months.vol):+.2f} (n = {len(months)} months, so weak evidence either way)."]
    is_, oos = tr[tr.date < "2026-08-01"], tr[tr.date >= "2026-08-01"]
    L += ["", "## Pre-registered regime switches (fit Feb-Jul, judged Aug-Nov)", "| Switch | IS trades | IS avg R | OOS trades | OOS avg R | OOS all-trades avg R |", "|---|---|---|---|---|---|"]
    best = None
    for sw in ("vol_high", "trend_down"):
        a, b = is_[is_[sw] == True], oos[oos[sw] == True]
        L.append(f"| {sw} | {len(a)} | {a.r.mean():+.3f} | {len(b)} | {b.r.mean():+.3f} | {oos.r.mean():+.3f} |")
        if len(a) >= 30 and (best is None or a.r.mean() > best[1]):
            best = (sw, a.r.mean())
    if best:
        sub, allr = oos[oos[best[0]] == True].r.values, oos.r.values
        diffs = [rng.choice(sub, len(sub)).mean() - rng.choice(allr, len(allr)).mean() for _ in range(5000)] if len(sub) else [np.nan]
        lo, hi = np.nanpercentile(diffs, [5, 95])
        ok = len(sub) >= 30 and lo > 0
        L.append(f"\nChosen in-sample: **{best[0]}**; out of sample {len(sub)} trades, lead {sub.mean() - allr.mean():+.3f} R, band [{lo:+.3f}, {hi:+.3f}] -> "
                 + ("**PASSES**: switch cand15 on only in this regime." if ok else "**does not pass**: keep cand15 always on."))
    open(C.HERE.parent / "reports" / "cand15_regime.md", "w").write("\n".join(L) + "\n")
    print("\n".join(L))


if __name__ == "__main__":
    main()
