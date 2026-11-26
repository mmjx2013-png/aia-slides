"""Well-known low-frequency rule families as target-weight frames (decided on the close, see bt.py).
Every variant tried is listed by `families()`, so the number of trials is reported honestly."""
import itertools

import numpy as np
import pandas as pd


def sma(x, n):
    return x.rolling(n, min_periods=n).mean()


def rsi(x, n=2):
    d = x.diff()
    up = d.clip(lower=0).ewm(alpha=1 / n, adjust=False, min_periods=n).mean()
    dn = (-d.clip(upper=0)).ewm(alpha=1 / n, adjust=False, min_periods=n).mean()
    return 100 - 100 / (1 + up / dn.replace(0, np.nan))


def month_ends(idx):
    s = pd.Series(idx, index=idx)
    return set(s.groupby([idx.year, idx.month]).max())


def _hold(C, sym):
    W = pd.DataFrame(0.0, index=C.index, columns=C.columns)
    W[sym] = 1.0
    return W


def buy_hold(C, sym):
    return _hold(C, sym)


def trend(C, asset, n, band, off):
    """Hold `asset` while its close is above SMA(n) (hysteresis band), else `off` (cash or a bond ETF)."""
    c, m = C[asset], sma(C[asset], n)
    state, out = 0, []
    for x, y in zip(c.values, m.values):
        if y == y:
            if x > y * (1 + band):
                state = 1
            elif x < y * (1 - band):
                state = 0
        out.append(state)
    W = pd.DataFrame(0.0, index=C.index, columns=C.columns)
    W[asset] = out
    if off != "cash":
        W[off] = 1 - W[asset]
    W[sma(C[asset], n).isna()] = 0.0
    return W


def dual_momentum(C, risky, months, safe):
    """Month-end: the risky ETF with the best `months` return; if that return <= 0, the safe asset (or cash)."""
    L = 21 * months
    ret = C[risky] / C[risky].shift(L) - 1
    me = month_ends(C.index)
    W, cur = pd.DataFrame(0.0, index=C.index, columns=C.columns), None
    for d in C.index:
        if d in me and ret.loc[d].notna().all():
            best = ret.loc[d].idxmax()
            cur = best if ret.loc[d, best] > 0 else safe
        if cur and cur != "cash":
            W.loc[d, cur] = 1.0
    return W


def sector_rotation(C, sectors, months, k, filt):
    """Month-end: equal weight in the top-k sectors by `months` return; filter: only while SPY > SMA200."""
    L = 21 * months
    ret = C[sectors] / C[sectors].shift(L) - 1
    up = C["SPY"] > sma(C["SPY"], 200)
    me = month_ends(C.index)
    W, cur = pd.DataFrame(0.0, index=C.index, columns=C.columns), []
    for d in C.index:
        if d in me:
            r = ret.loc[d].dropna()
            cur = list(r.sort_values(ascending=False).index[:k]) if len(r) >= k else []
        if cur and (not filt or bool(up.loc[d])):
            W.loc[d, cur] = 1.0 / len(cur)
    return W


def rsi2(C, asset, x, exit_rule):
    """Buy when RSI(2) < x and close > SMA200; exit when close > SMA5 ('sma5') or RSI(2) > 70 ('rsi70')."""
    c = C[asset]
    r, s200, s5 = rsi(c), sma(c, 200), sma(c, 5)
    state, out = 0, []
    for d in C.index:
        if not state and r[d] < x and c[d] > s200[d]:
            state = 1
        elif state and ((exit_rule == "sma5" and c[d] > s5[d]) or (exit_rule == "rsi70" and r[d] > 70)):
            state = 0
        out.append(state)
    W = pd.DataFrame(0.0, index=C.index, columns=C.columns)
    W[asset] = out
    return W


def momentum_stocks(C, stocks, k, filt):
    """SECOND CHECK ONLY (survivor-biased list): month-end top-k large caps by 12-1 month momentum."""
    mom = C[stocks].shift(21) / C[stocks].shift(252) - 1
    up = C["SPY"] > sma(C["SPY"], 200)
    me = month_ends(C.index)
    W, cur = pd.DataFrame(0.0, index=C.index, columns=C.columns), []
    for d in C.index:
        if d in me:
            r = mom.loc[d].dropna()
            cur = list(r.sort_values(ascending=False).index[:k]) if len(r) >= k else []
        if cur and (not filt or bool(up.loc[d])):
            W.loc[d, cur] = 1.0 / len(cur)
    return W


def families(sectors, stocks):
    """{family: [(name, fn(C) -> W)]}"""
    f = {"trend": [], "dual_momentum": [], "sector_rotation": [], "rsi2": [], "stocks_momentum (survivor-biased)": []}
    for a, n, b, off in itertools.product(["SPY", "QQQ"], [100, 150, 200], [0.0, 0.02], ["cash", "IEF"]):
        f["trend"].append((f"{a} > SMA{n} band {b:.0%} else {off}", lambda C, a=a, n=n, b=b, off=off: trend(C, a, n, b, off)))
    for m, safe in itertools.product([3, 6, 9, 12], ["IEF", "cash"]):
        f["dual_momentum"].append((f"best of SPY/QQQ/IWM by {m}m, else {safe}", lambda C, m=m, safe=safe: dual_momentum(C, ["SPY", "QQQ", "IWM"], m, safe)))
    for m, k, flt in itertools.product([3, 6, 12], [1, 2, 3], [True, False]):
        f["sector_rotation"].append((f"top {k} sectors by {m}m{' if SPY > SMA200' if flt else ''}", lambda C, m=m, k=k, flt=flt: sector_rotation(C, sectors, m, k, flt)))
    for a, x, ex in itertools.product(["SPY", "QQQ"], [5, 10, 15], ["sma5", "rsi70"]):
        f["rsi2"].append((f"{a} RSI2 < {x} above SMA200, exit {ex}", lambda C, a=a, x=x, ex=ex: rsi2(C, a, x, ex)))
    for k, flt in itertools.product([3, 5, 10], [True, False]):
        f["stocks_momentum (survivor-biased)"].append((f"top {k} large caps by 12-1m{' if SPY > SMA200' if flt else ''}", lambda C, k=k, flt=flt: momentum_stocks(C, stocks, k, flt)))
    return f
