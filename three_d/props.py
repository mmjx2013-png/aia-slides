"""props.py - period props for the shoin hall (true size, metres, Z up).

    state = build(collection)                  every prop under an empty "prop_<name>", at the origin
    place(state, name, location, rot_z=0.0)    move a prop: location = base centre on the floor
                                               (scroll: top centre of the mount; its cord peaks 0.055 above)
    place_all(state, layout=None)              apply DEFAULT_LAYOUT (or a dict of the same shape)
    DEFAULT_LAYOUT, NAMES

Every prop's "front" faces -Y at rot_z = 0 (the scroll's painted side faces -Y).
Geometry is all code (bmesh + curves). Wood uses the Poly Haven scans already in build/assets
(okoume_veneer, ash_veneer) through common.asset_map, with a procedural grain if a file is missing.
The scroll's centre panel is a separate object named "scroll_image" with 0..1 UVs.
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
import common as C  # noqa: E402

import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Vector, noise as mnoise  # noqa: E402

NAMES = ["doc_box_large", "doc_box_small", "tobacco_tray", "zabuton_a", "zabuton_b",
         "brazier", "robe_tray", "scroll"]

DEFAULT_LAYOUT = {
    "zabuton_a": ((-2.30, 2.30, 0.0), 0.06),
    "zabuton_b": ((-1.42, 2.42, 0.0), -0.09),
    "brazier": ((-1.86, 1.72, 0.0), 0.5),
    "tobacco_tray": ((-1.36, 1.84, 0.0), 0.32),
    "robe_tray": ((1.47, -0.62, 0.0), 0.07),
    "doc_box_large": ((0.92, -0.97, 0.0), -0.2),
    "doc_box_small": ((0.98, -0.59, 0.0), 0.42),
    "scroll": ((0.0, 11.6, 2.35), 0.0),
}

PI = math.pi


def _lin(h):
    return tuple(C.hex_rgb(h))[:3]


def _nz(x, y, z=0.0):
    return mnoise.noise(Vector((x, y, z)))


# ---------------------------------------------------------------------------------------------
# shader helpers
# ---------------------------------------------------------------------------------------------
class _K:
    def __init__(self, nt, bsdf):
        self.nt, self.b = nt, bsdf
        tc = nt.nodes.new("ShaderNodeTexCoord")
        self.obj, self.uv, self.onormal = tc.outputs["Object"], tc.outputs["UV"], tc.outputs["Normal"]

    def N(self, kind):
        return self.nt.nodes.new(kind)

    def put(self, sock, v):
        if isinstance(v, (int, float)):
            sock.default_value = float(v)
        elif isinstance(v, (tuple, list)):
            v = tuple(v)
            try:
                sock.default_value = v
            except Exception:
                sock.default_value = v[:3] + (1.0,) if len(v) == 3 else v[:3]
        else:
            self.nt.links.new(v, sock)

    def set(self, name, v):
        self.put(self.b.inputs[name], v)

    def math(self, op, a, b=None, c=None, clamp=False):
        n = self.N("ShaderNodeMath")
        n.operation, n.use_clamp = op, clamp
        for i, v in enumerate((a, b, c)):
            if v is not None:
                self.put(n.inputs[i], v)
        return n.outputs[0]

    def mix(self, fac, a, b, blend="MIX"):
        n = self.N("ShaderNodeMix")
        n.data_type, n.blend_type = "RGBA", blend
        for sock, v in ((n.inputs[0], fac), (n.inputs[6], a), (n.inputs[7], b)):
            if isinstance(v, (tuple, list)):
                v = tuple(v)[:3] + (1.0,)
            self.put(sock, v)
        return n.outputs[2]

    def mapping(self, vec, scale=(1, 1, 1), rot=(0, 0, 0), loc=(0, 0, 0)):
        n = self.N("ShaderNodeMapping")
        n.inputs["Scale"].default_value = scale
        n.inputs["Rotation"].default_value = rot
        n.inputs["Location"].default_value = loc
        self.nt.links.new(vec, n.inputs["Vector"])
        return n.outputs[0]

    def noise(self, vec, scale, detail=2.0, rough=0.5):
        n = self.N("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value = scale
        n.inputs["Detail"].default_value = detail
        n.inputs["Roughness"].default_value = rough
        self.nt.links.new(vec, n.inputs["Vector"])
        return n.outputs[0]

    def wave(self, vec, scale, direction="X", distortion=0.0):
        n = self.N("ShaderNodeTexWave")
        n.wave_type, n.bands_direction = "BANDS", direction
        n.inputs["Scale"].default_value = scale
        n.inputs["Distortion"].default_value = distortion
        self.nt.links.new(vec, n.inputs["Vector"])
        return n.outputs[0]

    def mr(self, v, a, b, to0=0.0, to1=1.0, smooth=False):
        n = self.N("ShaderNodeMapRange")
        n.clamp = True
        if smooth:
            n.interpolation_type = "SMOOTHSTEP"
        self.put(n.inputs[0], v)
        for i, x in enumerate((a, b, to0, to1)):
            n.inputs[i + 1].default_value = x
        return n.outputs[0]

    def bump(self, height, strength, distance, normal=None):
        n = self.N("ShaderNodeBump")
        n.inputs["Strength"].default_value = strength
        n.inputs["Distance"].default_value = distance
        self.nt.links.new(height, n.inputs["Height"])
        if normal is not None:
            self.nt.links.new(normal, n.inputs["Normal"])
        return n.outputs[0]

    def sep(self, vec):
        n = self.N("ShaderNodeSeparateXYZ")
        self.nt.links.new(vec, n.inputs[0])
        return n.outputs

    def image(self, path, vec, colorspace="sRGB", box=True):
        n = self.N("ShaderNodeTexImage")
        img = bpy.data.images.get(os.path.basename(path)) or bpy.data.images.load(path)
        img.name = os.path.basename(path)
        img.colorspace_settings.name = colorspace
        n.image = img
        if box:
            n.projection, n.projection_blend = "BOX", 0.25
        self.nt.links.new(vec, n.inputs["Vector"])
        return n.outputs[0]


def _mat(name):
    """(material, _K or None). None when the material already exists (cached by name)."""
    m = bpy.data.materials.get(name)
    if m is not None:
        return m, None
    m = bpy.data.materials.new(name)
    if not m.node_tree:
        m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(b.outputs[0], out.inputs[0])
    return m, _K(nt, b)


def m_lacquer(name="P_lacquer", gold=None, wear=1.0):
    """Black urushi: deep base under a clear coat, micro-scratches, dust-dulled patches, brown wear on
    convex edges. gold = (a, b, inset, width): a maki-e line framing the top face (object space)."""
    m, k = _mat(name)
    if k is None:
        return m
    n1 = k.noise(k.obj, 6.0, 3.0)
    n2 = k.noise(k.obj, 38.0, 2.0)
    s1 = k.noise(k.mapping(k.obj, scale=(70.0, 1.0, 1.0), rot=(0.3, 0.2, 0.6)), 26.0, 1.0)
    s2 = k.noise(k.mapping(k.obj, scale=(1.0, 80.0, 1.0), rot=(-0.2, 0.4, -0.5)), 22.0, 1.0)
    scr = k.math("MAXIMUM", k.mr(s1, 0.63, 0.73), k.mr(s2, 0.65, 0.75))
    geo = k.N("ShaderNodeNewGeometry")
    wm = k.math("MULTIPLY", k.mr(geo.outputs["Pointiness"], 0.56, 0.72, 0.0, wear),
                k.mr(n2, 0.38, 0.62))
    col = k.mix(k.mr(n1, 0.3, 0.75, 0.0, 0.5), (0.007, 0.006, 0.006), (0.016, 0.013, 0.012))
    col = k.mix(wm, col, (0.085, 0.032, 0.02))
    rough = k.math("ADD", k.mr(n1, 0.3, 0.8, 0.16, 0.34), k.math("MULTIPLY", scr, 0.22))
    rough = k.math("ADD", rough, k.math("MULTIPLY", wm, 0.25))
    coat = k.math("SUBTRACT", 0.85, k.math("MULTIPLY", wm, 0.7), clamp=True)
    metal = 0.0
    if gold:
        a, b_, inset, width = gold
        xyz = k.sep(k.obj)
        d = k.math("MAXIMUM", k.math("SUBTRACT", k.math("ABSOLUTE", xyz[0]), a),
                   k.math("SUBTRACT", k.math("ABSOLUTE", xyz[1]), b_))
        line = k.math("LESS_THAN", k.math("ABSOLUTE", k.math("ADD", d, inset)), width / 2.0)
        up = k.math("GREATER_THAN", k.sep(k.onormal)[2], 0.8)
        gm = k.math("MULTIPLY", k.math("MULTIPLY", line, up), k.mr(n2, 0.22, 0.34))
        col = k.mix(gm, col, (0.83, 0.58, 0.22))
        rough = k.math("ADD", rough, k.math("MULTIPLY", gm, 0.12))
        coat = k.math("MULTIPLY", coat, k.math("SUBTRACT", 1.0, k.math("MULTIPLY", gm, 0.6)))
        metal = gm
    k.set("Base Color", col)
    k.set("Roughness", rough)
    k.set("Metallic", metal)
    k.set("Coat Weight", coat)
    k.set("Coat Roughness", k.math("ADD", 0.035, k.math("MULTIPLY", scr, 0.2)))
    k.set("Normal", k.bump(k.math("ADD", k.math("MULTIPLY", scr, -0.6), n2), 0.12, 0.00012))
    return m


def m_wood(name, aid="okoume_veneer", tint=(0.16, 0.085, 0.045), scale=2.2, rough=(0.32, 0.6),
           coat=0.15, rot=(0.0, 0.0, 0.0), grain=(3.0, 3.0, 70.0), figure=0.45):
    """Aged wood. Scanned veneer (box projected, tinted to `tint`) or a procedural grain."""
    m, k = _mat(name)
    if k is None:
        return m
    vec = k.mapping(k.obj, scale=(scale, scale, scale), rot=rot)
    pd, pr = C.asset_map(aid, "diff"), C.asset_map(aid, "rough")
    n1 = k.noise(k.obj, 9.0, 3.0)
    if pd:
        try:
            mean = C._mean_linear(pd)
        except Exception:
            mean = (0.45, 0.3, 0.18)
        gain = tuple(tint[i] / max(mean[i], 1e-3) for i in range(3))
        raw = k.image(pd, vec)
        gm = k.N("ShaderNodeGamma")
        gm.inputs[1].default_value = 1.6
        k.nt.links.new(raw, gm.inputs[0])
        gain = tuple(gn * 1.35 for gn in gain)
        col = k.mix(1.0, gm.outputs[0], gain, "MULTIPLY")
        bw = k.N("ShaderNodeRGBToBW")
        k.nt.links.new(raw, bw.inputs[0])
        height = bw.outputs[0]
        rgh = k.mr(k.image(pr, vec, "Non-Color"), 0.2, 0.9, rough[0], rough[1]) if pr else \
            k.mr(height, 0.2, 0.8, rough[1], rough[0])
    else:
        g = k.noise(k.mapping(k.obj, scale=(3.0, 3.0, 60.0), rot=rot), 2.5, 4.0, 0.6)
        col = k.mix(k.mr(g, 0.35, 0.65), tuple(c * 0.7 for c in tint), tuple(c * 1.25 for c in tint))
        height = g
        rgh = k.mr(g, 0.3, 0.7, rough[0], rough[1])
    # long figure: streaks along the grain, a few darker pores
    fg = k.noise(k.mapping(k.obj, scale=grain), 1.0, 5.0, 0.62)
    fg2 = k.noise(k.mapping(k.obj, scale=tuple(g_ * 4.0 for g_ in grain)), 1.0, 2.0)
    shade = k.math("MULTIPLY", k.mr(fg, 0.3, 0.7, 1.0 - figure, 1.0 + figure * 0.5),
                   k.mr(fg2, 0.25, 0.6, 1.0 - figure * 0.5, 1.0))
    sh = k.N("ShaderNodeCombineXYZ")
    for i_ in range(3):
        k.nt.links.new(shade, sh.inputs[i_])
    col = k.mix(1.0, col, sh.outputs[0], "MULTIPLY")
    height = k.math("ADD", height, k.math("MULTIPLY", fg2, 0.6))
    geo = k.N("ShaderNodeNewGeometry")
    wm = k.math("MULTIPLY", k.mr(geo.outputs["Pointiness"], 0.56, 0.72), k.mr(n1, 0.35, 0.65))
    col = k.mix(k.math("MULTIPLY", wm, 0.5), col, tuple(min(1.0, c * 2.4) for c in tint))
    col = k.mix(k.mr(n1, 0.25, 0.8, 0.0, 0.3), col, tuple(c * 0.55 for c in tint))
    k.set("Base Color", col)
    k.set("Roughness", k.math("ADD", rgh, k.math("MULTIPLY", wm, 0.15)))
    k.set("Coat Weight", coat)
    k.set("Coat Roughness", 0.18)
    k.set("Normal", k.bump(height, 0.25, 0.0004))
    return m


def m_silk(name, color, rough=0.52, sheen=0.45, pitch=0.0011, var=0.10, crease=0.35, damask=0.0,
           spec=0.4, slub=0.0, layers=0.0, seam=None):
    """Woven silk (object space, metres): weave bump at `pitch`, soft colour drift, sheen."""
    m, k = _mat(name)
    if k is None:
        return m
    col = tuple(color)[:3]
    sc = 2.0 * PI / (20.0 * pitch)
    w = k.math("MULTIPLY", k.wave(k.obj, sc, "X"), k.wave(k.obj, sc * 0.86, "Y"))
    w = k.math("ADD", w, k.math("MULTIPLY", k.wave(k.obj, sc * 0.9, "Z"), 0.5))
    n1 = k.noise(k.obj, 4.5, 3.0)
    n2 = k.noise(k.obj, 34.0, 3.0, 0.6)
    c = k.mix(k.mr(n1, 0.25, 0.75), tuple(x * (1.0 - var) for x in col),
              tuple(min(1.0, x * (1.0 + var)) for x in col))
    rgh = k.mr(n2, 0.2, 0.8, rough - 0.07, rough + 0.07)
    if damask:
        vo = k.N("ShaderNodeTexVoronoi")
        vo.inputs["Scale"].default_value = 1.0 / 0.045
        vo.inputs["Randomness"].default_value = 0.0
        k.nt.links.new(k.mapping(k.obj, scale=(1.0, 1.0, 0.0)), vo.inputs["Vector"])
        ring = k.mr(k.math("ABSOLUTE", k.math("SUBTRACT", vo.outputs[0], 0.26)), 0.07, 0.10, 1.0, 0.0)
        ring = k.math("MAXIMUM", ring, k.mr(vo.outputs[0], 0.08, 0.12, 1.0, 0.0))
        rgh = k.math("SUBTRACT", rgh, k.math("MULTIPLY", ring, damask * 0.2))
        c = k.mix(k.math("MULTIPLY", ring, damask * 0.1), c, tuple(min(1.0, x * 1.1) for x in col))
    extra = None
    if slub:                                      # uneven hand-spun weft: fine streaks along X
        sl = k.noise(k.mapping(k.obj, scale=(1.2, 320.0, 320.0)), 1.0, 3.0, 0.6)
        sv = k.mr(sl, 0.3, 0.7, 1.0 - slub, 1.0 + slub * 0.6)
        cx = k.N("ShaderNodeCombineXYZ")
        for i_ in range(3):
            k.nt.links.new(sv, cx.inputs[i_])
        c = k.mix(1.0, c, cx.outputs[0], "MULTIPLY")
        extra = sl
    if layers:                                    # stacked cloth: thin layer lines on the rounded edges
        side = k.mr(k.math("ABSOLUTE", k.sep(k.onormal)[2]), 0.25, 0.7, 1.0, 0.0)
        lw = k.wave(k.obj, 2.0 * PI / (20.0 * layers), "Z", 1.5)
        gr = k.math("MULTIPLY", k.mr(lw, 0.05, 0.4, 1.0, 0.0), side)
        c = k.mix(k.math("MULTIPLY", gr, 0.5), c, tuple(x * 0.35 for x in col))
        extra = k.math("MULTIPLY", gr, -1.0)
    if seam is not None:                          # a sewn seam running along Y on the upper face
        dx = k.math("ABSOLUTE", k.math("SUBTRACT", k.sep(k.obj)[0], seam))
        sg = k.mr(dx, 0.0003, 0.0011, 1.0, 0.0)
        pk = k.math("MULTIPLY", k.mr(dx, 0.001, 0.012, 1.0, 0.0),
                    k.noise(k.mapping(k.obj, scale=(3.0, 160.0, 3.0)), 1.0, 1.0))
        se = k.math("ADD", k.math("MULTIPLY", sg, -1.5), pk)
        extra = se if extra is None else k.math("ADD", extra, se)
        c = k.mix(k.math("MULTIPLY", sg, 0.25), c, tuple(x * 0.5 for x in col))
    k.set("Base Color", c)
    k.set("Roughness", rgh)
    k.set("Sheen Weight", sheen)
    k.set("Sheen Roughness", 0.45)
    k.set("Sheen Tint", tuple(min(1.0, x * 1.5 + 0.25) for x in col) + (1.0,))
    k.set("Specular IOR Level", spec)
    nrm = k.bump(n2, crease, 0.0005)
    if extra is not None:
        nrm = k.bump(extra, 0.6, 0.0007, nrm)
    nrm = k.bump(k.noise(k.obj, 1100.0, 2.0, 0.6), 0.35, 0.00025, nrm)
    k.set("Normal", k.bump(w, 0.3, 0.00012, nrm))
    return m


def m_brocade(name, c1, c2, cell=0.028, gold=0.0):
    """Muted brocade on UVs in metres: a lattice of small roundels in a second tone (c2)."""
    m, k = _mat(name)
    if k is None:
        return m
    uv = k.uv
    vo = k.N("ShaderNodeTexVoronoi")
    vo.inputs["Scale"].default_value = 1.0 / cell
    vo.inputs["Randomness"].default_value = 0.0
    k.nt.links.new(uv, vo.inputs["Vector"])
    d = vo.outputs[0]
    ring = k.mr(k.math("ABSOLUTE", k.math("SUBTRACT", d, 0.27)), 0.05, 0.09, 1.0, 0.0)
    dot = k.mr(d, 0.07, 0.11, 1.0, 0.0)
    pat = k.math("MAXIMUM", ring, dot)
    n1 = k.noise(uv, 5.0, 3.0)
    n2 = k.noise(uv, 300.0, 2.0)
    base = k.mix(k.mr(n1, 0.3, 0.7), tuple(x * 0.9 for x in c1), tuple(min(1, x * 1.08) for x in c1))
    col = k.mix(k.math("MULTIPLY", pat, 0.5), base, c2)
    sc = 2.0 * PI / (20.0 * 0.0009)
    w = k.math("MULTIPLY", k.wave(uv, sc, "X"), k.wave(uv, sc, "Y"))
    k.set("Base Color", col)
    k.set("Roughness", k.math("SUBTRACT", k.mr(n2, 0.2, 0.8, 0.5, 0.62), k.math("MULTIPLY", pat, 0.18)))
    k.set("Metallic", k.math("MULTIPLY", pat, gold))
    k.set("Sheen Weight", 0.35)
    k.set("Sheen Roughness", 0.4)
    k.set("Normal", k.bump(k.math("ADD", w, k.math("MULTIPLY", pat, 1.5)), 0.25, 0.00012))
    return m


def m_paper(name="P_scroll_paper"):
    m, k = _mat(name)
    if k is None:
        return m
    n1 = k.noise(k.uv, 3.0, 4.0, 0.6)
    n2 = k.noise(k.uv, 60.0, 3.0, 0.6)
    n3 = k.noise(k.uv, 14.0, 2.0)
    col = k.mix(k.mr(n1, 0.3, 0.75), (0.60, 0.50, 0.34), (0.72, 0.63, 0.46))
    col = k.mix(k.mr(n3, 0.68, 0.8, 0.0, 0.35), col, (0.42, 0.31, 0.17))
    k.set("Base Color", col)
    k.set("Roughness", 0.82)
    k.set("Specular IOR Level", 0.25)
    k.set("Normal", k.bump(n2, 0.25, 0.00015))
    return m


def m_plain(name, color, rough=0.5, metallic=0.0, var=0.12, nscale=30.0, bump=0.2, dist=0.0003,
            coat=0.0, spec=0.5, col2=None, vscale=None):
    """Generic slightly uneven surface: noise drives colour drift, roughness and a small bump."""
    m, k = _mat(name)
    if k is None:
        return m
    col = tuple(color)[:3]
    n1 = k.noise(k.obj, vscale or nscale * 0.25, 3.0)
    n2 = k.noise(k.obj, nscale, 4.0, 0.65)
    lo = col2 if col2 else tuple(x * (1.0 - var) for x in col)
    k.set("Base Color", k.mix(k.mr(n1, 0.3, 0.7), lo, tuple(min(1.0, x * (1.0 + var)) for x in col)))
    k.set("Roughness", k.mr(n2, 0.2, 0.8, max(0.02, rough - 0.08), min(1.0, rough + 0.08)))
    k.set("Metallic", metallic)
    k.set("Coat Weight", coat)
    k.set("Coat Roughness", 0.08)
    k.set("Specular IOR Level", spec)
    k.set("Normal", k.bump(n2, bump, dist))
    return m


def m_bamboo(name="P_bamboo"):
    m, k = _mat(name)
    if k is None:
        return m
    g = k.noise(k.mapping(k.obj, scale=(90.0, 90.0, 3.0)), 1.0, 3.0, 0.6)
    n1 = k.noise(k.obj, 18.0, 3.0)
    col = k.mix(k.mr(g, 0.3, 0.7), (0.34, 0.20, 0.07), (0.50, 0.33, 0.13))
    col = k.mix(k.mr(n1, 0.55, 0.8, 0.0, 0.5), col, (0.20, 0.11, 0.045))
    k.set("Base Color", col)
    k.set("Roughness", k.mr(n1, 0.2, 0.8, 0.26, 0.42))
    k.set("Coat Weight", 0.25)
    k.set("Coat Roughness", 0.12)
    k.set("Normal", k.bump(g, 0.2, 0.00015))
    return m


# ---------------------------------------------------------------------------------------------
# geometry helpers
# ---------------------------------------------------------------------------------------------
class _B:
    """Build context of one prop: collection, parent empty, the objects made so far."""

    def __init__(self, coll, parent):
        self.coll, self.parent, self.objs = coll, parent, []

    def add(self, ob):
        self.coll.objects.link(ob)
        ob.parent = self.parent
        self.objs.append(ob)
        return ob

    def mesh(self, name, bm, mats, smooth=True, wn=True, subsurf=0, loc=None, rot=None):
        if smooth:
            for f in bm.faces:
                f.smooth = True
        bm.normal_update()
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        for mt in mats:
            me.materials.append(mt)
        ob = bpy.data.objects.new(name, me)
        if subsurf:
            md = ob.modifiers.new("subsurf", "SUBSURF")
            md.levels = md.render_levels = subsurf
        if wn:
            md = ob.modifiers.new("wnormal", "WEIGHTED_NORMAL")
            md.keep_sharp = False
            md.weight = 80
        if loc is not None:
            ob.location = loc
        if rot is not None:
            ob.rotation_euler = rot
        return self.add(ob)

    def tube(self, name, splines, radius, mat, res=2, cyclic=False, kind="NURBS", radii=None):
        cu = bpy.data.curves.new(name, "CURVE")
        cu.dimensions = "3D"
        cu.bevel_depth, cu.bevel_resolution, cu.resolution_u = radius, res, 6
        cu.use_fill_caps = True
        for si, pts in enumerate(splines):
            sp = cu.splines.new(kind)
            sp.points.add(len(pts) - 1)
            for i, (p, co) in enumerate(zip(sp.points, pts)):
                p.co = (co[0], co[1], co[2], 1.0)
                if radii:
                    p.radius = radii[si][i] if isinstance(radii[si], (list, tuple)) else radii[si]
            sp.use_cyclic_u = cyclic
            if kind == "NURBS":
                sp.use_endpoint_u = not cyclic
                sp.order_u = min(4, len(pts))
        cu.materials.append(mat)
        return self.add(bpy.data.objects.new(name, cu))


def _rbox(sx, sy, sz, bevel=0.003, seg=3, crown=0.0, cuts=0):
    """Rounded box, base centre at the origin; crown swells the top face."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= sx
        v.co.y *= sy
        v.co.z = (v.co.z + 0.5) * sz
    if cuts:
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)

    def planes(v):
        s = set()
        for i, (c, h) in enumerate(((v.co.x, sx / 2), (v.co.y, sy / 2))):
            if abs(abs(c) - h) < 1e-6:
                s.add((i, c > 0))
        if v.co.z < 1e-6:
            s.add((2, False))
        if v.co.z > sz - 1e-6:
            s.add((2, True))
        return s
    edges = [e for e in bm.edges if len(planes(e.verts[0]) & planes(e.verts[1])) >= 2]
    bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=seg, profile=0.5, affect="EDGES")
    if crown:
        for v in bm.verts:
            t = max(0.0, v.co.z / sz)
            v.co.z += crown * (1 - (2 * v.co.x / sx) ** 2) * (1 - (2 * v.co.y / sy) ** 2) * t ** 6
    return bm


