#!/usr/bin/env python3
"""Build the Unit 4 deck.
  python3 build.py                 -> index.html (all parts/*.html in name order; files starting with "_" are skipped)
  python3 build.py --only 20       -> preview-20.html (only parts whose file name contains "20")
Inlines style.css, tools.css (if present), symbols.svg, engine.js, tools.js (if present)."""
import sys, re
from pathlib import Path

HERE = Path(__file__).parent
args = sys.argv[1:]
only = args[args.index('--only') + 1] if '--only' in args else None

parts = sorted(p for p in (HERE / 'parts').glob('*.html') if (only is None and not p.name.startswith('_')) or (only is not None and only in p.name))
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
html = f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Unit 4 · Statistics (1) · Mathayomsuksa 1</title>
<style>{css}</style></head>
<body>
{read('symbols.svg')}
<main id="stage" aria-roledescription="slide deck">
{body}
</main>
<nav id="ctl" aria-label="Slide controls">
 <button id="mn" type="button" aria-label="Lessons">☰</button>
 <button id="pv" type="button" aria-label="Back">‹</button>
 <span id="pos"></span>
 <button id="nx" type="button" aria-label="Next">›</button>
 <button id="pen" type="button" aria-pressed="false" aria-label="Pen">✎ Pen</button>
 <button id="fs" type="button" aria-label="Full screen">⤢</button>
</nav>
<div id="menu" role="menu" aria-label="Lessons"></div>
<div id="live" class="sr" aria-live="polite"></div>
<script>{js}</script>
</body></html>
'''
out = HERE / (f'preview-{only}.html' if only else 'index.html')
out.write_text(html, encoding='utf-8')
print(f'wrote {out.name}: {n_slides} slides from {len(parts)} part(s)')
if problems:
    print('PROBLEMS:\n- ' + '\n- '.join(problems)); sys.exit(1)
