"""The ONE Opus portfolio call for the fund launch (PAPER research; the owner places real orders by hand).

  python3 portfolio.py brief                     -> research/pm_brief.md (12 condensed memos + screen rows + price stats)
  python3 portfolio.py apply '<json>' <tokens>   -> code checks the PM's answer against the mandate and the boss's rules,
                                                    then writes portfolio.md and orders.md
Rules checked in code (boss decisions 2026-11-27):
- satellite: 0-8 names, each <= 8%, total <= 40%; ONLY names the PM stands behind; every unfilled slot goes to the core ETF;
- <= 20% per industry group (energy and semis/memory each count as one); <= 1 refiner; <= 2 energy names;
- AI hardware (MU, LRCX, NVDA, AVGO, AMD, and any name with > 30% of revenue from data-centre/cloud/AI customers, e.g. JBL,
  FLEX): at most 2 names and at most 12% of the WHOLE fund; at most 1 of JBL/FLEX; negative FCF -> not eligible;
- AI-hardware positions are built in the same 3 weekly tranches as the core.
"""
import json
import re
import sys

import numpy as np
import pandas as pd

import prices as P

HERE = P.HERE
REFINERS = {"PSX", "MPC", "VLO"}
AI_HW = {"MU", "LRCX", "NVDA", "AVGO", "AMD", "JBL", "FLEX", "AMAT", "KLAC"}
EMS = {"JBL", "FLEX"}
AI_CAP, AI_NAMES = 12.0, 2
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
- Satellite up to 40%: choose 0 to 8 of the 12 finalists below, ONLY names you can stand behind with a written thesis.
  Never force picks: every unfilled slot stays in the core ETF. Each name at most 8%. Weights sum to at most 40.
