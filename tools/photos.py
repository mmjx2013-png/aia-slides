#!/usr/bin/env python3
"""Prepare photographs for the site.

For each image in a source folder: trim the scanner border, write WebP at a few widths, and
sample the studio backdrop down both edges so the page can continue the photograph's own wall
across the screen (a CSS gradient made of the picture's real edge tones).
Writes site/assets/photos/<name>-<w>.webp and site/assets/photos/photos.json.
Usage: tools/photos.py SRC_DIR [name ...]
"""
import sys, json, pathlib
from PIL import Image
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "site/assets/photos"
WIDTHS = (640, 1200, 2000)


def wall(im):
    a = np.asarray(im.convert("RGB")).astype(float)
    h = a.shape[0]
    edge = (a[:, :14].mean(1) + a[:, -14:].mean(1)) / 2
    lr = np.abs(a[:, :14].mean(1) - a[:, -14:].mean(1)).mean()
    stops = []
    for i in range(11):
        y0, y1 = int(max(0, (i / 10 - 0.03) * h)), int(min(h, (i / 10 + 0.03) * h) + 1)
        c = edge[y0:y1].mean(0)
        stops.append("#%02x%02x%02x %d%%" % (*[int(round(v)) for v in c], i * 10))
    lum = float(edge.mean())
    return {"gradient": "linear-gradient(180deg," + ",".join(stops) + ")", "top": stops[0].split()[0], "bottom": stops[-1].split()[0],
            "luminance": round(lum, 1), "edgeMismatch": round(float(lr), 2)}


def main():
    src = pathlib.Path(sys.argv[1]); only = set(sys.argv[2:])
    OUT.mkdir(parents=True, exist_ok=True)
    idx_path = OUT / "photos.json"
    idx = json.loads(idx_path.read_text()) if idx_path.exists() else {}
    for p in sorted(src.iterdir()):
        if p.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"):
            continue
        name = p.stem.lower()
        if only and name not in only:
            continue
        im = Image.open(p).convert("RGB")
        b = max(3, round(min(im.size) * 0.004))
        im = im.crop((b, b, im.width - b, im.height - b))
        files = {}
        for w in WIDTHS:
            if w > im.width * 1.02 and files:
                continue
            ww = min(w, im.width); hh = round(im.height * ww / im.width)
            dst = OUT / f"{name}-{ww}.webp"
            im.resize((ww, hh), Image.LANCZOS).save(dst, "WEBP", quality=84, method=6)
            files[str(ww)] = dst.name
        idx[name] = {"w": im.width, "h": im.height, "files": files, "wall": wall(im)}
        print(name, im.size, list(files), idx[name]["wall"]["edgeMismatch"])
    idx_path.write_text(json.dumps(idx, indent=1))


if __name__ == "__main__":
    main()
