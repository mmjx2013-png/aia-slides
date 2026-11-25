---
name: type1-deck
description: Build a "type 1" presentation, the owner's standard for a perfect deck. That means a cinematic HTML slide deck in the style of reference/from-brand-to-place-cinematic.html, with photo plates, paper labels that travel, grow and flip, rich motion, narration that drives the animation, and touch/drag interactions. Use it whenever the owner asks for a presentation, slides, a deck or "แบบที่หนึ่ง" (type 1). It includes rough grey-box mock-ups for the owner to choose from, a starter template built on the example's own engine, and a QA script that catches overlapping text and broken sliders.
---

# Type-1 deck

"Type 1" is the owner's word for perfect. The standard is `reference/from-brand-to-place-cinematic.html` in the aia-slides repo (also on `main`; outside that repo, the same file is `reference.html` beside this SKILL.md). **Make it like this:** reuse the example's structure, motion grammar and engine. Don't invent a new style. The owner judged the kimono deck "nowhere near it". Read the owner's rules in `MEMORY.md` first.

## The workflow (do not skip steps)

1. **Look at the example properly.** Serve the repo and run `node scripts/qa.cjs <path-to-reference.html> --out /tmp/ref-qa`, then look at every contact sheet. Read its CSS and JS: the template below is that engine.
2. **Ask until confident.** Ask option questions about topic, audience, language (Thai?), slide count, sources, deadline, and whether there is narration. Use cheap options.
3. **Rough mock-ups first, per scene, with no rendering.** Copy `template/` to a scratch folder. For each scene, make 2 or 3 different directions using `.ph` placeholder plates (grey hatching with a label naming the future photo) and real draft text. Screenshot them with `node scripts/qa.cjs <folder> --wire --sizes 1920x1080`, then send the contact sheets as images. The owner picks one direction per scene. Build only after that.
4. **Build from `template/index.html`:**
   - Copy the folder; it holds the engine, the fonts and the components.
   - Replace every `.ph` with a real, credited photograph.
   - Add one `<section class="slide" id="...">` per scene, and drive the scene state with `[data-s="<id>"]` CSS selectors, exactly as the example does with `[data-slide="n"]`.
5. **Narration is part of the animation.** No video, no film export.
   - Each slide has `data-audio="audio/<id>.mp3"` plus `data-cues="2.4 6.1"`: the seconds at which the voice fires beat 1, beat 2, and so on.
   - Write the cues from the TTS word timings.
   - Clicking ahead seeks the voice to that cue, so motion and voice stay together.
   - Auto mode holds each slide `HOLD` ms (default 3.2 s) after the voice AND the last animation have finished. Never switch the moment the voice stops.
   - Use Venice TTS: model `tts-elevenlabs-turbo-v2-5`, voice "Alice" (see MEMORY.md). Respell Japanese and Thai terms for the TTS only.
6. **QA before saying "done".**
   - Run `node scripts/qa.cjs <deck> --sizes 1920x1080,1440x900`. It must say "no problems found", and you must LOOK at every contact sheet yourself, beat by beat.
   - Then run it again with `--browser webkit` if WebKit is installed, because the owner watches in Safari.
   - Test every drag and touch interaction by hand in a screenshot sequence.
7. **Deploy** to GitHub Pages (branch `gh-pages`) and send the owner screenshots with the link. Add a log line to `MEMORY.md`.

## The motion grammar (from the example; keep it)

- **Stage:** a fixed 1920x1080 stage scaled to fit. Full-bleed real photographs ("plates") with a 28 s drift, veils per scene, and grain.
- **Plate changes:** plates persist and change by `clip-path` wipes and split screens (0.7 s), not by cuts.
- **Labels:** two paper labels stand for the deck's two ideas as objects. They travel, resize, grow into **edge-to-edge** panels (radius 0, a split screen), shrink back to cards, and flip in 3D (rotateY 180°, 0.72 s) to reveal the answer on their back.
- **Text inside labels** fades out before a label moves and fades in after it lands; text never slides.
- **One easing** everywhere: `cubic-bezier(.22,.8,.24,1)`, 0.4 to 0.7 s.
- **Text reveals:** a fade with a 20 px rise, at 0.26 s + i×70 ms. Going back, text comes from above.
- **Beats inside a slide** (`.f1`, `.f2`, `.h0`/`.h1` swaps) reveal one idea at a time. A credits sheet slides up as the final beat.
- **Motion carries meaning:**
  - SVG strands draw themselves to show causes meeting.
  - Numbers count up (`data-count`, `data-at`).
  - Diagrams move parts to make the point.
  - A before/after `.compare` lets the viewer drag ANYWHERE across the full width (pointer capture, plus arrow keys on the knob), and dragging never changes the slide.
- **Much more motion than the kimono deck.** Every slide needs at least two kinds of motion beyond the text reveal: a plate wipe or split, label travel/grow/flip, drawn strokes, counting numbers, moving diagram parts, or parallax layers. No bounces, spins or gimmicks.
- **Never** float a big opaque box over the photo's subject. Text sits on the photo over a veil, or on a label that has grown to the frame edge.
- **Accessibility:** keys, swipe, hash links, motion toggle, reduced motion, `aria-live`, and an auto-hiding control bar.

## What makes the example's CONTENT good (the hard part; copy the method)

- **One driving question** on slide 1 ("Which name tells you who, and which tells you where?"). It is answered only on the last slide, and the answer is revealed by flipping the two labels.
- **Two ideas made physical:** each idea is an object from the audience's world (a MAMA noodle packet and a Phetchabun tamarind box). The labels carry them through every scene.
- **One idea per slide.** The headline is a claim of 7 words or fewer, plus at most one short lede. Captions carry caveats and credits ("Illustrative; not the textbook brands").
- **A clear arc:** hook question → kinds (each one speaking in the first person: "These goods are ours.") → regroup by one contrast (who may use it) → bridge question → definition as a drawn diagram (nature + people → one place) → local case study read front and back → side-by-side comparison → quick-check questions with answers revealed on the next beat → takeaway → sources sheet.
- **Active audience:** "Pick one for each", "Say your answer out loud", quick checks.
- **Sources:**
  - Every claim is sourced; paraphrase, don't over-quote.
  - Examples are labelled as illustrations.
  - Only real photographs, each credited with its licence.
- **Plain words.** Short sentences, no jargon without a gloss, and the audience's own examples.

## Lessons the owner has given (do not repeat)

- **Kimono deck:**
  - big boxy panels hid the object;
  - too little animation;
  - shipped with overlapping text;
  - the slider dragged only around the middle;
  - a video/film version was not wanted;
  - slides changed the moment the voice stopped.
- **Thai text:** add a Thai font in front of the fallbacks, e.g. `--sans:"Cine Sans","IBM Plex Sans Thai","Kanit",...`. Self-host it under `fonts/`; Kanit and Charm TTFs are in the repo's `fonts/` on `main`. Test that Thai lines do not clip (Thai needs a taller line-height, about 1.45).

## Files

- `template/index.html`: the engine plus four demo scenes (hook, split panel, diagram with a counting number, drag slider with a label flip and a sources sheet). Open it with `?wire` for grey-box mode.
- `template/fonts/`: the example's fonts, Caladea and Inter subsets (SIL OFL 1.1).
- `scripts/qa.cjs`: screenshots every beat and fails on:
  - overlapping text (measured per line, ignoring text covered by opaque panels);
  - text outside the stage, or cut off by its label;
  - sliders that don't drag across their full width, or that change the slide.

  It writes contact sheets with ffmpeg. It needs `window.__deck = {jump, next, state}`.
