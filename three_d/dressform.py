"""dressform.py - the museum dress form and the dressing layers (kitsuke), stages E and F.

API (called by scene.py / render.py)
    state = build(collection, origin=(2.7, 0.0, 0.0), materials=None)
    update(state, t)      t: dict of 0..1 floats: juban, kimono, ohashori, obi, obiage, obijime, knot
    anchors(state)        dict name -> world (x, y, z), after any parent transform of state["root"]

Everything build() creates is parented to one empty, state["root"], placed at `origin` and facing
+Y. Rotate / move / re-parent that empty freely; anchors() reads evaluated world matrices.
`materials` may be a dict kind -> bpy material overriding common.fabric_material(kind) for the
kinds 'kimono', 'lining', 'juban', 'obi', 'obiage', 'obijime', 'mannequin', 'lacquer'.

Geometry is built in code only: a smooth signed-distance "padded body" (the hull) defines nested
iso-surfaces; every cloth layer is a ray-cast of the hull at its own iso level, so layers can never
cross (no z-fighting). The mannequin is a surface-nets mesh of its own SDF.

UV CONVENTION (kimono surfaces, the 'kimono' material reads the design atlas through UVs):
    body panels: common.worn_uv(c, h, c_ref) per face corner, where
        c = (arc length round the robe from centre back, measured on the hull at hip height) / K,
            negative towards the wearer's LEFT. K (about 0.70, stored in state["uv_k"]) is chosen so
            that the left front edge c = -0.87 lands about 9 cm right of centre front; i.e. the
            garment's width is compressed by K round the body (side seams at the sides, okumi seam
            near centre front).
        h = metres below the shoulder ridge above the ohashori fold line; below the fold (the
            skirt after the fold) h = 1.60 - (z - hem z), so the hem is at h = 1.60.
    sleeves: common.garment_uv(x, y) with x = +/-(0.36 + metres along the arm from the sleeve
        seam), y = +d on the front layer / -d on the back layer, d = metres from the top fold.
    collar band: common.collar_uv(a, b), a across the band 0.02..0.075, b along it from the
        wearer's-right lower end.
    obi and knot: metres, u along the sash, v across (as the 'obi' material expects).
"""
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
import common  # noqa: E402

# --------------------------------------------------------------------------- numbers (metres, local)

Z_HEM = 0.045            # kimono hem, just above the feet
Z_HEM_JUBAN = 0.10
Z_SH = 1.36              # shoulder line at the neck base
Z_NECK_TOP = 1.48
OBI_BOT, OBI_TOP = 0.955, 1.110
Z_FOLD = OBI_BOT - 0.066         # ohashori lower edge
Z_KOSHI = Z_FOLD + 0.145         # waist tie under the obi (hidden)
Z_C = 1.20               # centre of the upper (elevation) ray fan
R_UP = 0.16
ARM_DEG = 35.0
J = np.array([0.168, 0.0, 1.295])        # right shoulder joint (mirrored for the left)
CA, SA = math.cos(math.radians(ARM_DEG)), math.sin(math.radians(ARM_DEG))
D_ARM = np.array([CA, 0.0, -SA])
N_ARM = np.array([SA, 0.0, CA])
ARM_LEN = 0.29

ISO_J = 0.000            # juban surface
DJ = 0.008               # juban left-over-right lift
ISO_K = 0.019            # kimono surface
DK = 0.013               # kimono left-over-right lift
FOLD = 0.009             # ohashori layer
THK_K, THK_J = 0.003, 0.002

# collar lines, front view: x of the wearer's LEFT panel's edge as a function of z (panel at x < edge)
KIMONO_EDGE = ((0.0, 0.095), (1.02, 0.095), (1.215, 0.0), (1.33, -0.048), (1.40, -0.066), (1.60, -0.072))
JUBAN_EDGE = ((0.0, 0.06), (1.00, 0.06), (1.25, 0.0), (1.34, -0.036), (1.41, -0.053), (1.60, -0.058))


# --------------------------------------------------------------------------- SDF primitives (numpy)

def _smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b + (a - b) * h - k * h * (1.0 - h)


def _smax(a, b, k):
    return -_smin(-a, -b, k)


def _ellipsoid(p, c, r):
    q = (p - np.asarray(c)) / np.asarray(r)
    k0 = np.sqrt((q * q).sum(-1))
    q1 = q / np.asarray(r)
    k1 = np.sqrt((q1 * q1).sum(-1)) + 1e-9
    return k0 * (k0 - 1.0) / k1


def _ellcyl(p, A, B):
    x, y = p[..., 0] / A, p[..., 1] / B
    k0 = np.sqrt(x * x + y * y)
    k1 = np.sqrt((x / A) ** 2 + (y / B) ** 2) + 1e-9
    return k0 * (k0 - 1.0) / k1


def _capsule(p, a, b, ra, rb):
    a, b = np.asarray(a), np.asarray(b)
    ba = b - a
    t = np.clip(((p - a) * ba).sum(-1) / (ba @ ba), 0.0, 1.0)
    q = a + t[..., None] * ba
    return np.sqrt(((p - q) ** 2).sum(-1)) - (ra + (rb - ra) * t)


_HZ = np.array([0.00, 0.50, 0.85, 1.00, 1.15, 1.26])
_HA = np.array([0.172, 0.180, 0.187, 0.182, 0.183, 0.185])
_HB = np.array([0.138, 0.143, 0.149, 0.145, 0.147, 0.145])


def hull_sdf(p):
    """The padded, dressed body (iso 0 = the juban). Symmetric in x, no arms."""
    z = p[..., 2]
    A, B = np.interp(z, _HZ, _HA), np.interp(z, _HZ, _HB)
    d = _smax(_ellcyl(p, A, B), z - 1.25, 0.08)
    d = _smin(d, _ellipsoid(p, (0, -0.004, 1.265), (0.214, 0.124, 0.094)), 0.06)
    for s in (-1, 1):
        d = _smin(d, _ellipsoid(p, (s * 0.172, 0.0, 1.272), (0.072, 0.072, 0.072)), 0.05)
    d = _smin(d, _capsule(p, (0, -0.01, 1.20), (0, -0.01, 1.62), 0.060, 0.060), 0.03)
    return d


_MZ = np.array([0.70, 0.85, 0.95, 1.03, 1.12, 1.20, 1.26])
_MA = np.array([0.150, 0.168, 0.152, 0.132, 0.146, 0.160, 0.160])
_MB = np.array([0.112, 0.126, 0.114, 0.100, 0.114, 0.124, 0.116])


def mannequin_sdf(p):
    z = p[..., 2]
    A, B = np.interp(z, _MZ, _MA), np.interp(z, _MZ, _MB)
    d = _smax(_ellcyl(p, A, B), z - 1.25, 0.07)
    d = _smax(d, 0.735 - z, 0.02)
    d = _smin(d, _ellipsoid(p, (0, -0.004, 1.262), (0.196, 0.110, 0.080)), 0.05)
    for s in (-1, 1):
        js = J * np.array([s, 1, 1])
        ds = D_ARM * np.array([s, 1, 1])
        d = _smin(d, _ellipsoid(p, (s * 0.168, 0.0, 1.268), (0.060, 0.060, 0.060)), 0.04)
        d = _smin(d, _capsule(p, js, js + ARM_LEN * ds, 0.046, 0.035), 0.03)
    neck = _smax(_capsule(p, (0, -0.01, 1.22), (0, -0.01, 1.70), 0.050, 0.050), z - Z_NECK_TOP, 0.006)
    return _smin(d, neck, 0.03)


def _grad(f, p, e=1e-3):
    g = np.empty_like(p)
    for i in range(3):
        dp = np.zeros(3)
        dp[i] = e
        g[..., i] = (f(p + dp) - f(p - dp)) / (2 * e)
    return g


def _unit(v):
    return v / (np.linalg.norm(v, axis=-1, keepdims=True) + 1e-12)


