#!/usr/bin/env python3
"""Generate the Thai narration with Venice TTS, one MP3 per line, and check each line with Venice speech-to-text.

usage: python3 tts.py [--style NAME] [--takes N] MODEL VOICE [MODEL VOICE ...]
  --style NAME  put narration.json styles[NAME] (an English delivery instruction) in front of every line
  --takes N     make N takes per line; the take whose transcript matches the script best becomes L#.mp3,
                the others are kept as L#_t2.mp3 ...
The API key is injected by the network proxy, so the header carries a dummy bearer token.
Output: voice/<model>__<voice>[__<style>]/L1.mp3 ... plus check.json (transcript, match score and length per line).
"""
import difflib, json, os, re, shutil, subprocess, sys, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
API = 'https://api.venice.ai/api/v1'
CFG = json.load(open(os.path.join(HERE, 'narration.json'), encoding='utf-8'))
LINES = CFG['lines']

def speak(model, voice, text, out):
    body = json.dumps({'model': model, 'voice': voice, 'input': text, 'response_format': 'mp3'}).encode()
    for attempt in range(4):
        req = urllib.request.Request(API + '/audio/speech', data=body, method='POST',
                                     headers={'Authorization': 'Bearer dummy', 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read()
            if len(data) > 2000:
                open(out, 'wb').write(data); return
        except Exception as e:
            print('  retry', attempt, e, file=sys.stderr)
        time.sleep(3 + 4 * attempt)
    raise RuntimeError(f'TTS failed: {model} {voice} {text}')

def transcribe(path):
    r = subprocess.run(['curl', '-sS', '-X', 'POST', API + '/audio/transcriptions', '-H', 'Authorization: Bearer dummy',
                        '-F', f'file=@{path}', '-F', 'model=openai/whisper-large-v3', '-F', 'language=th'],
                       capture_output=True, text=True, timeout=180)
    try: return json.loads(r.stdout).get('text', '').strip()
    except Exception: return '?' + r.stdout[:200]

def norm(s):
    s = s.translate(str.maketrans('๐๑๒๓๔๕๖๗๘๙', '0123456789'))
    return re.sub(r'[\s,.\-!?"\']', '', s)

def score(want, heard):
    return round(difflib.SequenceMatcher(None, norm(want), norm(heard)).ratio(), 3)

def duration(path):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).decode().strip())

if __name__ == '__main__':
    args = sys.argv[1:]; style = ''; takes = 1
    while args and args[0].startswith('--'):
        if args[0] == '--style': style = args[1]; args = args[2:]
        elif args[0] == '--takes': takes = int(args[1]); args = args[2:]
        else: sys.exit(__doc__)
    prefix = CFG['styles'][style] if style else ''
    for model, voice in zip(args[0::2], args[1::2]):
        d = os.path.join(HERE, 'voice', f'{model}__{voice}' + (f'__{style}' if style else '')); os.makedirs(d, exist_ok=True)
        report = {}
        for ln in LINES:
            cands = []
            for t in range(1, takes + 1):
                out = os.path.join(d, ln['id'] + ('.mp3' if t == 1 else f'_t{t}.mp3'))
                if not os.path.exists(out):
                    speak(model, voice, prefix + ln['tts'], out)
                heard = transcribe(out)
                cands.append(dict(file=out, heard=heard, match=score(ln['text'], heard), sec=round(duration(out), 2)))
            best = max(cands, key=lambda c: c['match'])
            first = os.path.join(d, ln['id'] + '.mp3')
            if best['file'] != first:      # swap so that L#.mp3 is always the best take
                tmp = first + '.swap'; shutil.move(first, tmp); shutil.move(best['file'], first); shutil.move(tmp, best['file'])
                for c in cands:
                    if c['file'] == first: c['file'] = best['file']
                best['file'] = first
            report[ln['id']] = {'want': ln['text'], 'takes': [{**c, 'file': os.path.basename(c['file'])} for c in cands]}
            for c in cands:
                print(f"{voice:8} {style:8} {os.path.basename(c['file']):9} {c['sec']:5.2f}s match {c['match']:.2f}  want: {ln['text']}  |  heard: {c['heard']}")
        json.dump(report, open(os.path.join(d, 'check.json'), 'w'), ensure_ascii=False, indent=1)
