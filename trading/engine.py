"""A small, honest daily paper-trading simulator.

Rules (same for every strategy and the equal-weight benchmark):
- Long-only cash account, no leverage, no shorting.
- Decide at day t's close; orders fill at day t+1's OPEN.
- Lots of 100 shares; you cannot buy a fraction of a lot.
- Cost per side = 0.17% commission (incl. VAT) + 0.05% slippage = 0.22% of value.
- Dividends: cash on the ex-date, minus Thailand's 10% withholding tax.
- A stock with no bar on a day cannot be traded that day.
"""
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

COMMISSION = 0.0017
SLIPPAGE = 0.0005
COST = COMMISSION + SLIPPAGE
LOT = 100
DIV_TAX = 0.10


@dataclass
class Result:
    name: str
    equity: pd.Series
    trades: list = field(default_factory=list)
    costs: float = 0.0
    traded_value: float = 0.0
    stops: int = 0


def simulate(name, decide, P, start, end, capital=100_000.0, dd_stop=None,
             cooldown=21, band=0.25, lot=LOT):
    """Run one strategy.

    decide(date, force) -> dict {ticker: weight} or None (= keep holdings).
    dd_stop: e.g. 0.15 -> if equity falls 15% below its peak, sell everything,
             wait `cooldown` trading days, then re-enter (peak is reset).
    band: skip a rebalance trade on a stock already held when it would move
          the position by less than this fraction of its target (avoids
          paying costs for tiny top-ups).
    """
    O, C, D = P["open"], P["close"], P["div"]
    Cf = C.ffill()  # last known close, for valuing a stock with no bar today
    dates = C.index[(C.index >= start) & (C.index <= end)]
    cash, sh = capital, {}
    pending, peak, locked, force = None, capital, 0, True
    eq, res = [], Result(name, None)

    for d in dates:
        # 1) dividends for shares held overnight (ex-date = today)
        for t, n in sh.items():
            amt = D.at[d, t]
            if amt > 0:
                cash += n * amt * (1 - DIV_TAX)

        # 2) fill yesterday's decision at today's open
        if pending is not None:
            opens = O.loc[d]
            value = cash + sum(n * (opens[t] if opens[t] == opens[t] else Cf.at[d, t])
                               for t, n in sh.items())
            budget = value * (1 - COST)
            target = {}
            for t, w in pending.items():
                px = opens.get(t, np.nan)
                if w > 0 and px == px and px > 0:
                    target[t] = int(budget * w / (px * lot)) * lot
            # sells first (anything not in target, or above target)
            for t in list(sh):
                px = opens[t]
                if px != px:            # no bar today: cannot trade, keep it
                    continue
                tgt = target.get(t, 0)
                diff = sh[t] - tgt
                if diff <= 0:
                    continue
                if tgt > 0 and diff < band * tgt:
                    continue
                v = diff * px
                cash += v * (1 - COST)
                res.costs += v * COST
                res.traded_value += v
                res.trades.append((d, t, "SELL", diff, px, v * COST))
                sh[t] -= diff
                if sh[t] == 0:
                    del sh[t]
            # then buys, as far as cash allows
            for t, tgt in target.items():
                px = opens[t]
                cur = sh.get(t, 0)
                diff = tgt - cur
                if diff <= 0 or (cur > 0 and diff < band * tgt):
                    continue
                afford = int(cash / (px * (1 + COST) * lot)) * lot
                diff = min(diff, afford)
                if diff <= 0:
                    continue
                v = diff * px
                cash -= v * (1 + COST)
                res.costs += v * COST
                res.traded_value += v
                res.trades.append((d, t, "BUY", diff, px, v * COST))
                sh[t] = cur + diff
            pending = None

        # 3) mark to market at the close
        value = cash + sum(n * Cf.at[d, t] for t, n in sh.items())
        eq.append(value)

        # 4) drawdown stop, then the strategy's decision for tomorrow's open
        peak = max(peak, value)
        if locked > 0:
            locked -= 1
            if locked == 0:
                peak, force = value, True
            continue
        if dd_stop and value < peak * (1 - dd_stop) and sh:
            pending, locked = {}, cooldown
            res.stops += 1
            continue
        w = decide(d, force)
        if w is not None:
            pending, force = w, False

    res.equity = pd.Series(eq, index=dates, name=name)
    return res


def metrics(res, rf=0.02):
    e = res.equity
    r = e.pct_change().dropna()
    years = (e.index[-1] - e.index[0]).days / 365.25
    total = e.iloc[-1] / e.iloc[0] - 1
    cagr = (e.iloc[-1] / e.iloc[0]) ** (1 / years) - 1
    vol = r.std() * np.sqrt(252)
    sharpe = (r.mean() - rf / 252) / r.std() * np.sqrt(252) if r.std() > 0 else np.nan
    mdd = (e / e.cummax() - 1).min()
    return dict(strategy=res.name, total=total, cagr=cagr, maxdd=mdd, vol=vol,
                sharpe=sharpe, trades=len(res.trades),
                turnover=res.traded_value / e.mean() / years if years > 0 else np.nan,
                costs=res.costs, stops=res.stops)
