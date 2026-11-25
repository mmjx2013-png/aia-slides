"""Escalation desk for intraday SETUP events. PAPER ONLY.

  python3 desk.py brief <event_id|last>
      -> 'SONNET <brief path>'  or  'SKIP <reason>' (no tokens spent)
  python3 desk.py answer <event_id> <sonnet|opus> '<json reply>' <tokens>
      -> 'OPUS <path>' | 'ORDER <summary>' | 'DONE <reason>'
  python3 desk.py caps        today's calls and tokens

Daily caps (Bangkok day): 6 Sonnet, 3 Opus. After a cap: skip and log.
Sonnet screens (pass/skip), and ONLY Opus can enter, and only if p_target >= 0.65,
reward:risk after costs >= 1.5, trend agrees (or an argued mean-reversion case) and news is clear.
The code re-checks every one of these and logs Opus's p_target on every answer.
Events older than 10 minutes are skipped (the market has moved on).
"""
import json
from pathlib import Path
import re
import sys
import time

import pandas as pd

import risk
from common import BKK, HERE, bkk, jappend, jdump, jlines, load_cache, resample
from paperbroker import write_order
from watcher import LIVE
from news import headlines
from brief import context

CAPS = {"sonnet": 6, "opus": 3}
P_MIN, RR_MIN = 0.65, 1.5
MAX_AGE_MS = 10 * 60_000


def today():
    return risk.bkk_day(int(time.time() * 1000))


def budget():
    f = LIVE / "budget" / f"{today()}.json"
    b = json.loads(f.read_text()) if f.exists() else {"calls": {}, "tokens": {}}
    return f, b


def event(eid):
    evs = jlines(LIVE / "events.jsonl")
    if not evs:
        sys.exit("SKIP no events")
    return evs[-1] if eid == "last" else next(e for e in evs if e["id"] == eid)


def state():
    f = LIVE / "state.json"
    return json.loads(f.read_text()) if f.exists() else {"equity": risk.CAPITAL, "pos": None}


def write_brief(ev, stage, extra="", df=None, out=None):
    """df/out given = replay: history supplied, brief written to `out`, book shown as flat 10,000."""
    replay = df is not None
    df = load_cache() if df is None else df
    df = df[df["t"] < ev["close_ms"]]                      # nothing after the setup bar
    m5 = resample(df.iloc[-600:], 5).iloc[-12:]
    rows = "\n".join(f"{bkk(t).strftime('%H:%M')} {r.o:.2f} {r.h:.2f} {r.l:.2f} {r.c:.2f} {r.v:.1f}"
                     for t, r in m5.iterrows())
    s = {"equity": risk.CAPITAL, "pos": None} if replay else state()
    lo, hi = risk.STOP_ATR[:2]
    txt = f"""# PAPER intraday desk, setup {ev['id']}
Setup: {ev['setup']} ({ev['dir']}) at {ev['t_bkk']} Bangkok, price {ev['px']}. {ev['why']}. Also firing: {ev['also'] or 'none'}
Indicators: ATR14 1m {ev['atr1']}, 5m {ev['atr5']}, 15m {ev['atr15']}; 15m RSI {ev['rsi15']}, 15m z20 {ev['z15']}
Last 12 x 5m bars (Bangkok time, open high low close volume-PAXG):
{rows}
{context(ev['close_ms'], df, replay=replay)}

Book: equity {s['equity']:.2f} USD, open position: {'none' if not s.get('pos') else 'yes'}.
Risk engine (hard, in code): stop = {lo}-{hi} x ATR14(5m) = {lo*ev['atr5']:.2f}-{hi*ev['atr5']:.2f} USD; target = 1-4 x stop;
risk per trade <= 1% of equity; notional <= 3x equity; fill at next 1m open; flat by 03:30 Bangkok.
{extra}
{(HERE / 'prompts' / f'{stage}.md').read_text()}"""
    p = Path(out) if out else LIVE / "briefs" / ev["id"] / f"{stage}.md"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(txt)
    return p


