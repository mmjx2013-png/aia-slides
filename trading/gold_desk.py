"""Gold AI desk: briefs for the Claude analysts/PM, replay of their decisions,
and the past test report (Phase 1b, gold). PAPER ONLY.

  python3 gold_desk.py dates                  # decision dates in the test window
  python3 gold_desk.py prep                   # chart + news briefs for every date
  python3 gold_desk.py state --run pm1 --date D   # position brief the PM sees at D
  python3 gold_desk.py report                 # tables + reports/ai_trader.png

No future data: daily indicators use sessions up to D; 1h indicators use bars
before D's close; news queries use Google News `before:` D+1 is NOT used —
`before:D` means published before the decision day starts (strict).
"""
import argparse, json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

import gold as G
import indicators as I
import news as N
from desk import PCT

ROOT = Path(__file__).parent
DIR = ROOT / "data" / "desk" / "gold1b"
START, EVERY = "2026-07-01", 5
RUNS = ("pm1", "pm2")
LEVS = (1, 3, 10, 30, 100)
CAP = 10_000.0

d = G.daily()
h = G.hourly()
CTX = {"DXY (dollar index)": "DXY_daily", "US 10y yield (^TNX)": "TNX_daily",
       "USD/THB": "USDTHB_daily", "Silver (SI=F)": "SI_F_daily", "S&P 500": "SP500_daily",
       "GLD ETF": "GLD_daily"}


def decision_dates():
    days = d.index[d.index >= START]
    days = list(days[::EVERY])
    return [x for x in days if x < d.index[-1]]  # the last one needs a next open


def ds(x):
    return pd.Timestamp(x).strftime("%Y-%m-%d")


def _fmt(df):
    for c in df.columns:
        df[c] = (df[c] * 100 if c in PCT else df[c]).round(1)
    return df


def chart_brief(D, cutoff=None):
    D = pd.Timestamp(D)
    dd = d[d.index <= D].copy(); dd["adjclose"] = dd["close"]
    cutoff = cutoff or D + pd.Timedelta(hours=21)    # 1h bars that started before this time
    hh = h[h.index < cutoff].copy(); hh["adjclose"] = hh["close"]
    rows = {"GC=F daily": I.compute(dd).iloc[-1], "GC=F 1h": I.compute(hh.tail(3000)).iloc[-1]}
    t = pd.DataFrame(rows).drop(index=["turnover_mthb"], errors="ignore")
    for k in t.index:
        t.loc[k] = t.loc[k] * (100 if k in PCT else 1)
    t = t.astype(float).round(2)
    ctx = {}
    for lab, f in CTX.items():
        x = G.load(f); x.index = x.index.normalize(); x = x[x.index <= D]
        c = x["close"]
        ctx[lab] = {"last": round(c.iloc[-1], 2), "ret_1w%": round((c.iloc[-1] / c.iloc[-6] - 1) * 100, 1),
                    "ret_1m%": round((c.iloc[-1] / c.iloc[-22] - 1) * 100, 1),
                    "ret_3m%": round((c.iloc[-1] / c.iloc[-64] - 1) * 100, 1),
                    "dist_sma50%": round((c.iloc[-1] / c.tail(50).mean() - 1) * 100, 1),
                    "dist_sma200%": round((c.iloc[-1] / c.tail(200).mean() - 1) * 100, 1)}
    last = d.loc[D]
    head = (f"Gold futures GC=F, decision after the close of session {ds(D)}.\n"
            f"Last daily bar: open {last.open:.1f} high {last.high:.1f} low {last.low:.1f} "
            f"close {last.close:.1f} USD/oz.\n\n## Indicators (rows = indicator, columns = timeframe; "
            "windows count BARS, so on the 1h column ret_1w = last 5 hours; % columns are in percent)\n")
    return (head + t.to_csv() + "\n## Context markets (daily)\n"
            + pd.DataFrame(ctx).T.to_csv())


def news_brief(D, lookback=EVERY + 2):
    before = ds(D)    # strictly before the decision day
    after = ds(pd.Timestamp(D) - pd.Timedelta(days=lookback))
    parts = []
    for q, lang, lab in (("gold price", "en", "Gold (English)"),
                         ("ราคาทอง", "th", "Gold (Thai)"),
                         ("Fed dollar yields", "en", "Fed / USD / yields")):
        parts.append(f"## {lab}\n" + N.brief(N.google(q, after, before, lang, n=8)))
    return "\n".join(parts)


def prep():
    for D in decision_dates():
        out = DIR / ds(D)
        out.mkdir(parents=True, exist_ok=True)
        if not (out / "chart.md").exists():
            (out / "chart.md").write_text(chart_brief(D))
        if not (out / "news.md").exists():
            (out / "news.md").write_text(news_brief(D))
        print(ds(D), "ok", flush=True)


def read_pos(run, D):
    f = DIR / ds(D) / f"{run}.json"
    if not f.exists():
        return None
    txt = f.read_text()
    a, b = txt.find("{"), txt.rfind("}")
    try:
        j = json.loads(txt[a:b + 1])
        x = float((j.get("pm") or j).get("position", 0))
    except (ValueError, TypeError):
        return 0.0
    return max(-1.0, min(1.0, x))                    # risk manager: |position| <= 1


