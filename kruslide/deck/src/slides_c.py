# S10 video, S11 scale, S12 prices, S13 how to start, S14 the answer (clock -> logo).
import math
from core import icon, poly_css, polygon_circle, resample_poly
from art import clock, coin, CLOCK_CSS

SLIDES = []
def add(**k): SLIDES.append(k)

# =====================================================================================================
# S10 · video: the Ayutthaya trailer. Beat 1: the screen grows to full frame and plays. Beat 2: video prices.
vprices = [('i-video', 'การ์ตูน 2D', '100', 'บาท/นาที', 'var(--blue)'),
           ('i-cube', 'แบบหนัง 3D / ภาพยนตร์', '200–300', 'บาท/นาที', 'var(--tomato)'),
           ('i-mic', 'เสียงพากย์ AI ไทย/อังกฤษ', '+30', 'บาท/นาที', 'var(--lilac)')]
vp = ''.join(f'<div class="f2 vpr" style="left:1200px;top:{300 + k*150}px;--d:{.5 + k*.15:.2f}s"><i style="background:{c}">{icon(ic)}</i><div><p>{t}</p><b>{n}<small> {u}</small></b></div></div>'
             for k, (ic, t, n, u, c) in enumerate(vprices))
add(id='video', steps=2, title='วิดีโอโชว์เคส', bg='#140D0A', noclick=True,
    shapes={'': {'cols': ['#2A1A12'], 'op': .0, 'seed': 3, 'n': 0}},
    html=f'''
<p class="r x1 k" style="left:0;top:76px;width:1920px;text-align:center;color:#FFB59E;--i:0">วิดีโอโชว์เคส</p>
<h1 class="r x1 h2 lt" style="left:0;top:116px;width:1920px;text-align:center;font-size:66px;--i:1">เราทำวิดีโอแบบนี้ได้ด้วย</h1>
<div class="vbox ia" aria-label="ตัวอย่างหนังประวัติศาสตร์ อยุธยา"><video playsinline preload="metadata" poster="media/ayutthaya-poster.jpg"></video>
  <div class="vmiss"><b>วิดีโอกำลังเรนเดอร์</b><span>ไฟล์ media/ayutthaya-4k.mp4 จะเล่นที่นี่เมื่อพร้อม</span></div><i class="vplay">{icon('i-play')}</i></div>
<p class="r x1 cp lt" style="left:0;top:930px;width:1920px;text-align:center;--i:2">ตัวอย่างหนังประวัติศาสตร์ อยุธยา · 4K · ประมาณ 1 นาที · ภาพจาก Wikimedia Commons ที่อนุญาตให้ใช้ซ้ำ มีเครดิตท้ายคลิป</p>
<p class="f2 k" style="left:110px;top:120px;color:#FFB59E;--d:.3s">วิดีโอสอน</p>
<h1 class="f2 h2 lt" style="left:106px;top:160px;width:1700px;font-size:66px;--d:.35s">นาทีละ 100 บาท มีซับทุกเรื่อง</h1>
{vp}
<p class="f2 cp lt" style="left:1200px;top:760px;width:620px;--d:1s">ขั้นต่ำ 5 นาที · แบบหนังคิด ×2–×3 ของราคา 2D</p>
''',
    css=r'''
#video .vbox{left:360px;top:230px;width:1200px;height:675px;border-radius:22px;overflow:hidden;background:#000;box-shadow:0 40px 90px rgba(0,0,0,.6);cursor:pointer;z-index:2;
  transition:left .9s cubic-bezier(.6,0,.2,1),top .9s cubic-bezier(.6,0,.2,1),width .9s cubic-bezier(.6,0,.2,1),height .9s cubic-bezier(.6,0,.2,1),border-radius .9s}
#video video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
[data-s="video"][data-step="1"] #video .vbox{left:0;top:0;width:1920px;height:1080px;border-radius:0}
[data-s="video"][data-step="2"] #video .vbox{left:110px;top:300px;width:1000px;height:562px}
[data-s="video"][data-step="1"] .hud,[data-s="video"][data-step="1"] #brand{opacity:0}
#video .vmiss{position:absolute;left:0;right:0;bottom:0;padding:26px 34px;display:none;flex-direction:column;gap:6px;background:linear-gradient(transparent,rgba(0,0,0,.75));color:#fff}
#video .vmiss b{font:800 34px/1.3 var(--sans)}#video .vmiss span{font:500 22px/1.4 var(--sans);opacity:.8}
#video .nov .vmiss{display:flex}
#video .vplay{position:absolute;left:50%;top:50%;width:130px;height:130px;margin:-65px 0 0 -65px;border-radius:50%;background:rgba(255,255,255,.92);color:#B53A22;display:grid;place-items:center;
  transition:opacity .3s,transform .3s;box-shadow:0 14px 40px rgba(0,0,0,.4)}
#video .vplay .ic{width:62px;height:62px;margin-left:8px}
#video .vbox.playing .vplay,#video .vbox.nov .vplay{opacity:0;transform:scale(.6)}
.slide.on#video .vbox:not(.playing) video{animation:kb 20s ease-in-out infinite alternate}
@keyframes kb{to{transform:scale(1.06)}}
#video .vpr{display:flex;align-items:center;gap:24px;width:620px}
#video .vpr i{display:grid;place-items:center;flex:none;width:86px;height:86px;border-radius:26px;color:#fff}
#video .vpr .ic{width:46px;height:46px}
#video .vpr p{font:600 26px/1.3 var(--sans);color:rgba(255,255,255,.8)}
#video .vpr b{font:800 54px/1.15 var(--disp);color:#fff}#video .vpr small{font:700 26px/1 var(--sans);color:#FFB59E}
''',
    js=r'''
window.__hooks.video=(function(){var v,box,ok=false;
  function init(){if(v)return;v=document.querySelector('#video video');box=v.parentNode;
    var big=(screen.width*(window.devicePixelRatio||1))>=2500,list=big?['media/ayutthaya-4k.mp4','media/ayutthaya-1080.mp4']:['media/ayutthaya-1080.mp4','media/ayutthaya-4k.mp4'],k=0;
    function next(){if(k>=list.length){box.classList.add('nov');return;}v.src=list[k++];v.load();}
    v.addEventListener('error',next);v.addEventListener('loadedmetadata',function(){ok=true;box.classList.remove('nov');});
    v.addEventListener('play',function(){box.classList.add('playing');});v.addEventListener('pause',function(){box.classList.remove('playing');});
    v.addEventListener('ended',function(){box.classList.remove('playing');});
    box.addEventListener('click',function(e){e.stopPropagation();if(v.paused){if(v.ended)v.currentTime=0;var p=v.play();if(p&&p.catch)p.catch(function(){});}else v.pause();});
    next();}
  return {enter:function(){init();},
    beat:function(st){init();if(st===1){if(v.ended)v.currentTime=0;var p=v.play();if(p&&p.catch)p.catch(function(){});}else v.pause();},
    leave:function(){if(v)v.pause();}};})();
''')

