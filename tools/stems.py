#!/usr/bin/env python3
"""Package the Logic Pro stems (48 kHz, 24-bit WAV) from build/stems into build/stems-package/.
Narration: one mono WAV per room. Effects: one stereo WAV per room (same length as the narration).
Ambience: one 90-second room tone to loop (the per-room beds are the same generator at room length).
Also writes cues.csv (room, cue start, cue end, picture frame, caption) and copies the mix note."""
import json, pathlib, shutil, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import synth
out = ROOT / "build/stems-package"
shutil.rmtree(out, ignore_errors=True)
nar = json.loads((ROOT / "site/assets/audio/narration.json").read_text())
order = list(nar)
for i, cid in enumerate(order):
    for kind in ("narration", "effects"):
        src = ROOT / f"build/stems/{kind}/{cid}.wav"
        dst = out / kind / f"{i:02d}_{cid}_{kind}.wav"
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(src, dst)
synth.write(out / "ambience/room_tone_90s_loop.wav", synth.room_tone(90))
rows = ["room,cue_start_s,cue_end_s,picture_frame,caption"]
for cid in order:
    for c in nar[cid]["cues"]:
        rows.append(f'{cid},{c["t0"]},{c["t1"]},{c.get("frame", c.get("photo", ""))},"{c["text"].replace(chr(34), chr(39))}"')
(out / "cues.csv").write_text("\n".join(rows))
shutil.copy(ROOT / "audio/MIX_NOTE.md", out / "MIX_NOTE.md")
print(sum(f.stat().st_size for f in out.rglob("*") if f.is_file()) // 2**20, "MB")
