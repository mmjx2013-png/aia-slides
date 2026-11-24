"""weaving.py - Set 2: the weaving room (three stills).

A small bright wooden room with one shoji window and a plain floor loom (takabata) with a warp
on it, a boat shuttle on the woven cloth, a bench, and a finished rolled bolt on a low stand.
Everything is modelled here in code. Wood, plaster and floor use CC0 photo-scanned textures
from Poly Haven (see CREDITS.md, "Weaving room"); the script falls back to plain colours when a
file is missing.

Usage
    python3 three_d/weaving.py                       # the three finals, 2560x1440
    python3 three_d/weaving.py --shot 2 --res 800x450 --samples 24 --preview --out /tmp/x

    weave_1.png  wide: the loom by the window          35 mm
    weave_2.png  close, along the warp, shuttle        70 mm
    weave_3.png  the finished bolt on its stand        80 mm

Loom space: X across the cloth, Y along the warp (the weaver sits at -Y, the warp beam is at
+Y), Z up, metres. The warp line is at z = ZW.
"""
import argparse
import math
import os
import random
import subprocess
import sys
import time

import bpy  # noqa: I001  (bpy must come first: it provides bmesh and mathutils)
import bmesh
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
import common  # noqa: E402
from common import PAL, hex_rgb, setup_cycles  # noqa: E402

ROOT = common.ROOT
ASSETS = os.path.join(ROOT, "build", "assets")
STILLS = os.path.join(ROOT, "build", "stills")

PH_URL = "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/{id}/{id}_{map}_2k.jpg"

BOLT_W = common.W                     # 0.36
N_ENDS = 432                          # warp threads (12 per cm)
PITCH = BOLT_W / N_ENDS               # 0.833 mm
THREAD_R = 0.00016

# ---- loom numbers
LW = 0.44                             # post centre, +-x
PS = 0.075                            # post section
YF, YB = -0.62, 0.90                  # front / back posts
HT = 1.52                             # post height
ZW = 0.84                             # warp line
Z_LO, Z_MID, Z_TOP = 0.13, 0.56, 1.45
BEAM_R = 0.032
Y_FELL = -0.30
Y_REED = -0.085
Y_SHAFT = 0.14
ROLLER_R = 0.022
LIFT = 0.006                          # the shafts hang a little unevenly: the shed is just open
HEDDLE_H = 0.15
Y_LEASE = (0.44, 0.52)
WARP_ROLL = ((0.70, Z_MID), 0.078)
CLOTH_ROLL = ((-0.46, Z_MID), 0.050)

# ---- room numbers
RX0, RX1, RY0, RY1, RH = -2.0, 1.8, -2.6, 2.2, 2.45
WIN_Y0, WIN_Y1, WIN_Z1 = -0.52, 1.30, 1.76

_rnd = random.Random(11)


# =========================================================================== small helpers

def tex_path(asset, mp):
    """Path of a 2K Poly Haven map in build/assets/<asset>/, fetched with curl when missing."""
    d = os.path.join(ASSETS, asset)
    p = os.path.join(d, "%s_%s_2k.jpg" % (asset, mp))
    if os.path.isfile(p) and os.path.getsize(p) > 10000:
        return p
    try:
        os.makedirs(d, exist_ok=True)
        subprocess.run(["curl", "-sS", "-m", "180", "-f", "-o", p + ".part",
                        PH_URL.format(id=asset, map=mp)], check=True)
        os.replace(p + ".part", p)
        return p
    except Exception as exc:                                    # offline: procedural fallback
        print("weaving: no texture %s/%s (%s)" % (asset, mp, exc))
        return None


def _image(path, colorspace):
    key = os.path.basename(path)
    img = bpy.data.images.get(key)
    if img is None:
        img = bpy.data.images.load(path)
        img.name = key
    img.colorspace_settings.name = colorspace
    return img


def _new_mat(name):
    mat = bpy.data.materials.new(name)
    if not mat.node_tree:
        mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat, nt, bsdf


