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
- Next: a new type-1 presentation, built by Opus with no 3D models. Topic, audience, length and deadline are not given yet: ask.

## Log (newest first; one line each; date, what, where)
- 2026-11-25: Satit: speaker-script PDF and speed evidence pack; red team (2 agents) and bug audit; CSP, WCAG 2.2 AA fixes, map on request; deployed gh-pages 2c6c71e. Scores slide now uses measured scores only (owner: no self-made rules).
- 2026-11-25: Satit site has 15 pages with real school photos and logo (fetched by the Mac chat), deployed at gh-pages b87d534.
- 2026-11-25: Satit PBRU homepage v1 deployed to /satit/ (placeholders where photos and facts are pending).
- 2026-11-25: skill type1-deck added (.claude/skills/type1-deck, on main and the kimono branch).
- 2026-11-25: owner reviewed the kimono film: boxy, too static, buggy; said not to fix it. Lessons are recorded under Presentations.
- 2026-11-25: kimono film made from the deck and hosted at /film/ on gh-pages.
- 2026-11-25: graphify installed; this shared memory created; kimono project closed.
