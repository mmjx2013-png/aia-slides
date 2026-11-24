"""scene.py - the shoin hall, the rack, the cloth stages A-D, the mannequin and the camera path.

    import scene
    scene.build()            # once: creates everything in the current bpy scene
    scene.apply_frame(f)     # f = full-rate frame 0..983; stateless (any order)
    scene.anchors_world(f)   # dict name -> (x, y, z) world points for meta.json (after apply_frame(f))
    scene.walls_meta()       # the two display-wall stops for meta.json
    scene.apply_clay()       # clay pass: every object (and every part of it) a flat random colour

Coordinates: Z up, metres, floor z = 0. The hall is README v3 "Set 1"; numbers in dims.json "hall".
One ken = 1.82 m. Interior x -3.64..3.64, y -7.28..10.92. West = shoji (the light), east = the plain
plaster display wall, north = tokonoma and shelves on gold, south = gold fusuma.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C  # noqa: E402
from common import DIMS, ramp, smootherstep, smoothstep, clamp01, hex_rgb  # noqa: E402

import bpy  # noqa: E402
from mathutils import Vector, Euler, Matrix  # noqa: E402

HL = DIMS["hall"]
M = HL                           # the cloth code reads its frame tables from here
WD = DIMS["world"]
T = WD["table_z"]                # the surface the cloth lies on: the tatami (0), or a runner's top
ROD_R = WD["rod_radius"]
ROD_TOP = WD["rod_z_end"]
L_BOLT = DIMS["bolt"]["length"]
W = DIMS["bolt"]["width"]
H_CLOTH = DIMS["bolt"]["thickness"]
RC = DIMS["bolt"]["core_radius"]
Y0 = DIMS["bolt"]["free_end_y"]
D0 = 0.0016                      # base layer height of cloth above that surface
FPS = 24
N_FRAMES = DIMS["frames"]
KEN = HL["ken"]
HX = HL["half_x"]
YS, YN = HL["y_south"], HL["y_north"]
HC = HL["ceiling"]
CAM_Z = HL["camera_z"]
SHIFT_Y = HL["shift_y"]
SHIFT_T = SHIFT_Y * 36.0 / 30.0  # tangent of the vertical shift angle
FOCAL, SENSOR = 30.0, 36.0
FORM = tuple(HL["form_xy"])
STAGE = {s["id"]: (s["start"], s["end"]) for s in DIMS["stages"]}

S = {}          # registry of built things

# =========================================================================== small helpers

def _coll(name):
    c = bpy.data.collections.get(name)
    if c is None:
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
    return c


def _obj(name, data, coll):
    ob = bpy.data.objects.new(name, data)
    coll.objects.link(ob)
    return ob


def plain(name, hexcol, rough=0.6, spec=0.3, metallic=0.0, emit=0.0, coat=0.0):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    if not m.node_tree:
        m.use_nodes = True
    b = [n for n in m.node_tree.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled"][0]
    b.inputs["Base Color"].default_value = hex_rgb(hexcol, 1.0)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = spec
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Coat Weight"].default_value = coat
    if emit:
        b.inputs["Emission Color"].default_value = hex_rgb(hexcol, 1.0)
        b.inputs["Emission Strength"].default_value = emit
    return m


def box(name, x0, x1, y0, y1, z0, z1, mat, coll):
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
         (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(v, [], f)
    me.materials.append(mat)
    return _obj(name, me, coll)


def cylinder(name, p0, p1, r, mat, coll, n=24, cap=True):
    p0, p1 = Vector(p0), Vector(p1)
    axis = p1 - p0
    ln = axis.length
    me = bpy.data.meshes.new(name)
    vs, fs = [], []
    for k in range(n):
        a = 2 * math.pi * k / n
        vs.append((r * math.cos(a), r * math.sin(a), 0.0))
        vs.append((r * math.cos(a), r * math.sin(a), ln))
    for k in range(n):
        k2 = (k + 1) % n
        fs.append((2 * k, 2 * k2, 2 * k2 + 1, 2 * k + 1))
    if cap:
        fs.append(tuple(2 * k for k in range(n))[::-1])
        fs.append(tuple(2 * k + 1 for k in range(n)))
    me.from_pydata(vs, [], fs)
    for p in me.polygons:
        p.use_smooth = len(p.vertices) == 4
    me.materials.append(mat)
    ob = _obj(name, me, coll)
    ob.location = p0
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = axis.normalized().to_track_quat("Z", "Y")
    return ob


def grid_mesh(name, na, nb, uv, mat, coll):
    """Grid of na (across) x nb (along) vertices; uv is (nb, na, 2). Vertex index = j*na + i."""
    me = bpy.data.meshes.new(name)
    verts = np.zeros((na * nb, 3), np.float32)
    faces = []
    for j in range(nb - 1):
        for i in range(na - 1):
            a = j * na + i
            faces.append((a, a + 1, a + na + 1, a + na))
    me.from_pydata(verts.tolist(), [], faces)
    uvl = me.uv_layers.new(name="UVMap")
    lv = np.zeros(len(me.loops), np.int32)
    me.loops.foreach_get("vertex_index", lv)
    uvf = uv.reshape(-1, 2)[lv]
    uvl.data.foreach_set("uv", uvf.ravel().astype(np.float32))
    me.polygons.foreach_set("use_smooth", np.ones(len(me.polygons), bool))
    me.materials.append(mat)
    return _obj(name, me, coll)


def set_coords(ob, co):
    me = ob.data
    me.vertices.foreach_set("co", np.asarray(co, np.float32).ravel())
    me.update()



class MB:
    """Mesh builder: boxes, quads and plates with UVs in metres, merged into one object.
    Box UVs run U along the grain (the longest side unless given), so wood grain follows each member."""

    def __init__(self):
        self.v, self.f, self.uv, self.mi, self.mats = [], [], [], [], []
        self.recalc = False

    def _m(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def box(self, x0, x1, y0, y1, z0, z1, mat, grain=None):
        lo = (min(x0, x1), min(y0, y1), min(z0, z1))
        hi = (max(x0, x1), max(y0, y1), max(z0, z1))
        g = grain if grain is not None else int(np.argmax([hi[i] - lo[i] for i in range(3)]))
        if isinstance(g, str):
            g = "xyz".index(g)
        b = len(self.v)
        vs = [(lo[0], lo[1], lo[2]), (hi[0], lo[1], lo[2]), (hi[0], hi[1], lo[2]), (lo[0], hi[1], lo[2]),
              (lo[0], lo[1], hi[2]), (hi[0], lo[1], hi[2]), (hi[0], hi[1], hi[2]), (lo[0], hi[1], hi[2])]
        self.v += vs
        mi = self._m(mat)
        for face, n in (((0, 3, 2, 1), 2), ((4, 5, 6, 7), 2), ((0, 1, 5, 4), 1), ((1, 2, 6, 5), 0),
                        ((2, 3, 7, 6), 1), ((3, 0, 4, 7), 0)):
            a, c = [i for i in range(3) if i != n]
            ua, va = (c, a) if g == c else (a, c)
            self.f.append(tuple(b + i for i in face))
            self.uv.append([(vs[i][ua], vs[i][va]) for i in face])
            self.mi.append(mi)

    def quad(self, pts, mat, uv=None):
        """pts: 4 corners, counter-clockwise seen from the visible side. uv defaults to metres along
        the first edge (U) and the last edge (V)."""
        b = len(self.v)
        p = [Vector(q) for q in pts]
        self.v += [tuple(q) for q in p]
        if uv is None:
            lu, lv = (p[1] - p[0]).length, (p[3] - p[0]).length
            uv = [(0, 0), (lu, 0), (lu, lv), (0, lv)]
        self.f.append((b, b + 1, b + 2, b + 3))
        self.uv.append(list(uv))
        self.mi.append(self._m(mat))

    def plate(self, c, axis, r, depth, n, mat, rot=0.0):
        """n-sided plate centred at c; it grows by `depth` along +axis (negative depth: along -axis)."""
        a, b_ = [i for i in range(3) if i != axis]
        base = len(self.v)
        ring = []
        for lvl in (0.0, depth):
            for k in range(n):
                t = rot + 2 * math.pi * k / n
                p = [c[0], c[1], c[2]]
                p[a] += r * math.cos(t)
                p[b_] += r * math.sin(t)
                p[axis] += lvl
                ring.append(tuple(p))
        self.v += ring
        mi = self._m(mat)
        faces = [tuple(base + k for k in range(n)), tuple(base + n + k for k in range(n))]
        for k in range(n):
            k2 = (k + 1) % n
            faces.append((base + k, base + k2, base + n + k2, base + n + k))
        for fc in faces:
            self.f.append(fc)
            self.uv.append([(self.v[i][a], self.v[i][b_]) for i in fc])
            self.mi.append(mi)
        self.recalc = True

    def build(self, name, coll, bevel=0.0):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.v, [], self.f)
        uvl = me.uv_layers.new(name="UVMap")
        uvl.data.foreach_set("uv", [float(c) for face in self.uv for uvc in face for c in uvc])
        me.polygons.foreach_set("material_index", self.mi)
        for m in self.mats:
            me.materials.append(m)
        if self.recalc:
            import bmesh
            bm = bmesh.new()
            bm.from_mesh(me)
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            bm.to_mesh(me)
            bm.free()
        me.update()
        ob = _obj(name, me, coll)
        if bevel:
            md = ob.modifiers.new("chamfer", "BEVEL")
            md.width = bevel
            md.segments = 1
            md.limit_method = "ANGLE"
            md.angle_limit = math.radians(40)
        return ob


def gold_panel(name, p0, pu, pv, coll, mat=None):
    """A gold-leaf surface as its own object: 'UVMap' is a clean 0..1 square (for a painting later),
    'leaf' is in metres (drives the leaf squares). Visible side: pu x pv."""
    p0, pu, pv = Vector(p0), Vector(pu), Vector(pv)
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(p0), tuple(p0 + pu), tuple(p0 + pu + pv), tuple(p0 + pv)], [], [(0, 1, 2, 3)])
    me.uv_layers.new(name="UVMap").data.foreach_set("uv", [0, 0, 1, 0, 1, 1, 0, 1])
    lu, lv = pu.length, pv.length
    h = _stable_hash(name)                 # not hash(): that differs from process to process
    ox, oy = (h % 97) * 0.0113, (h % 89) * 0.0127
    me.uv_layers.new(name="leaf").data.foreach_set("uv", [ox, oy, ox + lu, oy, ox + lu, oy + lv, ox, oy + lv])
    me.materials.append(mat or C.hall_material("gold"))
    return _obj(name, me, coll)


def _stable_hash(s):
    h = 0
    for ch in s:
        h = (h * 131 + ord(ch)) % 1000003
    return h


# =========================================================================== the hall

XW = -HX                      # west wall line (shoji)
SHOJI = {}                    # (bay, 'S' | 'N') -> the objects of that sliding panel
EX = XW - 1.70                # outer edge of the veranda
GROUND_Z = -0.52              # the garden ground
YJ = HL["y_south"] + 6 * HL["ken"]   # where the jodan (the raised upper level) begins: its north four ken
JD = 0.16                     # its height: one step


def floor_z(y):
    return JD if y >= YJ - 1e-6 else 0.0
PIN = 0.04                    # how far the posts stand into the room
NAG_Z, NAG_H = HL["nageshi_z"], HL["nageshi_h"]
NAG2_Z, NAG2_H = HL["nageshi2_z"], HL["nageshi2_h"]
KAMOI_Z = NAG_Z - 0.045
PANEL_W = (KEN - 0.14 + 0.03) / 2.0     # two sliding panels per bay, overlapping by one stile
AREA_W = 2.2                            # area-light watts per m2 that match emission strength 1 (measured)


def build_floor(coll):
    """Tatami: 0.91 x 1.82, long side along Y, in a plain grid; one quad per mat with its own tone."""
    rs = np.random.RandomState(12)
    verts, faces, uvs, tones = [], [], [], []
    nx, ny = int(round(2 * HX / 0.91)), int(round((YN - YS) / KEN))
    for i in range(nx):
        for j in range(ny):
            x0, y0 = -HX + i * 0.91, YS + j * KEN
            b = len(verts)
            fz = floor_z(y0)
            verts += [(x0, y0, fz), (x0 + 0.91, y0, fz), (x0 + 0.91, y0 + KEN, fz), (x0, y0 + KEN, fz)]
            faces.append((b, b + 1, b + 2, b + 3))
            v0 = 0.5 * rs.randint(0, 2)
            ua, ub = (0.0, 1.0) if rs.rand() < 0.5 else (1.0, 0.0)
            ku = float(rs.randint(0, 5))
            uvs += [ua + ku, v0, ua + ku, v0 + 0.5, ub + ku, v0 + 0.5, ub + ku, v0]
            g = 0.93 + 0.12 * rs.rand()
            tone = (g * (1.0 + 0.03 * rs.randn()), g, g * (1.0 + 0.04 * rs.randn()), 1.0)
            tones += list(tone) * 4
    me = bpy.data.meshes.new("Tatami")
    me.from_pydata(verts, [], faces)
    me.uv_layers.new(name="UVMap").data.foreach_set("uv", uvs)
    ca = me.color_attributes.new("tone", "FLOAT_COLOR", "CORNER")
    ca.data.foreach_set("color", tones)
    me.materials.append(C.hall_material("tatami"))
    return _obj("Tatami", me, coll)


def _shoji_panel(wood, thin, paper, ya, yb, xc, z0, z1, koshi=0.33, cols=4, rows=6):
    """One sliding shoji in the west wall: frame, hip board, lattice on the room side, paper behind."""
    hin, brd = C.hall_material("hinoki"), C.hall_material("board")
    xa, xb = xc - 0.015, xc + 0.015
    st = 0.030
    wood.box(xa, xb, ya, ya + st, z0, z1, hin, "z")
    wood.box(xa, xb, yb - st, yb, z0, z1, hin, "z")
    wood.box(xa, xb, ya + st, yb - st, z1 - 0.036, z1, hin, "y")
    wood.box(xa, xb, ya + st, yb - st, z0, z0 + 0.05, hin, "y")
    zk = z0 + 0.05 + koshi
    if koshi > 0:
        wood.box(xa, xb, ya + st, yb - st, zk, zk + 0.028, hin, "y")
        thin.box(xc - 0.004, xc + 0.004, ya + st, yb - st, z0 + 0.05, zk, brd, "z")
        zp0 = zk + 0.028
    else:
        zp0 = z0 + 0.05
    zp1 = z1 - 0.036
    ka, kb = xc - 0.003, xc + 0.011          # lattice bars sit proud of the paper, towards the room
    for i in range(1, cols):
        y = ya + st + (yb - ya - 2 * st) * i / cols
        thin.box(ka, kb, y - 0.004, y + 0.004, zp0, zp1, hin, "z")
    for j in range(1, rows):
        z = zp0 + (zp1 - zp0) * j / rows
        thin.box(ka, kb, ya + st, yb - st, z - 0.004, z + 0.004, hin, "y")
    xp = xc - 0.004
    paper.quad([(xp, ya + st, zp0), (xp, yb - st, zp0), (xp, yb - st, zp1), (xp, ya + st, zp1)],
               C.hall_material("washi"))


def _fusuma(lac, gilt, coll, idx, xa, xb, yc, z0, z1, pull_x):
    """One gold fusuma in the south wall (seen from the north): lacquer frame, gold leaf, a round pull."""
    lq = C.hall_material("lacquer")
    fw = 0.022
    ya, yb = yc - 0.015, yc + 0.015
    lac.box(xa, xa + fw, ya, yb, z0, z1, lq, "z")
    lac.box(xb - fw, xb, ya, yb, z0, z1, lq, "z")
    lac.box(xa + fw, xb - fw, ya, yb, z1 - fw, z1, lq, "x")
    lac.box(xa + fw, xb - fw, ya, yb, z0, z0 + fw, lq, "x")
    yg = yb - 0.004
    gold_panel("gold_south_%d" % idx, (xb - fw, yg, z0 + fw), (-(xb - xa - 2 * fw), 0, 0), (0, 0, z1 - z0 - 2 * fw),
               coll)
    gilt.plate((pull_x, yg, 0.80), 1, 0.034, 0.005, 24, C.hall_material("gilt"))
    gilt.plate((pull_x, yg + 0.004, 0.80), 1, 0.022, 0.003, 24, lq)


def _fusuma_east(lac, gilt, coll, idx, ya, yb, xc, z0, z1, pull_y):
    """One gold fusuma in the east wall (seen from the west)."""
    lq = C.hall_material("lacquer")
    fw = 0.022
    xa, xb = xc - 0.015, xc + 0.015
    lac.box(xa, xb, ya, ya + fw, z0, z1, lq, "z")
    lac.box(xa, xb, yb - fw, yb, z0, z1, lq, "z")
    lac.box(xa, xb, ya + fw, yb - fw, z1 - fw, z1, lq, "y")
    lac.box(xa, xb, ya + fw, yb - fw, z0, z0 + fw, lq, "y")
    xg = xa + 0.004
    gold_panel("gold_east_%d" % idx, (xg, yb - fw, z0 + fw), (0, -(yb - ya - 2 * fw), 0), (0, 0, z1 - z0 - 2 * fw),
               coll)
    gilt.plate((xg, pull_y, 0.80), 0, 0.034, -0.005, 24, C.hall_material("gilt"))
    gilt.plate((xg - 0.004, pull_y, 0.80), 0, 0.022, -0.003, 24, lq)


CHODAI = (6, 7)               # east-wall bays that carry the chodaigamae (the ornamental doors)


def _chodai(lac, gilt, coll, k, ya, yb):
    """One bay of the chodaigamae in the east wall: a raised black-lacquer sill, a lowered lintel, two
    gold-leaf doors in broad lacquer frames with gilt corner plates, and on each a vermilion tassel
    hung from a gilt boss. Plain leaf where the real ones are painted."""
    lq, gil = C.hall_material("lacquer"), C.hall_material("gilt")
    red = S.get("tassel_mat") or plain("TasselSilk", "#9c2318", rough=0.62, spec=0.25)
    S["tassel_mat"] = red
    z0, z1, fw = JD + 0.20, 1.69, 0.055
    lac.box(HX - 0.085, HX + 0.02, ya - 0.07, yb + 0.07, 0.0, z0, lq, "y")              # the raised sill
    lac.box(HX - 0.070, HX + 0.02, ya, yb, z1, z1 + 0.10, lq, "y")                      # the lowered lintel
    ym = 0.5 * (ya + yb)
    xf = HX - 0.050                                                                     # face of the frames
    for n, (a0, a1) in enumerate(((ya, ym), (ym, yb))):
        lac.box(xf, HX, a0, a0 + fw, z0, z1, lq, "z")
        lac.box(xf, HX, a1 - fw, a1, z0, z1, lq, "z")
        lac.box(xf, HX, a0 + fw, a1 - fw, z1 - fw, z1, lq, "y")
        lac.box(xf, HX, a0 + fw, a1 - fw, z0, z0 + fw, lq, "y")
        gold_panel("gold_chodai_%d_%d" % (k, n), (HX - 0.022, a1 - fw, z0 + fw), (0, -(a1 - a0 - 2 * fw), 0),
                   (0, 0, z1 - z0 - 2 * fw), coll)
        for (y, z) in ((a0 + fw / 2, z0 + fw / 2), (a1 - fw / 2, z0 + fw / 2), (a0 + fw / 2, z1 - fw / 2),
                       (a1 - fw / 2, z1 - fw / 2), (a0 + fw / 2, 0.5 * (z0 + z1)), (a1 - fw / 2, 0.5 * (z0 + z1))):
            gilt.plate((xf, y, z), 0, 0.034, -0.003, 4, gil, rot=math.pi / 4)
        yc, zt = 0.5 * (a0 + a1), 1.31
        gilt.plate((HX - 0.022, yc, zt), 0, 0.050, -0.006, 8, gil, rot=math.pi / 8)
        gilt.plate((HX - 0.028, yc, zt), 0, 0.022, -0.012, 12, gil)
        x = HX - 0.046
        for dy in (-0.035, 0.035):                                                      # the looped cord
            cylinder("Tassel_cord_%d_%d_%d" % (k, n, dy > 0), (x, yc + dy * 0.2, zt - 0.01), (x, yc + dy, zt - 0.20),
                     0.0045, red, coll, n=8)
            cylinder("Tassel_cord2_%d_%d_%d" % (k, n, dy > 0), (x, yc + dy, zt - 0.20), (x, yc, zt - 0.33),
                     0.0045, red, coll, n=8)
        cylinder("Tassel_knot_%d_%d" % (k, n), (x, yc, zt - 0.31), (x, yc, zt - 0.37), 0.021, red, coll, n=14)
        cylinder("Tassel_%d_%d" % (k, n), (x, yc, zt - 0.37), (x, yc, zt - 0.66), 0.027, red, coll, n=14)


def _ranma(mb, axis, a0, a1, d0, d1, z0, z1, mat, pitch=0.03, bar=0.011):
    """Openwork transom: fine upright slats (osa-ranma) with two thin rails, spanning a0..a1 along
    `axis` ('x' or 'y'); d0..d1 is its depth range on the other horizontal axis."""
    n = max(2, int(round((a1 - a0) / pitch)))
    for i in range(1, n):
        a = a0 + (a1 - a0) * i / n
        if axis == "y":
            mb.box(d0, d1, a - bar / 2, a + bar / 2, z0, z1, mat, "z")
        else:
            mb.box(a - bar / 2, a + bar / 2, d0, d1, z0, z1, mat, "z")
    for j in (1, 2):
        z = z0 + (z1 - z0) * j / 3
        if axis == "y":
            mb.box(d0 - 0.002, d1 + 0.002, a0, a1, z - 0.007, z + 0.007, mat, "y")
        else:
            mb.box(a0, a1, d0 - 0.002, d1 + 0.002, z - 0.007, z + 0.007, mat, "x")


def _stone(name, c, sx, sy, sz, coll, mat, seed):
    """A water-worn stone: a flattened superellipsoid, lumpy, centred at c (half sizes sx, sy, sz)."""
    rs = np.random.RandomState(seed)
    ph = rs.rand(6) * 6.283
    nu, nv = 56, 22
    vs, fs = [], []

    def pw(t, e):
        return math.copysign(abs(t) ** e, t)
    for j in range(nv + 1):
        v = -math.pi / 2 + math.pi * j / nv
        for i in range(nu):
            u = 2 * math.pi * i / nu
            lump = 1.0 + 0.045 * math.sin(3 * u + ph[0]) + 0.03 * math.sin(5 * u + ph[1]) * math.cos(v) \
                + 0.025 * math.sin(2 * u + 3 * v + ph[2])
            x = sx * lump * pw(math.cos(v), 0.55) * pw(math.cos(u), 0.72)
            y = sy * lump * pw(math.cos(v), 0.55) * pw(math.sin(u), 0.72)
            z = sz * pw(math.sin(v), 0.42) * (1.0 + 0.05 * math.sin(2 * u + ph[3]) * math.cos(v)
                                             + 0.03 * math.sin(4 * u + ph[4]))
            vs.append((c[0] + x, c[1] + y, c[2] + z))
    for j in range(nv):
        for i in range(nu):
            a, b = j * nu + i, j * nu + (i + 1) % nu
            fs.append((a, b, b + nu, a + nu))
    me = bpy.data.meshes.new(name)
    me.from_pydata(vs, [], fs)
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.materials.append(mat)
    return _obj(name, me, coll)


def build_garden(coll):
    """What the open shoji show before the photographed garden begins: gravel, the stone step at the
    veranda's edge (kutsunugi-ishi) and a few stepping stones leading away."""
    grv, rock = C.hall_material("gravel"), C.hall_material("rock")
    g = MB()
    g.quad([(EX + 0.06, YS - 30.0, GROUND_Z), (EX + 0.06, YN + 30.0, GROUND_Z), (EX - 45.0, YN + 30.0, GROUND_Z),
            (EX - 45.0, YS - 30.0, GROUND_Z)], grv)
    g.build("Garden_gravel", coll)
    _stone("Stone_step", (EX - 0.94, 2.70, -0.40), 0.86, 1.30, 0.25, coll, rock, 3)
    for n, (x, y, r) in enumerate(((EX - 2.25, 3.55, 0.31), (EX - 3.05, 4.30, 0.27), (EX - 3.9, 4.95, 0.32),
                                   (EX - 4.8, 5.85, 0.27), (EX - 5.7, 6.5, 0.30))):
        _stone("Stone_%d" % n, (x, y, GROUND_Z - 0.03), r, r * 1.12, 0.09, coll, rock, 11 + n)


