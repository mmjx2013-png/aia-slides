"""Escalation desk for intraday SETUP events. PAPER ONLY.

  python3 desk.py brief <event_id|last>
      -> 'HAIKU <brief path>'  or  'SKIP <reason>' (no tokens spent)
  python3 desk.py answer <event_id> <haiku|sonnet|opus> '<json reply>' <tokens>
      -> 'SONNET <path>' | 'OPUS <path>' | 'ORDER <summary>' | 'DONE <reason>'
  python3 desk.py caps        today's calls and tokens

Daily caps (Bangkok day): 8 Haiku, 4 Sonnet, 1 Opus. After a cap: skip and log.
Events older than 10 minutes are skipped (the market has moved on).
"""
import json
import re
import sys
import time

import pandas as pd

import risk
from common import BKK, HERE, bkk, jappend, jdump, jlines, load_cache, resample
from paperbroker import write_order
from watcher import LIVE

CAPS = {"haiku": 8, "sonnet": 4, "opus": 1}
MAX_AGE_MS = 10 * 60_000


def today():
    return risk.bkk_day(int(time.time() * 1000))


def budget():
    f = LIVE / "budget" / f"{today()}.json"
    b = json.loads(f.read_text()) if f.exists() else {"calls": {k: 0 for k in CAPS}, "tokens": {k: 0 for k in CAPS}}
    return f, b


def event(eid):
    evs = jlines(LIVE / "events.jsonl")
    if not evs:
        sys.exit("SKIP no events")
    return evs[-1] if eid == "last" else next(e for e in evs if e["id"] == eid)


def state():
    f = LIVE / "state.json"
    return json.loads(f.read_text()) if f.exists() else {"equity": risk.CAPITAL, "pos": None}


def write_brief(ev, stage, extra=""):
    df = load_cache()
    df = df[df["t"] < ev["close_ms"]]                      # nothing after the setup bar
    m5 = resample(df.iloc[-600:], 5).iloc[-24:]
    rows = "\n".join(f"{bkk(t).strftime('%H:%M')} {r.o:.2f} {r.h:.2f} {r.l:.2f} {r.c:.2f} {r.v:.1f}"
                     for t, r in m5.iterrows())
    s = state()
    lo, hi = risk.STOP_ATR[:2]
    txt = f"""# PAPER intraday desk, setup {ev['id']}
Setup: {ev['setup']} ({ev['dir']}) at {ev['t_bkk']} Bangkok, price {ev['px']}. {ev['why']}. Also firing: {ev['also'] or 'none'}
Indicators: ATR14 1m {ev['atr1']}, 5m {ev['atr5']}, 15m {ev['atr15']}; 15m RSI {ev['rsi15']}, 15m z20 {ev['z15']}
Last 24 x 5m bars (Bangkok time, open high low close volume-PAXG):
{rows}
Book: equity {s['equity']:.2f} USD, open position: {'none' if not s.get('pos') else 'yes'}.
Risk engine (hard, in code): stop = {lo}-{hi} x ATR14(5m) = {lo*ev['atr5']:.2f}-{hi*ev['atr5']:.2f} USD; target = 1-4 x stop;
risk per trade <= 1% of equity; notional <= 3x equity; fill at next 1m open; flat by 03:30 Bangkok.
{extra}
{(HERE / 'prompts' / f'{stage}.md').read_text()}"""
    p = LIVE / "briefs" / ev["id"] / f"{stage}.md"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(txt)
    return p


def gate(ev, stage):
    f, b = budget()
    if b["calls"][stage] >= CAPS[stage]:
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
        return f"SKIP {why}" if stage == "haiku" else f"DONE skipped before {stage}: {why}"
    f, b = budget()
    b["calls"][stage] += 1
    jdump(f, b)
    return f"{stage.upper()} {write_brief(ev, stage, extra)}"


def parse(txt):
    m = re.search(r"\{.*\}", txt, re.S)
    return json.loads(m.group(0)) if m else {}


def answer(eid, stage, reply, tokens):
    ev = event(eid)
    dec = parse(reply)
    f, b = budget()
    b["tokens"][stage] += int(tokens)
    jdump(f, b)
    jappend(LIVE / "journal.jsonl", dict(kind="DECISION", t=str(pd.Timestamp.now(tz=BKK))[:19], event=ev["id"],
                                         stage=stage, tokens=int(tokens), answer=dec))
    if stage == "haiku":
        return issue(ev, "sonnet", f"Triage note: {dec.get('why', '')}") if dec.get("look") else "DONE triage said no"
    if stage == "sonnet" and (dec.get("high_stakes") or dec.get("conflict")):
        r = issue(ev, "opus", f"Trader proposal: {json.dumps(dec)}")
        if not r.startswith("DONE"):
            return r
    if dec.get("action") != "enter":
        return f"DONE {stage} skipped: {dec.get('why', '')}"
    ok, why = risk.entry_gate(state(), int(time.time() * 1000))
    if not ok:
        return f"DONE rejected by risk: {why}"
    o = write_order(LIVE, ev, dec)
    return f"ORDER {'long' if o['dir'] > 0 else 'short'} stop {o['stop_atr']}xATR5 target {o['target_r']}R risk {o['risk_pct']}%"


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[0] == "brief":
        print(issue(event(a[1]), "haiku"))
    elif a[0] == "answer":
        print(answer(a[1], a[2], a[3], a[4]))
    elif a[0] == "caps":
        print(json.dumps(budget()[1]))