def signal(run, upto=None):
    dec = {}
    for D in decision_dates():
        if upto is not None and D >= pd.Timestamp(upto):
            break
        p = read_pos(run, D)
        if p is not None:
            dec[D] = p
    s = pd.Series(dec, dtype=float)
    days = d.index[(d.index >= decision_dates()[0])]
    return s.reindex(days).ffill().dropna()          # hold between decisions


def replay(run, lev, end=None):
    sig = signal(run, upto=end)
    if end is not None:
        sig = sig[sig.index < pd.Timestamp(end)]
    if sig.empty:
        return None
    fills = G.hourly_fills(sig, h)
    bars = h[h.index >= fills.index[0]]
    if end is not None:
        bars = bars[bars.index < pd.Timestamp(end) + pd.Timedelta(hours=21)]
    return G.simulate(bars, fills, lev, CAP)


def state(run, D):
    D = pd.Timestamp(D)
    sig = signal(run, upto=D)
    sig = sig[sig.index < D]
    if sig.empty:
        txt = "Position: flat (no previous decision). Account equity 10,000 USD (1x basis)."
    else:
        r = replay(run, 1, end=D)
        eq = r["equity"].iloc[-1]
        cur = sig.iloc[-1]
        since = sig[sig != cur]
        entry = sig.index[0] if since.empty else sig.index[sig.index > since.index[-1]][0]
        px_e, px_now = d["close"].loc[entry], d["close"].loc[D]
        side = "LONG" if cur > 0 else "SHORT" if cur < 0 else "FLAT"
        txt = (f"Position: {side} {abs(cur):.0%} of the leverage budget since session {ds(entry)} "
               f"(gold then {px_e:.1f}, now {px_now:.1f}, {(px_now / px_e - 1) * 100:+.1f}%).\n"
               f"Account equity on the 1x basis: {eq:,.0f} USD (started 10,000 on {ds(decision_dates()[0])}).")
    (DIR / ds(D) / f"{run}_state.md").write_text(txt)
    brief = (DIR / ds(D) / "brief.md").read_text()
    (DIR / ds(D) / f"{run}_input.md").write_text(
        (ROOT / "prompts" / "gold_onecall.md").read_text() + "\n# CURRENT POSITION\n" + txt + "\n\n" + brief)
    print(txt)


def report():
    rows, curves = [], {}
    first = decision_dates()[0]
    for run in RUNS:
        if read_pos(run, first) is None:
            continue
        for L in LEVS:
            r = replay(run, L)
            st = G.stats(r, CAP)
            rows.append({"decisions": f"AI desk {run}", "leverage": f"{L}x", **st})
            curves[(run, L)] = r["equity"]
    bh = pd.Series(1.0, d.index[d.index >= first])
    for L in LEVS:
        fills = G.hourly_fills(bh, h)
        r = G.simulate(h[h.index >= fills.index[0]], fills, L, CAP)
        rows.append({"decisions": "Gold buy & hold", "leverage": f"{L}x", **G.stats(r, CAP)})
        curves[("bh", L)] = r["equity"]
    sigs = G.rules(d)
    for name in ("TS-momentum 3m long/short", "SMA200 long/short"):
        s = sigs[name][sigs[name].index >= first]
        fills = G.hourly_fills(s, h)
        r = G.simulate(h[h.index >= fills.index[0]], fills, 1, CAP)
        rows.append({"decisions": f"Rule: {name}", "leverage": "1x", **G.stats(r, CAP)})
        curves[(name, 1)] = r["equity"]
    df = pd.DataFrame(rows)
    df.to_csv(ROOT / "reports" / "gold_ai_desk.csv", index=False)
    fig, ax = plt.subplots(figsize=(10, 5), dpi=150)
    style = {("pm1", 1): ("#c2410c", 2.2, "AI desk, pass 1 (1x)"),
             ("pm2", 1): ("#ea580c", 2.2, "AI desk, pass 2 (1x)"),
             ("bh", 1): ("#475569", 1.6, "Gold buy & hold (1x)"),
             ("TS-momentum 3m long/short", 1): ("#1d4ed8", 1.3, "Rule: TS-momentum 3m (chosen in-sample)"),
             ("SMA200 long/short", 1): ("#7c3aed", 1.0, "Rule: SMA200 long/short")}
    for k, (col, lw, lab) in style.items():
        if k in curves:
            ax.plot(curves[k].index, curves[k].values, color=col, lw=lw, label=lab)
    ax.axhline(CAP, color="#94a3b8", lw=0.8, ls="--")
    ax.set_title(f"Gold AI desk past test (paper, after spread), {ds(first)} to {ds(d.index[-1])}",
                 loc="left")
    ax.set_ylabel("USD (start 10,000)")
    ax.grid(alpha=0.3); ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=False, fontsize=9); fig.tight_layout()
    fig.savefig(ROOT / "reports" / "ai_trader.png")
    return df


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["dates", "prep", "state", "report"])
    ap.add_argument("--run", default="pm1")
    ap.add_argument("--date")
    a = ap.parse_args()
    if a.cmd == "dates":
        print(" ".join(ds(x) for x in decision_dates()), len(decision_dates()))
    elif a.cmd == "prep":
        prep()
    elif a.cmd == "state":
        state(a.run, a.date)
    else:
        print(report().to_string())
