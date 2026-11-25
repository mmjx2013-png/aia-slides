---
name: type1-deck
description: Build a "type 1" presentation, the owner's standard for a perfect deck. That means a cinematic HTML slide deck whose CONTENT and SLIDE CRAFT match the quality of reference/from-brand-to-place-cinematic.html, but with its own look. Use it whenever the owner asks for a presentation, slides, a deck or "แบบที่หนึ่ง" (type 1). It includes rough grey-box mock-ups for the owner to choose from, a neutral engine (stage, beats, travelling labels, voice-driven animation, drag slider), and a QA script that catches overlapping text and broken sliders.
---

# Type-1 deck

"Type 1" is the owner's word for perfect. The quality bar is `reference/from-brand-to-place-cinematic.html` in the aia-slides repo (also on `main`; outside that repo, the same file may be `reference.html` beside this SKILL.md).

**Do NOT copy it.** The owner's words: "I didn't tell you to copy. I said the content and the things that make the slides good."
- Learn WHY it is good: the content method and the slide craft below. Reach that level.
- Don't reuse its look: its palette, fonts, layouts, wording or scenes.
- Every deck gets its own visual identity, drawn from its topic and its photographs.

The owner judged the kimono deck "nowhere near" this bar. Read the owner's rules in `MEMORY.md` first.

## The workflow (do not skip steps)

1. **Study the reference, then put it away.** Run `node scripts/qa.cjs <path-to-reference.html> --out /tmp/ref-qa` and look at every contact sheet. Write down, for each slide, what idea it carries and what the motion does for that idea.
2. **Ask until confident.** Ask option questions about topic, audience, language (Thai?), slide count, sources, deadline, and whether there is narration. Use cheap options.
3. **Rough mock-ups first, per scene, with no rendering.**
   - Copy `template/` to a scratch folder.
   - For each scene, make 2 or 3 different directions. Use `.ph` placeholder plates (grey hatching with a label naming the future photo) and real draft text.
   - Screenshot them with `node scripts/qa.cjs <folder> --wire --sizes 1920x1080`, and send the contact sheets as images.
   - The owner picks one direction per scene. Build only after that.
4. **Build on the neutral engine in `template/index.html`:**
   - Give the deck its own design system: palette from its photographs, fonts that fit the subject (self-hosted, licence-clear, with a Thai font if needed), and its own motifs.
   - Replace every `.ph` with a real, credited photograph.
   - Add one `<section class="slide" id="...">` per scene, and drive each scene's state with `[data-s="<id>"]` CSS selectors.
5. **Narration is part of the animation.** No video, no film export.
   - Each slide has `data-audio="audio/<id>.mp3"` plus `data-cues="2.4 6.1"`: the seconds at which the voice fires beat 1, beat 2, and so on.
   - Write the cues from the TTS word timings.
   - Clicking ahead seeks the voice to that cue.
   - Auto mode holds each slide `HOLD` ms (default 3.2 s) after the voice AND the last animation have finished. Never switch the moment the voice stops.
   - Use Venice TTS: model `tts-elevenlabs-turbo-v2-5`, voice "Alice" (see MEMORY.md). Respell foreign terms for the TTS only.
6. **QA before saying "done".**
   - Run `node scripts/qa.cjs <deck> --sizes 1920x1080,1440x900`. It must say "no problems found", and you must LOOK at every contact sheet yourself, beat by beat.
   - Also run it with `--browser webkit` if WebKit is installed, because the owner watches in Safari.
   - Test every drag and touch interaction.
7. **Deploy** to GitHub Pages (branch `gh-pages`) and send the owner screenshots with the link. Add a log line to `MEMORY.md`.

## What makes the reference's CONTENT good (reach this level)

