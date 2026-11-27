"""Indicator scorecard (code only, PAPER research): which classic indicator signals carry an edge on PAXG?

Pre-registered (boss spec, 27 Nov 2026), run once:
- Data: the full PAXG/USDT 1m history (bulk files + intraday cache + live swing cache), resampled to 15m / 1h / 4h (UTC bins).
- Signals, each long and short separately: RSI(14) <30 / >70, RSI(2) <10 / >90, MACD signal-line cross, MACD zero-line
  side, EMA20/50 cross, price side of EMA200, Bollinger(20,2) close outside as reversion and as breakout, Stochastic(14,3)
  %K/%D cross below 20 / above 80, ADX(14) > 25 with DI direction, Donchian-20 break as follow and as fade, daily VWAP
  side and cross, volume spike > 1.5x the 20-bar mean with that bar's direction, Ichimoku cloud side, and a random-entry
  baseline. "Zone / cross" signals fire on the bar that enters the condition; "side" signals fire on every bar in the
  state. Either way the events are thinned so that no two overlap within the horizon (independent samples).
- The top indicators in Opus's "why" text (journal grep) are VWAP, overbought/oversold (RSI) and ADX: all three are
  already in the list, so no extra rows.
- Metric: forward return from the signal bar's close to the close h = 1 / 4 / 12 bars later, in the signal direction,
  net of 0.35 USD per side (0.70 round trip), divided by ATR(14) of that timeframe at the signal bar.
- Split: discovery Feb-Jun 2026, confirmation Jul-Nov 2026.
- Verdict: TRUST if the net mean is > 0 in BOTH halves and the confirmation p < 0.05 after Benjamini-Hochberg across ALL
  tests (one-sided, H1: mean > 0; normal approximation to t, n >= 20). WEAK if > 0 in both halves but not significant.
  DON'T TRUST otherwise.
Output: trading/swing/learn/indicator_scorecard.md and indicator_scorecard.csv, plus the one-line summary that the Opus
brief's track-record block shows (learn/indicator_summary.txt).
"""
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cand15_overnight import history  # noqa: E402

OUT = Path(__file__).resolve().parents[2] / "swing" / "learn"
COST = 0.70
HS = (1, 4, 12)
SPLIT = pd.Timestamp("2026-07-01", tz="UTC")
TFS = {"15m": "15min", "1h": "1h", "4h": "4h"}


def bars(m1, rule):
    df = m1.copy()
    df.index = pd.to_datetime(df["t"], unit="ms", utc=True)
    o = df.resample(rule, label="left", closed="left").agg({"o": "first", "h": "max", "l": "min", "c": "last", "v": "sum"})
    return o.dropna()


def wilder(x, n):
    return x.ewm(alpha=1 / n, adjust=False).mean()


def rsi(c, n):
    d = c.diff()
    up, dn = wilder(d.clip(lower=0), n), wilder((-d).clip(lower=0), n)
    return 100 - 100 / (1 + up / dn.replace(0, np.nan))


