"""Phase 2: daily PAPER run of the gold AI desk. No broker, no real orders.

  python3 gold_daily.py prepare [--now 2026-11-26T11:10]   # code: data check, state, desk input
  (one Opus desk call reads data/desk/gold_live/<run>/input.md, answers JSON)
  python3 gold_daily.py commit --pm answer.json --opus-tokens 68000 --orchestrator-tokens 15000

Timing: a run happens at ~18:10 Bangkok (11:10 UTC), in the middle of the
COMEX session. The desk sees the last complete daily session plus the 1h bars
that have CLOSED before the run. Its order fills at the OPEN of the first 1h
bar that starts after the run (never at a price in the past).
If no new 1h bar has closed since the last run (weekend, holiday, stale data),
`prepare` exits with code 3 and nothing changes.

Books: one decision stream, replayed at 1x, 3x, 10x, 30x and 100x from the
paper start (same rules as gold.py: 1h margin checks, liquidation = dead).
"""
import argparse, csv, json, sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

import gold as G
import news as N

ROOT = Path(__file__).parent
LIVE = ROOT / "data" / "desk" / "gold_live"
STATE = ROOT / "gold_portfolio.json"
JOURNAL = ROOT / "gold_journal.csv"
DAILY = ROOT / "reports" / "gold_daily"
LEVS = (1, 3, 10, 30, 100)
CAP = 10_000.0
PRICE_PER_MTOK = {"sonnet": 3.0 * 0.85 + 15.0 * 0.15, "opus": 5.0 * 0.85 + 25.0 * 0.15}  # USD, assumed list prices


def load_state():
    if STATE.exists():
        return json.loads(STATE.read_text())
    return dict(start=None, capital=CAP, decisions=[], last_bar=None, ai_cost_usd=0.0,
                journaled_until=None, last_run=None)


def save_state(s):
    STATE.write_text(json.dumps(s, indent=1, default=str))


def closed_bars(h, now):
    return h[h.index + pd.Timedelta(hours=1) <= now]


def fills_series(s, h):
    """Each decision fills at the first 1h bar that starts after it was made."""
    out = {}
    for d in s["decisions"]:
        t = pd.Timestamp(d["at"])
        k = h.index.searchsorted(t, side="right")
        if k < len(h):
            out[h.index[k]] = d["position"]
    return pd.Series(out, dtype=float)


def replay(s, h, lev):
    f = fills_series(s, h)
    if f.empty:
        return None
    return G.simulate(h[h.index >= f.index[0]], f, lev, CAP, rebalance=True)


def journal(rows):
    new = not JOURNAL.exists()
    with JOURNAL.open("a", newline="") as fh:
        w = csv.writer(fh)
        if new:
            w.writerow(["date", "ticker", "side", "shares", "price", "cost", "reason"])
        w.writerows(rows)