class G:
    """Tiny node-graph helper: math on sockets or floats."""

    def __init__(self, nt):
        self.nt = nt

    def m(self, op, a, b=None, c=None, clamp=False):
        n = self.nt.nodes.new("ShaderNodeMath")
        n.operation = op
        n.use_clamp = clamp
        for i, v in enumerate((a, b, c)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = float(v)
            else:
                self.nt.links.new(v, n.inputs[i])
        return n.outputs[0]

    def mix(self, blend, fac, a, b):
        n = self.nt.nodes.new("ShaderNodeMix")
        n.data_type = "RGBA"
        n.blend_type = blend
        for sock, v in ((n.inputs[0], fac), (n.inputs[6], a), (n.inputs[7], b)):
            if isinstance(v, (int, float)):
                sock.default_value = float(v)
            elif isinstance(v, tuple):
                sock.default_value = v
            else:
                self.nt.links.new(v, sock)
        return n.outputs[2]

    def maprange(self, v, a0, a1, b0, b1, clamp=True):
        n = self.nt.nodes.new("ShaderNodeMapRange")
        n.clamp = clamp
        self.nt.links.new(v, n.inputs["Value"])
        n.inputs["From Min"].default_value = a0
        n.inputs["From Max"].default_value = a1
        n.inputs["To Min"].default_value = b0
        n.inputs["To Max"].default_value = b1
        return n.outputs["Result"]


def _link(coll, obj, parent=None):
    coll.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def mesh_obj(coll, name, verts, faces, mat=None, uvs=None, smooth=False, parent=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    if uvs is not None:
        layer = me.uv_layers.new(name="UVMap")
        for loop in me.loops:
            layer.data[loop.index].uv = uvs[loop.vertex_index]
    if smooth:
        me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.update()
    if mat is not None:
        me.materials.append(mat)
    return _link(coll, bpy.data.objects.new(name, me), parent)


def _frame(p0, p1, up):
    """4x4 matrix whose local Z runs from p0 to p1 (origin at the middle)."""
    p0, p1 = Vector(p0), Vector(p1)
    z = (p1 - p0).normalized()
    x = Vector(up).cross(z)
    if x.length < 1e-6:
        x = Vector((0.0, 1.0, 0.0)).cross(z)
    if x.length < 1e-6:
        x = Vector((1.0, 0.0, 0.0))
    x.normalize()
    y = z.cross(x)
    m = Matrix((x, y, z)).transposed().to_4x4()
    m.translation = (p0 + p1) * 0.5
    return m, (p1 - p0).length


def stick(coll, name, p0, p1, w, d, mat, up=(0, 0, 1), bevel=0.0025, parent=None):
    """A sawn timber from p0 to p1. Its long axis is local Z (the wood grain follows it);
    w is the section across `up`, d the section along `up` (for a vertical post: w = X, d = Y)."""
    m, length = _frame(p0, p1, up)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= w
        v.co.y *= d
        v.co.z *= length
    if bevel:
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=min(bevel, 0.3 * min(w, d)), segments=2,
                        profile=0.5, affect="EDGES")
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    obj = bpy.data.objects.new(name, me)
    obj.matrix_basis = m
    return _link(coll, obj, parent)


def rod(coll, name, p0, p1, r, mat, up=(0, 0, 1), segs=28, parent=None, uv_metres=False, r1=None):
    """A turned round bar from p0 to p1 (long axis local Z). uv_metres: u along, v round."""
    m, length = _frame(p0, p1, up)
    r1 = r if r1 is None else r1
    verts, faces, uvs = [], [], []
    for k in range(segs + 1):
        a = 2.0 * math.pi * k / segs
        for end, rr in ((-0.5, r), (0.5, r1)):
            verts.append((rr * math.cos(a), rr * math.sin(a), end * length))
            uvs.append((end * length + 0.5 * length, r * a))
    for k in range(segs):
        i = 2 * k
        faces.append((i, i + 2, i + 3, i + 1))
    n0 = len(verts)
    for end, rr in ((-0.5, r), (0.5, r1)):                       # caps (own vertices: sharp rim)
        ring = []
        for k in range(segs):
            a = 2.0 * math.pi * k / segs
            ring.append(len(verts))
            verts.append((rr * math.cos(a), rr * math.sin(a), end * length))
            uvs.append((0.0, 0.0))
        faces.append(tuple(ring) if end > 0 else tuple(reversed(ring)))
    obj = mesh_obj(coll, name, verts, faces, mat, uvs if uv_metres else None, parent=parent)
    me = obj.data
    me.polygons.foreach_set("use_smooth", [i < segs for i in range(len(me.polygons))])
    obj.matrix_basis = m
    assert n0
    return obj


def ribbon(coll, name, path, x0, x1, mat, nx=2, v0=0.0, parent=None, xfun=None, zfun=None):
    """A strip of cloth across X following a (y, z) path. UV in metres: u across, v along."""
    verts, faces, uvs = [], [], []
    s = v0
    for j, (y, z) in enumerate(path):
        if j:
            s += math.hypot(y - path[j - 1][0], z - path[j - 1][1])
        for i in range(nx):
            t = i / (nx - 1.0)
            x = x0 + (x1 - x0) * t
            dx = xfun(t, s) if xfun else 0.0
            dz = zfun(x, s) if zfun else 0.0
            verts.append((x + dx, y, z + dz))
            uvs.append((x - x0, s))
    for j in range(len(path) - 1):
        for i in range(nx - 1):
            a = j * nx + i
            faces.append((a, a + 1, a + nx + 1, a + nx))
    return mesh_obj(coll, name, verts, faces, mat, uvs, smooth=True, parent=parent)


def strands(coll, name, lines, radius, mat, parent=None):
    """Many fine threads as one native curves object (rendered as real round strands)."""
    cu = bpy.data.hair_curves.new(name)
    cu.add_curves([len(ln) for ln in lines])
    cu.set_types(type="POLY")                                    # taut straight spans
    flat = [c for ln in lines for p in ln for c in p]
    cu.attributes["position"].data.foreach_set("vector", flat)
    rad = cu.attributes.get("radius") or cu.attributes.new("radius", "FLOAT", "POINT")
    rad.data.foreach_set("value", [radius] * (len(flat) // 3))
    cu.materials.append(mat)
    return _link(coll, bpy.data.objects.new(name, cu), parent)


def cord(coll, name, pts, r, mat, parent=None, cyclic=False, smooth=False):
    """A rope or a single loose thread: a bevelled 3D curve."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = r
    cu.bevel_resolution = 3
    cu.use_fill_caps = True
    if smooth:
        sp = cu.splines.new("NURBS")
        sp.points.add(len(pts) - 1)
        for p, co in zip(sp.points, pts):
            p.co = (co[0], co[1], co[2], 1.0)
        sp.use_endpoint_u = True
        sp.order_u = 3
        sp.resolution_u = 8
    else:
        sp = cu.splines.new("POLY")
        sp.points.add(len(pts) - 1)
        for p, co in zip(sp.points, pts):
            p.co = (co[0], co[1], co[2], 1.0)
    sp.use_cyclic_u = cyclic
    cu.materials.append(mat)
    return _link(coll, bpy.data.objects.new(name, cu), parent)


def tangent_ccw(c1, r1, c2, r2):
    """Outer tangent of two circles in the (y, z) plane for a band that runs counter-clockwise
    round both (seen with +y to the right). Returns (p1, p2, angle of the contact normal)."""
    dy, dz = c2[0] - c1[0], c2[1] - c1[1]
    dist = math.hypot(dy, dz)
    phi = math.acos((r1 - r2) / dist)
    base = math.atan2(dz, dy)
    a = base - phi
    n = (math.cos(a), math.sin(a))
    return ((c1[0] + r1 * n[0], c1[1] + r1 * n[1]), (c2[0] + r2 * n[0], c2[1] + r2 * n[1]), a)


def arc(c, r, a0, a1, n):
    return [(c[0] + r * math.cos(a0 + (a1 - a0) * k / n), c[1] + r * math.sin(a0 + (a1 - a0) * k / n))
            for k in range(n + 1)]


# =========================================================================== materials

_MATS = {}


def wood_material(name, asset="oak_veneer_01", tile=1.83, scale=1.0, tint=(1.0, 1.0, 1.0),
                  value=1.0, sat=1.0, rough=(0.45, 0.75), bump=0.25, fallback="#a97c4f"):
    """Photo-scanned veneer, box-projected in object space so the grain follows local Z."""
    if name in _MATS:
        return _MATS[name]
    mat, nt, bsdf = _new_mat(name)
    N, L = nt.nodes.new, nt.links.new
    g = G(nt)
    diff = tex_path(asset, "diff")
    rgh = tex_path(asset, "rough")
    tc = N("ShaderNodeTexCoord")
    info = N("ShaderNodeObjectInfo")
    off = N("ShaderNodeCombineXYZ")
    L(g.m("MULTIPLY", info.outputs["Random"], 9.7), off.inputs["X"])
    L(g.m("MULTIPLY", info.outputs["Random"], 5.3), off.inputs["Y"])
    L(g.m("MULTIPLY", info.outputs["Random"], 13.1), off.inputs["Z"])
    add = N("ShaderNodeVectorMath")
    add.operation = "ADD"
    L(tc.outputs["Object"], add.inputs[0])
    L(off.outputs["Vector"], add.inputs[1])
    mp = N("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale / tile,) * 3
    L(add.outputs["Vector"], mp.inputs["Vector"])
    if diff:
        img = N("ShaderNodeTexImage")
        img.image = _image(diff, "sRGB")
        img.projection = "BOX"
        img.projection_blend = 0.2
        L(mp.outputs["Vector"], img.inputs["Vector"])
        col = img.outputs["Color"]
    else:
        nz = N("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = 6.0
        nz.inputs["Detail"].default_value = 6.0
        mp.inputs["Scale"].default_value = (30.0, 30.0, 1.5)
        L(mp.outputs["Vector"], nz.inputs["Vector"])
        col = g.mix("MIX", g.maprange(nz.outputs["Fac"], 0.3, 0.7, 0.0, 1.0),
                    hex_rgb(fallback, 1.0), tuple(0.72 * c for c in hex_rgb(fallback)) + (1.0,))
    hsv = N("ShaderNodeHueSaturation")
    hsv.inputs["Saturation"].default_value = sat
    # every piece of timber is a little lighter or darker than its neighbour
    L(g.maprange(info.outputs["Random"], 0.0, 1.0, value * 0.90, value * 1.08), hsv.inputs["Value"])
    L(col, hsv.inputs["Color"])
    tinted = g.mix("MULTIPLY", 1.0, hsv.outputs["Color"], tuple(tint) + (1.0,))
    L(tinted, bsdf.inputs["Base Color"])
    bw = N("ShaderNodeRGBToBW")
    L(col, bw.inputs["Color"])
    bp = N("ShaderNodeBump")
    bp.inputs["Strength"].default_value = bump
    bp.inputs["Distance"].default_value = 0.0006
    L(bw.outputs["Val"], bp.inputs["Height"])
    L(bp.outputs["Normal"], bsdf.inputs["Normal"])
    if rgh:
        ri = N("ShaderNodeTexImage")
        ri.image = _image(rgh, "Non-Color")
        ri.projection = "BOX"
        ri.projection_blend = 0.2
        L(mp.outputs["Vector"], ri.inputs["Vector"])
        L(g.maprange(ri.outputs["Color"], 0.0, 1.0, rough[0], rough[1]), bsdf.inputs["Roughness"])
    else:
        bsdf.inputs["Roughness"].default_value = 0.5 * (rough[0] + rough[1])
    bsdf.inputs["Specular IOR Level"].default_value = 0.35
    _MATS[name] = mat
    return mat


def uv_material(name, asset, tile, rot=0.0, value=1.0, sat=1.0, tint=(1.0, 1.0, 1.0),
                rough=(0.0, 1.0), normal=1.0, fallback="#d8d0c0", spec=0.3):
    """Photo-scanned surface on a mesh whose UVs are in metres."""
    if name in _MATS:
        return _MATS[name]
    mat, nt, bsdf = _new_mat(name)
    N, L = nt.nodes.new, nt.links.new
    g = G(nt)
    tc = N("ShaderNodeTexCoord")
    info = N("ShaderNodeObjectInfo")
    off = N("ShaderNodeCombineXYZ")
    L(g.m("MULTIPLY", info.outputs["Random"], 3.7), off.inputs["X"])
    L(g.m("MULTIPLY", info.outputs["Random"], 7.9), off.inputs["Y"])
    add = N("ShaderNodeVectorMath")
    add.operation = "ADD"
    L(tc.outputs["UV"], add.inputs[0])
    L(off.outputs["Vector"], add.inputs[1])
    mp = N("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0 / tile,) * 3
    mp.inputs["Rotation"].default_value = (0.0, 0.0, rot)
    L(add.outputs["Vector"], mp.inputs["Vector"])
    diff, nor, rgh = tex_path(asset, "diff"), tex_path(asset, "nor_gl"), tex_path(asset, "rough")
    if diff:
        img = N("ShaderNodeTexImage")
        img.image = _image(diff, "sRGB")
        L(mp.outputs["Vector"], img.inputs["Vector"])
        hsv = N("ShaderNodeHueSaturation")
        hsv.inputs["Saturation"].default_value = sat
        hsv.inputs["Value"].default_value = value
        L(img.outputs["Color"], hsv.inputs["Color"])
        L(g.mix("MULTIPLY", 1.0, hsv.outputs["Color"], tuple(tint) + (1.0,)), bsdf.inputs["Base Color"])
    else:
        bsdf.inputs["Base Color"].default_value = hex_rgb(fallback, 1.0)
    if nor:
        ni = N("ShaderNodeTexImage")
        ni.image = _image(nor, "Non-Color")
        L(mp.outputs["Vector"], ni.inputs["Vector"])
        nm = N("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = normal
        L(ni.outputs["Color"], nm.inputs["Color"])
        L(nm.outputs["Normal"], bsdf.inputs["Normal"])
    if rgh:
        ri = N("ShaderNodeTexImage")
        ri.image = _image(rgh, "Non-Color")
        L(mp.outputs["Vector"], ri.inputs["Vector"])
        L(g.maprange(ri.outputs["Color"], 0.0, 1.0, rough[0], rough[1]), bsdf.inputs["Roughness"])
    else:
        bsdf.inputs["Roughness"].default_value = 0.7
    bsdf.inputs["Specular IOR Level"].default_value = spec
    _MATS[name] = mat
    return mat


def cloth_material(name="W_cloth", pu=PITCH, pv=0.00078):
    """The woven ground: a plain weave drawn thread by thread (UV in metres, u across the
    warp, v along it). Warp i passes over weft j when i + j is even; the wefts are slubbed."""
    if name in _MATS:
        return _MATS[name]
    mat, nt, bsdf = _new_mat(name)
    N, L = nt.nodes.new, nt.links.new
    g = G(nt)
    tc = N("ShaderNodeTexCoord")
    sep = N("ShaderNodeSeparateXYZ")
    L(tc.outputs["UV"], sep.inputs[0])
    u, v = sep.outputs["X"], sep.outputs["Y"]
    a = g.m("DIVIDE", u, pu)
    b = g.m("DIVIDE", v, pv)
    ia, ib = g.m("FLOOR", a), g.m("FLOOR", b)
    fa, fb = g.m("FRACT", a), g.m("FRACT", b)
    sa = g.m("SUBTRACT", 1.0, g.m("MULTIPLY", g.m("FRACT", g.m("MULTIPLY", ia, 0.5)), 4.0))
    sb = g.m("SUBTRACT", 1.0, g.m("MULTIPLY", g.m("FRACT", g.m("MULTIPLY", ib, 0.5)), 4.0))
    zw = g.m("MULTIPLY", sa, g.m("SINE", g.m("MULTIPLY", b, math.pi)))
    zf = g.m("MULTIPLY", g.m("MULTIPLY", sb, -1.0), g.m("SINE", g.m("MULTIPLY", a, math.pi)))
    # slubs: each weft pick swells and thins along its length
    sv = N("ShaderNodeCombineXYZ")
    L(g.m("MULTIPLY", u, 55.0), sv.inputs["X"])
    L(g.m("MULTIPLY", ib, 0.83), sv.inputs["Y"])
    slub = N("ShaderNodeTexNoise")
    slub.inputs["Scale"].default_value = 1.0
    slub.inputs["Detail"].default_value = 2.0
    slub.inputs["Roughness"].default_value = 0.6
    L(sv.outputs["Vector"], slub.inputs["Vector"])
    thick = g.maprange(slub.outputs["Fac"], 0.25, 0.80, 0.62, 1.55)
    # and each warp end differs a little from the next
    wv = N("ShaderNodeTexWhiteNoise")
    wv.noise_dimensions = "1D"
    L(ia, wv.inputs["W"])
    cw = g.m("SINE", g.m("MULTIPLY", fa, math.pi))
    cf = g.m("MULTIPLY", g.m("SINE", g.m("MULTIPLY", fb, math.pi)), thick)
    hw = g.m("ADD", g.m("MULTIPLY", zw, 0.45), cw)
    hf = g.m("ADD", g.m("MULTIPLY", zf, 0.45), cf)
    height = g.m("MAXIMUM", hw, hf)
    weft_top = g.m("GREATER_THAN", hf, hw)
    warp_col = hex_rgb("#e9e1d2", 1.0)
    weft_col = hex_rgb("#e3dac8", 1.0)
    base = g.mix("MIX", weft_top, warp_col, weft_col)
    shade = g.maprange(height, 0.15, 1.25, 0.70, 1.0)
    shade = g.m("MULTIPLY", shade, g.maprange(wv.outputs["Value"], 0.0, 1.0, 0.955, 1.02))
    shade = g.m("MULTIPLY", shade, g.maprange(thick, 0.62, 1.55, 0.97, 1.03))
    L(g.mix("MULTIPLY", 1.0, base, _grey(nt, shade)), bsdf.inputs["Base Color"])
    bp = N("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 1.0
    bp.inputs["Distance"].default_value = 0.00022
    L(height, bp.inputs["Height"])
    L(bp.outputs["Normal"], bsdf.inputs["Normal"])
    L(g.maprange(thick, 0.62, 1.55, 0.44, 0.58), bsdf.inputs["Roughness"])
    bsdf.inputs["Specular IOR Level"].default_value = 0.42
    bsdf.inputs["Sheen Weight"].default_value = 0.35
    bsdf.inputs["Sheen Roughness"].default_value = 0.4
    bsdf.inputs["Sheen Tint"].default_value = (1.0, 0.96, 0.9, 1.0)
    _MATS[name] = mat
    return mat


def _grey(nt, val):
    n = nt.nodes.new("ShaderNodeCombineColor")
    for i in range(3):
        nt.links.new(val, n.inputs[i])
    return n.outputs[0]


def thread_material(name, hexcol, rough=0.40, vary=0.10, sheen=0.25):
    """A single yarn (native curves): each thread a touch lighter or darker than the next."""
    if name in _MATS:
        return _MATS[name]
    mat, nt, bsdf = _new_mat(name)
    g = G(nt)
    info = nt.nodes.new("ShaderNodeHairInfo")
    val = g.maprange(info.outputs["Random"], 0.0, 1.0, 1.0 - vary, 1.0 + 0.3 * vary)
    nt.links.new(g.mix("MULTIPLY", 1.0, hex_rgb(hexcol, 1.0), _grey(nt, val)), bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Specular IOR Level"].default_value = 0.45
    bsdf.inputs["Sheen Weight"].default_value = sheen
    _MATS[name] = mat
    return mat


def wound_material(name, hexcol, pitch=PITCH):
    """Yarn wound on a beam or a bobbin: fine turns round local Z."""
    if name in _MATS:
        return _MATS[name]
    mat, nt, bsdf = _new_mat(name)
    N, L = nt.nodes.new, nt.links.new
    g = G(nt)
    tc = N("ShaderNodeTexCoord")
    sep = N("ShaderNodeSeparateXYZ")
    L(tc.outputs["Object"], sep.inputs[0])
    t = g.m("DIVIDE", sep.outputs["Z"], pitch)
    ridge = g.m("ABSOLUTE", g.m("SINE", g.m("MULTIPLY", t, math.pi)))
    wn = N("ShaderNodeTexWhiteNoise")
    wn.noise_dimensions = "1D"
    L(g.m("FLOOR", t), wn.inputs["W"])
    shade = g.m("MULTIPLY", g.maprange(ridge, 0.0, 1.0, 0.62, 1.0),
                g.maprange(wn.outputs["Value"], 0.0, 1.0, 0.90, 1.03))
    L(g.mix("MULTIPLY", 1.0, hex_rgb(hexcol, 1.0), _grey(nt, shade)), bsdf.inputs["Base Color"])
    bp = N("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 1.0
    bp.inputs["Distance"].default_value = pitch * 0.35
    L(ridge, bp.inputs["Height"])
    L(bp.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = 0.42
    bsdf.inputs["Sheen Weight"].default_value = 0.3
    _MATS[name] = mat
    return mat


def plain_material(name, hexcol, rough=0.6, spec=0.3, metallic=0.0, bump=None, sheen=0.0):
    if name in _MATS:
        return _MATS[name]
    mat, nt, bsdf = _new_mat(name)
    bsdf.inputs["Base Color"].default_value = hex_rgb(hexcol, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Specular IOR Level"].default_value = spec
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Sheen Weight"].default_value = sheen
    if bump:
        scale, strength, dist = bump
        tc = nt.nodes.new("ShaderNodeTexCoord")
        nz = nt.nodes.new("ShaderNodeTexNoise")
        nz.inputs["Scale"].default_value = scale
        nz.inputs["Detail"].default_value = 3.0
        nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
        bp = nt.nodes.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = strength
        bp.inputs["Distance"].default_value = dist
        nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], bsdf.inputs["Normal"])
    _MATS[name] = mat
    return mat


def paper_material(name="W_washi", strength=16.0):
    """Shoji paper with daylight behind it: the room's only light. A diffusing sheet seen from
    inside is a lambertian emitter; brighter towards the sky, with faint fibre clouding."""
    if name in _MATS:
        return _MATS[name]
    mat, nt, bsdf = _new_mat(name)
    N, L = nt.nodes.new, nt.links.new
    g = G(nt)
    tc = N("ShaderNodeTexCoord")
    sep = N("ShaderNodeSeparateXYZ")
    L(tc.outputs["Object"], sep.inputs[0])
    grad = g.maprange(sep.outputs["Z"], 0.3, 1.75, 0.72, 1.10)
    nz = N("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 2.2
    nz.inputs["Detail"].default_value = 5.0
    nz.inputs["Roughness"].default_value = 0.65
    L(tc.outputs["Object"], nz.inputs["Vector"])
    cloud = g.maprange(nz.outputs["Fac"], 0.25, 0.75, 0.88, 1.08)
    fib = N("ShaderNodeTexNoise")
    fib.inputs["Scale"].default_value = 260.0
    fib.inputs["Detail"].default_value = 2.0
    L(tc.outputs["Object"], fib.inputs["Vector"])
    fibre = g.maprange(fib.outputs["Fac"], 0.3, 0.7, 0.96, 1.04)
    s = g.m("MULTIPLY", g.m("MULTIPLY", grad, cloud), g.m("MULTIPLY", fibre, strength))
    bsdf.inputs["Base Color"].default_value = (0.80, 0.77, 0.70, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.9
    bsdf.inputs["Specular IOR Level"].default_value = 0.1
    bsdf.inputs["Emission Color"].default_value = (1.0, 0.93, 0.83, 1.0)
    L(s, bsdf.inputs["Emission Strength"])
    _MATS[name] = mat
    return mat


def materials():
    ivory = PAL["ground_light"]
    return {
        # the loom: old, handled timber
        "loom": wood_material("W_loom", value=0.88, sat=0.95, tint=(1.0, 0.86, 0.70), rough=(0.38, 0.62)),
        "loom_light": wood_material("W_loom_light", value=0.90, sat=0.85, tint=(1.0, 0.92, 0.80),
                                    rough=(0.35, 0.6), scale=1.6),
        "shuttle": wood_material("W_shuttle", asset="wood_table_001", tile=1.5, scale=6.0, value=1.5,
                                 sat=0.9, rough=(0.16, 0.32), bump=0.12, fallback="#5a3320"),
        # the room
        "post": wood_material("W_post", value=0.66, sat=0.9, tint=(1.0, 0.84, 0.68), rough=(0.5, 0.8)),
        "shoji": wood_material("W_shoji", value=1.0, sat=0.8, tint=(1.0, 0.93, 0.80), rough=(0.45, 0.7),
                               scale=2.0),
        "ceiling": wood_material("W_ceiling", value=0.85, sat=0.85, tint=(1.0, 0.90, 0.76),
                                 rough=(0.55, 0.85)),
        "floor": uv_material("W_floor", "wood_floor_worn", 2.0, value=1.15, sat=0.80,
                             tint=(1.0, 0.95, 0.88), rough=(0.25, 0.75), fallback="#8a5a35"),
        "plaster": uv_material("W_plaster", "plastered_wall", 2.0, value=1.32, sat=0.55,
                               rough=(0.75, 1.0), normal=0.6, spec=0.15),
        "paper": paper_material(),
        # yarn and cloth
        "cloth": cloth_material(),
        "warp": thread_material("W_warp", "#ece5d6"),
        "heddle": thread_material("W_heddle", "#d9d2c2", rough=0.8, vary=0.05, sheen=0.1),
        "wound": wound_material("W_wound", "#ebe4d5"),
        "weft": plain_material("W_weft", "#ece5d6", rough=0.42, sheen=0.25),
        "cord": plain_material("W_cord", "#b9a37a", rough=0.85, spec=0.15, bump=(900.0, 0.6, 0.0006)),
        "bamboo": plain_material("W_bamboo", "#c6a368", rough=0.38, spec=0.4),
        "pitch": plain_material("W_pitch", "#2a2019", rough=0.55, spec=0.3, bump=(1500.0, 0.5, 0.0004)),
        "steel": plain_material("W_steel", "#8d8a86", rough=0.35, metallic=1.0),
        "card": plain_material("W_card", "#b9a78a", rough=0.8, spec=0.2),
        "ivory_hex": ivory,
    }


# =========================================================================== the loom

def build_loom(coll, mats, origin=(0.0, 0.0, 0.0), rot_z=0.0):
    root = bpy.data.objects.new("loom", None)
    root.location = origin
    root.rotation_euler = (0.0, 0.0, rot_z)
    coll.objects.link(root)
    wood, light = mats["loom"], mats["loom_light"]

    def S(name, p0, p1, w, d, up=(0, 0, 1), mat=wood, bevel=0.003):
        return stick(coll, "loom_" + name, p0, p1, w, d, mat, up=up, bevel=bevel, parent=root)

    def R(name, p0, p1, r, mat=wood, **kw):
        return rod(coll, "loom_" + name, p0, p1, r, mat, parent=root, **kw)

    # ---- frame: four posts, three levels of side rails, cross rails
    for sx in (-1, 1):
        for y in (YF, YB):
            S("post", (sx * LW, y, 0.0), (sx * LW, y, HT), PS, PS, up=(0, 1, 0))
        S("rail_lo", (sx * LW, YF, Z_LO), (sx * LW, YB, Z_LO), 0.05, 0.085)
        S("rail_mid", (sx * LW, YF, Z_MID), (sx * LW, YB, Z_MID), 0.05, 0.095)
        S("rail_top", (sx * LW, YF - 0.06, Z_TOP), (sx * LW, YB + 0.06, Z_TOP), 0.055, 0.08)
    S("cross_lo_back", (-LW, YB, Z_LO), (LW, YB, Z_LO), 0.05, 0.085)
    S("cross_top_front", (-LW, YF, Z_TOP - 0.085), (LW, YF, Z_TOP - 0.085), 0.045, 0.07)
    S("cross_top_back", (-LW, YB, Z_TOP - 0.085), (LW, YB, Z_TOP - 0.085), 0.045, 0.07)

    # ---- beams
    zb = ZW - BEAM_R
    R("breast_beam", (-LW, YF, zb), (LW, YF, zb), BEAM_R)
    R("back_beam", (-LW, YB, zb), (LW, YB, zb), BEAM_R)
    (yc, zc), rc = CLOTH_ROLL
    R("cloth_beam", (-LW - 0.07, yc, zc), (LW + 0.07, yc, zc), 0.030)
    (yw, zw), rw = WARP_ROLL
    R("warp_beam", (-LW - 0.07, yw, zw), (LW + 0.07, yw, zw), 0.032)
    for sx in (-1, 1):                                           # wooden pegs that keep the beams in
        for yy in (yc, yw):
            R("peg", (sx * (LW + 0.05), yy, zc - 0.045), (sx * (LW + 0.05), yy, zc + 0.045), 0.006,
              mat=light, segs=10)

    # ---- the warp: from the roll on the warp beam, over the back beam, through the lease
    #      sticks, a heddle eye, a dent of the reed, to the fell of the cloth
    r_th = THREAD_R
    p1, p2, a_n = tangent_ccw((yw, zw), rw, (YB, zb), BEAM_R + r_th)
    over = arc((YB, zb), BEAM_R + r_th, a_n, math.pi / 2.0, 7)
    y1, y2 = Y_SHAFT - ROLLER_R, Y_SHAFT + ROLLER_R
    zo = 0.003 + r_th
    lines, heddles = [], []
    for i in range(N_ENDS):
        x = -BOLT_W / 2.0 + (i + 0.5) * PITCH
        s = 1.0 if i % 2 == 0 else -1.0
        ys = y1 if i % 2 == 0 else y2
        ze = ZW + s * LIFT
        jx = _rnd.uniform(-1.0, 1.0) * 0.00016
        pts = [(x + jx, p1[0], p1[1]), (x + jx, p2[0], p2[1])]
        pts += [(x + jx, yy, zz) for (yy, zz) in over[1:]]
        pts += [(x + 0.5 * jx, Y_LEASE[1], ZW + s * zo), (x, Y_LEASE[0], ZW - s * zo)]
        pts += [(x, ys, ze)]
        t = (Y_REED - ys) / (Y_FELL - ys)
        pts += [(x, Y_REED, ze + (ZW - ze) * t), (x, Y_FELL, ZW + r_th)]
        lines.append(pts)
        heddles.append([(x, ys, ze + HEDDLE_H), (x, ys, ze + 0.004), (x, ys, ze - 0.004),
                        (x, ys, ze - HEDDLE_H)])
    strands(coll, "loom_warp", lines, r_th, mats["warp"], parent=root)
    strands(coll, "loom_heddles", heddles, 0.00013, mats["heddle"], parent=root)
    R("warp_roll", (-BOLT_W / 2 - 0.002, yw, zw), (BOLT_W / 2 + 0.002, yw, zw), rw, mat=mats["wound"], segs=48)

    # ---- lease sticks
    for yy in Y_LEASE:
        S("lease", (-0.25, yy, ZW), (0.25, yy, ZW), 0.028, 0.006, mat=light, bevel=0.002)

    # ---- two heddle shafts hung over a roller: when one goes down the other comes up
    z_roller = 1.20
    for k, (ys, s) in enumerate(((y1, 1.0), (y2, -1.0))):
        ze = ZW + s * LIFT
        S("shaft_top", (-0.26, ys, ze + HEDDLE_H + 0.011), (0.26, ys, ze + HEDDLE_H + 0.011), 0.011, 0.022,
          mat=light, bevel=0.002)
        S("shaft_bottom", (-0.26, ys, ze - HEDDLE_H - 0.011), (0.26, ys, ze - HEDDLE_H - 0.011), 0.011, 0.022,
          mat=light, bevel=0.002)
    R("roller", (-0.27, Y_SHAFT, z_roller), (0.27, Y_SHAFT, z_roller), ROLLER_R, mat=light)
    z_bar = Z_TOP + 0.04 + 0.022
    S("harness_bar", (-LW - 0.07, Y_SHAFT, z_bar), (LW + 0.07, Y_SHAFT, z_bar), 0.044, 0.044)
    rc_ = 0.0022
    for sx in (-1, 1):
        # the roller hangs from the bar in a loop of cord
        x = sx * 0.235
        e = 0.022 + rc_
        loop = [(x, Y_SHAFT - e, z_bar + e), (x, Y_SHAFT + e, z_bar + e)]
        loop += [(x, Y_SHAFT + (ROLLER_R + rc_) * math.cos(a), z_roller + (ROLLER_R + rc_) * math.sin(a))
                 for a in [-math.pi * k / 10.0 for k in range(11)]]
        cord(coll, "loom_roller_cord", loop, rc_, mats["cord"], parent=root, cyclic=True)
        # the harness cord: up from one shaft, over the roller, down to the other
        x = sx * 0.16
        rr = ROLLER_R + rc_
        pts = [(x, y1 - rc_, ZW + LIFT + HEDDLE_H + 0.022)]
        pts += [(x, Y_SHAFT - rr * math.cos(a), z_roller + rr * math.sin(a))
                for a in [math.pi * k / 10.0 for k in range(11)]]
        pts += [(x, y2 + rc_, ZW - LIFT + HEDDLE_H + 0.022)]
        cord(coll, "loom_harness_cord", pts, rc_, mats["cord"], parent=root)

    # ---- treadles: hinged on a rod at the back, each tied up to one shaft
    y_piv, z_piv = 0.80, 0.085
    R("treadle_rod", (-LW, y_piv, z_piv), (LW, y_piv, z_piv), 0.011, mat=light, segs=16)
    y_front = -0.52
    for sx, ys, s in ((-1, y1, 1.0), (1, y2, -1.0)):
        x = sx * 0.085
        z_tie = 0.165 + s * LIFT                                 # height of the treadle under its shaft
        slope = (z_tie - z_piv) / (ys - y_piv)
        zf = z_piv + slope * (y_front - y_piv)
        zr = z_piv + slope * (y_piv + 0.05 - y_piv)
        S("treadle", (x, y_piv + 0.05, zr), (x, y_front, zf), 0.05, 0.03)
        cord(coll, "loom_treadle_cord",
             [(x, ys, z_tie + 0.015), (x, ys, ZW + s * LIFT - HEDDLE_H - 0.022)], 0.0022, mats["cord"],
             parent=root)

    # ---- the beater: a bamboo reed held between two battens, hung from the top of the frame
    z_sley_top, z_cap_bot = ZW - 0.03, ZW + 0.062
    yb = Y_REED
    z_hang = Z_TOP + 0.04 + 0.017
    R("beater_bar", (-LW - 0.07, yb, z_hang), (LW + 0.07, yb, z_hang), 0.017)
    for sx in (-1, 1):
        S("sword", (sx * 0.31, yb, ZW - 0.10), (sx * 0.31, yb, z_hang + 0.035), 0.02, 0.046, up=(0, 1, 0))
    S("sley", (-0.34, yb, z_sley_top - 0.024), (0.34, yb, z_sley_top - 0.024), 0.05, 0.048)
    S("reed_cap", (-0.34, yb, z_cap_bot + 0.017), (0.34, yb, z_cap_bot + 0.017), 0.04, 0.034)
    verts, faces = [], []
    nd = N_ENDS // 2
    for k in range(nd + 1):
        x = -BOLT_W / 2.0 + k * 2.0 * PITCH
        hx = 0.00021 if 0 < k < nd else 0.0012
        b = len(verts)
        for dz in (z_sley_top - 0.004, z_cap_bot + 0.004):
            verts += [(x - hx, yb - 0.0019, dz), (x + hx, yb - 0.0019, dz),
                      (x + hx, yb + 0.0019, dz), (x - hx, yb + 0.0019, dz)]
        faces += [(b, b + 1, b + 5, b + 4), (b + 1, b + 2, b + 6, b + 5),
                  (b + 2, b + 3, b + 7, b + 6), (b + 3, b, b + 4, b + 7)]
    mesh_obj(coll, "loom_reed", verts, faces, mats["bamboo"], parent=root)
    for zz in (z_sley_top + 0.004, z_cap_bot - 0.004):           # the reed's bound ribs
        S("reed_rib", (-BOLT_W / 2 - 0.004, yb, zz), (BOLT_W / 2 + 0.004, yb, zz), 0.0065, 0.008,
          mat=mats["pitch"], bevel=0.0015)

    # ---- the cloth: from the fell over the breast beam, down to the roll on the cloth beam
    q1, q2, a_c = tangent_ccw((YF, zb), BEAM_R, (yc, zc), rc)
    a_c_pos = a_c if a_c > math.pi / 2 else a_c + 2.0 * math.pi
    path = [(Y_FELL + 0.3 * k / 24.0 * 0 + (YF - Y_FELL) * k / 24.0, ZW) for k in range(25)]
    path += arc((YF, zb), BEAM_R, math.pi / 2.0, a_c_pos, 14)[1:]
    path += [q2]
    path = [(y, z + 0.0004) for (y, z) in path]
    ribbon(coll, "loom_cloth", path, -BOLT_W / 2, BOLT_W / 2, mats["cloth"], nx=2, parent=root)
    R("cloth_roll", (-BOLT_W / 2 - 0.0005, yc, zc), (BOLT_W / 2 + 0.0005, yc, zc), rc, mat=mats["cloth"],
      segs=48, uv_metres=True)

    # ---- the shuttle, laid down on the cloth, its weft still running to the fell
    build_shuttle(coll, mats, root, (0.035, -0.435, ZW + 0.0006), math.radians(202.0))
    return root


def build_shuttle(coll, mats, parent, loc, ang):
    """A boat shuttle: a pointed hardwood body with a pocket holding a bobbin of weft.
    Local Z is its length, local Y its height."""
    length, width, height = 0.215, 0.036, 0.021
    ns, nr = 56, 24
    verts, faces = [], []
    for j in range(ns + 1):
        s = -1.0 + 2.0 * j / ns
        hw = max(0.0006, 0.5 * width * (1.0 - abs(s) ** 2.4) ** 0.8)
        z_bot = height * 0.45 * abs(s) ** 3.2
        z_top = height - height * 0.10 * abs(s) ** 4
        mid, hh = 0.5 * (z_top + z_bot), 0.5 * (z_top - z_bot)
        for k in range(nr):
            a = 2.0 * math.pi * k / nr
            ca, sa = math.cos(a), math.sin(a)
            ex = 2.0 / 3.6
            verts.append((hw * math.copysign(abs(ca) ** ex, ca), mid + hh * math.copysign(abs(sa) ** ex, sa),
                          0.5 * length * s))
    for j in range(ns):
        for k in range(nr):
            a, b = j * nr + k, j * nr + (k + 1) % nr
            faces.append((a, b, b + nr, a + nr))
    faces.append(tuple(reversed(range(nr))))
    faces.append(tuple(range(ns * nr, ns * nr + nr)))
    body = mesh_obj(coll, "shuttle", verts, faces, mats["shuttle"], smooth=True, parent=parent)
    along = Vector((math.cos(ang), math.sin(ang), 0.0))
    up = Vector((0.0, 0.0, 1.0))
    m = Matrix((up.cross(along), up, along)).transposed().to_4x4()
    m.translation = Vector(loc)
    body.matrix_basis = m

    # the pocket (a boolean cut, applied)
    pl, pw, pd = 0.086, 0.021, 0.0155
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * pw, v.co.y * (pd + 0.02) + height - pd + 0.5 * (pd + 0.02), v.co.z * pl))
    bmesh.ops.bevel(bm, geom=[e for e in bm.edges if abs(e.verts[0].co.y - e.verts[1].co.y) > 1e-4],
                    offset=0.004, segments=4, profile=0.5, affect="EDGES")
    cme = bpy.data.meshes.new("shuttle_cut")
    bm.to_mesh(cme)
    bm.free()
    cutter = bpy.data.objects.new("shuttle_cut", cme)
    coll.objects.link(cutter)
    cutter.parent = parent
    cutter.matrix_basis = m
    mod = body.modifiers.new("pocket", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = cutter
    mod.solver = "EXACT"
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    cut = bpy.data.meshes.new_from_object(body.evaluated_get(dg))
    body.modifiers.remove(mod)
    old = body.data
    body.data = cut
    bpy.data.meshes.remove(old)
    bpy.data.objects.remove(cutter)
    try:
        body.data.set_sharp_from_angle(angle=math.radians(38.0))
    except Exception:
        pass

    def P(x, y, z):                                              # shuttle-local -> loom space
        return m @ Vector((x, y, z))

    # bobbin: a bamboo quill wound with weft, on a steel pin
    yq = height - 0.0075
    rod(coll, "shuttle_pin", P(0, yq, -0.5 * pl - 0.004), P(0, yq, 0.5 * pl + 0.004), 0.0008, mats["steel"],
        segs=8, parent=parent)
    rod(coll, "shuttle_quill", P(0, yq, -0.036), P(0, yq, 0.036), 0.0026, mats["bamboo"], segs=12, parent=parent)
    prof = [(-0.030, 0.0030), (-0.024, 0.0056), (-0.012, 0.0068), (0.004, 0.0066), (0.018, 0.0054),
            (0.027, 0.0036), (0.030, 0.0028)]
    nseg = 20
    pv, pf = [], []
    for (zz, rr) in prof:
        for k in range(nseg):
            a = 2.0 * math.pi * k / nseg
            pv.append((rr * math.cos(a), yq + rr * math.sin(a), zz))
    for j in range(len(prof) - 1):
        for k in range(nseg):
            a, b = j * nseg + k, j * nseg + (k + 1) % nseg
            pf.append((a, b, b + nseg, a + nseg))
    bob = mesh_obj(coll, "shuttle_weft", pv, pf, mats["wound"].copy() if False else _wound_fine(), smooth=True,
                   parent=parent)
    bob.matrix_basis = m
    # the eye in the side wall, and the weft running from it across the cloth to the selvedge
    eye = P(-0.5 * width + 0.0005, yq, 0.012)
    rod(coll, "shuttle_eye", P(-0.5 * width - 0.0006, yq, 0.012), P(-0.5 * width + 0.003, yq, 0.012), 0.0021,
        plain_material("W_porcelain", "#e8e6e0", rough=0.25, spec=0.5), segs=14, parent=parent)
    zc = ZW + 0.0008
    sel = (BOLT_W / 2.0 - 0.0005, Y_FELL + 0.0006, zc)
    out = P(-0.5 * width - 0.004, yq - 0.004, 0.012)
    drop = P(-0.5 * width - 0.014, 0.0, 0.010)
    pts = [tuple(eye), tuple(out), (drop.x, drop.y, zc), (0.06, -0.372, zc), (0.11, -0.335, zc),
           (0.155, -0.310, zc), sel]
    cord(coll, "shuttle_weft_end", pts, 0.00017, mats["weft"], parent=parent, smooth=True)
    return body


def _wound_fine():
    return wound_material("W_wound_fine", "#ebe4d5", pitch=0.0005)


def build_bench(coll, mats, y=-1.02, parent=None):
    wood = mats["loom"]
    zt = 0.46
    out = [stick(coll, "bench_seat", (-0.43, y, zt - 0.017), (0.43, y, zt - 0.017), 0.27, 0.034, wood,
                 bevel=0.004, parent=parent)]
    for sx in (-1, 1):
        out.append(stick(coll, "bench_leg", (sx * 0.34, y, 0.0), (sx * 0.34, y, zt - 0.034), 0.03, 0.23, wood,
                         up=(0, 1, 0), bevel=0.003, parent=parent))
    out.append(stick(coll, "bench_stretcher", (-0.34, y, 0.17), (0.34, y, 0.17), 0.022, 0.06, wood,
                     parent=parent))
    return out


def build_bolt(coll, mats, loc=(0.0, 0.0, 0.0), rot_z=0.0, flat=0.62, name="bolt"):
    """The finished bolt on a low stand: about 12 m of cloth rolled on a core, the last
    half-metre lying open. Local X is the roll's axis; the free end runs to local -Y."""
    root = bpy.data.objects.new(name, None)
    root.location = loc
    root.rotation_euler = (0.0, 0.0, rot_z)
    coll.objects.link(root)
    wood = mats["loom_light"]
    # stand: a board on two runners
    zt = 0.115
    stick(coll, name + "_board", (0.0, -0.80, zt - 0.011), (0.0, 0.16, zt - 0.011), 0.46, 0.022, wood,
          bevel=0.003, parent=root)
    for yy in (-0.66, 0.02):
        stick(coll, name + "_runner", (-0.23, yy, 0.5 * (zt - 0.022)), (0.23, yy, 0.5 * (zt - 0.022)), 0.045,
              zt - 0.022, wood, parent=root)
    # the roll
    r_out, r_in, turns, per = 0.042, 0.0125, 38, 56
    pitch = (r_out - r_in) / turns
    zc = zt + r_out + 0.0006
    path = [(-flat + flat * k / 90.0, zt + 0.0006) for k in range(90)]
    n = turns * per
    for k in range(n + 1):
        th = 2.0 * math.pi * k / per
        rr = r_out - pitch * th / (2.0 * math.pi)
        ph = -0.5 * math.pi + th
        path.append((rr * math.cos(ph), zc + rr * math.sin(ph)))
    rr_ = random.Random(5)
    ph1, ph2, ph3 = (rr_.uniform(0, 6.28) for _ in range(3))

    def edge(t, s):                                              # the selvedges never stack dead true
        w = 0.0007 * math.sin(s * 1.9 + ph1) + 0.0004 * math.sin(s * 7.3 + ph2) + 0.00025 * math.sin(s * 23.0)
        return w * (1.0 if t > 0.5 else 0.6)

    def lift(x, s):                                              # the open end does not lie dead flat
        if s > flat:
            return 0.0
        e = min(1.0, (flat - s) / 0.10) * min(1.0, s / 0.03 + 0.25)
        w = (math.sin(s * 21.0 + ph3 + 3.0 * x) * 0.5 + 0.5) * (math.sin(x * 17.0 + ph1 + s * 5.0) * 0.5 + 0.5)
        w += 0.5 * (math.sin(s * 47.0 + x * 9.0 + ph2) * 0.5 + 0.5)
        return 0.0011 * e * w

    cloth = ribbon(coll, name + "_cloth", path, -BOLT_W / 2, BOLT_W / 2, mats["cloth"], nx=25, parent=root,
                   xfun=edge, zfun=lift)
    sol = cloth.modifiers.new("thickness", "SOLIDIFY")
    sol.thickness = 0.00045
    sol.offset = 0.0
    rod(coll, name + "_core", (-BOLT_W / 2 - 0.006, 0.0, zc), (BOLT_W / 2 + 0.006, 0.0, zc), r_in - 0.0004,
        mats["card"], segs=24, parent=root)
    return root


# =========================================================================== the room

def quad(coll, name, p, eu, ev, mat):
    """Rectangle from corner p along eu and ev; UVs in metres."""
    p, eu, ev = Vector(p), Vector(eu), Vector(ev)
    verts = [p, p + eu, p + eu + ev, p + ev]
    uvs = [(0, 0), (eu.length, 0), (eu.length, ev.length), (0, ev.length)]
    return mesh_obj(coll, name, verts, [(0, 1, 2, 3)], mat, uvs)


def build_room(coll, mats):
    plaster, post, floor = mats["plaster"], mats["post"], mats["floor"]
    W_, D_ = RX1 - RX0, RY1 - RY0
    # floor boards run along Y; the scan's boards run along U
    me_floor = quad(coll, "floor", (RX0, RY0, 0), (0, D_, 0), (W_, 0, 0), floor)
    assert me_floor
    quad(coll, "wall_back", (RX0, RY1, 0), (W_, 0, 0), (0, 0, RH), plaster)
    quad(coll, "wall_right", (RX1, RY1, 0), (0, -D_, 0), (0, 0, RH), plaster)
    front = quad(coll, "wall_front", (RX1, RY0, 0), (-W_, 0, 0), (0, 0, RH), plaster)
    front.visible_camera = False                                 # the wide camera stands behind it
    quad(coll, "wall_left_a", (RX0, RY0, 0), (0, WIN_Y0 - RY0, 0), (0, 0, RH), plaster)
    quad(coll, "wall_left_b", (RX0, WIN_Y1, 0), (0, RY1 - WIN_Y1, 0), (0, 0, RH), plaster)
    quad(coll, "wall_left_c", (RX0, WIN_Y0, WIN_Z1), (0, WIN_Y1 - WIN_Y0, 0), (0, 0, RH - WIN_Z1), plaster)
    stick(coll, "ceiling", (0.5 * (RX0 + RX1), RY0, RH + 0.01), (0.5 * (RX0 + RX1), RY1, RH + 0.01), W_, 0.02,
          mats["ceiling"], bevel=0)
    nb = 8
    for k in range(nb + 1):
        x = RX0 + W_ * k / nb
        stick(coll, "batten", (x, RY0, RH - 0.016), (x, RY1, RH - 0.016), 0.03, 0.032, post, bevel=0.002)

    def P(name, x, y, w=0.12):
        stick(coll, "post_" + name, (x, y, 0), (x, y, RH), w, w, post, up=(0, 1, 0), bevel=0.004)

    e = 0.03
    P("bl", RX0 + e, RY1 - e)
    P("br", RX1 - e, RY1 - e)
    P("fl", RX0 + e, RY0 + e)
    P("fr", RX1 - e, RY0 + e)
    P("back_mid", 0.62, RY1 - e)
    P("right_mid", RX1 - e, -0.2)
    P("win_a", RX0 + e, WIN_Y0 - 0.06)
    P("win_b", RX0 + e, WIN_Y1 + 0.06)
    # the rail that runs round the room at door-head height, and the ceiling cornice
    zn = WIN_Z1 + 0.05
    for name, a, b in (("back", (RX0, RY1 - 0.018, zn), (RX1, RY1 - 0.018, zn)),
                       ("right", (RX1 - 0.018, RY0, zn), (RX1 - 0.018, RY1, zn)),
                       ("left", (RX0 + 0.018, RY0, zn), (RX0 + 0.018, RY1, zn))):
        stick(coll, "nageshi_" + name, a, b, 0.036, 0.10, post, bevel=0.003)
    for name, a, b in (("back", (RX0, RY1 - 0.015, RH - 0.05), (RX1, RY1 - 0.015, RH - 0.05)),
                       ("right", (RX1 - 0.015, RY0, RH - 0.05), (RX1 - 0.015, RY1, RH - 0.05)),
                       ("left", (RX0 + 0.015, RY0, RH - 0.05), (RX0 + 0.015, RY1, RH - 0.05))):
        stick(coll, "cornice_" + name, a, b, 0.03, 0.045, post, bevel=0.002)
    # window: head and sill tracks, two sliding shoji
    stick(coll, "win_head", (RX0 + 0.04, WIN_Y0, WIN_Z1 + 0.02), (RX0 + 0.04, WIN_Y1, WIN_Z1 + 0.02), 0.11, 0.04,
          post, bevel=0.002)
    stick(coll, "win_sill", (RX0 + 0.04, WIN_Y0, 0.02), (RX0 + 0.04, WIN_Y1, 0.02), 0.11, 0.04, post,
          bevel=0.002)
    half = 0.5 * (WIN_Y1 - WIN_Y0)
    build_shoji(coll, mats, RX0 + 0.062, WIN_Y0, WIN_Y0 + half + 0.016, 0.04, WIN_Z1)
    build_shoji(coll, mats, RX0 + 0.028, WIN_Y0 + half - 0.016, WIN_Y1, 0.04, WIN_Z1)


def build_shoji(coll, mats, x, y0, y1, z0, z1):
    """One sliding shoji: a light frame, a low wooden skirt, a lattice with paper behind it."""
    wd = mats["shoji"]
    st, dp = 0.03, 0.03
    z_skirt = z0 + 0.36
    for y in (y0 + st / 2, y1 - st / 2):
        stick(coll, "shoji_stile", (x, y, z0), (x, y, z1), dp, st, wd, up=(0, 1, 0), bevel=0.0015)
    for z, h in ((z0 + 0.03, 0.06), (z_skirt, 0.03), (z1 - 0.02, 0.04)):
        stick(coll, "shoji_rail", (x, y0 + st, z), (x, y1 - st, z), dp, h, wd, bevel=0.0015)
    stick(coll, "shoji_skirt", (x - 0.004, y0 + st, 0.5 * (z0 + 0.06 + z_skirt)),
          (x - 0.004, y1 - st, 0.5 * (z0 + 0.06 + z_skirt)), 0.008, z_skirt - z0 - 0.06, wd, bevel=0)
    zl0, zl1 = z_skirt + 0.015, z1 - 0.04
    nv, nh = 3, 6
    for k in range(1, nv + 1):
        y = y0 + st + (y1 - y0 - 2 * st) * k / (nv + 1.0)
        stick(coll, "shoji_kumiko_v", (x + 0.004, y, zl0), (x + 0.004, y, zl1), 0.014, 0.007, wd, up=(0, 1, 0),
              bevel=0)
    for k in range(1, nh + 1):
        z = zl0 + (zl1 - zl0) * k / (nh + 1.0)
        stick(coll, "shoji_kumiko_h", (x + 0.004, y0 + st, z), (x + 0.004, y1 - st, z), 0.014, 0.007, wd,
              bevel=0)
    xp = x - 0.004
    paper = mesh_obj(coll, "shoji_paper", [(xp, y0 + st, zl0), (xp, y1 - st, zl0), (xp, y1 - st, zl1),
                                           (xp, y0 + st, zl1)], [(0, 3, 2, 1)], mats["paper"])
    return paper


# =========================================================================== scene, cameras, render

SHOTS = {
    1: dict(file="weave_1.png", loc=(1.05, -4.35, 1.08), target=(-0.12, 0.15, 1.08), lens=35.0, fstop=4.0,
            focus=(0.0, -0.3, 0.84), shift_y=-0.045, exposure=0.0),
    2: dict(file="weave_2.png", loc=(0.17, -1.42, 1.36), target=(0.0, -0.33, 0.85), lens=70.0, fstop=3.2,
            focus=(0.03, -0.42, 0.85), shift_y=0.0, exposure=0.0),
    3: dict(file="weave_3.png", loc=(-0.55, -2.35, 0.50), target=(-1.02, -1.02, 0.15), lens=80.0, fstop=3.2,
            focus=(-1.02, -1.10, 0.14), shift_y=0.0, exposure=0.0),
}

BOLT_POS = dict(loc=(-1.10, -0.78, 0.0), rot_z=math.radians(-24.0))


def build_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _MATS.clear()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    coll = scene.collection
    mats = materials()
    build_room(coll, mats)
    build_loom(coll, mats)
    build_bench(coll, mats)
    build_bolt(coll, mats, **BOLT_POS)
    world = bpy.data.worlds.new("weave_world")
    if not world.node_tree:
        world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg is not None:
        bg.inputs["Color"].default_value = (0.02, 0.02, 0.02, 1.0)
        bg.inputs["Strength"].default_value = 1.0
    scene.world = world
    cam = bpy.data.objects.new("weave_cam", bpy.data.cameras.new("weave_cam"))
    coll.objects.link(cam)
    scene.camera = cam
    return scene


def set_shot(scene, n):
    sh = SHOTS[n]
    cam = scene.camera
    loc, tgt = Vector(sh["loc"]), Vector(sh["target"])
    cam.location = loc
    cam.rotation_euler = (tgt - loc).to_track_quat("-Z", "Y").to_euler()
    cd = cam.data
    cd.sensor_width = 36.0
    cd.lens = sh["lens"]
    cd.shift_x = 0.0
    cd.shift_y = sh.get("shift_y", 0.0)
    cd.clip_start = 0.05
    cd.clip_end = 50.0
    cd.dof.use_dof = True
    cd.dof.aperture_fstop = sh["fstop"]
    cd.dof.aperture_blades = 7
    cd.dof.focus_distance = (Vector(sh["focus"]) - loc).dot((tgt - loc).normalized())
    scene.view_settings.exposure = sh.get("exposure", 0.0)
    return sh


def render(shots, res=(2560, 1440), samples=96, preview=False, out=STILLS, threshold=None):
    scene = build_scene()
    setup_cycles(scene, res=res, samples=samples, preview=preview)
    c = scene.cycles
    c.max_bounces = 8
    c.diffuse_bounces = 5                                        # one window: the bounce light is the fill
    c.glossy_bounces = 3
    c.transparent_max_bounces = 8
    if threshold is not None:
        c.adaptive_threshold = threshold
    try:
        scene.cycles_curves.shape = "THICK"
        scene.cycles_curves.subdivisions = 2
    except Exception:
        pass
    os.makedirs(out, exist_ok=True)
    for n in shots:
        sh = set_shot(scene, n)
        scene.render.filepath = os.path.join(out, sh["file"])
        t0 = time.time()
        bpy.ops.render.render(write_still=True)
        print("weaving: %s  %.0f s" % (scene.render.filepath, time.time() - t0))


def main(argv=None):
    ap = argparse.ArgumentParser(description="Render the weaving-room stills.")
    ap.add_argument("--shot", default="all", help="1, 2, 3, a comma list, or all")
    ap.add_argument("--res", default="2560x1440")
    ap.add_argument("--samples", type=int, default=96)
    ap.add_argument("--threshold", type=float, default=None)
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--out", default=STILLS)
    args = ap.parse_args(argv)
    shots = [1, 2, 3] if args.shot == "all" else [int(s) for s in args.shot.split(",")]
    w, h = (int(v) for v in args.res.lower().split("x"))
    render(shots, res=(w, h), samples=args.samples, preview=args.preview, out=args.out,
           threshold=args.threshold)


if __name__ == "__main__":
    argv = sys.argv[1:]
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    main(argv)
