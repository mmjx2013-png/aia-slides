#!/usr/bin/env python3
"""Checks on the finished trailer. Writes out/qa/report.txt, out/qa/contact-sheet.jpg and out/qa/smooth-5s-4k.mp4.

1. Contact sheet: one frame every 2 s of the 4K master.
2. Smoothness: a 5 s 4K clip of the fastest move (a pan) is cut from the master, and the frame-to-frame motion
   is measured by phase correlation. A smooth move changes speed gradually; jitter shows as a jumpy series.
3. Streams: picture and sound lengths, sizes, codecs, frame rate, sample rate.
4. Loudness (EBU R128) of the sound in each MP4.
5. Title cards: every card's ink stays inside the picture with a margin (no clipped Thai vowels or tone marks).
"""
import json, os, subprocess
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
QA = os.path.join(OUT, 'qa')
TL = json.load(open(os.path.join(OUT, 'timeline.json'), encoding='utf-8'))
W, H, PH, FPS = TL['W'], TL['H'], TL['PH'], TL['fps']
MASTER = os.path.join(OUT, 'ayutthaya-4k.mp4')
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
lines = []

def log(s=''):
    print(s); lines.append(s)

def probe(path):
    r = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
                                 'format=duration,size,bit_rate:stream=codec_type,codec_name,profile,width,height,r_frame_rate,'
                                 'sample_rate,channels,duration,nb_frames,pix_fmt', '-of', 'json', path])
    return json.loads(r)

def frames_at(path, times, w, h):
    out = []
    for t in times:
        raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', path, '-frames:v', '1',
                                       '-vf', f'scale={w}:{h}:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
        out.append(Image.frombytes('RGB', (w, h), raw))
    return out

def contact_sheet():
    dur = TL['frames'] / FPS
    times = [t + 0.02 for t in np.arange(0, dur, 2.0)]
    tw, th, cols = 640, 360, 5
    ims = frames_at(MASTER, times, tw, th)
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw, rows * (th + 30)), (20, 20, 20))
    d = ImageDraw.Draw(sheet); f = ImageFont.truetype(FONT, 18)
    for i, (t, im) in enumerate(zip(times, ims)):
        x, y = (i % cols) * tw, (i // cols) * (th + 30)
        sheet.paste(im, (x, y)); d.text((x + 8, y + th + 5), f'{int(t) // 60}:{int(t) % 60:02d}', fill=(230, 230, 230), font=f)
    p = os.path.join(QA, 'contact-sheet.jpg'); sheet.save(p, quality=88)
    log(f'contact sheet: {p} ({len(ims)} frames, every 2 s)')

def smoothness():
    # the fastest sideways move: the reclining Buddha pan, before the next dissolve
    s = next(x for x in TL['shots'] if x['id'] == '09-lokayasutharam')
    t0 = s['start'] + s['xin'] + 0.2
    clip = os.path.join(QA, 'smooth-5s-4k.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t0:.3f}', '-i', MASTER, '-t', '5', '-map', '0:v', '-c:v', 'libx264',
                    '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', clip], check=True)
    proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', clip, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], stdout=subprocess.PIPE)
    win = cv2.createHanningWindow((1536, 768), cv2.CV_32F)
    prev, d = None, []
    while True:
        b = proc.stdout.read(W * H)
        if len(b) < W * H: break
        f = np.frombuffer(b, np.uint8).reshape(H, W)[700:1468, 1152:2688].astype(np.float32)
        f = cv2.GaussianBlur(f, (0, 0), 1.5)
        if prev is not None:
            (dx, dy), _ = cv2.phaseCorrelate(prev, f, win); d.append((dx, dy))
        prev = f
    proc.wait()
    end_fade = s['end'] - s['xout'] - t0            # stop before the next shot starts to dissolve in
    nxt = next(x for x in TL['shots'] if x['start'] > s['start'])
    usable = int(min(nxt['start'] - t0, 5.0) * FPS) - 1
    d = np.array(d[:usable])
    dd = np.diff(d[:, 0])
    log(f'smoothness clip: {clip} (5 s from {t0:.2f} s, pan of the reclining Buddha; {len(d)} frame pairs before the next dissolve)')
    log(f'  pan speed {abs(d[:, 0]).mean():.2f} px/frame (min {abs(d[:, 0]).min():.2f}, max {abs(d[:, 0]).max():.2f}); vertical drift {d[:, 1].mean():+.3f} px/frame')
    log(f'  frame-to-frame change of speed: rms {np.sqrt(np.mean(dd ** 2)):.3f} px, worst {np.abs(dd).max():.3f} px '
        f'-> {"SMOOTH (no stepping or jitter)" if np.abs(dd).max() < 0.25 else "CHECK: uneven motion"}')
    # sparkline image of the speed
    g = Image.new('RGB', (900, 220), (16, 16, 16)); dr = ImageDraw.Draw(g)
    sp = np.abs(d[:, 0]); lo, hi = sp.min() - 0.5, sp.max() + 0.5
    pts = [(20 + i * 860 / max(len(sp) - 1, 1), 200 - (v - lo) / (hi - lo) * 180) for i, v in enumerate(sp)]
    dr.line(pts, fill=(240, 200, 120), width=3)
    dr.text((24, 6), f'pan speed per frame (px), {lo + 0.5:.1f}-{hi - 0.5:.1f}: smooth = a clean curve', fill=(220, 220, 220), font=ImageFont.truetype(FONT, 16))
    g.save(os.path.join(QA, 'smooth-speed.png'))

