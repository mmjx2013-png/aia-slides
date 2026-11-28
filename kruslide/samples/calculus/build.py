#!/usr/bin/env python3
"""Build the KruSlide calculus sample deck into one self-contained index.html (fonts stay in fonts/).
  python3 build.py            -> index.html
Parts: src/parts/*.html in name order (one <section class="slide"> each).
Inlines src/style.css, src/slides.css, src/tools.css, src/symbols.svg, src/engine.js, src/tools.js, src/calc.js.
engine.js and tools.js are copies of teacher-slides/unit4 (Thai labels, this deck's colours); calc.js is this deck's own maths."""
import re, hashlib, base64
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / 'src'
TITLE = 'แคลคูลัส ม.6 · ตัวอย่างบทเรียน · KruSlide'

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

def read(name): return (SRC / name).read_text(encoding='utf-8')
css = read('style.css') + '\n' + read('slides.css') + '\n' + read('tools.css')
js = read('engine.js') + '\n' + read('tools.js') + '\n' + read('calc.js')

def sha(t): return "'sha256-" + base64.b64encode(hashlib.sha256(t.encode('utf-8')).digest()).decode() + "'"
# Content Security Policy: only this page's own script runs (pinned by hash); nothing is fetched except our own fonts.
CSP = ("default-src 'none'; script-src " + sha(js) + "; style-src 'unsafe-inline'; font-src 'self'; img-src 'none'; "
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
print(f'wrote index.html: {len(secs)} slides from {len(parts)} part(s)')
if problems:
    print('PROBLEMS:\n- ' + '\n- '.join(problems)); raise SystemExit(1)
