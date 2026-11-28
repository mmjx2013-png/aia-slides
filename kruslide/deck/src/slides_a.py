# S1-S7: the hook, the lost hours, active students, what we make, and three live demos.
from core import icon
from art import clock, coin, kid_back, cup, CLOCK_CSS, KID_CSS

SLIDES = []
def add(**k): SLIDES.append(k)

# =====================================================================================================
# S1 · night: Sunday 21:00, the teacher is still making slides. Clock spins to 01:30. Then the driving question.
stars = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" style="--tw:{d}s;--td:{dl}s"/>' for x, y, r, d, dl in [
    (40, 50, 2.2, 3.1, 0), (120, 30, 1.6, 2.4, .7), (210, 80, 2.6, 3.6, 1.2), (290, 40, 1.4, 2.8, .3), (80, 150, 1.8, 3.3, 1.9),
    (250, 170, 1.5, 2.6, .9), (160, 120, 1.2, 2.2, 1.5), (310, 120, 2, 3.8, .4), (30, 240, 1.4, 2.9, 2.1), (200, 250, 1.7, 3.2, 1.1),
    (300, 300, 1.3, 2.5, .2), (110, 300, 2.1, 3.5, 1.7)])
night_scene = f'''
<div class="win" aria-hidden="true"><svg class="sky" viewBox="0 0 340 380"><rect width="340" height="380" fill="#0C1434"/>{stars}</svg>
  <i class="moon"></i><i class="mullion v"></i><i class="mullion h"></i></div>
<svg class="room" viewBox="0 0 1920 1080" aria-hidden="true">
  <polygon class="beam" points="1050,606 1112,588 1560,800 1010,800" fill="#FFE7A8"/>
  <rect x="880" y="796" width="1060" height="300" rx="18" fill="#E7B178"/><rect x="880" y="796" width="1060" height="24" rx="12" fill="#F3C894"/>
  <rect x="880" y="1010" width="1060" height="80" fill="#D49A5E"/><rect x="1080" y="870" width="560" height="96" rx="14" fill="#DDA56A"/><rect x="1310" y="904" width="100" height="16" rx="8" fill="#B97E45"/>
  <ellipse cx="1010" cy="800" rx="58" ry="12" fill="#22306A"/><path d="M1010 796 L968 660 L1052 566" fill="none" stroke="#22306A" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><circle cx="968" cy="660" r="11" fill="#22306A"/><g transform="rotate(32 1060 566)"><path d="M1032 548 L1100 548 L1124 604 L1008 604 Z" fill="#F2553C"/><rect x="1040" y="538" width="52" height="16" rx="6" fill="#D9442F"/></g>
  <g class="books"><rect x="1730" y="760" width="170" height="36" rx="6" fill="#3D7BFF"/><rect x="1740" y="726" width="160" height="34" rx="6" fill="#18B07F"/>
  <rect x="1722" y="694" width="166" height="32" rx="6" fill="#FFC83D"/><rect x="1736" y="662" width="156" height="32" rx="6" fill="#8B6CF6"/>
  <path d="M1742 778h150M1750 743h140M1734 710h146M1748 678h136" stroke="rgba(255,255,255,.5)" stroke-width="3"/></g>
  <g class="mug"><path d="M1632 720 h70 v60 a14 14 0 0 1 -14 14 h-42 a14 14 0 0 1 -14 -14z" fill="#F2553C"/><path d="M1702 734 a18 18 0 0 1 0 36" fill="none" stroke="#F2553C" stroke-width="9"/></g>
</svg>
<svg class="steam" viewBox="0 0 80 120" aria-hidden="true"><path d="M20 110 C5 85 35 70 20 45 S25 15 20 5"/><path d="M42 110 C27 85 57 70 42 45 S47 15 42 5"/><path d="M62 110 C47 85 77 70 62 45 S67 15 62 5"/></svg>
<svg class="laptop" viewBox="0 0 470 300" aria-hidden="true">
  <rect x="0" y="0" width="470" height="288" rx="16" fill="#0E1430"/><rect x="12" y="12" width="446" height="264" rx="6" fill="#EEF2FB"/>
  <rect x="12" y="12" width="446" height="26" rx="6" fill="#D5DDF0"/><circle cx="28" cy="25" r="4" fill="#F2553C"/><circle cx="42" cy="25" r="4" fill="#FFC83D"/><circle cx="56" cy="25" r="4" fill="#18B07F"/>
  <rect x="22" y="50" width="70" height="42" rx="4" fill="#fff" stroke="#C9D2E8"/><rect x="30" y="60" width="40" height="5" rx="2" fill="#9AA6C8"/><rect x="30" y="72" width="52" height="4" rx="2" fill="#C9D2E8"/>
  <rect x="22" y="100" width="70" height="42" rx="4" fill="#fff" stroke="#C9D2E8"/><rect x="30" y="110" width="46" height="5" rx="2" fill="#9AA6C8"/><rect x="30" y="122" width="36" height="4" rx="2" fill="#C9D2E8"/>
  <rect x="22" y="150" width="70" height="42" rx="4" fill="#fff" stroke="#3D7BFF" stroke-width="2.5"/>
  <rect x="104" y="50" width="344" height="196" rx="4" fill="#fff"/>
  <rect x="134" y="104" width="284" height="80" rx="6" fill="none" stroke="#B9C3DA" stroke-width="2" stroke-dasharray="7 6"/>
  <text x="276" y="150" text-anchor="middle" font-size="19" font-weight="600" fill="#9AA4BE" font-family="KS">คลิกเพื่อเพิ่มชื่อเรื่อง</text>
  <rect class="caret" x="372" y="134" width="3" height="24" fill="#1C2A55"/>
  <text class="st0" x="22" y="266" font-size="13" font-weight="600" fill="#6A7596" font-family="KS">สไลด์ 3 จาก 67</text>
  <text class="st1" x="22" y="266" font-size="13" font-weight="600" fill="#F2553C" font-family="KS">สไลด์ 5 จาก 67</text>
  <rect x="140" y="257" width="300" height="10" rx="5" fill="#D5DDF0"/><rect class="prog" x="140" y="257" width="300" height="10" rx="5" fill="#3D7BFF"/>
  <path d="M-22 288 H492 L476 300 H-6 Z" fill="#7E8BB3"/>
</svg>
<i class="dim" aria-hidden="true"></i>
'''
add(id='night', steps=2, title='คืนวันอาทิตย์', bg='#172351', shapes={'': {'cols': ['#22306A', '#2A3B7C'], 'op': .55, 'seed': 11, 'n': 5}},
    html=night_scene + clock('ck1', 380, 980, 96) + f'''
<p class="r pill timep lt" style="left:110px;top:150px;--i:0">{icon('i-clock')}<span id="tclock">อาทิตย์ 21:00</span></p>
<h1 class="r x2 h1 lt" style="left:104px;top:240px;width:860px;--i:1">3 ทุ่มแล้ว<br>ครูยังทำสไลด์อยู่</h1>
<div class="f1 x2 lt lost" style="left:110px;top:560px;width:820px"><span class="num" data-count="4.5" data-dec="1" data-at="1" data-delay="250" data-dur="1700">0</span><span class="u">ชั่วโมง<br>หายไปกับสไลด์ของพรุ่งนี้</span></div>
<h1 class="f2 h2 lt" style="left:104px;top:236px;width:900px;font-size:88px">คาบที่เด็กอยากยกมือ<br>ครูต้องแลกด้วยอะไร?</h1>
<p class="f2 ld lt" style="left:110px;top:500px;width:820px;--d:.35s">เก็บคำตอบไว้ในใจ · เราจะเฉลยตอนจบ</p>
<div class="f2 tokens lt" style="left:110px;top:610px;--d:.6s">
  <span><i class="tk tk1">{icon('i-clock')}</i>เวลาครู</span><span><i class="tk tk2">฿</i>ราคา</span><span><i class="tk tk3">{icon('i-hand')}</i>เด็กได้ลงมือ</span></div>
<p class="r cp lt" style="left:110px;top:948px;width:760px;--i:3">ฉากสมมุติประกอบเรื่องเล่า · ตัวเลขชั่วโมงเป็นตัวอย่าง ไม่ใช่ข้อมูลสำรวจ</p>
''',
    css=CLOCK_CSS + KID_CSS + r'''
#night .win{left:1480px;top:100px;width:340px;height:380px;border-radius:14px;overflow:hidden;box-shadow:0 0 0 14px #2C3C7A,0 30px 60px rgba(0,0,0,.35)}
#night .win .sky{position:absolute;inset:0;width:100%;height:100%}
#night .win circle{fill:#fff;animation:tw var(--tw) ease-in-out var(--td) infinite alternate}
@keyframes tw{from{opacity:.25}to{opacity:1}}
#night .moon{position:absolute;left:70px;top:70px;width:96px;height:96px;border-radius:50%;background:#FFE9A8;box-shadow:inset -22px -10px 0 #F3D27A;
  transition:transform 1.9s cubic-bezier(.45,0,.2,1) .15s}
[data-s="night"].ge1 #night .moon{transform:translate(150px,170px)}
#night .mullion{position:absolute;background:#2C3C7A}#night .mullion.v{left:163px;top:0;width:14px;height:100%}#night .mullion.h{left:0;top:183px;width:100%;height:14px}
#night .room{left:0;top:0;width:1920px;height:1080px}
#night .beam{opacity:.16;animation:lamp 6s ease-in-out infinite alternate}
@keyframes lamp{from{opacity:.13}to{opacity:.19}}
#night .laptop{left:1150px;top:510px;width:470px;height:300px}
#night .caret{animation:caret 1s steps(1) infinite}@keyframes caret{50%{opacity:0}}
#night .prog{transform-box:fill-box;transform-origin:0 50%;transform:scaleX(.045);transition:transform 1.8s ease .3s}
[data-s="night"].ge1 #night .prog{transform:scaleX(.075)}
#night .st1{opacity:0;transition:opacity .3s ease 1.4s}[data-s="night"].ge1 #night .st1{opacity:1}
#night .st0{transition:opacity .3s ease 1.4s}[data-s="night"].ge1 #night .st0{opacity:0}
#night .steam{left:1628px;top:600px;width:80px;height:120px;transition:opacity 1.2s ease .6s}
#night .steam path{fill:none;stroke:rgba(255,255,255,.7);stroke-width:7;stroke-linecap:round;stroke-dasharray:30 160;animation:steam 2.6s linear infinite}
#night .steam path:nth-child(2){animation-delay:-.9s}#night .steam path:nth-child(3){animation-delay:-1.7s}
@keyframes steam{from{stroke-dashoffset:150}to{stroke-dashoffset:-40}}
[data-s="night"].ge1 #night .steam{opacity:0}
#night .dim{left:0;top:0;width:1920px;height:1080px;background:#050A22;opacity:0;transition:opacity 1.8s ease .2s;pointer-events:none}
[data-s="night"].ge1 #night .dim{opacity:.32}
#night .clk{z-index:1}
[data-s="night"].ge1 #night .hh{--rot:405}[data-s="night"].ge1 #night .mh{--rot:1620}
#night .timep{background:rgba(255,255,255,.12);color:#FFE3A0;font-variant-numeric:tabular-nums}
#night .timep .ic{color:var(--sun)}
#night .lost{display:flex;align-items:center;gap:30px}
#night .lost .num{font-size:190px;line-height:1;color:var(--sun)}
#night .lost .u{font:700 40px/1.35 var(--sans)}
#night .tokens{display:flex;gap:26px}
#night .tokens span{display:flex;align-items:center;gap:14px;padding:12px 26px 12px 12px;border-radius:999px;background:rgba(255,255,255,.1);font:700 30px/1.2 var(--sans)}
#night .tk{display:grid;place-items:center;width:58px;height:58px;border-radius:50%;font:800 30px/1 var(--sans);font-style:normal}
#night .tk .ic{width:32px;height:32px}
#night .tk1{background:#FBF1E2;color:var(--navy)}#night .tk2{background:var(--sun);color:#7A4A00}#night .tk3{background:var(--mint);color:#fff}
''',
    js=r'''
window.__hooks.night={beat:function(st,dir){var el=document.getElementById('tclock');clearInterval(el.__t);
  if(st===0){el.textContent='อาทิตย์ 21:00';return;}
  if(st===1&&dir==='fwd'&&!document.documentElement.classList.contains('rm')){var m=0,t0=performance.now();
    el.__t=setInterval(function(){var p=Math.min(1,(performance.now()-t0-150)/1800);p=p<0?0:p;var e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;m=Math.round(e*270);
      var h=(21+Math.floor(m/60))%24,mm=m%60;el.textContent=(h>=21?'อาทิตย์ ':'จันทร์ ')+('0'+h).slice(-2)+':'+('0'+mm).slice(-2);if(p>=1)clearInterval(el.__t);},40);}
  else el.textContent='จันทร์ 01:30';}};
''')

