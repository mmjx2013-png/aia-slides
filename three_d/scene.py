"""scene.py - the museum, the cloth stages A-D, the rack, the vitrine and the camera path.

    import scene
    scene.build()            # once: creates everything in the current bpy scene
    scene.apply_frame(f)     # f = full-rate frame 0..1079; stateless (any order)
    scene.anchors_world(f)   # dict name -> (x, y, z) world points for meta.json (after apply_frame(f))

Coordinates: Z up, metres, floor z = 0. Building layout from README v2 (numbers in dims.json "museum").
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

M = DIMS["museum"]
WD = DIMS["world"]
T = WD["table_z"]
ROD_R = WD["rod_radius"]
ROD_TOP = WD["rod_z_end"]
L_BOLT = DIMS["bolt"]["length"]
W = DIMS["bolt"]["width"]
H_CLOTH = DIMS["bolt"]["thickness"]
RC = DIMS["bolt"]["core_radius"]
Y0 = DIMS["bolt"]["free_end_y"]
D0 = 0.0016                      # base layer height of cloth above the dais
FPS = 24
N_FRAMES = DIMS["frames"]
CAM_Z = M["camera_z"]
SHIFT_Y = M["shift_y"]
SHIFT_T = SHIFT_Y * 36.0 / 30.0  # tangent of the vertical shift angle
FORM = tuple(M["form_xy"])
VIT = tuple(M["vitrine_xy"])
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


def glass_mat():
    m = bpy.data.materials.get("Glass")
    if m:
        return m
    m = bpy.data.materials.new("Glass")
    if not m.node_tree:
        m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    tr.inputs["Color"].default_value = (0.96, 0.97, 0.96, 1)
    gl = nt.nodes.new("ShaderNodeBsdfGlossy")
    gl.inputs["Roughness"].default_value = 0.02
    lw = nt.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.08
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = 0.015
    mr.inputs["To Max"].default_value = 0.35
    nt.links.new(lw.outputs["Fresnel"], mr.inputs["Value"])
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(mr.outputs["Result"], mix.inputs["Fac"])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(gl.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
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


def spot(name, pos, target, energy, size_deg, blend=0.75, radius=0.05, coll=None, kelvin=3000, fitting=True):
    li = bpy.data.lights.new(name, "SPOT")
    li.energy = energy
    li.spot_size = math.radians(size_deg)
    li.spot_blend = blend
    li.shadow_soft_size = radius
    li.use_temperature = True
    li.temperature = kelvin
    ob = _obj(name, li, coll)
    p, t = Vector(pos), Vector(target)
    d = (t - p).normalized()
    ob.location = p
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = d.to_track_quat("-Z", "Y")
    if fitting:
        # visible fitting: a short black can behind the light, and a stem up to the track
        mat = plain("TrackBlack", "#0d0c0c", rough=0.45, spec=0.5)
        cylinder(name + "_can", p - d * 0.16, p - d * 0.005, 0.042, mat, coll, n=16)
        top = Vector((p.x, p.y, M["ceiling"] - 0.04))
        cylinder(name + "_stem", p - d * 0.09, top, 0.008, mat, coll, n=8, cap=False)
    return ob


def area(name, pos, target, energy, sx, sy, coll, kelvin=3000, spread=180):
    li = bpy.data.lights.new(name, "AREA")
    li.shape = "RECTANGLE"
    li.size, li.size_y = sx, sy
    li.energy = energy
    li.spread = math.radians(spread)
    li.use_temperature = True
    li.temperature = kelvin
    ob = _obj(name, li, coll)
    ob.location = pos
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = (Vector(target) - Vector(pos)).normalized().to_track_quat("-Z", "Y")
    return ob


# =========================================================================== the building

def _walls():
    """Axis-aligned wall slabs: (name, axis, fixed0, fixed1, run0, run1, doors[(a,b)])."""
    t = 0.2
    return [
        ("W_west", "x", -3.6, -3.4, -7.7, 24.2, []),
        ("W_r1south", "y", -7.7, -7.5, -3.6, 3.6, []),
        ("W_mid_x", "x", 3.4, 3.6, -7.5, 24.0, [(3.2, 5.2), (19.6, 21.6)]),
        ("W_east", "x", 11.6, 11.8, 0.4, 24.2, []),
        ("W_r2south", "y", 0.4, 0.6, 3.4, 11.8, []),
        ("W_r2r3", "y", 7.8, 8.0, 3.6, 11.6, [(6.4, 8.4)]),
        ("W_r3r4", "y", 15.2, 15.4, 3.6, 11.6, [(6.4, 8.4)]),
        ("W_north", "y", 24.0, 24.2, -3.6, 11.8, []),
        ("W_r1r5", "y", 13.2, 13.4, -3.4, 3.4, [(-1.1, 1.1)]),
    ]


def build_building():
    coll = _coll("Museum")
    H = M["ceiling"]
    DH = M["door_h"]
    gap = 0.07
    wall = C.fabric_material("room", name="Wall", color=M["wall_hex"])
    black = plain("ShadowGap", "#050404", rough=0.9, spec=0.05)
    floor_m = C.fabric_material("floor", name="Floor", color=M["floor_hex"])
    ceil_m = plain("Ceiling", "#141211", rough=0.95, spec=0.05)
    for (nm, ax, f0, f1, r0, r1, doors) in _walls():
        cuts = sorted(doors)
        runs, a = [], r0
        for (d0, d1) in cuts:
            runs.append((a, d0, 0.0, H))
            runs.append((d0, d1, DH, H))
            a = d1
        runs.append((a, r1, 0.0, H))
        for k, (a0, a1, z0, z1) in enumerate(runs):
            zb = max(z0, gap) if z0 == 0.0 else z0
            if ax == "x":
                box("%s_%d" % (nm, k), f0, f1, a0, a1, zb, z1, wall, coll)
                if z0 == 0.0:
                    box("%s_%d_g" % (nm, k), f0 + 0.015, f1 - 0.015, a0, a1, 0, gap, black, coll)
            else:
                box("%s_%d" % (nm, k), a0, a1, f0, f1, zb, z1, wall, coll)
                if z0 == 0.0:
                    box("%s_%d_g" % (nm, k), a0, a1, f0 + 0.015, f1 - 0.015, 0, gap, black, coll)
    box("Floor", -3.6, 11.8, -7.7, 24.2, -0.05, 0.0, floor_m, coll)
    box("Ceiling", -3.6, 11.8, -7.7, 24.2, H, H + 0.05, ceil_m, coll)
    # tracks (thin black bars) along each room
    tb = plain("TrackBlack", "#0d0c0c", rough=0.45, spec=0.5)
    for (x0, x1, y0, y1) in M["tracks"]:
        box("Track_%.1f_%.1f" % (x0, y0), x0 - 0.02, x1 + 0.02, y0 - 0.02, y1 + 0.02, H - 0.04, H, tb, coll)
    # numerals
    font = bpy.data.fonts.load(M["numeral_font"])
    paint = plain("NumeralPaint", "#b3a68f", rough=0.85, spec=0.1)
    for (txt, pos, rotz) in M["numerals"]:
        cu = bpy.data.curves.new("Num" + txt, "FONT")
        cu.body = txt
        cu.font = font
        cu.size = 0.62
        cu.align_x = "CENTER"
        cu.align_y = "CENTER"
        cu.materials.append(paint)
        ob = _obj("Numeral_%s_%.1f" % (txt, pos[0]), cu, coll)
        ob.location = pos
        ob.rotation_euler = (math.pi / 2, 0, math.radians(rotz))
    # placards on picture walls + bench
    cream = plain("Placard", "#e3dccb", rough=0.7, spec=0.2)
    for wl in M["picture_walls"]:
        for c in wl["pools"]:
            px, py = _wall_point(wl, c + wl["placard_off"])
            nx, ny = wl["normal"]
            ax, ay = wl["along"]
            hw, hh = 0.08, 0.055
            x0, x1 = sorted((px - ax * hw + nx * 0.0, px + ax * hw + nx * 0.006))
            y0, y1 = sorted((py - ay * hw + ny * 0.0, py + ay * hw + ny * 0.006))
            box("Placard_%s_%.1f" % (wl["id"], c), x0, x1, y0, y1, 1.25 - hh, 1.25 + hh, cream, coll)
    bench_m = plain("Bench", "#2a211c", rough=0.55, spec=0.3)
    bx, by = M["bench_xy"]
    box("Bench_top", bx - 0.24, bx + 0.24, by - 0.85, by + 0.85, 0.40, 0.46, bench_m, coll)
    for sy in (-0.7, 0.7):
        box("Bench_leg%.1f" % sy, bx - 0.20, bx + 0.20, by + sy - 0.03, by + sy + 0.03, 0.0, 0.40, bench_m, coll)
    # world: almost black, warm
    wo = bpy.data.worlds.new("Museum")
    if not wo.node_tree:
        wo.use_nodes = True
    bg = [n for n in wo.node_tree.nodes if n.bl_idname == "ShaderNodeBackground"][0]
    bg.inputs["Color"].default_value = hex_rgb("#0b0a09", 1.0)
    bg.inputs["Strength"].default_value = 0.3
    bpy.context.scene.world = wo


def _wall_point(wl, c):
    """Point on a picture wall surface at along-coordinate c (the varying world coordinate)."""
    if wl["axis"] == "x":   # wall at fixed x, c is y
        return wl["plane"], c
    return c, wl["plane"]


def build_lights():
    coll = _coll("Lights")
    H = M["ceiling"] - 0.10
    E = M["light_scale"]
    # R1: a row of narrow spots down the dais, plus the rack keys
    for k, y in enumerate(M["dais_spot_y"]):
        sx = 1.25 if k % 2 == 0 else -1.25
        spot("L_dais_%d" % k, (sx, y - 0.6, H), (0.0, y, T), 520 * E, 34, 0.8, 0.06, coll)
    for nm, p, t, e in (("L_rack_bk_l", (-1.6, -2.4, H), (0, 0, 1.0), 900),
                        ("L_rack_bk_r", (1.7, -2.6, H), (0, 0, 1.15), 700),
                        ("L_rack_fr_l", (-1.5, 2.6, H), (0, 0, 1.05), 750),
                        ("L_rack_fr_r", (1.6, 2.4, H), (0, 0, 1.0), 600)):
        spot(nm, p, t, e * E, 32, 0.8, 0.08, coll)
    # R1 wall washes (quiet, low)
    for k, (p, t) in enumerate(M["r1_washes"]):
        spot("L_wash_%d" % k, p, t, 260 * E, 50, 1.0, 0.1, coll)
    # numerals
    for (txt, pos, rotz) in M["numerals"]:
        rz = math.radians(rotz)
        nx, ny = -math.sin(rz), math.cos(rz)       # text faces local -Y after the X rotation... see below
        p = (pos[0] - nx * 1.3, pos[1] - ny * 1.3, H)
        spot("L_num_%s_%.1f" % (txt, pos[0]), p, pos, 160 * E, 26, 0.9, 0.05, coll)
    # picture walls: identical spots 2.1 m apart
    for wl in M["picture_walls"]:
        nx, ny = wl["normal"]
        for c in wl["pools"] + wl.get("extra_pools", []):
            px, py = _wall_point(wl, c)
            spot("L_pic_%s_%.1f" % (wl["id"], c), (px + nx * 1.25, py + ny * 1.25, H), (px, py, 1.45),
                 420 * E, 40, 0.9, 0.05, coll)
    # R3 dress form
    fx, fy = FORM
    for nm, p, t, e in (("L_form_fl", (fx - 1.4, fy - 2.3, H), (fx, fy, 1.15), 900),
                        ("L_form_fr", (fx + 1.6, fy - 2.0, H), (fx, fy, 1.2), 600),
                        ("L_form_bk", (fx + 0.6, fy + 2.3, H), (fx, fy, 1.2), 650),
                        ("L_form_bl", (fx - 1.5, fy + 1.8, H), (fx, fy, 1.1), 400)):
        spot(nm, p, t, e * E, 30, 0.8, 0.08, coll)
    # R5 vitrine: ceiling spots plus a soft light inside the top frame
    vx, vy = VIT
    for nm, p, t, e in (("L_vit_s_l", (vx - 1.6, vy - 2.6, H), (vx, vy, 1.1), 900),
                        ("L_vit_s_r", (vx + 1.7, vy - 2.4, H), (vx, vy, 1.2), 650),
                        ("L_vit_n", (vx + 0.8, vy + 2.6, H), (vx, vy, 1.1), 500)):
        spot(nm, p, t, e * E, 30, 0.8, 0.08, coll)
    area("L_vit_top", (vx, vy - 0.15, 2.36), (vx, vy - 0.15, 0.0), 40 * E, 1.9, 0.5, coll)
    # R2/R4 general dim fill so that the rooms read
    for k, (p, t) in enumerate(M["fills"]):
        spot("L_fill_%d" % k, p, t, 220 * E, 70, 1.0, 0.2, coll)


# =========================================================================== dais, rack, vitrine

def build_furniture():
    coll = _coll("Furniture")
    dais_m = C.fabric_material("dais", name="Dais", color=M["dais_hex"])
    lac = C.fabric_material("lacquer", name="Lacquer")
    x0, x1 = WD["dais_x"]
    y0, y1 = WD["dais_y"]
    g = 0.022                                    # the slot in which the rod lies flush
    box("Dais_s", x0, x1, y0, -g, 0.0, T, dais_m, coll)
    box("Dais_n", x0, x1, g, y1, 0.0, T, dais_m, coll)
    box("Dais_slot", x0, x1, -g, g, 0.0, T - 2 * ROD_R - 0.003, dais_m, coll)
    # rack (iko): posts beside the dais on small feet, top rail, sliding collars, the rod
    rack = _coll("Rack")
    S["rack_static"] = _build_rack(rack, lac, (0.0, 0.0))
    rod = cylinder("Rod", (-0.95, 0, 0), (0.95, 0, 0), ROD_R, lac, rack, n=24)
    cols = []
    for sx in (-1, 1):
        cols.append(box("RodCollar_%d" % sx, sx * WD["post_x"] - 0.03, sx * WD["post_x"] + 0.03, -0.03, 0.03,
                        -0.03, 0.03, lac, rack))
    S["rod"], S["collars"] = rod, cols
    # vitrine in R5
    vx, vy = VIT
    vc = _coll("Vitrine")
    base_m = plain("VitBase", "#141110", rough=0.5, spec=0.3)
    hw, hd = 1.18, 0.55
    box("Vit_base", vx - hw - 0.04, vx + hw + 0.04, vy - hd - 0.04, vy + hd + 0.04, 0.0, 0.12, base_m, vc)
    box("Vit_lid", vx - hw - 0.02, vx + hw + 0.02, vy - hd - 0.02, vy + hd + 0.02, 2.40, 2.52, base_m, vc)
    gm = glass_mat()
    t = 0.006
    box("Vit_glass_s", vx - hw, vx + hw, vy - hd - t, vy - hd, 0.12, 2.40, gm, vc)
    box("Vit_glass_n", vx - hw, vx + hw, vy + hd, vy + hd + t, 0.12, 2.40, gm, vc)
    box("Vit_glass_w", vx - hw - t, vx - hw, vy - hd, vy + hd, 0.12, 2.40, gm, vc)
    box("Vit_glass_e", vx + hw, vx + hw + t, vy - hd, vy + hd, 0.12, 2.40, gm, vc)
    rodv = cylinder("Vit_rod", (vx - 0.95, vy, ROD_TOP), (vx + 0.95, vy, ROD_TOP), ROD_R, lac, vc)
    _build_rack(vc, lac, (vx, vy), floor_z=0.12)
    for sx in (-1, 1):
        box("Vit_collar_%d" % sx, vx + sx * WD["post_x"] - 0.03, vx + sx * WD["post_x"] + 0.03, vy - 0.03,
            vy + 0.03, ROD_TOP - 0.03, ROD_TOP + 0.03, lac, vc)
    for p in rodv, :
        pass


def _build_rack(coll, lac, xy, floor_z=0.0):
    ox, oy = xy
    px = WD["post_x"]
    ph = WD["post_h"]
    obs = []
    for sx in (-1, 1):
        x = ox + sx * px
        obs.append(box("Post_%d_%.0f" % (sx, oy), x - 0.0175, x + 0.0175, oy - 0.0175, oy + 0.0175, floor_z,
                       ph, lac, coll))
        obs.append(box("Foot_%d_%.0f" % (sx, oy), x - 0.025, x + 0.025, oy - 0.22, oy + 0.22, floor_z,
                       floor_z + 0.04, lac, coll))
    obs.append(box("Rail_%.0f" % oy, ox - px - 0.14, ox + px + 0.14, oy - 0.025, oy + 0.025, ph, ph + 0.035,
                   lac, coll))
    return obs


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


def snapshot_vitrine():
    """Copy the finished T (state at the end of C) into the vitrine."""
    update_cloth(STAGE["C"][1])
    vc = _coll("Vitrine")
    vx, vy = VIT
    objs = [p.ob for p in S["pieces"].values() if p.kind != "remnant"] + [l[0] for l in S["linings"]] + \
           [s[0] for s in S["seams"]]
    for ob in objs:
        if ob.type == "CURVE":
            me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
        else:
            me = ob.data.copy()
        if not me.materials:
            for m in ob.data.materials:
                me.materials.append(m)
        nob = _obj("Vit_" + ob.name, me, vc)
        nob.location = (vx, vy, 0.0)


# =========================================================================== dress form

def build_dressform():
    coll = _coll("DressForm")
    fx, fy = FORM
    piv = bpy.data.objects.new("FormPivot", None)
    coll.objects.link(piv)
    piv.location = (fx, fy, 0.0)
    piv.rotation_euler = (0, 0, math.pi)            # built facing +Y, we want it facing -Y (south)
    S["form_pivot"] = piv
    S["form_state"] = None
    try:
        import importlib
        dressform = importlib.import_module("dressform")
        sub = bpy.data.collections.new("DressFormBuilt")
        coll.children.link(sub)
        mats = None
        st = dressform.build(sub, origin=(0.0, 0.0, 0.0), materials=mats)
        for ob in sub.all_objects:
            if ob.parent is None:
                ob.parent = piv
        S["form_state"] = st
        S["dressform"] = dressform
        print("[scene] dressform.py built")
    except Exception as e:  # noqa: BLE001
        print("[scene] dressform unavailable (%s); using proxy" % e)
        mq = C.fabric_material("mannequin")
        torso = cylinder("FormProxy_torso", (0, 0, 1.0), (0, 0, 1.55), 0.15, mq, coll, n=32)
        torso.parent = piv
        torso.location = (0, 0, 1.0)
        stand = cylinder("FormProxy_stand", (0, 0, 0.12), (0, 0, 1.0), 0.015, mq, coll, n=12)
        stand.parent = piv
        stand.location = (0, 0, 0.12)
    plinth = plain("Plinth", "#1c1816", rough=0.6, spec=0.25)
    box("FormPlinth", fx - 0.45, fx + 0.45, fy - 0.45, fy + 0.45, 0.0, 0.10, plinth, coll)


def form_t(f):
    out = {}
    for k, (a, b) in M["dress_frames"].items():
        out[k] = ramp(f, a, b)
    return out


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


def _camera_segments():
    z = CAM_Z
    fx, fy = FORM
    vx, vy = VIT
    st = {s["id"]: s for s in M["stops"]}
    Ak = M["cam"]
    segs = []
    # A: special (tracks the roll), B, C: R1 keys
    a0 = _key(Ak["A0"][0], Ak["A0"][1])
    a1 = _key(Ak["A1"][0], Ak["A1"][1])
    b1 = _key(Ak["B1"][0], Ak["B1"][1])
    c1 = _key((0.0, -Ak["C_dist"], z), yaw=90)
    d1 = _key((0.0, Ak["C_dist"], z), yaw=-90)
    segs.append(("A", 0, 119, [a0, _key(Ak["Amid"][0], Ak["Amid"][1]), a1]))
    segs.append(("B", 120, 209, [a1, _key(Ak["Bmid"][0], Ak["Bmid"][1]), b1]))
    segs.append(("C", 210, 329, [b1, _key(Ak["Cmid"][0], Ak["Cmid"][1]), c1]))
    segs.append(("D", 330, 419, "orbitD"))
    s2 = _key((st["S2"]["x"], st["S2"]["y"], z), yaw=st["S2"]["yaw"])
    segs.append(("W1", 420, 491, [d1, _key((1.6, 4.25, z), yaw=-40), _key((3.5, 4.2, z), yaw=-4),
                                  _key((5.6, 4.2, z), yaw=0), s2]))
    e0 = _key((fx, fy - M["form_dist"], z), yaw=90)
    segs.append(("W2", 492, 563, [s2, _key((8.0, 5.4, z), yaw=55), _key((7.55, 7.1, z), yaw=86), e0]))
    e1 = _key((fx, fy - M["form_dist"] + 0.22, z), yaw=90)
    segs.append(("E", 564, 683, [e0, e1]))
    segs.append(("F", 684, 773, "orbitF"))
    f1 = _key((fx, fy + M["form_dist"] - 0.22, z), yaw=-90)
    s3 = _key((st["S3"]["x"], st["S3"]["y"], z), yaw=st["S3"]["yaw"])
    segs.append(("W3", 774, 821, [f1, _key((7.95, 13.6, z), yaw=-40), s3]))
    s4a = _key((st["S4a"]["x"], st["S4a"]["y"], z), yaw=st["S4a"]["yaw"])
    segs.append(("W4", 822, 893, [s3, _key((7.75, 14.2, z), yaw=70), _key((7.4, 15.3, z), yaw=88),
                                  _key((7.7, 17.0, z), yaw=45), s4a]))
    s4b = _key((st["S4b"]["x"], st["S4b"]["y"], z), yaw=st["S4b"]["yaw"])
    segs.append(("W5", 894, 941, [s4a, _key((7.85, 19.6, z), yaw=45), s4b]))
    g0 = _key((vx, vy - M["vit_dist"], z), yaw=90)
    g1 = _key((vx, vy - M["vit_dist"] + 0.10, z), yaw=90)
    segs.append(("W6", 942, 1049, [s4b, _key((6.2, 20.6, z), yaw=150), _key((3.5, 20.6, z), yaw=182),
                                   _key((2.0, 18.4, z), yaw=200), _key((1.9, 15.6, z), yaw=130), g0]))
    segs.append(("G", 1050, 1079, [g0, g1]))
    return segs


_SEGS = None


def camera_state(f):
    """(x, y, z, yaw, pitch) at full-rate frame f (float allowed)."""
    global _SEGS
    if _SEGS is None:
        _SEGS = _camera_segments()
    f = min(max(f, 0.0), N_FRAMES - 1.0)
    for (sid, f0, f1, keys) in _SEGS:
        if f <= f1 + 0.999 or sid == "G":
            break
    u = smootherstep((f - f0) / float(f1 - f0)) if f1 > f0 else 1.0
    z = CAM_Z
    if keys == "orbitD":
        r = M["cam"]["C_dist"]
        rx = M["cam"]["D_rx"]
        ph = -math.pi / 2 + math.pi * u
        pos = (rx * math.cos(ph), r * math.sin(ph), z)
        yaw = math.atan2(-pos[1], -pos[0]) if abs(pos[0]) > 1e-6 or abs(pos[1]) > 1e-6 else 0
        # look at the pivot (0, 0, 1.1) horizontally: yaw toward the pivot, level
        yaw = math.atan2(0 - pos[1], 0 - pos[0])
        return np.array([pos[0], pos[1], pos[2], yaw, 0.0])
    if keys == "orbitF":
        fx, fy = FORM
        r = M["form_dist"] - 0.22
        rx = M["form_orbit_rx"]
        ph = -math.pi / 2 + math.pi * u
        pos = (fx + rx * math.cos(ph), fy + r * math.sin(ph), z)
        yaw = math.atan2(fy - pos[1], fx - pos[0])
        return np.array([pos[0], pos[1], pos[2], yaw, 0.0])
    if sid == "A":
        st = _hermite_path(keys, u)
        # look target follows the roll, then settles far down the bolt
        f0r, f1r = M["roll_frames"]
        sc = 0.05 + (L_BOLT - 0.05) * ramp(f, f0r, f1r, smoothstep)
        tgt0 = np.array(M["cam"]["A0"][1], float)
        tgt1 = np.array(M["cam"]["A1"][1], float)
        roll_t = np.array([0.0, Y0 + sc + 0.15, 0.17])
        k = smoothstep(f / 119.0)
        follow = math.sin(math.pi * k) * 0.55
        base = tgt0 + (tgt1 - tgt0) * k
        tgt = base + (roll_t - base) * follow
        yw, pt = _yaw_pitch(st[:3], tgt)
        st[3], st[4] = yw, pt
        return st
    return _hermite_path(keys, u)


def build_camera():
    cd = bpy.data.cameras.new("Cam")
    cd.lens = 30.0
    cd.sensor_width = 36.0
    cd.sensor_fit = "HORIZONTAL"
    cd.shift_y = SHIFT_Y
    cd.shift_x = 0.0
    cd.clip_start = 0.05
    cd.clip_end = 80.0
    ob = bpy.data.objects.new("Cam", cd)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.scene.camera = ob
    S["cam"] = ob


def update_camera(f):
    st = camera_state(f)
    ob = S["cam"]
    ob.location = (st[0], st[1], st[2])
    ob.rotation_mode = "XYZ"
    ob.rotation_euler = (math.pi / 2 + st[4], 0.0, st[3] - math.pi / 2)


# =========================================================================== public API

_BUILT = False


def build(res=(1920, 1080), samples=64, preview=False):
    global _BUILT
    if _BUILT:
        return
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    C.setup_cycles(sc, res=res, samples=samples, preview=preview)
    sc.view_settings.exposure = M["exposure"]
    build_building()
    build_lights()
    build_furniture()
    build_pieces()
    snapshot_vitrine()
    build_dressform()
    build_camera()
    _BUILT = True


def apply_frame(f):
    f = int(f)
    bpy.context.scene.frame_current = f
    update_cloth(f)
    update_dressform(f)
    update_camera(f)


def anchors_world(f):
    """World points for labels at frame f (call after apply_frame(f))."""
    fc = cloth_frame(f)
    out = {}
    rc, R = S["roll_state"]
    out["roll"] = rc
    out["cloth_free_end"] = (0.0, Y0, T + D0)
    for (ob, pa, pb, f0, f1) in S["chalk"][:5]:
        nm = ob.name.replace("Chalk_", "")
        ox, oy = 0.0, 0.0
        out[nm] = ((pa[0] + pb[0]) / 2 + ox, (pa[1] + pb[1]) / 2 + oy, T + D0)
    for nm, p in S["pieces"].items():
        if nm in ("remnant", "over_collar"):
            continue
        me = p.ob.data
        co = np.zeros(len(me.vertices) * 3, np.float32)
        me.vertices.foreach_get("co", co)
        co = co.reshape(p.nb, p.na, 3)
        c = co[p.nb // 2, p.na // 2] if fc >= STAGE["B"][0] else None
        if c is None:   # stage A: the piece's place on the bolt
            bx, by = p.bolt_xy()
            c = (float(bx[p.nb // 2, p.na // 2]), float(by[p.nb // 2, p.na // 2]), T + D0)
        key = "piece_okumi" if nm == "okumi_l" else ("piece_" + nm)
        if nm == "okumi_r":
            continue
        out[key] = tuple(float(v) for v in c)
    rz = rod_z(fc)
    out["rod"] = (0.0, 0.0, rz + ROD_R)

    def hm(x, y, d=D0 + 0.004, ff=fc):
        return tuple(float(v) for v in hang_map(np.array([x]), np.array([y]), d, ff)[0])
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
    vx, vy = VIT
    endc = STAGE["C"][1]
    for nm, (x, y) in (("vit_back_tl", (-C.W, -0.03)), ("vit_back_tr", (C.W, -0.03)),
                       ("vit_back_bl", (-C.W, -C.BODY)), ("vit_back_br", (C.W, -C.BODY)),
                       ("vit_collar", (0.0, -0.028))):
        p = hm(x, y, D0 + 0.006, endc)
        out[nm] = (p[0] + vx, p[1] + vy, p[2])
    st = S.get("form_state")
    if st is not None:
        try:
            fa = S["dressform"].anchors(st)
            for k, v in fa.items():
                key = k if k.startswith("form_") else "form_" + k
                out[key] = tuple(float(c) for c in v)
        except Exception as e:  # noqa: BLE001
            print("[scene] dressform.anchors failed:", e)
    for stp in M["stops"]:
        wl = [w for w in M["picture_walls"] if w["id"] == stp["wall"]][0]
        c = stp["y"] if wl["axis"] == "x" else stp["x"]
        ax, ay = wl["along"]
        for nm, da, dz in (("tl", -0.625, 0.8), ("tr", 0.625, 0.8), ("bl", -0.625, -0.8), ("br", 0.625, -0.8)):
            px, py = _wall_point(wl, c)
            out["hang_%s_%s" % (stp["id"], nm)] = (px + ax * da, py + ay * da, 1.40 + dz)
    return out


def walls_meta():
    out = {}
    for stp in M["stops"]:
        wl = [w for w in M["picture_walls"] if w["id"] == stp["wall"]][0]
        c = stp["y"] if wl["axis"] == "x" else stp["x"]
        px, py = _wall_point(wl, c)
        ax, ay = wl["along"]
        out[stp["id"]] = {"frame": stp["frame"], "pool0": [round(px, 4), round(py, 4), 1.40],
                          "along": [ax, ay, 0.0], "normal": [wl["normal"][0], wl["normal"][1], 0.0],
                          "spacing": 2.1, "placard_offset": [wl["placard_off_screen"], 1.25 - 1.40]}
    return out
