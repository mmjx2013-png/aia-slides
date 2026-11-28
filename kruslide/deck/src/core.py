# Core of the KruSlide showcase deck: fonts, design tokens, shared components, chrome and the engine.
# The engine is adapted from the type-1 template (~/.claude/skills/type1-deck/template/index.html):
# stage scaling, beats (.ge1..), counting numbers, the drag-anywhere .compare slider, keys, swipe, hash links,
# motion toggle. Voice and auto-play were removed (the owner presents live). Added: deck:change events for
# tools.js (the real Unit 4 widgets and pen), per-slide hooks, a living background, a full-screen sample viewer.
import pathlib, math

ROOT = pathlib.Path(__file__).resolve().parent.parent

FONTS = r'''
@font-face{font-family:KS;src:url(fonts/Inter-Regular.woff2) format("woff2");font-weight:400;font-display:block}
@font-face{font-family:KS;src:url(fonts/Inter-Medium.woff2) format("woff2");font-weight:500;font-display:block}
@font-face{font-family:KS;src:url(fonts/Inter-SemiBold.woff2) format("woff2");font-weight:600;font-display:block}
@font-face{font-family:KS;src:url(fonts/Inter-Bold.woff2) format("woff2");font-weight:700;font-display:block}
@font-face{font-family:KS;src:url(fonts/Inter-ExtraBold.woff2) format("woff2");font-weight:800;font-display:block}
@font-face{font-family:KS;src:url(fonts/Anuphan-Thai-400.woff2) format("woff2");font-weight:400 500;unicode-range:U+0E00-0E7F;font-display:block}
@font-face{font-family:KS;src:url(fonts/Anuphan-Thai-600.woff2) format("woff2");font-weight:600;unicode-range:U+0E00-0E7F;font-display:block}
@font-face{font-family:KS;src:url(fonts/Anuphan-Thai-700.woff2) format("woff2");font-weight:700 800;unicode-range:U+0E00-0E7F;font-display:block}
@font-face{font-family:KSD;src:url(fonts/InterDisplay-ExtraBold.woff2) format("woff2");font-weight:800;font-display:block}
@font-face{font-family:KSD;src:url(fonts/InterDisplay-Bold.woff2) format("woff2");font-weight:700;font-display:block}
@font-face{font-family:KSD;src:url(fonts/Anuphan-Thai-700.woff2) format("woff2");font-weight:700 800;unicode-range:U+0E00-0E7F;font-display:block}
@font-face{font-family:Hand;src:url(fonts/NothingYouCouldDo.woff2) format("woff2");font-display:block}
/* tools.js / tools.css (the real Unit 4 widgets) ask for "Inter" by name */
@font-face{font-family:Inter;src:url(fonts/Inter-Medium.woff2) format("woff2");font-weight:400 500}
@font-face{font-family:Inter;src:url(fonts/Inter-SemiBold.woff2) format("woff2");font-weight:600}
@font-face{font-family:Inter;src:url(fonts/Inter-Bold.woff2) format("woff2");font-weight:700}
@font-face{font-family:Inter;src:url(fonts/Inter-ExtraBold.woff2) format("woff2");font-weight:800}
@font-face{font-family:Inter;src:url(fonts/Anuphan-Thai-400.woff2) format("woff2");font-weight:400 500;unicode-range:U+0E00-0E7F}
@font-face{font-family:Inter;src:url(fonts/Anuphan-Thai-600.woff2) format("woff2");font-weight:600;unicode-range:U+0E00-0E7F}
@font-face{font-family:Inter;src:url(fonts/Anuphan-Thai-700.woff2) format("woff2");font-weight:700 800;unicode-range:U+0E00-0E7F}
'''

