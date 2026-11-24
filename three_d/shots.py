"""shots.py - the named shots of the slide deck: stills, and 5-second clips (150 frames at 30 fps).

    import shots
    shots.STILLS          name -> shot (a dict, see below)
    shots.CLIPS           name -> function(i) -> shot for clip frame i (0..149)
    shots.CLAY            the stills that also get a clay pass
    shots.state(name, i=None)   the shot dict of a still (i None) or of clip frame i

    python3 three_d/render.py --shot hall_wide                 -> build/stills/hall_wide.png
    python3 three_d/render.py --shot clip_iko --clip           -> build/clips/clip_iko/f_0000.png ...
    python3 three_d/render.py --shot ALL                       every still
    python3 three_d/render.py --shot ALL --clip                every clip

A shot dict: pos, target (camera position and the point it looks at; the camera never rolls),
focal (mm on a 36 mm sensor), shift_y (Blender lens shift), fstop, optional focus (m; default: the
distance to target), groups {iko, cloth, form} (what is on stage: the iko with the museum robe and
the folding screen / the procedural bolt and pieces / the mannequin), cloth_f (state of the bolt:
0 rolled ... 119 unrolled ... 209 the eight pieces laid flat), layers (dressing layers 0..1).
Every clip is one slow eased move that starts or ends on the still of the same subject.
"""
import math

import scene
from common import smootherstep

FPS_CLIP = 30
N_CLIP = 150
ROBE = (0.0, -0.03, 1.13)                         # middle of the robe on the iko
FORM = (scene.FORM[0], scene.FORM[1], 1.15)       # the mannequin
Y0 = scene.Y0
LAYERS = ("juban", "kimono", "ohashori", "obi", "obiage", "obijime", "knot")
IKO, CLOTH, MANNEQUIN = {"iko": True}, {"cloth": True}, {"form": True}


def layers(*on):
    return {k: (1.0 if k in on else 0.0) for k in LAYERS}


def orbit(centre, radius, az_deg, z):
    """Camera position on a circle round `centre`; azimuth 0 is due south of it (looking north)."""
    a = math.radians(az_deg)
    return (centre[0] + radius * math.sin(a), centre[1] - radius * math.cos(a), z)


def lerp(a, b, u):
    return tuple(x + (y - x) * u for x, y in zip(a, b))


_FORM_CAM = dict(pos=(FORM[0], FORM[1] - 3.1, 1.15), target=FORM, focal=30.0, shift_y=-0.05, fstop=4.0,
                 groups=MANNEQUIN)

STILLS = {
    # the hall, the robe on its iko, the gold screen behind
    "hall_wide": dict(pos=(0.0, -6.5, 1.40), target=(0.0, 0.0, 1.40), focal=26.0, shift_y=-0.04, fstop=8.0,
                      groups=IKO),
    "iko_front": dict(pos=orbit(ROBE, 4.4, 0.0, 1.12), target=(0.0, 0.0, 1.12), focal=40.0, fstop=4.0, groups=IKO),
    "iko_three_quarter": dict(pos=orbit(ROBE, 4.3, -27.0, 1.20), target=(0.0, 0.0, 1.12), focal=40.0, fstop=4.0,
                              groups=IKO),
    "sleeve_detail": dict(pos=(-0.74, -1.28, 1.63), target=(-0.44, -0.04, 1.66), focal=60.0, fstop=2.8, groups=IKO),
    "hem_detail": dict(pos=(0.42, -1.02, 0.62), target=(0.06, -0.04, 0.58), focal=60.0, fstop=2.8, groups=IKO),
    "alcove": dict(pos=(0.35, 6.9, 1.30), target=(0.0, 11.7, 1.22), focal=30.0, fstop=5.6, groups={}),
    # the mannequin, one still per dressing stage, same camera
    "form_juban": dict(_FORM_CAM, layers=layers("juban")),
    "form_kimono": dict(_FORM_CAM, layers=layers("juban", "kimono")),
    "form_ohashori": dict(_FORM_CAM, layers=layers("juban", "kimono", "ohashori")),
    "form_obi": dict(_FORM_CAM, layers=layers("juban", "kimono", "ohashori", "obi")),
    "form_obijime": dict(_FORM_CAM, layers=layers("juban", "kimono", "ohashori", "obi", "obiage", "obijime")),
    "form_final": dict(_FORM_CAM, layers=layers(*LAYERS)),
    "form_back": dict(pos=orbit(FORM, 3.0, 180.0, 1.15), target=FORM, focal=32.0, shift_y=-0.04, fstop=4.0,
                      groups=MANNEQUIN, layers=layers(*LAYERS)),
    # the procedural bolt
    "bolt_roll": dict(pos=(0.06, Y0 - 1.38, 0.33), target=(0.06, Y0 + 8.0, 0.33), focal=30.0, shift_y=-0.05,
                      fstop=8.0, focus=1.43, groups=CLOTH, cloth_f=0),
    "bolt_pieces": dict(pos=(0.0, -3.5, 2.55), target=(0.0, 0.15, 0.0), focal=30.0, fstop=5.6, groups=CLOTH,
                        cloth_f=209),
}

