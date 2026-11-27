#!/usr/bin/env python3
"""Generator for teacher-slides/unit4/parts/30-lesson3a.html (Lesson 3, part 1: tables, pictograms, bar charts).
Computes every chart's geometry and asserts every total, so the numbers on the slides are checked."""
import math, random, datetime
from pathlib import Path

OUT = Path('/home/user/aia-slides/teacher-slides/unit4/parts/30-lesson3a.html')


def f(v):
    s = ('%.1f' % v)
    return s[:-2] if s.endswith('.0') else s


def rr(x, y, w, h, r):
    """rounded-rectangle path (for drawn rings)"""
    return (f"M{f(x+r)} {f(y)} H{f(x+w-r)} Q{f(x+w)} {f(y)} {f(x+w)} {f(y+r)} V{f(y+h-r)} Q{f(x+w)} {f(y+h)} {f(x+w-r)} {f(y+h)} "
            f"H{f(x+r)} Q{f(x)} {f(y+h)} {f(x)} {f(y+h-r)} V{f(y+r)} Q{f(x)} {f(y)} {f(x+r)} {f(y)} Z")


CUP = '<svg class="cup{cls}" viewBox="0 0 64 96" style="{st}"><use href="#cup"/></svg>'
BOOK = '<svg class="bk{cls}" viewBox="0 0 48 64" style="{st}"><use href="#l3a-bk"/></svg>'


def cups(n, w=56, h=84, d=None, n0=0, anim='drop'):
    """n icons (may end in .5) -> html; returns (html, next n)"""
    out = []
    whole = int(n)
    k = n0
    dd = f';--d:{d}' if d is not None else ''
    for _ in range(whole):
        out.append(CUP.format(cls=' ' + anim, st=f'--n:{k}{dd};width:{w}px;height:{h}px'))
        k += 1
    if n - whole:
        out.append(f'<span class="halfcup {anim}" style="--n:{k}{dd}">' + CUP.format(cls='', st=f'width:{w}px;height:{h}px') + '</span>')
        k += 1
    return ''.join(out), k


def books(n, w=46, h=62, d=None, n0=0, anim='drop'):
    out = []
    whole = int(n)
    k = n0
    dd = f';--d:{d}' if d is not None else ''
    for _ in range(whole):
        out.append(BOOK.format(cls=' ' + anim, st=f'--n:{k}{dd};width:{w}px;height:{h}px'))
        k += 1
    if n - whole:
        out.append(f'<span class="halfbk {anim}" style="--n:{k}{dd}">' + BOOK.format(cls='', st=f'width:{w}px;height:{h}px') + '</span>')
        k += 1
    return ''.join(out), k


CSS = []
SLIDES = []

# ---------------------------------------------------------------- shared bits
CSS.append("""
#l3a-parts .lb,#l3a-picto .lb{position:absolute;display:flex;gap:18px;align-items:flex-start;padding:22px 26px;border-radius:24px;background:#fff;box-shadow:0 14px 36px rgba(15,27,51,.10)}
#l3a-parts .lb i,#l3a-picto .lb i,#l3a-two .lb i{flex:none;width:50px;height:50px;border-radius:15px;display:grid;place-items:center;color:#fff;font:800 26px Inter;font-style:normal}
#l3a-parts .lb h3,#l3a-picto .lb h3{font:700 36px/1.1 Display;margin:4px 0 6px}
#l3a-parts .lb p,#l3a-picto .lb p{font:500 28px/1.35 Inter;color:var(--mute)}
#l3a-picto .hd,#l3a-lib .hd{height:80px;display:flex;align-items:center;padding:0 36px;background:linear-gradient(100deg,var(--blue),var(--violet));color:#fff;font:700 30px Inter;border-radius:32px 32px 0 0}
#l3a-lib .hd{background:linear-gradient(100deg,var(--violet),#B05CFF)}
#l3a-lib .halfbk,#l3a-ex .halfbk{position:relative;display:block;flex:none}
#l3a-lib .halfbk::after,#l3a-ex .halfbk::after{content:"";position:absolute;top:0;bottom:0;right:0;width:50%;background:rgba(255,255,255,.82);border-left:2.5px dashed #8C97B2}
#l3a-lib .bk,#l3a-ex .bk{display:block;flex:none}
""")

# book symbol (used on the library slide and the divider)
BOOK_SYMBOL = """<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
 <symbol id="l3a-bk" viewBox="0 0 48 64">
  <rect x="5" y="4" width="38" height="56" rx="6" fill="#4B33C9"/>
  <rect x="9" y="47" width="32" height="10" rx="2.5" fill="#fff"/>
  <path d="M12 50.5 H38 M12 54 H38" stroke="#C9C2F5" stroke-width="1.6"/>
  <path d="M11 4 H37 Q43 4 43 10 V47 H11 Q5 47 5 41 V10 Q5 4 11 4 Z" fill="#7C5CFF"/>
  <rect x="5" y="4" width="9" height="43" rx="4" fill="#6346EA"/>
  <rect x="19" y="13" width="18" height="9" rx="2.5" fill="#fff"/>
  <rect x="19" y="27" width="13" height="3.5" rx="1.75" fill="#fff" opacity=".6"/>
  <rect x="19" y="34" width="9" height="3.5" rx="1.75" fill="#fff" opacity=".6"/>
 </symbol>
</defs></svg>"""

# ======================================================================== 1 opener
def s_open():
    CSS.append("""
#l3a-open .vis{position:relative;width:540px;height:800px}
#l3a-open .mc{position:absolute;padding:22px 26px}
#l3a-open .mc .chip{margin-bottom:12px}
#l3a-open .mt{display:grid;grid-template-columns:1fr auto;gap:8px 30px;font:600 28px Inter;padding-right:6px}
#l3a-open .mt span{padding:4px 0;justify-self:start}
#l3a-open .mt span:nth-child(even){font-weight:800;color:var(--blue);justify-self:end}
#l3a-open .pr{display:flex;align-items:center;gap:7px;height:52px;font:700 26px Inter}
#l3a-open .pr b{width:66px}
#l3a-open .lk{position:absolute;left:0;top:0;width:540px;height:800px;overflow:visible;pointer-events:none}
""")
    data = [('Mon', 30), ('Tue', 45), ('Wed', 40)]
    assert all(v % 5 == 0 for _, v in data)
    rows = ''
    k = 0
    for name, v in data:
        h, k = cups(v / 10, 30, 45, d=1100, n0=k, anim='pop')
        rows += f'<div class="pr"><b>{name}</b>{h}</div>'
    # mini bar chart, 0..50 -> 100px
    bars = ''
    for i, (name, v) in enumerate(data):
        hgt = v / 45 * 96
        x = 22 + i * 86
        col = ['f-blue', 'f-violet', 'f-coral'][i]
        bars += f'<rect x="{x}" y="{f(112-hgt)}" width="58" height="{f(hgt)}" rx="7" class="grow {col}" style="--n:{i};--d:1300"/>'
        bars += f'<text x="{x+29}" y="142" text-anchor="middle" class="lab" style="font-size:22px">{name}</text>'
    goals = [('Read and make a <b>data table</b>', 450), ('Read a <b>pictogram</b> using its <b>key</b>', 540), ('Read and draw a <b>bar chart</b>', 630)]
    gl = ''.join(f'<li class="in" style="--d:{d}"><svg><use href="#check"/></svg><span>{t}</span></li>' for t, d in goals)
    return f"""
<section class="slide opener" id="l3a-open" data-steps="0" data-lesson="3" data-title="Lesson 3 · Presenting &amp; reading data">
 <i class="mesh m2"></i>
 <div style="display:grid;grid-template-columns:200px 1fr 540px;gap:40px;align-items:center;height:100%">
  <div class="num in" style="--d:100">3</div>
  <div class="stack" style="gap:22px">
   <div class="kicker in" style="--d:200">Lesson 3 · Part 1</div>
   <h2 class="in" style="--d:280;margin:0">Tables, pictograms<br>&amp; <em>bar charts</em></h2>
   <p class="lede in" style="--d:380;max-width:760px">The same data can be shown in different ways.</p>
   <ul class="goals" style="margin-top:8px">{gl}</ul>
  </div>
  <div class="vis">
   <svg class="lk" viewBox="0 0 540 800" aria-hidden="true">
    <path d="M338 108 C 410 108, 380 200, 380 270" pathLength="1" class="draw" style="--d:1500;fill:none;stroke:var(--violet);stroke-width:4;stroke-linecap:round"/>
    <path d="M192 408 C 110 408, 160 500, 160 580" pathLength="1" class="draw" style="--d:1800;fill:none;stroke:var(--violet);stroke-width:4;stroke-linecap:round"/>
   </svg>
   <div class="card mc float" style="left:10px;top:0;width:320px;height:216px;--r:-3deg;--d:500">
    <span class="chip">Table</span>
    <div class="mt"><span>Mon</span><span>30</span><span>Tue</span><span>45</span><span>Wed</span><span>40</span></div>
   </div>
   <div class="card mc float" style="left:200px;top:280px;width:340px;height:250px;--r:2.5deg;--d:700">
    <span class="chip violet">Pictogram</span>
    {rows}
   </div>
   <div class="card mc float" style="left:10px;top:588px;width:320px;height:212px;--r:-2deg;--d:900">
    <span class="chip coral">Bar chart</span>
    <svg class="chart" viewBox="0 0 270 150" style="width:270px;height:150px"><line x1="8" y1="113" x2="262" y2="113" class="grid"/>{bars}</svg>
   </div>
  </div>
 </div>
 <aside class="notes">Lesson 3, part 1 (about 1 minute). Say: "Last lesson we collected data. Today we show it so people can read it fast." Point at the three cards on the right: they show the SAME data (bubble tea: Mon 30, Tue 45, Wed 40 cups) as a table, a pictogram (1 cup = 10 cups, so 3, 4½ and 4 cups) and a bar chart. Read the three goals aloud. Check: 30 ÷ 10 = 3, 45 ÷ 10 = 4.5, 40 ÷ 10 = 4.</aside>
</section>"""