# =====================================================================================================
# S11 · scale: 33 hours of the teacher's time against 10 satang a day.
cks = ''
for k in range(33):
    row, col = divmod(k, 8)
    x = 18 + col * 34 + (row % 2) * 17; y = 150 - row * 30
    cks += f'<i class="mc" style="left:{x}px;top:{y}px;--n:{k}">{icon("i-clock")}</i>'
add(id='scale', steps=2, title='ราคา: ชั่งดู', bg='#FFC83D', light=True,
    shapes={'': {'cols': ['#FFFFFF', '#F2553C', '#FFE08A'], 'op': .3, 'seed': 111, 'n': 5}},
    html=f'''
<p class="r k dk" style="left:110px;top:84px;--i:0">ราคา · ชั่งดู</p>
<h1 class="r x1 h2 dk" style="left:106px;top:124px;width:1700px;font-size:72px;--i:1">เวลาของครู กับ ราคาสไลด์</h1>
<h1 class="o1 h2 dk" style="left:106px;top:124px;width:1700px;font-size:72px">สไลด์ละ <span class="mark">10 สตางค์</span> ต่อวัน</h1>
<h1 class="f2 h2 dk" style="left:106px;top:124px;width:1700px;font-size:72px">จ่ายนิดเดียว ได้คืน <span class="mark">33 ชั่วโมง</span></h1>
<svg class="r home" viewBox="0 0 360 330" style="left:110px;top:560px;--i:3" aria-hidden="true">
  <path d="M30 150 L180 30 L330 150 V320 H30 Z" fill="#fff"/><path d="M10 160 L180 20 L350 160" fill="none" stroke="#1C2A55" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="70" y="190" width="90" height="80" rx="10" class="win"/><rect x="210" y="200" width="80" height="120" rx="10" fill="#F2553C"/><circle cx="272" cy="262" r="6" fill="#FFC83D"/>
  <path d="M115 190v80M70 230h90" stroke="#fff" stroke-width="6"/></svg>
<p class="f2 pill back" style="left:110px;top:476px;--d:1.3s">{icon('i-clock')}+33 ชั่วโมง คืนให้ครู</p>
<div class="r sc" style="left:0;top:0;--i:2">
  <i class="post"></i><i class="base"></i>
  <div class="beam"><i class="pivot"></i>
    <div class="hang l"><svg class="str" viewBox="0 0 320 240" aria-hidden="true"><path d="M160 0 L22 236 M160 0 L298 236"/></svg><div class="dish"><div class="pile">{cks}</div></div></div>
    <div class="hang r"><svg class="str" viewBox="0 0 320 240" aria-hidden="true"><path d="M160 0 L22 236 M160 0 L298 236"/></svg><div class="dish">{coin(120, 100, -112, 'drop')}</div></div>
  </div>
</div>
<p class="r pl dk" style="left:580px;top:846px;width:440px;--i:4">เวลาทำสไลด์ 1 บท<br><b>≈ 33 ชั่วโมง</b></p>
<p class="f1 pl dk" style="left:1450px;top:846px;width:420px;--d:.9s">สไลด์ละ 3 บาท/เดือน<br><b>= 10 สตางค์/วัน</b></p>
<p class="r cp dk" style="left:580px;top:950px;width:1260px;--i:5">ตัวอย่าง: 3 บาท ÷ 30 วัน = 0.10 บาท · บทที่ 4 (67 สไลด์) = 201–335 บาท/เดือน · ทั้งเล่ม เช่น 5 บท ≈ 335 สไลด์ = 1,005–1,675 บาท/เดือน · ชั่วโมงเป็นตัวอย่างคำนวณ</p>
''',
    css=r'''
#scale .sc{width:0;height:0}
#scale .post{position:absolute;left:1218px;top:430px;width:26px;height:470px;border-radius:13px;background:var(--navy)}
#scale .base{position:absolute;left:1080px;top:880px;width:300px;height:34px;border-radius:17px;background:var(--navy)}
#scale .beam{position:absolute;left:800px;top:412px;width:860px;height:20px;border-radius:10px;background:var(--navy);transform-origin:50% 50%;transform:rotate(-13deg);
  transition:transform 1.3s cubic-bezier(.35,1.25,.45,1) .2s}
#scale .pivot{position:absolute;left:408px;top:-12px;width:44px;height:44px;border-radius:50%;background:var(--tomato);box-shadow:0 0 0 8px var(--navy)}
#scale .hang{position:absolute;top:10px;width:320px;height:330px;transform-origin:50% 0;transform:rotate(13deg);transition:transform 1.3s cubic-bezier(.35,1.25,.45,1) .2s}
#scale .hang.l{left:-160px}#scale .hang.r{right:-160px}
#scale .str{position:absolute;left:0;top:0;width:320px;height:240px}#scale .str path{fill:none;stroke:#1C2A55;stroke-width:4}
#scale .dish{position:absolute;left:0;top:236px;width:320px;height:40px;border-radius:0 0 160px 160px/0 0 40px 40px;background:#fff;box-shadow:0 10px 0 rgba(28,42,85,.15)}
#scale .pile{position:absolute;left:0;bottom:30px;width:320px;height:200px}
#scale .mc{position:absolute;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:#FBF1E2;color:var(--navy);box-shadow:0 0 0 3px var(--navy);
  opacity:0;transform:translateY(-500px);transition:opacity .15s,transform .15s}
#scale .mc .ic{width:30px;height:30px;stroke-width:2.6}
.slide.on#scale .mc{opacity:1;transform:none;transition:opacity .2s ease calc(.3s + var(--n)*35ms),transform .6s cubic-bezier(.5,0,.5,1.3) calc(.3s + var(--n)*35ms)}
[data-s="scale"].ge2 #scale .mc{opacity:0;transform:translate(-560px,150px) scale(.3);transition:opacity .4s ease calc(.6s + var(--n)*20ms),transform .9s cubic-bezier(.5,0,.3,1) calc(var(--n)*20ms)}
#scale .coin.drop{position:absolute;opacity:0;transform:translateY(-520px);transition:opacity .15s,transform .15s}
[data-s="scale"].ge1 #scale .coin.drop{opacity:1;transform:none;transition:opacity .2s ease .1s,transform .6s cubic-bezier(.5,0,.5,1.3) .1s}
[data-s="scale"].ge1 #scale .beam{transform:rotate(-11deg)}[data-s="scale"].ge1 #scale .hang{transform:rotate(11deg)}
[data-s="scale"].ge2 #scale .beam{transform:rotate(9deg);transition-delay:.7s}[data-s="scale"].ge2 #scale .hang{transform:rotate(-9deg);transition-delay:.7s}
#scale .home{width:360px;height:330px}
#scale .home .win{fill:#1C2A55;transition:fill .6s ease 1.2s}[data-s="scale"].ge2 #scale .home .win{fill:#FFE08A}
#scale .back{background:var(--navy);color:#fff}#scale .back .ic{color:var(--sun)}
#scale .pl{font:600 28px/1.35 var(--sans);text-align:center}#scale .pl b{font:800 36px/1.3 var(--sans)}
''')

