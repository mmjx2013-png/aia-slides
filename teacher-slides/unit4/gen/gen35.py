#!/usr/bin/env python3
"""Generates parts/35-lesson3b.html (Lesson 3 part 2: line graphs & pie charts + Exercise 3B)."""
import math
from pathlib import Path

OUT = Path('/home/user/aia-slides/teacher-slides/unit4/parts/35-lesson3b.html')


def f(x):
    s = f'{x:.1f}'
    return s[:-2] if s.endswith('.0') else s


def polar(cx, cy, rho, th):
    t = math.radians(th)
    return cx + rho * math.sin(t), cy - rho * math.cos(t)


def seg(cx, cy, r, a0, sweep, color, d, n=0, cls='pc'):
    """pie slice as a fat stroked circle (inside a rotate(-90) group): start a0 deg, sweep deg, clockwise from 12."""
    C = 2 * math.pi * r
    L = C * sweep / 360
    off = -C * a0 / 360
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" class="{cls} segd s-{color}" '
            f'style="--len:{L:.2f};--C:{C:.2f};stroke-dashoffset:{off:.2f};--d:{d};--n:{n}"/>')


def spoke(cx, cy, R, th, d, w=5, cls='draw'):
    x, y = polar(cx, cy, R, th)
    return f'<path d="M{f(cx)} {f(cy)} L{f(x)} {f(y)}" pathLength="1" class="{cls}" style="stroke:#fff;stroke-width:{w};--d:{d}"/>'


# ---------- mini chart icons (64x52) ----------
ICON = {
    'table': '<rect x="6" y="6" width="52" height="40" rx="6" style="fill:#fff;stroke:var(--blue);stroke-width:3.5"/><path d="M6 19H58M6 32H58M26 6V46" style="stroke:var(--blue);stroke-width:3"/>',
    'picto': '<g style="fill:var(--coral)"><circle cx="12" cy="13" r="6"/><circle cx="28" cy="13" r="6"/><circle cx="44" cy="13" r="6"/><circle cx="12" cy="29" r="6"/><circle cx="28" cy="29" r="6"/><circle cx="12" cy="45" r="6"/><circle cx="28" cy="45" r="6"/><circle cx="44" cy="45" r="6"/><circle cx="60" cy="45" r="6"/></g>',
    'bar': '<path d="M4 49H60" style="stroke:var(--ink);stroke-width:3;stroke-linecap:round"/><rect x="9" y="24" width="12" height="24" rx="3" style="fill:var(--mint)"/><rect x="26" y="8" width="12" height="40" rx="3" style="fill:var(--mint)"/><rect x="43" y="30" width="12" height="18" rx="3" style="fill:var(--mint)"/>',
    'line': '<path d="M4 49H60M4 4V49" style="stroke:var(--ink);stroke-width:3;stroke-linecap:round"/><path d="M10 38L23 26L36 31L54 10" style="fill:none;stroke:var(--violet);stroke-width:4;stroke-linejoin:round;stroke-linecap:round"/><g style="fill:#fff;stroke:var(--violet);stroke-width:3"><circle cx="10" cy="38" r="4"/><circle cx="23" cy="26" r="4"/><circle cx="36" cy="31" r="4"/><circle cx="54" cy="10" r="4"/></g>',
    'pie': '<circle cx="32" cy="26" r="22" style="fill:var(--sun)"/><path d="M32 26V4A22 22 0 0 1 52.9 32.8Z" style="fill:var(--blue)"/><path d="M32 26L52.9 32.8A22 22 0 0 1 18 43Z" style="fill:var(--coral)"/>',
    'pct': '<circle cx="32" cy="26" r="23" style="fill:var(--lcoral)"/><text x="32" y="36" text-anchor="middle" style="font:800 30px Inter;fill:var(--coral)">%</text>',
}


def icon(name, w=64, h=52, extra=''):
    return f'<svg viewBox="0 0 64 52" width="{w}" height="{h}" aria-hidden="true" {extra}>{ICON[name]}</svg>'