# ======================================================================== 2 why present data
def s_why():
    raw = [1, 2, 0, 1, 3, 1, 2, 1, 0, 2, 1, 1, 3, 0, 2, 1, 2, 0, 1, 3, 1, 2, 0, 1]
    counts = [raw.count(v) for v in range(4)]
    assert len(raw) == 24 and counts == [5, 10, 6, 3] and sum(counts) == 24
    W, H = 1000, 740
    sw, sh = 120, 48
    base, step = 640, 54          # pile base line, height of one student
    cx = [250, 450, 650, 850]     # pile centres
    cols, rows = 6, 4
    cw, chh = (W - 60) / cols, (H - 130) / rows
    rots = [-11, 7, -4, 13, -8, 5, 10, -13, 3, -6, 12, -9, 6, -12, 9, -3, 14, -7, -10, 4, -5, 11, -14, 8]
    rnd = random.Random(7)
    boxes = []
    slips = []
    seen = [0, 0, 0, 0]
    for i, v in enumerate(raw):
        c, r = i % cols, i // cols
        mx = 30 + cw * (c + .5) + rnd.uniform(-12, 12) + (18 if r % 2 else -18)
        my = 105 + chh * (r + .5) + rnd.uniform(-26, 26)
        a = math.radians(rots[i])
        bw = sw * abs(math.cos(a)) + sh * abs(math.sin(a))
        bh = sw * abs(math.sin(a)) + sh * abs(math.cos(a))
        box = (mx - bw / 2, my - bh / 2, mx + bw / 2, my + bh / 2)
        assert box[0] > 8 and box[2] < W - 8 and box[1] > 84 and box[3] < H - 8, box
        for b in boxes:
            assert box[2] + 4 < b[0] or b[2] + 4 < box[0] or box[3] + 4 < b[1] or b[3] + 4 < box[1], (i, box, b)
        boxes.append(box)
        k = seen[v]; seen[v] += 1
        x1, y1 = cx[v] - sw / 2, base - step * (k + 1) + 6
        slips.append(f'<div class="slip v{v}" style="--x0:{f(mx-sw/2)}px;--y0:{f(my-sh/2)}px;--r:{rots[i]}deg;--x1:{f(x1)}px;--y1:{f(y1)}px;--n:{i}">'
                     f'<div class="sl pop" style="--n:{i*0.45:.2f};--d:350">{v}</div></div>')
    col = ['blue', 'violet', 'coral', 'mint']
    svg = []
    # beat 1: base line + category labels
    g1 = [f'<line x1="120" y1="{base}" x2="960" y2="{base}" class="axis"/>']
    for v in range(4):
        g1.append(f'<text x="{cx[v]}" y="{base+44}" text-anchor="middle" class="lab" style="font:800 30px Inter">{v}</text>')
    # beat 2: grid, y axis, ticks, bars, values, titles
    g2 = []
    for t in range(2, 11, 2):
        g2.append(f'<line x1="120" y1="{base-step*t}" x2="960" y2="{base-step*t}" class="grid"/>')
    for v in range(4):
        n = counts[v]
        g2.append(f'<rect x="{cx[v]-60}" y="{base-step*n}" width="120" height="{step*n}" rx="10" class="grow f-{col[v]}" style="--n:{v};--d:350"/>')
    for t in range(0, 11, 2):
        g2.append(f'<text x="104" y="{base-step*t+8}" text-anchor="end" class="tick">{t}</text>')
    g2.append(f'<line x1="120" y1="{base-step*10-14}" x2="120" y2="{base}" class="axis"/>')
    for v in range(4):
        n = counts[v]
        g2.append(f'<text x="{cx[v]}" y="{base-step*n-14}" text-anchor="middle" class="val pop" style="--n:{v};--d:900;font-size:28px">{n}</text>')
    g2.append(f'<text x="540" y="{base+86}" text-anchor="middle" class="lab">Number of brothers and sisters</text>')
    g2.append(f'<text transform="translate(52 {base-step*5}) rotate(-90)" text-anchor="middle" class="lab">Students</text>')
    svg = (f'<svg class="chart" viewBox="0 0 {W} {H}" style="position:absolute;left:0;top:0;width:{W}px;height:{H}px" aria-hidden="true">'
           f'<g class="g1">{"".join(g1)}</g><g class="g2">{"".join(g2)}</g></svg>')
    CSS.append("""
#l3a-why .field{position:relative;width:1000px;height:740px;padding:0;overflow:hidden}
#l3a-why .slip{position:absolute;left:0;top:0;width:120px;height:48px;transform:translate(var(--x0),var(--y0)) rotate(var(--r));transition:transform 1.1s var(--ease),opacity .6s ease;transition-delay:calc(var(--n)*30ms)}
#l3a-why.b1 .slip{transform:translate(var(--x1),var(--y1)) rotate(0deg)}
#l3a-why.b2 .slip{opacity:0}
#l3a-why .sl{display:grid;place-items:center;width:100%;height:100%;border-radius:12px;background:#fff;border:2px solid #D8DEEA;box-shadow:0 6px 14px rgba(15,27,51,.10);font:800 32px Inter;color:var(--ink);transition:background .6s,color .6s,border-color .6s}
#l3a-why.b1 .v0 .sl{background:var(--lblue);border-color:#B9C9FF;color:var(--blue)}
#l3a-why.b1 .v1 .sl{background:var(--lviolet);border-color:#CFC2FF;color:var(--violet)}
#l3a-why.b1 .v2 .sl{background:var(--lcoral);border-color:#FFC4BC;color:#E0493A}
#l3a-why.b1 .v3 .sl{background:var(--lmint);border-color:#A6E8D9;color:var(--okc)}
#l3a-why .ph{position:absolute;left:30px;top:26px;opacity:0;transition:opacity .45s ease}
#l3a-why.on:not(.b1) .ph0,#l3a-why.b1:not(.b2) .ph1,#l3a-why.b2 .ph2{opacity:1}
#l3a-why .tbl{width:100%}
#l3a-why .tbl td,#l3a-why .tbl th{padding:8px 28px}
#l3a-why .tbl td{font-size:30px}
#l3a-why .pq{display:flex;flex-direction:column;justify-content:center;gap:16px;height:100%;border:3px dashed #C9D2E6;box-shadow:none;background:rgba(255,255,255,.6)}
#l3a-why .pq .big{color:var(--violet);font-size:96px}
""")
    trs = ''.join(f'<tr><td>{v}</td><td class="n"><b data-count="{counts[v]}" data-at="1"></b></td></tr>' for v in range(4))
    return f"""
<section class="slide" id="l3a-why" data-steps="2">
 <i class="mesh m3"></i>
 <div class="kicker in">Lesson 3 · Presenting data</div>
 <h2 class="in" style="--d:120">Why <em>present</em> data?</h2>
 <div style="display:grid;grid-template-columns:1000px 1fr;gap:40px">
  <div class="card field in" style="--d:200">
   {svg}
   <span class="chip sun ph ph0">Raw data · 24 answers</span>
   <span class="chip violet ph ph1">Sorted and counted</span>
   <span class="chip mint ph ph2">Drawn as a bar chart</span>
   {''.join(slips)}
  </div>
  <div class="stack" style="gap:22px">
   <div class="card in" style="--d:260;padding:28px 34px">
    <span class="chip sun">Class 1/3 survey</span>
    <div class="q" style="margin-top:14px">How many brothers and sisters do you have?</div>
   </div>
   <div style="position:relative;height:330px">
    <div class="card pq h1" style="position:absolute;inset:0;--d:500;padding:28px 34px">
     <div class="big">?</div>
     <div class="body">Which answer is the most common? It is hard to see in a <b>messy list</b>.</div>
    </div>
    <div class="g1" style="position:absolute;inset:0">
     <table class="tbl"><thead><tr><th>Siblings</th><th class="n">Students</th></tr></thead>
      <tbody>{trs}</tbody>
      <tfoot><tr><td>Total</td><td class="n"><b data-count="24" data-at="1"></b></td></tr></tfoot></table>
    </div>
   </div>
   <div class="idea g2"><svg><use href="#bulb"/></svg><div>A chart shows the pattern at a glance: most students have <b>1</b> sibling.</div></div>
  </div>
 </div>
 <aside class="notes">Say: "We asked 24 students in 1/3: how many brothers and sisters do you have?" Show the raw slips. Ask: "Which answer is the most common?" Students find it hard: that is why we present data. Click (beat 1): the slips sort themselves into groups and the table counts them. 0 siblings: 5 · 1 sibling: 10 · 2 siblings: 6 · 3 siblings: 3. Check: 5 + 10 + 6 + 3 = 24 ✓ (and again: 10 + 6 = 16, 16 + 5 = 21, 21 + 3 = 24 ✓). Click (beat 2): each pile becomes a bar. Ask: "What do you see now?" Most students have 1 sibling (10 students); the fewest have 3 (3 students). A table gives exact numbers; a chart shows the pattern fast.</aside>
</section>"""