def set_open(bays=None):
    """Slide the west shoji: `bays` maps a bay number (0 = southernmost) to 'S' (its south half stands
    open) or 'N' (its north half); a list means 'S' for each. None: the layout of dims.json."""
    if bays is None:
        bays = HL.get("open_bays", [])
    if not isinstance(bays, dict):
        bays = {k: "S" for k in bays}
    dy = (KEN - 0.14) - PANEL_W
    for (k, side), obs in SHOJI.items():
        on = bays.get(k) == side
        for ob in obs:
            ob.location.y = (dy if side == "S" else -dy) if on else 0.0


def build_hall():
    coll = _coll("Hall")
    hin, brd, plk = C.hall_material("hinoki"), C.hall_material("board"), C.hall_material("planks")
    pla, lq, gil = C.hall_material("plaster"), C.hall_material("lacquer"), C.hall_material("gilt")
    washi = C.hall_material("washi", strength=HL["paper_visible"])
    washi.node_tree.nodes["eave_z"].outputs[0].default_value = HL["eave_z"]
    washi.node_tree.nodes["shade"].outputs[0].default_value = HL["paper_shade_visible"]
    wood, thin, lac, gilt, plas, paper, ceil = MB(), MB(), MB(), MB(), MB(), MB(), MB()

    build_floor(coll)
    ys = [YS + k * KEN for k in range(int(round((YN - YS) / KEN)) + 1)]
    open_bays = HL.get("open_bays", [])

    # ---- posts along the long walls
    hinw = C.hall_material("hinoki_wall")        # display wall: every bay must look exactly alike
    for y in ys:
        wood.box(XW - 0.10, XW + PIN, y - 0.07, y + 0.07, 0.0, HC, hin, "z")
        wood.box(HX - PIN, HX + 0.10, y - 0.07, y + 0.07, 0.0, HC, hinw, "z")
    # ---- west wall: shoji below, paper transoms above, plaster under the ceiling
    wood.box(XW - 0.10, XW + 0.005, YS, YN, -0.03, 0.004, hin, "y")               # floor track
    wood.box(XW - 0.10, XW + 0.005, YJ, YN, 0.0, JD + 0.004, hin, "y")            # the same on the jodan
    lac.box(XW + PIN, HX - PIN, YJ - 0.05, YJ, 0.0, JD + 0.003, lq, "x")          # the jodan's lacquered step
    wood.box(XW - 0.10, XW + 0.005, YS, YN, KAMOI_Z, NAG_Z, hin, "y")             # head track
    wood.box(XW - 0.02, XW + 0.065, YS, YN, NAG_Z, NAG_Z + NAG_H, hin, "y")       # nageshi
    wood.box(XW - 0.055, XW - 0.005, YS, YN, NAG_Z + NAG_H, NAG_Z + NAG_H + 0.035, hin, "y")
    wood.box(XW - 0.055, XW - 0.005, YS, YN, NAG2_Z - 0.035, NAG2_Z, hin, "y")
    wood.box(XW - 0.02, XW + 0.05, YS, YN, NAG2_Z, NAG2_Z + NAG2_H, hin, "y")     # upper nageshi
    plas.quad([(XW, YS, NAG2_Z), (XW, YN, NAG2_Z), (XW, YN, HC), (XW, YS, HC)], pla)
    for k in range(len(ys) - 1):
        ya, yb = ys[k] + 0.07, ys[k + 1] - 0.07
        # both panels are their own objects, built shut, so a shot can slide either one open
        for side, (pa, xc) in (("S", (ya, XW - 0.020)), ("N", (yb - PANEL_W, XW - 0.055))):
            pw, pt = MB(), MB()
            _shoji_panel(pw, pt, pt, pa, pa + PANEL_W, xc, floor_z(ys[k]) + 0.006, KAMOI_Z)
            SHOJI[(k, side)] = [pw.build("Shoji_%d%s_frame" % (k, side), coll, bevel=0.004),
                                pt.build("Shoji_%d%s_paper" % (k, side), coll)]
        # transom (ranma): fine upright slats in front of the paper
        zt0, zt1 = NAG_Z + NAG_H + 0.035, NAG2_Z - 0.035
        _ranma(thin, "y", ya, yb, XW - 0.034, XW - 0.020, zt0, zt1, hin)
        paper.quad([(XW - 0.037, ya, zt0), (XW - 0.037, yb, zt0), (XW - 0.037, yb, zt1), (XW - 0.037, ya, zt1)],
                   washi)
    # ---- east wall: the display wall. One plaster plane; sill, nageshi and posts lie on it
    plas.quad([(HX, YN, 0.0), (HX, YS, 0.0), (HX, YS, HC), (HX, YN, HC)], pla)
    east_f = HL.get("east_fusuma_bays", [])
    void = plain("RanmaVoid", "#2b2219", rough=0.9, spec=0.05)       # the dim room seen through a transom
    zt0, zt1 = NAG_Z + NAG_H + 0.035, NAG2_Z - 0.035
    n_e = 0
    for k in range(len(ys) - 1):
        ya, yb = ys[k] + 0.07, ys[k + 1] - 0.07
        if k in CHODAI:
            _chodai(lac, gilt, coll, k, ya, yb)
            continue
        if k not in east_f:
            wood.box(HX - 0.035, HX + 0.02, ys[k], ys[k + 1], 0.0, floor_z(ys[k]) + 0.10, hinw, "y")   # sill under plaster
            continue
        # a gold fusuma pair in this bay, with an openwork transom above it
        wood.box(HX - 0.04, HX + 0.02, ys[k], ys[k + 1], -0.03, 0.004, hinw, "y")
        wood.box(HX - 0.04, HX + 0.02, ys[k], ys[k + 1], KAMOI_Z, NAG_Z, hinw, "y")
        ym = 0.5 * (ya + yb)
        for (a0, a1, pull) in ((ym, yb, ym + 0.10), (ya, ym, ym - 0.10)):
            n_e += 1
            _fusuma_east(lac, gilt, coll, n_e, a0, a1, HX - 0.018, 0.006, KAMOI_Z, pull)
        wood.box(HX - 0.036, HX - 0.006, ya, yb, NAG_Z + NAG_H, zt0, hinw, "y")
        wood.box(HX - 0.036, HX - 0.006, ya, yb, zt1, NAG2_Z, hinw, "y")
        _ranma(thin, "y", ya, yb, HX - 0.032, HX - 0.018, zt0, zt1, hinw)
        plas.quad([(HX - 0.004, yb, zt0), (HX - 0.004, ya, zt0), (HX - 0.004, ya, zt1), (HX - 0.004, yb, zt1)], void)
    wood.box(HX - 0.065, HX + 0.02, YS, YN, NAG_Z, NAG_Z + NAG_H, hinw, "y")
    wood.box(HX - 0.05, HX + 0.02, YS, YN, NAG2_Z, NAG2_Z + NAG2_H, hinw, "y")
    # ---- south wall: gold fusuma
    plas.quad([(HX + 0.1, YS - 0.09, -0.05), (XW - 0.1, YS - 0.09, -0.05), (XW - 0.1, YS - 0.09, HC),
               (HX + 0.1, YS - 0.09, HC)], pla)
    plas.quad([(HX, YS, NAG_Z), (XW, YS, NAG_Z), (XW, YS, HC), (HX, YS, HC)], pla)
    for x in (-KEN, 0.0, KEN):
        wood.box(x - 0.07, x + 0.07, YS - 0.10, YS + PIN, 0.0, HC, hin, "z")
    wood.box(XW, HX, YS - 0.10, YS + 0.005, -0.03, 0.004, hin, "x")
    wood.box(XW, HX, YS - 0.10, YS + 0.005, KAMOI_Z, NAG_Z, hin, "x")
    wood.box(XW, HX, YS - 0.02, YS + 0.065, NAG_Z, NAG_Z + NAG_H, hin, "x")
    wood.box(XW, HX, YS - 0.02, YS + 0.05, NAG2_Z, NAG2_Z + NAG2_H, hin, "x")
    n = 0
    for b in range(4):
        xa, xb = XW + b * KEN + 0.07, XW + (b + 1) * KEN - 0.07
        wood.box(xa, xb, YS + 0.006, YS + 0.036, NAG_Z + NAG_H, zt0, hin, "x")
        wood.box(xa, xb, YS + 0.006, YS + 0.036, zt1, NAG2_Z, hin, "x")
        _ranma(thin, "x", xa, xb, YS + 0.018, YS + 0.032, zt0, zt1, hin)
        plas.quad([(xb, YS + 0.004, zt0), (xa, YS + 0.004, zt0), (xa, YS + 0.004, zt1), (xb, YS + 0.004, zt1)], void)
        n += 1
        _fusuma(lac, gilt, coll, n, xa, xa + PANEL_W, YS - 0.055, 0.006, KAMOI_Z, xa + PANEL_W - 0.10)
        n += 1
        _fusuma(lac, gilt, coll, n, xb - PANEL_W, xb, YS - 0.020, 0.006, KAMOI_Z, xb - PANEL_W + 0.10)
    # ---- north wall: tokonoma in the middle two ken, shelves alcove west, gold wall east
    TD = 0.91                                             # depth of the tokonoma
    plas.quad([(XW - 0.1, YN + TD + 0.04, -0.05), (HX + 0.1, YN + TD + 0.04, -0.05), (HX + 0.1, YN + TD + 0.04, HC),
               (XW - 0.1, YN + TD + 0.04, HC)], pla)
    plas.quad([(XW, YN, NAG_Z), (-KEN, YN, NAG_Z), (-KEN, YN, HC), (XW, YN, HC)], pla)
    plas.quad([(KEN, YN, NAG_Z), (HX, YN, NAG_Z), (HX, YN, HC), (KEN, YN, HC)], pla)
    plas.quad([(-KEN, YN, 2.13), (KEN, YN, 2.13), (KEN, YN, HC), (-KEN, YN, HC)], pla)
    for x in (-KEN, KEN):
        wood.box(x - 0.07, x + 0.07, YN - PIN, YN + 0.10, 0.0, HC, hin, "z")
    wood.box(XW, HX, YN - 0.05, YN + 0.02, NAG2_Z, NAG2_Z + NAG2_H, hin, "x")
    for xa, xb in ((XW, -KEN), (KEN, HX)):
        wood.box(xa, xb, YN - 0.065, YN + 0.02, NAG_Z, NAG_Z + NAG_H, hin, "x")
        wood.box(xa, xb, YN - 0.035, YN + 0.035, KAMOI_Z, NAG_Z, hin, "x")
    # tokonoma
    tx = KEN - 0.07
    lac.box(-tx, tx, YN - 0.03, YN + 0.06, 0.0, JD + 0.115, lq, "x")               # toko-gamachi
    wood.box(-tx, tx, YN + 0.06, YN + TD, JD + 0.085, JD + 0.11, plk, "x")
    wood.box(-tx, tx, YN - 0.035, YN + 0.035, 2.05, 2.13, hin, "x")                # otoshigake
    gold_panel("gold_north", (-tx, YN + TD, JD + 0.11), (2 * tx, 0, 0), (0, 0, 2.52 - JD), coll)
    gold_panel("gold_north_side_w", (-tx, YN + 0.10, JD + 0.11), (0, TD - 0.10, 0), (0, 0, 2.52 - JD), coll)
    gold_panel("gold_north_side_e", (tx, YN + TD, JD + 0.11), (0, -(TD - 0.10), 0), (0, 0, 2.52 - JD), coll)
    ceil.quad([(-tx, YN + TD, 2.63), (tx, YN + TD, 2.63), (tx, YN, 2.63), (-tx, YN, 2.63)], brd)
    plas.quad([(-tx, YN + 0.036, 2.13), (-tx, YN + 0.036, 2.63), (tx, YN + 0.036, 2.63), (tx, YN + 0.036, 2.13)],
              pla)
    # east bay: plain gold wall
    wood.box(KEN, HX, YN - 0.035, YN + 0.03, 0.0, JD + 0.10, hin, "x")
    gold_panel("gold_north_e", (KEN + 0.07, YN + 0.012, JD + 0.10), (KEN - 0.07 - PIN, 0, 0),
               (0, 0, KAMOI_Z - 0.10 - JD), coll)
    # west bay: staggered shelves (chigaidana) in a shallow alcove with a small cupboard above
    AD = 0.60
    ax0, ax1 = XW + PIN, -KEN - 0.07
    wood.box(ax0, ax1, YN - 0.03, YN + AD, JD + 0.06, JD + 0.09, plk, "x")
    wood.box(ax0, ax1, YN - 0.03, YN + 0.0, 0.0, JD + 0.06, hin, "x")
    gold_panel("gold_north_w", (ax0, YN + AD, JD + 0.09), (ax1 - ax0, 0, 0), (0, 0, KAMOI_Z - 0.09 - JD), coll)
    gold_panel("gold_north_w_side_w", (ax0, YN + 0.02, JD + 0.09), (0, AD - 0.02, 0), (0, 0, KAMOI_Z - 0.09 - JD),
               coll)
    gold_panel("gold_north_w_side_e", (ax1, YN + AD, JD + 0.09), (0, -(AD - 0.02), 0), (0, 0, KAMOI_Z - 0.09 - JD),
               coll)
    ceil.quad([(ax0, YN + AD, KAMOI_Z), (ax1, YN + AD, KAMOI_Z), (ax1, YN, KAMOI_Z), (ax0, YN, KAMOI_Z)], brd)
    wood.box(ax0, ax0 + 1.02, YN + 0.14, YN + AD - 0.01, 0.80, 0.83, hin, "x")      # lower shelf
    wood.box(ax1 - 0.98, ax1, YN + 0.14, YN + AD - 0.01, 1.02, 1.05, hin, "x")      # upper shelf
    xm = 0.5 * ((ax0 + 1.02) + (ax1 - 0.98))
    wood.box(xm - 0.014, xm + 0.014, YN + 0.22, YN + 0.248, 0.83, 1.02, hin, "z")   # the little post between
    wood.box(ax0, ax1, YN + 0.10, YN + AD, 1.36, 1.385, hin, "x")                   # cupboard floor
    dw = (ax1 - ax0) / 4.0
    for i in range(4):
        xa, xb = ax0 + i * dw, ax0 + (i + 1) * dw
        yc = YN + (0.125 if i % 2 == 0 else 0.145)
        lac.box(xa, xb, yc - 0.008, yc + 0.006, 1.385, 1.40, lq, "x")
        lac.box(xa, xb, yc - 0.008, yc + 0.006, 1.74, KAMOI_Z, lq, "x")
        lac.box(xa, xa + 0.014, yc - 0.008, yc + 0.006, 1.40, 1.74, lq, "z")
        lac.box(xb - 0.014, xb, yc - 0.008, yc + 0.006, 1.40, 1.74, lq, "z")
        gold_panel("gold_cupboard_%d" % (i + 1), (xa + 0.014, yc - 0.004, 1.40), (dw - 0.028, 0, 0), (0, 0, 0.34),
                   coll)
        gilt.plate((xa + (0.07 if i % 2 else dw - 0.07), yc - 0.004, 1.57), 1, 0.016, -0.004, 16, gil)
    # ---- coffered ceiling: boards and plain wooden ribs, three coffers to a ken
    ceil.quad([(XW - 0.12, YS - 0.12, HC), (XW - 0.12, YN + 0.05, HC), (HX + 0.12, YN + 0.05, HC),
               (HX + 0.12, YS - 0.12, HC)], brd)
    cs = KEN / 3.0
    nxr, nyr = int(round(2 * HX / cs)), int(round((YN - YS) / cs))
    # over the jodan the coffers are the richest of the hall: black-lacquer ribs, and plain aged gold
    # leaf where the painted panels would be
    gold_panel("gold_ceiling", (XW, YN, HC - 0.004), (2 * HX, 0, 0), (0, -(YN - YJ), 0), coll)
    wood.box(XW, HX, YJ - 0.07, YJ + 0.07, HC - 0.32, HC, hin, "x")                  # the beam that marks it
    for i in range(nxr + 1):
        x = XW + i * cs
        wood.box(x - 0.0225, x + 0.0225, YS, YJ, HC - 0.115, HC, hin, "y")
        lac.box(x - 0.0225, x + 0.0225, YJ + 0.07, YN, HC - 0.115, HC, lq, "y")
    for j in range(nyr + 1):
        y = YS + j * cs
        if y > YJ + 0.1:
            lac.box(XW, HX, y - 0.0225, y + 0.0225, HC - 0.105, HC, lq, "x")
        elif y < YJ - 0.1:
            wood.box(XW, HX, y - 0.0225, y + 0.0225, HC - 0.105, HC, hin, "x")
    for i in range(1, nxr):                                                          # gilt plates under the crossings
        for j in range(1, nyr):
            gilt.plate((XW + i * cs, YS + j * cs, HC - 0.115), 2, 0.046, -0.0025, 4, gil)
    for (x0, x1, y0, y1) in ((XW - 0.02, XW + 0.07, YS, YN), (HX - 0.07, HX + 0.02, YS, YN),
                             (XW, HX, YS - 0.02, YS + 0.07), (XW, HX, YN - 0.07, YN + 0.02)):
        wood.box(x0, x1, y0, y1, HC - 0.15, HC, hin)                                 # cornice
    # ---- gilt nail covers on the nageshi, one at every post
    zc = NAG_Z + NAG_H / 2
    for y in ys[1:-1]:
        for (x, d) in ((XW + 0.065, 1), (HX - 0.065, -1)):
            gilt.plate((x, y, zc), 0, 0.056, 0.005 * d, 6, gil, rot=math.pi / 6)
            gilt.plate((x + 0.005 * d, y, zc), 0, 0.024, 0.007 * d, 12, gil)
    for x in (-KEN, 0.0, KEN):
        gilt.plate((x, YS + 0.065, zc), 1, 0.043, 0.005, 6, gil, rot=math.pi / 6)
        gilt.plate((x, YS + 0.070, zc), 1, 0.017, 0.006, 12, gil)
    # ---- outside: the veranda boards beyond the shoji, and a dark base under everything
    plo = C.hall_material("planks_out")          # weathered: it stands in the full light of the garden
    wood.box(EX, XW - 0.10, YS - 0.6, YN + 0.6, -0.07, -0.03, plo, "y")
    wood.box(EX - 0.075, EX + 0.02, YS - 0.6, YN + 0.6, -0.19, -0.022, plo, "y")       # the edge beam
    for y in ys[::2]:                                                                # veranda posts
        wood.box(EX + 0.03, EX + 0.15, y - 0.06, y + 0.06, -0.03, 2.57, plo, "z")
    wood.box(EX + 0.02, EX + 0.16, YS - 0.6, YN + 0.6, 2.57, 2.71, plo, "y")           # the beam they carry
    # the eave: its lip sets where the sun's shadow line falls on the paper (dims hall.eave_z by day)
    ceil.quad([(XW - 0.10, YS - 0.8, 3.36), (XW - 0.10, YN + 0.8, 3.36), (XW - 2.05, YN + 0.8, 2.70),
               (XW - 2.05, YS - 0.8, 2.70)], brd)
    wood.box(XW - 2.09, XW - 2.03, YS - 0.8, YN + 0.8, 2.66, 2.80, plo, "y")
    dark = plain("Underside", "#0c0b0a", rough=0.9, spec=0.05)
    plas.quad([(EX + 0.03, YS - 0.8, -0.075), (HX + 0.3, YS - 0.8, -0.075), (HX + 0.3, YN + 1.2, -0.075),
               (EX + 0.03, YN + 1.2, -0.075)], dark)
    plas.quad([(EX + 0.03, YN + 0.6, GROUND_Z), (EX + 0.03, YS - 0.6, GROUND_Z), (EX + 0.03, YS - 0.6, -0.07),
               (EX + 0.03, YN + 0.6, -0.07)], dark)                                  # the dark under the veranda
    build_garden(coll)

    set_open(None)
    S["hall"] = {
        "wood": wood.build("Hall_wood", coll, bevel=0.004),
        "lattice": thin.build("Hall_lattice", coll),
        "lacquer": lac.build("Hall_lacquer", coll, bevel=0.003),
        "gilt": gilt.build("Hall_gilt", coll),
        "plaster": plas.build("Hall_plaster", coll),
        "paper": paper.build("Shoji_paper", coll),
        "ceiling": ceil.build("Hall_ceiling", coll),
    }
    if not HL.get("runner", False):
        return
    # ---- optional (dims.json hall.runner, with world.table_z = its thickness): a felt runner under
    # the cloth, in two halves with the rod's groove between them. Its long edges wander by a few
    # millimetres, as cut felt does. Off by default: the cloth lies directly on the tatami.
    rx0, rx1 = WD["runner_x"]
    pad = WD["runner_pad"]
    g = 0.022
    felt = C.hall_material("felt")
    rs = np.random.RandomState(4)
    vs, fs = [], []
    for (ya, yb) in ((Y0 - pad, -g), (g, Y0 + L_BOLT + pad)):
        n = int((yb - ya) / 0.11) + 2
        yy = np.linspace(ya, yb, n)
        wl = np.convolve(rs.randn(n + 8), np.ones(9) / 9.0, "valid") * 0.006
        wr = np.convolve(rs.randn(n + 8), np.ones(9) / 9.0, "valid") * 0.006
        b = len(vs)
        for i in range(n):
            vs += [(rx0 + wl[i], yy[i], 0.0), (rx0 + wl[i], yy[i], T), (rx1 + wr[i], yy[i], T), (rx1 + wr[i], yy[i], 0.0)]
        for i in range(n - 1):
            a, c2 = b + 4 * i, b + 4 * (i + 1)
            fs += [(a + 1, a + 2, c2 + 2, c2 + 1), (a, a + 1, c2 + 1, c2), (a + 2, a + 3, c2 + 3, c2 + 2)]
        e = b + 4 * (n - 1)
        fs += [(b + 3, b + 2, b + 1, b), (e, e + 1, e + 2, e + 3)]
    me = bpy.data.meshes.new("Runner")
    me.from_pydata(vs, [], fs)
    me.materials.append(felt)
    S["runner"] = _obj("Runner", me, coll)


