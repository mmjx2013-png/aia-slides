"""Setup search on 15m and 1h with wider stops and holds up to 2 days. Code only, 0 tokens. PAPER research.

Same engine and rules as search.py (fill at the next 1m open, 0.35 USD/oz each side, stop wins a tie,
gap fills at the open, one position at a time, IS = first 2/3, OOS = last 1/3), except:
- signals on CLOSED 15m or 1h bars; stop = k x ATR14 of that timeframe, k in {1.5, 2.5};
- max hold 2 days; forced exit at the weekend close (Sat 04:00 Bangkok); entries any weekday hour
  (the live desk would have to hold overnight to trade these);
- exits: fixed 1.5R/2R/3R, BE@1R + 2R/3R, ATR trail, time stop 4 h and 24 h;
- filters: calendar proxy on/off x session {all, London+NY 07-20 UTC}.
  python3 search_htf.py  -> ../reports/setup_search_htf.md
"""
import itertools
import time

import numpy as np
import pandas as pd

import search as S
from search import indicators, resample, one_at_a_time, stats, load, HIST, HERE

S.MAX_HOLD = 2 * 1440
S.EXITS = ["fixed 1.5R", "fixed 2R", "fixed 3R", "BE@1R + 2R", "BE@1R + 3R", "ATR trail", "time 240m", "time 1440m"]


def signals(m, mins):
    out = {}
    c, h, l, v = m["c"], m["h"], m["l"], m["v"]
    for n, vm in itertools.product((10, 20, 40), (0.0, 1.5)):
        vok = v > vm * m["vavg"] if vm else True
        out[f"breakout donchian{n}" + (f" vol>{vm}x" if vm else "")] = S._sig(
            m, (c > h.rolling(n).max().shift(1)) & vok, (c < l.rolling(n).min().shift(1)) & vok, minutes=mins)
    e20, e50, e200 = (c.ewm(span=n, adjust=False, min_periods=n).mean() for n in (20, 50, 200))
    for use200 in (False, True):
        upt = (e20 > e50) & ((e50 > e200) if use200 else True)
        dnt = (e20 < e50) & ((e50 < e200) if use200 else True)
        pb_up = upt & (l.shift(1) <= e20.shift(1)) & (c > e20) & (c > m["o"])
        pb_dn = dnt & (h.shift(1) >= e20.shift(1)) & (c < e20) & (c < m["o"])
        out["trend pullback EMA20" + (" +EMA200" if use200 else "")] = S._sig(m, pb_up, pb_dn, minutes=mins)
    for a, b in ((e20, e50), (e50, e200)):
        name = "EMA20x50" if a is e20 else "EMA50x200"
        out[f"ma cross {name}"] = S._sig(m, (a > b) & (a.shift(1) <= b.shift(1)), (a < b) & (a.shift(1) >= b.shift(1)), minutes=mins)
    for r, z in itertools.product((25, 30), (2.0, 2.5)):
        out[f"mean_reversion rsi{r}/{100-r} z{z}"] = S._sig(m, (m["rsi"] < r) & (m["z"] < -z), (m["rsi"] > 100 - r) & (m["z"] > z), minutes=mins)
    bbw = m["bbw"].shift(1)
    for q, rm in itertools.product((0.1, 0.2), (1.5, 2.0)):
        sq, big = bbw <= bbw.rolling(100).quantile(q), m["rng"] > rm * m["atr"].shift(1)
        out[f"vol_expansion q={q} rng>{rm}xATR"] = S._sig(m, sq & big & (c >= m["o"]), sq & big & (c < m["o"]), minutes=mins)
    return out