# ======================================================================== 3 data table: 3 parts
def s_parts():
    days = [('Monday', 42), ('Tuesday', 35), ('Wednesday', 48), ('Thursday', 30), ('Friday', 55)]
    tot = sum(v for _, v in days)
    assert tot == 210 and 42 + 35 + 48 + 30 + 55 == 210
    assert datetime.date(2026, 11, 16).weekday() == 0 and datetime.date(2026, 11, 20).weekday() == 4
    CARD_T = 40
    # parts inside the card (card-relative y)
    TT, TH = 38, 92            # title block
    BT, RH = 160, 54           # table top, row height (7 rows)
    ST, SH = 566, 40           # source
    CH = 640
    rings = [  # (y0, y1, colour, label-centre)
        (TT - 12, TT + TH + 10, 'var(--blue)'),
        (BT - 10, BT + 7 * RH + 10, 'var(--violet)'),
        (ST - 10, ST + SH + 10, 'var(--coral)'),
    ]
    ov = []
    lbls = []
    texts = [
        ('Title', 'Says <b class="w1c">what</b>, <b class="w2c">where</b> and <b class="w3c">when</b>.'),
        ('Table', 'Rows and columns hold the data.'),
        ('Source', 'Tells where the data came from.'),
    ]
    LX = 1020
    for i, (y0, y1, colr) in enumerate(rings):
        by0, by1 = CARD_T + y0, CARD_T + y1
        cy = (by0 + by1) / 2
        g = f'g{i+1}'
        ov.append(f'<g class="{g}"><path d="{rr(22, by0, 856, by1-by0, 18)}" pathLength="1" class="draw" style="fill:none;stroke:{colr};stroke-width:4"/>'
                  f'<path d="M880 {f(cy)} H{LX}" pathLength="1" class="draw" style="--d:700;fill:none;stroke:{colr};stroke-width:4;stroke-linecap:round"/>'
                  f'<circle cx="880" cy="{f(cy)}" r="8" class="pop" style="--d:600;fill:{colr}"/></g>')
        h3, p = texts[i]
        lh = 150 if i else 150
        lbls.append(f'<div class="lb {g}" style="left:{LX}px;top:{f(cy-lh/2)}px;width:{1660-LX}px;height:{lh}px;--d:900">'
                    f'<i style="background:{colr}">{i+1}</i><div><h3>{h3}</h3><p>{p}</p></div></div>')
    CSS.append(f"""
#l3a-parts .pt{{position:absolute;left:44px;width:812px}}
#l3a-parts .tbl{{width:812px;table-layout:fixed}}
#l3a-parts .tbl td,#l3a-parts .tbl th{{height:{RH}px;padding:0 28px}}
#l3a-parts .w1,#l3a-parts .w2,#l3a-parts .w3{{transition:background-size .7s var(--ease);background-repeat:no-repeat;background-position:0 94%;background-size:0 38%}}
#l3a-parts .w1{{background-image:linear-gradient(rgba(59,108,255,.32),rgba(59,108,255,.32))}}
#l3a-parts .w2{{background-image:linear-gradient(rgba(124,92,255,.34),rgba(124,92,255,.34));transition-delay:.25s}}
#l3a-parts .w3{{background-image:linear-gradient(rgba(255,107,91,.36),rgba(255,107,91,.36));transition-delay:.5s}}
#l3a-parts.b1 .w1,#l3a-parts.b1 .w2,#l3a-parts.b1 .w3{{background-size:100% 38%}}
#l3a-parts .w1c{{color:var(--blue)}} #l3a-parts .w2c{{color:var(--violet)}} #l3a-parts .w3c{{color:#E0493A}}
#l3a-parts .prompt{{position:absolute;left:{LX}px;top:300px;width:{1660-LX}px}}
""")
    trs = ''.join(f'<tr><td>{d}</td><td class="n">{v}</td></tr>' for d, v in days)
    return f"""
<section class="slide" id="l3a-parts" data-steps="3">
 <i class="mesh m4"></i>
 <div class="kicker in">Lesson 3 · Data tables</div>
 <h2 class="in" style="--d:120">A data table has <em>3 parts</em></h2>
 <div style="position:relative;height:740px">
  <div class="card in" style="--d:200;position:absolute;left:0;top:{CARD_T}px;width:900px;height:{CH}px;padding:0">
   <div class="pt" style="top:{TT}px;height:{TH}px;font:700 32px/1.35 Display;letter-spacing:-.01em"><span class="w1">Mango sticky rice sold</span> <span class="w2">at the school canteen</span>,<br><span class="w3">16–20 November 2026</span></div>
   <div class="pt" style="top:{BT}px">
    <table class="tbl"><thead><tr><th>Day</th><th class="n">Boxes sold</th></tr></thead>
     <tbody>{trs}</tbody><tfoot><tr><td>Total</td><td class="n">{tot}</td></tr></tfoot></table>
   </div>
   <div class="pt" style="top:{ST}px;height:{SH}px;font:500 26px/40px Inter;color:var(--mute)">Source: the canteen’s daily sales book</div>
  </div>
  <svg viewBox="0 0 1660 740" style="position:absolute;left:0;top:0;width:1660px;height:740px;pointer-events:none;overflow:visible" aria-hidden="true">{''.join(ov)}</svg>
  <div class="card t-blue prompt h1" style="--d:500"><div class="lede" style="color:var(--ink)">Every good <b>data table</b> has 3 parts. Can you find them?</div></div>
  {''.join(lbls)}
 </div>
 <aside class="notes">Ask: "What 3 parts can you see?" Let students point. Beat 1: the <b>title</b> says WHAT (mango sticky rice sold), WHERE (the school canteen) and WHEN (16–20 November 2026, Monday to Friday). Beat 2: the <b>table</b>: rows and columns, with a Total row. Check the total: 42 + 35 + 48 + 30 + 55 = 210 (42 + 35 = 77, 77 + 48 = 125, 125 + 30 = 155, 155 + 55 = 210 ✓). Beat 3: the <b>source</b> tells us where the data came from, so we can trust it or check it. Quick question: "Which day sold the most?" (Friday, 55 boxes).</aside>
</section>"""


