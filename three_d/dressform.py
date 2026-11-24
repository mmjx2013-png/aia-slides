"""dressform.py - the display mannequin and the dressing layers (kitsuke), stages E and F.

API (called by scene.py / render.py)
    state = build(collection, origin=(x, y, 0.0), materials=None)
    update(state, t)      t: dict of 0..1 floats: juban, kimono, ohashori, obi, obiage, obijime, knot.
                          Stateless: any combination of values gives the right picture.
    anchors(state)        dict name -> WORLD (x, y, z), read through state["root"].matrix_world:
                          form_juban_collar, form_overlap, form_ohashori, form_obi, form_obiage,
                          form_obijime, form_knot, form_nape, form_hem, form_sleeve

Everything build() creates is parented to one empty, state["root"], placed at `origin`; the figure
stands on z = 0 and FACES +Y (the wearer's left is -X). Rotate / move / re-parent the root freely.
`materials` may be a dict kind -> bpy material overriding common.fabric_material(kind) for the
kinds 'kimono', 'lining', 'juban', 'obi', 'obiage', 'obijime', 'mannequin'.

How it is made (code only, no simulation)
    The mannequin is a surface-nets mesh of a smooth signed-distance figure (head, neck, torso,
    arms 25 degrees out, mitten hands, legs, feet). A second SDF, the padded "hull", is ray-cast
    once into tables; every wrapped layer (juban, kimono, ohashori, obi, obi-age, cord) is that
    hull at its own level, so layers can never cross. A robe arrives by its two halves sweeping
    round the body from centre back (right half first, left half over it). Sleeves are a half tube
    over the arm with a two-layer bag hanging from it.

UV CONVENTION (the 'kimono' material reads the design atlas through UVs)
    body panels: common.worn_uv(c, h, c_ref) per face corner.
        c = distance round the body from centre back, negative towards the wearer's LEFT, mapped
            from arc length at hip height so that the front edge of each half is c = -/+0.87. The
            body is narrower than the flat garment, so the map is compressed: about 0.9 true scale
            at centre back and centre front, tighter at the sides (under the sleeves).
        h = metres below the shoulder ridge for everything above the ohashori fold line; below it
            h = 1.60 - (z - hem z), so the hem composition sits exactly on the hem.
    sleeves: common.garment_uv(x, y), x = +/-(0.36 + metres along the arm from the sleeve seam),
        y = +d on the front layer, -d on the back layer, d = metres of cloth from the top fold.
    collar band: common.collar_uv(a, b), a across the band, b along it.
    obi, otaiko knot and its tail: metres (u along the sash, v across), as the 'obi' material expects.
"""
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
import common  # noqa: E402

LAYERS = ("juban", "kimono", "ohashori", "obi", "obiage", "obijime", "knot")

# --------------------------------------------------------------------------- numbers (metres, local)

Z_HEM = 0.050                      # kimono hem, just above the feet
ROW_STEP = 0.012
Z_HEM_J = Z_HEM + 4 * ROW_STEP     # juban hem (hidden)
OBI_BOT, OBI_TOP = 0.945, 1.100    # 15.5 cm sash
Z_FOLD = OBI_BOT - 0.066           # lower edge of the ohashori
Z_KOSHI = OBI_BOT + 0.070          # hidden waist tie: where the fold starts from
Z_C = 1.130                        # centre of the upper ray fan (shoulders, neck)

ARM_DEG = 25.0
J = np.array([0.152, 0.0, 1.285])  # right shoulder joint (mirrored for the left)
SA, CA = math.sin(math.radians(ARM_DEG)), math.cos(math.radians(ARM_DEG))
D_ARM = np.array([SA, 0.0, -CA])   # along the arm
N_ARM = np.array([CA, 0.0, SA])    # outward/up normal of the arm in the frontal plane
L_ELBOW, L_WRIST = 0.275, 0.520
CAP_LEN, CAP_R = 0.070, 0.049      # the part of the upper arm the body panels cover

LV_J, DJ = 0.000, 0.006            # juban level, left-over-right lift
LV_K, DK = 0.014, 0.009            # kimono level, left-over-right lift
NAPE = 0.006                       # the kimono collar closes in on the nape by this much
FOLD = 0.008                       # ohashori: extra layer
THK_K, THK_J = 0.0025, 0.002
LV_OBI = LV_K + DK + FOLD + 0.003  # inner face of the obi
OBI_THK = 0.010
Z_BACK_K, Z_BACK_J = 1.384, 1.391  # collar tops at the nape

# front view: x of the wearer's LEFT half's edge as a function of z (the half covers x < edge)
KIMONO_EDGE = ((0.0, 0.095), (1.02, 0.095), (1.245, 0.0), (1.33, -0.036), (1.40, -0.050), (1.70, -0.052))
JUBAN_EDGE = ((0.0, 0.080), (1.09, 0.080), (1.28, 0.0), (1.36, -0.034), (1.41, -0.042), (1.70, -0.043))


# --------------------------------------------------------------------------- SDF primitives (numpy)

def _smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b + (a - b) * h - k * h * (1.0 - h)


def _smax(a, b, k):
    return -_smin(-a, -b, k)


def _ell(q, r):
    """Approximate distance to an origin-centred ellipsoid; q (...,3) local coordinates."""
    r = np.asarray(r, float)
    a = q / r
    k0 = np.sqrt((a * a).sum(-1))
    b = a / r
    k1 = np.sqrt((b * b).sum(-1)) + 1e-9
    return k0 * (k0 - 1.0) / k1


def _ellipsoid(p, c, r):
    return _ell(p - np.asarray(c, float), r)


def _ellcyl(p, A, B):
    x, y = p[..., 0] / A, p[..., 1] / B
    k0 = np.sqrt(x * x + y * y)
    k1 = np.sqrt((x / A) ** 2 + (y / B) ** 2) + 1e-9
    return k0 * (k0 - 1.0) / k1


def _capsule(p, a, b, ra, rb):
    a, b = np.asarray(a, float), np.asarray(b, float)
    ba = b - a
    t = np.clip(((p - a) * ba).sum(-1) / (ba @ ba), 0.0, 1.0)
    q = a + t[..., None] * ba
    return np.sqrt(((p - q) ** 2).sum(-1)) - (ra + (rb - ra) * t)


def _mirror(p):
    q = p.copy()
    q[..., 0] = np.abs(q[..., 0])
    return q


_HZ = np.array([0.00, 0.45, 0.86, 1.00, 1.16, 1.27])
_HA = np.array([0.140, 0.148, 0.155, 0.150, 0.148, 0.146])
_HB = np.array([0.112, 0.118, 0.122, 0.118, 0.116, 0.112])


def tube_sdf(p):
    """The padded body below the arms: a long, slightly tapering tube."""
    z = p[..., 2]
    return _ellcyl(p, np.interp(z, _HZ, _HA), np.interp(z, _HZ, _HB))


def hull_sdf(p):
    """The padded, dressed body (level 0 = the juban). Symmetric in x; arms only as shoulder caps."""
    z = p[..., 2]
    q = _mirror(p)
    d = _smax(tube_sdf(p), z - 1.26, 0.08)
    d = _smin(d, _ellipsoid(p, (0, -0.004, 1.285), (0.184, 0.106, 0.088)), 0.06)
    d = _smin(d, _ellipsoid(q, J, (CAP_R, CAP_R, CAP_R)), 0.05)
    d = _smin(d, _capsule(q, J, J + CAP_LEN * D_ARM, CAP_R, CAP_R), 0.035)
    d = _smin(d, _capsule(p, (0, -0.012, 1.20), (0, 0.012, 1.62), 0.051, 0.051), 0.045)
    return d


_MZ = np.array([0.72, 0.84, 0.94, 1.04, 1.13, 1.22, 1.30])
_MA = np.array([0.122, 0.142, 0.138, 0.116, 0.126, 0.138, 0.136])
_MB = np.array([0.090, 0.102, 0.098, 0.086, 0.094, 0.100, 0.094])


def mannequin_sdf(p):
    """An abstract display figure: no face, no fingers."""
    z = p[..., 2]
    q = _mirror(p)
    d = _smax(_ellcyl(p, np.interp(z, _MZ, _MA), np.interp(z, _MZ, _MB)), z - 1.27, 0.07)
    d = _smax(d, 0.745 - z, 0.06)
    d = _smin(d, _ellipsoid(p, (0, -0.004, 1.283), (0.176, 0.094, 0.080)), 0.05)
    # shoulders, arms, mitten hands
    elbow, wrist = J + L_ELBOW * D_ARM, J + L_WRIST * D_ARM
    d = _smin(d, _ellipsoid(q, J, (0.043, 0.043, 0.043)), 0.04)
    d = _smin(d, _capsule(q, J, elbow, 0.039, 0.032), 0.03)
    d = _smin(d, _capsule(q, elbow, wrist, 0.032, 0.024), 0.02)
    rel = q - (J + (L_WRIST + 0.082) * D_ARM)
    loc = np.stack([(rel * D_ARM).sum(-1), (rel * N_ARM).sum(-1), rel[..., 1]], -1)
    d = _smin(d, _ell(loc, (0.094, 0.017, 0.038)), 0.022)
    # legs and feet
    hip, knee, ank = (0.076, 0.0, 0.84), (0.072, 0.006, 0.47), (0.068, -0.012, 0.085)
    d = _smin(d, _capsule(q, hip, knee, 0.073, 0.050), 0.04)
    d = _smin(d, _capsule(q, knee, ank, 0.049, 0.033), 0.03)
    d = _smin(d, _ellipsoid(q, (0.071, -0.016, 0.335), (0.047, 0.052, 0.125)), 0.03)
    foot = _smax(_ellipsoid(q, (0.068, 0.040, 0.028), (0.040, 0.100, 0.036)), -z, 0.006)
    d = _smin(d, foot, 0.022)
    # neck and an egg for a head
    d = _smin(d, _capsule(p, (0, -0.006, 1.30), (0, 0.006, 1.52), 0.047, 0.044), 0.03)
    d = _smin(d, _ellipsoid(p, (0, 0.012, 1.560), (0.070, 0.086, 0.105)), 0.022)
    return d