def build_daylight():
    """World = the garden HDRI seen through the open shoji; a far, narrow 'sun' through that opening.
    The room itself is lit by the paper (emissive, so every surface samples it directly)."""
    sc = bpy.context.scene
    wo = bpy.data.worlds.new("Garden")
    if not wo.node_tree:
        wo.use_nodes = True
    nt = wo.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    nt.links.new(bg.outputs[0], out.inputs["Surface"])
    hp = C.hdri_path()
    if hp:
        tc = nt.nodes.new("ShaderNodeTexCoord")
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Rotation"].default_value = (0.0, 0.0, math.radians(HL.get("hdri_rot", 0.0)))
        env = nt.nodes.new("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(hp, check_existing=True)
        nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
        tint = nt.nodes.new("ShaderNodeMix")
        tint.data_type, tint.blend_type = "RGBA", "MULTIPLY"
        tint.inputs[0].default_value = 1.0
        tint.inputs[7].default_value = (1.0, 1.0, 1.0, 1.0)
        nt.links.new(env.outputs["Color"], tint.inputs[6])
        nt.links.new(tint.outputs[2], bg.inputs["Color"])
        # as light the garden keeps its strength; to the lens it is held where a photograph would hold it
        lp = nt.nodes.new("ShaderNodeLightPath")
        mx = nt.nodes.new("ShaderNodeMix")
        mx.data_type = "FLOAT"
        mx.inputs[2].default_value = HL.get("hdri_strength", 1.6)
        mx.inputs[3].default_value = HL.get("hdri_visible", 3.6)
        nt.links.new(lp.outputs["Is Camera Ray"], mx.inputs[0])
        gain = nt.nodes.new("ShaderNodeMath")
        gain.operation = "MULTIPLY"
        gain.inputs[1].default_value = 1.0
        nt.links.new(mx.outputs[0], gain.inputs[0])
        nt.links.new(gain.outputs[0], bg.inputs["Strength"])
        S["world"] = (tint, gain)
    else:
        bg.inputs["Color"].default_value = (0.75, 0.85, 1.0, 1.0)
        bg.inputs["Strength"].default_value = 3.0
    sc.world = wo
    try:
        wo.cycles.sampling_method = "NONE"       # it only shows through one opening: BSDF sampling is enough
    except Exception:
        pass
    coll = _coll("Lights")
    # The shoji as light. Sun reaches the paper below the eave's shadow line; above it the paper is in
    # shade. Three long rectangles in front of the paper carry that into the room.
    zt0, zt1 = NAG_Z + NAG_H + 0.035, NAG2_Z - 0.035
    ez, rs, sh = HL["eave_z"], HL["shoji_radiance"], HL["shoji_shade"]
    warm, cool = (1.0, 0.90, 0.74), (0.86, 0.92, 1.0)
    for nm, z0, z1, rad, col in (("ShojiSun", 0.42, ez, rs * 0.80, warm),
                                 ("ShojiShade", ez, KAMOI_Z - 0.036, rs * sh, cool),
                                 ("TransomLight", zt0, zt1, rs * sh, cool)):
        li = bpy.data.lights.new(nm, "AREA")
        li.shape = "RECTANGLE"
        li.size, li.size_y = (YN - YS), (z1 - z0)
        li.energy = AREA_W * rad * li.size * li.size_y * 0.82      # 0.82: posts, frames and lattice
        li.color = col
        ob = _obj(nm, li, coll)
        ob.location = (XW - 0.002, 0.5 * (YS + YN), 0.5 * (z0 + z1))
        ob.rotation_mode = "QUATERNION"
        ob.rotation_quaternion = Vector((1, 0, 0)).to_track_quat("-Z", "Y")
        ob.visible_camera = False
    if HL.get("sun_strength", 0) <= 0:
        return
    el, az = math.radians(HL.get("sun_elevation", 34.0)), math.radians(HL.get("sun_azimuth", 14.0))
    d = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), -math.sin(el)))
    # one real sun: it reaches the room only through whatever shoji stand open, past the eave
    li = bpy.data.lights.new("Sun", "SUN")
    li.energy = HL["sun_strength"] / math.pi        # the level of the spot lamps this replaces
    li.angle = math.radians(0.54)
    li.color = (1.0, 0.86, 0.68)
    ob = _obj("Sun", li, coll)
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = d.to_track_quat("-Z", "Y")


