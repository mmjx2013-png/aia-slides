"""fetch_assets.py - download the CC0 scans the 3D sets use into build/assets/ (idempotent).

    python3 three_d/fetch_assets.py            # fetch what is missing
    python3 three_d/fetch_assets.py --check    # only report what is missing (exit 1 if any)

Plain urllib, no proxy settings of its own (it honours HTTPS_PROXY if the machine sets one).
Every file is listed in three_d/CREDITS.md. All are CC0 from Poly Haven (polyhaven.com).
A file is written to a temporary name and renamed, so an interrupted run never leaves half a file.
"""
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST = os.path.join(ROOT, "build", "assets")
BASE = "https://dl.polyhaven.org/file/ph-assets"

# (asset id, maps) - 2K JPG maps of a Poly Haven texture
TEXTURES = [
    ("tatami_mat", ("diff", "rough", "nor_gl")),             # hall floor
    ("ash_veneer", ("diff", "rough", "nor_gl")),             # posts, rails, lattice ('hinoki')
    ("okoume_veneer", ("diff", "rough", "nor_gl")),          # ceiling and panel boards ('board')
    ("japanese_cedar_planks", ("diff", "rough", "nor_gl")),  # veranda and alcove floors ('planks')
    ("white_plaster_02", ("diff", "rough", "nor_gl")),       # plaster walls
    ("gravel_floor_02", ("diff", "rough", "nor_gl")),        # the garden ground beyond the veranda
    ("mossy_rock", ("diff", "rough", "nor_gl")),             # the stepping stone at the veranda's edge
]
# (asset id, resolution) - HDRIs
HDRIS = [
    ("ninomaru_teien", "2k"),                                # the garden seen through the open shoji
]


def files():
    out = []
    for aid, maps in TEXTURES:
        for m in maps:
            name = "%s_%s_2k.jpg" % (aid, m)
            out.append(("%s/Textures/jpg/2k/%s/%s" % (BASE, aid, name), os.path.join(DEST, aid, name)))
    for aid, res in HDRIS:
        name = "%s_%s.hdr" % (aid, res)
        out.append(("%s/HDRIs/hdr/%s/%s" % (BASE, res, name), os.path.join(DEST, aid, name)))
    return out


def fetch(url, path, tries=4):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".part"
    err = None
    for _ in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "fetch-assets/1.0"})
            with urllib.request.urlopen(req, timeout=120) as r, open(tmp, "wb") as fh:
                while True:
                    chunk = r.read(1 << 20)
                    if not chunk:
                        break
                    fh.write(chunk)
            if os.path.getsize(tmp) < 10000:
                raise IOError("file too small: %d bytes" % os.path.getsize(tmp))
            os.replace(tmp, path)
            return True
        except Exception as e:  # noqa: BLE001
            err = e
    print("[assets] FAILED %s (%s)" % (url, err))
    return False


def main():
    check = "--check" in sys.argv
    missing = [(u, p) for u, p in files() if not (os.path.exists(p) and os.path.getsize(p) > 10000)]
    if check:
        for u, p in missing:
            print("[assets] missing", os.path.relpath(p, ROOT))
        print("[assets] %d of %d files present" % (len(files()) - len(missing), len(files())))
        return 1 if missing else 0
    bad = 0
    for u, p in missing:
        ok = fetch(u, p)
        bad += 0 if ok else 1
        if ok:
            print("[assets] %s (%.1f MB)" % (os.path.relpath(p, ROOT), os.path.getsize(p) / 1e6), flush=True)
    print("[assets] %d files present, %d failed" % (len(files()) - bad, bad))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