def _grad(f, p, e=1e-3):
    g = np.empty_like(p)
    for i in range(3):
        dp = np.zeros(3)
        dp[i] = e
        g[..., i] = (f(p + dp) - f(p - dp)) / (2 * e)
    return g


def _unit(v):
    return v / (np.linalg.norm(v, axis=-1, keepdims=True) + 1e-12)


def _bisect(f, o, d, lo, hi, iso=0.0, it=18):
    lo = np.broadcast_to(lo, o.shape[:-1]).astype(float).copy()
    hi = np.broadcast_to(hi, o.shape[:-1]).astype(float).copy()
    for _ in range(it):
        m = 0.5 * (lo + hi)
        out = f(o + m[..., None] * d) > iso
        hi = np.where(out, m, hi)
        lo = np.where(out, lo, m)
    return 0.5 * (lo + hi)


def _first_hit(f, o, d, hi=0.48, step=0.006):
    """Distance of the FIRST crossing of f = 0 along rays o + s d (o inside)."""
    s = np.arange(0.0, hi + step, step)
    F = f(o[..., None, :] + s[:, None] * d[..., None, :]) > 0.0
    k = np.where(F.any(-1), F.argmax(-1), len(s) - 1)
    k = np.maximum(k, 1)
    return _bisect(f, o, d, s[k - 1], s[k], 0.0, 14)


def _project(p, iso, f=hull_sdf, it=2):
    for _ in range(it):
        g = _grad(f, p)
        gg = (g * g).sum(-1, keepdims=True) + 1e-9
        p = p - ((f(p) - iso)[..., None]) * g / gg
    return p