# =====================================================================================================
# S2 · week: one week of a teacher. Slide-making blocks eat the evenings (15 h), then the weekend (33 h).
days = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']
X0, CW, GAP, Y0, HP = 752, 146, 8, 236, 44   # hours 08..24 -> y = Y0 + (h-8)*HP
def hy(h): return Y0 + (h - 8) * HP
cal = []
for k, d in enumerate(days):
    x = X0 + k * (CW + GAP)
    cal.append(f'<p class="r dayh" style="left:{x}px;top:170px;width:{CW}px;--i:{1 + k*.3:.1f}">{d}</p>')
    if k < 5:
        cal.append(f'<div class="r blk teach" style="left:{x}px;top:{hy(8)}px;width:{CW}px;height:{8*HP-6}px;--i:{1.5 + k*.3:.1f}"><span>สอน</span></div>')
        cal.append(f'<div class="r blk mine" style="left:{x}px;top:{hy(17)}px;width:{CW}px;height:{6*HP-6}px;--i:{2 + k*.3:.1f}"><span>{icon("i-users")}ครอบครัว</span></div>')
        cal.append(f'<div class="blk eat e1" style="left:{x}px;top:{hy(18)}px;width:{CW}px;height:{3*HP-6}px;--n:{k}"><span>ทำสไลด์</span></div>')
    else:
        cal.append(f'<div class="r blk mine" style="left:{x}px;top:{hy(9)}px;width:{CW}px;height:{13*HP-6}px;--i:{2 + k*.3:.1f}"><span>{icon("i-users")}วันหยุด</span></div>')
        cal.append(f'<div class="blk eat e2" style="left:{x}px;top:{hy(9)}px;width:{CW}px;height:{9*HP-6}px;--n:{k-5}"><span>ทำสไลด์</span></div>')
