"""The ONE Opus portfolio call for the fund launch (PAPER research; the owner places real orders by hand).

  python3 portfolio.py brief                     -> research/pm_brief.md (12 condensed memos + screen rows + price stats)
  python3 portfolio.py apply '<json>' <tokens>   -> code checks the PM's answer against the mandate and the boss's rules,
                                                    then writes portfolio.md and orders.md
Rules checked in code: 5-8 satellite names; each <= 8%; satellite total 40%; <= 20% per industry group (energy and
semis/memory each count as one); at most 1 refiner (PSX/MPC); at most 2 energy names; at most 2 of MU/LRCX/NVDA unless
the answer argues an exception in writing.
"""
import json
import re
import sys

import numpy as np
import pandas as pd

import prices as P

HERE = P.HERE
REFINERS = {"PSX", "MPC", "VLO"}
SEMIS3 = {"MU", "LRCX", "NVDA"}
CORE = [("SPYM", 0.02), ("VOO", 0.03), ("IVV", 0.03)]        # expense ratio %/y (issuer data as known; the owner verifies on Webull TH)
BRIEF_CHARS = 10_000                                          # ~2.5k tokens per condensed memo


def brief():
    fin = pd.read_csv(HERE / "finalists.csv")
    tick = list(fin["ticker"])
    ret = pd.DataFrame({t: P.load(t)["adj"].pct_change() for t in tick + ["SPY"] if P.load(t) is not None}).iloc[-252:]
    corr = ret.corr().round(2)
    memos = []
    for t in tick:
        f = HERE / "research" / "brief" / f"{t}.md"
        memos.append(f"### {t}\n" + (f.read_text()[:BRIEF_CHARS] if f.exists() else "(memo missing)"))
    cols = ["ticker", "group", "composite", "s_quality", "s_growth", "s_balance", "s_valuation", "s_momentum", "mom_12_1", "fcf_yield_used",
            "ev_ebit_used", "cyclical_normalized"]
    txt = f"""# PAPER fund launch: portfolio decision (research test; the owner places real orders by hand)

## Mandate (hard rules, re-checked in code)
- Core 60%: one S&P 500 ETF, bought in 3 weekly tranches from the week of 2026-11-30. You do not choose it (code picks the lowest
  expense ratio of {', '.join(f'{c} {e}%' for c, e in CORE)}).
- Satellite 40%: choose 5 to 8 of the 12 finalists below. Each name at most 8%. Weights must sum to exactly 40.
- At most 20% in one industry group; energy (oil, refining, pipelines, oilfield equipment) counts as ONE group, semis/memory as ONE.
- At most ONE refiner (PSX, MPC). At most 2 energy names in total.
- At most 2 of MU / LRCX / NVDA, unless you argue in writing why 3 is better (field "semis_exception").
- A holding is sold when its thesis breaks, not on price alone. So each holding needs a thesis and concrete, checkable "breaks" signals.
- Benchmark: S&P 500 total return. The satellite is folded into the core if it trails the S&P 500 over any rolling 12 months,
  so pick names you expect to beat the index, not just to be good companies.

## Screen rows (percentile scores 0-1; cyclicals on normalized numbers)
{fin[cols].round(3).to_csv(index=False)}
## 1-year daily-return correlations (with SPY)
{corr.to_csv()}
## Condensed memos (Sonnet drafts from the 10-K, XBRL and 30 days of headlines)
{chr(10).join(memos)}

## Your answer
Reply with ONLY this JSON:
{{"holdings": [{{"ticker": "XXX", "weight": 6.0, "reason": "<= 25 words", "thesis": "<= 40 words",
                "breaks": ["signal 1", "signal 2", "signal 3"]}}],
 "semis_exception": "",
 "rejected": {{"TICKER": "<= 15 words why not"}},
 "risks": "<= 60 words on the portfolio as a whole (factor bets, correlation, what would make the satellite trail the index)"}}
"""
    p = HERE / "research" / "pm_brief.md"
    p.write_text(txt)
    return p, len(txt) // 4


