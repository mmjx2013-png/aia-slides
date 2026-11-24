# Kimono v3: the 3D sets (spec and contract, v3)

**v3 change (decided by the user).** The setting is no longer a dark museum building. It is a
bright, reconstructed Edo-period shoin-style reception hall (palace-like), plus a small weaving
room. Light backgrounds, physically based daylight, near-photoreal materials. The cloth
kinematics (stages A-D) written for v2 in `scene.py` are kept; the building, the lights and the
route after stage D are replaced.

Blender 5.3 as the `bpy` Python module, Cycles. This container has 4 CPUs and no GPU; a rented
RTX 4090 may be used for the final frames if the user approves, so `render.py` must run
unchanged on a GPU machine (`--device OPTIX|CPU`). Never start a GPU machine yourself.

Hard rules
- Nothing AI-generated. Geometry and motion are built in code here. Photo-scanned CC0 PBR
  textures and HDRIs from Poly Haven (api.polyhaven.com, dl.polyhaven.org) and ambientCG
  (ambientcg.com) are real photographs and are welcome; list every asset used (name, URL,
  licence) in `three_d/CREDITS.md`. Keep downloads small (2K textures, 1K-2K HDRI) in
  `build/assets/` (git-ignored).
- Final frames are rendered natively at 1920x1080. Never upscale.
- The camera never cuts or jumps. Every move is slow and eased at both ends; position and look
  direction are C1-continuous, and velocity is zero at every stage boundary.
- The subject of every stage rest stays inside the central 9:16 column of the frame
  (the phone set is a 608x1080 centre crop of the same render).
- No lock files, hash records or other ceremony. Scripts, frames, one meta.json.

## Realism target

The user's reference is a photoreal "No AI. Just Blender" reel. What carries it: soft physically
based light, real PBR materials with small imperfections, the density of a real place, and a
real camera. For us:
- Light: daylight through the shoji (paper as a translucent/diffusing material, backed by a
  bright exterior: sun + sky or an HDRI), warm bounce off tatami and wood. Bright and airy
  overall, never dark. No CG rim lights.
- Materials: tatami (woven rush with cloth borders), hinoki/cedar posts and beams with grain,
  white plaster with slight unevenness, washi paper, gold leaf with visible leaf squares and
  wear, lacquer with micro-scratches, silk with a sheen lobe and weave detail.
- Camera: 30 mm on a 36 mm sensor, level when it looks at walls and standing objects (constant
  small downward lens shift), shallow depth of field at rests (about f/4 on the subject), very
  slight gimbal sway while walking (still slow and eased), motion blur on moving frames.
- A grade is applied later in 2D (grain, vignette); render clean.
- Also render a "clay" pass (every object a flat random colour, same camera) for a handful of
  rest frames: the site shows a before/after slider captioned "No AI. Just Blender."

## Set 1: the hall (Z up, metres, floor z = 0)

A grand shoin-style reception hall, one ken = 1.82 m. Interior x -3.64..3.64 (4 ken wide),
y -7.28..10.92 (10 ken long), ceiling about 3.4 m.

- Floor: tatami, each 0.91 x 1.82, long side along Y, laid in a regular grid (so the floor
  repeats every 1.82 m along Y), dark cloth borders.
- Structure: square posts (0.14) every ken along the walls, a nageshi rail at z = 1.80, white
  plaster above it, a coffered ceiling (grid dividing 1.82 evenly).
- West side (x = -3.64): shoji along the whole length, glowing with daylight. This is the
  light source for the room.
- East side (x = +3.64): the DISPLAY WALL. Plain white plaster panels between the posts from
  the floor sill to the nageshi, nothing on them, lit evenly by the shoji opposite. It must be
  strictly periodic with the ken: the website hangs photographs of real museum objects in the
  bays as HTML and slides the picture sideways by whole bays.
- North end (y = 10.92): a tokonoma (raised alcove) and staggered shelves; gold-leaf ground on
  the wall behind (plain gold leaf for now; a real CC0 screen painting may be mapped later:
  keep the gold surfaces as separate objects with clean 0..1 UVs, named `gold_north`,
  `gold_south_1..n`).