def _ss(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


def _ramp(t, a, b):
    return float(_ss((t - a) / (b - a)))


# --------------------------------------------------------------------------- the hull, tabulated

class _Hull:
    """Ray-cast tables of the hull. Rows 0..n0-1 are horizontal rings (tube only, z = self.z);
    rows n0.. are a fan of elevation self.phi from (0, 0, Z_C) over the shoulders to the neck.
    Azimuth psi runs from centre back (0) round one side (sx) to the front (pi) and beyond."""
    LEVELS = np.array([0.0, 0.025, 0.060])

    def __init__(self):
        self.z = np.r_[np.arange(Z_HEM, 0.842, ROW_STEP), np.arange(0.850, 1.0201, 0.005),
                       np.arange(1.030, Z_C - 0.004, 0.010)]
        self.n0 = len(self.z)
        psd = np.radians(np.arange(0.0, 181.0))

        def fan_od(phi, psi):
            phi, psi = np.broadcast_arrays(phi, psi)
            d = np.stack([np.sin(psi) * np.cos(phi), -np.cos(psi) * np.cos(phi), np.sin(phi)], -1)
            o = np.zeros_like(d)
            o[..., 2] = Z_C
            return o, d

        # fan rows: even spacing along the back / side / front profiles, up to the juban collar top
        ph = np.linspace(0.0, 1.45, 360)
        prof, arcs = {}, []
        for a in (0.0, 90.0, 180.0):
            o, d = fan_od(ph, np.radians(a))
            r = _first_hit(hull_sdf, o, d)
            pts = o + r[:, None] * d
            prof[a] = (o, d, r, pts)
            s = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
            arcs.append(s)
        o, d, r, pts = prof[0.0]
        phi_j = float(np.interp(Z_BACK_J, pts[:, 2], ph))
        m = ph <= phi_j
        par = sum(s[m] / s[m][-1] for s in arcs) / 3.0
        nf = 50
        phis = np.interp(np.linspace(0.0, 1.0, nf), par, ph[m])
        phis[-1] = phi_j
        kk = int(np.argmin(np.abs(np.interp(phis, ph, pts[:, 2]) - Z_BACK_K)))
        self.phi = phis
        self.row_top_k = self.n0 + kk
        self.nrows = self.n0 + nf
        self.zback = np.interp(phis, ph, pts[:, 2])

        tab = np.zeros((len(self.LEVELS), self.n0, 181))
        zz, pp = np.meshgrid(self.z, psd, indexing="ij")
        o = np.stack([np.zeros_like(zz), np.zeros_like(zz), zz], -1)
        d = np.stack([np.sin(pp), -np.cos(pp), np.zeros_like(pp)], -1)
        for li, lv in enumerate(self.LEVELS):
            tab[li] = _bisect(tube_sdf, o, d, 0.03, 0.42, lv, 20)
        self.tab = np.concatenate([tab, tab[:, :, -2::-1]], axis=2)      # 0..360 degrees
        # fan: the level-0 surface and its normals; other levels are offsets along the normal, which
        # stays well behaved where the cloth climbs the neck
        ff, pp = np.meshgrid(self.phi, psd, indexing="ij")
        o, d = fan_od(ff, pp)
        P0 = o + _first_hit(hull_sdf, o, d)[..., None] * d
        N0 = _unit(_grad(hull_sdf, P0))
        mir = np.array([-1.0, 1.0, 1.0])
        self.fp = np.concatenate([P0, P0[:, -2::-1] * mir], axis=1)
        self.fn = np.concatenate([N0, N0[:, -2::-1] * mir], axis=1)
        # nominal height of each row (for wrinkle placement) and how far up the neck it is
        self.zn = np.r_[self.z, Z_C + 0.19 * np.sin(self.phi)]
        self.top = np.r_[np.zeros(self.n0), _ss((self.zback - 1.335) / 0.045)]

    def radius(self, ri, psi, level):
        """Radius of the tube at fractional ring index ri."""
        ri, psi, level = np.broadcast_arrays(np.asarray(ri, float), psi, level)
        pd = np.mod(np.degrees(psi), 360.0)
        j0 = np.minimum(np.floor(pd).astype(int), 359)
        fj = pd - j0
        i0 = np.clip(np.floor(ri).astype(int), 0, self.n0 - 2)
        fi = ri - i0
        out = []
        for li in range(3):
            T = self.tab[li]
            a = T[i0, j0] * (1 - fj) + T[i0, j0 + 1] * fj
            b = T[i0 + 1, j0] * (1 - fj) + T[i0 + 1, j0 + 1] * fj
            out.append(a * (1 - fi) + b * fi)
        L = self.LEVELS
        lo = out[0] + (out[1] - out[0]) * (level / L[1])
        hi = out[1] + (out[2] - out[1]) * ((level - L[1]) / (L[2] - L[1]))
        return np.where(level <= L[1], lo, hi)

    def pts(self, rows, psi, level, sx):
        """Points for integer row indices (arrays broadcast)."""
        rows, psi, level = np.broadcast_arrays(rows, psi, level)
        fan = rows >= self.n0
        out = np.empty(rows.shape + (3,))
        if (~fan).any():
            rr, pp, ll = rows[~fan], psi[~fan], level[~fan]
            r = self.radius(rr, pp, ll)
            out[~fan] = np.stack([sx * r * np.sin(pp), -r * np.cos(pp), self.z[rr]], -1)
        if fan.any():
            rr, pp, ll = rows[fan] - self.n0, psi[fan], level[fan]
            pd = np.mod(np.degrees(pp), 360.0)
            j0 = np.minimum(np.floor(pd).astype(int), 359)
            fj = (pd - j0)[:, None]
            P = self.fp[rr, j0] * (1 - fj) + self.fp[rr, j0 + 1] * fj
            Nn = self.fn[rr, j0] * (1 - fj) + self.fn[rr, j0 + 1] * fj
            P = P + ll[:, None] * Nn
            P[:, 0] *= sx
            out[fan] = P
        return out

    def ring(self, z, psi, level, sx=-1):
        """Points on the tube at height z (below the arms). psi in the LEFT half's convention."""
        z, psi, level = np.broadcast_arrays(np.asarray(z, float), psi, level)
        ri = np.interp(z, self.z, np.arange(self.n0, dtype=float))
        r = self.radius(np.minimum(ri, self.n0 - 1.0), psi, level)
        return np.stack([sx * r * np.sin(psi), -r * np.cos(psi), z], -1)


# --------------------------------------------------------------------------- mesh helpers

def _grid_faces(nr, nc, close_c=False):
    cols = nc if close_c else nc - 1
    i, j = np.meshgrid(np.arange(nr - 1), np.arange(cols), indexing="ij")
    a = i * nc + j
    b = i * nc + (j + 1) % nc
    c = (i + 1) * nc + (j + 1) % nc
    d = (i + 1) * nc + j
    return np.stack([a, b, c, d], -1).reshape(-1, 4)


def _face_normals(v, f):
    a, b, c, d = (v[f[:, k]] for k in range(4))
    return np.cross(c - a, d - b)


def _orient(v, f, ref):
    """Reverse faces if most normals point towards ref (an inside point or (F,3) points)."""
    n = _face_normals(v, f)
    cen = v[f].mean(1)
    s = ((cen - ref) * n).sum(-1)
    if (s < 0).sum() > (s > 0).sum():
        return f[:, ::-1].copy()
    return f


def _mat(state, kind):
    m = (state.get("materials") or {}).get(kind)
    if m is not None:
        return m
    if kind == "obiage":                      # a pale shibori tint sits better against the brocade
        return common.fabric_material("obiage", name="DF_obiage", color="#e2b39c")
    return common.fabric_material(kind)


def _new_obj(state, name, verts, faces, mats, uv=False):
    import bpy
    me = bpy.data.meshes.new(name)
    me.from_pydata(np.asarray(verts, float).tolist(), [], np.asarray(faces, int).tolist())
    me.update()
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    if uv:
        me.uv_layers.new(name="UVMap")
    for m in mats:
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    state["collection"].objects.link(ob)
    ob.parent = state["root"]
    state["objects"][name] = ob
    return ob


def _set_co(ob, v):
    me = ob.data
    me.vertices.foreach_set("co", np.ascontiguousarray(v, dtype=np.float32).ravel())
    me.update()


def _set_uv(ob, uv):
    arr = np.ascontiguousarray(uv, dtype=np.float32).ravel()
    lay = ob.data.uv_layers[0]
    try:
        lay.uv.foreach_set("vector", arr)
    except Exception:
        lay.data.foreach_set("uv", arr)


def _show(ob, on):
    ob.hide_render = not on
    ob.hide_viewport = not on


def _solidify(ob, thk, mat_off=1):
    m = ob.modifiers.new("cloth_thickness", "SOLIDIFY")
    m.thickness = thk
    m.offset = -1.0
    m.use_even_offset = True
    m.use_rim = True
    m.material_offset = mat_off
    m.material_offset_rim = 0
    return m


def _stadium(w0, w1, t0, t1, k=24, r=None):
    """Closed rounded-rectangle profile in (n, u): n in [t0, t1], u in [w0, w1]."""
    r = min(r or (t1 - t0) / 2, (t1 - t0) / 2, (w1 - w0) / 2)
    cs = [(t1 - r, w1 - r, 0.0), (t0 + r, w1 - r, 0.5 * math.pi), (t0 + r, w0 + r, math.pi),
          (t1 - r, w0 + r, 1.5 * math.pi)]
    pts = []
    q = max(2, k // 4)
    for cn, cu, a0 in cs:
        for s in range(q + 1):
            a = a0 + 0.5 * math.pi * s / q
            pts.append((cn + r * math.cos(a), cu + r * math.sin(a)))
    return np.array(pts)


def _circle(r, k=10):
    a = np.linspace(0, 2 * math.pi, k, endpoint=False)
    return np.stack([r * np.cos(a), r * np.sin(a)], -1)


def _close_prof(prof):
    return np.vstack([prof, prof[:1]])


def _frames(C, N):
    T = _unit(np.gradient(C, axis=0))
    N = _unit(N - (N * T).sum(-1, keepdims=True) * T)
    return T, N, np.cross(T, N)


def _sweep_verts(C, N, U, prof, scale=None):
    pr = _close_prof(prof)
    pr = np.broadcast_to(pr, (len(C),) + pr.shape)
    if scale is not None:
        pr = pr * scale[:, None, None]
    V = C[:, None, :] + pr[..., 0:1] * N[:, None, :] + pr[..., 1:2] * U[:, None, :]
    return V.reshape(-1, 3)


def _tube_obj(state, name, n, prof, kind, uv=False):
    faces = _grid_faces(n, len(prof) + 1)
    ob = _new_obj(state, name, np.zeros((n * (len(prof) + 1), 3)), faces, [_mat(state, kind)], uv=uv)
    return dict(ob=ob, prof=prof, n=n, faces=faces, flip=None)


def _tube_set(td, C, N, scale=None):
    """Sweep td's profile along C; the face winding is fixed on first use (outward)."""
    T, N, U = _frames(C, N)
    V = _sweep_verts(C, N, U, td["prof"], scale)
    if td["flip"] is None:
        m = len(td["prof"]) + 1
        f = td["faces"]
        cen = np.repeat(C, m, axis=0)
        s = ((V[f].mean(1) - cen[f].mean(1)) * _face_normals(V, f)).sum(-1)
        td["flip"] = bool((s < 0).sum() > (s > 0).sum())
        if td["flip"]:
            _flip(td)
    _set_co(td["ob"], V)
    return V


def _flip(td):
    """Flip an object's faces and keep td["faces"] in the mesh's loop order (UVs are set per loop)."""
    me = td["ob"].data
    me.flip_normals()
    td["faces"] = np.array([list(pl.vertices) for pl in me.polygons])


def _resample(P, n):
    L = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
    s = np.linspace(0, L[-1], n)
    return np.stack([np.interp(s, L, P[:, k]) for k in range(P.shape[1])], -1)


# --------------------------------------------------------------------------- the mannequin

def _surface_nets(f, lo, hi, h):
    xs = np.arange(lo[0], hi[0] + h, h)
    ys = np.arange(lo[1], hi[1] + h, h)
    zs = np.arange(lo[2], hi[2] + h, h)
    X, Y, Z = np.meshgrid(xs, ys, zs, indexing="ij")
    F = f(np.stack([X, Y, Z], -1))
    del X, Y, Z
    nx, ny, nz = F.shape
    inside = F < 0
    S = np.zeros((nx - 1, ny - 1, nz - 1, 3), np.float32)
    Cn = np.zeros((nx - 1, ny - 1, nz - 1), np.float32)
    corners = [(0, 0, 0), (1, 0, 0), (0, 1, 0), (1, 1, 0), (0, 0, 1), (1, 0, 1), (0, 1, 1), (1, 1, 1)]
    edges = [(0, 1), (2, 3), (4, 5), (6, 7), (0, 2), (1, 3), (4, 6), (5, 7), (0, 4), (1, 5), (2, 6), (3, 7)]

    def sl(c):
        return (slice(c[0], nx - 1 + c[0]), slice(c[1], ny - 1 + c[1]), slice(c[2], nz - 1 + c[2]))
    for a, b in edges:
        ca, cb = corners[a], corners[b]
        fa, fb = F[sl(ca)], F[sl(cb)]
        m = (fa < 0) != (fb < 0)
        t = np.where(m, fa / np.where(m, fa - fb, 1.0), 0.0)
        pa = np.array(ca, np.float32)
        pb = np.array(cb, np.float32)
        S += np.where(m[..., None], pa + t[..., None] * (pb - pa), 0.0)
        Cn += m
    act = Cn > 0
    idx = -np.ones(act.shape, dtype=np.int64)
    idx[act] = np.arange(act.sum())
    ii, jj, kk = np.nonzero(act)
    V = np.stack([xs[ii], ys[jj], zs[kk]], -1) + (S[act] / Cn[act][:, None]) * h
    faces = []
    dims = [nx, ny, nz]
    for axis in range(3):
        sl0 = [slice(None)] * 3
        sl1 = [slice(None)] * 3
        sl0[axis] = slice(0, -1)
        sl1[axis] = slice(1, None)
        e = np.argwhere(inside[tuple(sl0)] != inside[tuple(sl1)])
        o1, o2 = [ax for ax in range(3) if ax != axis]
        ok = (e[:, o1] > 0) & (e[:, o2] > 0) & (e[:, o1] < dims[o1] - 1) & (e[:, o2] < dims[o2] - 1)
        e = e[ok]
        flip = inside[tuple(e.T)]

        def cell(d1, d2):
            c = e.copy()
            c[:, o1] -= d1
            c[:, o2] -= d2
            return idx[tuple(c.T)]
        q = np.stack([cell(1, 1), cell(0, 1), cell(0, 0), cell(1, 0)], -1)
        if axis == 1:
            flip = ~flip
        faces.append(np.where(flip[:, None], q[:, ::-1], q))
    Fc = np.vstack(faces)
    return V, Fc[(Fc >= 0).all(1)]


def _build_mannequin(state):
    V, Fc = _surface_nets(mannequin_sdf, (-0.50, -0.150, -0.014), (0.50, 0.170, 1.680), 0.006)
    V = _project(V, 0.0, mannequin_sdf, it=3)
    cen = V[Fc].mean(1)
    if ((_grad(mannequin_sdf, cen) * _face_normals(V, Fc)).sum(-1) < 0).sum() > len(Fc) / 2:
        Fc = Fc[:, ::-1]
    _new_obj(state, "DF_mannequin", V, Fc, [_mat(state, "mannequin")])


# --------------------------------------------------------------------------- robe halves

def _edge_x(z, table):
    zz, xx = zip(*table)
    return np.interp(z, zz, xx)


def _ridge(x):
    return 1.375 - 0.36 * np.maximum(0.0, np.abs(x) - 0.06)


class _Panel:
    """One wrapped half of a robe (wearer's left sx = -1 or right sx = +1)."""

    def __init__(self, hull, sx, base, lift, edge_tab, row0, row_top, ncols, kimono):
        self.hull, self.sx, self.base, self.lift, self.kimono = hull, sx, base, lift, kimono
        self.rows = np.arange(row0, row_top + 1)
        self.nr, self.nc = len(self.rows), ncols
        self.zn = hull.zn[self.rows]
        self.top = hull.top[self.rows]
        # final edge per row: first azimuth past the side where the surface crosses the edge line
        ps = np.radians(np.arange(88.0, 250.0, 0.5))
        R, P = np.meshgrid(self.rows, ps, indexing="ij")
        pts = hull.pts(R, P, self.level(np.arange(self.nr)[:, None], P), sx)
        g = sx * pts[..., 0] + _edge_x(pts[..., 2], edge_tab)
        edge = np.empty(self.nr)
        for i in range(self.nr):
            k = np.nonzero(g[i] < 0)[0]
            if len(k) == 0 or k[0] == 0:
                edge[i] = ps[-1] if len(k) == 0 else ps[0]
            else:
                k = k[0]
                edge[i] = ps[k - 1] + (ps[k] - ps[k - 1]) * g[i, k - 1] / (g[i, k - 1] - g[i, k])
        self.edge = edge
        self.faces = _grid_faces(self.nr, ncols)

    def level(self, i, psi, wr=False, s_fold=0.0):
        """Hull level of the cloth at local row index i (int array) and azimuth psi."""
        dps = np.degrees(psi)
        lv = self.base + self.lift * _ss((dps - 125.0) / 23.0) + 0.0 * i
        if self.kimono:
            lv = lv - NAPE * self.top[i] * (1.0 - _ss((dps - 80.0) / 40.0))
        if wr:
            lv = lv + self.wrinkles(psi, self.zn[i], s_fold)
        return lv

    def fold_z(self, s):
        return Z_KOSHI + (Z_FOLD - Z_KOSHI) * s

    def wrinkles(self, psi, z, s_fold):
        """Outward-only soft undulation (metres of level); zero near the collar."""
        dps = np.degrees(psi)
        front = _ss((dps - 118.0) / 30.0)                      # 1 on the overlapped front
        w = np.zeros(np.broadcast(psi, z).shape)
        # skirt: long soft vertical folds, deeper towards the hem and at the back / sides
        dn = 1.0 - _ss((z - 0.10) / 0.70)
        a = 0.0034 * (0.45 + 0.55 * dn) * (1.0 - 0.6 * front)
        f1 = 0.5 + 0.5 * np.sin(psi * 7.0 + 1.3 * np.sin(psi * 3.0) + 0.9 * self.sx * np.sin(psi) + 2.2 * z)
        f2 = 0.5 + 0.5 * np.sin(psi * 17.0 + 3.0 * z + 1.0)
        w = w + np.where(z < Z_FOLD + 0.01, a * (0.75 * f1 ** 2 + 0.25 * f2), 0.0)
        # bunching above the sash: soft horizontal rolls, mostly at the sides and the back
        side = 0.30 + 0.70 * _ss(1.0 - np.abs(dps - 75.0) / 75.0)
        band = _ss((z - OBI_TOP + 0.015) / 0.02) * (1.0 - _ss((z - OBI_TOP - 0.015) / 0.085))
        roll = 0.5 + 0.5 * np.sin((z - OBI_TOP) * 2 * math.pi / 0.034 + 2.0 * np.sin(psi * 2.6) + self.sx * np.sin(psi) + psi)
        w = w + 0.0042 * side * band * roll * (1.0 - 0.55 * front)
        # drag folds from the shoulder blades / chest down towards the waist
        diag = 0.5 + 0.5 * np.sin((dps * 1.1 + (z - 1.0) * 190.0) * math.pi / 34.0)
        wb = _ss(1.0 - np.abs(dps - 50.0) / 40.0) * _ss((z - OBI_TOP) / 0.05) * (1.0 - _ss((z - 1.21) / 0.07))
        w = w + 0.0022 * diag ** 2 * wb
        if self.kimono and s_fold > 0:
            # the ohashori: a second layer from the fold line up to the waist tie, with a soft lip
            zf = self.fold_z(s_fold)
            zf = zf + 0.0025 * np.sin(psi * 5.0 + 0.6) * min(1.0, 2.0 * s_fold)      # the edge is hand-set
            amp = min(1.0, 3.0 * s_fold)
            up = _ss((z - zf) / 0.006)
            lip = 0.0030 * np.exp(-((z - zf - 0.006) / 0.005) ** 2)
            puff = 0.0020 * (0.5 + 0.5 * np.sin(psi * 9.0 + 1.0)) * np.exp(-((z - zf - 0.035) / 0.03) ** 2)
            top = 1.0 - _ss((z - Z_KOSHI - 0.005) / 0.05)
            w = w + (FOLD * up + (lip + puff) * up) * amp * top
        return w

    def positions(self, extent, s_fold=0.0, lead_lift=0.024):
        """extent: radians reached by the wrap. Returns verts (nr, nc, 3) and the psi grid."""
        e_row = np.minimum(self.edge, extent)
        psi = e_row[:, None] * np.linspace(0.0, 1.0, self.nc)[None, :]
        i = np.arange(self.nr)[:, None]
        lv = self.level(i, psi, True, s_fold)
        # the leading edge curls away from the body while it is still travelling
        pend = _ss((self.edge - extent) / math.radians(14.0))[:, None]
        near = _ss((psi - (e_row[:, None] - math.radians(11.0))) / math.radians(11.0))
        lv = lv + lead_lift * pend * near ** 2
        return self.hull.pts(self.rows[:, None], psi, lv, self.sx), psi


def _worn_uv_np(c, h, cr):
    W = common.W
    h = np.clip(h, 0.0, common.BODY)
    u, v = common.garment_uv(c, -h)
    xl = -2 * W - c
    xr = 2 * W - c
    ul, vl = common.garment_uv(xl, h)
    uol, vol = common.okumi_uv("l", xl + common.OKUMI_SA, h - common.OKUMI_Y0)
    ur, vr = common.garment_uv(xr, h)
    uor, vor = common.okumi_uv("r", xr + common.OKUMI_W, h - common.OKUMI_Y0)
    for m, uu, vv in (((cr < -W) & (cr >= -2 * W), ul, vl), (cr < -2 * W, uol, vol),
                      ((cr > W) & (cr <= 2 * W), ur, vr), (cr > 2 * W, uor, vor)):
        u = np.where(m, uu, u)
        v = np.where(m, vv, v)
    return np.stack([u, v], -1)


def _c_table(hull, edge_low):
    """psi -> worn-canvas c (positive), see the UV convention in the module docstring."""
    ps = np.radians(np.linspace(0.0, 260.0, 521))
    p = hull.ring(0.60, ps, LV_K)
    seg = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(p[:, :2], axis=0), axis=1))]
    side = np.where(ps < math.pi, np.sin(ps) ** 2, 0.0)
    dseg = np.diff(seg)
    s2 = np.r_[0.0, np.cumsum(0.5 * (side[1:] + side[:-1]) * dseg)]
    a1, a2 = np.interp(edge_low, ps, seg), np.interp(edge_low, ps, s2)
    b = 1.12
    q = (0.87 / b - a1) / a2
    if q < 0:
        b, q = 0.87 / a1, 0.0
    return ps, b * (seg + q * s2)