def check(ans, fin):
    h = ans.get("holdings") or []
    grp = dict(zip(fin["ticker"], fin["group"]))
    bad = []
    if not 5 <= len(h) <= 8:
        bad.append(f"{len(h)} holdings (need 5-8)")
    for x in h:
        if x["ticker"] not in grp:
            bad.append(f"{x['ticker']} is not a finalist")
        if float(x["weight"]) > 8 + 1e-9:
            bad.append(f"{x['ticker']} weight {x['weight']} > 8")
        if not x.get("thesis") or len(x.get("breaks") or []) < 2:
            bad.append(f"{x['ticker']} needs a thesis and at least 2 breaks")
    tot = sum(float(x["weight"]) for x in h)
    if abs(tot - 40) > 0.01:
        bad.append(f"satellite weights sum to {tot}, not 40")
    by = {}
    for x in h:
        by[grp.get(x["ticker"])] = by.get(grp.get(x["ticker"]), 0) + float(x["weight"])
    bad += [f"group {g} at {w}% > 20%" for g, w in by.items() if w > 20 + 1e-9]
    names = {x["ticker"] for x in h}
    if len(names & REFINERS) > 1:
        bad.append("more than one refiner")
    if sum(grp.get(t) == "energy" for t in names) > 2:
        bad.append("more than 2 energy names")
    if len(names & SEMIS3) > 2 and not str(ans.get("semis_exception", "")).strip():
        bad.append("3 of MU/LRCX/NVDA without a written exception")
    return bad, by


def apply(reply, tokens):
    m = re.search(r"\{.*\}", reply, re.S)
    ans = json.loads(m.group(0))
    fin = pd.read_csv(HERE / "finalists.csv")
    bad, by = check(ans, fin)
    log = dict(t=str(pd.Timestamp.now(tz="Asia/Bangkok"))[:16], opus_tokens=int(tokens), problems=bad, answer=ans)
    with open(HERE / "research" / "pm_decisions.jsonl", "a") as f:
        f.write(json.dumps(log) + "\n")
    if bad:
        return "REJECTED by the code check: " + "; ".join(bad)
    core, er = min(CORE, key=lambda c: c[1])
    h = sorted(ans["holdings"], key=lambda x: -float(x["weight"]))
    L = ["# Fund portfolio: target weights (PAPER research; the owner places real orders by hand)", "",
         f"Decided {log['t']} Bangkok by one Opus call ({int(tokens):,} tokens) on 12 Sonnet memos, then checked in code against MANDATE.md.", "",
         "| Holding | Weight | Group | Reason |", "|---|---|---|---|",
         f"| {core} (core, S&P 500; expense ratio {er}%/y, the lowest of {', '.join(c for c, _ in CORE)}) | 60.0% | core | the benchmark itself, bought in 3 weekly tranches |"]
    grp = dict(zip(fin["ticker"], fin["group"]))
    for x in h:
        L.append(f"| {x['ticker']} | {float(x['weight']):.1f}% | {grp[x['ticker']]} | {x['reason']} |")
    L += ["", "Industry exposure in the satellite: " + ", ".join(f"{g} {w:.1f}%" for g, w in sorted(by.items(), key=lambda kv: -kv[1])) + ".",
          "", "## Theses and what breaks them"]
    for x in h:
        L += [f"### {x['ticker']} ({float(x['weight']):.1f}%)", f"Thesis: {x['thesis']}", "Breaks if:", *[f"- {b}" for b in x["breaks"]], ""]
    if str(ans.get("semis_exception", "")).strip():
        L += ["## Semis exception (3 of MU/LRCX/NVDA)", ans["semis_exception"], ""]
    L += ["## Not chosen", *[f"- {k}: {v}" for k, v in (ans.get("rejected") or {}).items()], "", "## Portfolio risks", ans.get("risks", ""), "",
          "Memos: research/<TICKER>.md. Rules: MANDATE.md. This is research, not advice: weights are percentages of whatever amount the owner chooses."]
    (HERE / "portfolio.md").write_text("\n".join(L) + "\n")
    t1 = 60 / 3
    O = ["# Orders for the owner (plain lines; percentages of the amount the owner commits; PAPER research)", "",
         f"Prepared {log['t']} Bangkok. Place by hand on Webull Thailand; fractional shares; limit or market at the open, owner's choice.", "",
         "## Week of 2026-11-30", f"BUY {t1:.1f}% {core} (core tranche 1/3)", *[f"BUY {float(x['weight']):.1f}% {x['ticker']}" for x in h], "",
         "## Week of 2026-12-07", f"BUY {t1:.1f}% {core} (core tranche 2/3)", "",
         "## Week of 2026-12-14", f"BUY {t1:.1f}% {core} (core tranche 3/3)", "",
         "Until tranches 2 and 3 are bought, the remaining 40% of the amount stays in cash (USD)."]
    (HERE / "orders.md").write_text("\n".join(O) + "\n")
    return f"OK {len(h)} holdings: " + ", ".join(f"{x['ticker']} {float(x['weight']):.1f}%" for x in h) + f"; core {core}"


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[0] == "brief":
        print(brief())
    elif a[0] == "apply":
        print(apply(a[1], a[2]))
