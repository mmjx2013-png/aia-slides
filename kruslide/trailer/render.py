#!/usr/bin/env python3
"""Render the picture of the Ayutthaya trailer from out/timeline.json (made by edit.py).

Why not ffmpeg zoompan: zoompan snaps the crop to whole pixels, so slow 4K moves step and jitter.
Here every frame is a float-accurate affine resample (OpenCV warpAffine, Lanczos-4) of a source that was
first reduced with area filtering so the camera never shrinks it again: no stepping, no aliasing shimmer.

usage:
  python3 render.py                    render the whole film -> out/work/video_4k.mp4 (H.264, no audio)
  python3 render.py --stills 3.5 20    write full-size JPEG stills at those times to out/work/stills/
  python3 render.py --range 10 15 x.mp4   render only seconds 10-15 to x.mp4 (for checks)
options: --workers N (default: CPU count), --crf N (default 17; peaks are capped at 60 Mbit/s)
"""
import json, math, os, subprocess, sys, time
import multiprocessing as mp
import numpy as np
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, 'out', 'timeline.json'), encoding='utf-8'))
W, H, PH, FPS = TL['W'], TL['H'], TL['PH'], TL['fps']
TOP = (H - PH) // 2
WORK = os.path.join(HERE, 'out', 'work')

# ---------------------------------------------------------------- the look
GLOBAL_SAT = 0.88
GRAIN = 0.024          # std-dev of the grain field before it is enlarged to grain-sized clumps
VIGNETTE = 0.38        # darkening in the far corners
GLOW = 0.22            # warm halation around highlights

def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)

def ease(x):
    """Ease for dissolves and fades (sine in-out)."""
    x = min(max(x, 0.0), 1.0)
    return 0.5 - 0.5 * math.cos(math.pi * x)

def build_lut(grade):
    """Per-channel 8-bit -> float LUT (B, G, R): exposure, a soft filmic S-curve, warm highlights, slightly cool lifted shadows."""
    v = np.arange(256, dtype=np.float64) / 255.0
    lin = v ** 2.2 * 2.0 ** grade.get('exp', 0.0)
    v = np.clip(lin, 0, None) ** (1 / 2.2)
    v = v + 0.20 * (smoothstep(v) - v)                    # gentle S-curve
    shoulder = 0.82
    hi = v > shoulder
    v[hi] = shoulder + (1 - shoulder) * np.tanh((v[hi] - shoulder) / (1 - shoulder) * 1.1) / np.tanh(1.1) * 0.985
    warm = grade.get('warm', 0.0)
    r = np.clip(v * (1.035 + warm), 0, None) ** 0.97
    g = v * 1.0
    b = np.clip(v * (0.90 - warm), 0, None) ** 1.04
    sh = (1 - v) ** 3
    r, g, b = r + 0.010 * sh, g + 0.016 * sh, b + 0.024 * sh   # lifted, slightly cool blacks
    return [np.clip(c, 0, 1).astype(np.float32) for c in (b, g, r)]

_vig = None
def vignette():
    global _vig
    if _vig is None:
        y, x = np.mgrid[0:PH, 0:W].astype(np.float32)
        dx = (x - W / 2) / (W / 2); dy = (y - PH / 2) / (PH / 2)
        d = np.sqrt(dx * dx * 0.85 + dy * dy * 0.55)
        _vig = (1 - VIGNETTE * smoothstep((d - 0.35) / 0.85)).astype(np.float32)[..., None]
    return _vig

# ---------------------------------------------------------------- sources
_src = {}
def source(shot):
    """The shot's image, reduced (area filter) so the widest frame of the move is exactly W pixels wide."""
    sid = shot['id']
    if sid in _src:
        return _src[sid]
    if len(_src) >= 4:
        _src.pop(next(iter(_src)))
    fn = [f for f in os.listdir(os.path.join(HERE, 'img')) if f.startswith(sid + '.')][0]
    img = cv2.imread(os.path.join(HERE, 'img', fn), cv2.IMREAD_COLOR)
    h, w = img.shape[:2]
    zmax = max(shot['a'][2], shot['b'][2]); zmin = min(shot['a'][2], shot['b'][2])
    f = W / (zmax * w)
    if f < 1:
        img = cv2.resize(img, (round(w * f), round(h * f)), interpolation=cv2.INTER_AREA)
    mag = W / (zmin * img.shape[1])                       # largest enlargement during the move
    if mag > 1.15:                                        # light unsharp mask for enlarged frames
        blur = cv2.GaussianBlur(img, (0, 0), 1.1)
        img = cv2.addWeighted(img, 1.22, blur, -0.22, 0)
    _src[sid] = (img, build_lut(shot.get('grade', {})), shot.get('grade', {}).get('sat', 1.0))
    return _src[sid]

def camera(shot, t):
    u = (t - shot['start']) / (shot['end'] - shot['start'])
    u = min(max(u, 0.0), 1.0)
    e = 0.7 * u + 0.3 * float(smoothstep(u))
    (ax, ay, az), (bx, by, bz) = shot['a'], shot['b']
    z = az * (bz / az) ** e                                # constant-speed zoom
    return ax + (bx - ax) * e, ay + (by - ay) * e, z

