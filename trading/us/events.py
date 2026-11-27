"""Event / news checks for REPORT.md (code only, PAPER). Re-runs the boss's tests with this repo's data and costs.
  python3 events.py   -> events.md (appended to REPORT.md by run.py)
1. Overnight-only (buy at the close, sell at the next open), our round-trip cost 2 x (0.107% + 0.05%) + SEC.
2. Leverage on buy-and-hold, daily rebalanced, 6%/y financing on the borrowed part (outside the cash-account rules:
   shown only to answer the question).
3. Gap events |open/prev close - 1| >= 5% on the 34 large caps (survivor-biased list), entry at the gap-day close:
   1-day and 20-day excess return vs SPY, 2016-22 vs 2023-26, with 95% bootstrap bands.
MU, WDC and STX are not in our data, so those rows of the boss's table are not re-run.
"""
import numpy as np
import pandas as pd

import bt
import data as D

RT = 2 * (bt.COMM + bt.SLIP) + bt.SEC
SPLIT = pd.Timestamp("2023-01-01")


def cagr(r, idx):
    yrs = (idx[-1] - idx[0]).days / 365.25
    return (1 + r).prod() ** (1 / yrs) - 1, ((1 + r).cumprod() / (1 + r).cumprod().cummax() - 1).min()


def main():
    out = ["## Event / news checks (re-run here; boss-side numbers in brackets)", ""]
    out += ["### Overnight-only (buy at the close, sell at the next open)", "| ETF | Gross CAGR | Net CAGR after costs | Max DD net |", "|---|---|---|---|"]
    for s, boss in (("SPY", "-50%/y"), ("QQQ", "-49%/y")):
        x = D.load(s)
        r = (x["o"].shift(-1) / x["c"] - 1).dropna()
        g, _ = cagr(r, r.index)
        n, dd = cagr(r - RT, r.index)
        out.append(f"| {s} | {100 * g:+.1f}% | {100 * n:+.1f}% (boss {boss}) | {100 * dd:.0f}% |")
    out += ["", "### Leverage on buy-and-hold (daily rebalanced, 6%/y financing; not allowed in the cash account)",
            "| ETF | Leverage | CAGR | Max DD |", "|---|---|---|---|"]
    for s in ("SPY", "QQQ"):
        x = D.load(s)
        r = x["c"].pct_change().dropna()
        for L in (1, 2, 3):
            rl = L * r - (L - 1) * 0.06 / 252
            c, dd = cagr(rl.clip(lower=-1), rl.index)
            out.append(f"| {s} | {L}x | {100 * c:+.1f}% | {100 * dd:.0f}% |")
    out.append("(Boss: QQQ 2x +25%/y with DD -65%; MU 2x +40%/y with DD -88%, 3x wiped out.)")
    spy = D.load("SPY")["c"]
    rows = []
    for s in D.LARGE:
        x = D.load(s)
        gap = x["o"] / x["c"].shift() - 1
        for d in gap.index[gap.abs() >= 0.05]:
            i = x.index.get_loc(d)
            if i + 20 >= len(x) or d not in spy.index:
                continue
            j = spy.index.get_loc(d)
            for h in (1, 20):
                ex = (x["c"].iloc[i + h] / x["c"].iloc[i] - 1) - (spy.iloc[j + h] / spy.iloc[j] - 1) - RT
                rows.append(dict(sym=s, d=d, dir="up" if gap[d] > 0 else "down", h=h, ex=ex, oos=d >= SPLIT))
    ev = pd.DataFrame(rows)
    rng = np.random.default_rng(3)
    out += ["", "### Gap events, |gap| >= 5%, 34 large caps (SURVIVOR-BIASED: today's winners), entry at the gap-day close",
            "Excess vs SPY after round-trip costs. Bands: 95% bootstrap of the mean.", "| Gap | Hold | Period | n | Mean excess | 95% band |", "|---|---|---|---|---|---|"]
    for dr in ("down", "up"):
        for h in (1, 20):
            for oos, lab in ((False, "2016-22"), (True, "2023-26")):
                v = ev[(ev["dir"] == dr) & (ev["h"] == h) & (ev["oos"] == oos)]["ex"].values
                if len(v) < 5:
                    continue
                bs = [rng.choice(v, len(v)).mean() for _ in range(2000)]
                out.append(f"| {dr} | {h}d | {lab} | {len(v)} | {100 * v.mean():+.2f}% | [{100 * np.percentile(bs, 2.5):+.2f}, {100 * np.percentile(bs, 97.5):+.2f}] |")
    out += ["", "Earnings-day-only test: skipped. SEC EDGAR asks automated clients for a contact e-mail in the User-Agent; we do not",
            "send the owner's details to outside services, and no other earnings calendar is on the allowed hosts.", ""]
    (D.HERE / "events.md").write_text("\n".join(out) + "\n")
    print("\n".join(out))


if __name__ == "__main__":
    main()