def _panel_uv(state, p, P, psi, s_fold):
    ps, cv = state["c_tab"]
    c = np.interp(psi.ravel(), ps, cv) * (-1.0 if p.sx < 0 else 1.0)
    P = P.reshape(-1, 3)
    z = P[:, 2]
    h_up = np.maximum(_ridge(P[:, 0]) - z, 0.0)
    h_sk = common.BODY - (z - Z_HEM)
    zf = p.fold_z(s_fold) if s_fold > 0 else Z_KOSHI
    f = p.faces
    skirt = z[f].mean(1) < zf
    cl = c[f]
    hl = np.where(skirt[:, None], h_sk[f], h_up[f])
    return _worn_uv_np(cl.ravel(), hl.ravel(), np.repeat(cl.mean(1), 4))


# --------------------------------------------------------------------------- sleeves

_X0 = J[0] + 0.07 * SA             # x of the innermost sleeve station
_XOUT = J[0] + 0.50 * SA           # x of the wrist end


class _Sleeve:
    """A half tube over the arm; from its two flanks a two-layer bag hangs straight down."""
    NA, NT, NH, NB = 44, 9, 40, 5
    L0 = 0.07

    def __init__(self, sx, tag):
        k = tag == "K"
        self.sx, self.tag = sx, tag
        self.l1 = 0.50 if k else 0.48
        self.rt = (np.array([0.0, 0.09, 0.13, 0.30, 0.50]),
                   np.array([0.035, 0.055, 0.063, 0.052, 0.037]) if k else
                   np.array([0.033, 0.046, 0.047, 0.042, 0.031]))
        self.g0 = 0.009 if k else 0.005
        self.zb = (0.470, 0.400) if k else (0.495, 0.425)       # bag bottom: inner, outer
        self.xin = 0.0 if k else 0.004
        self.nring = 2 * (self.NT + self.NH + self.NB) - 1
        self.faces = _grid_faces(self.NA, self.nring)
        self.ob = None

    def positions(self, grow):
        NA, NT, NH, NB = self.NA, self.NT, self.NH, self.NB
        g0 = self.g0
        a = max(grow, 1e-3) * np.linspace(0.0, 1.0, NA)                 # fraction of the full width
        ln = self.L0 + (self.l1 - self.L0) * a
        Q = J[None, :] + ln[:, None] * D_ARM[None, :]
        R = np.interp(ln, *self.rt)
        # ---- half tube over the arm (front quarter; the back mirrors it)
        th = np.linspace(0.0, 0.5 * math.pi, NT)
        Xt = Q[:, 0:1] + R[:, None] * np.cos(th)[None, :] * N_ARM[0]
        Zt = Q[:, 2:3] + R[:, None] * np.cos(th)[None, :] * N_ARM[2]
        Yt = R[:, None] * np.sin(th)[None, :]
        Dt = R[:, None] * th[None, :]
        # ---- the bag
        zq = Q[:, 2]
        zb = self.zb[0] + (self.zb[1] - self.zb[0]) * a
        rcn = 0.27                                                      # rounded outer-bottom corner
        e = np.clip((a - (1.0 - rcn)) / rcn, 0.0, 1.0)
        zb = zb + 0.052 * (1.0 - np.sqrt(1.0 - e ** 2)) * (grow >= 1.0)
        e = np.clip((0.10 - a) / 0.10, 0.0, 1.0)
        zb = zb + 0.020 * (1.0 - np.sqrt(1.0 - e ** 2))
        H = zq - zb - g0
        tau = np.r_[np.linspace(0.0, 0.30, 15)[1:], np.linspace(0.30, 1.0, NH - 13)[1:]]
        dh = H[:, None] * tau[None, :]
        Zh = zq[:, None] - dh
        dfold = Dt[:, -1:] + dh                                         # cloth distance from the top fold
        # pinches: the inner edge below the armpit, the sewn part of the outer edge
        ap = 0.07
        pin = np.sqrt(np.clip(1.0 - (1.0 - np.clip(a / ap, 0, 1)) ** 2, 0, 1))[:, None]
        pin = 1.0 - (1.0 - pin) * _ss((1.14 - Zh) / 0.04)
        pout = np.sqrt(np.clip(1.0 - np.clip((a - (1.0 - ap)) / ap, 0, 1) ** 2, 0, 1))[:, None]
        pout = 1.0 - (1.0 - pout) * _ss((dfold - 0.215) / 0.03)
        pinch = pin * pout
        gap = (g0 + (R[:, None] - g0) * np.exp(-(dh / 0.07) ** 2)) * pinch
        # horizontal placement: follow the arm above, stand clear of the sash and skirt below
        xc = Q[:, 0:1]
        xin = 0.206 + self.xin + 0.016 * _ss((Zh - 0.86) / 0.06)
        xt = xin + (_XOUT - xin) * (xc - _X0) / (_XOUT - _X0)
        s = _ss((1.15 - Zh) / 0.05) * _ss(dh / 0.10)
        Xh = xc + s * (xt - xc) + 0.030 * a[:, None] * (dh / H[:, None]) ** 2
        # soft hanging folds, shared by both layers (and by juban and kimono, so they stay nested)
        u = (Xh - 0.20) / 0.19
        hang = _ss((dh - 0.03) / 0.22)
        fold = 0.0065 * hang * np.sin(2 * math.pi * (1.45 * u + 0.30 * np.sin(Zh * 7.0 + self.sx)) + 0.8 * self.sx)
        fold = fold + 0.0025 * hang * np.sin(2 * math.pi * 3.1 * u + Zh * 11.0)
        fold = fold * (0.35 + 0.65 * np.sin(math.pi * np.clip(a, 0, 1))[:, None] ** 0.5)
        breath = 1.0 + 0.30 * hang * np.sin(2 * math.pi * 0.9 * u + 2.0 + 3.0 * Zh) * pinch
        Yf, Yb = gap * breath + fold, -gap * breath + fold
        # ---- bottom fold: a quarter circle from each layer to the shared lowest line
        be = np.linspace(0.0, 0.5 * math.pi, NB + 1)[1:]
        Zbt = zb[:, None] + g0 * (1.0 - np.sin(be))[None, :]
        Xbt = np.repeat(Xh[:, -1:], NB, axis=1)
        gl, fl = (gap * breath)[:, -1:], fold[:, -1:]
        Ybf = gl * np.cos(be)[None, :] + fl
        Ybb = -gl * np.cos(be)[None, :] + fl
        Db = dfold[:, -1:] + g0 * be[None, :]
        # ---- ring: bottom -> front layer -> ridge -> back layer -> bottom
        Xf = np.c_[Xt, Xh, Xbt]
        Zf = np.c_[Zt, Zh, Zbt]
        Df = np.c_[Dt, dfold, Db]
        Yfr = np.c_[Yt, Yf, Ybf]
        Ybk = np.c_[-Yt, Yb, Ybb]
        X = np.c_[Xf[:, ::-1], Xf[:, 1:]]
        Z = np.c_[Zf[:, ::-1], Zf[:, 1:]]
        Y = np.c_[Yfr[:, ::-1], Ybk[:, 1:]]
        self.d = np.c_[Df[:, ::-1], -Df[:, 1:]]
        self.ln = np.broadcast_to(ln[:, None], X.shape)
        return np.stack([X * self.sx, Y, Z], -1)

    def uv(self):
        x = self.sx * (common.W + np.clip(self.ln - 0.135, 0.0, common.W))
        uvv = np.stack(common.garment_uv(x, self.d), -1).reshape(-1, 2)
        return uvv[self.faces].reshape(-1, 2)

    def opening(self, P):
        """The open part of the wrist edge, front-bottom -> over the arm -> back-bottom."""
        return P[-1][np.abs(self.d[-1]) < 0.222]