def _cast(o, d, iso, f=hull_sdf, hi=0.45, it=22):
    """First crossing of f = iso along rays o + s d (o inside). Vectorised bisection."""
    o, d = np.broadcast_arrays(o, d)
    shape = o.shape[:-1]
    lo = np.zeros(shape)
    hh = np.full(shape, hi)
    iso = np.broadcast_to(iso, shape)
    for _ in range(it):
        m = 0.5 * (lo + hh)
        out = f(o + m[..., None] * d) > iso
        hh = np.where(out, m, hh)
        lo = np.where(out, lo, m)
    return o + (0.5 * (lo + hh))[..., None] * d


def _project(p, iso, f=hull_sdf, it=3):
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
    return m if m is not None else common.fabric_material(kind)


def _new_obj(state, name, verts, faces, mats, smooth=True, uv=False):
    import bpy
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(p) for p in verts], [], [tuple(int(k) for k in q) for q in faces])
    me.update()
    if smooth:
        try:
            me.shade_smooth()
        except AttributeError:
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
    me = ob.data
    arr = np.ascontiguousarray(uv, dtype=np.float32).ravel()
    lay = me.uv_layers[0]
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
    m.material_offset_rim = mat_off
    return m


def _sweep(C, N, U, prof, closed_curve=False):
    """Sweep a closed 2D profile (m,2) in the (N, U) frame along points C (n,3).
    Profile may be (n,m,2) for per-sample profiles. Returns verts (n*m,3), faces, uv (loops)."""
    n = len(C)
    prof = np.broadcast_to(prof, (n,) + np.shape(prof)[-2:])
    m = prof.shape[1]
    V = C[:, None, :] + prof[..., 0:1] * N[:, None, :] + prof[..., 1:2] * U[:, None, :]
    return V.reshape(-1, 3), m


def _sweep_faces(n, m, closed_curve=False):
    # profile ring closed (m), curve open/closed
    return _grid_faces(n + (1 if closed_curve else 0), m, close_c=True) if not closed_curve else \
        _grid_faces(n, m, close_c=True)


def _sweep_uv(C, prof, faces, m):
    n = len(C)
    seg = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(C, axis=0), axis=1))]
    p = np.asarray(prof)
    if p.ndim == 3:
        p = p[len(p) // 2]
    pl = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(np.vstack([p, p[:1]]), axis=0), axis=1))]
    i_row = faces // m
    j_col = faces % m
    # unwrap ring seam per face
    jj = j_col.astype(float)
    wrap = (jj.max(1, keepdims=True) == m - 1) & (jj.min(1, keepdims=True) == 0)
    jj = np.where(wrap & (jj == 0), m, jj)
    u = seg[i_row]
    v = pl[jj.astype(int)]
    return np.stack([u, v], -1).reshape(-1, 2)


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


def _circle(r, k=10, cn=0.0, cu=0.0):
    a = np.linspace(0, 2 * math.pi, k, endpoint=False)
    return np.stack([cn + r * np.cos(a), cu + r * np.sin(a)], -1)


def _frames_from_normal(C, N):
    T = np.gradient(C, axis=0)
    T = _unit(T)
    N = _unit(N - (N * T).sum(-1, keepdims=True) * T)
    U = np.cross(T, N)
    return T, N, U


# --------------------------------------------------------------------------- the mannequin

def _surface_nets(f, lo, hi, h):
    xs = np.arange(lo[0], hi[0] + h, h)
    ys = np.arange(lo[1], hi[1] + h, h)
    zs = np.arange(lo[2], hi[2] + h, h)
    X, Y, Z = np.meshgrid(xs, ys, zs, indexing="ij")
    F = f(np.stack([X, Y, Z], -1))
    nx, ny, nz = F.shape
    inside = F < 0
    S = np.zeros((nx - 1, ny - 1, nz - 1, 3))
    Cn = np.zeros((nx - 1, ny - 1, nz - 1))
    corners = [(0, 0, 0), (1, 0, 0), (0, 1, 0), (1, 1, 0), (0, 0, 1), (1, 0, 1), (0, 1, 1), (1, 1, 1)]
    edges = [(0, 1), (2, 3), (4, 5), (6, 7), (0, 2), (1, 3), (4, 6), (5, 7), (0, 4), (1, 5), (2, 6), (3, 7)]

    def sl(c):
        return (slice(c[0], nx - 1 + c[0]), slice(c[1], ny - 1 + c[1]), slice(c[2], nz - 1 + c[2]))
    for a, b in edges:
        ca, cb = corners[a], corners[b]
        fa, fb = F[sl(ca)], F[sl(cb)]
        m = (fa < 0) != (fb < 0)
        t = np.where(m, fa / np.where(m, fa - fb, 1.0), 0.0)
        pa = np.array(ca, float)
        pb = np.array(cb, float)
        pos = pa + t[..., None] * (pb - pa)
        S += np.where(m[..., None], pos, 0.0)
        Cn += m
    act = Cn > 0
    idx = -np.ones(act.shape, dtype=np.int64)
    idx[act] = np.arange(act.sum())
    ii, jj, kk = np.nonzero(act)
    local = S[act] / Cn[act][:, None]
    V = np.stack([xs[ii], ys[jj], zs[kk]], -1) + local * h
    faces = []
    # x-edges
    for axis in range(3):
        a0 = inside
        sl0 = [slice(None)] * 3
        sl1 = [slice(None)] * 3
        sl0[axis] = slice(0, -1)
        sl1[axis] = slice(1, None)
        ch = a0[tuple(sl0)] != a0[tuple(sl1)]
        e = np.argwhere(ch)
        o1, o2 = [ax for ax in range(3) if ax != axis]
        ok = (e[:, o1] > 0) & (e[:, o2] > 0) & (e[:, o1] < [nx, ny, nz][o1] - 1) & (e[:, o2] < [nx, ny, nz][o2] - 1)
        e = e[ok]
        flip = a0[tuple(e.T)]

        def cell(d1, d2):
            c = e.copy()
            c[:, o1] -= d1
            c[:, o2] -= d2
            return idx[tuple(c.T)]
        q = np.stack([cell(1, 1), cell(0, 1), cell(0, 0), cell(1, 0)], -1)
        if axis == 1:
            flip = ~flip
        q = np.where(flip[:, None], q[:, ::-1], q)
        faces.append(q)
    Fc = np.vstack(faces)
    Fc = Fc[(Fc >= 0).all(1)]
    return V, Fc


def _build_mannequin(state):
    V, Fc = _surface_nets(mannequin_sdf, (-0.48, -0.16, 0.70), (0.48, 0.16, 1.50), 0.0055)
    V = _project(V, 0.0, mannequin_sdf, it=3)
    ref = np.zeros_like(V[Fc].mean(1))
    cen = V[Fc].mean(1)
    # inside reference: nearest point on the body axis / arm axis is good enough via gradient
    g = _grad(mannequin_sdf, cen)
    n = _face_normals(V, Fc)
    if ((g * n).sum(-1) < 0).sum() > len(Fc) / 2:
        Fc = Fc[:, ::-1]
    del ref
    _new_obj(state, "DF_mannequin", V, Fc, [_mat(state, "mannequin")])
    # stand: a lathe (base disc + slim pole)
    prof = [(0.0, 0.0), (0.205, 0.0), (0.21, 0.004), (0.21, 0.016), (0.204, 0.022), (0.03, 0.024),
            (0.014, 0.028), (0.0125, 0.04), (0.0125, 0.745), (0.0, 0.745)]
    k = 64
    pts, faces = [], []
    for (r, z) in prof:
        for a in range(k):
            ang = 2 * math.pi * a / k
            pts.append((r * math.cos(ang), r * math.sin(ang), z))
    for i in range(len(prof) - 1):
        for a in range(k):
            b = (a + 1) % k
            faces.append((i * k + a, i * k + b, (i + 1) * k + b, (i + 1) * k + a))
    pts = np.array(pts)
    faces = np.array(faces)
    faces = _orient(pts, faces, np.array([0, 0, 0.38]))
    ob = _new_obj(state, "DF_stand", pts, faces, [_mat(state, "lacquer")])
    ob.data.polygons.foreach_set("use_smooth", [True] * len(ob.data.polygons)) if False else None


