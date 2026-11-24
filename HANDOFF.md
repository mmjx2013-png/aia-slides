# Kimono v3: handoff

Written Tue 24 Nov 2026, 16:20 Bangkok, by the build session, when token budget ran low.
Deadline: Wed 25 Nov 11:00 Bangkok. Live site: https://mmjx2013-png.github.io/aia-slides/

## What is done and live (gh-pages, deploy 1a268d4)

- Light palette site, 11 rooms (entrance + ten), all text written from sources read this
  session and checked by two independent verifiers against the PDFs: 245 claim rows, sources
  4 to 43, every quote verbatim on its page. Ledger: `kimono-sources.md` (generated).
- Audio guide for every room: 12.1 minutes, ElevenLabs "Alice" via Venice, captions timed from
  word timestamps, room tone and effects synthesised in code, each room -16.4 LUFS integrated,
  true peak -1.9 to -1.6 dBTP (measured after encoding).
- Without 3D frames the site runs as a plain, complete exhibition page. When
  `site/assets/seq/meta.json` and frames exist, the same page switches itself to the 3D hall.
- Stems for Logic: branch `kimono-stems` (two zips: narration WAVs + cues.csv; effects WAVs +
  a 90 s room-tone loop; 48 kHz 24-bit; `MIX_NOTE.md` as its README).
- v2 is kept at `/v2/`.

## How the site is built (all from the repo root, branch claude/fervent-ramanujan-qp1d26)

```
content/rooms/*.json      the only place to edit text (schema in content/BRIEF.md)
python3 tools/build_site.py --strict   -> site/index.html, audio/script.json, kimono-sources.md
python3 tools/narrate.py [room ...]    -> audio/raw/*.mp3 (re-synthesises only rooms whose text changed)
python3 tools/mix.py                   -> site/assets/audio/*.mp3, narration.json, *.vtt  (ALWAYS run for all rooms after narrate)
python3 tools/build_fonts.py           -> kanji subset for the characters used
tools/deploy.sh "message"              -> pushes site/ to gh-pages (keeps /v2/)
```

## The 3D: what exists and what is left

Spec: `three_d/README.md` (v3: a reconstructed Edo-period shoin-style hall; 984 frames; rest
frames 119, 209, 329, 419, 491, 563, 683, 773, 845, 953, 983; display-wall stops S1 = frame 491,
S2 = frame 845). Code: `three_d/common.py`, `scene.py`, `dressform.py`, `render.py`. Two agents
were finishing the scene, the mannequin and a one-command GPU bundle (`three_d/pod_run.sh`,
`three_d/fetch_assets.py`, `tools/encode_frames.py`, `three_d/export_meta.py`) when this was
written; see the "Pod" section at the end of this file for the state at handoff.

### When the frames arrive (build/seq.tar from the pod)

```
tar -xf build/seq.tar -C .            # gives site/assets/seq/{d,m}/f_NNNN.webp, meta.json and build/stills/*.png
mkdir -p site/assets/stills
python3 - <<'EOF'
from PIL import Image; import glob, os
for p in glob.glob('build/stills/*.png'):
    Image.open(p).convert('RGB').save('site/assets/stills/' + os.path.basename(p)[:-4] + '.webp', 'WEBP', quality=86)
EOF
python3 tools/build_site.py --strict   # the "No AI. Just Blender." slider appears when f_0329 + clay_0329 (or 0683, 0000) exist
python3 -m http.server 8765 --bind 127.0.0.1 &   # serve the repo root
node tools/shot.cjs "http://127.0.0.1:8765/site/index.html" /tmp/s desk,phone "0,bolt:0.5,pattern:0.33,dressing:0.6,answer:0.97"
```

Look at five screenshots, then deploy. What to check, and where to fix it:

1. Frame 0 behind the entrance card. The card sits bottom right (`html.has-seq .threshold__inner`
   in `site/css/main.css`); move it if it covers the roll.
2. `pattern:0.33` must show the Met kosode hanging inside a plaster bay, under the rail, with its
   label beside it. Works are placed by `updateHang()` in `site/js/app.js` from `meta.camera`,
   `meta.lens` and `meta.walls`. If they sit beside the bay, mirrored, or at the wrong height:
   `walls.S1.pool0` must be the bay centre on the wall surface, `along` the unit vector to screen
   right at the stop, `top` (optional, default 1.72) the height the work hangs from; the lens
   shift sign is in `project()` (Blender convention: image moves opposite to the shift).
   A work hangs in every second bay (`STRIDE = 2`).
3. Labels in the 3D rooms follow `meta.anchors` (names in the spec). A label whose anchor is
   missing still shows, without its leader line.
4. `answer:0.97`: the rules must lie on the back of the robe (anchors back_tl, back_tr, back_br,
   back_bl). If the robe is patterned there and the text is hard to read, raise the contrast in
   `.rules` (it uses multiply blending).
5. Total size: keep `site/` under about 150 MB. 995 frames at about 90 KB plus the phone set is
   about 120 MB; if over, re-encode at lower quality in `tools/encode_frames.py`.

