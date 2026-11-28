# The samples section (four live screens you can step into), S8 styles, S9 real work.
from core import icon
from art import kid_back, cup, KID_CSS

SLIDES = []
def add(**k): SLIDES.append(k)

# ---------------------------------------------------------------------------------------------------
# persistent rail: four sample cards. Big on the section's first beat, then docked at the bottom; the current one is lit.
RAIL = [('calc', 'i-func', 'แคลคูลัส', 'ลากเส้นสัมผัส · พื้นที่ใต้โค้ง', 'var(--lilac)', 'img/sample-calc.webp'),
        ('history', 'i-map', 'อยุธยา', 'ประวัติศาสตร์แบบภาพยนตร์', 'var(--tomato)', 'img/sample-history.webp'),
        ('stats', 'i-bar', 'สถิติ ม.1', 'บทเรียนเต็มบท 67 หน้า', 'var(--mint)', 'img/u4-00.webp'),
        ('school', 'i-present', 'งานโรงเรียน', 'เว็บไซต์ + สไลด์นำเสนอ', 'var(--blue)', 'img/pitch-0.webp')]
rail = '<div id="rail" aria-hidden="true">' + ''.join(
    f'<div class="rc rc{k} for-{sid}" style="--k:{k};--c:{col}"><div class="big"><img src="{pos}" alt=""><i>{icon(ic)}</i><b>{t}</b><span>{d}</span></div>'
    f'<div class="sm"><i>{icon(ic)}</i><b>{t}</b></div></div>' for k, (sid, ic, t, d, col, pos) in enumerate(RAIL)) + '</div>'
EXTRA_HTML = rail
RAIL_CSS = r'''
#rail{position:absolute;inset:0;z-index:25;pointer-events:none;opacity:0;transition:opacity .4s ease}
[data-s="calc"] #rail,[data-s="history"] #rail,[data-s="stats"] #rail,[data-s="school"] #rail{opacity:1}
#rail .rc{position:absolute;left:calc(482px + var(--k)*239px);top:986px;width:227px;height:62px;border-radius:999px;background:rgba(255,255,255,.9);
  box-shadow:0 8px 20px rgba(10,20,60,.18);overflow:hidden;
  transition:left .9s var(--ease) calc(var(--k)*50ms),top .9s var(--ease) calc(var(--k)*50ms),width .9s var(--ease) calc(var(--k)*50ms),height .9s var(--ease) calc(var(--k)*50ms),border-radius .9s var(--ease),background-color .4s,box-shadow .4s}
#rail .big,#rail .sm{position:absolute;inset:0;transition:opacity .25s ease}
#rail .sm{display:flex;align-items:center;gap:10px;padding:0 18px 0 10px;opacity:1;transition:opacity .3s ease .55s}
#rail .sm i{display:grid;place-items:center;flex:none;width:44px;height:44px;border-radius:50%;background:var(--c);color:#fff}
#rail .sm .ic{width:26px;height:26px}
#rail .sm b{font:700 23px/1.2 var(--sans);color:var(--navy);white-space:nowrap}
#rail .big{opacity:0;display:flex;flex-direction:column;justify-content:flex-end;padding:0 30px 34px}
#rail .big img{position:absolute;left:18px;top:18px;width:344px;height:194px;border-radius:22px;object-fit:cover;box-shadow:0 8px 20px rgba(28,42,85,.15)}
#rail .big i{position:absolute;left:30px;top:166px;display:grid;place-items:center;width:84px;height:84px;border-radius:26px;background:var(--c);color:#fff;box-shadow:0 0 0 6px #fff}
#rail .big .ic{width:48px;height:48px}
#rail .big b{font:800 48px/1.25 var(--sans);color:var(--navy)}
#rail .big span{font:600 26px/1.4 var(--sans);color:#4A5576;margin-top:6px}
/* intro beat: four big cards across the middle */
[data-s="calc"][data-step="0"] #rail .rc{left:calc(140px + var(--k)*420px);top:400px;width:380px;height:420px;border-radius:36px;background:#fff;box-shadow:0 30px 70px rgba(40,20,110,.22)}
[data-s="calc"][data-step="0"] #rail .big{opacity:1;transition:opacity .4s ease .55s}
[data-s="calc"][data-step="0"] #rail .sm{opacity:0;transition:opacity .15s ease}
/* docked: the current sample is lit */
[data-s="calc"] #rail .for-calc,[data-s="history"] #rail .for-history,[data-s="stats"] #rail .for-stats,[data-s="school"] #rail .for-school{background:var(--c);box-shadow:0 0 0 4px #fff,0 10px 24px rgba(10,20,60,.28)}
[data-s="calc"] #rail .for-calc .sm b,[data-s="history"] #rail .for-history .sm b,[data-s="stats"] #rail .for-stats .sm b,[data-s="school"] #rail .for-school .sm b{color:#fff}
[data-s="calc"] #rail .for-calc .sm i,[data-s="history"] #rail .for-history .sm i,[data-s="stats"] #rail .for-stats .sm i,[data-s="school"] #rail .for-school .sm i{background:rgba(255,255,255,.22)}
[data-s="calc"][data-step="0"] #rail .for-calc{background:#fff;box-shadow:0 30px 70px rgba(40,20,110,.22)}
'''

