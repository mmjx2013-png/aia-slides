# Credits for the 3D sets

Nothing in these pictures is AI-generated. Geometry, motion and the textile design are written in
code (`scene.py`, `common.py`, `dressform.py`, `weaving.py`) and rendered with Blender Cycles.
The surfaces below use photo-scanned material maps and one photographed sky, all released under
CC0 1.0 (public domain) by Poly Haven, https://polyhaven.com/license. Files are 2K (the HDRI 8K), kept in
`build/assets/` (git-ignored) and re-fetched by `python3 three_d/fetch_assets.py`.

## Set 1: the hall (`scene.py`, shots in `shots.py`)

| Asset | Used for | Author(s) | Page | Licence |
|---|---|---|---|---|
| Tatami Mat (`tatami_mat`: diff, rough, nor_gl) | the tatami floor, with its woven borders (darkened in the shader) | Charlotte Baglioni | https://polyhaven.com/a/tatami_mat | CC0 |
| Ash Veneer (`ash_veneer`: diff, rough, nor_gl) | posts, rails, shoji frames and lattice, ceiling ribs (tinted towards hinoki) | Jenelle van Heerden | https://polyhaven.com/a/ash_veneer | CC0 |
| Okoume Veneer (`okoume_veneer`: diff, rough, nor_gl) | ceiling boards and shoji hip boards | Jenelle van Heerden | https://polyhaven.com/a/okoume_veneer | CC0 |
| Japanese Cedar Planks (`japanese_cedar_planks`: diff, rough, nor_gl) | veranda boards, alcove floors | Charlotte Baglioni, Rico Cilliers | https://polyhaven.com/a/japanese_cedar_planks | CC0 |
| White Plaster 02 (`white_plaster_02`: diff, rough, nor_gl) | plaster walls, including the display wall | Rob Tuytel | https://polyhaven.com/a/white_plaster_02 | CC0 |
| Gravel Floor 02 (`gravel_floor_02`: diff, rough, nor_gl) | the gravel of the garden beyond the veranda | Jenelle van Heerden, Dimitrios Savva | https://polyhaven.com/a/gravel_floor_02 | CC0 |
| Mossy Rock (`mossy_rock`: diff, rough, nor_gl) | the stepping stone at the veranda's edge | Rob Tuytel | https://polyhaven.com/a/mossy_rock | CC0 |
| Ninomaru Teien (`ninomaru_teien_8k.hdr`, HDRI) | the garden seen through the open shoji | Greg Zaal | https://polyhaven.com/a/ninomaru_teien | CC0 |

Download host: `https://dl.polyhaven.org/file/ph-assets/...` (exact URLs in `fetch_assets.py`).

The robe on the iko is a museum photograph, not a model of ours: The Metropolitan Museum of Art,
Robe (Kosode) with Fishing Net and Characters, Open Access (CC0), cut-out
`site/assets/photos/met-76731-cut-1068.webp` (in the repository; the object's full record is with
the site's photo credits). It is used as the albedo of a sheet of the robe's recorded size
(153.4 x 127.6 cm) cut to the photograph's outline; the folds and the plain back are made in code.

Made in code, no downloaded asset: gold leaf (leaf squares, overlaps, tarnish and wear), black
lacquer (edge wear, dust), gilt fittings, shoji paper (with its mended panes) and its daylight, the
veranda, its stone step and stepping stones, the moss islands (shapes in code, surfaced with the
Mossy Rock scan) and the clipped shrubs (a mound of leaf cards generated in code), the raised jodan,
the chodaigamae doors and their tassels, the felt runner, the kimono textile design and the obi brocade (drawn with PIL in
`common.py`), silk shading, and every age mark (shader noise over the scans: frayed tatami borders,
hand-darkened wood, clouded plaster). The small objects of the room (document boxes, cushions,
brazier, smoking tray, folded robe on its tray, hanging scroll) are modelled in code in `props.py`.

The hall is a reconstruction in the manner of the shoin halls of Nijo Castle's Ninomaru Palace; no
painting of that building is copied: plain aged gold leaf stands wherever a painting would be.

ambientCG was not used: its API answers, but its download host
(`acg-download.struffelproductions.com`) is refused by this container's proxy.

## Set 2: the weaving room (`weaving.py`)

Fetched by `weaving.py` itself from the same host, same licence (CC0, Poly Haven):

| Asset | Author(s) | Page |
|---|---|---|
| Oak Veneer 01 (`oak_veneer_01`) | Jenelle van Heerden | https://polyhaven.com/a/oak_veneer_01 |
| Plastered Wall (`plastered_wall`) | Amal Kumar | https://polyhaven.com/a/plastered_wall |
| Wood Floor Worn (`wood_floor_worn`) | Dimitrios Savva | https://polyhaven.com/a/wood_floor_worn |
| Wood Table 001 (`wood_table_001`) | Dimitrios Savva, Rico Cilliers | https://polyhaven.com/a/wood_table_001 |

(The weaving-room list is what was in `build/assets/` when this file was written; `weaving.py` is
the authority for that set.)
