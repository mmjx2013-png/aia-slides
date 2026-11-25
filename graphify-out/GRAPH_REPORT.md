# Graph Report - aia-slides  (2026-11-25)

## Corpus Check
- 57 files · ~111,999 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: .ttf 12, .woff2 4, (none) 2)

## Summary
- 765 nodes · 1780 edges · 44 communities (36 shown, 8 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 64 edges (avg confidence: 0.84)
- Token cost: 100,924 input · 0 output

## Community Hubs (Navigation)
- Props and Materials
- Weaving Room Set
- Scene Assembly
- Render Metadata Export
- VFX Compositing
- Project Docs and Rules
- Dressing Animation Timing
- Mannequin Dress Form
- Site Builder
- Mesh Geometry Utils
- Palace Furniture Props
- Deck Builder and Audio
- Kimono Panel Pieces
- Garden Branch Generator
- Clay and Lighting Setup
- Shoin Hall Architecture
- Pod Result Server
- Shared Fabric Materials
- Hall Surface Shading
- Body Hull Geometry
- Mannequin SDF Shapes
- Panel Folding
- Procedural Textures
- Shot Staging
- Synth Sound Effects
- Canvas Drawing
- Camera Shots and Clips
- Deck QA Playwright
- Museum Photo Cutout
- Lookdev Lighting
- RunPod Pod Launcher
- Narration Mixing
- Design Image Crops
- Mirrored Canvas Drawing
- Preview Sheets
- Pod Render Script
- Sleeve Geometry
- Garment UV Mapping
- Obi Sash Geometry
- Pod Boot Script
- Site Deploy
- Deck Deploy
- Repo README

## God Nodes (most connected - your core abstractions)
1. `build()` - 20 edges
2. `update()` - 20 edges
3. `_b_scroll()` - 19 edges
4. `main()` - 17 edges
5. `_draw_worn()` - 16 edges
6. `_zabuton()` - 16 edges
7. `build_hall()` - 16 edges
8. `hex_rgb()` - 15 edges
9. `_update_collar()` - 15 edges
10. `_K` - 15 edges

## Surprising Connections (you probably didn't know these)
- `No AI, just Blender principle` --semantically_similar_to--> `Lessons: few shots, extreme detail, too perfect reads fake`  [INFERRED] [semantically similar]
  three_d/README.md → PRESENTATION-STYLES.md
- `Kimono exhibition: a garment or a set of rules?` --conceptually_related_to--> `Kimono v3 cinematic slide deck`  [INFERRED]
  content/BRIEF.md → HANDOFF.md
- `Audio guide narration (Venice AI TTS)` --conceptually_related_to--> `Kimono exhibition: a garment or a set of rules?`  [INFERRED]
  HANDOFF.md → content/BRIEF.md
- `_update_collar()` --calls--> `collar_uv()`  [EXTRACTED]
  three_d/dressform.py → three_d/common.py
- `HANDOFF.md (Kimono v3 handoff)` --references--> `content/BRIEF.md writers brief`  [EXTRACTED]
  HANDOFF.md → content/BRIEF.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Kimono deck asset pipeline** — hall_scene, gpu_render, met_robe, polyhaven_assets, kimono_deck [INFERRED 0.85]

## Communities (44 total, 8 thin omitted)

### Community 0 - "Props and Materials"
Cohesion: 0.07
Nodes (42): _ash_mat(), _B, _b_brazier(), az(), _b_doc_box_large(), _b_doc_box_small(), _b_robe_tray(), _b_scroll() (+34 more)

### Community 1 - "Weaving Room Set"
Cohesion: 0.07
Nodes (40): hex_rgb(), setup_cycles(), arc(), build_bench(), build_bolt(), build_loom(), R(), S() (+32 more)

### Community 2 - "Scene Assembly"
Cohesion: 0.10
Nodes (23): clamp01(), apply_frame(), _camera_base(), camera_matrix(), _camera_segments(), camera_state(), ease_walk(), focus_state() (+15 more)

### Community 3 - "Render Metadata Export"
Cohesion: 0.11
Nodes (18): found_frames(), lens(), main(), project(), selftest(), fetch(), files(), main() (+10 more)

### Community 4 - "VFX Compositing"
Cohesion: 0.14
Nodes (23): air(), blur(), box(), comp(), _frame(), guided(), lens(), _low() (+15 more)

### Community 5 - "Project Docs and Rules"
Cohesion: 0.11
Nodes (17): Audio guide narration (Venice AI TTS), Blender Cycles rendering (bpy), Claims dropped for lack of source, content/BRIEF.md writers brief, GPU render on RunPod (pod_launch.py), graphify knowledge graph, Reconstructed shoin-style hall 3D scene, HANDOFF.md (Kimono v3 handoff) (+9 more)

### Community 6 - "Dressing Animation Timing"
Cohesion: 0.12
Nodes (17): ramp(), smoothstep(), _acc_hung(), _acc_wait(), anchors_world(), hm(), _bolt_pose(), cloth_frame() (+9 more)

### Community 7 - "Mannequin Dress Form"
Cohesion: 0.17
Nodes (18): build(), _build_mannequin(), _c_table(), _circle(), _collar_setup(), _grad(), _grid_faces(), _mat() (+10 more)

### Community 8 - "Site Builder"
Cohesion: 0.20
Nodes (18): card_html(), check_room(), cites(), rep(), err(), esc(), guide_button(), head_html() (+10 more)

### Community 9 - "Mesh Geometry Utils"
Cohesion: 0.25
Nodes (20): _close_prof(), _face_normals(), _flip(), _frames(), _panel_uv(), _ramp(), _resample(), _ridge() (+12 more)

### Community 10 - "Palace Furniture Props"
Cohesion: 0.15
Nodes (7): build_byobu(), build_garden(), build_iko(), MB, _obj(), _shrub(), _stone()

### Community 11 - "Deck Builder and Audio"
Cohesion: 0.15
Nodes (8): load_dims(), respell(), duration(), main(), norm(), stt(), ts(), tts()

### Community 12 - "Kimono Panel Pieces"
Cohesion: 0.12
Nodes (10): build_pieces(), _collar_path(), _flat_main(), grid_mesh(), Piece, _rebuild_uvf(), _seam_list(), _uv_garment() (+2 more)

### Community 13 - "Garden Branch Generator"
Cohesion: 0.20
Nodes (11): _branch(), _bud(), _catmull(), _dots(), _draw_flat(), _draw_worn(), blossoms(), _kiku() (+3 more)

### Community 14 - "Clay and Lighting Setup"
Cohesion: 0.14
Nodes (12): apply_clay(), box(), build(), build_camera(), build_daylight(), build_dressform(), build_furniture(), build_props() (+4 more)

### Community 15 - "Shoin Hall Architecture"
Cohesion: 0.14
Nodes (11): build_floor(), build_hall(), _chodai(), floor_z(), _fusuma(), _fusuma_east(), gold_panel(), plain() (+3 more)

### Community 16 - "Pod Result Server"
Cohesion: 0.14
Nodes (3): H, cutout(), main()

### Community 17 - "Shared Fabric Materials"
Cohesion: 0.16
Nodes (11): _col(), collar_uv(), fabric_material(), _grain(), hdri_path(), _load_image(), _mean_linear(), _new_mat() (+3 more)

### Community 18 - "Hall Surface Shading"
Cohesion: 0.14
Nodes (11): asset_map(), _band(), hall_material(), sstep(), _island_uv(), _math(), _mixc(), _nodes() (+3 more)

### Community 19 - "Body Hull Geometry"
Cohesion: 0.16
Nodes (4): _bisect(), _first_hit(), _Hull, t_of_frame()

### Community 20 - "Mannequin SDF Shapes"
Cohesion: 0.22
Nodes (10): _capsule(), _ell(), _ellcyl(), _ellipsoid(), hull_sdf(), mannequin_sdf(), _mirror(), _smax() (+2 more)

### Community 21 - "Panel Folding"
Cohesion: 0.24
Nodes (3): _edge_x(), _Panel, _ss()

### Community 23 - "Shot Staging"
Cohesion: 0.16
Nodes (8): apply_shot(), _changed(), _members(), set_coords(), set_groups(), set_open(), _shot_pose(), update_exploded()

### Community 24 - "Synth Sound Effects"
Cohesion: 0.33
Nodes (11): beds(), chalk(), cloth_rustle(), db(), env_adsr(), fft_filter(), footsteps(), norm_rms() (+3 more)

### Community 26 - "Camera Shots and Clips"
Cohesion: 0.29
Nodes (8): smootherstep(), _clip_hall_dusk(), _clip_hall_morning(), _clip_kosode_iko(), lerp(), orbit(), _sway(), _u()

### Community 27 - "Deck QA Playwright"
Cohesion: 0.18
Nodes (6): {chromium}, fs, {chromium}, { chromium, webkit }, fs, pw

### Community 28 - "Museum Photo Cutout"
Cohesion: 0.18
Nodes (3): lum(), lum(), parse()

### Community 29 - "Lookdev Lighting"
Cohesion: 0.27
Nodes (4): apply(), _bounce(), _haze(), _washi()

### Community 30 - "RunPod Pod Launcher"
Cohesion: 0.42
Nodes (6): create(), fetch(), gql(), rec(), status(), terminate()

### Community 31 - "Narration Mixing"
Cohesion: 0.42
Nodes (7): decode(), fade(), loudnorm(), main(), measure(), ts(), write_wav24()

### Community 32 - "Design Image Crops"
Cohesion: 0.24
Nodes (5): _c(), design_image(), _ground_rgb(), hex_rgb8(), obi_image()

### Community 34 - "Preview Sheets"
Cohesion: 0.22
Nodes (5): anchors(), _camera(), _main(), shoot(), _test_hall()

### Community 35 - "Pod Render Script"
Cohesion: 0.38
Nodes (6): DEBIAN_FRONTEND, grade_clips(), PATH, retry(), pod_run.sh script, VFX_MAX_PENDING

### Community 38 - "Garment UV Mapping"
Cohesion: 0.40
Nodes (3): garment_uv(), okumi_uv(), worn_uv()

### Community 39 - "Obi Sash Geometry"
Cohesion: 0.40
Nodes (3): _anchor_points(), _obi_face(), _obi_level()

### Community 40 - "Pod Boot Script"
Cohesion: 1.00
Nodes (3): log(), pod_boot.sh script, stop_pod()

## Knowledge Gaps
- **8 isolated node(s):** `VFX_MAX_PENDING`, `DEBIAN_FRONTEND`, `PATH`, `README.md (AIA slides)`, `Poly Haven CC0 assets` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 250 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `_K` connect `Procedural Textures` to `Props and Materials`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `VFX_MAX_PENDING`, `DEBIAN_FRONTEND`, `PATH` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Props and Materials` be split into smaller, more focused modules?**
  _Cohesion score 0.06583850931677018 - nodes in this community are weakly interconnected._
- **Why does `_Canvas` connect `Canvas Drawing` to `Design Image Crops`, `Shared Fabric Materials`, `Garden Branch Generator`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Should `Weaving Room Set` be split into smaller, more focused modules?**
  _Cohesion score 0.0697980684811238 - nodes in this community are weakly interconnected._
- **Why does `_Mirror` connect `Mirrored Canvas Drawing` to `Shared Fabric Materials`, `Garden Branch Generator`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `Scene Assembly` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._