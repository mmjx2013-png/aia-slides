#!/usr/bin/env python3
"""The edit of the Ayutthaya trailer: voice, shots, camera moves, title cards and music cues.

Run it to freeze the timeline into out/timeline.json (render.py and audio.py read that file).
Times are seconds. Every line of narration is placed so that its first sound lands on its cue;
shots and cards are placed relative to the lines, so a different voice re-times the whole film.

Camera: a = start, b = end, each (cx, cy, z): the centre of the frame as a fraction of the image
width/height, and z = the width of the frame as a fraction of the image width. The frame always has
the 2.39:1 shape of the picture area.
"""
import json, os, subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 24
W, H = 3840, 2160          # delivery frame
PH = 1606                  # picture height inside the 2.39:1 letterbox (3840 / 1606 = 2.391)
VOICE = 'tts-gemini-3-1-flash__Charon__calm'   # voice/<dir>; alternates are kept in voice/
TEMPO = 1.05               # pitch-preserving speed-up of the narration (rubberband); 1.0 = as generated
GAP = 0.45                 # silence between two lines of narration

# Line cues. 'after' = previous line's end + gap (+ extra). Lines are in narration.json.
LINES = [
    dict(id='L1', at=2.15),
    dict(id='L2', extra=0.15),
    dict(id='L3', extra=0.10),
    dict(id='L4', extra=0.15),
    dict(id='L5', extra=0.15),
    dict(id='L6', extra=2.35),    # music swell, cut to black, impact, then the fall
    dict(id='L7', extra=0.35),
    dict(id='L8', extra=0.20),
    dict(id='L9', extra=0.15),
]

# Shots. 'in' / 'out' are (anchor, offset): anchor is 'L3.start', 'L3.end' or 'abs'.
# 'xin' = length of the dissolve (or fade from black) that brings the shot in.
SHOTS = [
    dict(id='01-iudea-1662', start=('abs', 1.55), xin=1.3, fade_from_black=True,
         a=(0.47, 0.56, 0.90), b=(0.47, 0.60, 0.72), grade=dict(exp=0.10, warm=0.02)),
    dict(id='02-valentijn-1726', start=('L2.start', -0.55), xin=1.1,
         a=(0.50, 0.29, 0.86), b=(0.50, 0.50, 0.74), grade=dict(exp=-0.15, sat=0.85)),
    dict(id='03-chaiwatthanaram-drone', start=('L3.start', -0.55), xin=1.1,
         a=(0.50, 0.42, 1.00), b=(0.48, 0.55, 0.80), grade=dict(exp=-0.10)),
    dict(id='04-voc-ships-1635', start=('L4.start', -0.55), xin=1.1,
         a=(0.45, 0.76, 0.56), b=(0.30, 0.78, 0.56), grade=dict(exp=-0.10, sat=0.9)),
    dict(id='05-pasak-river', start=('L4.pause', -0.4), xin=1.1,
         a=(0.38, 0.66, 0.62), b=(0.42, 0.63, 0.55), grade=dict(exp=-0.15, sat=0.85)),
    dict(id='06-sanphet-golden', start=('L5.start', -0.55), xin=1.1,
         a=(0.52, 0.52, 0.95), b=(0.58, 0.48, 0.74), grade=dict(exp=-0.05)),
    dict(id='07-yai-chai-mongkhon', start=('L5.end', -1.6), xin=1.1,
         a=(0.57, 0.70, 0.80), b=(0.55, 0.36, 0.80), grade=dict(exp=0.0)),
    # cut to black on the impact, L6 over black, then:
    dict(id='09-lokayasutharam', start=('L7.start', -1.05), xin=1.5, fade_from_black=True,
         a=(0.36, 0.43, 0.64), b=(0.56, 0.42, 0.62), grade=dict(exp=-0.30, sat=0.8)),
    dict(id='10-buddha-head-roots', start=('L8.start', -0.75), xin=1.3,
         a=(0.47, 0.48, 0.86), b=(0.47, 0.46, 0.53), grade=dict(exp=0.05)),
    dict(id='08-chaiwatthanaram-reflection', start=('L9.start', -0.75), xin=1.2,
         a=(0.50, 0.62, 1.00), b=(0.50, 0.385, 1.00), grade=dict(exp=-0.10, sat=0.9)),
    dict(id='11-sanphet-night', start=('L9.end', -2.3), xin=1.1,
         a=(0.55, 0.50, 0.90), b=(0.56, 0.47, 0.74), grade=dict(exp=0.0)),
    dict(id='12-chaiwatthanaram-dusk', start=('TITLE', -0.6), xin=0.6,
         a=(0.60, 0.45, 0.66), b=(0.57, 0.45, 0.84), grade=dict(exp=0.0)),
]

