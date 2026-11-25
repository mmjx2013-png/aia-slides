"""Four well-known strategy families. Each returns a decide(date, force) function.

All indicators are rolling windows that end at day t, so a decision made at
t's close uses only data up to t (no look-ahead).
"""
import pandas as pd


def _first_of(period, cal):
    """Trading days that are the first of a new month ('M') or week ('W')."""
    s = pd.Series(cal, index=cal)
    key = s.dt.to_period(period)
    return set(cal[key.ne(key.shift())])


def _eligible(P, d, need):
    """Stocks with a bar today and at least `need` days of history."""
    c = P["close"]
    hist = P["_count"].loc[d]
    return [t for t in c.columns if c.at[d, t] == c.at[d, t] and hist[t] > need]


def _equal(names):
    return {t: 1.0 / len(names) for t in names} if names else {}


def prepare(P):
    P["_count"] = P["close"].notna().cumsum()
    return P


def momentum(P, lookback=252, top=10, skip=21):
    """Hold the `top` stocks with the best return from t-lookback to t-skip.
    Monthly rebalance. Uses dividend-adjusted prices for the ranking."""
    a = P["adj"].ffill()
    score = a.shift(skip) / a.shift(lookback) - 1
    months = _first_of("M", P["close"].index)

    def decide(d, force):
        if d not in months and not force:
            return None
        names = _eligible(P, d, lookback)
        s = score.loc[d, names].dropna().sort_values(ascending=False)
        return _equal(list(s.index[:top]))
    return decide


def trend(P, idx_close, sma=200, inner=None):
    """When the SET50 index closes above its `sma`-day average, be invested
    (equal-weight all stocks, or the `inner` strategy's picks); otherwise cash.
    Acts on the day the signal flips and at each month start."""
    above = idx_close > idx_close.rolling(sma).mean()
    months = _first_of("M", P["close"].index)
    state = {"on": None}

    def decide(d, force):
        on = bool(above.get(d, False))
        flip = on != state["on"]
        state["on"] = on
        if not on:
            return {} if (flip or force) else None
        if not (flip or force or d in months):
            return None
        if inner is not None:
            return inner(d, True)
        return _equal(_eligible(P, d, 60))
    return decide


def mean_reversion(P, lookback=5, top=10, sma=200):
    """Weekly: among stocks in a long-term uptrend (close > 200-day average),
    buy the `top` biggest losers of the last `lookback` days."""
    c = P["close"].ffill()
    a = P["adj"].ffill()
    ret = a / a.shift(lookback) - 1
    up = c > c.rolling(sma).mean()
    weeks = _first_of("W", P["close"].index)

    def decide(d, force):
        if d not in weeks and not force:
            return None
        names = [t for t in _eligible(P, d, sma) if up.at[d, t]]
        s = ret.loc[d, names].dropna().sort_values()
        return _equal(list(s.index[:top]))
    return decide


def low_vol(P, window=250, top=10):
    """Monthly: hold the `top` stocks with the lowest daily volatility."""
    a = P["adj"].ffill()
    vol = a.pct_change(fill_method=None).rolling(window, min_periods=int(window * 0.8)).std()
    months = _first_of("M", P["close"].index)

    def decide(d, force):
        if d not in months and not force:
            return None
        names = _eligible(P, d, window)
        s = vol.loc[d, names].dropna().sort_values()
        return _equal(list(s.index[:top]))
    return decide


def buy_and_hold_equal(P):
    """Benchmark: buy every available stock equally on day one, then never trade."""
    def decide(d, force):
        return _equal(_eligible(P, d, 0)) if force else None
    return decide
