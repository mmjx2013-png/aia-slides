"""Setup search: which rule-based setups have positive expectancy AFTER COSTS, out of sample?
Code only, 0 tokens. PAPER research.

Data: data/history/*.csv.gz (1m PAXGUSDT). In-sample = first 2/3 of the dates, out-of-sample = last 1/3.
Every trade: signal on a closed bar -> fill at the next 1m open; cost 0.35 USD/oz each side
(0.25 half spread + 0.10 slippage); stop = 1.5 x ATR14(5m) at the signal; the stop wins a same-bar
tie; max hold 240 min; forced exit at 20:30 UTC (03:30 Bangkok); one position at a time per variant;
no entries outside 07:00-20:30 UTC (live entry hours) or at the weekend (Sat 04:00 - Mon 05:00 Bangkok).
Results are in R = P&L / stop distance, after costs.

Grid: 4 families x params x {follow, fade} x 8 exits x {calendar proxy off/on} x 4 sessions.
The calendar proxy blocks +/-30 min around 08:30 and 10:00 New York on weekdays (no historical calendar
on the allowed hosts; this is only a proxy for US data releases).
  python3 search.py   -> ../reports/setup_search.md and data/history/search_results.csv
"""
import itertools
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from common import indicators, resample   # noqa: E402

HIST = HERE.parent / "data" / "history"
COST = 0.35
STOP_ATR = 1.5
MAX_HOLD = 240


# ------------------------------------------------------------------ data
def load():
    df = pd.concat([pd.read_csv(f) for f in sorted(HIST.glob("PAXGUSDT_1m_*.csv.gz"))])
    df = df.drop_duplicates("t").sort_values("t")
    df.index = pd.to_datetime(df["t"], unit="ms", utc=True)
    return df


# ------------------------------------------------------------------ signals (time = bar close)
def signals(m1, m5, m15):
    out = {}
    c5 = m5
    for n, vm in itertools.product((6, 12, 24), (1.5, 2.0, 3.0)):
        up = (c5["c"] > c5["h"].rolling(n).max().shift(1)) & (c5["v"] > vm * c5["vavg"])
        dn = (c5["c"] < c5["l"].rolling(n).min().shift(1)) & (c5["v"] > vm * c5["vavg"])
        out[f"breakout n={n} vol>{vm}x"] = _sig(c5, up, dn)
    bbw = c5["bbw"].shift(1)
    for q, rm in itertools.product((0.1, 0.2), (1.5, 2.0, 2.5)):
        sq = bbw <= bbw.rolling(100).quantile(q)
        big = c5["rng"] > rm * c5["atr"].shift(1)
        out[f"vol_expansion q={q} rng>{rm}xATR"] = _sig(c5, sq & big & (c5["c"] >= c5["o"]), sq & big & (c5["c"] < c5["o"]))
    mv = m1["c"] - m1["c"].shift(3)
    st = np.sign(m1["c"].diff())
    mono_up = (st > 0) & (st.shift(1) > 0) & (st.shift(2) > 0)
    mono_dn = (st < 0) & (st.shift(1) < 0) & (st.shift(2) < 0)
    atr1 = np.maximum(m1["atr"].shift(1), 0.5)
    v3 = m1["v"].rolling(3).sum() / (3 * m1["vavg"])
    for k, vm in itertools.product((3, 4, 5), (1.0, 2.0)):
        out[f"momentum {k}xATR1 vol>{vm}x"] = _sig(m1, mono_up & (mv > k * atr1) & (v3 > vm),
                                                   mono_dn & (mv < -k * atr1) & (v3 > vm), minutes=1)
    for r, z in itertools.product((20, 25, 30), (2.0, 2.5)):
        out[f"mean_reversion rsi{r}/{100-r} z{z}"] = _sig(m15, (m15["rsi"] < r) & (m15["z"] < -z),
                                                         (m15["rsi"] > 100 - r) & (m15["z"] > z), minutes=15)
    return out


def _sig(m, up, dn, minutes=5):
    s = pd.Series(0, index=m.index)
    s[up.fillna(False)] = 1
    s[dn.fillna(False)] = -1
    s = s[s != 0]
    close = s.index + pd.Timedelta(minutes=minutes)
    return pd.Series(s.values, index=close)


# ------------------------------------------------------------------ exits
EXITS = ["fixed 1.5R", "fixed 2R", "fixed 3R", "BE@1R + 2R", "BE@1R + 3R", "ATR trail", "time 30m", "time 60m"]