BASE_CSS = r'''
:root{
  --navy:#1C2A55;--blue:#3D7BFF;--tomato:#F2553C;--sun:#FFC83D;--mint:#18B07F;--lilac:#8B6CF6;--paper:#FBF1E2;
  --night:#16224A;--ink:#1C2A55;--white:#fff;
  --lblue:#E6EEFF;--lsun:#FFF1C7;--lmint:#DDF4EA;--llilac:#EEE9FF;--ltomato:#FFE4DE;
  /* tools.css tokens, mapped to the KruSlide palette */
  --coral:#F2553C;--violet:#8B6CF6;--mute:#5B6785;--line:#D3DAE8;--lcoral:#FFF0EE;--lviolet:#F1EDFF;--okc:#0E8F68;--noc:#D9442F;
  --tea:#F6D7AE;--lid:#3D7BFF;--straw:#F2553C;--pearl:#3A2618;--badge:#fff;--ol:transparent;--olw:0;
  --skin:#F5C9A4;--hair:#2A2230;--shirt:#3D7BFF;
  --ease:cubic-bezier(.22,.8,.24,1);--sans:KS,system-ui,sans-serif;--disp:KSD,KS,system-ui,sans-serif;--hand:Hand,KS,sans-serif;
}
@property --S{syntax:"<length>";inherits:true;initial-value:520px}
@property --rot{syntax:"<number>";inherits:false;initial-value:0}
@property --px{syntax:"<number>";inherits:false;initial-value:.5}
@property --py{syntax:"<number>";inherits:false;initial-value:.5}
@property --w{syntax:"<number>";inherits:false;initial-value:.04}
@property --L{syntax:"<number>";inherits:false;initial-value:.3}
@property --t{syntax:"<number>";inherits:false;initial-value:.04}
@property --rad{syntax:"<number>";inherits:false;initial-value:.02}
*{box-sizing:border-box}
html,body{height:100%;margin:0;background:#0E1430;overflow:hidden}
body{font-family:var(--sans);color:var(--ink);-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;opacity:0;transition:opacity .3s ease}
body.ready{opacity:1}
#vp{position:fixed;inset:0;overflow:hidden;cursor:default}
#stage{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0;overflow:hidden;background:var(--night);--bg:var(--night)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
svg{overflow:visible}

/* ---------- living background: one colour field that flows from slide to slide + drifting brand shapes ---------- */
#bg{position:absolute;inset:0;background:var(--bg);transition:background-color 1s ease}
#shapes{position:absolute;inset:0;pointer-events:none}
.shp{position:absolute;left:0;top:0;width:200px;height:200px;opacity:0;
  transition:left 1.5s var(--ease),top 1.5s var(--ease),width 1.5s var(--ease),height 1.5s var(--ease),opacity 1s ease}
.shp b{position:absolute;inset:0;display:block;background:var(--c,#fff);transition:background-color 1.2s ease,border-radius 1.2s ease;
  animation:float var(--fd,18s) ease-in-out infinite alternate;animation-delay:var(--fdl,0s)}
.shp.c b{border-radius:50%}.shp.q b{border-radius:22%}.shp.p b{border-radius:999px}
.shp.r b{border-radius:50%;background:transparent;border:var(--bw,26px) solid var(--c,#fff)}
@keyframes float{0%{transform:translate3d(0,0,0) rotate(0deg)}100%{transform:translate3d(var(--fx,30px),var(--fy,-40px),0) rotate(var(--fr,10deg))}}

/* ---------- slides ---------- */
.slide{position:absolute;inset:0;z-index:10;pointer-events:none;visibility:hidden;opacity:0;transition:opacity .4s ease,visibility 0s linear .4s}
.slide.on{visibility:visible;opacity:1;transition:opacity .55s ease .08s,visibility 0s}
.slide>*{position:absolute;margin:0}
.slide p,.slide h1,.slide h2,.slide h3,.slide ul{margin:0}
.slide .ia,.slide button,.slide a{pointer-events:auto}
/* entry reveal + beat-gated reveals (text never slides far: 16-20px fades only) */
.r{opacity:0;transform:translate3d(0,20px,0);transition:opacity .15s ease,transform .15s ease}
[data-dir="back"] .r{transform:translate3d(0,-20px,0)}
.slide.on .r{opacity:1;transform:none;transition:opacity .45s ease calc(.25s + var(--i,0)*80ms),transform .65s var(--ease) calc(.25s + var(--i,0)*80ms)}
.f1,.f2,.f3,.f4,.o0,.o1,.o2,.o3,.o4{opacity:0;transform:translate3d(0,16px,0);transition:opacity .15s ease,transform .15s ease}
.ge1 .slide.on .f1,.ge2 .slide.on .f2,.ge3 .slide.on .f3,.ge4 .slide.on .f4,
[data-step="0"] .slide.on .o0,[data-step="1"] .slide.on .o1,[data-step="2"] .slide.on .o2,[data-step="3"] .slide.on .o3,[data-step="4"] .slide.on .o4
  {opacity:1;transform:none;transition:opacity .45s ease var(--d,.12s),transform .6s var(--ease) var(--d,.12s)}
.ge1 .slide.on .x1,.ge2 .slide.on .x2,.ge3 .slide.on .x3{opacity:0;transform:translate3d(0,-16px,0);transition:opacity .18s ease,transform .18s ease;pointer-events:none}

/* ---------- type ---------- */
.k{font:700 28px/1.3 var(--sans);letter-spacing:.02em}
.h1{font:800 104px/1.24 var(--sans);letter-spacing:-.012em}
.h2{font:800 76px/1.28 var(--sans);letter-spacing:-.01em}
.h3{font:700 52px/1.32 var(--sans)}
.h4{font:700 38px/1.35 var(--sans)}
.ld{font:500 34px/1.45 var(--sans)}
.tx{font:500 28px/1.45 var(--sans)}
.cp{font:500 22px/1.45 var(--sans)}
.num{font-family:var(--disp);font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.lt{color:#fff}.lt.cp{color:rgba(255,255,255,.78)}.lt.ld{color:rgba(255,255,255,.92)}
.dk{color:var(--navy)}.dk.cp{color:#4A5576}.dk.ld{color:#2E3A60}
.mark{background:linear-gradient(transparent 62%,var(--sun) 62%,var(--sun) 92%,transparent 92%);padding:0 .08em}
.ic{width:24px;height:24px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.pill{display:inline-flex;align-items:center;gap:14px;padding:12px 26px 12px 18px;border-radius:999px;font:700 30px/1.25 var(--sans);white-space:nowrap}
.pill .ic{width:34px;height:34px}
.card{background:#fff;border-radius:28px;box-shadow:0 24px 60px rgba(20,30,70,.16),0 2px 6px rgba(20,30,70,.08)}
.btnx{display:inline-flex;align-items:center;gap:14px;border:0;cursor:pointer;font:700 30px/1 var(--sans);padding:20px 34px;border-radius:999px;
  background:var(--navy);color:#fff;box-shadow:0 14px 30px rgba(20,30,70,.28);transition:transform .2s var(--ease),background-color .2s}
.btnx:hover{transform:translateY(-2px)}.btnx:active{transform:translateY(2px)}
.btnx:focus-visible{outline:4px solid var(--sun);outline-offset:4px}
.btnx .ic{width:34px;height:34px}

/* ---------- objects that travel through the deck: clock (teacher's time), coin (price), raised hand (students) ---------- */
.coin{border-radius:50%;background:#FFC83D;box-shadow:inset 0 0 0 8px #F0A91C,inset 0 0 0 13px #FFD970,0 16px 30px rgba(120,70,0,.28);
  display:flex;flex-direction:column;align-items:center;justify-content:center;color:#7A4A00;text-align:center}
.coin b{font:800 1em/1 var(--disp)}.coin span{font:700 .34em/1.2 var(--sans)}

/* ---------- chrome ---------- */
.hud{position:absolute;right:64px;top:50px;z-index:30;font:700 20px/1 var(--sans);letter-spacing:.14em;color:var(--hud,rgba(255,255,255,.8));transition:color .5s ease,opacity .4s;pointer-events:none;font-variant-numeric:tabular-nums}
.hud i{display:inline-block;width:40px;height:2px;margin:0 12px;background:currentColor;vertical-align:6px;opacity:.55}
#brand{position:absolute;left:60px;bottom:34px;z-index:30;display:flex;align-items:center;gap:12px;font:800 24px/1 var(--sans);color:var(--hud,rgba(255,255,255,.8));pointer-events:none;transition:color .5s,opacity .4s}
#brand svg{width:38px;height:38px}
#brand small{font:600 17px/1 var(--sans);opacity:.75;margin-left:4px}
.light{--hud:rgba(28,42,85,.78)}
#ctl{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:200;display:flex;gap:6px;align-items:center;padding:7px;border-radius:14px;background:rgba(18,26,56,.88);
  box-shadow:0 8px 30px rgba(0,0,0,.35);opacity:0;transition:opacity .3s ease;font:600 15px/1 var(--sans)}
#ctl.show,#ctl:has(:focus-visible){opacity:1}
#ctl button{font:inherit;color:#fff;background:transparent;border:1px solid rgba(255,255,255,.28);border-radius:9px;padding:9px 13px;cursor:pointer}
#ctl button:hover{background:rgba(255,255,255,.14)}
#ctl button[aria-pressed="true"]{background:rgba(255,255,255,.22)}
#ctl #pos{min-width:96px;text-align:center;color:#fff;font-variant-numeric:tabular-nums}

/* ---------- before/after slider (engine): drag ANYWHERE across the full width; arrow keys on the knob ---------- */
.compare{--pos:50%;overflow:hidden;border-radius:26px;box-shadow:0 30px 70px rgba(80,50,0,.28);touch-action:none;cursor:ew-resize;user-select:none;-webkit-user-select:none}
.compare>.cmp-a,.compare>.cmp-b{position:absolute;inset:0}
.compare>.cmp-b{clip-path:inset(0 0 0 var(--pos))}
.compare .bar{position:absolute;top:0;bottom:0;left:var(--pos);width:6px;margin-left:-3px;background:#fff;box-shadow:0 0 0 2px rgba(28,42,85,.25)}
.compare .knob{position:absolute;top:50%;left:var(--pos);width:92px;height:92px;margin:-46px 0 0 -46px;border-radius:50%;background:#fff;box-shadow:0 10px 26px rgba(28,42,85,.35);
  display:flex;align-items:center;justify-content:center;color:var(--navy)}
.compare .knob svg{width:46px;height:46px}
.compare .knob:focus-visible{outline:4px solid var(--blue);outline-offset:4px}
.compare .tagl,.compare .tagr{position:absolute;top:22px;padding:12px 22px;border-radius:999px;font:700 26px/1 var(--sans);pointer-events:none}
.compare .tagl{left:22px;background:#5E6371;color:#fff}.compare .tagr{right:22px;background:var(--mint);color:#fff}

/* ---------- full-screen sample viewer ---------- */
#vclose{position:absolute;right:28px;top:24px;z-index:120;display:none;align-items:center;gap:12px;border:0;cursor:pointer;padding:16px 26px 16px 20px;border-radius:999px;
  background:var(--navy);color:#fff;font:700 26px/1 var(--sans);box-shadow:0 12px 30px rgba(0,0,0,.35)}
#vclose small{font:600 18px/1 var(--sans);opacity:.7}
#vclose .ic{width:30px;height:30px}
.viewing #vclose{display:inline-flex}
.viewing .hud,.viewing #brand,.viewing #rail{opacity:0}
.viewing .slide.on{z-index:100}

.rm *,.rm *::before,.rm *::after{transition-duration:.01ms!important;transition-delay:0s!important;animation-duration:.01ms!important;animation-iteration-count:1!important}
@media print{html,body{overflow:visible}#ctl{display:none}}
'''