SHUTTER = 0.5          # 180-degree shutter: motion blur over half a frame, like a film camera

def crop_matrix(img, shot, t):
    ih, iw = img.shape[:2]
    cx, cy, z = camera(shot, t)
    cw = z * iw; ch = cw * PH / W
    x0 = cx * iw - cw / 2; y0 = cy * ih - ch / 2
    sx, sy = cw / W, ch / PH
    return np.array([[sx, 0, x0 + 0.5 * sx - 0.5], [0, sy, y0 + 0.5 * sy - 0.5]], np.float64)

def motion_px(img, shot, t):
    """How far (output pixels) the picture corners travel during the shutter interval."""
    dt = SHUTTER / FPS
    A, B = crop_matrix(img, shot, t - dt / 2), crop_matrix(img, shot, t + dt / 2)
    worst = 0.0
    for u, v in ((0, 0), (W, 0), (0, PH), (W, PH), (W / 2, PH / 2)):
        pa = A @ (u, v, 1); pb = B @ (u, v, 1)              # source position of this output pixel at both times
        worst = max(worst, float(np.hypot(*(pb - pa))) / A[0, 0])
    return worst

def shot_frame(shot, t):
    img, lut, sat = source(shot)
    blur = motion_px(img, shot, t)
    n = 1 if blur < 1.2 else min(6, int(math.ceil(blur / 1.3)) + 1)
    if n == 1:
        px = cv2.warpAffine(img, crop_matrix(img, shot, t), (W, PH), flags=cv2.INTER_LANCZOS4 | cv2.WARP_INVERSE_MAP,
                            borderMode=cv2.BORDER_REFLECT)
    else:   # temporal supersampling across the shutter interval = true motion blur for pans, tilts and zooms
        acc = np.zeros((PH, W, 3), np.uint16)
        for k in range(n):
            tk = t + ((k + 0.5) / n - 0.5) * SHUTTER / FPS
            acc += cv2.warpAffine(img, crop_matrix(img, shot, tk), (W, PH), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP,
                                  borderMode=cv2.BORDER_REFLECT)
        px = ((acc + n // 2) // n).astype(np.uint8)
    out = np.empty((PH, W, 3), np.float32)
    for c in range(3):
        out[..., c] = lut[c][px[..., c]]
    if abs(sat - 1) > 1e-3:
        lum = out[..., 0] * 0.0722 + out[..., 1] * 0.7152 + out[..., 2] * 0.2126
        out = lum[..., None] + sat * (out - lum[..., None])
    return out

# ---------------------------------------------------------------- cards
_cards = {}
def card(c):
    if c['id'] not in _cards:
        im = cv2.imread(os.path.join(WORK, 'cards', c['id'] + '.png'), cv2.IMREAD_UNCHANGED).astype(np.float32) / 255
        a = im[..., 3]
        ys, xs = np.where(a > 0.002)
        m = 60
        y0, y1, x0, x1 = max(ys.min() - m, 0), min(ys.max() + m, PH), max(xs.min() - m, 0), min(xs.max() + m, W)
        rgb = im[y0:y1, x0:x1, :3] * a[y0:y1, x0:x1, None]   # premultiplied
        _cards[c['id']] = (np.dstack([rgb, a[y0:y1, x0:x1]]), (y0, y1, x0, x1))
    return _cards[c['id']]

def card_opacity(c, t):
    if t < c['t_in'] or t >= c['t_out']:
        return 0.0
    return ease((t - c['t_in']) / c['fi']) * ease((c['t_out'] - t) / c['fo'])

def apply_card(x, c, t, o):
    rgba, (y0, y1, x0, x1) = card(c)
    life = (t - c['t_in']) / max(c['t_out'] - c['t_in'], 1e-6)
    s = 1.0 + c.get('scale', 0.0) * life                   # slow, sub-pixel growth about the card's own centre
    cxp, cyp = (x0 + x1) / 2, (y0 + y1) / 2
    gy = int(math.ceil((y1 - y0) * (s - 1) / 2)) + 2         # grow the box so the scaled card still fits
    gx = int(math.ceil((x1 - x0) * (s - 1) / 2)) + 2
    Y0, Y1, X0, X1 = max(y0 - gy, 0), min(y1 + gy, PH), max(x0 - gx, 0), min(x1 + gx, W)
    # destination pixel (u, v) in box coords -> source pixel in card-crop coords
    M = np.array([[1 / s, 0, (X0 - cxp) / s + cxp - x0], [0, 1 / s, (Y0 - cyp) / s + cyp - y0]], np.float64)
    warped = cv2.warpAffine(rgba, M, (X1 - X0, Y1 - Y0), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP,
                            borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    a = np.clip(warped[..., 3:4], 0, 1) * o
    region = x[Y0:Y1, X0:X1]
    region *= (1 - a)
    region += np.clip(warped[..., :3], 0, 1) * o

# ---------------------------------------------------------------- one frame
def frame(n):
    t = n / FPS
    x = np.zeros((PH, W, 3), np.float32)
    for s in TL['shots']:
        if not (s['start'] <= t < s['end']):
            continue
        a = ease((t - s['start']) / s['xin']) * (ease((s['end'] - t) / s['xout']) if s['xout'] > 0 else 1.0)
        if a <= 0:
            continue
        f = shot_frame(s, t)
        if a >= 1:
            x = f
        else:
            x *= (1 - a); x += f * a
    lum = x[..., 0] * 0.0722 + x[..., 1] * 0.7152 + x[..., 2] * 0.2126
    x = lum[..., None] + GLOBAL_SAT * (x - lum[..., None])
    # halation: warm glow around bright areas (computed at 1/8 size)
    hl = np.clip(lum - 0.62, 0, None)
    if hl.max() > 0:
        small = cv2.resize(hl, (W // 8, PH // 8), interpolation=cv2.INTER_AREA)
        small = cv2.GaussianBlur(small, (0, 0), 5)
        glow = cv2.resize(small, (W, PH), interpolation=cv2.INTER_LINEAR)
        x += glow[..., None] * (GLOW * np.array([0.25, 0.55, 1.0], np.float32))
    # cards (and the dimming under them)
    for c in TL['cards']:
        o = card_opacity(c, t)
        if o > 0:
            if c.get('dim'):
                x *= (1 - c['dim'] * o)
            apply_card(x, c, t, o)
    x *= vignette()
    # film grain: fresh every frame, about 3 px in size, strongest in the mid-tones, monochrome
    rng = np.random.default_rng(7919 + n)
    g = rng.standard_normal((PH // 3, W // 3), dtype=np.float32)
    g = cv2.resize(g, (W, PH), interpolation=cv2.INTER_CUBIC)
    lum = x[..., 0] * 0.0722 + x[..., 1] * 0.7152 + x[..., 2] * 0.2126
    m = np.clip(0.30 + 2.8 * lum * (1 - lum), 0, 1) * (lum > 0.004)
    x += (g * m * GRAIN)[..., None]
    out = np.zeros((H, W, 3), np.uint8)
    np.clip(x * 255 + 0.5, 0, 255, out=x)
    out[TOP:TOP + PH] = x.astype(np.uint8)
    return out

# ---------------------------------------------------------------- encoding
def x264_args(crf):
    return ['-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-tune', 'film', '-profile:v', 'high', '-level:v', '5.1',
            '-pix_fmt', 'yuv420p', '-maxrate', '60M', '-bufsize', '120M', '-x264-params', f'keyint={FPS * 2}:min-keyint={FPS}',
            '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']

def encode_range(args):
    a, b, path, crf, threads = args
    cv2.setNumThreads(1)
    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
           '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int', '-threads', str(threads)] + x264_args(crf) + [path]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t0 = time.time()
    for n in range(a, b):
        p.stdin.write(frame(n).tobytes())
        if (n - a) % 48 == 0:
            print(f'  [{os.path.basename(path)}] frame {n - a}/{b - a}  {time.time() - t0:.0f}s', flush=True)
    p.stdin.close()
    if p.wait() != 0:
        raise RuntimeError('ffmpeg failed for ' + path)
    return path

def render(a, b, out, workers, crf):
    os.makedirs(WORK, exist_ok=True)
    n = b - a
    k = max(1, min(workers, n // 48))
    edges = [a + round(i * n / k) for i in range(k + 1)]
    parts = [os.path.join(WORK, f'part{i:02d}.mp4') for i in range(k)]
    jobs = [(edges[i], edges[i + 1], parts[i], crf, 2) for i in range(k)]
    with mp.get_context('fork').Pool(k) as pool:
        pool.map(encode_range, jobs, chunksize=1)
    lst = os.path.join(WORK, 'parts.txt')
    open(lst, 'w').write(''.join(f"file '{p}'\n" for p in parts))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', out], check=True)
    for p in parts:
        os.remove(p)

if __name__ == '__main__':
    args = sys.argv[1:]
    workers = os.cpu_count(); crf = 17
    if '--workers' in args:
        i = args.index('--workers'); workers = int(args[i + 1]); del args[i:i + 2]
    if '--crf' in args:
        i = args.index('--crf'); crf = int(args[i + 1]); del args[i:i + 2]
    t0 = time.time()
    if args and args[0] == '--stills':
        d = os.path.join(WORK, 'stills'); os.makedirs(d, exist_ok=True)
        for s in args[1:]:
            n = int(round(float(s) * FPS))
            p = os.path.join(d, f'still_{float(s):06.2f}.jpg')
            cv2.imwrite(p, frame(n), [cv2.IMWRITE_JPEG_QUALITY, 92]); print(p)
    elif args and args[0] == '--range':
        a, b = int(round(float(args[1]) * FPS)), int(round(float(args[2]) * FPS))
        render(a, b, args[3], workers, crf)
    else:
        render(0, TL['frames'], os.path.join(WORK, 'video_4k.mp4'), workers, crf)
    print(f'done in {time.time() - t0:.0f} s')