def simulate(sig, dirmul, A, atr5, force_end):
    """sig: Series of dir at close time. Returns DataFrame of trades (entry_i, exit_i, R per exit rule)."""
    O, H, L, C, T = A
    idx = np.searchsorted(T, sig.index.tz_convert(None).values.astype("datetime64[ms]").astype("int64"))
    keep = idx < len(O) - 2
    idx, dirs = idx[keep], sig.values[keep] * dirmul
    rows = []
    for e, d in zip(idx, dirs):
        S = STOP_ATR * atr5[e - 1]
        if not S > 0:
            continue
        end = min(e + MAX_HOLD, force_end[e])
        if end <= e:
            continue
        o, h, l, c = O[e:end], H[e:end], L[e:end], C[e:end]
        ent = o[0] + d * COST
        fav = (h - ent) if d > 0 else (ent - l)          # favourable excursion per bar
        adv = (ent - l) if d > 0 else (h - ent)          # adverse excursion per bar
        op = (o - ent) * d
        res, exi = [], []
        for name in EXITS:
            stop = S
            if name.startswith("fixed") or name.startswith("BE"):
                R = float(name.split("+ ")[-1].replace("fixed ", "").rstrip("R"))
                tgt = R * S
                hit_s = adv >= stop
                hit_t = fav >= tgt
                if name.startswith("BE"):
                    be = np.argmax(fav >= S) if (fav >= S).any() else None
                    if be is not None:
                        hit_s = hit_s.copy()
                        hit_s[be + 1:] = adv[be + 1:] >= 0          # stop moved to entry from the next bar
                js = np.argmax(hit_s) if hit_s.any() else 10**9
                jt = np.argmax(hit_t) if hit_t.any() else 10**9
                if js <= jt and js < 10**9:
                    lvl = -stop if not (name.startswith("BE") and be is not None and js > be) else 0.0
                    px = min(op[js], lvl)                    # gap through the stop fills at the open
                    j = js
                elif jt < 10**9:
                    px, j = (max(op[jt], tgt) if jt > 0 else tgt), jt
                else:
                    j = len(o) - 1
                    px = (c[j] - ent) * d
            elif name == "ATR trail":
                best = np.maximum.accumulate(fav)
                trail = np.maximum(-S, np.concatenate([[-S], best[:-1] - S]))   # level vs entry, from prior bars
                hit = -adv <= trail
                j = np.argmax(hit) if hit.any() else len(o) - 1
                px = min(op[j], trail[j]) if hit.any() else (c[j] - ent) * d
            else:                                         # time stop with the 1.5 ATR stop
                n = int(name.split()[1].rstrip("m"))
                m = min(n, len(o))
                hit = adv[:m] >= S
                if hit.any():
                    j = np.argmax(hit)
                    px = min(op[j], -S) if j > 0 else -S
                else:
                    j = m - 1
                    px = (c[j] - ent) * d
            res.append((px - COST) / S)
            exi.append(e + j)
        rows.append((e, d, *res, *exi))
    cols = ["entry", "dir"] + [f"R:{x}" for x in EXITS] + [f"X:{x}" for x in EXITS]
    return pd.DataFrame(rows, columns=cols)


def one_at_a_time(entries, exits):
    keep, busy = [], -1
    for i, (e, x) in enumerate(zip(entries, exits)):
        if e > busy:
            keep.append(i)
            busy = x
    return np.array(keep, dtype=int)


def stats(r):
    n = len(r)
    if n == 0:
        return dict(n=0, exp=np.nan, win=np.nan, avg_win=np.nan, avg_loss=np.nan, pf=np.nan, t=np.nan)
    w, l = r[r > 0], r[r <= 0]
    return dict(n=n, exp=r.mean(), win=len(w) / n, avg_win=w.mean() if len(w) else 0, avg_loss=l.mean() if len(l) else 0,
                pf=w.sum() / -l.sum() if l.sum() < 0 else np.inf, t=r.mean() / (r.std(ddof=1) / np.sqrt(n)) if n > 1 and r.std() > 0 else np.nan)


