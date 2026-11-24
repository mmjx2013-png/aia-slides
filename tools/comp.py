"""comp.py - grade the multilayer EXRs of three_d/render.py --vfx into photographic frames.

    python3 tools/comp.py still build/stills/hall_wide_morning.exr build/out/stills/hall_wide_morning.webp
    python3 tools/comp.py clip  build/clips/clip_hall_morning build/out/clips/clip_hall_morning   # -> .mp4 + .webm
    python3 tools/comp.py still IN.exr OUT.png --shot hall_dusk        # the shot name picks the light preset

Deterministic, numpy + scipy + OpenEXR; no learned models. The chain, in scene-linear light:
  1 relight   Combined x smoothed light-group ratios: each group (sun, sky, shoji, bounce, volume) gets a
              weight; shoji/sky/bounce fall off with distance from the west openings (Position pass).
              Group passes are noisy, Combined is denoised: ratios are edge-aware smoothed (guided filter)
  2 air       depth haze from the Mist pass
  3 lens      light wrap at bright window edges, veiling glare + bloom, halation, vignette (cos^4-ish),
              barrel distortion with lateral chromatic aberration
  4 film      exposure, a rolled-off highlight curve (filmic shoulder, partly per channel so bright
              colours desaturate towards white as on a sensor), sRGB, a gentle natural grade
  5 sensor    fine luminance grain with a little chroma, signal dependent, like a 35 mm full-frame body
              at ISO 400-800; a new seed per clip frame
"""
import argparse
import glob
import os
import subprocess
import sys
from multiprocessing import Pool

import numpy as np
from scipy import ndimage as ndi

XW = -3.64                     # the west wall (the shoji) in world x

# weights per light preset. falloff: (metres from the openings before it starts, 1/m, floor)
PRESETS = {
    "morning": dict(ev=0.75, sun=1.15, sky=0.85, shoji=0.9, bounce=1.5, volume=1.4, paper=1.5, robe_lift=1.15, gold_lift=1.25, rest=1.0,
                    falloff=(0.6, 0.20, 0.42), haze=0.007, haze_col=(0.95, 0.97, 1.0), white=(1.0, 1.0, 1.0)),
    "dusk": dict(ev=1.45, sun=1.1, sky=0.8, shoji=0.9, bounce=0.35, volume=1.4, paper=1.3, robe_lift=1.12, gold_lift=1.2, rest=1.0,
                 falloff=(0.6, 0.24, 0.35), haze=0.007, haze_col=(1.0, 0.86, 0.72), white=(1.0, 0.98, 0.95)),
}
SHOT_PRESET = {"hall_dusk": "dusk", "clip_hall_dusk": "dusk"}
SHOT_EV = {"kosode_iko": 0.15, "clip_kosode_iko": 0.15, "mannequin_obi_back": 0.1}
CAM = dict(glare_a=0.007, glare_b=0.0035, bloom=0.05, bloom_thr=1.6, halation=0.045, wrap=0.22,
           vignette_ev=0.55, distort=0.012, ca=0.0007, grain=0.010, chroma=0.35, sat=0.96,
           contrast=0.42, black=0.0035)


# ------------------------------------------------------------------ EXR

def read_exr(path):
    import OpenEXR
    with OpenEXR.File(path, separate_channels=True) as f:
        out = {}
        for name, c in ((n, c) for part in f.parts for n, c in part.channels.items()):
            parts = name.split(".")
            pas, comp = (".".join(parts[-2:-1]) or "Combined"), parts[-1].upper()
            pas = {"Volume Direct": "VolumeDir", "Ambient Occlusion": "AO", "Object Index": "IndexOB"}.get(pas, pas)
            out.setdefault(pas, {})[comp] = np.asarray(c.pixels, dtype=np.float32)
    passes = {}
    for pas, comps in out.items():
        keys = [k for k in ("R", "G", "B") if k in comps] or [k for k in ("X", "Y", "Z") if k in comps] \
            or sorted(comps)
        passes[pas] = np.stack([comps[k] for k in keys], -1) if len(keys) > 1 else comps[keys[0]]
    return passes


# ------------------------------------------------------------------ filters

