# Kimono v3: the 3D sequence (spec and contract)

One Blender scene, one continuous camera path, rendered as an image sequence that the
website scrubs with scroll and the film cuts from. Blender 5.3 as the `bpy` Python module
(`python3 -c "import bpy"`), Cycles on CPU (4 cores, 15 GB RAM). No GPU.

Hard rules
- Nothing AI-generated. All geometry, textures and motion are built in code here.
- Final frames are rendered natively at 1920x1080. Never upscale.
- The camera never cuts or jumps. Every move is slow and eased at both ends
  (smootherstep or similar); position and look-at are C1-continuous across stage boundaries.
- The subject of every stage stays inside the central 9:16 column of the frame
  (the phone set is a 608x1080 centre crop of the same render).
- No lock files, hash records or other ceremony. Scripts, frames, one meta.json.

## World

Z up, metres. Floor z = 0. The camera starts on the -Y side looking toward +Y.

- Gallery: a dark, warm exhibition room (about 16 m x 10 m x 4.5 m). Walls and floor fall
  off to near-black warm charcoal (sRGB about #151311). Lighting like a textile gallery:
  a few soft, warm spot/area lights on the objects, gentle falloff, faint floor reflection.
  The room must look good from every direction because the camera orbits.
- Platform: a low pale dais, top at z = 0.12, x in [-0.95, 0.95], y in [-2.2, 11.6].
  The cloth lies on it. Local "table height" T = 0.12.
- Iko (kimono rack): two slim dark-lacquer posts at x = -0.86 and x = +0.86, y = 0, standing
  on small feet on the floor beside the dais, carrying a horizontal rod along X at y = 0.
  The rod (radius 0.018) starts just above the cloth and rises to z = 1.86 in stage C
  (the posts telescope or the rod slides up them; keep it believable and quiet).
- Dress form: an abstract, featureless pale museum mannequin torso on a slim stand, centred
  at x = +2.7, y = 0, facing +Y (its front toward +Y). Built by `dressform.py`.

## The garment (parametric; numbers live in `dims.json`)

Defaults, to be corrected from sources before the final render:
bolt width W = 0.36; bolt length 11.4; body length (shoulder to hem) 1.60; sleeve drop 0.49;
okumi (front overlap panel) 0.15 x 1.36; collar band 0.055 wide.

Cut plan along the bolt (near end first): sleeve, sleeve (each W x 0.98), body, body
(each W x 3.20), then a 2.8 m section split lengthwise into two half-width strips:
okumi + okumi on one side, collar + over-collar on the other.

Flat layout at the rod line (y = 0): four strips side by side, each centred on y = 0:
sleeve L x in [-0.72,-0.36], body L [-0.36,0], body R [0,0.36], sleeve R [0.36,0.72].
The BACK halves lie on the -Y side (toward the first camera position); the two back halves
are joined by the centre-back seam. The FRONT halves lie on the +Y side, are not joined to
each other, and each carries an okumi on its centre-front edge; the left front (x < 0,
the wearer's left) lies OVER the right front. The collar band runs round the neck opening
and down both front edges.

Textile: a design drawn in code (PIL) in garment space, so that the pattern is continuous
across the seams of the finished T and appears as fragments on the cut bolt. Palette taken
from the Met kosode DP261468: silk ivory ground (#d9cfbd to #e6dece), aubergine (#5a4353),
ochre gold (#b8864a), soft grey-blue (#8a9198), vermilion lining (#d4583a) that peeks at
hem and sleeve openings. Composition: motifs gather below the waist and at the left
shoulder (an eba-style arrangement), calm and sparse; the upper back between the shoulders
stays fairly plain (text will be laid there in the last stage). Woven-silk shader:
fine weave bump, soft sheen, slight anisotropy; no plastic look.

## Stages (full-rate frame numbers at 24 fps; 720 frames total)

| Stage | Frames | What happens | Camera |
|---|---|---|---|
| A bolt | 0-119 | A rolled bolt sits at the near end of the dais and unrolls away along +Y (true spiral unrolling, the free end stays put) until about 11.4 m lie flat. | Starts low and close on the roll, travels with it, slowly rising. |
| B cut | 120-209 | Fine chalk-white cut lines draw themselves across the cloth at the cut plan positions; the pieces part by a few cm, then glide over the dais into the flat layout at the rod line. The rod lies across them at y = 0. | Rises and returns to look down at the layout from the -Y side, about 35 degrees. |
| C sewn | 210-329 | The rod rises to 1.86. Each strip is lifted by its midline and its two halves hang down either side (exact kinematics: the hanging length equals the rod height above the dais, the rest still slides on the dais; add a small damped swing when a strip leaves the dais). Thread-like seam lines then run along the seams: centre back, sleeve to body, sides, sleeve bottoms. The garment settles as a flat T, back toward -Y. | Pulls back and lowers to a level, frontal view of the back of the T from the -Y side. Hold with a very slow push-in. |
| D turn | 330-419 | Nothing moves but the camera. | Orbits 180 degrees about (0, 0, 1.1) to the +Y side: the front, the collar, the left-over-right overlap. |
| E dressed | 420-569 | Camera reaches the dress form. Layers build in this order, each over about 20 frames with eased overlap: under-robe (juban, white, its collar shows), kimono wrapped left over right, the fold below the sash (ohashori), the sash (obi), the obi-age cloth at the sash's upper edge, the obi-jime cord round the middle, the knot at the back. | Trucks +X from the iko to the form (frames 420-449), then holds on the form's front with a very slow drift. |
| F back | 570-659 | Nothing moves but the camera. | Orbits 180 degrees about the form to its back (-Y side): the knot, the nape, the hem. |
| G rules | 660-719 | Nothing moves. | Trucks -X back to the iko and settles on a level, frontal view of the back of the T, framed so the back body panels (0.72 m x 1.6 m) fill about 60 percent of frame height, centred. The site lays text on the back here. |

The site scrubs these as separate chapters and pauses between them, so every stage boundary
must be a moment of rest (velocity zero).

## Deliverables and layout

```
three_d/
  dims.json        garment numbers (edit here only)
  common.py        dims loader, easing, textile images, materials (owned by the main agent)
  scene.py         gallery, dais, iko, lights, camera path, stages A-D and G
  dressform.py     mannequin and dressing layers, stages E-F (API below)
  render.py        CLI: --start --end --step --res WxH --samples N --out DIR [--only-missing]
  export_meta.py   writes site/assets/seq/meta.json
build/frames/      PNG frames (git-ignored)
site/assets/seq/d/f_0000.webp ...   desktop set 1920x1080
site/assets/seq/m/f_0000.webp ...   phone set, centre crop 608x1080
site/assets/seq/meta.json
```

`dressform.py` API (called by scene.py / render.py):

```python
state = build(collection, origin=(2.7, 0.0, 0.0), materials=None)  # creates all objects, hidden/at t=0
update(state, t)   # t: dict of 0..1 floats: juban, kimono, ohashori, obi, obiage, obijime, knot
anchors(state)     # dict name -> world (x, y, z) for labels (see meta.json anchors)
```

`meta.json`:

```json
{ "fps": 24, "frames": 720, "step": 2, "size": [1920, 1080], "mobileCrop": [656, 0, 608, 1080],
  "stages": [{"id": "A", "start": 0, "end": 119}, ...],
  "anchors": { "roll": [[x, y, visible], ...one entry per rendered frame...], ... } }
```

Anchor coordinates are normalised to the 1920x1080 frame (0..1, origin top-left), projected
with `bpy_extras.object_utils.world_to_camera_view`. `visible` is 0 when the point is off
frame or faces away. Anchors wanted: roll, cloth_free_end, cut_1..cut_5 (the cut lines),
piece_sleeve_l, piece_sleeve_r, piece_body_l, piece_body_r, piece_okumi, piece_collar,
rod, seam_centre_back, seam_sleeve_l, seam_side_l, sleeve_l_centre, sleeve_r_centre,
back_tl, back_tr, back_bl, back_br (corners of the back body panels), collar_front,
overlap_front, hem_front, form_juban_collar, form_overlap, form_ohashori, form_obi,
form_obiage, form_obijime, form_knot, form_nape, form_hem, form_sleeve.

## Render plan

1. Preview pass: 960x540, low samples, every 4th frame, to check motion and framing.
   Previews are for review only and never ship.
2. Final pass 1: 1920x1080, even frames (step 2), denoised. This is what the site scrubs.
3. Final pass 2, if time allows: the odd frames, for the 24 fps film.
`render.py` must be resumable (`--only-missing`) and safe to run under `nohup`.
