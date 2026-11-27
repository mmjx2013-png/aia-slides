"""Shadow paper copy of the owner's DCA plan (PAPER ONLY), priced daily in USD and THB.

- 10,000 THB on the first trading day of each month from December 2026, converted at that day's THB/USD rate
  (dca.fx_series) and bought at that day's OPEN, split as in dca.py (LOW SGOV 20%, MEDIUM fund weights 70%,
  HIGH reserve SGOV 10%), plus 0.107% commission+VAT per buy. Weights follow portfolio.md at each deposit.
- Real fills, when the owner reports them, go in fills_real.csv (date,ticker,usd,price) and replace the assumed ones.
- Benchmark: the same USD cash flows put 100% into SPY (same days, same costs).
- Returns are money-weighted (XIRR), because the deposits change the base.
  python3 shadow.py   -> data/shadow.csv, reports/shadow.md, shadow_status.txt (2 lines for the 21:02 report)
"""
import numpy as np
import pandas as pd

import dca
import prices as P

HERE = P.HERE
COMM = 0.00107
START = pd.Timestamp("2026-12-01")


def xirr(flows):
    """flows: [(date, amount)] with deposits negative and the final value positive; annualized IRR or nan."""
    if len(flows) < 2:
        return np.nan
    t0 = flows[0][0]
    yrs = np.array([(d - t0).days / 365.25 for d, _ in flows])
    cf = np.array([a for _, a in flows])
    lo, hi = -0.99, 10.0
    f = lambda r: (cf / (1 + r) ** yrs).sum()
    if f(lo) * f(hi) > 0:
        return np.nan
    for _ in range(200):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if f(lo) * f(mid) > 0 else (lo, mid)
    return mid


def deposit_days(index):
    days = index[index >= START]
    return list(pd.Series(days, index=days).groupby([days.year, days.month]).min())


def run():
    P.refresh_latest()
    fx, _ = dca.fx_series()
    cash = dca.CASH_ETF if P.load_latest(dca.CASH_ETF) is not None else dca.CASH_FALLBACK
    spy = P.load_latest("SPY")
    deps = deposit_days(spy.index)
    if not deps:
        return f"Fund shadow (DCA 10,000 THB/month): not started; first deposit on the first trading day of Dec 2026 (no price yet)."
    w = dca.targets()
    alloc = {cash: dca.SPLIT["LOW"] + dca.SPLIT["HIGH"]}
    for t, x in w.items():
        alloc[t] = alloc.get(t, 0) + dca.SPLIT["MEDIUM"] * x
    tick = sorted(set(alloc) | {"SPY"})
    data = {t: P.load_latest(t) for t in tick}
    adj_open = {t: data[t]["open"] * data[t]["adj"] / data[t]["close"] for t in tick}
    days = spy.index[spy.index >= deps[0]]
    med = {t: dca.SPLIT["MEDIUM"] * x for t, x in w.items()}
    sh, bsh, flows, rows = {t: 0.0 for t in alloc}, 0.0, [], []
    msh, mbsh, mflows = {t: 0.0 for t in med}, 0.0, []
    for d in days:
        rate = float(fx[fx.index <= d].iloc[-1])
        if d in deps:
            usd = dca.MONTHLY_THB / rate
            for t, a in alloc.items():
                sh[t] += usd * a * (1 - COMM) / adj_open[t].loc[d]
            bsh += usd * (1 - COMM) / adj_open["SPY"].loc[d]
            flows.append((d, -usd))
            for t, a in med.items():
                msh[t] += usd * a * (1 - COMM) / adj_open[t].loc[d]
            mbsh += usd * dca.SPLIT["MEDIUM"] * (1 - COMM) / adj_open["SPY"].loc[d]
            mflows.append((d, -usd * dca.SPLIT["MEDIUM"]))
        val = sum(sh[t] * data[t]["adj"].loc[d] for t in alloc)
        bval = bsh * data["SPY"]["adj"].loc[d]
        rows.append(dict(date=d.date(), deposited_usd=round(-sum(a for _, a in flows), 2), value_usd=round(val, 2),
                         value_thb=round(val * rate, 0), spy_usd=round(bval, 2), fx=rate,
                         medium_usd=round(sum(msh[t] * data[t]["adj"].loc[d] for t in med), 2),
                         medium_spy_usd=round(mbsh * data["SPY"]["adj"].loc[d], 2)))
    df = pd.DataFrame(rows)
    df.to_csv(HERE / "data" / "shadow.csv", index=False)
    last = df.iloc[-1]
    end = pd.Timestamp(last.date)
    irr = xirr(flows + [(end, last.value_usd)])
    birr = xirr(flows + [(end, last.spy_usd)])
    mirr = xirr(mflows + [(end, last.medium_usd)])
    mbirr = xirr(mflows + [(end, last.medium_spy_usd)])
    status = (f"Fund shadow (DCA 10,000 THB/month from {deps[0].date()}, {len(deps)} deposits, assumed fills at the open): "
              f"{last.value_usd:,.2f} USD = {last.value_thb:,.0f} THB on {last.deposited_usd:,.2f} USD deposited.\n"
              f"Money-weighted return {100 * irr:+.1f}%/y vs the same cash in SPY {100 * birr:+.1f}%/y"
              + (" (BEHIND; 30% sits in T-bills by design)." if last.value_usd < last.spy_usd else ".")
              + f" Skill check, MEDIUM bucket only: {100 * mirr:+.1f}%/y vs SPY {100 * mbirr:+.1f}%/y"
              + (" (BEHIND)." if last.medium_usd < last.medium_spy_usd else "."))
    (HERE / "reports" / "shadow.md").write_text(f"# Fund shadow book (DCA)\n\n{status}\n\n" + df.tail(30).to_markdown(index=False) + "\n")
    return status


if __name__ == "__main__":
    st = run()
    (HERE / "shadow_status.txt").write_text(st + "\n")
    print(st)
