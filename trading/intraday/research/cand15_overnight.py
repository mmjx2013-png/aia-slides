"""cand15 replay: A (flat by 03:30 Bangkok, the live rule) vs B (no forced flat; still flat before the weekend),
with the overnight costs of an MT5 XAUUSD CFD in B. Code only, PAPER research.  python3 cand15_overnight.py

Signal (live rule, watcher.candidate): 15m Donchian-20 break with volume > 1.5x, FADED; entry at the next 1m open;
stop 2.5 x ATR14(15m); ATR trailing stop at the same distance (ratchets on the best price so far); no target.
Entries only 14:00-03:30 Bangkok and not at weekends (unchanged in both). Size: 1% risk at the stop, notional <= 3x.
Costs: 0.25 half spread + 0.10 slippage per side. In B, exits/stops between 04:00 and 06:00 Bangkok (the daily
break) pay 3x the half spread; each rollover held (22:00 UTC = 05:00 Bangkok) costs a swap per oz, triple on the
Wednesday rollover. Two swap assumptions are run (see SWAPS). The calendar guard is OFF in both (no historical
calendar on the allowed hosts), and the daily loss halt is not modelled: both are the same for A and B.
"""
import glob
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from common import _frame, bkk, indicators, load_cache, merge, resample   # noqa: E402
from watcher import candidate                                             # noqa: E402

HALF, SLIP, CAP0, RISK, LEV = 0.25, 0.10, 10_000.0, 0.01, 3.0
SWAPS = {"boss figure (long -6.00, short +2.00 per oz per night)": (-6.00, 2.00),
         "typical retail (long -0.60, short +0.20 per oz per night)": (-0.60, 0.20)}


def history():
    m1 = load_cache()
    for f in sorted(glob.glob(str(HERE.parent / "data" / "history" / "*.csv.gz"))):
        m1 = merge(_frame(pd.read_csv(f)[["t", "o", "h", "l", "c", "v"]].values.tolist()), m1)
    return m1


def bk(t):
    return bkk(int(t))


def clock(ts):
    """Bangkok weekday, hour, minute arrays for UTC ms timestamps (vectorized)."""
    b = pd.to_datetime(ts, unit="ms", utc=True).tz_convert("Asia/Bangkok")
    return b.weekday.values, b.hour.values, b.minute.values


def _no_entry(wd, hr, mi):
    hm = hr * 60 + mi
    weekend = ((wd == 5) & (hr >= 4)) | (wd == 6) | ((wd == 0) & (hr < 5))
    return weekend | ((hm >= 210) & (hm < 840))