def streams():
    for f in ('ayutthaya-4k.mp4', 'ayutthaya-4k-novoice.mp4', 'ayutthaya-1080.mp4'):
        p = os.path.join(OUT, f); j = probe(p)
        v = next(s for s in j['streams'] if s['codec_type'] == 'video'); a = next(s for s in j['streams'] if s['codec_type'] == 'audio')
        vd, ad = float(v['duration']), float(a['duration'])
        log(f'{f}: {int(j["format"]["size"]) / 1e6:.1f} MB, {int(j["format"]["bit_rate"]) / 1e6:.1f} Mbit/s; video {v["codec_name"]} {v.get("profile")} '
            f'{v["width"]}x{v["height"]} {v["r_frame_rate"]} fps {v["pix_fmt"]}, {vd:.3f} s ({v["nb_frames"]} frames); '
            f'audio {a["codec_name"]} {a["sample_rate"]} Hz {a["channels"]} ch, {ad:.3f} s; '
            f'length difference {abs(vd - ad) * 1000:.0f} ms {"OK" if abs(vd - ad) < 0.05 else "CHECK"}')

def loudness():
    for f in ('ayutthaya-4k.mp4', 'ayutthaya-4k-novoice.mp4', 'ayutthaya-1080.mp4'):
        r = subprocess.run(['ffmpeg', '-hide_banner', '-i', os.path.join(OUT, f), '-map', '0:a', '-af', 'ebur128=peak=true',
                            '-f', 'null', '-'], capture_output=True, text=True).stderr
        summ = r[r.rfind('Summary:'):]
        val = lambda key: summ.split(key)[1].split()[0]
        log(f'{f}: integrated {val("I:")} LUFS, range {val("LRA:")} LU, true peak {val("Peak:")} dBFS')

def cards():
    for c in TL['cards']:
        im = cv2.imread(os.path.join(OUT, 'work', 'cards', c['id'] + '.png'), cv2.IMREAD_UNCHANGED)
        a = im[..., 3]; ys, xs = np.where(a > 2)
        m = min(xs.min(), ys.min(), W - 1 - xs.max(), PH - 1 - ys.max())
        log(f'card {c["id"]:9} ink box x {xs.min()}-{xs.max()} y {ys.min()}-{ys.max()} of {W}x{PH}; nearest edge {m} px '
            f'{"OK" if m > 40 else "CHECK: may be clipped"}; on screen {c["t_in"]:.2f}-{c["t_out"]:.2f} s')

if __name__ == '__main__':
    os.makedirs(QA, exist_ok=True)
    log(f'Ayutthaya trailer QA - timeline {TL["duration"]:.2f} s, {TL["frames"]} frames at {FPS} fps, voice {TL["voice"]} x{TL["tempo"]}')
    log('\n[streams]'); streams()
    log('\n[loudness]'); loudness()
    log('\n[title cards]'); cards()
    log('\n[smoothness]'); smoothness()
    log('\n[contact sheet]'); contact_sheet()
    open(os.path.join(QA, 'report.txt'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
