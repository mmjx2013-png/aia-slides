"""shots.py - the final shot list of the slide deck: nine stills, three 9-second clips, two clay stills.

    import shots
    shots.STILLS          name -> shot (a dict, see below)
    shots.CLIPS           name -> function(i) -> shot for clip frame i (0..N_CLIP-1)
    shots.CLAY            the stills that also get a clay pass
    shots.state(name, i=None)   the shot dict of a still (i None) or of clip frame i

    python3 three_d/render.py --shot hall_wide_morning         -> build/stills/hall_wide_morning.png
    python3 three_d/render.py --shot clip_kosode_iko --clip    -> build/clips/clip_kosode_iko/f_0000.png ...
    python3 three_d/render.py --shot ALL                       every still (exactly the list below)
    python3 three_d/render.py --shot ALL --clip                every clip

A shot dict: pos, target (camera position and the point it looks at; the camera never rolls),
focal (mm on a 36 mm sensor), shift_y (Blender lens shift), fstop, optional focus (m; default: the
distance to target), groups {iko, cloth, form} (what is on stage: the iko with the museum robe and
the folding screen / the procedural pieces / the mannequin; robe False hides the museum robe but
keeps the iko), explode (0: the eight pieces floating apart ... 1: assembled as the T on the iko),
layers (dressing layers 0..1), light (a preset from scene.LIGHT_PRESETS), open (which west shoji
stand open: bay -> 'S' or 'N', see scene.set_open), props (see scene.place_props; default: the
room's one arrangement, scene.PROP_LAYOUT).

Camera: 36 x 20.25 mm frame, 35 mm for the wides, level (lens shift instead of tilt), real apertures. A clip is one slow
eased dolly that starts on its still, with a very slight handheld sway and a 180 degree shutter.
Grain and lens falloff are added in 2D afterwards; these render clean.
"""
import math

import scene
from common import smootherstep

FPS_CLIP = 30
N_CLIP = 270                                      # 9 seconds
ROBE = (0.0, -0.03, 1.13)                         # middle of the robe on the iko
JD = scene.floor_z(scene.FORM[1])                 # the mannequin and the alcove are on the jodan
FORM = (scene.FORM[0], scene.FORM[1], 1.15 + JD)  # the mannequin
LAYERS = ("juban", "kimono", "ohashori", "obi", "obiage", "obijime", "knot")
# the hall as every shot finds it: paired shoji slid apart beside the robe and further south, single
# ones open towards the north end; a low sun through them
OPEN = {1: "N", 2: "S", 3: "N", 4: "S", 6: "S", 8: "S"}
HALL = dict(open=OPEN, light="morning")
IKO, MANNEQUIN = {"iko": True}, {"form": True}
ALL_LAYERS = {k: 1.0 for k in LAYERS}


def orbit(centre, radius, az_deg, z):
    """Camera position on a circle round `centre`; azimuth 0 is due south of it (looking north)."""
    a = math.radians(az_deg)
    return (centre[0] + radius * math.sin(a), centre[1] - radius * math.cos(a), z)


def lerp(a, b, u):
    return tuple(x + (y - x) * u for x, y in zip(a, b))


_WIDE = dict(HALL, pos=(1.55, -6.60, 1.32), target=(-0.42, 0.0, 1.32), focal=35.0, shift_y=-0.035, fstop=5.6,
             focus=6.9, groups=IKO)