# --------------------------------------------------------------------------- robe panels

def _rows(z_hem, phi_top):
    zl = list(np.arange(z_hem, 0.86, 0.010)) + list(np.arange(0.86, 1.06, 0.004)) + \
        list(np.arange(1.06, Z_C, 0.008))
    zl[0] = z_hem
    nu = 34
    ph = list(np.linspace(0.0, phi_top, nu + 1)[1:])
    kind = [0] * len(zl) + [1] * len(ph)
    val = zl + ph
    return np.array(kind), np.array(val)


def _ray(kind, val, psi, sx):
    """Ray origins/directions for row (kind, val) and azimuth psi (radians, from centre back
    towards the panel's side sx = -1 left / +1 right). Arrays broadcast."""
    kind, val, psi = np.broadcast_arrays(kind, val, psi)
    cp = np.where(kind == 0, 1.0, np.cos(val))
    sp = np.where(kind == 0, 0.0, np.sin(val))
    d = np.stack([sx * np.sin(psi) * cp, -np.cos(psi) * cp, sp], -1)
    oz = np.where(kind == 0, val, Z_C)
    o = np.stack([np.zeros_like(oz), np.zeros_like(oz), oz], -1)
    return o, d


def _edge_x(z, table):
    zz, xx = zip(*table)
    return np.interp(z, zz, xx)


def _ridge(x):
    return 1.365 - 0.33 * np.maximum(0.0, np.abs(x) - 0.07)


class _Panel:
    """One wrapped half of a robe (left or right), described by rows and a final edge per row."""

    def __init__(self, sx, iso, lift, edge_tab, z_hem, z_top_back, ncols, fold=False):
        self.sx, self.iso, self.lift, self.fold = sx, iso, lift, fold
        # top row: elevation at which the back of the neck reaches z_top_back
        phis = np.linspace(0.9, 1.45, 200)
        o, d = _ray(np.ones_like(phis), phis, np.zeros_like(phis), sx)
        p = _cast(o, d, iso)
        self.phi_top = float(np.interp(z_top_back, p[:, 2], phis))
        self.kind, self.val = _rows(z_hem, self.phi_top)
        nr = len(self.kind)
        # final edge per row: first psi (from the side towards the front) where x' < x'_edge(z)
        ps = np.radians(np.arange(60.0, 250.0, 0.5))
        K, P = np.meshgrid(self.kind, ps, indexing="ij")
        Vv, _ = np.meshgrid(self.val, ps, indexing="ij")
        o, d = _ray(K, Vv, P, sx)
        pts = _cast(o, d, iso + self.overlap(P))
        xprime = sx * pts[..., 0]
        g = xprime - (-_edge_x(pts[..., 2], edge_tab))
        edge = np.empty(nr)
        for i in range(nr):
            k = np.nonzero(g[i] < 0)[0]
            if len(k) == 0:
                edge[i] = ps[-1]
            else:
                k = k[0]
                g0, g1 = g[i, k - 1], g[i, k]
                edge[i] = ps[k - 1] + (ps[k] - ps[k - 1]) * g0 / (g0 - g1)
        self.edge = edge
        self.nr, self.nc = nr, ncols
        self.faces = _grid_faces(nr, ncols)

    def overlap(self, psi):
        if self.lift <= 0:
            return 0.0 * psi
        return self.lift * _ss((np.degrees(psi) - 125.0) / 23.0)

    def wrinkles(self, psi, z, kind):
        """Outward-only soft undulation (metres of iso)."""
        dpsi = np.degrees(psi)
        w = np.zeros_like(psi)
        low = kind == 0
        # skirt: very soft vertical folds, a little stronger towards the back and the hem
        a = 0.0018 * (0.6 + 0.4 * np.cos(psi)) * (1.0 - 0.5 * _ss((z - 0.2) / 0.6))
        w += np.where(low & (z < OBI_BOT), a * (0.5 + 0.5 * np.sin(psi * 9.0 + 1.7 * np.sin(psi * 4.0 + 0.4))), 0)
        # bunching just above the obi: horizontal soft ridges, mostly at the sides and back
        side = 0.35 + 0.65 * _ss(1.0 - np.abs(dpsi - 70.0) / 80.0)
        band = _ss((z - OBI_TOP + 0.01) / 0.02) * (1.0 - _ss((z - OBI_TOP - 0.07) / 0.06))
        ridges = 0.5 + 0.5 * np.sin((z - OBI_TOP) * 2 * math.pi / 0.028 + 2.2 * np.sin(psi * 3.0) + psi)
        w += np.where(low, 0.0032 * side * band * ridges, 0)
        # diagonal back folds from the shoulder blades towards the waist sides
        diag = 0.5 + 0.5 * np.sin((dpsi * 0.9 + (z - 1.0) * 160.0) * math.pi / 30.0)
        wb = _ss(1.0 - np.abs(dpsi - 45.0) / 35.0) * _ss((z - OBI_TOP) / 0.05) * (1 - _ss((z - 1.30) / 0.05))
        w += 0.0016 * diag * wb
        return w

    def fold_iso(self, z, s):
        if not self.fold or s <= 0:
            return 0.0 * z
        zf = Z_KOSHI - 0.01 + (Z_FOLD - (Z_KOSHI - 0.01)) * s
        amp = FOLD * min(1.0, 3.0 * s)
        up = _ss((z - zf) / 0.007)
        lip = 0.0022 * np.exp(-((z - zf - 0.005) / 0.004) ** 2)
        top = 1.0 - _ss((z - Z_KOSHI - 0.005) / 0.05)
        return (amp * up + lip * min(1.0, 3 * s) * up) * top

    def fold_z(self, s):
        if not self.fold or s <= 0:
            return -1.0
        return Z_KOSHI - 0.01 + (Z_FOLD - (Z_KOSHI - 0.01)) * s

    def positions(self, extent, s_fold=0.0, lead_lift=0.022):
        """extent: radians reached by the wrap. Returns verts (nr*nc,3), psi grid, z grid."""
        e_row = np.minimum(self.edge, extent)
        frac = np.linspace(0.0, 1.0, self.nc)
        psi = e_row[:, None] * frac[None, :]
        K = np.broadcast_to(self.kind[:, None], psi.shape)
        Vv = np.broadcast_to(self.val[:, None], psi.shape)
        o, d = _ray(K, Vv, psi, self.sx)
        zrow = np.where(K == 0, Vv, Z_C + 0.25 * np.sin(Vv))
        iso = self.iso + self.overlap(psi) + self.wrinkles(psi, zrow, K)
        iso = iso + np.where(K == 0, self.fold_iso(zrow, s_fold), 0.0)
        # leading edge curls out while it is still travelling
        pend = _ss((self.edge - extent) / math.radians(15.0))[:, None]
        near = _ss((psi - (e_row[:, None] - math.radians(9.0))) / math.radians(9.0))
        iso = iso + lead_lift * pend * near ** 2
        P = _cast(o, d, iso)
        return P.reshape(-1, 3), psi, P[..., 2]


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


# --------------------------------------------------------------------------- build

def _arc_table(iso):
    ps = np.radians(np.linspace(0, 360, 1441))
    o, d = _ray(np.zeros_like(ps), np.full_like(ps, 0.6), ps, -1)
    p = _cast(o, d, iso)
    seg = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(p[:, :2], axis=0), axis=1))]
    return ps, seg