def _tray(sx, sy, sz, wall=0.006, floor=0.008, bevel=0.0018, seg=2, flare=0.0):
    """Open-topped box (tray), base centre at the origin. flare leans the walls outwards."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= sx
        v.co.y *= sy
        v.co.z = (v.co.z + 0.5) * sz
    top = max(bm.faces, key=lambda f: f.calc_center_median().z)
    r = bmesh.ops.inset_region(bm, faces=[top], thickness=wall, use_even_offset=True)
    ex = bmesh.ops.extrude_face_region(bm, geom=[top])
    for v in [g for g in ex["geom"] if isinstance(g, bmesh.types.BMVert)]:
        v.co.z = floor
    if top.is_valid and all(v.co.z > sz - 1e-6 for v in top.verts):
        bmesh.ops.delete(bm, geom=[top], context="FACES")
    if flare:
        for v in bm.verts:
            t = v.co.z / sz
            v.co.x += math.copysign(flare * t, v.co.x)
            v.co.y += math.copysign(flare * t, v.co.y)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=seg, profile=0.5, affect="EDGES")
    return bm


def _fillet(pts, r=0.002, n=3):
    """Round the interior corners of an (r, z) profile with quadratic arcs."""
    out = [pts[0]]
    for i in range(1, len(pts) - 1):
        a, p, b = Vector(pts[i - 1]), Vector(pts[i]), Vector(pts[i + 1])
        da, db = (a - p), (b - p)
        ra = min(r, da.length * 0.45)
        rb = min(r, db.length * 0.45)
        if ra < 1e-6 or rb < 1e-6:
            out.append(tuple(p))
            continue
        p0, p1 = p + da.normalized() * ra, p + db.normalized() * rb
        for j in range(n + 1):
            t = j / n
            q = p0 * (1 - t) ** 2 + p * 2 * t * (1 - t) + p1 * t ** 2
            out.append((max(0.0, q.x), q.y))
    out.append(pts[-1])
    return out


def _lathe(profile, seg=64, oval=0.0, wob=0.0, seed=0.0):
    """Revolve an (r, z) profile about Z. oval squashes it slightly; wob adds hand-made unevenness."""
    bm = bmesh.new()
    rings = []
    for (r, z) in profile:
        if r <= 1e-7:
            rings.append([bm.verts.new((0.0, 0.0, z))])
        else:
            ring = []
            for i in range(seg):
                a = 2 * PI * i / seg
                rr = r * (1.0 + oval * math.cos(2 * a) + wob * _nz(math.cos(a) * 1.3, math.sin(a) * 1.3,
                                                                    z * 9.0 + seed))
                ring.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), z)))
            rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        for i in range(seg):
            j = (i + 1) % seg
            if len(a) == 1:
                bm.faces.new((a[0], b[i], b[j]))
            elif len(b) == 1:
                bm.faces.new((a[i], a[j], b[0]))
            else:
                bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def _disc(radius, zf, rings=12, seg=40):
    bm = bmesh.new()
    prev = [bm.verts.new((0.0, 0.0, zf(0.0, 0.0)))]
    for ri in range(1, rings + 1):
        r = radius * ri / rings
        ring = []
        for i in range(seg):
            a = 2 * PI * i / seg
            x, y = r * math.cos(a), r * math.sin(a)
            ring.append(bm.verts.new((x, y, zf(x, y))))
        for i in range(seg):
            j = (i + 1) % seg
            if len(prev) == 1:
                bm.faces.new((prev[0], ring[i], ring[j]))
            else:
                bm.faces.new((prev[i], ring[i], ring[j], prev[j]))
        prev = ring
    return bm


def _grid(xs, ss, fn, up=None, skip=None, matf=None, uvf=None):
    """Grid mesh: verts fn(x, s) for x in xs, s in ss. up = (axis, sign) the first face normal must
    have. skip(i, j) drops a cell, matf(i, j) gives its material index, uvf(x, s) its UV."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap") if uvf else None
    vs = [[bm.verts.new(fn(x, s)) for x in xs] for s in ss]
    for i in range(len(ss) - 1):
        for j in range(len(xs) - 1):
            if skip and skip(i, j):
                continue
            f = bm.faces.new((vs[i][j], vs[i][j + 1], vs[i + 1][j + 1], vs[i + 1][j]))
            if matf:
                f.material_index = matf(i, j)
            if uvl:
                for lp, (a, b) in zip(f.loops, ((i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j))):
                    lp[uvl].uv = uvf(xs[b], ss[a])
    for v in [v for v in bm.verts if not v.link_faces]:
        bm.verts.remove(v)
    bm.normal_update()
    if up and bm.faces:
        bm.faces.ensure_lookup_table()
        if bm.faces[0].normal[up[0]] * up[1] < 0:
            bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    return bm


