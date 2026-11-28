# Graph Report - aia-slides  (2026-11-28)

## Corpus Check
- 186 files · ~274,410 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 166 file(s) not represented in the graph (top: .woff2 122, .ttf 19, .css 10)
- WARNING: 166 of 377 files seen (44%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 2468 nodes · 5928 edges · 140 communities (113 shown, 27 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 303 edges (avg confidence: 0.85)
- Token cost: 936,744 input · 0 output

## Graph Freshness
- Built from commit: `f3f821d3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Platform package dependencies
- Satit pitch script and security
- Kimono 3D weaving utilities
- Satit evidence pack standards
- Platform DB list queries
- Platform PDPA and CRUD
- Kimono museum exhibition
- Narration TTS tooling
- Platform config and auth
- SIL Open Font License 1.1
- Platform DB writes
- Unit 4 teacher guide
- Unit 4 slide generators
- Wikimedia Commons (source of every trailer image)
- Platform architecture
- 3D scene camera
- 3D garment materials
- Video compositing
- Asset fetching
- subprocess
- Inter font licence (OFL-1.1 and Apache-2.0, Debian copyright format)
- photos.py
- trailer/render.py
- 3D design patterns
- 3D animation easing
- Dressform modelling
- Mesh geometry helpers
- Sort and MCQ widgets
- Font and crypto build utils
- Kimono site builder
- 3D room builders
- Platform smoke tests
- props.py
- Tools test suite
- Garment pieces
- Fund price data
- Deck engine
- 3D scene assembly
- 3D hall and floor
- Platform seed script
- playwright / chromium
- make2py / bars
- wdots dotplot builder / axes
- wpie pie builder type  / answerCtl
- Ink / add
- scriptsqacjs / args
- Wholeslide pen  button / on
- csv / statistics
- ref / ref_child_process
- ref_path / shotscjs
- Unit 4 SVG Symbol Libr / Book icon book
- _bisect / _first_hit
- Interactive slide mech / Pen with autoshapes ne
- PromptPay transfers co / Manual PromptPay payme
- tsconfigjson / compilerOptions
- toolsjs / area2
- _capsule / _ell
- _edge_x / _Panel
- admin.ts
- _K / bump
- apply_shot / _changed
- bpy / math
- bars / all
- _Canvas / circle
- mocklinemjs / b64url
- devmjs / children
- smootherstep / shotspy
- map.js
- promptpayts / crc16
- _Mirror / circle
- sys
- slides.mjs
- Wrangler secrets (LINE_CHANNEL_ID, LINE_CHANNEL_SECRET, SESSION_SECRET, ADMIN_LINE_IDS, PROMPTPAY_ID)
- wpicto pictogram build / clamp
- previewclipcjs / chromium
- anchors / _camera
- calc.js
- KruSlide App Icon SVG / Blue Diagonal Stroke 3
- g / at
- package.json
- Readable from the back / unit4qacjs
- self / clear
- line / check
- pod_runsh / DEBIAN_FRONTEND
- geopy / laea
- requests.ts
- _Sleeve
- Router / add
- makepy / cups
- lockjs / attempt
- src/tools.js
- qa.py
- pod_bootsh / log
- fetch_latestsh / get
- deploysh / deploysh script
- deploy_decksh / deploy_decksh script
- Slide style B notebook
- Slide style C infograp
- Original synthesised m
- READMEmd AIA slides
- Book order Lesson  Exe
- Lesson opener slide sn
- 19201080 stage with 92
- el
- audio.py
- src/engine.js
- sort
- finish.py
- static.ts
- sv
- dots
- ref_fs
- Book answer walkthrough slides (same items and numbers, own words, redrawn in Style A)
- Ink
- gen35.py
- KruSlide (ครูสไลด์) brand
- line
- bars
- MEMORY.md shared memory
- scripts
- input
- Type-1 deck workflow (7 steps)
- intro
- P
- cards.js
- self
- .__init__
- draw
- g
- Kimono deck lessons (boxy panels, static, overlap, slider bug)
- แคลคูลัส ม.6: ตัวอย่างบทเรียน KruSlide (8 สไลด์)
- Anim
- uqr
- photos/CREDITS.md

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 67 edges
2. `html()` - 54 edges
3. `redirect()` - 35 edges
4. `audit()` - 32 edges
5. `idParam()` - 31 edges
6. `icon()` - 29 edges
7. `page()` - 26 edges
8. `home()` - 23 edges
9. `Security and bug audit report: Satit prototype website` - 23 edges
10. `playwright` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Pen with auto-shapes (near-straight line snaps straight, loops become circles/rectangles)` --semantically_similar_to--> `Auto shapes for all ink (near-straight strokes snap to lines, loops to circles or rectangles)`  [INFERRED] [semantically similar]
  kruslide/BRIEF.md → teacher-slides/unit4/CONTRACT.md
- `Owner feedback on finished kimono deck (25 Nov)` --semantically_similar_to--> `Kimono deck lessons (boxy panels, static, overlap, slider bug)`  [INFERRED] [semantically similar]
  MEMORY.md → .claude/skills/type1-deck/SKILL.md
- `LINE Official Account contact (@kruslide placeholder, TODO-LINE-ID)` --references--> `lineOa()`  [INFERRED]
  kruslide/BRIEF.md → kruslide/platform/src/lib/config.ts
- `Tap-a-choice MCQ widget (.ch.ia[data-mcq], .ok on the right choice)` --references--> `mcq()`  [INFERRED]
  teacher-slides/unit4/CONTRACT.md → teacher-slides/unit4/tools.js
- `w-input typed-answer widget (data-answer, data-accept, data-unit, data-tol)` --references--> `input()`  [INFERRED]
  teacher-slides/unit4/CONTRACT.md → teacher-slides/unit4/tools.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Type-1 deck toolchain (skill, engine template, QA script)** — _claude_skills_type1_deck_skill, _claude_skills_type1_deck_skill_template_engine, _claude_skills_type1_deck_skill_qa_script [EXTRACTED 0.95]
- **OWASP ASVS 5.0.0 Level 1 baseline (old 0/3, new 3/3)** — satit_site_pitch_evidence_evidence_speed_asvs_v3_4_1_hsts, satit_site_pitch_evidence_evidence_speed_asvs_v12_2_1_tls, satit_site_pitch_evidence_evidence_speed_asvs_v15_2_1_supported_components, satit_site_pitch_evidence_evidence_speed_owasp_asvs_5_0_0 [EXTRACTED 1.00]
- **Licensed deck delivery: private R2, session check, HTMLRewriter watermark, hash-pinned CSP** — kruslide_platform_readme_private_r2_bucket, kruslide_platform_readme_session_cookie, kruslide_platform_readme_htmlrewriter_watermark, kruslide_platform_readme_deck_csp_hash_pinning, kruslide_platform_src_routes_deck [EXTRACTED 1.00]
- **Protections added to the Satit prototype this round** — satit_site_pitch_security_report_content_security_policy, satit_site_pitch_security_report_referrer_policy, satit_site_pitch_security_report_wcag_fixes, satit_site_pitch_security_report_performance_fixes [EXTRACTED 1.00]
- **Three International Standards Scorecard (accessibility, security, speed)** — satit_site_pitch_script_slide_07_international_standards, satit_site_pitch_script_wcag_2_2_aa, satit_site_pitch_script_owasp_asvs_5_level_1, satit_site_pitch_script_core_web_vitals [EXTRACTED 1.00]
- **New Site Risk Mitigation Plan** — satit_site_pitch_script_slide_11_new_site_risks, satit_site_pitch_script_github_pages, satit_site_pitch_script_two_factor_auth, satit_site_pitch_script_csp, satit_site_pitch_script_pdpa_student_photos, satit_site_pitch_script_free_link_service_qr [EXTRACTED 1.00]
- **Outdated server software exposed in the old site's response headers** — satit_site_pitch_script_server_header_disclosure, satit_site_pitch_script_php_7_3, satit_site_pitch_script_openssl_1_1_1, satit_site_pitch_script_apache_2_4_52 [EXTRACTED 1.00]
- **Three international standards used to judge both school websites** — satit_site_pitch_script_wcag_2_2_aa, satit_site_pitch_script_owasp_asvs, satit_site_pitch_script_core_web_vitals [EXTRACTED 1.00]
- **Nine exercise answer tools students use at the board** — teacher_slides_unit4_guide_guide_tap_a_choice, teacher_slides_unit4_guide_guide_type_an_answer, teacher_slides_unit4_guide_guide_write_with_finger, teacher_slides_unit4_guide_guide_fix_bar_chart, teacher_slides_unit4_guide_guide_sort_the_cards, teacher_slides_unit4_guide_guide_fix_line_graph, teacher_slides_unit4_guide_guide_fill_pie_chart, teacher_slides_unit4_guide_guide_build_pictogram, teacher_slides_unit4_guide_guide_make_dot_plot [EXTRACTED 1.00]
- **Ways to move through the deck** — teacher_slides_unit4_guide_guide_slide_change_inputs, teacher_slides_unit4_guide_guide_presentation_clicker, teacher_slides_unit4_guide_guide_bottom_bar, teacher_slides_unit4_guide_guide_lesson_menu, teacher_slides_unit4_guide_guide_slide_deep_link [EXTRACTED 1.00]
- **One exercise slide routine: show, work, present, check, reveal** — teacher_slides_unit4_guide_guide_teaching_routine, teacher_slides_unit4_guide_guide_answer_tools, teacher_slides_unit4_guide_guide_pen_tool, teacher_slides_unit4_guide_guide_check_show_answer_reset, teacher_slides_unit4_guide_guide_step_reveal [EXTRACTED 1.00]
- **Recolourable themed illustrations (kid, cup) via CSS variables** — teacher_slides_unit4_symbols_kid, teacher_slides_unit4_symbols_cup, teacher_slides_unit4_symbols_css_variable_theming [EXTRACTED 1.00]
- **Unit 4 interactive widget markup rendered by tools.js** — teacher_slides_unit4_contract_mcq_choice, teacher_slides_unit4_contract_w_input, teacher_slides_unit4_contract_w_write, teacher_slides_unit4_contract_w_sort, teacher_slides_unit4_contract_w_bars, teacher_slides_unit4_contract_w_line, teacher_slides_unit4_contract_w_pie, teacher_slides_unit4_contract_w_picto, teacher_slides_unit4_contract_w_dots, teacher_slides_unit4_contract_slide_pen, teacher_slides_unit4_tools [EXTRACTED 1.00]
- **WCAG 2.2 criteria checked on the first page (old fails 4, new fails 1)** — satit_site_pitch_evidence_evidence_speed_wcag_1_4_3_contrast, satit_site_pitch_evidence_evidence_speed_wcag_2_4_4_link_purpose, satit_site_pitch_evidence_evidence_speed_wcag_4_1_2_name_role_value, satit_site_pitch_evidence_evidence_speed_wcag_2_5_8_target_size, satit_site_pitch_evidence_evidence_speed_wcag_2_2_aa [EXTRACTED 1.00]
- **Classroom task / supply icons** — teacher_slides_unit4_symbols_pencil, teacher_slides_unit4_symbols_book, teacher_slides_unit4_symbols_clipboard, teacher_slides_unit4_symbols_ruler [INFERRED 0.75]
- **Kimono deck asset pipeline** — hall_scene, gpu_render, met_robe, polyhaven_assets, kimono_deck [INFERRED 0.85]
- **Kimono exhibition content pipeline (brief, room JSON, claims ledger)** — content_brief, content_brief_room_schema, kimono_sources [INFERRED 0.85]
- **Shapes that together draw the K monogram** — kruslide_brand_kruslide_icon_white_stem_bar, kruslide_brand_kruslide_icon_blue_diagonal_stroke, kruslide_brand_kruslide_icon_gold_pointer_cursor, kruslide_brand_kruslide_icon_k_monogram [INFERRED 0.85]
- **Students present first, then step-by-step reveal of the method and answer** — kruslide_brief_step_by_step_reveal, teacher_slides_unit4_contract_students_present_first, teacher_slides_unit4_book_answers_students_present_first, teacher_slides_unit4_book_answers_look_think_why_watch_out, teacher_slides_unit4_contract_graph_builders_start_ready [INFERRED 0.85]
- **Outdated Server to Parent Risk Chain** — satit_site_pitch_script_server_header_disclosure, satit_site_pitch_script_php_7_3, satit_site_pitch_script_openssl_1_1_1, satit_site_pitch_script_apache_2_4_52, satit_site_pitch_script_hsts, satit_site_pitch_script_risk_swapped_fee_qr, satit_site_pitch_script_risk_page_tampering, satit_site_pitch_script_risk_plugin_version_scanning [INFERRED 0.85]

## Communities (140 total, 27 thin omitted)

### Community 0 - "Platform package dependencies"
Cohesion: 0.06
Nodes (58): b64(), countSlides(), inlineScriptHashes(), looksLikeHtmlDocument(), esc(), resetJwksCache(), answerEn(), Answers (+50 more)

### Community 1 - "Satit pitch script and security"
Cohesion: 0.06
Nodes (68): Pitch script: why the Satit school needs a new website, Apache 2.4.52 (latest 2.4.71), ASVS V12.2.1 (no unencrypted http access), ASVS V12.2.1: No Unencrypted HTTP, ASVS V15.2.1 (supported software components), ASVS V15.2.1: Supported Software Components, ASVS V3.4.1 (HSTS at least 1 year), ASVS V3.4.1: Enforce HTTPS via HSTS (>=1 year) (+60 more)

### Community 2 - "Kimono 3D weaving utilities"
Cohesion: 0.07
Nodes (40): hex_rgb(), setup_cycles(), arc(), build_bench(), build_bolt(), build_loom(), R(), S() (+32 more)

### Community 3 - "Satit evidence pack standards"
Cohesion: 0.06
Nodes (60): Evidence Pack: Is the new Satit website really faster than the old one?, ASVS V12.2.1 TLS always, no unencrypted access, ASVS V13.4.6 Do not disclose server software versions, ASVS V15.2.1 Components within support period, ASVS V3.4.1 HSTS for at least 1 year (IETF RFC 6797), ASVS V3.4.3 Content-Security-Policy against injected scripts, ASVS V3.4.4 X-Content-Type-Options: nosniff, axe-core 4.14 (+52 more)

### Community 4 - "Platform DB list queries"
Cohesion: 0.12
Nodes (43): html`` templates escape every value; input validation and bound SQL parameters, effectiveStatus(), listMyRequests(), listUnits(), lineOa(), MAP, part(), raw() (+35 more)

### Community 5 - "Platform PDPA and CRUD"
Cohesion: 0.13
Nodes (53): createUnit(), deleteBook(), getBook(), getTeacher(), getUnit(), updateUnit(), audit(), checkCsrf() (+45 more)

### Community 6 - "Kimono museum exhibition"
Cohesion: 0.07
Nodes (39): Audio guide narration (Venice AI TTS), Blender Cycles rendering (bpy), Writers' brief: Kimono, a garment or a set of rules? (BRIEF.md), Online museum exhibition (Edo shoin hall, display wall), The Met collection records (object facts), Room JSON schema (content/rooms/<id>.json), Rooms 0-10 and writers A/B/C, Source number table (4-43, Met) (+31 more)

### Community 7 - "Narration TTS tooling"
Cohesion: 0.09
Nodes (15): AI narration via Venice API text-to-speech, duration(), norm(), score(), speak(), transcribe(), sc(), load_dims() (+7 more)

### Community 8 - "Platform config and auth"
Cohesion: 0.09
Nodes (49): LINE Login for teachers, CSRF protection: session-bound token plus same-origin Origin/Sec-Fetch-Site, LINE Login v2.1 (state, nonce, PKCE S256; ID token HS256 or ES256 via JWKS), __Host-ks_session signed HttpOnly session cookie (D1 stores only SHA-256 of the id), upsertTeacherFromLine(), Env, isProduction(), LIMITS (+41 more)

### Community 9 - "SIL Open Font License 1.1"
Cohesion: 0.27
Nodes (11): Anuphan font licence, KruSlide brand copy (SIL OFL 1.1, fontsource 5.3.0), Trailer fonts: Anuphan and Inter (SIL Open Font License), Anuphan font licence (SIL OFL 1.1), IBM Plex Sans Thai font licence (SIL OFL 1.1), SIL Open Font License 1.1, Bricolage Grotesque font licence (SIL OFL 1.1, ateliertriay/bricolage, 2022), Instrument Sans font licence (SIL OFL 1.1, Instrument/instrument-sans, 2022), Nothing You Could Do font licence (SIL OFL 1.1, Kimberly Geswein, 2010) (+3 more)

### Community 10 - "Platform DB writes"
Cohesion: 0.05
Nodes (53): Server-side price = slide_count × rate (3–5 baht), never taken from the form, AdminRequestRow, answersFor(), AuditRow, BookInput, confirmPayment(), counts(), createBook() (+45 more)

### Community 11 - "Unit 4 teacher guide"
Cohesion: 0.09
Nodes (38): Unit 4 Statistics (1) Teacher Guide: How to use the slides, M1 answer-key site (m1-answer-key, password-protected, teacher only), Answer tools (interactive exercise widgets), Auto shapes (neaten hand-drawn strokes), Bottom control bar (menu, back, slide number, next, pen, full screen), Build a pictogram (+, half, - icons), Cheat sheet: keys and buttons, Check, Show answer / Hide answer and Reset buttons (+30 more)

### Community 12 - "Unit 4 slide generators"
Cohesion: 0.13
Nodes (17): books(), cups(), f(), rr(), s_bar(), s_double(), mk(), val() (+9 more)

### Community 13 - "Wikimedia Commons (source of every trailer image)"
Cohesion: 0.14
Nodes (13): Ayutthaya cinematic history trailer (45–60 s, 4K, kruslide/trailer/), KruSlide explainer video (60–120 s, replaced by the deck), Narrated teaching videos (2D animated or 3D/cinematic), Pa Sak River in Ayutthaya photograph (CC BY-SA 4.0), Map of the island city 'Judia', François Valentijn 1726 (public domain), View of Iudea (Ayutthaya) painting, Johannes Vingboons c. 1662, Rijksmuseum (CC0), Dutch VOC chart of the lower Chao Phraya with ships, c. 1635 (public domain), Wat Chaiwatthanaram photographs (drone, reflection, dusk; CC BY-SA) (+5 more)

### Community 14 - "Platform architecture"
Cohesion: 0.12
Nodes (22): D1 (SQLite) state: teachers, books, units, subscriptions, payments, sessions, login attempts, rate limits, audit log, D1 Time Travel restore (30 days) and SQL export backups, Daily cron at 03:17 UTC (expire subscriptions, purge sessions, login attempts, rate counters), Single Cloudflare Worker serving /app/* (sales site on Pages, same domain), expireDue(), housekeeping(), Ctx, fetch() (+14 more)

### Community 15 - "3D scene camera"
Cohesion: 0.11
Nodes (19): clamp01(), _camera_base(), camera_matrix(), _camera_segments(), camera_state(), ease_walk(), focus_state(), _focus_subject() (+11 more)

### Community 16 - "3D garment materials"
Cohesion: 0.10
Nodes (21): asset_map(), _band(), _col(), collar_uv(), fabric_material(), _grain(), hall_material(), hdri_path() (+13 more)

### Community 17 - "Video compositing"
Cohesion: 0.14
Nodes (23): air(), blur(), box(), comp(), _frame(), guided(), lens(), _low() (+15 more)

### Community 18 - "Asset fetching"
Cohesion: 0.11
Nodes (11): found_frames(), lens(), main(), project(), selftest(), fetch(), files(), main() (+3 more)

### Community 19 - "subprocess"
Cohesion: 0.21
Nodes (18): decode(), fade(), loudnorm(), main(), measure(), ts(), write_wav24(), beds() (+10 more)

### Community 20 - "Inter font licence (OFL-1.1 and Apache-2.0, Debian copyright format)"
Cohesion: 0.24
Nodes (9): Inter font licence, KruSlide brand copy (OFL-1.1 and Apache-2.0), Cloudflare hosting (Pages site, Workers back end, D1 database, private R2 decks), 'Licensed to <teacher · school>' deck mark, Self-hosted Anuphan (Thai) and Inter fonts from teacher-slides/unit4/fonts, Licence watermark injected by HTMLRewriter while streaming the deck, Inter font licence (OFL-1.1 and Apache-2.0, Debian copyright format), Apache License 2.0 (Inter dual licence), Debian fonts-inter packaging files (GPL-2+) (+1 more)

### Community 21 - "photos.py"
Cohesion: 0.12
Nodes (5): lum(), cutout(), main(), lum(), parse()

### Community 22 - "trailer/render.py"
Cohesion: 0.11
Nodes (27): apply_card(), build_lut(), camera(), card(), card_opacity(), crop_matrix(), ease(), encode_range() (+19 more)

### Community 23 - "3D design patterns"
Cohesion: 0.12
Nodes (17): s_why(), _branch(), _bud(), _c(), _catmull(), design_image(), _dots(), _draw_flat() (+9 more)

### Community 24 - "3D animation easing"
Cohesion: 0.11
Nodes (19): ramp(), smoothstep(), _acc_hung(), _acc_wait(), anchors_world(), hm(), _bolt_pose(), cloth_frame() (+11 more)

### Community 25 - "Dressform modelling"
Cohesion: 0.16
Nodes (15): build(), _build_mannequin(), _c_table(), _circle(), _collar_setup(), _grid_faces(), _mat(), _new_obj() (+7 more)

### Community 26 - "Mesh geometry helpers"
Cohesion: 0.23
Nodes (20): _anchor_points(), _close_prof(), _face_normals(), _flip(), _frames(), _obi_face(), _obi_level(), _ramp() (+12 more)

### Community 27 - "Sort and MCQ widgets"
Cohesion: 0.16
Nodes (22): w-sort card-sorting widget (data-bins), anim(), announce(), key(), mcq(), pick(), register(), scaleOf() (+14 more)

### Community 28 - "Font and crypto build utils"
Cohesion: 0.08
Nodes (4): sha(), sha(), sha(), key()

### Community 29 - "Kimono site builder"
Cohesion: 0.18
Nodes (20): IMG(), page(), card_html(), check_room(), cites(), rep(), err(), esc() (+12 more)

### Community 30 - "3D room builders"
Cohesion: 0.11
Nodes (11): box(), build_byobu(), build_furniture(), build_garden(), build_iko(), build_robe(), MB, _obj() (+3 more)

### Community 31 - "Platform smoke tests"
Cohesion: 0.13
Nodes (22): check(), decoded(), dev, env, fitsWidth(), imagesLoaded(), inDays(), lineLogin() (+14 more)

### Community 32 - "props.py"
Cohesion: 0.07
Nodes (42): _ash_mat(), _B, _b_brazier(), az(), _b_doc_box_large(), _b_doc_box_small(), _b_robe_tray(), _b_scroll() (+34 more)

### Community 33 - "Tools test suite"
Cohesion: 0.19
Nodes (15): { chromium }, CONFIGS, digit0(), digit2(), handCircle(), handRect(), handTri(), letterS() (+7 more)

### Community 34 - "Garment pieces"
Cohesion: 0.12
Nodes (10): build_pieces(), _collar_path(), _flat_main(), grid_mesh(), Piece, _rebuild_uvf(), _seam_list(), _uv_garment() (+2 more)

### Community 35 - "Fund price data"
Cohesion: 0.16
Nodes (17): fetch_fund_prices.sh script, Market data for the paper-trading worker (README), Boss session, Ticker file naming: dots and '=' become '_' (BRK.B -> BRK_B.json, THB=X -> THB_X.json), fund-latest.tgz (weekly 1y daily prices for fund holdings and watch list), fund-prices-2026-11-27.tgz (yahoo-fund/: 5y daily for 200 screened tickers plus benchmarks), trading/fund/screen.csv (200 tickers, claude/paper-trading @4de9c05), INDEX_SET50.json and INDEX_SET.json (^SET50.BK, ^SET.BK) (+9 more)

### Community 36 - "Deck engine"
Cohesion: 0.18
Nodes (13): Meaningful animation system (.in stagger, beats data-steps/.g1–.g4, .grow, .draw, .segd, .pop/.drop, data-count), closeMenu(), count(), fit(), jump(), lessonOf(), menu(), menuOpen() (+5 more)

### Community 37 - "3D scene assembly"
Cohesion: 0.20
Nodes (8): apply_clay(), build(), build_camera(), build_daylight(), build_dressform(), build_props(), _coll(), cylinder()

### Community 38 - "3D hall and floor"
Cohesion: 0.14
Nodes (11): build_floor(), build_hall(), _chodai(), floor_z(), _fusuma(), _fusuma_east(), gold_panel(), plain() (+3 more)

### Community 39 - "Platform seed script"
Cohesion: 0.08
Nodes (21): HERE, only, OUT, tmp, PAIRS, bulk(), DECK, dir (+13 more)

### Community 40 - "playwright / chromium"
Cohesion: 0.18
Nodes (6): playwright, {chromium}, {chromium,webkit}, {chromium}, {chromium}, pw

### Community 41 - "make2py / bars"
Cohesion: 0.32
Nodes (15): bars(), bell_dots(), choices(), clock(), cup(), cups(), donut(), dotplot() (+7 more)

### Community 42 - "wdots dotplot builder / axes"
Cohesion: 0.18
Nodes (12): w-dots dot-plot builder, axes(), dots(), check(), cx(), draw(), reset(), set() (+4 more)

### Community 43 - "wpie pie builder type  / answerCtl"
Cohesion: 0.20
Nodes (17): w-pie pie builder (type angles or percent), answerCtl(), clean(), fmt(), input(), check(), mark(), match() (+9 more)

### Community 44 - "Ink / add"
Cohesion: 0.26
Nodes (17): Ink(), add(), changed(), clearLive(), endMorph(), erase(), finish(), fit() (+9 more)

### Community 45 - "scriptsqacjs / args"
Cohesion: 0.12
Nodes (11): args, BROWSER, { execFileSync }, fs, http, OUT, path, pw (+3 more)

### Community 46 - "Wholeslide pen  button / on"
Cohesion: 0.17
Nodes (13): Whole-slide pen (✎ button or P key), on(), btn(), el(), foot(), api, pen(), sep() (+5 more)

### Community 47 - "csv / statistics"
Cohesion: 0.16
Nodes (7): fmt(), items(), lhr(), med(), panel(), bar(), wc_cell()

### Community 48 - "ref / ref_child_process"
Cohesion: 0.17
Nodes (9): B, { chromium }, { execFileSync }, fs, path, vdir, { chromium }, fs (+1 more)

### Community 49 - "ref_path / shotscjs"
Cohesion: 0.20
Nodes (6): { chromium }, path, { chromium }, path, { chromium }, path

### Community 50 - "Unit 4 SVG Symbol Libr / Book icon book"
Cohesion: 0.26
Nodes (13): Unit 4 SVG Symbol Library, Book icon (#book), Light bulb icon (#bulb), Check mark icon (#check), Clipboard icon (#clipboard), Cross icon (#cross), Bubble tea cup symbol (#cup), Kid character symbol (#kid) (+5 more)

### Community 52 - "Interactive slide mech / Pen with autoshapes ne"
Cohesion: 0.15
Nodes (8): Interactive slide mechanics demo (tools.js + parts/_tools-demo.html), Pen with auto-shapes (near-straight line snaps straight, loops become circles/rectangles), Auto shapes for all ink (near-straight strokes snap to lines, loops to circles or rectangles), Tap-a-choice MCQ widget (.ch.ia[data-mcq], .ok on the right choice), w-bars bar-chart builder (data-answer, data-start), w-input typed-answer widget (data-answer, data-accept, data-unit, data-tol), w-line line-graph builder (data-answer, data-start), w-write handwriting box (data-lines)

### Community 53 - "PromptPay transfers co / Manual PromptPay payme"
Cohesion: 0.22
Nodes (11): PromptPay transfers confirmed by owner on admin page (Stripe Thailand later), Manual PromptPay payment (EMVCo QR, 'I have paid', owner confirms in admin), PaymentProvider seam (manual.ts live, stripe.ts stub), Stripe Thailand integration (planned: Checkout Session, webhook signature, PAYMENT_PROVIDER=stripe), PaymentRow, Payment, PaymentProvider, paymentProvider() (+3 more)

### Community 54 - "tsconfigjson / compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, noEmit, noUnusedLocals (+5 more)

### Community 55 - "toolsjs / area2"
Cohesion: 0.26
Nodes (9): area2(), dist(), ico(), pathLen(), rdp(), recog(), resample(), say() (+1 more)

### Community 56 - "_capsule / _ell"
Cohesion: 0.24
Nodes (11): _capsule(), _ell(), _ellcyl(), _ellipsoid(), hull_sdf(), mannequin_sdf(), _mirror(), _show() (+3 more)

### Community 57 - "_edge_x / _Panel"
Cohesion: 0.24
Nodes (3): _edge_x(), _Panel, _ss()

### Community 58 - "admin.ts"
Cohesion: 0.17
Nodes (39): listBooks(), listPayments(), listRequests(), listSubscriptions(), listTeachers(), html(), oneOf(), ADMIN_STATUSES (+31 more)

### Community 60 - "apply_shot / _changed"
Cohesion: 0.16
Nodes (10): apply_frame(), apply_shot(), _changed(), _members(), _paper_nodes(), place_props(), set_groups(), set_light() (+2 more)

### Community 61 - "bpy / math"
Cohesion: 0.27
Nodes (4): apply(), _bounce(), _haze(), _washi()

### Community 62 - "bars / all"
Cohesion: 0.27
Nodes (13): bars(), all(), check(), draw(), glide(), reset(), set(), stop() (+5 more)

### Community 64 - "mocklinemjs / b64url"
Cohesion: 0.21
Nodes (10): b64url(), codes, esc(), idToken(), pending, PORT, { privateKey, publicKey }, send() (+2 more)

### Community 65 - "devmjs / children"
Cohesion: 0.20
Nodes (8): Mock LINE local dev (three fictional test users, throwaway random secrets), children, MOCK_PORT, PORT, run(), stop(), varArgs, vars

### Community 66 - "smootherstep / shotspy"
Cohesion: 0.29
Nodes (8): smootherstep(), _clip_hall_dusk(), _clip_hall_morning(), _clip_kosode_iko(), lerp(), orbit(), _sway(), _u()

### Community 67 - "map.js"
Cohesion: 0.14
Nodes (30): cam(), catmull(), chedi(), clone(), draw(), fallbackGlobe(), getV(), inView() (+22 more)

### Community 68 - "promptpayts / crc16"
Cohesion: 0.44
Nodes (7): crc16(), f(), maskTarget(), promptPayPayload(), promptPaySvg(), promptPayTarget(), VECTORS

### Community 70 - "sys"
Cohesion: 0.14
Nodes (17): clean(), get(), main(), write_credits(), apply_quality(), frame_list(), main(), main_shots() (+9 more)

### Community 71 - "slides.mjs"
Cohesion: 0.18
Nodes (25): animStrip(), barChart(), baseCss(), burst(), chart(), chartq(), check(), DATA (+17 more)

### Community 73 - "wpicto pictogram build / clamp"
Cohesion: 0.36
Nodes (8): w-picto pictogram builder (data-key, data-icon, half icons), clamp(), picto(), all(), draw(), measure(), mk(), set()

### Community 74 - "previewclipcjs / chromium"
Cohesion: 0.22
Nodes (8): { chromium }, dir, { execFileSync }, file, fs, out, path, plan

### Community 75 - "anchors / _camera"
Cohesion: 0.22
Nodes (5): anchors(), _camera(), _main(), shoot(), _test_hall()

### Community 76 - "calc.js"
Cohesion: 0.10
Nodes (14): arc(), drag(), drawTrail(), eio(), frame(), go(), gp(), lim() (+6 more)

### Community 77 - "KruSlide App Icon SVG / Blue Diagonal Stroke 3"
Cohesion: 0.32
Nodes (8): KruSlide App Icon (SVG), Blue Diagonal Stroke (#3D7BFF), KruSlide Icon Palette (navy #1C2A55, blue #3D7BFF, gold #FFC83D, white), Gold Pointer Cursor (#FFC83D), K Monogram Mark, KruSlide (brand name), Navy Rounded-Square Tile (#1C2A55), White Vertical Stem Bar

### Community 78 - "g / at"
Cohesion: 0.36
Nodes (3): g, local(), toClient()

### Community 79 - "package.json"
Cohesion: 0.11
Nodes (22): description, devDependencies, @cloudflare/vitest-plugin@^1.10.0, @cloudflare/workers-types@^5.20261128.1, @fontsource/mali@^5.3.0, @fontsource/sriracha@^5.3.0, playwright@1.63, promptpay-qr@^0.5.0 (+14 more)

### Community 80 - "Readable from the back / unit4qacjs"
Cohesion: 0.29
Nodes (5): { chromium }, file, fs, out, path

### Community 82 - "line / check"
Cohesion: 0.62
Nodes (7): line(), check(), draw(), glide(), reset(), set(), stop()

### Community 83 - "pod_runsh / DEBIAN_FRONTEND"
Cohesion: 0.38
Nodes (6): DEBIAN_FRONTEND, grade_clips(), PATH, retry(), pod_run.sh script, VFX_MAX_PENDING

### Community 84 - "geopy / laea"
Cohesion: 0.53
Nodes (4): laea(), P(), path(), rings()

### Community 85 - "requests.ts"
Cohesion: 0.18
Nodes (20): getAnswers(), scriptCsp(), answerTh(), imagePath(), question(), rateLimit(), answer(), bangkokDate() (+12 more)

### Community 86 - "_Sleeve"
Cohesion: 0.15
Nodes (7): garment_uv(), okumi_uv(), worn_uv(), _panel_uv(), _ridge(), _Sleeve, _worn_uv_np()

### Community 88 - "makepy / cups"
Cohesion: 0.60
Nodes (3): cups(), dotplot(), slides()

### Community 89 - "lockjs / attempt"
Cohesion: 0.60
Nodes (3): attempt(), open(), unlock()

### Community 90 - "src/tools.js"
Cohesion: 0.17
Nodes (13): area2(), dist(), graph(), num(), pathLen(), rawIcon(), rdp(), recog() (+5 more)

### Community 91 - "qa.py"
Cohesion: 0.15
Nodes (12): NODE_PATH, build.sh script, build(), prepare_voice(), cards(), contact_sheet(), frames_at(), log() (+4 more)

### Community 93 - "pod_bootsh / log"
Cohesion: 1.00
Nodes (3): log(), pod_boot.sh script, stop_pod()

### Community 107 - "el"
Cohesion: 0.18
Nodes (17): btn(), clamp(), el(), foot(), api, ico(), pen(), sep() (+9 more)

### Community 108 - "audio.py"
Cohesion: 0.22
Nodes (15): chord_expr(), env(), ff(), gong_expr(), impact_expr(), lavfi_eval(), loudnorm(), make_bed() (+7 more)

### Community 109 - "src/engine.js"
Cohesion: 0.19
Nodes (12): closeMenu(), count(), fit(), jump(), lessonOf(), menu(), menuOpen(), next() (+4 more)

### Community 110 - "sort"
Cohesion: 0.24
Nodes (15): scaleOf(), sort(), check(), drop(), fitBins(), mark(), move(), place() (+7 more)

### Community 111 - "finish.py"
Cohesion: 0.15
Nodes (5): ff(), mux(), poster(), web(), H

### Community 112 - "static.ts"
Cohesion: 0.16
Nodes (8): QUIZ_FILES, font(), quizImage(), APPLE_ICON_B64, ICON_INNER, ICON_SVG, APP_CSS, APP_JS

### Community 113 - "sv"
Cohesion: 0.20
Nodes (13): dial(), S(), axes(), drawLabels(), fmt(), pie(), draw(), layout() (+5 more)

### Community 114 - "dots"
Cohesion: 0.17
Nodes (14): on(), announce(), dots(), check(), cx(), draw(), reset(), set() (+6 more)

### Community 115 - "ref_fs"
Cohesion: 0.14
Nodes (8): { chromium }, fs, out, path, {chromium}, fs, { chromium, webkit }, fs

### Community 116 - "Book answer walkthrough slides (same items and numbers, own words, redrawn in Style A)"
Cohesion: 0.19
Nodes (9): Slide style A: modern clean, Unit 4 live deck (m1-statistics) and teacher guide, Kindly flag ambiguous or wrong book answers ('Book answer: … · Note: …'), Source chip naming the book item (e.g. 'Book p.200 · Unit 4 Test · Part 1 · Q7–8'), Math Solution M1 Book 2, Unit 4 Statistics (1) textbook, Quality bar: title slide parts/00-title.html and mockups/style-A.png, Speaker notes in <aside class="notes"> on every slide, Style A 'modern clean' (style.css, .mesh light background, white cards, blue/violet/coral/sun/mint/ink palette) (+1 more)

### Community 117 - "Ink"
Cohesion: 0.37
Nodes (13): Ink(), add(), changed(), clearLive(), endMorph(), erase(), finish(), fit() (+5 more)

### Community 118 - "gen35.py"
Cohesion: 0.23
Nodes (7): f(), fr_icon(), lab2(), polar(), seg(), spoke(), trseg()

### Community 119 - "KruSlide (ครูสไลด์) brand"
Cohesion: 0.17
Nodes (9): Answer keys with worked steps + password-locked answer site, Custom school theme (logo and colours on any style), Interactive lesson slides by textbook (main product), KruSlide (ครูสไลด์) brand, LINE Official Account contact (@kruslide placeholder, TODO-LINE-ID), KruSlide price list (THB, owner-approved), Satit PBRU school site and pitch deck (live work), School websites and presentation decks (+1 more)

### Community 120 - "line"
Cohesion: 0.30
Nodes (12): anim(), line(), check(), draw(), glide(), reset(), set(), stop() (+4 more)

### Community 121 - "bars"
Cohesion: 0.36
Nodes (10): bars(), all(), check(), draw(), glide(), reset(), set(), stop() (+2 more)

### Community 122 - "MEMORY.md shared memory"
Cohesion: 0.28
Nodes (7): type1-deck skill (SKILL.md), graphify knowledge graph, MEMORY.md shared memory, How the owner works, Kimono presentation project (done 25 Nov 2026), Project log, Presentations rules (type 1 vs type 2, no wall-of-text site)

### Community 123 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, deploy, dev, migrate:local, migrate:remote, seed, smoke, test (+1 more)

### Community 124 - "input"
Cohesion: 0.36
Nodes (9): answerCtl(), clean(), input(), check(), mark(), match(), reset(), parseNum() (+1 more)

### Community 125 - "Type-1 deck workflow (7 steps)"
Cohesion: 0.29
Nodes (7): Narration as animation (data-audio, data-cues, HOLD), scripts/qa.cjs QA script, Rough grey-box mock-ups per scene, template/index.html neutral engine, Audio guide narration rules (Alice, 35-75 s, never reads screen), Tools that work (Pages, Venice TTS, RunPod, bpy, film, graphify), Venice TTS (tts-elevenlabs-turbo-v2-5, voice Alice)

### Community 126 - "intro"
Cohesion: 0.29
Nodes (8): F(), FS(), icon(), intro(), PHOTO(), photoChip(), stallIllustration(), u()

### Community 127 - "P"
Cohesion: 0.39
Nodes (3): plot(), P, T()

### Community 128 - "cards.js"
Cohesion: 0.25
Nodes (5): { chromium }, fs, outDir, path, tl

### Community 130 - ".__init__"
Cohesion: 0.33
Nodes (4): _bisect(), _first_hit(), _grad(), _project()

### Community 131 - "draw"
Cohesion: 0.47
Nodes (6): clamp(), draw(), exact(), line(), num(), setH()

### Community 134 - "แคลคูลัส ม.6: ตัวอย่างบทเรียน KruSlide (8 สไลด์)"
Cohesion: 0.40
Nodes (4): Files, QA done, The slides (what to say, what to do), แคลคูลัส ม.6: ตัวอย่างบทเรียน KruSlide (8 สไลด์)

### Community 135 - "Anim"
Cohesion: 0.40
Nodes (5): Anim(), f(), fly(), land(), still()

### Community 137 - "uqr"
Cohesion: 0.67
Nodes (3): dependencies, uqr@^0.1.3, uqr

## Knowledge Gaps
- **84 isolated node(s):** `NODE_PATH`, `VFX_MAX_PENDING`, `DEBIAN_FRONTEND`, `PATH`, `Apache 2.4.52 (latest 2.4.71)` (+79 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 663 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `playwright` connect `playwright / chromium` to `cards.js`, `Tools test suite`, `Platform seed script`, `previewclipcjs / chromium`, `scriptsqacjs / args`, `package.json`, `ref / ref_child_process`, `ref_path / shotscjs`, `Readable from the back / unit4qacjs`, `ref_fs`, `Platform smoke tests`?**
  _High betweenness centrality (0.218) - this node is a cross-community bridge._
- **What connects `NODE_PATH`, `VFX_MAX_PENDING`, `DEBIAN_FRONTEND` to the rest of the system?**
  _84 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Platform package dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.057703081232493 - nodes in this community are weakly interconnected._
- **Why does `S()` connect `sv` to `ref / ref_child_process`, `wpie pie builder type  / answerCtl`, `calc.js`, `P`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Should `Satit pitch script and security` be split into smaller, more focused modules?**
  _Cohesion score 0.05754527162977867 - nodes in this community are weakly interconnected._
- **Why does `build.sh script` connect `qa.py` to `cards.js`, `sys`, `audio.py`, `finish.py`, `trailer/render.py`?**
  _High betweenness centrality (0.164) - this node is a cross-community bridge._
- **Should `Kimono 3D weaving utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.0697980684811238 - nodes in this community are weakly interconnected._