SCR_CSS = r'''
.scr{position:absolute;width:1920px;height:1080px;transform-origin:0 0;transform:scale(var(--k));overflow:hidden;background:#0E1430;border-radius:calc(14px/var(--k));
  transition:left .75s var(--ease),top .75s var(--ease),transform .75s var(--ease),border-radius .75s var(--ease)}
.scr .poster,.scr iframe{position:absolute;left:0;top:0;width:1920px;height:1080px;border:0;display:block}
.scr iframe{pointer-events:none;background:transparent;opacity:0;transition:opacity .5s ease}
.scr iframe.ld{opacity:1}
.scr .miss{position:absolute;left:0;right:0;bottom:0;height:330px;display:none;align-items:center;gap:50px;padding:0 90px;color:#fff;
  background:linear-gradient(transparent,rgba(10,8,20,.82) 45%)}
.scr .miss i{display:grid;place-items:center;flex:none;width:170px;height:170px;border-radius:50px;background:var(--mc,#2B2F57)}
.scr .miss .ic{width:96px;height:96px}
.scr .miss b{font:800 90px/1.2 var(--sans)}.scr .miss span{display:block;font:600 46px/1.4 var(--sans);opacity:.9}
.scr.missing+.shield{display:none}
.scr.missing .miss{display:flex}.scr.missing iframe{display:none}
.scr.full{left:0!important;top:0!important;transform:none;border-radius:0;z-index:50}
.scr.full iframe{pointer-events:auto;opacity:1}
.shield{position:absolute;border:0;padding:0;margin:0;background:transparent;cursor:zoom-in;border-radius:14px;display:flex;align-items:flex-end;justify-content:flex-end}
.shield span{display:inline-flex;align-items:center;gap:12px;margin:0 22px 22px 0;padding:12px 22px 12px 16px;border-radius:999px;background:rgba(28,42,85,.9);color:#fff;font:700 24px/1 var(--sans);
  box-shadow:0 10px 24px rgba(0,0,0,.3);transition:transform .25s var(--ease),background-color .2s}
.shield span .ic{width:28px;height:28px}
.shield:hover span{transform:scale(1.06);background:var(--blue)}
.shield:focus-visible{outline:5px solid var(--sun);outline-offset:6px}
.viewing .shield{display:none}
.feat{display:flex;flex-direction:column;gap:22px}
.feat p{display:flex;align-items:center;gap:18px;font:700 30px/1.3 var(--sans)}
.feat i{display:grid;place-items:center;flex:none;width:58px;height:58px;border-radius:18px;background:var(--fc,#fff);color:#fff}
.feat .ic{width:32px;height:32px}
'''

def screen(sid, src, poster, x, y, k, label, icn, mc):
    w, h = round(1920 * k), round(1080 * k)
    return (f'<div class="scr" inert style="left:{x}px;top:{y}px;--k:{k}"><img class="poster" src="{poster}" alt="">'
            f'<iframe data-src="{src}" tabindex="-1" title="{label}" loading="lazy"></iframe>'
            f'<div class="miss" style="--mc:{mc}"><i>{icon(icn)}</i><div><b>{label}</b><span>ตัวอย่างนี้กำลังทำ · จะเล่นที่จอนี้เมื่อพร้อม</span></div></div></div>'
            f'<button class="shield ia" type="button" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px" aria-label="เปิด {label} เต็มจอ"><span>{icon("i-expand")}แตะเพื่อเปิดเต็มจอ</span></button>')

def feats(items, col):
    return '<div class="feat">' + ''.join(f'<p><i style="background:{c or col}">{icon(ic)}</i>{t}</p>' for ic, t, c in items) + '</div>'

SAMPLE_JS = r'''
(function(){function samp(id){function el(){var s=document.querySelector('#'+id+' .scr');return {s:s,f:s.querySelector('iframe')};}
  return {enter:function(){var o=el();clearTimeout(o.s.__t);if(o.f.__on)return;o.f.__on=1;o.s.classList.remove('missing');var u=o.f.getAttribute('data-src');
      function go(){o.f.onload=function(){if(o.f.__on)o.f.classList.add('ld');};o.f.src=u;}
      if(location.protocol==='file:'){go();return;}
      fetch(u,{method:'HEAD',cache:'no-store'}).then(function(r){if(!o.f.__on)return;if(r.ok)go();else o.s.classList.add('missing');}).catch(function(){o.s.classList.add('missing');});},
    leave:function(){var o=el();o.s.__t=setTimeout(function(){o.f.__on=0;o.f.classList.remove('ld');o.f.removeAttribute('src');o.f.src='about:blank';},700);}};}
  ['calc','history','stats','school'].forEach(function(id){window.__hooks[id]=samp(id);});})();
'''

# ---------------------------------------------------------------------------------------------------
# Samples 1 · calculus: section intro (four big cards), then a laptop opens on the live calculus lesson.
parab = 'M60 520 C260 120 520 60 760 300 S1100 760 1240 520'
add(id='calc', steps=1, title='ตัวอย่างผลงาน: แคลคูลัส', bg='#EEE9FF', light=True, noclick=True,
    shapes={'': {'cols': ['#8B6CF6', '#3D7BFF', '#FFC83D'], 'op': .14, 'seed': 52, 'n': 5}},
    html=f'''
<i class="gp" aria-hidden="true"></i>
<svg class="curve" viewBox="0 0 1300 800" aria-hidden="true"><path class="cv" pathLength="1" d="{parab}"/><g class="tan"><line x1="-170" y1="0" x2="170" y2="0"/><circle r="12"/></g></svg>
<p class="r x1 k" style="left:110px;top:150px;color:#6A4CE0;--i:0">ตัวอย่างผลงานหลายแบบ</p>
<h1 class="r x1 h2 dk" style="left:106px;top:194px;width:1700px;--i:1">4 งาน 4 หน้าตา · แตะจอแล้วลองได้จริง</h1>
<p class="f1 k" style="left:110px;top:120px;color:#6A4CE0;--d:.5s">ตัวอย่าง 1 · คณิตศาสตร์ ม.ปลาย</p>
<h1 class="f1 h2 dk" style="left:106px;top:164px;width:640px;--d:.6s">แคลคูลัส<br>ที่จับต้องได้</h1>
<div class="f1" style="left:110px;top:440px;width:620px;--d:.8s">{feats([('i-motion', 'ลากจุด เส้นตัดหมุนเป็นเส้นสัมผัส', None), ('i-bar', 'พื้นที่ใต้โค้ง เติมทีละแท่ง', 'var(--blue)'), ('i-check', 'ตอบบนจอ ตรวจได้ทันที', 'var(--mint)')], 'var(--lilac)')}</div>
<div class="lap" aria-hidden="true"><div class="lid"></div><div class="base"></div></div>
{screen('calc', '../samples/calculus/index.html', 'img/sample-calc.webp', 806, 236, .5, 'แคลคูลัส', 'i-func', '#5B3FC4')}
''',
    css=RAIL_CSS + SCR_CSS + r'''
#calc .gp{left:0;top:0;width:1920px;height:1080px;background-image:linear-gradient(rgba(139,108,246,.12) 2px,transparent 2px),linear-gradient(90deg,rgba(139,108,246,.12) 2px,transparent 2px);background-size:80px 80px}
#calc .curve{left:300px;top:160px;width:1300px;height:800px;opacity:.5;transition:opacity .6s}
#calc .cv{fill:none;stroke:#8B6CF6;stroke-width:6;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1}
.slide.on#calc .cv{animation:cvd 2.4s ease-out .3s forwards}@keyframes cvd{to{stroke-dashoffset:0}}
#calc .tan{offset-path:path("M60 520 C260 120 520 60 760 300 S1100 760 1240 520");offset-rotate:auto;animation:tanm 9s ease-in-out 2.4s infinite alternate;opacity:0}
.slide.on#calc .tan{opacity:1;transition:opacity .4s 2.4s}
#calc .tan line{stroke:var(--tomato);stroke-width:6;stroke-linecap:round}#calc .tan circle{fill:var(--tomato)}
@keyframes tanm{from{offset-distance:4%}to{offset-distance:96%}}
[data-s="calc"].ge1 #calc .curve{opacity:.22}
#calc .lap{left:776px;top:206px;width:1020px;height:640px;perspective:2200px}
#calc .lid{position:absolute;inset:0;border-radius:28px;background:#1C2A55;box-shadow:0 40px 80px rgba(40,20,110,.3);transform-origin:50% 100%;transform:rotateX(-88deg);opacity:0;transition:transform .2s,opacity .2s}
#calc .base{position:absolute;left:-70px;right:-70px;bottom:-30px;height:34px;border-radius:0 0 30px 30px;background:#9AA6C8;opacity:0;transform:scaleX(.6);transition:transform .2s,opacity .2s}
#calc .base::before{content:"";position:absolute;left:44%;right:44%;top:0;height:10px;border-radius:0 0 10px 10px;background:#7E8BB3}
[data-s="calc"].ge1 #calc .lid{transform:none;opacity:1;transition:transform 1s cubic-bezier(.3,.8,.25,1) .25s,opacity .2s .2s}
[data-s="calc"].ge1 #calc .base{transform:none;opacity:1;transition:transform .6s var(--ease) .1s,opacity .2s .1s}
#calc .scr,#calc .shield{opacity:0;transition:opacity .2s,left .75s var(--ease),top .75s var(--ease),transform .75s var(--ease)}
[data-s="calc"].ge1 #calc .scr,[data-s="calc"].ge1 #calc .shield{opacity:1;transition:opacity .5s ease 1.05s,left .75s var(--ease),top .75s var(--ease),transform .75s var(--ease),border-radius .75s}
''',
    js=SAMPLE_JS)

