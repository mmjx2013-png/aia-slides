"""Daily-bar backtester for a 70 USD cash account (Webull Thailand costs). PAPER ONLY.

- A strategy is a DataFrame of target weights, one row per trading day t, decided on the CLOSE of t using data up to t.
  The weights are executed at the OPEN of t+1 (no look-ahead). The rest of equity is cash (0% interest, conservative).
- Fractional shares, no leverage (weights sum <= 1), no shorting.
- Costs each side: commission 0.10% + 7% VAT = 0.107%, slippage 0.05%; sells also pay the SEC fee (0.00278%,
  the 27.80 USD per million rate; FINRA TAF ignored, it is fractions of a cent here).
- A holding is only traded when its target weight moves by more than 2% of equity, or goes to / from zero
  (no drift-trading).
- Prices are total-return adjusted (data.py), so dividends are reinvested.
"""
import numpy as np
import pandas as pd

COMM = 0.0010 * 1.07
SLIP = 0.0005
SEC = 0.0000278
BAND = 0.02
CAPITAL = 70.0


def simulate(W, O, C, start, end, capital=CAPITAL, costs=True):
    """W, O, C: DataFrames (dates x symbols). Returns (equity Series, trades list, total costs).
    Numpy loop over the traded symbols only."""
    used = [s for s in W.columns if (W[s].fillna(0) != 0).any()]
    days = C.index[(C.index >= pd.Timestamp(start)) & (C.index <= pd.Timestamp(end))]
    if not used:
        return pd.Series(capital, index=days), [], 0.0
    pos = C.index.get_indexer(days)
    o, c = O[used].values, C[used].values
    w = W[used].reindex(C.index).fillna(0.0).values
    n = len(used)
    cash, sh, basis = capital, np.zeros(n), np.zeros(n)
    eq, trades, paid = np.empty(len(days)), [], 0.0
    comm, slip, sec = (COMM, SLIP, SEC) if costs else (0.0, 0.0, 0.0)
    for k, i in enumerate(pos):
        if k > 0:
            tgt, px = w[pos[k - 1]], o[i]
            ok = ~np.isnan(px)
            val = cash + np.nansum(np.where(ok & (sh > 0), sh * px, 0.0))
            cur = np.where(ok & (sh > 0), sh * np.nan_to_num(px) / val, 0.0)
            dw = tgt - cur
            trade = ok & ((np.abs(dw) > BAND) | ((tgt == 0) != (cur == 0)))
            for s in np.argsort(dw):                                # sells first
                if not trade[s] or dw[s] == 0:
                    continue
                if dw[s] < 0:
                    q = sh[s] if tgt[s] == 0 else min(sh[s], -dw[s] * val / px[s])
                    gross = q * px[s] * (1 - slip)
                    fee = gross * (comm + sec)
                    cash += gross - fee
                    paid += fee + q * px[s] * slip
                    if tgt[s] == 0:
                        trades.append(dict(sym=used[s], exit=days[k], pnl=gross - fee - basis[s],
                                           ret=(gross - fee) / basis[s] - 1 if basis[s] else 0.0))
                        basis[s], sh[s] = 0.0, 0.0
                    else:
                        basis[s] -= basis[s] * q / sh[s]
                        sh[s] -= q
                else:
                    spend = min(dw[s] * val, cash)
                    if spend <= 1e-9:
                        continue
                    fee = spend * comm / (1 + comm)
                    q = (spend - fee) / (px[s] * (1 + slip))
                    cash -= spend
                    paid += fee + q * px[s] * slip
                    sh[s] += q
                    basis[s] += spend
        ci = c[i]
        eq[k] = cash + np.nansum(np.where(sh > 0, sh * np.nan_to_num(ci), 0.0))
    return pd.Series(eq, index=days), trades, paid


def metrics(eq, trades, paid=0.0):
    r = eq.pct_change().dropna()
    yrs = (eq.index[-1] - eq.index[0]).days / 365.25
    cagr = (eq.iloc[-1] / eq.iloc[0]) ** (1 / yrs) - 1 if yrs > 0 else np.nan
    sharpe = r.mean() / r.std() * np.sqrt(252) if r.std() > 0 else np.nan
    dd = (eq / eq.cummax() - 1).min()
    wins = [t for t in trades if t["pnl"] > 0]
    return dict(cagr=cagr, sharpe=sharpe, maxdd=dd, trades_yr=len(trades) / yrs if yrs else np.nan,
                win=len(wins) / len(trades) if trades else np.nan, n_trades=len(trades), final=eq.iloc[-1], costs_usd=paid,
                exposure=None)


def run(W, O, C, start, end):
    """Net and gross (no costs) metrics; cost drag = gross CAGR - net CAGR."""
    eq, tr, paid = simulate(W, O, C, start, end)
    g, gt, _ = simulate(W, O, C, start, end, costs=False)
    m = metrics(eq, tr, paid)
    m["cost_drag"] = metrics(g, gt)["cagr"] - m["cagr"]
    m["exposure"] = float((W.reindex(eq.index).fillna(0).sum(axis=1) > 0).mean())
    return m, eq
