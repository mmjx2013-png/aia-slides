"""A library of ~45 standard technical indicators, computed from daily bars.

Code only computes numbers; the chart analyst (an LLM) reads a compact table.
Every indicator on day t uses bars up to and including t only.
"""
import numpy as np
import pandas as pd


def _ema(s, n):
    return s.ewm(span=n, adjust=False, min_periods=n).mean()


def _rsi(c, n):
    d = c.diff()
    up = d.clip(lower=0).ewm(alpha=1 / n, adjust=False, min_periods=n).mean()
    dn = (-d.clip(upper=0)).ewm(alpha=1 / n, adjust=False, min_periods=n).mean()
    return 100 - 100 / (1 + up / dn.replace(0, np.nan))


def compute(df, idx_close=None):
    """df: one stock's daily bars (open, high, low, close, volume, adjclose).
    Returns a DataFrame of indicators, one row per day."""
    o, h, l, c, v = (df[k] for k in ("open", "high", "low", "close", "volume"))
    a = df["adjclose"]
    out = {}
    # --- returns (dividend-adjusted) ---
    for n, lab in ((5, "ret_1w"), (21, "ret_1m"), (63, "ret_3m"), (126, "ret_6m"), (252, "ret_12m")):
        out[lab] = a / a.shift(n) - 1
    out["mom_12_1"] = a.shift(21) / a.shift(252) - 1
    # --- trend ---
    for n in (10, 20, 50, 100, 200):
        out[f"dist_sma{n}"] = c / c.rolling(n).mean() - 1
    out["dist_ema20"] = c / _ema(c, 20) - 1
    out["sma50_over_200"] = c.rolling(50).mean() / c.rolling(200).mean() - 1
    out["sma200_slope_20d"] = c.rolling(200).mean().pct_change(20, fill_method=None)
    ema12, ema26 = _ema(c, 12), _ema(c, 26)
    macd = ema12 - ema26
    sig = _ema(macd, 9)
    out["macd_pct"] = macd / c
    out["macd_hist_pct"] = (macd - sig) / c
    # ADX / DMI (14)
    tr = pd.concat([h - l, (h - c.shift()).abs(), (l - c.shift()).abs()], axis=1).max(axis=1)
    atr = tr.ewm(alpha=1 / 14, adjust=False, min_periods=14).mean()
    upm, dnm = h.diff(), -l.diff()
    pdm = upm.where((upm > dnm) & (upm > 0), 0.0)
    ndm = dnm.where((dnm > upm) & (dnm > 0), 0.0)
    pdi = 100 * pdm.ewm(alpha=1 / 14, adjust=False).mean() / atr
    ndi = 100 * ndm.ewm(alpha=1 / 14, adjust=False).mean() / atr
    dx = 100 * (pdi - ndi).abs() / (pdi + ndi).replace(0, np.nan)
    out["adx14"] = dx.ewm(alpha=1 / 14, adjust=False).mean()
    out["plus_di"], out["minus_di"] = pdi, ndi
    # Ichimoku (9/26/52), as distances from the close
    tenkan = (h.rolling(9).max() + l.rolling(9).min()) / 2
    kijun = (h.rolling(26).max() + l.rolling(26).min()) / 2
    span_a = ((tenkan + kijun) / 2).shift(26)
    span_b = ((h.rolling(52).max() + l.rolling(52).min()) / 2).shift(26)
    out["ichi_tenkan_kijun"] = (tenkan - kijun) / c
    out["ichi_above_cloud"] = c / pd.concat([span_a, span_b], axis=1).max(axis=1) - 1
    out["aroon_up"] = h.rolling(26).apply(np.argmax, raw=True) / 25 * 100
    out["aroon_down"] = l.rolling(26).apply(np.argmin, raw=True) / 25 * 100
    # --- momentum oscillators ---
    out["rsi2"], out["rsi14"] = _rsi(c, 2), _rsi(c, 14)
    ll, hh = l.rolling(14).min(), h.rolling(14).max()
    k = 100 * (c - ll) / (hh - ll).replace(0, np.nan)
    out["stoch_k"], out["stoch_d"] = k, k.rolling(3).mean()
    out["williams_r"] = k - 100
    tp = (h + l + c) / 3
    md = tp.rolling(20).apply(lambda x: np.abs(x - x.mean()).mean(), raw=True)
    out["cci20"] = (tp - tp.rolling(20).mean()) / (0.015 * md)
    out["roc10"] = c.pct_change(10, fill_method=None)
    # --- volatility ---
    r = a.pct_change(fill_method=None)
    out["vol20"] = r.rolling(20).std() * np.sqrt(252)
    out["vol60"] = r.rolling(60).std() * np.sqrt(252)
    out["atr14_pct"] = atr / c
    mid, sd = c.rolling(20).mean(), c.rolling(20).std()
    out["bb_pctb"] = (c - (mid - 2 * sd)) / (4 * sd)
    out["bb_width"] = 4 * sd / mid
    kc_up, kc_dn = _ema(c, 20) + 2 * atr, _ema(c, 20) - 2 * atr
    out["keltner_pos"] = (c - kc_dn) / (kc_up - kc_dn)
    out["dd_52w_high"] = c / h.rolling(252, min_periods=60).max() - 1
    out["from_52w_low"] = c / l.rolling(252, min_periods=60).min() - 1
    out["donchian20_pos"] = (c - l.rolling(20).min()) / (h.rolling(20).max() - l.rolling(20).min())
    # --- volume ---
    out["vol_ratio_20_120"] = v.rolling(20).mean() / v.rolling(120).mean()
    obv = (np.sign(c.diff()).fillna(0) * v).cumsum()
    out["obv_slope_20"] = (obv - obv.shift(20)) / v.rolling(20).mean() / 20
    mfm = ((c - l) - (h - c)) / (h - l).replace(0, np.nan)
    out["cmf20"] = (mfm * v).rolling(20).sum() / v.rolling(20).sum()
    mf = tp * v
    pos = mf.where(tp > tp.shift(), 0.0).rolling(14).sum()
    neg = mf.where(tp < tp.shift(), 0.0).rolling(14).sum()
    out["mfi14"] = 100 - 100 / (1 + pos / neg.replace(0, np.nan))
    out["turnover_mthb"] = (c * v).rolling(20).mean() / 1e6
    # --- relative to the index ---
    if idx_close is not None:
        ic = idx_close.reindex(df.index)
        out["rel_ret_3m"] = out["ret_3m"] - (ic / ic.shift(63) - 1)
        rr, ir = r, ic.pct_change(fill_method=None)
        out["beta_120"] = rr.rolling(120).cov(ir) / ir.rolling(120).var()
    return pd.DataFrame(out)


def table(frames, day, cols=None, digits=3):
    """Compact CSV text (one row per stock) for `day`, rounded to save tokens."""
    rows = {t: f.loc[day] for t, f in frames.items() if day in f.index}
    df = pd.DataFrame(rows).T
    if cols:
        df = df[cols]
    return df.round(digits).to_csv()