# =====================================================================================================
# S12 · prices: eight face-down cards. The audience guesses; the main card flips first, then the other seven in a wave.
P = [('i-slides', 'สไลด์บทเรียน ทั้งเล่ม', '3–5', 'บาท / สไลด์ / เดือน', '1 บท ≈ 200–335 บาท/เดือน', True),
     ('i-palette', 'ธีมโรงเรียน (โลโก้ + สี)', '990', 'บาท ครั้งเดียว', 'ใช้ได้กับทุกสไตล์', False),
     ('i-book', 'ทำบทใหม่ จากแผนการสอน', '1,990', 'บาท / บท', 'แอนิเมชันและเครื่องมือตอบครบ', False),
     ('i-lock', 'เฉลยทั้งเล่ม + เว็บล็อกรหัส', '590', 'บาท / บท', 'เฉลยแสดงวิธีทำทุกข้อ', False),
     ('i-video', 'วิดีโอสอน 2D', '100', 'บาท / นาที', 'ขั้นต่ำ 5 นาที · มีซับ', False),
     ('i-cube', 'วิดีโอแบบหนัง 3D', '200–300', 'บาท / นาที', 'เสียงพากย์ AI +30 บาท/นาที', False),
     ('i-present', 'สไลด์นำเสนอ ≤ 15 หน้า', '2,490', 'บาท', 'พร้อมบทพูด', False),
     ('i-web', 'เว็บไซต์โรงเรียน', '4,990', 'บาท · 1 หน้า', '5–10 หน้า 12,900 · 15+ หน้า 19,900', False)]
