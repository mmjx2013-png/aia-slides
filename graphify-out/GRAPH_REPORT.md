# Graph Report - aia-slides  (2026-11-27)

## Corpus Check
- 96 files · ~178,241 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 82 file(s) not represented in the graph (top: .woff2 47, .ttf 19, (none) 5)
- WARNING: 82 of 191 files seen (43%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 1335 nodes · 2896 edges · 80 communities (61 shown, 19 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 169 edges (avg confidence: 0.85)
- Token cost: 482,496 input · 0 output

## Graph Freshness
- Built from commit: `dda1fc6b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Blender Lookdev Props
- Satit Pitch Script
- Weaving and Bench Geometry
- Speed Evidence and Security Report
- Render and Asset Pipeline
- Kimono Exhibition Content
- scripts/qa.cjs
- satit-site/build.py
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
- sys
- Dressform Collar Setup
- Embroidery Branch Drawing
- photos.py
- Sound Synthesis
- Procedural Bump Textures
- Folded Panel Model
- Shot State Machine
- Canvas Drawing Primitives
- Camera Clip Shots
- Mannequin Ray Tests
- json
- Pod File Server
- gen30.py
- Design Image Cropping
- Mirror Drawing Primitives
- Cycles Render Setup
- Hull Ray Tables
- Trading Market Data
- Frame Metadata Export
- Pod Run Script
- unit4/build.py
- Sleeve Geometry
- Garment UV Layout
- Ink
- Pod Boot Script
- sort
- Market Data Fetch Script
- Face Orientation Fix
- Site Deploy Script
- Deck Deploy Script
- Repo README
- tools.test.cjs
- tools.js
- dots
- make2.py
- engine.js
- evidence.py
- pie
- gen35.py
- ref_playwright
- line
- lookdev.py
- ref_path
- picto
- ref_fs
- preview-clip.cjs
- bars
- register
- Unit 4 deck: rules for every agent
- self
- unit4/qa.cjs
- rec.js
- make.py
- lock.js
- BOOK-ANSWERS.md
- README.md
- fetch_fund_prices.sh

## God Nodes (most connected - your core abstractions)
1. `Security and bug audit report: Satit prototype website` - 23 edges
2. `sort()` - 21 edges
3. `update()` - 20 edges
4. `build()` - 20 edges
5. `Evidence Pack: Is the new Satit website really faster than the old one?` - 20 edges
6. `_b_scroll()` - 19 edges
7. `Pitch Script: Why Satit School Should Have a New Website` - 19 edges
8. `el()` - 18 edges
9. `Ink()` - 17 edges
10. `dots()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Owner feedback on finished kimono deck (25 Nov)` --semantically_similar_to--> `Kimono deck lessons (boxy panels, static, overlap, slider bug)`  [INFERRED] [semantically similar]
  MEMORY.md → .claude/skills/type1-deck/SKILL.md
- `Source number table (4-43, Met)` --semantically_similar_to--> `Ledger sources table (4-43)`  [INFERRED] [semantically similar]
  content/BRIEF.md → kimono-sources.md
- `No AI, just Blender principle` --semantically_similar_to--> `Lessons: few shots, extreme detail, too perfect reads fake`  [INFERRED] [semantically similar]
  three_d/README.md → PRESENTATION-STYLES.md
- `build_hall()` --indirect_call--> `T()`  [INFERRED]
  three_d/scene.py → satit-site/build.py
- `Rooms 0-10 and writers A/B/C` --conceptually_related_to--> `Ledger Room 10: The answer (rules list, 390 rules, both)`  [INFERRED]
  content/BRIEF.md → kimono-sources.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Type-1 deck toolchain (skill, engine template, QA script)** — _claude_skills_type1_deck_skill, _claude_skills_type1_deck_skill_template_engine, _claude_skills_type1_deck_skill_qa_script [EXTRACTED 0.95]
- **OWASP ASVS 5.0.0 Level 1 baseline (old 0/3, new 3/3)** — satit_site_pitch_evidence_evidence_speed_asvs_v3_4_1_hsts, satit_site_pitch_evidence_evidence_speed_asvs_v12_2_1_tls, satit_site_pitch_evidence_evidence_speed_asvs_v15_2_1_supported_components, satit_site_pitch_evidence_evidence_speed_owasp_asvs_5_0_0 [EXTRACTED 1.00]
- **Protections added to the Satit prototype this round** — satit_site_pitch_security_report_content_security_policy, satit_site_pitch_security_report_referrer_policy, satit_site_pitch_security_report_wcag_fixes, satit_site_pitch_security_report_performance_fixes [EXTRACTED 1.00]
- **Three International Standards Scorecard (accessibility, security, speed)** — satit_site_pitch_script_slide_07_international_standards, satit_site_pitch_script_wcag_2_2_aa, satit_site_pitch_script_owasp_asvs_5_level_1, satit_site_pitch_script_core_web_vitals [EXTRACTED 1.00]
- **New Site Risk Mitigation Plan** — satit_site_pitch_script_slide_11_new_site_risks, satit_site_pitch_script_github_pages, satit_site_pitch_script_two_factor_auth, satit_site_pitch_script_csp, satit_site_pitch_script_pdpa_student_photos, satit_site_pitch_script_free_link_service_qr [EXTRACTED 1.00]
- **Outdated server software exposed in the old site's response headers** — satit_site_pitch_script_server_header_disclosure, satit_site_pitch_script_php_7_3, satit_site_pitch_script_openssl_1_1_1, satit_site_pitch_script_apache_2_4_52 [EXTRACTED 1.00]
- **Three international standards used to judge both school websites** — satit_site_pitch_script_wcag_2_2_aa, satit_site_pitch_script_owasp_asvs, satit_site_pitch_script_core_web_vitals [EXTRACTED 1.00]
- **Market datasets bundled for the paper-trading worker** — trading_data_readme_set_stocks, trading_data_readme_yahoo_gold, trading_data_readme_index_set50, trading_data_readme_tdex_bk [EXTRACTED 1.00]
- **WCAG 2.2 criteria checked on the first page (old fails 4, new fails 1)** — satit_site_pitch_evidence_evidence_speed_wcag_1_4_3_contrast, satit_site_pitch_evidence_evidence_speed_wcag_2_4_4_link_purpose, satit_site_pitch_evidence_evidence_speed_wcag_4_1_2_name_role_value, satit_site_pitch_evidence_evidence_speed_wcag_2_5_8_target_size, satit_site_pitch_evidence_evidence_speed_wcag_2_2_aa [EXTRACTED 1.00]
- **Kimono deck asset pipeline** — hall_scene, gpu_render, met_robe, polyhaven_assets, kimono_deck [INFERRED 0.85]
- **Kimono exhibition content pipeline (brief, room JSON, claims ledger)** — content_brief, content_brief_room_schema, kimono_sources [INFERRED 0.85]
- **Outdated Server to Parent Risk Chain** — satit_site_pitch_script_server_header_disclosure, satit_site_pitch_script_php_7_3, satit_site_pitch_script_openssl_1_1_1, satit_site_pitch_script_apache_2_4_52, satit_site_pitch_script_hsts, satit_site_pitch_script_risk_swapped_fee_qr, satit_site_pitch_script_risk_page_tampering, satit_site_pitch_script_risk_plugin_version_scanning [INFERRED 0.85]

## Communities (80 total, 19 thin omitted)

### Community 0 - "Blender Lookdev Props"
Cohesion: 0.07
Nodes (42): _ash_mat(), _B, _b_brazier(), az(), _b_doc_box_large(), _b_doc_box_small(), _b_robe_tray(), _b_scroll() (+34 more)

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

### Community 6 - "scripts/qa.cjs"
Cohesion: 0.12
Nodes (11): args, BROWSER, { execFileSync }, fs, http, OUT, path, pw (+3 more)

### Community 7 - "satit-site/build.py"
Cohesion: 0.18
Nodes (13): AL(), areas(), gallery(), header(), link(), IMG(), ncard(), nextp() (+5 more)

### Community 8 - "Scene Camera and Racks"
Cohesion: 0.10
Nodes (23): clamp01(), apply_frame(), _camera_base(), camera_matrix(), _camera_segments(), camera_state(), ease_walk(), focus_state() (+15 more)

### Community 9 - "Garment Texture Mapping"
Cohesion: 0.10
Nodes (22): asset_map(), _band(), _col(), collar_uv(), fabric_material(), _grain(), hall_material(), sstep() (+14 more)

### Community 10 - "Type-1 Deck Skill"
Cohesion: 0.10
Nodes (19): type1-deck skill (SKILL.md), Narration as animation (data-audio, data-cues, HOLD), scripts/qa.cjs QA script, Rough grey-box mock-ups per scene, template/index.html neutral engine, Thai text rule (self-hosted font, line-height 1.45), Audio guide narration rules (Alice, 35-75 s, never reads screen), graphify knowledge graph (+11 more)

### Community 11 - "Easing and Anchor Maths"
Cohesion: 0.12
Nodes (17): ramp(), smoothstep(), _acc_hung(), _acc_wait(), anchors_world(), hm(), _bolt_pose(), cloth_frame() (+9 more)

### Community 12 - "Exhibition Site Builder"
Cohesion: 0.23
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

### Community 19 - "sys"
Cohesion: 0.14
Nodes (9): lum(), create(), fetch(), gql(), rec(), status(), terminate(), lum() (+1 more)

### Community 20 - "Dressform Collar Setup"
Cohesion: 0.30
Nodes (12): _anchor_points(), build(), _c_table(), _circle(), _collar_setup(), _grid_faces(), _mat(), _new_obj() (+4 more)

### Community 21 - "Embroidery Branch Drawing"
Cohesion: 0.19
Nodes (12): s_why(), _branch(), _bud(), _catmull(), _dots(), _draw_flat(), _draw_worn(), blossoms() (+4 more)

### Community 23 - "Sound Synthesis"
Cohesion: 0.20
Nodes (18): decode(), fade(), loudnorm(), main(), measure(), ts(), write_wav24(), beds() (+10 more)

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

### Community 30 - "json"
Cohesion: 0.12
Nodes (8): load_dims(), respell(), duration(), main(), norm(), stt(), ts(), tts()

### Community 32 - "gen30.py"
Cohesion: 0.14
Nodes (17): books(), cups(), f(), rr(), s_bar(), s_double(), mk(), val() (+9 more)

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

### Community 40 - "unit4/build.py"
Cohesion: 0.13
Nodes (3): sha(), sha(), key()

### Community 42 - "Garment UV Layout"
Cohesion: 0.40
Nodes (3): garment_uv(), okumi_uv(), worn_uv()

### Community 43 - "Ink"
Cohesion: 0.18
Nodes (21): area2(), dist(), Ink(), add(), changed(), clearLive(), endMorph(), erase() (+13 more)

### Community 45 - "Pod Boot Script"
Cohesion: 1.00
Nodes (3): log(), pod_boot.sh script, stop_pod()

### Community 47 - "sort"
Cohesion: 0.17
Nodes (20): on(), anim(), announce(), pick(), set(), scaleOf(), sort(), check() (+12 more)

### Community 54 - "tools.test.cjs"
Cohesion: 0.19
Nodes (15): { chromium }, CONFIGS, digit0(), digit2(), handCircle(), handRect(), handTri(), letterS() (+7 more)

### Community 55 - "tools.js"
Cohesion: 0.20
Nodes (14): btn(), el(), graph(), ico(), num(), pen(), sep(), sync() (+6 more)

### Community 56 - "dots"
Cohesion: 0.18
Nodes (13): axes(), dots(), check(), cx(), draw(), reset(), set(), drawLabels() (+5 more)

### Community 57 - "make2.py"
Cohesion: 0.32
Nodes (15): bars(), bell_dots(), choices(), clock(), cup(), cups(), donut(), dotplot() (+7 more)

### Community 58 - "engine.js"
Cohesion: 0.19
Nodes (12): closeMenu(), count(), fit(), jump(), lessonOf(), menu(), menuOpen(), next() (+4 more)

### Community 59 - "evidence.py"
Cohesion: 0.16
Nodes (7): fmt(), items(), lhr(), med(), panel(), bar(), wc_cell()

### Community 60 - "pie"
Cohesion: 0.24
Nodes (15): answerCtl(), clean(), fmt(), input(), check(), mark(), match(), reset() (+7 more)

### Community 61 - "gen35.py"
Cohesion: 0.23
Nodes (7): f(), fr_icon(), lab2(), polar(), seg(), spoke(), trseg()

### Community 62 - "ref_playwright"
Cohesion: 0.18
Nodes (5): {chromium}, {chromium,webkit}, {chromium}, {chromium}, pw

### Community 63 - "line"
Cohesion: 0.33
Nodes (11): line(), check(), draw(), glide(), reset(), set(), stop(), still() (+3 more)

### Community 64 - "lookdev.py"
Cohesion: 0.27
Nodes (4): apply(), _bounce(), _haze(), _washi()

### Community 65 - "ref_path"
Cohesion: 0.20
Nodes (6): { chromium }, path, { chromium }, path, { chromium }, path

### Community 66 - "picto"
Cohesion: 0.31
Nodes (9): clamp(), picto(), all(), check(), draw(), measure(), mk(), set() (+1 more)

### Community 67 - "ref_fs"
Cohesion: 0.22
Nodes (4): {chromium}, fs, { chromium, webkit }, fs

### Community 68 - "preview-clip.cjs"
Cohesion: 0.22
Nodes (8): { chromium }, dir, { execFileSync }, file, fs, out, path, plan

### Community 69 - "bars"
Cohesion: 0.42
Nodes (9): bars(), all(), check(), draw(), glide(), reset(), set(), stop() (+1 more)

### Community 70 - "register"
Cohesion: 0.31
Nodes (4): g, key(), mcq(), register()

### Community 71 - "Unit 4 deck: rules for every agent"
Cohesion: 0.29
Nodes (6): Hard rules, How to check your work (repeat until clean), Interactive tools (markup → tools.js renders it; all have Check / Show answer / Reset where it makes sense), Order and presenting (owner, 27 Nov), Unit 4 deck: rules for every agent, width()

### Community 73 - "unit4/qa.cjs"
Cohesion: 0.33
Nodes (5): { chromium }, file, fs, out, path

### Community 74 - "rec.js"
Cohesion: 0.40
Nodes (3): { chromium }, fs, { spawn }

### Community 75 - "make.py"
Cohesion: 0.60
Nodes (3): cups(), dotplot(), slides()

### Community 76 - "lock.js"
Cohesion: 0.60
Nodes (3): attempt(), open(), unlock()

## Knowledge Gaps
- **34 isolated node(s):** `DEBIAN_FRONTEND`, `PATH`, `VFX_MAX_PENDING`, `Apache 2.4.52 (latest 2.4.71)`, `ASVS V12.2.1: No Unencrypted HTTP` (+29 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 393 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Piece` connect `Kimono Pieces Mesh` to `Scene Camera and Racks`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `DEBIAN_FRONTEND`, `PATH`, `VFX_MAX_PENDING` to the rest of the system?**
  _34 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Blender Lookdev Props` be split into smaller, more focused modules?**
  _Cohesion score 0.06583850931677018 - nodes in this community are weakly interconnected._
- **Why does `MB` connect `Garden and Byobu Builders` to `Scene Camera and Racks`, `Hall and Fusuma Builders`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Should `Satit Pitch Script` be split into smaller, more focused modules?**
  _Cohesion score 0.05754527162977867 - nodes in this community are weakly interconnected._
- **Why does `_ss()` connect `Folded Panel Model` to `Sleeve Geometry`, `Dressform Obi Geometry`, `Dressform Hull SDF`, `Dressform Collar Setup`, `Mannequin Ray Tests`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Should `Weaving and Bench Geometry` be split into smaller, more focused modules?**
  _Cohesion score 0.0710085933966531 - nodes in this community are weakly interconnected._