def build(collection, origin=(2.7, 0.0, 0.0), materials=None):
    import bpy
    state = {"collection": collection, "materials": materials or {}, "objects": {}}
    root = bpy.data.objects.new("DF_root", None)
    root.empty_display_size = 0.3
    collection.objects.link(root)
    root.location = tuple(float(v) for v in (list(origin) + [0.0] * 3)[:3])
    state["root"] = root

    _build_mannequin(state)

    # arc length / UV scale
    ps, seg = _arc_table(ISO_K)
    state["arc"] = (ps, seg)

    # ---- panels
    zb_k, zb_j = 1.425, 1.437
    kim = {"L": _Panel(-1, ISO_K, DK, KIMONO_EDGE, Z_HEM, zb_k, 120, fold=True),
           "R": _Panel(+1, ISO_K, 0.0, KIMONO_EDGE, Z_HEM, zb_k, 120, fold=True)}
    jub = {"L": _Panel(-1, ISO_J, DJ, JUBAN_EDGE, Z_HEM_JUBAN, zb_j, 90),
           "R": _Panel(+1, ISO_J, 0.0, JUBAN_EDGE, Z_HEM_JUBAN, zb_j, 90)}
    state["kim"], state["jub"] = kim, jub
    edge_low = kim["L"].edge[0]
    state["uv_k"] = float(np.interp(edge_low, ps, seg) / 0.87)

    for tag, pan, matk, thk in (("K", kim, ("kimono", "lining"), THK_K), ("J", jub, ("juban", "juban"), THK_J)):
        for side, p in pan.items():
            v, _, _ = p.positions(p.edge.max() + 0.1)
            ref = np.zeros_like(v[p.faces].mean(1))
            ref[:, 2] = v[p.faces].mean(1)[:, 2].clip(0, Z_C)
            p.faces = _orient(v, p.faces, ref)
            ob = _new_obj(state, "DF_%s_panel_%s" % (tag, side), v, p.faces,
                          [_mat(state, matk[0]), _mat(state, matk[1])], uv=(tag == "K"))
            _solidify(ob, thk)

    # ---- sleeves (kimono and juban)
    for tag, scale, iso_push in (("K", 1.0, ISO_K + 0.028), ("J", 0.93, ISO_J + 0.012)):
        for sx in (-1, 1):
            sl = _Sleeve(sx, scale, iso_push, tag)
            state.setdefault("sleeves", []).append(sl)
            v = sl.positions(1.0)
            sl.faces = _orient(v, sl.faces, sl.ref(v))
            mats = [_mat(state, "kimono"), _mat(state, "lining")] if tag == "K" else [_mat(state, "juban")] * 2
            ob = _new_obj(state, "DF_%s_sleeve_%s" % (tag, "L" if sx < 0 else "R"), v, sl.faces, mats,
                          uv=(tag == "K"))
            _solidify(ob, THK_K if tag == "K" else THK_J)
            sl.ob = ob

    # ---- collars, hem rolls, sleeve rolls, obi & co: created with full geometry, then update()
    _collar_setup(state)
    _obi_setup(state)
    update(state, {k: 1.0 for k in ("juban", "kimono", "ohashori", "obi", "obiage", "obijime", "knot")})
    state["anchors_local"] = _anchor_points(state)
    update(state, {})
    return state


# --------------------------------------------------------------------------- sleeves

class _Sleeve:
    A0 = 0.055
    WIDTH = 0.36
    NA, NR = 46, 72

    def __init__(self, sx, scale, iso_push, tag):
        self.sx, self.scale, self.iso_push, self.tag = sx, scale, iso_push, tag
        self.width = self.WIDTH * (0.97 if tag == "J" else 1.0)
        self.faces = _grid_faces(self.NA, self.NR + 1)   # ring opened at the bottom (seam duplicated)
        self.ob = None

    def ref(self, v):
        vv = v.reshape(self.NA, self.NR + 1, 3)
        axis = vv.mean(1, keepdims=True)
        axis = np.broadcast_to(axis, vv.shape).reshape(-1, 3)
        return axis[self.faces[:, 0]]

    def positions(self, grow):
        sc = self.scale
        a = np.linspace(0.0, self.width * max(grow, 1e-3), self.NA)
        amax = self.width
        Q = J[None, :] + (self.A0 + a)[:, None] * D_ARM[None, :]
        rT = 0.062 * sc if self.tag == "K" else 0.054
        ztop = Q[:, 2] + rT / CA
        drop = 0.44 if self.tag == "K" else 0.40
        z_out = (J[2] + (self.A0 + amax) * D_ARM[2]) + rT / CA - drop
        zb = z_out + 0.05 * (1.0 - a / amax)
        # rounded bottom corners
        rc = 0.04
        zb = zb + np.where(a > amax - rc, rc - np.sqrt(np.clip(rc ** 2 - (a - (amax - rc)) ** 2, 0, None)), 0)
        zb = zb + np.where(a < rc, rc - np.sqrt(np.clip(rc ** 2 - (rc - a) ** 2, 0, None)), 0) * 0.8
        gb = 0.014
        # front half profile: u in [0,1] from top (0) to bottom centre (1)
        m = self.NR // 2
        u = np.linspace(0.0, 1.0, m + 1)
        col = []
        for k in range(self.NA):
            qz, top = Q[k, 2], ztop[k]
            # arc around the arm: first 22% of u
            ua = np.clip(u / 0.22, 0, 1)
            beta = ua * 0.5 * math.pi
            y_arc = rT * np.sin(beta)
            z_arc = qz + (top - qz) * np.cos(beta)
            uh = np.clip((u - 0.22) / 0.70, 0, 1)
            zh = qz - uh * (qz - (zb[k] + gb))
            yh = gb + (rT - gb) * (1 - uh) ** 1.6
            ub = np.clip((u - 0.92) / 0.08, 0, 1)
            gam = ub * 0.5 * math.pi
            yb = gb * np.cos(gam)
            zbb = zb[k] + gb - gb * np.sin(gam)
            y = np.where(u <= 0.22, y_arc, np.where(u <= 0.92, yh, yb))
            z = np.where(u <= 0.22, z_arc, np.where(u <= 0.92, zh, zbb))
            col.append((y, z))
        Y = np.array([c[0] for c in col])            # (NA, m+1) front half
        Z = np.array([c[1] for c in col])
        # cumulative cloth distance from the top fold (for UVs)
        dist = np.c_[np.zeros(self.NA), np.cumsum(np.hypot(np.diff(Y, axis=1), np.diff(Z, axis=1)), axis=1)]
        # wrist end: sewn below the opening, open above it
        aa = a[:, None]
        d_open = 0.21
        pinch_closed = 0.10 + 0.90 * _ss((amax - aa) / 0.035)
        pinch_open = 0.65 + 0.35 * _ss((amax - aa) / 0.03)
        w_open = _ss((dist - d_open) / 0.03)
        pinch = np.where(grow < 1.0, 1.0, pinch_open * (1 - w_open) + pinch_closed * w_open)
        Y = Y * pinch
        # folds: soft diagonal undulation of both layers, growing towards the bottom
        hang = _ss((dist - 0.05) / 0.25)
        fold = 0.0045 * hang * np.sin((aa * 1.0 + dist * 0.55) * 2 * math.pi / 0.095 + 0.8 * self.sx) * \
            _ss((amax - aa) / 0.04) * _ss(aa / 0.04)
        Yf = np.maximum(Y + fold, 0.25 * Y)
        Yb = np.maximum(Y - 0.6 * fold, 0.25 * Y)
        X = np.broadcast_to(Q[:, 0:1], Y.shape) + 0.006 * hang * np.sin(dist * 21 + aa * 30)
        # ring: bottom(front) -> top -> bottom(back): front reversed then back
        Yr = np.c_[Yf[:, ::-1], -Yb[:, 1:]]
        Zr = np.c_[Z[:, ::-1], Z[:, 1:]]
        Xr = np.c_[X[:, ::-1], X[:, 1:]]
        self.d = np.c_[dist[:, ::-1], -dist[:, 1:]]
        self.a = np.broadcast_to(a[:, None], self.d.shape)
        P = np.stack([Xr * self.sx, Yr, Zr], -1).reshape(-1, 3)
        # rest against the hips instead of passing through them
        for _ in range(2):
            fval = hull_sdf(P)
            bad = fval < self.iso_push
            if bad.any():
                g = _unit(_grad(hull_sdf, P[bad]))
                P[bad] = P[bad] + (self.iso_push - fval[bad])[:, None] * g
        return P

    def uv(self):
        x = self.sx * (common.W + self.a)
        y = np.clip(self.d, -common.SLEEVE, common.SLEEVE)
        uvv = np.stack(common.garment_uv(x, y), -1).reshape(-1, 2)
        return uvv[self.faces].reshape(-1, 2)

    def opening_edge(self, P):
        """Points along the wrist opening (last column), front-bottom -> top -> back-bottom."""
        vv = P.reshape(self.NA, self.NR + 1, 3)[-1]
        dd = self.d[-1]
        m = np.abs(dd) < 0.21
        return vv[m]