def gate(ev, stage):
    f, b = budget()
    if b["calls"].get(stage, 0) >= CAPS[stage]:
        return f"{stage} cap {CAPS[stage]}/day reached"
    if time.time() * 1000 - ev["close_ms"] > MAX_AGE_MS:
        return "event older than 10 minutes"
    ok, why = risk.entry_gate(state(), int(time.time() * 1000))
    return None if ok else why


def issue(ev, stage, extra=""):
    why = gate(ev, stage)
    if why:
        jappend(LIVE / "journal.jsonl", dict(kind="SKIP", t=str(pd.Timestamp.now(tz=BKK))[:19], event=ev["id"],
                                             stage=stage, reason=why))
        return f"SKIP {why}" if stage == "sonnet" else f"DONE skipped before {stage}: {why}"
    f, b = budget()
    b["calls"][stage] = b["calls"].get(stage, 0) + 1
    jdump(f, b)
    return f"{stage.upper()} {write_brief(ev, stage, extra)}"


def parse(txt):
    m = re.search(r"\{.*\}", txt, re.S)
    return json.loads(m.group(0)) if m else {}


def opus_rules(ev, dec):
    """The owner's entry rules, enforced in code. Returns '' if all pass, else the reason."""
    if dec.get("action") != "enter":
        return ""
    o = risk.clamp(dec)
    stop = o["stop_atr"] * ev["atr5"]
    rr = (o["target_r"] * stop - 2 * risk.COST) / (stop + 2 * risk.COST)
    try:
        p = float(dec.get("p_target"))
    except (TypeError, ValueError):
        return "rule (a): no p_target"
    if p < P_MIN:
        return f"rule (a): p_target {p:.2f} < {P_MIN}"
    if rr < RR_MIN:
        return f"rule (b): reward:risk after costs {rr:.2f} < {RR_MIN}"
    if not dec.get("trend_ok") and not str(dec.get("mean_reversion_case", "")).strip():
        return "rule (c): trend disagrees and no mean-reversion case"
    if dec.get("news_clear") is not True:
        return "rule (d): news not clear"
    return ""


def answer(eid, stage, reply, tokens):
    ev = event(eid)
    dec = parse(reply)
    f, b = budget()
    b["tokens"][stage] = b["tokens"].get(stage, 0) + int(tokens)
    jdump(f, b)
    jappend(LIVE / "journal.jsonl", dict(kind="DECISION", t=str(pd.Timestamp.now(tz=BKK))[:19], event=ev["id"],
                                         stage=stage, tokens=int(tokens), answer=dec))
    if stage == "sonnet":
        if dec.get("action") not in ("pass", "enter"):
            return f"DONE sonnet skipped: {dec.get('why', '')}"
        r = issue(ev, "opus", f"Second-screen proposal: {json.dumps(dec)}\n\n## Headlines\n{headlines(ev['close_ms'])}")
        return r if not r.startswith("DONE") else r
    fail = opus_rules(ev, dec)
    if dec.get("action") != "enter" or fail:
        why = fail or dec.get("why", "")
        jappend(LIVE / "journal.jsonl", dict(kind="SKIP", t=str(pd.Timestamp.now(tz=BKK))[:19], event=ev["id"],
                                             stage="opus", reason=why, p_target=dec.get("p_target")))
        return f"DONE opus skipped (p={dec.get('p_target')}): {why}"
    ok, why = risk.entry_gate(state(), int(time.time() * 1000))
    if not ok:
        return f"DONE rejected by risk: {why}"
    o = write_order(LIVE, ev, dec)
    return f"ORDER {'long' if o['dir'] > 0 else 'short'} stop {o['stop_atr']}xATR5 target {o['target_r']}R risk {o['risk_pct']}%"


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[0] == "brief":
        print(issue(event(a[1]), "sonnet"))
    elif a[0] == "answer":
        print(answer(a[1], a[2], a[3], a[4]))
    elif a[0] == "caps":
        print(json.dumps(budget()[1]))