# the engine (from the type-1 template, trimmed and extended)
ENGINE = r'''
(function(){
  var doc=document.documentElement,stage=document.getElementById('stage'),vp=document.getElementById('vp'),
      slides=[].slice.call(document.querySelectorAll('.slide')),N=slides.length,
      cnt=document.getElementById('cnt'),pos=document.getElementById('pos'),live=document.getElementById('live'),ctl=document.getElementById('ctl'),
      bMotion=document.getElementById('bMotion'),bPen=document.getElementById('bPen'),
      STEPS=slides.map(function(s){return +s.getAttribute('data-steps')||0;}),i=0,st=0,hideT=0,H=window.__hooks||{};
  document.getElementById('tot').textContent=('0'+N).slice(-2);
  function fit(){var s=Math.min(innerWidth/1920,innerHeight/1080);stage.style.transform='translate('+((innerWidth-1920*s)/2)+'px,'+((innerHeight-1080*s)/2)+'px) scale('+s+')';}
  function hook(k,name,a,b,c){var h=H[slides[k].id];if(h&&h[name])try{h[name](a,b,c);}catch(e){if(window.console)console.error(e);}}
  function render(dir,changed,from){
    if(changed&&from!=null&&from!==i)hook(from,'leave');
    if(changed&&window.__viewer&&window.__viewer.open())window.__viewer.close(true);
    if(changed&&window.__tools&&window.__tools.pen.on())window.__tools.pen.set(false);
    stage.setAttribute('data-slide',i+1);stage.setAttribute('data-s',slides[i].id);stage.setAttribute('data-step',st);stage.setAttribute('data-dir',dir);
    for(var g=1;g<=5;g++)stage.classList.toggle('ge'+g,st>=g);
    stage.classList.toggle('light',slides[i].hasAttribute('data-light')&&!(slides[i].getAttribute('data-dark-at')&&st>=+slides[i].getAttribute('data-dark-at'))||(slides[i].getAttribute('data-light-at')!=null&&st>=+slides[i].getAttribute('data-light-at')));
    stage.style.setProperty('--bg',slides[i].getAttribute('data-bg')||'#16224A');
    slides.forEach(function(s,k){var on=k===i;s.classList.toggle('on',on);s.setAttribute('aria-hidden',on?'false':'true');if('inert' in s)s.inert=!on;});
    cnt.textContent=('0'+(i+1)).slice(-2);pos.textContent=(i+1)+' / '+N+(STEPS[i]?'  ·  '+st+'/'+STEPS[i]:'');
    live.textContent='สไลด์ '+(i+1)+' จาก '+N+': '+slides[i].getAttribute('data-title');
    counters();
    if(window.__shapes)window.__shapes(slides[i].id,st);
    if(changed)hook(i,'enter',st,dir);
    hook(i,'beat',st,dir,changed);
    document.dispatchEvent(new CustomEvent('deck:change',{detail:{i:i,st:st,slide:slides[i]}}));
    try{history.replaceState(null,'','#'+(i+1));}catch(e){}
  }
  function next(){var f=i;if(st<STEPS[i]){st++;render('fwd',false);}else if(i<N-1){i++;st=0;render('fwd',true,f);}}
  function prev(){var f=i;if(st>0){st--;render('back',false);}else if(i>0){i--;st=STEPS[i];render('back',true,f);}}
  function jump(k,end){k=Math.max(0,Math.min(N-1,k));var f=i,d=k>=i?'fwd':'back',ch=k!==i;i=k;st=end?STEPS[i]:0;render(d,ch,f);}

  /* counting numbers (decimals via data-dec); they count when their beat is on screen */
  function counters(){[].forEach.call(document.querySelectorAll('[data-count]'),function(el){
    var on=el.closest('.slide')===slides[i]&&st>=(+el.getAttribute('data-at')||0),to=+el.getAttribute('data-count'),dec=+el.getAttribute('data-dec')||0,seq=el.getAttribute('data-seq'),
        f=function(v){return v.toLocaleString('en',{minimumFractionDigits:dec,maximumFractionDigits:dec});};
    if(on&&seq&&el.closest('.slide')===slides[i])seq.split(',').forEach(function(p){var q=p.split(':');if(st>=+q[0])to=+q[1];});
    if(!on){el.textContent=f(+el.getAttribute('data-from')||0);el.__run=0;return;}if(el.__run===to)return;
    var from=el.__run?+String(el.textContent).replace(/,/g,''):(+el.getAttribute('data-from')||0);el.__run=to;
    if(doc.classList.contains('rm')){el.textContent=f(to);return;}
    var t0=performance.now()+(+el.getAttribute('data-delay')||380),dur=+el.getAttribute('data-dur')||1300;(function tick(t){if(el.__run!==to)return;var p=Math.max(0,Math.min(1,(t-t0)/dur)),e=1-Math.pow(1-p,3);
      var v=from+(to-from)*e;el.textContent=f(dec?v:Math.round(v));if(p<1)requestAnimationFrame(tick);})(performance.now());});}

  /* before/after: pointer capture on the whole picture, so a drag works from any point */
  [].forEach.call(document.querySelectorAll('.compare'),function(c){
    var knob=c.querySelector('.knob');function set(p){p=Math.max(0,Math.min(100,p));c.style.setProperty('--pos',p+'%');c.setAttribute('data-pos',Math.round(p));if(knob)knob.setAttribute('aria-valuenow',Math.round(p));}
    c.__set=set;
    function at(e){var r=c.getBoundingClientRect();set((e.clientX-r.left)/r.width*100);}
    c.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();c.setPointerCapture(e.pointerId);c.__drag=1;c.__touched=1;at(e);});
    c.addEventListener('pointermove',function(e){if(c.__drag)at(e);});
    c.addEventListener('pointerup',function(e){c.__drag=0;e.stopPropagation();});c.addEventListener('pointercancel',function(){c.__drag=0;});
    c.addEventListener('click',function(e){e.stopPropagation();});
    if(knob)knob.addEventListener('keydown',function(e){var p=+c.getAttribute('data-pos');if(e.key==='ArrowLeft'){set(p-5);e.preventDefault();e.stopPropagation();}else if(e.key==='ArrowRight'){set(p+5);e.preventDefault();e.stopPropagation();}});
    set(+c.getAttribute('data-pos')||50);});

  function setMotion(on){doc.classList.toggle('rm',!on);bMotion.textContent=on?'ภาพเคลื่อนไหว: เปิด':'ภาพเคลื่อนไหว: ปิด';bMotion.setAttribute('aria-pressed',on?'true':'false');}
  function full(){if(document.fullscreenElement){document.exitFullscreen();}else if(doc.requestFullscreen){doc.requestFullscreen().catch(function(){});}}
  function pen(){document.dispatchEvent(new CustomEvent('deck:pen'));}
  function wake(){ctl.classList.add('show');clearTimeout(hideT);hideT=setTimeout(function(){ctl.classList.remove('show');},2400);}
  function viewing(){return !!(window.__viewer&&window.__viewer.open());}
  document.addEventListener('keydown',function(e){
    if(e.metaKey||e.ctrlKey||e.altKey)return;var k=e.key,t=e.target;
    if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;
    if(viewing()){if(k==='Escape'||k==='b'||k==='B'||k==='.'){e.preventDefault();window.__viewer.close();}return;}
    if(t&&(t.tagName==='A'||t.tagName==='BUTTON')&&(k==='Enter'||k===' '))return;
    if(k==='ArrowRight'||k==='PageDown'||k===' '||k==='Enter'||k==='ArrowDown'){e.preventDefault();next();}
    else if(k==='ArrowLeft'||k==='PageUp'||k==='Backspace'||k==='ArrowUp'){e.preventDefault();prev();}
    else if(k==='Home'){jump(0);}else if(k==='End'){jump(N-1,true);}
    else if(/^[1-9]$/.test(k)&&+k<=N){jump(+k-1);}
    else if(k==='f'||k==='F'){full();}else if(k==='m'||k==='M'){setMotion(doc.classList.contains('rm'));}
    else if(k==='p'||k==='P'){pen();}
  });
  /* a click on the empty slide advances (the left fifth goes back); never on interactive parts, never while the pen is on,
     and never on slides marked data-noclick (live demos, the video), so a volunteer cannot skip ahead by accident */
  vp.addEventListener('click',function(e){if(viewing()||doc.classList.contains('pen-on'))return;if(e.target.closest&&e.target.closest('a,button,.ia,#ctl,#pen-bar,#pen-layer'))return;
    if(slides[i].hasAttribute('data-noclick'))return;var r=vp.getBoundingClientRect();if((e.clientX-r.left)<r.width*0.2)prev();else next();});
  var x0=null,y0=null;
  vp.addEventListener('touchstart',function(e){if(viewing()||doc.classList.contains('pen-on')||(e.target.closest&&e.target.closest('.ia,#ctl,#pen-bar'))){x0=null;return;}x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});
  vp.addEventListener('touchend',function(e){if(x0===null)return;var dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.3){e.preventDefault();if(dx<0)next();else prev();}});
  document.getElementById('bNext').addEventListener('click',function(e){e.stopPropagation();next();this.blur();});
  document.getElementById('bPrev').addEventListener('click',function(e){e.stopPropagation();prev();this.blur();});
  bMotion.addEventListener('click',function(e){e.stopPropagation();setMotion(doc.classList.contains('rm'));this.blur();});
  bPen.addEventListener('click',function(e){e.stopPropagation();pen();this.blur();});
  document.addEventListener('pen:state',function(e){bPen.setAttribute('aria-pressed',e.detail.on?'true':'false');});
  document.getElementById('bFull').addEventListener('click',function(e){e.stopPropagation();full();this.blur();});
  document.addEventListener('mousemove',wake);ctl.addEventListener('focusin',wake);
  window.addEventListener('resize',fit);
  window.addEventListener('hashchange',function(){var k=parseInt(location.hash.slice(1),10);if(k&&k-1!==i)jump(k-1);});
  /* keys always belong to the deck: an iframe (a live sample preview) may never keep the focus unless the viewer is open */
  window.addEventListener('blur',function(){setTimeout(function(){var a=document.activeElement;if(a&&a.tagName==='IFRAME'&&!viewing()){a.blur();window.focus();}},0);});
  setMotion(!doc.classList.contains('rm'));fit();
  var k0=parseInt(location.hash.slice(1),10);if(k0&&k0>=1&&k0<=N)i=k0-1;
  stage.setAttribute('data-slide',i+1);stage.setAttribute('data-s',slides[i].id);
  window.__deck={next:next,prev:prev,jump:jump,state:function(){return {slide:i+1,i:i,id:slides[i].id,step:st,steps:STEPS[i],n:N};}};
  function start(){if(document.body.classList.contains('ready'))return;document.body.classList.add('ready');requestAnimationFrame(function(){requestAnimationFrame(function(){render('fwd',true,null);});});}
  if(document.fonts&&document.fonts.ready){document.fonts.ready.then(start);setTimeout(start,1500);}else{start();}
})();
'''

