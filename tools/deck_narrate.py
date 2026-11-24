#!/usr/bin/env python3
"""Narrate deck slides: deck/narr/script.json -> deck/audio/<id>.mp3 (-16 LUFS) + <id>.vtt. Usage: deck_narrate.py [id ...]"""
import json, re, subprocess, sys, os, urllib.request
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); D = os.path.join(R, 'deck')
S = json.load(open(os.path.join(D, 'narr', 'script.json')))
RS = json.load(open(os.path.join(R, 'content', 'respell.json')))
RS.update({'mushi boshi': 'moo-shee boh-shee', 'tan': 'tahn', 'Yoro': 'Yoh-roh', 'Meiji': 'May-jee', 'Poiret': 'Pwah-ray', 'bingata': 'bin-gah-tah', 'Edo': 'Eh-doh'})
def respell(t):
    for k in sorted(RS, key=len, reverse=True):
        t = re.sub(r'(?<![\w-])' + re.escape(k) + r'(?![\w-])', RS[k], t)
    return t
def ts(x): return '%02d:%06.3f' % (int(x // 60), x % 60)
ids = sys.argv[1:] or list(S)
os.makedirs(os.path.join(D, 'audio', 'raw'), exist_ok=True)
for k in ids:
    text = S[k]; raw = os.path.join(D, 'audio', 'raw', k + '.mp3'); out = os.path.join(D, 'audio', k + '.mp3')
    body = json.dumps({'model': 'tts-elevenlabs-turbo-v2-5', 'voice': 'Alice', 'input': respell(text), 'response_format': 'mp3'}).encode()
    req = urllib.request.Request('https://api.venice.ai/api/v1/audio/speech', body, {'Content-Type': 'application/json', 'Authorization': 'Bearer x'})
    open(raw, 'wb').write(urllib.request.urlopen(req, timeout=120).read())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', 'adelay=300|300,apad=pad_dur=0.6,loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-b:a', '128k', out], check=True)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout)
    parts = [p for p in re.split(r'(?<=[.;?!])\s+', text) if p]
    t0, span = 0.3, dur - 0.9; tot = sum(len(p) for p in parts); vt = ['WEBVTT', '']
    for p in parts:
        t1 = t0 + span * len(p) / tot; vt += [f'{ts(t0)} --> {ts(t1)}', p, '']; t0 = t1
    open(os.path.join(D, 'audio', k + '.vtt'), 'w').write('\n'.join(vt))
    print(k, round(dur, 1))
