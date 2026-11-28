#!/usr/bin/env python3
"""Build this KruSlide sample deck into one self-contained index.html (fonts come from ../_shared/fonts/).
  python3 build.py            -> index.html
Parts: src/parts/*.html in name order (one <section class="slide"> each). {{FOOT}} in a part becomes the KruSlide
footer (logo C, "KruSlide ครูสไลด์", "© KruSlide NN / NN"), numbered by slide.
Inlines src/base.css, src/style.css, src/slides.css, src/tools.css, src/symbols.svg, then src/engine.js, src/tools.js,
src/kit.js and the sample's own script. engine.js and tools.js are copies from the calculus sample (labels follow LANG)."""
import re, hashlib, base64, json
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / 'src'
CFG = json.loads((SRC / 'deck.json').read_text(encoding='utf-8'))
TITLE, LANG, OWN, IMG = CFG['title'], CFG.get('lang', 'th'), CFG['script'], CFG.get('images', False)
EN = LANG.startswith('en')

parts = sorted((SRC / 'parts').glob('*.html'))
body = '\n'.join(p.read_text(encoding='utf-8') for p in parts)
body = re.sub(r'<!--.*?-->', '', body, flags=re.S)
N = len(re.findall(r'<section\b[^>]*class="[^"]*\bslide\b', body))
LOGO = ('<svg class="logo" viewBox="0 0 120 120" aria-hidden="true"><rect width="120" height="120" rx="32" fill="#1C2A55"/>'
        '<rect x="26" y="24" width="18" height="72" rx="7" fill="#fff"/><path d="M50 60 L86 26" stroke="#3D7BFF" stroke-width="18" stroke-linecap="round"/>'
        '<path d="M52 52 L88 84 L68 82 L60 100 Z" fill="#FFC83D"/></svg>')
k = [0]
def foot(m):
    k[0] += 1
    return (f'<div class="foot"><span class="brand">{LOGO}KruSlide <span>ครูสไลด์</span></span>'
            f'<span class="pg">© KruSlide<b>{k[0]:02d} / {N:02d}</b></span></div>')
body = re.sub(r'\{\{FOOT\}\}', foot, body)

problems = []
secs = re.findall(r'<section\b[^>]*class="[^"]*\bslide\b[^>]*>', body)
if k[0] != N: problems.append(f'{N} slides but {k[0]} footers')
if any('data-steps' not in s for s in secs): problems.append('a slide without data-steps')
ids = re.findall(r'\bid="([^"]+)"', body)
dups = sorted({x for x in ids if ids.count(x) > 1})
if dups: problems.append('duplicate ids: ' + ', '.join(dups))
if re.search(r'(?:src|href)="(https?:)?//', body): problems.append('external URL in a part')
if re.search(r'\son[a-z]+="', body): problems.append('inline event handler in a part')
if '<script' in body: problems.append('<script> inside a part')

def read(name): return (SRC / name).read_text(encoding='utf-8')
css = '\n'.join(read(n) for n in ('base.css', 'style.css', 'slides.css', 'tools.css'))
js = '\n'.join(read(n) for n in ('engine.js', 'tools.js', 'kit.js', OWN))
if re.search(r'https?://', (css + js).replace('http://www.w3.org/2000/svg', '')): problems.append('a URL in the CSS or JS')

def sha(t): return "'sha256-" + base64.b64encode(hashlib.sha256(t.encode('utf-8')).digest()).decode() + "'"
# Content Security Policy: only this page's own script runs (pinned by hash); nothing is fetched except the shared fonts.
CSP = ("default-src 'none'; script-src " + sha(js) + "; style-src 'unsafe-inline'; font-src 'self'; img-src " + ("'self' data:" if IMG else "'none'") + "; "
       "connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'")
L = (lambda th, en: en if EN else th)
html = f'''<!DOCTYPE html>
<html lang="{LANG}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<meta name="referrer" content="no-referrer">
<title>{TITLE}</title>
<style>{css}</style></head>
<body>
{read('symbols.svg')}
<main id="stage" aria-roledescription="slide deck">
{body}
</main>
<nav id="ctl" aria-label="{L('ปุ่มควบคุมสไลด์', 'Slide controls')}">
 <button id="pv" type="button" aria-label="{L('ย้อนกลับ', 'Back')}">‹</button>
 <span id="pos"></span>
 <button id="nx" type="button" aria-label="{L('ถัดไป', 'Next')}">›</button>
 <button id="pen" type="button" aria-pressed="false" aria-label="{L('ปากกา', 'Pen')}">✎ {L('ปากกา', 'Pen')}</button>
 <button id="fs" type="button" aria-label="{L('เต็มจอ', 'Full screen')}">⤢</button>
</nav>
<div id="live" class="sr" aria-live="polite"></div>
<script>{js}</script>
</body></html>
'''
(HERE / 'index.html').write_text(html, encoding='utf-8')
print(f'wrote index.html: {len(secs)} slides from {len(parts)} part(s), {len(html)//1024} KB')
if problems:
    print('PROBLEMS:\n- ' + '\n- '.join(problems)); raise SystemExit(1)
