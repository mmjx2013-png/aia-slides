#!/usr/bin/env python3
"""Animated mock-ups (v2) for the teacher trial: M1 Math, Unit 4 Statistics (1).
Four styles x three slides, real animation, click / tap / arrow keys to step.
Every question, chart and drawing is original (no textbook pictures).
python3 make2.py -> index.html (+ node shoot2.cjs for still PNGs)"""
import math
from pathlib import Path

HERE = Path(__file__).parent

SYMBOLS = '''<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="kid" viewBox="0 0 80 100">
 <path d="M8 100 Q8 68 40 66 Q72 68 72 100 Z" style="fill:var(--shirt);stroke:var(--ol);stroke-width:var(--olw)"/>
 <path d="M31 67 L40 79 L49 67" style="fill:#fff;stroke:var(--ol);stroke-width:var(--olw);stroke-linejoin:round"/>
 <circle cx="40" cy="40" r="22" style="fill:var(--skin);stroke:var(--ol);stroke-width:var(--olw)"/>
 <path d="M17 41 Q14 13 40 13 Q66 13 63 41 Q59 27 47 25 Q39 33 25 31 Q19 34 17 41 Z" style="fill:var(--hair);stroke:var(--ol);stroke-width:var(--olw);stroke-linejoin:round"/>
 <circle cx="32" cy="44" r="2.8" style="fill:var(--ink)"/><circle cx="48" cy="44" r="2.8" style="fill:var(--ink)"/>
 <path d="M33 52 Q40 57 47 52" style="fill:none;stroke:var(--ink);stroke-width:2.8;stroke-linecap:round"/>
 <circle cx="26" cy="51" r="3.5" style="fill:#FF8A8A;opacity:.35"/><circle cx="54" cy="51" r="3.5" style="fill:#FF8A8A;opacity:.35"/>
</symbol>
<symbol id="cup" viewBox="0 0 64 96">
 <path d="M39 2 L33 34" style="fill:none;stroke:var(--straw);stroke-width:6;stroke-linecap:round"/>
 <path d="M10 33 Q32 17 54 33 Z" style="fill:var(--lid);stroke:var(--ol);stroke-width:var(--olw);stroke-linejoin:round"/>
 <rect x="6" y="31" width="52" height="8" rx="4" style="fill:var(--lid);stroke:var(--ol);stroke-width:var(--olw)"/>
 <path d="M10 39 H54 L48.5 90 Q48 94 44 94 H20 Q16 94 15.5 90 Z" style="fill:var(--tea);stroke:var(--ol);stroke-width:var(--olw);stroke-linejoin:round"/>
 <path d="M16 45 L19.8 86" style="stroke:#fff;stroke-opacity:.55;stroke-width:4;stroke-linecap:round"/>
 <circle cx="32" cy="58" r="8" style="fill:var(--badge)"/>
 <circle cx="23" cy="84" r="4" style="fill:var(--pearl)"/><circle cx="32" cy="86" r="4" style="fill:var(--pearl)"/>
 <circle cx="41" cy="84" r="4" style="fill:var(--pearl)"/><circle cx="27" cy="77" r="4" style="fill:var(--pearl)"/>
 <circle cx="37" cy="77" r="4" style="fill:var(--pearl)"/>
</symbol>
<symbol id="check" viewBox="0 0 24 24"><path d="M5 12.5 L10 17.5 L19 7" style="fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round"/></symbol>
<symbol id="bulb" viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"/></symbol>
<pattern id="hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="#fff"/><line x1="0" y1="0" x2="0" y2="12" stroke="#2B2B2B" stroke-width="3.5"/></pattern>
<pattern id="hatch2" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="12" height="12" fill="#FFE36E"/><line x1="0" y1="0" x2="0" y2="12" stroke="#2B2B2B" stroke-width="2.5"/></pattern>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs></svg>'''

