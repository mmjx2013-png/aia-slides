# Graph Report - aia-slides  (2026-11-26)

## Corpus Check
- 81 files · ~130,776 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 55 file(s) not represented in the graph (top: .woff2 36, .ttf 12, (none) 3)
- WARNING: 55 of 136 files seen (40%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 1041 nodes · 2271 edges · 54 communities (37 shown, 17 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 128 edges (avg confidence: 0.84)
- Token cost: 341,450 input · 0 output

## Community Hubs (Navigation)
- Blender Lookdev Props
- Satit Pitch Script
- Weaving and Bench Geometry
- Speed Evidence and Security Report
- Render and Asset Pipeline
- Kimono Exhibition Content
- Deck QA and Screenshot Tools
- Satit Site and PDF Builders
- Scene Camera and Racks
- Garment Texture Mapping
- Type-1 Deck Skill
- Easing and Anchor Maths
- Exhibition Site Builder
- Dressform Obi Geometry
- Garden and Byobu Builders
- Dressform Hull SDF
- Kimono Pieces Mesh
- Scene Build Entry
- Hall and Fusuma Builders
- Utility Scripts and QA
- Dressform Collar Setup
- Embroidery Branch Drawing
- Photo Cutout Pipeline
- Sound Synthesis
- Procedural Bump Textures
- Folded Panel Model
- Shot State Machine
- Canvas Drawing Primitives
- Camera Clip Shots
- Mannequin Ray Tests
- Narration Driver
- Pod File Server
- Audio Mix and Loudness
- Design Image Cropping
- Mirror Drawing Primitives
- Cycles Render Setup
- Hull Ray Tables
- Trading Market Data
- Frame Metadata Export
- Pod Run Script
- Sleeve Geometry
- Garment UV Layout
- Deck Narration TTS
- Pod Boot Script
- Market Data Fetch Script
- Face Orientation Fix
- Site Deploy Script
- Deck Deploy Script
- Repo README

## God Nodes (most connected - your core abstractions)
1. `Security and bug audit report: Satit prototype website` - 23 edges
2. `build()` - 20 edges
3. `update()` - 20 edges
4. `Evidence Pack: Is the new Satit website really faster than the old one?` - 20 edges
5. `_b_scroll()` - 19 edges
6. `Pitch Script: Why Satit School Should Have a New Website` - 19 edges
7. `build_hall()` - 17 edges
8. `main()` - 17 edges
9. `_draw_worn()` - 16 edges
10. `_zabuton()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Owner feedback on finished kimono deck (25 Nov)` --semantically_similar_to--> `Kimono deck lessons (boxy panels, static, overlap, slider bug)`  [INFERRED] [semantically similar]
  MEMORY.md → .claude/skills/type1-deck/SKILL.md
- `No AI, just Blender principle` --semantically_similar_to--> `Lessons: few shots, extreme detail, too perfect reads fake`  [INFERRED] [semantically similar]
  three_d/README.md → PRESENTATION-STYLES.md
- `Source number table (4-43, Met)` --semantically_similar_to--> `Ledger sources table (4-43)`  [INFERRED] [semantically similar]
  content/BRIEF.md → kimono-sources.md
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
- **Three international standards used to judge both school websites** — satit_site_pitch_script_wcag_2_2_aa, satit_site_pitch_script_owasp_asvs, satit_site_pitch_script_core_web_vitals [EXTRACTED 1.00]
- **Outdated server software exposed in the old site's response headers** — satit_site_pitch_script_server_header_disclosure, satit_site_pitch_script_php_7_3, satit_site_pitch_script_openssl_1_1_1, satit_site_pitch_script_apache_2_4_52 [EXTRACTED 1.00]
- **Market datasets bundled for the paper-trading worker** — trading_data_readme_set_stocks, trading_data_readme_yahoo_gold, trading_data_readme_index_set50, trading_data_readme_tdex_bk [EXTRACTED 1.00]
- **Three International Standards Scorecard (accessibility, security, speed)** — satit_site_pitch_script_slide_07_international_standards, satit_site_pitch_script_wcag_2_2_aa, satit_site_pitch_script_owasp_asvs_5_level_1, satit_site_pitch_script_core_web_vitals [EXTRACTED 1.00]
- **Outdated Server to Parent Risk Chain** — satit_site_pitch_script_server_header_disclosure, satit_site_pitch_script_php_7_3, satit_site_pitch_script_openssl_1_1_1, satit_site_pitch_script_apache_2_4_52, satit_site_pitch_script_hsts, satit_site_pitch_script_risk_swapped_fee_qr, satit_site_pitch_script_risk_page_tampering, satit_site_pitch_script_risk_plugin_version_scanning [INFERRED 0.85]
- **New Site Risk Mitigation Plan** — satit_site_pitch_script_slide_11_new_site_risks, satit_site_pitch_script_github_pages, satit_site_pitch_script_two_factor_auth, satit_site_pitch_script_csp, satit_site_pitch_script_pdpa_student_photos, satit_site_pitch_script_free_link_service_qr [EXTRACTED 1.00]
- **OWASP ASVS 5.0.0 Level 1 baseline (old 0/3, new 3/3)** — satit_site_pitch_evidence_evidence_speed_asvs_v3_4_1_hsts, satit_site_pitch_evidence_evidence_speed_asvs_v12_2_1_tls, satit_site_pitch_evidence_evidence_speed_asvs_v15_2_1_supported_components, satit_site_pitch_evidence_evidence_speed_owasp_asvs_5_0_0 [EXTRACTED 1.00]
- **WCAG 2.2 criteria checked on the first page (old fails 4, new fails 1)** — satit_site_pitch_evidence_evidence_speed_wcag_1_4_3_contrast, satit_site_pitch_evidence_evidence_speed_wcag_2_4_4_link_purpose, satit_site_pitch_evidence_evidence_speed_wcag_4_1_2_name_role_value, satit_site_pitch_evidence_evidence_speed_wcag_2_5_8_target_size, satit_site_pitch_evidence_evidence_speed_wcag_2_2_aa [EXTRACTED 1.00]
- **Protections added to the Satit prototype this round** — satit_site_pitch_security_report_content_security_policy, satit_site_pitch_security_report_referrer_policy, satit_site_pitch_security_report_wcag_fixes, satit_site_pitch_security_report_performance_fixes [EXTRACTED 1.00]

## Communities (54 total, 17 thin omitted)

### Community 0 - "Blender Lookdev Props"
Cohesion: 0.06
Nodes (46): apply(), _bounce(), _haze(), _washi(), _ash_mat(), _B, _b_brazier(), az() (+38 more)

### Community 1 - "Satit Pitch Script"
Cohesion: 0.06
Nodes (68): Pitch script: why the Satit school needs a new website, Apache 2.4.52 (latest 2.4.71), ASVS V12.2.1 (no unencrypted http access), ASVS V12.2.1: No Unencrypted HTTP, ASVS V15.2.1 (supported software components), ASVS V15.2.1: Supported Software Components, ASVS V3.4.1 (HSTS at least 1 year), ASVS V3.4.1: Enforce HTTPS via HSTS (>=1 year) (+60 more)

### Community 2 - "Weaving and Bench Geometry"
Cohesion: 0.07
Nodes (39): hex_rgb(), arc(), build_bench(), build_bolt(), build_loom(), R(), S(), build_room() (+31 more)

### Community 3 - "Speed Evidence and Security Report"
Cohesion: 0.06
Nodes (60): Evidence Pack: Is the new Satit website really faster than the old one?, ASVS V12.2.1 TLS always, no unencrypted access, ASVS V13.4.6 Do not disclose server software versions, ASVS V15.2.1 Components within support period, ASVS V3.4.1 HSTS for at least 1 year (IETF RFC 6797), ASVS V3.4.3 Content-Security-Policy against injected scripts, ASVS V3.4.4 X-Content-Type-Options: nosniff, axe-core 4.14 (+52 more)

### Community 4 - "Render and Asset Pipeline"
Cohesion: 0.07
Nodes (36): fetch(), files(), main(), apply_quality(), frame_list(), main(), main_shots(), parse() (+28 more)

### Community 5 - "Kimono Exhibition Content"
Cohesion: 0.07
Nodes (39): Audio guide narration (Venice AI TTS), Blender Cycles rendering (bpy), Writers' brief: Kimono, a garment or a set of rules? (BRIEF.md), Online museum exhibition (Edo shoin hall, display wall), The Met collection records (object facts), Room JSON schema (content/rooms/<id>.json), Rooms 0-10 and writers A/B/C, Source number table (4-43, Met) (+31 more)

### Community 6 - "Deck QA and Screenshot Tools"
Cohesion: 0.05
Nodes (23): args, BROWSER, { execFileSync }, fs, http, OUT, path, pw (+15 more)

### Community 7 - "Satit Site and PDF Builders"
Cohesion: 0.08
Nodes (21): AL(), areas(), gallery(), header(), link(), IMG(), ncard(), nextp() (+13 more)

### Community 8 - "Scene Camera and Racks"
Cohesion: 0.10
Nodes (23): clamp01(), apply_frame(), _camera_base(), camera_matrix(), _camera_segments(), camera_state(), ease_walk(), focus_state() (+15 more)

### Community 9 - "Garment Texture Mapping"
Cohesion: 0.10
Nodes (21): asset_map(), _band(), _col(), collar_uv(), fabric_material(), _grain(), hall_material(), hdri_path() (+13 more)

### Community 10 - "Type-1 Deck Skill"
Cohesion: 0.10
Nodes (19): type1-deck skill (SKILL.md), Narration as animation (data-audio, data-cues, HOLD), scripts/qa.cjs QA script, Rough grey-box mock-ups per scene, template/index.html neutral engine, Thai text rule (self-hosted font, line-height 1.45), Audio guide narration rules (Alice, 35-75 s, never reads screen), graphify knowledge graph (+11 more)

### Community 11 - "Easing and Anchor Maths"
Cohesion: 0.12
Nodes (17): ramp(), smoothstep(), _acc_hung(), _acc_wait(), anchors_world(), hm(), _bolt_pose(), cloth_frame() (+9 more)

### Community 12 - "Exhibition Site Builder"
Cohesion: 0.21
Nodes (18): card_html(), check_room(), cites(), rep(), err(), esc(), guide_button(), head_html() (+10 more)

### Community 13 - "Dressform Obi Geometry"
Cohesion: 0.20
Nodes (19): _close_prof(), _face_normals(), _flip(), _frames(), _obi_face(), _obi_level(), _ramp(), _resample() (+11 more)

### Community 14 - "Garden and Byobu Builders"
Cohesion: 0.15
Nodes (7): build_byobu(), build_garden(), build_iko(), MB, _obj(), _shrub(), _stone()

### Community 15 - "Dressform Hull SDF"
Cohesion: 0.18
Nodes (15): _capsule(), _ell(), _ellcyl(), _ellipsoid(), hull_sdf(), mannequin_sdf(), _mirror(), _panel_uv() (+7 more)

### Community 16 - "Kimono Pieces Mesh"
Cohesion: 0.12
Nodes (10): build_pieces(), _collar_path(), _flat_main(), grid_mesh(), Piece, _rebuild_uvf(), _seam_list(), _uv_garment() (+2 more)

### Community 17 - "Scene Build Entry"
Cohesion: 0.14
Nodes (12): apply_clay(), box(), build(), build_camera(), build_daylight(), build_dressform(), build_furniture(), build_props() (+4 more)

### Community 18 - "Hall and Fusuma Builders"
Cohesion: 0.14
Nodes (11): build_floor(), build_hall(), _chodai(), floor_z(), _fusuma(), _fusuma_east(), gold_panel(), plain() (+3 more)

### Community 19 - "Utility Scripts and QA"
Cohesion: 0.25
Nodes (8): load_dims(), lum(), create(), fetch(), gql(), rec(), status(), terminate()

### Community 20 - "Dressform Collar Setup"
Cohesion: 0.30
Nodes (12): _anchor_points(), build(), _c_table(), _circle(), _collar_setup(), _grid_faces(), _mat(), _new_obj() (+4 more)

### Community 21 - "Embroidery Branch Drawing"
Cohesion: 0.17
Nodes (11): _branch(), _bud(), _catmull(), _dots(), _draw_flat(), _draw_worn(), blossoms(), _kiku() (+3 more)

### Community 22 - "Photo Cutout Pipeline"
Cohesion: 0.14
Nodes (4): cutout(), main(), lum(), parse()

### Community 23 - "Sound Synthesis"
Cohesion: 0.30
Nodes (11): beds(), chalk(), cloth_rustle(), db(), env_adsr(), fft_filter(), footsteps(), norm_rms() (+3 more)

### Community 25 - "Folded Panel Model"
Cohesion: 0.24
Nodes (3): _edge_x(), _Panel, _ss()

### Community 26 - "Shot State Machine"
Cohesion: 0.16
Nodes (8): apply_shot(), _changed(), _members(), set_coords(), set_groups(), set_open(), _shot_pose(), update_exploded()

### Community 28 - "Camera Clip Shots"
Cohesion: 0.29
Nodes (8): smootherstep(), _clip_hall_dusk(), _clip_hall_morning(), _clip_kosode_iko(), lerp(), orbit(), _sway(), _u()

### Community 29 - "Mannequin Ray Tests"
Cohesion: 0.22
Nodes (6): _bisect(), _build_mannequin(), _first_hit(), _grad(), _project(), _surface_nets()

### Community 30 - "Narration Driver"
Cohesion: 0.33
Nodes (6): duration(), main(), norm(), stt(), ts(), tts()

### Community 32 - "Audio Mix and Loudness"
Cohesion: 0.42
Nodes (7): decode(), fade(), loudnorm(), main(), measure(), ts(), write_wav24()

### Community 33 - "Design Image Cropping"
Cohesion: 0.24
Nodes (5): _c(), design_image(), _ground_rgb(), hex_rgb8(), obi_image()

### Community 35 - "Cycles Render Setup"
Cohesion: 0.20
Nodes (6): setup_cycles(), anchors(), _camera(), _main(), shoot(), _test_hall()

### Community 37 - "Trading Market Data"
Cohesion: 0.29
Nodes (10): Market data for the paper-trading worker (README), Boss session, INDEX_SET50.json and INDEX_SET.json (^SET50.BK, ^SET.BK), INTUCH (404, delisted after merger), market-data-2026-11-25.tgz (raw chart JSON archive), Paper-trading worker, yahoo/: 62 SET stocks (10y daily, dividends and splits), TDEX_BK.json: ThaiDEX SET50 ETF (SET50 benchmark) (+2 more)

### Community 38 - "Frame Metadata Export"
Cohesion: 0.39
Nodes (5): found_frames(), lens(), main(), project(), selftest()

### Community 39 - "Pod Run Script"
Cohesion: 0.38
Nodes (6): DEBIAN_FRONTEND, grade_clips(), PATH, retry(), pod_run.sh script, VFX_MAX_PENDING

### Community 42 - "Garment UV Layout"
Cohesion: 0.40
Nodes (3): garment_uv(), okumi_uv(), worn_uv()

### Community 45 - "Pod Boot Script"
Cohesion: 1.00
Nodes (3): log(), pod_boot.sh script, stop_pod()

## Knowledge Gaps
- **34 isolated node(s):** `VFX_MAX_PENDING`, `DEBIAN_FRONTEND`, `PATH`, `Rough grey-box mock-ups per scene`, `graphify knowledge graph` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 318 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `_K` connect `Procedural Bump Textures` to `Blender Lookdev Props`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `VFX_MAX_PENDING`, `DEBIAN_FRONTEND`, `PATH` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Blender Lookdev Props` be split into smaller, more focused modules?**
  _Cohesion score 0.05740740740740741 - nodes in this community are weakly interconnected._
- **Why does `_Mirror` connect `Mirror Drawing Primitives` to `Garment Texture Mapping`, `Embroidery Branch Drawing`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Should `Satit Pitch Script` be split into smaller, more focused modules?**
  _Cohesion score 0.05754527162977867 - nodes in this community are weakly interconnected._
- **Why does `_Canvas` connect `Canvas Drawing Primitives` to `Garment Texture Mapping`, `Embroidery Branch Drawing`, `Design Image Cropping`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Should `Weaving and Bench Geometry` be split into smaller, more focused modules?**
  _Cohesion score 0.06935908691834942 - nodes in this community are weakly interconnected._