# --------------------------------------------------------------------------- collars and edge rolls

def _collar_setup(state):
    state["collars"] = {}
    for tag, low, width, thk, over, kind in (("K", (0.99, 1.15), 0.055, 0.0042, 0.005, "kimono"),
                                             ("J", (1.05, 1.19), 0.050, 0.0030, 0.004, "juban")):
        prof = _stadium(-(width - over), over, 0.0, thk, k=20, r=0.0019)
        n_each = 120
        n = 2 * n_each - 1
        faces = _grid_faces(n, len(prof) + 1)
        ob = _new_obj(state, "DF_%s_collar" % tag, np.zeros((n * (len(prof) + 1), 3)), faces,
                      [_mat(state, kind)], uv=(tag == "K"))
        state["collars"][tag] = dict(ob=ob, pan=state["kim" if tag == "K" else "jub"], low=low, prof=prof,
                                     n_each=n_each, faces=faces, width=width, over=over, flip=None)


def _update_collar(state, tag, ext):
    cd = state["collars"][tag]
    hull = state["hull"]
    halves = []
    for side, lowz in (("L", cd["low"][0]), ("R", cd["low"][1])):
        p = cd["pan"][side]
        i0 = int(np.nonzero(p.zn >= lowz)[0][0])
        ii = np.r_[np.arange(i0, p.nr), np.full(49, p.nr - 1)]
        ps = np.r_[p.edge[i0:], np.linspace(p.edge[-1], 0.0, 50)[1:]]
        if ps.min() > ext[side]:
            return False
        vis = ps <= ext[side] + 1e-6
        k0 = int(np.argmax(vis))
        ii, ps = ii[k0:], np.minimum(ps[k0:], ext[side])
        C = hull.pts(p.rows[ii], ps, p.level(ii, ps) + 0.0008, p.sx)
        if len(C) < 4:
            return False
        halves.append(_resample(C, cd["n_each"]))
    C = np.vstack([halves[0], halves[1][::-1][1:]])
    iso = hull_sdf(C)
    N = _unit(_grad(hull_sdf, C))
    T, N, U = _frames(C, N)
    pr = _close_prof(cd["prof"])
    V = C[:, None, :] + pr[None, :, 1:2] * U[:, None, :]
    shp = V.shape
    V = _project(V.reshape(-1, 3), np.repeat(iso, len(pr)), it=2)
    Nv = _unit(_grad(hull_sdf, V))
    V = (V + np.tile(pr[:, 0], len(C))[:, None] * Nv).reshape(shp)
    tap = np.ones(len(C))
    tap[[0, -1]] = 0.3
    tap[[1, -2]] = 0.8
    cen = V.mean(1, keepdims=True)
    V = cen + (V - cen) * tap[:, None, None]
    if cd["flip"] is None:
        f = cd["faces"]
        Vf = V.reshape(-1, 3)
        cc = np.repeat(C, len(pr), axis=0)
        s = ((Vf[f].mean(1) - cc[f].mean(1)) * _face_normals(Vf, f)).sum(-1)
        cd["flip"] = bool((s < 0).sum() > (s > 0).sum())
        if cd["flip"]:
            _flip(cd)
    _set_co(cd["ob"], V.reshape(-1, 3))
    if tag == "K":
        L = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(C, axis=0), axis=1))]
        a = pr[:, 1] + (cd["width"] - cd["over"]) + 0.02
        uvv = np.stack(common.collar_uv(a[None, :] + 0 * L[:, None], L[:, None] + 0 * a[None, :]), -1).reshape(-1, 2)
        _set_uv(cd["ob"], uvv[cd["faces"]].reshape(-1, 2))
    return True


# --------------------------------------------------------------------------- obi and accessories

def _obi_setup(state):
    H = (OBI_TOP - OBI_BOT) / 2
    th, r, k = OBI_THK, 0.005, 7
    prof = [(0.0, -H + r + (2 * H - 2 * r) * i / (k - 1)) for i in range(k)]            # inner face, up
    prof += [(th / 2 - th / 2 * math.cos(math.pi * i / 6), H - r + r * math.sin(math.pi * i / 6)) for i in range(1, 6)]
    for i in range(k):                                                                  # outer face, down
        u = H - r - (2 * H - 2 * r) * i / (k - 1)
        prof.append((th + 0.0025 * (1 - (u / H) ** 2), u))
    prof += [(th / 2 + th / 2 * math.cos(math.pi * i / 6), -H + r - r * math.sin(math.pi * i / 6)) for i in range(1, 6)]
    state["obi"] = _tube_obj(state, "DF_obi", 220, np.array(prof), "obi", uv=True)
    state["cord"] = _tube_obj(state, "DF_obijime", 200, _circle(0.0048, 10), "obijime")
    state["cordknot"] = _tube_obj(state, "DF_obijime_knot", 96, _circle(0.0046, 10), "obijime")
    state["obiage"] = _tube_obj(state, "DF_obiage", 260, _circle(1.0, 16), "obiage")
    nx_, kp = 44, 48
    faces = _grid_faces(nx_, kp + 1)
    ob = _new_obj(state, "DF_knot", np.zeros((nx_ * (kp + 1), 3)), faces, [_mat(state, "obi")], uv=True)
    state["knot"] = dict(ob=ob, n=nx_, kp=kp, faces=faces, flip=None)
    tp = _stadium(-0.5, 0.5, 0.0, 0.007, k=16, r=0.003)
    state["tare"] = _tube_obj(state, "DF_knot_tail", 30, tp, "obi", uv=True)


