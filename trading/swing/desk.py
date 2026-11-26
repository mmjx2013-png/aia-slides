"""Swing desk, PAXG, PAPER ONLY. One Opus call per 4h wake; everything else is code.

  python3 desk.py wake        sync 1m bars, replay them through every book, then
                              'OPUS <brief.md>' | 'SKIP <reason>' | 'ERROR KILL ...'
  python3 desk.py answer <id> '<json>' <tokens>
                              re-check Opus's answer in code -> 'ORDER ...' | 'HOLD' | 'REJECT ...'
  python3 desk.py sync        sync + replay only (after an order, before a report)
  python3 desk.py status
Books (data/books/): ai (Opus decisions; shadows fixed 1x/3x/10x/30x on the same decisions),
every4h (code: take every 4h Donchian-20 signal, 3x cap, the unfiltered baseline), cand15 (code:
15m candidate from the intraday research, intraday rules, true out-of-sample from 2026-11-25).
"""
import json
import re
import shutil
import sys
import time
from pathlib import Path

import pandas as pd

import env  # noqa: F401
import calendar_guard
import rules as R
from broker import Broker, write_pending
from follower import Follower, SPECS as FSPECS
from brief import build, _atr
from common import DATA, bkk, indicators, jappend, jlines, load_cache, resample
from market import frames, sync as market_sync
import paperbroker as ipb
from watcher import candidate, CAND_START

CAND_FROM = pd.Timestamp(CAND_START, tz="UTC")

BOOKS = DATA / "books"
AI, E4, C15 = BOOKS / "ai", BOOKS / "every4h", BOOKS / "cand15"
STALE_MS = 30 * 60_000
DECISION_DELAY_MS = 10 * 60_000          # code books fill when the AI would: ~10 min after the 4h close


def books(root=BOOKS):
    root = Path(root)
    c15 = root / "cand15"
    legacy = env.HERE.parent / "intraday" / "data" / "live" / "cand15"
    if not c15.exists() and legacy.exists() and root == BOOKS:   # carry the live candidate book over
        shutil.copytree(legacy, c15)
    ai = Broker(root / "ai")
    ai.one = Broker(root / "ai_1pct", shadows=(), profile=R.ONE_PCT)   # 1%-risk shadow, same decisions, old halts
    ai.followers = [Follower(root / n, n) for n in FSPECS]             # the owner's real 70 USD account, mirrored
    return ai, Broker(root / "every4h", shadows=(), profile=R.ONE_PCT), ipb.Broker(c15)


def signal4h(h4, close_ms):
    """Donchian-20 on closed 4h bars: close beyond the prior 20 bars' high/low. (dir, stop, target) or None."""
    k = h4.index.get_indexer([pd.Timestamp(close_ms - 4 * 3600_000, unit="ms", tz="UTC")])[0]
    if k < 30:
        return None
    b, prior = h4.iloc[k], h4.iloc[k - 20:k]
    atr = float(_atr(h4.iloc[:k + 1]).iloc[-1])
    d = 1 if b["c"] > prior["h"].max() else -1 if b["c"] < prior["l"].min() else 0
    if not d:
        return None
    stop = b["c"] - d * 2 * atr
    return d, round(stop, 2), round(b["c"] + d * 3 * 2 * atr, 2)