# --------------------------------------------------------------------------- collars, rolls

def _collar_curve(p, extent, lower_z, n=110):
    """Param-space path along the panel edge: from the lower end (row z >= lower_z) up the edge,
    then along the top row back to centre back. Clipped to the wrap extent. Returns (kind,val,psi)."""
    rows = np.arange(p.nr)
    zrow = np.where(p.kind == 0, p.val, Z_C + 0.25 * np.sin(p.val))
    i0 = int(np.nonzero(zrow >= lower_z)[0][0])
    # edge part (descending rows reversed later)
    ek, ev, ep = p.kind[i0:], p.val[i0:], p.edge[i0:]
    top = rows[-1]
    tps = np.linspace(p.edge[top], 0.0, 40)[1:]
    K = np.r_[ek, np.full(len(tps), p.kind[top])]
    Vv = np.r_[ev, np.full(len(tps), p.val[top])]
    Ps = np.r_[ep, tps]
    # param-space arc to resample: use (zeta, psi*R)
    zeta = np.where(K == 0, Vv, Z_C + R_UP * Vv)
    L = np.r_[0.0, np.cumsum(np.hypot(np.diff(zeta), np.diff(Ps) * 0.18))]
    # visible: psi <= extent. The path's psi is monotone decreasing along it.
    vis = Ps <= extent + 1e-6
    if not vis.any():
        return None
    s0 = L[np.argmax(vis)]
    s = np.linspace(s0, L[-1], n)
    return (np.interp(s, L, K) > 0.5).astype(int), np.interp(s, L, Vv), np.minimum(np.interp(s, L, Ps), extent)


def _collar_setup(state):
    state["collars"] = {}
    for tag, pan, low, width, thk, inner, kind in (
            ("K", state["kim"], (0.99, 1.15), 0.055, 0.007, 0.006, "kimono"),
            ("J", state["jub"], (1.05, 1.19), 0.050, 0.0055, 0.006, "juban")):
        prof = _stadium(-(width - inner), inner, 0.0, thk, k=20, r=0.0032)
        n_each = 110
        n = 2 * n_each - 1
        m = len(prof)
        faces = _grid_faces(n, m + 1)
        V = np.zeros((n * (m + 1), 3))
        mats = [_mat(state, kind)]
        ob = _new_obj(state, "DF_%s_collar" % tag, V, faces, mats, uv=(tag == "K"))
        state["collars"][tag] = dict(ob=ob, pan=pan, low=low, prof=prof, n_each=n_each, faces=faces,
                                     width=width, inner=inner, thk=thk)
    # hem rolls (fuki) for both kimono panels and the sleeve openings
    state["rolls"] = {}
    prof = _circle(0.0034, 10)
    for side in ("L", "R"):
        n = state["kim"][side].nc
        faces = _grid_faces(n, len(prof) + 1)
        ob = _new_obj(state, "DF_K_hemroll_%s" % side, np.zeros((n * (len(prof) + 1), 3)), faces,
                      [_mat(state, "lining")])
        state["rolls"][side] = dict(ob=ob, prof=prof, faces=faces)
    for sl in state["sleeves"]:
        if sl.tag != "K":
            continue
        n = 40
        faces = _grid_faces(n, len(prof) + 1)
        ob = _new_obj(state, sl.ob.name + "_roll", np.zeros((n * (len(prof) + 1), 3)), faces, [_mat(state, "lining")])
        state["rolls"][sl.ob.name] = dict(ob=ob, prof=prof, faces=faces, n=n)


def _close_prof(prof):
    return np.vstack([prof, prof[:1]])


def _sweep_verts(C, N, U, prof, taper=None):
    pr = _close_prof(prof)
    if taper is not None:
        cen = prof.mean(0)
        pr = cen + (pr[None] - cen) * taper[:, None, None]
    else:
        pr = np.broadcast_to(pr, (len(C),) + pr.shape)
    V = C[:, None, :] + pr[..., 0:1] * N[:, None, :] + pr[..., 1:2] * U[:, None, :]
    return V.reshape(-1, 3)


def _resample(P, n):
    L = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
    s = np.linspace(0, L[-1], n)
    return np.stack([np.interp(s, L, P[:, k]) for k in range(3)], -1)


def _update_collar(state, tag, ext):
    cd = state["collars"][tag]
    pan = cd["pan"]
    pieces = []
    for side, lowz in (("L", cd["low"][0]), ("R", cd["low"][1])):
        p = pan[side]
        r = _collar_curve(p, ext[side], lowz, cd["n_each"])
        if r is None:
            return False
        K, Vv, Ps = r
        o, d = _ray(K, Vv, Ps, p.sx)
        iso = p.iso + p.overlap(Ps) + 0.0015
        C = _cast(o, d, iso)
        pieces.append((C, iso))
    (CL, isoL), (CR, isoR) = pieces
    C = np.vstack([CL, CR[::-1][1:]])
    iso = np.r_[isoL, isoR[::-1][1:]]
    N = _unit(_grad(hull_sdf, C))
    T, N, U = _frames_from_normal(C, N)
    prof = cd["prof"]
    pr = _close_prof(prof)
    # conform each lateral offset to the surface
    V = C[:, None, :] + pr[None, :, 1:2] * U[:, None, :]
    fv = hull_sdf(V) - iso[:, None]
    V = V - fv[..., None] * N[:, None, :] + pr[None, :, 0:1] * N[:, None, :]
    # taper the two ends so a travelling end reads as a rolled edge
    n = len(C)
    tap = np.ones(n)
    tap[0] = tap[-1] = 0.35
    tap[1] = tap[-2] = 0.8
    cen = V.mean(1, keepdims=True)
    V = cen + (V - cen) * tap[:, None, None]
    _set_co(cd["ob"], V.reshape(-1, 3))
    if tag == "K":
        L = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(C, axis=0), axis=1))]
        a = (pr[:, 1] + (cd["width"] - cd["inner"])) + 0.02
        uvv = np.stack(common.collar_uv(a[None, :] + 0 * L[:, None], L[:, None] + 0 * a[None, :]), -1).reshape(-1, 2)
        _set_uv(cd["ob"], uvv[cd["faces"]].reshape(-1, 2))
    return True


def _roll_along(ob_d, C, N):
    T, N, U = _frames_from_normal(C, N)
    V = _sweep_verts(C, N, U, ob_d["prof"])
    _set_co(ob_d["ob"], V)


# --------------------------------------------------------------------------- obi and accessories