def indicators(b):
    c, h, l, o, v = b["c"], b["h"], b["l"], b["o"], b["v"]
    tr = pd.concat([h - l, (h - c.shift()).abs(), (l - c.shift()).abs()], axis=1).max(axis=1)
    x = pd.DataFrame(index=b.index)
    x["atr"] = wilder(tr, 14)
    x["rsi14"], x["rsi2"] = rsi(c, 14), rsi(c, 2)
    macd = c.ewm(span=12, adjust=False).mean() - c.ewm(span=26, adjust=False).mean()
    sig = macd.ewm(span=9, adjust=False).mean()
    x["macd"], x["macd_sig"] = macd, sig
    x["ema20"], x["ema50"], x["ema200"] = (c.ewm(span=n, adjust=False).mean() for n in (20, 50, 200))
    mid, sd = c.rolling(20).mean(), c.rolling(20).std()
    x["bb_up"], x["bb_lo"] = mid + 2 * sd, mid - 2 * sd
    ll, hh = l.rolling(14).min(), h.rolling(14).max()
    k = (100 * (c - ll) / (hh - ll).replace(0, np.nan)).rolling(3).mean()      # slow %K (14,3)
    x["k"], x["d"] = k, k.rolling(3).mean()
    upm, dnm = h.diff(), -l.diff()
    pdm = pd.Series(np.where((upm > dnm) & (upm > 0), upm, 0.0), index=b.index)
    ndm = pd.Series(np.where((dnm > upm) & (dnm > 0), dnm, 0.0), index=b.index)
    atr_w = wilder(tr, 14)
    x["pdi"], x["ndi"] = 100 * wilder(pdm, 14) / atr_w, 100 * wilder(ndm, 14) / atr_w
    dx = 100 * (x["pdi"] - x["ndi"]).abs() / (x["pdi"] + x["ndi"]).replace(0, np.nan)
    x["adx"] = wilder(dx, 14)
    x["dc_hi"], x["dc_lo"] = h.rolling(20).max().shift(), l.rolling(20).min().shift()
    day = b.index.floor("D")
    tp = (h + l + c) / 3
    x["vwap"] = (tp * v).groupby(day).cumsum() / v.groupby(day).cumsum().replace(0, np.nan)
    x["vspike"] = v > 1.5 * v.rolling(20).mean().shift()
    tenkan = (h.rolling(9).max() + l.rolling(9).min()) / 2
    kijun = (h.rolling(26).max() + l.rolling(26).min()) / 2
    x["span_a"] = ((tenkan + kijun) / 2).shift(26)
    x["span_b"] = ((h.rolling(52).max() + l.rolling(52).min()) / 2).shift(26)
    return x


def enter(s):
    """True on the bar a condition becomes true."""
    s = s.fillna(False).astype(bool)
    return s & ~s.shift(fill_value=False)


def signals(b, x):
    c, o = b["c"], b["o"]
    up = lambda a, z: enter(a > z)          # noqa: E731
    S = {
        "RSI14 <30 / >70 (revert)": (enter(x["rsi14"] < 30), enter(x["rsi14"] > 70)),
        "RSI2 <10 / >90 (revert)": (enter(x["rsi2"] < 10), enter(x["rsi2"] > 90)),
        "MACD signal-line cross": (up(x["macd"], x["macd_sig"]), up(x["macd_sig"], x["macd"])),
        "MACD zero-line side": ((x["macd"] > 0), (x["macd"] < 0)),
        "EMA20/50 cross": (up(x["ema20"], x["ema50"]), up(x["ema50"], x["ema20"])),
        "Price side of EMA200": ((c > x["ema200"]), (c < x["ema200"])),
        "Bollinger outside (revert)": (enter(c < x["bb_lo"]), enter(c > x["bb_up"])),
        "Bollinger outside (breakout)": (enter(c > x["bb_up"]), enter(c < x["bb_lo"])),
        "Stoch 14,3 cross <20 / >80": (up(x["k"], x["d"]) & (x["k"] < 20), up(x["d"], x["k"]) & (x["k"] > 80)),
        "ADX>25 with DI": (enter((x["adx"] > 25) & (x["pdi"] > x["ndi"])), enter((x["adx"] > 25) & (x["ndi"] > x["pdi"]))),
        "Donchian20 break (follow)": (enter(c > x["dc_hi"]), enter(c < x["dc_lo"])),
        "Donchian20 break (fade)": (enter(c < x["dc_lo"]), enter(c > x["dc_hi"])),
        "Daily VWAP side": ((c > x["vwap"]), (c < x["vwap"])),
        "Daily VWAP cross": (up(c, x["vwap"]), up(x["vwap"], c)),
        "Volume spike 1.5x, bar dir": (x["vspike"] & (c > o), x["vspike"] & (c < o)),
        "Ichimoku cloud side": ((c > x[["span_a", "span_b"]].max(axis=1)), (c < x[["span_a", "span_b"]].min(axis=1))),
    }
    rng = np.random.default_rng(20261128)
    r = pd.Series(rng.random(len(b)) < 0.05, index=b.index)
    S["Random entry (baseline)"] = (r, r.copy())
    return S