# ======================================================================== 4 two-way table (teaching)
def s_two():
    rows = [('1/1', 6, 4), ('1/2', 5, 7), ('1/3', 8, 6)]
    rt = [b + g for _, b, g in rows]
    bt, gt = sum(b for _, b, _ in rows), sum(g for _, _, g in rows)
    assert rt == [10, 12, 14] and bt == 19 and gt == 17 and bt + gt == sum(rt) == 36
    T, RH = 172, 80
    CSS.append(f"""
#l3a-two .tbl{{position:absolute;left:44px;top:{T}px;width:820px;table-layout:fixed;font-size:34px}}
#l3a-two .tbl th,#l3a-two .tbl td{{height:{RH}px;padding:0 26px;text-align:center;transition:background .5s,color .5s,box-shadow .5s}}
#l3a-two .tbl th:first-child,#l3a-two .tbl td:first-child{{text-align:left}}
#l3a-two .tbl th{{font-size:30px}}
#l3a-two .tbl td{{font-weight:600}}
#l3a-two .tbl th.tc{{background:var(--violet)}}
#l3a-two .bl{{display:inline-grid;place-items:center;min-width:92px;height:54px;padding:0 10px;border-radius:14px;border:2.5px dashed #AEB8D0;font:800 34px Inter;color:var(--violet);transition:background .5s,border-color .5s}}
#l3a-two.b2 .ct .bl,#l3a-two.b3 .rt .bl{{background:var(--lviolet);border-color:transparent}}
#l3a-two.b1:not(.b2) .r2 td{{background:var(--lblue)}}
#l3a-two.b1:not(.b2) .cg{{background:var(--lcoral)}}
#l3a-two.b1:not(.b2) th.cg{{background:var(--coral)}}
#l3a-two.b1:not(.b2) td.x{{background:var(--coral);color:#fff;box-shadow:inset 0 0 0 4px #E0493A}}
#l3a-two .steps>li{{transition:opacity .4s}}
#l3a-two .steps>li:nth-child(1)::before{{background:var(--coral)}}
#l3a-two .steps>li:nth-child(2)::before,#l3a-two .steps>li:nth-child(3)::before{{background:var(--violet)}}
""")
    body = ''
    for i, (c, b, g) in enumerate(rows):
        cls = ' class="r2"' if c == '1/2' else ''
        gcls = 'cg x' if c == '1/2' else 'cg'
        body += f'<tr{cls}><td>{c}</td><td>{b}</td><td class="{gcls}">{g}</td><td class="ct"><span class="bl" data-count="{b+g}" data-at="2"></span></td></tr>'
    foot = (f'<tr class="rt"><td>Total</td><td><span class="bl" data-count="{bt}" data-at="3"></span></td>'
            f'<td class="cg"><span class="bl" data-count="{gt}" data-at="3"></span></td><td><span class="bl" data-count="{bt+gt}" data-at="3"></span></td></tr>')
    # arrows (card coordinates): columns Class 44..264, Boys 264..449, Girls 449..634, Total 634..864 (fixed layout: 220 + 3*200 = 820)
    colx = [44, 264, 449, 634, 864]
    # table-layout fixed with no widths -> equal columns: 820/4 = 205
    colx = [44 + 205 * k for k in range(5)]
    cxb, cxt = (colx[1] + colx[2]) / 2, (colx[3] + colx[4]) / 2
    arr = (f'<g class="g2"><path d="M{f(cxb)} {T-30} H{f(cxt-6)}" pathLength="1" class="draw" style="fill:none;stroke:var(--violet);stroke-width:5;stroke-linecap:round"/>'
           f'<path d="M{f(cxt-20)} {T-42} L{f(cxt-4)} {T-30} L{f(cxt-20)} {T-18}" class="pop" style="--d:1100;fill:none;stroke:var(--violet);stroke-width:5;stroke-linecap:round;stroke-linejoin:round"/>'
           f'<text x="{f((cxb+cxt)/2)}" y="{T-46}" text-anchor="middle" class="lab" style="fill:var(--violet);font-weight:700;font-size:26px">add across</text></g>'
           f'<g class="g3"><path d="M904 {T+RH+10} V{T+5*RH-14}" pathLength="1" class="draw" style="fill:none;stroke:var(--violet);stroke-width:5;stroke-linecap:round"/>'
           f'<path d="M892 {T+5*RH-30} L904 {T+5*RH-12} L916 {T+5*RH-30}" class="pop" style="--d:1100;fill:none;stroke:var(--violet);stroke-width:5;stroke-linecap:round;stroke-linejoin:round"/>'
           f'<text transform="translate(944 {T+2.5*RH+40}) rotate(90)" text-anchor="middle" class="lab" style="fill:var(--violet);font-weight:700;font-size:26px">add down</text></g>')
    return f"""
<section class="slide" id="l3a-two" data-steps="3">
 <i class="mesh"></i>
 <div class="kicker in">Lesson 3 · Two-way tables</div>
 <h2 class="in" style="--d:120">Read a <em>two-way</em> table</h2>
 <div style="display:grid;grid-template-columns:600px 1fr;gap:50px;height:740px">
  <div class="stack" style="gap:24px">
   <p class="body in" style="--d:250">A <b>two-way table</b> sorts data in two ways: by <b>class</b> and by <b>boys or girls</b>.</p>
   <div class="card t-coral in" style="--d:400;padding:22px 30px;box-shadow:none"><div class="kicker" style="color:var(--coral)">Try it</div><div class="q" style="margin-top:6px">How many girls in 1/2 ride the bus?</div></div>
   <ol class="steps">
    <li class="g1"><span>Row 1/2 meets column Girls at <b>7</b>.</span></li>
    <li class="g2"><span><b>Add across</b> to get each row total.</span></li>
    <li class="g3"><span><b>Add down</b> to get each column total.</span></li>
   </ol>
   <div class="badge yes g3" style="--d:600;align-self:flex-start"><svg><use href="#check"/></svg>Check: 10 + 12 + 14 = 36 = 19 + 17</div>
  </div>
  <div class="card in" style="--d:200;position:relative;height:700px;padding:0">
   <div style="position:absolute;left:44px;top:34px;font:700 32px Display">Students who ride the school bus</div>
   <table class="tbl"><thead><tr><th>Class</th><th>Boys</th><th class="cg">Girls</th><th class="tc">Total</th></tr></thead>
    <tbody>{body}</tbody><tfoot>{foot}</tfoot></table>
   <div style="position:absolute;left:44px;top:{T+5*RH+26}px;font:500 26px Inter;color:var(--mute)">Source: school bus list, term 2</div>
   <svg class="chart" viewBox="0 0 1010 700" style="position:absolute;left:0;top:0;width:1010px;height:700px;overflow:visible;pointer-events:none" aria-hidden="true">{arr}</svg>
  </div>
 </div>
 <aside class="notes">A two-way table sorts the same students in two ways: by class (rows) and by boys or girls (columns). Beat 1: "How many girls in 1/2 ride the bus?" Go along row 1/2 and down column Girls: they meet at 7. Beat 2: add across for each row total: 1/1: 6 + 4 = 10 · 1/2: 5 + 7 = 12 · 1/3: 8 + 6 = 14. Beat 3: add down for each column total: boys 6 + 5 + 8 = 19 · girls 4 + 7 + 6 = 17 · all 19 + 17 = 36. Check the other way: 10 + 12 + 14 = 36 ✓. Both ways must give the same grand total.</aside>
</section>"""


# ======================================================================== 5 pictogram parts
def s_picto():
    data = [('Mon', 30), ('Tue', 45), ('Wed', 40), ('Thu', 25), ('Fri', 60)]
    assert sum(v for _, v in data) == 200 and all(v % 5 == 0 for _, v in data)
    CL, CT, CW = 470, 25, 720     # card box in body coords
    RT, RH, KT = 96, 94, 584      # rows top (card coords), row height, key top
    CHh = 680
    rows = ''
    k = 0
    for name, v in data:
        h, k = cups(v / 10, d=500, n0=k)
        rows += f'<div class="prow" style="height:{RH}px"><div class="day">{name}</div><div class="icons">{h}</div></div>'
    # ring geometry in body coords
    day_x0, day_x1 = CL + 28, CL + 140
    rows_y0, rows_y1 = CT + RT - 6, CT + RT + 5 * RH + 4
    icon_x0 = CL + 40 + 150
    tue_y0 = CT + RT + RH + (RH - 84) / 2
    half_x0 = icon_x0 + 4 * 68
    key_y0, key_y1 = CT + KT + 4, CT + KT + 74
    rings = [
        (rr(CL - 8, CT - 8, CW + 16, 96, 36), 'var(--blue)', (400, 82), (CL - 8, CT + 40)),
        (rr(day_x0, rows_y0, day_x1 - day_x0, rows_y1 - rows_y0, 18), 'var(--violet)', (400, 370), (day_x0, (rows_y0 + rows_y1) / 2)),
        (rr(CL + 28, key_y0 - 6, 290, key_y1 - key_y0 + 12, 18), 'var(--mint)', (1260, 632), (CL + 318, (key_y0 + key_y1) / 2)),
        (rr(half_x0 - 10, tue_y0 - 10, 76, 104, 16), 'var(--coral)', (1260, 262), (half_x0 + 66, tue_y0 + 42)),
    ]
    ov = ''
    for i, (d, colr, (lx, ly), (tx, ty)) in enumerate(rings):
        ov += (f'<g class="g{i+1}"><path d="{d}" pathLength="1" class="draw" style="fill:none;stroke:{colr};stroke-width:4"/>'
               f'<path d="M{lx} {f(ly)} L{f(tx)} {f(ty)}" pathLength="1" class="draw" style="--d:700;fill:none;stroke:{colr};stroke-width:4;stroke-linecap:round"/>'
               f'<circle cx="{f(tx)}" cy="{f(ty)}" r="8" class="pop" style="--d:600;fill:{colr}"/></g>')
    labels = [
        (0, 7, 400, 'var(--blue)', 'Title', 'What the pictogram shows.'),
        (0, 295, 400, 'var(--violet)', 'Labels', 'One row per day.'),
        (1260, 557, 400, 'var(--mint)', 'Key', '1 cup = 10 cups.'),
        (1260, 187, 400, 'var(--coral)', 'Half icon', 'Half a cup = 5 cups.'),
    ]
    lb = ''
    for i, (x, y, w, colr, h3, p) in enumerate(labels):
        lb += (f'<div class="lb g{i+1}" style="left:{x}px;top:{y}px;width:{w}px;height:150px;--d:900">'
               f'<i style="background:{colr}">{i+1}</i><div><h3>{h3}</h3><p>{p}</p></div></div>')
    CSS.append(f"""
#l3a-picto .pc{{position:absolute;left:{CL}px;top:{CT}px;width:{CW}px;height:{CHh}px;padding:0}}
#l3a-picto .rows{{position:absolute;left:40px;right:40px;top:{RT}px}}
#l3a-picto .prow:last-child{{border-bottom:0}}
#l3a-picto .kr{{position:absolute;left:40px;top:{KT}px;height:80px;display:flex;align-items:center;gap:16px;font:700 30px Inter}}
""")
    return f"""
<section class="slide" id="l3a-picto" data-steps="4">
 <i class="mesh m3"></i>
 <div class="kicker in">Lesson 3 · Pictograms</div>
 <h2 class="in" style="--d:120">The parts of a <em>pictogram</em></h2>
 <div style="position:relative;height:740px">
  <div class="card pc in" style="--d:200">
   <div class="hd">Bubble tea sold at the canteen this week</div>
   <div class="rows">{rows}</div>
   <div class="kr"><svg class="cup" viewBox="0 0 64 96" style="width:40px;height:60px"><use href="#cup"/></svg>= 10 cups</div>
  </div>
  <svg viewBox="0 0 1660 740" style="position:absolute;left:0;top:0;width:1660px;height:740px;overflow:visible;pointer-events:none" aria-hidden="true">{ov}</svg>
  {lb}
 </div>
 <aside class="notes">A <b>pictogram</b> uses pictures to show data. Beat 1: the <b>title</b> tells us what it shows. Beat 2: the <b>labels</b>: one row for each day. Beat 3: the <b>key</b>: one cup stands for 10 cups. Every icon is the same size and lined up, so rows are easy to compare. Beat 4: a <b>half icon</b> means half of 10 = 5 cups. Read each row: Mon 3 × 10 = 30 · Tue 4½ × 10 = 45 · Wed 4 × 10 = 40 · Thu 2½ × 10 = 25 · Fri 6 × 10 = 60. Total 30 + 45 + 40 + 25 + 60 = 200 cups (20 icons × 10 = 200 ✓). Ask: "Why not draw 200 little cups?" (too many; the key makes it short).</aside>
</section>"""


