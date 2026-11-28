#!/usr/bin/env python3
"""Sound of the Ayutthaya trailer, all made with ffmpeg from out/timeline.json (made by edit.py).

The music bed is original and synthesised here: chord drones (aevalsrc), wind (pink noise), a riser into the
fall, two soft low impacts (the fall and the title) and a Thai-gong-like strike, in a convolution reverb whose
impulse response is itself generated noise. The narration is placed line by line, lightly treated, and the bed
is ducked under it (sidechain compression). Both mixes are normalised to -16 LUFS (two-pass loudnorm).

Output (out/work/audio/): mix.wav (voice + bed) and bed.wav (music only), 48 kHz stereo, exactly the film's length.
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, 'out', 'timeline.json'), encoding='utf-8'))
D = TL['duration']
M = TL['music']
A = os.path.join(HERE, 'out', 'work', 'audio')
SR = 48000
TARGET_LUFS = -16.0

def ff(*args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *args], check=True)

def lavfi_eval(expr_l, expr_r, dur):
    return ['-f', 'lavfi', '-i', f"aevalsrc='{expr_l}|{expr_r}':s={SR}:d={dur:.3f}"]

def env(L, fi, fo):
    """Raised-cosine fade in/out over a clip of length L (t is local time)."""
    return f"(0.5-0.5*cos(PI*clip(t/{fi},0,1)))*(0.5-0.5*cos(PI*clip(({L}-t)/{fo},0,1)))"

# ------------------------------------------------------------------ impulse responses
def make_irs():
    ff(*lavfi_eval('(2*random(0)-1)*exp(-t/0.85)', '(2*random(1)-1)*exp(-t/0.85)', 5.0),
       '-af', 'highpass=f=150,lowpass=f=4200', os.path.join(A, 'ir_long.wav'))
    ff(*lavfi_eval('(2*random(0)-1)*exp(-t/0.16)', '(2*random(1)-1)*exp(-t/0.16)', 1.2),
       '-af', 'highpass=f=200,lowpass=f=5000', os.path.join(A, 'ir_room.wav'))

def reverb(src, dst, ir, wet, dry=1.0):
    ff('-i', src, '-i', os.path.join(A, ir), '-filter_complex',
       f'[0:a]asplit[d][w];[w][1:a]afir=dry=10:wet=10[r];[d][r]amix=inputs=2:weights={dry} {wet}:normalize=0:duration=first',
       '-c:a', 'pcm_f32le', dst)

# ------------------------------------------------------------------ music
NOTE = {'D1': 36.71, 'F1': 43.65, 'G1': 49.0, 'A1': 55.0, 'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31,
        'G2': 98.0, 'A2': 110.0, 'B2': 123.47, 'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'E3': 164.81,
        'F3': 174.61, 'G3': 196.0, 'A3': 220.0, 'C#4': 277.18, 'E4': 329.63, 'A4': 440.0}

def chord_expr(notes, L, fi, fo, extra='1'):
    parts_l, parts_r = [], []
    for i, n in enumerate(notes):
        f = NOTE[n]
        amp = 0.16 / (1 + 0.35 * i)
        ph = 0.7 * i
        parts_l.append(f"{amp:.4f}*(sin(2*PI*{f}*t+{ph})+0.55*sin(2*PI*{f * 1.0035:.4f}*t+{ph + 1.1})+0.22*sin(2*PI*{2 * f:.4f}*t+{ph + 0.4}))")
        parts_r.append(f"{amp:.4f}*(sin(2*PI*{f}*t+{ph + 0.5})+0.55*sin(2*PI*{f * 0.9965:.4f}*t+{ph + 2.0})+0.22*sin(2*PI*{2 * f:.4f}*t+{ph + 1.4}))")
    e = f"{env(L, fi, fo)}*(0.86+0.14*sin(2*PI*0.12*t+1))*{extra}"
    return f"({'+'.join(parts_l)})*{e}", f"({'+'.join(parts_r)})*{e}"

def make_pads():
    fall, title, end = M['fall'], M['title'], M['end']
    # (start, end, notes, fade in, fade out, extra envelope)
    chords = [
        (0.0, M['trade'] + 1.5, ['A1', 'E2', 'A2', 'C3', 'E3'], 2.5, 3.0, '1'),
        (M['trade'] - 1.5, M['glory'] + 1.5, ['F1', 'C2', 'F2', 'A2', 'C3', 'G3'], 3.0, 3.0, '1'),
        (M['glory'] - 1.5, fall, ['G1', 'D2', 'G2', 'B2', 'D3'], 3.0, 0.05, None),       # builds into the cut
        (fall + 0.6, M['heritage'] + 2.0, ['D2', 'A2', 'D3', 'F3'], 3.5, 3.5, '1'),
        (M['heritage'] - 2.0, title + 0.3, ['A1', 'E2', 'A2', 'C3', 'E3', 'A3'], 3.5, 0.6, '1'),
        (title - 0.05, D, ['A1', 'E2', 'A2', 'C#3', 'E3', 'A3', 'E4'], 0.08, 4.5, '1'),
        (title + 0.8, D, ['C#4', 'E4', 'A4'], 2.5, 3.5, '0.55'),                            # high shimmer: hope
    ]
    ins, labels, k = [], [], 0
    for a, b, notes, fi, fo, extra in chords:
        L = b - a
        if extra is None:
            extra = f"(0.35+0.85*pow(clip(t/{L},0,1),2.2))"                              # crescendo
        el, er = chord_expr(notes, L, fi, fo, extra)
        ins += lavfi_eval(el, er, L)
        ms = int(round(a * 1000))
        labels.append(f'[{k}:a]adelay={ms}|{ms},apad=whole_dur={D}[c{k}]'); k += 1
    graph = ';'.join(labels) + ';' + ''.join(f'[c{i}]' for i in range(k)) + \
        f'amix=inputs={k}:normalize=0:duration=longest,lowpass=f=1600,highpass=f=30,atrim=0:{D}[out]'
    ff(*ins, '-filter_complex', graph, '-map', '[out]', '-c:a', 'pcm_f32le', os.path.join(A, 'pads_dry.wav'))
    reverb(os.path.join(A, 'pads_dry.wav'), os.path.join(A, 'pads.wav'), 'ir_long.wav', wet=0.55, dry=0.8)

def make_wind():
    fall = M['fall']
    vol = f"0.55*(0.62+0.30*sin(2*PI*0.071*t)+0.14*sin(2*PI*0.23*t+1.3))*(1-0.7*between(t,{fall},{fall + 1.6})*(1-(t-{fall})/1.6))"
    ff('-f', 'lavfi', '-i', f'anoisesrc=c=pink:r={SR}:a=0.5:s=11:d={D}',
       '-f', 'lavfi', '-i', f'anoisesrc=c=pink:r={SR}:a=0.5:s=29:d={D}',
       '-filter_complex', f"[0:a][1:a]join=inputs=2:channel_layout=stereo,bandpass=f=520:t=q:w=0.8,lowpass=f=2600,"
                          f"volume=eval=frame:volume='{vol}',afade=t=in:d=3,afade=t=out:st={D - 3}:d=3[out]",
       '-map', '[out]', '-c:a', 'pcm_f32le', os.path.join(A, 'wind.wav'))

def impact_expr(gain):
    boom = f"sin(2*PI*(31*t+50*0.10*(1-exp(-t/0.10))))*exp(-t/1.3)*(1-exp(-t/0.004))"
    thump = "(2*random(0)-1)*exp(-t/0.045)*0.5"
    return f"{gain}*({boom}+{thump})", f"{gain}*({boom}+(2*random(1)-1)*exp(-t/0.045)*0.5)"

def gong_expr(gain, f0=110.0):
    parts = [(1.0, 1.0, 4.5), (2.0, 0.45, 2.6), (2.42, 0.32, 2.1), (3.0, 0.22, 1.6), (4.13, 0.14, 1.0), (5.4, 0.08, 0.6)]
    bend = "(1+0.012*exp(-t/0.25))"
    sl = '+'.join(f"{a}*sin(2*PI*{f0 * r:.3f}*{bend}*t+{i})*exp(-t/{d})" for i, (r, a, d) in enumerate(parts))
    sr = '+'.join(f"{a}*sin(2*PI*{f0 * r * 1.002:.3f}*{bend}*t+{i + 0.6})*exp(-t/{d})" for i, (r, a, d) in enumerate(parts))
    att = "(1-exp(-t/0.006))"
    return f"{gain}*({sl})*{att}", f"{gain}*({sr})*{att}"

def make_fx():
    fall, title = M['fall'], M['title']
    R = 4.6                                                   # riser length
    riser_l = f"(0.20*(2*random(0)-1)+0.05*sin(2*PI*220*{R}/log(2)*(pow(2,t/{R})-1)))*pow(t/{R},3)"
    riser_r = f"(0.20*(2*random(1)-1)+0.05*sin(2*PI*220*{R}/log(2)*(pow(2,t/{R})-1)+1))*pow(t/{R},3)"
    events = [  # (start, expr pair, length, filter)
        (fall - R, (riser_l, riser_r), R, 'highpass=f=900,lowpass=f=7000'),
        (fall, impact_expr(0.9), 5.0, 'lowpass=f=2200'),
        (title, impact_expr(0.75), 5.0, 'lowpass=f=2200'),
        (title + 0.02, gong_expr(0.10), 6.0, 'lowpass=f=3500'),
        (0.25, gong_expr(0.05, 98.0), 6.0, 'lowpass=f=3000'),
    ]
    ins, labels = [], []
    for k, (st, (el, er), L, flt) in enumerate(events):
        ins += lavfi_eval(el, er, L)
        ms = int(round(st * 1000))
        labels.append(f'[{k}:a]{flt},adelay={ms}|{ms},apad=whole_dur={D}[e{k}]')
    graph = ';'.join(labels) + ';' + ''.join(f'[e{i}]' for i in range(len(events))) + \
        f'amix=inputs={len(events)}:normalize=0:duration=longest,atrim=0:{D}[out]'
    ff(*ins, '-filter_complex', graph, '-map', '[out]', '-c:a', 'pcm_f32le', os.path.join(A, 'fx_dry.wav'))
    reverb(os.path.join(A, 'fx_dry.wav'), os.path.join(A, 'fx.wav'), 'ir_long.wav', wet=0.45, dry=0.9)

def make_bed():
    ff('-i', os.path.join(A, 'pads.wav'), '-i', os.path.join(A, 'wind.wav'), '-i', os.path.join(A, 'fx.wav'),
       '-filter_complex', f'[0:a][1:a][2:a]amix=inputs=3:weights=1.0 0.22 1.0:normalize=0,atrim=0:{D}[out]',
       '-map', '[out]', '-c:a', 'pcm_f32le', os.path.join(A, 'bed_raw.wav'))

# ------------------------------------------------------------------ voice
def make_voice():
    ins, labels = [], []
    for k, ln in enumerate(TL['lines']):
        ins += ['-i', ln['clip']]
        pre = 0.08                                            # keep a breath of the attack
        st = max(ln['clip_offset'] - pre, 0)
        ms = int(round((ln['start'] - (ln['clip_offset'] - st)) * 1000))
        labels.append(f'[{k}:a]atrim=start={st:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,adelay={ms},apad=whole_dur={D}[v{k}]')
    n = len(TL['lines'])
    graph = ';'.join(labels) + ';' + ''.join(f'[v{i}]' for i in range(n)) + \
        f'amix=inputs={n}:normalize=0:duration=longest,highpass=f=75,equalizer=f=190:t=q:w=1:g=1.5,' \
        f'equalizer=f=3200:t=q:w=1.2:g=2,acompressor=threshold=0.12:ratio=3:attack=8:release=160:makeup=1.4,' \
        f'pan=stereo|c0=c0|c1=c0,atrim=0:{D}[out]'
    ff(*ins, '-filter_complex', graph, '-map', '[out]', '-c:a', 'pcm_f32le', os.path.join(A, 'voice_dry.wav'))
    reverb(os.path.join(A, 'voice_dry.wav'), os.path.join(A, 'voice.wav'), 'ir_room.wav', wet=0.10, dry=1.0)

# ------------------------------------------------------------------ mix + loudness
def loudnorm(src, dst):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', src, '-af', f'loudnorm=I={TARGET_LUFS}:TP=-1.5:LRA=14:print_format=json',
                        '-f', 'null', '-'], capture_output=True, text=True)
    m = json.loads(re.findall(r'\{[^{}]*\}', r.stderr)[-1])
    af = (f"loudnorm=I={TARGET_LUFS}:TP=-1.5:LRA=14:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,"
          f"aresample={SR},atrim=0:{D},apad=whole_dur={D}")
    ff('-i', src, '-af', af, '-ar', str(SR), '-c:a', 'pcm_s24le', dst)

def make_mix():
    ff('-i', os.path.join(A, 'bed_raw.wav'), '-i', os.path.join(A, 'voice.wav'), '-filter_complex',
       '[1:a]asplit[key][v];[0:a][key]sidechaincompress=threshold=0.015:ratio=5:attack=90:release=650:makeup=1[duck];'
       f'[duck][v]amix=inputs=2:weights=1.0 1.0:normalize=0,alimiter=limit=0.9:level=false,atrim=0:{D}[out]',
       '-map', '[out]', '-c:a', 'pcm_f32le', os.path.join(A, 'mix_raw.wav'))
    loudnorm(os.path.join(A, 'mix_raw.wav'), os.path.join(A, 'mix.wav'))
    ff('-i', os.path.join(A, 'bed_raw.wav'), '-af', f'alimiter=limit=0.9:level=false,atrim=0:{D}', '-c:a', 'pcm_f32le',
       os.path.join(A, 'bed_lim.wav'))
    loudnorm(os.path.join(A, 'bed_lim.wav'), os.path.join(A, 'bed.wav'))

STEPS = dict(irs=make_irs, pads=make_pads, wind=make_wind, fx=make_fx, bed=make_bed, voice=make_voice, mix=make_mix)

if __name__ == '__main__':
    os.makedirs(A, exist_ok=True)
    steps = sys.argv[1:] or list(STEPS)
    for s in steps:
        print('audio:', s, flush=True); STEPS[s]()