def _obi_face(state, psi, z, extra=0.0):
    """Point on the outer face of the obi."""
    return state["hull"].ring(z, psi, LV_OBI + OBI_THK + 0.0025 + extra)


def _update_obi(state, s):
    od, hull = state["obi"], state["hull"]
    n = od["n"]
    psi = np.linspace(0.0, math.radians(363.0) * s, n)
    zc = 0.5 * (OBI_BOT + OBI_TOP)
    lv = LV_OBI + 0.0035 * _ss((np.degrees(psi) - 335.0) / 25.0)          # the end laps over the start
    C = hull.ring(zc, psi, lv)
    N = _unit(C * np.array([1.0, 1.0, 0.0]))
    U = np.broadcast_to(np.array([0.0, 0.0, 1.0]), C.shape)
    pr = _close_prof(od["prof"])
    tap = np.ones(n)
    if s < 1.0:
        tap[-1], tap[-2], tap[-3] = 0.5, 0.82, 0.95
    V = C[:, None, :] + pr[None, :, 0:1] * N[:, None, :] + (pr[None, :, 1:2] * tap[:, None, None]) * U[:, None, :]
    V = V.reshape(-1, 3)
    if od["flip"] is None:
        f = od["faces"]
        cc = np.repeat(C + 0.5 * OBI_THK * N, len(pr), axis=0)
        sg = ((V[f].mean(1) - cc[f].mean(1)) * _face_normals(V, f)).sum(-1)
        od["flip"] = bool((sg < 0).sum() > (sg > 0).sum())
        if od["flip"]:
            _flip(od)
    _set_co(od["ob"], V)
    L = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(C, axis=0), axis=1))]
    uvv = np.stack([np.broadcast_to(L[:, None], (n, len(pr))),
                    np.broadcast_to(pr[None, :, 1] + 0.08, (n, len(pr)))], -1).reshape(-1, 2)
    _set_uv(od["ob"], uvv[od["faces"]].reshape(-1, 2))


def _update_cord(state, s):
    cd = state["cord"]
    zc = 0.5 * (OBI_BOT + OBI_TOP) - 0.004
    half = math.pi * (0.02 + 0.98 * _ramp(s, 0.0, 0.8))
    psi = np.linspace(-half, half, cd["n"])                     # from centre back round both sides
    C = _obi_face(state, psi, zc, 0.0040)
    C[:, 2] += 0.0015 * np.sin(psi * 3.0)
    _tube_set(cd, C, _unit(C * np.array([1.0, 1.0, 0.0])))
    # a small flat knot at centre front
    kd = state["cordknot"]
    sk = _ramp(s, 0.75, 1.0)
    base = _obi_face(state, np.array([math.pi]), np.array([zc]), 0.0055)[0]
    state["cordknot_pt"] = base + np.array([0.0, 0.008, 0.0])
    if sk <= 0.0:
        return False
    ph = np.linspace(0.0, 2 * math.pi, kd["n"])
    sc = 0.0062 * (0.3 + 0.7 * sk)
    C = base[None, :] + np.stack([(np.sin(ph) + 2 * np.sin(2 * ph)) * sc,
                                  0.004 + 0.0042 * np.sin(3 * ph) * sk,
                                  (np.cos(ph) - 2 * np.cos(2 * ph)) * sc * 0.8 + 0.004], -1)
    _tube_set(kd, C, np.broadcast_to(np.array([0.0, 1.0, 0.0]), C.shape).copy())
    return True


def _update_obiage(state, s):
    ad, hull = state["obiage"], state["hull"]
    n = ad["n"]
    half = math.radians(118.0) * (0.25 + 0.75 * s)
    k = np.linspace(-1.0, 1.0, n)
    psi = math.pi + half * k
    w = np.clip(1.0 - np.abs(k) ** 6, 0.0, 1.0) ** 0.5                      # tucks into the sash at both ends
    r = (0.0105 * w * (0.88 + 0.12 * np.sin(k * 9.0 + 1.0)) + 0.0015) * (0.25 + 0.75 * s)
    zc = OBI_TOP + 0.0030 - 0.012 * (1.0 - w) + 0.0015 * np.sin(k * 7.0)
    C = hull.ring(zc, psi, LV_OBI + 0.002 + 0.25 * r)
    N = _unit(C * np.array([1.0, 1.0, 0.0]))
    T = _unit(np.gradient(C, axis=0))
    U = np.cross(T, N)
    pr = _close_prof(ad["prof"])
    ang = np.arctan2(pr[:, 1], pr[:, 0])[None, :]
    kk = k[:, None]
    rr = r[:, None] * (1.0 + 0.07 * np.sin(kk * 83.0 + 0.6 * np.sin(2.0 * ang)) + 0.05 * np.sin(kk * 37.0 + 1.0 + ang)
                       + 0.04 * np.sin(kk * 151.0 + 2.0 * ang))
    V = C[:, None, :] + (pr[None, :, 0] * rr)[..., None] * N[:, None, :] + \
        (pr[None, :, 1] * rr * 1.12)[..., None] * U[:, None, :]
    V = V.reshape(-1, 3)
    if ad["flip"] is None:
        f = ad["faces"]
        cc = np.repeat(C, len(pr), axis=0)
        sg = ((V[f].mean(1) - cc[f].mean(1)) * _face_normals(V, f)).sum(-1)
        ad["flip"] = bool((sg < 0).sum() > (sg > 0).sum())
        if ad["flip"]:
            _flip(ad)
    _set_co(ad["ob"], V)


KNOT_W, KNOT_H, KNOT_PROUD = 0.28, 0.26, 0.072


def _update_knot(state, s):
    """The otaiko: a soft drum on the back, rolled over its pad at the top, with the tail below."""
    kd = state["knot"]
    nx_, kp = kd["n"], kd["kp"]
    yb = _obi_face(state, np.array([0.0]), np.array([1.0]))[0][1]          # obi face at centre back (negative)
    zt = OBI_TOP + 0.078
    hgt = KNOT_H * (0.25 + 0.75 * s)
    zb = zt - hgt
    dtop, dbot = KNOT_PROUD * (0.35 + 0.65 * s), 0.042 * (0.35 + 0.65 * s)
    rr = 0.5 * dtop
    pts = []
    for u in np.linspace(0.0, 1.0, kp):
        if u < 0.22:                        # inner face, bottom -> top (against the sash)
            q = u / 0.22
            pts.append((0.0, zb + 0.014 + (zt - rr - zb - 0.014) * q))
        elif u < 0.45:                      # rolled over the pad
            a = math.pi * (u - 0.22) / 0.23
            pts.append((rr - rr * math.cos(a), zt - rr + 1.05 * rr * math.sin(a)))
        elif u < 0.86:                      # outer face, top -> bottom, gently convex
            q = (u - 0.45) / 0.41
            pts.append((dtop + (dbot - dtop) * q + 0.007 * math.sin(math.pi * q), zt - rr + (zb + 0.014 - (zt - rr)) * q))
        else:                               # folded under
            a = math.pi * (u - 0.86) / 0.14
            pts.append((dbot / 2 + dbot / 2 * math.cos(a), zb + 0.014 - 0.014 * math.sin(a)))
    pr = np.array(pts)
    pr = np.vstack([pr, pr[:1]])
    xs = np.linspace(-KNOT_W / 2, KNOT_W / 2, nx_)
    e = np.clip((np.abs(xs) - (KNOT_W / 2 - 0.014)) / 0.014, 0, 1)
    tap = np.sqrt(np.clip(1 - e ** 2, 0, 1)) * 0.90 + 0.10
    cen = np.array([0.5 * dtop * 0.8, 0.5 * (zt + zb)])
    V = np.zeros((nx_, kp + 1, 3))
    for i, x in enumerate(xs):
        p = cen + (pr - cen) * np.array([tap[i], 0.55 + 0.45 * tap[i]])
        bow = 0.006 * math.cos(math.pi * x / KNOT_W) ** 2                 # the face bellies a little
        sag = 0.005 * math.cos(math.pi * x / KNOT_W)
        V[i, :, 0] = x
        V[i, :, 1] = yb - 0.001 - p[:, 0] - bow * (p[:, 0] > 0.6 * dbot)
        V[i, :, 2] = p[:, 1] - sag * (p[:, 1] < 0.5 * (zb + zt))
    V = V.reshape(-1, 3)
    if kd["flip"] is None:
        f = kd["faces"]
        ref = np.array([0.0, yb - 0.5 * dbot, 0.5 * (zt + zb)])
        sg = ((V[f].mean(1) - ref) * _face_normals(V, f)).sum(-1)
        kd["flip"] = bool((sg < 0).sum() > (sg > 0).sum())
        if kd["flip"]:
            _flip(kd)
    _set_co(kd["ob"], V)
    L = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(pr, axis=0), axis=1))]
    uvv = np.stack([np.broadcast_to(xs[:, None] + 0.14, (nx_, kp + 1)), np.broadcast_to(L[None, :], (nx_, kp + 1))],
                   -1).reshape(-1, 2)
    _set_uv(kd["ob"], uvv[kd["faces"]].reshape(-1, 2))
    state["knot_pt"] = np.array([0.0, yb - dtop - 0.008, 0.5 * (zt + zb)])
    # the tail (tare): a flat tongue of the sash hanging below the drum
    td = state["tare"]
    wt = 0.262
    xs = np.linspace(-wt / 2, wt / 2, td["n"])
    drop = 0.075 * s
    zmid = zb + 0.03 - 0.5 * (drop + 0.03)
    C = np.stack([xs, np.full_like(xs, yb - 0.0035 - 0.004 * np.cos(math.pi * xs / wt) ** 2), np.full_like(xs, zmid)], -1)
    N = np.broadcast_to(np.array([0.0, -1.0, 0.0]), C.shape).copy()
    T, N, U = _frames(C, N)
    pr = _close_prof(td["prof"]) * np.array([1.0, drop + 0.03])
    V = (C[:, None, :] + pr[None, :, 0:1] * N[:, None, :] + pr[None, :, 1:2] * U[:, None, :]).reshape(-1, 3)
    if td["flip"] is None:
        f = td["faces"]
        cc = np.repeat(C + 0.0035 * N, len(pr), axis=0)
        sg = ((V[f].mean(1) - cc[f].mean(1)) * _face_normals(V, f)).sum(-1)
        td["flip"] = bool((sg < 0).sum() > (sg > 0).sum())
        if td["flip"]:
            _flip(td)
    _set_co(td["ob"], V)
    uvv = np.stack([np.broadcast_to(xs[:, None] + 0.14, (td["n"], len(pr))),
                    np.broadcast_to(pr[None, :, 1] + 0.3, (td["n"], len(pr)))], -1).reshape(-1, 2)
    _set_uv(td["ob"], uvv[td["faces"]].reshape(-1, 2))


