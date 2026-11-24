"""render.py - render frames of the hall sequence (Cycles, CPU or GPU).

  # GPU, every frame at final quality (what pod_run.sh runs, one process per GPU):
  python3 three_d/render.py --quality final --device OPTIX --only-missing [--shard K/N]
  # CPU first pass at draft quality: even frames plus every stage-end rest frame, README order:
  python3 three_d/render.py --quality draft --step 2 --rests --priority --only-missing
  # the slide deck's final shot list (three_d/shots.py): stills, clay stills, clips with motion blur
  python3 three_d/render.py --quality final --shot ALL
  python3 three_d/render.py --quality final --shot hall_wide_morning,kosode_iko --clay --prefix clay_
  python3 three_d/render.py --quality final --shot ALL --clip --samples 64
  # stills and the clay pass of the old 984-frame sequence:
  python3 three_d/render.py --quality final --frames 0,329,419,491,683,773,983 --out build/stills
  python3 three_d/render.py --quality final --frames 0,329,683 --clay --prefix clay_ --out build/stills
  # motion preview:
  python3 three_d/render.py --quality preview --res 960x540 --step 8 --rests --out build/preview

Stateless and resumable: each frame is put in its state by scene.apply_frame(f) and written to
OUT/<prefix>NNNN.png (full-rate frame number) through a temp file and a rename, so a killed run never
leaves a half-written PNG. Safe under nohup; several processes may share one OUT with --only-missing.

--quality  final    160 samples, adaptive 0.012, OpenImageDenoise high: for a GPU (about 10-20 s a frame
                    expected on one RTX 4090; several minutes a frame on 4 CPU cores)
           draft    12 samples, adaptive 0.05, fast denoise: the 4-core CPU pass (about 40-60 s a frame)
           preview  8 samples, coarse: review renders only
--priority orders the frames as the README render plan: even frames and rests first, then odd; within
           each: A, B, C, E, G, D, F, then the walks.
--shard K/N  keep every N-th frame of the ordered list, starting at K (one share per GPU).
"""
import argparse
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

PRIORITY = ["A", "B", "C", "E", "G", "D", "F", "W1", "W2", "W3", "W4"]
QUALITY = {
    "final": dict(samples=160, threshold=0.012, min_samples=24, denoise=("HIGH", "ACCURATE"),
                  bounces=(8, 4, 4), clamp=6.0),
    "draft": dict(samples=12, threshold=0.05, min_samples=6, denoise=("BALANCED", "FAST"),
                  bounces=(5, 3, 3), clamp=3.0),
    "preview": dict(samples=8, threshold=0.10, min_samples=4, denoise=("FAST", "FAST"),
                    bounces=(4, 2, 2), clamp=3.0),
}


def parse():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--end", type=int, default=-1, help="last frame (default: the last frame of the sequence)")
    ap.add_argument("--step", type=int, default=1)
    ap.add_argument("--offset", type=int, default=0, help="render frames with (f - offset) %% step == 0")
    ap.add_argument("--frames", type=str, default="", help="comma list, overrides start/end/step")
    ap.add_argument("--rests", action="store_true", help="also render every stage-end rest frame")
    ap.add_argument("--res", type=str, default="1920x1080")
    ap.add_argument("--quality", choices=sorted(QUALITY), default="draft")
    ap.add_argument("--samples", type=int, default=None, help="override the quality preset")
    ap.add_argument("--threshold", type=float, default=None, help="override the adaptive noise threshold")
    ap.add_argument("--device", type=str, default="CPU", help="CPU, OPTIX or CUDA")
    ap.add_argument("--out", type=str, default=os.path.join(os.path.dirname(HERE), "build", "frames"))
    ap.add_argument("--prefix", type=str, default="f_")
    ap.add_argument("--only-missing", action="store_true")
    ap.add_argument("--priority", action="store_true")
    ap.add_argument("--shard", type=str, default="", help="K/N: frames K, K+N, K+2N ... of the ordered list")
    ap.add_argument("--shot", type=str, default="", help="slide-deck shots (three_d/shots.py): a name, a comma "
                    "list, or ALL. Stills go to build/stills/NAME.png; with --clip, clips go to "
                    "build/clips/NAME/f_NNNN.png")
    ap.add_argument("--clip", action="store_true", help="with --shot: render clips instead of stills")
    ap.add_argument("--clip-frames", type=str, default="", help="with --clip: only these clip frames (comma list)")
    ap.add_argument("--clay", action="store_true", help="clay pass: every object a flat random colour")
    ap.add_argument("--vfx", action="store_true", help="photographic pass (three_d/lookdev.py): light groups, "
                    "haze, translucent washi; writes multilayer EXR (NAME.exr) for tools/comp.py")
    ap.add_argument("--no-motion", action="store_true", help="no camera motion blur")
    return ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])


