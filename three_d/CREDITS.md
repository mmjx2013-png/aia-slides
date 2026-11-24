# Credits for the 3D sets

Nothing in these pictures is AI-generated. Geometry, motion and the textile design are written in
code (`scene.py`, `common.py`, `dressform.py`, `weaving.py`) and rendered with Blender Cycles.
The surfaces below use photo-scanned material maps and one photographed sky, all released under
CC0 1.0 (public domain) by Poly Haven, https://polyhaven.com/license. Files are 2K, kept in
`build/assets/` (git-ignored) and re-fetched by `python3 three_d/fetch_assets.py`.

## Set 1: the hall (`scene.py`)

| Asset | Used for | Author(s) | Page | Licence |
|---|---|---|---|---|
| Tatami Mat (`tatami_mat`: diff, rough, nor_gl) | the tatami floor, with its woven borders (darkened in the shader) | Charlotte Baglioni | https://polyhaven.com/a/tatami_mat | CC0 |
| Ash Veneer (`ash_veneer`: diff, rough, nor_gl) | posts, rails, shoji frames and lattice, ceiling ribs (tinted towards hinoki) | Jenelle van Heerden | https://polyhaven.com/a/ash_veneer | CC0 |
| Okoume Veneer (`okoume_veneer`: diff, rough, nor_gl) | ceiling boards and shoji hip boards | Jenelle van Heerden | https://polyhaven.com/a/okoume_veneer | CC0 |
| Japanese Cedar Planks (`japanese_cedar_planks`: diff, rough, nor_gl) | veranda boards, alcove floors | Charlotte Baglioni, Rico Cilliers | https://polyhaven.com/a/japanese_cedar_planks | CC0 |
| White Plaster 02 (`white_plaster_02`: diff, rough, nor_gl) | plaster walls, including the display wall | Rob Tuytel | https://polyhaven.com/a/white_plaster_02 | CC0 |
| Ninomaru Teien (`ninomaru_teien_2k.hdr`, HDRI) | the garden seen through the open shoji | Greg Zaal | https://polyhaven.com/a/ninomaru_teien | CC0 |

Download host: `https://dl.polyhaven.org/file/ph-assets/...` (exact URLs in `fetch_assets.py`).

Made in code, no downloaded asset: gold leaf (leaf squares, overlaps, wear), black lacquer, gilt
fittings, shoji paper and its daylight, the felt runner, the kimono textile design and the obi
brocade (drawn with PIL in `common.py`), silk shading.

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