# Title cards (rendered by cards.js from cards.html). 'in'/'out' are anchors like the shots'.
# 'dim' darkens the picture under the card. 'scale' is the slow growth of the card over its life.
# 'x' moves a card sideways (centre as a fraction of the width; default 0.5). Rule kept: no text over a Buddha's face.
CARDS = [
    dict(id='presents', big='', small='ครูสไลด์ ภูมิใจเสนอ', style='presents',
         t_in=('abs', 0.30), t_out=('abs', 1.95), fi=0.55, fo=0.5, dim=0.0, scale=0.02),
    dict(id='y1893', big='พ.ศ. ๑๘๙๓', small='ค.ศ. 1351', style='date',
         t_in=('L1.lastseg', -0.10), t_out=('L2.start', -0.45), fi=0.7, fo=0.55, dim=0.30, scale=0.03),
    dict(id='y417', big='๔๑๗ ปี', small='ราชธานี  ·  พ.ศ. ๑๘๙๓ – ๒๓๑๐', style='date',
         t_in=('L5.lastseg', -0.15), t_out=('FALL', -0.12), fi=0.6, fo=0.3, dim=0.30, scale=0.03, x=0.30),   # left of the Buddha: no text over a Buddha image
    dict(id='y2310', big='พ.ศ. ๒๓๑๐', small='ค.ศ. 1767', style='date',
         t_in=('L6.lastseg', -0.10), t_out=('L7.start', -0.25), fi=0.6, fo=0.6, dim=0.0, scale=0.03),
    dict(id='unesco', big='มรดกโลก', small='UNESCO  ·  พ.ศ. ๒๕๓๔  ·  1991', style='date',
         t_in=('L9.start', 0.10), t_out=('L9.end', 0.45), fi=0.7, fo=0.55, dim=0.30, scale=0.03),
    dict(id='title', big='อยุธยา', small='AYUTTHAYA', style='title',
         t_in=('TITLE', 0.05), t_out=('END', -0.65), fi=1.0, fo=0.9, dim=0.42, scale=0.035),
    dict(id='endcard', big='', small='ภาพ: Wikimedia Commons  ·  เครดิตทั้งหมดใน credits.md', style='end',
         t_in=('END', 0.35), t_out=('END', 2.85), fi=0.6, fo=0.6, dim=0.0, scale=0.0),
]

FALL_BEFORE_L6 = 0.95   # the cut to black (and the impact) comes this long before L6 starts
TITLE_AFTER_L9 = 0.75   # the title shot (and the second impact) comes this long after L9 ends
TITLE_LEN = 4.4         # title shot length; then a fade to black and the end card
END_CARD_LEN = 3.1

# ---------------------------------------------------------------------------------------------
WORK = os.path.join(HERE, 'out', 'work')

def prepare_voice():
    """Resample each line to 48 kHz, apply TEMPO, and find where the speech starts and ends."""
    os.makedirs(os.path.join(WORK, 'voice'), exist_ok=True)
    info = {}
    for ln in LINES:
        src = os.path.join(HERE, 'voice', VOICE, ln['id'] + '.mp3')
        dst = os.path.join(WORK, 'voice', ln['id'] + '.wav')
        af = 'aresample=48000:resampler=soxr'
        if abs(TEMPO - 1) > 1e-3:
            af += f',rubberband=tempo={TEMPO}:pitchq=quality:formant=preserved'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', af, '-ac', '1', '-c:a', 'pcm_f32le', dst], check=True)
        raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', dst, '-f', 'f32le', '-'])
        x = np.frombuffer(raw, np.float32); sr = 48000
        win = int(0.02 * sr)
        env = np.sqrt(np.convolve(x * x, np.ones(win) / win, 'same'))
        thr = max(10 ** (-45 / 20), env.max() * 10 ** (-36 / 20))
        on = env > thr
        idx = np.where(on)[0]
        t0, t1 = idx[0] / sr, idx[-1] / sr
        # phrases: runs of sound separated by >= 0.16 s of quiet
        segs, start, quiet = [], None, 0
        hop = int(0.01 * sr)
        for i in range(0, len(on), hop):
            if on[i]:
                if start is None: start = i
                quiet = 0; last = i
            elif start is not None:
                quiet += hop
                if quiet >= int(0.16 * sr):
                    segs.append((start / sr, last / sr)); start = None
        if start is not None: segs.append((start / sr, last / sr))
        info[ln['id']] = dict(file=dst, on=round(t0, 3), off=round(t1, 3), len=round(len(x) / sr, 3),
                              segs=[(round(a, 3), round(b, 3)) for a, b in segs])
    return info

