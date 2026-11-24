#!/usr/bin/env python3
"""Cut a garment out of a museum studio photograph (plain grey sweep backdrop).

The backdrop is neutral and changes smoothly; the garment differs from it in colour or tone.
Model the backdrop per row from the image edges, mark pixels that differ, clean the mask
(close, fill holes, keep the largest piece), feather 1-2 px, and drop the cast shadow below.
Writes an RGBA WebP (and PNG for checking).  Usage: tools/cutout.py IN OUT_BASENAME [thresh]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
th = float(sys.argv[3]) if len(sys.argv) > 3 else 14
im = Image.open(src).convert("RGB")
a = np.asarray(im).astype(np.float32)
H, W, _ = a.shape
# backdrop model: per-row median of the outer 4% on both sides, smoothed down the image
edge = np.concatenate([a[:, : int(W * 0.04)], a[:, -int(W * 0.04):]], 1)
row = np.median(edge, 1)
k = 31
pad = np.pad(row, ((k, k), (0, 0)), mode="edge")
row = np.stack([np.convolve(pad[:, c], np.ones(2 * k + 1) / (2 * k + 1), mode="same")[k:-k] for c in range(3)], 1)
bg = np.broadcast_to(row[:, None, :], a.shape)
# horizontal falloff of the sweep: compare the centre column of the backdrop at the top rows
diff = np.abs(a - bg).max(2)
sat = a.max(2) - a.min(2)
m = (diff > th) | (sat > 16)
mask = Image.fromarray((m * 255).astype(np.uint8))
mask = mask.filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
mm = np.asarray(mask) > 127
# keep the largest connected piece and fill its holes (flood the background from the border)
from collections import deque
lab = np.zeros(mm.shape, np.int32); best, bestn, cur = 0, 0, 0
for y0 in range(0, H, 7):
    for x0 in range(0, W, 7):
        if mm[y0, x0] and not lab[y0, x0]:
            cur += 1; q = deque([(y0, x0)]); lab[y0, x0] = cur; n = 0
            while q:
                y, x = q.popleft(); n += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and mm[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = cur; q.append((yy, xx))
            if n > bestn: best, bestn = cur, n
keep = lab == best
outside = np.zeros_like(keep); q = deque()
for y in range(H):
    for x in (0, W - 1):
        if not keep[y, x] and not outside[y, x]: outside[y, x] = True; q.append((y, x))
for x in range(W):
    for y in (0, H - 1):
        if not keep[y, x] and not outside[y, x]: outside[y, x] = True; q.append((y, x))
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        yy, xx = y + dy, x + dx
        if 0 <= yy < H and 0 <= xx < W and not keep[yy, xx] and not outside[yy, xx]:
            outside[yy, xx] = True; q.append((yy, xx))
solid = ~outside
alpha = Image.fromarray((solid * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.1))
# decontaminate the fringe: pull edge colours away from the grey backdrop
al = np.asarray(alpha).astype(np.float32) / 255
fg = np.where(al[..., None] > 0.02, (a - bg * (1 - al[..., None])) / np.maximum(al[..., None], 0.02), 0)
fg = np.clip(np.where(al[..., None] > 0.98, a, fg), 0, 255)
rgba = np.dstack([fg, al * 255]).astype(np.uint8)
ys, xs = np.nonzero(al > 0.05)
box = (xs.min() - 4, ys.min() - 4, xs.max() + 5, ys.max() + 5)
out = Image.fromarray(rgba, "RGBA").crop(box)
out.save(dst + ".png")
out.save(dst + ".webp", "WEBP", quality=86, method=6)
print(out.size, f"coverage {al.mean():.3f}")