def _span(a, b, step):
    n = max(1, int(round(abs(b - a) / step)))
    return [a + (b - a) * i / n for i in range(n + 1)]


# ---------------------------------------------------------------------------------------------
# document boxes
# ---------------------------------------------------------------------------------------------
def _cord_mat(name, hexc):
    return m_silk(name, _lin(hexc), rough=0.5, sheen=0.5, pitch=0.0016, var=0.12, crease=0.5)


def _doc_box(B, tag, sx, sy, sz, gold=False, cord=False, seed=1):
    rnd = random.Random(seed)
    body_h = sz * 0.64
    gap = 0.0011
    lid_h = sz - body_h - gap
    bev = min(0.004, sz * 0.05)
    crown = min(0.004, sx * 0.012)
    lac = m_lacquer("P_lacquer")
    B.mesh(tag + "_body", _rbox(sx, sy, body_h, bev, 3, cuts=2), [lac])
    B.mesh(tag + "_lip", _rbox(sx - 0.007, sy - 0.007, body_h + lid_h * 0.5, 0.001, 1), [lac])
    lidm = m_lacquer("P_lacquer_gold_" + tag, gold=(sx / 2, sy / 2, sx * 0.045 + 0.004, 0.0013)) \
        if gold else lac
    lid = B.mesh(tag + "_lid", _rbox(sx, sy, lid_h, bev, 3, crown=crown, cuts=6), [lidm],
                 loc=(rnd.uniform(-0.0006, 0.0006), rnd.uniform(-0.0006, 0.0006), body_h + gap))
    lid.rotation_euler = (0.0, 0.0, rnd.uniform(-0.004, 0.004))
    if not cord:
        return
    cm = _cord_mat("P_cord_vermilion", "#9c3f2c")
    brass = m_plain("P_brass", (0.55, 0.38, 0.16), rough=0.42, metallic=1.0, var=0.25, nscale=60.0)
    top = sz + crown + 0.0022
    r = 0.0027
    zr = body_h * 0.62
    sides = []
    for sgn in (-1.0, 1.0):
        yo = sgn * (sy / 2 + r + 0.0012)
        # ring fitting: a small boss and a ring on the body's long side
        B.mesh(tag + "_boss", _lathe(_fillet([(0, 0), (0.007, 0), (0.007, 0.0015), (0.003, 0.003),
                                              (0, 0.003)], 0.0006, 2), 20), [brass],
               loc=(0, sgn * sy / 2, zr), rot=(-sgn * PI / 2, 0, 0))
        B.tube(tag + "_ring", [[(0.0, sgn * (sy / 2 + 0.0035) + 0.0045 * math.cos(a) * 0.0,
                                 zr + 0.006 * math.sin(a)) if False else
                                (0.006 * math.cos(a), sgn * (sy / 2 + 0.0032), zr - 0.004 + 0.006 * math.sin(a))
                                for a in [2 * PI * i / 12 for i in range(12)]]], 0.0011, brass,
               cyclic=True)
        jx = rnd.uniform(-0.002, 0.002)
        sides.append([(0.0, sgn * (sy / 2 + 0.0034), zr - 0.0085), (jx, yo, zr + 0.004),
                      (jx, yo, sz - 0.02), (jx, yo, sz - 0.003), (jx, sgn * (sy / 2 - 0.004), sz + 0.0016),
                      (jx * 0.5, sgn * (sy / 2 - 0.02), sz + 0.0028 + crown * 0.15),
                      (0.0, sgn * sy * 0.25, top - crown * 0.45), (0.0, sgn * 0.012, top),
                      (0.0, 0.0, top + 0.001)])
    B.tube(tag + "_cord", sides, r, cm, res=3)
    h = top
    loops = [
        [(0, 0, h + 0.002), (0.018, 0.013, h + 0.0045), (0.052, 0.011, h + 0.001), (0.062, -0.002, h),
         (0.05, -0.012, h + 0.001), (0.02, -0.008, h + 0.004), (0, 0, h + 0.004)],
        [(0, 0, h + 0.003), (-0.02, -0.012, h + 0.0045), (-0.05, -0.014, h + 0.001), (-0.058, 0.0, h),
         (-0.047, 0.012, h + 0.001), (-0.018, 0.01, h + 0.004), (0, 0, h + 0.002)],
        [(0.002, 0, h + 0.004), (0.012, -0.016, h + 0.002), (0.022, -0.045, h - 0.0005),
         (0.04, -0.074, h - 0.001), (0.047, -0.092, h - 0.0012)],
        [(-0.002, 0, h + 0.004), (-0.01, 0.014, h + 0.002), (-0.03, 0.036, h - 0.0005),
         (-0.064, 0.047, h - 0.001), (-0.086, 0.045, h - 0.0012)],
    ]
    B.tube(tag + "_bow", loops, r, cm, res=3)
    fr = []                                       # frayed ends of the two tails
    for tail in loops[2:]:
        e, q = Vector(tail[-1]), Vector(tail[-2])
        d = (e - q).normalized()
        side = Vector((-d.y, d.x, 0.0))
        for i in range(12):
            a, ln = rnd.uniform(-1.0, 1.0), rnd.uniform(0.009, 0.016)
            m_ = e + d * ln * 0.5 + side * a * 0.002 + Vector((0, 0, rnd.uniform(-0.0005, 0.0012)))
            t_ = e + d * ln + side * a * 0.0055
            t_.z = sz + crown * 0.3 + rnd.uniform(0.0004, 0.0012)
            fr.append([tuple(e - d * 0.002 + side * a * 0.0012), tuple(m_), tuple(t_)])
    B.tube(tag + "_fringe", fr, 0.00055, cm, res=1)
    B.tube(tag + "_knot", [[(0.0055 * math.cos(a), 0.003 * math.sin(a) + 0.001 * math.cos(a),
                             h + 0.003 + 0.0042 * math.sin(a)) for a in
                            [2 * PI * i / 10 for i in range(10)]]], r * 1.05, cm, res=3, cyclic=True)


