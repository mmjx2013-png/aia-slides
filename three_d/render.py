"""render.py - render frames of the kimono museum sequence.

  python3 three_d/render.py --start 0 --end 1079 --step 2 --res 1920x1080 --samples 96 \
      --out build/frames --only-missing [--device CPU|OPTIX|CUDA] [--frames 0,329,419] [--priority]

Stateless and resumable: each frame is put in its state by scene.apply_frame(f) and written to
OUT/f_NNNN.png (full-rate frame number) via a temp file + rename, so a killed run never leaves a
half-written PNG. --priority orders the frames A-C, E, G, D, F, then the walks (README render plan).
"""
import argparse
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

PRIORITY = ["A", "B", "C", "E", "G", "D", "F", "W1", "W2", "W3", "W4", "W5", "W6"]


def parse():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--end", type=int, default=1079)
    ap.add_argument("--step", type=int, default=1)
    ap.add_argument("--offset", type=int, default=0, help="render frames with (f - offset) %% step == 0")
    ap.add_argument("--frames", type=str, default="", help="comma list, overrides start/end/step")
    ap.add_argument("--res", type=str, default="1920x1080")
    ap.add_argument("--samples", type=int, default=96)
    ap.add_argument("--threshold", type=float, default=None, help="adaptive sampling noise threshold")
    ap.add_argument("--preview", action="store_true", help="faster settings for review renders")
    ap.add_argument("--device", type=str, default="CPU")
    ap.add_argument("--out", type=str, default=os.path.join(os.path.dirname(HERE), "build", "frames"))
    ap.add_argument("--only-missing", action="store_true")
    ap.add_argument("--priority", action="store_true")
    return ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])


def setup_device(device):
    import bpy
    sc = bpy.context.scene
    if device.upper() == "CPU":
        sc.cycles.device = "CPU"
        return
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = device.upper()
    prefs.get_devices()
    for d in prefs.devices:
        d.use = d.type == device.upper()
    sc.cycles.device = "GPU"
    sc.cycles.denoising_use_gpu = True
    print("[render] devices:", [(d.name, d.type, d.use) for d in prefs.devices])


def frame_list(a):
    import scene
    if a.frames:
        fr = [int(x) for x in a.frames.split(",") if x.strip()]
    else:
        fr = [f for f in range(a.start, a.end + 1) if (f - a.offset) % a.step == 0]
    if a.priority:
        st = {s["id"]: (s["start"], s["end"]) for s in scene.DIMS["stages"]}
        rank = {}
        for i, sid in enumerate(PRIORITY):
            for f in range(st[sid][0], st[sid][1] + 1):
                rank[f] = i
        fr.sort(key=lambda f: (rank.get(f, 99), f))
    return fr


def main():
    a = parse()
    import bpy
    import scene
    rx, ry = (int(v) for v in a.res.lower().split("x"))
    scene.build(res=(rx, ry), samples=a.samples, preview=a.preview)
    sc = bpy.context.scene
    if a.threshold is not None:
        sc.cycles.adaptive_threshold = a.threshold
    setup_device(a.device)
    os.makedirs(a.out, exist_ok=True)
    frames = frame_list(a)
    todo = [f for f in frames if not (a.only_missing and os.path.exists(os.path.join(a.out, "f_%04d.png" % f)))]
    print("[render] %d frames to do (%d requested) -> %s" % (len(todo), len(frames), a.out), flush=True)
    t_all = time.time()
    for i, f in enumerate(todo):
        out = os.path.join(a.out, "f_%04d.png" % f)
        if a.only_missing and os.path.exists(out):
            continue
        t0 = time.time()
        scene.apply_frame(f)
        tmp = os.path.join(a.out, ".tmp_%04d_%d.png" % (f, os.getpid()))
        sc.render.filepath = tmp
        bpy.ops.render.render(write_still=True)
        os.replace(tmp, out)
        dt = time.time() - t0
        el = time.time() - t_all
        eta = el / (i + 1) * (len(todo) - i - 1)
        print("[render] f %04d  %.1fs  (%d/%d, eta %.0f min)" % (f, dt, i + 1, len(todo), eta / 60), flush=True)


if __name__ == "__main__":
    main()
