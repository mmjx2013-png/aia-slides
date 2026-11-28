#!/usr/bin/env python3
"""Build this KruSlide sample deck into one self-contained index.html.
  python3 build.py            -> index.html
Parts: src/parts/*.html in name order (one <section class="slide"> each).
Inlines src/base.css (shared frame), src/style.css (this sample's look), src/slides.css, src/tools.css, src/symbols.svg,
and src/engine.js + src/tools.js (copies of the calculus sample, Thai labels) + this sample's own script.
Fonts are NOT copied: they come from ../_shared/fonts/ (Anuphan for Thai, Inter for the rest)."""
import re, hashlib, base64
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / 'src'
TITLE = 'เซลล์พืชและเซลล์สัตว์ ม.1 · ตัวอย่างบทเรียน · KruSlide'
OWN_JS = 'cell.js'

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
css = '\n'.join(read(n) for n in ('base.css', 'style.css', 'slides.css', 'tools.css'))
js = read('engine.js') + '\n' + read('tools.js') + '\n' + read(OWN_JS)

def sha(t): return "'sha256-" + base64.b64encode(hashlib.sha256(t.encode('utf-8')).digest()).decode() + "'"
# Content Security Policy: only this page's own script runs (pinned by hash); nothing is fetched except the shared fonts.
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
print(f'wrote index.html: {len(secs)} slides from {len(parts)} part(s), {len(html)//1024} KB')
if problems:
    print('PROBLEMS:\n- ' + '\n- '.join(problems)); raise SystemExit(1)