# ---------------------------------------------------------------------------------------------------
# Samples 2 · history: a cinema. The projector beam falls on the screen; dust drifts in the light.
seats = ''.join(f'<i style="left:{x}px;top:{y}px;width:{w}px"></i>' for x, y, w in
                [(k * 150 - 40 + (r % 2) * 75, 930 + r * 60, 130) for r in range(3) for k in range(14)])
dust = ''.join(f'<i style="left:{x}px;top:{y}px;--dd:{d}s;--dl:{dl}s"></i>' for x, y, d, dl in
               [(900, 700, 9, 0), (1040, 640, 11, -3), (1200, 760, 8, -5), (1350, 690, 12, -1), (980, 820, 10, -7), (1280, 860, 9, -2), (1120, 900, 13, -6), (1450, 800, 10, -4)])
add(id='history', steps=0, title='ตัวอย่างผลงาน: ประวัติศาสตร์อยุธยา', bg='#24160F', noclick=True,
    shapes={'': {'cols': ['#3A2418', '#F2553C'], 'op': .25, 'seed': 61, 'n': 3}},
    html=f'''
<i class="beam" aria-hidden="true"></i><div class="dust" aria-hidden="true">{dust}</div>
<i class="curtain l" aria-hidden="true"></i><i class="curtain r" aria-hidden="true"></i>
<i class="frame" aria-hidden="true"></i>
{screen('history', '../samples/history/index.html', 'img/sample-history.webp', 690, 130, .58, 'อยุธยา', 'i-map', '#7A2E1C')}
<div class="seats" aria-hidden="true">{seats}</div>
<p class="r k" style="left:110px;top:150px;color:#FFB59E;--i:0">ตัวอย่าง 2 · ประวัติศาสตร์</p>
<h1 class="r h2 lt" style="left:106px;top:194px;width:560px;--i:1">อยุธยา<br>แบบภาพยนตร์</h1>
<div class="r lt" style="left:110px;top:470px;width:560px;--i:3">{feats([('i-map', 'แผนที่ซูมจากโลกถึงเกาะเมือง', None), ('i-video', 'ภาพจริง มีเครดิตทุกภาพ', 'var(--sun)'), ('i-mic', 'เสียงบรรยาย + ซับ', 'var(--mint)')], 'var(--tomato)')}</div>
''',
    css=r'''
#history .beam{left:900px;top:-60px;width:1000px;height:1000px;background:#FFE3B0;opacity:.08;clip-path:polygon(46% 0,54% 0,100% 82%,0 82%);animation:flick 5s steps(1) infinite}
@keyframes flick{0%{opacity:.08}40%{opacity:.095}42%{opacity:.07}70%{opacity:.09}}
#history .dust i{position:absolute;width:6px;height:6px;border-radius:50%;background:#FFE3B0;opacity:.0;animation:dust var(--dd) linear var(--dl) infinite}
@keyframes dust{0%{transform:translate(0,0);opacity:0}20%{opacity:.6}100%{transform:translate(40px,-420px);opacity:0}}
#history .curtain{top:0;width:110px;height:900px;background:repeating-linear-gradient(90deg,#7A2E1C 0 30px,#8E3A25 30px 60px);box-shadow:inset 0 -30px 40px rgba(0,0,0,.3);transition:transform 1.2s cubic-bezier(.5,0,.2,1)}
#history .curtain.l{left:600px;transform-origin:0 0}#history .curtain.r{left:1812px;transform-origin:100% 0}
#history .curtain{transform:scaleX(4)}
.slide.on#history .curtain{transform:scaleX(1);transition:transform 1.3s cubic-bezier(.5,0,.2,1) .2s}
#history .frame{left:676px;top:116px;width:1142px;height:654px;border-radius:20px;background:#120B07;box-shadow:0 0 0 4px #5A3A28,0 30px 80px rgba(0,0,0,.5)}
#history .seats i{position:absolute;height:90px;border-radius:40px 40px 10px 10px;background:#160D08}
#history .seats{position:absolute;left:0;top:0}
'''
)

