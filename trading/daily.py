"""Phase 2: the daily PAPER run of the AI desk. Never places a real order.

Two steps, with the desk's Claude agents in between:

  python3 daily.py prepare          # code: data, fills, risk, briefs
  (news analyst + chart analyst -> notes; portfolio manager -> pm.json)
  python3 daily.py commit --pm data/desk/live/<D>/pm.json --tokens 52000 \
                          --orchestrator-tokens 15000
                                    # code: risk check, pending orders, journal, report

A day with no new SET50 bar (Thai holiday, weekend) is not a trading day:
`prepare` exits with code 3 and nothing changes.
"""
import argparse, csv, json, sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

import desk
import fetch
from data import load_panels
from engine import COST, DIV_TAX, LOT, rebalance
from universe import INDEX, TICKERS

ROOT = Path(__file__).parent
STATE = ROOT / "portfolio.json"
JOURNAL = ROOT / "journal.csv"
DAILY = ROOT / "reports" / "daily"
LIVE = ROOT / "data" / "desk" / "live"
DD_HALT, HALT_DAYS = 0.15, 21

# Assumed list prices, USD per million tokens, blended (most desk tokens are
# input). Update these if the price list changes. They are estimates.
PRICE_PER_MTOK = {"sonnet": 3.0 * 0.85 + 15.0 * 0.15, "opus": 5.0 * 0.85 + 25.0 * 0.15}


def load_state(start=None, capital=100_000.0):
    if STATE.exists():
        return json.loads(STATE.read_text())
    return dict(capital=capital, cash=capital, holdings={}, avg_cost={}, peak=capital,
                halt_days=0, last_bar=start, pending=None, history=[], start=None)


def save_state(s):
    STATE.write_text(json.dumps(s, indent=1, default=str))


def journal(rows):
    new = not JOURNAL.exists()
    with JOURNAL.open("a", newline="") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["date", "ticker", "side", "shares", "price", "cost", "reason"])
        w.writerows(rows)


def refresh_data():
    for s in [INDEX, "THB=X"] + [t + ".BK" for t in TICKERS]:
        fetch.fetch(s, refresh=True, max_age=3 * 3600)


def prepare(args):
    if not args.no_fetch:
        refresh_data()
    idx, P, missing = load_panels(INDEX, TICKERS)
    s = load_state(args.start)
    last = pd.Timestamp(s["last_bar"]) if s["last_bar"] else None
    new_days = [d for d in idx.index if last is None or d > last]
    if args.until:
        new_days = [d for d in new_days if d <= pd.Timestamp(args.until)]
    if not new_days:
        print("No new SET50 bar since", s["last_bar"], "-> not a trading day, nothing done.")
        sys.exit(3)
    O, C, D = P["open"], P["close"].ffill(), P["div"]
    for d in new_days:
        ds = d.strftime("%Y-%m-%d")
        if s["start"] is None:
            s["start"] = ds
        rows = []
        for t, n in s["holdings"].items():                     # dividends
            amt = D.at[d, t] if t in D.columns else 0
            if amt > 0:
                s["cash"] += n * amt * (1 - DIV_TAX)
                rows.append([ds, t, "DIVIDEND", n, round(amt, 4), 0, "cash dividend, 10% tax withheld"])
        if s["pending"] is not None:                           # fill at today's open
            pend = s["pending"]
            before = dict(s["holdings"])
            s["cash"], fills = rebalance(s["cash"], s["holdings"], pend["targets"],
                                         O.loc[d], C.loc[d], LOT)
            for t, side, n, px, cost in fills:
                if side == "BUY":
                    old = before.get(t, 0)
                    s["avg_cost"][t] = (old * s["avg_cost"].get(t, 0) + n * px) / (old + n)
                elif t not in s["holdings"]:
                    s["avg_cost"].pop(t, None)
                why = pend["reasons"].get(t) or ("not in PM targets: exit" if side == "SELL" else "PM target")
                rows.append([ds, t, side, n, round(px, 4), round(cost, 2), why])
            s["pending"] = None
        eq = s["cash"] + sum(n * C.at[d, t] for t, n in s["holdings"].items())
        s["peak"] = max(s["peak"], eq)
        s["history"].append([ds, round(eq, 2), float(idx["close"].loc[d])])
        s["last_bar"] = ds
        if s["halt_days"] > 0:
            s["halt_days"] -= 1
            if s["halt_days"] == 0:
                s["peak"] = eq
        elif eq < s["peak"] * (1 - DD_HALT) and s["holdings"]:
            s["pending"] = dict(targets={}, reasons={t: "risk manager: 15% drawdown halt"
                                                     for t in s["holdings"]}, decided=ds)
            s["halt_days"] = HALT_DAYS
        journal(rows)
    save_state(s)

    # Briefs for the desk, for the last day only
    d = new_days[-1]
    ds = d.strftime("%Y-%m-%d")
    out = LIVE / ds
    out.mkdir(parents=True, exist_ok=True)
    frames = desk.indicator_frames(P, idx)
    (out / "chart.csv").write_text(desk.indicator_table(frames, d))
    if not args.no_news:
        (out / "news.md").write_text(desk.news_brief(d, list(P["close"].columns), live=True))
    held = {t: n for t, n in s["holdings"].items()}
    (out / "portfolio.md").write_text(desk.portfolio_text(
        s["cash"], held, C.loc[d], s["avg_cost"], s["history"][-1][1], s["peak"])
        + ("\nRISK HALT ACTIVE: no new positions until it ends." if s["halt_days"] else ""))
    print(f"Prepared {ds}. Briefs in {out}. Halt days left: {s['halt_days']}. "
          f"Missing tickers: {missing or 'none'}")


