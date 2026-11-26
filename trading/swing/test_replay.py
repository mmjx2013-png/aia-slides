"""End-to-end replay of the last N days through the live code path, with a STUB PM in place of
Opus (0 tokens): wakes on the real schedule, briefs, the code re-check, pending orders, fills,
stops, forced closes, both code books and the report. Output in data/replay5/. PAPER ONLY.
  python3 test_replay.py [--days 5]
"""
import argparse
import glob
import json
import shutil

import pandas as pd

import env  # noqa: F401
import rules as R
import desk
from common import BKK, _frame, load_cache, merge
from report import main as report

WAKES = [(3, 10), (7, 10), (11, 10), (15, 10), (19, 10), (23, 10)]


def history():
    m1 = load_cache()
    for f in sorted(glob.glob(str(env.HERE.parent / "intraday" / "data" / "history" / "*.csv.gz")))[-1:]:
        m1 = merge(_frame(pd.read_csv(f)[["t", "o", "h", "l", "c", "v"]].values.tolist()), m1)
    return m1


def schedule(t0, t1):
    out = []
    for day in pd.date_range(t0.normalize(), t1.normalize(), freq="D"):
        for h, m in WAKES:
            w = day + pd.Timedelta(hours=h, minutes=m)
            if t0 <= w <= t1 and (w.weekday() < 5 or (w.weekday() == 5 and (h, m) == (3, 10))):
                out.append(w)
    return out


def stub(f, st):
    """A deterministic PM: trade the code's 4h trend, tighten after +1.5R, close after 48 h."""
    p, px = st["pos"], f["px"]
    if p:
        r = p["dir"] * (px - p["entry"]) / (abs(p["entry"] - p["stop0"]) + R.COST)
        if (f["asof_ms"] - p["t"]) > 48 * 3600_000:
            return dict(action="close", why="stub: 48 h")
        if r > 1.5:
            return dict(action="tighten", new_stop=round(px - p["dir"] * f["atr1h"], 2), why="stub: lock in")
        return dict(action="hold", why="stub")
    d = 1 if f["trend4"] == "up" else -1
    a = f["atr4h"]
    idea = dict(dir="long" if d > 0 else "short", stop=round(px - d * 1.5 * a, 2), target=round(px + d * 4 * a, 2), p_target=0.6)
    return dict(action="open", leverage=5, best_idea=idea, why="stub: with the 4h trend", **idea)


def main(days):
    root = env.HERE / "data" / "replay5"
    shutil.rmtree(root, ignore_errors=True)
    m1 = history()
    t1 = pd.Timestamp(int(m1["t"].iloc[-1]) + 60_000, unit="ms", tz="UTC").tz_convert(BKK)
    t0 = t1 - pd.Timedelta(days=days)
    wakes = schedule(t0, t1)
    start = int(wakes[0].value // 10**6) - 15 * 60_000
    log, tok = [], []
    for w in wakes:
        a = int(w.value // 10**6)
        r = desk.wake(root, a, m1, heads=False, start_ms=start)
        line = f"{w.strftime('%a %d %H:%M')} {r[:110]}"
        if r.startswith("OPUS"):
            path = r.split()[1]
            tok.append(len(open(path).read()) // 4)
            wid = path.split("/")[-1][:-3]
            f = json.loads(open(path[:-3] + ".json").read())
            st = json.loads((root / "ai" / "state.json").read_text())
            line += " -> " + desk.answer(wid, json.dumps(stub(f, st)), 0, root, t_ms=a + 120_000)
        log.append(line)
    desk.replay(int(m1["t"].iloc[-1]) + 60_000, root, m1, start)
    print("\n".join(log))
    for b in ("ai", "every4h", "cand15"):
        j = [json.loads(x) for x in (root / b / "journal.jsonl").read_text().splitlines()] if (root / b / "journal.jsonl").exists() else []
        kinds = pd.Series([x["kind"] for x in j]).value_counts().to_dict()
        st = json.loads((root / b / "state.json").read_text())
        print(f"{b}: equity {st['equity']:.2f}, events {kinds}")
        for x in j:
            if x["kind"] in ("FILL", "EXIT", "REJECT", "TIGHTEN", "BREAKEVEN", "LIQUIDATED", "HALT", "KILL"):
                print("   ", x["t"][5:16], x["kind"], {k: v for k, v in x.items() if k in ("side", "px", "stop", "target", "lev", "binding", "reason", "pnl", "r", "new", "book")})
    print(f"wakes {len(wakes)}, briefs {len(tok)}, brief tokens max {max(tok) if tok else 0} (chars/4)")
    print(report(root, root / "reports"))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=float, default=5)
    main(ap.parse_args().days)