def _b_doc_box_large(B):
    _doc_box(B, "doc_box_large", 0.40, 0.30, 0.12, cord=True, seed=3)


def _b_doc_box_small(B):
    _doc_box(B, "doc_box_small", 0.24, 0.09, 0.05, gold=True, seed=5)


# ---------------------------------------------------------------------------------------------
# tobacco tray (tabako-bon): wooden tray with a cane handle, fire pot (hi-ire), ash tube (hai-fuki)
# ---------------------------------------------------------------------------------------------
def _ash_mat():
    return m_plain("P_ash", (0.40, 0.385, 0.36), rough=0.95, var=0.22, nscale=140.0, bump=0.6,
                   dist=0.0012, spec=0.15, vscale=22.0)


def _b_tobacco_tray(B):
    sx, sy, sz = 0.25, 0.18, 0.062
    wood = m_wood("P_wood_kuwa", "okoume_veneer", tint=(0.17, 0.085, 0.04), scale=2.6, coat=0.2,
                  rot=(0.0, 0.0, PI / 2), grain=(2.5, 60.0, 60.0), figure=0.5)
    B.mesh("tobacco_tray_box", _tray(sx, sy, sz, wall=0.0065, floor=0.008, bevel=0.0016), [wood])
    # handle: a bent cane arch pinned to the short sides
    hx = sx / 2 + 0.0048
    pts = [(-hx, 0.0, 0.014 + 0.012 * i) for i in range(6)]
    for i in range(1, 32):
        a = PI - PI * i / 32
        pts.append((hx * math.cos(a) * (1.0 + 0.012 * math.sin(3 * a)), 0.0015 * math.sin(2 * a),
                    0.086 + 0.112 * math.sin(a)))
    pts += [(hx, 0.0, 0.074 - 0.012 * i) for i in range(6)]
    bam = m_bamboo()
    B.tube("tobacco_tray_handle", [pts], 0.0046, bam, res=3)
    iron = m_plain("P_iron", (0.035, 0.032, 0.03), rough=0.5, metallic=1.0, var=0.3, nscale=90.0)
    for sgn in (-1.0, 1.0):
        for z in (0.022, 0.05):
            B.mesh("tobacco_tray_pin", _lathe(_fillet([(0, 0), (0.0032, 0), (0.0026, 0.0014),
                                                       (0, 0.0019)], 0.0005, 2), 12), [iron],
                   loc=(sgn * (hx + 0.0044), 0.0, z), rot=(0.0, sgn * PI / 2, 0.0))
    # fire pot: glazed stoneware, slightly oval, ash and a charcoal stub inside
    glaze = m_plain("P_glaze", (0.42, 0.47, 0.46), rough=0.16, var=0.14, nscale=45.0, bump=0.08,
                    dist=0.0003, coat=0.6, col2=(0.30, 0.36, 0.37), vscale=9.0)
    pot = _fillet([(0, 0), (0.029, 0), (0.033, 0.004), (0.0405, 0.03), (0.0415, 0.066), (0.0395, 0.081),
                   (0.0375, 0.0835), (0.035, 0.081), (0.0345, 0.068), (0.034, 0.06)], 0.002, 3)
    px, py = -0.058, 0.012
    B.mesh("tobacco_tray_firepot", _lathe(pot, 56, oval=0.012, wob=0.006, seed=2.0), [glaze],
           loc=(px, py, 0.008), rot=(0, 0, 0.7))
    ash = _ash_mat()
    B.mesh("tobacco_tray_ash", _disc(0.0348, lambda x, y: 0.004 * math.exp(-(x * x + y * y) / 0.0004)
                                     + 0.0012 * _nz(x * 120, y * 120, 1.0), 6, 28), [ash],
           wn=False, loc=(px, py, 0.008 + 0.0655))
    coal = m_plain("P_charcoal", (0.018, 0.017, 0.016), rough=0.8, var=0.4, nscale=260.0, bump=0.9,
                   dist=0.001, col2=(0.16, 0.15, 0.14), vscale=70.0)
    B.mesh("tobacco_tray_coal", _lathe(_fillet([(0, 0), (0.0075, 0), (0.008, 0.03), (0, 0.03)], 0.001, 2),
                                       10, wob=0.08, seed=4.0), [coal],
           loc=(px + 0.004, py - 0.003, 0.008 + 0.064), rot=(0.9, 0.25, 0.4))
    # ash tube: a cut length of bamboo with one node
    tube = _fillet([(0, 0), (0.0203, 0), (0.021, 0.003), (0.0211, 0.02), (0.0224, 0.0225), (0.021, 0.025),
                    (0.0207, 0.112), (0.0196, 0.1145), (0.0178, 0.1145), (0.0173, 0.112),
                    (0.0172, 0.03), (0, 0.03)], 0.0008, 2)
    B.mesh("tobacco_tray_ashtube", _lathe(tube, 40, oval=0.015), [bam], loc=(0.066, -0.018, 0.008))


