"""One-off AI replay test (PAPER research). Does the Opus final-decision filter add expectancy after costs?

  python3 replay_ai.py select      # run the CURRENT live detector over 2026-07-01..2026-11-20, pick ~32 setups
                                   # stratified by month x type with a fixed seed; writes the list BEFORE any model call
  python3 replay_ai.py briefs      # one Opus brief per setup: bars up to the setup only, headlines from strictly
                                   # earlier days (Google News before:<date>, re-filtered in code), no calendar
  python3 replay_ai.py record <id> '<json>' <tokens>
  python3 replay_ai.py report      # code simulates exits: (a) every selected setup with default params,
                                   # (b) only Opus entries with Opus's params; bootstrap CI; calibration
Same simulation rules as live: fill at the next 1m open, 0.35 USD/oz each side, stop wins a tie, gap at the open,
breakeven at +1R, flat at 03:30 Bangkok, results in R. The calendar guard is NOT replayed (no historical calendar).
"""
import json
import random
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import risk                                   # noqa: E402
import watcher                                # noqa: E402
from common import indicators, resample      # noqa: E402
from desk import write_brief, opus_rules      # noqa: E402
from search import load                       # noqa: E402

OUT = HERE.parent / "data" / "replay_ai"
REP = HERE.parent / "reports"
SEL = REP / "ai_replay_setups.json"
START, END = pd.Timestamp("2026-07-01", tz="UTC"), pd.Timestamp("2026-11-21", tz="UTC")
SEED, N = 20261125, 32


def history():
    df = load()
    return df[(df.index >= START - pd.Timedelta(days=60)) & (df.index < END + pd.Timedelta(days=2))]


def select():
    if SEL.exists():
        raise SystemExit(f"{SEL} exists: the selection is frozen")
    df = history()
    m1, m5, m15 = indicators(df), indicators(resample(df, 5)), indicators(resample(df, 15))
    ends5, ends15 = set(m5["end"]), set(m15["end"])
    evs, last = [], None
    idx = df.index[(df.index >= START) & (df.index < END)]
    # same detector, with the bucket sets precomputed (detect() rebuilds them per call: too slow for 200k bars)
    for t in idx:
        close_ms = int(t.value // 10**6) + 60_000
        if risk.in_flat_window(close_ms) or risk.is_weekend(close_ms):
            continue
        if last is not None and t - last < watcher.THROTTLE:
            continue
        s = watcher.detect(m1, m5, m15, t, ends5, ends15)
        if s:
            last = t
            evs.append(watcher.make_event(m1, m5, m15, t, s))
    pop = pd.DataFrame(evs)
    pop["month"] = pop["t_bkk"].str[:7]
    rng = random.Random(SEED)
    cells = {k: list(g.index) for k, g in pop.groupby(["month", "setup"])}
    pick = []
    for k in sorted(cells):
        rng.shuffle(cells[k])
    while len(pick) < N and any(cells.values()):            # round-robin over cells -> stratified
        for k in sorted(cells):
            if cells[k] and len(pick) < N:
                pick.append(cells[k].pop())
    sel = pop.loc[sorted(pick)].drop(columns="month").to_dict("records")
    REP.mkdir(exist_ok=True)
    SEL.write_text(json.dumps(dict(seed=SEED, window=[str(START.date()), str(END.date())], population=len(pop),
                                   population_by_type=pop["setup"].value_counts().to_dict(),
                                   selected=sel), indent=1, default=str))
    print(f"population {len(pop)} setups; selected {len(sel)} -> {SEL}")


def headlines(close_ms, days=3, n=8):
    day = pd.Timestamp(close_ms, unit="ms", tz="UTC").normalize()
    out = []
    for q in ("gold price", "Fed OR dollar OR Treasury yields"):
        qq = f"{q} after:{(day - pd.Timedelta(days=days)).date()} before:{day.date()}"
        url = "https://news.google.com/rss/search?" + urllib.parse.urlencode({"q": qq, "hl": "en-US", "gl": "US", "ceid": "US:en"})
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "paper-desk/1.0"}), timeout=15) as r:
                root = ET.fromstring(r.read())
            items = sorted(((parsedate_to_datetime(i.findtext("pubDate")), i.findtext("title")) for i in root.iter("item")),
                           reverse=True)
            items = [(ts, ti) for ts, ti in items if ts < day.to_pydatetime()]   # strictly earlier days only
            out.append(f"[{q}] {len(items)} headlines from the {days} days BEFORE the setup day (no same-day news)"
                       + "".join(f"\n- {ts:%Y-%m-%d}: {ti}" for ts, ti in items[:n]))
        except Exception as e:
            out.append(f"[{q}] news fetch failed: {type(e).__name__}")
        time.sleep(1.5)
    return "\n".join(out)


