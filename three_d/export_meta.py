"""export_meta.py - write site/assets/seq/meta.json (README v3 contract).

    python3 three_d/export_meta.py                  # frames that exist as site/assets/seq/d/f_NNNN.webp
    python3 three_d/export_meta.py --all            # every frame 0..983 (to check a path before rendering)
    python3 three_d/export_meta.py --from build/preview --out /tmp/meta.json   # frames found in a folder

`available` lists the full-rate frame numbers that exist as files; `camera` and every anchors array are
indexed like `available`. A camera entry is [px, py, pz, qw, qx, qy, qz]: world location and world
rotation quaternion (Blender convention: the camera looks down its local -Z, +Y is up).

Projection of a world point P to the 1920x1080 frame (0..1, origin top-left), which the site uses for
the wall points and which this script uses for the anchors:
    p = R^-1 (P - C)                     (camera space; in front of the camera p.z < 0)
    u = 0.5 + focal/sensor_w * p.x / -p.z + shift_x
    v = 0.5 - (focal/sensor_w * p.y / -p.z + shift_y) * 1920/1080
With this formula the frame is shifted DOWN (more floor) by a POSITIVE shift_y, so meta.json carries
lens.shift_y = +0.05. Blender's own camera property for the same shift is shift_y = -0.05 (opposite
sign convention). `python3 three_d/export_meta.py --selftest` checks the formula against Blender.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

SEQ = os.path.join(ROOT, "site", "assets", "seq")
W_PX, H_PX = 1920, 1080
CROP = [656, 0, 608, 1080]


def lens(scene):
    return {"focal_mm": scene.FOCAL, "sensor_w_mm": scene.SENSOR, "shift_x": 0.0, "shift_y": -scene.SHIFT_Y}


def project(M_inv, ln, P):
    """World point -> (u, v, visible) with the documented formula. M_inv: inverse camera world matrix."""
    from mathutils import Vector
    p = M_inv @ Vector(P)
    if p.z > -1e-6:
        return 0.0, 0.0, 0
    k = ln["focal_mm"] / ln["sensor_w_mm"]
    u = 0.5 + k * p.x / -p.z + ln["shift_x"]
    v = 0.5 - (k * p.y / -p.z + ln["shift_y"]) * W_PX / H_PX
    vis = 1 if (0.0 <= u <= 1.0 and 0.0 <= v <= 1.0) else 0
    return round(u, 5), round(v, 5), vis


def found_frames(folder, ext):
    out = []
    if os.path.isdir(folder):
        for n in os.listdir(folder):
            m = re.match(r"f_(\d{4})\.%s$" % ext, n)
            if m:
                out.append(int(m.group(1)))
    return sorted(out)


def selftest(scene):
    """Compare the documented formula with Blender's own projection for a few world points."""
    import bpy
    from bpy_extras.object_utils import world_to_camera_view
    from mathutils import Vector
    sc = bpy.context.scene
    ln = lens(scene)
    worst = 0.0
    for f in (0, 329, 491, 683, 845):
        scene.apply_frame(f, motion=False)
        bpy.context.view_layer.update()
        Mi = scene.camera_matrix(f).inverted()
        for P in ((scene.HX, 4.55, 1.30), (0.0, 0.0, 1.1), (0.0, 7.4, 1.0), (-1.0, 2.0, 0.0)):
            ref = world_to_camera_view(sc, sc.camera, Vector(P))
            if ref.z <= 0:
                continue
            u, v, _ = project(Mi, ln, P)
            worst = max(worst, abs(u - ref.x), abs(v - (1.0 - ref.y)))
    print("[meta] selftest: largest difference from Blender's projection = %.6f of the frame" % worst)
    return worst < 1e-4


def main():
    args = sys.argv[1:]
    out = os.path.join(SEQ, "meta.json")
    if "--out" in args:
        out = args[args.index("--out") + 1]
    import scene
    scene.build(res=(W_PX, H_PX), samples=1, preview=True)
    if "--selftest" in args:
        sys.exit(0 if selftest(scene) else 1)
    if "--all" in args:
        avail = list(range(scene.N_FRAMES))
    elif "--from" in args:
        avail = found_frames(args[args.index("--from") + 1], "png")
    else:
        avail = found_frames(os.path.join(SEQ, "d"), "webp")
    ln = lens(scene)
    cams, anchors = [], {}
    q_prev = None
    for i, f in enumerate(avail):
        scene.update_cloth(f)                      # the anchors read the cloth; the camera is analytic
        M = scene.camera_matrix(f)
        q = M.to_quaternion()
        if q_prev is not None and q.dot(q_prev) < 0:     # same rotation; keep the sign continuous for slerp
            q.negate()
        q_prev = q.copy()
        t = M.translation
        cams.append([round(t.x, 5), round(t.y, 5), round(t.z, 5), round(q.w, 6), round(q.x, 6), round(q.y, 6),
                     round(q.z, 6)])
        Mi = M.inverted()
        for name, P in scene.anchors_world(f).items():
            anchors.setdefault(name, [[0.0, 0.0, 0]] * i).append(list(project(Mi, ln, P)))
        for name in anchors:                        # keep every array as long as `available`
            if len(anchors[name]) < i + 1:
                anchors[name].append([0.0, 0.0, 0])
    meta = {
        "fps": scene.FPS, "frames": scene.N_FRAMES, "size": [W_PX, H_PX], "mobileCrop": CROP,
        "available": avail,
        "stages": [{"id": s["id"], "start": s["start"], "end": s["end"]} for s in scene.DIMS["stages"]],
        "lens": ln,
        "camera": cams,
        "walls": scene.walls_meta(),
        "anchors": anchors,
    }
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as fh:
        json.dump(meta, fh, separators=(",", ":"))
    print("[meta] %d frames available, %d anchors -> %s" % (len(avail), len(anchors), out))


if __name__ == "__main__":
    main()
