# Graph Report - aia-slides  (2026-11-25)

## Corpus Check
- 66 files · ~122,527 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 52 file(s) not represented in the graph (top: .woff2 36, .ttf 12, (none) 2)
- WARNING: 52 of 118 files seen (44%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 853 nodes · 1909 edges · 48 communities (36 shown, 12 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 74 edges (avg confidence: 0.84)
- Token cost: 141,046 input · 0 output

## Community Hubs (Navigation)
- Blender Lookdev and Props
- Weaving Room Set
- Render Metadata and CLI
- Kimono Project Docs and Sources
- Scene Assembly
- Deck QA Script
- Type-1 Deck Skill and Memory
- Dressing Animation Timing
- Scroll Site Builder
- Mesh Geometry Utils
- Palace Furniture Props
- Deck Builder and Audio
- Kimono Panel Pieces
- Clay and Lighting Setup
- Shoin Hall Architecture
- Satit Site Generator
- Pod Result Server
- Mannequin Body Build
- Garden Branch Generator
- Procedural Textures
- Shared Fabric Materials
- Panel Folding
- Shot Staging
- Synth Sound Effects
- Canvas Drawing
- Camera Shots and Clips
- Film Mux and Pod Launcher
- Museum Photo Cutout
- Hall Surface Shading
- Mannequin Hull Solver
- Narration Mixing
- Design Image Crops
- Mirrored Canvas Drawing
- Preview Sheets
- Body Hull Rings
- Downloaded Asset Colours
- Pod Render Script
- Font Subsetting
- Garment UV Mapping
- Pod Boot Script
- Satit Site Script
- Site Deploy
- Deck Deploy
- Repo README
- Media Play Hook

## God Nodes (most connected - your core abstractions)
1. `build()` - 20 edges
2. `update()` - 20 edges
3. `_b_scroll()` - 19 edges
4. `build_hall()` - 17 edges
5. `main()` - 17 edges
6. `_draw_worn()` - 16 edges
7. `_zabuton()` - 16 edges
8. `hex_rgb()` - 15 edges
9. `_update_collar()` - 15 edges
10. `_K` - 15 edges

## Surprising Connections (you probably didn't know these)
- `No AI, just Blender principle` --semantically_similar_to--> `Lessons: few shots, extreme detail, too perfect reads fake`  [INFERRED] [semantically similar]
  three_d/README.md → PRESENTATION-STYLES.md
- `Owner feedback on finished kimono deck (25 Nov)` --semantically_similar_to--> `Kimono deck lessons (boxy panels, static, overlap, slider bug)`  [INFERRED] [semantically similar]
  MEMORY.md → .claude/skills/type1-deck/SKILL.md
- `Source number table (4-43, Met)` --semantically_similar_to--> `Ledger sources table (4-43)`  [INFERRED] [semantically similar]
  content/BRIEF.md → kimono-sources.md
- `build_hall()` --indirect_call--> `T()`  [INFERRED]
  three_d/scene.py → satit-site/build.py
- `Rooms 0-10 and writers A/B/C` --conceptually_related_to--> `Ledger Room 10: The answer (rules list, 390 rules, both)`  [INFERRED]
  content/BRIEF.md → kimono-sources.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Kimono deck asset pipeline** — hall_scene, gpu_render, met_robe, polyhaven_assets, kimono_deck [INFERRED 0.85]
- **Type-1 deck toolchain (skill, engine template, QA script)** — _claude_skills_type1_deck_skill, _claude_skills_type1_deck_skill_template_engine, _claude_skills_type1_deck_skill_qa_script [EXTRACTED 0.95]
- **Kimono exhibition content pipeline (brief, room JSON, claims ledger)** — content_brief, content_brief_room_schema, kimono_sources [INFERRED 0.85]

## Communities (48 total, 12 thin omitted)

### Community 0 - "Blender Lookdev and Props"
Cohesion: 0.06
Nodes (46): apply(), _bounce(), _haze(), _washi(), _ash_mat(), _B, _b_brazier(), az() (+38 more)

### Community 1 - "Weaving Room Set"
Cohesion: 0.07
Nodes (39): hex_rgb(), arc(), build_bench(), build_bolt(), build_loom(), R(), S(), build_room() (+31 more)

### Community 2 - "Render Metadata and CLI"
Cohesion: 0.06
Nodes (41): found_frames(), lens(), main(), project(), selftest(), fetch(), files(), main() (+33 more)

### Community 3 - "Kimono Project Docs and Sources"
Cohesion: 0.07
Nodes (39): Audio guide narration (Venice AI TTS), Blender Cycles rendering (bpy), Writers' brief: Kimono, a garment or a set of rules? (BRIEF.md), Online museum exhibition (Edo shoin hall, display wall), The Met collection records (object facts), Room JSON schema (content/rooms/<id>.json), Rooms 0-10 and writers A/B/C, Source number table (4-43, Met) (+31 more)

### Community 4 - "Scene Assembly"
Cohesion: 0.10
Nodes (23): clamp01(), apply_frame(), _camera_base(), camera_matrix(), _camera_segments(), camera_state(), ease_walk(), focus_state() (+15 more)

### Community 5 - "Deck QA Script"
Cohesion: 0.07
Nodes (20): args, BROWSER, { execFileSync }, fs, http, OUT, path, pw (+12 more)

### Community 6 - "Type-1 Deck Skill and Memory"
Cohesion: 0.10
Nodes (19): type1-deck skill (SKILL.md), Narration as animation (data-audio, data-cues, HOLD), scripts/qa.cjs QA script, Rough grey-box mock-ups per scene, template/index.html neutral engine, Thai text rule (self-hosted font, line-height 1.45), Audio guide narration rules (Alice, 35-75 s, never reads screen), graphify knowledge graph (+11 more)

### Community 7 - "Dressing Animation Timing"
Cohesion: 0.12
Nodes (17): ramp(), smoothstep(), _acc_hung(), _acc_wait(), anchors_world(), hm(), _bolt_pose(), cloth_frame() (+9 more)

### Community 8 - "Scroll Site Builder"
Cohesion: 0.21
Nodes (18): card_html(), check_room(), cites(), rep(), err(), esc(), guide_button(), head_html() (+10 more)

### Community 9 - "Mesh Geometry Utils"
Cohesion: 0.20
Nodes (19): _close_prof(), _face_normals(), _flip(), _frames(), _obi_face(), _obi_level(), _ramp(), _resample() (+11 more)

### Community 10 - "Palace Furniture Props"
Cohesion: 0.15
Nodes (7): build_byobu(), build_garden(), build_iko(), MB, _obj(), _shrub(), _stone()

### Community 11 - "Deck Builder and Audio"
Cohesion: 0.18
Nodes (15): _capsule(), _ell(), _ellcyl(), _ellipsoid(), hull_sdf(), mannequin_sdf(), _mirror(), _panel_uv() (+7 more)

### Community 12 - "Kimono Panel Pieces"
Cohesion: 0.15
Nodes (8): load_dims(), respell(), duration(), main(), norm(), stt(), ts(), tts()

### Community 13 - "Clay and Lighting Setup"
Cohesion: 0.12
Nodes (10): build_pieces(), _collar_path(), _flat_main(), grid_mesh(), Piece, _rebuild_uvf(), _seam_list(), _uv_garment() (+2 more)

### Community 14 - "Shoin Hall Architecture"
Cohesion: 0.14
Nodes (12): apply_clay(), box(), build(), build_camera(), build_daylight(), build_dressform(), build_furniture(), build_props() (+4 more)

### Community 15 - "Satit Site Generator"
Cohesion: 0.14
Nodes (11): build_floor(), build_hall(), _chodai(), floor_z(), _fusuma(), _fusuma_east(), gold_panel(), plain() (+3 more)

### Community 16 - "Pod Result Server"
Cohesion: 0.21
Nodes (11): areas(), gallery(), header(), link(), ncard(), nextp(), page(), PH() (+3 more)

### Community 17 - "Mannequin Body Build"
Cohesion: 0.14
Nodes (3): H, cutout(), main()

### Community 18 - "Garden Branch Generator"
Cohesion: 0.30
Nodes (12): _anchor_points(), build(), _c_table(), _circle(), _collar_setup(), _grid_faces(), _mat(), _new_obj() (+4 more)

### Community 19 - "Procedural Textures"
Cohesion: 0.17
Nodes (11): _branch(), _bud(), _catmull(), _dots(), _draw_flat(), _draw_worn(), blossoms(), _kiku() (+3 more)

### Community 21 - "Panel Folding"
Cohesion: 0.20
Nodes (9): _col(), collar_uv(), fabric_material(), _grain(), hdri_path(), _load_image(), _nodes(), img() (+1 more)

### Community 22 - "Shot Staging"
Cohesion: 0.24
Nodes (3): _edge_x(), _Panel, _ss()

### Community 23 - "Synth Sound Effects"
Cohesion: 0.16
Nodes (8): apply_shot(), _changed(), _members(), set_coords(), set_groups(), set_open(), _shot_pose(), update_exploded()

### Community 24 - "Canvas Drawing"
Cohesion: 0.33
Nodes (11): beds(), chalk(), cloth_rustle(), db(), env_adsr(), fft_filter(), footsteps(), norm_rms() (+3 more)

### Community 26 - "Film Mux and Pod Launcher"
Cohesion: 0.29
Nodes (8): smootherstep(), _clip_hall_dusk(), _clip_hall_morning(), _clip_kosode_iko(), lerp(), orbit(), _sway(), _u()

### Community 27 - "Museum Photo Cutout"
Cohesion: 0.32
Nodes (6): create(), fetch(), gql(), rec(), status(), terminate()

### Community 28 - "Hall Surface Shading"
Cohesion: 0.18
Nodes (3): lum(), lum(), parse()

### Community 29 - "Mannequin Hull Solver"
Cohesion: 0.22
Nodes (7): _band(), hall_material(), _island_uv(), _math(), _new_mat(), _noise(), _world_pos()

### Community 30 - "Narration Mixing"
Cohesion: 0.22
Nodes (6): _bisect(), _build_mannequin(), _first_hit(), _grad(), _project(), _surface_nets()

### Community 31 - "Design Image Crops"
Cohesion: 0.42
Nodes (7): decode(), fade(), loudnorm(), main(), measure(), ts(), write_wav24()

### Community 32 - "Mirrored Canvas Drawing"
Cohesion: 0.24
Nodes (5): _c(), design_image(), _ground_rgb(), hex_rgb8(), obi_image()

### Community 34 - "Body Hull Rings"
Cohesion: 0.20
Nodes (6): setup_cycles(), anchors(), _camera(), _main(), shoot(), _test_hall()

### Community 36 - "Pod Render Script"
Cohesion: 0.25
Nodes (5): asset_map(), _mean_linear(), _mixc(), _scan(), _srgb_to_lin()

### Community 37 - "Font Subsetting"
Cohesion: 0.38
Nodes (6): DEBIAN_FRONTEND, grade_clips(), PATH, retry(), pod_run.sh script, VFX_MAX_PENDING

### Community 40 - "Pod Boot Script"
Cohesion: 0.40
Nodes (3): garment_uv(), okumi_uv(), worn_uv()

### Community 41 - "Satit Site Script"
Cohesion: 1.00
Nodes (3): log(), pod_boot.sh script, stop_pod()

## Knowledge Gaps
- **15 isolated node(s):** `VFX_MAX_PENDING`, `DEBIAN_FRONTEND`, `PATH`, `graphify knowledge graph`, `Audio guide narration (Venice AI TTS)` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 283 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `_K` connect `Shared Fabric Materials` to `Blender Lookdev and Props`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `VFX_MAX_PENDING`, `DEBIAN_FRONTEND`, `PATH` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Blender Lookdev and Props` be split into smaller, more focused modules?**
  _Cohesion score 0.05740740740740741 - nodes in this community are weakly interconnected._
- **Why does `_Canvas` connect `Camera Shots and Clips` to `Mirrored Canvas Drawing`, `Procedural Textures`, `Panel Folding`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Should `Weaving Room Set` be split into smaller, more focused modules?**
  _Cohesion score 0.06935908691834942 - nodes in this community are weakly interconnected._
- **Why does `_Mirror` connect `Preview Sheets` to `Procedural Textures`, `Panel Folding`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `Render Metadata and CLI` be split into smaller, more focused modules?**
  _Cohesion score 0.06247086247086247 - nodes in this community are weakly interconnected._