"""Gold (GC=F, COMEX gold futures, front month) PAPER study with leverage.

Everything here is simulated. Nothing connects to a broker.

Account rules (stated once, used everywhere)
- Decide after the daily close (17:00 New York); fill at the next session's
  first 1-hour bar OPEN (the 18:00 New York reopen). Daily study: next daily open.
- Position = signal x leverage x equity, in ounces. Signal is -1 (short), 0, +1
  or a fraction (AI desk). The position is reset to that size at every daily
  decision (constant leverage), so a winning account does not quietly de-lever.
  "trades" counts signal changes; the small daily resizes still pay the spread.
- Spread/slippage: 0.30 USD per ounce, each side.
- Financing for leverage above 1x: 6%/yr on the notional, charged per calendar day.
- Margin: used margin = notional / leverage (the account posts all equity).
  LIQUIDATION when equity <= 50% of used margin, checked on every bar against
  the bar's worst price (low for a long, high for a short). The broker closes
  the position at the stop-out price, or at the bar's open if it gapped through.
- A liquidated account stays dead: never refilled.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

GD = Path(__import__("os").environ.get("GOLD_DATA", Path(__file__).parent / "data" / "gold"))
SPREAD = 0.30
FIN = 0.06
STOP_OUT = 0.50


def load(name):
    r = json.loads((GD / f"{name}.json").read_text())["chart"]["result"][0]
    q = r["indicators"]["quote"][0]
    df = pd.DataFrame({k: q[k] for k in ("open", "high", "low", "close", "volume")},
                      index=pd.to_datetime(r["timestamp"], unit="s"), dtype="float64")
    df = df.dropna(subset=["open", "high", "low", "close"])
    return df[~df.index.duplicated(keep="last")]


def daily():
    d = load("GC_F_daily")
    d.index = d.index.normalize()       # session date (New York)
    # The last bar is incomplete while its session is still trading: drop it.
    last_hour = load("GC_F_1h").index[-1]
    if d.index[-1] + pd.Timedelta(hours=21) > last_hour:
        d = d.iloc[:-1]
    return d


def hourly():
    h = load("GC_F_1h")
    stub = (h["high"] == h["low"]) & (h["volume"].fillna(0) < 50)
    h = h[~stub]  # drop settlement stubs (flat bar, ~0 volume)
    return h[(h.index.minute == 0) & (h.index.second == 0)]  # drop Yahoo's live partial bar


# ---------------------------------------------------------------- rule signals
def sig_sma(c, n, short=True):
    s = np.where(c > c.rolling(n).mean(), 1.0, -1.0 if short else 0.0)
    return pd.Series(s, c.index).where(c.rolling(n).mean().notna(), 0.0)


def sig_tsmom(c, n, short=True):
    r = c / c.shift(n) - 1
    s = np.sign(r) if short else (r > 0).astype(float)
    return s.fillna(0.0)


def sig_donchian(d, entry=55, exit_=20, short=True):
    hi_e, lo_e = d["high"].rolling(entry).max().shift(), d["low"].rolling(entry).min().shift()
    hi_x, lo_x = d["high"].rolling(exit_).max().shift(), d["low"].rolling(exit_).min().shift()
    c, pos, out = d["close"], 0.0, []
    for t in range(len(d)):
        if pos == 0:
            if c.iat[t] > hi_e.iat[t]:
                pos = 1.0
            elif short and c.iat[t] < lo_e.iat[t]:
                pos = -1.0
        elif pos > 0 and c.iat[t] < lo_x.iat[t]:
            pos = 0.0
        elif pos < 0 and c.iat[t] > hi_x.iat[t]:
            pos = 0.0
        out.append(pos)
    return pd.Series(out, d.index)


def rules(d):
    c = d["close"]
    return {
        "Buy & hold (long 1x)":        pd.Series(1.0, d.index),
        "SMA200 long/short":           sig_sma(c, 200),
        "SMA100 long/short":           sig_sma(c, 100),
        "SMA200 long/flat":            sig_sma(c, 200, short=False),
        "TS-momentum 3m long/short":   sig_tsmom(c, 63),
        "TS-momentum 12m long/short":  sig_tsmom(c, 252),
        "TS-momentum 12m long/flat":   sig_tsmom(c, 252, short=False),
        "Donchian 55/20 long/short":   sig_donchian(d, 55, 20),
        "Donchian 20/10 long/short":   sig_donchian(d, 20, 10),
    }


# ---------------------------------------------------------------- simulator
def simulate(bars, fills, lev, capital, rebalance=True):
    """bars: OHLC frame (daily or 1h). fills: Series of target signal indexed by
    the bar time at whose OPEN the order fills. Returns dict with equity Series etc."""
    O, H, L, C = (bars[k].to_numpy() for k in ("open", "high", "low", "close"))
    t = bars.index
    want = fills.reindex(t).to_numpy()
    eq, q, sig = capital, 0.0, 0.0
    prev_c, prev_t = None, None
    curve, dead_at, costs, fin_paid, trades = np.empty(len(t)), None, 0.0, 0.0, 0
    fills = []
    margin = 0.0
    for i in range(len(t)):
        if dead_at is not None:
            curve[i] = eq; continue
        o = O[i]
        if prev_c is not None:                       # gap from last close to this open
            eq += q * (o - prev_c)
            if lev > 1 and q != 0:                   # financing for elapsed time
                days = (t[i] - prev_t).total_seconds() / 86400
                f = abs(q) * prev_c * FIN * days / 365
                eq -= f; fin_paid += f
        w = want[i]
        if w == w and (w != sig or rebalance) and eq > 0:   # fill at the open
            q_new = w * lev * eq / o       # reset to `lev` x current equity
            c = abs(q_new - q) * SPREAD
            eq -= c; costs += c
            trades += int(w != sig)
            if q_new != q:
                fills.append((t[i], "BUY" if q_new > q else "SELL", abs(q_new - q), o, c))
            q, sig = q_new, w
            margin = abs(q) * o / lev
        # liquidation check against the bar's worst price
        if q != 0:
            worst = L[i] if q > 0 else H[i]
            eq_worst = eq + q * (worst - o)
            if eq_worst <= STOP_OUT * margin:
                stop_px = o + (STOP_OUT * margin - eq) / q
                px = stop_px if (q > 0 and stop_px <= o) or (q < 0 and stop_px >= o) else o
                eq = eq + q * (px - o) - abs(q) * SPREAD
                fills.append((t[i], "LIQUIDATED", abs(q), px, abs(q) * SPREAD))
                eq, q, dead_at = max(eq, 0.0), 0.0, t[i]
                curve[i] = eq; continue
        eq += q * (C[i] - o)
        prev_c, prev_t = C[i], t[i]
        curve[i] = eq
    e = pd.Series(curve, t)
    return dict(equity=e, dead_at=dead_at, costs=costs, financing=fin_paid, trades=trades, fills=fills)


def stats(res, capital, rf=0.02):
    e = res["equity"]
    d = e.resample("D").last().dropna()
    r = d.pct_change().dropna()
    yrs = (d.index[-1] - d.index[0]).days / 365.25
    under = e < e.cummax()
    # longest stretch under water, in calendar days
    longest, start = 0.0, None
    for ts, u in under.items():
        if u and start is None:
            start = ts
        if not u and start is not None:
            longest = max(longest, (ts - start).days); start = None
    if start is not None:
        longest = max(longest, (e.index[-1] - start).days)
    fin = e.iloc[-1]
    return dict(final=fin, total=fin / capital - 1,
                cagr=(max(fin, 1e-9) / capital) ** (1 / yrs) - 1 if yrs > 0 else np.nan,
                maxdd=(e / e.cummax() - 1).min(), vol=r.std() * np.sqrt(252),
                sharpe=(r.mean() - rf / 252) / r.std() * np.sqrt(252) if r.std() > 0 else np.nan,
                trades=res["trades"], costs=res["costs"], financing=res["financing"],
                liquidated=str(res["dead_at"])[:16] if res["dead_at"] is not None else "no",
                days_under_water=longest)


def daily_fills(sig, d):
    """Signal decided at day t's close fills at day t+1's daily open."""
    return sig.shift(1).reindex(d.index)


def hourly_fills(sig, h):
    """Signal decided at session date D's close (17:00 New York) fills at the
    open of the session reopen: the first 1h bar at/after D 21:00 UTC that
    follows a break of 90+ minutes (the daily maintenance break)."""
    hi = h.index
    gap = pd.Series(hi, hi).diff() >= pd.Timedelta(minutes=90)
    reopen = hi[gap.to_numpy()]
    out = {}
    for D, s in sig.items():
        k = reopen.searchsorted(D + pd.Timedelta(hours=21))
        if k < len(reopen):
            out.setdefault(reopen[k], s)
    return pd.Series(out)