# ---------------------------------------------------------------------------------------------------
# Samples 3 · statistics (Unit 4): a classroom TV; pupils in front raise their hands now and then.
kids_row = ''.join(kid_back(k, 'loop', 130, f'--ld:{(k*1.7)%5:.1f}s', bow=k in (1, 4)) for k in range(6))
add(id='stats', steps=0, title='ตัวอย่างผลงาน: สถิติ ม.1', bg='#CDEFE0', light=True, noclick=True,
    shapes={'': {'cols': ['#18B07F', '#FFC83D', '#FFFFFF'], 'op': .25, 'seed': 71, 'n': 4}},
    html=f'''
<i class="wall" aria-hidden="true"></i>
<i class="tv" aria-hidden="true"></i>
{screen('stats', '../samples/statistics/index.html', 'img/u4-00.webp', 760, 150, .52, 'สถิติ ม.1', 'i-bar', '#0E7A55')}
<p class="r k" style="left:110px;top:150px;color:#0B7A53;--i:0">ตัวอย่าง 3 · คณิตศาสตร์ ม.1 ห้อง EP</p>
<h1 class="r h2 dk" style="left:106px;top:194px;width:600px;--i:1">สถิติ ทั้งบท<br>67 หน้า</h1>
<div class="r dk" style="left:110px;top:470px;width:600px;--i:3">{feats([('i-hand', 'เด็กตอบบนจอได้ 9 แบบ', None), ('i-book', 'คู่มือครูทุกหน้า', 'var(--blue)'), ('i-lock', 'เฉลยทั้งเล่ม ล็อกรหัส', 'var(--navy)')], 'var(--mint)')}</div>
<div class="kids krow" style="left:744px;top:806px;--gap:50px">{kids_row}</div>
''',
    css=KID_CSS + r'''
#stats .wall{left:0;top:860px;width:1920px;height:220px;background:#B4E4CF}
#stats .tv{left:736px;top:126px;width:1046px;height:610px;border-radius:30px;background:#1C2A55;box-shadow:0 30px 70px rgba(10,60,40,.3)}
#stats .tv::after{content:"";position:absolute;left:46%;width:8%;top:610px;height:60px;background:#1C2A55}
#stats .scr{clip-path:inset(0 0 0 0 round 20px)}
#stats .kidb .arm{--a0:165deg;--a1:10deg;transform:rotate(165deg)}
.slide.on#stats .kidb.loop .arm{animation:hand 5s ease-in-out var(--ld) infinite}
@keyframes hand{0%,55%,100%{transform:rotate(165deg);opacity:0}62%,92%{opacity:1}65%,90%{transform:rotate(10deg)}}
.slide.on#stats .kidb.l.loop .arm{animation-name:handl}
@keyframes handl{0%,55%,100%{transform:rotate(-165deg);opacity:0}62%,92%{opacity:1}65%,90%{transform:rotate(-10deg)}}
'''
)

# ---------------------------------------------------------------------------------------------------
# Samples 4 · school: a meeting room; the projector screen rolls down and the pitch deck lights up.
add(id='school', steps=0, title='ตัวอย่างผลงาน: งานโรงเรียน', bg='#1C2A55', noclick=True,
    shapes={'': {'cols': ['#2B3D7A', '#3D7BFF'], 'op': .35, 'seed': 81, 'n': 4}},
    html=f'''
<i class="rod" aria-hidden="true"></i><i class="sheet" aria-hidden="true"></i>
{screen('school', '../samples/school/pitch/index.html', 'img/pitch-0.webp', 760, 150, .52, 'งานโรงเรียน', 'i-present', '#22306A')}
<svg class="table" viewBox="0 0 1920 260" aria-hidden="true"><path d="M180 120 Q960 40 1740 120 L1920 260 L0 260 Z" fill="#101A3C"/>
  {''.join(f'<rect x="{x}" y="{y}" width="120" height="150" rx="40" fill="#0B1330"/>' for x, y in [(260, 140), (520, 120), (800, 110), (1080, 110), (1360, 120), (1620, 140)])}</svg>
<p class="r k" style="left:110px;top:150px;color:#9FC0FF;--i:0">ตัวอย่าง 4 · งานโรงเรียน</p>
<h1 class="r h2 lt" style="left:106px;top:194px;width:640px;--i:1">เว็บโรงเรียน<br>+ สไลด์นำเสนอ</h1>
<div class="r lt" style="left:110px;top:470px;width:620px;--i:3">{feats([('i-web', 'เว็บโรงเรียน 15 หน้า ไทย/อังกฤษ', None), ('i-present', 'สไลด์นำเสนอ + บทพูด', 'var(--lilac)'), ('i-motion', 'วัดความเร็วจริงด้วย Lighthouse', 'var(--mint)')], 'var(--blue)')}</div>
''',
    css=r'''
#school .rod{left:730px;top:110px;width:1100px;height:24px;border-radius:12px;background:#3D4C80}
#school .sheet{left:746px;top:134px;width:1068px;height:620px;background:#F4F6FB;transform-origin:50% 0;transform:scaleY(0);transition:transform .2s}
.slide.on#school .sheet{transform:none;transition:transform 1s cubic-bezier(.45,0,.2,1) .2s}
#school .scr,#school .shield{opacity:0;transition:opacity .2s,left .75s var(--ease),top .75s var(--ease),transform .75s var(--ease)}
.slide.on#school .scr,.slide.on#school .shield{opacity:1;transition:opacity .6s ease 1.1s,left .75s var(--ease),top .75s var(--ease),transform .75s var(--ease),border-radius .75s}
#school .table{left:0;top:820px;width:1920px;height:260px}
'''
)

# ---------------------------------------------------------------------------------------------------
# S8 · styles: the same slide turns like a prism: A modern clean -> B notebook -> C infographic -> school theme.
def picto(scale=1.0, cls=''):
    rows = [('จ.', 3), ('อ.', 2.5), ('พ.', 4), ('พฤ.', 2), ('ศ.', 5)]
    out = ''
    for d, n in rows:
        ic = ''.join(f'<i>{cup(34)}</i>' for _ in range(int(n))) + ('<i class="h">' + cup(34) + '</i>' if n % 1 else '')
        out += f'<div class="pr"><span>{d}</span><div>{ic}</div></div>'
    return f'<div class="picto {cls}">{out}</div>'