- South end (y = -7.28): gold-ground fusuma (sliding doors) across the width.
- The kimono rack (iko): two slim black-lacquer posts at x = -0.86 and +0.86, y = 0, carrying
  the horizontal rod along X that rises to z = 1.86 in stage C (as in v2). The cloth lies
  directly on the tatami (the v2 dais is removed; cloth z = just above the floor). A thin
  dark-red felt runner under the cloth is allowed if it helps the cloth read against tatami.
- The mannequin (set by `dressform.py`) stands on the tatami at (0, 7.4), FACING SOUTH (-Y),
  with the tokonoma and gold wall behind it.

## The garment (parametric; numbers live in `dims.json`)

Unchanged from v2 (see `dims.json` and `common.py`): bolt width 0.36, length 11.4, body length
1.60, sleeve drop 0.49, okumi 0.15 x 1.36, collar band 0.055; eight straight pieces; the
textile design drawn in code in garment space, continuous across seams, palette from the Met
kosode (ivory ground, aubergine, ochre, grey-blue, vermilion lining).

## Stages of the hall sequence (full-rate frames at 24 fps; 984 frames)

| Stage | Frames | What happens | Camera |
|---|---|---|---|
| A bolt | 0-119 | The rolled bolt near the south end unrolls north along +Y until 11.4 m lie flat. Frame 0 is the site's opening picture: the roll in the foreground, the long bright hall beyond, shoji glowing on the left, the gold tokonoma wall far away. Keep the right third of frame 0 calm (the title sits over it). | Starts low and close on the roll, travels with it, slowly rising. |
| B cut | 120-209 | Chalk-white cut lines draw themselves; the pieces part, then glide into the flat layout at the rod line y = 0. | Rises and returns to look down at the layout from the -Y side. |
| C sewn | 210-329 | The rod rises to 1.86; each strip is lifted by its midline and hangs either side (exact kinematics, small damped swing); seam threads run along the seams; it settles as a flat T, back toward -Y. | Pulls back and lowers to a level frontal view of the back of the T from the -Y side. Rest. |
| D turn | 330-419 | Camera only. | Orbits 180 degrees about (0, 0, 1.1) to the +Y side: the front, the collar, the left-over-right overlap. Rest. |
| W1 | 420-491 | | Turns to the display wall: stop S1 at (0.14, 4.55, 1.45), level, facing +X, perpendicular to the east wall (3.5 m away, so 4.2 m of wall = 1920 px), centred on a bay. Rest. |
| W2 | 492-563 | The bare mannequin waits. | Walks north and arrives level and frontal on the mannequin from the south, about 3.1 m away. Rest. |
| E dressed | 564-683 | Layers build in order, each over about 16 frames with eased overlap: juban, kimono wrapped left over right, ohashori, obi, obi-age, obi-jime, knot. | Holds with a very slow drift. Rest. |
| F back | 684-773 | Camera only. | Orbits 180 degrees about the mannequin to its back (north side). Rest. |
| W3 | 774-845 | | Walks back south to the display wall: stop S2 at (0.14, 2.73, 1.45), facing +X, centred on the bay immediately SOUTH of S1's bay (one ken to screen right of S1). The frame must match S1's (the wall is periodic). Rest. |
| W4 | 846-953 | | Walks south round the rack to its -Y side and settles level and frontal on the BACK of the T, framed so the back body panels (0.72 x 1.6 m) fill about 60 percent of frame height, centred. Rest. |
| G rules | 954-983 | Nothing moves. | A barely perceptible push-in. The site lays text on the back here. |

Walking camera height about 1.45 m. Walks are unhurried; turning and moving overlap so the path
is a smooth curve, never a pivot on the spot.

## Set 2: the weaving room (stills only)

A small, bright wooden room with one window: a traditional Japanese floor loom (takabata) with
a warp on it, a shuttle, a bench, and a finished bolt of the same cloth resting nearby. Three
stills at 2560x1440 (the site and film push in slowly in 2D): a wide view of the loom by the
window; a close view along the warp threads with the shuttle; the bolt of cloth. If the loom
proves too hard, deliver the two close views. Files: `build/stills/weave_1.png` ... Owned by
`three_d/weaving.py`.

