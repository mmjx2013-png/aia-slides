#!/usr/bin/env python3
"""Assemble deck/index.html from deck/src.html + deck/slides.html; chips {n p.x} -> source chips; source list from content/sources.json."""
import json, re, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(R, 'deck')
src = open(os.path.join(D, 'src.html')).read()
sl = open(os.path.join(D, 'slides.html')).read()
plates_f = os.path.join(D, 'plates.html')
plates = open(plates_f).read() if os.path.exists(plates_f) else ''
CH = [('t1', 'I', 'Structure'), ('t2', 'II', 'Cloth and season'), ('t3', 'III', 'Pattern'), ('t4', 'IV', 'Kitsuke'),
      ('t5', 'V', 'The body'), ('t6', 'VI', 'The family'), ('t7', 'VII', 'History'), ('t8', 'VIII', 'Abroad'), ('t9', 'IX', 'The answer'), ('t0', '·', 'How it was made')]
tags = '\n'.join(f'      <div class="lc tag" data-k="{k}"><b>{n}</b><span>{t}</span></div>' for k, n, t in CH)
html = src.replace('<!--TAGS-->', tags).replace('<!--SLIDES-->', sl).replace('<!--PLATES-->', plates)
used = sorted({int(m) for m in re.findall(r'\[(\d+)\] p', html)})
S = json.load(open(os.path.join(R, 'content', 'sources.json')))['list']
items = [f'<li><b>[{n}]</b> {S[str(n)]["html"]}</li>' for n in used if str(n) in S]
missing = [n for n in used if str(n) not in S]
h = (len(items) + 1) // 2
html = html.replace('<!--SRC1-->', ''.join(items[:h])).replace('<!--SRC2-->', ''.join(items[h:]))
img_f = os.path.join(D, 'imgcredits.html')
html = html.replace('<!--IMGCREDITS-->', open(img_f).read() if os.path.exists(img_f) else '')
open(os.path.join(D, 'index.html'), 'w').write(html)
n = len(re.findall(r'<section class="slide"', html))
print(f'deck: {n} slides, sources used {used}', 'MISSING ' + str(missing) if missing else '')