hours = ''.join(f'<p class="r hr" style="left:690px;top:{hy(h)-14}px;--i:1">{h:02d}</p>' for h in range(8, 25, 2))
add(id='week', steps=2, title='เวลาที่หายไป', bg='#FBF1E2', light=True,
    shapes={'': {'cols': ['#FFC83D', '#F2553C', '#3D7BFF'], 'op': .22, 'seed': 5, 'n': 6}},
    html=f'''
<div class="r calbg" style="left:670px;top:150px;width:1170px;height:{hy(24)-150+20}px;--i:0"></div>
{hours}{''.join(cal)}
<i class="now" style="left:{X0}px;top:{hy(18)}px;width:{7*CW+6*GAP}px"></i>
<svg class="r hgrid" viewBox="0 0 1170 800" style="left:670px;top:{Y0}px;width:1170px;height:{16*HP}px;--i:0" aria-hidden="true">{''.join(f'<line x1="80" x2="1150" y1="{k*HP}" y2="{k*HP}"/>' for k in range(0,17,2))}</svg>
<p class="r k" style="left:110px;top:170px;color:var(--tomato);--i:0">เวลาที่หายไป</p>
<h1 class="r h2 dk" style="left:106px;top:216px;width:540px;font-size:74px;--i:1">สไลด์ 1 บท<br>กินวันหยุดครู</h1>
<p class="r x1 ld dk" style="left:110px;top:470px;width:500px;--i:2">สัปดาห์ปกติของครู: สอนกลางวัน เย็นและวันหยุดเป็นของครอบครัว</p>
<div class="f1 tally dk" style="left:110px;top:440px;width:520px"><span class="num" data-count="15" data-seq="1:15,2:33" data-at="1" data-dur="1500">0</span><span class="u">ชั่วโมง</span></div>
<p class="o1 ld dk" style="left:110px;top:660px;width:520px;--d:.3s">ทุกเย็นวันทำงาน คืนละ 3 ชั่วโมง</p>
<p class="f2 ld dk" style="left:110px;top:660px;width:520px;--d:.3s">รวมเสาร์–อาทิตย์ด้วย ≈ <b class="red">33 ชั่วโมง</b></p>
<p class="r cp dk" style="left:110px;top:850px;width:520px;--i:3">ตัวอย่างคำนวณ: 1 บท 67 สไลด์ × ประมาณ 30 นาที ≈ 33 ชั่วโมง<br>ไม่ใช่ข้อมูลสำรวจ</p>
''',
    css=r'''
#week .hgrid line{stroke:#EEF1F7;stroke-width:2}
#week .calbg{background:#fff;border-radius:26px;box-shadow:0 26px 60px rgba(28,42,85,.12)}
#week .dayh{font:800 30px/1 var(--sans);color:var(--navy);text-align:center}
#week .hr{font:600 20px/1 var(--sans);color:#8C95B0;font-variant-numeric:tabular-nums}
#week .blk{border-radius:12px;display:flex;align-items:flex-start;justify-content:center;padding-top:12px;overflow:hidden}
#week .blk span{display:flex;align-items:center;gap:8px;font:700 22px/1.2 var(--sans)}
#week .blk .ic{width:22px;height:22px}
#week .teach{background:#DCE6FF;color:#2F5BD8}
#week .mine{background:#D7F2E5;color:#0E8A5F;transition:opacity .5s ease}
#week .eat{background:var(--tomato);color:#fff;transform-origin:50% 0;transform:scaleY(0);opacity:0;transition:transform .15s ease,opacity .15s ease;box-shadow:0 8px 18px rgba(242,85,60,.3)}
#week .eat span{opacity:0;transition:opacity .2s ease}
[data-s="week"].ge1 #week .e1,[data-s="week"].ge2 #week .e2{transform:none;opacity:1;transition:transform .55s var(--ease) calc(.2s + var(--n)*.16s),opacity .2s ease calc(.2s + var(--n)*.16s)}
[data-s="week"].ge1 #week .e1 span,[data-s="week"].ge2 #week .e2 span{opacity:1;transition:opacity .3s ease calc(.6s + var(--n)*.16s)}
#week .now{height:4px;border-radius:2px;background:var(--tomato);opacity:.0;transition:opacity .4s ease}
#week .now::before{content:"";position:absolute;left:-8px;top:-6px;width:16px;height:16px;border-radius:50%;background:var(--tomato)}
.slide.on#week .now{opacity:.85;animation:nowline 9s linear infinite}
@keyframes nowline{from{transform:translateY(0)}to{transform:translateY(264px)}}
#week .tally{display:flex;align-items:baseline;gap:20px}
#week .tally .num{font-size:200px;line-height:1;color:var(--tomato)}
#week .tally .u{font:800 50px/1 var(--sans)}
#week .red{color:var(--tomato)}
''')

# =====================================================================================================
# S3 · active: drag the divider from a wall-of-text slide to our slide. Then the verbs pop and hands go up.
def before_svg():
    lines = ['แผนภูมิแท่ง คือ แผนภูมิที่ใช้รูปสี่เหลี่ยมผืนผ้าแสดงจำนวน', 'ของข้อมูล แท่งแต่ละแท่งต้องกว้างเท่ากัน และเว้นระยะเท่ากัน',
             'ความสูงหรือความยาวของแท่งแทนจำนวนของข้อมูลแต่ละประเภท', 'ใช้เปรียบเทียบข้อมูลที่แยกเป็นประเภท เช่น วันในสัปดาห์',
             'ตัวอย่าง: ยอดขายชานมไข่มุก จ. 30 อ. 25 พ. 40 พฤ. 15 ศ. 35 แก้ว', 'คำถาม: วันใดขายได้มากที่สุด และมากกว่าวันที่ขายได้น้อยที่สุด', 'อยู่กี่แก้ว จงอธิบายวิธีคิด']
    t = ''.join(f'<text x="80" y="{230 + k*62}" font-size="30" fill="#3A3A3A" font-family="KS">{"• " if k < 5 else ""}{s}</text>' for k, s in enumerate(lines))
    return (f'<svg viewBox="0 0 1320 742" aria-hidden="true"><rect width="1320" height="742" fill="#F4F4F2"/><rect x="0" y="0" width="1320" height="120" fill="#E3E3E0"/>'
            f'<text x="80" y="80" font-size="44" font-weight="700" fill="#2A2A2A" font-family="KS">บทที่ 4 การนำเสนอข้อมูล: แผนภูมิแท่ง</text>{t}'
            f'<text x="1240" y="712" text-anchor="end" font-size="22" fill="#8A8A86" font-family="KS">หน้า 23</text></svg>')