def main():
    t0 = time.time()
    df = load()
    m1 = indicators(df)
    m5, m15 = indicators(resample(df, 5)), indicators(resample(df, 15))
    # ATR14(5m) known at each 1m bar: last COMPLETE 5m bucket
    a5 = pd.Series(m5["atr"].values, index=m5["end"]).reindex(df.index, method="ffill")
    A = tuple(df[k].to_numpy() for k in ("o", "h", "l", "c")) + (df["t"].to_numpy(),)
    ts = df.index
    bkk = ts.tz_convert("Asia/Bangkok")
    utc_min = ts.hour * 60 + ts.minute
    # forced exit index: next 20:30 UTC
    day_force = ts.normalize() + pd.Timedelta(hours=20, minutes=30)
    force_t = np.where(ts < day_force, day_force, day_force + pd.Timedelta(days=1))
    force_end = np.searchsorted(df["t"].to_numpy(), pd.DatetimeIndex(force_t).tz_localize(None).values.astype("datetime64[ms]").astype("int64") if pd.DatetimeIndex(force_t).tz is not None else pd.DatetimeIndex(force_t).values.astype("datetime64[ms]").astype("int64"))
    # filters at the ENTRY bar
    wk = bkk.weekday
    weekend = ((wk == 5) & (bkk.hour >= 4)) | (wk == 6) | ((wk == 0) & (bkk.hour < 5))
    hours_ok = (utc_min >= 7 * 60) & (utc_min < 20 * 60 + 30) & ~weekend
    ny, ldn = ts.tz_convert("America/New_York"), ts.tz_convert("Europe/London")
    nym, ldm = ny.hour * 60 + ny.minute, ldn.hour * 60 + ldn.minute
    sess = {"all": np.ones(len(ts), bool), "london": (ldm >= 8 * 60) & (ldm < 16 * 60 + 30),
            "ny": (nym >= 8 * 60) & (nym < 17 * 60)}
    sess["overlap"] = sess["london"] & sess["ny"]
    cal_block = (ny.weekday < 5) & ((np.abs(nym - 8 * 60 - 30) <= 30) | (np.abs(nym - 10 * 60) <= 30))
    split_t = ts[0] + (ts[-1] - ts[0]) * 2 / 3
    split_i = np.searchsorted(ts, split_t)
    print(f"loaded {len(df)} bars {ts[0]:%Y-%m-%d} .. {ts[-1]:%Y-%m-%d}; split {split_t:%Y-%m-%d}", flush=True)

    sigs = signals(m1, m5, m15)
    results = []
    for (name, sig), (dname, dm) in itertools.product(sigs.items(), (("follow", 1), ("fade", -1))):
        tr = simulate(sig, dm, A, a5.to_numpy(), force_end)
        if tr.empty:
            continue
        e = tr["entry"].to_numpy()
        for cal, sname in itertools.product((False, True), sess):
            ok = hours_ok[e] & sess[sname][e] & (~cal_block[e] if cal else True)
            sub = tr[ok]
            for ex in EXITS:
                k = one_at_a_time(sub["entry"].to_numpy(), sub[f"X:{ex}"].to_numpy())
                s2 = sub.iloc[k]
                r = s2[f"R:{ex}"].to_numpy()
                is_ = s2["entry"].to_numpy() < split_i
                a, b = stats(r[is_]), stats(r[~is_])
                results.append(dict(setup=name, dir=dname, exit=ex, calendar="on" if cal else "off", session=sname,
                                    **{f"is_{k2}": v for k2, v in a.items()}, **{f"oos_{k2}": v for k2, v in b.items()}))
        print(f"{name} {dname}: {len(tr)} signals ({time.time()-t0:.0f}s)", flush=True)
    res = pd.DataFrame(results)
    res.to_csv(HIST / "search_results.csv", index=False)
    report(res, df, split_t, time.time() - t0)


def report(res, df, split_t, secs):
    n = len(res)
    sel = res[(res.is_n >= 100) & (res.is_exp > 0)]
    keep = sel[(sel.oos_n >= 100) & (sel.oos_exp > 0)].sort_values("oos_exp", ascending=False)
    strong = keep[keep.oos_t >= 2]
    base = res[(res.exit == "fixed 2R") & (res.calendar == "off") & (res.session == "all") & (res.dir == "follow")]
    chance = (res[(res.oos_n >= 100)].oos_exp > 0).mean()
    fmt = lambda d: d.to_markdown(index=False, floatfmt=".3f") if len(d) else "(none)"
    cols = ["setup", "dir", "exit", "calendar", "session", "is_n", "is_exp", "oos_n", "oos_exp", "oos_win", "oos_avg_win", "oos_avg_loss", "oos_pf", "oos_t"]
    md = f"""# Intraday setup search (PAXG/USDT 1m), code only

PAPER research. Data {df.index[0]:%Y-%m-%d} to {df.index[-1]:%Y-%m-%d} ({len(df):,} 1m bars).
In-sample before {split_t:%Y-%m-%d}, out-of-sample after it. Costs 0.35 USD/oz each side are included.
R = P&L / stop distance (stop = 1.5 x ATR14 on 5m). Run time {secs:.0f} s.

## Multiple-testing warning
**{n:,} variants tried** (setup families x parameters x follow/fade x 8 exits x calendar proxy x 4 sessions).
Variants overlap heavily, so they are not independent, but with this many tries some will look good by chance.
Among variants with >= 100 out-of-sample trades, {chance:.0%} have a positive out-of-sample expectancy.
Selection: in-sample expectancy > 0 with >= 100 trades, then out-of-sample expectancy > 0 with >= 100 trades.
A t-stat >= 2 out of sample is the stronger bar; even that is not proof at this number of tries.

## Result
- Passed in-sample: {len(sel):,} variants. Of these, passed out-of-sample (> 0, >= 100 trades): **{len(keep):,}**; with OOS t >= 2: **{len(strong):,}**.

### Survivors with OOS t >= 2
{fmt(strong[cols].head(25))}

### Top 25 survivors by OOS expectancy (R per trade after costs)
{fmt(keep[cols].head(25))}

### Baseline: the current live setups (follow, fixed 2R, no filters)
{fmt(base[cols])}

### Exit rules compared (median OOS expectancy over all variants with >= 100 OOS trades)
{fmt(res[res.oos_n >= 100].groupby('exit')[['oos_exp']].median().reset_index())}

### Sessions and calendar proxy (median OOS expectancy, >= 100 OOS trades)
{fmt(res[res.oos_n >= 100].groupby(['session', 'calendar'])[['oos_exp']].median().reset_index())}
"""
    out = HERE.parent / "reports" / "setup_search.md"
    out.write_text(md)
    print(out)


if __name__ == "__main__":
    main()