def briefs():
    sel = json.loads(SEL.read_text())["selected"]
    df = history()
    OUT.mkdir(parents=True, exist_ok=True)
    for ev in sel:
        p = OUT / f"{ev['id']}.md"
        if p.exists():
            continue
        extra = ("Second screen: skipped in this replay test (Opus decides directly).\n\n## Headlines\n" + headlines(ev["close_ms"]))
        write_brief(ev, "opus", extra, df=df, out=p)
        txt = p.read_text().replace("together with the last 3 hours of\nheadlines (none published after the setup).",
                                    "together with headlines from the days before the setup day.")
        p.write_text(txt)
    print("\n".join(str(OUT / f"{e['id']}.md") for e in sel))


def record(eid, reply, tokens):
    import re
    m = re.search(r"\{.*\}", reply, re.S)
    dec = json.loads(m.group(0)) if m else {}
    f = OUT / "answers.jsonl"
    with open(f, "a") as fh:
        fh.write(json.dumps(dict(id=eid, tokens=int(tokens), answer=dec)) + "\n")
    print(eid, dec.get("action"), dec.get("p_target"))


# ------------------------------------------------------------------ simulation
def sim(df, ev, d, stop_atr, target_r, be=True):
    """R after costs for one trade, plus whether the target was hit before the stop."""
    t = np.searchsorted(df["t"].to_numpy(), ev["close_ms"])            # next 1m bar open
    O, H, L, C, T = (df[k].to_numpy() for k in ("o", "h", "l", "c", "t"))
    S = stop_atr * ev["atr5"]
    ent = O[t] + d * risk.COST
    stop, tgt, be_on = ent - d * S, ent + d * target_r * S, False
    for j in range(t, min(t + 24 * 60, len(O))):
        if risk.in_flat_window(int(T[j])):
            return (d * (O[j] - ent) - risk.COST) / S, False, "flat 03:30"
        hs = L[j] <= stop if d > 0 else H[j] >= stop
        ht = H[j] >= tgt if d > 0 else L[j] <= tgt
        if hs:
            px = min(O[j], stop) if d > 0 else max(O[j], stop)
            return (d * (px - ent) - risk.COST) / S, False, "breakeven" if be_on else "stop"
        if ht:
            px = max(O[j], tgt) if d > 0 else min(O[j], tgt)
            return (d * (px - ent) - risk.COST) / S, True, "target"
        if be and not be_on and ((H[j] - ent) if d > 0 else (ent - L[j])) >= S:
            stop, be_on = ent, True
    return (d * (C[j] - ent) - risk.COST) / S, False, "time"


def stats(r):
    r = np.asarray(r, float)
    if not len(r):
        return dict(n=0)
    w, l = r[r > 0], r[r <= 0]
    return dict(n=len(r), exp=r.mean(), win=len(w) / len(r), avg_win=w.mean() if len(w) else 0.0,
                avg_loss=l.mean() if len(l) else 0.0, pf=(w.sum() / -l.sum()) if l.sum() < 0 else float("inf"))