def replay(asof_ms, root=BOOKS, m1=None, start_ms=None):
    """Push every closed 1m bar not yet seen through all books, with the code books' signals.
    A new ai/every4h book starts at start_ms (default: 15 min before asof, i.e. at the first wake)."""
    start_ms = asof_ms - 15 * 60_000 if start_ms is None else start_ms
    ai, e4, c15 = books(root)
    m1 = load_cache() if m1 is None else m1
    m1 = m1[m1["t"] + 60_000 <= asof_ms]
    last = min(x for x in (ai.s["last_t"], e4.s["last_t"], c15.s["last_t"]) if x is not None) \
        if any(x is not None for x in (ai.s["last_t"], e4.s["last_t"], c15.s["last_t"])) else None
    new = m1 if last is None else m1[m1["t"] > last]
    if not len(new):
        return ai, e4, c15, 0
    h4 = frames(asof_ms, m1)["4h"]
    i1 = indicators(m1.iloc[-len(new) - 200:])
    m15 = indicators(resample(m1.iloc[-len(new) - 3000:], 15))
    ends15 = set(m15["end"])
    for t, r in new.iterrows():
        b = dict(t=int(r["t"]), o=r["o"], h=r["h"], l=r["l"], c=r["c"])
        started = ai.s["last_t"] is not None or b["t"] >= start_ms
        if started:
            ai.on_bar(b)
            ai.one.on_bar(b)
            e4.on_bar(b)
        a1 = i1["atr"].get(t)
        c15.on_bar(dict(b, atr1=None if a1 is None or a1 != a1 else float(a1), rng=float(r["h"] - r["l"])))
        close = int(r["t"]) + 60_000
        if started and close % (4 * 3600_000) == 0 and not e4.s["pos"] and not e4.pending():
            sig = signal4h(h4, close)
            if sig:
                write_pending(e4.d, "open", close + DECISION_DELAY_MS, id=f"{bkk(close).strftime('%Y%m%d-%H%M')}-4h",
                              dir=sig[0], stop=sig[1], target=sig[2], lev=R.BASE_LEV)
        ct = t + pd.Timedelta(minutes=1)
        if ct >= CAND_FROM and ct in ends15:
            d, b15 = candidate(m15, ct)
            if d:
                ipb.write_order(c15.d, dict(id=f"{bkk(ct).strftime('%Y%m%d-%H%M')}-cand15", atr5=float(b15["atr"])),
                                dict(dir="long" if d > 0 else "short", stop_atr=2.5, trail=True,
                                     why="15m donchian20 vol>1.5x faded, 2.5 ATR15 stop, ATR trail"), created_ms=close)
    for x in (ai, ai.one, e4, c15):
        x.save()
    return ai, e4, c15, len(new)


def now_ms():
    return int(time.time() * 1000)


def do_sync():
    ok, msg = calendar_guard.refresh()
    if not ok:
        print(f"ERROR {msg}")
    m1 = market_sync()
    return replay(now_ms(), m1=m1)


def need_opus(ai, t_ms):
    s = ai.s
    if s["killed"]:
        return f"kill switch tripped {s['killed']}: desk stopped"
    if s["pos"]:
        return None
    why = ai.entry_block(t_ms)
    return f"flat and no entry possible: {why}" if why else None


def wake(root=BOOKS, asof_ms=None, m1=None, heads=True, start_ms=None):
    live = asof_ms is None
    if live:
        ai, e4, c15, n = do_sync()
        asof_ms = now_ms()
    else:
        ai, e4, c15, n = replay(asof_ms, root, m1, start_ms)
    if ai.s["killed"] and not ai.s.get("kill_reported"):
        ai.s["kill_reported"] = True
        ai.save()
        return f"ERROR KILL switch tripped at {ai.s['killed']}: equity {ai.s['equity']:.2f}, peak {ai.s['peak']:.2f}. Desk flat, no new trades."
    wid = bkk(asof_ms).strftime("%Y%m%d-%H%M")
    skip = need_opus(ai, asof_ms)
    if skip:
        jappend(ai.d / "journal.jsonl", dict(kind="SKIP", t=str(bkk(asof_ms))[:19], t_ms=asof_ms, id=wid, reason=skip))
        return f"SKIP {skip}"
    fr = frames(asof_ms, m1)
    from news import headlines
    txt, facts = build(asof_ms, fr, ai.s, headlines(asof_ms) if heads else None, ai.pending())
    txt += "\n" + (env.HERE / "prompts" / "pm.md").read_text()
    p = Path(root) / "ai" / "briefs" / f"{wid}.md"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(txt)
    p.with_suffix(".json").write_text(json.dumps(facts))
    return f"OPUS {p} (~{len(txt) // 4} tokens, {n} new bars replayed)"


def parse(txt):
    m = re.search(r"\{.*\}", txt, re.S)
    try:
        return json.loads(m.group(0)) if m else {}
    except json.JSONDecodeError:
        return {}


