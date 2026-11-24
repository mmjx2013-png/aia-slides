# Kimono v3: handoff

Updated Tue 24 Nov 2026, 18:45 Bangkok, by the build session (3D work finished; ready for the GPU render). Deadline: Wed 25 Nov 11:00 Bangkok.
The user changed the final deliverable to a cinematic SLIDE DECK (quality bar:
`reference/from-brand-to-place-cinematic.html`; see `PRESENTATION-STYLES.md`). A lean session
builds the deck from the assets below. The scroll website stays live as it is.

## 1. What exists

| What | Where | State |
|---|---|---|
| Text of the exhibition: 11 chapters (entrance + ten), every statement sourced | `content/rooms/*.json` (schema: `content/BRIEF.md`) | Written, then checked by two independent verifiers against the source PDFs: 245 claim rows, sources 4 to 43, every quote verbatim on its page |
| Claims ledger | `kimono-sources.md` (generated; lists dropped claims at the end) | Current |
| Source list with links | `content/sources.json` | Current |
| Audio guide, one file per chapter, with room tone and effects | `site/assets/audio/<id>.mp3`, captions `<id>.vtt`, cue times `narration.json` | 12.1 min; each -16.4 LUFS, true peak -1.9 to -1.6 dBTP. NOT yet heard by a person |
| Stems for Logic (48 kHz, 24-bit WAV) + mix note | branch `kimono-stems` | Pushed |
| Museum photograph: Met 2011.155, Robe (Kosode) with Fishing Net and Characters, CC0 | `site/assets/photos/met-76731-*.webp`, cut-out `met-76731-cut-*.webp` | Only this one object is in hand (1190 px). Wishlist for the Mac: `assets/photo-wishlist.json` (60 Met objects) |
| Scroll website (light palette, plain mode without 3D) | `site/`, live at https://mmjx2013-png.github.io/aia-slides/ (deploy 1a268d4), v2 at `/v2/` | Live |
| 3D scene, in code | `three_d/scene.py`, `shots.py`, `common.py`, `dressform.py`, `props.py`, `render.py`; assets list `fetch_assets.py`, credits `CREDITS.md` | Finished at 18:37; no agent is running |
| Low-resolution CPU previews | `previews/*.jpg` | For review only; never ship these |

Tools: `tools/build_site.py --strict` (page + ledger from the room files), `tools/narrate.py` then
`tools/mix.py` (always mix ALL rooms after narrating), `tools/photos.py DIR` (WebP sizes and
cut-outs; needs scipy), `tools/deploy.sh "msg"` (site/ to gh-pages), `tools/qa.cjs` +
`tools/qa_check.py` (contrast on real pixels, text fit).

## 2. The GPU render (not started; nothing spent)

The build session could not create the pod: its own permission check refused the call. The
coordinator creates it from its session. One command, from a checkout of this branch:

```
python3 tools/pod_launch.py            # creates ONE Community pod: cheapest in-stock card per frame, inside the cap
python3 tools/pod_launch.py status     # RunPod state + the pod's own log tail
python3 tools/pod_launch.py fetch      # downloads build/slides.tar and unpacks it into build/out/
python3 tools/pod_launch.py terminate  # terminates only the pod it created
```

- Needs api.runpod.io reachable with the key injected by the proxy (or `RUNPOD_API_KEY`).
- It prints the pod id, the rate, the render time limit and the worst-case cost, and writes
  `build/pod_create.json` (git-ignored) with the token and the URLs.
- The token is random, made by the launcher, passed to the pod as the env var `POD_TOKEN`, and
  written at the top of the pod log. To read it back from RunPod:
  `query { pod(input: {podId: "<id>"}) { desiredStatus env runtime { uptimeInSeconds } } }`.
- URLs (the host `<podId>-8000.proxy.runpod.net` must be allowed by the network policy):
  `https://<podId>-8000.proxy.runpod.net/<token>/status` (what exists, log tails) and
  `https://<podId>-8000.proxy.runpod.net/<token>/slides.tar` (the result).
- What the pod does (`three_d/pod_boot.sh` -> `pod_run.sh`): clones this public branch, installs
  Python 3.13 + bpy with uv, fetches the CC0 scans, renders the shot list in `three_d/shots.py`
  (one process per GPU, resumable), encodes stills to PNG + WebP q90 and clips to MP4 (H.264,
  CRF 20) + WebM, packs `build/slides.tar`, serves it, and stops itself 5 minutes after the tar
  has been fetched or after the serving limit. A render time limit (`MAX_SECONDS`) stops the
  renders and packs whatever is finished, so the cap cannot be passed.
- Budget: cap $2.50 in total (`CAP=2.30` in the launcher). The scene agent's final estimate is
  about 75 GPU-minutes on one RTX 4090, extrapolated from CPU tests, plus or minus 30 percent:
  about $0.45 to $0.65 on a 4090. The launcher's defaults are `WORK_MID=75`, `WORK_MAX=110`.