def setup_device(device):
    """CPU, or every GPU this process can see (set CUDA_VISIBLE_DEVICES to give it just one)."""
    import bpy
    sc = bpy.context.scene
    device = device.upper()
    if device == "CPU":
        sc.cycles.device = "CPU"
        return "CPU"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for kind in ([device, "CUDA"] if device == "OPTIX" else [device]):
        try:
            prefs.compute_device_type = kind
        except Exception as e:  # noqa: BLE001
            print("[render] %s not available: %s" % (kind, e))
            continue
        try:
            prefs.refresh_devices()
        except Exception:
            prefs.get_devices()
        gpus = [d for d in prefs.devices if d.type == kind]
        if gpus:
            for d in prefs.devices:
                d.use = d.type == kind
            sc.cycles.device = "GPU"
            try:
                sc.cycles.denoising_use_gpu = True
            except Exception:
                pass
            print("[render] %s devices: %s" % (kind, [d.name for d in gpus]), flush=True)
            return kind
    print("[render] no %s device found; refusing to fall back to the CPU" % device, flush=True)
    sys.exit(2)


def apply_quality(sc, q, a):
    c = sc.cycles
    c.samples = a.samples if a.samples is not None else q["samples"]
    c.use_adaptive_sampling = True
    c.adaptive_threshold = a.threshold if a.threshold is not None else q["threshold"]
    c.adaptive_min_samples = min(q["min_samples"], c.samples)
    c.use_denoising = True
    c.denoiser = "OPENIMAGEDENOISE"
    try:
        c.denoising_quality = q["denoise"][0]
    except Exception:
        pass
    c.denoising_prefilter = q["denoise"][1]
    c.max_bounces, c.diffuse_bounces, c.glossy_bounces = q["bounces"]
    c.sample_clamp_indirect = q["clamp"]


def frame_list(a):
    import scene
    stages = scene.DIMS["stages"]
    last = scene.N_FRAMES - 1
    rests = sorted({s["end"] for s in stages})
    if a.frames:
        fr = [int(x) for x in a.frames.split(",") if x.strip()]
    else:
        end = last if a.end < 0 else min(a.end, last)
        fr = [f for f in range(a.start, end + 1) if (f - a.offset) % a.step == 0]
        if a.rests:
            fr = sorted(set(fr) | {f for f in rests if a.start <= f <= end})
    if a.priority:
        rank = {}
        for s in stages:
            for f in range(s["start"], s["end"] + 1):
                rank[f] = PRIORITY.index(s["id"]) if s["id"] in PRIORITY else 99
        fr.sort(key=lambda f: (0 if (f % 2 == 0 or f in rests) else 1, rank.get(f, 99), f))
    if a.shard:
        k, n = (int(v) for v in a.shard.split("/"))
        fr = fr[k::n]
    return fr


def shot_jobs(a):
    """(output path, shot name, clip frame or None) for --shot, ordered, sharded."""
    import shots
    root = os.path.dirname(HERE)
    table = shots.CLIPS if a.clip else shots.STILLS
    names = list(table) if a.shot.upper() == "ALL" else [n.strip() for n in a.shot.split(",") if n.strip()]
    for n in names:
        if n not in table:
            sys.exit("[render] unknown %s %r; known: %s" % ("clip" if a.clip else "still", n, ", ".join(table)))
    jobs = []
    if a.clip:
        base = a.out if a.out_given else os.path.join(root, "build", "clips")
        only = [int(v) for v in a.clip_frames.split(",") if v.strip()]
        for n in names:
            for i in (only or range(shots.N_CLIP)):
                jobs.append((os.path.join(base, n, "f_%04d.%s" % (i, a.ext)), n, i))
    else:
        base = a.out if a.out_given else os.path.join(root, "build", "stills")
        pre = a.prefix if a.prefix != "f_" else ""
        for n in names:
            jobs.append((os.path.join(base, "%s%s.%s" % (pre, n, a.ext)), n, None))
    if a.shard:
        k, n = (int(v) for v in a.shard.split("/"))
        jobs = jobs[k::n]
    return jobs


