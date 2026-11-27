#!/usr/bin/env python3
"""Build the Unit 4 deck.
  python3 build.py                 -> index.html (all parts/*.html in name order; files starting with "_" are skipped)
  python3 build.py --only 20       -> preview-20.html (only parts whose file name contains "20")
  DECK_PASSWORD=... python3 build.py --src keys/parts --out keys/index.html --title "Answer key" --lock
                                   -> the slides are encrypted (AES-256-GCM, key from PBKDF2-SHA256); see lock.js.
                                      The password comes only from the environment and is never written to the repo.
Inlines style.css, tools.css (if present), symbols.svg, engine.js, tools.js (if present)."""
import sys, re, hashlib, base64, os, json
from pathlib import Path

HERE = Path(__file__).parent
args = sys.argv[1:]
only = args[args.index('--only') + 1] if '--only' in args else None
def opt(name, default=None): return args[args.index(name) + 1] if name in args else default
SRC = HERE / opt('--src', 'parts')            # folder of part files (the answer-key deck uses keys/parts)
TITLE = opt('--title', 'Unit 4 · Statistics (1) · Mathayomsuksa 1')

parts = sorted(p for p in SRC.glob('*.html') if (only is None and not p.name.startswith('_')) or (only is not None and only in p.name))
if not parts:
    sys.exit('no parts matched')
body = '\n'.join(p.read_text(encoding='utf-8') for p in parts)

# guard rails: every slide needs data-steps; ids must be unique; no external URLs
n_slides = len(re.findall(r'<section\b[^>]*class="[^"]*\bslide\b', body))
missing = [m for m in re.findall(r'<section\b[^>]*class="[^"]*\bslide\b[^>]*>', body) if 'data-steps' not in m]
ids = re.findall(r'\bid="([^"]+)"', body)
dups = sorted({x for x in ids if ids.count(x) > 1})
ext = re.findall(r'(?:src|href)="(https?:)?//', body)
problems = []
if missing: problems.append(f'{len(missing)} slide(s) without data-steps')
if dups: problems.append('duplicate ids: ' + ', '.join(dups))
if ext: problems.append('external URL in a part (not allowed)')
if re.search(r'\son[a-z]+="', body): problems.append('inline event handler in a part (not allowed)')

def read(name):
    f = HERE / name
    return f.read_text(encoding='utf-8') if f.exists() else ''

css = read('style.css') + '\n' + read('tools.css')
js = read('engine.js') + '\n' + read('tools.js')
body = re.sub(r'<!--.*?-->', '', body, flags=re.S)   # comments are for authors, not for the published page
if '<script' in body: problems.append('<script> inside a part (not allowed)')
LOCK = '--lock' in args
lockui = ''
if LOCK:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    pw = os.environ.get('DECK_PASSWORD', '')
    if len(pw) < 10: sys.exit('--lock needs DECK_PASSWORD (10+ characters) in the environment')
    salt, iv, rounds = os.urandom(16), os.urandom(12), 600000
    key = hashlib.pbkdf2_hmac('sha256', pw.encode('utf-8'), salt, rounds, 32)
    ct = AESGCM(key).encrypt(iv, body.encode('utf-8'), None)
    b = lambda x: base64.b64encode(x).decode()
    lockdata = json.dumps({'s': b(salt), 'i': b(iv), 'n': rounds, 'c': b(ct)})
    body = ''
    js = read('lock.js') + '\nfunction boot() {\n' + js + '\n}\n'
    css += '''
.locked #ctl,.locked #stage{visibility:hidden}
#lock{position:fixed;inset:0;z-index:100;display:grid;place-items:center;background:radial-gradient(1200px 700px at 20% 10%,#E9EEFF,#F6F7FB 60%);font-family:Inter,system-ui,sans-serif;color:#0F1B33;padding:20px}
#lock .card{width:min(440px,100%);background:#fff;border-radius:24px;padding:36px 34px 30px;box-shadow:0 24px 60px rgba(15,27,51,.12)}
#lock .kick{font:700 13px Inter;letter-spacing:.14em;text-transform:uppercase;color:#3B6CFF}
#lock h1{font:800 34px/1.1 Display,Inter,sans-serif;margin:10px 0 8px;letter-spacing:-.02em}
#lock p{margin:0 0 22px;font:500 16px/1.5 Inter;color:#4A5675}
#lock label{display:block;font:600 14px Inter;margin-bottom:8px}
#lock .row{display:flex;gap:10px}
#lock input{flex:1;min-width:0;font:500 18px Inter;padding:13px 14px;border:2px solid #D5DCEC;border-radius:14px;outline:none}
#lock input:focus{border-color:#3B6CFF}
#lock .row{align-items:stretch}
#lock button{font:700 17px Inter;color:#fff;background:#3B6CFF;border:0;border-radius:14px;padding:0 24px;cursor:pointer;height:auto;min-height:52px;line-height:1}
#lock button:disabled{opacity:.6}
#lock #lock-msg{min-height:22px;margin-top:12px;font:600 15px Inter;color:#4A5675}
#lock #lock-msg.bad{color:#B8321F}
'''
    lockui = f'''<script type="application/json" id="lockdata">{lockdata}</script>
<div id="lock" role="dialog" aria-modal="true" aria-labelledby="lock-t"><div class="card">
 <div class="kick">Teacher only</div><h1 id="lock-t">{TITLE}</h1>
 <p>Type the password to open the answers.</p>
 <label for="lock-pw">Password</label>
 <div class="row"><input id="lock-pw" type="password" autocomplete="current-password" autocapitalize="none" spellcheck="false"><button id="lock-go" type="button">Open</button></div>
 <div id="lock-msg" aria-live="polite"></div>
</div></div>'''
def sha(t): return "'sha256-" + base64.b64encode(hashlib.sha256(t.encode('utf-8')).digest()).decode() + "'"
# Content Security Policy: only this page's own script may run (pinned by hash); nothing is fetched except our fonts;
# no network calls, no plugins, no forms, no base-URL tricks. Style attributes are used for animation timing, so styles stay inline.
CSP = ("default-src 'none'; script-src " + sha(js) + "; style-src 'unsafe-inline'; font-src 'self'; img-src 'none'; "
       "connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'")
html = f'''<!DOCTYPE html>
<html lang="en"{' class="locked"' if LOCK else ''}><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<meta name="referrer" content="no-referrer">
<title>{TITLE}</title>
<style>{css}</style></head>
<body>
{lockui}
{read('symbols.svg')}
<main id="stage" aria-roledescription="slide deck">
{body}
</main>
<nav id="ctl" aria-label="Slide controls">
 <button id="mn" type="button" aria-label="Lessons" aria-expanded="false" aria-controls="menu">☰</button>
 <button id="pv" type="button" aria-label="Back">‹</button>
 <span id="pos"></span>
 <button id="nx" type="button" aria-label="Next">›</button>
 <button id="pen" type="button" aria-pressed="false" aria-label="Pen">✎ Pen</button>
 <button id="fs" type="button" aria-label="Full screen">⤢</button>
</nav>
<nav id="menu" aria-label="Lessons"></nav>
<div id="live" class="sr" aria-live="polite"></div>
<script>{js}</script>
</body></html>
'''
out = HERE / opt('--out', f'preview-{only}.html' if only else 'index.html')
out.write_text(html, encoding='utf-8')
print(f'wrote {out.name}: {n_slides} slides from {len(parts)} part(s)')
if problems:
    print('PROBLEMS:\n- ' + '\n- '.join(problems)); sys.exit(1)