# =========================================================================== rack

IKO_X = WD["post_x"]            # the iko's posts
BAR_Z = ROD_TOP                 # centre height of its crossbar
BAR_R = 0.019
ROBE_W, ROBE_H = 1.276, 1.534   # the Met robe: width and height in metres (museum record)
ROBE_SRC = os.path.join(C.ROOT, "site", "assets", "photos", "met-76731-cut-1068.webp")


def build_furniture():
    """The iko (kimono rack) with the museum robe on it and a gold folding screen behind: collection
    'Iko'. The v2 rising rod is still created (the cloth code moves it) but never rendered."""
    lac = C.hall_material("lacquer")
    hidden = _coll("RackHidden")
    rod = cylinder("Rod", (-0.95, 0, 0), (0.95, 0, 0), ROD_R, lac, hidden, n=12)
    cols = [box("RodCollar_%d" % sx, sx * IKO_X - 0.03, sx * IKO_X + 0.03, -0.03, 0.03, -0.03, 0.03, lac, hidden)
            for sx in (-1, 1)]
    for ob in [rod] + cols:
        ob.hide_render = ob.hide_viewport = True
    S["rod"], S["collars"] = rod, cols
    coll = _coll("Iko")
    build_iko(coll, lac)
    S["robe"] = build_robe(coll)
    build_byobu(coll)


def build_iko(coll, lq):
    """Black-lacquered wooden rack: two posts on long feet, a lower stretcher, a crossbar whose ends
    turn up a little."""
    b = MB()
    for sx in (-1, 1):
        x = sx * IKO_X
        b.box(x - 0.0225, x + 0.0225, -0.0225, 0.0225, 0.06, BAR_Z + 0.075, lq, "z")
        b.box(x - 0.031, x + 0.031, -0.30, 0.30, 0.0, 0.062, lq, "y")
        b.box(x - 0.026, x + 0.026, -0.13, 0.13, 0.062, 0.098, lq, "y")
    b.box(-IKO_X, IKO_X, -0.015, 0.015, 0.30, 0.348, lq, "x")
    b.build("Iko_frame", coll, bevel=0.005)
    # the crossbar: an eight-sided section swept along x, rising at both ends
    xs = np.linspace(-1.06, 1.06, 61)
    zs = BAR_Z + 0.06 * np.clip((np.abs(xs) - 0.90) / 0.16, 0, 1) ** 2
    k = 8
    prof = [(BAR_R * math.cos(2 * math.pi * (j + 0.5) / k) / math.cos(math.pi / k) * 0.92,
             BAR_R * math.sin(2 * math.pi * (j + 0.5) / k) / math.cos(math.pi / k) * 0.92) for j in range(k)]
    vs, fs = [], []
    for x, z in zip(xs, zs):
        vs += [(float(x), py, float(z) + pz) for (py, pz) in prof]
    for i in range(len(xs) - 1):
        for j in range(k):
            a, b2 = i * k + j, i * k + (j + 1) % k
            fs.append((a, b2, b2 + k, a + k))
    fs.append(tuple(range(k))[::-1])
    fs.append(tuple((len(xs) - 1) * k + j for j in range(k)))
    me = bpy.data.meshes.new("Iko_bar")
    me.from_pydata(vs, [], fs)
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(lq)
    _obj("Iko_bar", me, coll)