STYLE = '''<style>
#l3b-intro .kinds{display:flex;flex-direction:column;gap:16px;margin-top:42px}
#l3b-intro .kind{display:flex;align-items:center;gap:18px;width:max-content;padding:12px 28px 12px 14px;border-radius:22px;background:#fff;box-shadow:0 10px 26px rgba(15,27,51,.07);font:500 28px Inter;color:var(--mute)}
#l3b-intro .kind b{font:700 30px Display;color:var(--ink);margin-right:2px}
#l3b-intro .kind svg{flex:none;width:64px;height:52px;padding:6px 4px;border-radius:14px;background:var(--lblue);box-sizing:content-box}
#l3b-intro .mp{fill:none;stroke-width:80px}
#l3b-intro .rays{transform-box:fill-box;transform-origin:center}
#l3b-intro.on .rays{animation:spin 2.8s cubic-bezier(.25,.6,.2,1) both .5s}
#l3b-intro.on .hc,#l3b-intro.on .ln{animation-duration:2.2s;animation-timing-function:linear}
#l3b-intro .rd,#l3b-double .rd{fill:none;stroke:var(--violet);stroke-width:3;stroke-dasharray:9 8}
#l3b-parts .pl{list-style:none;display:flex;flex-direction:column;gap:12px}
#l3b-parts .pl li{display:flex;align-items:center;gap:16px;height:68px;padding:0 20px 0 12px;border-radius:18px;background:rgba(255,255,255,.5);border:2.5px dashed #C9D2E3;font:500 28px Inter;color:var(--mute);transition:background .5s,border-color .5s,box-shadow .5s}
#l3b-parts.b1 .pl li.s1,#l3b-parts.b2 .pl li.s2{background:#fff;border-color:transparent;box-shadow:0 8px 22px rgba(15,27,51,.07)}
#l3b-parts.b1 .pl li.s1 .nb,#l3b-parts.b2 .pl li.s2 .nb{background:var(--ink)}
#l3b-parts .pl li b{color:var(--ink);font-weight:700}
#l3b-parts .pl .nb{flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--mute);color:#fff;font:800 24px Inter;transition:background .5s}
#l3b-parts .tr{display:flex;align-items:center;gap:14px;font:600 28px Inter}
#l3b-parts .tr svg{width:54px;height:40px;flex:none}
#l3b-parts .mk circle{fill:var(--ink)}
#l3b-parts .mk text{fill:#fff;font:800 24px Inter}
#l3b-parts .tl,#l3b-double .tl{font:700 24px Inter;stroke:#fff;stroke-width:7px;paint-order:stroke;stroke-linejoin:round}
#l3b-double .qc{padding:26px 28px}
#l3b-double .qc .q{font:600 28px/1.32 Inter;display:flex;gap:14px;align-items:flex-start}
#l3b-double .qn,#l3b-drinks .qn,#l3b-volley .qn{flex:none;width:44px;height:44px;border-radius:13px;display:grid;place-items:center;background:var(--blue);color:#fff;font:800 24px Inter}
#l3b-double .ch{grid-template-columns:repeat(6,1fr);gap:10px;margin-top:14px}
#l3b-double .c{justify-content:center;padding:12px 0;font:700 28px Display;border-radius:16px}
#l3b-double .sum{display:flex;align-items:center;gap:14px;margin-top:14px;padding:14px 22px;border-radius:18px;background:var(--ink);color:#fff;font:600 28px Inter}
#l3b-double .sum b{color:var(--sun)}
#l3b-double .sum svg{width:36px;height:36px;color:var(--mint);flex:none}
#l3b-double .lg{font:600 24px Inter;fill:var(--ink)}
#l3b-whole .pc{fill:none;stroke-width:280px}
#l3b-whole .pv{fill:#fff;font:800 44px Display;text-anchor:middle}
#l3b-whole .dg{fill:#fff;font:600 28px Inter;text-anchor:middle}
#l3b-whole .tok{font:800 128px/1 Display;letter-spacing:-.04em}
#l3b-whole .fr{display:flex;align-items:center;gap:22px;padding:20px 26px}
#l3b-whole .fr svg{width:84px;height:84px;flex:none}
#l3b-whole .fr .fk{font:700 26px Inter;color:var(--mute)}
#l3b-whole .fr .v{font:800 46px/1.1 Display;letter-spacing:-.02em}
#l3b-whole .vv{display:grid}
#l3b-whole .vv>span{grid-area:1/1}
#l3b-whole .qm{color:var(--mute)}
#l3b-drinks .pc{fill:none;stroke-width:210px}
#l3b-drinks .pv{font:800 38px Display;text-anchor:middle;fill:#fff}
#l3b-drinks .pn{font:700 24px Inter;text-anchor:middle;fill:#fff}
#l3b-drinks .lgd{display:grid;grid-template-columns:1fr 1fr;gap:10px 26px;margin-top:18px}
#l3b-drinks .lgd div{display:flex;align-items:center;gap:12px;font:600 28px Inter}
#l3b-drinks .lgd .sw{width:22px;height:22px;border-radius:6px;flex:none}
#l3b-drinks .lgd svg{width:34px;height:51px;flex:none}
#l3b-drinks .qc{padding:24px 30px}
#l3b-drinks .qc .q{font:600 30px/1.3 Inter;display:flex;gap:14px;align-items:center}
#l3b-drinks .aa{position:absolute;right:30px;bottom:30px;width:370px;justify-content:center;font-size:30px;padding:18px 20px}
#l3b-make .pc{fill:none;stroke-width:266px}
#l3b-make .pn{font:700 26px Inter;text-anchor:middle;fill:#fff}
#l3b-make .pv{font:800 34px Display;text-anchor:middle;fill:#fff}
#l3b-make .tbl td,#l3b-make .tbl th{padding:16px 20px}
#l3b-make .tbl .w{font-weight:600;color:var(--blue)}
#l3b-make .tbl .w b{color:var(--ink)}
#l3b-make .stp{display:grid;height:96px}
#l3b-make .stp>div{grid-area:1/1;display:flex;align-items:center;gap:16px;padding:0 24px;border-radius:22px;background:var(--ink);color:#fff;font:600 28px Inter}
#l3b-make .stp>div.first{background:#fff;color:var(--ink);box-shadow:0 10px 26px rgba(15,27,51,.08)}
#l3b-make .stp .sn{flex:none;padding:8px 14px;border-radius:12px;background:var(--sun);color:var(--ink);font:800 22px Inter;letter-spacing:.06em;text-transform:uppercase}
#l3b-make .stp b{color:var(--sun)}
#l3b-make .stp .ic{display:flex;align-items:center;gap:16px}
#l3b-make.on.b4 .l3b-h4{animation:out .35s ease both}
#l3b-make .pro{fill:rgba(255,255,255,.55);stroke:var(--ink);stroke-width:3}
#l3b-make .pt{stroke:var(--ink);stroke-width:2}
#l3b-ex .goals li svg{width:64px;height:52px;padding:6px 4px;border-radius:14px;background:#fff;box-shadow:0 8px 20px rgba(15,27,51,.08);box-sizing:content-box}
#l3b-ex .goals li{font:500 32px Inter}
#l3b-bean .ch{gap:14px}
#l3b-bean .c{font:700 30px Display;padding:16px 20px}
#l3b-bean .tbl{font:600 28px Inter}
#l3b-bean .tbl th,#l3b-bean .tbl td{padding:12px 0;text-align:center;width:66px}
#l3b-bean .tbl th:first-child,#l3b-bean .tbl td:first-child{text-align:left;padding-left:20px;width:auto}
#l3b-bean .ans{font-size:28px;padding:18px 22px}
#l3b-build .dot{display:inline-block;width:18px;height:18px;border-radius:6px;margin-right:12px;flex:none}
#l3b-build .ar{display:flex;align-items:center;font:600 28px Inter;padding:9px 0;border-bottom:1.5px solid #EEF1F7}
#l3b-build .ar:last-child{border-bottom:0}
#l3b-build .ar b{margin-left:auto;font-weight:800;color:var(--okc)}
#l3b-build .idea span{font-size:28px}
#l3b-which .kc{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:22px}
#l3b-which .kc svg{flex:none}
#l3b-which .kc .nm{font:700 28px Display}
#l3b-which .kc .rl{font:600 24px Inter;color:var(--okc);margin-top:2px}
#l3b-volley .tbl td{padding:10px 20px;transition:background .5s}
#l3b-volley .tbl th{padding:14px 20px}
#l3b-volley .ppl{display:flex;gap:7px;align-items:flex-end;height:46px}
#l3b-volley .ppl svg{width:30px;height:42px;flex:none}
#l3b-volley .ppl use{transition:opacity .6s}
#l3b-volley.b1 .fade .ppl use{opacity:.18}
#l3b-volley.b1 tr.vb td{background:var(--lcoral)}
#l3b-volley .ch{grid-template-columns:1fr 1fr;gap:14px}
#l3b-volley .c{font:700 36px Display;padding:14px 22px}
#l3b-volley .qc .q{font:600 30px/1.3 Inter;display:flex;gap:14px;align-items:flex-start}
</style>'''

S = []  # slides

# =====================================================================
# 1 · section start: Bangkok temperature, line draws itself
# =====================================================================
temps = [27, 30, 34, 35, 32, 29]
times = ['6:00', '9:00', '12:00', '15:00', '18:00', '21:00']
X = [120 + 132 * i for i in range(6)]
yT = lambda t: 400 - (t - 20) * 17.5
P = [(X[i], yT(temps[i])) for i in range(6)]
lens = [math.dist(P[i], P[i + 1]) for i in range(5)]
cum = [0]
for L in lens:
    cum.append(cum[-1] + L)
D0, DUR = 1300, 2200
tpt = [D0 + DUR * c / cum[-1] for c in cum]
line_d = 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in P)
area_d = line_d + f' V400 H{P[0][0]} Z'
grid = ''.join(f'<line x1="70" y1="{f(yT(t))}" x2="790" y2="{f(yT(t))}" class="grid"/>' for t in (25, 30, 35, 40))
ticks = ''.join(f'<text x="56" y="{f(yT(t) + 8)}" class="tick">{t}</text>' for t in (20, 25, 30, 35, 40))
pts = ''.join(f'<circle cx="{f(x)}" cy="{f(y)}" r="10" class="pop" style="fill:#fff;stroke:var(--coral);stroke-width:5;--d:{int(tpt[i] - 40)}"/>' for i, (x, y) in enumerate(P))
vals = ''.join(f'<text x="{f(x)}" y="{f(y - 24)}" class="val pop" text-anchor="middle" style="--d:{int(tpt[i] + 60)}">{temps[i]}</text>' for i, (x, y) in enumerate(P))
xl = ''.join(f'<text x="{x}" y="442" class="tick">{times[i]}</text>' for i, x in enumerate(X))
rays = ''.join(f'<line x1="{f(32 + 21 * math.cos(math.radians(a)))}" y1="{f(32 + 21 * math.sin(math.radians(a)))}" x2="{f(32 + 29 * math.cos(math.radians(a)))}" y2="{f(32 + 29 * math.sin(math.radians(a)))}"/>' for a in range(0, 360, 45))
pk = P[3]
mini_pie = (f'<g transform="rotate(-90 90 90)">' + seg(90, 90, 40, 0, 180, 'blue', 1300, 0, 'mp') + seg(90, 90, 40, 180, 90, 'coral', 1300, 1, 'mp')
            + seg(90, 90, 40, 270, 54, 'sun', 1300, 2, 'mp') + seg(90, 90, 40, 324, 36, 'mint', 1300, 3, 'mp') + '</g>')