cards = ''
for k, (ic, name, price, unit, note, main) in enumerate(P):
    col, row = k % 4, k // 4
    x, y = 110 + col * 435, 300 + row * 345
    dx, dy = 960 - 200 - x, 560 - 160 - y
    cards += (f'<div class="pc c3d{" main" if main else ""}" style="left:{x}px;top:{y}px;--dx:{dx}px;--dy:{dy}px;--n:{k};--w:{(col + row) * .09:.2f}s"><div class="flip">'
              f'<div class="face front"><i class="pi">{icon(ic)}</i><p class="pn">{name}</p><b class="q">?</b><span class="g">ทายราคา</span></div>'
              f'<div class="face back"><p class="pn">{name}</p><b class="pr"{' style="font-size:70px"' if len(price) > 5 else ''}>{price}</b><span class="pu">{unit}</span><span class="nt">{note}</span></div></div></div>')
add(id='prices', steps=2, title='ราคาทั้งหมด', bg='#F2553C',
    shapes={'': {'cols': ['#FFC83D', '#FFFFFF', '#D9442F'], 'op': .22, 'seed': 121, 'n': 6}},
    html=f'''
<p class="r k" style="left:110px;top:84px;color:#FFE08A;--i:0">ราคาทั้งหมด · ผู้ฟังทาย</p>
<h1 class="r h2 lt" style="left:106px;top:124px;width:1200px;font-size:72px;--i:1">ทายก่อน แล้วพลิกดู</h1>
<p class="r ld lt" style="left:1180px;top:150px;width:640px;text-align:right;--i:2">ตะโกนตัวเลขได้เลย · ใครใกล้สุดชนะ</p>
{cards}
<p class="f1 badge" style="left:150px;top:256px;--d:.8s">★ สินค้าหลัก</p>
''',
    css=r'''
#prices .pc{width:400px;height:320px;perspective:1800px;opacity:0;transform:translate(var(--dx),var(--dy)) rotate(calc(var(--n)*3deg - 10deg)) scale(.9);transition:opacity .15s,transform .15s}
.slide.on#prices .pc{opacity:1;transform:none;transition:opacity .2s ease calc(.3s + var(--n)*.07s),transform .7s cubic-bezier(.2,.9,.25,1) calc(.3s + var(--n)*.07s)}
#prices .flip{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .8s cubic-bezier(.3,.7,.2,1)}
#prices .face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:28px;padding:30px 30px;display:flex;flex-direction:column}
#prices .front{background:#fff;color:var(--navy);box-shadow:0 20px 44px rgba(120,20,0,.28);background-image:repeating-linear-gradient(135deg,rgba(242,85,60,.06) 0 22px,transparent 22px 44px)}
#prices .back{background:var(--navy);color:#fff;transform:rotateY(180deg);box-shadow:0 20px 44px rgba(120,20,0,.35)}
#prices .pi{display:grid;place-items:center;width:64px;height:64px;border-radius:20px;background:var(--ltomato);color:var(--tomato)}
#prices .pi .ic{width:36px;height:36px}
#prices .front .pn{margin-top:auto;font:800 30px/1.3 var(--sans)}
#prices .q{position:absolute;right:30px;top:26px;display:grid;place-items:center;width:120px;height:120px;border-radius:50%;background:var(--tomato);color:#fff;font:800 76px/1 var(--disp);animation:qwob 2.6s ease-in-out infinite;animation-delay:calc(var(--n)*-.31s)}
@keyframes qwob{50%{transform:rotate(10deg) scale(1.06)}}
#prices .g{margin-top:8px;font:700 22px/1 var(--sans);color:#C2410C}
#prices .back .pn{font:700 24px/1.3 var(--sans);color:#9FC0FF}
#prices .pr{margin-top:12px;font:800 84px/1 var(--disp);color:var(--sun);letter-spacing:-.02em;white-space:nowrap}
#prices .pu{margin-top:8px;font:700 26px/1.3 var(--sans)}
#prices .nt{margin-top:auto;font:500 21px/1.35 var(--sans);color:rgba(255,255,255,.75)}
[data-s="prices"].ge1 #prices .main .flip{transform:rotateY(180deg)}
[data-s="prices"].ge1 #prices .main{z-index:3}
[data-s="prices"].ge1.slide #prices .main{}
[data-s="prices"].ge2 #prices .pc:not(.main) .flip{transform:rotateY(180deg);transition:transform .8s cubic-bezier(.3,.7,.2,1) var(--w)}
#prices .main .back{background:#fff;color:var(--navy);box-shadow:0 0 0 8px var(--sun),0 24px 50px rgba(120,20,0,.4)}
#prices .main .back .pn{color:#C2410C}#prices .main .pr{color:var(--tomato)}#prices .main .nt{color:#4A5576}
#prices .badge{z-index:5;padding:10px 22px;border-radius:999px;background:var(--sun);color:#5A3B00;font:800 26px/1.2 var(--sans);box-shadow:0 10px 24px rgba(0,0,0,.2)}
''')