# ======================================================================== 6 bar chart parts
def s_bar():
    data = [('School van', 12), ('Car', 9), ('BTS', 7), ('Motorbike', 5), ('Walk', 3)]
    assert sum(v for _, v in data) == 36
    W, H = 990, 680
    X0, X1, Y0, U = 140, 960, 568, 32
    bw = 100
    gap = (X1 - X0 - 5 * bw) / 5
    assert gap == 64
    xs = [X0 + gap / 2 + i * (bw + gap) for i in range(5)]
    s = []
    for t in range(2, 15, 2):
        s.append(f'<line x1="{X0}" y1="{Y0-U*t}" x2="{X1}" y2="{Y0-U*t}" class="grid"/>')
    for i, (n, v) in enumerate(data):
        s.append(f'<rect x="{f(xs[i])}" y="{Y0-U*v}" width="{bw}" height="{U*v}" rx="8" class="grow f-blue" style="--n:{i}"/>')
    s.append(f'<line x1="{X0}" y1="{Y0}" x2="{X1}" y2="{Y0}" class="axis"/><line x1="{X0}" y1="{Y0-U*14-12}" x2="{X0}" y2="{Y0}" class="axis"/>')
    for t in range(0, 15, 2):
        s.append(f'<text x="{X0-16}" y="{Y0-U*t+8}" text-anchor="end" class="tick">{t}</text>')
    for i, (n, v) in enumerate(data):
        s.append(f'<text x="{f(xs[i]+bw/2)}" y="{Y0+40}" text-anchor="middle" class="lab">{n}</text>')
    s.append(f'<text x="{X0}" y="38" class="ttl" style="font-size:30px">How students in 1/2 get to school</text>')
    s.append(f'<text x="{(X0+X1)//2}" y="{Y0+92}" text-anchor="middle" class="lab" style="font-weight:700">Way to school</text>')
    s.append(f'<text transform="translate(36 {Y0-U*7}) rotate(-90)" text-anchor="middle" class="lab" style="font-weight:700">Number of students</text>')
    # annotations
    a = []
    # beat 1: title + axis labels (violet)
    a.append('<g class="g1">'
             f'<path d="{rr(X0-14, 4, 540, 50, 14)}" pathLength="1" class="draw" style="fill:none;stroke:var(--violet);stroke-width:4"/>'
             f'<path d="{rr(10, Y0-U*7-130, 36, 260, 14)}" pathLength="1" class="draw" style="--n:1;fill:none;stroke:var(--violet);stroke-width:4"/>'
             f'<path d="{rr((X0+X1)/2-110, Y0+62, 220, 44, 14)}" pathLength="1" class="draw" style="--n:2;fill:none;stroke:var(--violet);stroke-width:4"/></g>')
    # beat 2: scale (coral)
    a.append('<g class="g2">'
             f'<path d="{rr(X0-60, Y0-U*14-20, 52, U*14+40, 16)}" pathLength="1" class="draw" style="fill:none;stroke:var(--coral);stroke-width:4"/>')
    for t in range(0, 14, 2):
        ya, yb = Y0 - U * t, Y0 - U * (t + 2)
        a.append(f'<path d="M{X0+10} {ya-3} Q{X0+24} {(ya+yb)/2} {X0+10} {yb+3}" pathLength="1" class="draw" style="--n:{t//2};fill:none;stroke:var(--coral);stroke-width:3.5;stroke-linecap:round"/>')
    a.append('</g>')
    # beat 3: equal width markers (mint) above bars
    a.append('<g class="g3">')
    for i, (n, v) in enumerate(data):
        y = Y0 - U * v - 20
        x0, x1 = xs[i], xs[i] + bw
        a.append(f'<path d="M{f(x0)} {y-9} V{y+9} M{f(x0)} {y} H{f(x1)} M{f(x1)} {y-9} V{y+9}" pathLength="1" class="draw" style="--n:{i};fill:none;stroke:var(--okc);stroke-width:4;stroke-linecap:round"/>')
    a.append('</g>')
    # beat 4: equal gaps (sun/ink) just above the base line
    a.append('<g class="g4">')
    for i in range(4):
        x0, x1 = xs[i] + bw, xs[i + 1]
        y = Y0 - 24
        a.append(f'<path d="M{f(x0+6)} {y} H{f(x1-6)} M{f(x0+16)} {y-9} L{f(x0+6)} {y} L{f(x0+16)} {y+9} M{f(x1-16)} {y-9} L{f(x1-6)} {y} L{f(x1-16)} {y+9}" pathLength="1" class="draw" style="--n:{i};fill:none;stroke:#B7791F;stroke-width:4;stroke-linecap:round;stroke-linejoin:round"/>')
    a.append('</g>')
    CSS.append("""
#l3a-bar .steps>li{font-size:30px}
#l3a-bar .steps>li:nth-child(1)::before{background:var(--violet)}
#l3a-bar .steps>li:nth-child(2)::before{background:var(--coral)}
#l3a-bar .steps>li:nth-child(3)::before{background:var(--mint)}
#l3a-bar .steps>li:nth-child(4)::before{background:#E0A21B}
""")
    return f"""
<section class="slide" id="l3a-bar" data-steps="4">
 <i class="mesh m2"></i>
 <div class="kicker in">Lesson 3 · Bar charts</div>
 <h2 class="in" style="--d:120">The parts of a <em>bar chart</em></h2>
 <div style="display:grid;grid-template-columns:1050px 1fr;gap:50px">
  <div class="card in" style="--d:200;padding:26px 30px;height:736px">
   <svg class="chart" viewBox="0 0 {W} {H}" style="width:{W}px;height:{H}px">{''.join(s)}{''.join(a)}</svg>
  </div>
  <div class="stack" style="gap:22px">
   <p class="body in" style="--d:300">A <b>bar chart</b> uses bars to compare groups. A good one has:</p>
   <ol class="steps">
    <li class="g1"><span>A <b>title</b> and <b>axis labels</b></span></li>
    <li class="g2"><span>A <b>scale</b> with equal steps</span></li>
    <li class="g3"><span><b>Bars</b> of the same width</span></li>
    <li class="g4"><span>Equal <b>gaps</b> between bars</span></li>
   </ol>
  </div>
 </div>
 <aside class="notes">A <b>bar chart</b> compares groups with bars. The taller the bar, the more students. Beat 1: the title and the two <b>axis labels</b> (Way to school, Number of students) say what is shown. Beat 2: the <b>scale</b> goes up in equal steps of 2: 0, 2, 4 … 14. Beat 3: every bar has the same width, so only the height matters. Beat 4: the gaps between bars are equal too. Read the chart: School van 12, Car 9, BTS 7, Motorbike 5, Walk 3. Total 12 + 9 + 7 + 5 + 3 = 36 students (12 + 9 = 21, 21 + 7 = 28, 28 + 5 = 33, 33 + 3 = 36 ✓). Ask: "How many more come by school van than by car?" (12 − 9 = 3).</aside>
</section>"""