def main():
    t0 = time.time()
    df = load()
    T = df["t"].to_numpy()
    A = tuple(df[k].to_numpy() for k in ("o", "h", "l", "c")) + (T,)
    ts = df.index
    bkk = ts.tz_convert("Asia/Bangkok")
    wk = bkk.weekday
    weekend = ((wk == 5) & (bkk.hour >= 4)) | (wk == 6) | ((wk == 0) & (bkk.hour < 5))
    # forced exit: next weekend start (first weekend bar after each bar)
    wk_idx = np.flatnonzero(weekend)
    nxt = np.searchsorted(wk_idx, np.arange(len(ts)))
    force_end = np.where(nxt < len(wk_idx), wk_idx[np.minimum(nxt, len(wk_idx) - 1)], len(ts) - 1)
    utc_min = ts.hour * 60 + ts.minute
    ny = ts.tz_convert("America/New_York")
    nym = ny.hour * 60 + ny.minute
    sess = {"all": ~weekend, "london+ny": ~weekend & (utc_min >= 7 * 60) & (utc_min < 20 * 60)}
    cal_block = (ny.weekday < 5) & ((np.abs(nym - 8 * 60 - 30) <= 30) | (np.abs(nym - 10 * 60) <= 30))
    split_t = ts[0] + (ts[-1] - ts[0]) * 2 / 3
    split_i = np.searchsorted(ts, split_t)
    print(f"loaded {len(df)} bars; split {split_t:%Y-%m-%d}", flush=True)
    results = []
    for tf, mins in (("15m", 15), ("1h", 60)):
        m = indicators(resample(df, mins))
        atr = pd.Series(m["atr"].values, index=m["end"]).reindex(ts, method="ffill").to_numpy()
        for (name, sig), (dname, dm), k in itertools.product(signals(m, mins).items(), (("follow", 1), ("fade", -1)), (1.5, 2.5)):
            S.STOP_ATR = k
            tr = S.simulate(sig, dm, A, atr, force_end)
            if tr.empty:
                continue
            e = tr["entry"].to_numpy()
            for cal, sname in itertools.product((False, True), sess):
                sub = tr[sess[sname][e] & (~cal_block[e] if cal else True)]
                for ex in S.EXITS:
                    kk = one_at_a_time(sub["entry"].to_numpy(), sub[f"X:{ex}"].to_numpy())
                    s2 = sub.iloc[kk]
                    r = s2[f"R:{ex}"].to_numpy()
                    is_ = s2["entry"].to_numpy() < split_i
                    a, b = stats(r[is_]), stats(r[~is_])
                    hold = (s2[f"X:{ex}"] - s2["entry"]).median() / 60 if len(s2) else np.nan
                    results.append(dict(tf=tf, setup=name, dir=dname, stop=f"{k}xATR", exit=ex, calendar="on" if cal else "off",
                                        session=sname, med_hold_h=hold, **{f"is_{x}": y for x, y in a.items()},
                                        **{f"oos_{x}": y for x, y in b.items()}))
            print(f"{tf} {name} {dname} {k}: {len(tr)} signals ({time.time()-t0:.0f}s)", flush=True)
    res = pd.DataFrame(results)
    res.to_csv(HIST / "search_htf_results.csv", index=False)
    report(res, df, split_t, time.time() - t0)


def report(res, df, split_t, secs):
    n = len(res)
    v = res[res.oos_n >= 100]
    sel = res[(res.is_n >= 100) & (res.is_exp > 0)]
    keep = sel[(sel.oos_n >= 100) & (sel.oos_exp > 0)].sort_values("oos_t", ascending=False)
    low = res[(res.is_exp > 0) & (res.oos_exp > 0) & (res.oos_n >= 30) & (res.oos_n < 100)].sort_values("oos_t", ascending=False)
    cols = ["tf", "setup", "dir", "stop", "exit", "calendar", "session", "med_hold_h", "is_n", "is_exp", "oos_n", "oos_exp",
            "oos_win", "oos_avg_win", "oos_avg_loss", "oos_pf", "oos_t"]
    fmt = lambda d: d.to_markdown(index=False, floatfmt=".3f") if len(d) else "(none)"
    g = lambda by: fmt(v.groupby(by)[["oos_exp"]].median().reset_index()) if len(v) else "(none)"
    md = f"""# Intraday setup search, 15m and 1h with wider stops (PAXG/USDT), code only

PAPER research. Data {df.index[0]:%Y-%m-%d} to {df.index[-1]:%Y-%m-%d}; in-sample before {split_t:%Y-%m-%d}, out-of-sample after.
Costs 0.35 USD/oz each side included. R = P&L / stop distance. Holds up to 2 days; forced exit at the weekend. Run {secs:.0f} s.

## Multiple-testing warning
**{n:,} variants tried.** Variants with >= 100 OOS trades: {len(v):,}; of these {(v.oos_exp > 0).mean() if len(v) else 0:.0%} are positive OOS.
Selection: IS expectancy > 0 with >= 100 trades, then OOS > 0 with >= 100 trades. OOS t >= 2 is the stronger bar.

## Result
- Passed IS: {len(sel):,}. Passed OOS (> 0, >= 100 trades): **{len(keep):,}**; with OOS t >= 2: **{(keep.oos_t >= 2).sum():,}**.

### Survivors (>= 100 OOS trades), best 25 by OOS t-stat
{fmt(keep[cols].head(25))}

### Fewer than 100 OOS trades (30-99), positive IS and OOS, best 15 by t-stat (mostly 1h; treat as weak)
{fmt(low[cols].head(15))}

### Median OOS expectancy by timeframe and stop (variants with >= 100 OOS trades)
{g(['tf', 'stop'])}

### By exit
{g('exit')}

### By family (first word of the setup)
{fmt(v.assign(family=v.setup.str.split().str[0]).groupby(['tf', 'family'])[['oos_exp']].median().reset_index()) if len(v) else '(none)'}
"""
    (HERE.parent / "reports" / "setup_search_htf.md").write_text(md)
    print(HERE.parent / "reports" / "setup_search_htf.md")


if __name__ == "__main__":
    main()