KIDS = [("#F2C6A0", "#2B2118", "var(--k1)", "6:00", "Ploy"), ("#D9A77E", "#3B2A1E", "var(--k2)", "6:30", "Ton"),
        ("#F5D2B5", "#8A5A2B", "var(--k3)", "7:15", "Mint"), ("#C68B62", "#1E1A17", "var(--k4)", "6:30", "Bank"),
        ("#EFC09B", "#4A2F1D", "var(--k1)", "5:45", "Fah"), ("#E2B48D", "#2B2118", "var(--k2)", "6:45", "Earth")]

def kid(skin, hair, shirt):
    return f'<svg class="kid" viewBox="0 0 80 100" style="--skin:{skin};--hair:{hair};--shirt:{shirt}"><use href="#kid"/></svg>'

def cup(n=0):
    return f'<svg class="cup" viewBox="0 0 64 96" style="--n:{n}"><use href="#cup"/></svg>'

def cups(k, start):
    out = ''.join(cup(start + j) for j in range(int(k)))
    if k % 1:
        out += f'<span class="halfcup" style="--n:{start+int(k)}">{cup(start+int(k))}</span>'
    return out

def clock(h=6, m=15):
    t = ''.join(f'<line x1="{60+31*math.sin(math.radians(a)):.1f}" y1="{72-31*math.cos(math.radians(a)):.1f}" '
                f'x2="{60+(25 if a%90==0 else 28)*math.sin(math.radians(a)):.1f}" y2="{72-(25 if a%90==0 else 28)*math.cos(math.radians(a)):.1f}" class="tk"/>'
                for a in range(0, 360, 30))
    ha = (h % 12 + m / 60) * 30; ma = m * 6
    return f'''<svg class="clock" viewBox="0 0 120 132" aria-hidden="true">
 <circle cx="27" cy="27" r="16" class="bell"/><circle cx="93" cy="27" r="16" class="bell"/>
 <path d="M34 114 L24 128 M86 114 L96 128" class="leg"/>
 <circle cx="60" cy="72" r="47" class="body"/><circle cx="60" cy="72" r="37" class="face"/>{t}
 <line x1="60" y1="72" x2="60" y2="54" class="hh" style="--a:{ha}deg"/>
 <line x1="60" y1="72" x2="60" y2="45" class="mh" style="--a:{ma}deg"/>
 <circle cx="60" cy="72" r="4.5" class="pin"/></svg>'''

WAKE = [45, 60, 60, 75, 75, 75, 90, 90, 90, 90, 105, 105, 105, 120, 120, 135, 150]

def dotplot(extra=''):
    from collections import Counter
    c = Counter(WAKE); out = []; n = 0
    X = lambda m: 40 + (m - 30) * 3.4
    for m, k in sorted(c.items()):
        for i in range(k):
            out.append(f'<circle cx="{X(m):.0f}" cy="{156 - i*27}" r="11" class="dot" style="--n:{n}"/>'); n += 1
    ticks = ''.join(f'<text x="{X(m):.0f}" y="202" class="tick">{5 + m//60}:{m%60:02d}</text>' for m in (30, 60, 90, 120, 150))
    return f'<svg class="plot" viewBox="0 0 500 210"><line x1="16" y1="172" x2="484" y2="172" class="axis" pathLength="1"/>{"".join(out)}{ticks}{extra}</svg>'

def bars(vals, w=300, h=170):
    gap = w / len(vals); bw = gap * .62
    out = ''.join(f'<rect x="{i*gap + (gap-bw)/2:.1f}" y="{h - v/max(vals)*(h-20):.1f}" width="{bw:.1f}" height="{v/max(vals)*(h-20):.1f}" rx="6" class="bar b{i}" style="--n:{i}"/>' for i, v in enumerate(vals))
    return f'<svg class="bars" viewBox="0 0 {w} {h+4}"><line x1="0" y1="{h+1}" x2="{w}" y2="{h+1}" class="base"/>{out}</svg>'

