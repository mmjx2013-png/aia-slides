"""lookdev.py - the photographic lighting pass (v4): light groups, translucent washi, a softer sun,
haze in the hall, and the multilayer EXR passes that tools/comp.py grades into the final frames.

    import scene, lookdev
    scene.build(...)
    lookdev.apply(bpy.context.scene, clip=False)     # before the first apply_shot (set_light keeps it)

render.py --vfx calls this and writes OUT/NAME.exr instead of a PNG.

Light groups (Cycles), so the balance can be changed in compositing without re-rendering:
  sun     the one sun, through whatever shoji stand open
  sky     the garden HDRI (world)
  shoji   the paper: the area lights that carry its glow into the room, and the paper itself as seen
  bounce  a soft, low fill: the sunlit veranda and garden ground throwing light up into the hall
Each group holds that emitter's direct AND indirect light. Anything not in a group stays in Combined
only (comp.py works from Combined times smoothed group ratios, so nothing is lost).

Passes: Combined (denoised), the four groups, Mist, Position, Volume direct; stills add AO and
Cryptomatte (object). Half float; stills ZIP, clips DWAA (lossy, small) without AO/crypto.
"""
import math

import bpy

import scene

LOOK = dict(
    sun_angle_deg=1.6,          # was 0.54: a soft penumbra (a little haze round the disc)
    sun_gain=0.92,              # a little less sun against the sky
    paper_emit=1.0,             # the paper's own (camera) glow, now that real light comes through it
    paper_translucent=0.55,     # share of diffuse transmission in the washi
    haze_density=0.022,         # 1/m: shafts visible, subtle (lit by sun and sky only)
    haze_anisotropy=0.35,       # forward scattering: beams brighter looking towards the sun
    haze_color=(1.0, 0.98, 0.95),
    bounce_w=0.9,               # W/m2 of the bounce plane (it is a fill, not a key)
    mist_depth=22.0,
)
GROUPS = ("sun", "sky", "shoji", "bounce")


