# Unit 4 deck: rules for every agent

The owner is a Thai student making slides for a real teacher: Mathayomsuksa 1 (Grade 7) mathematics, English Program class. **This is the owner's first paid-style project, so it must be beautiful, correct and fully working.** The teacher has not seen it yet. The textbook is *Math Solution M1 Book 2*, Unit 4 *Statistics (1)*. Its sections are: 1 Statistical questions · 2 Data collection · 3 Data presentation and interpretation · 4 Use of statistics in real life · Summary and review · Unit test · Vocabulary.

## Hard rules
1. **Never copy the textbook.** Write every question, story, number and chart yourself. Use everyday Thai school life for the contexts: canteen, sports day, bus or BTS, class 1/2, LINE stickers, mango sticky rice, school garden, rainfall in Bangkok, and so on. Data must be plausible, and every number must be **arithmetically correct**. Check every sum, percentage and angle twice and write the working in `<aside class="notes">`.
2. **Language:** English for students in Grade 7: short sentences and plain words. Bold each new term the first time it appears. Thai appears only where a rule says so (the vocabulary slide).
3. **Style A "modern clean":** use `style.css` as it is. Copy patterns from `parts/_snippets.html` and the title in `parts/00-title.html`. Use the light background with `.mesh` (vary m2/m3/m4), white `.card`s and the palette blue `#3B6CFF`, violet `#7C5CFF`, coral `#FF6B5B`, sun `#FFC53D`, mint `#1FBF9F` and ink `#0F1B33`. Use Inter / Display, which are already loaded. **Avoid the "AI look":** no dark glowing slides, no neon, no serif italics. The owner rejected that look.
4. **One idea per slide.** Headline (`h2`) of 7 words or fewer. Every slide has a real visual: an SVG chart, a drawing, the kids, cups, icons or a table. No wall of text: at most about 40 words of running text per slide.
5. **Animation everywhere, and it must mean something:**
   - things enter with `.in` (stagger with `style="--d:NNN"` ms);
   - answers and next ideas appear on beats (`data-steps="N"` on the section, then `.g1` … `.g4`);
   - bars `.grow`, lines `.draw` (paths need `pathLength="1"`), donut segments `.segd` (`--len`, `--C`, `stroke-dashoffset`; see the title slide), icons `.pop` / `.drop` with `--n` for stagger, numbers count with `data-count="165" data-at="1"`;
   - inside a `.gN` group these wait for their beat automatically;
   - every practice slide hides its answer until a beat (`.ch.r1` marks the right choice on beat 1, then `.ans.g1`).
6. **Students answer on the slide.** Every exercise slide has at least one interactive tool (rendered by `tools.js`; just write the markup, see below). Mix them: typed answers, choices you can tap, handwriting boxes, sorting and graph builders. Graph lessons **must** let students build the graph (bars, line, pie, pictogram, dot plot).
7. **Readable from the back of a classroom:** body text ≥ 28px, labels ≥ 24px, chart tick labels ≥ 20px. `qa.cjs` flags < 24px (outside SVG) and < 18px (anywhere). Keep strong contrast and no light-grey text on white.
8. **Stage is 1920×1080** with slide padding 92px 130px. Nothing may leave the slide or overlap other text. Give fixed `width`/`height` to widget boxes and SVGs so the layout never jumps.
9. **IDs:** prefix every id with your part prefix (e.g. `l2-`). No external URLs, no `<script>`, no inline `on…=` handlers. A part may start with one `<style>` block whose selectors all begin with one of your own slide ids.
10. **Files:** write ONLY your own part file (plus your `qa-*` folder and `preview-*` file). Do not edit `style.css`, `engine.js`, `build.py`, other parts or tools files. If you need a component that does not exist, add it in your part's `<style>` block and report it. **Do not run git.**
11. Every slide ends with `<aside class="notes">…</aside>`: what the teacher says or asks, the answers and the working.
12. The first slide of a lesson is an opener (see `sn-open`) with `data-lesson="N" data-title="Lesson N · Title"`.

## Order and presenting (owner, 27 Nov)
- Order like the book: Lesson N teaching slides → an **Exercise N** divider → the exercise slides (kicker "Exercise N"). Lesson 3 has Exercise 3A (tables, pictograms, bars) and 3B (line, pie). Lesson 4 → Exercise 4 → Summary → Vocabulary → Unit review → closing.
- Students come to the board and present before the reveal. On every exercise slide, the question and a work tool show first; the answer appears only on a later beat or Show answer. Never put an answer in the first view.
- Graph builders start from a ready graph that students adjust up or down (`data-start` with plausible wrong values); never start from zero or from blank axes.
- All ink (pen and w-write) snaps near-straight strokes to lines, and loops to circles or rectangles ("Auto shapes", on by default).

## Interactive tools (markup → tools.js renders it; all have Check / Show answer / Reset where it makes sense)
| Markup | What students do |
|---|---|
| `<div class="ch ia r1" data-mcq>` with `.c` children and `.ok` on the right one | tap a choice: green if right, shakes red if wrong (also revealed on beat 1 by `.r1`) |
| `<div class="w-input ia" data-label="…" data-answer="165" data-accept="165;165 cups" data-unit="cups" data-tol="0"></div>` | type an answer, Check |
| `<div class="w-write ia" data-label="…" data-lines="3" style="width:..;height:.."></div>` | write by finger or stylus in a lined box; Clear |
| `<div class="w-sort ia" data-bins="Statistical|Not statistical" style="width:..;height:.."><div class="item" data-bin="0">…</div>…</div>` | drag (or tap, then tap a bin) cards into bins, Check |
| `<div class="w-bars ia" data-title data-labels="Mon,Tue" data-max="60" data-step="10" data-answer="30,25" data-start="20,40" data-ylabel="Cups" style=..></div>` | drag ready bars up or down to the right height |
| `<div class="w-line ia" data-title data-labels="Jan,Feb" data-min="0" data-max="12" data-step="1" data-answer="4,6" data-start="6,6" data-ylabel=".." style=..></div>` | drag ready points up or down; the line joins them |
| `<div class="w-pie ia" data-title data-labels="A,B" data-values="12,6" data-mode="angles" style=..></div>` | type each angle (or percent with `data-mode="percent"`); the pie draws live; Check |
| `<div class="w-picto ia" data-title data-labels="Mon,Tue" data-answer="3,2.5" data-key="10" data-icon="cup" data-unit="cups" style=..></div>` | tap to add icons (and half icons), Check |
| `<div class="w-dots ia" data-title data-labels="5:30,6:00,6:30" data-answer="1,3,2" style=..></div>` | tap above a label to stack a dot (a dot plot) |

A pen for the whole slide is always available (✎ button or the P key). Widgets keep working when the stage is scaled.

## How to check your work (repeat until clean)
```
cd /home/user/aia-slides/teacher-slides/unit4
python3 build.py --only <your number>        # e.g. --only 20 -> preview-20.html
node qa.cjs preview-<n>.html qa-<n>          # screenshots of the first and last beat of every slide + problem list
python3 sheet.py qa-<n>                      # contact sheets qa-<n>/sheet-*.png
```
Then **look at every sheet image yourself** (Read the PNG). Fix anything that looks crowded, empty, misaligned, off-centre, or "not beautiful". "no problems found" is necessary but not enough: judge it as a designer. While `tools.js` is still being written, "widget not rendered" and errors that come from tools.js may appear. Ignore only those.

Quality bar: the title slide (`parts/00-title.html`) and the sample `teacher-slides/mockups/style-A.png`. Every slide should look at least that good, and each slide should differ from the one before (vary the layout).