# drifting background shapes: per-slide colour field + palette; shapes live near the edges, never behind the main text
SHAPES_JS = r'''
(function(){
  var host=document.getElementById('shapes'),K=10,els=[],kinds=['c','q','p','c','r','q','c','p','r','c'];
  for(var k=0;k<K;k++){var e=document.createElement('i');e.className='shp '+kinds[k];var b=document.createElement('b');
    b.style.setProperty('--fd',(16+k*2.3)+'s');b.style.setProperty('--fdl',(-k*3.1)+'s');b.style.setProperty('--fx',((k%3)-1)*34+'px');b.style.setProperty('--fy',(k%2?-1:1)*(26+k*3)+'px');b.style.setProperty('--fr',(k%2?-1:1)*(6+k)+'deg');
    e.appendChild(b);host.appendChild(e);els.push(e);}
  function rnd(seed){var s=seed;return function(){s=(s*9301+49297)%233280;return s/233280;};}
  var CFG=window.__shapeCfg||{};
  window.__shapes=function(id,st){
    var c=CFG[id+'@'+st]||CFG[id]||{cols:['#ffffff'],op:.1,seed:1},r=rnd(c.seed||7);
    els.forEach(function(e,k){
      var sz=c.n!=null&&k>=c.n?0:140+r()*320,side=Math.floor(r()*4),x,y;
      if(side===0){x=-sz*.45+r()*220;y=r()*1080-sz/2;}else if(side===1){x=1920-sz*.55-r()*220;y=r()*1080-sz/2;}
      else if(side===2){x=r()*1920-sz/2;y=-sz*.5+r()*120;}else{x=r()*1920-sz/2;y=1080-sz*.5-r()*120;}
      e.style.left=Math.round(x)+'px';e.style.top=Math.round(y)+'px';e.style.width=e.style.height=Math.round(sz)+'px';
      e.style.opacity=sz?(c.op*(0.6+r()*0.6)).toFixed(2):'0';e.firstChild.style.setProperty('--c',c.cols[k%c.cols.length]);
    });
  };
})();
'''