S.append(f'''<!-- 35 · Lesson 3 part 2: line graphs & pie charts, then Exercise 3B (prefix l3b-) -->
<section class="slide" id="l3b-intro" data-steps="1" data-lesson="3b" data-title="Lesson 3 · Line graphs &amp; pie charts">
 <i class="mesh m3"></i>
 <div style="width:800px;margin-top:22px;z-index:2">
  <div class="pill in" style="--d:100">Lesson 3 · Part 2</div>
  <div class="in" style="--d:200;margin-top:52px;font:700 44px Display;color:var(--mute)">Presenting &amp; reading data</div>
  <h1 class="t in" style="--d:280;margin-top:16px;font-size:124px">Line graphs<br>&amp; <em>pie charts</em></h1>
  <p class="lede in" style="--d:420;margin-top:30px;max-width:700px">How do we show <b>change</b>? How do we show <b>parts of a whole</b>?</p>
  <div class="kinds">
   <div class="kind in" style="--d:560">{icon('line')}<b>Line graph</b>change over time</div>
   <div class="kind in" style="--d:650">{icon('pie')}<b>Pie chart</b>parts of a whole</div>
  </div>
 </div>
 <div style="position:absolute;left:930px;top:104px;width:900px;height:880px">
  <div class="card float" style="position:absolute;left:0;top:176px;width:880px;--r:-2deg;--d:400;padding:26px 30px 22px">
   <div class="row" style="gap:18px">
    <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><g class="rays" style="--a:0deg;stroke:var(--sun);stroke-width:5;stroke-linecap:round">{rays}</g><circle cx="32" cy="32" r="15" style="fill:var(--sun)"/></svg>
    <div><div style="font:700 34px/1.1 Display;width:max-content">Temperature in Bangkok</div><div class="small" style="width:max-content;margin-top:12px">One day in April · every 3 hours</div></div>
   </div>
   <svg class="chart" viewBox="0 0 800 460" style="width:820px;height:471px;margin-top:6px">
    <defs><linearGradient id="l3b-heat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF6B5B" stop-opacity=".30"/><stop offset="1" stop-color="#FFC53D" stop-opacity=".05"/></linearGradient>
     <clipPath id="l3b-heatclip"><rect x="{P[0][0]}" y="40" width="{P[-1][0] - P[0][0]}" height="362" class="growx hc" style="--d:{D0}"/></clipPath></defs>
    {grid}
    <g text-anchor="end">{ticks}<text x="56" y="20" class="tick">°C</text></g>
    <path d="{area_d}" clip-path="url(#l3b-heatclip)" style="fill:url(#l3b-heat)"/>
    <path d="M70 400H790" class="axis"/><path d="M70 40V362l-9 6 18 9-18 9 9 6V400" class="axis" style="stroke-linejoin:round"/>
    <path d="{line_d}" pathLength="1" class="ln draw s-coral" style="--d:{D0}"/>
    {pts}
    {vals}
    <g text-anchor="middle">{xl}</g>
    <g class="g1">
     <path d="M{f(pk[0])} {f(pk[1] + 14)}V400M{f(pk[0] - 14)} {f(pk[1])}H72" class="rd"/>
     <circle cx="{f(pk[0])}" cy="{f(pk[1])}" r="21" style="fill:none;stroke:var(--violet);stroke-width:4"/>
     <rect x="548" y="56" width="236" height="54" rx="27" style="fill:var(--ink)"/>
     <text x="666" y="92" text-anchor="middle" style="fill:#fff;font:700 25px Inter">Hottest: 35 °C</text>
    </g>
   </svg>
  </div>
  <div class="card float" style="position:absolute;left:640px;top:0;width:250px;--r:6deg;--d:700;padding:20px 22px 18px;text-align:center">
   <svg viewBox="0 0 180 180" width="160" height="160" style="display:block;margin:0 auto" aria-hidden="true">{mini_pie}</svg>
   <div style="font:700 24px Inter;margin-top:8px">Next: pie charts</div>
  </div>
 </div>
 <aside class="notes">Section start (Lesson 3, part 2). Let the line draw. Ask: "What does the line show?" (how the temperature changes during the day). "When was it hottest? When was it coolest?" Click: the reading lines show the hottest point, 35 °C at 15:00. Coolest: 27 °C at 6:00. From 6:00 to 15:00 it rose 35 − 27 = 8 °C; then it fell to 29 °C at 21:00 (35 − 29 = 6 °C). Data: 6:00 27, 9:00 30, 12:00 34, 15:00 35, 18:00 32, 21:00 29 °C (a hot April day). The zigzag on the vertical axis means the scale jumps from 0 to 20. Today: line graphs for change over time, then pie charts for parts of a whole.</aside>
</section>''')

# =====================================================================
# 2 · parts of a line graph + trend
# =====================================================================
bat = [100, 70, 70, 70, 30, 80]
bt = ['8:00', '10:00', '12:00', '14:00', '16:00', '18:00']
BX = [180 + 160 * i for i in range(6)]
yB = lambda p: 530 - 4.2 * p
BP = [(BX[i], yB(bat[i])) for i in range(6)]
bline = 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in BP)
bgrid = ''.join(f'<line x1="110" y1="{f(yB(p))}" x2="1010" y2="{f(yB(p))}" class="grid" style="{"stroke-width:1.5;stroke:#EDF0F6" if p % 20 else ""}"/>' for p in range(10, 101, 10))
bticks = ''.join(f'<text x="94" y="{f(yB(p) + 8)}" class="tick">{p}</text>' for p in range(0, 101, 20))
bpts = ''.join(f'<circle cx="{f(x)}" cy="{f(y)}" r="11" class="pop" style="fill:#fff;stroke:var(--blue);stroke-width:5;--d:{900 + 110 * i}"/>' for i, (x, y) in enumerate(BP))
bxl = ''.join(f'<text x="{x}" y="570" class="tick">{bt[i]}</text>' for i, x in enumerate(BX))


def mk(n, x, y, cls, d=0):
    return f'<g class="mk pop" style="--n:{d}"><circle cx="{x}" cy="{y}" r="21"/><text x="{x}" y="{y + 8.5}" text-anchor="middle">{n}</text></g>'


def trseg(a, b, col, n):
    (x1, y1), (x2, y2) = BP[a], BP[b]
    return f'<path d="M{f(x1)} {f(y1)} L{f(x2)} {f(y2)}" pathLength="1" class="draw" style="fill:none;stroke:var(--{col});stroke-width:11;stroke-linecap:round;--n:{n}"/>'


S.append(f'''<section class="slide" id="l3b-parts" data-steps="3">
 <i class="mesh m2"></i>
 <div class="kicker in">Lesson 3 · Line graphs</div>
 <h2 class="in" style="--d:120">Parts of a <em>line graph</em></h2>
 <div style="display:grid;grid-template-columns:1090px 1fr;gap:40px;align-items:start">
  <div class="card in" style="--d:220;padding:26px 30px 18px">
   <svg class="chart" viewBox="0 0 1020 640" style="width:1030px;height:646px">
    {bgrid}
    <g text-anchor="end">{bticks}</g>
    <text x="110" y="36" class="ttl" style="font-size:30px">Ploy’s phone battery on Saturday</text>
    <text transform="translate(30 330) rotate(-90)" text-anchor="middle" class="lab">Battery (%)</text>
    <text x="560" y="622" text-anchor="middle" class="lab">Time</text>
    <path d="M110 530H1010M110 100V530" class="axis"/>
    <path d="{bline}" pathLength="1" class="ln draw s-blue" style="--d:500"/>
    {bpts}
    <g text-anchor="middle">{bxl}</g>
    <g class="g3">
     {trseg(0, 1, 'coral', 0)}{trseg(1, 3, 'sun', 1)}{trseg(3, 4, 'coral', 2)}{trseg(4, 5, 'mint', 3)}
     <g class="pop" style="--n:2"><text x="284" y="146" class="tl" style="fill:var(--noc)">goes down</text></g>
     <g class="pop" style="--n:4"><text x="500" y="214" text-anchor="middle" class="tl" style="fill:#9A6400">stays the same</text></g>
     <g class="pop" style="--n:6"><text x="728" y="352" text-anchor="end" class="tl" style="fill:var(--noc)">goes down</text></g>
     <g class="pop" style="--n:8"><text x="918" y="362" class="tl" style="fill:var(--okc)">goes up</text></g>
    </g>
    <g class="g1">{mk(1, 652, 25, '', 0)}{mk(2, 30, 200, '', 1)}{mk(3, 622, 614, '', 2)}{mk(4, 30, 470, '', 3)}</g>
    <g class="g2">{mk(5, 820, 450, '', 0)}{mk(6, 420, 274, '', 1)}</g>
   </svg>
  </div>
  <div class="stack" style="gap:22px">
   <ol class="pl">
    <li class="s1 in" style="--d:300"><span class="nb">1</span><span class="g1" style="--d:0"><b>Title</b> · what it shows</span></li>
    <li class="s1 in" style="--d:360"><span class="nb">2</span><span class="g1" style="--d:90"><b>Vertical axis</b> · battery</span></li>
    <li class="s1 in" style="--d:420"><span class="nb">3</span><span class="g1" style="--d:180"><b>Horizontal axis</b> · time</span></li>
    <li class="s1 in" style="--d:480"><span class="nb">4</span><span class="g1" style="--d:270"><b>Scale</b> · equal steps</span></li>
    <li class="s2 in" style="--d:540"><span class="nb">5</span><span class="g2" style="--d:0"><b>Points</b> · the data</span></li>
    <li class="s2 in" style="--d:600"><span class="nb">6</span><span class="g2" style="--d:90"><b>Line</b> · joins the points</span></li>
   </ol>
   <div class="card flat in" style="--d:700;padding:20px 24px;display:flex;flex-direction:column;gap:12px">
    <div class="chip" style="align-self:flex-start">Read left to right</div>
    <div class="tr"><svg viewBox="0 0 54 40"><path d="M6 34L48 8" style="stroke:var(--mint);stroke-width:7;stroke-linecap:round"/></svg>goes up</div>
    <div class="tr"><svg viewBox="0 0 54 40"><path d="M6 8L48 34" style="stroke:var(--coral);stroke-width:7;stroke-linecap:round"/></svg>goes down</div>
    <div class="tr"><svg viewBox="0 0 54 40"><path d="M6 20H48" style="stroke:var(--sun);stroke-width:7;stroke-linecap:round"/></svg>stays the same</div>
   </div>
  </div>
 </div>
 <aside class="notes">Story: Ploy checks her phone battery every 2 hours on Saturday. Data: 8:00 100%, 10:00 70%, 12:00 70%, 14:00 70%, 16:00 30%, 18:00 80%. Click 1: the parts. (1) title, (2) vertical axis with its label "Battery (%)", (3) horizontal axis "Time", (4) scale in equal steps of 20 (light lines every 10). Click 2: (5) each point is one reading, (6) the line joins the points. Click 3: read the trend from left to right. 8:00–10:00 goes down 30 (games); 10:00–14:00 stays the same at 70% (phone off at a swimming lesson); 14:00–16:00 goes down 40 (videos); 16:00–18:00 goes up 50 (charging). Ask: "Where is the line steepest?" (16:00–18:00: up 50. The biggest drop is 14:00–16:00: down 40.) A line graph shows change over time.</aside>
</section>''')