crest = ('<svg class="crest" viewBox="0 0 100 120" aria-hidden="true"><path d="M50 4 L94 18 V60 C94 90 72 108 50 116 C28 108 6 90 6 60 V18 Z" fill="#1F6B4A" stroke="#E2B33C" stroke-width="6"/>'
         '<path d="M26 52 Q38 46 50 54 Q62 46 74 52 V84 Q62 78 50 86 Q38 78 26 84 Z" fill="#fff"/><path d="M50 54 V86" stroke="#1F6B4A" stroke-width="3"/>'
         '<path d="M50 18 l5 10 11 1 -8 7 3 11 -11 -6 -11 6 3 -11 -8 -7 11 -1z" fill="#E2B33C"/></svg>')
choices = lambda cls: f'<div class="chs {cls}"><p>A<b>150</b></p><p>B<b>160</b></p><p class="ok">C<b>165</b></p><p>D<b>170</b></p></div>'
faceA = f'''<div class="fA"><i class="m1"></i><i class="m2"></i><p class="kk">บทที่ 4 · แผนภูมิรูปภาพ</p><p class="tt">ชานมไข่มุก ขายได้กี่แก้ว?</p>
  <div class="cardA">{picto()}<p class="key">{cup(26)} = 10 แก้ว</p></div>{choices('cA')}<p class="ansA">✓ 16.5 × 10 = <b>165</b> แก้ว</p></div>'''
faceB = f'''<div class="fB"><i class="holes"></i><i class="margin"></i><p class="kk">practice · pictograms</p><p class="tt"><span>ชานมไข่มุก</span> ขายได้กี่แก้ว?</p>
  <div class="cardB">{picto()}<p class="key">{cup(26)} = 10 cups</p></div>{choices('cB')}<i class="tape tp1"></i><p class="sticky">16.5 × 10 = 165</p><i class="tape tp2"></i></div>'''
faceC = f'''<div class="fC"><div class="lc"><p class="kk">ชานมไข่มุก 1 สัปดาห์</p><p class="big">165</p><p class="u">แก้ว</p><p class="eq">16.5 ไอคอน × 10</p></div>
  <div class="rcol">{''.join(f'<div class="hb"><span>{d}</span><i style="width:{v*9}px;background:{c}"></i><b>{v}</b></div>' for d, v, c in [('จ.', 30, '#3D7BFF'), ('อ.', 25, '#8B6CF6'), ('พ.', 40, '#F2553C'), ('พฤ.', 20, '#18B07F'), ('ศ.', 50, '#FFC83D')])}
  <p class="src">หน่วย: แก้ว · ข้อมูลตัวอย่าง</p></div></div>'''
faceS = f'''<div class="fS"><div class="band">{crest}<p>โรงเรียนบ้านสวนวิทยา<small>คณิตศาสตร์ ม.1 · บทที่ 4</small></p></div><p class="tt">ชานมไข่มุก ขายได้กี่แก้ว?</p>
  <div class="cardS">{picto()}<p class="key">{cup(26)} = 10 แก้ว</p></div>{choices('cS')}<p class="ansS">16.5 × 10 = <b>165</b> แก้ว</p><div class="foot">มุ่งมั่น · ใฝ่รู้ · มีน้ำใจ</div></div>'''