def donut(parts, r=70):
    C = 2 * math.pi * r; acc = 0; out = []
    for i, p in enumerate(parts):
        out.append(f'<circle cx="100" cy="100" r="{r}" class="seg s{i}" style="--len:{p*C:.1f};--C:{C:.1f};stroke-dashoffset:{-acc*C:.1f};--n:{i}"/>')
        acc += p
    return f'<svg class="donut" viewBox="0 0 200 200"><g transform="rotate(-90 100 100)">{"".join(out)}</g></svg>'

DAYS = [("Mon", 3), ("Tue", 2.5), ("Wed", 4), ("Thu", 2), ("Fri", 5)]
LESSONS = ["Statistical questions", "Data collection", "Presenting &amp; reading data", "Statistics in real life"]
Q_ONE = 'What time did <b>I</b> wake up today?'
Q_MANY = 'What time did the students in <b>our class</b> wake up today?'
CHOICES = [("A", "150"), ("B", "160"), ("C", "165"), ("D", "170")]

def picto():
    rows, n = [], 0
    for r, (d, k) in enumerate(DAYS):
        rows.append(f'<div class="prow" style="--r:{r}"><div class="day">{d}</div><div class="icons">{cups(k, n)}</div></div>')
        n += math.ceil(k)
    return ''.join(rows)

def kids_row():
    return '<div class="kids">' + ''.join(
        f'<div class="k" style="--n:{i}">{kid(s, h, sh)}<span class="t">{t}</span></div>' for i, (s, h, sh, t, _) in enumerate(KIDS)) + '</div>'

def choices(tpl):
    return '<div class="ch">' + ''.join(tpl(l, v, i) for i, (l, v) in enumerate(CHOICES)) + '</div>'

# ======================================================================= A · modern clean
def style_a():
    s1 = f'''<section class="slide A a1" data-steps="0" data-style="A" data-name="Modern clean"><i class="mesh"></i>
<div class="left">
 <div class="pill in" style="--d:100">Mathayomsuksa 1 · Mathematics</div>
 <div class="unit in" style="--d:200">Unit 4</div>
 <h1 class="in" style="--d:280">Statistics <span>(1)</span></h1>
 <p class="sub in" style="--d:420">Ask good questions, collect data, and read what charts are telling us.</p>
 <ol class="lessons">{''.join(f'<li class="in" style="--d:{560+i*90}"><b>{i+1}</b>{t}</li>' for i, t in enumerate(LESSONS))}</ol>
</div>
<div class="hero">
 <div class="hc c-bar" style="--d:500"><div class="ht">Favourite sport</div>{bars([5, 8, 3, 6])}<div class="hl"><span>Football</span><span>Basket</span><span>Tennis</span><span>Volley</span></div></div>
 <div class="hc c-pie" style="--d:650">{donut([.4, .25, .2, .15])}<div class="ht ctr">Year groups</div></div>
 <div class="hc c-picto" style="--d:800"><div class="ht">Cups sold</div><div class="row3">{cup(0)}{cup(1)}{cup(2)}{cup(3)}<span class="halfcup" style="--n:4">{cup(4)}</span></div></div>
 <div class="hc c-survey" style="--d:950"><div class="ht">Class survey</div>
   <ul class="sv">{''.join(f'<li style="--n:{i}"><svg><use href="#check"/></svg>{t}</li>' for i, t in enumerate(["Bus", "Walk", "Bike", "Car"]))}</ul></div>
</div></section>'''
    s2 = f'''<section class="slide A a2" data-steps="2" data-style="A"><i class="mesh m2"></i>
<div class="kicker in">Lesson 1 · Statistical questions</div>
<h2 class="in" style="--d:120">Is it a <em>statistical</em> question?</h2>
<div class="cmp">
 <div class="pane one in" style="--d:260"><div class="tagq">Question A</div><div class="q">{Q_ONE}</div>
   <div class="mid">{clock()}<div class="big">6:15</div></div>
   <div class="badge no g2">1 answer · <b>not statistical</b></div></div>
 <div class="pane many g1"><div class="tagq">Question B</div><div class="q">{Q_MANY}</div>
   {kids_row()}{dotplot()}
   <div class="badge yes g2"><svg><use href="#check"/></svg>Answers vary · <b>statistical</b></div></div>
</div>
<div class="idea g2" style="--d:300"><svg><use href="#bulb"/></svg><span>A statistical question expects answers that <b>vary</b>, so we collect data to answer it.</span></div>
</section>'''
    s3 = f'''<section class="slide A a3" data-steps="1" data-style="A"><i class="mesh m3"></i>
<div class="kicker in">Practice · Pictograms</div>
<h2 class="in" style="--d:120">Bubble tea at the school canteen</h2>
<div class="pq">
 <div class="board in" style="--d:220"><div class="bh">Cups sold this week</div>{picto()}<div class="key">{cup(30)}<span>= 10 cups</span></div></div>
 <div class="askA"><div class="qn in" style="--d:900">Question</div><div class="q in" style="--d:980">How many cups were sold this week?</div>
  {choices(lambda l, v, i: f'<div class="c in{" ok" if l=="C" else ""}" style="--d:{1100+i*80}"><b>{l}</b>{v}</div>')}
  <div class="ans g1"><svg><use href="#check"/></svg><div>16.5 cups × 10 = <b>165 cups</b></div></div></div>
</div></section>'''
    return s1 + s2 + s3