# =====================================================================
# 3 · double line graph: income & costs (teaching example with questions)
# =====================================================================
inc = [14, 18, 24, 34, 38, 22]
cost = [16, 18, 20, 24, 26, 20]
mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
MX = [150 + 150 * i for i in range(6)]
yM = lambda v: 530 - 11 * v
IP = [(MX[i], yM(inc[i])) for i in range(6)]
CP = [(MX[i], yM(cost[i])) for i in range(6)]
iline = 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in IP)
cline = 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in CP)
mgrid = ''.join(f'<line x1="80" y1="{f(yM(v))}" x2="930" y2="{f(yM(v))}" class="grid"/>' for v in range(5, 41, 5))
mticks = ''.join(f'<text x="66" y="{f(yM(v) + 8)}" class="tick">{v}</text>' for v in range(0, 41, 5))
ipts = ''.join(f'<circle cx="{f(x)}" cy="{f(y)}" r="9" class="pop" style="fill:var(--blue);stroke:#fff;stroke-width:3;--d:{700 + 90 * i}"/>' for i, (x, y) in enumerate(IP))
cpts = ''.join(f'<circle cx="{f(x)}" cy="{f(y)}" r="9" class="pop" style="fill:var(--coral);stroke:#fff;stroke-width:3;--d:{1000 + 90 * i}"/>' for i, (x, y) in enumerate(CP))
# value labels: income above unless income < costs; Feb shared
vl = []
for i in range(6):
    xi, yi = IP[i]
    xc, yc = CP[i]
    if inc[i] == cost[i]:
        vl.append(f'<text x="{xi}" y="{f(yi - 20)}" class="tl" text-anchor="middle" style="fill:var(--ink)">{inc[i]}</text>')
        continue
    if inc[i] > cost[i]:
        vl.append(f'<text x="{xi}" y="{f(yi - 18)}" class="tl" text-anchor="middle" style="fill:var(--blue)">{inc[i]}</text>')
        vl.append(f'<text x="{xc}" y="{f(yc + 36)}" class="tl" text-anchor="middle" style="fill:var(--noc)">{cost[i]}</text>')
    else:
        vl.append(f'<text x="{xi}" y="{f(yi + 36)}" class="tl" text-anchor="middle" style="fill:var(--blue)">{inc[i]}</text>')
        vl.append(f'<text x="{xc}" y="{f(yc - 18)}" class="tl" text-anchor="middle" style="fill:var(--noc)">{cost[i]}</text>')
vlab = ''.join(vl)
mxl = ''.join(f'<text x="{x}" y="570" class="lab">{mon[i]}</text>' for i, x in enumerate(MX))
my_i, my_c = IP[4][1], CP[4][1]

S.append(f'''<section class="slide" id="l3b-double" data-steps="3">
 <i class="mesh"></i>
 <div class="kicker in">Lesson 3 · Line graphs</div>
 <h2 class="in" style="--d:120">Two lines on <em>one graph</em></h2>
 <div style="display:grid;grid-template-columns:600px 1fr;gap:40px;align-items:stretch">
  <div class="stack" style="gap:16px;justify-content:space-between">
   <div class="card qc in" style="--d:300">
    <div class="q"><span class="qn">1</span><span>When are income and costs <b>equal</b>?</span></div>
    <div class="ch ia r1" data-mcq>{''.join(f'<div class="c{" ok" if m == "Feb" else ""}">{m}</div>' for m in mon)}</div>
   </div>
   <div class="card qc in" style="--d:420">
    <div class="q"><span class="qn">2</span><span>Find the <b>biggest difference</b>.</span></div>
    <div class="w-input ia" data-answer="12" data-accept="12;12 thousand;12000;12,000" data-unit="thousand baht" data-tol="0" style="width:544px;height:130px;margin-top:14px"></div>
   </div>
   <div class="card qc in" style="--d:540">
    <div class="q"><span class="qn">3</span><span>Find the <b>total income</b> (6 months).</span></div>
    <div class="w-input ia" data-answer="150" data-accept="150;150 thousand;150000;150,000" data-unit="thousand baht" data-tol="0" style="width:544px;height:130px;margin-top:14px"></div>
   </div>
  </div>
  <div class="card in" style="--d:200;padding:24px 30px">
   <svg class="chart" viewBox="0 0 940 584" style="width:960px;height:596px">
    <rect x="{MX[1] - 48}" y="78" width="96" height="452" rx="14" class="g1" style="fill:var(--lsun)"/>
    {mgrid}
    <g text-anchor="end">{mticks}</g>
    <text x="80" y="30" class="ttl" style="font-size:28px">Aunt Noi’s mango sticky rice stall</text>
    <g class="lg"><line x1="650" y1="22" x2="690" y2="22" class="s-blue" style="stroke-width:6;stroke-linecap:round"/><text x="700" y="30">Income</text><line x1="806" y1="22" x2="846" y2="22" class="s-coral" style="stroke-width:6;stroke-linecap:round"/><text x="856" y="30">Costs</text></g>
    <text transform="translate(16 310) rotate(-90)" text-anchor="middle" class="tick" style="fill:var(--ink);font-weight:600">Thousand baht</text>
    <path d="M80 530H930M80 80V530" class="axis"/>
    <path d="{cline}" pathLength="1" class="ln draw s-coral" style="--d:900"/>
    <path d="{iline}" pathLength="1" class="ln draw s-blue" style="--d:600"/>
    {ipts}{cpts}
    <g class="pop" style="--d:1600">{vlab}</g>
    <g text-anchor="middle">{mxl}</g>
    <g class="g1"><rect x="{MX[1] - 46}" y="92" width="92" height="40" rx="20" style="fill:var(--sun)"/><text x="{MX[1]}" y="120" text-anchor="middle" style="font:800 22px Inter;fill:var(--ink)">EQUAL</text></g>
    <g class="g2">
     <path d="M{MX[4] - 22} {f(my_i + 12)}V{f(my_c - 12)}M{MX[4] - 32} {f(my_i + 12)}H{MX[4] - 12}M{MX[4] - 32} {f(my_c - 12)}H{MX[4] - 12}" pathLength="1" class="draw" style="fill:none;stroke:var(--violet);stroke-width:4;stroke-linecap:round"/>
     <rect x="{MX[4] - 120}" y="{f((my_i + my_c) / 2 - 16)}" width="84" height="52" rx="14" class="pop" style="fill:var(--violet)"/>
     <text x="{MX[4] - 78}" y="{f((my_i + my_c) / 2 + 20)}" text-anchor="middle" class="pop" style="fill:#fff;font:800 30px Inter">12</text>
    </g>
   </svg>
   <div class="sum g3"><svg><use href="#check"/></svg><span>14 + 18 + 24 + 34 + 38 + 22 = <b>150 thousand baht</b></span></div>
  </div>
 </div>
 <aside class="notes">Aunt Noi sells mango sticky rice near the school. Blue = income (money in), coral = costs (money out), in thousand baht. Income: Jan 14, Feb 18, Mar 24, Apr 34, May 38, Jun 22. Costs: Jan 16, Feb 18, Mar 20, Apr 24, May 26, Jun 20. Let students try each question (tap, type, or come to the board), then click. Click 1, Q1: the lines meet in February: 18 = 18. (In January costs are higher: she lost 16 − 14 = 2.) Click 2, Q2: the gap is biggest in May: 38 − 26 = 12 thousand baht (other gaps: Jan 2, Feb 0, Mar 4, Apr 10, Jun 2). Click 3, Q3: 14 + 18 + 24 + 34 + 38 + 22 = 150 thousand baht (check: 14 + 22 = 36, 18 + 38 = 56, 24 + 34 = 58, and 36 + 56 + 58 = 150). Extra: total costs 16 + 18 + 20 + 24 + 26 + 20 = 124, so the profit is 150 − 124 = 26 thousand baht. Mango season (April–May) is her best time.</aside>
</section>''')

