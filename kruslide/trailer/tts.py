#!/usr/bin/env python3
"""Generate the Thai narration with Venice TTS, one MP3 per line, and check each line with Venice speech-to-text.

usage: python3 tts.py MODEL VOICE [MODEL VOICE ...]
The API key is injected by the network proxy, so the header carries a dummy bearer token.
Output: voice/<model>__<voice>/L1.mp3 ... plus check.json (transcript per line).
"""
import json, os, subprocess, sys, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
API = 'https://api.venice.ai/api/v1'
LINES = json.load(open(os.path.join(HERE, 'narration.json'), encoding='utf-8'))['lines']

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

def duration(path):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).decode().strip())

if __name__ == '__main__':
    args = sys.argv[1:]
    for model, voice in zip(args[0::2], args[1::2]):
        d = os.path.join(HERE, 'voice', f'{model}__{voice}'); os.makedirs(d, exist_ok=True)
        report = {}
        for ln in LINES:
            out = os.path.join(d, ln['id'] + '.mp3')
            if not os.path.exists(out):
                speak(model, voice, ln['tts'], out)
            report[ln['id']] = {'want': ln['text'], 'heard': transcribe(out), 'sec': round(duration(out), 2)}
            print(f"{voice:10} {ln['id']} {report[ln['id']]['sec']:5.2f}s  want: {ln['text']}  |  heard: {report[ln['id']]['heard']}")
        json.dump(report, open(os.path.join(d, 'check.json'), 'w'), ensure_ascii=False, indent=1)