# ======================================================================= B · notebook
ARROW = '<svg class="arrow" viewBox="0 0 160 90"><path class="dr" pathLength="1" d="M6 70 C 40 10, 100 6, 146 40"/><path class="dr d2" pathLength="1" d="M126 24 L148 42 L122 50"/></svg>'
SQUIG = '<svg class="squig" viewBox="0 0 300 24"><path class="dr" pathLength="1" d="M4 14 Q 20 2 36 14 T 68 14 T 100 14 T 132 14 T 164 14 T 196 14 T 228 14 T 260 14 T 292 14"/></svg>'
STAR = '<svg class="star" viewBox="0 0 40 40"><path class="dr" pathLength="1" d="M20 3 L24 15 L37 16 L27 24 L30 37 L20 30 L10 37 L13 24 L3 16 L16 15 Z"/></svg>'
CIRCLE = '<svg class="ring" viewBox="0 0 200 120"><path class="dr" pathLength="1" d="M30 60 C 30 20, 170 14, 176 56 C 182 100, 40 108, 26 70 C 20 50, 60 28, 100 26"/></svg>'

def style_b():
    s1 = f'''<section class="slide B b1" data-steps="0" data-style="B" data-name="Notebook"><i class="margin"></i><i class="holes"></i>
<div class="left">
 <div class="hand k in">maths · M1 · unit 4</div>
 <h1 class="in" style="--d:150"><span class="hl">Statistics</span> (1)</h1>{SQUIG}
 <div class="hand note in" style="--d:900">the maths of real life!</div>
 <div class="doodles"><div class="dbar">{bars([4, 7, 3, 6, 5], w=360, h=200)}<div class="hand cap">favourite snack</div></div>
  <div class="dpie">{donut([.45, .3, .25], r=62)}</div>{STAR}</div>
</div>
<div class="sticky s-yel big place" style="--r:2deg;--d:350"><i class="tape"></i><div class="sh">In this unit</div>
 <ul class="todo">{''.join(f'<li style="--n:{i}"><i class="box"><svg><use href="#check"/></svg></i><span>{t}</span></li>' for i, t in enumerate(LESSONS))}</ul>
 <div class="hand foot">+ a mini project at the end</div></div>
</section>'''
    s2 = f'''<section class="slide B b2" data-steps="2" data-style="B"><i class="margin"></i><i class="holes"></i>
<div class="hand k in">lesson 1 · statistical questions</div>
<h2 class="in" style="--d:120">Is it a <span class="hl">statistical</span> question?</h2>
<div class="cmp">
 <div class="sticky s-yel one place" style="--r:-1.4deg;--d:250"><i class="tape"></i><div class="q">“{Q_ONE}”</div>
  <div class="mid">{clock()}<div class="big">6:15</div></div>
  <div class="stamp no g2">NO</div><div class="hand v g2">1 answer → not statistical</div></div>
 <div class="sticky s-mint many g1 place" style="--r:1deg"><i class="tape t2"></i><div class="q">“{Q_MANY}”</div>
  {kids_row()}{dotplot()}
  <div class="stamp yes g2">YES</div><div class="hand v g2">everyone's answer is different!</div></div>
</div>
<p class="rule g2" style="--d:400">A statistical question expects answers that <span class="hl">vary</span>, so we collect data.</p>
</section>'''
    s3 = f'''<section class="slide B b3" data-steps="1" data-style="B"><i class="margin"></i><i class="holes"></i>
<div class="hand k in">practice · pictograms</div>
<h2 class="in" style="--d:120">Bubble tea at the school canteen</h2>
<div class="pq">
 <div class="paper in" style="--d:220"><div class="ph">cups sold this week</div>{picto()}<div class="key">{cup(30)}<span class="hand">= 10 cups</span></div></div>
 <div class="askB"><div class="q in" style="--d:950">How many cups were sold this week?</div>
  {choices(lambda l, v, i: f'<div class="c in{" ok" if l=="C" else ""}" style="--d:{1100+i*80}"><i class="o">{l}{CIRCLE if l=="C" else ""}</i>{v}</div>')}
  <div class="sticky s-pink ans g1 place" style="--r:-2deg"><i class="tape t3"></i><div class="hand">16.5 cups × 10 = <b>165</b></div></div>
  </div>
</div></section>'''
    return s1 + s2 + s3