def prepare(a):
    import gold_desk as GD   # loads data
    now = pd.Timestamp(a.now) if a.now else pd.Timestamp.utcnow().tz_localize(None)
    s = load_state()
    h = closed_bars(G.hourly(), now)
    d = G.daily()
    d = d[d.index + pd.Timedelta(hours=21) <= now]          # complete sessions only
    last = str(h.index[-1])
    if s["last_bar"] is not None and last <= s["last_bar"]:
        print(f"No new closed 1h bar since {s['last_bar']} (now {now}): not a trading run, nothing done.")
        sys.exit(3)
    s["last_bar"], s["last_run"] = last, str(now)
    if s["start"] is None:
        s["start"] = str(now)
    # fills of earlier decisions (journal, 1x book)
    r = replay(s, h, 1)
    rows = []
    if r is not None:
        for t, side, oz, px, cost in r["fills"]:
            if s["journaled_until"] is None or str(t) > s["journaled_until"]:
                why = next((x["reason"] for x in reversed(s["decisions"]) if pd.Timestamp(x["at"]) < t), "")
                rows.append([str(t), "GC=F", side, round(oz, 4), round(px, 2), round(cost, 2), why[:200]])
                s["journaled_until"] = str(t)
    journal(rows)
    save_state(s)
    # the desk's input
    run = now.strftime("%Y-%m-%dT%H%M")
    out = LIVE / run
    out.mkdir(parents=True, exist_ok=True)
    brief = GD.chart_brief(d.index[-1], cutoff=now - pd.Timedelta(hours=1))
    today = now.strftime("%Y-%m-%d")
    after = (now - pd.Timedelta(days=4)).strftime("%Y-%m-%d")
    tomorrow = (now + pd.Timedelta(days=1)).strftime("%Y-%m-%d")
    parts = []
    if not a.no_news:
        for q, lang, lab in (("gold price", "en", "Gold (English)"), ("ราคาทอง", "th", "Gold (Thai)"),
                             ("Fed dollar yields", "en", "Fed / USD / yields")):
            parts.append(f"## {lab}\n" + N.brief(N.google(q, after, tomorrow, lang, n=8)))
    pos = s["decisions"][-1]["position"] if s["decisions"] else 0.0
    eq = r["equity"].iloc[-1] if r is not None else CAP
    state = (f"Position: {'LONG' if pos > 0 else 'SHORT' if pos < 0 else 'FLAT'} {abs(pos):.0%} of the leverage budget. "
             f"Paper equity on the 1x basis: {eq:,.0f} USD (started 10,000 on {s['start'][:10]}). "
             f"Gold last 1h close {h['close'].iloc[-1]:.1f} at {h.index[-1]} UTC. Decision time {now} UTC; "
             f"the order fills at the next 1h bar's open. Next decision: next trading day.")
    prompt = (ROOT / "prompts" / "gold_onecall.md").read_text().replace(
        "until the next decision (about one week later)", "until the next decision (next trading day)")
    (out / "input.md").write_text(prompt + "\n# CURRENT POSITION\n" + state + "\n\n# CHART BRIEF\n" + brief
                                  + f"\n\n# NEWS BRIEF (published up to {today})\n" + "\n".join(parts))
    print(f"Prepared run {run}: {out / 'input.md'}\n{state}")


def commit(a):
    s = load_state()
    if s["last_run"] is None:
        sys.exit("Run prepare first.")
    if a.pm:
        txt = Path(a.pm).read_text()
        j = json.loads(txt[txt.find("{"):txt.rfind("}") + 1])
        pm = j.get("pm", j)
        pos = max(-1.0, min(1.0, float(pm.get("position", 0))))      # risk manager clamp
        s["decisions"].append(dict(at=s["last_run"], position=pos,
                                   reason=str(pm.get("reason", ""))[:300], view=str(pm.get("view", ""))[:300]))
    usd = (a.sonnet_tokens * PRICE_PER_MTOK["sonnet"]
           + (a.opus_tokens + a.orchestrator_tokens) * PRICE_PER_MTOK["opus"]) / 1e6
    s["ai_cost_usd"] += usd
    journal([[s["last_run"], "-", "AI_COST", a.sonnet_tokens + a.opus_tokens + a.orchestrator_tokens, 0,
              round(usd, 3), f"est. USD (list prices, upper bound; opus {a.opus_tokens}, "
                             f"sonnet {a.sonnet_tokens}, orchestrator {a.orchestrator_tokens})"]])
    save_state(s)
    report(s, usd)


