#!/usr/bin/env python3
"""Thai narration for each scene with Venice TTS (key is injected by the network proxy). Cached by text hash."""
import json, hashlib, subprocess, urllib.request, concurrent.futures as cf
from pathlib import Path
import script
HERE = Path(__file__).parent; A = HERE / 'audio'; A.mkdir(exist_ok=True)
MODEL, VOICE = 'tts-xai-v1', 'eve'
def say(i, s):
    text = ' '.join(x.strip() for x in s['say'].split('|'))
    h = hashlib.sha1((MODEL + VOICE + text).encode()).hexdigest()[:10]
    f = A / f's{i:02d}-{h}.mp3'
    if not f.exists():
        body = json.dumps({'model': MODEL, 'voice': VOICE, 'input': text, 'response_format': 'mp3'}).encode()
        req = urllib.request.Request('https://api.venice.ai/api/v1/audio/speech', data=body, headers={'Authorization': 'Bearer dummy', 'Content-Type': 'application/json'})
        for attempt in range(4):
            try:
                f.write_bytes(urllib.request.urlopen(req, timeout=180).read()); break
            except Exception as e:
                if attempt == 3: raise
    d = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(f)]).decode())
    return i, f.name, d
with cf.ThreadPoolExecutor(6) as ex:
    res = sorted(ex.map(lambda a: say(*a), enumerate(script.S)))
(HERE / 'build').mkdir(exist_ok=True)
json.dump([{'f': f, 'd': d} for _, f, d in res], open(HERE / 'build' / 'timing.json', 'w'))
tot = sum(d for _, _, d in res)
print(len(res), 'clips, total', round(tot / 60, 2), 'min; longest', round(max(d for *_, d in res), 1), 's; shortest', round(min(d for *_, d in res), 1), 's')
