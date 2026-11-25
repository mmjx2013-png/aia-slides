"""Merge recent Yahoo chart JSON windows into the cached long histories.

  python3 gold_merge.py <folder with new JSON files>

Files are matched by name (GC_F_1h.json, GC_F_daily.json, DXY_daily.json, ...).
Bars are deduplicated by timestamp; the newer file wins. The newest file's
meta (e.g. regularMarketPrice for USD/THB) is kept.
"""
import json, sys
from pathlib import Path

import gold as G

KEYS = ("open", "high", "low", "close", "volume")


def bars(r):
    q = r["indicators"]["quote"][0]
    return {t: {k: (q.get(k) or [None] * len(r["timestamp"]))[i] for k in KEYS}
            for i, t in enumerate(r.get("timestamp") or [])}


def merge(old_path, new_path):
    new = json.loads(new_path.read_text())
    if not old_path.exists():
        old_path.write_text(json.dumps(new)); return len(new["chart"]["result"][0]["timestamp"])
    old = json.loads(old_path.read_text())
    ro, rn = old["chart"]["result"][0], new["chart"]["result"][0]
    b = bars(ro); b.update(bars(rn))
    ts = sorted(b)
    rn["timestamp"] = ts
    rn["indicators"]["quote"] = [{k: [b[t][k] for t in ts] for k in KEYS}]
    rn["indicators"].pop("adjclose", None)
    old_path.write_text(json.dumps(new))
    return len(ts) - len(ro["timestamp"])


if __name__ == "__main__":
    src = Path(sys.argv[1])
    for f in sorted(src.glob("*.json")):
        print(f.name, "+", merge(G.GD / f.name, f), "bars")