def after_svg():
    vals = [30, 25, 40, 15, 35]; cols = ['#3D7BFF', '#8B6CF6', '#F2553C', '#18B07F', '#FFC83D']; lab = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.']
    bars = ''
    for k, v in enumerate(vals):
        x = 120 + k * 118; h = v * 8.4; y = 600 - h
        bars += (f'<rect class="ab ab{k}" x="{x}" y="{y}" width="78" height="{h}" rx="10" fill="{cols[k]}"/>'
                 f'<text x="{x+39}" y="{y-14}" text-anchor="middle" font-size="26" font-weight="800" fill="#1C2A55" font-family="KS">{v}</text>'
                 f'<text x="{x+39}" y="640" text-anchor="middle" font-size="24" font-weight="700" fill="#5B6785" font-family="KS">{lab[k]}</text>')
    ch = ''
    for k, (l, t) in enumerate([('A', 'วันจันทร์'), ('B', 'วันอังคาร'), ('C', 'วันพุธ'), ('D', 'วันศุกร์')]):
        y = 250 + k * 92; ok = l == 'C'
        ch += (f'<rect x="790" y="{y}" width="440" height="74" rx="18" fill="{"#E3F7EF" if ok else "#fff"}" stroke="{"#18B07F" if ok else "#D3DAE8"}" stroke-width="3"/>'
               f'<rect x="806" y="{y+15}" width="44" height="44" rx="12" fill="{"#18B07F" if ok else "#E6EEFF"}"/>'
               f'<text x="828" y="{y+46}" text-anchor="middle" font-size="24" font-weight="800" fill="{"#fff" if ok else "#3D7BFF"}" font-family="KS">{l}</text>'
               f'<text x="870" y="{y+47}" font-size="28" font-weight="700" fill="#1C2A55" font-family="KS">{t}</text>'
               + (f'<path d="M1180 {y+37} l12 12 22-24" fill="none" stroke="#18B07F" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' if ok else ''))
    return (f'<svg viewBox="0 0 1320 742" aria-hidden="true"><rect width="1320" height="742" fill="#F6F7FB"/>'
            f'<circle cx="1180" cy="80" r="260" fill="#8B6CF6" opacity=".14"/><circle cx="160" cy="760" r="240" fill="#3D7BFF" opacity=".12"/>'
            f'<text x="80" y="84" font-size="24" font-weight="800" fill="#3D7BFF" font-family="KS" letter-spacing="1">บทที่ 4 · แผนภูมิแท่ง</text>'
            f'<text x="80" y="148" font-size="50" font-weight="800" fill="#1C2A55" font-family="KS">วันไหนขายชานมได้มากที่สุด?</text>'
            f'<rect x="80" y="200" width="680" height="480" rx="26" fill="#fff"/><line x1="110" y1="600" x2="730" y2="600" stroke="#1C2A55" stroke-width="3"/>{bars}'
            f'<g class="ghand"><use href="#hand-pt" x="0" y="0" width="64" height="80"/></g>{ch}'
            f'<rect x="1000" y="640" width="230" height="56" rx="28" fill="#1C2A55"/><text x="1115" y="677" text-anchor="middle" font-size="24" font-weight="700" fill="#fff" font-family="KS">ตอบแล้ว 28/35</text>'
            f'</svg>')
verbs = [('i-hand', 'แตะเลือก', 'var(--blue)'), ('i-motion', 'ลากกราฟ', 'var(--tomato)'), ('i-pen', 'เขียนตอบ', 'var(--lilac)'), ('i-check', 'ตรวจเอง', 'var(--mint)')]
vchips = ''.join(f'<p class="f1 vchip" style="left:1480px;top:{250 + k*104}px;--d:{.15 + k*.16:.2f}s"><i style="background:{c}">{icon(ic)}</i>{t}</p>' for k, (ic, t, c) in enumerate(verbs))
kids3 = ''.join(kid_back(k, 'up' if True else '', 104, f'--ad:{.5 + k*.14:.2f}s', bow=k == 1) for k in range(3))
add(id='active', steps=1, title='เด็กได้ลงมือ', bg='#FFC83D', light=True, noclick=True,
    shapes={'': {'cols': ['#FFFFFF', '#F2553C', '#FFE08A'], 'op': .35, 'seed': 21, 'n': 6}},
    html=f'''
<p class="r k dk" style="left:110px;top:64px;--i:0">เด็กได้ลงมือ</p>
<h1 class="r h2 dk" style="left:106px;top:104px;width:1400px;font-size:70px;--i:1">เนื้อหาเดิม แต่เด็กได้ทำเอง</h1>
<div class="r compare ia" id="cmp3" style="left:110px;top:226px;width:1320px;height:742px;--i:2" data-pos="50">
  <div class="cmp-a">{before_svg()}</div>
  <div class="cmp-b">{after_svg()}</div>
  <span class="tagl">ก่อน: ตัวหนังสือเต็มจอ</span><span class="tagr">หลัง: สไลด์ของเรา</span>
  <div class="bar"></div><div class="knob" tabindex="0" role="slider" aria-label="ลากดูก่อนและหลัง" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><svg><use href="#lr"/></svg></div>
</div>
<p class="r x1 ld dk" style="left:1480px;top:250px;width:360px;--i:3">ลากเส้นแบ่งได้ทั่วทั้งภาพ เชิญใครก็ได้ออกมาลอง</p>
{vchips}
<div class="f1 kids k3" style="left:1480px;top:700px;--gap:14px;--d:.3s">{kids3}</div>
''',
    css=KID_CSS + r'''
#active .compare svg{position:absolute;inset:0;width:100%;height:100%}
#active .ghand{transform:translate(520px,330px);animation:gdrag 3.4s var(--ease) infinite}
@keyframes gdrag{0%,12%{transform:translate(520px,330px);opacity:0}20%{opacity:1}45%,70%{transform:translate(520px,290px);opacity:1}85%,100%{transform:translate(520px,290px);opacity:0}}
#active .ab2{transform-box:fill-box;transform-origin:50% 100%;animation:gbar 3.4s var(--ease) infinite}
@keyframes gbar{0%,20%{transform:scaleY(.86)}45%,100%{transform:scaleY(1)}}
#active .vchip{display:flex;align-items:center;gap:18px;font:800 38px/1.2 var(--sans);color:var(--navy)}
#active .vchip i{display:grid;place-items:center;width:72px;height:72px;border-radius:22px;color:#fff;box-shadow:0 10px 22px rgba(28,42,85,.18)}
#active .vchip .ic{width:38px;height:38px}
#active .kidb .arm{--a0:160deg;--a1:6deg}
#active .kidb.up .arm{transform:rotate(160deg)}
[data-s="active"].ge1 #active .kidb.up .arm{transform:rotate(6deg)}
''',
    js=r'''
window.__hooks.active={enter:function(st,dir){var c=document.getElementById('cmp3');c.__touched=0;c.__set(dir==='fwd'?94:50);
  if(dir!=='fwd'||document.documentElement.classList.contains('rm')){c.__set(50);return;}
  var t0=performance.now()+450;(function f(t){if(c.__touched)return;var p=Math.max(0,Math.min(1,(t-t0)/1150)),e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
    c.__set(94-e*(94-38));if(p<1)requestAnimationFrame(f);})(performance.now());}};
''')

