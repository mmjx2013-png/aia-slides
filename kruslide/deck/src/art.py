# Shared illustrations (all drawn for this deck: flat shapes, the KruSlide palette, no photographs of people).
import math

CLOCK_CSS = r'''
.clk{position:absolute;width:var(--S);height:var(--S);transition:--S 1s var(--ease),left 1s var(--ease),top 1s var(--ease)}
.clk .face{position:absolute;inset:0;border-radius:50%;background:#FBF1E2;box-shadow:inset 0 0 0 calc(var(--S)*.04) var(--navy),0 30px 70px rgba(5,10,35,.45);
  transition:border-radius 1s var(--ease),background-color 1s ease,box-shadow 1s ease}
.clk .ticks{position:absolute;inset:0;width:100%;height:100%;transition:opacity .5s ease}
.clk .ticks line{stroke:var(--navy);stroke-linecap:round}
.clk .hand{position:absolute;left:calc(var(--S)*(var(--px) - var(--w)/2));top:calc(var(--S)*(var(--py) - var(--L)));width:calc(var(--S)*var(--w));height:calc(var(--S)*(var(--L) + var(--t)));
  transform-origin:50% calc(var(--S)*var(--L));transform:rotate(calc(var(--rot)*1deg));border-radius:calc(var(--S)*var(--rad));
  transition:--rot 1.8s cubic-bezier(.45,0,.2,1) .15s,--px 1s var(--ease),--py 1s var(--ease),--w 1s var(--ease),--L 1s var(--ease),--t 1s var(--ease),--rad 1s var(--ease),background-color .9s ease}
.clk .hh{--px:.5;--py:.5;--w:.05;--L:.26;--t:.06;--rad:.025;--rot:270;background:var(--navy)}
.clk .mh{--px:.5;--py:.5;--w:.032;--L:.38;--t:.08;--rad:.016;--rot:0;background:var(--blue)}
.clk .pin{position:absolute;left:calc(var(--S)*.465);top:calc(var(--S)*.465);width:calc(var(--S)*.07);height:calc(var(--S)*.07);border-radius:50%;background:var(--tomato);transition:opacity .5s ease}
'''

def clock(cls, S, left, top, extra=''):
    ticks = []
    for k in range(60):
        a = math.radians(k * 6)
        major = k % 5 == 0
        r1 = 44.5 if not major else 40.5
        r2 = 46.5
        x1, y1 = 50 + r1 * math.sin(a), 50 - r1 * math.cos(a)
        x2, y2 = 50 + r2 * math.sin(a), 50 - r2 * math.cos(a)
        if k % 15 == 0: r1 = 37.5; x1, y1 = 50 + r1 * math.sin(a), 50 - r1 * math.cos(a)
        ticks.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke-width="{2.4 if k % 15 == 0 else (1.6 if major else .6)}"/>')
    return (f'<div class="clk {cls}" style="--S:{S}px;left:{left}px;top:{top}px{";" + extra if extra else ""}" aria-hidden="true"><i class="face"></i>'
            f'<svg class="ticks" viewBox="0 0 100 100">{"".join(ticks)}</svg><i class="hand hh"></i><i class="hand mh"></i><i class="pin"></i></div>')

def coin(size, left, top, cls='', text='10', sub='สตางค์', extra=''):
    return (f'<div class="coin {cls}" style="left:{left}px;top:{top}px;width:{size}px;height:{size}px;font-size:{size*0.42:.0f}px{";" + extra if extra else ""}" aria-hidden="true">'
            f'<b>{text}</b><span>{sub}</span></div>')

# a pupil seen from behind (head + shoulders) with an arm that can rise: the "raised hand" object
KID_CSS = r'''
.kids{display:flex;align-items:flex-end;gap:var(--gap,18px)}
.kidb{position:relative;width:var(--kw,120px);height:calc(var(--kw,120px)*1.15);flex:none}
.kidb svg{position:absolute;inset:0;width:100%;height:100%}
.kidb .arm{position:absolute;left:var(--ax,72%);top:56%;width:22%;height:70%;transform-origin:50% 92%;transform:rotate(var(--a0,150deg));
  transition:transform .6s cubic-bezier(.3,1.25,.5,1) var(--ad,0s)}
.kidb.l .arm{left:6%;transform:rotate(calc(-1*var(--a0,150deg)))}
.kidb .arm i{position:absolute;left:28%;top:18%;width:44%;height:80%;border-radius:999px;background:var(--sh,#3D7BFF)}
.kidb .arm b{position:absolute;left:12%;top:0;width:76%;height:30%;border-radius:50% 50% 45% 45%;background:var(--sk,#F2C39A)}
.kidb.up .arm{transform:rotate(var(--a1,8deg))}
.kidb.l.up .arm{transform:rotate(calc(-1*var(--a1,8deg)))}
'''

KID_COLORS = [('#2A2230', '#3D7BFF', '#F2C39A'), ('#4A2E22', '#F2553C', '#E9B48A'), ('#1E1A26', '#18B07F', '#F5CDA8'),
              ('#3A2A20', '#8B6CF6', '#DDA77C'), ('#231C2A', '#FFC83D', '#F0BE95'), ('#2E2018', '#3D7BFF', '#E2AE84')]

def kid_back(k, cls='', w=120, extra='', bow=False):
    hair, shirt, skin = KID_COLORS[k % len(KID_COLORS)]
    bowsvg = f'<path d="M58 14 l-10-8 v16z M62 14 l10-8 v16z" fill="#F2553C"/><circle cx="60" cy="14" r="4" fill="#F2553C"/>' if bow else ''
    svg = (f'<svg viewBox="0 0 120 138" aria-hidden="true"><path d="M8 138 Q8 86 60 84 Q112 86 112 138 Z" fill="{shirt}"/>'
           f'<path d="M44 86 Q60 100 76 86" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="5" stroke-linecap="round"/>'
           f'<circle cx="18" cy="56" r="8" fill="{skin}"/><circle cx="102" cy="56" r="8" fill="{skin}"/>'
           f'<ellipse cx="60" cy="50" rx="40" ry="42" fill="{hair}"/>{bowsvg}</svg>')
    return (f'<div class="kidb {cls}" style="--kw:{w}px;--sh:{shirt};--sk:{skin}{";" + extra if extra else ""}" aria-hidden="true">'
            f'<div class="arm"><i></i><b></b></div>{svg}</div>')

# simple cup pictogram icon (uses the Unit 4 "cup" symbol)
def cup(w=56, half=False):
    h = w * 1.5
    if half:
        return f'<svg class="cupi half" viewBox="0 0 64 96" style="width:{w/2:.0f}px;height:{h:.0f}px" aria-hidden="true" preserveAspectRatio="xMinYMid slice"><use href="#cup"/></svg>'
    return f'<svg class="cupi" viewBox="0 0 64 96" style="width:{w}px;height:{h:.0f}px" aria-hidden="true"><use href="#cup"/></svg>'