# ======================================================================= C · cinematic
def bell_dots():
    cols = [1, 2, 4, 6, 8, 9, 8, 6, 4, 2, 1]
    out = [f'<circle cx="{40 + i*52}" cy="{520 - j*52}" r="17" class="g" style="--i:{i};--j:{j}"/>' for i, k in enumerate(cols) for j in range(k)]
    return f'<svg class="bell" viewBox="0 0 600 560"><line x1="0" y1="552" x2="600" y2="552" class="base" pathLength="1"/>{"".join(out)}</svg>'

def style_c():
    s1 = f'''<section class="slide C c1" data-steps="0" data-style="C" data-name="Cinematic"><i class="aur a1"></i><i class="aur a2"></i><i class="aur a3"></i><i class="grain"></i>
<div class="left">
 <div class="kick in" style="--d:200">Mathayomsuksa 1 · Mathematics · Unit 4</div>
 <h1><span class="w1">Statistics</span><span class="w2">(1)</span></h1>
 <p class="tag in" style="--d:1300">Every chart begins with <em>a question.</em></p>
</div>
{bell_dots()}
<ol class="lessons">{''.join(f'<li class="in" style="--d:{1500+i*110}"><b>0{i+1}</b><span>{t}</span></li>' for i, t in enumerate(LESSONS))}</ol>
</section>'''
    s2 = f'''<section class="slide C c2" data-steps="2" data-style="C"><i class="aur a1"></i><i class="aur a4"></i><i class="grain"></i>
<div class="kick in">Lesson 1 · Statistical questions</div>
<h2 class="in" style="--d:120">Is it a <em>statistical</em> question?</h2>
<div class="cmp">
 <div class="glass one in" style="--d:260"><div class="q">{Q_ONE}</div>
  <div class="ring"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" class="rg" pathLength="1"/></svg><div class="big">6:15</div></div>
  <div class="lbl g2">1 answer <i></i> not statistical</div></div>
 <div class="glass many g1"><div class="q">{Q_MANY}</div>
  {kids_row()}{dotplot()}
  <div class="lbl lit g2">answers vary <i></i> statistical</div></div>
</div>
<p class="line g2" style="--d:300">A statistical question expects answers that <em>vary</em>, so we collect data.</p>
</section>'''
    s3 = f'''<section class="slide C c3" data-steps="1" data-style="C"><i class="aur a2"></i><i class="aur a3"></i><i class="grain"></i>
<div class="kick in">Practice · Pictograms</div>
<h2 class="in" style="--d:120">Bubble tea at the school canteen</h2>
<div class="pq">
 <div class="glass neon in" style="--d:220">{picto()}<div class="key">{cup(30)}<span>= 10 cups</span></div></div>
 <div class="askC"><div class="q in" style="--d:1500">How many cups were sold this week?</div>
  {choices(lambda l, v, i: f'<div class="c in{" ok" if l=="C" else ""}" style="--d:{1650+i*90}"><b>{l}</b><span>{v}</span></div>')}
  <div class="ans g1"><span class="eq">16.5 × 10 =</span> <b data-count="165">165</b><span class="u">cups</span></div></div>
</div></section>'''
    return s1 + s2 + s3

