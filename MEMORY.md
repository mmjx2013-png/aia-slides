# MEMORY.md: shared memory for every Claude chat

Every Claude session that works for this repository's owner reads this file first and updates it before finishing.
This repository is PUBLIC: never write secrets, keys, e-mail addresses, personal details or private documents here.

## How the owner works
- Reply in Thai, short: 3 lines or fewer, with an image when there is one.
- Be independent, not a yes-man: disagree when you have a reason, and propose better ideas.
- New project: ask until you are confident (topic, audience, length, deadline, style), using option questions.
- During a project: solve problems on the spot, then report. Within the budget the owner set, act first and tell them after.
- When supervising other sessions: short updates about every 30 minutes, with images.
- Watch Claude usage. Leave the owner at least 3% of the weekly quota. Say so before a large spend.
- Models: Fable or Opus for anything people will see and for important backend work. Sonnet only for mechanical work.
- Cheap options first (for example, RunPod Community GPUs; several GPUs are fine).

## Presentations
- "Type 1" = perfect, "type 2" = minimum acceptable. Both are defined in PRESENTATION-STYLES.md, with the type-1 reference in reference/from-brand-to-place-cinematic.html.
- Never deliver a scrolling website that is a wall of text. If the owner says "presentation", build slides.
- Lessons from the kimono project:
  - A few shots with extreme detail beat many shots.
  - Too-perfect images read as fake.
  - Light must look real (VFX/CG comp).
  - No film mode unless asked.
  - Use 3D as a virtual camera.
  - Downloaded CC0/CC BY models are fine.

## Tools that work
- Hosting: GitHub Pages from branch gh-pages at https://mmjx2013-png.github.io/aia-slides/
- Voice: Venice API TTS, model tts-elevenlabs-turbo-v2-5, voice "Alice". The key is proxy-injected; ask with request_credential if missing.
- GPU: RunPod via the GraphQL API at api.runpod.io (rest.runpod.io returns 502 through the proxy). Launcher: tools/pod_launch.py.
- 3D: `pip install bpy` (Blender 5.3) for Cycles on CPU; GPU renders on RunPod.
- Knowledge graph: graphify (`pip install graphifyy && graphify install`). Query with `graphify query "<question>"`. After editing code, run `graphify update .`.

## Projects
- Kimono presentation: DONE (25 Nov 2026).
  - 19-slide type-1 deck, live at the URL above.
  - Source is on branch claude/fervent-ramanujan-qp1d26: read HANDOFF.md there.
  - Still untested: Safari, and a person listening to the narration.
- Next: a new type-1 presentation, built by Opus with no 3D models. Topic, audience, length and deadline are not given yet: ask.

## Log (newest first; one line each; date, what, where)
- 2026-11-25: graphify installed; this shared memory created; kimono project closed.
