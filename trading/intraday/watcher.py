"""Intraday PAXG watcher: pure code, 0 tokens. PAPER ONLY.

  python3 watcher.py run [--max-hours 1.9]   live: poll 1m bars every 60 s, run the paper
                                             broker, print one 'SETUP ...' line per setup
  python3 watcher.py status                  RUNNING <pid> | STOPPED
  python3 watcher.py replay --days 4 [--auto]  run the same code over cached history
                                             (--auto: enter every setup with default risk)
Setups (evaluated only on CLOSED bars; 5m/15m only when that bucket has just closed):
  breakout        5m close beyond the prior 12x5m (1 h) range, 5m volume > 2x its 20-bar mean
  vol_expansion   5m Bollinger width in its lowest 20% of 100 bars, then a 5m range > 2x ATR14(5m)
  momentum        last 3 1m closes all one way, move > 4x ATR14(1m) (floor 0.50), volume > 2x mean
  mean_reversion  15m RSI14 < 25 with z20 < -2.2 (long), or RSI > 75 with z > +2.2 (short)
No setups are emitted in the flat window (03:30-14:00 Bangkok): no entries are allowed there.
Throttle: at most one SETUP per 15 minutes.
"""
import argparse
import os
import sys
import time
import traceback
from pathlib import Path

import pandas as pd

import risk

from common import DATA, bkk, frames, jappend, jlines, load_cache, update_cache, backfill, save_cache, merge, fetch
from paperbroker import Broker, write_order

LIVE = DATA / "live"
THROTTLE = pd.Timedelta(minutes=15)
PRIORITY = ["breakout", "vol_expansion", "momentum", "mean_reversion"]


def detect(m1, m5, m15, t):
    """Setups known at the close of the 1m bar that opened at t (UTC Timestamp)."""
    close_t = t + pd.Timedelta(minutes=1)
    out = []
    i = m1.index.get_loc(t)
    if i >= 20:
        w = m1.iloc[i - 3:i + 1]
        mv = w["c"].iloc[-1] - w["c"].iloc[0]
        steps = w["c"].diff().iloc[1:]
        atr = max(m1["atr"].iloc[i - 1], 0.50)
        vr = w["v"].iloc[1:].sum() / (3 * m1["vavg"].iloc[i]) if m1["vavg"].iloc[i] > 0 else 0
        if abs(mv) > 4 * atr and vr > 2 and ((steps > 0).all() or (steps < 0).all()):
            out.append(("momentum", 1 if mv > 0 else -1, f"3-bar move {mv:+.2f} = {abs(mv)/atr:.1f}x ATR1, vol {vr:.1f}x"))
    if close_t in set(m5["end"]):
        j = m5.index.get_loc(close_t - pd.Timedelta(minutes=5))
        if j >= 100:
            b, prior = m5.iloc[j], m5.iloc[j - 12:j]
            vr = b["v"] / b["vavg"] if b["vavg"] > 0 else 0
            if b["c"] > prior["h"].max() and vr > 2:
                out.append(("breakout", 1, f"5m close {b['c']:.2f} > 1h high {prior['h'].max():.2f}, vol {vr:.1f}x"))
            elif b["c"] < prior["l"].min() and vr > 2:
                out.append(("breakout", -1, f"5m close {b['c']:.2f} < 1h low {prior['l'].min():.2f}, vol {vr:.1f}x"))
            bbw = m5["bbw"].iloc[j - 100:j]
            if m5["bbw"].iloc[j - 1] <= bbw.quantile(0.2) and b["rng"] > 2 * m5["atr"].iloc[j - 1]:
                out.append(("vol_expansion", 1 if b["c"] >= b["o"] else -1,
                            f"squeeze then 5m range {b['rng']:.2f} = {b['rng']/m5['atr'].iloc[j-1]:.1f}x ATR5"))
    if close_t in set(m15["end"]):
        k = m15.index.get_loc(close_t - pd.Timedelta(minutes=15))
        if k >= 35:
            b = m15.iloc[k]
            if b["rsi"] < 25 and b["z"] < -2.2:
                out.append(("mean_reversion", 1, f"15m RSI {b['rsi']:.0f}, z {b['z']:.1f}"))
            elif b["rsi"] > 75 and b["z"] > 2.2:
                out.append(("mean_reversion", -1, f"15m RSI {b['rsi']:.0f}, z {b['z']:.1f}"))
    return sorted(out, key=lambda x: PRIORITY.index(x[0]))


