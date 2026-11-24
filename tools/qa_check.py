#!/usr/bin/env python3
"""WCAG contrast against the real pixels behind each text run, plus text-fit checks.
Reads the report and screenshots written by tools/qa.cjs. Exit 1 on any failure.
Usage: tools/qa_check.py OUTDIR
"""
import json, sys, re, pathlib
import numpy as np
from PIL import Image

out = pathlib.Path(sys.argv[1])
fails, notes = [], []


def lum(rgb):
    c = np.asarray(rgb, dtype=float) / 255
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]


def parse(c):
    m = re.findall(r"[\d.]+", c)
    v = [float(x) for x in m]
    return v[:3], (v[3] if len(v) > 3 else 1.0)


for rep in sorted(out.glob("report-*.json")):
    for st in json.loads(rep.read_text()):
        for e in st.get("errors", []):
            fails.append(f"{st['tag']}: script error: {e}")
        if not st.get("items"):
            continue
        bg = np.asarray(Image.open(out / f"{st['tag']}.bg.png").convert("RGB"))
        H, W = bg.shape[:2]
        worst = {}
        for it in st["items"]:
            if it["overflow"]:
                fails.append(f"{st['tag']}: text overflows its box: {it['cls'][:40]}")
            if it["offscreen"]:
                fails.append(f"{st['tag']}: panel leaves the screen: {it['cls'][:40]} {[round(v) for v in it['box']]}")
            for r in it["runs"]:
                x0, y0 = max(0, int(r["x"])), max(0, int(r["y"]))
                x1, y1 = min(W, int(r["x"] + r["w"]) + 1), min(H, int(r["y"] + r["h"]) + 1)
                if x1 - x0 < 1 or y1 - y0 < 1:
                    continue
                patch = bg[y0:y1, x0:x1].reshape(-1, 3)
                L = lum(patch)
                (rgb, a) = parse(r["color"])
                if a < 0.05:
                    continue
                Lt_vals = lum(np.asarray(rgb)[None])[0]
                # worst case: the background pixel that is closest in luminance to the text (5th/95th pct)
                lo, hi = np.percentile(L, 5), np.percentile(L, 95)
                def ratio(a_, b_):
                    A, B = max(a_, b_), min(a_, b_)
                    return (A + 0.05) / (B + 0.05)
                # text blended with alpha over the background
                cr = min(ratio(Lt_vals * a + lo * (1 - a), lo), ratio(Lt_vals * a + hi * (1 - a), hi))
                large = r["size"] >= 24 or (r["size"] >= 18.66 and r["weight"] >= 700)
                need = 3.0 if large else 4.5
                key = (it["cls"][:30], r["text"][:24])
                if cr < need and (key not in worst or cr < worst[key][0]):
                    worst[key] = (cr, need, r["size"])
        for (cls, txt), (cr, need, size) in worst.items():
            fails.append(f"{st['tag']}: contrast {cr:.2f} < {need} for '{txt}' ({size:.0f}px) in {cls}")
print("\n".join(fails[:400]))
print(f"\n{len(fails)} failures")
sys.exit(1 if fails else 0)