# =====================================================================================================
# S4 · make: the teacher's book opens and four services fly out of it.
cards4 = [
    ('i-slides', 'สไลด์โต้ตอบ ทั้งเล่ม', 'แอนิเมชันทุกหน้า · เด็กตอบบนจอ · มีคู่มือครู', 110, 300, '700px,240px', 'var(--blue)', 'm-bars'),
    ('i-steps', 'เฉลยทีละขั้น', 'พร้อมเว็บเฉลย ล็อกรหัส เฉพาะครู', 1270, 300, '-460px,240px', 'var(--mint)', 'm-key'),
    ('i-video', 'วิดีโอสอน', 'การ์ตูน 2D หรือแบบหนัง · มีซับ', 110, 650, '700px,-110px', 'var(--tomato)', 'm-play'),
    ('i-web', 'เว็บไซต์ + สไลด์นำเสนอ', 'ของโรงเรียน · ไทย/อังกฤษ', 1270, 650, '-460px,-110px', 'var(--lilac)', 'm-web'),
]
minis = {
    'm-bars': '<svg class="mini" viewBox="0 0 120 80"><rect x="10" y="40" width="18" height="34" rx="4" fill="#3D7BFF"/><rect x="36" y="22" width="18" height="52" rx="4" fill="#8B6CF6"/><rect x="62" y="50" width="18" height="24" rx="4" fill="#F2553C"/><rect class="grow" x="88" y="14" width="18" height="60" rx="4" fill="#FFC83D"/></svg>',
    'm-key': '<svg class="mini" viewBox="0 0 120 80"><rect x="8" y="12" width="70" height="10" rx="5" fill="#D7F2E5"/><rect x="8" y="34" width="70" height="10" rx="5" fill="#D7F2E5"/><rect x="8" y="56" width="70" height="10" rx="5" fill="#D7F2E5"/><path class="tick t1" d="M84 17l5 5 9-10" /><path class="tick t2" d="M84 39l5 5 9-10"/><path class="tick t3" d="M84 61l5 5 9-10"/><rect x="100" y="44" width="16" height="14" rx="3" fill="#1C2A55"/><path d="M103 44v-4a5 5 0 0 1 10 0v4" fill="none" stroke="#1C2A55" stroke-width="3"/></svg>',
    'm-play': '<svg class="mini" viewBox="0 0 120 80"><rect x="6" y="6" width="108" height="58" rx="10" fill="#FFE4DE"/><path d="M52 22v26l22-13z" fill="#F2553C"/><rect x="6" y="70" width="108" height="6" rx="3" fill="#FFE4DE"/><rect class="pbar" x="6" y="70" width="108" height="6" rx="3" fill="#F2553C"/></svg>',
    'm-web': '<svg class="mini" viewBox="0 0 120 80"><rect x="6" y="6" width="108" height="68" rx="8" fill="#EEE9FF"/><rect x="6" y="6" width="108" height="12" rx="6" fill="#8B6CF6"/><g class="scroll"><rect x="16" y="26" width="88" height="22" rx="4" fill="#fff"/><rect x="16" y="54" width="40" height="18" rx="4" fill="#fff"/><rect x="62" y="54" width="42" height="18" rx="4" fill="#fff"/><rect x="16" y="78" width="88" height="22" rx="4" fill="#fff"/></g></svg>',
}
c4 = ''
for k, (ic, t, d, x, y, fr, col, mini) in enumerate(cards4):
    c4 += (f'<div class="svc s{k}" style="left:{x}px;top:{y}px;--from:translate({fr}) scale(.2) rotate({(-8, 8, 6, -6)[k]}deg);--n:{k};--c:{col}">'
           f'<i class="si">{icon(ic)}</i><div class="st"><h3>{t}</h3><p>{d}</p></div>{minis[mini]}</div>')
paths = ''.join(f'<path class="fly" pathLength="1" d="{d}" style="--n:{k}"/>' for k, d in enumerate([
    'M900 500 C760 470 700 440 650 430', 'M1020 500 C1160 470 1220 440 1270 430', 'M900 620 C760 660 700 720 650 760', 'M1020 620 C1160 660 1220 720 1270 760']))
add(id='make', steps=2, title='เราทำอะไร', bg='#3D7BFF',
    shapes={'': {'cols': ['#FFFFFF', '#FFC83D', '#1C2A55'], 'op': .16, 'seed': 33, 'n': 7}},
    html=f'''
<p class="r k" style="left:110px;top:84px;color:var(--sun);--i:0">สิ่งที่เราทำ</p>
<h1 class="r h2 lt" style="left:106px;top:124px;width:1600px;font-size:72px;--i:1">ทุกอย่างเริ่มจากหนังสือของครู</h1>
<svg class="flyp" viewBox="0 0 1920 1080" aria-hidden="true">{paths}</svg>
<div class="r book" style="left:810px;top:360px;--i:2" aria-hidden="true">
  <div class="pages"><i></i><i></i><i></i></div>
  <div class="pg p1"></div><div class="pg p2"></div>
  <div class="cover"><div class="cf"><b>คณิตศาสตร์</b><span>ม.1 เล่ม 2</span><svg viewBox="0 0 100 60"><path d="M10 50 L50 10 L90 50 Z" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><circle cx="50" cy="38" r="9" fill="#FFC83D"/></svg></div><div class="cb"></div></div>
</div>
{c4}
<p class="f2 badge" style="left:132px;top:256px">★ สินค้าหลัก</p>
<p class="r cp lt" style="left:110px;top:952px;width:1000px;--i:4;padding-left:300px">ครูส่งชื่อหนังสือมา เราทำให้ครบทั้งเล่ม</p>
''',
    css=r'''
#make .flyp{left:0;top:0;width:1920px;height:1080px}
#make .fly{fill:none;stroke:rgba(255,255,255,.55);stroke-width:4;stroke-dasharray:.02 .03;stroke-dashoffset:1;opacity:0;transition:opacity .2s}
[data-s="make"].ge1 #make .fly{opacity:1;animation:flyd 1.2s linear forwards;animation-delay:calc(.35s + var(--n)*.12s)}
@keyframes flyd{to{stroke-dashoffset:0}}
#make .book{width:300px;height:400px;perspective:1600px;animation:breathe 4s ease-in-out infinite}
@keyframes breathe{50%{transform:translateY(-8px)}}
#make .pages{position:absolute;inset:6px 0 6px 10px;background:#fff;border-radius:6px 14px 14px 6px;box-shadow:0 30px 60px rgba(10,30,90,.35)}
#make .pages i{position:absolute;left:30px;right:30px;height:8px;border-radius:4px;background:#E6EEFF}
#make .pages i:nth-child(1){top:60px}#make .pages i:nth-child(2){top:90px;right:80px}#make .pages i:nth-child(3){top:120px;right:50px}
#make .pg{position:absolute;inset:8px 2px 8px 6px;background:#F7F9FF;border-radius:4px 12px 12px 4px;transform-origin:0 50%;transform-style:preserve-3d;
  transition:transform .15s ease;box-shadow:inset 6px 0 10px rgba(0,0,0,.06)}
#make .cover{position:absolute;inset:0;transform-origin:0 50%;transform-style:preserve-3d;transition:transform .15s ease}
#make .cover .cf,#make .cover .cb{position:absolute;inset:0;border-radius:6px 18px 18px 6px;backface-visibility:hidden}
#make .cf{background:var(--tomato);display:flex;flex-direction:column;justify-content:flex-start;padding:46px 34px;color:#fff;
  background-image:linear-gradient(90deg,rgba(0,0,0,.12) 0 18px,transparent 18px)}
#make .cf b{font:800 44px/1.25 var(--sans)}#make .cf span{font:700 28px/1.3 var(--sans);opacity:.9}
#make .cf svg{width:150px;height:90px;margin-top:50px}
#make .cb{background:#D9442F;transform:rotateY(180deg)}
[data-s="make"].ge1 #make .cover{transform:rotateY(-160deg);transition:transform 1s cubic-bezier(.5,0,.2,1)}
[data-s="make"].ge1 #make .p1{transform:rotateY(-150deg);transition:transform 1s cubic-bezier(.5,0,.2,1) .12s}
[data-s="make"].ge1 #make .p2{transform:rotateY(-140deg);transition:transform 1s cubic-bezier(.5,0,.2,1) .22s}
#make .svc{width:540px;height:270px;background:#fff;border-radius:30px;padding:34px 34px 30px;display:grid;grid-template-columns:84px 1fr;grid-template-rows:auto 1fr;column-gap:24px;
  box-shadow:0 26px 60px rgba(10,30,90,.28);opacity:0;transform:var(--from);transition:transform .2s ease,opacity .2s ease}
[data-s="make"].ge1 #make .svc{opacity:1;transform:none;transition:transform .8s cubic-bezier(.2,.9,.25,1) calc(.45s + var(--n)*.12s),opacity .3s ease calc(.45s + var(--n)*.12s),filter .4s}
#make .si{display:grid;place-items:center;width:84px;height:84px;border-radius:24px;background:var(--c);color:#fff}
#make .si .ic{width:46px;height:46px}
#make .st h3{font:800 38px/1.25 var(--sans);color:var(--navy);margin:0}
#make .st p{font:500 26px/1.4 var(--sans);color:#4A5576;margin:8px 0 0}
#make .mini{position:absolute;right:30px;bottom:24px;width:150px;height:100px}
#make .grow{transform-box:fill-box;transform-origin:50% 100%;animation:mg 2.4s ease-in-out infinite alternate}@keyframes mg{from{transform:scaleY(.4)}}
#make .tick{fill:none;stroke:#18B07F;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:24;stroke-dashoffset:24;animation:tick 3s ease infinite}
#make .t2{animation-delay:.4s}#make .t3{animation-delay:.8s}@keyframes tick{30%,80%{stroke-dashoffset:0}100%{stroke-dashoffset:0;opacity:0}}
#make .pbar{transform-box:fill-box;transform-origin:0 50%;animation:pb 4s linear infinite}@keyframes pb{from{transform:scaleX(0)}}
#make .scroll{animation:scr 5s ease-in-out infinite alternate}@keyframes scr{to{transform:translateY(-30px)}}
[data-s="make"].ge2 #make .s0{transform:translate(0,-8px) scale(1.04);box-shadow:0 0 0 8px var(--sun),0 36px 70px rgba(10,30,90,.35)}
[data-s="make"].ge2 #make .s1,[data-s="make"].ge2 #make .s2,[data-s="make"].ge2 #make .s3{opacity:.55;filter:saturate(.6)}
#make .badge{z-index:3;padding:10px 22px;border-radius:999px;background:var(--sun);color:#5A3B00;font:800 28px/1.2 var(--sans);box-shadow:0 10px 24px rgba(0,0,0,.2)}
''')

