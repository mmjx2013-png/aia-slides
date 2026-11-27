"""The owner's monthly DCA (boss's split, 2026-11-27). PAPER research; the owner places every real order by hand.

10,000 THB every month, converted to USD ONCE a month (to save FX spread), bought on the first trading day:
  LOW     20%  2,000 THB  SGOV (BIL if Webull TH lacks SGOV). Never below zero; HIGH-bucket profit skims land here.
  MEDIUM  70%  7,000 THB  the fund at its current target weights (portfolio.md).
  HIGH    10%  1,000 THB  reserved for the gold desk: held in SGOV as "high reserve" until the desk passes the
                          30 Nov verdict criteria; the existing 70 USD MT5 account is this bucket's seed.
  python3 dca.py        -> orders.md (this month's lines in THB and USD at the latest FX rate and last closes)
"""
import io
import re
import urllib.request

import pandas as pd

import prices as P

HERE = P.HERE
MONTHLY_THB = 10_000.0
SPLIT = {"LOW": 0.20, "MEDIUM": 0.70, "HIGH": 0.10}
CASH_ETF, CASH_FALLBACK = "SGOV", "BIL"


def fx_series():
    """THB per USD: FRED DEXTHUS (daily, about a week's lag), filled forward with Yahoo THB=X from the price pack."""
    out = None
    try:
        with urllib.request.urlopen("https://fred.stlouisfed.org/graph/fredgraph.csv?id=DEXTHUS&cosd=2025-01-01", timeout=20) as r:
            df = pd.read_csv(io.StringIO(r.read().decode()))
        df.columns = ["date", "v"]
        df["v"] = pd.to_numeric(df["v"], errors="coerce")
        out = df.dropna().set_index(pd.to_datetime(df.dropna()["date"]))["v"]
    except Exception:
        pass
    y = P.load_latest("THB=X")
    ys = y["close"] if y is not None else None
    if out is None:
        return ys, "Yahoo THB=X"
    last = out.index[-1].date()
    if ys is not None:
        out = pd.concat([out, ys[ys.index > out.index[-1]]])
    return out, f"FRED DEXTHUS to {last}, Yahoo THB=X after" if ys is not None else "FRED DEXTHUS"


def targets():
    """MEDIUM bucket weights (fractions) from portfolio.md's table."""
    w = {}
    for line in (HERE / "portfolio.md").read_text().splitlines():
        m = re.match(r"\| ([A-Z.]+)(?: \(core[^|]*)? \| ([\d.]+)% \|", line)
        if m:
            w[m.group(1)] = float(m.group(2)) / 100
    return w


def plan(month_label=None):
    P.refresh_latest()
    fx, src = fx_series()
    rate = float(fx.iloc[-1])
    cash = CASH_ETF if P.load_latest(CASH_ETF) is not None else CASH_FALLBACK
    rows = []
    for bucket, share in SPLIT.items():
        thb = MONTHLY_THB * share
        if bucket == "MEDIUM":
            for t, w in targets().items():
                rows.append((bucket, t, thb * w, ""))
        else:
            rows.append((bucket, cash, thb, "high reserve (gold desk not yet approved)" if bucket == "HIGH" else "low risk"))
    L = ["# Orders for the owner: monthly DCA (PAPER research; place by hand on Webull Thailand)", "",
         f"Prepared {pd.Timestamp.now(tz='Asia/Bangkok'):%Y-%m-%d %H:%M} Bangkok. 10,000 THB a month, converted to USD ONCE a month "
         f"(one FX conversion saves spread), bought on the first trading day of the month.",
         f"FX {rate:.2f} THB/USD ({src}). Quantities at the last close; fractional shares; the owner may use limit orders.", "",
         f"## {month_label or 'Month of December 2026 (first buy Mon 30 Nov or Tue 1 Dec)'}",
         f"CONVERT {MONTHLY_THB:,.0f} THB -> ~{MONTHLY_THB / rate:,.2f} USD (once)"]
    tot = {}
    for bucket, t, thb, note in rows:
        usd = thb / rate
        px = P.price_at(t, pd.Timestamp.now())
        q = f", ~{usd / px:.4f} sh at {px:.2f}" if px else ""
        L.append(f"BUY ~{usd:,.2f} USD {t} ({thb:,.0f} THB){q}  [{bucket}{'; ' + note if note else ''}]")
        tot[bucket] = tot.get(bucket, 0) + thb
    L += ["", "Bucket totals: " + ", ".join(f"{b} {v:,.0f} THB" for b, v in tot.items()) + ".",
          f"The HIGH bucket's {SPLIT['HIGH'] * MONTHLY_THB:,.0f} THB piles up in {cash} as 'high reserve' until the gold desk passes the",
          "30 Nov verdict criteria; only then does it go to MT5 (the existing 70 USD MT5 account is its seed).",
          "Next months: the same lines, re-priced on the first trading day of each month (weights follow portfolio.md)."]
    (HERE / "orders.md").write_text("\n".join(L) + "\n")
    return "\n".join(L)


if __name__ == "__main__":
    print(plan())