# --------------------------------------------------------------------------- build

def build(collection, origin=(0.0, 0.0, 0.0), materials=None):
    import bpy
    state = {"collection": collection, "materials": materials or {}, "objects": {}}
    root = bpy.data.objects.new("DF_root", None)
    root.empty_display_size = 0.3
    collection.objects.link(root)
    root.location = tuple(float(v) for v in (list(origin) + [0.0] * 3)[:3])
    state["root"] = root

    _build_mannequin(state)
    hull = state["hull"] = _Hull()
    row_j0 = int(round((Z_HEM_J - Z_HEM) / ROW_STEP))
    kim = {"L": _Panel(hull, -1, LV_K, DK, KIMONO_EDGE, 0, hull.row_top_k, 124, True),
           "R": _Panel(hull, +1, LV_K, 0.0, KIMONO_EDGE, 0, hull.row_top_k, 124, True)}
    jub = {"L": _Panel(hull, -1, LV_J, DJ, JUBAN_EDGE, row_j0, hull.nrows - 1, 96, False),
           "R": _Panel(hull, +1, LV_J, 0.0, JUBAN_EDGE, row_j0, hull.nrows - 1, 96, False)}
    state["kim"], state["jub"] = kim, jub
    state["c_tab"] = _c_table(hull, kim["L"].edge[0])

    for tag, pan, matk, thk in (("K", kim, ("kimono", "lining"), THK_K), ("J", jub, ("juban", "juban"), THK_J)):
        for side, p in pan.items():
            v, _ = p.positions(p.edge.max() + 0.1)
            v = v.reshape(-1, 3)
            ref = np.zeros((len(p.faces), 3))
            ref[:, 2] = v[p.faces].mean(1)[:, 2].clip(0, Z_C + 0.1)
            p.faces = _orient(v, p.faces, ref)
            ob = _new_obj(state, "DF_%s_panel_%s" % (tag, side), v, p.faces,
                          [_mat(state, matk[0]), _mat(state, matk[1])], uv=(tag == "K"))
            _solidify(ob, thk)

    state["sleeves"] = []
    for tag in ("K", "J"):
        for sx in (-1, 1):
            sl = _Sleeve(sx, tag)
            v = sl.positions(1.0).reshape(-1, 3)
            cen = v[sl.faces].mean(1)
            sg = _face_normals(v, sl.faces)[:, 1] * cen[:, 1]
            if (sg < 0).sum() > (sg > 0).sum():
                sl.faces = sl.faces[:, ::-1].copy()
            mats = [_mat(state, "kimono")] if tag == "K" else [_mat(state, "juban")]
            sl.ob = _new_obj(state, "DF_%s_sleeve_%s" % (tag, "L" if sx < 0 else "R"), v, sl.faces, mats,
                             uv=(tag == "K"))
            state["sleeves"].append(sl)

    # rolled edges (the lining peeping out): hem + front edge of each kimono half, sleeve openings
    state["rolls"] = {}
    rp = _circle(0.0028, 8)
    for side, p in kim.items():
        p.i_roll = int(np.nonzero(p.zn >= 0.26)[0][0])
        state["rolls"][side] = _tube_obj(state, "DF_K_edge_%s" % side, p.nc + p.i_roll - 1, rp, "lining")
    for sl in state["sleeves"]:
        if sl.tag == "K":
            state["rolls"][sl.ob.name] = _tube_obj(state, sl.ob.name + "_edge", 48, rp, "lining")

    _collar_setup(state)
    _obi_setup(state)
    update(state, {k: 1.0 for k in LAYERS})
    state["anchors_local"] = _anchor_points(state)
    update(state, {})
    return state


# --------------------------------------------------------------------------- update

def update(state, t):
    t = {k: float(min(1.0, max(0.0, (t or {}).get(k, 0.0)))) for k in LAYERS}
    ob = state["objects"]
    eps = 1e-3
    for tag, key, pan in (("J", "juban", state["jub"]), ("K", "kimono", state["kim"])):
        tv = t[key]
        on = tv > eps
        emax = max(pan["L"].edge.max(), pan["R"].edge.max()) + 0.02
        ext = {"R": emax * _ramp(tv, 0.0, 0.72), "L": emax * _ramp(tv, 0.22, 1.0)}
        s_fold = t["ohashori"] if tag == "K" else 0.0
        for side, p in pan.items():
            o = ob["DF_%s_panel_%s" % (tag, side)]
            vis = on and ext[side] > math.radians(2.0)
            _show(o, vis)
            if tag == "K":
                _show(state["rolls"][side]["ob"], vis)
            if not vis:
                continue
            P, psi = p.positions(ext[side], s_fold)
            _set_co(o, P.reshape(-1, 3))
            if tag == "K":
                _set_uv(o, _panel_uv(state, p, P, psi, s_fold))
                # the rolled edge: along the hem, then up the front edge to where the collar starts
                C = np.vstack([P[0, :, :], P[1:p.i_roll, -1, :]])
                Nn = _unit(C * np.array([1.0, 1.0, 0.0]))
                out = np.zeros_like(C)
                out[:p.nc, 2] = -1.0
                tang = _unit(np.cross(np.array([0.0, 0.0, 1.0]), Nn[p.nc:])) * p.sx
                out[p.nc:] = tang
                sc = np.r_[np.ones(p.nc), np.linspace(1.0, 0.25, p.i_roll - 1)]
                _tube_set(state["rolls"][side], C - 0.0012 * Nn + 0.0012 * out, Nn, sc)
        cd = state["collars"][tag]
        cvis = on and min(ext["L"], ext["R"]) > math.radians(4.0)
        if cvis:
            cvis = _update_collar(state, tag, ext)
        _show(cd["ob"], cvis)
        g = _ramp(tv, 0.10, 0.70)
        for sl in state["sleeves"]:
            if sl.tag != tag:
                continue
            vis = on and g > 0.02
            _show(sl.ob, vis)
            rd = state["rolls"].get(sl.ob.name)
            if vis:
                P = sl.positions(g)
                _set_co(sl.ob, P.reshape(-1, 3))
                if tag == "K":
                    _set_uv(sl.ob, sl.uv())
                    E = _resample(sl.opening(P), rd["n"])
                    Nn = _unit(E - np.array([sl.sx * (_XOUT - 0.02), 0.0, 0.0]) * np.array([1.0, 0.0, 0.0])
                               - np.array([0.0, 0.0, 1.0]) * E[:, 2:3] * np.array([0.0, 0.0, 1.0]))
                    Nn = _unit(Nn * np.array([0.25, 1.0, 0.0]) + np.array([sl.sx * 0.5, 0.0, 0.0]))
                    _tube_set(rd, E + np.array([sl.sx * 0.0006, 0.0, 0.0]), Nn)
            if rd is not None:
                _show(rd["ob"], vis)

    so = t["obi"]
    _show(ob["DF_obi"], so > eps)
    if so > eps:
        _update_obi(state, _ramp(so, 0.0, 1.0))
    sa = t["obiage"]
    _show(ob["DF_obiage"], sa > eps)
    if sa > eps:
        _update_obiage(state, float(_ss(sa)))
    sj = t["obijime"]
    _show(ob["DF_obijime"], sj > eps)
    kv = _update_cord(state, sj) if sj > eps else False
    _show(ob["DF_obijime_knot"], bool(kv))
    sk = t["knot"]
    _show(ob["DF_knot"], sk > eps)
    _show(ob["DF_knot_tail"], sk > eps)
    if sk > eps:
        _update_knot(state, float(_ss(sk)))


# --------------------------------------------------------------------------- anchors