def robe_material(png, back=False):
    name = "Robe_back" if back else "Robe_front"
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = C._new_mat(name)
    nt = C._nodes(mat)
    N, L = nt.nodes.new, nt.links.new
    out = N("ShaderNodeOutputMaterial")
    bsdf = N("ShaderNodeBsdfPrincipled")
    L(bsdf.outputs["BSDF"], out.inputs["Surface"])
    tc = N("ShaderNodeTexCoord")
    tex = N("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(png, check_existing=True)
    tex.interpolation = "Cubic"
    tex.extension = "CLIP"
    L(tc.outputs["UV"], tex.inputs["Vector"])
    L(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    ivory = (0.66, 0.60, 0.50, 1.0)
    if back:
        bsdf.inputs["Base Color"].default_value = ivory
    else:
        geo = N("ShaderNodeNewGeometry")
        lift = C._mixc(nt, 1.0, tex.outputs["Color"], (1.28, 1.26, 1.22), "MULTIPLY")    # the photo is a little dark
        L(C._mixc(nt, geo.outputs["Backfacing"], lift, ivory), bsdf.inputs["Base Color"])
    # the weave: relief from the photograph's own light and dark, plus a fine thread grain
    bw = N("ShaderNodeRGBToBW")
    L(tex.outputs["Color"], bw.inputs["Color"])
    b1 = N("ShaderNodeBump")
    b1.inputs["Strength"].default_value = 0.0 if back else 0.22
    b1.inputs["Distance"].default_value = 0.0008
    L(bw.outputs["Val"], b1.inputs["Height"])
    mp = N("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (ROBE_W, ROBE_H, 1.0)
    L(tc.outputs["UV"], mp.inputs["Vector"])
    b2, _ = C._grain(nt, mp.outputs["Vector"], 2200.0, 0.18, 0.0002)
    L(b1.outputs["Normal"], b2.inputs["Normal"])
    L(b2.outputs["Normal"], bsdf.inputs["Normal"])
    C._silk(nt, bsdf, rough=0.52, sheen=0.32, spec=0.40)
    return mat


def build_robe(coll):
    """The museum object: the Met's photograph of the robe (front, laid flat) on a fine sheet of the
    robe's true size, cut to the photograph's outline, hung from the crossbar by its shoulder line
    and draped in code: folds that grow towards the hem, falling sleeves, a plain back."""
    if not os.path.exists(ROBE_SRC):
        print("[scene] robe photograph missing:", ROBE_SRC)
        return None
    from PIL import Image
    im = Image.open(ROBE_SRC).convert("RGBA")
    png = os.path.join(C.TEX_DIR, "met_76731_front.png")
    if not os.path.exists(png):
        os.makedirs(C.TEX_DIR, exist_ok=True)
        im.save(png + ".tmp.png")
        os.replace(png + ".tmp.png", png)
    al = np.asarray(im)[:, :, 3]
    hh, ww = al.shape
    yy, xx = np.where(al > 128)
    x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    wrow = (al[:, x0:x1] > 128).sum(1)
    ysh = int(np.argmax(wrow > 0.8 * (x1 - x0)))                 # the shoulder line in the photograph
    nx, nz = 170, 200
    px = np.linspace(x0, x1, nx + 1)
    py = np.linspace(y0, y1, nz + 1)
    X, PY = np.meshgrid((px - 0.5 * (x0 + x1)) / (x1 - x0) * ROBE_W, py)
    s = (PY - ysh) / (y1 - y0) * ROBE_H                          # metres below the shoulder line
    sp = np.clip(s, 0, None)
    hem = (y1 - ysh) / (y1 - y0) * ROBE_H
    sn = np.clip(sp / hem, 0, 1)
    body = np.abs(X) < 0.30
    ss = np.clip(sp / 0.49, 0, 1)                                # fraction of the sleeve drop
    amp = np.where(body, 0.004 + 0.051 * sn ** 1.4, 0.004 + 0.030 * ss ** 1.2)       # fold depth, metres
    wander = 0.9 * np.sin(1.7 * sp)
    folds = (0.55 * np.sin(2 * np.pi * X / 0.215 + wander + 0.4) + 0.30 * np.sin(2 * np.pi * X / 0.128 + 1.3 + 0.6 * sp)
             + 0.15 * np.sin(2 * np.pi * X / 0.37 - 0.8))
    d = amp * folds + np.where(body, 0.014 * np.sin(np.pi * sn) * np.cos(np.pi * X / 0.62), 0.0)
    t_out = np.clip((np.abs(X) - 0.30) / 0.34, 0, 1)
    Xc = X * (1.0 - np.where(body, 0.085 * sn ** 1.5, 0.03 * ss)) - np.sign(X) * 0.020 * t_out * ss   # hem pulls in
    dz = -0.030 * t_out ** 2 * ss + np.where(body, 0.016 * np.sin(2 * np.pi * X / 0.215 + 0.4) * sn ** 3, 0.0)
    # the shoulder line sags between the ends of the crossbar: held at the sleeve ends, lowest in the middle
    sag = 0.032 * np.clip(1.0 - (np.abs(X) / (0.5 * ROBE_W)) ** 2, 0, 1)
    dz = dz - sag
    zsh = BAR_Z + BAR_R + 0.002
    over = np.clip(-s, 0, None)                                  # the collar stands above the bar, leaning back
    k = np.clip(sp / 0.05, 0, 1)
    k = k * k * (3 - 2 * k)
    k2 = np.maximum(k, np.clip(sag / 0.010, 0, 1))     # where it sags, the cloth hangs in front of the bar
    Yw = -(0.004 + (BAR_R + 0.004) * k2) - d * k + 0.20 * over
    Zw = zsh - sp + 0.97 * over + dz
    co = np.stack([Xc, Yw, Zw], -1).reshape(-1, 3)
    uv = np.stack([np.broadcast_to(px / ww, X.shape), 1.0 - PY / hh], -1).reshape(-1, 2)
    ai = al[np.clip(PY.astype(int), 0, hh - 1), np.clip(np.broadcast_to(px, X.shape).astype(int), 0, ww - 1)]
    faces = []
    n1 = nx + 1
    for j in range(nz):
        row = ai[j:j + 2].max(0)
        for i in range(nx):
            if max(row[i], row[i + 1]) > 8:
                a = j * n1 + i
                faces.append((a, a + n1, a + n1 + 1, a + 1))
    obs = []
    for nm, off, back in (("Robe", 0.0, False), ("Robe_back", 0.006, True)):
        me = bpy.data.meshes.new(nm)
        me.from_pydata((co + np.array([0.0, off, 0.0])).tolist(), [], faces)
        lv = np.zeros(len(me.loops), np.int32)
        me.loops.foreach_get("vertex_index", lv)
        me.uv_layers.new(name="UVMap").data.foreach_set("uv", uv[lv].ravel().astype(np.float32))
        me.polygons.foreach_set("use_smooth", np.ones(len(me.polygons), bool))
        me.materials.append(robe_material(png, back))
        me.update()
        obs.append(_obj(nm, me, coll))
    return obs


def build_byobu(coll):
    """A six-panel gold-leaf folding screen standing in a zig-zag behind the iko."""
    lq = C.hall_material("lacquer")
    back = plain("ByobuBack", "#3b3026", rough=0.85, spec=0.1)
    w, h, z0 = 0.60, 1.72, 0.025
    ang = math.radians(13.0)
    y_near = HL.get("byobu_y", 1.15)
    fr = MB()
    p = Vector((-3 * w * math.cos(ang), y_near + w * math.sin(ang), z0))
    up = Vector((0, 0, 1))
    for i in range(6):
        sgn = -1.0 if i % 2 == 0 else 1.0
        pu = Vector((w * math.cos(ang), sgn * w * math.sin(ang), 0.0))
        e = pu.normalized()
        nrm = e.cross(up)                         # towards the south (the viewer)
        gold_panel("gold_byobu_%d" % (i + 1), p + nrm * 0.011, pu, up * h, coll)
        b = 0.022
        q = p + nrm * 0.0125
        for (a0, a1, c0, c1) in ((0.0, w, 0.0, b), (0.0, w, h - b, h), (0.0, b, b, h - b), (w - b, w, b, h - b)):
            fr.quad([q + e * a0 + up * c0, q + e * a1 + up * c0, q + e * a1 + up * c1, q + e * a0 + up * c1], lq)
        fr.quad([p + pu - nrm * 0.011, p - nrm * 0.011, p - nrm * 0.011 + up * h, p + pu - nrm * 0.011 + up * h], back)
        for (a, sg) in ((0.0, -1.0), (w, 1.0)):   # the panel's edges
            c = p + e * a
            pts = [c - nrm * 0.011, c + nrm * 0.011, c + nrm * 0.011 + up * h, c - nrm * 0.011 + up * h]
            fr.quad(pts if sg > 0 else pts[::-1], lq)
        fr.quad([p - nrm * 0.011 + up * h, p + nrm * 0.011 + up * h, p + pu + nrm * 0.011 + up * h,
                 p + pu - nrm * 0.011 + up * h], lq)
        p = p + pu
    fr.build("Byobu_frame", coll)


def set_groups(iko=True, cloth=False, form=False, robe=None):
    """Which of the movable things are rendered: the iko with the screen (and, unless robe=False, the
    museum robe); the procedural bolt and pieces (call after update_cloth / update_exploded, which
    set their own visibility); the mannequin."""
    for ob in _coll("Iko").all_objects:
        ob.hide_render = ob.hide_viewport = not iko
    if robe is not None and S.get("robe"):
        for ob in S["robe"]:
            ob.hide_render = ob.hide_viewport = not robe
    if not cloth:
        for ob in _coll("Cloth").all_objects:
            ob.hide_render = ob.hide_viewport = True
    for ob in _coll("DressForm").all_objects:
        if not form:
            ob.hide_render = ob.hide_viewport = True
        elif S.get("form_state") is None:
            ob.hide_render = ob.hide_viewport = False


def _build_rack(coll, lac, xy, floor_z=0.0):
    return []


# =========================================================================== cloth: geometry functions

def rod_z(f):
    """Rod centre height. Flush in its slot until C, then rises to ROD_TOP."""
    c0, c1 = M["rod_frames"]
    return (T - ROD_R) + (ROD_TOP - (T - ROD_R)) * ramp(f, c0, c1, smoothstep)


def profile(s, d, zc):
    """Cloth draped over the rod (centre height zc) and running onto the dais.
    s >= 0: arc length from the line on top of the rod; d: layer offset (array).
    Returns (yy, zz): outward horizontal distance from the rod axis, and height."""
    s = np.asarray(s, np.float64)
    d = np.broadcast_to(np.asarray(d, np.float64), s.shape)
    Re = ROD_R + d
    zp = T + d
    delta = zc + Re - zp
    if np.all(delta <= 1e-7):
        return s.copy(), zp.copy()
    delta = np.maximum(delta, 1e-7)
    reach = 0.16 * (1.0 - np.clip(delta / 1.1, 0, 1)) + 1e-5
    th = np.arctan2(delta, reach)
    rb = 0.06
    thmax = np.arccos(np.clip(1.0 - (delta * 0.98) / (Re + rb), -1, 1))
    th = np.minimum(th, thmax)
    th = np.maximum(th, 1e-6)
    p1y, p1z = Re * np.sin(th), zc + Re * np.cos(th)
    ln = np.maximum((p1z - zp - rb * (1 - np.cos(th))) / np.sin(th), 0.0)
    p2y, p2z = p1y + ln * np.cos(th), p1z - ln * np.sin(th)
    c2y, c2z = p2y + rb * np.sin(th), p2z + rb * np.cos(th)
    s1 = Re * th
    s2 = s1 + ln
    s3 = s2 + rb * th
    yy = np.empty_like(s)
    zz = np.empty_like(s)
    m1 = s < s1
    phi = s / Re
    yy = np.where(m1, Re * np.sin(phi), yy)
    zz = np.where(m1, zc + Re * np.cos(phi), zz)
    m2 = (~m1) & (s < s2)
    u = s - s1
    yy = np.where(m2, p1y + u * np.cos(th), yy)
    zz = np.where(m2, p1z - u * np.sin(th), zz)
    m3 = (~m1) & (~m2) & (s < s3)
    psi = th - (s - s2) / rb
    yy = np.where(m3, c2y - rb * np.sin(psi), yy)
    zz = np.where(m3, c2z - rb * np.cos(psi), zz)
    m4 = ~(m1 | m2 | m3)
    yy = np.where(m4, c2y + (s - s3), yy)
    zz = np.where(m4, zp, zz)
    return yy, zz


def hang_length(zc, d=D0):
    """Arc length from the top of the rod to where the cloth meets the dais."""
    Re = ROD_R + d
    delta = zc + Re - (T + d)
    if delta <= 1e-7:
        return 0.0
    # numeric: find s where profile reaches the flat part
    ss = np.linspace(0, 2.5, 2501)
    yy, zz = profile(ss, d, zc)
    on = np.where(zz <= T + d + 1e-6)[0]
    return ss[on[0]] if len(on) else 2.5


_SWING = {}


def _leave_frame(lh):
    if lh in _SWING:
        return _SWING[lh]
    c0, c1 = M["rod_frames"]
    f0 = None
    for k in range(int(c0 * 10), int(c1 * 10) + 1):
        f = k / 10.0
        if hang_length(rod_z(f)) >= lh:
            f0 = f
            break
    _SWING[lh] = f0 if f0 is not None else float(c1)
    return _SWING[lh]


def swing_angle(group, f):
    """Small damped pendulum swing after a strip leaves the dais. group 'sleeve' or 'body'."""
    lh, amp, per, tau = ((C.SLEEVE, 0.055, 27.0, 16.0) if group == "sleeve" else (C.BODY, 0.03, 48.0, 22.0))
    f0 = _leave_frame(lh)
    if f <= f0:
        return 0.0
    u = f - f0
    env = 1.0 - ramp(f, M["swing_off"][0], M["swing_off"][1], smoothstep)
    return amp * math.exp(-u / tau) * math.sin(2 * math.pi * u / per) * smoothstep(u / 4.0) * env


def hang_map(x, y, d, f):
    """Flat-layout garment point (x, y) with layer offset d -> world xyz at cloth frame f (stage C on)."""
    x = np.asarray(x, np.float64)
    y = np.asarray(y, np.float64)
    zc = rod_z(f)
    side = np.where(y < 0, -1.0, 1.0)
    yy, zz = profile(np.abs(y), d, zc)
    wy = side * yy
    wz = zz
    # swing about the rod axis (whole strip rotates like a pendulum); only once it is off the dais
    sl = swing_angle("sleeve", f)
    bd = swing_angle("body", f)
    ang = np.where(np.abs(x) > C.W + 1e-4, sl, bd)
    if np.any(ang != 0):
        ry, rz = wy, wz - zc
        ca, sa = np.cos(ang), np.sin(ang)
        wy = ry * ca - rz * sa
        wz = zc + ry * sa + rz * ca
    return np.stack([x, wy, wz], -1)


# --------------------------------------------------------------------------- pieces

class Piece:
    """A rectangle of the cut bolt. Grid (a across 0..wa, b along 0..lb).
    bolt pose: world x = w0 + a, y = Y0 + s0 + b.
    flat(a, b) -> flat garment coordinates (also world xy of the dais layout for main strips)."""

    def __init__(self, name, s0, lb, w0, wa, uvf, flatf, d, kind, wait=None, db=0.008, na=5):
        self.name, self.s0, self.lb, self.w0, self.wa = name, s0, lb, w0, wa
        self.d, self.kind, self.wait = d, kind, wait
        nb = max(2, int(round(lb / db)) + 1)
        self.na, self.nb = na, nb
        a = np.linspace(0, wa, na)
        b = np.linspace(0, lb, nb)
        self.A, self.B = np.meshgrid(a, b)            # (nb, na)
        self.uv = np.stack(uvf(self.A, self.B), -1)
        self.flatf = flatf
        self.ob = None

    def bolt_xy(self):
        return self.w0 + self.A, Y0 + self.s0 + self.B

    def flat_xy(self):
        return self.flatf(self.A, self.B)


def _uv_garment(dx, dy, s0, w0):
    def f(a, b):
        x = w0 + a + dx
        y = Y0 + s0 + b + dy
        return C.garment_uv(x, y)
    return f


def _flat_main(dx, dy, s0, w0):
    def f(a, b):
        return (w0 + a + dx, Y0 + s0 + b + dy)
    return f


def build_pieces():
    coll = _coll("Cloth")
    mat = C.fabric_material("kimono", name="K_kimono_bolt")
    nd = mat.node_tree.nodes.get("lining_mix")
    if nd:
        nd.outputs[0].default_value = 0.0
    lin = C.fabric_material("lining", name="K_lining_strip")
    G = DIMS["garment"]
    sl, bd = 0.98, 3.20
    cuts = [0.0, sl, 2 * sl, 2 * sl + bd, 2 * sl + 2 * bd]          # 0, .98, 1.96, 5.16, 8.36
    sec0 = cuts[-1]
    okl = C.OKUMI_PIECE_L                                            # 1.40
    hw = C.HALF
    P = []
    # main strips: (name, s0, len, flat centre x) ; flat y centre 0
    for nm, s0, ln, cx in (("sleeve_l", 0.0, sl, -0.54), ("sleeve_r", sl, sl, 0.54),
                           ("body_l", 2 * sl, bd, -0.18), ("body_r", 2 * sl + bd, bd, 0.18)):
        dx = cx - 0.0
        dy = -(Y0 + s0 + ln / 2.0)
        P.append(Piece(nm, s0, ln, -W / 2, W, _uv_garment(dx, dy, s0, -W / 2), _flat_main(dx, dy, s0, -W / 2),
                       D0 + (0.0003 if "body" in nm else 0.0), "main"))
    # okumi: wearer's left from the first half-strip piece, right from the second
    P.append(Piece("okumi_l", sec0, okl, -hw, hw, lambda a, b: C.okumi_uv("l", a, b),
                   lambda a, b: (a - C.OKUMI_SA, C.OKUMI_Y0 + b), D0 + 0.0016, "acc",
                   wait=(-0.20, 1.80)))
    P.append(Piece("okumi_r", sec0 + okl, okl, -hw, hw, lambda a, b: C.okumi_uv("r", a, b),
                   lambda a, b: (a - C.OKUMI_W, C.OKUMI_Y0 + b), D0 - 0.0009, "acc",
                   wait=(-0.42, 1.80)))
    P.append(Piece("collar", sec0, C.COLLAR_L, 0.0, hw, lambda a, b: C.collar_uv(a, b), None, D0 + 0.0030,
                   "collar", wait=(0.26, 1.80)))
    P.append(Piece("over_collar", sec0 + C.COLLAR_L, C.OVER_COLLAR_L, 0.0, hw,
                   lambda a, b: C.collar_uv(a, b, over=True), None, D0 + 0.0042, "collar", wait=(0.26, 3.85)))
    rem0 = sec0 + 2 * okl
    P.append(Piece("remnant", rem0, L_BOLT - rem0, -W / 2, W,
                   lambda a, b: C.garment_uv(0.46 + 0.5 * (a - 0.18) * 0.5, -1.0 - b), None, D0, "remnant"))
    for p in P:
        p.ob = grid_mesh("Piece_" + p.name, p.na, p.nb, p.uv, mat, coll)
    S["pieces"] = {p.name: p for p in P}
    # collar path (flat garment coords), arc-length parametrised
    S["collar_path"] = _collar_path()
    # lining strips that peek at the hems and sleeve openings (appear with the seams)
    lw = 0.012
    lins = []
    for nm, x0, x1, y0, y1, d in (("lin_back_hem", -0.36, 0.36, -C.BODY - lw, -C.BODY + 0.02, D0 - 0.0006),
                                  ("lin_front_hem", -0.36, 0.36, C.BODY - 0.02, C.BODY + lw, D0 - 0.0012),
                                  ("lin_sleeve_l", -0.72 - lw, -0.70, -0.23, 0.23, D0 - 0.0006),
                                  ("lin_sleeve_r", 0.70, 0.72 + lw, -0.23, 0.23, D0 - 0.0006)):
        na, nb = (9, 3) if "hem" in nm else (3, 25)
        uv = np.full((nb, na, 2), 0.5, np.float32)
        ob = grid_mesh("Lining_" + nm, na, nb, uv, lin, coll)
        lins.append((ob, x0, x1, y0, y1, d, na, nb))
    S["linings"] = lins
    # chalk cut lines
    chalk = C.fabric_material("chalk", name="Chalk")
    lines = []
    for k, (nm, xa, ya, xb, yb) in enumerate((
            ("cut_1", -W / 2, cuts[1], W / 2, cuts[1]), ("cut_2", -W / 2, cuts[2], W / 2, cuts[2]),
            ("cut_3", -W / 2, cuts[3], W / 2, cuts[3]), ("cut_4", -W / 2, cuts[4], W / 2, cuts[4]),
            ("cut_5", 0.0, sec0, 0.0, sec0 + 2 * okl), ("cut_6", -W / 2, sec0 + okl, 0.0, sec0 + okl),
            ("cut_7", 0.0, sec0 + C.COLLAR_L, W / 2, sec0 + C.COLLAR_L),
            ("cut_8", -W / 2, sec0 + 2 * okl, W / 2, sec0 + 2 * okl))):
        me = bpy.data.meshes.new(nm)
        me.from_pydata([(0, 0, 0)] * 4, [], [(0, 1, 2, 3)])
        me.materials.append(chalk)
        ob = _obj("Chalk_" + nm, me, coll)
        lines.append((ob, (xa, Y0 + ya), (xb, Y0 + yb), 120 + 4 * k, 134 + 4 * k))
    S["chalk"] = lines
    # bolt (stage A): one long strip, rolled
    nb = int(L_BOLT / 0.0035) + 1
    b = np.linspace(0, L_BOLT, nb)
    a = np.linspace(0, W, 5)
    A, B = np.meshgrid(a, b)
    uv = np.zeros(A.shape + (2,), np.float64)
    for p in P:
        m = (B >= p.s0 - 1e-9) & (B <= p.s0 + p.lb + 1e-9) & (A - W / 2 >= p.w0 - 1e-9) & \
            (A - W / 2 <= p.w0 + p.wa + 1e-9)
        if p.kind in ("main", "remnant"):
            uu = np.stack(_uvf_for(p)(A - W / 2 - p.w0, B - p.s0), -1)
        else:
            uu = np.stack(_uvf_for(p)(A - W / 2 - p.w0, B - p.s0), -1)
        uv[m] = uu[m]
    S["bolt_ab"] = (A, B)
    S["bolt"] = grid_mesh("Bolt", 5, nb, uv, mat, coll)
    # seam threads
    thr = C.fabric_material("thread", name="Thread")
    seams = []
    for nm, pts, f0, f1 in _seam_list():
        cu = bpy.data.curves.new(nm, "CURVE")
        cu.dimensions = "3D"
        cu.bevel_depth = 0.0011
        cu.bevel_resolution = 1
        cu.use_fill_caps = True
        cu.bevel_factor_mapping_end = "SPLINE"
        sp = cu.splines.new("POLY")
        sp.points.add(len(pts) - 1)
        cu.materials.append(thr)
        ob = _obj("Seam_" + nm, cu, coll)
        seams.append((ob, np.array(pts), f0, f1))
    S["seams"] = seams


_UVF = {}


def _uvf_for(p):
    return p._uvf if hasattr(p, "_uvf") else _rebuild_uvf(p)


def _rebuild_uvf(p):
    # recompute the uv function from the piece name (used for the bolt's per-vertex uv)
    nm = p.name
    if p.kind == "main":
        cx = {"sleeve_l": -0.54, "sleeve_r": 0.54, "body_l": -0.18, "body_r": 0.18}[nm]
        dy = -(Y0 + p.s0 + p.lb / 2.0)
        f = _uv_garment(cx, dy, p.s0, -W / 2)
    elif nm == "okumi_l":
        f = lambda a, b: C.okumi_uv("l", a, b)  # noqa: E731
    elif nm == "okumi_r":
        f = lambda a, b: C.okumi_uv("r", a, b)  # noqa: E731
    elif nm == "collar":
        f = lambda a, b: C.collar_uv(a, b)  # noqa: E731
    elif nm == "over_collar":
        f = lambda a, b: C.collar_uv(a, b, over=True)  # noqa: E731
    else:
        f = lambda a, b: C.garment_uv(0.46 + 0.25 * (a - 0.18), -1.0 - b)  # noqa: E731
    p._uvf = f
    return f


def _collar_path():
    """Collar centre line in flat garment coordinates, from the right front end, round the back neck,
    to the left front end. Returns (points (n,2), cumulative length (n,), layer d (n,))."""
    nh = DIMS["garment"]["neck_half_width"]
    cw = DIMS["garment"]["collar_width"]
    xe = C.OKUMI_W - cw / 2
    ctrl = [(-xe, 0.86), (-xe, 0.55), (nh, 0.004), (nh * 0.7, -0.028), (-nh * 0.7, -0.028), (-nh, 0.004),
            (xe, 0.55), (xe, 0.86)]
    pts = np.array(C._catmull(ctrl, per=40))
    seg = np.r_[0, np.cumsum(np.hypot(*np.diff(pts, axis=0).T))]
    # rescale lengths of the front runs so that the total equals the collar length
    tot = seg[-1]
    k = C.COLLAR_L / tot
    pts_s = pts.copy()
    # stretch along y on the fronts only (keeps the neck shape)
    pts_s[:, 1] = np.where(pts[:, 1] > 0.3, 0.3 + (pts[:, 1] - 0.3) * (1 + (k - 1) * tot / 0.62), pts[:, 1])
    seg = np.r_[0, np.cumsum(np.hypot(*np.diff(pts_s, axis=0).T))]
    # layer: the right (under) run is low, the left (over) run and the back neck high
    mid = seg[-1] / 2
    dl = np.where((seg < mid - 0.35) & (pts_s[:, 0] < 0.05), D0 - 0.0003, D0 + 0.0030)
    return pts_s, seg, dl


def _path_eval(path, b):
    pts, seg, dl = path
    b = np.clip(b, 0, seg[-1])
    x = np.interp(b, seg, pts[:, 0])
    y = np.interp(b, seg, pts[:, 1])
    d = np.interp(b, seg, dl)
    eps = 0.004
    x2 = np.interp(np.clip(b + eps, 0, seg[-1]), seg, pts[:, 0]) - np.interp(np.clip(b - eps, 0, seg[-1]), seg,
                                                                               pts[:, 0])
    y2 = np.interp(np.clip(b + eps, 0, seg[-1]), seg, pts[:, 1]) - np.interp(np.clip(b - eps, 0, seg[-1]), seg,
                                                                               pts[:, 1])
    n = np.hypot(x2, y2) + 1e-9
    return x, y, d, -y2 / n, x2 / n


def _seam_list():
    """(name, flat polyline, frame start, frame end) of the seam threads."""
    def line(p0, p1, n=None):
        n = n or max(2, int(math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 0.02) + 1)
        return [(p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t) for t in np.linspace(0, 1, n)]
    G = DIMS["garment"]
    sa = G["sleeve_attach"]
    st = G["side_seam_top"]
    sd = C.SLEEVE
    out = [("centre_back", line((0.0, -0.012), (0.0, -C.BODY)), 296, 316)]
    for sx, nm in ((-1, "l"), (1, "r")):
        x = sx * C.W
        out.append(("sleeve_" + nm, line((x, -sa), (x, sa)), 300, 312))
        out.append(("side_back_" + nm, line((x, -st), (x, -C.BODY)), 304, 322))
        out.append(("side_front_" + nm, line((x, st), (x, C.BODY)), 304, 322))
        xo = sx * 2 * C.W
        out.append(("sleeve_bot_back_" + nm, line((xo, -sa), (xo, -sd)) + line((xo, -sd), (x, -sd))[1:], 308, 322))
        out.append(("sleeve_bot_front_" + nm, line((xo, sa), (xo, sd)) + line((xo, sd), (x, sd))[1:], 308, 322))
    return out


# --------------------------------------------------------------------------- per-frame cloth

def _bolt_pose(f):
    """Stage A: roll position and per-vertex positions of the rolled bolt."""
    A, B = S["bolt_ab"]
    f0, f1 = M["roll_frames"]
    sc = 0.05 + (L_BOLT - 0.05) * ramp(f, f0, f1, smoothstep)
    h = H_CLOTH
    rfun = lambda l: np.sqrt(RC ** 2 + h * np.maximum(l, 0) / math.pi)  # noqa: E731
    thfun = lambda l: 2 * math.pi * (rfun(l) - RC) / h  # noqa: E731
    lout = L_BOLT - sc
    Rout = rfun(lout)
    yc = Y0 + sc
    zc = T + D0 + Rout
    X = A - W / 2
    Yw = Y0 + B
    Zw = np.full_like(B, T + D0)
    m = B > sc
    l = L_BOLT - B[m]
    dth = thfun(lout) - thfun(l)
    r = rfun(l)
    al = -math.pi / 2 + dth
    Yw[m] = yc + r * np.cos(al)
    Zw[m] = zc + r * np.sin(al)
    return np.stack([X, Yw, Zw], -1), (0.0, yc, zc), Rout


def _glide_offset(p, f):
    """Stage B: 2D offset of a piece from its bolt position at frame f."""
    k = {"sleeve_l": 0, "sleeve_r": 1, "body_l": 2, "body_r": 3, "okumi_l": 4, "okumi_r": 5,
         "collar": 4, "over_collar": 6, "remnant": 7}[p.name]
    side = -1 if p.w0 < -1e-6 and p.wa < W - 1e-6 else (1 if p.wa < W - 1e-6 else 0)
    pa = ramp(f, 150, 160)
    ox = 0.012 * side * pa
    oy = 0.022 * (k - 3.5) * pa
    if p.kind == "remnant":
        return ox, oy
    bx, by = p.bolt_xy()
    if p.kind == "main":
        fx, fy = p.flat_xy()
    else:
        wx, wy = p.wait
        fx, fy = wx + p.A, wy + p.B
    dx = float(fx[0, 0] - bx[0, 0])
    dy = float(fy[0, 0] - by[0, 0])
    if p.kind == "main":
        tx = ramp(f, 158, 176)
        ty = ramp(f, 170, 200)
    else:
        tx = ramp(f, 162, 178)
        ty = ramp(f, 174, 204)
    return ox * (1 - ty) + dx * tx, oy * (1 - ty) + dy * ty


def _acc_hung(p, f):
    """Hung (final) positions of an okumi or collar piece at frame f."""
    if p.kind == "acc":
        x, y = p.flat_xy()
        return hang_map(x, y, p.d, f)
    cw = DIMS["garment"]["collar_width"]
    x, y, d, nx, ny = _path_eval(S["collar_path"], p.B + (0.5 * (C.COLLAR_L - C.OVER_COLLAR_L)
                                                           if p.name == "over_collar" else 0.0))
    off = (p.A / p.wa - 0.5) * cw
    if p.name == "over_collar":
        d = d + 0.0012
    return hang_map(x + nx * off, y + ny * off, d, f)


def _acc_wait(p):
    wx, wy = p.wait
    return np.stack([wx + p.A, wy + p.B, np.full_like(p.A, T + p.d)], -1)


def cloth_frame(f):
    return min(f, STAGE["C"][1])


def update_cloth(f):
    fc = cloth_frame(f)
    bolt = S["bolt"]
    inA = fc < STAGE["B"][0]
    bolt.hide_render = bolt.hide_viewport = not inA
    if inA:
        co, rc, R = _bolt_pose(fc)
        set_coords(bolt, co.reshape(-1, 3))
        S["roll_state"] = (rc, R)
    else:
        S["roll_state"] = ((0.0, Y0 + L_BOLT, T + D0 + RC), RC)
    for p in S["pieces"].values():
        p.ob.hide_render = p.ob.hide_viewport = inA
        if inA:
            continue
        if fc < STAGE["C"][0]:
            bx, by = p.bolt_xy()
            ox, oy = _glide_offset(p, fc)
            co = np.stack([bx + ox, by + oy, np.full_like(bx, T + p.d)], -1)
        elif p.kind == "main":
            x, y = p.flat_xy()
            co = hang_map(x, y, p.d, fc)
        elif p.kind == "remnant":
            bx, by = p.bolt_xy()
            ox, oy = _glide_offset(p, STAGE["C"][0] - 1)
            co = np.stack([bx + ox, by + oy, np.full_like(bx, T + p.d)], -1)
        else:
            a0, a1 = M["attach_frames"][p.name]
            t = ramp(fc, a0, a1)
            w = _acc_wait(p)
            if t <= 0:
                co = w
            else:
                h = _acc_hung(p, fc)
                co = w + (h - w) * t
                co[..., 2] += 0.35 * math.sin(math.pi * t)
                if p.kind == "collar" and t < 1:
                    pass
        set_coords(p.ob, co.reshape(-1, 3))
    # chalk lines
    for (ob, pa, pb, f0, f1) in S["chalk"]:
        t = ramp(fc, f0, f1, smoothstep)
        fade = 1.0 - ramp(fc, 150, 156)
        vis = t > 0 and fade > 0 and STAGE["B"][0] <= fc < STAGE["C"][0]
        ob.hide_render = ob.hide_viewport = not vis
        if not vis:
            continue
        ax, ay = pa
        bx_, by_ = (pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t)
        dx, dy = bx_ - ax, by_ - ay
        ln = math.hypot(dx, dy) + 1e-9
        nx, ny = -dy / ln, dx / ln
        w = 0.0022 * fade
        z = T + D0 + 0.0045
        co = [(ax - nx * w, ay - ny * w, z), (bx_ - nx * w, by_ - ny * w, z), (bx_ + nx * w, by_ + ny * w, z),
              (ax + nx * w, ay + ny * w, z)]
        set_coords(ob, np.array(co))
    # seams
    for (ob, pts, f0, f1) in S["seams"]:
        t = ramp(fc, f0, f1, smoothstep)
        ob.hide_render = ob.hide_viewport = t <= 0.0
        if t <= 0:
            continue
        co = hang_map(pts[:, 0], pts[:, 1], D0 + 0.0055, fc)
        p4 = np.c_[co, np.ones(len(co))]
        ob.data.splines[0].points.foreach_set("co", p4.astype(np.float32).ravel())
        ob.data.bevel_factor_end = t
    # linings
    for (ob, x0, x1, y0, y1, d, na, nb) in S["linings"]:
        t = ramp(fc, 306, 324)
        ob.hide_render = ob.hide_viewport = t <= 0
        if t <= 0:
            continue
        xs = np.linspace(x0, x1, na)
        if "hem" in ob.name:
            ys = np.linspace(y0, y1, nb)
            if y0 < 0:
                ys = np.linspace(y1 - (y1 - y0) * t, y1, nb)
            else:
                ys = np.linspace(y0, y0 + (y1 - y0) * t, nb)
        else:
            ys = np.linspace(y0, y1, nb)
            xs = np.linspace(x1 - (x1 - x0) * t, x1, na) if x0 < 0 else np.linspace(x0, x0 + (x1 - x0) * t, na)
        X, Y = np.meshgrid(xs, ys)
        co = hang_map(X, Y, d, fc)
        set_coords(ob, co.reshape(-1, 3))
    # rod and collars
    zc = rod_z(fc)
    S["rod"].location.z = zc
    for c in S["collars"]:
        c.location.z = zc



# =========================================================================== mannequin

def build_dressform():
    """The mannequin from dressform.py at FORM, facing south; a plain proxy if that module fails."""
    coll = _coll("DressForm")
    S["form_state"] = None
    fx, fy = FORM
    try:
        import importlib
        dressform = importlib.import_module("dressform")
        st = dressform.build(coll, origin=(fx, fy, 0.0), materials=None)
        root = st["root"]
        root.rotation_euler = (0.0, 0.0, math.pi)       # built facing +Y; it must face south
        root.location.z += floor_z(fy)                  # it stands on the jodan
        S["form_state"] = st
        S["dressform"] = dressform
        print("[scene] dressform.py built")
    except Exception as e:  # noqa: BLE001
        print("[scene] dressform unavailable (%r); using a proxy" % (e,))
        for ob in list(coll.all_objects):               # drop whatever a failed build left behind
            bpy.data.objects.remove(ob, do_unlink=True)
        mq = C.fabric_material("mannequin")
        cylinder("FormProxy_torso", (fx, fy, 0.95), (fx, fy, 1.42), 0.15, mq, coll, n=32)
        cylinder("FormProxy_neck", (fx, fy, 1.42), (fx, fy, 1.50), 0.05, mq, coll, n=16)
        cylinder("FormProxy_stand", (fx, fy, 0.03), (fx, fy, 0.95), 0.015, mq, coll, n=12)
        cylinder("FormProxy_base", (fx, fy, 0.0), (fx, fy, 0.03), 0.18, mq, coll, n=32)


def form_t(f):
    return {k: ramp(f, a, b) for k, (a, b) in M["dress_frames"].items()}


def update_dressform(f):
    st = S.get("form_state")
    if st is None:
        return
    try:
        S["dressform"].update(st, form_t(f))
    except Exception as e:  # noqa: BLE001
        print("[scene] dressform.update failed:", e)


# =========================================================================== camera

def _yaw_pitch(pos, target, centre=True):
    dx, dy, dz = (target[0] - pos[0], target[1] - pos[1], target[2] - pos[2])
    yaw = math.atan2(dy, dx)
    pitch = math.atan2(dz, math.hypot(dx, dy))
    if centre:
        pitch += math.atan(-SHIFT_T)          # aim so the target lands at the frame centre
    return yaw, pitch


def _key(pos, target=None, yaw=None, pitch=0.0):
    if target is not None:
        yw, pt = _yaw_pitch(pos, target)
    else:
        yw, pt = math.radians(yaw), pitch
    return np.array([pos[0], pos[1], pos[2], yw, pt], np.float64)


def _unwrap(keys):
    out = [keys[0].copy()]
    for k in keys[1:]:
        k = k.copy()
        while k[3] - out[-1][3] > math.pi:
            k[3] -= 2 * math.pi
        while k[3] - out[-1][3] < -math.pi:
            k[3] += 2 * math.pi
        out.append(k)
    return out


def _hermite_path(keys, u):
    """Non-uniform Catmull-Rom (C1) through keys; knots by chord length (position + 0.6 m per radian)."""
    keys = _unwrap(keys)
    n = len(keys)
    if n == 1:
        return keys[0]
    w = np.array([1, 1, 1, 0.6, 0.6])
    ch = [np.linalg.norm((keys[i + 1] - keys[i]) * w) + 1e-6 for i in range(n - 1)]
    kn = np.r_[0, np.cumsum(ch)] / sum(ch)
    tang = []
    for i in range(n):
        if i == 0 or i == n - 1:
            tang.append(np.zeros(5) if n == 2 else (
                (keys[1] - keys[0]) / (kn[1] - kn[0]) if i == 0 else (keys[-1] - keys[-2]) / (kn[-1] - kn[-2])))
        else:
            tang.append((keys[i + 1] - keys[i - 1]) / (kn[i + 1] - kn[i - 1]))
    i = int(np.searchsorted(kn, u, side="right") - 1)
    i = min(max(i, 0), n - 2)
    h = kn[i + 1] - kn[i]
    t = (u - kn[i]) / h
    t2, t3 = t * t, t * t * t
    return ((2 * t3 - 3 * t2 + 1) * keys[i] + (t3 - 2 * t2 + t) * h * tang[i] + (-2 * t3 + 3 * t2) * keys[i + 1]
            + (t3 - t2) * h * tang[i + 1])


SHUTTER = 0.3             # motion-blur shutter, in frames (a 108 degree shutter: moving frames stay legible)
RACK_DIST = 4.05          # frontal distance from the rack at the rests of C, D and W4
RACK_ORBIT_RX = 3.0       # the D orbit passes on the east side, looking west at the shoji
FORM_Z = 1.15             # camera height in front of the mannequin (so its feet stay in frame)
FORM_ORBIT_RX = 2.6       # the F orbit passes on the west side, looking east at the plaster wall
G_Z = 1.30


def _camera_segments():
    z = CAM_Z
    fx, fy = FORM
    fd = HL["form_dist"]
    s1x, s1y = HL["stops"]["S1"]["xy"]
    s2x, s2y = HL["stops"]["S2"]["xy"]
    a0 = _key((0.06, Y0 - 1.38, 0.33), yaw=90.0)                       # frame 0: low on the axis, level
    a1 = _key((0.55, -3.3, 1.55), (0.0, 1.8, 0.0))
    b1 = _key((0.0, -3.5, 2.55), (0.0, 0.15, 0.0))
    c1 = _key((0.0, -RACK_DIST, z), yaw=90.0)
    d1 = _key((0.0, RACK_DIST, z), yaw=270.0)
    s1 = _key((s1x, s1y, z), yaw=360.0)
    e0 = _key((fx, fy - fd, FORM_Z), yaw=450.0)
    e1 = _key((fx, fy - fd + 0.10, FORM_Z), yaw=450.0)
    f1 = _key((fx, fy + fd - 0.10, FORM_Z), yaw=270.0)
    s2 = _key((s2x, s2y, z), yaw=360.0)
    g0 = _key((0.0, -RACK_DIST, G_Z), yaw=450.0)
    g1 = _key((0.0, -RACK_DIST + 0.08, G_Z), yaw=450.0)
    segs = [
        ("A", [a0, _key((0.42, -5.4, 0.85), (0.0, -2.2, 0.0)), a1]),
        ("B", [a1, _key((0.32, -3.7, 2.2), (0.0, 0.8, 0.0)), b1]),
        ("C", [b1, _key((0.0, -4.1, 2.0), (0.0, 0.0, 0.95)), c1]),
        ("D", "orbitD"),
        ("W1", [d1, s1]),
        ("W2", [s1, _key((0.40, 4.36, 1.36), yaw=404.0), e0]),
        ("E", [e0, e1]),
        ("F", "orbitF"),
        ("W3", [f1, _key((1.30, 9.45, 1.30), yaw=259.0), _key((1.90, 7.40, 1.42), yaw=264.0),
                _key((1.60, 5.00, z), yaw=285.0), _key((0.70, 3.40, z), yaw=326.0), s2]),
        # W4 backs away from the display wall across the hall, then south past the west side of the
        # rack, turning a quarter turn to the north: the hall opens up, then the back of the T slides in
        ("W4", [s2, _key((-1.30, 2.00, z), yaw=372.0), _key((-2.30, 0.20, z), yaw=392.0),
                _key((-2.00, -2.20, 1.40), yaw=420.0), _key((-0.80, -3.70, 1.33), yaw=442.0), g0]),
        ("G", [g0, g1]),
    ]
    return [(sid, STAGE[sid][0], STAGE[sid][1], keys) for sid, keys in segs]


_SEGS = None


def _segment(f):
    global _SEGS
    if _SEGS is None:
        _SEGS = _camera_segments()
    for seg in _SEGS:
        if f <= seg[2]:
            return seg
    return _SEGS[-1]


def ease_walk(t, a=0.3):
    """Ease for long moves: speed rises smoothly over the first `a` of the time, holds, and falls
    over the last `a`. Zero velocity and acceleration at both ends; peak speed 1/(1-a) of the mean
    (smootherstep peaks at 1.875), so a walk keeps an even pace."""
    t = clamp01(t)
    if t < a:
        x = t / a
        U = a * (x ** 3 - 0.5 * x ** 4)
    elif t <= 1.0 - a:
        U = 0.5 * a + (t - a)
    else:
        x = (1.0 - t) / a
        U = (1.0 - a) - a * (x ** 3 - 0.5 * x ** 4)
    return U / (1.0 - a)


_LONG = ("D", "F", "W3", "W4")


def _stage_u(f):
    """(stage id, keys, eased 0..1 progress). Every stage runs from its first frame - 1 (the previous
    stage's rest) to its last frame with zero velocity at both ends."""
    sid, f0, f1, keys = _segment(f)
    fa = f0 - 1 if f0 > 0 else 0
    t = (f - fa) / float(f1 - fa) if f1 > fa else 1.0
    return sid, keys, (ease_walk(t) if sid in _LONG else smootherstep(t))


_SWAY = ("D", "W1", "W2", "F", "W3", "W4")


def _sway(f, sid, yaw):
    """A very slight hand-held gimbal sway on the moving stages: a few millimetres and about a tenth
    of a degree, faded to nothing (value and velocity) at both ends of the stage."""
    out = np.zeros(5)
    if sid not in _SWAY:
        return out
    f0, f1 = STAGE[sid]
    t = clamp01((f - (f0 - 1)) / float(f1 - (f0 - 1)))
    env = math.sin(math.pi * t) ** 2
    s = f / float(FPS)
    lat = 0.004 * math.sin(2 * math.pi * 0.83 * s + 0.7)
    out[0] = -math.sin(yaw) * lat * env
    out[1] = math.cos(yaw) * lat * env
    out[2] = 0.005 * math.sin(2 * math.pi * 1.66 * s) * env
    out[3] = math.radians(0.12) * math.sin(2 * math.pi * 0.71 * s + 1.3) * env
    out[4] = math.radians(0.07) * math.sin(2 * math.pi * 1.07 * s + 2.1) * env
    return out


def camera_state(f):
    """(x, y, z, yaw, pitch) at full-rate frame f (float allowed)."""
    st = _camera_base(f)
    return st + _sway(min(max(float(f), 0.0), N_FRAMES - 1.0), _segment(min(max(float(f), 0.0), N_FRAMES - 1.0))[0],
                      st[3])


def _camera_base(f):
    f = min(max(float(f), 0.0), N_FRAMES - 1.0)
    sid, keys, u = _stage_u(f)
    if keys == "orbitD":
        ph = -math.pi / 2 + math.pi * u
        x, y = RACK_ORBIT_RX * math.cos(ph), RACK_DIST * math.sin(ph)
        yaw = math.atan2(-y, -x)
        if yaw < 0.25 * math.pi:
            yaw += 2 * math.pi
        return np.array([x, y, CAM_Z, yaw, 0.0])
    if keys == "orbitF":
        fx, fy = FORM
        r = HL["form_dist"] - 0.10
        ph = -math.pi / 2 - math.pi * u
        x, y = fx + FORM_ORBIT_RX * math.cos(ph), fy + r * math.sin(ph)
        yaw = math.atan2(fy - y, fx - x) + 2 * math.pi
        return np.array([x, y, FORM_Z, yaw, 0.0])
    return _hermite_path(keys, u)


def _focus_subject(name, cam, f):
    if name == "roll":
        rc = S.get("roll_state", ((0.0, Y0, 0.05), RC))[0]
        return min((Vector(rc) - cam).length, 4.2)
    if name == "layout":
        return (Vector((0.0, 0.2, 0.0)) - cam).length
    if name == "rack":
        return max((Vector((0.0, 0.0, 1.1)) - cam).length, 2.0)
    if name == "form":
        return max((Vector((FORM[0], FORM[1], 1.1)) - cam).length, 2.0)
    return 3.5        # the display wall


_FOCUS = {"A": ("roll", "roll"), "B": ("roll", "layout"), "C": ("layout", "rack"), "D": ("rack", "rack"),
          "W1": ("rack", "wall"), "W2": ("wall", "form"), "E": ("form", "form"), "F": ("form", "form"),
          "W3": ("form", "wall"), "W4": ("wall", "rack"), "G": ("rack", "rack")}


def focus_state(f):
    """(focus distance, f-stop) at frame f."""
    sid, _, u = _stage_u(f)
    st = camera_state(f)
    cam = Vector((st[0], st[1], st[2]))
    a, b = _FOCUS[sid]
    d = (1 - u) * _focus_subject(a, cam, f) + u * _focus_subject(b, cam, f)
    fstop = 11.0 if sid == "A" else (11.0 + (4.0 - 11.0) * u if sid == "B" else 4.0)   # A keeps the hall readable
    return d, fstop


def build_camera():
    cd = bpy.data.cameras.new("Cam")
    cd.lens = FOCAL
    cd.sensor_width = SENSOR
    cd.sensor_fit = "HORIZONTAL"
    cd.shift_y = SHIFT_Y
    cd.shift_x = 0.0
    cd.clip_start = 0.05
    cd.clip_end = 120.0
    cd.dof.use_dof = True
    cd.dof.aperture_blades = 7
    ob = bpy.data.objects.new("Cam", cd)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.scene.camera = ob
    S["cam"] = ob


def camera_matrix(f):
    """World matrix of the camera at frame f (Blender convention: looks down local -Z, +Y up)."""
    st = camera_state(f)
    rot = Euler((math.pi / 2 + st[4], 0.0, st[3] - math.pi / 2), "XYZ").to_matrix().to_4x4()
    return Matrix.Translation((st[0], st[1], st[2])) @ rot


def update_camera(f, motion=True):
    """Pose the camera. With motion=True the poses of f-1, f, f+1 are keyed so Cycles can blur the
    camera move over the shutter (SHUTTER frames); frames where the camera is still render without blur."""
    sc = bpy.context.scene
    ob = S["cam"]
    ob.animation_data_clear()
    ob.rotation_mode = "QUATERNION"
    mats = {k: camera_matrix(f + k) for k in (-1, 0, 1)}
    moving = (mats[1].translation - mats[-1].translation).length > 2e-4 or \
        mats[1].to_quaternion().rotation_difference(mats[-1].to_quaternion()).angle > 1e-4
    prev = None
    for k in (-1, 0, 1):
        q = mats[k].to_quaternion()
        if prev is not None and q.dot(prev) < 0:
            q.negate()
        prev = q
        ob.location = mats[k].translation
        ob.rotation_quaternion = q
        if motion and moving:
            ob.keyframe_insert("location", frame=f + k)
            ob.keyframe_insert("rotation_quaternion", frame=f + k)
    if motion and moving:
        try:
            for fc in ob.animation_data.action.fcurves:
                for kp in fc.keyframe_points:
                    kp.interpolation = "LINEAR"
        except Exception:
            pass
    sc.render.use_motion_blur = bool(motion and moving)
    sc.render.motion_blur_shutter = SHUTTER
    ob.location = mats[0].translation
    q0 = mats[0].to_quaternion()
    ob.rotation_quaternion = q0
    d, fstop = focus_state(f)
    ob.data.lens, ob.data.shift_y = FOCAL, SHIFT_Y
    ob.data.dof.focus_distance = d
    ob.data.dof.aperture_fstop = fstop
    sc.frame_set(int(f))
    if not (motion and moving):
        ob.location = mats[0].translation
        ob.rotation_quaternion = q0


# =========================================================================== clay pass

def apply_clay():
    """Every object, and every separate part inside a merged object, a flat random colour.
    The paper keeps glowing so the light stays the same."""
    m = bpy.data.materials.new("Clay")
    if not m.node_tree:
        m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bs = nt.nodes.new("ShaderNodeBsdfDiffuse")
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    oi = nt.nodes.new("ShaderNodeObjectInfo")
    add = nt.nodes.new("ShaderNodeMath")
    add.operation = "ADD"
    nt.links.new(geo.outputs["Random Per Island"], add.inputs[0])
    nt.links.new(oi.outputs["Random"], add.inputs[1])
    fr = nt.nodes.new("ShaderNodeMath")
    fr.operation = "FRACT"
    nt.links.new(add.outputs[0], fr.inputs[0])
    hsv = nt.nodes.new("ShaderNodeCombineColor")
    hsv.mode = "HSV"
    nt.links.new(fr.outputs[0], hsv.inputs[0])
    hsv.inputs[1].default_value = 0.42
    hsv.inputs[2].default_value = 0.78
    nt.links.new(hsv.outputs[0], bs.inputs["Color"])
    nt.links.new(bs.outputs[0], out.inputs["Surface"])
    for ob in bpy.data.objects:
        if ob.type not in ("MESH", "CURVE", "FONT"):
            continue
        for slot in ob.material_slots:
            if slot.material is not None and slot.material.name.startswith("H_washi"):
                continue
            slot.material = m
    S["clay"] = True


# =========================================================================== props (three_d/props.py)

TOKO_Y = YN + 0.91            # the tokonoma's back wall
# Where the small things of the room stand unless a shot says otherwise: name -> ((x, y, z), rot_z).
# One arrangement for every shot, so the slides agree with each other: two cushions, the brazier and
# the smoking tray in the light of the open shoji; the document boxes and the folded robe on its tray
# east of the iko.
PROP_LAYOUT = {
    "scroll": ((0.0, TOKO_Y - 0.02, 2.40), 0.0),
    "zabuton_a": ((-1.90, -1.50, 0.0), 0.06),
    "zabuton_b": ((-0.55, -2.85, 0.0), -0.75),
    "brazier": ((-1.12, -2.02, 0.0), 0.5),
    "tobacco_tray": ((-1.62, -2.42, 0.0), 0.32),
    "robe_tray": ((1.43, 0.02, 0.0), 0.07),
    "doc_box_large": ((1.20, 0.80, 0.0), -0.2),
    "doc_box_small": ((1.21, 0.79, 0.12), 0.42),          # on the lid of the large one
}


def build_props():
    """The objects of props.py, if that module is there and builds; the hall renders without it."""
    S["props"] = None
    coll = _coll("Props")
    try:
        import importlib
        props = importlib.import_module("props")
        S["props"] = (props, props.build(coll))
        print("[scene] props.py built")
    except Exception as e:  # noqa: BLE001
        print("[scene] props unavailable (%r); the hall stays bare" % (e,))
        for ob in list(coll.all_objects):
            bpy.data.objects.remove(ob, do_unlink=True)


def place_props(layout=None):
    """layout: None = PROP_LAYOUT; False = nothing but the scroll; or a dict name -> ((x, y, z), rot_z)
    laid over PROP_LAYOUT (a value of None takes that object away)."""
    if not S.get("props"):
        return
    props, st = S["props"]
    lay = dict(PROP_LAYOUT)
    if layout is False:
        lay = {"scroll": PROP_LAYOUT["scroll"]}
    elif layout:
        lay.update(layout)
    names = set(PROP_LAYOUT) | set(getattr(props, "DEFAULT_LAYOUT", {}) or {})
    for nm in names:
        v = lay.get(nm)
        loc, rz = v if v else ((0.0, -60.0, -30.0), 0.0)      # off stage: far under the ground
        try:
            props.place(st, nm, tuple(loc), rot_z=rz)
        except Exception as e:  # noqa: BLE001
            if nm not in S.setdefault("props_warned", set()):
                S["props_warned"].add(nm)
                print("[scene] props.place(%s) failed: %r" % (nm, e))


# =========================================================================== public API

_BUILT = False


def build(res=(1920, 1080), samples=64, preview=False, clay=False, form=True):
    global _BUILT
    if _BUILT:
        return
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    C.setup_cycles(sc, res=res, samples=samples, preview=preview)
    sc.view_settings.exposure = HL.get("exposure", 0.0)
    build_hall()
    build_daylight()
    build_furniture()
    build_pieces()
    if form:
        build_dressform()
    build_props()
    place_props(None)
    build_camera()
    if clay:
        apply_clay()
    _BUILT = True


def apply_frame(f, motion=True):
    f = int(f)
    set_open(None)
    place_props(False)
    set_light(None)
    update_cloth(f)
    update_dressform(f)
    update_camera(f, motion=motion)


# The eight pieces of the drawn-textile kimono, exploded: world offsets (x, y, z) from each piece's
# place in the assembled T. The T is turned half round so its front faces south, like the robe.
EXPLODE = {
    "sleeve_l": (0.62, -0.95, 0.0), "sleeve_r": (-0.62, -0.95, 0.0),
    "body_l": (0.34, -0.95, 0.0), "body_r": (-0.34, -0.95, 0.0),
    "okumi_l": (-0.08, -1.20, 0.0), "okumi_r": (0.08, -1.20, 0.0),
}
# the collar band and the over-collar hang as straight strips at the two ends of the row:
# piece -> (x of the strip's middle, y, z of its top)
EXPLODE_STRAIGHT = {"collar": (-1.75, -0.95, 2.25), "over_collar": (1.75, -0.95, 2.25)}
_ASSEMBLED = {}


def update_exploded(t):
    """t = 0: the eight pieces float apart in front of the iko; t = 1: assembled as the T on its bar."""
    t = clamp01(t)
    fa = STAGE["C"][1]
    for ob in _coll("Cloth").all_objects:
        ob.hide_render = ob.hide_viewport = True
    for nm in list(EXPLODE) + list(EXPLODE_STRAIGHT):
        p = S["pieces"][nm]
        if nm not in _ASSEMBLED:
            if p.kind == "main":
                x, y = p.flat_xy()
                co = hang_map(x, y, p.d, fa)
            else:
                co = _acc_hung(p, fa)
            co = np.array(co, np.float64).reshape(-1, 3)
            co[:, 0] *= -1.0
            co[:, 1] *= -1.0
            _ASSEMBLED[nm] = co
        if nm in EXPLODE:
            co = _ASSEMBLED[nm] + np.array(EXPLODE[nm]) * (1.0 - t)
        else:
            xc, yc, ztop = EXPLODE_STRAIGHT[nm]
            flat = np.stack([xc + p.wa / 2.0 - p.A, np.full_like(p.A, yc), ztop - p.B], -1).reshape(-1, 3)
            co = flat * (1.0 - t) + _ASSEMBLED[nm] * t
        set_coords(p.ob, co)
        p.ob.hide_render = p.ob.hide_viewport = False


# Per-shot lighting. set_light() always restores the day first, so a preset cannot leak.
LIGHT_PRESETS = {
    # a low sun from the north-west side of the shoji: long light across the tatami, clear of the robe
    "morning": dict(sun_elevation=18.0, sun_azimuth=-30.0, sun_gain=1.5, sun_color=(1.0, 0.89, 0.74),
                    shoji_gain=1.0, shoji_color=(1.0, 0.92, 0.80), shade_gain=1.0, shade_color=(0.86, 0.92, 1.0),
                    paper_gain=1.0, paper_sun=(1.0, 0.90, 0.74), eave_z=1.95, exposure=0.0),
    "dusk": dict(sun_elevation=8.0, sun_azimuth=-31.0, sun_gain=1.5, sun_color=(1.0, 0.50, 0.22),
                 shoji_gain=0.45, shoji_color=(1.0, 0.66, 0.40), shade_gain=0.40, shade_color=(0.70, 0.78, 1.0),
                 paper_gain=0.55, paper_sun=(1.0, 0.62, 0.34), eave_z=1.74, exposure=0.7,
                 world_gain=0.42, world_tint=(1.0, 0.74, 0.52)),
}
_DAY = {}


def _paper_nodes():
    nt = bpy.data.materials["H_washi"].node_tree
    bsdf = [n for n in nt.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled"][0]
    return nt.nodes["strength"], nt.nodes["eave_z"], bsdf.inputs["Emission Color"].links[0].from_node


def set_light(preset=None):
    sc = bpy.context.scene
    lights = [ob for ob in _coll("Lights").all_objects if ob.type == "LIGHT"]
    strength, eave, mix = _paper_nodes()
    if not _DAY:
        _DAY["lights"] = {ob.name: (ob.data.energy, tuple(ob.data.color), ob.location.copy(),
                                    ob.rotation_quaternion.copy()) for ob in lights}
        _DAY["paper"] = (strength.outputs[0].default_value, eave.outputs[0].default_value,
                         tuple(mix.inputs[7].default_value))
        _DAY["exposure"] = sc.view_settings.exposure
    for ob in lights:
        e, c, loc, rot = _DAY["lights"][ob.name]
        ob.data.energy, ob.data.color = e, c
        ob.location, ob.rotation_quaternion = loc, rot
    if S.get("world"):
        S["world"][0].inputs[7].default_value = (1.0, 1.0, 1.0, 1.0)
        S["world"][1].inputs[1].default_value = 1.0
    strength.outputs[0].default_value, eave.outputs[0].default_value = _DAY["paper"][:2]
    mix.inputs[7].default_value = _DAY["paper"][2]
    sc.view_settings.exposure = _DAY["exposure"]
    if not preset:
        return
    L = LIGHT_PRESETS[preset]
    el, az = math.radians(L["sun_elevation"]), math.radians(L["sun_azimuth"])
    d = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), -math.sin(el)))
    for ob in lights:
        e, c, loc, rot = _DAY["lights"][ob.name]
        if ob.name == "Sun":
            ob.rotation_quaternion = d.to_track_quat("-Z", "Y")
            ob.data.energy, ob.data.color = e * L["sun_gain"], L["sun_color"]
        elif ob.name == "ShojiSun":
            ob.data.energy, ob.data.color = e * L["shoji_gain"], L["shoji_color"]
        else:
            ob.data.energy, ob.data.color = e * L["shade_gain"], L["shade_color"]
    if S.get("world"):
        S["world"][0].inputs[7].default_value = tuple(L.get("world_tint", (1.0, 1.0, 1.0))) + (1.0,)
        S["world"][1].inputs[1].default_value = L.get("world_gain", 1.0)
    strength.outputs[0].default_value = _DAY["paper"][0] * L["paper_gain"]
    eave.outputs[0].default_value = L["eave_z"]
    mix.inputs[7].default_value = tuple(L["paper_sun"]) + (1.0,)
    sc.view_settings.exposure = _DAY["exposure"] + L["exposure"]


SHUTTER_CLIP = 0.5        # the clips' shutter, in frames (180 degrees, as a film camera)


def _shot_pose(st):
    pos, tgt = Vector(st["pos"]), Vector(st["target"])
    return pos, (tgt - pos).normalized().to_track_quat("-Z", "Y")


def apply_shot(st, before=None, after=None):
    """Put the scene in the state of one slide-deck shot (a dict from shots.py). With `before` and
    `after` (the shots of the neighbouring clip frames) the camera's move is blurred over the shutter."""
    if "explode" in st:
        update_exploded(st["explode"])
    else:
        update_cloth(st.get("cloth_f", 0))
    g = st.get("groups", {})
    set_groups(iko=g.get("iko", False), cloth=g.get("cloth", False), form=g.get("form", False),
               robe=g.get("robe", g.get("iko", False)))
    set_open(st.get("open"))
    place_props(st.get("props"))
    set_light(st.get("light"))
    if g.get("form", False) and S.get("form_state") is not None:
        for ob in _coll("DressForm").all_objects:
            ob.hide_render = ob.hide_viewport = False
        lay = {k: 0.0 for k in M["dress_frames"]}
        lay.update(st.get("layers", {}))
        S["dressform"].update(S["form_state"], lay)
    sc = bpy.context.scene
    ob = S["cam"]
    ob.animation_data_clear()
    ob.rotation_mode = "QUATERNION"
    pos, q = _shot_pose(st)
    blur = before is not None and after is not None
    if blur:
        prev = None
        for k, s2 in ((0, before), (1, st), (2, after)):
            p2, q2 = _shot_pose(s2)
            if prev is not None and q2.dot(prev) < 0:
                q2.negate()
            prev = q2
            ob.location, ob.rotation_quaternion = p2, q2
            ob.keyframe_insert("location", frame=k)
            ob.keyframe_insert("rotation_quaternion", frame=k)
        try:
            for fc in ob.animation_data.action.fcurves:
                for kp in fc.keyframe_points:
                    kp.interpolation = "LINEAR"
        except Exception:
            pass
        sc.frame_set(1)
    else:
        ob.location, ob.rotation_quaternion = pos, q
    cd = ob.data
    cd.lens = st.get("focal", FOCAL)
    cd.shift_y = st.get("shift_y", 0.0)
    cd.dof.focus_distance = st.get("focus") or (Vector(st["target"]) - pos).length
    cd.dof.aperture_fstop = st.get("fstop", 4.0)
    sc.render.use_motion_blur = bool(blur)
    sc.render.motion_blur_shutter = SHUTTER_CLIP


def anchors_world(f):
    """World points for labels at frame f (call after apply_frame(f))."""
    fc = cloth_frame(f)
    out = {}
    rc, R = S["roll_state"]
    out["roll"] = rc
    out["cloth_free_end"] = (0.0, Y0, T + D0)
    for (ob, pa, pb, f0, f1) in S["chalk"][:5]:
        nm = ob.name.replace("Chalk_", "")
        out[nm] = ((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, T + D0)
    for nm, p in S["pieces"].items():
        if nm in ("remnant", "over_collar", "okumi_r"):
            continue
        if fc >= STAGE["B"][0]:
            me = p.ob.data
            co = np.zeros(len(me.vertices) * 3, np.float32)
            me.vertices.foreach_get("co", co)
            c = co.reshape(p.nb, p.na, 3)[p.nb // 2, p.na // 2]
        else:   # stage A: the piece's place on the bolt
            bx, by = p.bolt_xy()
            c = (float(bx[p.nb // 2, p.na // 2]), float(by[p.nb // 2, p.na // 2]), T + D0)
        out["piece_okumi" if nm == "okumi_l" else "piece_" + nm] = tuple(float(v) for v in c)
    out["rod"] = (0.0, 0.0, rod_z(fc) + ROD_R)

    def hm(x, y, d=D0 + 0.004):
        return tuple(float(v) for v in hang_map(np.array([x]), np.array([y]), d, fc)[0])
    out["seam_centre_back"] = hm(0.0, -0.8)
    out["seam_sleeve_l"] = hm(-C.W, -0.12)
    out["seam_side_l"] = hm(-C.W, -1.0)
    out["sleeve_l_centre"] = hm(-0.54, -0.25)
    out["sleeve_r_centre"] = hm(0.54, -0.25)
    out["back_tl"] = hm(-C.W, -0.03)
    out["back_tr"] = hm(C.W, -0.03)
    out["back_bl"] = hm(-C.W, -C.BODY)
    out["back_br"] = hm(C.W, -C.BODY)
    out["collar_front"] = hm(-0.02, 0.30, D0 + 0.006)
    out["overlap_front"] = hm(C.OKUMI_W, 1.05, D0 + 0.006)
    out["hem_front"] = hm(0.0, C.BODY)
    st = S.get("form_state")
    if st is not None:
        try:
            for k, v in S["dressform"].anchors(st).items():
                out[k if k.startswith("form_") else "form_" + k] = tuple(float(c) for c in v)
        except Exception as e:  # noqa: BLE001
            print("[scene] dressform.anchors failed:", e)
    return out


def walls_meta():
    """The two stops in front of the display wall (README meta.json 'walls')."""
    out = {}
    for sid, st in HL["stops"].items():
        out[sid] = {"frame": st["frame"], "pool0": [HX, st["xy"][1], 1.30], "along": [0, -1, 0],
                    "normal": [-1, 0, 0], "spacing": KEN}
    return out