def report(s, usd_today):
    DAILY.mkdir(parents=True, exist_ok=True)
    now = pd.Timestamp(s["last_run"])
    h = closed_bars(G.hourly(), now)
    rows, curves = [], {}
    for L in LEVS:
        r = replay(s, h, L)
        if r is None:
            continue
        st = G.stats(r, CAP) if len(r["equity"]) > 30 else {"final": r["equity"].iloc[-1]}
        rows.append(f"| {L}x | {st['final']:,.0f} | {r['dead_at'] or 'no'} |")
        curves[L] = r["equity"]
    start = pd.Timestamp(s["start"])
    hb = h[h.index >= h.index[h.index <= start][-1]]   # from the last closed bar before the start
    bh = CAP * hb["close"] / hb["close"].iloc[0]
    day = now.strftime("%Y-%m-%d")
    fig, ax = plt.subplots(figsize=(7, 3.2), dpi=130)
    if 1 in curves:
        ax.plot(curves[1].index, curves[1].values, color="#c2410c", lw=2, label="AI desk 1x (paper)")
    ax.plot(bh.index, bh.values, color="#475569", lw=1.3, label="Gold buy & hold 1x")
    ax.set_title(f"Gold paper equity since {s['start'][:10]} (USD)", loc="left", fontsize=10)
    ax.grid(alpha=0.3); ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=False, fontsize=8); fig.autofmt_xdate(); fig.tight_layout()
    fig.savefig(DAILY / f"{day}.png"); plt.close(fig)
    e1 = curves.get(1, pd.Series([CAP], index=[now]))
    prev = e1[e1.index <= now - pd.Timedelta(days=1)]
    pnl_day = e1.iloc[-1] - (prev.iloc[-1] if len(prev) else CAP)
    last = s["decisions"][-1] if s["decisions"] else {}
    fresh = bool(last) and last["at"] == s["last_run"]
    md = [f"# Gold paper run {day}", "", "PAPER MONEY ONLY. No real orders. Not real profit.", "",
          f"![equity]({day}.png)", "",
          f"- 1x paper equity: {e1.iloc[-1]:,.0f} USD; gold buy & hold: {bh.iloc[-1]:,.0f} USD",
          f"- Paper P&L last 24h (1x, after spread): {pnl_day:+,.2f} USD",
          f"- AI token cost this run (estimate): {usd_today:.2f} USD; total {s['ai_cost_usd']:.2f} USD",
          f"- Profitable day after token cost? **{'yes' if pnl_day > usd_today else 'no'}**",
          f"- 1x P&L minus all token costs: {e1.iloc[-1] - CAP - s['ai_cost_usd']:+,.2f} USD", "",
          (f"## Decision: position {last.get('position', 0):+.2f} (fills at the next 1h open)" if fresh else
           f"## No new decision this run: holding position {last.get('position', 0):+.2f}"),
          f"{last.get('view', '')}", "", f"Reason: {last.get('reason', '')}", "",
          "## Same decisions at each leverage", "| Leverage | Equity USD | Liquidated |", "|---|---|---|", *rows]
    (DAILY / f"{day}.md").write_text("\n".join(md) + "\n")
    print(f"Report: {DAILY / (day + '.md')}")


def review(a):
    """Friday: build the input for one Opus risk review of the week."""
    s = load_state()
    day = pd.Timestamp(s["last_run"]).strftime("%Y-%m-%d")
    reps = sorted(DAILY.glob("20*.md"))[-5:]
    txt = ["# Role: risk reviewer of a PAPER gold desk (research test).",
           "Read the week's journal, decisions and daily reports. Check: rule breaks, oversized or",
           "inconsistent positions, costs vs P&L (including AI token cost), liquidation risk at 3x-100x,",
           "and whether the desk prompt or rules should change next week. Be blunt; 'no change' is fine.",
           "Reply with ONLY JSON: {\"risk_flags\": [\"...\"], \"keep_rules\": true|false,",
           " \"suggested_changes\": [\"<= 25 words each\"], \"summary\": \"<= 60 words\"}", "",
           "## Decisions", json.dumps(s["decisions"][-7:], indent=0), "",
           "## Journal", JOURNAL.read_text() if JOURNAL.exists() else "(empty)", ""]
    for r in reps:
        txt += [f"## {r.name}", r.read_text()]
    out = LIVE / f"review-{day}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(txt))
    print(out)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("prepare"); p.add_argument("--now"); p.add_argument("--no-news", action="store_true")
    c = sub.add_parser("commit"); c.add_argument("--pm")
    for k in ("--sonnet-tokens", "--opus-tokens", "--orchestrator-tokens"):
        c.add_argument(k, type=int, default=0)
    sub.add_parser("review")
    a = ap.parse_args()
    {"prepare": prepare, "commit": commit, "review": review}[a.cmd](a)
