#!/usr/bin/env python3
"""Build this KruSlide sample deck into one self-contained index.html.
  python3 build.py   -> index.html
Parts: src/parts/*.html in name order (one <section class="slide"> each).
Inlines src/style.css + src/slides.css + src/tools.css, src/symbols.svg, and the scripts in JS below.
engine.js and tools.js are copies of the calculus sample (Thai labels); kit.js holds small shared helpers; deck.js is this deck.
Photos: src/img/<name>.webp (each <= 250 KB, credited in CREDITS.md) are inlined as data URIs wherever a part or the CSS
says {{img:<name>}}, so index.html stays one self-contained file (the platform ships only index.html).
Fonts are NOT copied: they come from the shared folder ../_shared/fonts/ (same origin, so the CSP allows them)."""
import re, json, hashlib, base64
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / 'src'
META = json.loads((HERE / 'sample.json').read_text(encoding='utf-8'))
TITLE = META['title_th'] + ' · ตัวอย่างบทเรียน · KruSlide'
JS = ['engine.js', 'tools.js', 'kit.js'] + sorted(p.name for p in SRC.glob('data-*.js')) + ['deck.js']

parts = sorted((SRC / 'parts').glob('*.html'))
body = '\n'.join(p.read_text(encoding='utf-8') for p in parts)
body = re.sub(r'<!--.*?-->', '', body, flags=re.S)

problems = []
secs = re.findall(r'<section\b[^>]*class="[^"]*\bslide\b[^>]*>', body)
if any('data-steps' not in s for s in secs): problems.append('a slide without data-steps')
ids = re.findall(r'\bid="([^"]+)"', body)
dups = sorted({x for x in ids if ids.count(x) > 1})
if dups: problems.append('duplicate ids: ' + ', '.join(dups))
if re.search(r'(?:src|href)="(https?:)?//', body): problems.append('external URL in a part')
if re.search(r'\son[a-z]+="', body): problems.append('inline event handler in a part')
if '<script' in body: problems.append('<script> inside a part')
n = len(secs)
for k, s in enumerate(re.split(r'(?=<section\b)', body)[1:], 1):
    m = re.search(r'<b>(\d\d) / (\d\d)</b>', s)
    if not m or (int(m.group(1)), int(m.group(2))) != (k, n): problems.append(f'footer page number on slide {k} should be {k:02d} / {n:02d}')

def read(name): return (SRC / name).read_text(encoding='utf-8')
css = read('style.css') + '\n' + read('slides.css') + '\n' + read('tools.css')

used = set()
def img(m):
    f = SRC / 'img' / (m.group(1) + '.webp')
    if not f.exists(): problems.append('missing image ' + f.name); return ''
    if f.stat().st_size > 250_000: problems.append(f'{f.name} is over 250 KB')
    used.add(f.name)
    return 'data:image/webp;base64,' + base64.b64encode(f.read_bytes()).decode()
body = re.sub(r'\{\{img:([a-z0-9-]+)\}\}', img, body)
css = re.sub(r'\{\{img:([a-z0-9-]+)\}\}', img, css)
unused = sorted(p.name for p in (SRC / 'img').glob('*.webp') if p.name not in used)
if unused: problems.append('images not used: ' + ', '.join(unused))
js = '\n'.join(read(f) for f in JS)
if re.search(r'https?://', js.replace('http://www.w3.org/2000/svg', '').replace('http://www.w3.org/1999/xlink', '')): problems.append('a URL in the scripts')

def sha(t): return "'sha256-" + base64.b64encode(hashlib.sha256(t.encode('utf-8')).digest()).decode() + "'"
img = "'self' data:" if 'data:image' in body + css else "'none'"
# Content Security Policy: only this page's own script runs (pinned by hash); nothing is fetched except the shared fonts.
CSP = ("default-src 'none'; script-src " + sha(js) + "; style-src 'unsafe-inline'; font-src 'self'; img-src " + img + "; "
       "connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'")
html = f'''<!DOCTYPE html>
<html lang="th"><head><meta charset="utf-8">
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
<nav id="ctl" aria-label="ปุ่มควบคุมสไลด์">
 <button id="pv" type="button" aria-label="ย้อนกลับ">‹</button>
 <span id="pos"></span>
 <button id="nx" type="button" aria-label="ถัดไป">›</button>
 <button id="pen" type="button" aria-pressed="false" aria-label="ปากกา">✎ ปากกา</button>
 <button id="fs" type="button" aria-label="เต็มจอ">⤢</button>
</nav>
<div id="live" class="sr" aria-live="polite"></div>
<script>{js}</script>
</body></html>
'''
(HERE / 'index.html').write_text(html, encoding='utf-8')
print(f'wrote index.html: {n} slides from {len(parts)} part(s), {len(html) // 1024} KB')
if META.get('slides') != n: problems.append(f"sample.json says {META.get('slides')} slides, the deck has {n}")
if problems:
    print('PROBLEMS:\n- ' + '\n- '.join(problems)); raise SystemExit(1)