def token_cost_thb(sonnet_tokens, opus_tokens):
    usd = (sonnet_tokens * PRICE_PER_MTOK["sonnet"] + opus_tokens * PRICE_PER_MTOK["opus"]) / 1e6
    fp = fetch.path_for("THB=X")
    fx = json.loads(fp.read_text()) if fp.exists() else None
    rate = fx["chart"]["result"][0]["meta"]["regularMarketPrice"] if fx else 32.5
    return usd, usd * rate, rate


def commit(args):
    s = load_state()
    ds = s["last_bar"]
    if s["halt_days"] and s["pending"] is not None:
        notes = ["risk halt: PM answer ignored"]
        targets, reasons = s["pending"]["targets"], s["pending"]["reasons"]
    elif args.pm:
        ans = desk.parse_json(args.pm)
        targets, notes = desk.risk_check(ans, set(TICKERS))
        reasons = {t: str(r)[:200] for t, r in ans.get("reasons", {}).items()}
        if s["halt_days"]:
            targets, notes = {}, notes + ["risk halt active: stay in cash"]
        s["pending"] = dict(targets=targets, reasons=reasons, decided=ds, view=ans.get("view", ""))
    else:
        targets, reasons, notes = None, {}, ["no PM answer: holdings kept"]
    usd, thb, rate = token_cost_thb(args.sonnet_tokens, args.opus_tokens + args.orchestrator_tokens)
    journal([[ds, "-", "AI_COST", args.sonnet_tokens + args.opus_tokens + args.orchestrator_tokens,
              0, round(thb, 2), f"est. USD {usd:.2f} at {rate:.2f} THB/USD (sonnet {args.sonnet_tokens}, "
              f"opus {args.opus_tokens}, orchestrator {args.orchestrator_tokens})"]])
    s.setdefault("ai_cost_thb", 0.0)
    s["ai_cost_thb"] += thb
    save_state(s)
    report(s, targets, notes, thb)


def report(s, targets, notes, cost_today):
    DAILY.mkdir(parents=True, exist_ok=True)
    h = pd.DataFrame(s["history"], columns=["date", "equity", "index"]).set_index("date")
    h.index = pd.to_datetime(h.index)
    ds = s["last_bar"]
    eq = h["equity"]
    bench = s["capital"] * h["index"] / h["index"].iloc[0]
    pnl_day = eq.iloc[-1] - (eq.iloc[-2] if len(eq) > 1 else s["capital"])
    fig, ax = plt.subplots(figsize=(7, 3.2), dpi=130)
    ax.plot(h.index, eq, color="#c2410c", lw=2, label="AI desk (paper)")
    ax.plot(h.index, bench, color="#475569", lw=1.4, label="SET50 index (price)")
    ax.set_title(f"Paper equity since {s['start']} (THB)", loc="left", fontsize=10)
    ax.grid(alpha=0.3); ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=False, fontsize=8); fig.autofmt_xdate(); fig.tight_layout()
    fig.savefig(DAILY / f"{ds}.png"); plt.close(fig)
    lines = [f"# Paper trading day {ds}", "",
             "PAPER MONEY ONLY. No real orders. Not real profit.", "",
             f"![equity]({ds}.png)", "",
             f"- Equity: {eq.iloc[-1]:,.0f} THB (start {s['capital']:,.0f}); "
             f"SET50 index same period: {bench.iloc[-1]:,.0f}",
             f"- Paper P&L today (after trading costs): {pnl_day:+,.0f} THB",
             f"- AI token cost today (estimate): {cost_today:,.1f} THB; "
             f"total so far {s.get('ai_cost_thb', 0):,.1f} THB",
             f"- Profitable day after token cost? **{'yes' if pnl_day > cost_today else 'no'}**",
             f"- Total paper P&L minus all token costs: "
             f"{eq.iloc[-1] - s['capital'] - s.get('ai_cost_thb', 0):+,.0f} THB", "",
             "## Orders for the next open"]
    if targets is None:
        lines.append("None (holdings kept).")
    elif not targets:
        lines.append("Target: all cash.")
    else:
        lines += [f"- {t}: {w:.0%}" for t, w in sorted(targets.items(), key=lambda x: -x[1])]
    if s.get("pending") and s["pending"].get("view"):
        lines += ["", "PM view: " + s["pending"]["view"]]
    if notes:
        lines += ["", "Risk manager: " + "; ".join(notes)]
    (DAILY / f"{ds}.md").write_text("\n".join(lines) + "\n")
    print(f"Report: {DAILY / (ds + '.md')}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("prepare")
    p.add_argument("--start", help="first paper day is the bar AFTER this date (YYYY-MM-DD)")
    p.add_argument("--until", help="process bars up to this date only (testing)")
    p.add_argument("--no-fetch", action="store_true")
    p.add_argument("--no-news", action="store_true")
    c = sub.add_parser("commit")
    c.add_argument("--pm")
    c.add_argument("--sonnet-tokens", type=int, default=0)
    c.add_argument("--opus-tokens", type=int, default=0)
    c.add_argument("--orchestrator-tokens", type=int, default=0)
    a = ap.parse_args()
    prepare(a) if a.cmd == "prepare" else commit(a)