def make_event(m1, m5, m15, t, setups):
    close_t = t + pd.Timedelta(minutes=1)
    last = lambda m: m[m["end"] <= close_t].iloc[-1] if "end" in m else m.loc[t]
    b1, b5, b15 = m1.loc[t], last(m5), last(m15)
    name, d, why = setups[0]
    return dict(id=f"{bkk(close_t).strftime('%Y%m%d-%H%M')}-{name}", setup=name,
                dir="long" if d > 0 else "short", why=why, also=[s[0] for s in setups[1:]],
                close_ms=int(close_t.value // 10**6), t_bkk=str(bkk(close_t))[:16], px=round(b1["c"], 2),
                atr1=round(b1["atr"], 3), atr5=round(b5["atr"], 3), atr15=round(b15["atr"], 3),
                rsi15=round(b15["rsi"], 1), z15=round(b15["z"], 2),
                vol_guard=bool(b1["rng"] > 4 * b1["atr"]))


def step(df, broker, live_dir, idx, emit=True, auto=False, last_setup=None, unfiltered=None):
    """Advance broker(s) and detector over bars df.index[idx] (all closed). Returns last_setup.
    `unfiltered`: a second paper book that takes EVERY setup with default risk (the baseline
    the AI filter is measured against)."""
    m1, m5, m15 = frames(df)
    for t in idx:
        b = m1.loc[t]
        bd = dict(t=int(b["t"]), o=b["o"], h=b["h"], l=b["l"], c=b["c"],
                  atr1=None if b["atr"] != b["atr"] else float(b["atr"]), rng=float(b["rng"]))
        broker.on_bar(bd)
        if unfiltered:
            unfiltered.on_bar(bd)
        if not emit or risk.in_flat_window(int(b["t"]) + 60_000) or risk.is_weekend(int(b["t"]) + 60_000):
            continue
        setups = detect(m1, m5, m15, t)
        if not setups or (last_setup is not None and t - last_setup < THROTTLE):
            continue
        last_setup = t
        if emit and not auto:                       # briefs read the cache: make it current first
            save_cache(merge(load_cache(), df[df.index <= t]))
        ev = make_event(m1, m5, m15, t, setups)
        jappend(live_dir / "events.jsonl", ev)
        print(f"SETUP {ev['id']} {ev['dir']} px={ev['px']} {ev['why']}", flush=True)
        if auto:
            write_order(live_dir, ev, dict(dir=ev["dir"], why="auto replay"), created_ms=ev["close_ms"])
        if unfiltered:
            write_order(unfiltered.d, ev, dict(dir=ev["dir"], why="take every setup"), created_ms=ev["close_ms"])
    broker.save()
    if unfiltered:
        unfiltered.save()
    return last_setup


def run(max_hours):
    LIVE.mkdir(parents=True, exist_ok=True)
    pidf = LIVE / "watcher.pid"
    if status() != "STOPPED":
        print("ERROR watcher already running", flush=True); return
    pidf.write_text(str(os.getpid()))
    try:
        broker = Broker(LIVE)
        unf = Broker(LIVE / "unfiltered")
        df = load_cache()
        df = update_cache(df)
        evs = jlines(LIVE / "events.jsonl")
        last_setup = pd.Timestamp(evs[-1]["close_ms"] - 60_000, unit="ms", tz="UTC") if evs else None
        done = broker.s["last_t"]
        todo = df.index[df["t"] > done] if done else df.index[-1:]
        fresh = pd.Timestamp.now(tz="UTC") - pd.Timedelta(minutes=3)
        catch = [t for t in todo if t < fresh]
        last_setup = step(df, broker, LIVE, catch, emit=False, last_setup=last_setup, unfiltered=unf)
        last_setup = step(df, broker, LIVE, [t for t in todo if t >= fresh], last_setup=last_setup, unfiltered=unf)
        print(f"watcher up pid={os.getpid()} bars={len(df)} caught_up={len(catch)} "
              f"equity={broker.mtm(df['c'].iloc[-1]):.2f}", flush=True)
        stop_at = time.time() + max_hours * 3600
        while time.time() < stop_at:
            time.sleep(max(1.0, 62 - time.time() % 60))    # ~2 s after each minute closes
            try:
                new = fetch(limit=5)
                new = new[new["t"] > df["t"].iloc[-1]]
                if not len(new):
                    continue
                if new["t"].iloc[0] - df["t"].iloc[-1] > 60_000:   # gap: page it in
                    df = update_cache(df)
                    new = df[df["t"] > broker.s["last_t"]]
                df = merge(df, new).iloc[-3000:]
                last_setup = step(df, broker, LIVE, list(new.index), last_setup=last_setup, unfiltered=unf)
                if new.index[-1].minute % 15 == 0:
                    save_cache(merge(load_cache(), df))
            except Exception as e:
                print(f"ERROR {type(e).__name__}: {e}", flush=True)
        save_cache(merge(load_cache(), df))
        print("watcher stopping (max hours reached)", flush=True)
    except Exception:
        print("ERROR watcher crashed", flush=True)
        traceback.print_exc()
        sys.stdout.flush()
    finally:
        pidf.unlink(missing_ok=True)


def status():
    pidf = LIVE / "watcher.pid"
    if pidf.exists():
        pid = int(pidf.read_text())
        try:
            os.kill(pid, 0)
            return f"RUNNING {pid}"
        except OSError:
            pidf.unlink(missing_ok=True)
    return "STOPPED"


def replay(days, auto):
    df = backfill(days)
    d = DATA / "replay"
    for f in ("state.json", "journal.jsonl", "events.jsonl", "equity.csv", "pending_order.json"):
        (d / f).unlink(missing_ok=True)
    broker = Broker(d)
    cut = df.index[-1] - pd.Timedelta(days=days)
    step(df, broker, d, [t for t in df.index if t >= cut], auto=auto)
    return d, df


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["run", "status", "replay"])
    ap.add_argument("--max-hours", type=float, default=1.9)
    ap.add_argument("--days", type=float, default=4)
    ap.add_argument("--auto", action="store_true")
    a = ap.parse_args()
    if a.cmd == "run":
        run(a.max_hours)
    elif a.cmd == "status":
        print(status())
    else:
        d, df = replay(a.days, a.auto)
        print(f"replay done: {len(df)} cached bars, output in {d}")