# sample viewer: a live preview screen grows into the full stage; Esc / B / . / the button bring the deck back
VIEWER_JS = r'''
(function(){
  var stage=document.getElementById('stage'),btn=document.getElementById('vclose'),cur=null;
  function frameKeys(f){try{var w=f.contentWindow;if(!w||w.__ksKeys)return;w.__ksKeys=1;
    w.addEventListener('keydown',function(e){var d=w.document.documentElement;
      if((e.key==='Escape'&&!d.classList.contains('pen-on'))||e.key==='b'||e.key==='B'||(e.key==='.'&&!(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName)))){e.preventDefault();close();}},true);}catch(e){}}
  function open(scr){var f=scr.querySelector('iframe');if(!f||!f.getAttribute('src')||scr.classList.contains('missing'))return;
    cur=scr;scr.classList.add('full');stage.classList.add('viewing');scr.inert=false;var sh=scr.querySelector('.shield');if(sh)sh.style.display='none';
    frameKeys(f);setTimeout(function(){try{f.focus();f.contentWindow.focus();}catch(e){}},80);}
  function close(quick){if(!cur)return;var scr=cur;cur=null;scr.classList.remove('full');stage.classList.remove('viewing');
    var sh=scr.querySelector('.shield');if(sh)sh.style.display='';scr.inert=true;
    try{document.activeElement&&document.activeElement.blur();}catch(e){}window.focus();}
  btn.addEventListener('click',function(e){e.stopPropagation();close();});
  [].forEach.call(document.querySelectorAll('.scr .shield'),function(s){s.addEventListener('click',function(e){e.stopPropagation();open(s.closest('.scr'));});});
  window.__viewer={open:function(){return !!cur;},close:close,show:open};
})();
'''