tabs = [('A', 'สะอาดทันสมัย'), ('B', 'สมุดจด'), ('C', 'อินโฟกราฟิก'), ('★', 'ธีมโรงเรียน +990')]
add(id='styles', steps=3, title='สไตล์', bg='#FFF1C7', light=True,
    shapes={'': {'cols': ['#FFC83D', '#8B6CF6', '#F2553C'], 'op': .2, 'seed': 91, 'n': 6}},
    html=f'''
<p class="r k" style="left:110px;top:70px;color:#C2410C;--i:0">สไตล์ · ผู้ฟังโหวต</p>
<h1 class="r h2 dk" style="left:106px;top:108px;width:1500px;font-size:66px;--i:1">เนื้อหาเดียว เลือกหน้าตาได้</h1>
<div class="r prism" style="left:400px;top:226px;--i:2"><div class="cube">
  <div class="fc f0">{faceA}</div><div class="fc f1x">{faceB}</div><div class="fc f2x">{faceC}</div><div class="fc f3x">{faceS}</div></div></div>
<div class="r tabs" style="left:400px;top:890px;--i:3"><i class="hl"></i>{''.join(f'<p class="tb tab{k}"><b>{a}</b>{t}</p>' for k, (a, t) in enumerate(tabs))}</div>
<div class="r sw" style="left:150px;top:300px;--i:3"><p>สี</p>{''.join(f'<i class="s{k}"></i>' for k in range(4))}</div>
<div class="r fontx" style="left:1570px;top:300px;--i:3"><p>ตัวอักษร</p><b class="fa">Aa ก</b></div>
<i class="f3 stamp" style="left:1420px;top:200px">{crest}</i>
''',
    css=r'''
#styles .prism{width:1120px;height:630px;perspective:2400px}
#styles .cube{position:absolute;inset:0;transform-style:preserve-3d;transform:translateZ(-560px) rotateY(0deg);transition:transform 1s cubic-bezier(.5,0,.2,1)}
#styles .fc{position:absolute;inset:0;border-radius:26px;overflow:hidden;backface-visibility:hidden;box-shadow:0 30px 70px rgba(120,70,0,.25);visibility:hidden;transition:visibility 0s linear 1s}
#styles .f0{transform:rotateY(0deg) translateZ(560px)}#styles .f1x{transform:rotateY(90deg) translateZ(560px)}
#styles .f2x{transform:rotateY(180deg) translateZ(560px)}#styles .f3x{transform:rotateY(270deg) translateZ(560px)}
[data-s="styles"][data-step="0"] #styles .f0,[data-s="styles"][data-step="1"] #styles .f1x,[data-s="styles"][data-step="2"] #styles .f2x,[data-s="styles"][data-step="3"] #styles .f3x{visibility:visible;transition:visibility 0s}
[data-s="styles"][data-step="1"] #styles .f0,[data-s="styles"][data-step="2"] #styles .f1x,[data-s="styles"][data-step="3"] #styles .f2x,
[data-s="styles"][data-dir="back"][data-step="0"] #styles .f1x,[data-s="styles"][data-dir="back"][data-step="1"] #styles .f2x,[data-s="styles"][data-dir="back"][data-step="2"] #styles .f3x{visibility:visible}
[data-s="styles"][data-step="1"] #styles .cube{transform:translateZ(-560px) rotateY(-90deg)}
[data-s="styles"][data-step="2"] #styles .cube{transform:translateZ(-560px) rotateY(-180deg)}
[data-s="styles"][data-step="3"] #styles .cube{transform:translateZ(-560px) rotateY(-270deg)}
#styles .fc>div{position:absolute;inset:0}
#styles .fc p{margin:0}
#styles .picto .pr{display:flex;align-items:center;height:52px;border-bottom:2px dashed rgba(28,42,85,.12)}
#styles .picto .pr span{width:56px;font:700 22px/1 var(--sans)}
#styles .picto .pr div{display:flex;gap:6px}
#styles .picto i{display:block;width:34px;height:51px}#styles .picto i svg{width:34px;height:51px;display:block}#styles .picto i.h{width:17px;overflow:hidden}
#styles .key{display:flex;align-items:center;gap:8px;margin-top:10px!important;font:700 20px/1 var(--sans);color:#5B6785}
#styles .key svg{width:26px;height:39px}
#styles .chs{position:absolute;display:grid;grid-template-columns:1fr 1fr;gap:16px}
#styles .chs p{display:flex;align-items:center;gap:14px;padding:14px 18px;font:800 22px/1 var(--sans)}
#styles .chs b{font:800 32px/1 var(--disp)}
/* A · modern clean */
#styles .fA{background:#F6F7FB;color:var(--navy)}
#styles .fA .m1{position:absolute;right:-120px;top:-140px;width:460px;height:460px;border-radius:50%;background:rgba(139,108,246,.18)}
#styles .fA .m2{position:absolute;left:-100px;bottom:-160px;width:380px;height:380px;border-radius:50%;background:rgba(61,123,255,.14)}
#styles .fA .kk{position:absolute;left:52px;top:40px;font:800 20px/1 var(--sans);color:#3D7BFF;letter-spacing:.04em}
#styles .fA .tt{position:absolute;left:50px;top:72px;font:800 44px/1.3 var(--sans)}
#styles .cardA{position:absolute;left:50px;top:160px;width:520px;height:420px;background:#fff;border-radius:22px;padding:18px 26px;box-shadow:0 14px 34px rgba(28,42,85,.1)}
#styles .cA{left:610px;top:170px;width:460px}
#styles .cA p{background:#fff;border-radius:16px;box-shadow:0 0 0 2px #E1E6F0;color:#3D7BFF}#styles .cA b{color:var(--navy)}
#styles .cA .ok{box-shadow:0 0 0 3px #18B07F;background:#E3F7EF;color:#18B07F}
#styles .ansA{position:absolute;left:610px;top:390px;width:460px;padding:18px 24px;border-radius:16px;background:var(--navy);color:#fff;font:700 28px/1 var(--sans)}
#styles .ansA b{color:var(--sun)}
/* B · notebook */
#styles .fB{background:#FFFBEF;background-image:radial-gradient(#E9DDC2 2px,transparent 2px);background-size:30px 30px;color:#2B2B2B}
#styles .fB .holes{position:absolute;left:18px;top:0;bottom:0;width:22px;background:radial-gradient(circle,#E9DDC2 9px,transparent 10px) 0 30px/22px 90px repeat-y}
#styles .fB .margin{position:absolute;left:62px;top:0;bottom:0;width:3px;background:#F2553C;opacity:.5}
#styles .fB .kk{position:absolute;left:96px;top:34px;font:400 30px/1 var(--hand);color:#F2553C}
#styles .fB .tt{position:absolute;left:94px;top:74px;font:800 44px/1.3 var(--sans)}
#styles .fB .tt span{background:linear-gradient(transparent 55%,#FFE066 55%,#FFE066 90%,transparent 90%)}
#styles .cardB{position:absolute;left:96px;top:168px;width:480px;height:410px;padding:16px 22px;border:3px solid #2B2B2B;border-radius:6px;background:#fff;box-shadow:6px 6px 0 #2B2B2B}
#styles .cB{left:630px;top:170px;width:420px}
#styles .cB p{background:transparent;color:#2B2B2B;font-family:var(--hand);font-size:30px}#styles .cB b{font-family:var(--hand);font-weight:400;font-size:40px}
#styles .cB .ok{border:4px solid #F2553C;border-radius:50% 46% 52% 44%;padding:10px 16px}
#styles .tape{position:absolute;width:120px;height:34px;background:rgba(139,108,246,.35);transform:rotate(-8deg)}
#styles .tp1{left:690px;top:372px}#styles .tp2{left:930px;top:520px;transform:rotate(12deg);background:rgba(24,176,127,.35)}
#styles .sticky{position:absolute;left:670px;top:390px;width:360px;padding:34px 26px;background:#FFE066;transform:rotate(-3deg);font:400 44px/1 var(--hand);color:#2B2B2B;box-shadow:0 12px 20px rgba(0,0,0,.12)}
/* C · infographic */
#styles .fC{background:#fff;display:grid;grid-template-columns:420px 1fr}
#styles .fC .lc{background:var(--navy);color:#fff;padding:50px 46px}
#styles .fC .kk{font:700 26px/1.3 var(--sans);color:#9FC0FF}
#styles .fC .big{font:800 210px/1 var(--disp);color:var(--sun);margin-top:40px!important;letter-spacing:-.04em}
#styles .fC .u{font:800 48px/1 var(--sans)}
#styles .fC .eq{margin-top:40px!important;padding:12px 18px;border-radius:12px;background:rgba(255,255,255,.12);font:700 26px/1 var(--sans);display:inline-block}
#styles .rcol{padding:70px 50px 0 50px;display:flex;flex-direction:column;gap:22px}
#styles .hb{display:flex;align-items:center;gap:18px}
#styles .hb span{width:60px;font:800 30px/1 var(--sans);color:var(--navy)}
#styles .hb i{display:block;height:58px;border-radius:0 18px 18px 0}
#styles .hb b{font:800 40px/1 var(--disp);color:var(--navy)}
#styles .src{font:600 20px/1 var(--sans);color:#8A93AE;margin-top:6px!important}
/* school theme */
#styles .fS{background:#FBF8EE;color:#173F2E}
#styles .band{position:absolute;left:0;top:0;right:0;height:110px;background:#1F6B4A;display:flex;align-items:center;gap:20px;padding:0 40px;color:#fff;border-bottom:8px solid #E2B33C}
#styles .band .crest{width:70px;height:84px}
#styles .band p{font:800 32px/1.2 var(--sans)}#styles .band small{display:block;font:600 20px/1.3 var(--sans);color:#F3DA8C}
#styles .fS .tt{position:absolute;left:50px;top:136px;font:800 40px/1.3 var(--sans)}
#styles .cardS{position:absolute;left:50px;top:206px;width:520px;height:350px;background:#fff;border-radius:18px;padding:10px 24px;border:3px solid #E2B33C}
#styles .cardS .pr{height:46px}
#styles .cS{left:610px;top:220px;width:460px}
#styles .cS p{background:#fff;border-radius:14px;box-shadow:0 0 0 2px #D9E3D5;color:#1F6B4A}
#styles .cS .ok{background:#1F6B4A;color:#fff;box-shadow:0 0 0 3px #E2B33C}
#styles .ansS{position:absolute;left:610px;top:430px;width:460px;padding:16px 24px;border-radius:14px;background:#E2B33C;color:#173F2E;font:800 28px/1 var(--sans)}
#styles .foot{position:absolute;left:0;right:0;bottom:0;height:44px;background:#1F6B4A;color:#F3DA8C;font:700 20px/44px var(--sans);text-align:center}
/* tabs, swatches, font sample, stamp */
#styles .tabs{display:flex;gap:12px;width:1120px}
#styles .tb{position:relative;z-index:1;flex:1;display:flex;align-items:center;justify-content:center;gap:12px;height:66px;border-radius:999px;font:700 26px/1 var(--sans);color:#6B5420;transition:color .4s}
#styles .tb b{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:rgba(28,42,85,.08);font:800 22px/1 var(--sans)}
#styles .tabs .hl{position:absolute;left:0;top:0;width:271px;height:66px;border-radius:999px;background:var(--navy);transition:transform .8s var(--ease);box-shadow:0 10px 24px rgba(28,42,85,.25)}
[data-s="styles"][data-step="0"] #styles .tab0,[data-s="styles"][data-step="1"] #styles .tab1,[data-s="styles"][data-step="2"] #styles .tab2,[data-s="styles"][data-step="3"] #styles .tab3{color:#fff}
[data-s="styles"][data-step="0"] #styles .tab0 b,[data-s="styles"][data-step="1"] #styles .tab1 b,[data-s="styles"][data-step="2"] #styles .tab2 b,[data-s="styles"][data-step="3"] #styles .tab3 b{background:var(--sun);color:var(--navy)}
[data-s="styles"][data-step="1"] #styles .tabs .hl{transform:translateX(283px)}[data-s="styles"][data-step="2"] #styles .tabs .hl{transform:translateX(566px)}[data-s="styles"][data-step="3"] #styles .tabs .hl{transform:translateX(849px)}
#styles .sw{display:flex;flex-direction:column;align-items:center;gap:16px;width:110px}
#styles .sw p,#styles .fontx p{font:700 22px/1 var(--sans);color:#6B5420}
#styles .sw i{display:block;width:70px;height:70px;border-radius:50%;box-shadow:0 8px 18px rgba(0,0,0,.15);transition:background-color .8s ease calc(var(--q,0)*.08s)}
#styles .sw .s1{--q:1}#styles .sw .s2{--q:2}#styles .sw .s3{--q:3}
#styles .s0{background:#3D7BFF}#styles .s1{background:#8B6CF6}#styles .s2{background:#F6F7FB}#styles .s3{background:#1C2A55}
[data-s="styles"].ge1 #styles .s0{background:#F2553C}[data-s="styles"].ge1 #styles .s1{background:#FFE066}[data-s="styles"].ge1 #styles .s2{background:#FFFBEF}[data-s="styles"].ge1 #styles .s3{background:#2B2B2B}
[data-s="styles"].ge2 #styles .s0{background:#1C2A55}[data-s="styles"].ge2 #styles .s1{background:#FFC83D}[data-s="styles"].ge2 #styles .s2{background:#F2553C}[data-s="styles"].ge2 #styles .s3{background:#18B07F}
[data-s="styles"].ge3 #styles .s0{background:#1F6B4A}[data-s="styles"].ge3 #styles .s1{background:#E2B33C}[data-s="styles"].ge3 #styles .s2{background:#FBF8EE}[data-s="styles"].ge3 #styles .s3{background:#173F2E}
#styles .fontx{display:flex;flex-direction:column;align-items:center;gap:16px;width:200px}
#styles .fa{font:800 76px/1.3 var(--sans);color:var(--navy);white-space:nowrap;transition:opacity .3s}
[data-s="styles"].ge1 #styles .fa{font-family:var(--hand);font-weight:400;font-size:64px}
[data-s="styles"].ge2 #styles .fa{font-family:var(--disp);font-weight:800;color:#F2553C}
[data-s="styles"].ge3 #styles .fa{font-family:var(--sans);color:#1F6B4A}
#styles .stamp{width:150px;height:180px;z-index:4;transform:scale(2.4) rotate(-14deg);opacity:0;transition:transform .15s,opacity .15s}
#styles .stamp svg{width:100%;height:100%;filter:drop-shadow(0 12px 18px rgba(0,0,0,.25))}
[data-s="styles"].ge3 #styles .stamp{opacity:1;transform:rotate(-8deg);transition:transform .45s cubic-bezier(.3,1.3,.5,1) 1s,opacity .2s ease 1s}
''')

