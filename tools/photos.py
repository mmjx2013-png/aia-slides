#!/usr/bin/env python3
"""Prepare photographs for the site.

For each image in a source folder (named met-<objectID>.<ext>): trim the scanner border, write
WebP at a few widths, and, for garments photographed on a plain studio sweep, cut the object
out of its backdrop so it can hang on the wall of the hall. The cut-out is kept only when it
passes simple sanity checks; otherwise the photograph is shown whole, as a mounted print.
Writes site/assets/photos/<name>-<w>.webp, <name>-cut-<w>.webp and photos.json.
Usage: tools/photos.py SRC_DIR [name ...] [--no-cut name,name]
"""
import sys, json, pathlib, re
from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage as ndi

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "site/assets/photos"
WIDTHS = (640, 1200, 2000)
CUT_WIDTHS = (720, 1400)
WISH = {}
wp = ROOT / "assets/photo-wishlist.json"
if wp.exists():
    WISH = {o["objectID"]: o for o in json.loads(wp.read_text())["objects"]}
FLAT = re.compile(r"print|painting|book|screen|album|scroll|drawing", re.I)


def cutout(im, th=22):
    """Return (rgba, coverage, ok). The backdrop is modelled per row from the image edges."""
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    H, W, _ = a.shape
    e = max(6, int(W * 0.04))
    edge = np.concatenate([a[:, :e], a[:, -e:]], 1)
    row = np.median(edge, 1)
    row = ndi.uniform_filter1d(row, size=max(31, H // 25), axis=0, mode="nearest")
    bg = np.broadcast_to(row[:, None, :], a.shape)
    # the backdrop must be plain: little variation along the edges, nearly neutral
    edge_noise = float(np.abs(edge - row[:, None, :]).mean())
    diff = np.abs(a - bg).max(2)
    sat = a.max(2) - a.min(2)
    bg_sat = float((row.max(1) - row.min(1)).mean())
    m = (diff > th) | (sat > bg_sat + 16)
    m = ndi.median_filter(m, size=5)
    m = ndi.binary_closing(m, iterations=3)
    lab, n = ndi.label(m)
    if n == 0:
        return None, 0.0, False
    sizes = ndi.sum(m, lab, range(1, n + 1))
    keep = lab == (1 + int(np.argmax(sizes)))
    solid = ndi.binary_fill_holes(keep)
    solid = ndi.binary_erosion(solid, iterations=1)
    alpha = ndi.gaussian_filter(solid.astype(np.float32), 1.1)
    al = alpha[..., None]
    fg = np.where(al > 0.02, (a - bg * (1 - al)) / np.maximum(al, 0.02), 0)
    fg = np.clip(np.where(al > 0.98, a, fg), 0, 255)
    rgba = np.dstack([fg, alpha * 255]).astype(np.uint8)
    ys, xs = np.nonzero(alpha > 0.05)
    box = (max(0, xs.min() - 4), max(0, ys.min() - 4), min(W, xs.max() + 5), min(H, ys.max() + 5))
    cov = float(solid.mean())
    touches = (xs.min() <= 2) + (ys.min() <= 2) + (xs.max() >= W - 3) + (ys.max() >= H - 3)
    second = float(np.sort(sizes)[-2] / sizes.max()) if n > 1 else 0.0
    ok = 0.12 < cov < 0.72 and edge_noise < 9 and touches == 0 and second < 0.25
    return Image.fromarray(rgba, "RGBA").crop(box), cov, ok


def main():
    args = sys.argv[1:]
    no_cut = set()
    if "--no-cut" in args:
        i = args.index("--no-cut"); no_cut = set(args[i + 1].split(",")); del args[i:i + 2]
    src = pathlib.Path(args[0]); only = set(args[1:])
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
        if max(im.size) > 3200:
            k = 3200 / max(im.size); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
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
        idx[name] = {"w": im.width, "h": im.height, "files": files}
        m = re.search(r"(\d{3,})", name)
        rec = WISH.get(int(m.group(1))) if m else None
        flat = bool(rec and FLAT.search(rec.get("classification", "") + " " + rec.get("objectName", "")))
        note = ""
        idx.pop(name + "-cut", None)
        if not flat and name not in no_cut:
            small = im if max(im.size) <= 2000 else im.resize((round(im.width * 2000 / max(im.size)), round(im.height * 2000 / max(im.size))), Image.LANCZOS)
            cut, cov, ok = cutout(small)
            note = f"cut coverage {cov:.2f} {'kept' if ok else 'rejected'}"
            if ok:
                cf = {}
                for w in CUT_WIDTHS:
                    if w > cut.width * 1.02 and cf:
                        continue
                    ww = min(w, cut.width); hh = round(cut.height * ww / cut.width)
                    dst = OUT / f"{name}-cut-{ww}.webp"
                    cut.resize((ww, hh), Image.LANCZOS).save(dst, "WEBP", quality=86, method=6)
                    cf[str(ww)] = dst.name
                idx[name + "-cut"] = {"w": cut.width, "h": cut.height, "files": cf}
        print(name, im.size, list(files), note)
    idx_path.write_text(json.dumps(idx, indent=1))


if __name__ == "__main__":
    main()