def icon(name, cls='ic', style=''):
    st = f' style="{style}"' if style else ''
    return f'<svg class="{cls}"{st} aria-hidden="true"><use href="#{name}"/></svg>'

LOGO_SVG = '<svg viewBox="0 0 120 120" aria-hidden="true"><rect width="120" height="120" rx="32" fill="#1C2A55"/><rect x="26" y="24" width="18" height="72" rx="7" fill="#fff"/><path d="M50 60 L86 26" stroke="#3D7BFF" stroke-width="18" stroke-linecap="round"/><path d="M52 52 L88 84 L68 82 L60 100 Z" fill="#FFC83D"/></svg>'

def polygon_circle(n=24, cx=50, cy=50, r=50):
    pts = []
    for k in range(n):
        a = -math.pi / 2 + 2 * math.pi * k / n
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

def poly_css(pts):
    return 'polygon(' + ','.join(f'{x:.2f}% {y:.2f}%' for x, y in pts) + ')'

def resample_poly(verts, n=24):
    """spread n points evenly along a closed polygon (so it can morph from/to a circle with the same count)"""
    segs = []; tot = 0
    for k in range(len(verts)):
        a = verts[k]; b = verts[(k + 1) % len(verts)]
        L = math.hypot(b[0] - a[0], b[1] - a[1]); segs.append((a, b, L)); tot += L
    out = []
    for j in range(n):
        d = tot * j / n
        for a, b, L in segs:
            if d <= L:
                t = d / L if L else 0
                out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)); break
            d -= L
    return out