def _washi(mat):
    """Turn the camera-only emissive paper into translucent washi: real sun and sky through the fibres."""
    nt = mat.node_tree
    out = [n for n in nt.nodes if n.bl_idname == "ShaderNodeOutputMaterial"][0]
    bsdf = [n for n in nt.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled"][0]
    if "lookdev_tl" in nt.nodes:
        return
    # coarser, more visible fibre and cloud formation (kozo): two noises, stretched along the sheet
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0, 3.0, 18.0)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nf = nt.nodes.new("ShaderNodeTexNoise")
    nf.inputs["Scale"].default_value = 14.0
    nf.inputs["Detail"].default_value = 6.0
    nf.inputs["Roughness"].default_value = 0.62
    nt.links.new(mp.outputs["Vector"], nf.inputs["Vector"])
    cl = nt.nodes.new("ShaderNodeTexNoise")                      # the cloudy formation of the sheet
    cl.inputs["Scale"].default_value = 4.0
    cl.inputs["Detail"].default_value = 2.0
    nt.links.new(tc.outputs["Object"], cl.inputs["Vector"])
    mx = nt.nodes.new("ShaderNodeMath")
    mx.operation = "MULTIPLY"
    nt.links.new(nf.outputs["Fac"], mx.inputs[0])
    nt.links.new(cl.outputs["Fac"], mx.inputs[1])
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value = 0.10
    ramp.inputs["From Max"].default_value = 0.45
    ramp.inputs["To Min"].default_value = 0.86
    ramp.inputs["To Max"].default_value = 1.0
    nt.links.new(mx.outputs[0], ramp.inputs["Value"])
    tcol = nt.nodes.new("ShaderNodeMix")
    tcol.data_type = "RGBA"
    tcol.inputs[0].default_value = 1.0
    tcol.blend_type = "MULTIPLY"
    tcol.inputs[6].default_value = (0.92, 0.86, 0.74, 1.0)        # warm unbleached paper
    nt.links.new(ramp.outputs["Result"], tcol.inputs[7])
    tl = nt.nodes.new("ShaderNodeBsdfTranslucent")
    tl.name = "lookdev_tl"
    nt.links.new(tcol.outputs[2], tl.inputs["Color"])
    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.inputs[0].default_value = LOOK["paper_translucent"]
    nt.links.new(bsdf.outputs["BSDF"], mix.inputs[1])
    nt.links.new(tl.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    # the painted glow keeps its pattern but now also follows the fibres, a little lower
    if "strength" in nt.nodes:
        s = nt.nodes["strength"].outputs[0]
        s.default_value *= LOOK["paper_emit"]


def _haze(coll):
    """A homogeneous volume filling the hall's air (cheap in Cycles: no ray marching)."""
    me = bpy.data.meshes.new("Haze")
    x0, x1, y0, y1, z0, z1 = scene.XW + 0.01, scene.HX - 0.01, scene.YS + 0.01, scene.YN - 0.01, 0.005, 3.38
    vs = [(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
    fs = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    me.from_pydata(vs, [], fs)
    mat = bpy.data.materials.new("Haze")
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    pv = nt.nodes.new("ShaderNodeVolumePrincipled")
    pv.inputs["Density"].default_value = LOOK["haze_density"]
    pv.inputs["Anisotropy"].default_value = LOOK["haze_anisotropy"]
    pv.inputs["Color"].default_value = LOOK["haze_color"] + (1.0,)
    nt.links.new(pv.outputs[0], out.inputs["Volume"])
    try:
        mat.cycles.homogeneous_volume = True
    except Exception:
        pass
    me.materials.append(mat)
    ob = bpy.data.objects.new("Haze", me)
    coll.objects.link(ob)
    return ob


def _bounce(coll):
    """The sunlit veranda and garden ground beyond the modelled strip, as a large soft plane facing
    up-and-in: it lifts the ceiling and the undersides near the openings, and fades into the room."""
    li = bpy.data.lights.new("Bounce", "AREA")
    li.shape = "RECTANGLE"
    li.size, li.size_y = (scene.YN - scene.YS), 1.6
    li.energy = LOOK["bounce_w"] * li.size * li.size_y
    li.color = (1.0, 0.93, 0.82)
    li.specular_factor = 0.3
    ob = bpy.data.objects.new("Bounce", li)
    coll.objects.link(ob)
    ob.location = (scene.XW - 0.4, 0.5 * (scene.YS + scene.YN), 0.15)
    ob.rotation_euler = (0.0, math.radians(-60.0), 0.0)     # -Z (its emitting side) tilted up and east
    ob.visible_camera = False
    ob.lightgroup = "bounce"
    ob.visible_volume_scatter = False
    return ob


def apply(sc, clip=False):
    vl = sc.view_layers[0]
    for g in GROUPS:
        if g not in vl.lightgroups:
            vl.lightgroups.add(name=g)
    coll = sc.collection          # not 'Lights': scene.set_light would recolour the bounce as shade
    for ob in list(bpy.data.objects):
        if ob.type == "LIGHT":
            if ob.name == "Sun":
                ob.lightgroup = "sun"
                ob.data.angle = math.radians(LOOK["sun_angle_deg"])
                ob.data.energy *= LOOK["sun_gain"]
            elif ob.name.startswith(("Shoji", "Transom")):
                ob.lightgroup = "shoji"
                # the paper's stand-in lights would fill the haze with a flat veil: only the sun and the
                # sky light the air, so the shafts read
                ob.visible_volume_scatter = False
        elif ob.type == "MESH" and any(s.material is not None and s.material.name.startswith("H_washi")
                                       for s in ob.material_slots):
            ob.lightgroup = "shoji"
    if sc.world is not None:
        sc.world.lightgroup = "sky"
        try:   # the sky now also lights the paper from behind and the haze: sample it as a light
            sc.world.cycles.sampling_method = "AUTOMATIC"
        except Exception:
            pass
    for m in bpy.data.materials:
        if m.name.startswith("H_washi") and m.node_tree is not None:
            _washi(m)
    if "Bounce" not in bpy.data.objects:
        _bounce(coll)
    if "Haze" not in bpy.data.objects:
        _haze(sc.collection)
    c = sc.cycles
    c.volume_bounces = 0
    c.volume_step_rate = 4.0 if clip else 2.0       # only matters for non-homogeneous volumes
    c.volume_max_steps = 256
    c.transmission_bounces = max(c.transmission_bounces, 2)
    # passes
    vl.use_pass_combined = True
    vl.use_pass_mist = True
    vl.use_pass_position = True
    vl.cycles.use_pass_volume_direct = True
    vl.use_pass_ambient_occlusion = not clip
    vl.use_pass_cryptomatte_object = not clip
    vl.pass_cryptomatte_depth = 4
    if sc.world is not None:
        ms = sc.world.mist_settings
        ms.start, ms.depth, ms.falloff = 0.0, LOOK["mist_depth"], "LINEAR"
    f = sc.render.image_settings
    try:
        f.media_type = "MULTI_LAYER_IMAGE"        # Blender 5.x
        f.file_format = "OPEN_EXR"
    except Exception:
        f.file_format = "OPEN_EXR_MULTILAYER"     # Blender 4.x
    f.color_depth = "16"
    f.exr_codec = "DWAA" if clip else "ZIP"
    try:
        f.color_management = "FOLLOW_SCENE"
    except Exception:
        pass
