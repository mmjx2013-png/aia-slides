"""Daily report for the intraday PAXG paper desk. PAPER ONLY.

  python3 report.py [YYYY-MM-DD] [--dir data/live]
Writes reports/<date>.md and reports/<date>.png (Bangkok day).
"""
import argparse
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

import risk
from common import BKK, HERE, jlines


def perf(exits):
    """Per-trade stats after costs (P&L in the journal already includes spread and slippage)."""
    p = [x["pnl"] for x in exits]
    w, l = [x for x in p if x > 0], [x for x in p if x <= 0]
    if not p:
        return "| 0 | - | - | - | - | - |"
    pf = sum(w) / -sum(l) if l and sum(l) < 0 else float("inf")
    return (f"| {len(p)} | {len(w)/len(p):.0%} | {(sum(w)/len(w) if w else 0):+.2f} | {(sum(l)/len(l) if l else 0):+.2f} | "
            f"**{sum(p)/len(p):+.2f}** | {pf:.2f} |")


def uf_stats(d, day):
    j = [x for x in jlines(Path(d) / "unfiltered" / "journal.jsonl") if x["t"][:10] == day and x["kind"] == "EXIT"]
    return f"; unfiltered today: {len(j)} trades, {sum(x['pnl'] > 0 for x in j)} wins, {sum(x['pnl'] for x in j):+.2f} USD"


def main(day, d, out):
    d, out = Path(d), Path(out)
    out.mkdir(parents=True, exist_ok=True)
    st = json.loads((d / "state.json").read_text())
    eq = pd.read_csv(d / "equity.csv")
    eq.index = pd.to_datetime(eq["t"], unit="ms", utc=True).dt.tz_convert(BKK)
    eq = eq[eq.index.strftime("%Y-%m-%d") <= day]
    bh = risk.CAPITAL * eq["px"] / st["start_px"]
    uf = d / "unfiltered" / "equity.csv"
    un = None
    if uf.exists():
        un = pd.read_csv(uf)
        un.index = pd.to_datetime(un["t"], unit="ms", utc=True).dt.tz_convert(BKK)
        un = un[un.index.strftime("%Y-%m-%d") <= day]["equity"]
    fig, ax = plt.subplots(figsize=(7, 3), dpi=110)
    ax.plot(eq.index, eq["equity"], label="paper desk (live book, <=3x)", lw=1.4)
    if un is not None:
        ax.plot(un.index, un, label="unfiltered: take every setup", lw=1.0, ls="--")
    ax.plot(eq.index, bh, label="PAXG buy & hold, 1x", lw=1.0, alpha=.8)
    ax.set_ylabel("USD"); ax.legend(frameon=False, fontsize=8); ax.grid(alpha=.3)
    ax.set_title(f"Intraday gold paper desk, to {day} (Bangkok)", fontsize=9)
    fig.autofmt_xdate(); fig.tight_layout()
    fig.savefig(out / f"{day}.png"); plt.close(fig)

    j = [x for x in jlines(d / "journal.jsonl") if x["t"][:10] == day]
    fills = {x["event"]: x for x in j if x["kind"] == "FILL"}
    rows = [f"| {fills[x['event']]['t'][11:16]} | {x['t'][11:16]} | {fills[x['event']]['side']} | "
            f"{fills[x['event']]['qty']} | {fills[x['event']]['px']} | {x['px']} | {x['reason']} | {x['pnl']:+.2f} |"
            for x in j if x["kind"] == "EXIT" and x["event"] in fills]
    toks = {}
    for x in j:
        if x["kind"] == "DECISION":
            c = toks.setdefault(x["stage"], [0, 0]); c[0] += 1; c[1] += x["tokens"]
    skips = [x for x in j if x["kind"] in ("SKIP", "REJECT")]
    last = eq.iloc[-1]
    day_eq = eq[eq.index.strftime("%Y-%m-%d") == day]
    md = [f"# Intraday gold paper desk, {day} (Bangkok)", "",
          "PAPER ONLY. PAXG/USDT 1m bars from Binance public data. Decisions fill at the next 1m open.", "",
          f"![equity]({day}.png)", "",
          f"- Live book: **{last['equity']:,.2f} USD** ({last['equity']/risk.CAPITAL-1:+.2%} since start); "
          f"PAXG buy & hold 1x: {bh.iloc[-1]:,.2f} ({bh.iloc[-1]/risk.CAPITAL-1:+.2%})",
          f"- Today: {(day_eq['equity'].iloc[-1]/day_eq['equity'].iloc[0]-1) if len(day_eq) else 0:+.2%}; "
          f"halted today: {'yes' if st.get('halted') == day else 'no'}",
          (f"- Unfiltered book (takes every setup, no AI): **{un.iloc[-1]:,.2f} USD** ({un.iloc[-1]/risk.CAPITAL-1:+.2%}); "
           f"AI filter adds {(last['equity']-un.iloc[-1])/risk.CAPITAL:+.2%} of capital"
           + uf_stats(d, day) if un is not None else "- Unfiltered book: none yet"),
          "- Shadow books, same decisions: " + ", ".join(
              f"{L}x {s['eq']:,.0f}" + (f" (LIQUIDATED {s['dead']})" if s["dead"] else "")
              for L, s in st["shadows"].items()), "",
          "## Trades", "", "| In | Out | Side | Oz | Entry | Exit | Exit reason | P&L USD |", "|---|---|---|---|---|---|---|---|",
          *(rows or ["| - | - | - | - | - | - | no trades | - |"]), "",
          "## Filtered (AI) against unfiltered (every setup)", "",
          "Expectancy = average P&L per trade in USD after costs. Profit factor = gross wins / gross losses.", "",
          "| Book, period | Trades | Win rate | Avg win | Avg loss | Expectancy | Profit factor |", "|---|---|---|---|---|---|---|",
          *[f"| {name}, {per} " + perf([x for x in jlines(p) if x["kind"] == "EXIT" and (per == "since start" or x["t"][:10] == day)])
            for name, p in (("AI filtered", d / "journal.jsonl"), ("unfiltered", d / "unfiltered" / "journal.jsonl"))
            for per in ("today", "since start")], "",
          "Opus stated probabilities (for calibration): " + (", ".join(
              f"{x['event'][9:13]} p={x['answer'].get('p_target')} {x['answer'].get('action')}"
              for x in j if x["kind"] == "DECISION" and x["stage"] == "opus") or "none today"), "",
          "## Model calls and tokens", "", "| Model | Calls | Tokens |", "|---|---|---|",
          *[f"| {k} | {v[0]} | {v[1]:,} |" for k, v in toks.items()],
          f"| total | {sum(v[0] for v in toks.values())} | {sum(v[1] for v in toks.values()):,} |", "",
          f"Skipped or rejected setups: {len(skips)}" + "".join(f"\n- {x['t'][11:16]} {x['event']}: {x['reason']}" for x in skips)]
    (out / f"{day}.md").write_text("\n".join(md) + "\n")
    return out / f"{day}.md"


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("day", nargs="?", default=pd.Timestamp.now(tz=BKK).strftime("%Y-%m-%d"))
    ap.add_argument("--dir", default=str(HERE / "data" / "live"))
    ap.add_argument("--out", default=str(HERE / "reports"))
    a = ap.parse_args()
    print(main(a.day, a.dir, a.out))