def _f(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def check_open(dec, f, ai, t_ms):
    """The owner's entry rules, in code. Returns (order dict, '') or (None, reason)."""
    d = 1 if str(dec.get("dir", "")).lower().startswith("l") else -1 if str(dec.get("dir", "")).lower().startswith("s") else 0
    stop, tgt, p = _f(dec.get("stop")), _f(dec.get("target")), _f(dec.get("p_target"))
    px = f["px"]
    if not d or stop is None or tgt is None:
        return None, "open needs dir, stop and target"
    if p is None:
        return None, "no p_target"
    if not ((d > 0 and stop < px < tgt) or (d < 0 and tgt < px < stop)):
        return None, f"stop {stop} / target {tgt} on the wrong side of price {px:.2f}"
    dist = abs(px - stop)
    if not 0.5 * f["atr1h"] <= dist <= 3 * f["atr1d"]:
        return None, f"stop distance {dist:.2f} outside 0.5 x ATR(1h) {0.5 * f['atr1h']:.2f} .. 3 x ATR(1d) {3 * f['atr1d']:.2f}"
    if p < R.P_MIN:
        return None, f"p_target {p:.2f} < {R.P_MIN}"
    rr = R.rr_after_costs(px, stop, tgt)
    if rr < R.RR_MIN:
        return None, f"reward:risk after costs {rr:.2f} < {R.RR_MIN}"
    if (d > 0) != (f["trend4"] == "up"):
        case = str(dec.get("mean_reversion_case", "")).strip()
        near = min(f["levels"].items(), key=lambda kv: abs(kv[1] - px))
        if not case:
            return None, f"4h trend is {f['trend4']} and no mean-reversion case"
        if abs(near[1] - px) > 0.5 * f["atr4h"]:
            return None, (f"mean reversion needs a key level within 0.5 x ATR(4h) = {0.5 * f['atr4h']:.2f}; "
                          f"nearest is {near[0]} {near[1]:.2f}, {abs(near[1] - px):.2f} away")
    why = ai.entry_block(t_ms)
    if why:
        return None, why
    lev, req = R.clamp_lev(dec.get("leverage"))
    return dict(dir=d, stop=round(stop, 2), target=round(tgt, 2), lev=lev, lev_req=req, p_target=p,
                rr=round(rr, 2)), ""


def answer(wid, reply, tokens, root=BOOKS, t_ms=None):
    t_ms = now_ms() if t_ms is None else t_ms
    ai = Broker(Path(root) / "ai")
    one = Path(root) / "ai_1pct"
    f = json.loads((Path(root) / "ai" / "briefs" / f"{wid}.json").read_text())
    dec = parse(reply)
    a = str(dec.get("action", "")).lower()
    base = dict(kind="DECISION", t=str(bkk(t_ms))[:19], t_ms=t_ms, id=wid, tokens=int(tokens), action=a,
                p_target=dec.get("p_target"), leverage=dec.get("leverage"), px=f["px"], answer=dec)
    res = None
    if t_ms - f["asof_ms"] > STALE_MS:
        res = "REJECT brief older than 30 min"
    elif a == "open":
        o, why = check_open(dec, f, ai, t_ms)
        if o:
            write_pending(ai.d, "open", t_ms, id=wid, **o)
            write_pending(one, "open", t_ms, id=wid, **o)
            res = f"ORDER {'long' if o['dir'] > 0 else 'short'} stop {o['stop']} target {o['target']} lev {o['lev']} p {o['p_target']} rr {o['rr']}"
        else:
            res = f"REJECT open: {why}"
    elif a == "close":
        res = "ORDER close" if ai.s["pos"] else "REJECT close: no position"
        if ai.s["pos"]:
            write_pending(ai.d, "close", t_ms, id=wid)
            write_pending(one, "close", t_ms, id=wid)
    elif a == "tighten":
        p, ns = ai.s["pos"], _f(dec.get("new_stop", dec.get("stop")))
        if not p or ns is None:
            res = "REJECT tighten: no position or no new_stop"
        elif not ((p["dir"] > 0 and p["stop"] < ns < f["px"]) or (p["dir"] < 0 and f["px"] < ns < p["stop"])):
            res = f"REJECT tighten: {ns} is not between the stop {p['stop']:.2f} and price {f['px']:.2f}"
        else:
            write_pending(ai.d, "tighten", t_ms, id=wid, stop=round(ns, 2))
            write_pending(one, "tighten", t_ms, id=wid, stop=round(ns, 2))
            res = f"ORDER tighten stop to {ns}"
    elif a == "hold":
        res = "HOLD"
    else:
        res = f"REJECT unreadable answer (action {a!r}): treated as hold"
    jappend(ai.d / "journal.jsonl", dict(base, result=res))
    return res


def status():
    ai, e4, c15 = books()
    for n, b in (("ai", ai), ("ai_1pct", ai.one), ("every4h", e4)):
        s = b.s
        print(n, f"equity {s['equity']:.2f} peak {s['peak']:.2f} pos {bool(s['pos'])} killed {s['killed']} last {bkk(s['last_t']) if s['last_t'] else None}")
    print("cand15", f"equity {c15.s['equity']:.2f} pos {bool(c15.s['pos'])}")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[0] == "wake":
        print(wake())
    elif a[0] == "answer":
        print(answer(a[1], a[2], a[3]))
    elif a[0] == "sync":
        n = do_sync()[3]
        print(f"synced, {n} new bars")
    elif a[0] == "status":
        status()
