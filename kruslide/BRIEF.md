# KruSlide (ครูสไลด์) — decisions from the owner (28 Nov 2026)

The repo is PUBLIC: no secrets, keys, personal names, e-mails or phone numbers anywhere in it.

## Brand and audience
- Brand: **KruSlide (ครูสไลด์)**. © KruSlide on every page.
- Audience: Thai school teachers and English Program (EP) teachers. Thai by default, English via a TH/EN switch.
- Contact: LINE Official Account only. Until the owner sends the real ID, use the placeholder `@kruslide` and mark it in code with `TODO-LINE-ID`.

## What we sell
1. **Interactive lesson slides, by textbook (main product).** A whole book of units, used through our link (no files handed over). Each unit includes:
   - animation on every slide;
   - students answering on the screen;
   - a teacher guide;
   - answers with worked steps.
2. **Answer keys with worked steps**, plus a password-locked answer site for the teacher.
3. **Narrated teaching videos:** 2D animated, or 3D/cinematic like a film trailer.
4. **School websites and presentation decks**, like the Satit PBRU site and its pitch deck.

## Slide styles we show
- **A, modern clean:** see teacher-slides/mockups/style-A.png and the live Unit 4 deck.
- **B, notebook:** see teacher-slides/mockups/style-B.png.
- **C, infographic:** NEW. Bold numbers, icons, charts, strong colour blocks.
- **Custom theme:** the school's logo and colours on any style.

## Mechanics to demonstrate (live where possible)
The live code is teacher-slides/unit4/tools.js plus the demo deck parts/_tools-demo.html:
- tap a choice;
- typed answer with Check;
- handwriting box;
- sort cards into boxes;
- bar-chart builder (drag ready bars up/down);
- line-graph builder;
- pie builder (type angles);
- pictogram builder;
- dot plot;
- pen with auto-shapes (a near-straight line becomes straight; loops become circles or rectangles);
- step-by-step reveal with ← → (students present first, then the answer);
- Show answer / Check / Reset;
- locked answer-key site;
- narrated video with captions.

## Prices (THB), owner-approved
Prices are low on purpose for now and may rise later. Do NOT print any "launch price until …" date.

| Item | Price |
|---|---|
| Lesson slides, per book | **300 / month** or **3,000 / year** (saves 600) |
| School theme (logo + colours) | 990 one-off |
| Custom unit made from the teacher's lesson plan | 1,990 / unit |
| Book answer keys + locked answer site | 590 / unit |
| Teaching video (2D) | 100 / minute, minimum 5 minutes, captions included |
| AI voice-over (Thai or English) | +30 / minute |
| 3D / cinematic video | ×2–×3 the per-minute price (200–300 / minute) |
| Presentation slides, up to 15 pages | 2,490 |
| School website, 1 page | 4,990 |
| School website, 5–10 pages | 12,900 |
| School website, 15+ pages, TH/EN | 19,900 |
| Website care | 1,990 / year |

## Look
- **Feel:** the owner likes the feel of Fastwork.co: a clean, friendly marketplace with category cards, clear pricing cards, trust signals and smooth animation. Make it ORIGINAL: our own palette, layout, illustrations and words. Never copy their logo, assets or text.
- **Quality:** beautiful, with strong but tasteful animation: scroll reveals, animated mock classroom screens, hover states and counters.
- **Avoid the "AI look"** (the owner rejected it): no dark neon glow, no gradient text, no serif italics.
- **Fonts:** self-hosted Anuphan (Thai) and Inter, from teacher-slides/unit4/fonts.

## Live work to link
- Unit 4 deck: https://mmjx2013-png.github.io/aia-slides/m1-statistics/
- Teacher guide: https://mmjx2013-png.github.io/aia-slides/m1-statistics/guide/
- Satit PBRU school site: https://mmjx2013-png.github.io/aia-slides/satit/
- Satit PBRU pitch deck: https://mmjx2013-png.github.io/aia-slides/satit/pitch/
- The cinematic history trailer (Ayutthaya) is being made in kruslide/trailer/.
- Do NOT use the Africa clip. It is the owner's school homework.

## Platform (being built in parallel in kruslide/platform/)
- Hosting is Cloudflare: Pages for the site, Workers for the back end, D1 for the database, and R2 (private) for the decks.
- Login is LINE Login. Payments are Stripe Thailand, added later. Until then, PromptPay transfers are confirmed by the owner on an admin page.
- Teachers open decks only through our link. Each deck shows a light "Licensed to <teacher · school>" mark.
- The sales site links to `/app/` for login and the member area.

## Videos (owner, 28 Nov): everything must be good enough to be the face of the brand. Master in **4K (3840×2160)**
1. **Sample: cinematic history trailer.** Topic: Ayutthaya (อยุธยา), 45–60 s.
   - Look like a film trailer: real photographs, slow camera moves, letterbox, title cards, Thai narration and ambient sound.
   - Only images whose licence allows reuse, each one credited.
   - Folder: kruslide/trailer/.
2. **KruSlide explainer video**, 60–120 s, Thai narration + captions. Folder: kruslide/explainer/.
   - Why teachers need us: hours saved, students actively answering, beautiful lessons.
   - What we make: slides with live mechanics, answer keys, videos, websites. Show real screen footage of the Unit 4 deck: tapping, dragging a bar, pen auto-shapes, step reveal.
   - Must contain the Ayutthaya trailer as the "we also make videos like this" moment.
   - Make clear our prices are very low, e.g. 300 baht a month ≈ 10 baht a day, cheaper than one hour of a teacher's time.
   - Ends on KruSlide + LINE.
   - Also export a 1080p web version for the sales site.