# =====================================================================================================
# S13 · start: one object travels along a path and changes at each stop: chat -> style quiz -> classroom screen.
st13 = [(380, 'แอด LINE @368lkkze', 'บอกชื่อหนังสือ ชั้น และบทที่สอน'),
        (960, 'เลือกสไตล์', 'ตอบแบบทดสอบสั้น ๆ · โอนผ่านพร้อมเพย์'),
        (1540, 'เปิดลิงก์ในห้องเรียน', 'ไม่ต้องติดตั้ง · ใช้กับโปรเจกเตอร์และจอสัมผัส')]
stops = ''.join(f'<div class="stn n{k}" style="left:{x-48}px;top:600px"><b>{k+1}</b></div>'
                f'<p class="{"r" if k == 0 else "f" + str(k)} stt lt" style="left:{x-280}px;top:730px;width:560px;--i:3;--d:.7s">{t}</p>'
                f'<p class="{"r" if k == 0 else "f" + str(k)} std lt" style="left:{x-280}px;top:792px;width:560px;--i:4;--d:.8s">{d}</p>' for k, (x, t, d) in enumerate(st13))
add(id='start', steps=2, title='เริ่มยังไง', bg='#18B07F',
    shapes={'': {'cols': ['#FFFFFF', '#FFC83D', '#0E8F68'], 'op': .2, 'seed': 131, 'n': 6}},
    html=f'''
<p class="r k" style="left:110px;top:84px;color:#FFE08A;--i:0">เริ่มใช้</p>
<h1 class="r h2 lt" style="left:106px;top:124px;width:1500px;font-size:72px;--i:1">เริ่มได้ใน 3 ขั้น</h1>
<svg class="r rail13" viewBox="0 0 1920 200" style="left:0;top:548px;--i:2" aria-hidden="true"><path class="bgp" d="M380 100 C620 20 720 180 960 100 S1300 20 1540 100"/>
  <path class="fg" pathLength="1" d="M380 100 C620 20 720 180 960 100 S1300 20 1540 100"/></svg>
{stops}
<div class="trav" aria-hidden="true">
  <div class="o chat"><p class="b1">ครูขอบท 5 ค่ะ</p><p class="b2">ได้เลยครับ ✓</p></div>
  <div class="o quiz"><p>ชอบแบบไหน?</p><i class="on">A</i><i>B</i><i>C</i></div>
  <div class="o room"><div class="scrn"><svg viewBox="0 0 300 150" aria-hidden="true"><rect x="0" y="0" width="150" height="14" rx="7" fill="#3D7BFF"/><rect x="0" y="26" width="220" height="10" rx="5" fill="#DCE6FF"/><line x1="10" y1="140" x2="190" y2="140" stroke="#1C2A55" stroke-width="3"/><rect x="22" y="96" width="26" height="44" rx="5" fill="#3D7BFF"/><rect x="62" y="70" width="26" height="70" rx="5" fill="#8B6CF6"/><rect x="102" y="84" width="26" height="56" rx="5" fill="#F2553C"/><rect x="142" y="58" width="26" height="82" rx="5" fill="#FFC83D"/><rect x="210" y="60" width="86" height="30" rx="10" fill="#E3F7EF" stroke="#18B07F" stroke-width="2"/><rect x="210" y="100" width="86" height="30" rx="10" fill="#fff" stroke="#D3DAE8" stroke-width="2"/></svg><span>Licensed to ครูผู้สอน · โรงเรียนของคุณ</span></div></div>
</div>
''',
    css=r'''
#start .rail13{width:1920px;height:200px}
#start .rail13 path{fill:none;stroke-width:10;stroke-linecap:round}
#start .bgp{stroke:rgba(255,255,255,.25);stroke-dasharray:2 22}
#start .fg{stroke:#fff;stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset .9s ease}
[data-s="start"][data-step="1"] #start .fg{stroke-dashoffset:.5}[data-s="start"][data-step="2"] #start .fg{stroke-dashoffset:0}
#start .stn{width:96px;height:96px;border-radius:50%;background:rgba(255,255,255,.25);display:grid;place-items:center;transition:background-color .4s ease .6s,transform .4s ease .6s}
#start .stn b{font:800 44px/1 var(--disp);color:#fff}
.slide.on#start .n0,[data-s="start"].ge1 #start .n1,[data-s="start"].ge2 #start .n2{background:#fff;transform:scale(1.08)}
.slide.on#start .n0 b,[data-s="start"].ge1 #start .n1 b,[data-s="start"].ge2 #start .n2 b{color:#0E8F68}
#start .stt{font:800 40px/1.3 var(--sans);text-align:center}
#start .std{font:500 26px/1.45 var(--sans);text-align:center;color:rgba(255,255,255,.9)}
#start .trav{left:200px;top:250px;width:360px;height:320px;transition:transform 1s cubic-bezier(.55,0,.25,1)}
[data-s="start"][data-step="1"] #start .trav{transform:translateX(580px)}[data-s="start"][data-step="2"] #start .trav{transform:translateX(1160px)}
#start .o{position:absolute;left:0;bottom:24px;width:360px;opacity:0;transform:scale(.7);transition:opacity .25s ease,transform .35s ease}
[data-s="start"][data-step="0"] #start .chat,[data-s="start"][data-step="1"] #start .quiz,[data-s="start"][data-step="2"] #start .room{opacity:1;transform:none;transition:opacity .35s ease .85s,transform .5s cubic-bezier(.3,1.4,.5,1) .85s}
#start .chat p{margin:0 0 14px;padding:18px 26px;border-radius:26px;font:700 32px/1.3 var(--sans);width:max-content;max-width:360px}
#start .chat .b1{background:#fff;color:var(--navy);border-bottom-left-radius:6px}
#start .chat .b2{margin-left:auto;background:#06A15F;color:#fff;border-bottom-right-radius:6px}
#start .quiz{background:#fff;border-radius:26px;padding:22px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;box-shadow:0 20px 40px rgba(0,60,40,.25)}
#start .quiz p{grid-column:1/4;margin:0;font:800 34px/1.3 var(--sans);color:var(--navy)}
#start .quiz i{display:grid;place-items:center;height:96px;border-radius:18px;background:#EEF1F7;font:800 34px/1 var(--sans);font-style:normal;color:var(--navy)}
#start .quiz i.on{background:var(--navy);color:var(--sun)}
#start .room .scrn{position:relative;height:240px;border-radius:18px;background:#fff;border:10px solid var(--navy);box-shadow:0 20px 40px rgba(0,60,40,.25);padding:20px}
#start .scrn svg{display:block;width:100%;height:150px}
#start .scrn span{position:absolute;left:14px;right:14px;bottom:12px;font:600 17px/1.3 var(--sans);color:#8A93AE;text-align:center}
''')

