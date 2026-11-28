# Graph Report - aia-slides  (2026-11-28)

## Corpus Check
- 178 files · ~216,798 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 97 file(s) not represented in the graph (top: .woff2 58, .ttf 19, (none) 7)
- WARNING: 97 of 275 files seen (35%) have no supported extractor and are missing from this graph entirely. It may look complete while representing only part of the codebase.

## Summary
- 1988 nodes · 4668 edges · 107 communities (85 shown, 22 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 239 edges (avg confidence: 0.86)
- Token cost: 454,248 input · 0 output

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
- Type-1 deck skill
- Platform DB writes
- Unit 4 teacher guide
- Unit 4 slide generators
- KruSlide brief and products
- Platform architecture
- 3D scene camera
- 3D garment materials
- Video compositing
- Asset fetching
- Africa film build and servers
- Deck licensing and watermark
- Unit 4 QA tooling
- Trailer image fetching
- 3D design patterns
- 3D animation easing
- Dressform modelling
- Mesh geometry helpers
- Sort and MCQ widgets
- Font and crypto build utils
- Kimono site builder
- 3D room builders
- Platform smoke tests
- 3D props
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
- _ash_mat / _b_brazier
- _K / bump
- apply_shot / _changed
- bpy / math
- bars / all
- _Canvas / circle
- mocklinemjs / b64url
- devmjs / children
- smootherstep / shotspy
- bmesh / az
- promptpayts / crc16
- _Mirror / circle
- _b_robe_tray / _fold_path
- _b_scroll / disp
- LINE Login for teacher / Public repo no secrets
- wpicto pictogram build / clamp
- previewclipcjs / chromium
- anchors / _camera
- export_metapy / found_frames
- KruSlide App Icon SVG / Blue Diagonal Stroke 3
- g / at
- _B / add
- Readable from the back / unit4qacjs
- self / clear
- line / check
- pod_runsh / DEBIAN_FRONTEND
- geopy / laea
- scipy / photospy
- A half tube over the a / The open part of the w
- Router / add
- makepy / cups
- lockjs / attempt
- garment_uv / okumi_uv
- _anchor_points / _obi_face
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

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 58 edges
2. `html()` - 38 edges
3. `redirect()` - 29 edges
4. `audit()` - 28 edges
5. `idParam()` - 27 edges
6. `Security and bug audit report: Satit prototype website` - 23 edges
7. `sort()` - 22 edges
8. `playwright` - 20 edges
9. `bookPage()` - 20 edges
10. `build()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Pen with auto-shapes (near-straight line snaps straight, loops become circles/rectangles)` --semantically_similar_to--> `Auto shapes for all ink (near-straight strokes snap to lines, loops to circles or rectangles)`  [INFERRED] [semantically similar]
  kruslide/BRIEF.md → teacher-slides/unit4/CONTRACT.md
- `LINE Official Account contact (@kruslide placeholder, TODO-LINE-ID)` --references--> `lineOa()`  [INFERRED]
  kruslide/BRIEF.md → kruslide/platform/src/lib/config.ts
- `Tap-a-choice MCQ widget (.ch.ia[data-mcq], .ok on the right choice)` --references--> `mcq()`  [INFERRED]
  teacher-slides/unit4/CONTRACT.md → teacher-slides/unit4/tools.js
- `w-input typed-answer widget (data-answer, data-accept, data-unit, data-tol)` --references--> `input()`  [INFERRED]
  teacher-slides/unit4/CONTRACT.md → teacher-slides/unit4/tools.js
- `w-bars bar-chart builder (data-answer, data-start)` --references--> `bars()`  [INFERRED]
  teacher-slides/unit4/CONTRACT.md → teacher-slides/unit4/tools.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Type-1 deck toolchain (skill, engine template, QA script)** — _claude_skills_type1_deck_skill, _claude_skills_type1_deck_skill_template_engine, _claude_skills_type1_deck_skill_qa_script [EXTRACTED 0.95]
- **Kimono deck asset pipeline** — hall_scene, gpu_render, met_robe, polyhaven_assets, kimono_deck [INFERRED 0.85]
- **Kimono exhibition content pipeline (brief, room JSON, claims ledger)** — content_brief, content_brief_room_schema, kimono_sources [INFERRED 0.85]
- **Three international standards used to judge both school websites** — satit_site_pitch_script_wcag_2_2_aa, satit_site_pitch_script_owasp_asvs, satit_site_pitch_script_core_web_vitals [EXTRACTED 1.00]
- **Outdated server software exposed in the old site's response headers** — satit_site_pitch_script_server_header_disclosure, satit_site_pitch_script_php_7_3, satit_site_pitch_script_openssl_1_1_1, satit_site_pitch_script_apache_2_4_52 [EXTRACTED 1.00]
- **OWASP ASVS 5.0.0 Level 1 baseline (old 0/3, new 3/3)** — satit_site_pitch_evidence_evidence_speed_asvs_v3_4_1_hsts, satit_site_pitch_evidence_evidence_speed_asvs_v12_2_1_tls, satit_site_pitch_evidence_evidence_speed_asvs_v15_2_1_supported_components, satit_site_pitch_evidence_evidence_speed_owasp_asvs_5_0_0 [EXTRACTED 1.00]
- **WCAG 2.2 criteria checked on the first page (old fails 4, new fails 1)** — satit_site_pitch_evidence_evidence_speed_wcag_1_4_3_contrast, satit_site_pitch_evidence_evidence_speed_wcag_2_4_4_link_purpose, satit_site_pitch_evidence_evidence_speed_wcag_4_1_2_name_role_value, satit_site_pitch_evidence_evidence_speed_wcag_2_5_8_target_size, satit_site_pitch_evidence_evidence_speed_wcag_2_2_aa [EXTRACTED 1.00]
- **Three International Standards Scorecard (accessibility, security, speed)** — satit_site_pitch_script_slide_07_international_standards, satit_site_pitch_script_wcag_2_2_aa, satit_site_pitch_script_owasp_asvs_5_level_1, satit_site_pitch_script_core_web_vitals [EXTRACTED 1.00]
- **Outdated Server to Parent Risk Chain** — satit_site_pitch_script_server_header_disclosure, satit_site_pitch_script_php_7_3, satit_site_pitch_script_openssl_1_1_1, satit_site_pitch_script_apache_2_4_52, satit_site_pitch_script_hsts, satit_site_pitch_script_risk_swapped_fee_qr, satit_site_pitch_script_risk_page_tampering, satit_site_pitch_script_risk_plugin_version_scanning [INFERRED 0.85]
- **New Site Risk Mitigation Plan** — satit_site_pitch_script_slide_11_new_site_risks, satit_site_pitch_script_github_pages, satit_site_pitch_script_two_factor_auth, satit_site_pitch_script_csp, satit_site_pitch_script_pdpa_student_photos, satit_site_pitch_script_free_link_service_qr [EXTRACTED 1.00]
- **Protections added to the Satit prototype this round** — satit_site_pitch_security_report_content_security_policy, satit_site_pitch_security_report_referrer_policy, satit_site_pitch_security_report_wcag_fixes, satit_site_pitch_security_report_performance_fixes [EXTRACTED 1.00]
- **Unit 4 interactive widget markup rendered by tools.js** — teacher_slides_unit4_contract_mcq_choice, teacher_slides_unit4_contract_w_input, teacher_slides_unit4_contract_w_write, teacher_slides_unit4_contract_w_sort, teacher_slides_unit4_contract_w_bars, teacher_slides_unit4_contract_w_line, teacher_slides_unit4_contract_w_pie, teacher_slides_unit4_contract_w_picto, teacher_slides_unit4_contract_w_dots, teacher_slides_unit4_contract_slide_pen, teacher_slides_unit4_tools [EXTRACTED 1.00]
- **Students present first, then step-by-step reveal of the method and answer** — kruslide_brief_step_by_step_reveal, teacher_slides_unit4_contract_students_present_first, teacher_slides_unit4_book_answers_students_present_first, teacher_slides_unit4_book_answers_look_think_why_watch_out, teacher_slides_unit4_contract_graph_builders_start_ready [INFERRED 0.85]
- **Licensed deck delivery: private R2, session check, HTMLRewriter watermark, hash-pinned CSP** — kruslide_platform_readme_private_r2_bucket, kruslide_platform_readme_session_cookie, kruslide_platform_readme_htmlrewriter_watermark, kruslide_platform_readme_deck_csp_hash_pinning, kruslide_platform_src_routes_deck [EXTRACTED 1.00]
- **Nine exercise answer tools students use at the board** — teacher_slides_unit4_guide_guide_tap_a_choice, teacher_slides_unit4_guide_guide_type_an_answer, teacher_slides_unit4_guide_guide_write_with_finger, teacher_slides_unit4_guide_guide_fix_bar_chart, teacher_slides_unit4_guide_guide_sort_the_cards, teacher_slides_unit4_guide_guide_fix_line_graph, teacher_slides_unit4_guide_guide_fill_pie_chart, teacher_slides_unit4_guide_guide_build_pictogram, teacher_slides_unit4_guide_guide_make_dot_plot [EXTRACTED 1.00]
- **One exercise slide routine: show, work, present, check, reveal** — teacher_slides_unit4_guide_guide_teaching_routine, teacher_slides_unit4_guide_guide_answer_tools, teacher_slides_unit4_guide_guide_pen_tool, teacher_slides_unit4_guide_guide_check_show_answer_reset, teacher_slides_unit4_guide_guide_step_reveal [EXTRACTED 1.00]
- **Ways to move through the deck** — teacher_slides_unit4_guide_guide_slide_change_inputs, teacher_slides_unit4_guide_guide_presentation_clicker, teacher_slides_unit4_guide_guide_bottom_bar, teacher_slides_unit4_guide_guide_lesson_menu, teacher_slides_unit4_guide_guide_slide_deep_link [EXTRACTED 1.00]
- **Shapes that together draw the K monogram** — kruslide_brand_kruslide_icon_white_stem_bar, kruslide_brand_kruslide_icon_blue_diagonal_stroke, kruslide_brand_kruslide_icon_gold_pointer_cursor, kruslide_brand_kruslide_icon_k_monogram [INFERRED 0.85]
- **Classroom task / supply icons** — teacher_slides_unit4_symbols_pencil, teacher_slides_unit4_symbols_book, teacher_slides_unit4_symbols_clipboard, teacher_slides_unit4_symbols_ruler [INFERRED 0.75]
- **Recolourable themed illustrations (kid, cup) via CSS variables** — teacher_slides_unit4_symbols_kid, teacher_slides_unit4_symbols_cup, teacher_slides_unit4_symbols_css_variable_theming [EXTRACTED 1.00]

## Communities (107 total, 22 thin omitted)

### Community 0 - "Platform package dependencies"
Cohesion: 0.05
Nodes (60): dependencies, uqr@^0.1.3, description, devDependencies, @cloudflare/vitest-plugin@^1.10.0, @cloudflare/workers-types@^5.20261128.1, playwright@1.63, promptpay-qr@^0.5.0 (+52 more)

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
Cohesion: 0.13
Nodes (51): effectiveStatus(), listBooks(), listPayments(), listPaymentsForTeacher(), listSubscriptions(), listTeachers(), listUnits(), lineOa() (+43 more)

### Community 5 - "Platform PDPA and CRUD"
Cohesion: 0.14
Nodes (51): createUnit(), deleteBook(), getBook(), getSubscriptionById(), getTeacher(), getUnit(), updateUnit(), audit() (+43 more)

### Community 6 - "Kimono museum exhibition"
Cohesion: 0.07
Nodes (39): Audio guide narration (Venice AI TTS), Blender Cycles rendering (bpy), Writers' brief: Kimono, a garment or a set of rules? (BRIEF.md), Online museum exhibition (Edo shoin hall, display wall), The Met collection records (object facts), Room JSON schema (content/rooms/<id>.json), Rooms 0-10 and writers A/B/C, Source number table (4-43, Met) (+31 more)

### Community 7 - "Narration TTS tooling"
Cohesion: 0.08
Nodes (22): AI narration via Venice API text-to-speech, duration(), norm(), score(), speak(), transcribe(), sc(), load_dims() (+14 more)

### Community 8 - "Platform config and auth"
Cohesion: 0.12
Nodes (38): upsertTeacherFromLine(), LIMITS, MAX_UPLOAD_BYTES, OAUTH_COOKIE, OAUTH_TTL, SESSION_COOKIE, SESSION_TTL, clearCookie() (+30 more)

### Community 9 - "Type-1 deck skill"
Cohesion: 0.07
Nodes (34): type1-deck skill (SKILL.md), Narration as animation (data-audio, data-cues, HOLD), scripts/qa.cjs QA script, Rough grey-box mock-ups per scene, template/index.html neutral engine, Thai text rule (self-hosted font, line-height 1.45), Audio guide narration rules (Alice, 35-75 s, never reads screen), graphify knowledge graph (+26 more)

### Community 10 - "Platform DB writes"
Cohesion: 0.07
Nodes (39): AuditRow, BookInput, confirmPayment(), counts(), createBook(), deleteUnit(), ERASED_PREFIX, eraseTeacher() (+31 more)

### Community 11 - "Unit 4 teacher guide"
Cohesion: 0.09
Nodes (38): Unit 4 Statistics (1) Teacher Guide: How to use the slides, M1 answer-key site (m1-answer-key, password-protected, teacher only), Answer tools (interactive exercise widgets), Auto shapes (neaten hand-drawn strokes), Bottom control bar (menu, back, slide number, next, pen, full screen), Build a pictogram (+, half, - icons), Cheat sheet: keys and buttons, Check, Show answer / Hide answer and Reset buttons (+30 more)

### Community 12 - "Unit 4 slide generators"
Cohesion: 0.08
Nodes (24): books(), cups(), f(), rr(), s_bar(), s_double(), mk(), val() (+16 more)

### Community 13 - "KruSlide brief and products"
Cohesion: 0.06
Nodes (31): Answer keys with worked steps + password-locked answer site, Ayutthaya cinematic history trailer (45–60 s, 4K, kruslide/trailer/), Custom school theme (logo and colours on any style), KruSlide explainer video (60–120 s, replaced by the deck), Interactive lesson slides by textbook (main product), KruSlide (ครูสไลด์) brand, LINE Official Account contact (@kruslide placeholder, TODO-LINE-ID), Narrated teaching videos (2D animated or 3D/cinematic) (+23 more)

### Community 14 - "Platform architecture"
Cohesion: 0.10
Nodes (28): D1 (SQLite) state: teachers, books, units, subscriptions, payments, sessions, login attempts, rate limits, audit log, D1 Time Travel restore (30 days) and SQL export backups, Daily cron at 03:17 UTC (expire subscriptions, purge sessions, login attempts, rate counters), Single Cloudflare Worker serving /app/* (sales site on Pages, same domain), Ctx, Env, Unit, fetch() (+20 more)

### Community 15 - "3D scene camera"
Cohesion: 0.10
Nodes (23): clamp01(), apply_frame(), _camera_base(), camera_matrix(), _camera_segments(), camera_state(), ease_walk(), focus_state() (+15 more)

### Community 16 - "3D garment materials"
Cohesion: 0.10
Nodes (22): asset_map(), _band(), _col(), collar_uv(), fabric_material(), _grain(), hall_material(), sstep() (+14 more)

### Community 17 - "Video compositing"
Cohesion: 0.14
Nodes (23): air(), blur(), box(), comp(), _frame(), guided(), lens(), _low() (+15 more)

### Community 18 - "Asset fetching"
Cohesion: 0.12
Nodes (13): fetch(), files(), main(), apply_quality(), frame_list(), main(), main_shots(), parse() (+5 more)

### Community 19 - "Africa film build and servers"
Cohesion: 0.12
Nodes (12): H, beds(), chalk(), cloth_rustle(), db(), env_adsr(), fft_filter(), footsteps() (+4 more)

### Community 20 - "Deck licensing and watermark"
Cohesion: 0.13
Nodes (22): 'Licensed to <teacher · school>' deck mark, Licence watermark injected by HTMLRewriter while streaming the deck, html`` templates escape every value; input validation and bound SQL parameters, b64(), sha256(), sha256hex(), countSlides(), inlineScriptHashes() (+14 more)

### Community 21 - "Unit 4 QA tooling"
Cohesion: 0.11
Nodes (9): lum(), create(), fetch(), gql(), rec(), status(), terminate(), lum() (+1 more)

### Community 22 - "Trailer image fetching"
Cohesion: 0.14
Nodes (17): clean(), get(), main(), write_credits(), AL(), areas(), gallery(), header() (+9 more)

### Community 23 - "3D design patterns"
Cohesion: 0.12
Nodes (16): _branch(), _bud(), _c(), _catmull(), design_image(), _dots(), _draw_flat(), _draw_worn() (+8 more)

### Community 24 - "3D animation easing"
Cohesion: 0.12
Nodes (17): ramp(), smoothstep(), _acc_hung(), _acc_wait(), anchors_world(), hm(), _bolt_pose(), cloth_frame() (+9 more)

### Community 25 - "Dressform modelling"
Cohesion: 0.17
Nodes (18): build(), _build_mannequin(), _c_table(), _circle(), _collar_setup(), _grad(), _grid_faces(), _mat() (+10 more)

### Community 26 - "Mesh geometry helpers"
Cohesion: 0.25
Nodes (20): _close_prof(), _face_normals(), _flip(), _frames(), _panel_uv(), _ramp(), _resample(), _ridge() (+12 more)

### Community 27 - "Sort and MCQ widgets"
Cohesion: 0.16
Nodes (22): w-sort card-sorting widget (data-bins), anim(), announce(), key(), mcq(), pick(), register(), scaleOf() (+14 more)

### Community 28 - "Font and crypto build utils"
Cohesion: 0.11
Nodes (3): sha(), sha(), key()

### Community 29 - "Kimono site builder"
Cohesion: 0.23
Nodes (18): card_html(), check_room(), cites(), rep(), err(), esc(), guide_button(), head_html() (+10 more)

### Community 30 - "3D room builders"
Cohesion: 0.15
Nodes (7): build_byobu(), build_garden(), build_iko(), MB, _obj(), _shrub(), _stone()

### Community 31 - "Platform smoke tests"
Cohesion: 0.12
Nodes (18): check(), dev, env, fitsWidth(), lineLogin(), main(), MOCK, PORT (+10 more)

### Community 32 - "3D props"
Cohesion: 0.15
Nodes (12): s_why(), _b_doc_box_large(), _b_doc_box_small(), _b_zabuton_a(), _b_zabuton_b(), _cord_mat(), _doc_box(), _lin() (+4 more)

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
Cohesion: 0.14
Nodes (12): apply_clay(), box(), build(), build_camera(), build_daylight(), build_dressform(), build_furniture(), build_props() (+4 more)

### Community 38 - "3D hall and floor"
Cohesion: 0.14
Nodes (11): build_floor(), build_hall(), _chodai(), floor_z(), _fusuma(), _fusuma_east(), gold_panel(), plain() (+3 more)

### Community 39 - "Platform seed script"
Cohesion: 0.12
Nodes (11): DECK, dir, FONTS, hashes, HERE, html, markup, now (+3 more)

### Community 40 - "playwright / chromium"
Cohesion: 0.12
Nodes (10): playwright, {chromium}, fs, {chromium}, { chromium, webkit }, fs, {chromium,webkit}, {chromium} (+2 more)

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
Cohesion: 0.14
Nodes (9): B, { chromium }, { execFileSync }, fs, path, vdir, { chromium }, fs (+1 more)

### Community 49 - "ref_path / shotscjs"
Cohesion: 0.13
Nodes (10): { chromium }, fs, out, path, { chromium }, path, { chromium }, path (+2 more)

### Community 50 - "Unit 4 SVG Symbol Libr / Book icon book"
Cohesion: 0.26
Nodes (13): Unit 4 SVG Symbol Library, Book icon (#book), Light bulb icon (#bulb), Check mark icon (#check), Clipboard icon (#clipboard), Cross icon (#cross), Bubble tea cup symbol (#cup), Kid character symbol (#kid) (+5 more)

### Community 51 - "_bisect / _first_hit"
Cohesion: 0.16
Nodes (4): _bisect(), _first_hit(), _Hull, t_of_frame()

### Community 52 - "Interactive slide mech / Pen with autoshapes ne"
Cohesion: 0.15
Nodes (8): Interactive slide mechanics demo (tools.js + parts/_tools-demo.html), Pen with auto-shapes (near-straight line snaps straight, loops become circles/rectangles), Auto shapes for all ink (near-straight strokes snap to lines, loops to circles or rectangles), Tap-a-choice MCQ widget (.ch.ia[data-mcq], .ok on the right choice), w-bars bar-chart builder (data-answer, data-start), w-input typed-answer widget (data-answer, data-accept, data-unit, data-tol), w-line line-graph builder (data-answer, data-start), w-write handwriting box (data-lines)

### Community 53 - "PromptPay transfers co / Manual PromptPay payme"
Cohesion: 0.22
Nodes (11): PromptPay transfers confirmed by owner on admin page (Stripe Thailand later), Manual PromptPay payment (EMVCo QR, 'I have paid', owner confirms in admin), PaymentProvider seam (manual.ts live, stripe.ts stub), Stripe Thailand integration (planned: Checkout Session, webhook signature, PAYMENT_PROVIDER=stripe), PaymentRow, Payment, PaymentProvider, PaymentStart (+3 more)

### Community 54 - "tsconfigjson / compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, noEmit, noUnusedLocals (+5 more)

### Community 55 - "toolsjs / area2"
Cohesion: 0.26
Nodes (9): area2(), dist(), ico(), pathLen(), rdp(), recog(), resample(), say() (+1 more)

### Community 56 - "_capsule / _ell"
Cohesion: 0.22
Nodes (10): _capsule(), _ell(), _ellcyl(), _ellipsoid(), hull_sdf(), mannequin_sdf(), _mirror(), _smax() (+2 more)

### Community 57 - "_edge_x / _Panel"
Cohesion: 0.24
Nodes (3): _edge_x(), _Panel, _ss()

### Community 58 - "_ash_mat / _b_brazier"
Cohesion: 0.22
Nodes (10): _ash_mat(), _b_brazier(), _b_tobacco_tray(), _disc(), _fillet(), m_bamboo(), m_paper(), m_plain() (+2 more)

### Community 60 - "apply_shot / _changed"
Cohesion: 0.16
Nodes (8): apply_shot(), _changed(), _members(), set_coords(), set_groups(), set_open(), _shot_pose(), update_exploded()

### Community 61 - "bpy / math"
Cohesion: 0.22
Nodes (5): apply(), _bounce(), _haze(), _washi(), orbit()

### Community 62 - "bars / all"
Cohesion: 0.27
Nodes (13): bars(), all(), check(), draw(), glide(), reset(), set(), stop() (+5 more)

### Community 64 - "mocklinemjs / b64url"
Cohesion: 0.23
Nodes (10): b64url(), codes, esc(), idToken(), pending, PORT, { privateKey, publicKey }, send() (+2 more)

### Community 65 - "devmjs / children"
Cohesion: 0.20
Nodes (7): children, MOCK_PORT, PORT, run(), stop(), varArgs, vars

### Community 66 - "smootherstep / shotspy"
Cohesion: 0.38
Nodes (7): smootherstep(), _clip_hall_dusk(), _clip_hall_morning(), _clip_kosode_iko(), lerp(), _sway(), _u()

### Community 67 - "bmesh / az"
Cohesion: 0.31
Nodes (7): az(), _lathe(), _nz(), _zabuton(), pos(), prof(), top_z()

### Community 68 - "promptpayts / crc16"
Cohesion: 0.44
Nodes (7): crc16(), f(), maskTarget(), promptPayPayload(), promptPaySvg(), promptPayTarget(), VECTORS

### Community 70 - "_b_robe_tray / _fold_path"
Cohesion: 0.24
Nodes (6): _b_robe_tray(), _fold_path(), m_silk(), _sheet(), _span(), _tray()

### Community 71 - "_b_scroll / disp"
Cohesion: 0.22
Nodes (6): _b_scroll(), disp(), fn(), _grid(), m_brocade(), fn()

### Community 72 - "LINE Login for teacher / Public repo no secrets"
Cohesion: 0.25
Nodes (6): LINE Login for teachers, CSRF protection: session-bound token plus same-origin Origin/Sec-Fetch-Site, LINE Login v2.1 (state, nonce, PKCE S256; ID token HS256 or ES256 via JWKS), Mock LINE local dev (three fictional test users, throwaway random secrets), __Host-ks_session signed HttpOnly session cookie (D1 stores only SHA-256 of the id), Wrangler secrets (LINE_CHANNEL_ID, LINE_CHANNEL_SECRET, SESSION_SECRET, ADMIN_LINE_IDS, PROMPTPAY_ID)

### Community 73 - "wpicto pictogram build / clamp"
Cohesion: 0.36
Nodes (8): w-picto pictogram builder (data-key, data-icon, half icons), clamp(), picto(), all(), draw(), measure(), mk(), set()

### Community 74 - "previewclipcjs / chromium"
Cohesion: 0.22
Nodes (8): { chromium }, dir, { execFileSync }, file, fs, out, path, plan

### Community 75 - "anchors / _camera"
Cohesion: 0.22
Nodes (5): anchors(), _camera(), _main(), shoot(), _test_hall()

### Community 76 - "export_metapy / found_frames"
Cohesion: 0.39
Nodes (5): found_frames(), lens(), main(), project(), selftest()

### Community 77 - "KruSlide App Icon SVG / Blue Diagonal Stroke 3"
Cohesion: 0.32
Nodes (8): KruSlide App Icon (SVG), Blue Diagonal Stroke (#3D7BFF), KruSlide Icon Palette (navy #1C2A55, blue #3D7BFF, gold #FFC83D, white), Gold Pointer Cursor (#FFC83D), K Monogram Mark, KruSlide (brand name), Navy Rounded-Square Tile (#1C2A55), White Vertical Stem Bar

### Community 78 - "g / at"
Cohesion: 0.36
Nodes (3): g, local(), toClient()

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

### Community 88 - "makepy / cups"
Cohesion: 0.60
Nodes (3): cups(), dotplot(), slides()

### Community 89 - "lockjs / attempt"
Cohesion: 0.60
Nodes (3): attempt(), open(), unlock()

### Community 90 - "garment_uv / okumi_uv"
Cohesion: 0.40
Nodes (3): garment_uv(), okumi_uv(), worn_uv()

### Community 91 - "_anchor_points / _obi_face"
Cohesion: 0.40
Nodes (3): _anchor_points(), _obi_face(), _obi_level()

### Community 93 - "pod_bootsh / log"
Cohesion: 1.00
Nodes (3): log(), pod_boot.sh script, stop_pod()

## Knowledge Gaps
- **83 isolated node(s):** `VFX_MAX_PENDING`, `DEBIAN_FRONTEND`, `PATH`, `Rough grey-box mock-ups per scene`, `graphify knowledge graph` (+78 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 560 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Self-contained deck requirement (inline script only, no on… handlers, no external URLs)` connect `Font and crypto build utils` to `Deck licensing and watermark`?**
  _High betweenness centrality (0.163) - this node is a cross-community bridge._
- **What connects `VFX_MAX_PENDING`, `DEBIAN_FRONTEND`, `PATH` to the rest of the system?**
  _83 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Platform package dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05308641975308642 - nodes in this community are weakly interconnected._
- **Why does `Deck CSP pinned to SHA-256 of its inline script with connect-src 'none'` connect `Deck licensing and watermark` to `Font and crypto build utils`?**
  _High betweenness centrality (0.163) - this node is a cross-community bridge._
- **Should `Satit pitch script and security` be split into smaller, more focused modules?**
  _Cohesion score 0.05754527162977867 - nodes in this community are weakly interconnected._
- **Should `Kimono 3D weaving utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.06820119352088662 - nodes in this community are weakly interconnected._
- **Should `Satit evidence pack standards` be split into smaller, more focused modules?**
  _Cohesion score 0.06196291270918137 - nodes in this community are weakly interconnected._