# =====================================================================================================
# S5 · bars: the REAL w-bars widget from Unit 4 (tools.js). A ghost hand drags Wednesday; then a volunteer.
add(id='bars', steps=2, title='สาธิตสด: ลากกราฟ', bg='#DDF4EA', light=True, noclick=True,
    shapes={'': {'cols': ['#18B07F', '#FFC83D', '#3D7BFF'], 'op': .2, 'seed': 8, 'n': 6}},
    html=f'''
<p class="r k" style="left:110px;top:110px;color:#0B8A5E;--i:0">สาธิตสด 1 · ของจริงจากบทเรียน</p>
<h1 class="r h2 dk" style="left:106px;top:152px;width:520px;--i:1">ออกมา<br>ลากเลย</h1>
<p class="r ld dk" style="left:110px;top:366px;width:470px;--i:2">ลากแท่งให้ตรงกับตาราง แล้วกด Check</p>
<p class="f1 pill vol" style="left:110px;top:476px;--d:1.9s">{icon('i-hand')}เชิญอาสาสมัคร 1 คน</p>
<div class="r card tbl5" style="left:110px;top:570px;width:470px;--i:3"><p class="tt">Bubble tea sold this week</p>
  <div class="row h"><span>Day</span><span>Cups</span></div>
  <div class="row"><span>Mon</span><b>30</b></div><div class="row"><span>Tue</span><b>25</b></div><div class="row"><span>Wed</span><b>40</b></div><div class="row"><span>Thu</span><b>15</b></div><div class="row"><span>Fri</span><b>35</b></div></div>
<div class="r w-bars ia" id="kbars" style="left:640px;top:96px;width:1180px;height:880px;--i:2" data-title="Bubble tea sold this week" data-labels="Mon,Tue,Wed,Thu,Fri" data-min="0" data-max="50" data-step="10" data-answer="30,25,40,15,35" data-start="20,35,20,25,20" data-ylabel="Cups"></div>
<div class="ghost" aria-hidden="true"><svg viewBox="0 0 64 80"><use href="#hand-pt"/></svg></div>
<svg class="f2 arr" viewBox="0 0 400 200" style="left:440px;top:880px;width:400px;height:200px;--d:.2s" aria-hidden="true"><path pathLength="1" d="M30 30 C120 40 180 120 300 96"/><path class="hd" d="M282 78 L310 95 L284 116"/></svg>
<p class="f2 tip dk" style="left:110px;top:890px;width:420px;--d:.1s">ระบบตรวจให้ทันที<br><small>Show answer = เฉลย · Reset = เริ่มใหม่</small></p>
<p class="r cp dk" style="left:640px;top:990px;width:1180px;text-align:right;--i:4">วิดเจ็ตจริงจาก tools.js ของบทเรียน Unit 4 ห้อง English Program</p>
''',
    css=r'''
#bars .w-bars{font-size:28px}
#bars .tbl5{padding:24px 30px 18px;border-radius:24px}
#bars .tbl5 .tt{font:700 26px/1.3 var(--sans);color:var(--navy);margin-bottom:8px}
#bars .tbl5 .row{display:flex;justify-content:space-between;font:600 26px/1.55 var(--sans);color:#33406A;border-top:2px solid #EEF1F7;padding:2px 4px}
#bars .tbl5 .row.h{font-weight:800;color:#0B8A5E;border-top:0}
#bars .tbl5 .row b{font-weight:800;color:var(--navy);font-variant-numeric:tabular-nums}
#bars .vol{background:var(--navy);color:#fff}#bars .vol .ic{color:var(--sun)}
#bars .ghost{left:0;top:0;width:96px;height:120px;opacity:0;pointer-events:none;z-index:5;filter:drop-shadow(0 10px 14px rgba(0,0,0,.25));transition:opacity .3s}
#bars .ghost svg{width:100%;height:100%}
#bars .ghost.on{opacity:1}
#bars .arr path{fill:none;stroke:var(--tomato);stroke-width:7;stroke-linecap:round;stroke-linejoin:round}
#bars .arr path:first-child{stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset .1s}
[data-s="bars"].ge2 #bars .arr path:first-child{stroke-dashoffset:0;transition:stroke-dashoffset .7s ease .3s}
#bars .arr .hd{opacity:0;transition:opacity .2s}[data-s="bars"].ge2 #bars .arr .hd{opacity:1;transition:opacity .3s ease .9s}
#bars .tip{font:800 34px/1.3 var(--sans)}#bars .tip small{font:600 22px/1.4 var(--sans);color:#4A5576}
[data-s="bars"].ge2 #bars .tw-btn.pri{animation:pulse 1.4s ease-in-out infinite}
@keyframes pulse{50%{box-shadow:0 0 0 12px rgba(61,123,255,.25),0 8px 18px rgba(59,108,255,.28)}}
[data-s="bars"].ge1 #bars .tbl5{opacity:1}
''',
    js=r'''
window.__hooks.bars={beat:function(st,dir){if(st!==1||dir!=='fwd')return;var w=document.getElementById('kbars'),api=w.__w,g=document.querySelector('#bars .ghost');
  if(!api||document.documentElement.classList.contains('rm'))return;var svg=w.querySelector('svg.tw-svg');if(!svg)return;
  var stage=document.getElementById('stage'),sr=stage.getBoundingClientRect(),k=sr.width/1920,from=api.values()[2],to=40;if(from===to)return;
  function place(p){g.style.transform='translate('+((p.x-sr.left)/k-30)+'px,'+((p.y-sr.top)/k-6)+'px)';}
  function ev(type,p){var e=new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:77,pointerType:'touch',isPrimary:true,clientX:p.x,clientY:p.y,button:0,buttons:type==='pointerup'?0:1});svg.dispatchEvent(e);}
  var a=api.at(2,from);place(a);setTimeout(function(){g.classList.add('on');},500);
  setTimeout(function(){var t0=performance.now();ev('pointerdown',api.at(2,from));(function f(t){var p=Math.min(1,(t-t0)/1100),e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2,v=from+(to-from)*e,q=api.at(2,v);
      place(q);ev('pointermove',q);if(p<1)requestAnimationFrame(f);else{ev('pointerup',q);setTimeout(function(){g.classList.remove('on');},500);}})(performance.now());},1000);
},leave:function(){var g=document.querySelector('#bars .ghost');if(g)g.classList.remove('on');}};
''')

