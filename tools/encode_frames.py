"""encode_frames.py - PNG frames -> the WebP sets the site scrubs.

    python3 tools/encode_frames.py [--src build/frames] [--dst site/assets/seq] [--quality 82] [--jobs N]

  build/frames/f_NNNN.png (1920x1080)  ->  site/assets/seq/d/f_NNNN.webp   desktop, 1920x1080
                                           site/assets/seq/m/f_NNNN.webp   phone, the 608x1080 centre crop
Only frames whose WebP is missing or older than the PNG are encoded, so it is cheap to re-run while a
render is still going. Files are written through a temp name and renamed. Never rescales.
Run three_d/export_meta.py afterwards: meta.json lists the frames that exist in d/.
"""
import argparse
import os
import re
import sys
from multiprocessing import Pool

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIZE = (1920, 1080)
CROP = (656, 0, 656 + 608, 1080)         # x0, y0, x1, y1


def _save(im, path, quality):
    tmp = path + ".tmp%d" % os.getpid()
    im.save(tmp, "WEBP", quality=quality, method=5)
    os.replace(tmp, path)


def encode(job):
    src, d_path, m_path, quality = job
    from PIL import Image
    try:
        im = Image.open(src).convert("RGB")
        if im.size != SIZE:
            return "skip %s: %dx%d is not 1920x1080" % (os.path.basename(src), im.size[0], im.size[1])
        _save(im, d_path, quality)
        _save(im.crop(CROP), m_path, quality)
        return None
    except Exception as e:  # noqa: BLE001
        return "FAILED %s: %s" % (os.path.basename(src), e)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=os.path.join(ROOT, "build", "frames"))
    ap.add_argument("--dst", default=os.path.join(ROOT, "site", "assets", "seq"))
    ap.add_argument("--quality", type=int, default=82)
    ap.add_argument("--jobs", type=int, default=max(1, min(8, os.cpu_count() or 1)))
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    d_dir, m_dir = os.path.join(a.dst, "d"), os.path.join(a.dst, "m")
    os.makedirs(d_dir, exist_ok=True)
    os.makedirs(m_dir, exist_ok=True)
    jobs = []
    names = sorted(n for n in os.listdir(a.src) if re.match(r"f_\d{4}\.png$", n)) if os.path.isdir(a.src) else []
    for n in names:
        src = os.path.join(a.src, n)
        dp = os.path.join(d_dir, n[:-4] + ".webp")
        mp = os.path.join(m_dir, n[:-4] + ".webp")
        fresh = all(os.path.exists(p) and os.path.getmtime(p) >= os.path.getmtime(src) for p in (dp, mp))
        if a.force or not fresh:
            jobs.append((src, dp, mp, a.quality))
    bad = 0
    if jobs:
        with Pool(a.jobs) as pool:
            for msg in pool.imap_unordered(encode, jobs, chunksize=4):
                if msg:
                    bad += 1
                    print("[encode]", msg, flush=True)
    print("[encode] %d PNG frames, %d encoded now, %d problems -> %s" % (len(names), len(jobs) - bad, bad, a.dst))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