def _obi_setup(state):
    # obi: a closed band swept round the waist, 362 degrees, seam at centre back
    nobi = 200
    H = (OBI_TOP - OBI_BOT) / 2
    prof = []
    # profile in (n, u): inner face, rounded top, outer face (slightly barrel), rounded bottom
    th = 0.012
    k = 7
    for i in range(k):                                     # inner face, bottom -> top
        prof.append((0.0, -H + 0.006 + (2 * H - 0.012) * i / (k - 1)))
    for i in range(1, 6):
        a = math.pi - math.pi * i / 6
        prof.append((th / 2 + th / 2 * math.cos(a) * -1 * -1 if False else th / 2 - th / 2 * math.cos(math.pi * i / 6),
                     H - 0.006 + 0.006 * math.sin(math.pi * i / 6)))
    for i in range(k):                                     # outer face top -> bottom
        u = H - 0.006 - (2 * H - 0.012) * i / (k - 1)
        prof.append((th + 0.002 * (1 - (u / H) ** 2), u))
    for i in range(1, 6):
        prof.append((th / 2 + th / 2 * math.cos(math.pi * i / 6), -H + 0.006 - 0.006 * math.sin(math.pi * i / 6)))
    prof = np.array(prof)
    faces = _grid_faces(nobi, len(prof) + 1)
    ob = _new_obj(state, "DF_obi", np.zeros((nobi * (len(prof) + 1), 3)), faces, [_mat(state, "obi")], uv=True)
    state["obi"] = dict(ob=ob, prof=prof, n=nobi, faces=faces, th=th)
    # obijime cord
    ncord = 180
    cprof = _circle(0.0045, 10)
    faces = _grid_faces(ncord, len(cprof) + 1)
    ob = _new_obj(state, "DF_obijime", np.zeros((ncord * (len(cprof) + 1), 3)), faces, [_mat(state, "obijime")])
    state["cord"] = dict(ob=ob, prof=cprof, n=ncord, faces=faces)
    nk = 90
    faces = _grid_faces(nk, len(cprof) + 1)
    ob = _new_obj(state, "DF_obijime_knot", np.zeros((nk * (len(cprof) + 1), 3)), faces, [_mat(state, "obijime")])
    state["cordknot"] = dict(ob=ob, prof=cprof, n=nk, faces=faces)
    # obiage: a soft roll at the obi's top edge across the front
    nag = 120
    aprof = _circle(1.0, 14)
    faces = _grid_faces(nag, len(aprof) + 1)
    ob = _new_obj(state, "DF_obiage", np.zeros((nag * (len(aprof) + 1), 3)), faces, [_mat(state, "obiage")])
    state["obiage"] = dict(ob=ob, prof=aprof, n=nag, faces=faces)
    # otaiko knot: a rounded box swept across x
    nx_, kp = 40, 44
    faces = _grid_faces(nx_, kp + 1)
    ob = _new_obj(state, "DF_knot", np.zeros((nx_ * (kp + 1), 3)), faces, [_mat(state, "obi")], uv=True)
    state["knot"] = dict(ob=ob, n=nx_, kp=kp, faces=faces)


def _waist_iso(theta_world):
    """Outermost kimono iso at the waist for a world azimuth measured from centre back via the
    wearer's left (the left panel's psi)."""
    return ISO_K + DK * _ss((np.degrees(theta_world) - 125.0) / 23.0) * (np.degrees(theta_world) < 300)


def _band_points(psi_l, z, iso):
    """Horizontal ray hits at local azimuth psi (left-panel convention, may exceed 2pi)."""
    o, d = _ray(np.zeros_like(psi_l), z, psi_l, -1)
    return _cast(o, d, iso)


def _obi_iso_in(psi):
    p = np.mod(psi, 2 * math.pi)
    return _waist_iso(p) + FOLD + 0.003


def _update_obi(state, s):
    od = state["obi"]
    n = od["n"]
    ext = math.radians(362.0) * s
    psi = np.linspace(0.0, ext, n)
    zc = (OBI_BOT + OBI_TOP) / 2
    iso = _obi_iso_in(psi) + 0.003 * _ss((np.degrees(psi) - 340.0) / 20.0)
    C = _band_points(psi, np.full(n, zc), iso)
    N = _unit(_grad(hull_sdf, C) * np.array([1, 1, 0]))
    U = np.broadcast_to(np.array([0.0, 0.0, 1.0]), C.shape).copy()
    prof = od["prof"]
    pr = _close_prof(prof)
    tap = np.ones(n)
    if s < 1.0:
        tap[-1], tap[-2] = 0.4, 0.85
    V = C[:, None, :] + pr[None, :, 0:1] * N[:, None, :] + (pr[None, :, 1:2] * tap[:, None, None]) * U[:, None, :]
    # the lower outer corner at the leading end tucks in slightly
    _set_co(od["ob"], V.reshape(-1, 3))
    L = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(C, axis=0), axis=1))]
    uvv = np.stack([np.broadcast_to(L[:, None], pr.shape[:1][::-1] + (0,) if False else (n, len(pr))),
                    np.broadcast_to(pr[None, :, 1] + 0.08, (n, len(pr)))], -1).reshape(-1, 2)
    _set_uv(od["ob"], uvv[od["faces"]].reshape(-1, 2))
    state["obi_outer"] = (psi, C, N)


def _obi_surface(psi, z):
    """Point on the outer face of the obi (local)."""
    iso = _obi_iso_in(psi) + 0.012 + 0.002
    return _band_points(psi, z, iso)


def _update_cord(state, s):
    cd = state["cord"]
    n = cd["n"]
    zc = 1.031
    # starts at the front-left, runs round the back and returns to the front
    start = math.radians(160.0)
    psi = start + np.linspace(0.0, math.radians(362.0) * s, n)
    C = _obi_surface(psi, np.full(n, zc))
    N = _unit(_grad(hull_sdf, C) * np.array([1, 1, 0]))
    C = C + 0.0045 * N
    _roll_along(cd, C, N)
    # knot at centre front
    kd = state["cordknot"]
    sk = _ramp(s, 0.75, 1.0)
    m = kd["n"]
    ph = np.linspace(0, 2 * math.pi, m)
    # a flat square knot: two interlaced lobes
    xk = 0.021 * np.sin(ph) * (0.25 + 0.75 * sk)
    zk = 0.010 * np.sin(2 * ph) * (0.25 + 0.75 * sk)
    nk = 0.004 + 0.004 * np.cos(ph) ** 2 * sk + 0.003 * np.sin(ph + 0.6)
    # centre front of the obi
    base = _obi_surface(np.array([math.pi]), np.array([zc]))[0]
    Nf = np.array([0.0, 1.0, 0.0])
    C = base[None, :] + np.stack([xk, nk, zk], -1) * np.array([1, 1, 1]) + Nf * 0.0045
    C[:, 1] = base[1] + 0.0045 + nk
    C[:, 0] = base[0] + xk
    C[:, 2] = base[2] + zk
    N = np.broadcast_to(Nf, C.shape).copy()
    _roll_along(kd, C, N)
    state["cordknot_pt"] = base + np.array([0, 0.012, 0])
    return sk


def _update_obiage(state, s):
    ad = state["obiage"]
    n = ad["n"]
    half = math.radians(68.0) * (0.35 + 0.65 * s)
    psi = math.pi + np.linspace(-half, half, n)
    w = np.cos(np.linspace(-0.5 * math.pi, 0.5 * math.pi, n)) ** 0.8          # bell across the front
    rise = s
    r = 0.0105 * w * (0.92 + 0.08 * np.sin(np.linspace(0, 26 * math.pi, n))) * rise + 0.002
    zc = OBI_TOP - 0.006 + r * 0.85
    iso = _obi_iso_in(psi) - 0.002 + r * 0.9
    C = _band_points(psi, zc, iso)
    N = _unit(_grad(hull_sdf, C) * np.array([1, 1, 0]))
    T = _unit(np.gradient(C, axis=0))
    U = np.cross(T, N)
    # soft gathers: an elliptical, slightly wavy cross-section
    pr = _close_prof(ad["prof"])
    k = np.linspace(0, 1, n)[:, None]
    sx = r[:, None] * (1.0 + 0.12 * np.sin(k * 60 + pr[None, :, 1] * 2))
    sy = r[:, None] * 1.15
    V = C[:, None, :] + (pr[None, :, 0] * sx)[..., None] * N[:, None, :] + (pr[None, :, 1] * sy)[..., None] * U[:, None, :]
    _set_co(ad["ob"], V.reshape(-1, 3))