# =====================================================================================================
# S14 · end: the clock rewinds to Sunday 21:00, the coin arrives, then clock + coin become the KruSlide logo.
cur_pts = [(52, 52), (88, 84), (68, 82), (60, 100)]
cursor_poly = resample_poly([(x / 120 * 100, y / 120 * 100) for x, y in cur_pts], 24)
# the coin box sits on the cursor's bounding box (x 52..88, y 52..100 of the 120 grid); map its polygon into that box
bx0, by0, bw, bh = 52 / 120, 52 / 120, 36 / 120, 48 / 120
cursor_local = [((x / 100 - bx0) / bw * 100, (y / 100 - by0) / bh * 100) for x, y in cursor_poly]
circle_local = polygon_circle(24)
add(id='end', steps=3, title='คำตอบ', bg='#16224A', light_at=2, bg_at='2:#FBF1E2',
    shapes={'': {'cols': ['#22306A', '#2A3B7C'], 'op': .45, 'seed': 141, 'n': 4},
            '2': {'cols': ['#FFC83D', '#3D7BFF', '#F2553C', '#18B07F'], 'op': .22, 'seed': 143, 'n': 7},
            '3': {'cols': ['#FFC83D', '#3D7BFF', '#F2553C', '#18B07F'], 'op': .22, 'seed': 143, 'n': 7}},
    html=clock('ck2', 520, 1180, 230, '') + f'''
<div class="coinm" aria-hidden="true"><div class="cn"><b>10</b><span>สตางค์</span></div></div>
<p class="r x2 pill timep lt" style="left:110px;top:150px;--i:0">{icon('i-clock')}อาทิตย์ 21:00 · ว่างแล้ว</p>
<p class="r x2 k" style="left:110px;top:240px;color:var(--sun);--i:0">คำตอบ</p>
<h1 class="r x2 h2 lt" style="left:106px;top:284px;width:1000px;font-size:80px;--i:1">คาบที่เด็กอยากยกมือ<br>ไม่ต้องแลกด้วยคืนวันอาทิตย์</h1>
<p class="f1 x2 h3 lt" style="left:290px;top:600px;width:800px;--d:.6s">แค่สไลด์ละ 10 สตางค์ต่อวัน</p>
<div class="f2 wm" style="left:640px;top:370px;--d:1.2s"><b>Kru<i>Slide</i></b><span>ครูสไลด์ · สไลด์ที่ทำให้ทั้งห้องอยากตอบ</span></div>
<div class="f2 qr card" style="left:1360px;top:250px;--d:1.5s"><img src="img/qr-line.svg" alt="QR code: LINE @368lkkze"><p class="l1">แอด LINE</p><p class="l2">@368lkkze</p><p class="l3">คุยกับเรา · ขอดูตัวอย่างบทเรียน</p></div>
<p class="f2 cp dk" style="left:644px;top:650px;width:660px;--d:1.6s">© KruSlide · ราคาที่เห็นเป็นราคาวันนี้ อาจปรับขึ้นภายหลัง</p>
<div class="f3 sheet" style="left:0;top:0">
  <p class="k" style="color:#C2410C">ที่มาและเครดิต</p>
  <h2 class="h3 dk">คาบที่เด็กอยากยกมือ แลกด้วยแชทเดียว ไม่ใช่คืนวันอาทิตย์</h2>
  <ul>
    <li><b>ตัวเลขชั่วโมง</b> (4.5 ชม., 33 ชม.) เป็นตัวอย่างคำนวณ: 67 สไลด์ × ประมาณ 30 นาที ไม่ใช่ข้อมูลสำรวจ</li>
    <li><b>ความเร็วเว็บโรงเรียน</b>: Lighthouse 13.6 วัดหน้าละ 3 รอบ ใช้ค่ากลาง 25 พ.ย. 2569 (คะแนนความเร็วบนคอมพิวเตอร์ 100 จากเดิม 60 · เวลาเปิดภาพหลักบนมือถือ 2.7 วินาที จากเดิม 23.6)</li>
    <li><b>วิดีโออยุธยา</b>: ภาพจาก Wikimedia Commons (สาธารณสมบัติ, CC0, CC BY, CC BY-SA) เครดิตครบท้ายคลิปและใน kruslide/trailer/credits.md · เสียงบรรยาย AI · ดนตรีสังเคราะห์ขึ้นเอง</li>
    <li><b>งานโรงเรียนสาธิต มรภ.เพชรบุรี</b>: ภาพจากเพจของโรงเรียน ใช้โดยได้รับอนุญาต</li>
    <li><b>ภาพประกอบในสไลด์นี้</b> วาดขึ้นใหม่ทั้งหมด ไม่มีภาพถ่ายบุคคลจริง · ฟอนต์ Anuphan, Inter และ Nothing You Could Do (SIL Open Font License)</li>
  </ul>
  <div class="mini"><img src="img/qr-line.svg" alt=""><p><b>@368lkkze</b><span>แอด LINE คุยกับเรา</span></p></div>
</div>
''',
    css=r'''
/* clock -> logo. Logo geometry (120 grid): bar x26..44 y24..96 rx7 · stroke (50,60)->(86,26) w18 · cursor (52,52)(88,84)(68,82)(60,100) */
#end .clk{z-index:2;transition:--S 1.1s var(--ease) .1s,left 1.1s var(--ease) .1s,top 1.1s var(--ease) .1s}
#end .hh{--rot:405}#end .mh{--rot:1980}
.slide.on#end .hh{--rot:270}.slide.on#end .mh{--rot:360}
.slide.on#end .hand{transition:--rot 2s cubic-bezier(.45,0,.2,1) .4s,--px 1s var(--ease) .3s,--py 1s var(--ease) .3s,--w 1s var(--ease) .3s,--L 1s var(--ease) .3s,--t 1s var(--ease) .3s,--rad 1s var(--ease) .3s,background-color .9s ease .3s}
[data-s="end"].ge2 #end .clk{--S:420px!important;left:150px!important;top:330px!important}
[data-s="end"].ge2 #end .face{border-radius:calc(var(--S)*.2667);background:var(--navy);box-shadow:0 30px 70px rgba(28,42,85,.35)}
[data-s="end"].ge2 #end .ticks,[data-s="end"].ge2 #end .pin{opacity:0}
[data-s="end"].ge2 #end .hh{--rot:360;--px:.2917;--py:.725;--w:.15;--L:.525;--t:.075;--rad:.0583;background:#fff}
[data-s="end"].ge2 #end .mh{--rot:406.64;--px:.4167;--py:.5;--w:.15;--L:.4877;--t:.075;--rad:.075;background:var(--blue)}
[data-s="end"].ge2.slide{}
#end .coinm{left:110px;top:574px;width:150px;height:150px;z-index:3;opacity:0;transform:translateY(-300px);transition:opacity .2s,transform .2s,left 1.1s var(--ease) .25s,top 1.1s var(--ease) .25s,width 1.1s var(--ease) .25s,height 1.1s var(--ease) .25s}
#end .cn{position:absolute;inset:0;background:#FFC83D;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#7A4A00;
  clip-path:CIRCLE;transition:clip-path 1.1s var(--ease) .25s}
#end .cn::before{content:"";position:absolute;inset:9px;border-radius:50%;border:6px solid #F0A91C;transition:opacity .3s}
#end .cn b{font:800 62px/1 var(--disp);transition:opacity .3s}#end .cn span{font:700 22px/1.2 var(--sans);transition:opacity .3s}
[data-s="end"].ge1 #end .coinm{opacity:1;transform:none;transition:opacity .2s ease .2s,transform .7s cubic-bezier(.5,0,.5,1.3) .2s}
[data-s="end"].ge2 #end .coinm{left:332px;top:512px;width:126px;height:168px}
[data-s="end"].ge2 #end .cn{clip-path:CURSOR}
[data-s="end"].ge2 #end .cn b,[data-s="end"].ge2 #end .cn span,[data-s="end"].ge2 #end .cn::before{opacity:0}
#end .timep{background:rgba(255,255,255,.12);color:#FFE3A0}#end .timep .ic{color:var(--sun)}
#end .wm b{display:block;font:800 150px/1.05 var(--sans);letter-spacing:-.03em;color:var(--navy)}
#end .wm b i{font-style:normal;color:var(--blue)}
#end .wm span{display:block;margin-top:14px;font:700 34px/1.35 var(--sans);color:#465069}
#end .qr{width:420px;padding:34px 34px 30px;text-align:center}
#end .qr img{width:300px;height:300px;display:block;margin:0 auto 16px}
#end .qr .l1{font:700 26px/1.2 var(--sans);color:#06A15F}#end .qr .l2{font:800 52px/1.2 var(--disp);color:var(--navy)}#end .qr .l3{font:600 22px/1.4 var(--sans);color:#4A5576;margin-top:6px}
#end .sheet{width:1920px;height:1080px;z-index:20;background:#FBF1E2;padding:110px 120px;transform:translateY(102%);opacity:1;transition:transform .7s var(--ease)}
[data-s="end"].ge3 #end .sheet{transform:none}
#end .sheet h2{margin:16px 0 34px}
#end .sheet ul{margin:0;padding:0 0 0 30px;display:flex;flex-direction:column;gap:20px}
#end .sheet li{font:500 28px/1.5 var(--sans);color:#2E3A60}
#end .sheet .mini{position:absolute;right:120px;bottom:90px;display:flex;align-items:center;gap:26px;padding:22px 30px 22px 22px;border-radius:26px;background:#fff;box-shadow:0 16px 40px rgba(28,42,85,.12)}
#end .sheet .mini img{width:170px;height:170px}
#end .sheet .mini b{display:block;font:800 44px/1.2 var(--disp);color:var(--navy)}#end .sheet .mini span{font:600 24px/1.3 var(--sans);color:#06A15F}
[data-s="end"].ge2 #brand{opacity:0}
''' .replace('CIRCLE', poly_css(circle_local)).replace('CURSOR', poly_css(cursor_local)),
    js='')