# ---------------------------------------------------------------------------------------------------
# S9 · work: 67 real Unit 4 slides assemble into a mosaic; zoom into one; then the Satit site scrolls by itself.
tiles = ''
TW, TH, G, C = 104, 58.5, 8, 10
for k in range(67):
    cx, cy = k % C, k // C
    tiles += f'<i style="left:{cx*(TW+G)}px;top:{cy*(TH+G):.1f}px;background-position:{-cx*TW}px {-cy*TH:.1f}px;--n:{k}"></i>'
ZK = 46; zx, zy = 110 + (ZK % C) * (TW + G), 300 + (ZK // C) * (TH + G)
add(id='work', steps=2, title='ผลงานจริง', bg='#1C2A55',
    shapes={'': {'cols': ['#2B3D7A', '#8B6CF6', '#3D7BFF'], 'op': .3, 'seed': 101, 'n': 5}},
    html=f'''
<p class="r k" style="left:110px;top:120px;color:var(--sun);--i:0">ผลงานจริง</p>
<h1 class="r h2 lt" style="left:106px;top:160px;width:1100px;font-size:68px;--i:1">ของจริง เปิดสอนได้วันนี้</h1>
<div class="mos" style="left:110px;top:300px;width:{C*TW+(C-1)*G}px;height:{7*(TH+G)}px">{tiles}</div>
<img class="zoom" src="img/u4-46.webp" alt="" style="left:{zx}px;top:{zy}px">
<p class="o1 zcap lt" style="left:110px;top:944px;width:1112px;--d:.9s">บทที่ 4 · หน้า 47 จาก 67: “วงกลมทั้งวงคือ 100%”</p>
<div class="brow"><div class="bar"><i></i><i></i><i></i><span>โรงเรียนสาธิต มรภ.เพชรบุรี · เว็บไซต์ใหม่</span></div><div class="pg"><img src="img/satit-page.webp" alt=""></div></div>
<div class="stat s1" style="left:1300px;top:300px"><b><span class="num" data-count="67">0</span></b><p>สไลด์ บทที่ 4 สถิติ ม.1<br><small>พร้อมคู่มือครูและเฉลย</small></p></div>
<div class="stat s2" style="left:1300px;top:520px"><b><span class="num" data-count="100" data-at="2">0</span></b><p>คะแนนความเร็ว<br><small>เว็บโรงเรียนใหม่ · เว็บเดิมได้ 60</small></p></div>
<div class="stat s3" style="left:1300px;top:740px"><b><span class="num" data-count="2.7" data-dec="1" data-from="23.6" data-at="2">23.6</span><em>วิ</em></b><p>เปิดหน้าแรกบนมือถือ<br><small>เดิม 23.6 วินาที · เร็วขึ้นเกือบ 9 เท่า</small></p></div>
<p class="f2 cp lt" style="left:1300px;top:960px;width:560px;--d:.8s">Lighthouse 13.6 · ค่ากลาง 3 รอบ · 25 พ.ย. 2569</p>
<p class="r x1 ld lt" style="left:110px;top:800px;width:1112px;--i:4">ทุกหน้ามีแอนิเมชัน และเครื่องมือให้เด็กตอบบนจอ</p>
''',
    css=r'''
#work .mos i{position:absolute;width:104px;height:58.5px;border-radius:6px;background-image:url(img/u4-sprite.webp);background-size:1040px 409.5px;
  opacity:0;transform:translateY(30px) scale(.6) rotate(-6deg);transition:opacity .15s,transform .15s,filter .5s}
.slide.on#work .mos i{opacity:1;transform:none;transition:opacity .3s ease calc(.25s + var(--n)*16ms),transform .55s var(--ease) calc(.25s + var(--n)*16ms),filter .5s}
[data-s="work"].ge1 #work .mos i,[data-s="work"].ge2 #work .mos i{filter:brightness(.45) saturate(.6)}
#work .zoom{width:104px;height:58.5px;border-radius:1.6px;opacity:0;transform-origin:0 0;transition:transform .2s,opacity .2s;box-shadow:0 30px 80px rgba(0,0,0,.45)}
[data-s="work"][data-step="1"] #work .zoom{opacity:1;transform:translate(calc(110px - var(--zx)),calc(300px - var(--zy))) scale(10.69);transition:transform 1s cubic-bezier(.6,0,.2,1) .15s,opacity .15s}
#work .brow{left:110px;top:300px;width:1112px;height:600px;border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.45);opacity:0;transform:translateY(60px);transition:opacity .2s,transform .2s}
[data-s="work"].ge2 #work .brow{opacity:1;transform:none;transition:opacity .4s ease .2s,transform .8s var(--ease) .2s}
#work .brow .bar{height:52px;background:#EEF1F7;display:flex;align-items:center;gap:10px;padding:0 18px}
#work .brow .bar i{width:14px;height:14px;border-radius:50%;background:#F2553C}#work .brow .bar i+i{background:#FFC83D}#work .brow .bar i+i+i{background:#18B07F}
#work .brow .bar span{margin-left:16px;padding:8px 18px;border-radius:999px;background:#fff;font:600 20px/1 var(--sans);color:#4A5576}
#work .brow .pg{position:absolute;left:0;right:0;top:52px;bottom:0;overflow:hidden}
#work .brow .pg img{width:1112px;display:block}
[data-s="work"].ge2 #work .brow .pg img{animation:sitescroll 16s ease-in-out 1.2s infinite alternate}
@keyframes sitescroll{0%,8%{transform:translateY(0)}92%,100%{transform:translateY(calc(-100% + 548px))}}
#work .stat{width:540px;display:flex;align-items:center;gap:26px;transition:opacity .5s}
#work .stat b{display:flex;align-items:baseline;justify-content:center;min-width:200px;padding:16px 10px;border-radius:26px;background:rgba(255,255,255,.1);font:800 84px/1 var(--disp);color:var(--sun)}
#work .stat em{font:800 34px/1 var(--sans);font-style:normal;margin-left:6px}
#work .stat p{font:700 28px/1.35 var(--sans);color:#fff}
#work .stat small{font:500 21px/1.4 var(--sans);color:rgba(255,255,255,.72)}
#work .s2 b,#work .s3 b{color:#7FE3B9}
#work .stat{opacity:0}.slide.on#work .s1{opacity:1;transition:opacity .5s ease .4s}
[data-s="work"].ge2 #work .s2,[data-s="work"].ge2 #work .s3{opacity:1;transition:opacity .5s ease .5s}
[data-s="work"].ge2 #work .s1{opacity:.45}
#work .zcap{font:700 28px/1.3 var(--sans)}
''' .replace('var(--zx)', f'{zx}px').replace('var(--zy)', f'{zy}px'))