# ======================================================================== 7 Exercise 3A divider
def s_ex():
    CSS.append("""
#l3a-ex .xn{font:800 230px/.8 Display;letter-spacing:-.06em;background:linear-gradient(160deg,var(--coral),var(--violet));-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:6px}
#l3a-ex .tiles{display:grid;grid-template-columns:repeat(5,1fr);gap:28px}
#l3a-ex .tile{display:flex;flex-direction:column;align-items:center;gap:18px;padding:30px 20px 26px;height:330px}
#l3a-ex .tile .chip{align-self:flex-start}
#l3a-ex .tile svg.art{width:250px;height:150px;display:block;overflow:visible}
#l3a-ex .tile b{font:700 28px/1.2 Display;text-align:center}
""")
    # tile drawings (all 250x150)
    t1 = ('<rect x="10" y="10" width="230" height="130" rx="14" style="fill:#fff;stroke:#D3DAE8;stroke-width:3"/>'
          '<path d="M10 24 Q10 10 24 10 H226 Q240 10 240 24 V42 H10 Z" style="fill:var(--blue)"/>'
          '<path d="M10 74 H240 M10 106 H240 M78 42 V140 M132 42 V140 M186 42 V140" style="stroke:#D3DAE8;stroke-width:3"/>'
          '<rect x="194" y="50" width="38" height="18" rx="5" class="pop" style="--n:0;--d:900;fill:none;stroke:var(--violet);stroke-width:3;stroke-dasharray:6 4"/>'
          '<rect x="194" y="82" width="38" height="18" rx="5" class="pop" style="--n:1;--d:900;fill:none;stroke:var(--violet);stroke-width:3;stroke-dasharray:6 4"/>'
          '<rect x="194" y="114" width="38" height="18" rx="5" class="pop" style="--n:2;--d:900;fill:none;stroke:var(--violet);stroke-width:3;stroke-dasharray:6 4"/>')
    bk = ''
    for r, n in enumerate([3, 2, 4]):
        for c in range(n):
            bk += f'<use href="#l3a-bk" x="{20+c*44}" y="{6+r*48}" width="32" height="43" class="pop" style="--n:{r*4+c};--d:1000"/>'
    t2 = bk
    cp = ''
    for c, h in enumerate([2, 3, 1.5]):
        pass
    cp = ''
    k = 0
    for r, n in enumerate([3, 1]):
        for c in range(n):
            cp += f'<use href="#cup" x="{14+c*52}" y="{8+r*74}" width="42" height="63" class="pop" style="--n:{k};--d:1100"/>'
            k += 1
    cp += ('<g class="pop" style="--n:5;--d:1100"><circle cx="96" cy="114" r="22" style="fill:var(--lmint);stroke:var(--mint);stroke-width:3"/>'
           '<path d="M96 104 V124 M86 114 H106" style="stroke:var(--okc);stroke-width:4;stroke-linecap:round"/></g>')
    t3 = cp
    db = '<line x1="10" y1="140" x2="240" y2="140" style="stroke:var(--ink);stroke-width:3"/>'
    for i, (a, b) in enumerate([(100, 50), (60, 90), (40, 80)]):
        x = 22 + i * 76
        db += f'<rect x="{x}" y="{140-a}" width="28" height="{a}" rx="5" class="grow f-blue" style="--n:{i*2};--d:1200"/>'
        db += f'<rect x="{x+31}" y="{140-b}" width="28" height="{b}" rx="5" class="grow f-coral" style="--n:{i*2+1};--d:1200"/>'
    t4 = db
    bb = '<line x1="10" y1="140" x2="240" y2="140" style="stroke:var(--ink);stroke-width:3"/>'
    for i, a in enumerate([70, 104, 50, 88]):
        x = 24 + i * 56
        bb += f'<rect x="{x}" y="{140-a}" width="40" height="{a}" rx="6" class="grow f-mint" style="--n:{i};--d:1300"/>'
    bb += ('<g class="pop" style="--n:5;--d:1300"><path d="M136 46 V18 M126 28 L136 18 L146 28 M136 62 V72" style="fill:none;stroke:var(--ink);stroke-width:4;stroke-linecap:round;stroke-linejoin:round"/>'
           '<rect x="123" y="82" width="26" height="8" rx="4" style="fill:var(--ink)"/></g>')
    t5 = bb
    tiles = [('1', 'Two-way table', t1), ('2', 'Read a pictogram', t2), ('3', 'Build a pictogram', t3), ('4', 'Double bar chart', t4), ('5', 'Build a bar chart', t5)]
    th = ''
    chipc = ['', 'violet', 'sun', 'coral', 'mint']
    for i, (n, name, art) in enumerate(tiles):
        th += (f'<div class="card tile in" style="--d:{420+i*110}"><span class="chip {chipc[i]}">{n}</span>'
               f'<svg class="art" viewBox="0 0 250 150" aria-hidden="true">{art}</svg><b>{name}</b></div>')
    return f"""
<section class="slide" id="l3a-ex" data-steps="0" data-lesson="3" data-title="Exercise 3A · Tables, pictograms &amp; bar charts">
 <i class="mesh m4"></i>
 <div style="display:flex;flex-direction:column;justify-content:center;height:100%;gap:56px">
  <div class="row" style="gap:48px;align-items:flex-end">
   <div class="xn in" style="--d:80">3A</div>
   <div class="stack" style="gap:16px;padding-bottom:10px">
    <div class="kicker in" style="--d:100">Exercise 3A</div>
    <h2 class="in" style="--d:180;margin:0;font-size:96px">Your turn: read and build</h2>
   </div>
  </div>
  <div class="row in" style="--d:300;gap:22px">
   <div class="badge info"><svg><use href="#pencil"/></svg>Work it out first</div>
   <div class="badge info"><svg><use href="#target"/></svg>Come to the board and show the class</div>
   <div class="badge yes"><svg><use href="#check"/></svg>Then we check</div>
  </div>
  <div class="tiles">{th}</div>
 </div>
 <aside class="notes">Exercise 3A: five tasks on tables, pictograms and bar charts. Routine for every task: students work first (in their book or on the slide), then one student comes to the board to show the answer with the tools or the pen (✎ / P key). Only then click to reveal the answer. Tasks: 1 two-way table, 2 read a pictogram, 3 build a pictogram, 4 read a double bar chart, 5 build a bar chart.</aside>
</section>"""


# ======================================================================== 8 E1 two-way table (science fair)
def s_fair():
    rows = [('1/1', 7, 9), ('1/2', 5, 8), ('1/3', 9, 6), ('1/4', 8, 12)]
    rt = [b + g for _, b, g in rows]
    bt, gt = sum(r[1] for r in rows), sum(r[2] for r in rows)
    assert rt == [16, 13, 15, 20] and bt == 29 and gt == 35 and bt + gt == sum(rt) == 64 and gt - bt == 6
    assert max(rt) == 20 and rt.index(20) == 3
    CSS.append("""
#l3a-fair .tbl{width:100%;table-layout:fixed;font-size:34px}
#l3a-fair .tbl th,#l3a-fair .tbl td{height:78px;padding:0 24px;text-align:center}
#l3a-fair .tbl th{font-size:28px}
#l3a-fair .tbl th:first-child,#l3a-fair .tbl td:first-child{text-align:left}
#l3a-fair .tbl td{font-weight:600}
#l3a-fair .tbl th.tc{background:var(--violet)}
#l3a-fair .bl{display:inline-grid;place-items:center;min-width:92px;height:50px;padding:0 10px;border-radius:14px;border:2.5px dashed #AEB8D0;font:800 32px Inter;color:var(--violet);transition:background .5s,border-color .5s}
#l3a-fair.b1 .bl{background:var(--lviolet);border-color:transparent}
#l3a-fair .c{font-size:34px;padding:14px 22px}
#l3a-fair .ans{font-size:32px;padding:18px 26px}
""")
    body = ''.join(f'<tr><td>{c}</td><td>{b}</td><td>{g}</td><td><span class="bl" data-count="{b+g}" data-at="1"></span></td></tr>' for c, b, g in rows)
    foot = (f'<tr><td>Total</td><td><span class="bl" data-count="{bt}" data-at="1"></span></td><td><span class="bl" data-count="{gt}" data-at="1"></span></td>'
            f'<td><span class="bl" data-count="{bt+gt}" data-at="1"></span></td></tr>')
    return f"""
<section class="slide" id="l3a-fair" data-steps="2">
 <i class="mesh m3"></i>
 <div class="kicker in">Exercise 3A · Two-way tables</div>
 <h2 class="in" style="--d:120">Who joined the <em>Science Fair</em>?</h2>
 <div style="display:grid;grid-template-columns:920px 1fr;gap:56px">
  <div class="card in" style="--d:200;padding:34px 40px;height:726px">
   <div style="font:700 32px Display;margin-bottom:22px">M1 students who joined the Science Fair, 2026</div>
   <table class="tbl"><thead><tr><th>Class</th><th>Boys</th><th>Girls</th><th class="tc">Total</th></tr></thead>
    <tbody>{body}</tbody><tfoot>{foot}</tfoot></table>
   <div style="margin-top:20px;font:500 26px Inter;color:var(--mute)">Source: science club sign-up sheet</div>
   <div class="badge info g1" style="margin-top:16px;--d:500"><svg><use href="#check"/></svg>Check: 16 + 13 + 15 + 20 = 64 = 29 + 35</div>
  </div>
  <div class="stack" style="gap:20px">
   <div class="kicker in" style="--d:300;color:var(--coral)">Question 1</div>
   <div class="q in" style="--d:340;margin-top:-8px">Which class sent the most students?</div>
   <div class="ch r2 ia" data-mcq>
    <div class="c in" style="--d:420"><b>A</b>1/1</div><div class="c in" style="--d:470"><b>B</b>1/2</div>
    <div class="c in" style="--d:520"><b>C</b>1/3</div><div class="c ok in" style="--d:570"><b>D</b>1/4</div>
   </div>
   <div class="kicker in" style="--d:640;color:var(--coral);margin-top:10px">Question 2</div>
   <div class="w-input ia in" style="--d:680;width:684px;height:224px" data-label="How many more girls than boys joined?" data-answer="6" data-accept="6;6 girls;6 students" data-unit="girls"></div>
   <div class="ans g2"><svg><use href="#check"/></svg><div>1. <b>1/4</b> (20 students) · 2. 35 − 29 = <b>6</b></div></div>
  </div>
 </div>
 <aside class="notes">Students fill the empty Total row and column first (in the book or with the pen on the slide), then answer. Ask one student to come to the board and show the totals. Beat 1 reveals the totals. Row totals: 1/1: 7 + 9 = 16 · 1/2: 5 + 8 = 13 · 1/3: 9 + 6 = 15 · 1/4: 8 + 12 = 20. Column totals: boys 7 + 5 + 9 + 8 = 29 · girls 9 + 8 + 6 + 12 = 35. Grand total 29 + 35 = 64 and 16 + 13 + 15 + 20 = 64 ✓. Beat 2 reveals the answers. Q1: 1/4 sent the most students (20). Q2: 35 − 29 = 6 more girls than boys. Common mistake for Q1: choosing 1/4 because of 12 girls only; it is the TOTAL that matters.</aside>
</section>"""


