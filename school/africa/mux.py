#!/usr/bin/env python3
"""Narration track (each clip placed at its scene start) + recorded video -> build/africa.mp4"""
import json, subprocess
from pathlib import Path
import script
HERE = Path(__file__).parent; B = HERE / 'build'
tm = json.load(open(B / 'timing.json')); rec = json.load(open(B / 'rec.json'))
t, starts, n = 0.0, [], len(tm)
for i, x in enumerate(tm):
    starts.append(t + (3 if i == 0 else 0)); t += x['d'] + 1.2 + (3 if i == 0 else 0) + (4 if i == n - 1 else 0)
total = t
args = ['ffmpeg', '-v', 'error', '-y']
for x in tm: args += ['-i', str(HERE / 'audio' / x['f'])]
fc = ''.join(f'[{i}:a]adelay={int(s * 1000)}|{int(s * 1000)}[a{i}];' for i, s in enumerate(starts))
fc += ''.join(f'[a{i}]' for i in range(n)) + f'amix=inputs={n}:normalize=0:dropout_transition=0,apad,atrim=0:{total:.2f}[out]'
subprocess.run(args + ['-filter_complex', fc, '-map', '[out]', '-ar', '48000', '-ac', '2', str(B / 'narration.wav')], check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f"{rec['offset']:.3f}", '-i', rec['webm'], '-i', str(B / 'narration.wav'), '-t', f'{total:.2f}',
                '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30',
                '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', str(B / 'africa.mp4')], check=True)
print('wrote build/africa.mp4', round(total / 60, 2), 'min')