def sim(m1, m15, mode, swap=(0.0, 0.0)):
    ends15 = set(m15["end"])
    t, o, h, l, c = (m1[k].values for k in ("t", "o", "h", "l", "c"))
    wd, hr, mi = clock(t)
    wd1, hr1, mi1 = clock(t + 60_000)
    NE, NE1 = _no_entry(wd, hr, mi), _no_entry(wd1, hr1, mi1)
    at0330 = (hr == 3) & (mi == 30)
    sat0330 = (wd == 5) & (hr * 60 + mi >= 210)
    FX = {"A": at0330, "B": sat0330, "D": sat0330, "C": np.zeros(len(t), bool)}[mode]
    # CFD market closed Sat 04:00 - Mon 05:00 Bangkok: C cannot be stopped then; the Monday open fills any gap
    CLOSED = ((wd == 5) & (hr >= 4)) | (wd == 6) | ((wd == 0) & (hr < 5))
    # swap rollovers: 05:00 Bangkok Tue..Sat (Mon..Fri 22:00 UTC), triple on the Wednesday night (Thu 05:00 Bangkok)
    ROLL = (hr == 5) & (mi == 0) & np.isin(wd, [1, 2, 3, 4, 5])
    if mode == "D":
        h1 = indicators(resample(m1, 60))
        ema = h1["c"].ewm(span=20, adjust=False).mean()
        endms = (pd.DatetimeIndex(h1["end"]).tz_localize(None) if pd.DatetimeIndex(h1["end"]).tz is not None else pd.DatetimeIndex(h1["end"])).asi8 // 10**6
        e_end = pd.Series(ema.values, index=endms)
        c_end = pd.Series(h1["c"].values, index=endms)
        slope = e_end.diff()
    BRK = (hr >= 4) & (hr < 6)
    ends_ms = {int(x.value // 10**6) for x in ends15}
    end_idx = {e: k for k, e in enumerate(m15["end"])}
    eq, pos, pending, trades, curve = CAP0, None, None, [], []
    for i in range(len(m1)):
        ti = int(t[i])
        if pos:
            d = pos["dir"]
            if mode != "A" and ROLL[i]:
                mult = 3 if wd[i] == 3 else 1                                 # Wednesday night -> charged Thu 05:00 Bkk
                fee = pos["qty"] * (swap[0] if d > 0 else swap[1]) * mult
                eq += fee
                pos["swap"] += fee
                pos["nights"] += mult
            exit_px, why = None, None
            if mode == "C" and CLOSED[i]:
                curve.append(eq)
                continue                                                      # no trading: stop checked at the Monday open
            if mode == "D" and at0330[i] and not FX[i]:
                one_r = pos["dist"] + 2 * (HALF + SLIP)
                prof = d * (o[i] - pos["entry"])
                k = int(np.searchsorted(e_end.index.values, ti, side="right")) - 1
                trend_ok = k >= 1 and d * slope.iloc[k] > 0 and d * (c_end.iloc[k] - e_end.iloc[k]) > 0
                if prof >= 0.5 * one_r and trend_ok:
                    pos["stop"] = max(pos["stop"], pos["entry"]) if d > 0 else min(pos["stop"], pos["entry"])
                    pos["kept"] = True
                else:
                    exit_px, why = o[i], "03:30 not kept"
            if exit_px is None and FX[i]:
                exit_px, why = o[i], "forced flat"
            elif (l[i] <= pos["stop"]) if d > 0 else (h[i] >= pos["stop"]):
                exit_px = min(o[i], pos["stop"]) if d > 0 else max(o[i], pos["stop"])
                why = "stop" if not pos["trailed"] else "trail"
            if exit_px is not None:
                half = HALF * (3 if mode != "A" and BRK[i] else 1)
                px = exit_px - d * (half + SLIP)
                pnl = d * pos["qty"] * (px - pos["entry"])
                eq += pnl
                trades.append(dict(entry_t=pos["t"], exit_t=ti, dir=d, pnl=pnl + pos["swap"], swap=pos["swap"], why=why,
                                   hours=(ti - pos["t"]) / 3_600_000, nights=pos["nights"],
                                   past_0330=pos.get("past_0330", False)))
                pos = None
            else:
                best = max(pos["best"], h[i]) if d > 0 else min(pos["best"], l[i])
                ns = best - d * pos["dist"]
                if (d > 0 and ns > pos["stop"]) or (d < 0 and ns < pos["stop"]):
                    pos["stop"], pos["trailed"] = ns, True
                pos["best"] = best
                if at0330[i]:
                    pos["past_0330"] = True
        if pending and not pos and ti >= pending[0]:
            _, d, dist = pending
            pending = None
            if not NE[i]:
                px = o[i] + d * (HALF + SLIP)
                qty = min(RISK * eq / (dist + 2 * (HALF + SLIP)), LEV * eq / o[i])
                pos = dict(dir=d, qty=qty, entry=px, stop=px - d * dist, dist=dist, best=px, t=ti, trailed=False, swap=0.0, nights=0)
        if ti + 60_000 in ends_ms and not pos and not pending:
            d, b15 = signal(m15, end_idx, pd.Timestamp(ti + 60_000, unit="ms", tz="UTC"))
            if d and not NE1[i] and b15["atr"] == b15["atr"]:
                pending = (ti + 60_000, d, 2.5 * float(b15["atr"]))
        curve.append(eq)
    return pd.DataFrame(trades), np.array(curve)


def signal(m15, end_idx, close_t):
    """watcher.candidate without the per-call set() of all bar ends (same rule)."""
    k = end_idx.get(close_t)
    if k is None or k < 21:
        return 0, None
    b, prior = m15.iloc[k], m15.iloc[k - 20:k]
    if not b["v"] > 1.5 * b["vavg"]:
        return 0, None
    if b["c"] > prior["h"].max():
        return -1, b
    if b["c"] < prior["l"].min():
        return 1, b
    return 0, None


def summary(tr, curve):
    if not len(tr):
        return dict(trades=0)
    dd = (curve / np.maximum.accumulate(curve) - 1).min()
    return dict(trades=len(tr), win=f"{100 * (tr.pnl > 0).mean():.0f}%", net_pnl=round(tr.pnl.sum(), 2),
                ret=f"{100 * tr.pnl.sum() / CAP0:+.1f}%", max_dd=f"{100 * dd:.1f}%", avg_hold_h=round(tr.hours.mean(), 1),
                swap=round(tr.swap.sum(), 2), held_past_0330=int(tr.past_0330.sum()) if "past_0330" in tr else 0)


def main():
    m1 = history()
    m15 = indicators(resample(m1, 15))
    span = f"{bk(m1['t'].iloc[0]).date()} .. {bk(m1['t'].iloc[-1]).date()} ({len(m1):,} 1m bars)"
    A, ca = sim(m1, m15, "A")
    rows = [("A: flat by 03:30 (live rule)", summary(A, ca))]
    res, stats = {}, {"A": summary(A, ca)}
    names = {"B": "hold overnight, flat before the weekend", "C": "no clock rules (weekend gap at the Monday open)",
             "D": "keep at 03:30 only if >= 0.5R and the 1h trend agrees (stop to breakeven), flat before the weekend"}
    for v in ("B", "C", "D"):
        for lab, sw in SWAPS.items():
            X, cx = sim(m1, m15, v, sw)
            if v == "B":
                res[lab] = X
            stats[(v, lab)] = summary(X, cx)
            rows.append((f"{v}: {names[v]}; {lab.split(' (')[0]} swap", stats[(v, lab)]))
    L = ["# cand15: flat by 03:30 (A) vs hold overnight (B), code-only replay", "", f"Data: PAXG/USDT 1m, {span}. " + __doc__.split("\n\n")[1].replace("\n", " "), "",
         "| Variant | Trades | Win | Net P&L (10k start) | Return | Max DD | Avg hold (h) | Swap paid | Held past 03:30 |", "|---|---|---|---|---|---|---|---|---|"]
    for lab, s in rows:
        L.append(f"| {lab} | {s['trades']} | {s['win']} | {s['net_pnl']:+,.2f} | {s['ret']} | {s['max_dd']} | {s['avg_hold_h']} | {s['swap']:+,.2f} | {s['held_past_0330']} |")
    # P&L from the extra hours alone: trades with the same entry in A and B that A closed by the 03:30 rule
    L += ["", "## P&L from the extra hours alone (same entries; trades that A closed at 03:30)",
          "| Swap assumption | Matched trades | A P&L on them | B P&L on them | Extra hours P&L | of which swap |", "|---|---|---|---|---|---|"]
    a_forced = A[A.why == "forced flat"].set_index("entry_t")
    ci = {}
    for lab, B in res.items():
        m = B.set_index("entry_t").join(a_forced[["pnl"]].rename(columns={"pnl": "a_pnl"}), how="inner")
        diff = (m.pnl - m.a_pnl).values
        rng = np.random.default_rng(5)
        bs = [rng.choice(diff, len(diff)).sum() for _ in range(5000)]
        ci[lab] = (np.percentile(bs, 5), np.percentile(bs, 95), (np.array(bs) > 0).mean(), (diff > 0).mean())
        L.append(f"| {lab} | {len(m)} | {m.a_pnl.sum():+,.2f} | {m.pnl.sum():+,.2f} | {m.pnl.sum() - m.a_pnl.sum():+,.2f} | {m.swap.sum():+,.2f} |")
    L += ["", "Bootstrap of the extra-hours P&L (5,000 resamples of the matched trades): " + "; ".join(
        f"{k.split(' (')[0]}: 90% interval [{a:+,.0f}, {b:+,.0f}], P(> 0) {p:.0%}, {w:.0%} of trades gained" for k, (a, b, p, w) in ci.items())]
    # pre-agreed decision rule, applied under the conservative (boss) swap figure; the typical figure shown alongside
    a = stats["A"]
    dd = lambda s_: float(s_["max_dd"].rstrip("%"))
    out_rule = []
    for lab in SWAPS:
        cands = [("A", a)] + [(v, stats[(v, lab)]) for v in ("B", "C", "D")]
        ok = [(v, s_) for v, s_ in cands if s_["trades"] >= 30 and abs(dd(s_)) <= 1.25 * abs(dd(a))]
        win = max(ok, key=lambda x: x[1]["net_pnl"])
        out_rule.append((lab, win[0], [(v, s_["net_pnl"], s_["max_dd"], s_["trades"]) for v, s_ in cands],
                         [v for v, s_ in cands if (v, s_) not in ok]))
    L += ["", "## Pre-agreed decision rule (highest net P&L; max DD no more than 25% deeper than A's; >= 30 trades)"]
    for lab, w, c_, failed in out_rule:
        L.append(f"- {lab}: winner **{w}**; " + ", ".join(f"{v} {p_:+,.0f} (DD {d_}, n {n_})" for v, p_, d_, n_ in c_)
                 + (f"; failed the DD/trades test: {', '.join(failed)}" if failed else ""))
    L += ["", "Note: B also changes which later signals are taken (one position at a time), so the totals differ by more than the extra hours.",
          "The boss's swap figure (-6 USD per 0.01 lot per night) is about 10x what retail brokers typically charge on XAUUSD (about -0.4 to",
          "-0.8 USD per oz long); both are shown."]
    (HERE.parent / "reports" / "cand15_decision.json").write_text(__import__("json").dumps({lab: w for lab, w, _, _ in out_rule}))
    out = HERE.parent / "reports" / "cand15_overnight.md"
    out.write_text("\n".join(L) + "\n")
    print("\n".join(L))


if __name__ == "__main__":
    main()
