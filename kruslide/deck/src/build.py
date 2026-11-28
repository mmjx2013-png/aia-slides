#!/usr/bin/env python3
"""Build the KruSlide showcase deck: kruslide/deck/index.html.
   python3 src/build.py            (from kruslide/deck)
Slides live in slides_a.py (S1-S7), slides_b.py (the samples section, styles, real work) and slides_c.py (video to the end).
Every slide is a dict: id, steps, title, bg (colour field), light (dark text), noclick, html, css, js (hooks), shapes."""
import pathlib, sys, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from core import *
import slides_a, slides_b, slides_c

SRC = pathlib.Path(__file__).resolve().parent
SLIDES = slides_a.SLIDES + slides_b.SLIDES + slides_c.SLIDES
EXTRA_HTML = getattr(slides_b, 'EXTRA_HTML', '')

symbols = (SRC / 'symbols.svg').read_text().replace('<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>', '').replace('</defs></svg>', '')
site_icons = (SRC / 'site-icons.svg').read_text()
own = '''<symbol id="ks-logo" viewBox="0 0 120 120"><rect width="120" height="120" rx="32" fill="#1C2A55"/><rect x="26" y="24" width="18" height="72" rx="7" fill="#fff"/><path d="M50 60 L86 26" stroke="#3D7BFF" stroke-width="18" stroke-linecap="round"/><path d="M52 52 L88 84 L68 82 L60 100 Z" fill="#FFC83D"/></symbol>
<symbol id="lr" viewBox="0 0 24 24"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="hand-pt" viewBox="0 0 64 80"><path d="M24 44V12a6 6 0 0 1 12 0v22a6 6 0 0 1 12 0v4a6 6 0 0 1 11 3v13c0 13-9 22-22 22h-4c-8 0-14-4-18-11L6 52a6 6 0 0 1 10-7l8 9z" fill="#fff" stroke="#1C2A55" stroke-width="4" stroke-linejoin="round"/><path d="M36 34v10M48 38v8" stroke="#1C2A55" stroke-width="3.5" stroke-linecap="round"/></symbol>'''

css = FONTS + BASE_CSS + '\n'.join(f'/* ---- {s["id"]} ---- */\n' + s.get('css', '') for s in SLIDES)
shape_cfg = {}
for s in SLIDES:
    for k, v in s.get('shapes', {}).items():
        shape_cfg[s['id'] if k == '' else s['id'] + '@' + k] = v
hooks = '\n'.join(s.get('js', '') for s in SLIDES)

def section(s):
    a = f'<section class="slide" id="{s["id"]}" data-title="{s["title"]}" data-steps="{s["steps"]}" data-bg="{s["bg"]}"'
    if s.get('light'): a += ' data-light'
    if s.get('light_at') is not None: a += f' data-light-at="{s["light_at"]}"'
    if s.get('dark_at') is not None: a += f' data-dark-at="{s["dark_at"]}"'
    if s.get('noclick'): a += ' data-noclick'
    return a + '>' + s['html'] + '</section>'

html = f'''<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>KruSlide · ครูสไลด์ · โชว์เคส</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'; frame-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'">
<link rel="icon" href="img/kruslide-icon.svg" type="image/svg+xml">
<!--
  KruSlide showcase deck. Presented live by the owner (no narration), 16:9, 1920x1080 stage scaled to any screen.
  Keys: Right / Space / Enter / PageDown = next beat, Left / PageUp / Backspace = back, Home / End, 1-9 = jump,
  F = full screen, P = pen (draw on any slide, auto shapes), M = motion, Esc = close the pen or a full-screen sample.
  A click on an empty part of a slide also advances (not on the live-demo slides). Built by src/build.py; do not hand-edit.
-->
<script>if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('rm');</script>
<link rel="stylesheet" href="lib/tools.css">
<style>{css}</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>{symbols}{site_icons}{own}</defs></svg>
<main id="vp">
<div id="stage" data-slide="1" data-s="{SLIDES[0]['id']}" data-step="0" data-dir="fwd">
  <div id="bg"></div><div id="shapes" aria-hidden="true"></div>
  {''.join(section(s) for s in SLIDES)}
  {EXTRA_HTML}
  <div class="hud" aria-hidden="true"><span id="cnt">01</span><i></i><span id="tot">18</span></div>
  <div id="brand" aria-hidden="true"><svg><use href="#ks-logo"/></svg>KruSlide<small>© KruSlide</small></div>
  <button id="vclose" type="button"><svg class="ic" aria-hidden="true"><use href="#i-left"/></svg>กลับสไลด์ <small>Esc</small></button>
</div>
</main>
<div class="sr" id="live" aria-live="polite"></div>
<nav id="ctl" aria-label="ปุ่มควบคุม">
  <button id="bPrev" type="button" aria-label="ย้อนกลับ">‹ ย้อน</button>
  <span id="pos">1 / {len(SLIDES)}</span>
  <button id="bNext" type="button" aria-label="ถัดไป">ถัดไป ›</button>
  <button id="bPen" type="button" aria-pressed="false" title="P">ปากกา</button>
  <button id="bMotion" type="button" aria-pressed="true" title="M">ภาพเคลื่อนไหว: เปิด</button>
  <button id="bFull" type="button" title="F">เต็มจอ</button>
</nav>
<script>window.__shapeCfg={json.dumps(shape_cfg, ensure_ascii=False)};window.__hooks={{}};
{hooks}
{SHAPES_JS}
{VIEWER_JS}
{ENGINE}</script>
<script src="lib/tools.js"></script>
</body>
</html>
'''
(ROOT / 'index.html').write_text(html)
print(f'{len(SLIDES)} slides, {len(html)//1024} KB -> {ROOT / "index.html"}')
