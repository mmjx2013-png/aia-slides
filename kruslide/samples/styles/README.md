# KruSlide style samples D, E, F

Three short live decks for the "styles" section of the sales site. Each is one self-contained `index.html` with a strict
Content Security Policy (only its own script, pinned by hash; no external requests; works offline from the folder).
Fonts (Anuphan for Thai, Inter) are self-hosted in each deck's `fonts/`; photographs are in `img/`.

| Style | Folder | Topic | Slides |
|---|---|---|---|
| D · Glass (กระจก) | `glass/` | Science ม.1 · ระบบสุริยะ (the solar system) | 5 |
| E · Photo-rich (ภาพเยอะ) | `photo/` | Science · ป่าชายเลนของไทย (Thai mangroves) | 5 |
| F · Mechanism explorer (สำรวจกลไก) | `mechanics/` | Physics / technology ม.3–ม.4 · เครื่องยนต์ 4 จังหวะ + เครื่องกลอย่างง่าย | 6 |

## Rebuild

```
cd kruslide/samples/styles/glass && python3 build.py
cd kruslide/samples/styles/photo && python3 build.py
cd kruslide/samples/styles/mechanics && python3 build.py
```

Each `build.py` joins `src/parts/*.html` (one `<section class="slide">` per file, in name order), inlines the CSS and JS,
pins the script hash in the CSP, and checks the parts: every slide has `data-steps`, no duplicate ids, no external URLs,
no inline event handlers, and (D, E) every `img/` file the parts use exists. Never hand-edit `index.html`.

Source files per deck:

- `src/style.css`: the deck's own look; `src/slides.css`: per-slide layout; `src/tools.css`: the look of the shared widgets.
- `src/engine.js`: copy of `teacher-slides/unit4/engine.js` (via the calculus sample). Only the arrow keys, PageUp/PageDown
  and the ‹ › buttons change the slide; clicks, taps, swipes, Space and Enter never do. Beats inside slides; touch buttons
  on coarse pointers; `?still` = final state without motion (screenshots); `window.__deck` for tests.
- `src/tools.js`: a trimmed copy of the unit4 tools (tap a choice, typed answer with Check, sort into boxes, the pen with
  auto-shapes, the tap guard) with Thai labels and the deck's pen colours.
- D `src/glass.js` + `src/space.js`; E `src/photo.js`; F `src/mech.js`: each deck's own code (see the comments at the top).
- `src/parts/0N-*.html`: the slides, with speaker notes in `<aside class="notes">`.

## How the glass works (D)

Each `.glass` element holds a clipped COPY of its slide's photograph layer (`.scene`), aligned to the real one. The copy
gets `filter:url(#id)` (WebKit supports this on normal elements; we never rely on Chromium-only `backdrop-filter:url()`).
The filter is an `feImage` displacement map drawn on a canvas for that exact rounded shape, then `feDisplacementMap` three
times at slightly different strengths, one per colour channel: the rim bends and magnifies the background and splits colour
a little. Round buttons and bubbles also magnify their whole face. On top sit a tint, an inner shadow with a thicker lower
lip, a rim light and a highlight that follow the pointer (or the tilt of a phone/tablet; a slow drift when idle). The lens
on slide 2 magnifies 2.6×; the card stack on slide 3 shows the cards beneath through each card. The background makes one
11-second camera move when a slide opens and follows the pointer a little; when nothing moves, nothing is redrawn.

## Photographs

All photographs are public domain or CC0, from Wikimedia Commons or iNaturalist's open-data copies of the same CC0 files,
and NASA (public domain). Every slide credits its photos, every photo opens full screen with its credit in deck E, and
`CREDITS.md` lists each file, its page and its licence. No textbook pages or text were copied; all wording is our own.

## Screenshots for the sales site

`shots/style-D-1.webp` … `style-F-3.webp` (1600×900) and `-sm` versions (480 wide).