def _anchor_points(state):
    hull, kim, jub = state["hull"], state["kim"], state["jub"]
    A = {}
    fr = np.array([math.pi])
    # the white juban collar where it shows on the wearer's right of the V
    p = jub["R"]
    i = int(np.argmin(np.abs(p.zn - 1.0))) if False else int(np.argmin(np.abs(hull.zback[np.clip(p.rows - hull.n0, 0, None)] - 1.33)))
    A["form_juban_collar"] = hull.pts(p.rows[i], p.edge[i] - 0.10, LV_J + 0.006, p.sx)
    # where the left collar crosses over the right one
    p = kim["L"]
    P, _ = p.positions(p.edge.max() + 0.1)
    E = P[:, -1, :]
    i = int(np.argmin(np.abs(E[:, 0]) + 10.0 * (E[:, 2] < 1.15)))
    A["form_overlap"] = E[i] + np.array([0.0, 0.006, 0.0])
    A["form_ohashori"] = hull.ring(np.array([Z_FOLD + 0.033]), fr, LV_K + DK + FOLD + 0.002)[0]
    A["form_obi"] = _obi_face(state, fr, np.array([OBI_BOT + 0.040]))[0]
    A["form_obiage"] = _obi_face(state, fr, np.array([OBI_TOP + 0.008]))[0]
    A["form_obijime"] = np.asarray(state["cordknot_pt"])
    A["form_knot"] = np.asarray(state["knot_pt"])
    A["form_nape"] = hull.pts(p.rows[-3], np.array(0.0), LV_K, p.sx)
    A["form_hem"] = hull.ring(np.array([Z_HEM + 0.015]), fr, LV_K + DK + 0.002)[0]
    sl = [s for s in state["sleeves"] if s.tag == "K" and s.sx < 0][0]
    S = sl.positions(1.0)
    A["form_sleeve"] = S[sl.NA // 2, sl.NB + sl.NH // 2]
    return {k: np.asarray(v, float).reshape(3) for k, v in A.items()}


def anchors(state):
    import bpy
    from mathutils import Vector
    try:
        bpy.context.view_layer.update()
    except Exception:
        pass
    mw = state["root"].matrix_world.copy()
    return {k: tuple(mw @ Vector(tuple(float(c) for c in v))) for k, v in state["anchors_local"].items()}


# --------------------------------------------------------------------------- test harness

def _test_hall(scene, xy):
    """A bright stand-in for the hall: tatami-coloured floor, pale walls, a wall of daylight."""
    import bpy
    fx, fy = xy

    def plain(name, rgb, rough=0.8):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        b = m.node_tree.nodes.get("Principled BSDF")
        b.inputs["Base Color"].default_value = tuple(rgb) + (1.0,)
        b.inputs["Roughness"].default_value = rough
        return m

    def quad(name, pts, mat):
        me = bpy.data.meshes.new(name)
        me.from_pydata(pts, [], [(0, 1, 2, 3)])
        o = bpy.data.objects.new(name, me)
        scene.collection.objects.link(o)
        me.materials.append(mat)
        return o

    S, Hh = 4.2, 3.4
    tat = plain("T_tatami", (0.52, 0.47, 0.27), 0.65)
    nt = tat.node_tree
    wv = nt.nodes.new("ShaderNodeTexWave")
    wv.inputs["Scale"].default_value = 260.0
    wv.inputs["Distortion"].default_value = 0.4
    bp = nt.nodes.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.35
    bp.inputs["Distance"].default_value = 0.001
    nt.links.new(wv.outputs["Fac"], bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], nt.nodes["Principled BSDF"].inputs["Normal"])
    wall = plain("T_wall", (0.62, 0.58, 0.50), 0.9)
    gold = plain("T_gold", (0.62, 0.47, 0.20), 0.45)
    quad("T_floor", [(fx - S, fy - S, 0), (fx + S, fy - S, 0), (fx + S, fy + S, 0), (fx - S, fy + S, 0)], tat)
    quad("T_ceil", [(fx - S, fy - S, Hh), (fx - S, fy + S, Hh), (fx + S, fy + S, Hh), (fx + S, fy - S, Hh)], wall)
    quad("T_back", [(fx - S, fy - 3.4, 0), (fx - S, fy - 3.4, Hh), (fx + S, fy - 3.4, Hh), (fx + S, fy - 3.4, 0)], gold)
    quad("T_front", [(fx - S, fy + S, 0), (fx + S, fy + S, 0), (fx + S, fy + S, Hh), (fx - S, fy + S, Hh)], wall)
    quad("T_east", [(fx - 3.6, fy - S, 0), (fx - 3.6, fy + S, 0), (fx - 3.6, fy + S, Hh), (fx - 3.6, fy - S, Hh)], wall)
    # the shoji side: a tall, wide, soft source (the figure faces +Y here, so west is at +X)
    ld = bpy.data.lights.new("T_shoji", "AREA")
    ld.shape = "RECTANGLE"
    ld.size, ld.size_y = 7.0, 2.4
    ld.energy = 520.0
    ld.color = (1.0, 0.96, 0.90)
    lo = bpy.data.objects.new("T_shoji", ld)
    lo.location = (fx + 3.6, fy + 0.4, 1.5)
    lo.rotation_euler = (0.0, math.radians(90.0), 0.0)
    scene.collection.objects.link(lo)
    w = scene.world or bpy.data.worlds.new("T_world")
    scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = (0.95, 0.97, 1.0, 1)
    bg.inputs[1].default_value = 0.25


def _camera(scene, name, target, az_deg, dist=3.1, height=1.25, lens=52.0):
    import bpy
    from mathutils import Vector
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cam = bpy.data.objects.new(name, cd)
    scene.collection.objects.link(cam)
    a = math.radians(az_deg)
    tx, ty, tz = target
    cam.location = (tx + dist * math.sin(a), ty + dist * math.cos(a), height)
    d = Vector((tx, ty, tz)) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return cam


def _main():
    import time
    import bpy
    from PIL import Image
    out = os.environ.get("DF_OUT", "/tmp/claude-0/-home-user-aia-slides/d08b3256-05de-5c3d-9318-a3845ce8df89/"
                         "scratchpad/blender-form")
    os.makedirs(out, exist_ok=True)
    res = tuple(int(v) for v in os.environ.get("DF_RES", "640x800").split("x"))
    spp = int(os.environ.get("DF_SPP", "40"))
    which = os.environ.get("DF_WHICH", "sheet,strip").split(",")
    tagname = os.environ.get("DF_TAG", "")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    common.setup_cycles(sc, res=res, samples=spp, preview=True)
    sc.render.threads_mode = "FIXED"
    sc.render.threads = int(os.environ.get("DF_THREADS", "3"))
    origin = (0.0, 0.0, 0.0)
    coll = bpy.data.collections.new("dressform")
    sc.collection.children.link(coll)
    t0 = time.time()
    st = build(coll, origin=origin)
    t1 = time.time()
    full = {k: 1.0 for k in LAYERS}
    update(st, full)
    t2 = time.time()
    update(st, {"juban": 1.0, "kimono": 0.55})
    t3 = time.time()
    print("build %.2fs  update(all ones) %.3fs  update(mid wrap) %.3fs" % (t1 - t0, t2 - t1, t3 - t2))
    _test_hall(sc, origin[:2])
    tgt = (origin[0], origin[1], 0.86)

    def shoot(name, az, tt, cam_res=None, **kw):
        update(st, tt)
        cam = _camera(sc, "C_" + name, kw.pop("target", tgt), az, **kw)
        sc.camera = cam
        sc.render.resolution_x, sc.render.resolution_y = cam_res or res
        p = os.path.join(out, name + ".png")
        sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        return p

    def sheet(paths, name):
        ims = [Image.open(p) for p in paths]
        W_, H_ = ims[0].size
        sh = Image.new("RGB", (W_ * len(ims), H_))
        for i, im in enumerate(ims):
            sh.paste(im, (i * W_, 0))
        sh.save(os.path.join(out, name))
        print("wrote", os.path.join(out, name))

    if "sheet" in which:
        views = [("front", 0), ("q34", 40), ("side", 90), ("back", 180)]
        sheet([shoot("v_" + n, a, full) for n, a in views], "sheet_turntable%s.png" % tagname)
    if "one" in which:
        az = float(os.environ.get("DF_AZ", "0"))
        tt = dict(full)
        for kv in os.environ.get("DF_T", "").split(","):
            if "=" in kv:
                k, v = kv.split("=")
                tt[k] = float(v)
        shoot("one%s" % tagname, az, tt)
    if "close" in which:
        # DF_CLOSE="az,z,dist;az,z,dist;..." close views of the fully dressed figure (or DF_T overrides)
        tt = dict(full)
        for kv in os.environ.get("DF_T", "").split(","):
            if "=" in kv:
                k, v = kv.split("=")
                tt[k] = float(v)
        shots = []
        for i, spec in enumerate(os.environ.get("DF_CLOSE", "0,1.25,1.3").split(";")):
            az, zz, dd = (float(v) for v in spec.split(","))
            shots.append(shoot("c_%d%s" % (i, tagname), az, tt, target=(0, 0, zz), dist=dd, height=zz + 0.08 * dd,
                               lens=50.0))
        sheet(shots, "sheet_close%s.png" % tagname)
    if "strip" in which:
        half = (res[0] // 2, res[1] // 2)
        tt = {k: 0.0 for k in LAYERS}
        frames = [shoot("s_0", 0, dict(tt), half)]
        for i, k in enumerate(LAYERS):
            tt[k] = 1.0
            frames.append(shoot("s_%d" % (i + 1), 0, dict(tt), half))
        frames.append(shoot("s_%d" % (len(LAYERS) + 1), 180, dict(tt), half))
        sheet(frames, "strip_buildup%s.png" % tagname)
    if "mid" in which:
        half = (res[0] // 2, res[1] // 2)
        mids = [{"juban": 0.5}, {"juban": 1, "kimono": 0.3}, {"juban": 1, "kimono": 0.6}, {"juban": 1, "kimono": 0.85},
                {"juban": 1, "kimono": 1, "ohashori": 0.5}, {"juban": 1, "kimono": 1, "ohashori": 1, "obi": 0.5},
                {"juban": 1, "kimono": 1, "ohashori": 1, "obi": 1, "obiage": 0.5, "obijime": 0.5, "knot": 0.5}]
        sheet([shoot("m_%d" % i, 30, m, half) for i, m in enumerate(mids)], "strip_mid%s.png" % tagname)
    print("anchors", {k: tuple(round(c, 3) for c in v) for k, v in anchors(st).items()})


if __name__ == "__main__":
    _main()
