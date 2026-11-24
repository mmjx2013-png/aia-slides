# Kimono v3: the 3D museum (spec and contract, v2)

**v2 change (user's words: "It must feel like you are inside a museum").** The environment is
now a literal museum: five connected gallery rooms, and the camera walks through them. Each
chapter of the site is a room. Everything about the cloth (stages A-D) is unchanged; what
changed is the building, the route after stage D, the lens, and the frame numbering.

One Blender scene, one continuous camera path, rendered as an image sequence that the website
scrubs with scroll and the film cuts from. Blender 5.3 as the `bpy` Python module, Cycles.
This container has 4 CPUs and no GPU; a rented RTX 4090 may be used for the final frames if
the user approves, so `render.py` must run unchanged on a GPU machine (`--device OPTIX|CPU`).

Hard rules
- Nothing AI-generated. All geometry, textures and motion are built in code here.
- Final frames are rendered natively at 1920x1080. Never upscale.
- The camera never cuts or jumps. Every move is slow and eased at both ends; position and
  look direction are C1-continuous everywhere, and velocity is zero at every stage boundary
  (the site pauses there).
- The subject of every stage rest stays inside the central 9:16 column of the frame
  (the phone set is a 608x1080 centre crop of the same render).
- No lock files, hash records or other ceremony. Scripts, frames, one meta.json.

## Lens

One lens for the whole film: 30 mm on a 36 mm sensor (horizontal field about 62 degrees),
used like an architectural lens: the camera stays level when it looks at walls and standing
objects (verticals stay vertical) and uses a constant small downward lens shift so the frame
shows a little floor. It may pitch down in room 1 to look at the cloth on the dais.

## The building (Z up, metres, floor z = 0, ceiling 4.2, doorways 2.2 wide x 2.9 high)

```
        north (+Y)
   +-----------------+---------------------+
   | R5 FINALE       |  R4 LONG GALLERY    |   y 15.4 .. 24.0
   | vitrine (0,18.6)   door  <-- pictures on east + north walls
   +------door-------+--------door---------+
   | R1 MAKING       |  R3 DRESSING        |   y 8.0 .. 15.2   form at (7.4, 11.3)
   | long gallery    +--------door---------+
   | dais + rack     |  R2 PICTURES        |   y 0.6 .. 7.8
   | x -3.4 .. 3.4   door                  |
   | y -7.5 .. 13.2  |  x 3.6 .. 11.6      |
   +-----------------+---------------------+
```

- R1 Making: x -3.4..3.4, y -7.5..13.2. The dais (top z = 0.12, x -0.95..0.95, y -2.2..11.6)
  and the rack at y = 0, exactly as before. Doors: east wall at y 3.2..5.2 (to R2); north wall
  at x -1.1..1.1 (to R5), so that from the entrance you look down the whole gallery and see the
  lit vitrine far away on axis.
- R2 Pictures: x 3.6..11.6, y 0.6..7.8. Door to R3 in its north wall at x 6.4..8.4.
- R3 Dressing: x 3.6..11.6, y 8.0..15.2. Dress form on a low plinth at (7.4, 11.3), FACING
  SOUTH (-Y). `dressform.build()` makes it facing +Y at an origin; put its objects under a
  parent empty and rotate. Door to R4 in the north wall at x 6.4..8.4.
- R4 Long gallery: x 3.6..11.6, y 15.4..24.0. Door to R5 in its west wall at y 19.6..21.6.
- R5 Finale: x -3.4..3.4, y 13.4..24.0. A second instance of the finished kimono hangs on an
  iko inside a free-standing glass vitrine centred at (0, 18.6): low-reflection glass (thin,
  slightly visible edges and faint reflections, a slim dark base and top frame), the BACK of
  the kimono facing south toward the R1 door.

Look: a real textile gallery. Dark, quiet, warm. Walls a deep warm charcoal with a hint of
aubergine (about sRGB #2a2523 where lit, falling to #12100f), satin dark floor with a soft
reflection, a ceiling with slim track spotlights (visible fittings), warm light about 3000 K
with soft falloff: objects lit, room dim. Skirting shadow gap, door reveals with real
thickness, a large painted room numeral (1 to 5) beside each doorway (the only text in the
renders), one bench somewhere. No clutter. It must read instantly as a museum from any frame.

Picture walls: the east wall of R2, the east wall of R3, the east wall and the north wall of
R4 carry no objects in 3D. Each is a long plain wall lit by identical ceiling spots spaced
exactly 2.1 m apart, each making the same soft pool of light on the wall (centre about z = 1.45)
with a small blank cream placard (0.16 x 0.11 m) to the right of each pool at z = 1.25. The
website hangs photographs of real museum objects in those pools as HTML. For that to work the
wall must be strictly periodic: at a picture stop the camera is level and perpendicular to the
wall, 3.5 m from it (frame width at the wall 4.2 m, so 2.1 m = exactly 960 px), centred on a
pool, and the frame must look identical if the camera were moved 2.1 m sideways (so: at least
7 identical spots on each such wall, nothing else on it, a featureless floor).

## The garment (parametric; numbers live in `dims.json`)

Unchanged from v1: bolt width W = 0.36, length 11.4; body length 1.60; sleeve drop 0.49; okumi
0.15 x 1.36; collar band 0.055; cut plan and flat layout as before (sleeve, sleeve, body, body,
then the 2.8 m section split lengthwise into okumi + okumi and collar + over-collar; four
strips side by side on the rod line y = 0, back halves on the -Y side joined at the centre
back, front halves on the +Y side with an okumi each, the wearer's left front over the right,
collar band round the neck opening and down the front edges). Textile design drawn in code in
garment space, palette from the Met kosode (ivory ground #d9cfbd..#e6dece, aubergine #5a4353,
ochre #b8864a, grey-blue #8a9198, vermilion lining #d4583a), motifs gathered below the waist
and at the left shoulder, upper back fairly plain. Woven-silk shader, no plastic look.

## Stages (full-rate frame numbers at 24 fps; 1080 frames)

| Stage | Frames | Room | What happens | Camera |
|---|---|---|---|---|
| A bolt | 0-119 | R1 | The rolled bolt at the near end of the dais unrolls away along +Y (true spiral unrolling) until 11.4 m lie flat. Frame 0 is the site's opening picture: the roll under a spot, the long gallery beyond, the lit vitrine tiny in the far doorway; keep the upper left third of frame 0 calm and dark (the title sits there). | Starts low and close on the roll, travels with it, slowly rising. |
| B cut | 120-209 | R1 | Chalk-white cut lines draw themselves at the cut plan positions; the pieces part, then glide into the flat layout at the rod line. | Rises and returns to look down at the layout from the -Y side. |
| C sewn | 210-329 | R1 | The rod rises to 1.86; each strip is lifted by its midline, the halves hang either side (exact kinematics, small damped swing); seam threads run along the seams; it settles as a flat T, back toward -Y. | Pulls back and lowers to a level frontal view of the back of the T from the -Y side. |
| D turn | 330-419 | R1 | Nothing moves but the camera. | Orbits 180 degrees about (0, 0, 1.1) to the +Y side: the front, the collar, the left-over-right overlap. Rest. |
| W1 | 420-491 | R1 to R2 | | Turns and walks east through the door at y 4.2, on to picture stop S2: (8.1, 4.2), level, facing east, perpendicular to R2's east wall. Rest. |
| W2 | 492-563 | R2 to R3 | The bare mannequin waits on its plinth. | Turns north, through the door, arrives level and frontal on the dress form from the south, about 3.1 m away. Rest. |
| E dressed | 564-683 | R3 | Layers build in order, each over about 16 frames with eased overlap: juban, kimono wrapped left over right, ohashori, obi, obi-age, obi-jime, knot. | Holds on the form's front with a very slow drift. Rest. |
| F back | 684-773 | R3 | Nothing moves but the camera. | Orbits 180 degrees about the form to its back (north side). Rest. |
| W3 | 774-821 | R3 | | Moves to picture stop S3: (8.1, 13.2), level, facing east, perpendicular to R3's east wall. Rest. |
| W4 | 822-893 | R3 to R4 | | Through the north door to picture stop S4a: (8.1, 18.6), facing east. Rest. |
| W5 | 894-941 | R4 | | Turns to picture stop S4b: (7.6, 20.5), level, facing north, perpendicular to R4's north wall. Rest. |
| W6 | 942-1049 | R4 to R5 | | Through the west door into R5, a slow arc round the south side of the vitrine, settling level and frontal on the BACK of the kimono from the south, framed so the back body panels (0.72 m x 1.6 m) fill about 60 percent of frame height, centred. Rest. |
| G rules | 1050-1079 | R5 | Nothing moves. | A barely perceptible push-in. The site lays text on the back here. |

Walking camera height about 1.45 to 1.5 m. Walks are unhurried and eased; turning and moving
overlap so the path is a smooth curve, never a pivot on the spot.

## Deliverables and layout

```
three_d/
  dims.json        garment numbers (edit here only)
  common.py        dims loader, easing, textile images, materials, render settings
  scene.py         building, dais, rack, vitrine, lights, camera path, apply_frame(f)
  dressform.py     mannequin and dressing layers (API below)
  render.py        CLI: --start --end --step --frames LIST --res WxH --samples N --device CPU|OPTIX --out DIR --only-missing
  export_meta.py   writes site/assets/seq/meta.json
build/frames/      PNG frames (git-ignored)
site/assets/seq/d/f_0000.webp ...   desktop set 1920x1080
site/assets/seq/m/f_0000.webp ...   phone set, centre crop 608x1080
site/assets/seq/meta.json
```

`dressform.py` API: `state = build(collection, origin=(x, y, 0), materials=None)`,
`update(state, t)` with t a dict of 0..1 floats (juban, kimono, ohashori, obi, obiage,
obijime, knot), `anchors(state)` returning world points.

`meta.json`:

```json
{ "fps": 24, "frames": 1080, "size": [1920, 1080], "mobileCrop": [656, 0, 608, 1080],
  "available": [0, 2, 4, ...],
  "stages": [{"id": "A", "start": 0, "end": 119}, ...],
  "stops": {"S2": 491, "S3": 821, "S4a": 893, "S4b": 941},
  "pxPerMetre": 457.1,
  "anchors": { "roll": [[x, y, visible], ...one entry per AVAILABLE frame...], ... } }
```

`available` lists the full-rate frame numbers that exist as files, ascending; anchors arrays
are indexed like `available`. Anchor coordinates are normalised to the 1920x1080 frame (0..1,
origin top-left). `visible` is 0 when the point is off frame or behind the camera.
Anchors wanted: roll, cloth_free_end, cut_1..cut_5, piece_sleeve_l, piece_sleeve_r,
piece_body_l, piece_body_r, piece_okumi, piece_collar, rod, seam_centre_back, seam_sleeve_l,
seam_side_l, sleeve_l_centre, sleeve_r_centre, back_tl, back_tr, back_bl, back_br (back body
panels of the rack kimono in R1), collar_front, overlap_front, hem_front, form_* (from
dressform.anchors), vit_back_tl, vit_back_tr, vit_back_bl, vit_back_br (back body panels of
the vitrine kimono), vit_collar, and for each picture stop the four corners of a 1.25 m wide x
1.60 m tall hanging rectangle centred on its light pool at z = 1.40:
hang_S2_tl/tr/bl/br, hang_S3_*, hang_S4a_*, hang_S4b_* (visible during the approaches too).

## Render plan

1. Stills first: frame 0, the rests at the end of C, D, E, F, the four picture stops and the
   final frame, at full quality 1920x1080. These prove the look and go on the site early.
2. Preview pass: 960x540, low samples, every 4th frame, to check motion. Review only.
3. Final pass: even frames first (`--step 2`), then the odd frames. On CPU, render in this
   priority order: stages A-C, E, G, D, F, then the walks.
`render.py` must be resumable (`--only-missing`) and safe under `nohup`.