# =====================================================================
# 4 · whole circle = 100% = 360°
# =====================================================================
cx = cy = 300
R = 280
r = R / 2


def lab2(x, y, pct, deg, cls=''):
    return (f'<g class="{cls}"><text x="{f(x)}" y="{f(y)}" class="pv">{pct}</text>'
            f'<text x="{f(x)}" y="{f(y + 36)}" class="dg">{deg}</text></g>')


def fr_icon(parts):
    """mini pie icon: list of (a0, sweep, color)"""
    out = '<svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="38" style="fill:var(--lblue)"/>'
    for a0, sw, col in parts:
        x1, y1 = polar(42, 42, 38, a0)
        x2, y2 = polar(42, 42, 38, a0 + sw)
        large = 1 if sw > 180 else 0
        out += f'<path d="M42 42L{f(x1)} {f(y1)}A38 38 0 {large} 1 {f(x2)} {f(y2)}Z" style="fill:var(--{col})"/>'
    return out + '<circle cx="42" cy="42" r="38" style="fill:none;stroke:var(--ink);stroke-width:2.5"/></svg>'


lx1, ly1 = polar(cx, cy, 150, 90)
lx2, ly2 = polar(cx, cy, 150, 270)
q1x, q1y = polar(cx, cy, 165, 45)
q2x, q2y = polar(cx, cy, 165, 135)
vx, vy = polar(cx, cy, 160, 252)
mx_, my_ = polar(cx, cy, 205, 342)
S.append(f'''<section class="slide" id="l3b-whole" data-steps="3">
 <i class="mesh m2"></i>
 <div class="kicker in">Lesson 3 · Pie charts</div>
 <h2 class="in" style="--d:120">The whole circle is <em>100%</em></h2>
 <div style="display:grid;grid-template-columns:420px 600px 1fr;gap:50px;align-items:center;height:600px">
  <div class="stack" style="gap:6px">
   <div class="chip in" style="--d:300;align-self:flex-start">The whole circle</div>
   <div class="tok grad in" style="--d:420;margin-top:10px">100%</div>
   <div class="small in" style="--d:480;font-size:28px">all of the data</div>
   <div class="tok in" style="--d:620;color:var(--violet);margin-top:22px"><span style="color:var(--mute);font-size:80px;vertical-align:14px;margin-right:12px">=</span>360°</div>
   <div class="small in" style="--d:680;font-size:28px">one full turn</div>
  </div>
  <svg viewBox="0 0 600 600" width="600" height="600" aria-label="pie chart">
   <g transform="rotate(-90 {cx} {cy})">
    {seg(cx, cy, r, 0, 360, 'blue', 400)}
    <g class="g1">{seg(cx, cy, r, 180, 180, 'violet', 200)}</g>
    <g class="g2">{seg(cx, cy, r, 90, 90, 'coral', 200)}</g>
    <g class="g3">{seg(cx, cy, r, 324, 36, 'mint', 200)}</g>
   </g>
   <g class="g1">{spoke(cx, cy, R, 0, 700)}{spoke(cx, cy, R, 180, 700)}</g>
   <g class="g2">{spoke(cx, cy, R, 90, 700)}<path d="M{cx} {cy - 34}H{cx + 34}V{cy}" style="fill:none;stroke:#fff;stroke-width:4"/></g>
   <g class="g3">{spoke(cx, cy, R, 324, 700)}</g>
   <g class="h1" style="--d:1100"><text x="{cx}" y="{cy + 6}" class="pv" style="font-size:72px">100%</text><text x="{cx}" y="{cy + 60}" class="dg" style="font-size:34px">360°</text></g>
   <g class="g1"><g class="h2">{lab2(lx1, ly1 - 8, '50%', '180°')}</g></g>
   <g class="g1"><g class="h3">{lab2(lx2, ly2 - 8, '50%', '180°')}</g></g>
   <g class="g2">{lab2(q1x, q1y - 6, '25%', '90°')}{lab2(q2x, q2y - 6, '25%', '90°')}</g>
   <g class="g3">{lab2(vx, vy - 6, '40%', '144°')}<text x="{f(mx_)}" y="{f(my_ + 6)}" class="pv" style="font-size:36px">10%</text></g>
  </svg>
  <div class="stack" style="gap:20px">
   <div class="card fr in" style="--d:700">{fr_icon([(180, 180, 'violet')])}<div><div class="fk">Half</div><div class="v vv"><span class="h1 qm">? % = ? °</span><span class="g1">50% = 180°</span></div></div></div>
   <div class="card fr in" style="--d:800">{fr_icon([(90, 90, 'coral')])}<div><div class="fk">Quarter</div><div class="v vv"><span class="h2 qm">? % = ? °</span><span class="g2">25% = 90°</span></div></div></div>
   <div class="card fr in" style="--d:900">{fr_icon([(324, 36, 'mint')])}<div><div class="fk">One tenth</div><div class="v vv"><span class="h3 qm">? % = ? °</span><span class="g3">10% = 36°</span></div></div></div>
  </div>
 </div>
 <div class="def in" style="--d:800;margin-top:22px;padding:20px 30px"><b>Pie chart</b>: a circle cut into <b>slices</b>. Each slice is a part of the whole.</div>
 <aside class="notes">The whole circle is all of the data: 100%. One full turn around the centre is 360°. Click 1: cut it in half: 50% = 180° (360 ÷ 2 = 180), a straight line. Click 2: cut a half again: 25% = 90° (360 ÷ 4 = 90), a right angle. Click 3: one tenth: 10% = 36° (360 ÷ 10 = 36). The pie is now 25% + 25% + 40% + 10% = 100%, and 90° + 90° + 144° + 36° = 360°. (40% of 360° = 144°.) Ask: "What angle is 1%?" 360 ÷ 100 = 3.6°. Key idea: the slices always add up to 100% and to 360°.</aside>
</section>''')

# =====================================================================
# 5 · reading a pie chart: percent -> amount
# =====================================================================
dr = [('Bubble tea', 40, 'blue', '#F6D7AE', 'var(--pearl)'), ('Thai tea', 25, 'sun', '#F4A259', 'transparent'),
      ('Pink milk', 20, 'coral', '#F9B4CF', 'transparent'), ('Water', 15, 'mint', '#D9EEFF', 'transparent')]
pcx = pcy = 230
PR = 220
pr = PR / 2
a = 0
segs = ''
labs = ''
spokes = ''
cnt = {'Bubble tea': 160, 'Thai tea': 100, 'Pink milk': 80, 'Water': 60}
gmap = {'Pink milk': 'g1', 'Bubble tea': 'g2', 'Water': 'g2'}
for i, (nm, p, col, tea, pearl) in enumerate(dr):
    sw = p * 3.6
    segs += seg(pcx, pcy, pr, a, sw, col, 500, i)
    spokes += spoke(pcx, pcy, PR, a, 1400, 4, 'pop')
    x, y = polar(pcx, pcy, 135 if sw > 60 else 150, a + sw / 2)
    ink = 'fill:var(--ink)' if col == 'sun' else ''
    labs += f'<text x="{f(x)}" y="{f(y + 4)}" class="pv in" style="--d:{1300 + 80 * i};{ink}">{p}%</text>'
    if nm in gmap:
        labs += f'<g class="{gmap[nm]}"><text x="{f(x)}" y="{f(y + 36)}" class="pn" style="{ink}">= {cnt[nm]}</text></g>'
    a += sw