def blur(img, sigma):
    """Gaussian blur; large radii go through a downsampled copy (fast, smooth)."""
    if sigma < 0.3:
        return img
    if sigma > 12:
        k = int(min(8, sigma // 4))
        h, w = img.shape[:2]
        small = ndi.zoom(img, (1.0 / k, 1.0 / k) + (1,) * (img.ndim - 2), order=1, prefilter=False)
        small = ndi.gaussian_filter(small, (sigma / k, sigma / k) + (0,) * (img.ndim - 2), mode="nearest")
        return ndi.zoom(small, (h / small.shape[0], w / small.shape[1]) + (1,) * (img.ndim - 2), order=1,
                        prefilter=False)[:h, :w]
    return ndi.gaussian_filter(img, (sigma, sigma) + (0,) * (img.ndim - 2), mode="nearest")


def box(img, r):
    return ndi.uniform_filter(img, (2 * r + 1, 2 * r + 1) + (1,) * (img.ndim - 2), mode="nearest")


def guided(guide, p, r, eps):
    """Grey-guide guided filter (He et al.) of a multi-channel image p: edge-aware smoothing."""
    g = guide[..., None]
    mi, mp = box(g, r), box(p, r)
    a = (box(g * p, r) - mi * mp) / (box(g * g, r) - mi * mi + eps)
    b = mp - a * mi
    return box(a, r) * g + box(b, r)


def lum(x):
    return x[..., 0] * 0.2126 + x[..., 1] * 0.7152 + x[..., 2] * 0.0722


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------ the chain

def relight(P, pre):
    C = P["Combined"][..., :3].astype(np.float32)
    h, w = C.shape[:2]
    s = w / 1920.0
    bg = P["Mist"] >= 0.999 if "Mist" in P else np.zeros((h, w), bool)
    if "Position" in P:
        dx = P["Position"][..., 0] - XW
        d0, k, floor = pre["falloff"]
        fall = floor + (1 - floor) * np.exp(-k * np.maximum(dx - d0, 0.0))
        fall = np.where(bg | (dx < 0), 1.0, fall).astype(np.float32)
        fall = blur(fall, 3 * s)
    else:
        fall = np.ones((h, w), np.float32)
    groups = [("sun", "Combined_sun"), ("sky", "Combined_sky"), ("shoji", "Combined_shoji"),
              ("bounce", "Combined_bounce")]
    have = [(k, n) for k, n in groups if n in P]
    if not have:
        return C
    # ratios of blurred passes (the group passes are noisy, fireflies clipped against Combined), then
    # snapped back to the edges of the clean Combined by a guided filter
    sig = 5.0 * s
    Cb = blur(C, sig) + 1e-3
    lim = 1.2 * Cb + 0.02
    ratios = np.concatenate([np.clip(blur(np.minimum(P[n][..., :3], lim), sig) / Cb, 0, 1.5)
                             for _, n in have], -1)
    gl = np.log(lum(C) + 1e-3).astype(np.float32)
    ratios = guided(gl, ratios, max(3, int(round(10 * s))), 0.05)
    W = np.ones_like(C)
    for i, (k, _) in enumerate(have):
        wt = pre[k]
        r = ratios[..., 3 * i:3 * i + 3]
        if k in ("shoji", "sky", "bounce"):
            W += (wt * fall[..., None] - 1.0) * r
        else:
            W += (wt - 1.0) * r
    # gold leaf, lacquer (index 1) keep their light as rendered, gleam included; the robe (index 2) too,
    # with a gentle lift: it is the subject
    if "IndexOB" in P:
        # the index pass takes the first hit of each sample, and a scatter in the haze is a hit with index
        # 0: on a gold or robe surface a share of the samples read 0. So: which object among the samples
        # that hit one (blurred shares), present where enough samples did, edges snapped by a guided filter
        idx = np.rint(P["IndexOB"])
        sg = 1.6 * s
        nz = blur((idx > 0).astype(np.float32), sg)
        pres = smoothstep(0.12, 0.35, nz)
        r2 = blur((idx == 2).astype(np.float32), sg) / np.maximum(nz, 1e-3)
        gl2 = np.log(lum(C) + 1e-3).astype(np.float32)
        m = guided(gl2, np.stack([pres, pres * r2], -1), max(2, int(round(4 * s))), 0.01)
        keep = np.clip(m[..., :1], 0, 1)
        robe = np.clip(m[..., 1:], 0, 1)
        W = W * (1 - keep) + keep * np.maximum(W, 1.0)
        W = W * (1 + (pre["robe_lift"] - 1) * robe + (pre["gold_lift"] - 1) * np.clip(keep - robe, 0, 1))
    X = C * np.maximum(W, 0.0)
    # the washi: what the camera sees of the paper itself (on the west wall line) glows a little more
    if "Position" in P:
        px = blur(P["Position"][..., 0], 1.5 * s)
        paper = (1.0 - smoothstep(0.03, 0.08, np.abs(px - XW))) * smoothstep(0.35, 0.9, lum(blur(C, 1.5 * s)))
        paper = blur(paper * (~bg), 1.5 * s)
        X = X * (1.0 + (pre["paper"] - 1.0) * paper)[..., None]
    # the air: the volume pass (sun and sky only) is smooth by nature but noisy at these samples:
    # clip fireflies, blur, keep it behind silhouettes (guided by depth), then add the extra share
    if "VolumeDir" in P and pre["volume"] != 1.0:
        V = P["VolumeDir"][..., :3]
        V = np.minimum(V, np.percentile(V, 99.0, axis=(0, 1)))
        V = blur(V, 0.008 * w)
        if "Mist" in P:
            V = guided(P["Mist"].astype(np.float32), V, max(2, int(round(10 * s))), 1e-4)
        X = X + (pre["volume"] - 1.0) * np.maximum(V, 0.0)
    return X


def air(X, P, pre):
    if "Mist" not in P:
        return X
    m = np.clip(P["Mist"], 0, 1)
    veil = (1.0 - np.exp(-2.5 * m))[..., None]
    level = float(np.median(lum(X)))
    return X + veil * pre["haze"] * level * 4.0 * np.array(pre["haze_col"], np.float32)


def lens(X, P):
    h, w = X.shape[:2]
    s = w / 1920.0
    L = lum(X)
    # light wrap: the bright opening spills over the edges of what stands in front of it
    B = smoothstep(2.0, 6.0, L)
    if "Mist" in P:
        B = np.maximum(B, (P["Mist"] >= 0.999).astype(np.float32) * smoothstep(0.6, 2.0, L))
    wrap = blur(X * B[..., None], 9 * s) * (1.0 - B)[..., None]
    X = X + CAM["wrap"] * wrap
    # veiling glare (energy conserving) + bloom on highlights
    a, b = CAM["glare_a"], CAM["glare_b"]
    X = (1 - a - b) * X + a * blur(X, 0.012 * w) + b * blur(X, 0.06 * w)
    hi = np.maximum(X - CAM["bloom_thr"], 0.0)
    X = X + CAM["bloom"] * (0.6 * blur(hi, 6 * s) + 0.4 * blur(hi, 28 * s))
    # halation: red-orange glow at the hardest edges of highlights
    hal = blur(np.maximum(lum(X) - 2.5, 0.0), 5 * s)[..., None] * np.array([1.0, 0.42, 0.18], np.float32)
    X = X + CAM["halation"] * hal
    # vignette and the lens geometry
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    R = np.hypot(cx, cy)
    nx, ny = (xx - cx) / R, (yy - cy) / R
    r2 = nx * nx + ny * ny
    X = X * np.exp2(-CAM["vignette_ev"] * r2 ** 1.1)[..., None]
    out = np.empty_like(X)
    for c, dk in ((0, CAM["ca"]), (1, 0.0), (2, -CAM["ca"])):
        k = CAM["distort"] + dk
        f = (1 + k * r2) / (1 + CAM["distort"])     # barrel; corners stay put for green
        out[..., c] = ndi.map_coordinates(X[..., c], [cy + ny * R * f, cx + nx * R * f], order=1, mode="nearest")
    return out


def tone(X, pre, ev):
    X = X * np.float32(2.0 ** ev) * np.array(pre["white"], np.float32)
    X = np.maximum(X - CAM["black"], 0.0) * np.float32(1.0 / (1.0 - CAM["black"]))   # a deeper black point

    def hable(t):
        A, Bb, Cc, D, E, F = 0.22, 0.30, 0.10, 0.20, 0.01, 0.30
        return ((t * (A * t + Cc * Bb) + D * E) / (t * (A * t + Bb) + D * F)) - E / F

    WHITE, GAIN = 10.0, 2.4             # scene value that maps to display white; mid-grey placement
    norm = np.float32(1.0 / hable(WHITE * GAIN))

    def shoulder(v):                    # a soft toe, straight mids, a long rolled-off shoulder
        return hable(np.maximum(v, 0.0) * GAIN) * norm
    Y = lum(X)[..., None]
    t_lum = X * (shoulder(Y) / np.maximum(Y, 1e-6))
    t_ch = shoulder(X)
    T = np.clip(0.55 * t_lum + 0.45 * t_ch, 0.0, 1.0)
    # gentle grade: a touch less saturation, a hair of warmth in the highlights, cool shadows kept natural
    Yt = lum(T)[..., None]
    T = Yt + (T - Yt) * CAM["sat"]
    T = T * (1 + 0.025 * smoothstep(0.5, 1.0, Yt) * np.array([1.0, 0.3, -0.6], np.float32))
    T = np.clip(T, 0, 1)
    D = np.where(T <= 0.0031308, 12.92 * T, 1.055 * np.power(T, 1 / 2.4) - 0.055)
    # a little more density in the shadows (a print, not a flat scan): S-curve about mid-grey
    return np.clip(D + CAM["contrast"] * (D - 0.45) * (1 - np.abs(2 * D - 1)), 0, 1)


def sensor(D, seed):
    h, w = D.shape[:2]
    s = w / 1920.0
    rs = np.random.default_rng(seed)
    n = rs.standard_normal((h, w), dtype=np.float32)
    n = ndi.gaussian_filter(n, 0.55 * s) * 1.6                    # demosaic softens the noise a little
    ch = rs.standard_normal((h // 2, w // 2, 3), dtype=np.float32)
    ch = ndi.zoom(ch, (h / (h // 2), w / (w // 2), 1), order=1)[:h, :w]
    ch -= ch.mean(-1, keepdims=True)
    Y = lum(D)[..., None]
    amp = CAM["grain"] * (0.35 + 1.1 * np.sqrt(np.clip(Y, 0, 1)) * (1.05 - Y))   # shot noise, gone at white
    D = D + amp * (n[..., None] + CAM["chroma"] * ch)
    return np.clip(D, 0, 1)


def comp(path, shot="", seed=0):
    P = read_exr(path)
    pre = PRESETS[SHOT_PRESET.get(shot, "morning")]
    X = relight(P, pre)
    X = air(X, P, pre)
    X = lens(X, P)
    D = tone(X, pre, pre["ev"] + SHOT_EV.get(shot, 0.0))
    D = sensor(D, seed)
    return (D * 255.0 + 0.5).astype(np.uint8)


def save(rgb, out):
    from PIL import Image
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    im = Image.fromarray(rgb)
    tmp = out + ".tmp" + os.path.splitext(out)[1]
    if out.endswith(".webp"):
        im.save(tmp, quality=90, method=6)
    elif out.endswith((".jpg", ".jpeg")):
        im.save(tmp, quality=92)
    else:
        im.save(tmp, compress_level=1)
    os.replace(tmp, out)


def _frame(job):
    src, dst, shot, seed = job
    if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        save(comp(src, shot, seed), dst)
    return dst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=("still", "clip"))
    ap.add_argument("src")
    ap.add_argument("dst", help="still: an image path (.webp/.png/.jpg); clip: an output base, gets .mp4 and .webm")
    ap.add_argument("--shot", default="", help="shot name (default: from the file or folder name)")
    ap.add_argument("--jobs", type=int, default=max(1, (os.cpu_count() or 2) - 1))
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--frames-only", action="store_true", help="clip: write graded PNG frames, do not encode")
    a = ap.parse_args()
    shot = a.shot or os.path.basename(a.src.rstrip("/")).split(".")[0]
    if a.mode == "still":
        save(comp(a.src, shot, 7), a.dst)
        print("[comp] %s -> %s" % (a.src, a.dst), flush=True)
        return
    srcs = sorted(glob.glob(os.path.join(a.src, "f_*.exr")))
    if not srcs:
        sys.exit("[comp] no EXR frames in %s" % a.src)
    fdir = a.src.rstrip("/") + "_graded"
    os.makedirs(fdir, exist_ok=True)
    jobs = [(p, os.path.join(fdir, os.path.basename(p)[:-4] + ".png"), shot, 1000 + i) for i, p in enumerate(srcs)]
    with Pool(a.jobs) as pool:
        for n, _ in enumerate(pool.imap(_frame, jobs, chunksize=2)):
            if n % 30 == 0:
                print("[comp] %s %d/%d" % (shot, n + 1, len(jobs)), flush=True)
    if a.frames_only:
        return
    os.makedirs(os.path.dirname(a.dst) or ".", exist_ok=True)
    pat = os.path.join(fdir, "f_%04d.png")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(a.fps), "-i", pat, "-c:v", "libx264",
                    "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                    a.dst + ".tmp.mp4"], check=True)
    os.replace(a.dst + ".tmp.mp4", a.dst + ".mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(a.fps), "-i", pat, "-c:v", "libvpx-vp9",
                    "-crf", "32", "-b:v", "0", "-row-mt", "1", "-pix_fmt", "yuv420p", "-an", a.dst + ".tmp.webm"],
                   check=True)
    os.replace(a.dst + ".tmp.webm", a.dst + ".webm")
    print("[comp] %s: %d frames -> %s.mp4 + .webm" % (shot, len(srcs), a.dst), flush=True)


if __name__ == "__main__":
    main()