# ======================================================================= D · step-by-step explainer
def style_d():
    s1 = f'''<section class="slide D d1" data-steps="0" data-style="D" data-name="Step-by-step"><div class="page">
<div class="top in"><span class="tagx">Unit 4</span><h1>Statistics (1)</h1></div>
<p class="subt in" style="--d:120">Mathayomsuksa 1 · step-by-step notes with worked examples</p>
<table class="toc in" style="--d:250"><thead><tr><th>#</th><th>Lesson</th><th>You will be able to…</th></tr></thead><tbody>
<tr style="--n:0"><td><b>1</b></td><td>Statistical questions</td><td>tell if a question needs data</td></tr>
<tr style="--n:1"><td><b>2</b></td><td>Data collection</td><td>choose primary or secondary data, census or survey</td></tr>
<tr style="--n:2"><td><b>3</b></td><td>Presenting &amp; reading data</td><td>read tables, pictograms, bar, line and pie charts</td></tr>
<tr style="--n:3"><td><b>4</b></td><td>Statistics in real life</td><td>use data to make a decision</td></tr></tbody></table>
<div class="keybox in" style="--d:800"><div class="kt">How to read these notes</div>
 <div class="kk"><span class="sw blue"></span>given information</div><div class="kk"><span class="sw orange"></span>working out</div><div class="kk"><span class="sw green"></span>answer</div></div>
<div class="tip in" style="--d:1000"><div class="tt">Shortcut boxes</div>Quick ways to check an answer, like the one at the end of each example.</div>
<div class="kinds in" style="--d:1150"><div class="kt2">Charts you will meet</div>
 <div class="kd"><svg viewBox="0 0 80 56"><rect x="4" y="6" width="72" height="44" rx="4" class="o"/><line x1="4" y1="20" x2="76" y2="20" class="o"/><line x1="4" y1="35" x2="76" y2="35" class="o"/><line x1="30" y1="6" x2="30" y2="50" class="o"/></svg>table</div>
 <div class="kd"><svg viewBox="0 0 80 56"><g class="f"><circle cx="14" cy="18" r="6"/><circle cx="31" cy="18" r="6"/><circle cx="48" cy="18" r="6"/><circle cx="65" cy="18" r="6"/><circle cx="14" cy="38" r="6"/><circle cx="31" cy="38" r="6"/><circle cx="48" cy="38" r="6"/></g></svg>pictogram</div>
 <div class="kd"><svg viewBox="0 0 80 56"><rect x="8" y="28" width="12" height="22" class="f"/><rect x="26" y="12" width="12" height="38" class="f2"/><rect x="44" y="20" width="12" height="30" class="f"/><rect x="62" y="34" width="12" height="16" class="f2"/><line x1="4" y1="50" x2="78" y2="50" class="o"/></svg>bar chart</div>
 <div class="kd"><svg viewBox="0 0 80 56"><polyline points="6,44 22,30 38,36 54,16 74,22" class="ln"/><line x1="4" y1="50" x2="78" y2="50" class="o"/></svg>line graph</div>
 <div class="kd"><svg viewBox="0 0 80 56"><circle cx="40" cy="28" r="22" class="f2"/><path d="M40 28 L40 6 A22 22 0 0 1 61 34 Z" class="f"/></svg>pie chart</div></div>
</div></section>'''
    s2 = f'''<section class="slide D d2" data-steps="2" data-style="D"><div class="page">
<div class="top in"><span class="tagx">Example 1</span><h2>Statistical or not?</h2></div>
<p class="subt in" style="--d:100">A short story about two questions</p>
<div class="story in" style="--d:220"><b class="blue">Mint</b> asks herself: <i>“What time did I wake up?”</i> → only one answer: <b class="blue">6:15</b>.<br>
Then she asks her <b class="purple">whole class</b>: <i>“What time did you wake up?”</i> → the answers are all different.</div>
<div class="dgrid">
 <table class="tbl in" style="--d:420"><caption>Some of the answers</caption><thead><tr><th>Friend</th>{''.join(f'<th>{k[4]}</th>' for k in KIDS)}</tr></thead>
  <tbody><tr><td>Woke up</td>{''.join(f'<td class="blue">{k[3]}</td>' for k in KIDS)}</tr></tbody></table>
 <div class="chart g1">{dotplot('<path d="M256 66 L322 44" class="ann" pathLength="1"/><text x="328" y="44" class="annt">most common: 6:30</text>')}<div class="spread">whole class (17 students) · spread <b class="orange">5:45 – 7:30</b></div></div>
</div>
<div class="tip g2"><div class="tt">Shortcut</div>Ask: could different people give <b>different answers</b>? Yes → it is a statistical question.
 <span class="ok">Answer: Mint's class question is statistical</span></div>
</div></section>'''
    s3 = f'''<section class="slide D d3" data-steps="2" data-style="D"><div class="page">
<div class="top in"><span class="tagx">Example 2</span><h2>Reading a pictogram</h2></div>
<p class="subt in" style="--d:100">How many cups of bubble tea did the canteen sell this week?</p>
<div class="pgrid">
 <div class="pbox in" style="--d:220"><div class="ph">Cups sold this week</div>{picto()}<div class="key">{cup(30)}<span>= <b class="blue">10 cups</b></span></div></div>
 <div class="steps">
  <div class="st g1"><span class="no">1</span><div><b>Count the icons</b><div class="m">3 + 2.5 + 4 + 2 + 5 = <b class="orange">16.5</b> icons</div></div></div>
  <div class="st g2"><span class="no">2</span><div><b>Each icon is 10 cups</b><div class="m">16.5 × <b class="blue">10</b> = <b class="orange">165</b></div></div></div>
  <div class="tip g2" style="--d:250"><div class="tt">Shortcut</div>Half an icon = half of 10 = <b>5 cups</b>. <span class="ok">Answer: C · 165 cups</span></div>
 </div>
</div></div></section>'''
    return s1 + s2 + s3