def main_shots(a, q):
    import bpy
    import scene
    import shots
    rx, ry = (int(v) for v in a.res.lower().split("x"))
    jobs = shot_jobs(a)
    def have(out):    # a clip frame graded by tools/comp.py (its EXR deleted) counts as done
        return os.path.exists(out) or (a.vfx and a.clip and os.path.exists(
            os.path.join(os.path.dirname(out) + "_graded", os.path.basename(out)[:-4] + ".png")))
    todo = [j for j in jobs if not (a.only_missing and have(j[0]))]
    if not todo:
        print("[render] nothing to do (%d shots frames requested, all exist)" % len(jobs), flush=True)
        return
    t0 = time.time()
    scene.build(res=(rx, ry), samples=q["samples"], preview=(a.quality != "final"), clay=a.clay)
    sc = bpy.context.scene
    apply_quality(sc, q, a)
    if a.vfx:
        import lookdev
        lookdev.apply(sc, clip=a.clip)
    if a.clip and os.environ.get("CLIP_PERSISTENT", "1") != "1":
        sc.render.use_persistent_data = False       # the slow, plain way, should the kept scene misbehave
    dev = setup_device(a.device)
    print("[render] shots, quality %s on %s, %dx%d, %d samples; %d images to do (%d requested); build %.0fs"
          % (a.quality, dev, rx, ry, sc.cycles.samples, len(todo), len(jobs), time.time() - t0), flush=True)
    t_all = time.time()
    for n, (out, name, i) in enumerate(todo):
        if a.only_missing and have(out):
            continue
        if os.path.exists(os.path.join(os.path.dirname(HERE), "build", "STOP")):
            print("[render] build/STOP exists: stopping here", flush=True)
            break
        t0 = time.time()
        os.makedirs(os.path.dirname(out), exist_ok=True)
        cap = int(os.environ.get("VFX_MAX_PENDING", "0"))
        while a.vfx and i is not None and cap and len([f for f in os.listdir(os.path.dirname(out))
                                                        if f.endswith(".exr")]) >= cap:
            time.sleep(2)          # the grader (tools/comp.py) is behind: hold, so the EXRs cannot fill the disk
        if i is None or a.no_motion:
            scene.apply_shot(shots.state(name, i))
        else:
            scene.apply_shot(shots.state(name, i), before=shots.state(name, i - 1), after=shots.state(name, i + 1))
        tmp = os.path.join(os.path.dirname(out), ".tmp_%d_%s" % (os.getpid(), os.path.basename(out)))
        sc.render.filepath = tmp
        bpy.ops.render.render(write_still=True)
        os.replace(tmp, out)
        eta = (time.time() - t_all) / (n + 1) * (len(todo) - n - 1)
        print("[render] %s%s  %.1fs  (%d/%d, eta %.0f min)" % (name, "" if i is None else " %04d" % i,
                                                             time.time() - t0, n + 1, len(todo), eta / 60), flush=True)
    print("[render] done: %d images in %.1f min" % (len(todo), (time.time() - t_all) / 60), flush=True)


def main():
    a = parse()
    a.ext = "exr" if a.vfx else "png"
    a.out_given = any(x == "--out" or x.startswith("--out=") for x in sys.argv)
    q = QUALITY[a.quality]
    if a.shot:
        return main_shots(a, q)
    import bpy
    import scene
    rx, ry = (int(v) for v in a.res.lower().split("x"))
    t0 = time.time()
    scene.build(res=(rx, ry), samples=q["samples"], preview=(a.quality != "final"), clay=a.clay)
    sc = bpy.context.scene
    apply_quality(sc, q, a)
    dev = setup_device(a.device)
    os.makedirs(a.out, exist_ok=True)

    def path(f):
        return os.path.join(a.out, "%s%04d.png" % (a.prefix, f))
    frames = frame_list(a)
    todo = [f for f in frames if not (a.only_missing and os.path.exists(path(f)))]
    print("[render] quality %s on %s, %dx%d, %d samples; %d frames to do (%d requested) -> %s; build %.0fs"
          % (a.quality, dev, rx, ry, sc.cycles.samples, len(todo), len(frames), a.out, time.time() - t0), flush=True)
    t_all = time.time()
    done = 0
    for i, f in enumerate(todo):
        out = path(f)
        if a.only_missing and os.path.exists(out):       # another process got there first
            continue
        t0 = time.time()
        scene.apply_frame(f, motion=not a.no_motion)
        tmp = os.path.join(a.out, ".tmp_%s%04d_%d.png" % (a.prefix, f, os.getpid()))
        sc.render.filepath = tmp
        bpy.ops.render.render(write_still=True)
        os.replace(tmp, out)
        done += 1
        el = time.time() - t_all
        eta = el / (i + 1) * (len(todo) - i - 1)
        print("[render] %s%04d  %.1fs  (%d/%d, eta %.0f min)" % (a.prefix, f, time.time() - t0, i + 1, len(todo),
                                                               eta / 60), flush=True)
    print("[render] done: %d frames in %.1f min" % (done, (time.time() - t_all) / 60), flush=True)


if __name__ == "__main__":
    main()
