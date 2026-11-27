"""Shadow paper copy of the fund (PAPER ONLY), priced daily, to measure skill against the S&P 500.

- 10,000 USD notional until the owner gives an amount; orders.md lines ("BUY x% TICKER") are filled at the OPEN of the
  first trading day on or after the Monday of their order week, plus 0.107% commission+VAT. Uninvested cash earns 0.
- When the owner reports real fills, put them in fills_real.csv (date,ticker,usd,price); they replace the assumed fills.
- Benchmark: SPY total return, bought with the same cash on the same days (same costs), so the difference is selection.
- Satellite check: the satellite's return vs the S&P 500 over rolling 12 months (the mandate's fold-in rule).
  python3 shadow.py      -> data/shadow.csv, reports/shadow.md, prints a 2-line status
"""
import re
from pathlib import Path

import numpy as np
import pandas as pd

import prices as P

HERE = P.HERE
NOTIONAL, COMM = 10_000.0, 0.00107


def planned():
    """[(week Monday, ticker, pct)] from orders.md."""
    out, week = [], None
    for line in (HERE / "orders.md").read_text().splitlines():
        m = re.match(r"## Week of (\d{4}-\d{2}-\d{2})", line)
        if m:
            week = pd.Timestamp(m.group(1))
        m = re.match(r"BUY ([\d.]+)% ([A-Z.\-]+)", line)
        if m and week is not None:
            out.append((week, m.group(2), float(m.group(1))))
    return out


def fills():
    real = HERE / "fills_real.csv"
    if real.exists():
        f = pd.read_csv(real, parse_dates=["date"])
        return [(r.date, r.ticker, float(r.usd), float(r.price), "real") for r in f.itertuples()]
    out = []
    for week, t, pct in planned():
        df = P.load_latest(t)
        if df is None:
            continue
        d = df[df.index >= week]
        if not len(d):
            out.append((week, t, NOTIONAL * pct / 100, np.nan, "pending (no price yet)"))
            continue
        out.append((d.index[0], t, NOTIONAL * pct / 100, float(d["open"].iloc[0]), "assumed: next open"))
    return out


def run():
    F = fills()
    done = [f for f in F if f[3] == f[3]]
    if not done:
        pend = sorted({f[0].date() for f in F})
        return None, f"Fund shadow: not started; first assumed fills at the open on {pend[0] if pend else '?'} (prices not yet in the pack)."
    start = min(f[0] for f in done)
    tick = sorted({f[1] for f in done})
    px = pd.DataFrame({t: P.load_latest(t)["adj"] / P.load_latest(t)["close"] * 0 + P.load_latest(t)["adj"] for t in tick + ["SPY"]})
    px = px[px.index >= start].ffill()
    days = px.index
    sh = {t: 0.0 for t in tick}
    bsh, cash, bcash, sat_cost = 0.0, NOTIONAL, NOTIONAL, 0.0
    rows = []
    adjo = {t: P.load_latest(t)["open"] * P.load_latest(t)["adj"] / P.load_latest(t)["close"] for t in tick + ["SPY"]}
    for d in days:
        for fd, t, usd, p, how in done:
            if fd == d:
                o = adjo[t].loc[d]                           # total-return-consistent open
                sh[t] += usd * (1 - COMM) / o
                cash -= usd
                bsh += usd * (1 - COMM) / adjo["SPY"].loc[d]
                bcash -= usd
        eq = cash + sum(sh[t] * px[t].loc[d] for t in tick)
        beq = bcash + bsh * px["SPY"].loc[d]
        rows.append(dict(date=d.date(), equity=round(eq, 2), benchmark=round(beq, 2), **{t: round(sh[t] * px[t].loc[d], 2) for t in tick}))
    df = pd.DataFrame(rows)
    df.to_csv(HERE / "data" / "shadow.csv", index=False)
    last = df.iloc[-1]
    ret, bret = last.equity / NOTIONAL - 1, last.benchmark / NOTIONAL - 1
    core = {"SPYM", "VOO", "IVV"}
    sat = [t for t in tick if t not in core]
    sat_line = ""
    if sat:
        sat_val = sum(last[t] for t in sat)
        sat_in = sum(f[2] for f in done if f[1] in sat) * (1 - COMM)
        spy_same = sum(f[2] * (1 - COMM) / adjo["SPY"].loc[f[0]] for f in done if f[1] in sat) * px["SPY"].iloc[-1]
        sat_line = f" Satellite {100 * (sat_val / sat_in - 1):+.1f}% vs the same money in SPY {100 * (spy_same / sat_in - 1):+.1f}%" + \
                   (" (BEHIND)." if sat_val < spy_same else ".")
    status = (f"Fund shadow ({NOTIONAL:,.0f} USD notional, from {start.date()}, fills {'real' if any(f[4] == 'real' for f in done) else 'assumed'}): "
              f"{last.equity:,.2f} ({100 * ret:+.2f}%) vs SPY {last.benchmark:,.2f} ({100 * bret:+.2f}%).{sat_line}")
    (HERE / "reports" / "shadow.md").write_text(f"# Fund shadow book\n\n{status}\n\n" + df.tail(30).to_markdown(index=False) + "\n")
    return df, status


if __name__ == "__main__":
    P.refresh_latest()
    st = run()[1]
    (HERE / "shadow_status.txt").write_text(st + "\n")
    print(st)