def _update_knot(state, s):
    kd = state["knot"]
    nx_, kp = kd["n"], kd["kp"]
    width = 0.28
    hgt = 0.26 * (0.15 + 0.85 * s)
    proud = 0.07
    ytop = OBI_TOP + 0.072
    # base: the obi's outer surface at centre back
    back = _obi_surface(np.array([0.0]), np.array([(OBI_BOT + OBI_TOP) / 2]))[0]
    yb = back[1]            # negative
    # side profile (y, z) of the drum, closed loop: inner face, top roll, outer face, bottom fold
    t = np.linspace(0, 1, kp)
    pts = []
    zt, zb_ = ytop, ytop - hgt
    dtop, dbot = proud * (0.4 + 0.6 * s), 0.035 * (0.4 + 0.6 * s)
    rr = 0.5 * dtop
    for u in t:
        if u < 0.25:                    # inner face, bottom -> top (against the obi)
            q = u / 0.25
            pts.append((0.004 + 0.002 * math.sin(q * math.pi), zb_ + 0.012 + (zt - rr - zb_ - 0.012) * q))
        elif u < 0.45:                  # top roll over the pillow
            q = (u - 0.25) / 0.20
            a = math.pi * q
            pts.append((rr - rr * math.cos(a), zt - rr + rr * math.sin(a) + 0.006 * math.sin(a)))
        elif u < 0.85:                  # outer face, top -> bottom, gently convex
            q = (u - 0.45) / 0.40
            d = dtop + (dbot - dtop) * q + 0.006 * math.sin(math.pi * q)
            pts.append((d, zt - rr + (zb_ + 0.012 - (zt - rr)) * q))
        else:                           # bottom fold back to the obi
            q = (u - 0.85) / 0.15
            a = math.pi * q
            pts.append((dbot / 2 + dbot / 2 * math.cos(a), zb_ + 0.012 - 0.012 * math.sin(a)))
    pr = np.array(pts)
    pr = np.vstack([pr, pr[:1]])
    xs = np.linspace(-width / 2, width / 2, nx_)
    # rounded ends: shrink the profile towards its middle near |x| -> w/2
    e = np.clip((np.abs(xs) - (width / 2 - 0.016)) / 0.016, 0, 1)
    tap = np.sqrt(np.clip(1 - e ** 2, 0, 1)) * 0.92 + 0.08
    cen = pr.mean(0)
    V = np.zeros((nx_, kp + 1, 3))
    for i, x in enumerate(xs):
        p = cen + (pr - cen) * np.array([tap[i], 0.35 + 0.65 * tap[i]])
        # slight sag of the lower edge at the middle, cloth-like
        sag = 0.004 * math.cos(math.pi * x / width)
        V[i, :, 0] = x
        V[i, :, 1] = yb - p[:, 0] - 0.001
        V[i, :, 2] = p[:, 1] - sag * (p[:, 1] < (zb_ + zt) / 2)
    _set_co(kd["ob"], V.reshape(-1, 3))
    L = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(pr, axis=0), axis=1))]
    uvv = np.stack([np.broadcast_to(xs[:, None] + 0.14, (nx_, kp + 1)), np.broadcast_to(L[None, :], (nx_, kp + 1))],
                   -1).reshape(-1, 2)
    _set_uv(kd["ob"], uvv[kd["faces"]].reshape(-1, 2))
    state["knot_pt"] = np.array([0.0, yb - dtop - 0.005, (zt + zb_) / 2])


# --------------------------------------------------------------------------- update

def _panel_uv(state, p, P, psi, s_fold):
    ps, seg = state["arc"]
    kk = state["uv_k"]
    c = -p.sx * 0.0 + np.interp(psi.ravel(), ps, seg) / kk
    c = c * (-1.0 if p.sx < 0 else 1.0)
    z = P[:, 2]
    h_up = _ridge(P[:, 0]) - z
    h_sk = common.BODY - (z - Z_HEM)
    zf = p.fold_z(s_fold) if p.fold else -1.0
    if zf < 0:
        zf = Z_KOSHI - 0.01
    f = p.faces
    zface = z[f].mean(1)
    skirt = zface < zf
    cl = c[f]
    hl = np.where(skirt[:, None], h_sk[f], np.maximum(h_up[f], 0.0))
    cr = np.repeat(cl.mean(1), 4)
    return _worn_uv_np(cl.ravel(), hl.ravel(), cr)


def update(state, t):
    t = {k: float(min(1.0, max(0.0, (t or {}).get(k, 0.0)))) for k in
         ("juban", "kimono", "ohashori", "obi", "obiage", "obijime", "knot")}
    ob = state["objects"]
    eps = 1e-3
    for tag, key, pan in (("J", "juban", state["jub"]), ("K", "kimono", state["kim"])):
        tv = t[key]
        on = tv > eps
        emax = max(pan["L"].edge.max(), pan["R"].edge.max()) + 0.02
        ext = {"R": emax * _ramp(tv, 0.0, 0.72), "L": emax * _ramp(tv, 0.22, 1.0)}
        s_fold = t["ohashori"] if (tag == "K") else 0.0
        for side, p in pan.items():
            o = ob["DF_%s_panel_%s" % (tag, side)]
            vis = on and ext[side] > math.radians(2.0)
            _show(o, vis)
            if vis:
                P, psi, _ = p.positions(ext[side], s_fold if tv >= 1.0 - eps else s_fold * tv)
                _set_co(o, P)
                if tag == "K":
                    _set_uv(o, _panel_uv(state, p, P, psi, s_fold))
                if tag == "K":
                    rd = state["rolls"][side]
                    bot = P.reshape(p.nr, p.nc, 3)[0]
                    Nb = _unit(bot * np.array([1, 1, 0]))
                    C = bot - 0.0012 * Nb + np.array([0, 0, -0.0016])
                    _roll_along(rd, C, Nb)
            if tag == "K":
                _show(state["rolls"][side]["ob"], vis)
        # collar
        cd = state["collars"][tag]
        cvis = on and min(ext["L"], ext["R"]) > math.radians(4.0)
        if cvis:
            cvis = _update_collar(state, tag, ext)
        _show(cd["ob"], cvis)
        # sleeves
        g = _ramp(tv, 0.12, 0.62)
        for sl in state["sleeves"]:
            if sl.tag != tag:
                continue
            vis = on and g > 0.02
            _show(sl.ob, vis)
            rname = sl.ob.name + "_roll"
            if vis:
                P = sl.positions(g)
                _set_co(sl.ob, P)
                if tag == "K":
                    _set_uv(sl.ob, sl.uv())
                    rd = state["rolls"][rname]
                    E = sl.opening_edge(P)
                    if len(E) > 3 and g >= 1.0:
                        E = _resample(E, rd["n"])
                        Nn = np.broadcast_to(np.array([sl.sx * 1.0, 0, 0]), E.shape).copy()
                        Nn = _unit(Nn + 0.3 * _unit(E - E.mean(0)))
                        _roll_along(rd, E + 0.0005 * Nn, Nn)
                    else:
                        vis = False
            if rname in state["rolls"]:
                _show(state["rolls"][rname]["ob"], vis)

    # obi family
    so = t["obi"]
    _show(ob["DF_obi"], so > eps)
    if so > eps:
        _update_obi(state, _ramp(so, 0.0, 1.0))
    sa = t["obiage"]
    _show(ob["DF_obiage"], sa > eps)
    if sa > eps:
        _update_obiage(state, _ss(sa))
    sj = t["obijime"]
    _show(ob["DF_obijime"], sj > eps)
    _show(ob["DF_obijime_knot"], sj > 0.75)
    if sj > eps:
        _update_cord(state, _ss(sj))
    sk = t["knot"]
    _show(ob["DF_knot"], sk > eps)
    if sk > eps:
        _update_knot(state, _ss(sk))


# --------------------------------------------------------------------------- anchors