# ======================================================================== 9 E2 library pictogram
def s_lib():
    data = [('Mon', 60), ('Tue', 90), ('Wed', 40), ('Thu', 70), ('Fri', 100)]
    assert sum(v for _, v in data) == 360 and all(v % 10 == 0 for _, v in data)
    assert 4.5 * 20 == 90 and 100 - 40 == 60
    rows = ''
    k = 0
    for name, v in data:
        h, k = books(v / 20, 52, 70, d=450, n0=k)
        rows += f'<div class="prow" style="height:100px"><div class="day">{name}</div><div class="icons" style="gap:18px">{h}</div></div>'
    CSS.append("""
#l3a-lib .pc{padding:0;height:700px;position:relative}
#l3a-lib .rows{padding:6px 40px 0}
#l3a-lib .prow:last-child{border-bottom:0}
#l3a-lib .kr{position:absolute;left:40px;bottom:24px;display:flex;align-items:center;gap:16px;font:700 30px Inter}
#l3a-lib .ch{grid-template-columns:repeat(4,1fr);gap:14px}
#l3a-lib .c{font-size:36px;padding:16px 18px;gap:14px}
#l3a-lib .c b{width:46px;height:46px}
#l3a-lib .ans{font-size:32px;padding:18px 26px}
""")
    return f"""
<section class="slide" id="l3a-lib" data-steps="2">
 <i class="mesh m2"></i>
 <div class="kicker in">Exercise 3A · Pictograms</div>
 <h2 class="in" style="--d:120">Books borrowed from the <em>library</em></h2>
 {BOOK_SYMBOL}
 <div style="display:grid;grid-template-columns:1fr 800px;gap:60px">
  <div class="stack" style="gap:18px">
   <div class="kicker in" style="--d:300;color:var(--coral)">Question 1</div>
   <div class="q in" style="--d:340;margin-top:-6px">How many books were borrowed on Tuesday?</div>
   <div class="ch r1 ia" data-mcq>
    <div class="c in" style="--d:420"><b>A</b>4.5</div><div class="c in" style="--d:470"><b>B</b>80</div>
    <div class="c ok in" style="--d:520"><b>C</b>90</div><div class="c in" style="--d:570"><b>D</b>100</div>
   </div>
   <div class="ans g1"><svg><use href="#check"/></svg><div>4½ books × 20 = <b>90 books</b></div></div>
   <div class="kicker in" style="--d:640;color:var(--coral);margin-top:16px">Question 2</div>
   <div class="q in" style="--d:680;margin-top:-6px">How many more books on Friday than on Wednesday?</div>
   <div class="ch r2 ia" data-mcq>
    <div class="c in" style="--d:760"><b>A</b>3</div><div class="c in" style="--d:810"><b>B</b>40</div>
    <div class="c ok in" style="--d:860"><b>C</b>60</div><div class="c in" style="--d:910"><b>D</b>140</div>
   </div>
   <div class="ans g2"><svg><use href="#check"/></svg><div>100 − 40 = <b>60 books</b></div></div>
  </div>
  <div class="card pc in" style="--d:200">
   <div class="hd">Books borrowed from the school library</div>
   <div class="rows">{rows}</div>
   <div class="kr"><svg class="bk" viewBox="0 0 48 64" style="width:40px;height:54px"><use href="#l3a-bk"/></svg>= 20 books</div>
  </div>
 </div>
 <aside class="notes">Key: 1 book = 20 books, so half a book = 10 books. Let students tap a choice (or come to the board) before you reveal. Beat 1: Q1 Tuesday has 4½ icons: 4 × 20 = 80, plus half of 20 = 10, so 90 books (C). Wrong answers: 4.5 counts icons but forgets the key; 80 forgets the half icon; 100 counts the half as a whole. Beat 2: Q2 Friday 5 × 20 = 100, Wednesday 2 × 20 = 40, so 100 − 40 = 60 more books (C). Wrong answers: 3 is the difference in icons, not books; 140 adds instead of subtracts. Whole week: Mon 60 + Tue 90 + Wed 40 + Thu 70 + Fri 100 = 360 books (18 icons × 20 = 360 ✓).</aside>
</section>"""


# ======================================================================== 10 E3 build a pictogram
def s_make():
    data = [('1/1', 12), ('1/2', 18), ('1/3', 8), ('1/4', 20)]
    icons = [v / 4 for _, v in data]
    assert icons == [3, 4.5, 2, 5] and sum(v for _, v in data) == 58 and sum(icons) * 4 == 58
    start = [2, 5, 3, 3.5]
    assert all(s != a for s, a in zip(start, icons))
    CSS.append("""
#l3a-make .tbl{width:100%;table-layout:fixed;font-size:30px}
#l3a-make .tbl th,#l3a-make .tbl td{height:64px;padding:0 22px}
#l3a-make .tbl th.tc{background:var(--violet)}
#l3a-make .bl{display:inline-grid;place-items:center;min-width:84px;height:46px;padding:0 10px;border-radius:12px;border:2.5px dashed #AEB8D0;font:800 30px Inter;color:var(--violet);transition:background .5s,border-color .5s}
#l3a-make.b1 .bl{background:var(--lviolet);border-color:transparent}
#l3a-make .kn{display:flex;align-items:center;gap:16px;font:600 30px/1.35 Inter}
""")
    trs = ''.join(f'<tr><td>{c}</td><td class="n">{v}</td><td class="n"><span class="bl" data-count="{v/4:g}" data-at="1"></span></td></tr>' for c, v in data)
    return f"""
<section class="slide" id="l3a-make" data-steps="1">
 <i class="mesh m4"></i>
 <div class="kicker in">Exercise 3A · Build a pictogram</div>
 <h2 class="in" style="--d:120">Fix the <em>pictogram</em></h2>
 <div style="display:grid;grid-template-columns:1fr 560px;gap:50px">
  <div class="w-picto ia in" style="--d:250;width:1050px;height:720px" data-title="Iced cocoa sold at the school fair" data-labels="1/1,1/2,1/3,1/4" data-answer="3,4.5,2,5" data-start="{','.join(f'{s:g}' for s in start)}" data-key="4" data-icon="cup" data-unit="cups"></div>
  <div class="stack" style="gap:22px">
   <div class="card in" style="--d:300;padding:28px 32px">
    <div class="kicker" style="color:var(--coral)">Data</div><div style="font:700 30px/1.25 Display;margin:6px 0 16px">Cups sold at each class stall</div>
    <table class="tbl"><thead><tr><th>Stall</th><th class="n">Cups</th><th class="n tc">Icons</th></tr></thead><tbody>{trs}</tbody></table>
   </div>
   <div class="note in" style="--d:420"><div class="nt">Key</div><div class="kn"><svg class="cup" viewBox="0 0 64 96" style="width:40px;height:60px"><use href="#cup"/></svg><span><b>= 4 cups</b></span></div><div style="margin-top:6px">So half a cup = 2 cups.</div></div>
   <div class="ans g1"><svg><use href="#check"/></svg><div>Icons = cups ÷ 4. So 18 ÷ 4 = <b>4½</b></div></div>
  </div>
 </div>
 <aside class="notes">The pictogram starts WRONG on purpose (2, 5, 3, 3½ cups). Students tap to add or remove cups until each row matches the table, then press Check. Ask a student to fix it at the board and explain each row. Beat 1 reveals the Icons column: 1/1: 12 ÷ 4 = 3 · 1/2: 18 ÷ 4 = 4½ (4 whole cups and a half cup, because half a cup = 2 cups) · 1/3: 8 ÷ 4 = 2 · 1/4: 20 ÷ 4 = 5. Check: 3 + 4½ + 2 + 5 = 14½ icons; 14½ × 4 = 58 cups = 12 + 18 + 8 + 20 ✓.</aside>
</section>"""