ENGINE = r'''
(function(){
var stage=document.getElementById('stage'),slides=[].slice.call(document.querySelectorAll('.slide')),N=slides.length,
 STEPS=slides.map(function(s){return +s.dataset.steps||0}),i=0,st=0,auto=null,
 pos=document.getElementById('pos'),tabs=[].slice.call(document.querySelectorAll('#tabs button'));
var qs=new URLSearchParams(location.search);
if(qs.has('still'))document.documentElement.classList.add('rm','shot');else if(matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('rm');
function fit(){var s=Math.min(innerWidth/1920,innerHeight/1080);stage.style.transform='translate(-50%,-50%) scale('+s+')'}
addEventListener('resize',fit);fit();
function count(el){var to=+el.dataset.count,t0=null,rm=document.documentElement.classList.contains('rm');
 if(rm){el.textContent=to;return}el.textContent='0';
 function f(t){if(!t0)t0=t;var p=Math.min(1,(t-t0)/900);el.textContent=Math.round(to*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)}requestAnimationFrame(f)}
function show(){slides.forEach(function(s,k){var on=k===i;s.classList.toggle('on',on);for(var b=1;b<=3;b++)s.classList.toggle('b'+b,on&&st>=b)});
 var s=slides[i],sty=s.dataset.style,first=slides.findIndex(function(x){return x.dataset.style===sty}),n=slides.filter(function(x){return x.dataset.style===sty}).length;
 pos.textContent='Style '+sty+' · '+(i-first+1)+'/'+n;
 tabs.forEach(function(t){t.setAttribute('aria-pressed',t.dataset.s===sty)});
 s.querySelectorAll('[data-count]').forEach(function(el){if(st>=1)count(el)});
 document.getElementById('live').textContent='Style '+sty+', slide '+(i-first+1)+', step '+st;}
function next(){if(st<STEPS[i])st++;else if(i<N-1){i++;st=0}show()}
function prev(){if(st>0)st--;else if(i>0){i--;st=STEPS[i]}show()}
function jump(k,b){i=Math.max(0,Math.min(N-1,k));st=Math.min(b||0,STEPS[i]);show()}
tabs.forEach(function(t){t.addEventListener('click',function(e){e.stopPropagation();jump(slides.findIndex(function(x){return x.dataset.style===t.dataset.s}))})});
document.getElementById('nx').onclick=function(e){e.stopPropagation();next()};
document.getElementById('pv').onclick=function(e){e.stopPropagation();prev()};
var ab=document.getElementById('au');ab.onclick=function(e){e.stopPropagation();if(auto){clearInterval(auto);auto=null;ab.setAttribute('aria-pressed','false')}else{auto=setInterval(function(){if(i===N-1&&st===STEPS[i])jump(0);else next()},3600);ab.setAttribute('aria-pressed','true')}};
stage.addEventListener('click',function(e){(e.clientX<innerWidth*0.25)?prev():next()});
addEventListener('keydown',function(e){if(['ArrowRight',' ','Enter','PageDown'].indexOf(e.key)>-1){e.preventDefault();next()}
 else if(['ArrowLeft','Backspace','PageUp'].indexOf(e.key)>-1){e.preventDefault();prev()}});
var x0=null;stage.addEventListener('touchstart',function(e){x0=e.touches[0].clientX},{passive:true});
stage.addEventListener('touchend',function(e){if(x0===null)return;var dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>50){e.preventDefault();dx<0?next():prev()}x0=null});
window.__deck={jump:jump,next:next,state:function(){return{i:i,st:st,steps:STEPS[i],n:N}}};
jump(+(qs.get('s')||0),+(qs.get('b')||0));
})();'''

CSS = (HERE / 'v2.css').read_text(encoding='utf-8')
UI = '''<nav id="tabs" aria-label="Styles"><button data-s="A">A · Modern clean</button><button data-s="B">B · Notebook</button><button data-s="C">C · Cinematic</button><button data-s="D">D · Step-by-step</button>
<span class="sep"></span><button id="pv" aria-label="Back">‹</button><span id="pos"></span><button id="nx" aria-label="Next">›</button><button id="au" aria-pressed="false">Auto</button></nav>
<p id="hint">Tap or press → to play each step · choose a style above</p><div id="live" class="sr" aria-live="polite"></div>'''
html = ('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>Slide styles · Unit 4 Statistics (1)</title><meta name="robots" content="noindex">'
        f'<style>{CSS}</style></head><body>{SYMBOLS}{UI}<main id="stage">{style_a()}{style_b()}{style_c()}{style_d()}</main>'
        f'<script>{ENGINE}</script></body></html>')
(HERE / 'index.html').write_text(html, encoding='utf-8')
print('wrote index.html')
