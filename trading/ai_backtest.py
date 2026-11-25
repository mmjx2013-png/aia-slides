"""Phase 1b: the AI desk trades the past, fairly.

Window: weekly decisions from the first week of July 2026 (after the models'
knowledge cutoff, so they cannot remember the outcome) to today.
No future data: indicators use bars up to the decision date; news queries use
Google News `before:<decision date>`.

Steps
  python3 ai_backtest.py prep                 # briefs for every decision date
  (agents: news + chart notes, once per week -> data/desk/1b/<D>/news.json, chart.json)
  python3 ai_backtest.py state --run pm1 --date D   # portfolio as of D for the PM
  (PM agent -> data/desk/1b/<D>/pm1.json); repeat week by week, for pm1 and pm2
  python3 ai_backtest.py report               # section + reports/ai_trader.png
"""
import argparse, json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

import desk
import strategies as S
from data import load_panels
from engine import COST, Result, metrics, simulate
from universe import INDEX, TICKERS

ROOT = Path(__file__).parent
DIR = ROOT / "data" / "desk" / "1b"
START = "2026-07-01"
RUNS = ("pm1", "pm2")

idx, P, missing = load_panels(INDEX, TICKERS)
P = S.prepare(P)
cal = idx.index


def decision_dates():
    """Last trading day of each week, from the week of START to the last bar."""
    s = pd.Series(cal[cal >= pd.Timestamp(START) - pd.Timedelta(days=7)], dtype="datetime64[ns]")
    wk = s.dt.to_period("W")
    last = s[wk.ne(wk.shift(-1))]
    last = last[last >= pd.Timestamp(START)]
    out = list(last)
    if out and out[-1] == cal[-1]:
        out = out[:-1]            # no next open to fill at yet
    return out


def ds(d):
    return pd.Timestamp(d).strftime("%Y-%m-%d")


def prep():
    frames = desk.indicator_frames(P, idx)
    for d in decision_dates():
        out = DIR / ds(d)
        out.mkdir(parents=True, exist_ok=True)
        if not (out / "chart.csv").exists():
            (out / "chart.csv").write_text(desk.indicator_table(frames, d))
        if not (out / "news.md").exists():
            (out / "news.md").write_text(desk.news_brief(d, list(P["close"].columns)))
        print(ds(d), "ok")


def decisions(run, upto=None):
    dec = {}
    for d in decision_dates():
        if upto is not None and d >= upto:
            break
        f = DIR / ds(d) / f"{run}.json"
        if f.exists():
            w, _ = desk.risk_check(desk.parse_json(f), set(TICKERS))
            dec[d] = w
    return dec


def make_decide(dec):
    last = {"w": {}}

    def decide(d, force):
        if d in dec:
            last["w"] = dec[d]
            return dec[d]
        return dict(last["w"]) if force else None
    return decide


def replay(run, end):
    dates = decision_dates()
    r = simulate(run, make_decide(decisions(run, upto=pd.Timestamp(end))), P,
                 dates[0], end, dd_stop=0.15)
    return r


def state(run, d):
    """Write the portfolio brief the PM sees at decision date d."""
    d = pd.Timestamp(d)
    r = replay(run, d)
    sh, cash, cost = {}, None, {}
    for (_, t, side, n, px, _c) in r.trades:
        if side == "BUY":
            cost[t] = (sh.get(t, 0) * cost.get(t, 0) + n * px) / (sh.get(t, 0) + n)
            sh[t] = sh.get(t, 0) + n
        else:
            sh[t] -= n
            if sh[t] == 0:
                del sh[t]
    eq = r.equity.iloc[-1]
    px = P["close"].ffill().loc[d]
    cash = eq - sum(n * px[t] for t, n in sh.items())
    txt = desk.portfolio_text(cash, sh, px, cost, eq, r.equity.cummax().iloc[-1])
    (DIR / ds(d) / f"{run}_portfolio.md").write_text(txt)
    print(txt)


def report(rule_name, rule_factory):
    dates = decision_dates()
    start, end = dates[0], cal[-1]
    curves, rows = {}, []
    for run in RUNS:
        if not any((DIR / ds(d) / f"{run}.json").exists() for d in dates):
            continue
        r = replay(run, end)
        r.name = f"AI desk ({run})"
        curves[r.name] = r.equity; rows.append(metrics(r))
    r = simulate(f"Rule: {rule_name}", rule_factory(), P, start, end)
    curves[r.name] = r.equity; rows.append(metrics(r))
    s = idx["close"][(cal >= start) & (cal <= end)]
    b = Result("SET50 index B&H (price only)", 100_000 * (1 - COST) * s / s.iloc[0],
               trades=[None], costs=100_000 * COST, traded_value=100_000)
    curves[b.name] = b.equity; rows.append(metrics(b))
    e = simulate("Equal-weight B&H (with dividends)", S.buy_and_hold_equal(P), P, start, end, lot=1)
    curves[e.name] = e.equity; rows.append(metrics(e))
    fig, ax = plt.subplots(figsize=(10, 5), dpi=150)
    pal = ["#c2410c", "#ea580c", "#7c3aed", "#475569", "#0f766e"]
    for (k, v), col in zip(curves.items(), pal):
        ax.plot(v.index, v.values, color=col, lw=2 if k.startswith("AI") else 1.3, label=k)
    ax.set_title(f"AI desk vs yardsticks, paper, after costs ({ds(start)} to {ds(end)})", loc="left")
    ax.set_ylabel("THB (start 100,000)")
    ax.grid(alpha=0.3); ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=False, fontsize=9); fig.tight_layout()
    fig.savefig(ROOT / "reports" / "ai_trader.png")
    df = pd.DataFrame(rows)
    df.to_csv(ROOT / "reports" / "phase1b.csv", index=False)
    return df, len(dates)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["prep", "dates", "state"])
    ap.add_argument("--run", default="pm1")
    ap.add_argument("--date")
    a = ap.parse_args()
    if a.cmd == "prep":
        prep()
    elif a.cmd == "dates":
        print(" ".join(ds(d) for d in decision_dates()))
    else:
        state(a.run, a.date)