- **One driving question** opens the deck and is answered only at the end. The answer is revealed by the deck's own objects, not by a text slide.
- **Abstract ideas made physical:** each key idea becomes an object from the audience's own world. Those objects travel through the scenes, so the audience follows things, not bullet points.
- **One idea per slide.** The headline is a claim of 7 words or fewer, plus at most one short lede. Captions carry caveats and credits, which keeps the slide clean and honest.
- **An arc that teaches:** hook question → kinds (each one gets a voice) → regroup by one contrast → bridge question → definition shown as a diagram → a local case study read in depth → side-by-side comparison → quick checks with the answers revealed on the next beat → takeaway → sources.
- **An active audience:** make them choose, say an answer out loud, and check themselves.
- **Sources:**
  - Every claim is sourced; paraphrase, don't over-quote.
  - Examples are labelled as illustrations.
  - Only real photographs, each credited with its licence.
- **Plain words.** Short sentences, terms glossed, and the audience's own examples.

## What makes the reference's SLIDES good (principles, not its look)

- **The background stays visible, and every slide is different** (the owner's words: "seeing the background, and every slide being different, makes it feel striking and never boring").
  - The photograph or scene is always present behind or beside the content; no solid text slides.
  - No two slides share a layout: vary the composition (full-bleed, split frame, panel to the edge, diagram over the photo, close-up crop, before/after).
- **Creative animation, not simple swipes.** The owner: "not easy left-to-right or top-down swipes".
  - Invent motion for each idea: objects that transform, assemble from parts, flip to reveal, draw, morph, count, or react to the voice.
  - Plain wipes and slide-ins are at most the glue between scenes, never the idea itself.
- **Continuity over cuts.** Persistent things (photographs, labels or objects) carry from scene to scene and transform: move, resize, split the frame, flip. A new thing does not simply appear.
- **Motion carries meaning.**
  - Lines draw to show causes meeting.
  - A flip reveals an answer.
  - A split screen compares.
  - A number counts to make a quantity felt.
  - Every animation should explain something.
- **Much more motion than the kimono deck.** Every slide needs at least two kinds of meaningful motion beyond the text reveal.
- **Calm, consistent timing.** One easing family and 0.4 to 0.7 s moves. Text fades out before a move and in after it lands, so text never slides. Going back reverses the direction. No bounces, spins or gimmicks.
- **Beats inside a slide** reveal one idea at a time, cued by the narration.
- **Photographs are full-bleed and alive:** a slow drift, a veil for legibility, and grain.
- **Text never hides the subject.** Never float a big opaque box over the photograph's subject. Text sits over a veil, beside the object, or on a panel that runs to the frame edge.
- **Touch.** At least one or two real interactions per deck (drag, reveal, choose) that work across their whole area and never change the slide by accident.
- **Finish:**
  - keys, swipe and hash links;
  - a motion toggle and reduced-motion support;
  - `aria-live`;
  - an auto-hiding control bar;
  - a counter in the frame;
  - a sources sheet as the last beat.

## Lessons the owner has given (do not repeat)

- **Kimono deck:**
  - big boxy panels hid the object;
  - too little animation;
  - shipped with overlapping text;
  - the slider dragged only around the middle;
  - a video/film version was not wanted;
  - slides changed the moment the voice stopped;
  - "make it like the reference" must not mean copying it;
  - basic swipes and look-alike slides are boring.
- **Thai text:** use a self-hosted Thai font with a taller line-height (about 1.45). Test that Thai lines do not clip.

## Files

- `template/index.html`: the NEUTRAL engine, deliberately plain (system fonts, grey palette). Restyle it for every deck.
  - Engine: stage scaling, beats, travelling/flipping labels, plates, voice-driven cues with a hold, counting numbers, the drag-anywhere `.compare` slider, keys, swipe, a motion toggle, and `?wire` grey-box mode.
  - Four demo scenes show the mechanics only.
- `scripts/qa.cjs`: screenshots every beat and fails on:
  - overlapping text (measured per line, ignoring text covered by opaque panels);
  - text outside the stage, or cut off by its label;
  - sliders that don't drag across their full width, or that change the slide.

  It writes contact sheets with ffmpeg. It needs `window.__deck = {jump, next, state}`.