# ---------------------------------------------------------------------------------------------
# zabuton
# ---------------------------------------------------------------------------------------------
def _zabuton(B, tag, hexc, tufthex, seed):
    rnd = random.Random(seed)
    a, zs, t_top, t_bot = 0.275, 0.027, 0.047, 0.055
    n = 92
    ph = [rnd.uniform(0, 2 * PI) for _ in range(4)]
    skew = [rnd.uniform(-0.012, 0.012) for _ in range(4)]

    def prof(s):
        return max(0.0, 1.0 - abs(s) ** 4.6) ** 0.47

    def top_z(x, y, g):
        r = math.hypot(x, y)
        th = math.atan2(y, x)
        tuft = math.exp(-(r / 0.052) ** 2)
        z = zs + t_top * g * (1.0 - 0.6 * tuft)
        fall = (r / 0.05) * math.exp(-(r / 0.10) ** 2)
        z += g * fall * (0.0036 * math.cos(7 * th + ph[0]) + 0.0022 * math.cos(12 * th + ph[1])
                         + 0.0013 * math.cos(19 * th + ph[2]))
        z += g * 0.0032 * _nz(x * 6.0, y * 6.0, seed * 3.1)
        for (ed, tc) in ((1.0 - abs(x) / a, y), (1.0 - abs(y) / a, x)):   # tension folds off the seam
            z += g ** 0.4 * math.exp(-(ed / 0.2) ** 2) * 0.0021 * math.sin(
                tc * 88.0 + 4.0 * _nz(tc * 8.0, seed * 0.7, ed * 3.0) + ph[3])
        edge = max(abs(x), abs(y)) / a
        z += (g ** 0.5) * edge ** 5 * 0.0022 * _nz(x * 55.0, y * 55.0, seed * 1.7)
        return z

    def pos(u, v, side):
        x = a * u * (1.0 - 0.035 * (1.0 - v * v)) + skew[0] * u * v * a + skew[2] * (1 - u * u) * v * a * 0.3
        y = a * v * (1.0 - 0.035 * (1.0 - u * u)) + skew[1] * u * v * a + skew[3] * (1 - v * v) * u * a * 0.3
        g = prof(u) * prof(v)
        seam = zs + 0.003 * _nz(x * 9.0, y * 9.0, seed * 5.3) - 0.008 * (abs(u * v)) ** 6
        if side > 0:
            return (x, y, seam - zs + top_z(x, y, g))
        zb = seam - t_bot * g
        k = 0.004
        return (x, y, 0.0006 + 0.5 * (zb + math.sqrt(zb * zb + k * k)))

    ts = [0.45 * (-1.0 + 2.0 * i / n) + 0.55 * math.sin(PI / 2 * (-1.0 + 2.0 * i / n)) for i in range(n + 1)]
    bm = bmesh.new()
    topv = [[bm.verts.new(pos(u, v, 1)) for u in ts] for v in ts]
    botv = [[None] * (n + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        for j in range(n + 1):
            if i in (0, n) or j in (0, n):
                botv[i][j] = topv[i][j]
            else:
                botv[i][j] = bm.verts.new(pos(ts[j], ts[i], -1))
    for i in range(n):
        for j in range(n):
            bm.faces.new((topv[i][j], topv[i][j + 1], topv[i + 1][j + 1], topv[i + 1][j]))
            bm.faces.new((botv[i][j], botv[i + 1][j], botv[i + 1][j + 1], botv[i][j + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    cl = bm.edges.layers.float.get("crease_edge") or bm.edges.layers.float.new("crease_edge")
    rim = set()
    for i in range(n + 1):
        rim.update((topv[0][i], topv[n][i], topv[i][0], topv[i][n]))
    for e in bm.edges:
        if e.verts[0] in rim and e.verts[1] in rim:
            e[cl] = 0.55
    silk = m_silk("P_silk_" + tag, _lin(hexc), rough=0.74, sheen=1.0, pitch=0.0013, var=0.10,
                  crease=0.6, spec=0.18, slub=0.16)
    B.mesh(tag + "_cushion", bm, [silk], wn=False, subsurf=1)
    # threads: centre tuft and four corner tassels
    thr = m_silk("P_thread_" + tag, _lin(tufthex), rough=0.45, sheen=0.6, pitch=0.0008, var=0.15)
    sp, rad = [], []

    def surf(r):
        return zs + t_top * (1.0 - 0.6 * math.exp(-(r / 0.052) ** 2)) + 0.0012
    for i in range(30):
        th = 2 * PI * i / 30 + rnd.uniform(-0.3, 0.3)
        ln = rnd.uniform(0.012, 0.024)
        c, s = math.cos(th), math.sin(th)
        sp.append([(0, 0, surf(0) + 0.002), (c * ln * 0.3, s * ln * 0.3, surf(ln * 0.3) + 0.0035),
                   (c * ln * 0.7, s * ln * 0.7, surf(ln * 0.7) + 0.0015),
                   (c * ln, s * ln, surf(ln) + 0.0002)])
        rad.append(1.0)
    for cx in (-1, 1):
        for cy in (-1, 1):
            x0, y0, z0 = pos(cx * 1.0, cy * 1.0, 1)
            base = math.atan2(cy, cx)
            for i in range(16):
                th = base + rnd.uniform(-0.6, 0.6)
                ln = rnd.uniform(0.03, 0.048)
                c, s = math.cos(th), math.sin(th)
                sp.append([(x0 - c * 0.004, y0 - s * 0.004, z0 + 0.001),
                           (x0 + c * ln * 0.3, y0 + s * ln * 0.3, z0 + rnd.uniform(0.001, 0.006)),
                           (x0 + c * ln * 0.7, y0 + s * ln * 0.7, max(0.003, z0 * 0.45)),
                           (x0 + c * ln, y0 + s * ln, rnd.uniform(0.0012, 0.0028))])
                rad.append(1.0)
            sp.append([(x0 - 0.004 * cx, y0 - 0.004 * cy, z0 + 0.001), (x0, y0, z0 + 0.002),
                       (x0 + 0.004 * cx, y0 + 0.004 * cy, z0 + 0.0005)])
            rad.append(4.0)
    B.tube(tag + "_threads", sp, 0.00065, thr, res=1, radii=rad)
    B.mesh(tag + "_tuft", _lathe(_fillet([(0, -0.002), (0.004, -0.002), (0.0052, 0.001), (0.003, 0.0034),
                                          (0, 0.0038)], 0.001, 2), 14), [thr], loc=(0, 0, surf(0)))


def _b_zabuton_a(B):
    _zabuton(B, "zabuton_a", "#5a4353", "#7a6272", 11)


def _b_zabuton_b(B):
    _zabuton(B, "zabuton_b", "#b8864a", "#8f6230", 23)


# ---------------------------------------------------------------------------------------------
# brazier (round wooden hibachi, copper liner, ash, charcoal, iron chopsticks)
# ---------------------------------------------------------------------------------------------
def _b_brazier(B):
    wood = m_wood("P_wood_keyaki", "okoume_veneer", tint=(0.15, 0.072, 0.03), scale=1.6, coat=0.22,
                  rough=(0.32, 0.58), rot=(PI / 2, 0.0, 0.0), grain=(26.0, 26.0, 1.6), figure=0.6)
    # a round hibachi turned from one block: a foot ring, a full belly, a drawn-in neck and a rolled lip
    body = _fillet([(0, 0.004), (0.158, 0.004), (0.162, 0.0), (0.176, 0.0), (0.184, 0.012), (0.216, 0.060),
                    (0.238, 0.125), (0.240, 0.180), (0.229, 0.232), (0.213, 0.266), (0.226, 0.286),
                    (0.2275, 0.295), (0.221, 0.300), (0.190, 0.300), (0.1885, 0.297), (0.1885, 0.24)], 0.004, 3)
    B.mesh("brazier_body", _lathe(body, 80, oval=0.006, wob=0.003, seed=1.0), [wood])
    copper = m_plain("P_copper", (0.36, 0.17, 0.085), rough=0.42, metallic=1.0, var=0.35, nscale=45.0,
                     bump=0.15, col2=(0.11, 0.075, 0.05), vscale=11.0)
    liner = _fillet([(0.1945, 0.3002), (0.1945, 0.3024), (0.1855, 0.3024), (0.1835, 0.3005),
                     (0.1825, 0.24)], 0.0009, 2)
    B.mesh("brazier_liner", _lathe(liner, 80, oval=0.006), [copper])
    ash = _ash_mat()

    def az(x, y):
        r2 = x * x + y * y
        return (0.012 * math.exp(-r2 / 0.012) + 0.004 * _nz(x * 14, y * 14, 3.0)
                + 0.0015 * _nz(x * 60, y * 60, 7.0) - 0.006 * (r2 / 0.033) ** 2)
    B.mesh("brazier_ash", _disc(0.1832, az, 16, 64), [ash], wn=False, loc=(0, 0, 0.283))
    coal = m_plain("P_charcoal", (0.018, 0.017, 0.016), rough=0.8, var=0.4, nscale=260.0, bump=0.9,
                   dist=0.001, col2=(0.16, 0.15, 0.14), vscale=70.0)
    for i, (x, y, rz, tilt, ln, rr) in enumerate(((0.012, 0.02, 0.4, 1.42, 0.075, 0.017),
                                                  (-0.03, -0.022, 2.1, 1.5, 0.06, 0.015),
                                                  (0.035, -0.03, 1.2, 1.3, 0.05, 0.013))):
        prof = _fillet([(0, 0), (rr, 0), (rr * 1.04, ln * 0.5), (rr * 0.96, ln), (0, ln)], 0.002, 2)
        B.mesh("brazier_coal", _lathe(prof, 14, wob=0.07, seed=i * 3.0), [coal],
               loc=(x, y, 0.283 + az(x, y) + rr * 0.35), rot=(tilt, 0.0, rz))
    iron = m_plain("P_iron", (0.035, 0.032, 0.03), rough=0.5, metallic=1.0, var=0.3, nscale=90.0)
    stick = _fillet([(0, 0), (0.0020, 0.0), (0.0030, 0.14), (0.0034, 0.262), (0.0060, 0.268),
                     (0.0060, 0.275), (0.0032, 0.280), (0.0, 0.281)], 0.001, 2)
    for (x, y, rx, ry) in ((0.118, -0.062, 0.30, 0.20), (0.132, -0.036, 0.22, 0.33)):
        B.mesh("brazier_hibashi", _lathe(stick, 10), [iron], loc=(x, y, 0.283 + az(x, y) - 0.05),
               rot=(rx, ry, 0.0))


# ---------------------------------------------------------------------------------------------
# folded robe on a lacquer tray (hirobuta)
# ---------------------------------------------------------------------------------------------
def _fold_path(y0, y1, z0, z1, y2, step=0.014, arc=7):
    """Polyline (y, z): from y0 along z0 to y1, a half turn to z1, back to y2."""
    sgn = 1.0 if y1 > y0 else -1.0
    pts = [(y, z0) for y in _span(y0, y1, step)]
    zc, r = (z0 + z1) / 2.0, (z1 - z0) / 2.0
    for i in range(1, arc):
        a = -PI / 2 + PI * i / arc
        pts.append((y1 + sgn * abs(r) * math.cos(a), zc + r * math.sin(a)))
    pts += [(y, z1) for y in _span(y1, y2, step)]
    return pts


def _sheet(B, name, path, x0, x1, thick, mats, up, seed=0.0, nx=18, top=0.066, base=0.009,
           edge_drop=0.007, yfold=0.4, flap=None):
    """Cloth strip: the (y, z) path swept across x0..x1, moved by one shared soft drape field so
    stacked sheets stay nested, then solidified inwards (slot 1 = the reverse face) and subdivided."""
    xs = _span(x0, x1, (x1 - x0) / nx)
    ss = list(range(len(path)))
    xm, hw = (x0 + x1) / 2.0, (x1 - x0) / 2.0

    def fn(x, s):
        y, z = path[s]
        e = (x - xm) / hw
        if flap and s > flap[0]:                  # the turned-back part: an uneven, slanted free edge
            y = flap[1] + (y - flap[1]) * (0.95 + 0.6 * e + 0.2 * _nz(x * 7.0, seed, 1.0))
        z = base + (z - base) * (1.0 - 0.22 * C.smoothstep((-y - 0.20) / 0.22))   # open end lies flatter
        lift = max(0.0, min(1.0, (z - base) / (top - base)))
        free = C.smoothstep((yfold - y) / 0.3)
        xx = x + 0.005 * e * _nz(y * 7.0, seed, 2.0) + 0.0015 * _nz(y * 30.0, seed + 3.0, e)
        dz = lift * (0.0055 * _nz(x * 6.0, y * 3.5, 0.5) + 0.0022 * _nz(x * 21.0, y * 8.0, 1.5)
                     + 0.0012 * math.sin(y * 31.0 + 5.0 * _nz(x * 4.0, y * 2.0, 3.0))
                     + 0.0019 * e * e * math.sin(150.0 * (0.25 * x + 0.75 * y) + 4.0 * _nz(x * 6.0, y * 6.0, 8.0))
                     - 0.0017 * math.exp(-((y + 0.035 + 0.02 * e) / 0.007) ** 2)
                     - 0.0014 * math.exp(-((y - 0.245 - 0.012 * e) / 0.006) ** 2)
                     - edge_drop * abs(e) ** 3)
        dz += 0.0008 * _nz(x * 34.0, y * 34.0, seed + 9.0)
        yy = y + free * (0.005 * _nz(x * 6.0, seed + 5.0, 0.0) + 0.006 * e * math.sin(seed * 2.3))
        return (xx, yy, z + dz)
    bm = _grid(xs, ss, fn, up=(2, up))
    ob = B.mesh(name, bm, mats, wn=False)
    so = ob.modifiers.new("solid", "SOLIDIFY")
    so.thickness, so.offset = thick, -1.0
    so.material_offset = 1 if len(mats) > 1 else 0
    so.use_even_offset = True
    sb = ob.modifiers.new("subsurf", "SUBSURF")
    sb.levels = sb.render_levels = 2
    return ob


def _b_robe_tray(B):
    lac = m_lacquer("P_lacquer")
    B.mesh("robe_tray_tray", _tray(0.45, 0.95, 0.04, wall=0.007, floor=0.008, bevel=0.0022, seg=3,
                                   flare=0.004), [lac])
    ivory = m_silk("P_silk_ivory", (0.82, 0.75, 0.61), rough=0.46, sheen=0.6, pitch=0.0009, var=0.05,
                   crease=0.5, damask=0.8, spec=0.35, layers=0.0024, seam=-0.034)
    lining = m_silk("P_silk_lining", _lin("#d4583a"), rough=0.5, sheen=0.5, pitch=0.0009, var=0.07,
                    crease=0.5, spec=0.3, layers=0.0024)
    mats = [ivory, lining]
    plain = [ivory]
    yo = 0.4
    _sheet(B, "robe_fold_outer", _fold_path(-0.424, yo, 0.0092, 0.062, -0.42), -0.18, 0.18, 0.009,
           mats, -1.0, seed=1.0)
    _sheet(B, "robe_fold_inner", _fold_path(-0.414, yo - 0.002, 0.0188, 0.0524, -0.408), -0.177, 0.178,
           0.009, plain, -1.0, seed=2.0)
    _sheet(B, "robe_fold_core", [(y, 0.0432) for y in _span(-0.402, yo - 0.014, 0.014)], -0.176, 0.175,
           0.0145, plain, 1.0, seed=3.0)
    # the upper sleeve, its edge turned back so the vermilion lining shows
    path = _fold_path(0.128, -0.262, 0.0662, 0.0722, -0.19, arc=6)
    nfold = len(_span(0.128, -0.262, 0.014)) + 5
    ob = _sheet(B, "robe_sleeve", path, -0.178, 0.176, 0.0034, mats, 1.0, seed=4.0, top=0.066,
                flap=(nfold, -0.262))
    ob.rotation_euler = (0.0, 0.0, 0.022)


# ---------------------------------------------------------------------------------------------
# hanging scroll (kakejiku). Origin at the top centre of the mount; front faces -Y.
# ---------------------------------------------------------------------------------------------
def _b_scroll(B):
    W, IW = 0.55, 0.38
    z_ten, z_chu, z_ichi, z_img = -0.40, -0.49, -0.525, -1.425
    z_ichi2, z_chu2, z_end = -1.445, -1.50, -1.72
    rr = 0.0132                                   # roller radius under the cloth
    xs = _span(-W / 2, -IW / 2, 0.03) + _span(-IW / 2, IW / 2, 0.032)[1:] + _span(IW / 2, W / 2, 0.03)[1:]
    zb = [0.0, z_ten, z_chu, z_ichi, z_img, z_ichi2, z_chu2, z_end]
    ss, reg = [0.0], []
    for i in range(len(zb) - 1):
        seg = _span(zb[i], zb[i + 1], 0.03)[1:]
        ss += seg
        reg += [i] * len(seg)
    na = 8
    for i in range(1, na + 1):                    # the wrap round the roller: s runs past z_end
        ss.append(z_end - PI * rr * i / na)
        reg.append(6)

    def disp(x, z):
        w = C.smoothstep(-z / 0.06) * C.smoothstep((z - z_end) / 0.05)
        e = (x / (W / 2)) ** 2
        return w * (-0.0055 * e * (0.35 + 0.65 * (0.5 + 0.5 * math.sin(3.1 * z + 0.7)))
                    + 0.0013 * math.sin(z * 9.0 + x * 1.3) + 0.0006 * math.sin(z * 23.0 + 1.0)
                    + 0.0012 * _nz(x * 4.0, z * 3.0, 4.0))

    def fn(x, s):
        if s >= z_end:
            return (x, disp(x, s), s)
        a = (z_end - s) / rr
        return (x, rr - rr * math.cos(a), z_end - rr * math.sin(a))

    def in_img(i, j):
        return reg[i] == 3 and -IW / 2 - 1e-6 <= xs[j] and xs[j + 1] <= IW / 2 + 1e-6

    def matf(i, j):
        r = reg[i]
        centre = -IW / 2 - 1e-6 <= xs[j] and xs[j + 1] <= IW / 2 + 1e-6
        if r in (0, 6):
            return 0
        if r in (2, 4) and centre:
            return 2
        return 1
    tenchi = m_brocade("P_brocade_tenchi", (0.33, 0.29, 0.20), (0.39, 0.35, 0.25), cell=0.017)
    chu = m_brocade("P_brocade_chuberi", (0.085, 0.105, 0.11), (0.27, 0.24, 0.15), cell=0.021, gold=0.2)
    ichi = m_brocade("P_brocade_ichimonji", (0.36, 0.23, 0.09), (0.70, 0.51, 0.22), cell=0.0105, gold=0.7)
    uvm = lambda x, s: (x, s)                     # noqa: E731  (metres)
    B.mesh("scroll_mount", _grid(xs, ss, fn, up=(1, -1.0), skip=in_img, matf=matf, uvf=uvm),
           [tenchi, chu, ichi], wn=False)
    ob = B.mesh("scroll_image", _grid(xs, ss, fn, up=(1, -1.0), skip=lambda i, j: not in_img(i, j),
                                      uvf=lambda x, s: ((x + IW / 2) / IW, (s - z_img) / (z_ichi - z_img))),
                [m_paper()], wn=False)
    ob.name = "scroll_image"
    # futai: two brocade strips hanging over the upper mount
    for cx in (-IW / 2 + 0.045, IW / 2 - 0.045):
        fx = _span(cx - 0.0085, cx + 0.0085, 0.0085)
        fs = _span(-0.002, z_ten + 0.004, 0.03)
        B.mesh("scroll_futai", _grid(fx, fs, lambda x, s: (x, disp(x, s) - 0.0007 - 0.0012 * (s / z_ten) ** 3,
                                                           s), up=(1, -1.0), uvf=uvm), [ichi], wn=False)
    wood = m_wood("P_wood_jiku", "okoume_veneer", tint=(0.075, 0.032, 0.018), scale=5.0, coat=0.5,
                  rough=(0.22, 0.4), grain=(4.0, 80.0, 80.0), figure=0.4)
    # roller and its knobs
    zc = z_end
    core = _fillet([(0, -W / 2 + 0.001), (rr - 0.0006, -W / 2 + 0.001), (rr - 0.0006, W / 2 - 0.001),
                    (0, W / 2 - 0.001)], 0.001, 2)
    B.mesh("scroll_roller", _lathe(core, 20), [wood], loc=(0, rr, zc), rot=(0, PI / 2, 0))
    knob = _fillet([(0, 0), (0.0125, 0), (0.0128, 0.003), (0.0118, 0.006), (0.0148, 0.010), (0.0158, 0.019),
                    (0.0148, 0.026), (0.010, 0.0285), (0, 0.029)], 0.0012, 2)
    for sgn in (-1.0, 1.0):
        B.mesh("scroll_knob", _lathe(knob, 28), [wood], loc=(sgn * (W / 2 - 0.001), rr, zc),
               rot=(0, sgn * PI / 2, 0))
    # top rod, eyelets, hanging cord and a nail
    B.mesh("scroll_rod", _rbox(W - 0.002, 0.007, 0.011, 0.0028, 3), [wood], loc=(0, 0.0042, -0.0105))
    brass = m_plain("P_brass", (0.55, 0.38, 0.16), rough=0.42, metallic=1.0, var=0.25, nscale=60.0)
    cord = _cord_mat("P_cord_scroll", "#6b5a3c")
    ex, pk = 0.105, 0.055
    for sgn in (-1.0, 1.0):
        B.tube("scroll_eyelet", [[(sgn * ex + 0.0035 * math.cos(a), 0.0042, 0.0035 + 0.0035 * math.sin(a))
                                  for a in [2 * PI * i / 10 for i in range(10)]]], 0.0008, brass, cyclic=True)
    B.tube("scroll_cord", [[(-ex, 0.0042, 0.0045), (-ex * 0.5, 0.0042, 0.0045 + (pk - 0.0045) * 0.5),
                            (-0.003, 0.0042, pk), (0.003, 0.0042, pk),
                            (ex * 0.5, 0.0042, 0.0045 + (pk - 0.0045) * 0.5), (ex, 0.0042, 0.0045)],
                           [(0.004, 0.0052, pk - 0.002), (0.012, 0.0062, pk - 0.03), (0.016, 0.0068, -0.004),
                            (0.02, 0.0075, -0.09), (0.017, 0.008, -0.16)]], 0.0012, cord, kind="POLY")
    iron = m_plain("P_iron", (0.035, 0.032, 0.03), rough=0.5, metallic=1.0, var=0.3, nscale=90.0)
    B.mesh("scroll_nail", _lathe(_fillet([(0, 0), (0.0016, 0), (0.0016, 0.016), (0.0034, 0.017),
                                          (0.0034, 0.0185), (0, 0.019)], 0.0005, 2), 10), [iron],
           loc=(0, 0.019, pk - 0.0026), rot=(PI / 2, 0, 0))


_BUILDERS = {
    "doc_box_large": _b_doc_box_large, "doc_box_small": _b_doc_box_small,
    "tobacco_tray": _b_tobacco_tray, "zabuton_a": _b_zabuton_a, "zabuton_b": _b_zabuton_b,
    "brazier": _b_brazier, "robe_tray": _b_robe_tray, "scroll": _b_scroll,
}


# ---------------------------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------------------------
def build(collection=None):
    """Create every prop under an empty "prop_<name>" at the origin. Returns the state dict:
    {"props": {name: empty}, "objects": {name: [objects]}, "collection": collection}."""
    coll = collection or bpy.context.scene.collection
    state = {"props": {}, "objects": {}, "collection": coll}
    for name in NAMES:
        e = bpy.data.objects.new("prop_" + name, None)
        e.empty_display_size = 0.1
        coll.objects.link(e)
        b = _B(coll, e)
        _BUILDERS[name](b)
        state["props"][name] = e
        state["objects"][name] = b.objs
    return state


def place(state, name, location, rot_z=0.0):
    """Move a prop's parent empty. location = base centre on the floor (scroll: top centre)."""
    e = state["props"][name]
    e.location = tuple(location)
    e.rotation_euler = (0.0, 0.0, rot_z)
    return e


def place_all(state, layout=None):
    for name, (loc, rz) in (layout or DEFAULT_LAYOUT).items():
        if name in state["props"]:
            place(state, name, loc, rz)