def _anchor_points(state):
    kim = state["kim"]
    A = {}
    # juban collar: on the wearer's right side of the V, mid height
    pts = []
    for z in (1.33,):
        pass
    pj = state["jub"]["R"]
    o, d = _ray(np.array([1]), np.array(0.62), np.array(math.radians(150.0)), +1)
    A["form_juban_collar"] = _cast(o, d, np.array(ISO_J + 0.008))[0] + np.array([0, 0.004, 0])
    # crossing of the kimono collars
    o, d = _ray(np.array([1]), np.array(0.08), np.array(math.pi), -1)
    A["form_overlap"] = _cast(o, d, np.array(ISO_K + DK + 0.008))[0]
    psi_f = np.array([math.pi])
    A["form_ohashori"] = _band_points(psi_f, np.array([Z_FOLD + 0.03]), np.array([ISO_K + DK + FOLD + 0.002]))[0]
    A["form_obi"] = _obi_surface(psi_f, np.array([OBI_BOT + 0.035]))[0]
    A["form_obiage"] = _obi_surface(psi_f, np.array([OBI_TOP + 0.006]))[0]
    A["form_obijime"] = np.asarray(state.get("cordknot_pt", A["form_obi"]))
    A["form_knot"] = np.asarray(state.get("knot_pt", (0, -0.3, 1.0)))
    o, d = _ray(np.array([1]), np.array(kim["L"].phi_top - 0.12), np.array(0.0), -1)
    A["form_nape"] = _cast(o, d, np.array(ISO_K + 0.012))[0]
    A["form_hem"] = _band_points(np.array([0.0]), np.array([Z_HEM + 0.02]), np.array([ISO_K + 0.003]))[0]
    sl = [s for s in state["sleeves"] if s.tag == "K" and s.sx < 0][0]
    P = sl.positions(1.0).reshape(sl.NA, sl.NR + 1, 3)
    A["form_sleeve"] = P[sl.NA // 2, sl.NR // 4]
    return {k: np.asarray(v, float) for k, v in A.items()}


def anchors(state):
    import bpy
    from mathutils import Vector
    try:
        bpy.context.view_layer.update()
    except Exception:
        pass
    root = state["root"]
    mw = root.matrix_world.copy()
    return {k: tuple(mw @ Vector(tuple(v))) for k, v in state["anchors_local"].items()}


# --------------------------------------------------------------------------- test harness

def _test_studio(scene, form_xy):
    import bpy
    # dark warm room: floor + far walls
    fx, fy = form_xy
    me = bpy.data.meshes.new("T_room")
    S = 6.0
    v = [(-S, -S, 0), (S, -S, 0), (S, S, 0), (-S, S, 0), (-S, -S, 4), (S, -S, 4), (S, S, 4), (-S, S, 4)]
    f = [(0, 1, 2, 3), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    me.from_pydata(v, [], f)
    room = bpy.data.objects.new("T_room", me)
    room.location = (fx, fy, 0)
    scene.collection.objects.link(room)
    room.data.materials.append(common.fabric_material("floor"))
    # plinth
    bpy.ops.mesh.primitive_cylinder_add(radius=0.45, depth=0.08, location=(fx, fy, 0.04), vertices=96)
    pl = bpy.context.active_object
    pl.data.materials.append(common.fabric_material("dais"))
    warm = (1.0, 0.70, 0.45)

    def spot(name, loc, energy, size, angle=0.6):
        ld = bpy.data.lights.new(name, "SPOT")
        ld.energy = energy
        ld.color = warm
        ld.spot_size = angle
        ld.spot_blend = 0.6
        ld.shadow_soft_size = size
        ob = bpy.data.objects.new(name, ld)
        ob.location = loc
        scene.collection.objects.link(ob)
        tgt = bpy.data.objects.new(name + "_t", None)
        tgt.location = (fx, fy, 1.0)
        scene.collection.objects.link(tgt)
        c = ob.constraints.new("TRACK_TO")
        c.target = tgt
        c.track_axis = "TRACK_NEGATIVE_Z"
        c.up_axis = "UP_Y"
    spot("T_key", (fx - 1.6, fy + 2.4, 3.6), 900, 0.35)
    spot("T_fill", (fx + 2.4, fy + 1.4, 2.6), 260, 0.6, 0.9)
    spot("T_back", (fx + 0.8, fy - 2.6, 3.4), 520, 0.35)
    spot("T_back2", (fx - 1.8, fy - 1.6, 3.0), 260, 0.4)
    w = scene.world or bpy.data.worlds.new("T_world")
    scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = (0.010, 0.008, 0.007, 1)
    bg.inputs[1].default_value = 1.0


def _camera(scene, name, target, az_deg, dist=3.1, height=1.05, lens=50):
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
    res = tuple(int(v) for v in os.environ.get("DF_RES", "400x720").split("x"))
    spp = int(os.environ.get("DF_SPP", "24"))
    which = os.environ.get("DF_WHICH", "sheet,strip").split(",")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    common.setup_cycles(sc, res=res, samples=spp, preview=True)
    origin = (2.7, 0.0, 0.08)
    coll = bpy.data.collections.new("dressform")
    sc.collection.children.link(coll)
    t0 = time.time()
    st = build(coll, origin=origin)
    t1 = time.time()
    full = {k: 1.0 for k in ("juban", "kimono", "ohashori", "obi", "obiage", "obijime", "knot")}
    update(st, full)
    t2 = time.time()
    print("build %.2fs  update %.3fs" % (t1 - t0, t2 - t1 if False else t2 - t1))
    _test_studio(sc, origin[:2])
    tgt = (origin[0], origin[1], 0.92 + origin[2])

    def shoot(name, az, tt, cam_res=None):
        update(st, tt)
        cam = _camera(sc, "C_" + name, tgt, az)
        sc.camera = cam
        if cam_res:
            sc.render.resolution_x, sc.render.resolution_y = cam_res
        p = os.path.join(out, name + ".png")
        sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        return p

    if "sheet" in which:
        views = [("front", 0), ("q34", 40), ("side", 90), ("back", 180)]
        ims = [Image.open(shoot("v_" + n, a, full, res)) for n, a in views]
        W_, H_ = ims[0].size
        sheet = Image.new("RGB", (W_ * 4, H_))
        for i, im in enumerate(ims):
            sheet.paste(im, (i * W_, 0))
        sheet.save(os.path.join(out, "sheet_turntable.png"))
    if "strip" in which:
        order = ["juban", "kimono", "ohashori", "obi", "obiage", "obijime", "knot"]
        tt = {k: 0.0 for k in order}
        frames = [shoot("s_0", 0, tt, (res[0] // 2, res[1] // 2))]
        for i, k in enumerate(order):
            tt[k] = 1.0
            frames.append(shoot("s_%d" % (i + 1), 0 if k != "knot" else 150, dict(tt), (res[0] // 2, res[1] // 2)))
        W_, H_ = Image.open(frames[0]).size
        strip = Image.new("RGB", (W_ * len(frames), H_))
        for i, f in enumerate(frames):
            strip.paste(Image.open(f), (i * W_, 0))
        strip.save(os.path.join(out, "strip_buildup.png"))
    if "mid" in which:
        mids = [{"juban": 1, "kimono": 0.3}, {"juban": 1, "kimono": 0.6}, {"juban": 1, "kimono": 1, "ohashori": 0.5},
                {"juban": 1, "kimono": 1, "ohashori": 1, "obi": 0.5},
                {"juban": 1, "kimono": 1, "ohashori": 1, "obi": 1, "obiage": 1, "obijime": 0.5, "knot": 0.5}]
        frames = [shoot("m_%d" % i, 30, m, (res[0] // 2, res[1] // 2)) for i, m in enumerate(mids)]
        W_, H_ = Image.open(frames[0]).size
        strip = Image.new("RGB", (W_ * len(frames), H_))
        for i, f in enumerate(frames):
            strip.paste(Image.open(f), (i * W_, 0))
        strip.save(os.path.join(out, "strip_mid.png"))
    print("anchors", {k: tuple(round(c, 3) for c in v) for k, v in anchors(st).items()})


if __name__ == "__main__":
    _main()