- At most 20% in one industry group; energy (oil, refining, pipelines, oilfield equipment) counts as ONE group, semis/memory as ONE.
- At most ONE refiner (PSX, MPC). At most 2 energy names in total.
- AI hardware (MU, LRCX, NVDA and any name with > 30% of revenue from data-centre/cloud/AI customers, incl. JBL and FLEX):
  at most 2 names and at most 12% of the whole fund together; at most 1 of JBL/FLEX; a name with negative FCF is not eligible.
  The core ETF already carries heavy AI/mega-cap exposure, and the AI leaders are in a sharp drawdown. These positions are
  bought in 3 weekly tranches like the core. Mark each holding "ai_hardware": true/false.
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
{{"holdings": [{{"ticker": "XXX", "weight": 6.0, "ai_hardware": false, "reason": "<= 25 words", "thesis": "<= 40 words",
                "breaks": ["signal 1", "signal 2", "signal 3"]}}],
 "unfilled_reason": "<= 40 words if the satellite is below 40%",
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
    if len(h) > 8:
        bad.append(f"{len(h)} holdings (max 8)")
    fcf = dict(zip(fin["ticker"], fin.get("fcf_yield_used", pd.Series([np.nan] * len(fin)))))
    for x in h:
        if x["ticker"] not in grp:
            bad.append(f"{x['ticker']} is not a finalist")
        if float(x["weight"]) > 8 + 1e-9:
            bad.append(f"{x['ticker']} weight {x['weight']} > 8")
        if not x.get("thesis") or len(x.get("breaks") or []) < 2:
            bad.append(f"{x['ticker']} needs a thesis and at least 2 breaks")
    tot = sum(float(x["weight"]) for x in h)
    if tot > 40 + 0.01:
        bad.append(f"satellite weights sum to {tot} > 40")
    by = {}
    for x in h:
        by[grp.get(x["ticker"])] = by.get(grp.get(x["ticker"]), 0) + float(x["weight"])
    bad += [f"group {g} at {w}% > 20%" for g, w in by.items() if w > 20 + 1e-9]
    names = {x["ticker"] for x in h}
    if len(names & REFINERS) > 1:
        bad.append("more than one refiner")
    if sum(grp.get(t) == "energy" for t in names) > 2:
        bad.append("more than 2 energy names")
    ai = {x["ticker"] for x in h if x["ticker"] in AI_HW or x.get("ai_hardware")}
    if len(ai) > AI_NAMES:
        bad.append(f"{len(ai)} AI-hardware names (max {AI_NAMES})")
    w_ai = sum(float(x["weight"]) for x in h if x["ticker"] in ai)
    if w_ai > AI_CAP + 1e-9:
        bad.append(f"AI hardware {w_ai}% of the fund > {AI_CAP}%")
    if len(names & EMS) > 1:
        bad.append("both JBL and FLEX")
    for t in names:
        if fcf.get(t) is not None and fcf.get(t) == fcf.get(t) and fcf[t] <= 0:
            bad.append(f"{t} has negative FCF: not eligible")
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
    sat = sum(float(x["weight"]) for x in h)
    core_w = 100 - sat
    ai = [x for x in h if x["ticker"] in AI_HW or x.get("ai_hardware")]
    L = ["# Fund portfolio: target weights (PAPER research; the owner places real orders by hand)", "",
         f"Decided {log['t']} Bangkok by one Opus call ({int(tokens):,} tokens) on 12 Sonnet memos, then checked in code against MANDATE.md.", "",
         "| Holding | Weight | Group | Reason |", "|---|---|---|---|",
         f"| {core} (core, S&P 500; expense ratio {er}%/y, the lowest of {', '.join(c for c, _ in CORE)}) | {core_w:.1f}% | core | the benchmark itself, bought in 3 weekly tranches"
         + (f"; includes {40 - sat:.1f}% of unfilled satellite" if sat < 40 - 0.01 else "") + " |"]
    grp = dict(zip(fin["ticker"], fin["group"]))
    for x in h:
        L.append(f"| {x['ticker']} | {float(x['weight']):.1f}% | {grp[x['ticker']]} | {x['reason']} |")
    if sat < 40 - 0.01:
        L += ["", f"**The satellite is partly unfilled: {sat:.1f}% of 40%.** {ans.get('unfilled_reason', '')} The unfilled "
              f"{40 - sat:.1f}% sits in {core} until a name passes research (WATCH names are re-checked at each quarterly review or new 10-Q/10-K)."]
    L += ["", "Industry exposure in the satellite: " + ", ".join(f"{g} {w:.1f}%" for g, w in sorted(by.items(), key=lambda kv: -kv[1])) + ".",
          "", "## Theses and what breaks them"]
    for x in h:
        L += [f"### {x['ticker']} ({float(x['weight']):.1f}%)", f"Thesis: {x['thesis']}", "Breaks if:", *[f"- {b}" for b in x["breaks"]], ""]
    L += ["## Not chosen", *[f"- {k}: {v}" for k, v in (ans.get("rejected") or {}).items()], "", "## Portfolio risks", ans.get("risks", ""), "",
          "Memos: research/<TICKER>.md. Rules: MANDATE.md. This is research, not advice: weights are percentages of whatever amount the owner chooses."]
    (HERE / "portfolio.md").write_text("\n".join(L) + "\n")
    t1 = core_w / 3
    aiw = lambda x: f"BUY {float(x['weight']) / 3:.2f}% {x['ticker']}"
    O = ["# Orders for the owner (plain lines; percentages of the amount the owner commits; PAPER research)", "",
         f"Prepared {log['t']} Bangkok. Place by hand on Webull Thailand; fractional shares; limit or market at the open, owner's choice.", "",
         "## Week of 2026-11-30", f"BUY {t1:.1f}% {core} (core tranche 1/3)",
         *[f"BUY {float(x['weight']):.1f}% {x['ticker']}" for x in h if x not in ai], *[aiw(x) + " (AI-hardware tranche 1/3)" for x in ai], "",
         "## Week of 2026-12-07", f"BUY {t1:.1f}% {core} (core tranche 2/3)", *[aiw(x) + " (AI-hardware tranche 2/3)" for x in ai], "",
         "## Week of 2026-12-14", f"BUY {t1:.1f}% {core} (core tranche 3/3)", *[aiw(x) + " (AI-hardware tranche 3/3)" for x in ai], "",
         "Until all tranches are bought, the rest of the amount waits in cash (USD)."]
    (HERE / "orders.md").write_text("\n".join(O) + "\n")
    return f"OK {len(h)} holdings: " + ", ".join(f"{x['ticker']} {float(x['weight']):.1f}%" for x in h) + f"; core {core}"


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[0] == "brief":
        print(brief())
    elif a[0] == "apply":
        print(apply(a[1], a[2]))
