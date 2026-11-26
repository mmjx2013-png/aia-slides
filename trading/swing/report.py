"""Daily swing report: reports/YYYY-MM-DD.md + .png. PAPER ONLY.
  python3 report.py [--root data/books] [--out reports]
All books since start; the 21:00 -> 21:00 Bangkok period; win rate, average win/loss, expectancy,
profit factor; Opus calibration (opened trades and the scored best_idea of every answer); tokens.
"""
import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

import env  # noqa: F401
import rules as R
from common import BKK, bkk, jlines, load_cache

HERE = Path(__file__).resolve().parent


def read_eq(d):
    f = Path(d) / "equity.csv"
    if not f.exists():
        return None
    rows = [x.split(",") for x in f.read_text().splitlines()]
    head, body = rows[0], [r for r in rows[1:] if r and r[0] != "t"]
    df = pd.DataFrame([r[:len(head)] for r in body], columns=head).astype(float)
    df.index = pd.to_datetime(df["t"].astype("int64"), unit="ms", utc=True).dt.tz_convert(BKK)
    return df


def stats(exits, start_eq):
    if not exits:
        return dict(n=0)
    pnl = np.array([e["pnl"] for e in exits])
    r = np.array([e.get("r", np.nan) for e in exits], dtype=float)
    w, l = pnl[pnl > 0], pnl[pnl <= 0]
    eq = start_eq + np.cumsum(pnl)
    peak = np.maximum.accumulate(np.r_[start_eq, eq])
    return dict(n=len(pnl), win=len(w) / len(pnl), avg_win=w.mean() if len(w) else 0, avg_loss=l.mean() if len(l) else 0,
                exp_usd=pnl.mean(), exp_r=np.nanmean(r) if np.isfinite(r).any() else np.nan,
                pf=w.sum() / -l.sum() if l.sum() < 0 else np.inf, pnl=pnl.sum(), maxdd=100 * ((np.r_[start_eq, eq] - peak) / peak).min())


def fmt(name, s, eq, start_eq):
    ret = 100 * (eq / start_eq - 1)
    if not s["n"]:
        return f"| {name} | 0 | - | - | - | - | - | {eq:,.2f} | {ret:+.2f}% |"
    return (f"| {name} | {s['n']} | {100 * s['win']:.0f}% | {s['avg_win']:+.2f} / {s['avg_loss']:+.2f} | "
            f"{s['exp_usd']:+.2f} | {'-' if s['exp_r'] != s['exp_r'] else format(s['exp_r'], '+.2f')} | {s['pf']:.2f} | {eq:,.2f} | {ret:+.2f}% |")


def score_idea(m1, t_ms, d, stop, tgt):
    """First touch after t_ms: 1 target, 0 stop (stop wins a tie), None unresolved; stops at 5 days / weekend."""
    x = m1[(m1["t"] > t_ms) & (m1["t"] <= t_ms + R.MAX_HOLD_MS)]
    for t, h, l in zip(x["t"].values, x["h"].values, x["l"].values):
        if R.weekend_close(int(t)):
            return None, "weekend"
        hs, ht = (l <= stop, h >= tgt) if d > 0 else (h >= stop, l <= tgt)
        if hs:
            return 0, "stop"
        if ht:
            return 1, "target"
    return None, "open" if len(x) and x["t"].iloc[-1] < t_ms + R.MAX_HOLD_MS else "time"


def calibration(dec, exits, m1, store):
    """Rows (source, p, hit) for opened trades (realised) and every best_idea (scored on 1m bars)."""
    res = json.loads(store.read_text()) if store.exists() else {}
    rows = []
    for e in exits:
        if e.get("p_target") is not None:
            rows.append(("trade", float(e["p_target"]), 1 if e["reason"] == "target" else 0))
    for x in dec:
        if str(x.get("result", "")).startswith(("ORDER long", "ORDER short")):
            continue                      # that idea was traded: counted once, as a trade
        bi = (x.get("answer") or {}).get("best_idea") or {}
        try:
            d = 1 if str(bi["dir"]).lower().startswith("l") else -1
            p, stop, tgt = float(bi["p_target"]), float(bi["stop"]), float(bi["target"])
        except (KeyError, TypeError, ValueError):
            continue
        if not ((d > 0 and stop < x["px"] < tgt) or (d < 0 and tgt < x["px"] < stop)):
            continue
        key = f"{x['id']}"
        if key not in res:
            hit, why = score_idea(m1, x["t_ms"], d, stop, tgt)
            if why in ("open",):
                continue
            res[key] = [p, hit]
        if res[key][1] is not None:
            rows.append(("idea", res[key][0], res[key][1]))
    store.write_text(json.dumps(res))
    return rows


