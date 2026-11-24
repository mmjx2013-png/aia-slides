"""common.py - shared numbers, easing, textile images, materials and render setup.

Owned by the main pipeline; dressform.py imports from here. Function names are stable.

SIGNATURES
----------
DIMS                                   dict loaded from dims.json (metres, Z up)
load_dims(path=None) -> dict
hex_rgb(hex, alpha=None) -> (r, g, b[, a])      linear RGB floats for Blender colours

clamp01(t) -> float
smoothstep(t) -> float                 3t^2 - 2t^3, clamped
smootherstep(t) -> float               6t^5 - 15t^4 + 10t^3, clamped (C2 at both ends)
ramp(f, f0, f1, ease=smootherstep) -> float     0 before f0, 1 after f1, eased between
lerp(a, b, t)                          works on floats, tuples, numpy arrays

design_image(force=False) -> str       path of the kimono design atlas PNG (drawn with PIL, cached in build/tex)
obi_image(force=False) -> str          path of the tileable obi brocade PNG (one tile = OBI_TILE metres)
ATLAS_W, ATLAS_H                       atlas size in metres (UV 0..1 spans this)
garment_uv(x, y) -> (u, v)             flat-layout garment metres -> atlas UV.
                                       x in [-0.72, 0.72] (wearer's left is x < 0), y in [-1.6, 1.6]:
                                       y < 0 is the BACK (y = -1.6 back hem), y = 0 the shoulder fold,
                                       y > 0 the FRONT (y = +1.6 front hem). Sleeves are |x| > 0.36, |y| <= 0.49.
okumi_uv(side, a, b) -> (u, v)         side 'l' or 'r'; a across the 0.18 strip, b along it (0 = top, towards hem)
collar_uv(a, b, over=False) -> (u, v)  a across the 0.18 strip (0..0.18), b along it
worn_uv(c, h, c_ref=None) -> (u, v)    "worn canvas" -> atlas UV, the easy one for a wrapped body:
                                       c = distance round the body from centre back (metres): 0 = centre back,
                                       negative towards the wearer's LEFT; -0.36 = left side seam,
                                       -0.72 = left centre-front (okumi seam), -0.87 = left front edge (the
                                       edge that lies on top when worn); positive mirrors on the right.
                                       h = distance below the shoulder line (0..1.6, 1.6 = hem).
                                       The design is continuous in (c, h) but the atlas is not: panels change
                                       at |c| = 0.36 and 0.72, so split the mesh there (or give per-corner UVs)
                                       and pass c_ref = the face-centre c so every corner uses the same panel.

fabric_material(kind, name=None, color=None) -> bpy.types.Material
    kind: 'kimono'    design atlas on the outside, vermilion lining on the back face. NEEDS a UV map
                      holding atlas UVs (garment_uv / worn_uv / okumi_uv / collar_uv).
          'lining'    plain vermilion silk
          'juban'     white under-robe silk
          'obi'       aubergine/gold brocade. UV in METRES (1 UV unit = 1 m of cloth; u along, v across).
                      Without a UV map it renders a plain aubergine silk.
          'obiage'    soft matte crepe (vermilion by default)
          'obijime'   braided cord (ochre gold by default)
          'mannequin' pale matte linen-covered form
    plus scene kinds used by scene.py: 'dais', 'room', 'floor', 'lacquer', 'chalk', 'thread'.
    name:  datablock name; same name returns the same (cached) material. Default 'K_<kind>'.
    color: optional sRGB hex string or (r, g, b) linear tuple overriding the base colour
           (ignored for 'kimono' and 'obi', which are image driven).
    Only 'kimono' and 'obi' read UVs; every other kind works on any mesh without UVs.

hall_material(kind, name=None, strength=None) -> bpy.types.Material        (v3, the shoin hall)
    kind: 'tatami', 'hinoki', 'hinoki_wall', 'board', 'planks', 'plaster', 'washi', 'gold', 'gilt',
          'felt', 'lacquer'. Photo-scanned CC0 maps from build/assets (three_d/fetch_assets.py,
          three_d/CREDITS.md) with a procedural fallback each; UV conventions are listed above the
          function.
asset_map(asset_id, kind, res="2k") -> path or None      a downloaded Poly Haven map (diff, rough, nor_gl)
hdri_path(asset_id="ninomaru_teien", res="2k") -> path or None

setup_cycles(scene=None, res=(1920, 1080), samples=48, preview=False) -> scene
    One place for engine, CPU threads, adaptive sampling, OpenImageDenoise, light paths, colour
    management (view transform VIEW_TRANSFORM / LOOK) and PNG output. Everyone renders through this.
"""
import json
import math
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TEX_DIR = os.path.join(ROOT, "build", "tex")

VIEW_TRANSFORM = "AgX"
LOOK = "AgX - Medium High Contrast"


# --------------------------------------------------------------------------- dims

def load_dims(path=None):
    with open(path or os.path.join(HERE, "dims.json")) as fh:
        return json.load(fh)


DIMS = load_dims()

W = DIMS["bolt"]["width"]                     # bolt width 0.36
BODY = DIMS["garment"]["body_length"]         # 1.60
SLEEVE = DIMS["garment"]["sleeve_drop"]       # 0.49
OKUMI_W = DIMS["garment"]["okumi_width"]      # 0.15
OKUMI_L = DIMS["garment"]["okumi_length"]     # 1.36
OKUMI_SA = DIMS["garment"]["okumi_seam_allowance"]
HALF = W / 2.0                                # width of the lengthwise half strips
OKUMI_PIECE_L = DIMS["garment"]["okumi_collar_section"] / 2.0   # 1.40 cut length of each okumi
COLLAR_L = DIMS["garment"]["collar_length"]
OVER_COLLAR_L = DIMS["garment"]["over_collar_length"]


def _srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgb8(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def hex_rgb(h, alpha=None):
    r, g, b = (_srgb_to_lin(v / 255.0) for v in hex_rgb8(h))
    return (r, g, b) if alpha is None else (r, g, b, alpha)


PAL = DIMS["palette"]


# --------------------------------------------------------------------------- easing

def clamp01(t):
    return 0.0 if t < 0.0 else (1.0 if t > 1.0 else float(t))


def smoothstep(t):
    t = clamp01(t)
    return t * t * (3.0 - 2.0 * t)


def smootherstep(t):
    t = clamp01(t)
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0)


def ramp(f, f0, f1, ease=smootherstep):
    if f1 <= f0:
        return 1.0 if f >= f1 else 0.0
    return ease((f - f0) / float(f1 - f0))


def lerp(a, b, t):
    if isinstance(a, (tuple, list)):
        return type(a)(x + (y - x) * t for x, y in zip(a, b))
    return a + (b - a) * t


# --------------------------------------------------------------------------- atlas layout

PPM = 1600                      # final atlas pixels per metre
_SS = 2                         # supersampling while drawing
ATLAS_W = 2.20
ATLAS_H = 2.0 * BODY            # 3.20
_REG = {                        # region: (u0, v0, w, h) in metres
    "main":        (0.0, 0.0, 4 * W, 2 * BODY),
    "okumi_l":     (1.50, 0.0, HALF, OKUMI_PIECE_L),
    "okumi_r":     (1.74, 0.0, HALF, OKUMI_PIECE_L),
    "collar":      (1.98, 0.0, HALF, COLLAR_L),
    "over_collar": (1.98, 2.0, HALF, OVER_COLLAR_L),
}
OKUMI_Y0 = BODY - OKUMI_PIECE_L          # flat-layout y of the top of the cut okumi strip (0.20)


def garment_uv(x, y):
    return ((x + 2 * W) / ATLAS_W, (y + BODY) / ATLAS_H)


def okumi_uv(side, a, b):
    u0, v0, w, h = _REG["okumi_l" if side == "l" else "okumi_r"]
    return ((u0 + a) / ATLAS_W, (v0 + b) / ATLAS_H)


def collar_uv(a, b, over=False):
    u0, v0, w, h = _REG["over_collar" if over else "collar"]
    return ((u0 + a) / ATLAS_W, (v0 + b) / ATLAS_H)


def worn_uv(c, h, c_ref=None):
    """Worn canvas (c round the body from centre back, h below shoulder) -> atlas UV."""
    cr = c if c_ref is None else c_ref
    h = min(max(h, 0.0), BODY)
    if abs(cr) <= W:                                   # back panels
        return garment_uv(c, -h)
    if cr < 0:                                         # wearer's left front
        x = -2 * W - c                                 # c=-0.36 -> x=-0.36 ; c=-0.72 -> x=0
        if cr >= -2 * W:
            return garment_uv(x, h)
        return okumi_uv("l", x + OKUMI_SA, h - OKUMI_Y0)   # x in 0..0.15
    x = 2 * W - c                                      # right front: c=0.36 -> x=0.36 ; c=0.72 -> x=0
    if cr <= 2 * W:
        return garment_uv(x, h)
    return okumi_uv("r", x + OKUMI_W, h - OKUMI_Y0)        # x in -0.15..0


# --------------------------------------------------------------------------- drawing helpers (PIL)