legend = ''.join(f'<div class="in" style="--d:{900 + 90 * i}"><svg viewBox="0 0 64 96" style="--lid:var(--{col});--tea:{tea};--pearl:{pearl}"><use href="#cup"/></svg>{nm}</div>' for i, (nm, p, col, tea, pearl) in enumerate(dr))
S.append(f'''<section class="slide" id="l3b-drinks" data-steps="2">
 <i class="mesh m3"></i>
 <div class="kicker in">Lesson 3 · Pie charts</div>
 <h2 class="in" style="--d:120">From percent to <em>people</em></h2>
 <div style="display:grid;grid-template-columns:600px 1fr;gap:44px;align-items:start">
  <div class="card in" style="--d:200;padding:26px 34px 28px">
   <div style="font:700 32px Display">Favourite drink</div>
   <div class="small">All 400 students in Mathayom 1</div>
   <svg viewBox="0 0 460 460" width="440" height="440" style="display:block;margin:14px auto 0" aria-label="pie chart">
    <g transform="rotate(-90 {pcx} {pcy})">{segs}</g>
    {labs}
   </svg>
   <div class="lgd">{legend}</div>
  </div>
  <div class="stack" style="gap:20px">
   <div class="def in" style="--d:350;padding:22px 30px;font-size:32px"><div class="dt">Percent → number</div>part of 400 = <b>percent ÷ 100 × 400</b><div class="small" style="margin-top:6px;font-size:28px">e.g. 10% of 400 = 10 ÷ 100 × 400 = 40</div></div>
   <div class="card qc in" style="--d:480">
    <div class="q"><span class="qn">1</span><span>How many students like <b>pink milk</b>?</span></div>
    <div class="w-input ia" data-answer="80" data-accept="80;80 students" data-unit="students" data-tol="0" style="width:560px;height:130px;margin-top:16px"></div>
    <div class="ans g1 aa"><span>20 ÷ 100 × 400 = <b>80</b></span></div>
   </div>
   <div class="card qc in" style="--d:600">
    <div class="q"><span class="qn">2</span><span>How many <b>more</b> like bubble tea than water?</span></div>
    <div class="w-input ia" data-answer="100" data-accept="100;100 students" data-unit="students" data-tol="0" style="width:560px;height:130px;margin-top:16px"></div>
    <div class="ans g2 aa"><span>160 − 60 = <b>100</b></span></div>
   </div>
  </div>
 </div>
 <aside class="notes">400 students in M1 chose a favourite drink: bubble tea 40%, Thai tea 25%, pink milk 20%, water 15% (40 + 25 + 20 + 15 = 100%). To change a percent to a number of students: percent ÷ 100 × 400 (so 1% of 400 is 4 students, and 10% is 40). Let students try, then click. Click 1, Q1: 20 ÷ 100 × 400 = 80 students like pink milk. Click 2, Q2: bubble tea 40 ÷ 100 × 400 = 160; water 15 ÷ 100 × 400 = 60; 160 − 60 = 100 more. Quicker way: 40% − 15% = 25%, and 25% of 400 = 100. Check all: 160 + 100 + 80 + 60 = 400. Thai tea = 25 ÷ 100 × 400 = 100.</aside>
</section>''')

# =====================================================================
# 6 · making a pie chart (worked example on beats)
# =====================================================================
ways = [('School bus', 14, 'blue'), ('Car', 12, 'coral'), ('Walk', 8, 'mint'), ('BTS', 6, 'violet')]
tot = sum(v for _, v, _ in ways)
kx = ky = 280
KR = 266
kr = KR / 2
a = 0
ksegs = ''
klabs = ''
kspokes = ''
rows = ''
for i, (nm, v, col) in enumerate(ways):
    ang = v * 360 // tot
    g = 'g2' if i == 0 else 'g3'
    ksegs += f'<g class="{g}">' + seg(kx, ky, kr, a, ang, col, 200, 0 if i == 0 else i - 1) + '</g>'
    kspokes += f'<g class="{g}">' + spoke(kx, ky, KR, a, 900 + (0 if i == 0 else 200 * (i - 1)), 5) + '</g>'
    x, y = polar(kx, ky, 156, a + ang / 2)
    klabs += f'<g class="{g}" style="--d:{700 + (0 if i == 0 else 200 * (i - 1))}"><text x="{f(x)}" y="{f(y - 6)}" class="pn">{nm.replace("School bus", "Bus")}</text><text x="{f(x)}" y="{f(y + 30)}" class="pv">{ang}°</text></g>'
    rows += f'<tr><td><span style="display:inline-block;width:18px;height:18px;border-radius:5px;background:var(--{col});margin-right:12px"></span>{nm}</td><td class="n">{v}</td><td class="w"><span class="{g}" style="--d:{0 if i == 0 else 150 * (i - 1)}">{v} ÷ 40 × 360° = <b>{ang}°</b></span></td></tr>'
    a += ang
assert a == 360 and tot == 40
# protractor (right half, base on the 12 o'clock line)
pt = ''
for deg in range(0, 181, 10):
    x1, y1 = polar(kx, ky, 86 if deg % 30 else 76, deg)
    x2, y2 = polar(kx, ky, 96, deg)
    pt += f'<line x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}" class="pt"/>'
S.append(f'''<section class="slide" id="l3b-make" data-steps="4">
 <i class="mesh m4"></i>
 <div class="kicker in">Lesson 3 · Pie charts</div>
 <h2 class="in" style="--d:120">Making a <em>pie chart</em></h2>
 <div style="display:grid;grid-template-columns:820px 1fr;gap:56px;align-items:start">
  <div class="stack" style="gap:24px">
   <div class="def in" style="--d:250;font-size:36px;padding:22px 32px"><div class="dt">Angle of a slice</div>angle = <b>value ÷ total × 360°</b></div>
   <table class="tbl in" style="--d:400;width:820px">
    <caption>How class 1/2 gets to school</caption>
    <thead><tr><th>Way</th><th class="n">Students</th><th>Angle</th></tr></thead>
    <tbody>{rows}</tbody>
    <tfoot><tr><td>Total</td><td class="n"><b class="g1" style="color:var(--blue)">40</b></td><td><b class="g3" style="--d:500;color:var(--okc)">360° ✓</b></td></tr></tfoot>
   </table>
   <div class="note in" style="--d:550"><div class="nt">Remember</div>All the slices together make a full turn: <b>360°</b>.</div>
  </div>
  <div class="stack" style="gap:18px">
   <div class="stp">
    <div class="first h1 in" style="--d:600"><span class="sn" style="background:var(--lblue);color:var(--blue)">Start</span>First, find the total.</div>
    <div class="g1"><span class="h2 ic"><span class="sn">Step 1</span><span>Total: 14 + 12 + 8 + 6 = <b>40</b></span></span></div>
    <div class="g2"><span class="h3 ic"><span class="sn">Step 2</span><span>Bus: 14 ÷ 40 × 360° = <b>126°</b></span></span></div>
    <div class="g3"><span class="l3b-h4 ic"><span class="sn">Step 3</span><span>Check: 126 + 108 + 72 + 54 = <b>360°</b></span></span></div>
    <div class="g4"><span class="ic"><span class="sn">Step 4</span><span>Draw from 12 o’clock with a protractor</span></span></div>
   </div>
   <svg viewBox="0 0 560 560" width="560" height="560" style="margin:0 auto" aria-label="pie chart">
    <circle cx="{kx}" cy="{ky}" r="{KR}" style="fill:#fff;stroke:#C5CDE0;stroke-width:3;stroke-dasharray:10 9"/>
    <g transform="rotate(-90 {kx} {ky})">{ksegs}</g>
    {kspokes}
    {klabs}
    <g class="in" style="--d:700"><path d="M{kx - 12} 2L{kx + 12} 2L{kx} 18Z" style="fill:var(--ink)"/></g>
    <g class="g4"><path d="M{kx} {ky - 96}A96 96 0 0 1 {kx} {ky + 96}Z" class="pro"/>{pt}<circle cx="{kx}" cy="{ky}" r="7" style="fill:var(--ink)"/></g>
   </svg>
  </div>
 </div>
 <aside class="notes">Worked example. Data: how class 1/2 gets to school: school bus 14, car 12, walk 8, BTS 6. Rule: angle = value ÷ total × 360°. Click 1: total = 14 + 12 + 8 + 6 = 40 students. Click 2: bus = 14 ÷ 40 × 360° = 126° (360 ÷ 40 = 9° for each student, and 14 × 9 = 126). Click 3: car 12 × 9 = 108°, walk 8 × 9 = 72°, BTS 6 × 9 = 54°. Check: 126 + 108 + 72 + 54 = 360°. Click 4: draw it. Start with a line from the centre to 12 o'clock, put the protractor on that line, mark 126°, and go on around the circle, slice by slice. Ask: "What should the angles always add up to?" (360°).</aside>
</section>''')

