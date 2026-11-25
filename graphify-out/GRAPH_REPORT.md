# Graph Report - aia-slides  (2026-11-25)

## Corpus Check
- 72 files · ~128,851 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 54 file(s) not represented in the graph (top: .woff2 36, .ttf 12, (none) 3)
- WARNING: 54 of 130 files seen (42%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 904 nodes · 1983 edges · 49 communities (36 shown, 13 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 74 edges (avg confidence: 0.84)
- Token cost: 141,046 input · 0 output

## Graph Freshness
- Built from commit: `66ccce32`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Blender Lookdev and Props
- Weaving Room Set
- Render Metadata and CLI
- Kimono Project Docs and Sources
- Scene Assembly
- Deck QA Script
- Type-1 Deck Skill and Memory
- Dressing Animation Timing
- re
- Mesh Geometry Utils
- Palace Furniture Props
- Deck Builder and Audio
- narrate.py
- Clay and Lighting Setup
- Shoin Hall Architecture
- Satit Site Generator
- บทพูดนำเสนอ: ทำไมโรงเรียนสาธิตควรมีเว็บไซต์ใหม่
- Mannequin Body Build
- Garden Branch Generator
- Procedural Textures
- Shared Fabric Materials
- common.py
- Shot Staging
- Synth Sound Effects
- Canvas Drawing
- Camera Shots and Clips
- Film Mux and Pod Launcher
- Museum Photo Cutout
- Hall Surface Shading
- Mannequin Hull Solver
- evidence.py
- Design Image Crops
- Mirrored Canvas Drawing
- Preview Sheets
- Body Hull Rings
- Downloaded Asset Colours
- lookdev.py
- Font Subsetting
- Garment UV Mapping
- pathlib
- Satit Site Script
- _obi_level
- Deck Deploy
- Repo README
- Media Play Hook
- deck_narrate.py

## God Nodes (most connected - your core abstractions)
1. `build()` - 20 edges
2. `update()` - 20 edges
3. `_b_scroll()` - 19 edges
4. `build_hall()` - 17 edges
5. `main()` - 17 edges
6. `_zabuton()` - 16 edges
7. `_draw_worn()` - 16 edges
8. `_K` - 15 edges
9. `hex_rgb()` - 15 edges
10. `main()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Source number table (4-43, Met)` --semantically_similar_to--> `Ledger sources table (4-43)`  [INFERRED] [semantically similar]
  content/BRIEF.md → kimono-sources.md
- `No AI, just Blender principle` --semantically_similar_to--> `Lessons: few shots, extreme detail, too perfect reads fake`  [INFERRED] [semantically similar]
  three_d/README.md → PRESENTATION-STYLES.md
- `Owner feedback on finished kimono deck (25 Nov)` --semantically_similar_to--> `Kimono deck lessons (boxy panels, static, overlap, slider bug)`  [INFERRED] [semantically similar]
  MEMORY.md → .claude/skills/type1-deck/SKILL.md
- `build_hall()` --indirect_call--> `T()`  [INFERRED]
  three_d/scene.py → satit-site/build.py
- `Rooms 0-10 and writers A/B/C` --conceptually_related_to--> `Ledger Room 10: The answer (rules list, 390 rules, both)`  [INFERRED]
  content/BRIEF.md → kimono-sources.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Type-1 deck toolchain (skill, engine template, QA script)** — _claude_skills_type1_deck_skill, _claude_skills_type1_deck_skill_template_engine, _claude_skills_type1_deck_skill_qa_script [EXTRACTED 0.95]
- **Kimono deck asset pipeline** — hall_scene, gpu_render, met_robe, polyhaven_assets, kimono_deck [INFERRED 0.85]
- **Kimono exhibition content pipeline (brief, room JSON, claims ledger)** — content_brief, content_brief_room_schema, kimono_sources [INFERRED 0.85]

## Communities (49 total, 13 thin omitted)

### Community 0 - "Blender Lookdev and Props"
Cohesion: 0.07
Nodes (42): _ash_mat(), _B, _b_brazier(), az(), _b_doc_box_large(), _b_doc_box_small(), _b_robe_tray(), _b_scroll() (+34 more)

### Community 1 - "Weaving Room Set"
Cohesion: 0.07
Nodes (40): hex_rgb(), setup_cycles(), arc(), build_bench(), build_bolt(), build_loom(), R(), S() (+32 more)

### Community 2 - "Render Metadata and CLI"
Cohesion: 0.06
Nodes (41): found_frames(), lens(), main(), project(), selftest(), fetch(), files(), main() (+33 more)

### Community 3 - "Kimono Project Docs and Sources"
Cohesion: 0.07
Nodes (42): Audio guide narration (Venice AI TTS), Blender Cycles rendering (bpy), Writers' brief: Kimono, a garment or a set of rules? (BRIEF.md), Online museum exhibition (Edo shoin hall, display wall), The Met collection records (object facts), Audio guide narration rules (Alice, 35-75 s, never reads screen), Room JSON schema (content/rooms/<id>.json), Rooms 0-10 and writers A/B/C (+34 more)

### Community 4 - "Scene Assembly"
Cohesion: 0.10
Nodes (22): clamp01(), smootherstep(), build_robe(), _camera_base(), camera_matrix(), _camera_segments(), camera_state(), ease_walk() (+14 more)

### Community 5 - "Deck QA Script"
Cohesion: 0.05
Nodes (23): args, BROWSER, { execFileSync }, fs, http, OUT, path, pw (+15 more)

### Community 6 - "Type-1 Deck Skill and Memory"
Cohesion: 0.11
Nodes (16): type1-deck skill (SKILL.md), Narration as animation (data-audio, data-cues, HOLD), scripts/qa.cjs QA script, Rough grey-box mock-ups per scene, template/index.html neutral engine, Thai text rule (self-hosted font, line-height 1.45), graphify knowledge graph, MEMORY.md shared memory (+8 more)

### Community 7 - "Dressing Animation Timing"
Cohesion: 0.11
Nodes (19): ramp(), smoothstep(), _acc_hung(), _acc_wait(), anchors_world(), hm(), _bolt_pose(), cloth_frame() (+11 more)

### Community 8 - "re"
Cohesion: 0.09
Nodes (32): AL(), areas(), gallery(), header(), link(), IMG(), ncard(), nextp() (+24 more)

### Community 9 - "Mesh Geometry Utils"
Cohesion: 0.25
Nodes (20): _close_prof(), _face_normals(), _flip(), _frames(), _panel_uv(), _ramp(), _resample(), _ridge() (+12 more)

### Community 10 - "Palace Furniture Props"
Cohesion: 0.15
Nodes (7): build_byobu(), build_garden(), build_iko(), MB, _obj(), _shrub(), _stone()

### Community 11 - "Deck Builder and Audio"
Cohesion: 0.22
Nodes (10): _capsule(), _ell(), _ellcyl(), _ellipsoid(), hull_sdf(), mannequin_sdf(), _mirror(), _smax() (+2 more)

### Community 12 - "narrate.py"
Cohesion: 0.33
Nodes (6): duration(), main(), norm(), stt(), ts(), tts()

### Community 13 - "Clay and Lighting Setup"
Cohesion: 0.12
Nodes (10): build_pieces(), _collar_path(), _flat_main(), grid_mesh(), Piece, _rebuild_uvf(), _seam_list(), _uv_garment() (+2 more)

### Community 14 - "Shoin Hall Architecture"
Cohesion: 0.17
Nodes (10): apply_clay(), box(), build(), build_camera(), build_daylight(), build_dressform(), build_furniture(), build_props() (+2 more)

### Community 15 - "Satit Site Generator"
Cohesion: 0.14
Nodes (11): build_floor(), build_hall(), _chodai(), floor_z(), _fusuma(), _fusuma_east(), gold_panel(), plain() (+3 more)

### Community 16 - "บทพูดนำเสนอ: ทำไมโรงเรียนสาธิตควรมีเว็บไซต์ใหม่"
Cohesion: 0.12
Nodes (16): 10. ครูโพสต์กิจกรรมเองได้ใน 3 ขั้น, 11. ความเสี่ยงของเว็บใหม่ และวิธีกัน, 12. บริการเสริม: ออกแบบโปสเตอร์, 13. คำตอบ และสิ่งที่ขอ, 1. ผู้ปกครองเห็นอะไร เมื่อเปิดเว็บเราบนมือถือ?, 2. ผู้ปกครองต้องรอนานแค่ไหน, 3. หนักกว่า 7 เท่า, 4. เบอร์โทรอยู่ลึก 7 จอ (+8 more)

### Community 18 - "Garden Branch Generator"
Cohesion: 0.17
Nodes (18): build(), _build_mannequin(), _c_table(), _circle(), _collar_setup(), _grad(), _grid_faces(), _mat() (+10 more)

### Community 19 - "Procedural Textures"
Cohesion: 0.20
Nodes (11): _branch(), _bud(), _catmull(), _dots(), _draw_flat(), _draw_worn(), blossoms(), _kiku() (+3 more)

### Community 21 - "common.py"
Cohesion: 0.13
Nodes (12): asset_map(), collar_uv(), garment_uv(), hdri_path(), _load_image(), _mean_linear(), _mixc(), okumi_uv() (+4 more)

### Community 22 - "Shot Staging"
Cohesion: 0.24
Nodes (3): _edge_x(), _Panel, _ss()

### Community 23 - "Synth Sound Effects"
Cohesion: 0.16
Nodes (10): apply_frame(), apply_shot(), _changed(), _members(), _paper_nodes(), place_props(), set_groups(), set_light() (+2 more)

### Community 24 - "Canvas Drawing"
Cohesion: 0.33
Nodes (11): beds(), chalk(), cloth_rustle(), db(), env_adsr(), fft_filter(), footsteps(), norm_rms() (+3 more)

### Community 26 - "Film Mux and Pod Launcher"
Cohesion: 0.30
Nodes (7): _clip_hall_dusk(), _clip_hall_morning(), _clip_kosode_iko(), lerp(), orbit(), _sway(), _u()

### Community 27 - "Museum Photo Cutout"
Cohesion: 0.30
Nodes (7): load_dims(), create(), fetch(), gql(), rec(), status(), terminate()

### Community 28 - "Hall Surface Shading"
Cohesion: 0.18
Nodes (3): lum(), lum(), parse()

### Community 29 - "Mannequin Hull Solver"
Cohesion: 0.14
Nodes (13): _band(), _col(), fabric_material(), _grain(), hall_material(), sstep(), _island_uv(), _math() (+5 more)

### Community 30 - "evidence.py"
Cohesion: 0.16
Nodes (7): fmt(), items(), lhr(), med(), panel(), bar(), wc_cell()

### Community 31 - "Design Image Crops"
Cohesion: 0.42
Nodes (7): decode(), fade(), loudnorm(), main(), measure(), ts(), write_wav24()

### Community 32 - "Mirrored Canvas Drawing"
Cohesion: 0.24
Nodes (5): _c(), design_image(), _ground_rgb(), hex_rgb8(), obi_image()

### Community 34 - "Body Hull Rings"
Cohesion: 0.22
Nodes (5): anchors(), _camera(), _main(), shoot(), _test_hall()

### Community 35 - "Downloaded Asset Colours"
Cohesion: 0.16
Nodes (4): _bisect(), _first_hit(), _Hull, t_of_frame()

### Community 36 - "lookdev.py"
Cohesion: 0.27
Nodes (4): apply(), _bounce(), _haze(), _washi()

### Community 37 - "Font Subsetting"
Cohesion: 0.38
Nodes (6): DEBIAN_FRONTEND, grade_clips(), PATH, retry(), pod_run.sh script, VFX_MAX_PENDING

### Community 41 - "Satit Site Script"
Cohesion: 1.00
Nodes (3): log(), pod_boot.sh script, stop_pod()

### Community 43 - "_obi_level"
Cohesion: 0.40
Nodes (3): _anchor_points(), _obi_face(), _obi_level()

## Knowledge Gaps
- **15 isolated node(s):** `DEBIAN_FRONTEND`, `PATH`, `VFX_MAX_PENDING`, `Audio guide narration (Venice AI TTS)`, `The Met collection records (object facts)` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 311 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `_K` connect `Shared Fabric Materials` to `Blender Lookdev and Props`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `DEBIAN_FRONTEND`, `PATH`, `VFX_MAX_PENDING` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Blender Lookdev and Props` be split into smaller, more focused modules?**
  _Cohesion score 0.06734867860187553 - nodes in this community are weakly interconnected._
- **Why does `_Canvas` connect `Camera Shots and Clips` to `Mirrored Canvas Drawing`, `Procedural Textures`, `common.py`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `Weaving Room Set` be split into smaller, more focused modules?**
  _Cohesion score 0.06820119352088662 - nodes in this community are weakly interconnected._
- **Why does `_Mirror` connect `Preview Sheets` to `Procedural Textures`, `common.py`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Should `Render Metadata and CLI` be split into smaller, more focused modules?**
  _Cohesion score 0.06247086247086247 - nodes in this community are weakly interconnected._