CLAY = ("hall_wide", "form_final")


def _u(i):
    return smootherstep(i / float(N_CLIP - 1))


def _clip_hall(i):                       # a slow push down the hall towards the iko; starts on hall_wide
    u = _u(i)
    s = STILLS["hall_wide"]
    return dict(s, pos=lerp(s["pos"], (0.0, -4.9, 1.36), u), target=lerp(s["target"], (0.0, 0.0, 1.30), u))


def _clip_iko(i):                        # a 25 degree arc round the robe; starts on iko_front
    u = _u(i)
    return dict(STILLS["iko_front"], pos=orbit(ROBE, 4.4, -25.0 * u, 1.12 + 0.05 * u))


def _clip_sleeve(i):                     # a slow drift along the sleeve; ends on sleeve_detail
    u = _u(i)
    s = STILLS["sleeve_detail"]
    return dict(s, pos=lerp((-0.50, -1.34, 1.57), s["pos"], u), target=lerp((-0.30, -0.04, 1.60), s["target"], u))


def _clip_form(i):                       # the layers build, the camera all but still; ends on form_final
    t = i / float(N_CLIP - 1)
    lay = {k: smootherstep((t - 0.04 - 0.125 * n) / 0.16) for n, k in enumerate(LAYERS)}
    return dict(_FORM_CAM, pos=(FORM[0], FORM[1] - 3.16 + 0.06 * _u(i), 1.15), layers=lay)


def _clip_form_back(i):                  # a slow arc to the knot; ends on form_back
    u = _u(i)
    return dict(STILLS["form_back"], pos=orbit(FORM, 3.0, 150.0 + 30.0 * u, 1.15))


def _clip_bolt(i):                       # the bolt unrolls (stage A of the old sequence, shortened); starts on bolt_roll
    f = 119.0 * i / float(N_CLIP - 1)
    st = scene.camera_state(f)
    pos = (float(st[0]), float(st[1]), float(st[2]))
    cy, sy, cp, sp = math.cos(st[3]), math.sin(st[3]), math.cos(st[4]), math.sin(st[4])
    return dict(pos=pos, target=(pos[0] + 5 * cy * cp, pos[1] + 5 * sy * cp, pos[2] + 5 * sp), focal=30.0,
                shift_y=-0.05, fstop=8.0, focus=min(1.43 + 0.05 * f, 4.2), groups=CLOTH, cloth_f=f)


CLIPS = {"clip_hall": _clip_hall, "clip_iko": _clip_iko, "clip_sleeve": _clip_sleeve, "clip_form": _clip_form,
         "clip_form_back": _clip_form_back, "clip_bolt": _clip_bolt}


def state(name, i=None):
    if i is None:
        return STILLS[name]
    return CLIPS[name](i)
