# Graph Report - aia-slides  (2026-11-25)

## Corpus Check
- 58 files · ~112,061 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: .ttf 12, .woff2 4, (none) 2)

## Summary
- 798 nodes · 1795 edges · 52 communities (40 shown, 12 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 61 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0ec3e599`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- props.py
- weaving.py
- os
- scene.py
- update_cloth
- dressform.py
- re
- numpy
- _obj
- json
- build_pieces
- math
- build
- build_hall
- pathlib
- common.py
- _b_tobacco_tray
- Kimono exhibition (v3): claims ledger
- .__init__
- mannequin_sdf
- _ss
- _K
- apply_shot
- synth.py
- _Canvas
- shots.py
- ref_playwright
- qa_check.py
- lookdev.py
- sys
- subprocess
- _b_scroll
- _Mirror
- _main
- Kimono v3: the 3D sets (spec and contract, v3)
- Writers' brief: "Kimono: a garment, or a set of rules?" (v3, online exhibition)
- Kimono v3: handoff
- MEMORY.md: shared memory for every Claude chat
- pod_run.sh
- Presentation styles: the owner's vocabulary
- _Sleeve
- _zabuton
- _build_mannequin
- Credits for the 3D sets
- pod_boot.sh
- README.md
- deploy.sh
- deploy_deck.sh
- _B
- CLAUDE.md
- _orient

## God Nodes (most connected - your core abstractions)
1. `build()` - 20 edges
2. `update()` - 20 edges
3. `_b_scroll()` - 19 edges
4. `main()` - 17 edges
5. `_zabuton()` - 16 edges
6. `_draw_worn()` - 16 edges
7. `build_hall()` - 16 edges
8. `_K` - 15 edges
9. `hex_rgb()` - 15 edges
10. `main()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Deliverables and layout` --references--> `anchors()`  [INFERRED]
  three_d/README.md → three_d/dressform.py
- `_update_collar()` --calls--> `collar_uv()`  [EXTRACTED]
  three_d/dressform.py → three_d/common.py
- `plain()` --calls--> `hex_rgb()`  [EXTRACTED]
  three_d/scene.py → three_d/common.py
- `render()` --calls--> `setup_cycles()`  [EXTRACTED]
  three_d/weaving.py → three_d/common.py
- `_mat()` --calls--> `fabric_material()`  [EXTRACTED]
  three_d/dressform.py → three_d/common.py

## Import Cycles
- None detected.

## Communities (52 total, 12 thin omitted)

### Community 0 - "props.py"
Cohesion: 0.15
Nodes (14): _b_robe_tray(), _cord_mat(), _fold_path(), _lin(), m_bamboo(), m_brocade(), m_lacquer(), m_paper() (+6 more)

### Community 1 - "weaving.py"
Cohesion: 0.07
Nodes (39): hex_rgb(), arc(), build_bench(), build_bolt(), build_loom(), R(), S(), build_room() (+31 more)

### Community 2 - "os"
Cohesion: 0.06
Nodes (41): found_frames(), lens(), main(), project(), selftest(), fetch(), files(), main() (+33 more)

### Community 3 - "scene.py"
Cohesion: 0.10
Nodes (23): clamp01(), apply_frame(), _camera_base(), camera_matrix(), _camera_segments(), camera_state(), ease_walk(), focus_state() (+15 more)

### Community 4 - "update_cloth"
Cohesion: 0.12
Nodes (17): ramp(), smoothstep(), _acc_hung(), _acc_wait(), anchors_world(), hm(), _bolt_pose(), cloth_frame() (+9 more)

### Community 5 - "dressform.py"
Cohesion: 0.30
Nodes (12): _anchor_points(), build(), _c_table(), _circle(), _collar_setup(), _grid_faces(), _mat(), _new_obj() (+4 more)

### Community 6 - "re"
Cohesion: 0.20
Nodes (18): card_html(), check_room(), cites(), rep(), err(), esc(), guide_button(), head_html() (+10 more)

### Community 7 - "numpy"
Cohesion: 0.20
Nodes (19): _close_prof(), _face_normals(), _flip(), _frames(), _obi_face(), _obi_level(), _ramp(), _resample() (+11 more)

### Community 8 - "_obj"
Cohesion: 0.15
Nodes (7): build_byobu(), build_garden(), build_iko(), MB, _obj(), _shrub(), _stone()

### Community 9 - "json"
Cohesion: 0.15
Nodes (8): load_dims(), respell(), duration(), main(), norm(), stt(), ts(), tts()

### Community 10 - "build_pieces"
Cohesion: 0.12
Nodes (10): build_pieces(), _collar_path(), _flat_main(), grid_mesh(), Piece, _rebuild_uvf(), _seam_list(), _uv_garment() (+2 more)

### Community 11 - "math"
Cohesion: 0.20
Nodes (11): _branch(), _bud(), _catmull(), _dots(), _draw_flat(), _draw_worn(), blossoms(), _kiku() (+3 more)

### Community 12 - "build"
Cohesion: 0.14
Nodes (12): apply_clay(), box(), build(), build_camera(), build_daylight(), build_dressform(), build_furniture(), build_props() (+4 more)

### Community 13 - "build_hall"
Cohesion: 0.14
Nodes (11): build_floor(), build_hall(), _chodai(), floor_z(), _fusuma(), _fusuma_east(), gold_panel(), plain() (+3 more)

### Community 14 - "pathlib"
Cohesion: 0.14
Nodes (3): H, cutout(), main()

### Community 15 - "common.py"
Cohesion: 0.07
Nodes (29): asset_map(), _band(), _c(), _col(), collar_uv(), design_image(), fabric_material(), garment_uv() (+21 more)

### Community 16 - "_b_tobacco_tray"
Cohesion: 0.23
Nodes (10): _ash_mat(), _b_brazier(), _b_doc_box_large(), _b_doc_box_small(), _b_tobacco_tray(), _disc(), _doc_box(), _fillet() (+2 more)

### Community 17 - "Kimono exhibition (v3): claims ledger"
Cohesion: 0.13
Nodes (14): Claims dropped for lack of a source read this session, Kimono exhibition (v3): claims ledger, Room 0 · Welcome, Room 10 · The answer, Room 1 · One bolt, Room 2 · The parts, Room 3 · Cloth and season, Room 4 · Pattern (+6 more)

### Community 19 - "mannequin_sdf"
Cohesion: 0.18
Nodes (15): _capsule(), _ell(), _ellcyl(), _ellipsoid(), hull_sdf(), mannequin_sdf(), _mirror(), _panel_uv() (+7 more)

### Community 20 - "_ss"
Cohesion: 0.24
Nodes (3): _edge_x(), _Panel, _ss()

### Community 22 - "apply_shot"
Cohesion: 0.16
Nodes (8): apply_shot(), _changed(), _members(), set_coords(), set_groups(), set_open(), _shot_pose(), update_exploded()

### Community 23 - "synth.py"
Cohesion: 0.33
Nodes (11): beds(), chalk(), cloth_rustle(), db(), env_adsr(), fft_filter(), footsteps(), norm_rms() (+3 more)

### Community 25 - "shots.py"
Cohesion: 0.29
Nodes (8): smootherstep(), _clip_hall_dusk(), _clip_hall_morning(), _clip_kosode_iko(), lerp(), orbit(), _sway(), _u()

### Community 26 - "ref_playwright"
Cohesion: 0.18
Nodes (6): {chromium}, fs, {chromium}, { chromium, webkit }, fs, pw

### Community 27 - "qa_check.py"
Cohesion: 0.18
Nodes (3): lum(), lum(), parse()

### Community 28 - "lookdev.py"
Cohesion: 0.27
Nodes (4): apply(), _bounce(), _haze(), _washi()

### Community 29 - "sys"
Cohesion: 0.40
Nodes (6): create(), fetch(), gql(), rec(), status(), terminate()

### Community 30 - "subprocess"
Cohesion: 0.42
Nodes (7): decode(), fade(), loudnorm(), main(), measure(), ts(), write_wav24()

### Community 31 - "_b_scroll"
Cohesion: 0.18
Nodes (7): _b_scroll(), disp(), fn(), _grid(), _rbox(), _sheet(), fn()

### Community 33 - "_main"
Cohesion: 0.18
Nodes (7): setup_cycles(), anchors(), _camera(), _main(), shoot(), _test_hall(), Deliverables and layout

### Community 34 - "Kimono v3: the 3D sets (spec and contract, v3)"
Cohesion: 0.25
Nodes (7): Kimono v3: the 3D sets (spec and contract, v3), Realism target, Render plan, Set 1: the hall (Z up, metres, floor z = 0), Set 2: the weaving room (stills only), Stages of the hall sequence (full-rate frames at 24 fps; 984 frames), The garment (parametric; numbers live in `dims.json`)

### Community 35 - "Writers' brief: "Kimono: a garment, or a set of rules?" (v3, online exhibition)"
Cohesion: 0.29
Nodes (6): JSON schema (one file per room), On-screen text limits (the build fails if text does not fit at 1920x1080, 1440x900, 390x844), Sources (final numbers; cite ONLY these, ONLY from text actually read this session), The exhibition, The narration (audio guide), Writers' brief: "Kimono: a garment, or a set of rules?" (v3, online exhibition)

### Community 36 - "Kimono v3: handoff"
Cohesion: 0.29
Nodes (6): 1. What exists, 2. The GPU render (not started; nothing spent), 3. What comes out (in `build/out/` after `fetch`), 4. Photos (from the Mac session, branch kimono-photos; not arrived at 17:00), 5. Known defects and gaps, Kimono v3: handoff

### Community 37 - "MEMORY.md: shared memory for every Claude chat"
Cohesion: 0.29
Nodes (6): How the owner works, Log (newest first; one line each; date, what, where), MEMORY.md: shared memory for every Claude chat, Presentations, Projects, Tools that work

### Community 38 - "pod_run.sh"
Cohesion: 0.38
Nodes (6): DEBIAN_FRONTEND, grade_clips(), PATH, retry(), pod_run.sh script, VFX_MAX_PENDING

### Community 40 - "Presentation styles: the owner's vocabulary"
Cohesion: 0.33
Nodes (5): Lessons for next time (the owner's feedback, 24 Nov 2026), Never, Presentation styles: the owner's vocabulary, Type 1: the target ("perfect"), Type 2: acceptable, the minimum standard

### Community 42 - "_zabuton"
Cohesion: 0.24
Nodes (9): az(), _b_zabuton_a(), _b_zabuton_b(), _lathe(), _nz(), _zabuton(), pos(), prof() (+1 more)

### Community 43 - "_build_mannequin"
Cohesion: 0.22
Nodes (6): _bisect(), _build_mannequin(), _first_hit(), _grad(), _project(), _surface_nets()

### Community 44 - "Credits for the 3D sets"
Cohesion: 0.50
Nodes (3): Credits for the 3D sets, Set 1: the hall (`scene.py`, shots in `shots.py`), Set 2: the weaving room (`weaving.py`)

### Community 45 - "pod_boot.sh"
Cohesion: 1.00
Nodes (3): log(), pod_boot.sh script, stop_pod()

## Knowledge Gaps
- **3 isolated node(s):** `DEBIAN_FRONTEND`, `PATH`, `VFX_MAX_PENDING`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 294 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `_K` connect `_K` to `props.py`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `DEBIAN_FRONTEND`, `PATH`, `VFX_MAX_PENDING` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `props.py` be split into smaller, more focused modules?**
  _Cohesion score 0.14624505928853754 - nodes in this community are weakly interconnected._
- **Why does `_Canvas` connect `_Canvas` to `math`, `common.py`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `weaving.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06935908691834942 - nodes in this community are weakly interconnected._
- **Why does `_Mirror` connect `_Mirror` to `math`, `common.py`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `os` be split into smaller, more focused modules?**
  _Cohesion score 0.06298076923076923 - nodes in this community are weakly interconnected._