class _Canvas:
    """Draws in metres onto a PIL image. (x0, y0) is the metre coordinate of the image's
    top-left pixel; sx, sy are +1/-1 for the direction of increasing metres."""

    def __init__(self, img, x0, y0, ppm, sx=1, sy=1, clip=None):
        from PIL import ImageDraw
        self.img = img
        self.d = ImageDraw.Draw(img, "RGBA")
        self.x0, self.y0, self.ppm, self.sx, self.sy = x0, y0, ppm, sx, sy

    def p(self, x, y):
        return ((x - self.x0) * self.sx * self.ppm, (y - self.y0) * self.sy * self.ppm)

    def circle(self, x, y, r, fill):
        px, py = self.p(x, y)
        rr = r * self.ppm
        self.d.ellipse((px - rr, py - rr, px + rr, py + rr), fill=fill)

    def poly(self, pts, fill):
        self.d.polygon([self.p(x, y) for x, y in pts], fill=fill)

    def ellipse(self, x, y, rx, ry, rot, fill, n=28):
        ca, sa = math.cos(rot), math.sin(rot)
        pts = []
        for k in range(n):
            t = 2 * math.pi * k / n
            ex, ey = rx * math.cos(t), ry * math.sin(t)
            pts.append((x + ex * ca - ey * sa, y + ex * sa + ey * ca))
        self.poly(pts, fill)

    def petal(self, x, y, length, width, rot, fill, n=14):
        """A petal with its base at (x, y), pointing along rot: narrow base, round tip."""
        ca, sa = math.cos(rot), math.sin(rot)
        pts = []
        for k in range(n + 1):
            t = k / n
            wv = width * 0.5 * math.sin(math.pi * t ** 0.62)
            pts.append((t * length, wv))
        for k in range(n, -1, -1):
            t = k / n
            wv = width * 0.5 * math.sin(math.pi * t ** 0.62)
            pts.append((t * length, -wv))
        self.poly([(x + px * ca - py * sa, y + px * sa + py * ca) for px, py in pts], fill)

    def stroke(self, pts, w0, w1, fill):
        """Tapered round stroke through dense points."""
        n = len(pts)
        for i, (x, y) in enumerate(pts):
            t = i / max(1, n - 1)
            self.circle(x, y, 0.5 * (w0 + (w1 - w0) * t), fill)

    def line(self, pts, width, fill):
        self.d.line([self.p(x, y) for x, y in pts], fill=fill, width=max(1, int(round(width * self.ppm))),
                    joint="curve")

    def stadium(self, x, y, length, height, fill):
        px0, py0 = self.p(x, y - height / 2)
        px1, py1 = self.p(x + length, y + height / 2)
        xa, xb = sorted((px0, px1))
        ya, yb = sorted((py0, py1))
        self.d.rounded_rectangle((xa, ya, xb, yb), radius=(yb - ya) / 2, fill=fill)


