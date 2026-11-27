"""Two code-only tests for "if not confident, don't trade" (PAPER research, no LLM calls).  python3 confidence_tests.py

1. Opus calibration: every DECISION with a best_idea (holds included) in the swing desk's live journal, plus the earlier
   intraday AI replay (stated p for 32 setups), resolved on 1m bars: target or stop first after the decision, "neither"
   after 72 h. Table by p bucket: n, stated p, realised hit rate, average R if it had been taken (costs 0.35/oz per side).
2. cand15 selectivity, PRE-REGISTERED filters (single filters, not combinations), live rule B, typical swap:
     trend  - 1h EMA20 slope and price side agree with the faded trade, or not
     adx    - ADX14(15m) at entry: < 20, 20-30, > 30
     session- Bangkok entry hour: 14-20, 20-24, 00-03:30
     atr    - ATR14(15m) above or below its 20-day median
   Fit (choose the subset with the best average R, >= 30 trades) on Feb-Jul 2026; judge on Aug-Nov 2026. A subset counts
   only with >= 30 out-of-sample trades and an out-of-sample avg-R lead over all trades whose bootstrap 90% band is above 0.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import cand15_overnight as C                                   # noqa: E402
from common import indicators, resample                        # noqa: E402

COST = 0.35
SWING = HERE.parent.parent / "swing" / "data" / "books" / "ai" / "journal.jsonl"
REPLAY = HERE.parent / "reports" / "ai_replay_setups.json"
rng = np.random.default_rng(11)


# ------------------------------------------------------------------ 1. calibration
def resolve(m1, t_ms, d, entry, stop, tgt, hours=72):
    x = m1[(m1["t"] > t_ms) & (m1["t"] <= t_ms + hours * 3_600_000)]
    risk = abs(entry - stop) + 2 * COST
    for h, l, c in zip(x["h"].values, x["l"].values, x["c"].values):
        hs, ht = (l <= stop, h >= tgt) if d > 0 else (h >= stop, l <= tgt)
        if hs:
            return "stop", -1.0
        if ht:
            return "target", (abs(tgt - entry) - 2 * COST) / risk
    if not len(x):
        return "open", np.nan
    return "neither", d * (x["c"].iloc[-1] - entry - d * 2 * COST) / risk


def calibration(m1):
    rows = []
    for j in (json.loads(l) for l in SWING.read_text().splitlines() if l.strip()) if SWING.exists() else []:
        bi = (j.get("answer") or {}).get("best_idea") if j.get("kind") == "DECISION" else None
        if not bi:
            continue
        try:
            d = 1 if str(bi["dir"]).lower().startswith("l") else -1
            p, stop, tgt = float(bi["p_target"]), float(bi["stop"]), float(bi["target"])
        except (KeyError, TypeError, ValueError):
            continue
        out, r = resolve(m1, j["t_ms"], d, j["px"], stop, tgt)
        rows.append(dict(src="swing live", t=j["t"], p=p, out=out, r=r))
    return pd.DataFrame(rows)


def calib_table(df):
    L = ["| p bucket | n resolved | stated p | realised target-first rate | avg R if taken | open (unresolved) |", "|---|---|---|---|---|---|"]
    for lo, hi, lab in ((0, .35, "< 0.35"), (.35, .45, "0.35-0.45"), (.45, .55, "0.45-0.55"), (.55, 1.01, "> 0.55")):
        b = df[(df.p >= lo) & (df.p < hi)]
        r = b[b.out != "open"]
        L.append(f"| {lab} | {len(r)} | {b.p.mean():.2f} | {(r.out == 'target').mean():.2f} | {r.r.mean():+.2f} | {(b.out == 'open').sum()} |"
                 if len(b) else f"| {lab} | 0 | - | - | - | 0 |")
    return L


# ------------------------------------------------------------------ 2. selectivity
def ms(x):
    """Bar-end times as UTC epoch milliseconds, whatever the datetime unit."""
    return np.asarray((pd.DatetimeIndex(x) - pd.Timestamp(0, tz="UTC")) // pd.Timedelta(milliseconds=1))


def features(m1, m15, tr):
    h1 = indicators(resample(m1, 60))
    ema = h1["c"].ewm(span=20, adjust=False).mean()
    ends = ms(h1["end"])
    slope = ema.diff().values
    c1 = h1["c"].values
    # ADX14 on 15m
    hh, ll, cc = m15["h"], m15["l"], m15["c"]
    tr15 = pd.concat([hh - ll, (hh - cc.shift()).abs(), (ll - cc.shift()).abs()], axis=1).max(axis=1)
    atr = tr15.ewm(alpha=1 / 14, adjust=False).mean()
    up, dn = hh.diff(), -ll.diff()
    pdi = 100 * up.where((up > dn) & (up > 0), 0.0).ewm(alpha=1 / 14, adjust=False).mean() / atr
    ndi = 100 * dn.where((dn > up) & (dn > 0), 0.0).ewm(alpha=1 / 14, adjust=False).mean() / atr
    adx = (100 * (pdi - ndi).abs() / (pdi + ndi)).ewm(alpha=1 / 14, adjust=False).mean()
    atr_med = m15["atr"].rolling(96 * 20, min_periods=96 * 5).median()
    e15 = ms(m15["end"])
    out = []
    for r in tr.itertuples():
        k = int(np.searchsorted(ends, r.entry_t, side="right")) - 1
        q = int(np.searchsorted(e15, r.entry_t, side="right")) - 1
        hr = pd.Timestamp(r.entry_t, unit="ms", tz="UTC").tz_convert("Asia/Bangkok").hour
        out.append(dict(
            trend="agrees" if k >= 1 and r.dir * slope[k] > 0 and r.dir * (c1[k] - ema.iloc[k]) > 0 else "disagrees",
            adx="<20" if adx.iloc[q] < 20 else "20-30" if adx.iloc[q] <= 30 else ">30",
            session="14-20" if 14 <= hr < 20 else "20-24" if hr >= 20 else "00-03:30",
            atr="above median" if m15["atr"].iloc[q] > atr_med.iloc[q] else "below median"))
    return pd.concat([tr.reset_index(drop=True), pd.DataFrame(out)], axis=1)


def stats(r, months):
    if not len(r):
        return dict(n=0)
    w, l = r[r > 0], r[r <= 0]
    win = len(w) / len(r)
    b = (w.mean() / -l.mean()) if len(w) and len(l) and l.mean() < 0 else np.nan
    kelly = win - (1 - win) / b if b == b else np.nan
    return dict(n=len(r), win=win, avg_r=r.mean(), per_month=len(r) / months, kelly=kelly)


def fmt(s):
    return (f"{s['n']} | {100 * s['win']:.0f}% | {s['avg_r']:+.3f} | {s['per_month']:.1f} | {s['kelly']:+.3f}" if s["n"] else "0 | - | - | - | -")


def main():
    m1 = C.history()
    m15 = indicators(resample(m1, 15))
    L = ["# Confidence tests (code only, no LLM calls)", ""]
    # 1
    cal = calibration(m1)
    L += ["## 1. Opus calibration (best_idea of every swing-desk decision, resolved on 1m bars, 72 h limit)",
          f"Decisions with a best_idea: {len(cal)} (live since 2026-11-26).", *(calib_table(cal) if len(cal) else ["(none)"]), ""]
    rep = json.loads(REPLAY.read_text()) if REPLAY.exists() else None
    L += ["Earlier evidence (intraday AI replay, reports/ai_replay.md): 32 setups, Opus's stated p 0.25-0.45 (mean 0.40) against a realised",
          "target-first rate of 0.25: overconfident by about 0.15.", ""]
    # 2
    sw = C.SWAPS["typical retail (long -0.60, short +0.20 per oz per night)"]
    tr, _ = C.sim(m1, m15, "B", sw)
    tr = tr.copy()
    risk = C.RISK * C.CAP0                                       # 1% of equity at entry; equity drifts, approximated with the start
    tr["r"] = tr["pnl"] / risk
    tr = features(m1, m15, tr)
    tr["date"] = pd.to_datetime(tr["entry_t"], unit="ms", utc=True).dt.tz_convert("Asia/Bangkok")
    is_, oos = tr[tr.date < "2026-08-01"], tr[tr.date >= "2026-08-01"]
    mi = max(1, (is_.date.max() - is_.date.min()).days / 30.4)
    mo = max(1, (oos.date.max() - oos.date.min()).days / 30.4)
    subsets = [(f, v) for f in ("trend", "adx", "session", "atr") for v in sorted(tr[f].unique())]
    L += ["## 2. cand15 selectivity (live rule B, typical swap; 10 pre-registered single-filter subsets)",
          f"In-sample {is_.date.min():%Y-%m-%d} .. {is_.date.max():%Y-%m-%d} ({len(is_)} trades); out of sample {oos.date.min():%Y-%m-%d} .. {oos.date.max():%Y-%m-%d} ({len(oos)} trades).",
          "", "| Subset | IS trades | IS win | IS avg R | IS /month | IS Kelly | OOS trades | OOS win | OOS avg R | OOS /month | OOS Kelly |",
          "|---|---|---|---|---|---|---|---|---|---|---|",
          f"| all trades | {fmt(stats(is_.r, mi))} | {fmt(stats(oos.r, mo))} |"]
    best = None
    for f, v in subsets:
        si, so = stats(is_[is_[f] == v].r, mi), stats(oos[oos[f] == v].r, mo)
        L.append(f"| {f} = {v} | {fmt(si)} | {fmt(so)} |")
        if si["n"] >= 30 and (best is None or si["avg_r"] > best[2]["avg_r"]):
            best = (f, v, si)
    f, v, _ = best
    sub = oos[oos[f] == v].r.values
    allr = oos.r.values
    diffs = [rng.choice(sub, len(sub)).mean() - rng.choice(allr, len(allr)).mean() for _ in range(5000)]
    lo, hi = np.percentile(diffs, [5, 95])
    passed = len(sub) >= 30 and lo > 0
    L += ["", f"Chosen in-sample (best avg R with >= 30 trades): **{f} = {v}**. Out of sample: {len(sub)} trades, avg R {sub.mean():+.3f} vs all "
              f"{allr.mean():+.3f}; lead {sub.mean() - allr.mean():+.3f}, bootstrap 90% band [{lo:+.3f}, {hi:+.3f}] -> "
              + ("**PASSES**" if passed else "**does not pass**") + ".",
          "R here = trade P&L / 1% of the 10k start (the replay's risk unit); Kelly = win - (1 - win) / (avg win R / avg loss R)."]
    (HERE.parent / "reports" / "confidence_tests.md").write_text("\n".join(L) + "\n")
    print("\n".join(L))
    return cal, passed, (f, v, sub.mean(), allr.mean(), lo, hi, len(sub))


if __name__ == "__main__":
    main()