def main(root, out):
    root, out = Path(root), Path(out)
    out.mkdir(parents=True, exist_ok=True)
    now = pd.Timestamp.now(tz=BKK)
    end = now.normalize() + pd.Timedelta(hours=21)
    end = end if now >= end - pd.Timedelta(minutes=30) else end - pd.Timedelta(days=1)
    start = end - pd.Timedelta(days=1)
    j = {b: jlines(root / b / "journal.jsonl") for b in ("ai", "flat2", "kelly_cal", "ai_1pct", "every4h", "cand15")}
    st = {b: json.loads((root / b / "state.json").read_text()) for b in j if (root / b / "state.json").exists()}
    eqs = {b: read_eq(root / b) for b in j}
    lines = [f"# Swing desk report (PAPER), {end.strftime('%Y-%m-%d')} 21:00 Bangkok", "",
             "PAXG/USDT, paper only. ai = one Opus call per 4h wake, code re-checks every rule; risk linear in Opus p (0.55 1%, 0.65 2%, >=0.75 3%), halts -5%/-8%, kill -15%; "
             "flat2 = same decisions at flat 2%; kelly_cal = eighth Kelly on calibrated p (0.5-3%, skip if f <= 0); "
             "ai_1pct = the same decisions at 1% risk, halts -3%/-6%, kill -10%; "
             "every4h = code takes every 4h Donchian-20 signal (unfiltered baseline, 3x cap); cand15 = 15m candidate (code, intraday rules).", ""]
    hdr = ["| Book | Trades | Win | Avg win / loss USD | Exp USD | Exp R | PF | Equity | Return |", "|---|---|---|---|---|---|---|---|---|"]
    caps = {"ai": R.CAPITAL, "flat2": R.CAPITAL, "kelly_cal": R.CAPITAL, "ai_1pct": R.CAPITAL, "every4h": R.CAPITAL, "cand15": 10_000.0}
    for label, lo in (("Since start", None), (f"Period {start.strftime('%m-%d %H:%M')} -> {end.strftime('%m-%d %H:%M')}", start)):
        lines += [f"## {label}", *hdr]
        for b in j:
            if b not in st:
                continue
            ex = [e for e in j[b] if e["kind"] == "EXIT" and (lo is None or pd.Timestamp(e["t"], tz=BKK) >= lo)]
            ex = [e for e in ex if pd.Timestamp(e["t"], tz=BKK) < end] if lo is not None else ex
            e = eqs[b]
            eq_now = float(e["equity"].iloc[-1]) if e is not None and len(e) else st[b]["equity"]
            base = caps[b]
            if lo is not None and e is not None and len(e[e.index < lo]):
                base = float(e[e.index < lo]["equity"].iloc[-1])
            lines.append(fmt(b, stats(ex, base), eq_now, base))
        lines.append("")
    ai_eq = eqs["ai"]
    if ai_eq is not None and len(ai_eq):
        bh = 100 * (ai_eq["px"].iloc[-1] / st["ai"]["start_px"] - 1)
        sh = [f"{c[1:]}x {ai_eq[c].iloc[-1]:,.2f}" + (" (liquidated)" if st["ai"]["shadows"][c[1:]]["dead"] else "")
              for c in ai_eq.columns if c.startswith("x")]
        lines += [f"PAXG buy and hold since the AI book started: {bh:+.2f}%. Shadow books (same AI decisions, fixed notional): {', '.join(sh)}.", ""]
    from follower import SPECS, CAPITAL as F_CAP
    lines += ["## The owner's real 70 USD account, mirroring the AI trades (code only)",
              "| Book | Trades | Wins | Trading | Locked | Total | Return | Max drawdown | Blown up / stopped out |", "|---|---|---|---|---|---|---|---|---|"]
    for n in (*SPECS, "real70_follow_2100"):
        fs = root / n / "state.json"
        if not fs.exists():
            continue
        x, fj = json.loads(fs.read_text()), jlines(root / n / "journal.jsonl")
        ex = [e for e in fj if e["kind"] == "EXIT"]
        dead = next((f"{e['t'][5:16]} {e.get('reason', e['kind'])}" for e in fj if e["kind"] in ("STOP_OUT", "DEAD")), "no")
        eq, lk = x["equity"] + 0.0, x.get("locked", 0.0)
        lines.append(f"| {n} | {len(ex)} | {sum(e['pnl'] > 0 for e in ex)} | {eq:.2f} | {lk:.2f} | {eq + lk:.2f} | {100 * ((eq + lk) / F_CAP - 1):+.1f}% | {x['maxdd']:.1f}% | {dead} |")
    ag = read_eq(root / "aggr30")
    if ag is not None and len(ag):
        wk = ag["equity"].groupby(ag.index.tz_localize(None).to_period("W-SUN")).agg(["first", "last"])
        lines += ["", "aggr30 weekly return vs the +30%/week target: " + "; ".join(
            f"week of {str(p.start_time.date())}: {100 * (r['last'] / r['first'] - 1):+.1f}% (target +30%)" if r["first"] > 0 else
            f"week of {str(p.start_time.date())}: dead" for p, r in wk.iterrows())]
    lines += [f"Withdrawal policy (real70_paxg, real70_follow_2100, aggr30; at the 21:02 run, from cash only): milestones once each "
              f"(2x start -> the 70 USD stake; 10k / 100k / 1M THB -> 30% / 40% / 50%; 1M USD -> 70%), then 25% of gains above the "
              f"high-water mark. Locked money never trades again. Rate fixed at {34.0:.1f} THB/USD.",
              "aggr30: 20% risk per trade, max 10x, main-book costs, stop-out at 50% margin level, dead stays dead. "
              "PAXG spot: 2% risk, max 1x, 0.10% fee per side. XAU CFD: always 1 oz (0.01 lot), 0.30/oz spread per side, "
              "1:100 margin, stop-out at 50% margin level; a stop of S USD loses about S USD, i.e. S/70 of the account.", ""]
    nd = env.HERE / "news"
    res = sorted(nd.glob("*/result*.json")) if nd.exists() else []
    if res:
        bk = json.loads((nd / "book.json").read_text())["equity"] if (nd / "book.json").exists() else 10_000.0
        lines += ["## News desk (separate PAPER book, 10,000 USD start, 1%% risk; live equity %.2f; sim = replay with a simulated actual)" % bk,
                  "| Event | Mode | Playbook | Actual (latency) | Decision | Trades | P&L | First fill | Opus tokens | Venice calls |",
                  "|---|---|---|---|---|---|---|---|---|---|"]
        for f in res:
            r = json.loads(f.read_text())
            act = "; ".join(f"{k.split()[0]} {v['value']} ({v['source']} {v['latency_s']}s; official {v.get('official_latency_s')}s, "
                            f"headline {v.get('headline_latency_s')}s)" for k, v in r["actual"].items()) or "none"
            tr = "; ".join(f"{'S' if t['dir'] < 0 else 'B'} {t['entry']}->{t['exit']} {t['reason']}" for t in r["trades"]) or "-"
            lines.append(f"| {r['event_id']} | {f.stem.replace('result', '').strip('_') or r['mode']} | {(r.get('summary') or '')[:70]} | {act} | "
                         f"{(r['decision'] or {}).get('scenario')} | {tr} | {r['pnl']:+.2f} | {r['first_fill_latency_s']} s | {r['opus_tokens']} | {r['venice_calls']} |")
        live = [json.loads(f.read_text()) for f in res if f.name == "result.json"]
        fb = sum(r.get("used_fallback", False) for r in live)
        vb = env.HERE / "news" / "venice_benchmark.json"
        vbt = json.loads(vb.read_text()) if vb.exists() else {}
        lines += [f"Fallback usage (live events): {fb}/{len(live)}" + (f" = {100 * fb / len(live):.0f}%" if live else "") +
                  " (decided without the actual number). Venice parser: " +
                  (f"{vbt.get('choice')} (benchmark {vbt.get('measured')}, median {vbt['models'][0]['median_s']} s)" if vbt.get("models") else "not benchmarked"), ""]
    import shocks as SH
    shk = jlines(root / "shocks.jsonl")
    per = [x for x in shk if start <= pd.Timestamp(x["t_ms"], unit="ms", tz="UTC").tz_convert(BKK) < end]
    us = env.HERE.parent / "us" / "summary.txt"
    if us.exists():
        lines += ["## US stocks side study (paper)", *us.read_text().strip().splitlines(), ""]
    lines += ["## Shocks and statements", f"Shocks (unscheduled moves; code blocked entries 30 min, tightened wrong-side stops): "
              f"{len(per)} in the period, {len(shk)} since start."]
    for x in per[-6:]:
        hl = "; ".join(f"{h['title'][:60]} [{h.get('impact', '?')}]" for h in (x.get("headlines") or [])[:2]) or "no headlines"
        lines.append(f"- {x['t']} {'up' if x['dir'] > 0 else 'down'} {x['move5']:+.1f} USD/5m ({x['x_atr']}x ATR1m), {x['action'].get('ai', '')}: {hl}")
    try:
        import statements as ST
        tally = ST.block(int(end.value // 10**6)).splitlines()[-1] if root == HERE / "data" / "books" else "(not fetched for this book root)"
    except Exception as e:
        tally = f"(statements fetch failed: {type(e).__name__})"
    lines += [f"Statements now: {tally}", ""]
    dec = [x for x in j["ai"] if x["kind"] == "DECISION"]
    fills = [x for x in j["ai"] if x["kind"] == "FILL"]
    lines += ["## AI decisions", f"Opus calls {len(dec)}, tokens {sum(x['tokens'] for x in dec):,} "
              f"(period: {sum(1 for x in dec if pd.Timestamp(x['t'], tz=BKK) >= start)} calls, "
              f"{sum(x['tokens'] for x in dec if pd.Timestamp(x['t'], tz=BKK) >= start):,} tokens). "
              f"Skipped wakes (no call, flat and entries blocked): {sum(1 for x in j['ai'] if x['kind'] == 'SKIP')}.",
              "| Time | Action | p | Lev | Result |", "|---|---|---|---|---|"]
    lines += [f"| {x['t'][5:16]} | {x['action']} | {x.get('p_target')} | {x.get('leverage')} | {x['result'][:90]} |" for x in dec[-12:]]
    if fills:
        lines += ["", "Fills: " + "; ".join(f"{x['t'][5:16]} {x['side']} lev {x['lev']}x (chosen {x['lev_chosen']}, {x['binding']} binds) p {x['p_target']}" for x in fills[-6:])]
    m1 = load_cache()
    rows = calibration(dec, [e for e in j["ai"] if e["kind"] == "EXIT"], m1, root / "ai" / "ideas_scored.json")
    lines += ["", "## Calibration (p_target vs target hit before stop; ideas = best_idea of every answer, scored on 1m bars, never traded)",
              "| p bucket | n | mean p | hit rate |", "|---|---|---|---|"]
    for lo_, hi_ in ((0, .4), (.4, .5), (.5, .55), (.55, .65), (.65, 1.01)):
        b = [r for r in rows if lo_ <= r[1] < hi_]
        lines.append(f"| {lo_:.2f}-{min(hi_, 1):.2f} | {len(b)} | {np.mean([r[1] for r in b]):.2f} | {np.mean([r[2] for r in b]):.2f} |" if b
                     else f"| {lo_:.2f}-{min(hi_, 1):.2f} | 0 | - | - |")
    lines += ["", f"Halts / kill: AI {st['ai'].get('halted_day')}, {st['ai'].get('halted_week')}, killed {st['ai'].get('killed')}." if "ai" in st else ""]
    path = out / f"{end.strftime('%Y-%m-%d')}.md"
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(9, 4), dpi=110)
        for b, e in eqs.items():
            if e is not None and len(e):
                ax.plot(e.index, 100 * (e["equity"] / caps[b] - 1), label=b, lw=1.4)
        if ai_eq is not None and len(ai_eq):
            ax.plot(ai_eq.index, 100 * (ai_eq["px"] / st["ai"]["start_px"] - 1), label="PAXG buy & hold", lw=1, color="0.6", ls="--")
        ax.axhline(0, color="0.8", lw=0.8)
        ax.set_ylabel("return since start, %")
        ax.legend(frameon=False, fontsize=8)
        ax.spines[["top", "right"]].set_visible(False)
        fig.tight_layout()
        fig.savefig(path.with_suffix(".png"))
        lines += ["", f"![equity]({path.with_suffix('.png').name})"]
    except Exception as e:  # chart is optional
        lines += ["", f"(chart failed: {type(e).__name__})"]
    path.write_text("\n".join(lines) + "\n")
    return path


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=str(HERE / "data" / "books"))
    ap.add_argument("--out", default=str(HERE / "reports"))
    a = ap.parse_args()
    print(main(a.root, a.out))
