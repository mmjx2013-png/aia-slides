# MEMORY.md: shared memory for every Claude chat

Every Claude session that works for this repository's owner reads this file first and updates it before finishing.
This repository is PUBLIC: never write secrets, keys, e-mail addresses, personal details or private documents here.

## How the owner works
- Reply in Thai, short: 3 lines or fewer, with an image when there is one.
- Be independent, not a yes-man: disagree when you have a reason, and propose better ideas.
- New project: ask until you are confident (topic, audience, length, deadline, style), using option questions.
- Before building anything visual: for EACH scene/slide, make 2 or 3 quick, rough mock-ups in different directions, with no rendering (grey boxes, placeholder text, plain HTML/CSS screenshots or sketches). Show them as images. The owner picks one per scene; only then build it properly.
- During a project: solve problems on the spot, then report. Within the budget the owner set, act first and tell them after.
- When supervising other sessions: short updates about every 30 minutes, with images.
- Watch Claude usage. Leave the owner at least 3% of the weekly quota. Say so before a large spend.
- Models: Fable or Opus for anything people will see and for important backend work. Sonnet only for mechanical work.
- Cheap options first (for example, RunPod Community GPUs; several GPUs are fine).
- Comparisons and claims: judge only by international standards (WCAG 2.2 = ISO/IEC 40500:2025, OWASP ASVS 5.0, IETF RFCs; Core Web Vitals labelled as Google's, not ISO). Never use rules we made up; they look unfair.
- Security and quality: "fix until it passes everything". Run a red team (independent agents) and a bug audit before calling a site done.

## Presentations
- For any presentation, use the skill `.claude/skills/type1-deck` (SKILL.md): it holds the type-1 workflow, a neutral engine template, and a QA script. Reach the example's level; never imitate it.
- "Type 1" = perfect, "type 2" = minimum acceptable. Both are defined in PRESENTATION-STYLES.md, with the type-1 reference in reference/from-brand-to-place-cinematic.html.
- Never deliver a scrolling website that is a wall of text. If the owner says "presentation", build slides.
- Lessons from the kimono project:
  - A few shots with extreme detail beat many shots.
  - Too-perfect images read as fake.
  - Light must look real (VFX/CG comp).
  - No film mode unless asked.
  - Use 3D as a virtual camera.
  - Downloaded CC0/CC BY models are fine.
- Owner feedback on the finished kimono deck (25 Nov), to apply next time:
  - Big opaque text boxes over the photo look ugly and hide the object. Put text on the image with a soft scrim, or beside the object.
  - Wants much more animation on every slide (drawn lines, counting numbers, moving diagrams, parallax), not mostly static panels.
  - Auto-advance / film: never change slide the moment the voice stops. Hold the slide after the narration and the last animation have finished.
  - No video next time. Build slides where the narration is part of the animation (voice and motion cued together), and the viewer can touch and drag things.
  - Interactions must really work. The kimono "No AI. Just Blender" before/after slider could only be dragged around the middle; it should drag across the whole image and reveal the bare 3D model.
  - Every brief sent to a worker session attaches the type-1 example (reference/from-brand-to-place-cinematic.html) as the QUALITY BAR, and says: reach this level, but do not imitate it. Match its content and slide craft, with the deck's own look. The kimono result was nowhere near it.
  - The background stays visible, and every slide is different (no repeated layouts): that is what makes it striking, not boring.
  - Animation must be creative and tied to the idea, not simple left-right or top-down swipes.
  - It shipped with visible bugs (overlapping text). Do a QA pass that screenshots every beat of every slide before calling it done.

## Tools that work
- Hosting: GitHub Pages from branch gh-pages at https://mmjx2013-png.github.io/aia-slides/
- Voice: Venice API TTS, model tts-elevenlabs-turbo-v2-5, voice "Alice". The key is proxy-injected; ask with request_credential if missing.
- GPU: RunPod via the GraphQL API at api.runpod.io (rest.runpod.io returns 502 through the proxy). Launcher: tools/pod_launch.py.
- 3D: `pip install bpy` (Blender 5.3) for Cycles on CPU; GPU renders on RunPod.
- Deck to film: tools/film/rec.js records the deck's own film mode (served over http on port 8765) with the page clock slowed 3x, so a headless 4-CPU box still gets ~30 fps; tools/film/mux.py lays in the narration at -16 LUFS and keeps the MP4 under GitHub's 100 MB limit.
- Thai PDFs: write HTML (inline SVG for diagrams) and print it with Playwright page.pdf(); Thai font Sarabun comes from npm (`npm pack @fontsource/sarabun`), because raw GitHub font URLs return 403 here. Never ReportLab for Thai (bad vowel/tone-mark shaping).
- Knowledge graph: graphify (`pip install graphifyy && graphify install`). Query with `graphify query "<question>"`. After editing code, run `graphify update .`.

## Projects
- Kimono presentation: DONE (25 Nov 2026).
  - 19-slide type-1 deck, live at the URL above.
  - Source is on branch claude/fervent-ramanujan-qp1d26: read HANDOFF.md there.
  - Film version (7.5 min, 1080p): https://mmjx2013-png.github.io/aia-slides/film/
  - Still untested: Safari, and a person listening to the narration.
- School website redesign (owner's portfolio project): Satit PBRU, the demonstration school of Phetchaburi Rajabhat University.
  - Direction C (big photos, white frosted glass) in a light tone, with a little of B (bento tiles). TH/EN; audience: parents; deliver a working site plus design images; no deadline.
  - Source in satit-site/ on branch claude/fervent-ramanujan-qp1d26; live at https://mmjx2013-png.github.io/aia-slides/satit/
  - pbru.ac.th blocks cloud IPs and Facebook needs a login: get content and photos from the owner, or via their Mac (Remote Control).
  - Never invent school facts: mark them pending.
  - EDIT satit-site/build.py and satit-site/src/ (photos.json, about-values.html), then run `python3 build.py`. The build adds a CSP with the hash of its one inline script, rebuilds every photo tag from checked attributes, and refuses inline handlers or javascript: URLs. Never hand-edit the generated *.html: the next build overwrites it. 42 school photos (from the school's Facebook page, used with the school's permission) are in satit-site/img/fb/.
  - Pitch deck (13 slides) in satit-site/pitch: edit src.html or deck.css, then `python3 build_deck.py` (splices the engine and hashes the scripts into a CSP). Speaker script: pitch/script.md and script.pdf. Speed evidence: pitch/evidence/ (Lighthouse reports, runs.csv, PDF); PDF generators in tools/satit-pdf/.
  - Security state (25 Nov): red team found nothing critical or high; WCAG 2.2 AA has no automated violations on 16 pages. Header-only items (frame-ancestors, nosniff) need a host that sends headers: satit-site/_headers is ready for Cloudflare Pages or Netlify.
- Gold paper-trading desk (owner's request, 25 Nov): PAPER ONLY, branch claude/paper-trading (trading/, trading/intraday/).
  - Phase 1 verdict: 1M USD in a year is not realistic (Monte Carlo: P ~ 0, 30-100x leverage = 100% liquidation); simple rules did not beat gold buy-and-hold; AI desk +2% vs gold -12% over 21 weekly decisions (too few to prove skill).
  - Intraday (1m) desk RETIRED 26 Nov: 9-month search showed no 1m/15m/1h setup edge after costs (cost ~0.13 R/trade); AI replay: Opus entered 0/32 setups (stated p ~0.40, realised 0.25 = overconfident).
  - Now (owner delegated portfolio decisions to the boss, paper only): SWING desk in trading/swing/ (session "Gold paper desk (daily, small)"), 4h wakes 03:10/07:10/11:10/15:10/19:10/23:10 Bangkok + Sat 03:10, one Opus PM call per wake when a decision is possible; code risk: 1% risk/trade, daily -3% / weekly -6% halts, -10% kill switch, flat before USD High events and the weekend. Code-only 15m candidate book runs alongside. Owner wants reports only at 21:00 or in the morning (21:02 report trigger).
  - Yahoo returns 429 to fresh cloud containers; Binance api.binance.com is geo-blocked (451), use data-api.binance.vision.
  - Owner wants real money from Mon 30 Nov. Advice given: not proven; if they go anyway, only money they can lose, <=3x, licensed broker, owner places orders, stop at -10%. Never connect an AI to a real-money account.
- Next: a new type-1 presentation, built by Opus with no 3D models. Topic, audience, length and deadline are not given yet: ask.

## Log (newest first; one line each; date, what, where)
- 2026-11-27: US news/gap test (|gap| >= 5%, 37 single stocks, entry at the gap-day close): no stable edge. Gap-down next-day rebound was +2.6% excess in 2016-22 but -0.8% in 2023-26; the 20-day drifts are not significant out of sample. US news trading also needs speed, which a hand-placed order cannot give. Gold news desk stays on paper.
- 2026-11-27: leverage test (daily rebalanced, 6%/y financing): MU 1x +41%/y DD -58%, 2x +40%/y DD -88%, 3x +3%/y DD -100%, 5x+ wiped; QQQ best at 2-3x (+25%/y) but DD -65 to -83%; the overnight strategy with 3x leverage is -84 to -90%/y. Told the owner leverage does not fix a strategy without an edge.
- 2026-11-27: owner sent worksheet photos (linear equations, ex. 7-9) and asked for a lesson "for someone with no idea": made a 9-page Thai PDF from zero (graph as a map, y = mx + c, drawing lines, systems = intersection, worked answers incl. 9.1: y = x - 3 and y = -6x + 4 meet at (1, -2)); then a separate 4-page PDF for 9.1 only (why the crossing is the answer, step-by-step comic panels, table check, balance-scale algebra, model answer).
- 2026-11-27: memory makers (MU, WDC, STX; SNDK data looked unreliable) tested. Overnight-only after costs: MU -36%/y, WDC -44%/y, STX -52%/y over 10y; MU last 12m +14% vs hold +168%. Trend filter (SMA100/200) did not beat holding MU or STX. All three are below their 100- and 200-day averages now (MU about -42% from its June 2026 peak in the Yahoo data).
- 2026-11-27: owner idea "buy at close, sell at next open" (overnight effect) tested on 10y daily data. The effect is real before costs (SPY overnight +9.5%/y vs intraday +2.7%; Thai stocks overnight positive, intraday negative), but trading it every day costs ~0.3% a night round trip: SPY -50%/y, QQQ -49%/y, Thai stocks about -60%/y after costs. Rejected; buy-and-hold keeps the overnight return for free.
- 2026-11-26: owner asked about 1-minute "guess right, double the money" trades (binary options). Tested 60k PAXG 1m bars: best rule or logistic model was 50-51% accurate out of sample (luck band +/-0.8%), but 55.6% is needed at an 80% payout. Advised against: negative expectation, the platform is the counterparty, unlicensed in Thailand, banned for retail in the EU since 2018.
- 2026-11-26: US stocks with real money (later): recommended Webull Thailand (0.10% + VAT, no minimum per order) or Dime! (KKP, has an under-20 secondary account); avoid $1.99-minimum brokers for a $70 account. Backtest first; owner places every real order; the AI never touches the account.
- 2026-11-26: Trading: AI replay (Opus 0/32 entries, overconfident); intraday desk retired; swing desk (4h, Opus PM, code risk limits) live, paper only.
- 2026-11-25: Gold paper-trading desk set up (2 worker sessions); phase 1 gold results; intraday paper desk live from 18:07 Bangkok; reviews scheduled Mon 30 Nov 08:20 and Fri 4 Dec 23:40.
- 2026-11-25: Paper-trading worker: gold Phase 1 done on branch claude/paper-trading (trading/reports/phase1.md). Verdict: 1M USD in 1 year is ~0% likely, ruinous at 30-100x; no rule beat gold buy-and-hold in-sample; AI desk (Opus, 21 weekly calls) +2.0% vs gold -12.2% Jul-Nov 2026, too small a sample; NO-GO for real money. A subagent call costs ~62k tokens minimum. Yahoo 429s cloud IPs: the boss session fetches data.
- 2026-11-25: Satit: pitch slide 7 rebuilt as three international-standards cards (owner picked B); all 16 pages Lighthouse a11y/BP/SEO 100, mobile LCP <= 2.0 s; CSP without unsafe-inline on the site; owner chose to move hosting to Cloudflare Pages (owner sets up the account; _headers is ready); deployed gh-pages 06137db.
- 2026-11-25: Satit: speaker-script PDF and speed evidence pack; red team (2 agents) and bug audit; CSP, WCAG 2.2 AA fixes, map on request; deployed gh-pages 2c6c71e. Scores slide now uses measured scores only (owner: no self-made rules).
- 2026-11-25: Satit site has 15 pages with real school photos and logo (fetched by the Mac chat), deployed at gh-pages b87d534.
- 2026-11-25: Satit PBRU homepage v1 deployed to /satit/ (placeholders where photos and facts are pending).
- 2026-11-25: skill type1-deck added (.claude/skills/type1-deck, on main and the kimono branch).
- 2026-11-25: owner reviewed the kimono film: boxy, too static, buggy; said not to fix it. Lessons are recorded under Presentations.
- 2026-11-25: kimono film made from the deck and hosted at /film/ on gh-pages.
- 2026-11-25: graphify installed; this shared memory created; kimono project closed.