def build():
    vi = prepare_voice()
    T = {}           # anchor name -> absolute time
    lines, t_prev_end = [], None
    for ln in LINES:
        v = vi[ln['id']]
        start = ln['at'] if 'at' in ln else t_prev_end + GAP + ln.get('extra', 0)
        dur = v['off'] - v['on']
        segs = [(start + a - v['on'], start + b - v['on']) for a, b in v['segs']]
        T[ln['id'] + '.start'], T[ln['id'] + '.end'] = start, start + dur
        T[ln['id'] + '.lastseg'] = segs[-1][0]
        if len(segs) > 1:      # longest pause inside the line
            gaps = [(segs[i + 1][0] - segs[i][1], (segs[i + 1][0] + segs[i][1]) / 2) for i in range(len(segs) - 1)]
            T[ln['id'] + '.pause'] = max(gaps)[1]
        lines.append(dict(id=ln['id'], start=round(start, 3), end=round(start + dur, 3), clip=v['file'],
                          clip_offset=v['on'], segs=[(round(a, 3), round(b, 3)) for a, b in segs]))
        t_prev_end = start + dur
    T['FALL'] = T['L6.start'] - FALL_BEFORE_L6
    T['TITLE'] = T['L9.end'] + TITLE_AFTER_L9
    T['END'] = T['TITLE'] + TITLE_LEN
    T['abs'] = 0.0
    total = T['END'] + END_CARD_LEN

    def at(anchor):
        name, off = anchor
        return round(T[name] + off, 3)

    shots = []
    for i, s in enumerate(SHOTS):
        st = at(s['start'])
        shots.append(dict(id=s['id'], start=st, xin=s['xin'], fade_from_black=s.get('fade_from_black', False),
                          a=s['a'], b=s['b'], grade=s.get('grade', {})))
    # each shot runs until the next one has fully dissolved in, except where the film cuts to black
    for i, s in enumerate(shots):
        nxt = shots[i + 1] if i + 1 < len(shots) else None
        if s['id'] == '07-yai-chai-mongkhon':
            s['end'], s['xout'] = round(T['FALL'], 3), 0.06            # cut to black on the impact
        elif nxt is None:
            s['end'], s['xout'] = round(T['END'], 3), 0.9              # title fades to black
        elif nxt['fade_from_black']:
            s['end'], s['xout'] = round(nxt['start'], 3), 0.6
        else:
            s['end'], s['xout'] = round(nxt['start'] + nxt['xin'], 3), 0.0
    cards = []
    for c in CARDS:
        cards.append(dict(c, t_in=at(c['t_in']), t_out=at(c['t_out'])))
    tl = dict(fps=FPS, W=W, H=H, PH=PH, duration=round(total, 3), frames=int(round(total * FPS)), voice=VOICE, tempo=TEMPO,
              anchors={k: round(v, 3) for k, v in T.items()}, lines=lines, shots=shots, cards=cards,
              music=dict(fall=round(T['FALL'], 3), title=round(T['TITLE'], 3), end=round(T['END'], 3),
                         trade=round(T['L4.start'] - 0.6, 3), glory=round(T['L5.start'] - 0.5, 3),
                         heritage=round(T['L8.start'] - 0.6, 3)))
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    json.dump(tl, open(os.path.join(HERE, 'out', 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
    return tl

if __name__ == '__main__':
    tl = build()
    print(f"duration {tl['duration']:.2f} s, {tl['frames']} frames at {tl['fps']} fps, voice {tl['voice']} x{tl['tempo']}")
    for l in tl['lines']: print(f"  {l['id']} {l['start']:6.2f} - {l['end']:6.2f}  phrases {len(l['segs'])}")
    for s in tl['shots']: print(f"  shot {s['id']:32} {s['start']:6.2f} - {s['end']:6.2f}")
    for c in tl['cards']: print(f"  card {c['id']:10} {c['t_in']:6.2f} - {c['t_out']:6.2f}")
    print('  anchors', {k: v for k, v in tl['anchors'].items() if k.isupper()})