def _catmull(pts, per=24):
    out = []
    P = [pts[0]] + list(pts) + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(per):
            t = k / per
            t2, t3 = t * t, t * t * t
            out.append(tuple(
                0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                       + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(tuple(pts[-1]))
    return out


def _c(hexs, a=255):
    return hex_rgb8(hexs) + (a,)


_AUB = PAL["aubergine"]
_OCH = PAL["ochre"]
_GRB = PAL["grey_blue"]
_VER = PAL["vermilion"]
_IVO = "#f4efe3"
_AUB_D = "#3b2a36"
_AUB_L = "#8d7684"
_OCH_L = "#d2ad78"


def _plum(cv, x, y, R, rot, petal, centre, stamen):
    for k in range(5):
        a = rot + k * 2 * math.pi / 5
        cv.circle(x + 0.56 * R * math.cos(a), y + 0.56 * R * math.sin(a), 0.50 * R, petal)
    cv.circle(x, y, 0.40 * R, petal)
    for k in range(9):
        a = rot + 0.3 + k * 2 * math.pi / 9
        x1, y1 = x + 0.46 * R * math.cos(a), y + 0.46 * R * math.sin(a)
        cv.line([(x + 0.1 * R * math.cos(a), y + 0.1 * R * math.sin(a)), (x1, y1)], 0.03 * R, stamen)
        cv.circle(x1, y1, 0.045 * R, stamen)
    cv.circle(x, y, 0.11 * R, centre)


def _bud(cv, x, y, R, petal, calyx, rot):
    cv.circle(x, y, R, petal)
    cv.circle(x - 0.75 * R * math.cos(rot), y - 0.75 * R * math.sin(rot), 0.55 * R, calyx)


def _kiku(cv, x, y, R, rot, petal, gap, centre, n=16):
    cv.circle(x, y, 0.5 * R, petal)
    for ring, (r0, ln, wd, off) in enumerate(((0.16, 0.86, 0.30, 0.0), (0.12, 0.56, 0.24, 0.5))):
        for k in range(n):
            a = rot + (k + off) * 2 * math.pi / n
            bx, by = x + r0 * R * math.cos(a), y + r0 * R * math.sin(a)
            cv.petal(bx, by, ln * R, wd * R + 0.012 * R, a, gap)
            cv.petal(bx, by, ln * R - 0.02 * R, wd * R - 0.035 * R, a, petal)
    cv.circle(x, y, 0.15 * R, gap)
    cv.circle(x, y, 0.12 * R, centre)


def _mist(cv, x, y, length, rnd, fill, speck, hh=0.034, tiers=3):
    """Egasumi-style mist: a few stacked round-ended bars."""
    for t in range(tiers):
        dx = rnd.uniform(-0.12, 0.12) * length + (t - (tiers - 1) / 2) * 0.10 * length
        ln = length * rnd.uniform(0.55, 0.95)
        yy = y + (t - (tiers - 1) / 2) * hh * 0.98
        cv.stadium(x - ln / 2 + dx, yy, ln, hh, fill)
        for _ in range(int(ln * 260)):
            sx_ = x - ln / 2 + dx + rnd.uniform(hh / 2, ln - hh / 2)
            sy_ = yy + rnd.uniform(-hh * 0.36, hh * 0.36)
            cv.circle(sx_, sy_, rnd.uniform(0.0006, 0.0016), speck)


def _branch(cv, pts, w0, w1, col):
    path = _catmull(pts, per=60)
    cv.stroke(path, w0, w1, col)
    return path


def _dots(cv, x, y, spread, n, rnd, col, r=(0.0022, 0.0036)):
    for _ in range(n):
        a = rnd.uniform(0, 2 * math.pi)
        d = spread * rnd.random() ** 0.7
        cv.circle(x + d * math.cos(a) * 1.8, y + d * math.sin(a) * 0.6, rnd.uniform(*r), col)


def _water(cv, f, c0, c1, offsets, rnd, col, width=0.0024):
    """Flowing-water strokes: families of near-parallel lines with breaks."""
    for k, off in enumerate(offsets):
        c = c0 + rnd.uniform(0, 0.2)
        while c < c1:
            ln = rnd.uniform(0.22, 0.62)
            pts = []
            n = max(8, int(ln / 0.006))
            for i in range(n + 1):
                cc = c + ln * i / n
                if cc > c1:
                    break
                pts.append((cc, f(cc) + off * (1.0 + 0.35 * math.sin(2.3 * cc + k * 1.3))))
            if len(pts) > 2:
                cv.line(pts, width, col)
                cv.circle(pts[0][0], pts[0][1], width / 2, col)
                cv.circle(pts[-1][0], pts[-1][1], width / 2, col)
            c += ln + rnd.uniform(0.05, 0.16)


def _ground_rgb(h):
    """Ivory ground, light at the shoulder, a little deeper towards the hem (h in metres)."""
    a = hex_rgb8(PAL["ground_light"])
    b = hex_rgb8(PAL["ground_dark"])
    t = smoothstep(h / BODY)
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def _draw_worn(ppm):
    """The hem composition on the worn canvas: c in [-0.90, 0.90], h in [0, 1.6] (h down)."""
    import numpy as np
    from PIL import Image
    cw, ch = 1.80, BODY
    wpx, hpx = int(round(cw * ppm)), int(round(ch * ppm))
    hh = np.linspace(0.0, ch, hpx, dtype=np.float32)[:, None]
    cc = np.linspace(-0.90, 0.90, wpx, dtype=np.float32)[None, :]
    t = np.clip(hh / BODY, 0, 1)
    t = t * t * (3 - 2 * t)
    a = np.array(hex_rgb8(PAL["ground_light"]), np.float32)
    b = np.array(hex_rgb8(PAL["ground_dark"]), np.float32)
    arr = a[None, None, :] + (b - a)[None, None, :] * t[:, :, None] + np.zeros((1, wpx, 1), np.float32)
    # bokashi: a soft aubergine-grey haze rising from the hem with a slow wavy upper edge
    edge = 1.33 + 0.05 * np.sin(3.1 * cc + 0.6) + 0.03 * np.sin(7.3 * cc + 2.0)
    k = np.clip((hh - edge) / 0.30, 0, 1)
    k = (k * k * (3 - 2 * k)) * 0.42
    haze = np.array(hex_rgb8("#9a8794"), np.float32)
    arr = arr * (1 - k[:, :, None]) + haze[None, None, :] * k[:, :, None]
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")
    cv = _Canvas(img, -0.90, 0.0, ppm)
    rnd = random.Random(11)

    def wf(c):  # centre line of the stream, drifting down from the left front to the back right
        return 1.20 + 0.085 * math.sin(2.4 * c + 0.4) + 0.05 * math.sin(5.3 * c + 1.1) + 0.06 * c

    _water(cv, wf, -0.90, 0.90, [-0.070, -0.046, -0.024, 0.0, 0.022, 0.048, 0.078], rnd, _c(_GRB, 235))
    _water(cv, lambda c: wf(c) + 0.27 + 0.03 * math.sin(4 * c), -0.90, 0.90, [-0.02, 0.0, 0.024], rnd,
           _c("#c9c2b8", 235))

    for (x, y, ln, col, sp, tiers) in (
            (-0.60, 1.00, 0.40, _OCH, _OCH_L, 3), (-0.12, 1.37, 0.46, _OCH, _OCH_L, 3),
            (0.33, 1.07, 0.36, _OCH, _OCH_L, 2), (0.66, 1.40, 0.34, _OCH, _OCH_L, 3),
            (-0.82, 1.47, 0.26, _OCH, _OCH_L, 2), (0.05, 0.95, 0.24, _GRB, "#aeb4b9", 2),
            (-0.36, 1.515, 0.40, _GRB, "#aeb4b9", 2), (0.52, 1.22, 0.22, _GRB, "#aeb4b9", 2)):
        _mist(cv, x, y, ln, rnd, _c(col, 240), _c(sp, 255), tiers=tiers)

    # plum branches rising from the hem
    def blossoms(path, spots, R0, seed):
        r2 = random.Random(seed)
        for (t, side, kind) in spots:
            i = min(len(path) - 2, int(t * (len(path) - 1)))
            x, y = path[i]
            tx, ty = path[i + 1][0] - x, path[i + 1][1] - y
            ln = math.hypot(tx, ty) or 1.0
            nx, ny = -ty / ln * side, tx / ln * side
            R = R0 * r2.uniform(0.8, 1.15)
            ox, oy = x + nx * R * 1.15, y + ny * R * 1.15
            if kind == "bud":
                _bud(cv, x + nx * R * 0.5, y + ny * R * 0.5, R * 0.34, _c(_AUB), _c(_AUB_D), math.atan2(ny, nx))
            else:
                cv.stroke([(x, y), (ox, oy)], 0.004, 0.003, _c(_AUB_D))
                if kind == "aub":
                    _plum(cv, ox, oy, R, r2.uniform(0, 6.3), _c(_AUB), _c(_OCH), _c(_OCH_L))
                elif kind == "ivo":
                    _plum(cv, ox, oy, R * 1.04, r2.uniform(0, 6.3), _c(_AUB_D), _c(_AUB_D), _c(_AUB_D))
                    _plum(cv, ox, oy, R * 0.93, r2.uniform(0, 6.3), _c(_IVO), _c(_OCH), _c(_AUB))
                else:
                    _plum(cv, ox, oy, R, r2.uniform(0, 6.3), _c(_OCH), _c(_AUB_D), _c(_IVO))

    p1 = _branch(cv, [(-0.585, 1.62), (-0.60, 1.42), (-0.67, 1.22), (-0.70, 1.04), (-0.66, 0.90), (-0.71, 0.78)],
                 0.016, 0.004, _c(_AUB_D))
    _branch(cv, [(-0.655, 1.25), (-0.74, 1.16), (-0.80, 1.02)], 0.008, 0.003, _c(_AUB_D))
    _branch(cv, [(-0.61, 1.40), (-0.52, 1.30), (-0.49, 1.17)], 0.008, 0.003, _c(_AUB_D))
    blossoms(p1, [(0.20, 1, "aub"), (0.33, -1, "ivo"), (0.46, 1, "och"), (0.58, -1, "aub"), (0.70, 1, "ivo"),
                  (0.82, -1, "bud"), (0.90, 1, "aub"), (0.97, -1, "bud")], 0.033, 3)
    blossoms(_catmull([(-0.655, 1.25), (-0.74, 1.16), (-0.80, 1.02)], 60),
             [(0.5, 1, "och"), (0.95, -1, "aub"), (0.75, -1, "bud")], 0.028, 4)
    blossoms(_catmull([(-0.61, 1.40), (-0.52, 1.30), (-0.49, 1.17)], 60),
             [(0.55, -1, "ivo"), (0.97, 1, "aub"), (0.8, 1, "bud")], 0.028, 5)

    p2 = _branch(cv, [(0.10, 1.62), (0.12, 1.46), (0.19, 1.30), (0.17, 1.14), (0.23, 1.02)],
                 0.013, 0.004, _c(_AUB_D))
    _branch(cv, [(0.165, 1.33), (0.07, 1.24), (0.03, 1.13)], 0.007, 0.003, _c(_AUB_D))
    blossoms(p2, [(0.30, -1, "ivo"), (0.47, 1, "aub"), (0.62, -1, "och"), (0.78, 1, "ivo"), (0.92, -1, "bud"),
                  (0.99, 1, "aub")], 0.030, 6)
    blossoms(_catmull([(0.165, 1.33), (0.07, 1.24), (0.03, 1.13)], 60),
             [(0.6, 1, "aub"), (0.97, -1, "och")], 0.026, 7)

    # chrysanthemums near the hem
    for (x, y, R, col, gap, cen) in (
            (-0.30, 1.43, 0.062, _AUB, _IVO, _OCH), (-0.215, 1.50, 0.046, _OCH, _IVO, _AUB_D),
            (0.47, 1.47, 0.058, _AUB, _IVO, _OCH), (0.565, 1.395, 0.042, _IVO, _AUB_L, _OCH),
            (-0.80, 1.335, 0.048, _OCH, _IVO, _AUB_D), (-0.455, 1.445, 0.040, _IVO, _AUB_L, _OCH),
            (0.80, 1.50, 0.05, _AUB, _IVO, _OCH), (-0.02, 1.52, 0.038, _IVO, _AUB_L, _OCH)):
        _kiku(cv, x, y, R, rnd.uniform(0, 1), _c(col), _c(gap), _c(cen))

    for (x, y, sp, n, col) in ((-0.42, 1.08, 0.05, 26, _OCH), (0.30, 1.29, 0.05, 22, _OCH),
                               (-0.05, 1.18, 0.04, 16, _AUB_L), (0.62, 1.10, 0.04, 16, _OCH),
                               (-0.78, 1.20, 0.035, 14, _AUB_L)):
        _dots(cv, x, y, sp, n, rnd, _c(col))
    return img


def _draw_flat(cv):
    """Shoulder composition in flat garment coordinates, drawn straight into the atlas main region:
    a small branch laid over the wearer's left shoulder, from the back of the left sleeve to the chest."""
    rnd = random.Random(23)
    _mist(cv, -0.46, 0.215, 0.30, rnd, _c(_OCH, 240), _c(_OCH_L), tiers=2)
    _mist(cv, -0.57, -0.335, 0.22, rnd, _c(_GRB, 240), _c("#aeb4b9"), tiers=2)
    path = _branch(cv, [(-0.665, -0.40), (-0.60, -0.24), (-0.50, -0.10), (-0.41, 0.04), (-0.30, 0.15),
                        (-0.22, 0.30), (-0.20, 0.42)], 0.011, 0.003, _c(_AUB_D))
    _branch(cv, [(-0.47, -0.06), (-0.50, 0.06), (-0.58, 0.14)], 0.006, 0.003, _c(_AUB_D))
    r2 = random.Random(31)
    spots = [(0.10, 1, "aub"), (0.22, -1, "ivo"), (0.36, 1, "och"), (0.50, -1, "bud"), (0.62, 1, "ivo"),
             (0.74, -1, "aub"), (0.86, 1, "bud"), (0.95, -1, "och")]
    for (t, side, kind) in spots:
        i = min(len(path) - 2, int(t * (len(path) - 1)))
        x, y = path[i]
        tx, ty = path[i + 1][0] - x, path[i + 1][1] - y
        ln = math.hypot(tx, ty) or 1.0
        nx, ny = -ty / ln * side, tx / ln * side
        R = 0.027 * r2.uniform(0.85, 1.15)
        ox, oy = x + nx * R * 1.15, y + ny * R * 1.15
        if kind == "bud":
            _bud(cv, x + nx * R * 0.5, y + ny * R * 0.5, R * 0.34, _c(_AUB), _c(_AUB_D), math.atan2(ny, nx))
            continue
        cv.stroke([(x, y), (ox, oy)], 0.004, 0.003, _c(_AUB_D))
        if kind == "aub":
            _plum(cv, ox, oy, R, r2.uniform(0, 6.3), _c(_AUB), _c(_OCH), _c(_OCH_L))
        elif kind == "ivo":
            _plum(cv, ox, oy, R * 1.04, 0.3, _c(_AUB_D), _c(_AUB_D), _c(_AUB_D))
            _plum(cv, ox, oy, R * 0.93, 0.3, _c(_IVO), _c(_OCH), _c(_AUB))
        else:
            _plum(cv, ox, oy, R, r2.uniform(0, 6.3), _c(_OCH), _c(_AUB_D), _c(_IVO))
    _plum(cv, -0.585, 0.165, 0.024, 0.4, _c(_AUB), _c(_OCH), _c(_OCH_L))
    _dots(cv, -0.33, 0.30, 0.035, 14, rnd, _c(_OCH))
    # right sleeve: a quiet echo near its lower edge, mirrored in y so it meets across the bottom seam
    for sgn in (1, -1):
        cvm = _Mirror(cv, sgn)
        r3 = random.Random(41)
        _mist(cvm, 0.55, 0.40, 0.22, r3, _c(_OCH, 240), _c(_OCH_L), tiers=2)
        _kiku(cvm, 0.47, 0.455, 0.034, 0.2, _c(_AUB), _c(_IVO), _c(_OCH))
        _plum(cvm, 0.625, 0.33, 0.022, 0.9, _c(_AUB), _c(_OCH), _c(_OCH_L))


class _Mirror:
    """Canvas proxy that mirrors y (used to make sleeve-bottom motifs meet across the fold)."""

    def __init__(self, cv, sgn):
        self._cv, self._s = cv, sgn

    def circle(self, x, y, r, fill):
        self._cv.circle(x, y * self._s, r, fill)

    def poly(self, pts, fill):
        self._cv.poly([(x, y * self._s) for x, y in pts], fill)

    def line(self, pts, width, fill):
        self._cv.line([(x, y * self._s) for x, y in pts], width, fill)

    def stadium(self, x, y, length, height, fill):
        self._cv.stadium(x, y * self._s, length, height, fill)

    def stroke(self, pts, w0, w1, fill):
        self._cv.stroke([(x, y * self._s) for x, y in pts], w0, w1, fill)

    def petal(self, x, y, length, width, rot, fill, n=14):
        _Canvas.petal(self, x, y, length, width, rot, fill, n)

    def ellipse(self, x, y, rx, ry, rot, fill, n=28):
        _Canvas.ellipse(self, x, y, rx, ry, rot, fill, n)


_DESIGN_VERSION = 3


def design_image(force=False):
    """Draw (or reuse) the kimono design atlas. Returns the PNG path."""
    path = os.path.join(TEX_DIR, "kimono_atlas_v%d.png" % _DESIGN_VERSION)
    if os.path.exists(path) and not force:
        return path
    import numpy as np
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    os.makedirs(TEX_DIR, exist_ok=True)
    ppm = PPM * _SS
    worn = _draw_worn(ppm)

    def crop(c0, c1, h0, h1):
        return worn.crop((int(round((c0 + 0.90) * ppm)), int(round(h0 * ppm)),
                          int(round((c1 + 0.90) * ppm)), int(round(h1 * ppm))))

    aw, ah = int(round(ATLAS_W * ppm)), int(round(ATLAS_H * ppm))
    atlas = Image.new("RGB", (aw, ah), tuple(int(v) for v in _ground_rgb(0.0)))

    def put(im, u0, vtop):          # paste with top-left at metre (u0, vtop) where v is up
        atlas.paste(im, (int(round(u0 * ppm)), int(round((ATLAS_H - vtop) * ppm))))

    # sleeves: ground only (graded with |y|), drawn first as full-width rows of the main region
    rows = np.abs(np.linspace(BODY, -BODY, ah, dtype=np.float32))
    t = np.clip(rows / BODY, 0, 1)
    t = t * t * (3 - 2 * t)
    a = np.array(hex_rgb8(PAL["ground_light"]), np.float32)
    b = np.array(hex_rgb8(PAL["ground_dark"]), np.float32)
    col = (a[None, :] + (b - a)[None, :] * t[:, None]).astype(np.uint8)
    main_w = int(round(4 * W * ppm))
    atlas.paste(Image.fromarray(np.repeat(col[:, None, :], main_w, axis=1), "RGB"), (0, 0))
    # back panels: c = x, h = -y
    put(crop(-W, W, 0, BODY), W, BODY)
    # fronts: rotate 180 degrees (c runs against x, h runs with y)
    put(crop(-2 * W, -W, 0, BODY).rotate(180), W, 2 * BODY)
    put(crop(W, 2 * W, 0, BODY).rotate(180), 2 * W, 2 * BODY)
    # okumi strips (0.18 wide incl. seam allowance): left covers x in [-0.03, 0.15], right x in [-0.15, 0.03]
    u0, v0, w, h = _REG["okumi_l"]
    put(crop(-2 * W - OKUMI_W, -2 * W + OKUMI_SA, OKUMI_Y0, BODY).rotate(180), u0, v0 + h)
    u0, v0, w, h = _REG["okumi_r"]
    put(crop(2 * W - OKUMI_SA, 2 * W + OKUMI_W, OKUMI_Y0, BODY).rotate(180), u0, v0 + h)
    # shoulder composition straight into the main region (x right, y up)
    cv = _Canvas(atlas, -2 * W, BODY, ppm, sx=1, sy=-1)
    _draw_flat(cv)
    # very soft mottling so that large plain areas are not dead flat
    rs = np.random.RandomState(5)
    low = Image.fromarray((rs.rand(ah // 160, aw // 160) * 255).astype(np.uint8), "L").resize(
        (aw // _SS, ah // _SS), Image.BICUBIC)
    out = atlas.resize((aw // _SS, ah // _SS), Image.LANCZOS)
    arr = np.asarray(out, np.float32)
    m = (np.asarray(low, np.float32) / 255.0 - 0.5) * 0.030
    arr = np.clip(arr * (1.0 + m[:, :, None]), 0, 255).astype(np.uint8)
    Image.fromarray(arr, "RGB").save(path, compress_level=3)
    return path


OBI_TILE = 0.16      # metres covered by one tile of the obi image


def obi_image(force=False):
    """Tileable brocade: interlocking circles (drawn in code) in ochre gold on aubergine."""
    path = os.path.join(TEX_DIR, "obi_brocade_v2.png")
    if os.path.exists(path) and not force:
        return path
    from PIL import Image, ImageDraw
    os.makedirs(TEX_DIR, exist_ok=True)
    n, ss = 512, 3
    N = n * ss
    img = Image.new("RGB", (N, N), hex_rgb8("#4a3644"))
    d = ImageDraw.Draw(img, "RGBA")
    gold, gold_l, ivo = _c(_OCH), _c(_OCH_L), _c(_IVO, 235)
    half = N // 2
    r = half * 0.98
    lw = int(N * 0.013)
    for cx in (-half, 0, half, N, N + half):
        for cy in (-half, 0, half, N, N + half):
            if ((cx // half) + (cy // half)) % 2 == 0:
                d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=gold, width=lw)
    for cx in (0, half, N):
        for cy in (0, half, N):
            if ((cx // half) + (cy // half)) % 2 == 0:
                for k in range(4):
                    a = math.pi / 4 + k * math.pi / 2
                    px, py = cx + 0.13 * N * math.cos(a), cy + 0.13 * N * math.sin(a)
                    d.ellipse((px - 0.05 * N, py - 0.05 * N, px + 0.05 * N, py + 0.05 * N), fill=gold_l)
                d.ellipse((cx - 0.03 * N, cy - 0.03 * N, cx + 0.03 * N, cy + 0.03 * N), fill=ivo)
            else:
                s = 0.045 * N
                d.polygon([(cx, cy - s), (cx + s, cy), (cx, cy + s), (cx - s, cy)], fill=gold)
    img.resize((n, n), Image.LANCZOS).save(path)
    return path


# --------------------------------------------------------------------------- materials (bpy)

def _nodes(mat):
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    return nt


def _new_mat(name):
    import bpy
    mat = bpy.data.materials.new(name)
    if not mat.node_tree:
        mat.use_nodes = True
    return mat


def _load_image(path, colorspace="sRGB"):
    import bpy
    key = os.path.basename(path)
    img = bpy.data.images.get(key)
    if img is None:
        img = bpy.data.images.load(path)
        img.name = key
    img.colorspace_settings.name = colorspace
    return img


def _col(color, default_hex):
    if color is None:
        return hex_rgb(default_hex, 1.0)
    if isinstance(color, str):
        return hex_rgb(color, 1.0)
    return tuple(color[:3]) + (1.0,)


def _grain(nt, coord_socket, scale, strength, distance, squash=(1.0, 1.0, 1.0)):
    """Fine procedural grain -> bump node. Returns the bump node (Normal output)."""
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = squash
    nt.links.new(coord_socket, mp.inputs["Vector"])
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = scale
    nz.inputs["Detail"].default_value = 1.5
    nz.inputs["Roughness"].default_value = 0.55
    nt.links.new(mp.outputs["Vector"], nz.inputs["Vector"])
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = strength
    bp.inputs["Distance"].default_value = distance
    nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
    return bp, nz


def _silk(nt, bsdf, rough=0.48, sheen=0.35, spec=0.45, aniso=0.0):
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Specular IOR Level"].default_value = spec
    bsdf.inputs["Sheen Weight"].default_value = sheen
    bsdf.inputs["Sheen Roughness"].default_value = 0.38
    bsdf.inputs["Sheen Tint"].default_value = (1.0, 0.95, 0.88, 1.0)
    bsdf.inputs["Anisotropic"].default_value = aniso


def fabric_material(kind, name=None, color=None):
    import bpy
    name = name or ("K_" + kind)
    mat = bpy.data.materials.get(name)
    if mat is not None:
        return mat
    mat = _new_mat(name)
    nt = _nodes(mat)
    N, L = nt.nodes.new, nt.links.new
    out = N("ShaderNodeOutputMaterial")
    bsdf = N("ShaderNodeBsdfPrincipled")
    L(bsdf.outputs["BSDF"], out.inputs["Surface"])
    tc = N("ShaderNodeTexCoord")

    if kind == "kimono":
        tex = N("ShaderNodeTexImage")
        tex.image = _load_image(design_image())
        tex.interpolation = "Cubic"
        tex.extension = "EXTEND"
        L(tc.outputs["UV"], tex.inputs["Vector"])
        # metres along the cloth for the weave: UV * atlas size
        mp = N("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (ATLAS_W, ATLAS_H, 1.0)
        L(tc.outputs["UV"], mp.inputs["Vector"])
        bump, nz = _grain(nt, mp.outputs["Vector"], 2400.0, 0.22, 0.00022)
        # weft slubs: long thin streaks across the width that break up the sheen
        bump2, nz2 = _grain(nt, mp.outputs["Vector"], 1.0, 0.10, 0.0004, squash=(14.0, 1500.0, 1.0))
        L(bump.outputs["Normal"], bump2.inputs["Normal"])
        geo = N("ShaderNodeNewGeometry")
        lining = N("ShaderNodeValue")
        lining.name = lining.label = "lining_mix"
        lining.outputs[0].default_value = 1.0
        ghost = N("ShaderNodeMix")
        ghost.data_type = "RGBA"
        ghost.inputs["Factor"].default_value = 0.72           # reverse of the cloth: the design shows faintly
        L(tex.outputs["Color"], ghost.inputs["A"])
        ghost.inputs["B"].default_value = hex_rgb("#e2dacb", 1.0)
        back = N("ShaderNodeMix")
        back.data_type = "RGBA"
        L(lining.outputs[0], back.inputs["Factor"])
        L(ghost.outputs["Result"], back.inputs["A"])
        back.inputs["B"].default_value = hex_rgb(PAL["vermilion"], 1.0)
        face = N("ShaderNodeMix")
        face.data_type = "RGBA"
        L(geo.outputs["Backfacing"], face.inputs["Factor"])
        L(tex.outputs["Color"], face.inputs["A"])
        L(back.outputs["Result"], face.inputs["B"])
        L(face.outputs["Result"], bsdf.inputs["Base Color"])
        L(bump2.outputs["Normal"], bsdf.inputs["Normal"])
        # slubs also modulate roughness a little
        rr = N("ShaderNodeMapRange")
        rr.inputs["To Min"].default_value = 0.42
        rr.inputs["To Max"].default_value = 0.58
        L(nz2.outputs["Fac"], rr.inputs["Value"])
        L(rr.outputs["Result"], bsdf.inputs["Roughness"])
        _silk(nt, bsdf, sheen=0.40, spec=0.42, aniso=0.0)
        L(rr.outputs["Result"], bsdf.inputs["Roughness"])

    elif kind in ("lining", "juban", "obiage"):
        default = {"lining": PAL["vermilion"], "juban": PAL["juban"], "obiage": "#c9573d"}[kind]
        bsdf.inputs["Base Color"].default_value = _col(color, default)
        if kind == "obiage":
            bump, _ = _grain(nt, tc.outputs["Object"], 1400.0, 0.5, 0.0006)
            _silk(nt, bsdf, rough=0.72, sheen=0.25, spec=0.2)
        else:
            bump, _ = _grain(nt, tc.outputs["Object"], 2600.0, 0.18, 0.0002)
            _silk(nt, bsdf, rough=0.46 if kind == "lining" else 0.50, sheen=0.38, spec=0.42)
        L(bump.outputs["Normal"], bsdf.inputs["Normal"])

    elif kind == "obi":
        tex = N("ShaderNodeTexImage")
        tex.image = _load_image(obi_image())
        tex.interpolation = "Cubic"
        mp = N("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (1.0 / OBI_TILE, 1.0 / OBI_TILE, 1.0)
        L(tc.outputs["UV"], mp.inputs["Vector"])
        L(mp.outputs["Vector"], tex.inputs["Vector"])
        L(tex.outputs["Color"], bsdf.inputs["Base Color"])
        # gold threads: ochre pixels (red well above blue) get a metallic, smoother response
        sep = N("ShaderNodeSeparateColor")
        L(tex.outputs["Color"], sep.inputs["Color"])
        sub = N("ShaderNodeMath")
        sub.operation = "SUBTRACT"
        L(sep.outputs["Red"], sub.inputs[0])
        L(sep.outputs["Blue"], sub.inputs[1])
        mr = N("ShaderNodeMapRange")
        mr.inputs["From Min"].default_value = 0.10
        mr.inputs["From Max"].default_value = 0.30
        mr.inputs["To Min"].default_value = 0.0
        mr.inputs["To Max"].default_value = 0.55
        L(sub.outputs[0], mr.inputs["Value"])
        L(mr.outputs["Result"], bsdf.inputs["Metallic"])
        bump, _ = _grain(nt, tc.outputs["Object"], 1800.0, 0.35, 0.0004, squash=(1.0, 1.0, 3.0))
        L(bump.outputs["Normal"], bsdf.inputs["Normal"])
        _silk(nt, bsdf, rough=0.50, sheen=0.25, spec=0.45)

    elif kind == "obijime":
        bsdf.inputs["Base Color"].default_value = _col(color, PAL["ochre"])
        wv = N("ShaderNodeTexWave")
        wv.wave_type = "BANDS"
        wv.bands_direction = "DIAGONAL"
        wv.inputs["Scale"].default_value = 420.0
        wv.inputs["Distortion"].default_value = 0.0
        L(tc.outputs["Object"], wv.inputs["Vector"])
        bump = N("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.6
        bump.inputs["Distance"].default_value = 0.0008
        L(wv.outputs["Fac"], bump.inputs["Height"])
        L(bump.outputs["Normal"], bsdf.inputs["Normal"])
        _silk(nt, bsdf, rough=0.50, sheen=0.30, spec=0.40)

    elif kind == "mannequin":
        bsdf.inputs["Base Color"].default_value = _col(color, PAL["mannequin"])
        bump, _ = _grain(nt, tc.outputs["Object"], 900.0, 0.35, 0.0006)
        L(bump.outputs["Normal"], bsdf.inputs["Normal"])
        bsdf.inputs["Roughness"].default_value = 0.85
        bsdf.inputs["Specular IOR Level"].default_value = 0.15
        bsdf.inputs["Sheen Weight"].default_value = 0.15

    elif kind == "dais":
        bsdf.inputs["Base Color"].default_value = _col(color, PAL["dais"])
        bump, _ = _grain(nt, tc.outputs["Object"], 500.0, 0.25, 0.0008)
        L(bump.outputs["Normal"], bsdf.inputs["Normal"])
        bsdf.inputs["Roughness"].default_value = 0.88
        bsdf.inputs["Specular IOR Level"].default_value = 0.12
        bsdf.inputs["Sheen Weight"].default_value = 0.10

    elif kind == "room":
        bsdf.inputs["Base Color"].default_value = _col(color, "#3a3632")
        bsdf.inputs["Roughness"].default_value = 0.92
        bsdf.inputs["Specular IOR Level"].default_value = 0.08

    elif kind == "floor":
        bsdf.inputs["Base Color"].default_value = _col(color, "#2b2724")
        nz = N("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 1.6
        nz.inputs["Detail"].default_value = 4.0
        L(tc.outputs["Object"], nz.inputs["Vector"])
        rr = N("ShaderNodeMapRange")
        rr.inputs["To Min"].default_value = 0.30
        rr.inputs["To Max"].default_value = 0.46
        L(nz.outputs["Fac"], rr.inputs["Value"])
        L(rr.outputs["Result"], bsdf.inputs["Roughness"])
        bsdf.inputs["Specular IOR Level"].default_value = 0.35

    elif kind == "lacquer":
        bsdf.inputs["Base Color"].default_value = _col(color, PAL["lacquer"])
        bsdf.inputs["Roughness"].default_value = 0.22
        bsdf.inputs["Specular IOR Level"].default_value = 0.5
        bsdf.inputs["Coat Weight"].default_value = 0.6
        bsdf.inputs["Coat Roughness"].default_value = 0.08

    elif kind in ("chalk", "thread"):
        # thin drawn lines: self-lit so they stay legible in the dim room; 'strength' value node animates
        col = _col(color, "#f6f2e8" if kind == "chalk" else "#f3ead6")
        val = N("ShaderNodeValue")
        val.name = val.label = "strength"
        val.outputs[0].default_value = 1.0
        bsdf.inputs["Base Color"].default_value = col
        bsdf.inputs["Emission Color"].default_value = col
        L(val.outputs[0], bsdf.inputs["Emission Strength"])
        bsdf.inputs["Roughness"].default_value = 0.9
    else:
        raise ValueError("unknown material kind %r" % kind)
    return mat


# --------------------------------------------------------------------------- hall materials (v3)
#
# hall_material(kind, name=None) -> bpy material for the shoin hall and the weaving room.
#   Photo-scanned CC0 maps from build/assets (see three_d/CREDITS.md); every kind falls back to a
#   procedural version when its files are missing, so nothing breaks on a fresh checkout.
#   kind: 'tatami'   UV: u along the mat (0..1 = 1.82 m), v across (0..0.5 = one 0.91 m mat); optional
#                    colour attribute 'tone' multiplies the colour per mat
#         'hinoki'   pale structural wood. UV in METRES, grain along U ('hinoki_wall': the same, strictly
#                    periodic with the 1.82 m bay, for the display wall)
#         'board'    pale ceiling / panel boards. UV in metres, grain along U
#         'planks'   darker cedar floor boards. UV in metres, boards along U
#         'plaster'  warm white lime plaster. UV in metres
#         'washi'    shoji paper lit from behind: glows for the camera only (value node 'strength');
#                    the room is lit by area lights that scene.py puts in front of the paper
#         'gold'     gold leaf with visible leaf squares. Needs a UV map called 'leaf' in metres
#         'gilt'     gilt metal fittings        'felt'  dark red wool felt
#         'lacquer'  black lacquer with fine scratches

ASSET_DIR = os.path.join(ROOT, "build", "assets")


def asset_map(aid, kind, res="2k"):
    """Path of a downloaded Poly Haven map (kind: diff, rough, nor_gl, ao, disp), or None."""
    p = os.path.join(ASSET_DIR, aid, "%s_%s_%s.jpg" % (aid, kind, res))
    return p if os.path.exists(p) else None


def hdri_path(aid="ninomaru_teien", res="2k"):
    p = os.path.join(ASSET_DIR, aid, "%s_%s.hdr" % (aid, res))
    return p if os.path.exists(p) else None


_MEAN = {}


def _mean_linear(path):
    """Mean linear RGB of an sRGB image (for tinting scans towards a target colour)."""
    if path not in _MEAN:
        from PIL import Image
        im = Image.open(path).convert("RGB").resize((32, 32))
        px = list(im.getdata())
        _MEAN[path] = tuple(sum(_srgb_to_lin(p[i] / 255.0) for p in px) / len(px) for i in range(3))
    return _MEAN[path]


def _math(nt, op, a, b=None, c=None, clamp=False):
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = op
    n.use_clamp = clamp
    for i, v in enumerate((a, b, c)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = float(v)
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


def _mixc(nt, fac, a, b, blend="MIX"):
    n = nt.nodes.new("ShaderNodeMix")
    n.data_type = "RGBA"
    n.blend_type = blend
    n.clamp_result = False
    for sock, v in ((n.inputs[0], fac), (n.inputs[6], a), (n.inputs[7], b)):
        if isinstance(v, (int, float)):
            sock.default_value = float(v)
        elif isinstance(v, (tuple, list)):
            sock.default_value = tuple(v)[:3] + (1.0,)
        else:
            nt.links.new(v, sock)
    return n.outputs[2]


def _scan(nt, aid, vec, target=None, flat=0.0, rough=(None, None), normal=1.0):
    """Image nodes for a scanned material. Returns (colour, roughness, normal) sockets or None.
    target: linear RGB the scan's mean colour is tinted to; flat: 0..1 mix towards that flat colour;
    rough: (lo, hi) remap of the roughness map."""
    pd, pr, pn = asset_map(aid, "diff"), asset_map(aid, "rough"), asset_map(aid, "nor_gl")
    if not (pd and pr and pn):
        return None
    N, L = nt.nodes.new, nt.links.new

    def img(path, cs):
        t = N("ShaderNodeTexImage")
        t.image = _load_image(path, cs)
        t.interpolation = "Cubic" if cs == "sRGB" else "Linear"
        L(vec, t.inputs["Vector"])
        return t
    col = img(pd, "sRGB").outputs["Color"]
    if target is not None:
        mean = _mean_linear(pd)
        gain = tuple(target[i] / max(mean[i], 1e-3) for i in range(3))
        col = _mixc(nt, 1.0, col, gain, "MULTIPLY")
        if flat > 0:
            col = _mixc(nt, flat, col, target)
    rgh = img(pr, "Non-Color").outputs["Color"]
    if rough[0] is not None:
        mr = N("ShaderNodeMapRange")
        mr.inputs["To Min"].default_value = rough[0]
        mr.inputs["To Max"].default_value = rough[1]
        L(rgh, mr.inputs["Value"])
        rgh = mr.outputs["Result"]
    nm = N("ShaderNodeNormalMap")
    nm.inputs["Strength"].default_value = normal
    L(img(pn, "Non-Color").outputs["Color"], nm.inputs["Color"])
    return col, rgh, nm.outputs["Normal"]


def _island_uv(nt, scale, jitter=(7.31, 3.17)):
    """UV (metres) * scale, shifted by a random amount per mesh island so no two members match."""
    N, L = nt.nodes.new, nt.links.new
    tc = N("ShaderNodeTexCoord")
    geo = N("ShaderNodeNewGeometry")
    cmb = N("ShaderNodeCombineXYZ")
    L(_math(nt, "MULTIPLY", geo.outputs["Random Per Island"], jitter[0]), cmb.inputs[0])
    L(_math(nt, "MULTIPLY", geo.outputs["Random Per Island"], jitter[1]), cmb.inputs[1])
    add = N("ShaderNodeVectorMath")
    add.operation = "ADD"
    L(tc.outputs["UV"], add.inputs[0])
    L(cmb.outputs[0], add.inputs[1])
    mp = N("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale[0], scale[1], 1.0)
    L(add.outputs[0], mp.inputs["Vector"])
    return mp.outputs["Vector"], geo


def _noise(nt, vec, scale, detail=3.0, rough=0.55, lo=0.0, hi=1.0, f0=0.0, f1=1.0):
    """Noise of `vec` mapped from f0..f1 to lo..hi (clamped): the slow unevenness of age."""
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = scale
    nz.inputs["Detail"].default_value = detail
    nz.inputs["Roughness"].default_value = rough
    nt.links.new(vec, nz.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = f0
    mr.inputs["From Max"].default_value = f1
    mr.inputs["To Min"].default_value = lo
    mr.inputs["To Max"].default_value = hi
    nt.links.new(nz.outputs["Fac"], mr.inputs["Value"])
    return mr.outputs["Result"]


def _band(nt, v, a0, a1, b0, b1):
    """1 inside a1..b0, falling smoothly to 0 at a0 and b1."""
    def ss(lo, hi, t0, t1):
        mr = nt.nodes.new("ShaderNodeMapRange")
        mr.interpolation_type = "SMOOTHSTEP"
        mr.inputs["From Min"].default_value = lo
        mr.inputs["From Max"].default_value = hi
        mr.inputs["To Min"].default_value = t0
        mr.inputs["To Max"].default_value = t1
        nt.links.new(v, mr.inputs["Value"])
        return mr.outputs["Result"]
    return _math(nt, "MULTIPLY", ss(a0, a1, 0.0, 1.0), ss(b0, b1, 1.0, 0.0))


def _world_pos(nt):
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    return geo, sep


def hall_material(kind, name=None, strength=None):
    import bpy
    name = name or ("H_" + kind)
    mat = bpy.data.materials.get(name)
    if mat is not None:
        return mat
    mat = _new_mat(name)
    nt = _nodes(mat)
    N, L = nt.nodes.new, nt.links.new
    out = N("ShaderNodeOutputMaterial")
    bsdf = N("ShaderNodeBsdfPrincipled")
    L(bsdf.outputs["BSDF"], out.inputs["Surface"])
    tc = N("ShaderNodeTexCoord")

    if kind == "tatami":
        sep = N("ShaderNodeSeparateXYZ")
        L(tc.outputs["UV"], sep.inputs[0])
        sc = _scan(nt, "tatami_mat", tc.outputs["UV"], rough=(0.38, 0.80), normal=1.0)
        if sc:
            col, rgh, nrm = sc
            hs = N("ShaderNodeHueSaturation")          # the scan is a little dark and olive for a bright hall
            hs.inputs["Saturation"].default_value = 0.92
            hs.inputs["Value"].default_value = 1.45
            L(col, hs.inputs["Color"])
            col = hs.outputs["Color"]
            L(rgh, bsdf.inputs["Roughness"])
            L(nrm, bsdf.inputs["Normal"])
        else:
            wv = N("ShaderNodeTexWave")
            wv.inputs["Scale"].default_value = 900.0
            L(tc.outputs["UV"], wv.inputs["Vector"])
            col = _mixc(nt, wv.outputs["Fac"], hex_rgb("#b9ad7c"), hex_rgb("#cdc291"))
            bsdf.inputs["Roughness"].default_value = 0.6
        attr = N("ShaderNodeAttribute")
        attr.attribute_name = "tone"
        col = _mixc(nt, 1.0, col, attr.outputs["Color"], "MULTIPLY")
        # cloth borders (heri) along the long edges: keep the scanned brocade, make it dark
        t = _math(nt, "FRACT", _math(nt, "MULTIPLY_ADD", sep.outputs["Y"], 2.0, 0.5))
        geo, wp = _world_pos(nt)
        P = geo.outputs["Position"]
        # the rush itself: slow drift of tone (sun, feet, years)
        col = _mixc(nt, 1.0, col, _noise(nt, P, 0.55, 4.0, 0.6, 0.90, 1.07), "MULTIPLY")
        # the cloth edge is not ruler-straight: its line wanders and frays by a millimetre or two
        fray = _math(nt, "ADD", _noise(nt, P, 9.0, 2.0, 0.5, -0.0016, 0.0016),
                     _noise(nt, P, 260.0, 1.0, 0.5, -0.0011, 0.0011))
        heri = _math(nt, "LESS_THAN", _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", t, 0.5)),
                     _math(nt, "ADD", fray, 0.0355))
        hd = N("ShaderNodeHueSaturation")
        hd.inputs["Saturation"].default_value = 0.35
        L(_noise(nt, P, 1.7, 4.0, 0.65, 0.13, 0.27), hd.inputs["Value"])       # darkened and faded in places
        L(col, hd.inputs["Color"])
        worn = _noise(nt, P, 3.1, 5.0, 0.7, 0.0, 0.45, 0.62, 0.80)              # where the cloth has rubbed thin
        col = _mixc(nt, heri, col, _mixc(nt, worn, hd.outputs["Color"], (0.20, 0.155, 0.10)))
        # hairline shadow where two mats meet end to end
        tu = _math(nt, "FRACT", _math(nt, "ADD", sep.outputs["X"], 0.5))
        seam = _math(nt, "LESS_THAN", _math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", tu, 0.5)), 0.0010)
        col = _mixc(nt, _math(nt, "MULTIPLY", seam, 0.6), col, (0.02, 0.018, 0.012))
        L(col, bsdf.inputs["Base Color"])
        bsdf.inputs["Specular IOR Level"].default_value = 0.45

    elif kind in ("hinoki", "hinoki_wall", "board", "planks", "planks_out"):
        # 'hinoki_wall' is the same wood made strictly periodic with the 1.82 m bay (no per-member
        # variation, texture period 0.91 m along the grain): for the display wall
        aid, target, scale, rr, flat = {
            "hinoki": ("ash_veneer", (0.485, 0.335, 0.19), (0.9, 1.6), (0.36, 0.62), 0.0),
            "hinoki_wall": ("ash_veneer", (0.485, 0.335, 0.19), (1.0 / 0.91, 3.0 / 1.82), (0.36, 0.62), 0.0),
            "board": ("okoume_veneer", (0.43, 0.285, 0.15), (0.55, 0.9), (0.42, 0.68), 0.0),
            "planks": ("japanese_cedar_planks", (0.30, 0.165, 0.07), (0.5, 0.5), (0.30, 0.60), 0.0),
            "planks_out": ("japanese_cedar_planks", (0.105, 0.075, 0.05), (0.5, 0.5), (0.45, 0.80), 0.25)}[kind]
        vec, geo = _island_uv(nt, scale, jitter=(0.0, 0.0) if kind == "hinoki_wall" else (7.31, 3.17))
        sc = _scan(nt, aid, vec, target=target, flat=flat, rough=rr, normal=0.8)
        if sc:
            col, rgh, nrm = sc
            # every member a slightly different tone
            mr = N("ShaderNodeMapRange")
            mr.inputs["To Min"].default_value = 0.99 if kind == "hinoki_wall" else 0.80
            mr.inputs["To Max"].default_value = 0.99 if kind == "hinoki_wall" else 1.10
            L(geo.outputs["Random Per Island"], mr.inputs["Value"])
            col = _mixc(nt, 1.0, col, mr.outputs["Result"], "MULTIPLY")
            if kind in ("hinoki", "hinoki_wall"):
                # age: slow blotches everywhere; darker and smoother where hands reach (posts, door
                # stiles, about 0.7-1.5 m) and near the floor, where it is wiped
                g2, wp = _world_pos(nt)
                P = g2.outputs["Position"]
                hand = _math(nt, "MULTIPLY", _band(nt, wp.outputs["Z"], 0.55, 0.95, 1.30, 1.70),
                             _noise(nt, P, 5.0, 3.0, 0.6, 0.35, 1.0))
                foot = _band(nt, wp.outputs["Z"], -1.0, -0.5, 0.05, 0.40)
                dark = _math(nt, "ADD", _math(nt, "MULTIPLY", hand, 0.20), _math(nt, "MULTIPLY", foot, 0.12))
                dark = _math(nt, "ADD", dark, _noise(nt, P, 1.3, 4.0, 0.6, 0.0, 0.10))
                col = _mixc(nt, dark, col, _mixc(nt, 1.0, col, (0.42, 0.30, 0.20), "MULTIPLY"))
                rgh = _math(nt, "SUBTRACT", rgh, _math(nt, "MULTIPLY", hand, 0.10))
            elif kind in ("planks", "planks_out"):
                g2, wp = _world_pos(nt)
                col = _mixc(nt, 1.0, col, _noise(nt, g2.outputs["Position"], 0.8, 4.0, 0.6, 0.80, 1.10), "MULTIPLY")
            L(col, bsdf.inputs["Base Color"])
            L(rgh, bsdf.inputs["Roughness"])
            L(nrm, bsdf.inputs["Normal"])
        else:
            bsdf.inputs["Base Color"].default_value = tuple(target) + (1.0,)
            bump, nz = _grain(nt, vec, 60.0, 0.3, 0.0006, squash=(1.0, 40.0, 1.0))
            L(bump.outputs["Normal"], bsdf.inputs["Normal"])
            bsdf.inputs["Roughness"].default_value = 0.5
        bsdf.inputs["Specular IOR Level"].default_value = 0.4

    elif kind == "plaster":
        mp = N("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (1.0 / 1.82, 1.0 / 1.82, 1.0)     # one tile per ken: every bay alike
        L(tc.outputs["UV"], mp.inputs["Vector"])
        sc = _scan(nt, "white_plaster_02", mp.outputs["Vector"], target=(0.78, 0.75, 0.69), flat=0.72,
                   rough=(0.72, 0.95), normal=0.45)
        if sc:
            col, rgh, nrm = sc
            # a hand-trowelled wall: slow clouds of tone, a little darker towards the timber it meets
            g2, wp = _world_pos(nt)
            P = g2.outputs["Position"]
            col = _mixc(nt, 1.0, col, _noise(nt, P, 0.9, 5.0, 0.62, 0.90, 1.05), "MULTIPLY")
            col = _mixc(nt, _noise(nt, P, 2.6, 4.0, 0.7, 0.0, 0.22, 0.58, 0.82), col, (0.60, 0.555, 0.48))
            L(col, bsdf.inputs["Base Color"])
            L(rgh, bsdf.inputs["Roughness"])
            L(nrm, bsdf.inputs["Normal"])
        else:
            bsdf.inputs["Base Color"].default_value = (0.74, 0.715, 0.66, 1.0)
            bump, _ = _grain(nt, tc.outputs["UV"], 40.0, 0.2, 0.0008)
            L(bump.outputs["Normal"], bsdf.inputs["Normal"])
            bsdf.inputs["Roughness"].default_value = 0.9
        bsdf.inputs["Specular IOR Level"].default_value = 0.25

    elif kind == "washi":
        val = N("ShaderNodeValue")
        val.name = val.label = "strength"
        val.outputs[0].default_value = 4.0 if strength is None else strength
        eave = N("ShaderNodeValue")                 # world height of the eave's shadow line on the paper;
        eave.name = eave.label = "eave_z"           # the default (very high) means "all in the sun"
        eave.outputs[0].default_value = 1000.0
        shade = N("ShaderNodeValue")                # brightness of paper in shadow, relative to sunlit
        shade.name = shade.label = "shade"
        shade.outputs[0].default_value = 0.30
        sp = N("ShaderNodeSeparateXYZ")
        L(tc.outputs["Object"], sp.inputs[0])

        def sstep(v, lo, hi, a=0.0, b=1.0):
            mr = N("ShaderNodeMapRange")
            mr.interpolation_type = "SMOOTHSTEP"
            mr.inputs["From Min"].default_value = lo
            mr.inputs["From Max"].default_value = hi
            mr.inputs["To Min"].default_value = a
            mr.inputs["To Max"].default_value = b
            L(v, mr.inputs["Value"])
            return mr.outputs["Result"]
        # the eave's shadow: sunlit below the line, shade above it
        s_eave = sstep(_math(nt, "SUBTRACT", sp.outputs["Z"], eave.outputs[0]), -0.035, 0.035, 1.0, 0.0)
        # shadows of the veranda posts: one soft upright band per ken
        tp = _math(nt, "FRACT", _math(nt, "MULTIPLY_ADD", sp.outputs["Y"], 1.0 / 1.82, 0.31))
        s_post = sstep(_math(nt, "ABSOLUTE", _math(nt, "SUBTRACT", tp, 0.5)), 0.028, 0.046)
        # leaves outside: soft dapples
        nz = N("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 1.9
        nz.inputs["Detail"].default_value = 3.0
        nz.inputs["Roughness"].default_value = 0.55
        L(tc.outputs["Object"], nz.inputs["Vector"])
        s_leaf = sstep(nz.outputs["Fac"], 0.40, 0.58, 0.45, 1.0)
        sun = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", s_eave, s_post), s_leaf)
        lvl = _math(nt, "ADD", shade.outputs[0],
                    _math(nt, "MULTIPLY", sun, _math(nt, "SUBTRACT", 1.0, shade.outputs[0])))
        # paper fibres: faint long streaks
        mpf = N("ShaderNodeMapping")
        mpf.inputs["Scale"].default_value = (1.0, 6.0, 40.0)
        L(tc.outputs["Object"], mpf.inputs["Vector"])
        nf = N("ShaderNodeTexNoise")
        nf.inputs["Scale"].default_value = 22.0
        nf.inputs["Detail"].default_value = 3.0
        L(mpf.outputs["Vector"], nf.inputs["Vector"])
        m3 = N("ShaderNodeMapRange")
        m3.inputs["To Min"].default_value = 0.92
        m3.inputs["To Max"].default_value = 1.06
        L(nf.outputs["Fac"], m3.inputs["Value"])
        e = _math(nt, "MULTIPLY", lvl, _math(nt, "MULTIPLY", m3.outputs["Result"], val.outputs[0]))
        # The camera sees the paper at an exposure where its tone still reads; the light it gives the
        # room comes from area lights of the same shape just in front of it (clean at low samples).
        lp = N("ShaderNodeLightPath")
        e = _math(nt, "MULTIPLY", e, lp.outputs["Is Camera Ray"])
        bsdf.inputs["Base Color"].default_value = (0.80, 0.77, 0.70, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.85
        bsdf.inputs["Specular IOR Level"].default_value = 0.15
        L(_mixc(nt, sun, (0.80, 0.90, 1.0), (1.0, 0.90, 0.74)), bsdf.inputs["Emission Color"])
        L(e, bsdf.inputs["Emission Strength"])

    elif kind == "gold":
        uvn = N("ShaderNodeUVMap")
        uvn.uv_map = "leaf"
        leaf = 0.109                                           # one leaf is about 10.9 cm square
        mp = N("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (1.0 / leaf, 1.0 / leaf, 1.0)
        L(uvn.outputs["UV"], mp.inputs["Vector"])
        fl = N("ShaderNodeVectorMath")
        fl.operation = "FLOOR"
        L(mp.outputs["Vector"], fl.inputs[0])
        fr = N("ShaderNodeVectorMath")
        fr.operation = "FRACTION"
        L(mp.outputs["Vector"], fr.inputs[0])
        wn = N("ShaderNodeTexWhiteNoise")
        wn.noise_dimensions = "2D"
        L(fl.outputs["Vector"], wn.inputs["Vector"])
        rnd = N("ShaderNodeSeparateColor")
        L(wn.outputs["Color"], rnd.inputs["Color"])
        fxy = N("ShaderNodeSeparateXYZ")
        L(fr.outputs["Vector"], fxy.inputs[0])
        # each leaf lies at its own tiny tilt, so reflections break at the leaf edges
        hx = _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", fxy.outputs["X"], 0.5),
                   _math(nt, "SUBTRACT", rnd.outputs["Red"], 0.5))
        hy = _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", fxy.outputs["Y"], 0.5),
                   _math(nt, "SUBTRACT", rnd.outputs["Green"], 0.5))
        hgt = _math(nt, "MULTIPLY", _math(nt, "ADD", hx, hy), 0.0011)
        nzw = N("ShaderNodeTexNoise")
        nzw.inputs["Scale"].default_value = 160.0
        nzw.inputs["Detail"].default_value = 2.0
        L(uvn.outputs["UV"], nzw.inputs["Vector"])
        hgt = _math(nt, "ADD", hgt, _math(nt, "MULTIPLY", nzw.outputs["Fac"], 0.00006))
        bp = N("ShaderNodeBump")
        bp.inputs["Strength"].default_value = 1.0
        bp.inputs["Distance"].default_value = 1.0
        L(hgt, bp.inputs["Height"])
        L(bp.outputs["Normal"], bsdf.inputs["Normal"])
        # leaf overlaps: thin lines where two leaves double up
        ex = _math(nt, "MINIMUM", fxy.outputs["X"], _math(nt, "SUBTRACT", 1.0, fxy.outputs["X"]))
        ey = _math(nt, "MINIMUM", fxy.outputs["Y"], _math(nt, "SUBTRACT", 1.0, fxy.outputs["Y"]))
        edge = _math(nt, "LESS_THAN", _math(nt, "MINIMUM", ex, ey), 0.016)
        # slow wear: the warm bole shows through a little
        nw = N("ShaderNodeTexNoise")
        nw.inputs["Scale"].default_value = 3.0
        nw.inputs["Detail"].default_value = 5.0
        nw.inputs["Roughness"].default_value = 0.6
        L(uvn.outputs["UV"], nw.inputs["Vector"])
        wear = N("ShaderNodeMapRange")
        wear.inputs["From Min"].default_value = 0.56
        wear.inputs["From Max"].default_value = 0.84
        wear.inputs["To Min"].default_value = 0.0
        wear.inputs["To Max"].default_value = 0.20
        L(nw.outputs["Fac"], wear.inputs["Value"])
        tone = N("ShaderNodeMapRange")
        tone.inputs["To Min"].default_value = 0.93
        tone.inputs["To Max"].default_value = 1.0
        L(rnd.outputs["Blue"], tone.inputs["Value"])
        col = _mixc(nt, 1.0, (0.73, 0.405, 0.088), tone.outputs["Result"], "MULTIPLY")   # deep, warm leaf: stays gold when lit
        col = _mixc(nt, _math(nt, "MULTIPLY", edge, 0.34), col, (0.56, 0.30, 0.075))
        # age: slow tarnished clouds, a duller band where hands and sleeves have brushed past
        g2, wp = _world_pos(nt)
        P = g2.outputs["Position"]
        tarn = _noise(nt, P, 1.15, 5.0, 0.62, 0.0, 1.0, 0.40, 0.72)
        hand = _math(nt, "MULTIPLY", _band(nt, wp.outputs["Z"], 0.45, 0.72, 0.92, 1.25),
                     _noise(nt, P, 3.0, 3.0, 0.6, 0.2, 1.0))
        age = _math(nt, "ADD", _math(nt, "MULTIPLY", tarn, 0.38), _math(nt, "MULTIPLY", hand, 0.22), clamp=True)
        col = _mixc(nt, age, col, (0.47, 0.245, 0.060))
        col = _mixc(nt, wear.outputs["Result"], col, (0.30, 0.13, 0.05))
        L(col, bsdf.inputs["Base Color"])
        L(_math(nt, "SUBTRACT", 1.0, _math(nt, "MULTIPLY", wear.outputs["Result"], 0.6)), bsdf.inputs["Metallic"])
        rg = _math(nt, "ADD", _math(nt, "MULTIPLY_ADD", rnd.outputs["Red"], 0.07, 0.47),
                   _math(nt, "ADD", _math(nt, "MULTIPLY", edge, 0.05), wear.outputs["Result"]))
        L(_math(nt, "ADD", rg, _math(nt, "MULTIPLY", age, 0.14)), bsdf.inputs["Roughness"])

    elif kind == "gilt":
        L(_mixc(nt, _noise(nt, tc.outputs["Object"], 35.0, 3.0, 0.6, 0.0, 0.7, 0.45, 0.75), (0.86, 0.56, 0.19),
                (0.33, 0.19, 0.075)), bsdf.inputs["Base Color"])
        bsdf.inputs["Metallic"].default_value = 1.0
        nz = N("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 90.0
        L(tc.outputs["Object"], nz.inputs["Vector"])
        mr = N("ShaderNodeMapRange")
        mr.inputs["To Min"].default_value = 0.34
        mr.inputs["To Max"].default_value = 0.56
        L(nz.outputs["Fac"], mr.inputs["Value"])
        L(mr.outputs["Result"], bsdf.inputs["Roughness"])

    elif kind == "felt":
        base = hex_rgb(PAL.get("felt", "#84201d"))
        nz = N("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 9.0
        nz.inputs["Detail"].default_value = 6.0
        nz.inputs["Roughness"].default_value = 0.7
        L(tc.outputs["Object"], nz.inputs["Vector"])
        mr = N("ShaderNodeMapRange")
        mr.inputs["To Min"].default_value = 0.86
        mr.inputs["To Max"].default_value = 1.12
        L(nz.outputs["Fac"], mr.inputs["Value"])
        L(_mixc(nt, 1.0, base, mr.outputs["Result"], "MULTIPLY"), bsdf.inputs["Base Color"])
        bump, _ = _grain(nt, tc.outputs["Object"], 2200.0, 0.55, 0.0009)
        bump2, _ = _grain(nt, tc.outputs["Object"], 5.0, 0.6, 0.012)
        L(bump.outputs["Normal"], bump2.inputs["Normal"])
        L(bump2.outputs["Normal"], bsdf.inputs["Normal"])
        bsdf.inputs["Roughness"].default_value = 0.95
        bsdf.inputs["Specular IOR Level"].default_value = 0.12
        bsdf.inputs["Sheen Weight"].default_value = 0.22
        bsdf.inputs["Sheen Roughness"].default_value = 0.6
        bsdf.inputs["Sheen Tint"].default_value = (1.0, 0.45, 0.35, 1.0)

    elif kind == "lacquer":
        bsdf.inputs["Base Color"].default_value = hex_rgb("#0b0808", 1.0)
        # fine wiping scratches in the top coat
        mp = N("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (6.0, 900.0, 900.0)
        L(tc.outputs["Object"], mp.inputs["Vector"])
        nz = N("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 3.0
        nz.inputs["Detail"].default_value = 3.0
        L(mp.outputs["Vector"], nz.inputs["Vector"])
        mr = N("ShaderNodeMapRange")
        mr.inputs["To Min"].default_value = 0.06
        mr.inputs["To Max"].default_value = 0.20
        L(nz.outputs["Fac"], mr.inputs["Value"])
        bsdf.inputs["Specular IOR Level"].default_value = 0.5
        g2, wp = _world_pos(nt)
        P = g2.outputs["Position"]
        bev = N("ShaderNodeBevel")
        bev.samples = 4
        bev.inputs["Radius"].default_value = 0.006
        dot = N("ShaderNodeVectorMath")
        dot.operation = "DOT_PRODUCT"
        L(bev.outputs["Normal"], dot.inputs[0])
        L(g2.outputs["True Normal"], dot.inputs[1])
        em = N("ShaderNodeMapRange")                 # 1 on an edge, 0 on the flat
        em.inputs["From Min"].default_value = 0.995
        em.inputs["From Max"].default_value = 0.90
        L(dot.outputs["Value"], em.inputs["Value"])
        edge = _math(nt, "MULTIPLY", em.outputs["Result"], _noise(nt, P, 55.0, 3.0, 0.65, 0.0, 1.0, 0.38, 0.62))
        nsep = N("ShaderNodeSeparateXYZ")
        L(g2.outputs["True Normal"], nsep.inputs[0])
        dust = _math(nt, "MULTIPLY", _band(nt, nsep.outputs["Z"], 0.6, 0.9, 2.0, 3.0),
                     _noise(nt, P, 7.0, 4.0, 0.6, 0.05, 0.30))
        colr = _mixc(nt, _math(nt, "MULTIPLY", edge, 0.75), hex_rgb("#0b0808"), (0.115, 0.036, 0.018))   # the red-brown ground coat
        colr = _mixc(nt, dust, colr, (0.23, 0.21, 0.185))
        L(colr, bsdf.inputs["Base Color"])
        L(_math(nt, "ADD", 0.30, _math(nt, "MULTIPLY", edge, 0.25)), bsdf.inputs["Roughness"])
        L(_math(nt, "SUBTRACT", 0.8, _math(nt, "MULTIPLY", _math(nt, "ADD", edge, dust, clamp=True), 0.7)),
          bsdf.inputs["Coat Weight"])
        L(_math(nt, "ADD", mr.outputs["Result"], _math(nt, "MULTIPLY", dust, 0.9)), bsdf.inputs["Coat Roughness"])

    elif kind in ("gravel", "rock"):
        aid, scale, target = {"gravel": ("gravel_floor_02", 1.0 / 1.6, (0.085, 0.08, 0.07)),
                              "rock": ("mossy_rock", 1.0 / 1.3, (0.075, 0.075, 0.06))}[kind]
        mp = N("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (scale, scale, scale)
        if kind == "gravel":
            L(tc.outputs["UV"], mp.inputs["Vector"])
        else:
            mp.inputs["Rotation"].default_value = (0.0, 0.0, 0.6)
            L(tc.outputs["Object"], mp.inputs["Vector"])
        sc = _scan(nt, aid, mp.outputs["Vector"], target=target, rough=(0.6, 0.95), normal=1.0)
        if sc:
            col, rgh, nrm = sc
            g2, wp = _world_pos(nt)
            col = _mixc(nt, 1.0, col, _noise(nt, g2.outputs["Position"], 0.35, 4.0, 0.6, 0.82, 1.12), "MULTIPLY")
            L(col, bsdf.inputs["Base Color"])
            L(rgh, bsdf.inputs["Roughness"])
            L(nrm, bsdf.inputs["Normal"])
        else:
            bsdf.inputs["Base Color"].default_value = tuple(target) + (1.0,)
            bsdf.inputs["Roughness"].default_value = 0.9
    else:
        raise ValueError("unknown hall material kind %r" % kind)
    return mat


# --------------------------------------------------------------------------- render setup

def setup_cycles(scene=None, res=(1920, 1080), samples=48, preview=False):
    import bpy
    sc = scene or bpy.context.scene
    r = sc.render
    r.engine = "CYCLES"
    r.resolution_x, r.resolution_y = int(res[0]), int(res[1])
    r.resolution_percentage = 100
    r.fps = DIMS["fps"]
    r.threads_mode = "AUTO"
    r.use_persistent_data = True
    r.film_transparent = False
    r.image_settings.file_format = "PNG"
    r.image_settings.color_mode = "RGB"
    r.image_settings.color_depth = "8"
    r.image_settings.compression = 20
    r.use_file_extension = True
    r.use_motion_blur = False
    c = sc.cycles
    c.device = "CPU"
    c.samples = int(samples)
    c.use_adaptive_sampling = True
    c.adaptive_threshold = 0.08 if preview else 0.02
    c.adaptive_min_samples = 8 if preview else 16
    c.use_denoising = True
    c.denoiser = "OPENIMAGEDENOISE"
    c.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    c.denoising_prefilter = "FAST" if preview else "ACCURATE"
    try:
        c.denoising_quality = "BALANCED" if preview else "HIGH"
    except Exception:
        pass
    c.max_bounces = 5
    c.diffuse_bounces = 3
    c.glossy_bounces = 3
    c.transmission_bounces = 2
    c.transparent_max_bounces = 8
    c.volume_bounces = 0
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.sample_clamp_indirect = 4.0
    c.sample_clamp_direct = 0.0
    c.blur_glossy = 1.0
    c.seed = 7
    c.use_animated_seed = False
    c.pixel_filter_type = "BLACKMAN_HARRIS"
    c.filter_width = 1.5
    c.use_light_tree = True
    sc.display_settings.display_device = "sRGB"
    sc.view_settings.view_transform = VIEW_TRANSFORM
    sc.view_settings.look = LOOK
    sc.view_settings.exposure = 0.0
    sc.view_settings.gamma = 1.0
    return sc


if __name__ == "__main__":
    print(design_image(force=True))
    print(obi_image(force=True))