## Deliverables and layout

```
three_d/
  dims.json        garment numbers
  common.py        dims loader, easing, textile images, materials, render settings
  scene.py         the hall, the rack, the cloth, lights, camera path, apply_frame(f)
  dressform.py     full mannequin and dressing layers (API below)
  weaving.py       the weaving room stills
  render.py        CLI: --start --end --step --frames LIST --res WxH --samples N --device CPU|OPTIX --out DIR --only-missing [--clay]
  export_meta.py   writes site/assets/seq/meta.json
  CREDITS.md       every downloaded asset
build/frames/      PNG frames (git-ignored)      build/stills/   full-quality stills
site/assets/seq/d/f_0000.webp ...   desktop set 1920x1080
site/assets/seq/m/f_0000.webp ...   phone set, centre crop 608x1080
site/assets/seq/meta.json
```

`dressform.py` API: `state = build(collection, origin=(x, y, 0), materials=None)`,
`update(state, t)` with t a dict of 0..1 floats (juban, kimono, ohashori, obi, obiage,
obijime, knot), `anchors(state)` returning WORLD points; `state["root"]` is an empty that
parents everything (the scene rotates it to face south).

`meta.json`:

```json
{ "fps": 24, "frames": 984, "size": [1920, 1080], "mobileCrop": [656, 0, 608, 1080],
  "available": [0, 2, 4, ...],
  "stages": [{"id": "A", "start": 0, "end": 119}, ...],
  "lens": {"focal_mm": 30, "sensor_w_mm": 36, "shift_x": 0, "shift_y": -0.05},
  "camera": [[px, py, pz, qw, qx, qy, qz], ...one per AVAILABLE frame...],
  "walls": {"S1": {"frame": 491, "pool0": [3.64, 4.55, 1.30], "along": [0, -1, 0], "normal": [-1, 0, 0], "spacing": 1.82},
            "S2": {"frame": 845, "pool0": [3.64, 2.73, 1.30], "along": [0, -1, 0], "normal": [-1, 0, 0], "spacing": 1.82}},
  "anchors": { "roll": [[x, y, visible], ...one per AVAILABLE frame...], ... } }
```

`available` lists the full-rate frame numbers that exist as files, ascending; `camera` and the
anchors arrays are indexed like `available`. `camera` is the world location and world rotation
quaternion (Blender convention: looks down local -Z, +Y up). `walls.*.pool0` is the centre of
the bay the camera faces at that stop (on the wall surface, z = 1.30); `along` is the unit
vector along the wall pointing to SCREEN RIGHT at the stop. Anchor coordinates are normalised
to the 1920x1080 frame (0..1, origin top-left); `visible` is 0 when off frame or behind.
Anchors wanted: roll, cloth_free_end, cut_1..cut_5, piece_sleeve_l, piece_sleeve_r,
piece_body_l, piece_body_r, piece_okumi, piece_collar, rod, seam_centre_back, seam_sleeve_l,
seam_side_l, sleeve_l_centre, sleeve_r_centre, back_tl, back_tr, back_bl, back_br (corners of
the back body panels of the T on its rack), collar_front, overlap_front, hem_front, and the
form_* points from `dressform.anchors`.

## Render plan

1. Stills first, full quality 1920x1080, to `build/stills/f_NNNN.png`: frame 0, the rests at
   the end of C (329), D (419), S1 (491), E (683), F (773) and the final frame (983). These
   prove the look and go on the site early. Then the clay pass of 0, 329 and 683.
2. Preview pass: 960x540, low samples, every 4th frame, to check motion. Review only.
3. Final pass: even frames PLUS every stage-end rest frame (119, 209, 329, 419, 491, 563, 683, 773, 845, 953, 983) first, then the remaining odd frames. On CPU, in this order: A-C, E, G, D, F, the walks.
`render.py` must be resumable (`--only-missing`) and safe under `nohup`.