# =====================================================================================================
# S6 · pen: three wobbly strokes snap into a line, a circle and a box. Then anyone tries the real pen (tools.js).
pan = [('เส้นเกือบตรง → เส้นตรง', 'M70 300 C150 262 200 318 270 250 S410 214 470 150', '<path class="cln" d="M70 300 L470 150"/>', 'var(--blue)'),
       ('วงเบี้ยว → วงกลม', 'M270 120 C380 112 440 200 420 270 C400 350 300 372 222 340 C140 306 120 220 170 160 C200 126 250 116 290 126',
        '<circle class="cln" cx="280" cy="245" r="128"/>', 'var(--tomato)'),
       ('กล่องเบี้ยว → สี่เหลี่ยม', 'M110 130 C220 120 330 138 430 126 C440 200 424 280 438 360 C330 368 220 352 116 364 C124 280 104 210 112 136',
        '<rect class="cln" x="112" y="130" width="322" height="232" rx="6"/>', 'var(--mint)')]
s6 = ''
for k, (lab, wob, cln, col) in enumerate(pan):
    x = 130 + k * 570
    s6 += (f'<div class="r pane" style="left:{x}px;top:330px;--i:{2+k}"></div>'
           f'<svg class="pen p{k+1}" viewBox="0 0 540 460" style="left:{x}px;top:330px;--c:{col}" aria-hidden="true"><path class="wob" pathLength="1" d="{wob}"/>{cln}</svg>'
           f'<div class="mk m{k+1}" style="left:{x}px;top:330px;offset-path:path(\'{wob}\')" aria-hidden="true"><i style="background:{col}"></i></div>'
           f'<p class="r x{k+1} wait" style="left:{x}px;top:530px;width:540px;--i:{3+k}">คลิก {k+1}</p>'
           f'<p class="f{k+1} plab dk" style="left:{x}px;top:810px;width:540px;--d:1.25s">{lab}</p>')
add(id='pen', steps=3, title='สาธิตสด: ปากกา', bg='#FFFFFF', light=True, noclick=True,
    shapes={'': {'cols': ['#3D7BFF', '#F2553C', '#FFC83D'], 'op': .1, 'seed': 14, 'n': 5}},
    html=f'''
<i class="grid" aria-hidden="true"></i>
<p class="r k" style="left:110px;top:84px;color:var(--blue);--i:0">สาธิตสด 2 · ปากกา</p>
<h1 class="r h2 dk" style="left:106px;top:124px;width:1500px;--i:1">วาดเบี้ยว ระบบจัดให้ตรง</h1>
<p class="r ld dk" style="left:110px;top:236px;width:1500px;--i:2">ใช้ได้ทุกหน้า: กดปุ่มปากกา หรือกด P แล้ววาดบนจอได้เลย</p>
{s6}
<button class="r btnx ia penbtn" type="button" style="left:770px;top:896px;--i:6">{icon('i-pen')}<span class="a">ลองวาดเองเลย</span><span class="b">ปิดปากกา (Esc)</span></button>
''',
    css=r'''
#pen .grid{left:0;top:0;width:1920px;height:1080px;background-image:linear-gradient(rgba(61,123,255,.09) 2px,transparent 2px),linear-gradient(90deg,rgba(61,123,255,.09) 2px,transparent 2px);
  background-size:60px 60px;animation:gridpan 30s linear infinite}
@keyframes gridpan{to{background-position:60px 60px}}
#pen .pane{width:540px;height:460px;border-radius:28px;background:rgba(255,255,255,.92);border:3px dashed #C9D4EE}
#pen .pen{width:540px;height:460px}
#pen .wob{fill:none;stroke:#9AA4BE;stroke-width:10;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset .1s,opacity .2s}
#pen .cln{fill:none;stroke:var(--c);stroke-width:12;stroke-linecap:round;stroke-linejoin:round;opacity:0;transform-box:fill-box;transform-origin:50% 50%;transform:scale(1.06);transition:opacity .1s,transform .1s}
.ge1 #pen .p1 .wob,.ge2 #pen .p2 .wob,.ge3 #pen .p3 .wob{stroke-dashoffset:0;opacity:0;transition:stroke-dashoffset .95s ease-in-out .1s,opacity .2s ease 1.15s}
.ge1 #pen .p1 .cln,.ge2 #pen .p2 .cln,.ge3 #pen .p3 .cln{opacity:1;transform:none;transition:opacity .2s ease 1.1s,transform .45s cubic-bezier(.3,1.4,.5,1) 1.1s}
#pen .mk{width:0;height:0;offset-distance:0%;offset-rotate:0deg;opacity:0}
#pen .mk i{position:absolute;left:-6px;top:-74px;width:26px;height:80px;border-radius:8px 8px 4px 4px;transform:rotate(28deg);transform-origin:50% 100%;box-shadow:0 8px 16px rgba(0,0,0,.2)}
#pen .mk i::after{content:"";position:absolute;left:7px;bottom:-12px;border:6px solid transparent;border-top:12px solid #1C2A55}
.ge1 #pen .m1,.ge2 #pen .m2,.ge3 #pen .m3{animation:mark 1.15s ease-in-out .1s both}
@keyframes mark{0%{offset-distance:0%;opacity:1}85%{offset-distance:100%;opacity:1}100%{offset-distance:100%;opacity:0}}
#pen .wait{font:700 30px/1 var(--sans);color:#A7B1C8;text-align:center}
#pen .plab{font:800 34px/1.3 var(--sans);text-align:center}
#pen .penbtn{background:var(--blue)}#pen .penbtn .b{display:none}
.pen-on #pen .penbtn{background:var(--tomato)}.pen-on #pen .penbtn .a{display:none}.pen-on #pen .penbtn .b{display:inline}
.pen-on [data-s="pen"] .penbtn{z-index:50}
''',
    js=r'''
(function(){var b=document.querySelector('#pen .penbtn');if(b)b.addEventListener('click',function(e){e.stopPropagation();document.dispatchEvent(new CustomEvent('deck:pen'));b.blur();});})();
''')