def report():
    meta = json.loads(SEL.read_text())
    sel = meta["selected"]
    ans = {a["id"]: a for a in map(json.loads, (OUT / "answers.jsonl").read_text().splitlines())}
    df = history()
    rows = []
    for ev in sel:
        a = ans.get(ev["id"])
        dflt = 1 if ev["dir"] == "long" else -1
        ra, _, why_a = sim(df, ev, dflt, risk.STOP_ATR[2], risk.TARGET_R[2])
        row = dict(id=ev["id"], setup=ev["setup"], month=ev["t_bkk"][:7], hint=ev["dir"], R_a=ra, exit_a=why_a)
        if a:
            dec = a["answer"]
            o = risk.clamp(dec)
            rb, hit, why_b = sim(df, ev, o["dir"], o["stop_atr"], o["target_r"])
            fail = opus_rules(ev, dec)
            entered = dec.get("action") == "enter" and not fail
            row.update(tokens=a["tokens"], action=dec.get("action"), rule_fail=fail, p=dec.get("p_target"),
                       opus_dir="long" if o["dir"] > 0 else "short", stop_atr=o["stop_atr"], target_r=o["target_r"],
                       R_opus_plan=rb, target_hit=hit, exit_b=why_b, entered=entered, R_b=rb if entered else np.nan,
                       why=str(dec.get("why", ""))[:140])
        rows.append(row)
    t = pd.DataFrame(rows)
    a_r, b_r = t["R_a"].to_numpy(), t.loc[t["entered"] == True, "R_b"].to_numpy()  # noqa: E712
    sa, sb = stats(a_r), stats(b_r)
    # bootstrap over the 32 setups: difference in expectancy per trade, and per setup offered
    rng = np.random.default_rng(SEED)
    diffs, diffs_off = [], []
    ent = (t["entered"] == True).to_numpy()  # noqa: E712
    rb_all = np.where(ent, t["R_b"].fillna(0).to_numpy(), 0.0)
    for _ in range(10000):
        i = rng.integers(0, len(t), len(t))
        diffs_off.append(rb_all[i].mean() - a_r[i].mean())
        if ent[i].any():
            diffs.append(rb_all[i][ent[i]].mean() - a_r[i].mean())
    ci = lambda x: (np.percentile(x, 2.5), np.percentile(x, 97.5))
    # calibration (Opus's own plan: target before stop), all answers
    c = t.dropna(subset=["p"]).copy()
    c["p"] = c["p"].astype(float)
    c["bucket"] = pd.cut(c["p"], [0, 0.4, 0.55, 0.65, 1.0], labels=["<0.40", "0.40-0.55", "0.55-0.65", ">=0.65"], include_lowest=True)
    cal = c.groupby("bucket", observed=False).agg(n=("p", "size"), mean_p=("p", "mean"), hit_rate=("target_hit", "mean")).reset_index()
    tok = int(t["tokens"].sum()) if "tokens" in t else 0
    f = lambda s: (f"| {s['n']} | {s['win']:.0%} | {s['avg_win']:+.2f} | {s['avg_loss']:+.2f} | **{s['exp']:+.3f}** | {s['pf']:.2f} |"
                   if s["n"] else "| 0 | - | - | - | - | - |")
    d_trade = (sb["exp"] - sa["exp"]) if sb["n"] else float("nan")
    lo, hi = ci(diffs) if diffs else (np.nan, np.nan)
    lo2, hi2 = ci(diffs_off)
    md = f"""# AI replay test: does Opus's final decision add expectancy after costs? (PAPER research)

Window {meta['window'][0]} to {meta['window'][1]}, after the model's knowledge cutoff. Setups come from the CURRENT live detector
(population {meta['population']}: {meta['population_by_type']}). **{len(t)} selected** by fixed seed {meta['seed']}, stratified by
month x setup type, and written to `ai_replay_setups.json` before any model saw them. One isolated Opus subagent per setup
(read one brief file, no other tools), same final-decision prompt and the same 4 entry rules as live (re-checked in code).
No Sonnet screen. Brief: bars up to the setup only; headlines from the 3 days BEFORE the setup day (same-day news excluded,
because Google News dates are day-granular). **Calendar guard not replayed** (no historical calendar on the allowed hosts).
Exits simulated in code: fill at the next 1m open, 0.35 USD/oz each side, stop wins a tie, breakeven at +1R, flat 03:30 Bangkok.
(a) every selected setup, live default params (hinted direction, stop 1.5 x ATR5, target 2R). (b) only setups Opus entered, with
Opus's direction, stop and target. R = P&L / stop distance, after costs.

## Results
| Book | Trades | Win rate | Avg win R | Avg loss R | Expectancy R | PF |
|---|---|---|---|---|---|---|
| (a) unfiltered: every setup {f(sa)}
| (b) Opus entries only {f(sb)}

- Difference in expectancy per trade, (b) − (a): **{d_trade:+.3f} R**, bootstrap 95% CI [{lo:+.3f}, {hi:+.3f}].
- Per setup OFFERED (skips count as 0 R; this is what the filter adds to the whole flow): (b) {rb_all.mean():+.3f} R vs (a) {a_r.mean():+.3f} R,
  difference {rb_all.mean() - a_r.mean():+.3f} R, 95% CI [{lo2:+.3f}, {hi2:+.3f}].
- Opus entered {int(ent.sum())} of {len(t)}; {int((t['action'] == 'enter').sum()) - int(ent.sum())} "enter" answers were blocked by the code's rule check.
- Tokens: **{tok:,}** for {t['tokens'].notna().sum()} Opus calls ({tok / max(t['tokens'].notna().sum(), 1):,.0f} per call).

## Calibration: Opus's stated p (target before stop) vs what happened on its own plan
{cal.to_markdown(index=False, floatfmt=".2f")}

## Every setup
{t[['id', 'setup', 'hint', 'R_a', 'exit_a', 'action', 'p', 'opus_dir', 'stop_atr', 'target_r', 'R_opus_plan', 'exit_b', 'entered', 'rule_fail', 'why']].to_markdown(index=False, floatfmt=".2f")}
"""
    (REP / "ai_replay.md").write_text(md)
    t.to_csv(OUT / "replay_table.csv", index=False)
    print(REP / "ai_replay.md")
    print(f"a {sa}\nb {sb}\ndiff/trade {d_trade:+.3f} CI [{lo:+.3f},{hi:+.3f}] per-offered {rb_all.mean()-a_r.mean():+.3f} CI [{lo2:+.3f},{hi2:+.3f}] tokens {tok}")


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "select":
        select()
    elif cmd == "briefs":
        briefs()
    elif cmd == "record":
        record(sys.argv[2], sys.argv[3], sys.argv[4])
    elif cmd == "report":
        report()