Then run the QA pass on the real frames (WebKit 26.6 is installed in the build container only;
Chromium is enough elsewhere):

```
node tools/qa.cjs "http://127.0.0.1:8765/site/index.html" /tmp/qa chromium full,desk,phone 3
python3 tools/qa_check.py /tmp/qa      # WCAG contrast against the pixels behind each text, text fit, script errors
```

### Photos (from the Mac session, branch kimono-photos)

```
git fetch origin kimono-photos && git checkout origin/kimono-photos -- assets/photos
python3 tools/photos.py assets/photos   # WebP sizes + cut-outs of garments on plain studio grounds (needs scipy)
python3 tools/build_site.py --strict && tools/deploy.sh "Add museum photographs"
```

Files must be named `met-<objectID>.<ext>`. The rooms already name the objects they hang
(`content/rooms/*.json`, "photos"); a room skips any photo that has not arrived. Check
`assets/photos/credits.json` licences before deploying (the build refuses a licence that is not
CC0 or public domain). Look at each cut-out once: a bad one is removed with
`python3 tools/photos.py assets/photos --no-cut met-<id>`.

## Known defects and gaps (be honest with the user)

- No 3D on the live site yet. Only one Met photograph (the 1660s kosode), so the walls are
  mostly text until photos arrive.
- Cut for lack of budget: the weaving room, the film, the diegetic credits test, the interactive
  3D viewer. The cloth narration no longer mentions a loom.
- The narration has not been heard by a person. Check pronunciation of names and Japanese terms.
- Venice AI's terms for public use of synthetic speech could not be read from the build
  container. The narration is credited as synthetic on the site.
- Contrast, text-fit and WebKit checks ran against stand-in frames only; they passed with no
  script errors, and three small-text contrast misses were fixed but not re-run.
- Reduced motion: frames still follow the scroll, but without blending or the guided walk.
- The `modern-web-guidance` skill named in the brief was not available in the build session.
- Sources not readable and therefore not used: Dalby, the Met exhibition book, SciELO, the
  Textile Society of America papers and the KCI site (bot walls, not bypassed).
- Claims dropped for lack of a source are listed at the end of `kimono-sources.md`.

## Pod (state at handoff)

See the last lines of this file, appended when the pod was started or when the bundle failed.
Rules from the user: one pod, Community cloud, total spend at most $2.50, terminate it as soon as
the frames are fetched, never touch the four older pods on the account.

## Film mode (approved by the user; NOT built; a final-integration task)

A "Play as film" button: one press plays the whole exhibition by itself. Chapter title cards
centred on screen ("Chapter 1 · One bolt"), shown only while the camera walks between rooms,
never while it is on a garment, fading after about 2.5 s. Captions bottom centre. A timeline
with chapter ticks (click to jump), pause/play, captions toggle. Reduced motion falls back to
the scroll mode. The scroll mode stays as it is. This replaces the separate film.

Cheapest way to build it (no video encoding needed): the engine already plays a room as a film.
`Guide.toggle(id)` in `site/js/app.js` starts a room's audio and, in `Guide.tick()`, scrolls the
page so the picture follows the narration: each cue in `site/assets/audio/narration.json` carries
the `frame` (3D rooms) or `photo` (wall rooms) it is keyed to. Film mode is then: on the audio's
`ended` event, scroll to the next room's section and call `Guide.toggle(nextId)`; do not cancel
the guided walk on wheel/touch while film mode is on (offer a "Leave film" button instead); draw
the title card when a room starts; build the timeline from the room durations below.
If real video is wanted instead: encode `site/assets/seq/d/f_%04d.webp` per range with FFmpeg
(H.264 + WebM), but wall rooms have no frames of their own (they slide the stop frame sideways
in the canvas), so video would lose the photographs. The guided route keeps them.

| Chapter | Room id | Audio (site/assets/audio/) | Length | Picture |
|---|---|---|---|---|
| Welcome | threshold | threshold.mp3 | 0:43 | frame 0, held |
| 1 One bolt | bolt | bolt.mp3 | 1:03 | frames 0-329 |
| 2 The parts | parts | parts.mp3 | 1:07 | frames 329-419 |
| 3 Cloth and season | cloth | cloth.mp3 | 1:04 | frames 420-491, then the wall at stop S1 (frame 491) |
| 4 Pattern | pattern | pattern.mp3 | 1:04 | the wall at S1, further along |
| 5 Dressing | dressing | dressing.mp3 | 1:09 | frames 492-683 |
| 6 Body | body | body.mp3 | 1:08 | frames 684-845, then the wall at stop S2 (frame 845) |
| 7 The family | family | family.mp3 | 1:13 | the wall at S2 |
| 8 Four centuries | history | history.mp3 | 1:15 | the wall at S2 |
| 9 Abroad | abroad | abroad.mp3 | 1:12 | the wall at S2 |
| 10 The answer | answer | answer.mp3 | 1:07 | frames 846-983 |

Camera walks between rooms (where a title card may show): 420-491, 492-563, 774-845, 846-953.
Captions: `site/assets/audio/<id>.vtt`. Room tone and effects are already inside each MP3.