# =====================================================================================================
# S7 · reveal: students answer first (hands up, guesses), then four step cards flip one per click.
cupsrow = [('Mon', 3), ('Tue', 2.5), ('Wed', 4), ('Thu', 2), ('Fri', 5)]
pic = ''
for r_, (d, n) in enumerate(cupsrow):
    icons = ''.join(f'<i class="cu" style="--n:{r_*5+j}">{cup(44)}</i>' for j in range(int(n)))
    if n % 1: icons += f'<i class="cu half" style="--n:{r_*5+int(n)}">{cup(44)}</i>'
    pic += f'<div class="prow"><span>{d}</span><div>{icons}</div></div>'
steps7 = [('ขั้น 1 · ดู', 'นับไอคอนทุกแถว', '3 + 2.5 + 4 + 2 + 5 = <b>16.5</b> ไอคอน'),
          ('ขั้น 2 · คิด', 'อ่านกุญแจของภาพ', '1 ไอคอน = 10 แก้ว · ครึ่งไอคอน = 5 แก้ว'),
          ('ขั้น 3 · ทำ', 'คูณให้ครบ', '16.5 × 10 = <b class="num" data-count="165" data-at="3">0</b> แก้ว'),
          ('ขั้น 4 · ตรวจ', 'กลับไปดูคำตอบของเพื่อน', 'ใครตอบ 165 ถูกแล้ว!')]
fc = ''
for k, (h, s, a) in enumerate(steps7):
    fc += (f'<div class="r c3d sc{k+1}" style="left:900px;top:{246 + k*178}px;width:920px;height:158px;--i:{3+k*.5:.1f}"><div class="flip">'
           f'<div class="face front"><b class="no">{k+1}</b><span class="fh">{h}</span><span class="q">?</span></div>'
           f'<div class="face back"><b class="no">{k+1}</b><div><p class="bh">{h} · {s}</p><p class="ba">{a}</p></div></div></div></div>')
guess = [('150', 0), ('160', 1), ('165', 2)]
kids7 = ''.join(f'<div class="kg g{k}"><p class="bub b{k}">{g}</p>{kid_back(k+2, "up", 110, f"--ad:{.6+k*.18:.2f}s", bow=k==1)}</div>' for k, (g, _) in enumerate(guess))
add(id='reveal', steps=4, title='สาธิตสด: เด็กตอบก่อน แล้วค่อยเฉลย', bg='#8B6CF6',
    shapes={'': {'cols': ['#FFFFFF', '#FFC83D', '#6E4FE0'], 'op': .16, 'seed': 41, 'n': 6}},
    html=f'''
<p class="r k" style="left:110px;top:84px;color:#FFE08A;--i:0">สาธิตสด 3 · เฉลยทีละขั้น</p>
<h1 class="r h2 lt" style="left:106px;top:124px;width:1600px;font-size:70px;--i:1">เด็กตอบก่อน แล้วค่อยเฉลย</h1>
<div class="r card q7" style="left:110px;top:246px;width:720px;height:520px;--i:2">
  <p class="qq">ชานมไข่มุกขายได้ทั้งสัปดาห์กี่แก้ว?</p><div class="pic">{pic}</div><p class="key">{cup(30)} = 10 แก้ว</p></div>
<div class="kids7" style="left:120px;top:790px">{kids7}</div>
{fc}
<p class="r x1 note7 lt" style="left:1400px;top:84px;width:420px;--i:3">ให้เด็กตอบก่อน แล้วครูกด → ทีละขั้น</p>
''',
    css=KID_CSS + r'''
#reveal .q7{padding:30px 40px}
#reveal .qq{font:800 38px/1.3 var(--sans);color:var(--navy)}
#reveal .pic{margin-top:18px}
#reveal .prow{display:flex;align-items:center;height:68px;border-bottom:2px dashed #E3E7F1}
#reveal .prow span{width:90px;font:700 28px/1 var(--sans);color:#4A5576}
#reveal .prow div{display:flex;gap:10px;align-items:center}
#reveal .cu{display:block;width:44px;height:66px;opacity:0;transform:translateY(-14px) scale(.6);transition:opacity .15s,transform .15s}
#reveal .cu svg{display:block;width:44px;height:66px}
#reveal .cu.half{width:22px;overflow:hidden}
.slide.on#reveal .cu{opacity:1;transform:none;transition:opacity .3s ease calc(.6s + var(--n)*45ms),transform .45s cubic-bezier(.3,1.4,.5,1) calc(.6s + var(--n)*45ms)}
#reveal .key{display:flex;align-items:center;gap:10px;margin-top:16px;font:700 26px/1 var(--sans);color:#4A5576}
#reveal .key svg{width:30px;height:45px}
#reveal .kids7{display:flex;gap:70px}
#reveal .kg{position:relative;width:110px;height:200px}
#reveal .kg .kidb{position:absolute;left:0;bottom:0}
#reveal .kidb .arm{--a0:160deg;--a1:12deg;transform:rotate(160deg)}
.slide.on#reveal .kidb.up .arm{transform:rotate(12deg)}
#reveal .bub{position:absolute;left:70px;top:-30px;padding:10px 20px;border-radius:22px 22px 22px 6px;background:#fff;color:var(--navy);font:800 34px/1 var(--disp);
  box-shadow:0 10px 24px rgba(30,10,90,.25);opacity:0;transform:scale(.4);transform-origin:0 100%;transition:opacity .15s,transform .15s}
.slide.on#reveal .bub{opacity:1;transform:none;transition:opacity .3s ease calc(1s + var(--b,0)*.25s),transform .5s cubic-bezier(.3,1.5,.5,1) calc(1s + var(--b,0)*.25s)}
#reveal .b1{--b:1}#reveal .b2{--b:2}
[data-s="reveal"].ge4 #reveal .b2{background:var(--mint);color:#fff;box-shadow:0 0 0 6px #fff,0 10px 24px rgba(30,10,90,.25)}
[data-s="reveal"].ge4 #reveal .b0,[data-s="reveal"].ge4 #reveal .b1{opacity:.45}
#reveal .c3d{perspective:1800px}
#reveal .flip{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .75s cubic-bezier(.3,.7,.2,1)}
#reveal .face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:26px;display:flex;align-items:center;gap:28px;padding:0 36px}
#reveal .face.front{background:#6E4FE0;color:#fff;background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.07) 0 18px,transparent 18px 36px)}
#reveal .face.back{background:#fff;transform:rotateY(180deg);box-shadow:0 20px 44px rgba(30,10,90,.3)}
#reveal .no{display:grid;place-items:center;flex:none;width:76px;height:76px;border-radius:50%;font:800 38px/1 var(--disp)}
#reveal .front .no{background:rgba(255,255,255,.18)}#reveal .back .no{background:var(--sun);color:#5A3B00}
#reveal .fh{font:800 40px/1.2 var(--sans)}#reveal .q{margin-left:auto;font:800 64px/1 var(--disp);opacity:.6}
#reveal .bh{font:700 24px/1.3 var(--sans);color:#6E4FE0}
#reveal .ba{font:800 40px/1.3 var(--sans);color:var(--navy);margin-top:4px}
#reveal .ba b{color:var(--tomato)}
.ge1 #reveal .sc1 .flip,.ge2 #reveal .sc2 .flip,.ge3 #reveal .sc3 .flip,.ge4 #reveal .sc4 .flip{transform:rotateY(180deg)}
#reveal .note7{font:700 26px/1.4 var(--sans);text-align:right;color:#FFE08A}
''')