# =====================================================================
# 7 · Exercise 3B divider
# =====================================================================
S.append(f'''<section class="slide opener" id="l3b-ex" data-steps="0" data-lesson="3b" data-title="Exercise 3B · Line graphs &amp; pie charts">
 <i class="mesh"></i>
 <div class="g46" style="align-items:center;height:100%">
  <div style="position:relative;display:grid;place-items:center;height:640px">
   <svg viewBox="0 0 640 640" width="640" height="640" style="position:absolute;left:0;top:0" aria-hidden="true"><g transform="rotate(-90 320 320)">{''.join(seg(320, 320, 290, a0, sw - 3, c, 300, i, 'seg') for i, (a0, sw, c) in enumerate([(0, 150, 'blue'), (150, 90, 'violet'), (240, 70, 'coral'), (310, 50, 'sun')]))}</g></svg>
   <div class="num in" style="--d:100;font-size:330px">3B</div>
  </div>
  <div class="stack" style="gap:20px">
   <div class="kicker in" style="--d:200">Exercise 3B</div>
   <h2 class="in" style="--d:280;margin:0">Your turn: <em>lines and pies</em></h2>
   <ul class="goals" style="gap:18px;margin-top:10px">
    <li class="in" style="--d:450">{icon('line')}Fix a line graph</li>
    <li class="in" style="--d:540">{icon('pie')}Work out the angles of a pie chart</li>
    <li class="in" style="--d:630">{icon('bar')}Choose the best chart</li>
    <li class="in" style="--d:720">{icon('pct')}Find a percentage from a table</li>
   </ul>
   <div class="note in" style="--d:900;margin-top:12px;max-width:900px"><div class="nt">At the board</div>Come up and show your answer. Then we check together.</div>
  </div>
 </div>
 <aside class="notes">Exercise 3B. Four tasks. For each one, invite a student (or a pair) to the board to work on the slide: drag, type, tap or write with the pen. Ask the class if they agree before you click to show the answer.</aside>
</section>''')

# =====================================================================
# 8 · fix the bean plant line graph (w-line with wrong start)
# =====================================================================
bean = [1, 3, 5, 8, 10, 11]
plants = ''
for i, h in enumerate(bean):
    x = 50 + 100 * i
    top = 152 - h * 12
    plants += (f'<path d="M{x} 152V{top}" class="grow" style="stroke:#3FA34D;stroke-width:6;stroke-linecap:round;--n:{i};--d:500"/>'
               f'<g class="pop" style="--n:{i};--d:1100"><ellipse cx="{x - 13}" cy="{top + 2}" rx="14" ry="7" transform="rotate(-25 {x - 13} {top + 2})" style="fill:#4CBF5E"/><ellipse cx="{x + 13}" cy="{top + 2}" rx="14" ry="7" transform="rotate(25 {x + 13} {top + 2})" style="fill:#4CBF5E"/></g>'
               f'<path d="M{x - 30} 150H{x + 30}L{x + 24} 186H{x - 24}Z" style="fill:#E07A52"/><rect x="{x - 33}" y="146" width="66" height="10" rx="4" style="fill:#C9623E"/>')
S.append(f'''<section class="slide" id="l3b-bean" data-steps="1">
 <i class="mesh m4"></i>
 <div class="kicker in">Exercise 3B · Line graphs</div>
 <h2 class="in" style="--d:120">Fix the <em>bean plant</em> graph</h2>
 <div style="display:grid;grid-template-columns:1000px 1fr;gap:44px;align-items:start">
  <div class="w-line ia in" style="--d:250;width:1000px;height:720px" data-title="Height of Mew’s bean plant" data-labels="Day 1,Day 2,Day 3,Day 4,Day 5,Day 6" data-min="0" data-max="12" data-step="1" data-answer="1,3,5,8,10,11" data-start="2,4,4,9,9,12" data-ylabel="Height (cm)"></div>
  <div class="stack" style="gap:18px">
   <div class="card in" style="--d:350;padding:22px 0 0;overflow:hidden">
    <svg viewBox="0 0 600 190" width="616" height="195" style="display:block" aria-hidden="true">{plants}</svg>
    <table class="tbl" style="width:100%;border-radius:0;box-shadow:none;margin-top:6px">
     <tr><th>Day</th>{''.join(f'<th>{d}</th>' for d in range(1, 7))}</tr>
     <tr><td><b>Height (cm)</b></td>{''.join(f'<td>{h}</td>' for h in bean)}</tr>
    </table>
   </div>
   <div class="q in" style="--d:500;font-size:30px">When did it grow the <b>most</b>?</div>
   <div class="ch ia r1 in" data-mcq style="--d:600">
    <div class="c">Day 1 → 2</div><div class="c ok">Day 3 → 4</div>
    <div class="c">Day 4 → 5</div><div class="c">Day 5 → 6</div>
   </div>
   <div class="ans g1"><svg><use href="#check"/></svg><span>8 − 5 = <b>3 cm</b>. The line is <b>steepest</b> there.</span></div>
  </div>
 </div>
 <aside class="notes">Mew measured her bean plant in the school garden each day. The graph on the left has mistakes: a student drags each point up or down to match the table (Day 1: 1 cm, Day 2: 3, Day 3: 5, Day 4: 8, Day 5: 10, Day 6: 11). Wrong start points: 2, 4, 4, 9, 9, 12. Press Check, or Show answer. Then the tap question. Growth each day: 1→2: 3 − 1 = 2; 2→3: 5 − 3 = 2; 3→4: 8 − 5 = 3; 4→5: 10 − 8 = 2; 5→6: 11 − 10 = 1. Click: the most growth is from Day 3 to Day 4 (3 cm), where the line is steepest. Ask: "Is the plant growing faster or slower at the end?" (slower: only 1 cm from Day 5 to Day 6, the line is flatter).</aside>
</section>''')

# =====================================================================
# 9 · build a pie chart (w-pie angles)
# =====================================================================
ev = [('Relay', 12, 'blue'), ('Tug of war', 10, 'violet'), ('Sack race', 5, 'coral'), ('Cheering', 9, 'mint')]
assert sum(v for _, v, _ in ev) == 36
bunting = '<path d="M4 10 Q253 70 502 10" style="fill:none;stroke:var(--mute);stroke-width:3"/>'
fc = ['blue', 'coral', 'sun', 'mint', 'violet', 'blue', 'coral', 'sun']
for i in range(8):
    t = (i + 0.5) / 8
    bx = (1 - t) ** 2 * 4 + 2 * (1 - t) * t * 253 + t * t * 502
    by = (1 - t) ** 2 * 10 + 2 * (1 - t) * t * 70 + t * t * 10
    bunting += f'<path d="M{f(bx - 22)} {f(by - 2)}L{f(bx + 22)} {f(by - 2)}L{f(bx)} {f(by + 44)}Z" class="drop" style="fill:var(--{fc[i]});--n:{i};--d:500"/>'