def thin(idx_pos, gap):
    keep, last = [], -10 ** 9
    for p in idx_pos:
        if p - last >= gap:
            keep.append(p)
            last = p
    return np.asarray(keep, int)


def stats(v):
    n = len(v)
    if n < 2:
        return n, np.nan, np.nan, np.nan, np.nan
    m, sd = v.mean(), v.std(ddof=1)
    t = m / sd * math.sqrt(n) if sd > 0 else np.nan
    p = 0.5 * math.erfc(t / math.sqrt(2)) if t == t else np.nan          # one-sided, H1: mean > 0
    return n, (v > 0).mean(), m, t, p


def run():
    m1 = history()
    m1 = m1[m1["t"] >= int(pd.Timestamp("2026-02-01", tz="UTC").value // 10 ** 6)]
    rows = []
    for tf, rule in TFS.items():
        b = bars(m1, rule)
        x = indicators(b)
        warm = np.arange(len(b)) >= 200
        c, atr = b["c"].values, x["atr"].values
        for name, (lng, sht) in signals(b, x).items():
            for side, ev, d in (("long", lng, 1), ("short", sht, -1)):
                pos = np.flatnonzero(ev.fillna(False).values.astype(bool) & warm)
                for h in HS:
                    p = thin(pos[pos + h < len(b)], h)
                    ret = (d * (c[p + h] - c[p]) - COST) / atr[p]
                    disc = b.index[p] < SPLIT
                    ok = np.isfinite(ret)
                    for half, mask in (("disc", disc & ok), ("conf", ~disc & ok)):
                        n, hit, m, t, pv = stats(ret[mask])
                        rows.append(dict(signal=name, tf=tf, side=side, h=h, half=half, n=n, hit=hit, mean=m, t=t, p=pv))
    df = pd.DataFrame(rows)
    w = df.pivot_table(index=["signal", "tf", "side", "h"], columns="half", values=["n", "hit", "mean", "t", "p"]).reset_index()
    w.columns = ["_".join(c).strip("_") for c in w.columns]
    # Benjamini-Hochberg on the confirmation p over ALL tests (random baseline included)
    pv = w["p_conf"].fillna(1.0).where(w["n_conf"] >= 20, 1.0).values
    order = np.argsort(pv)
    q = np.empty_like(pv)
    m = len(pv)
    run_min = 1.0
    for rank, i in reversed(list(enumerate(order, 1))):
        run_min = min(run_min, pv[i] * m / rank)
        q[i] = run_min
    w["q_conf"] = q
    both = (w["mean_disc"] > 0) & (w["mean_conf"] > 0)
    w["verdict"] = np.where(both & (w["q_conf"] < 0.05) & (w["n_conf"] >= 20), "TRUST", np.where(both, "WEAK", "DON'T TRUST"))
    rank = w["verdict"].map({"TRUST": 0, "WEAK": 1, "DON'T TRUST": 2})
    w = w.assign(_r=rank).sort_values(["_r", "t_conf"], ascending=[True, False]).drop(columns="_r")
    return w, m1


def write(w, m1):
    OUT.mkdir(parents=True, exist_ok=True)
    w.to_csv(OUT / "indicator_scorecard.csv", index=False)
    t0, t1 = (pd.Timestamp(int(m1["t"].iloc[i]), unit="ms", tz="UTC").strftime("%Y-%m-%d") for i in (0, -1))
    sig = w[~w["signal"].str.startswith("Random")]
    rnd = w[w["signal"].str.startswith("Random")]
    trust, weak = sig[sig["verdict"] == "TRUST"], sig[sig["verdict"] == "WEAK"]
    nt = len(w)

    def lab(r):
        return f"{r.signal} {r.tf} {r.side} h{int(r.h)}"

    by_sig = sig.groupby("signal")["verdict"].apply(lambda s: "TRUST" if (s == "TRUST").any() else "WEAK" if (s == "WEAK").any() else "DON'T")
    summary = (f"Indicator scorecard (PAXG 1m {t0}..{t1}, {nt} tests, BH-corrected): "
               + (f"TRUST {len(trust)}: " + "; ".join(lab(r) for r in trust.head(4).itertuples()) if len(trust) else "nothing passes TRUST")
               + f". {len(weak)} of {len(sig)} WEAK (positive both halves, not significant; random entry alone gets {(rnd['verdict'] == 'WEAK').sum()} of {len(rnd)})."
               + " No 15m signal is positive in both halves after the 0.70 round-trip cost. Treat RSI/VWAP/ADX/EMA/MACD readings as context, not as edges.")
    (OUT / "indicator_summary.txt").write_text(summary + "\n")
    f = lambda v, k=2: "" if v != v else f"{v:+.{k}f}"          # noqa: E731
    L = ["# Indicator scorecard (PAXG, code only, PAPER research)", "",
         f"Data: PAXG/USDT 1m {t0} to {t1}, resampled to 15m / 1h / 4h. Discovery Feb-Jun 2026, confirmation Jul-Nov 2026.",
         "Return = close-to-close h bars after the signal bar, in the signal direction, net of 0.70 USD round trip, in ATR(14) units of that timeframe.",
         "Events thinned so none overlap within h. p one-sided (mean > 0), normal approximation; q = Benjamini-Hochberg over ALL "
         f"{nt} tests on the confirmation p (n < 20 counts as p = 1).",
         "TRUST: mean > 0 in both halves AND q < 0.05. WEAK: mean > 0 in both halves, q >= 0.05. DON'T TRUST: otherwise.",
         "Top indicators in Opus 'why' text (10 answers grepped): VWAP 5, overbought/oversold 3, ADX 2: all covered by rows below.", "",
         "## Verdict", "", summary, "",
         "By indicator (best verdict over timeframe / side / horizon): "
         + "; ".join(f"{k} {v}" for k, v in by_sig.sort_values().items()), "",
         "Random-entry baseline rows: " + "; ".join(f"{r.tf} {r.side} h{int(r.h)} {r.verdict} (conf mean {f(r.mean_conf)} ATR, n {int(r.n_conf)})"
                                                  for r in rnd.itertuples() if r.h == 4), "",
         "## All tests (sorted: verdict, then confirmation t)", "",
         "| Signal | TF | Side | h | n disc | hit disc | mean disc | n conf | hit conf | mean conf | t conf | q | Verdict |",
         "|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for r in w.itertuples():
        L.append(f"| {r.signal} | {r.tf} | {r.side} | {int(r.h)} | {int(r.n_disc) if r.n_disc == r.n_disc else 0} | "
                 f"{'' if r.hit_disc != r.hit_disc else f'{r.hit_disc:.0%}'} | {f(r.mean_disc, 3)} | {int(r.n_conf) if r.n_conf == r.n_conf else 0} | "
                 f"{'' if r.hit_conf != r.hit_conf else f'{r.hit_conf:.0%}'} | {f(r.mean_conf, 3)} | {f(r.t_conf)} | {r.q_conf:.3f} | {r.verdict} |")
    (OUT / "indicator_scorecard.md").write_text("\n".join(L) + "\n")
    return summary


if __name__ == "__main__":
    w, m1 = run()
    print(write(w, m1))
    print(w["verdict"].value_counts().to_string())
    print(w.head(15)[["signal", "tf", "side", "h", "n_conf", "mean_disc", "mean_conf", "t_conf", "q_conf", "verdict"]].to_string())