STILLS = {
    # 1. the hall: shoji open onto the garden, morning light raking the tatami, the robe on its iko
    "hall_wide_morning": dict(_WIDE),
    # 2. the Met robe on the lacquer iko before the gold screen, frontal, from standing height: the object
    #    first, a little left of centre, the chodaigamae doors on the east wall as its counterweight
    "kosode_iko": dict(HALL, pos=(0.62, -5.05, 1.40), target=(0.50, 0.0, 1.40), focal=35.0, shift_y=-0.075,
                       fstop=2.8, focus=5.1, groups=IKO),
    # 3. the eight straight pieces of the drawn-textile kimono floating apart before the bare iko
    "exploded_panels": dict(HALL, pos=orbit((0.0, -0.95, 1.40), 5.7, -10.0, 1.45), target=(0.0, -0.95, 1.40),
                            focal=35.0, fstop=8.0, groups={"iko": True, "robe": False, "cloth": True}, explode=0.0,
                            props=False),
    # 4. the robe's silk and a dye edge, close (the photograph is 1068 px wide: as close as it holds)
    "weave_macro": dict(HALL, pos=(0.30, -0.62, 1.40), target=(0.03, -0.04, 1.42), focal=70.0, fstop=2.8,
                        groups=IKO),
    # 5. the dressed figure from the front, and the knot from behind: one place, two angles
    "mannequin_final": dict(HALL, pos=(FORM[0], FORM[1] - 3.6, 0.98 + JD), target=(FORM[0], FORM[1], 0.98 + JD),
                            focal=35.0,
                            shift_y=-0.02, fstop=4.0, groups=MANNEQUIN, layers=ALL_LAYERS),
    "mannequin_obi_back": dict(HALL, pos=orbit(FORM, 1.55, 192.0, 1.10 + JD), target=(FORM[0], FORM[1] + 0.2, 1.05 + JD),
                               focal=50.0, fstop=2.8, groups=MANNEQUIN, layers=ALL_LAYERS),
    # 6. a sleeve and the hem beside the lacquer boxes and the folded robe on its tray
    "sleeve_hem_props": dict(HALL, pos=(2.45, -2.75, 0.95), target=(0.05, 0.0, 0.62), focal=35.0, fstop=2.8,
                             groups=IKO),
    # 7. the alcove with the hanging scroll
    "tokonoma": dict(HALL, pos=(-1.35, 7.55, 1.20 + JD), target=(0.22, 11.6, 1.20 + JD), focal=35.0, shift_y=-0.02,
                     fstop=4.0,
                     groups={}),
    # 8. shot 1 at dusk: the sun low and warm
    "hall_dusk": dict(_WIDE, light="dusk"),
}

CLAY = ("hall_wide_morning", "kosode_iko")


def _u(i):
    return smootherstep(i / float(N_CLIP - 1))


def _sway(st, i):
    """A hand on the dolly: a few millimetres and a few hundredths of a degree, slow, nothing at the
    first and last frame."""
    t = i / float(FPS_CLIP)
    env = smootherstep(min(t, (N_CLIP - 1) / float(FPS_CLIP) - t) / 1.4)
    w = 2.0 * math.pi
    dx = 0.0040 * math.sin(w * 0.31 * t + 0.4) + 0.0018 * math.sin(w * 0.83 * t + 1.9)
    dz = 0.0030 * math.sin(w * 0.43 * t + 2.1) + 0.0012 * math.sin(w * 1.07 * t)
    px, py, pz = st["pos"]
    tx, ty, tz = st["target"]
    d = math.sqrt((tx - px) ** 2 + (ty - py) ** 2 + (tz - pz) ** 2)
    ax = 0.0009 * math.sin(w * 0.27 * t + 1.1) + 0.0004 * math.sin(w * 0.71 * t + 0.2)      # radians
    az = 0.0007 * math.sin(w * 0.37 * t + 0.3) + 0.0003 * math.sin(w * 0.93 * t + 2.6)
    return dict(st, pos=(px + env * dx, py, pz + env * dz), target=(tx + env * ax * d, ty, tz + env * az * d),
                focus=st.get("focus") or d)


def _clip_hall_morning(i):               # a slow push down the hall towards the robe (it ends past the
    # seating group, on the robe and its boxes alone); starts on hall_wide_morning
    u = _u(i)
    s = STILLS["hall_wide_morning"]
    return _sway(dict(s, pos=lerp(s["pos"], (1.05, -4.75, 1.30), u), target=lerp(s["target"], (0.0, 0.0, 1.30), u),
                      focus=s["focus"] - 2.0 * u), i)


def _clip_kosode_iko(i):                 # a slow dolly in on the robe; starts on kosode_iko
    u = _u(i)
    s = STILLS["kosode_iko"]
    return _sway(dict(s, pos=lerp(s["pos"], (0.52, -4.45, 1.40), u), target=lerp(s["target"], (0.42, 0.0, 1.40), u),
                      focus=s["focus"] - 0.6 * u), i)


def _clip_hall_dusk(i):                  # a slow track across the hall, west to east; starts on hall_dusk
    u = _u(i)
    s = STILLS["hall_dusk"]
    return _sway(dict(s, pos=lerp(s["pos"], (0.55, -6.35, 1.32), u), target=lerp(s["target"], (-0.30, 0.0, 1.32), u)),
                 i)


CLIPS = {"clip_hall_morning": _clip_hall_morning, "clip_kosode_iko": _clip_kosode_iko,
         "clip_hall_dusk": _clip_hall_dusk}


def state(name, i=None):
    if i is None:
        return STILLS[name]
    return CLIPS[name](i)