erows = ''.join(f'<tr><td><span class="dot" style="background:var(--{c})"></span>{n}</td><td class="n">{v}</td><td><span class="ab"><b class="g2" style="--d:{120 * i}">{v * 10}°</b></span></td></tr>' for i, (n, v, c) in enumerate(ev))
S.append(f'''<section class="slide" id="l3b-build" data-steps="2">
 <i class="mesh m2"></i>
 <div class="kicker in">Exercise 3B · Pie charts</div>
 <h2 class="in" style="--d:120">Work out the <em>angles</em></h2>
 <div style="display:grid;grid-template-columns:1110px 1fr;gap:44px;align-items:start">
  <div class="w-pie ia in" style="--d:250;width:1110px;height:720px" data-title="Favourite sports day event · class 1/3" data-head="Event,Students" data-labels="Relay,Tug of war,Sack race,Cheering" data-values="12,10,5,9" data-mode="angles"></div>
  <div class="stack" style="gap:20px">
   <svg viewBox="0 0 506 96" width="506" height="96" aria-hidden="true" style="margin-bottom:-8px">{bunting}</svg>
   <div class="def in" style="--d:400;font-size:30px;padding:22px 26px"><div class="dt">Remember</div>angle = value ÷ total × 360°</div>
   <div class="idea g1"><svg><use href="#bulb"/></svg><span>360° ÷ 36 = <b>10°</b> for each student</span></div>
   <div class="card g2 an" style="padding:20px 26px">
    <div class="chip mint">Answer</div>
    {''.join(f'<div class="ar"><span class="dot" style="background:var(--{c})"></span>{n}<b>{v} × 10 = {v * 10}°</b></div>' for n, v, c in ev)}
   </div>
  </div>
 </div>
 <aside class="notes">Class 1/3 voted for their favourite sports day event: relay 12, tug of war 10, sack race 5, cheering 9. Total 12 + 10 + 5 + 9 = 36 students. A student types each angle into the pie builder; the pie draws as they type. Click 1 (hint): each student is 360° ÷ 36 = 10°. Click 2 (answers): relay 12 × 10 = 120°, tug of war 10 × 10 = 100°, sack race 5 × 10 = 50°, cheering 9 × 10 = 90°. Check: 120 + 100 + 50 + 90 = 360°. Same with the rule: 12 ÷ 36 × 360° = 120°.</aside>
</section>''')

# =====================================================================
# 10 · which chart? (w-sort)
# =====================================================================
items = [(3, 'Rainfall each month'), (4, 'Krit’s 24-hour day'),
         (2, 'Gold medals of 5 schools'), (0, 'Every student’s exact score'),
         (1, 'Mangoes per class, for little kids'), (3, 'Ploy’s height each birthday'),
         (4, 'Parts of the class budget')]
keys = [('table', 'Table', 'exact values'), ('picto', 'Pictogram', 'counts as pictures'), ('bar', 'Bar chart', 'compare groups'),
        ('line', 'Line graph', 'change over time'), ('pie', 'Pie chart', 'parts of a whole')]
S.append(f'''<section class="slide" id="l3b-which" data-steps="1">
 <i class="mesh m3"></i>
 <div class="kicker in">Exercise 3B · Choosing a chart</div>
 <h2 class="in" style="--d:120">Which chart should <em>we use</em>?</h2>
 <div class="w-sort ia in" style="--d:250;width:1660px;height:600px" data-bins="Table|Pictogram|Bar chart|Line graph|Pie chart">
  {''.join(f'<div class="item" data-bin="{b}">{t}</div>' for b, t in items)}
 </div>
 <div class="grid4" style="grid-template-columns:repeat(5,1fr);gap:20px;margin-top:18px">
  {''.join(f'<div class="card flat kc in" style="--d:{400 + 80 * i}">{icon(k, 56, 46)}<div><div class="nm">{n}</div><div class="rl g1" style="--d:{100 * i}">{rl}</div></div></div>' for i, (k, n, rl) in enumerate(keys))}
 </div>
 <aside class="notes">A student drags (or taps) each card into the best chart, then presses Check. Answers: rainfall in Bangkok each month → line graph (change over time); Ploy's height on each birthday → line graph; how Krit spends the 24 hours of one day → pie chart (parts of a whole day); class budget parts → pie chart; gold medals of five schools → bar chart (compare groups); exact test scores to look up → table (exact values); poster for little kids → pictogram (pictures). Click: the rule for each chart appears. Discuss: some data can go in more than one chart (medals could be a pictogram too), but ask "which is best, and why?"</aside>
</section>''')

# =====================================================================
# 11 · what percent like volleyball?
# =====================================================================
sp = [('Football', 14, 'blue'), ('Badminton', 10, 'mint'), ('Volleyball', 8, 'coral'), ('Basketball', 6, 'violet'), ('Sepak takraw', 2, 'sun')]
assert sum(v for _, v, _ in sp) == 40
cw = 958 / 40
fbar = '<text x="958" y="28" text-anchor="end" class="lab" style="fill:var(--mute)">1 box = 1 student</text>'
fbar += ''.join(f'<rect x="{f(i * cw + 1)}" y="44" width="{f(cw - 3)}" height="46" rx="5" style="fill:#E3E8F2"/>' for i in range(40))
fbar += '<g class="g1">' + ''.join(f'<rect x="{f(i * cw + 1)}" y="44" width="{f(cw - 3)}" height="46" rx="5" class="pop" style="fill:var(--coral);--n:{i}"/>' for i in range(8))
fbar += f'<rect x="0" y="2" width="200" height="38" rx="19" style="fill:var(--lcoral)"/><text x="100" y="30" text-anchor="middle" style="font:700 24px Inter;fill:var(--noc)">8 out of 40</text></g>'
fbar += '<g class="g2">' + ''.join(f'<line x1="{f(k * 958 / 5)}" y1="96" x2="{f(k * 958 / 5)}" y2="110" style="stroke:var(--ink);stroke-width:3"/><text x="{f(min(max(k * 958 / 5, 24), 934))}" y="140" text-anchor="middle" class="tick" style="fill:var(--ink)">{20 * k}%</text>' for k in range(6))
fbar += f'<path d="M0 103H958" style="stroke:var(--ink);stroke-width:3"/><rect x="0" y="96" width="{f(8 * cw)}" height="14" rx="4" style="fill:var(--coral)"/></g>'
vrows = ''
k = 0
for i, (n, v, c) in enumerate(sp):
    ppl = ''.join(f'<svg viewBox="0 0 40 56" class="pop" style="--n:{j};--d:{500 + 90 * i};color:var(--{c})"><use href="#person"/></svg>' for j in range(v))
    vrows += f'<tr class="{"vb" if n == "Volleyball" else "fade"}"><td style="font-weight:600">{n}</td><td><div class="ppl">{ppl}</div></td><td class="n" style="font-weight:700">{v}</td></tr>'
S.append(f'''<section class="slide" id="l3b-volley" data-steps="2">
 <i class="mesh m4"></i>
 <div class="kicker in">Exercise 3B · Percent</div>
 <h2 class="in" style="--d:120">What percent like <em>volleyball</em>?</h2>
 <div style="display:grid;grid-template-columns:1010px 1fr;gap:20px 44px;align-items:start">
  <table class="tbl in" style="--d:250;width:1010px">
   <caption>Favourite sport · class 1/2</caption>
   <thead><tr><th>Sport</th><th>Students</th><th class="n">Number</th></tr></thead>
   <tbody>{vrows}</tbody>
   <tfoot><tr><td>Total</td><td></td><td class="n">40</td></tr></tfoot>
  </table>
  <div class="card in fb" style="--d:700;grid-column:1;padding:18px 26px 14px">
   <svg class="chart" viewBox="0 0 958 150" width="958" height="150" aria-label="40 boxes, one for each student">{fbar}</svg>
  </div>
  <div class="stack" style="gap:18px;grid-column:2;grid-row:1/3">
   <div class="card qc in" style="--d:400;padding:24px 28px">
    <div class="q"><span class="qn">?</span><span>What percentage of the class like <b>volleyball</b>?</span></div>
    <div class="ch ia r2" data-mcq style="margin-top:18px">
     <div class="c"><b>A</b>2%</div><div class="c"><b>B</b>8%</div>
     <div class="c ok"><b>C</b>20%</div><div class="c"><b>D</b>40%</div>
    </div>
   </div>
   <div class="w-write ia in" style="--d:550;width:606px;height:250px" data-label="Show your working" data-lines="2"></div>
   <div class="ans g2"><svg><use href="#check"/></svg><span>8 ÷ 40 × 100% = <b>20%</b></span></div>
  </div>
 </div>
 <aside class="notes">Class 1/2 chose a favourite sport: football 14, badminton 10, volleyball 8, basketball 6, sepak takraw 2. Total 14 + 10 + 8 + 6 + 2 = 40. A student taps a choice and writes the working. Click 1 (hint): the 8 volleyball fans light up: 8 out of 40. Click 2: 8 ÷ 40 = 0.2, and 0.2 × 100% = 20% (or 8/40 = 20/100). Wrong choices: 8% (forgot to divide by the total), 2% (0.2 read wrongly), 40% (the total). More practice: football 14 ÷ 40 × 100% = 35%, badminton 25%, basketball 15%, sepak takraw 5%; 35 + 25 + 20 + 15 + 5 = 100%.</aside>
</section>''')

OUT.write_text(STYLE + '\n' + '\n\n'.join(S) + '\n', encoding='utf-8')
print('wrote', OUT, len(S), 'slides')