- Cuts if the estimate is over the cap, in this order: lower `CLIP_SAMPLES`, shorten the clips,
  drop one clip.
- OptiX on the pod is untested (no GPU here); `render.py` falls back to CUDA, never to CPU.
- After fetching: `terminate`. Never touch the four older pods on the account.

Without a pod: `python3 three_d/render.py --quality final --device CPU --shot NAME` renders one
still on this container's 4 CPUs (several minutes each); clips are not realistic on CPU.

## 3. What comes out (in `build/out/` after `fetch`)

`stills/NAME.png` and `NAME.webp`, `clips/NAME.mp4` and `NAME.webm`, clay passes as `clay_NAME`.
Final list (confirmed with the user at 17:00; `three_d/shots.py` is the authority):

| Shot | What | Suggested use in the deck | Audio chapter (`site/assets/audio/`) |
|---|---|---|---|
| hall_wide_morning (+ clip_hall_morning, 9 s) | the hall, shoji open onto the garden, morning | title / the question | threshold.mp3 (0:43) |
| exploded_panels | the eight straight pieces floating apart | "one bolt, eight rectangles" | bolt.mp3 (1:03) |
| kosode_iko (+ clip_kosode_iko, 9 s) | the Met robe on a lacquer ikō before gold byōbu | the parts; pattern as picture | parts.mp3 (1:07), pattern.mp3 (1:04) |
| weave_macro | silk and a dye edge in raking light | cloth and season | cloth.mp3 (1:04) |
| mannequin_final | the dressed figure, front | dressing (kitsuke) | dressing.mp3 (1:09) |
| mannequin_obi_back | the knot from behind | the body in the robe | body.mp3 (1:08) |
| sleeve_hem_props | sleeve and hem beside lacquer boxes and a folded robe | the family; history | family.mp3 (1:13), history.mp3 (1:15) |
| tokonoma | the alcove with a hanging scroll | the answer: both | answer.mp3 (1:07) |
| hall_dusk (+ clip_hall_dusk, 9 s) | shot 1 at dusk | closing / credits | (abroad.mp3, 1:12, has no shot of its own: use Met photos when they arrive) |
| clay_hall_wide_morning, clay_kosode_iko | flat-colour model views | "No AI. Just Blender." before/after | |

Honest captions the deck must carry: the hall is "modelled on the shoin halls of Nijō Castle's
Ninomaru Palace; a reconstruction, not the building". The robe on the ikō is the Met's photograph
(front only) on a draped sheet at the robe's recorded size; its back is plain. The mannequin's
kimono and the eight panels use a textile design drawn in code. Garden: Poly Haven HDRI
"Ninomaru Teien" (CC0). Closing line: "Real photographs and hand-built 3D; nothing generated.
Narration: synthetic voice (Venice AI)."

## 4. Photos (from the Mac session, branch kimono-photos; not arrived at 17:00)

```
git fetch origin kimono-photos && git checkout origin/kimono-photos -- assets/photos
python3 tools/photos.py assets/photos      # files must be named met-<objectID>.<ext>
```
A full-resolution original of Met 76731 (DP261473) would sharpen `weave_macro`: replace
`site/assets/photos/met-76731-cut-1068.webp` with a larger cut-out before the pod render
(`three_d/scene.py` reads that path). Check `assets/photos/credits.json` licences before use.

## 5. Known defects and gaps

- No final 3D frames exist yet. The previews are low-sample CPU tests (`previews/hall_wide_morning.jpg`
  and `previews/kosode_iko.jpg` are the latest, rendered after the last fixes).
- The bundle has never run on a GPU: only a thumbnail-size CPU dry run of `pod_run.sh` passed. One
  bpy crash was fixed and retries were added. Watch the first minutes with `pod_launch.py status`.
- Against the user's bar ("indistinguishable from a photograph") the hall is a good architectural
  render, not yet a photograph. Known weak spots: the garden is an HDRI without parallax and the
  gravel reads flat; the gold fusuma on the east wall are flat; the folded robe reads as soft slabs;
  the scroll's brocade is a simple lattice; the mannequin's shoulders are tight and its hands plain.
- No camera look is applied in the render (no vignette, grain or chromatic aberration): add it in
  the deck or in 2D.
- The drape of the robe on the ikō is a procedural displacement, not a cloth simulation.
- `weave_macro` is limited by the 1068 px photograph.
- Cut for lack of budget: the weaving room, the scroll-scrubbed 984-frame sequence, the film,
  the credits test, the interactive 3D viewer. A "film mode" for the website was approved in
  principle and not built; the deck replaces it.
- The narration has not been heard by a person; names and Japanese terms were respelt for the
  voice (`content/respell.json`). Venice AI's terms for public use of synthetic speech could not
  be read from the build container.
- Website QA (contrast, text fit, WebKit 26.6) ran against stand-in frames only.
- Sources that could not be read and are not used: Dalby, the Met exhibition book, SciELO, the
  Textile Society of America papers and the KCI site (bot walls, not bypassed).
- The `modern-web-guidance` skill named in the brief was not available in the build session.