# ======================================================================== 11 E4 double bar chart
def s_sport():
    data = [('Football', 16, 7), ('Badminton', 9, 13), ('Volleyball', 5, 12), ('Sepak takraw', 10, 4)]
    bt, gt = sum(d[1] for d in data), sum(d[2] for d in data)
    assert bt == 40 and gt == 36 and 13 == data[1][2] and 16 - 7 == 9 and 5 + 12 == 17
    W, H = 894, 676
    X0, X1, Y0, MAXV = 112, 884, 566, 20
    U = 448 / MAXV
    gw = (X1 - X0) / 4
    bw, inner = 70, 6
    off = (gw - 2 * bw - inner) / 2
    s = []
    for t in range(1, MAXV + 1):
        st = '' if t % 2 == 0 else ' style="stroke:#EEF1F7"'
        s.append(f'<line x1="{X0}" y1="{f(Y0-U*t)}" x2="{X1}" y2="{f(Y0-U*t)}" class="grid"{st}/>')
    pos = {}
    for i, (n, b, g) in enumerate(data):
        xb = X0 + i * gw + off
        xg = xb + bw + inner
        pos[n] = (xb, xg, X0 + i * gw + gw / 2)
        s.append(f'<rect x="{f(xb)}" y="{f(Y0-U*b)}" width="{bw}" height="{f(U*b)}" rx="7" class="grow f-blue" style="--n:{2*i}"/>')
        s.append(f'<rect x="{f(xg)}" y="{f(Y0-U*g)}" width="{bw}" height="{f(U*g)}" rx="7" class="grow f-coral" style="--n:{2*i+1}"/>')
        s.append(f'<text x="{f(X0+i*gw+gw/2)}" y="{Y0+40}" text-anchor="middle" class="lab">{n}</text>')
    s.append(f'<line x1="{X0}" y1="{Y0}" x2="{X1}" y2="{Y0}" class="axis"/><line x1="{X0}" y1="{f(Y0-U*MAXV-10)}" x2="{X0}" y2="{Y0}" class="axis"/>')
    for t in range(0, MAXV + 1, 2):
        s.append(f'<text x="{X0-14}" y="{f(Y0-U*t+8)}" text-anchor="end" class="tick">{t}</text>')
    s.append(f'<text x="{X0-80}" y="34" class="ttl" style="font-size:30px">Favourite sport of M1 students</text>')
    s.append(f'<rect x="{X1-214}" y="14" width="24" height="24" rx="6" class="f-blue"/><text x="{X1-180}" y="35" class="lab">Boys</text>'
             f'<rect x="{X1-96}" y="14" width="24" height="24" rx="6" class="f-coral"/><text x="{X1-62}" y="35" class="lab">Girls</text>')
    s.append(f'<text x="{f((X0+X1)/2)}" y="{Y0+90}" text-anchor="middle" class="lab" style="font-weight:700">Sport</text>')
    s.append(f'<text transform="translate(30 {f(Y0-U*MAXV/2)}) rotate(-90)" text-anchor="middle" class="lab" style="font-weight:700">Number of students</text>')

    def line(x, v, colr, n):
        y = Y0 - U * v
        return f'<path d="M{f(x)} {f(y)} H{X0}" pathLength="1" class="draw" style="--n:{n};fill:none;stroke:{colr};stroke-width:3.5;stroke-linecap:round"/>'

    def read(x, v, colr, n):
        y = Y0 - U * v
        return (f'<circle cx="{X0}" cy="{f(y)}" r="7" class="pop" style="--n:{n};--d:700;fill:{colr}"/>'
                f'<text x="{f(x+bw/2)}" y="{f(y-12)}" text-anchor="middle" class="val pop" style="--n:{n};--d:600;font-size:28px">{v}</text>')

    def pill(cx, txt, num, w):
        y = 112
        return (f'<g class="pop" style="--d:1000"><rect x="{f(cx-w/2)}" y="{y}" width="{w}" height="46" rx="23" class="f-ink"/>'
                f'<circle cx="{f(cx-w/2+23)}" cy="{y+23}" r="15" class="f-mint"/>'
                f'<text x="{f(cx-w/2+23)}" y="{y+31}" text-anchor="middle" style="fill:#fff;font:800 22px Inter">{num}</text>'
                f'<text x="{f(cx-w/2+46)}" y="{y+32}" style="fill:#fff;font:700 24px Inter">{txt}</text></g>')
    fb, fg, fc = pos['Football']
    bb, bg, bc = pos['Badminton']
    vb, vg, vc = pos['Volleyball']
    lines = (f'<g class="g1">{line(bg, 13, "var(--coral)", 0)}</g>'
             f'<g class="g2">{line(fb, 16, "var(--blue)", 0)}{line(fg, 7, "var(--coral)", 1)}</g>'
             f'<g class="g3">{line(vb, 5, "var(--blue)", 0)}{line(vg, 12, "var(--coral)", 1)}</g>')
    s.insert(MAXV, lines)
    a = (f'<g class="g1">{read(bg, 13, "var(--coral)", 0)}{pill(bc, "13 girls", 1, 160)}</g>'
         f'<g class="g2">{read(fb, 16, "var(--blue)", 0)}{read(fg, 7, "var(--coral)", 1)}{pill(fc+6, "16 − 7 = 9", 2, 182)}</g>'
         f'<g class="g3">{read(vb, 5, "var(--blue)", 0)}{read(vg, 12, "var(--coral)", 1)}{pill(vc, "5 + 12 = 17", 3, 190)}</g>')
    qs = [
        ('1. How many girls chose badminton?', '13', '13;13 girls;13 students', 'girls'),
        ('2. Football: how many more boys than girls?', '9', '9;9 boys;9 students;9 more', 'boys'),
        ('3. How many students chose volleyball?', '17', '17;17 students', 'students'),
    ]
    qh = ''
    for i, (lab, ans, acc, unit) in enumerate(qs):
        qh += f'<div class="w-input ia in" style="--d:{350+i*120};width:660px;height:224px" data-label="{lab}" data-answer="{ans}" data-accept="{acc}" data-unit="{unit}"></div>'
    return f"""
<section class="slide" id="l3a-sport" data-steps="3">
 <i class="mesh m3"></i>
 <div class="kicker in">Exercise 3A · Double bar charts</div>
 <h2 class="in" style="--d:120">Read a <em>double</em> bar chart</h2>
 <div style="display:grid;grid-template-columns:660px 1fr;gap:46px">
  <div class="stack" style="gap:22px">{qh}</div>
  <div class="card in" style="--d:200;padding:30px 30px;height:736px">
   <svg class="chart" viewBox="0 0 {W} {H}" style="width:{W}px;height:{H}px">{''.join(s)}{a}</svg>
  </div>
 </div>
 <aside class="notes">A <b>double bar chart</b> shows two groups side by side. The <b>legend</b> tells us blue = boys and coral = girls. Students type each answer (or come to the board and point with the pen), then click: each answer appears ON the chart, with a line to the scale. Beat 1: girls who chose badminton = 13 (the coral bar stops halfway between 12 and 14). Beat 2: football boys 16, girls 7, so 16 − 7 = 9 more boys. Beat 3: volleyball boys 5 + girls 12 = 17 students. Whole chart: boys 16 + 9 + 5 + 10 = 40, girls 7 + 13 + 12 + 4 = 36, total 76 students. Extra question: "Which sport do the girls like most?" (badminton, 13).</aside>
</section>"""


# ======================================================================== 12 E5 build a bar chart
def s_build():
    data = [15, 25, 20, 35, 30]
    start = [20, 15, 30, 25, 35]
    assert sum(data) == 125 and all(a != b for a, b in zip(data, start)) and max(data) <= 40
    CSS.append("""
#l3a-build .hz{border-collapse:separate;border-spacing:0;font:600 30px Inter;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 0 0 2px #E6EAF3}
#l3a-build .hz th,#l3a-build .hz td{width:150px;height:56px;text-align:center;border-left:1.5px solid #E6EAF3}
#l3a-build .hz th{background:var(--blue);color:#fff;font:700 26px Inter}
#l3a-build .hz th:first-child,#l3a-build .hz td:first-child{width:170px;text-align:left;padding-left:22px;border-left:0}
#l3a-build .hz td:last-child{background:var(--lblue);font-weight:800}
#l3a-build .hz th:last-child{background:var(--violet)}
#l3a-build .ans{font-size:30px;line-height:1.4;align-items:flex-start}
""")
    ths = ''.join(f'<th>{i+1}</th>' for i in range(5))
    tds = ''.join(f'<td>{v}</td>' for v in data)
    return f"""
<section class="slide" id="l3a-build" data-steps="1">
 <i class="mesh m4"></i>
 <div class="kicker in">Exercise 3A · Build a bar chart</div>
 <h2 class="in" style="--d:120">Fix the <em>bar chart</em></h2>
 <div class="stack" style="gap:26px">
  <div class="card in" style="--d:200;display:flex;align-items:center;gap:40px;padding:22px 34px;height:156px">
   <div style="width:440px"><div class="kicker" style="color:var(--coral)">Data</div><div style="font:700 30px/1.25 Display;margin-top:6px">Plastic bottles collected by 1/2</div></div>
   <table class="hz"><tr><th>Week</th>{ths}<th>Total</th></tr><tr><td>Bottles</td>{tds}<td>{sum(data)}</td></tr></table>
  </div>
  <div style="display:grid;grid-template-columns:1000px 1fr;gap:44px">
   <div class="w-bars ia in" style="--d:320;width:1000px;height:560px" data-title="Plastic bottles collected by 1/2" data-labels="Week 1,Week 2,Week 3,Week 4,Week 5" data-max="40" data-step="5" data-answer="{','.join(map(str, data))}" data-start="{','.join(map(str, start))}" data-ylabel="Bottles"></div>
   <div class="stack" style="gap:22px">
    <div class="w-write ia in" style="--d:420;width:616px;height:330px" data-label="What does your chart tell us?" data-lines="4"></div>
    <div class="ans g1"><svg><use href="#check"/></svg><div>For example: the class collected more bottles over the weeks. Week 4 was the most (<b>35</b>) and week 1 the fewest (<b>15</b>).</div></div>
   </div>
  </div>
 </div>
 <aside class="notes">The bars start at the wrong heights on purpose (20, 15, 30, 25, 35). Students drag each bar up or down to match the table, then press Check. Ask one student to fix the chart at the board and say which bars went up and which went down: Week 1 down 20 → 15, Week 2 up 15 → 25, Week 3 down 30 → 20, Week 4 up 25 → 35, Week 5 down 35 → 30. Then everyone writes one or two sentences: "What does your chart tell us?" Beat 1 shows a sample answer. Total: 15 + 25 + 20 + 35 + 30 = 125 bottles (15 + 25 = 40, 40 + 20 = 60, 60 + 35 = 95, 95 + 30 = 125 ✓). Good answers mention the highest (week 4, 35), the lowest (week 1, 15) and the overall trend (mostly going up).</aside>
</section>"""


SLIDES = [s_open(), s_why(), s_parts(), s_two(), s_picto(), s_bar(), s_ex(), s_fair(), s_lib(), s_make(), s_sport(), s_build()]
head = '<!-- 30 · Lesson 3 part 1: tables, pictograms, bar charts + Exercise 3A (prefix l3a-). Generated; numbers checked by assertions. -->\n'
css = '<style>' + '\n'.join(c.strip() for c in CSS) + '\n</style>\n'
OUT.write_text(css + head + '\n'.join(s.strip() for s in SLIDES) + '\n', encoding='utf-8')
print('wrote', OUT, len(SLIDES), 'slides')
