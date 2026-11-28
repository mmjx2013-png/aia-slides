/* KruSlide styles sample F · mechanism explorer. Our own SVG drawings with live kinematics (vanilla JS, no libraries).
   Engine(svg): single-cylinder DOHC four-stroke in cutaway. Crank radius R, rod length L; piston pin height
     y = -(R cos θ + sqrt(L² − R² sin² θ)); valves follow sin² lift curves with real timing (IVO 12° BTDC, IVC 48° ABDC,
     EVO 48° BBDC, EVC 12° ATDC), cams turn at half crank speed, the spark fires 20° before top dead centre.
   Gears: involute teeth (20° pressure angle), output angle = −(N1/N2)·input. Lever: moments, MA = effort arm / load arm.
   Only arrow keys / PageUp / PageDown / ‹ › change the slide; every drag here uses pointer capture and touch-action:none.
   Test hooks: window.__mech = {engines, scrub, explorer, gears, lever}. */
(function () {
  'use strict';
  var root = document.documentElement, stage = document.getElementById('stage');
  if (!stage) return;
  var NS = 'http://www.w3.org/2000/svg', D = Math.PI / 180, uid = 0;
  var qs = new URLSearchParams(location.search);
  function still() { return root.classList.contains('rm'); }
  function sv(tag, at, parent) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; }
  function $(s, r) { return (r || document).querySelector(s); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(c) { return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'; }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function f2(v) { return (Math.round(v * 100) / 100).toFixed(2); }
  function thai(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function ease(p) { return 1 - Math.pow(1 - p, 3); }
  /* pointer -> SVG user units, for an svg with a viewBox and the default xMidYMid meet (the stage is CSS-scaled) */
  function svgPt(svg, e) {
    var vb = svg.viewBox.baseVal, r = svg.getBoundingClientRect(), s = Math.min(r.width / vb.width, r.height / vb.height);
    return { x: vb.x + (e.clientX - r.left - (r.width - vb.width * s) / 2) / s, y: vb.y + (e.clientY - r.top - (r.height - vb.height * s) / 2) / s };
  }
  function tween(dur, step, done) {
    var t0 = null, fin = false;
    function end() { if (fin) return; fin = true; step(1); if (done) done(); }
    if (still()) { end(); return { cancel: function () { fin = true; } }; }
    function f(t) { if (fin) return; if (t0 === null) t0 = t; var p = (t - t0) / dur; if (p >= 1) return end(); step(ease(p)); requestAnimationFrame(f); }
    requestAnimationFrame(f); setTimeout(end, dur + 200);
    return { cancel: function () { fin = true; } };
  }
  /* drag helper: pointer capture, never changes the slide, works with mouse, pen and touch */
  function drag(el, o) {
    el.style.touchAction = 'none';
    var id = null;
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (root.classList.contains('pen-on')) return;
      e.preventDefault(); e.stopPropagation(); id = e.pointerId;
      try { el.setPointerCapture(id); } catch (er) {}
      el.classList.add('dragging'); if (o.down) o.down(e);
    });
    el.addEventListener('pointermove', function (e) { if (e.pointerId === id && o.move) o.move(e); });
    function up(e) { if (e.pointerId !== id) return; id = null; el.classList.remove('dragging'); try { el.releasePointerCapture(e.pointerId); } catch (er) {} if (o.up) o.up(e); }
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  /* ================= one animation clock for every live drawing ================= */
  var comps = [];
  function comp(slide, c) { c.slide = slide; c.on = false; comps.push(c); return c; }
  var last = 0, running = false;
  function loop(t) {
    var dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
    var any = false;
    comps.forEach(function (c) { if (c.on && c.tick) { if (c.tick(dt) !== false) any = true; } });
    if (any) requestAnimationFrame(loop); else { running = false; last = 0; }
  }
  function wake() { if (!running) { running = true; last = 0; requestAnimationFrame(loop); } }
  document.addEventListener('deck:change', function (e) {
    comps.forEach(function (c) {
      var on = c.slide === e.detail.slide;
      if (on !== c.on) { c.on = on; if (c.active) c.active(on); }
      if (on && c.beat) c.beat(e.detail.st);
    });
    wake();
  });

  /* ================= engine geometry (engine units; crank centre 0,0; y grows downward) ================= */
  var R = 70, L = 230, LIFT = 22, TILT = 14, CROWN = 58, SKIRT = 50;
  var IVO = -12, IVC = 228, EVO = 492, EVC = 732, SPARK = 340;
  var TAN = Math.tan(TILT * D), SIN = Math.sin(TILT * D), COS = Math.cos(TILT * D);
  var ROOF = -392, DECK = -372;
  function roofY(x) { return ROOF + Math.abs(x) * TAN; }   /* pent roof: two faces at 14° */
  var SI = { x: -42, y: roofY(42) }, SE = { x: 42, y: roofY(42) };
  function pinY(th) { var t = th * D, s = R * Math.sin(t); return -(R * Math.cos(t) + Math.sqrt(L * L - s * s)); }
  function crankPin(th) { var t = th * D; return { x: R * Math.sin(t), y: -R * Math.cos(t) }; }
  function m720(th) { return ((th % 720) + 720) % 720; }
  function liftAt(th, open, dur) { var x = m720(th - open); return x < dur ? LIFT * Math.pow(Math.sin(Math.PI * x / dur), 2) : 0; }
  function liftI(th) { return liftAt(th, IVO, IVC - IVO); }
  function liftE(th) { return liftAt(th, EVO, EVC - EVO); }
  function strokeOf(th) { return Math.floor(m720(th) / 180); }
  var MIX = [58, 155, 214], DENSE = [59, 91, 204], POWER = [232, 89, 12], HOT2 = [190, 86, 44], EXH = [139, 126, 112];
  function gas(th) {
    var t = m720(th), c, a, n = 1, fl = 0;
    if (t < IVC) { c = MIX; a = .26; n = .3 + .7 * t / IVC; }
    else if (t < SPARK) { var p = (t - IVC) / (SPARK - IVC); c = mix(MIX, DENSE, p); a = .26 + .32 * p; }
    else if (t < 392) { c = DENSE; a = .58; fl = (t - SPARK) / 52; }
    else if (t < EVO) { var q = (t - 392) / (EVO - 392); c = mix(POWER, HOT2, q); a = .62 - .14 * q; fl = 1; }
    else { var r = (t - EVO) / (720 - EVO); c = mix(HOT2, EXH, Math.min(1, r * 3)); a = .48 - .3 * r; n = 1 - .7 * r; }
    return { c: c, a: a, n: n, fl: fl, t: t };
  }
  var STROKES = [
    { th: 'ดูด', en: 'Intake', col: 'var(--mix)', piston: 'ลง', iv: 'เปิด', ev: 'ปิด',
      say: 'ลูกสูบเลื่อนลง วาล์วไอดีเปิด ไอดี (อากาศผสมเชื้อเพลิง) ถูกดูดเข้ากระบอกสูบ' },
    { th: 'อัด', en: 'Compression', col: 'var(--dense)', piston: 'ขึ้น', iv: 'ปิด', ev: 'ปิด',
      say: 'วาล์วทั้งสองปิด ลูกสูบเลื่อนขึ้น อัดไอดีให้เล็กลงราว 7 เท่า แล้วหัวเทียนจุดประกายไฟก่อนถึงจุดบนสุด' },
    { th: 'ระเบิด', en: 'Power', col: 'var(--power)', piston: 'ลง', iv: 'ปิด', ev: 'ปิด',
      say: 'ไอดีเผาไหม้ แก๊สร้อนขยายตัวดันลูกสูบลงอย่างแรง จังหวะเดียวที่ให้กำลังงาน' },
    { th: 'คาย', en: 'Exhaust', col: 'var(--exh)', piston: 'ขึ้น', iv: 'ปิด', ev: 'เปิด',
      say: 'วาล์วไอเสียเปิด ลูกสูบเลื่อนขึ้น ดันไอเสียออกทางท่อไอเสีย' }];

  /* ---------- part drawings (strings in local units; reused by the explore close-ups) ---------- */
  var INK = '#1F2429';
  function pistonSVG() {
    var rings = [-50, -41, -31].map(function (y, k) {
      return '<rect x="-79" y="' + y + '" width="10" height="' + (k < 2 ? 4 : 5) + '"/><rect x="69" y="' + y + '" width="10" height="' + (k < 2 ? 4 : 5) + '"/>';
    }).join('');
    return '<path d="M-77 -52 Q-77 -58 -71 -58 H71 Q77 -58 77 -52 V44 Q77 50 71 50 H-71 Q-77 50 -77 44 Z" fill="url(#m-alu)" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M-61 -24 Q-61 -33 -52 -33 H52 Q61 -33 61 -24 V50 H-61 Z" fill="#BFC6CC" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M-70 -55 H70" stroke="#fff" stroke-width="2" opacity=".7"/>' +
      '<g fill="#3B434B">' + rings + '</g>';
  }
  function pinSVG() { return '<circle r="16" fill="url(#m-steel-r)" stroke="' + INK + '" stroke-width="2"/><circle r="6" fill="#59636D"/>'; }
  function rodSVG() {
    var l = L;
    return '<path d="M-12 ' + (-l + 21) + ' A25 25 0 1 1 12 ' + (-l + 21) + ' L19 -42 A46 46 0 1 1 -19 -42 Z" fill="url(#m-steel)" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M-8 -54 L-5 ' + (-l + 34) + ' H5 L8 -54 Z" fill="#7F8A95" opacity=".75"/>' +
      '<path d="M-46 0 H46" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="-38" y="-20" width="8" height="44" rx="2" fill="#59636D" stroke="' + INK + '" stroke-width="1.5"/><rect x="30" y="-20" width="8" height="44" rx="2" fill="#59636D" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<circle r="28" fill="#5A646E" stroke="' + INK + '" stroke-width="2"/><circle r="23" fill="url(#m-steel-r)" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<circle cy="' + (-l) + '" r="16" fill="#5A646E"/>';
  }
  function crankSVG() {
    return '<path d="M-46 -70 A46 46 0 0 1 46 -70 L90.6 42.3 A100 100 0 0 1 -90.6 42.3 Z" fill="url(#m-web)" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<circle cx="-40" cy="64" r="8" fill="#4B555E"/><circle cx="40" cy="64" r="8" fill="#4B555E"/>' +
      '<circle cy="-70" r="24" fill="url(#m-steel-r)" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle r="31" fill="url(#m-steel-r)" stroke="' + INK + '" stroke-width="2.5"/><circle r="9" fill="#4B555E"/>' +
      '<path d="M0 -24 V24 M-24 0 H24" stroke="' + INK + '" stroke-width="1" stroke-dasharray="6 3 2 3"/>';
  }
  function blockSVG() {
    var outer = 'M-150 -372 H150 V-175 C150 -150 210 -140 210 -112 V120 H-210 V-112 C-210 -140 -150 -150 -150 -175 Z';
    var inner = 'M-80 -372 V-165 C-80 -138 -188 -136 -188 -108 V120 H188 V-108 C188 -136 80 -138 80 -165 V-372 Z';
    return '<path d="' + outer + '" fill="#E7E3DA"/>' +
      '<path d="' + outer + ' ' + inner + '" fill="url(#m-hatch)" fill-rule="evenodd" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<rect x="-137" y="-360" width="36" height="160" rx="9" fill="#CFE3F1" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<rect x="101" y="-360" width="36" height="160" rx="9" fill="#CFE3F1" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<rect x="-85" y="-372" width="5" height="208" fill="#8C96A0" stroke="' + INK + '" stroke-width="1"/><rect x="80" y="-372" width="5" height="208" fill="#8C96A0" stroke="' + INK + '" stroke-width="1"/>';
  }
  var PORT_I = 'M-175 -478 C-110 -478 -36 -462 -14.8 -388.3 L-69.2 -374.7 C-92 -412 -122 -428 -175 -428 Z';
  var PORT_E = 'M175 -478 C110 -478 36 -462 14.8 -388.3 L69.2 -374.7 C92 -412 122 -428 175 -428 Z';
  function headSVG() {
    return '<path d="M-175 -500 H175 V-372 H-175 Z" fill="url(#m-hatch2)" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M-80 -372 L0 -392 L80 -372 Z" fill="#F4F1EA" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="' + PORT_I + '" fill="#CFE5F3" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="' + PORT_E + '" fill="#DED8CF" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="-26" y="-500" width="52" height="60" fill="#F4F1EA" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<rect x="-51" y="-494" width="15" height="70" rx="5" fill="#CFE3F1" stroke="' + INK + '" stroke-width="1.4"/><rect x="36" y="-494" width="15" height="70" rx="5" fill="#CFE3F1" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M-72 -373 L-64 -377 L-66 -370 Z M-17 -387 L-10 -390 L-12 -383 Z M72 -373 L64 -377 L66 -370 Z M17 -387 L10 -390 L12 -383 Z" fill="#3B434B"/>' +
      '<rect x="-160" y="-375" width="320" height="5" fill="#3B434B"/>' +
      '<g stroke="' + INK + '" stroke-width="2"><rect x="-262" y="-486" width="87" height="66" fill="#D6DBE0"/><rect x="-262" y="-478" width="87" height="50" fill="#CFE5F3" stroke="none"/><rect x="-185" y="-496" width="10" height="86" fill="#AEB7C0"/>' +
      '<rect x="175" y="-486" width="87" height="66" fill="#D6DBE0"/><rect x="175" y="-478" width="87" height="50" fill="#DED8CF" stroke="none"/><rect x="175" y="-496" width="10" height="86" fill="#AEB7C0"/></g>';
  }
  function coverSVG() {
    var l = 'M-169 -500 V-650 Q-169 -694 -125 -694 H-30', r = 'M30 -694 H125 Q169 -694 169 -650 V-500';
    return '<g fill="none" stroke-linecap="butt"><path d="' + l + '" stroke="' + INK + '" stroke-width="15"/><path d="' + r + '" stroke="' + INK + '" stroke-width="15"/>' +
      '<path d="' + l + '" stroke="#C9CFD5" stroke-width="10"/><path d="' + r + '" stroke="#C9CFD5" stroke-width="10"/>' +
      '<path d="M-28 -697 V-500 M28 -697 V-500" stroke="' + INK + '" stroke-width="9"/><path d="M-28 -697 V-500 M28 -697 V-500" stroke="#C9CFD5" stroke-width="5"/></g>';
  }
  function camPath() {
    var d = '';
    for (var a = 0; a < 360; a += 3) {
      var psi = a > 180 ? a - 360 : a, lf = Math.abs(psi) < 60 ? LIFT * Math.pow(Math.cos(Math.PI * psi / 120), 2) : 0, r = 26 + lf;
      d += (a ? 'L' : 'M') + (r * Math.sin(a * D)).toFixed(2) + ' ' + (-r * Math.cos(a * D)).toFixed(2);
    }
    return d + 'Z';
  }
  var CAM = camPath();
  function camSVG() { return '<path d="' + CAM + '" fill="url(#m-steel-r)" stroke="' + INK + '" stroke-width="2.2"/><circle r="13" fill="#5A646E" stroke="' + INK + '" stroke-width="1.5"/><circle cy="-6" r="3" fill="#E3E7EB"/>'; }
  function valveSVG(hot) {
    return '<path d="M-28 0 H28 L27 -4 C18 -8 9 -14 5.5 -30 H-5.5 C-9 -14 -18 -8 -27 -4 Z" fill="' + (hot ? 'url(#m-hot)' : 'url(#m-steel)') + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="-4.5" y="-202" width="9" height="174" fill="url(#m-steel)" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<path d="M-17 -195 H17 L11 -203 H-11 Z" fill="#7F8A95" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<rect x="-19" y="-222" width="38" height="22" rx="3" fill="url(#m-steel)" stroke="' + INK + '" stroke-width="1.8"/>';
  }
  function springD(lift) {   /* coil spring between the head (d = 125) and the retainer (d = 195 − lift) */
    var y0 = -125, y1 = -(195 - lift), n = 7, d = 'M-15 ' + y0;
    for (var k = 1; k <= n * 2; k++) d += ' L' + (k % 2 ? 15 : -15) + ' ' + (y0 + (y1 - y0) * k / (n * 2)).toFixed(2);
    return d;
  }
  function plugSVG() {
    var th = ''; for (var y = -437; y < -396; y += 5) th += 'M-11 ' + y + ' H11 ';
    return '<rect x="-11" y="-440" width="22" height="46" fill="url(#m-steel)" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="' + th + '" stroke="#5A646E" stroke-width="1.2"/>' +
      '<path d="M-11 -394 V-384 H4" fill="none" stroke="#5A646E" stroke-width="4" stroke-linejoin="round"/>' +
      '<rect x="-2.6" y="-398" width="5.2" height="8" fill="#5A646E"/>' +
      '<rect x="-19" y="-462" width="38" height="22" fill="url(#m-steel)" stroke="' + INK + '" stroke-width="1.6"/><path d="M-7 -462 V-440 M7 -462 V-440" stroke="' + INK + '" stroke-width="1"/>' +
      '<path d="M-10 -462 V-548 Q-10 -556 -7 -560 H7 Q10 -556 10 -548 V-462 Z" fill="#F7F7F4" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M-10 -520 H10 M-10 -530 H10 M-10 -540 H10" stroke="#C9CDD0" stroke-width="2"/>' +
      '<rect x="-5" y="-578" width="10" height="18" fill="#8C96A0" stroke="' + INK + '" stroke-width="1.4"/><rect x="-8" y="-586" width="16" height="9" rx="2" fill="#8C96A0" stroke="' + INK + '" stroke-width="1.4"/>';
  }
  function sparkSVG() {
    return '<circle cx="-1" cy="-387" r="22" fill="url(#m-flash)"/>' +
      '<path d="M-1 -392 L3 -389 L-3 -387.5 L2 -385" fill="none" stroke="#FFF6D6" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
  }
  function bez(p, t) {
    var u = 1 - t;
    return { x: u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6], y: u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7] };
  }
  var FLOW_I = [-262, -453, -150, -455, -60, -450, -44, -394], FLOW_E = [44, -394, 60, -450, 150, -455, 262, -453];

  /* ================= Engine ================= */
  /* exploded-view labels: [group, text, x, y, anchor] in the part's own (pre-explode) coordinates */
  var XLAB = [['.xp-piston', 'ลูกสูบ', 0, -374, 'middle'], ['.xp-rod', 'ก้านสูบ', -62, -170, 'end'], ['.xp-crank', 'เพลาข้อเหวี่ยง', 0, 156, 'middle'],
    ['.xp-ivalve', 'วาล์วไอดี', -128, -560, 'end'], ['.xp-evalve', 'วาล์วไอเสีย', 128, -560, 'start'], ['.xp-plug', 'หัวเทียน', 34, -505, 'start'],
    ['.cam-i', 'ลูกเบี้ยวไอดี', -102, -690, 'middle'], ['.cam-e', 'ลูกเบี้ยวไอเสีย', 102, -690, 'middle'],
    ['.xp-head', 'ฝาสูบ', -122, -338, 'middle'], ['.xp-block', 'กระบอกสูบ', 0, 196, 'middle']];
  function Engine(svg, o) {
    o = o || {};
    var p = 'en' + (++uid), th = o.start || 0, prev = th;
    svg.classList.add('eng');
    svg.setAttribute('viewBox', o.vb || '-340 -720 680 980');
    var g = function (cls, part, inner) { return '<g class="xp xp-' + cls + '"' + (part ? ' data-part="' + part + '"' : '') + '>' + inner + '</g>'; };
    var chamber = '<g class="gas" clip-path="url(#' + p + '-c)"><path class="gas-f"/><circle class="flame" cx="0" cy="-388" r="0" fill="url(#m-flame)"/><g class="gp"></g></g>';
    svg.innerHTML =
      '<defs><clipPath id="' + p + '-c"><path class="gas-clip"/></clipPath></defs>' +
      '<path class="axis" d="M0 -712 V250" stroke="#8C9298" stroke-width="1.2" stroke-dasharray="22 6 4 6" fill="none"/>' +
      '<g class="zoom">' +
      g('sump', 'block', '<path d="M-190 120 H190 V188 Q190 230 150 230 H-150 Q-190 230 -190 188 Z" fill="#E7E3DA" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<path d="M-180 178 Q-120 170 -60 178 T60 178 T180 178 V188 Q180 220 150 220 H-150 Q-180 220 -180 188 Z" fill="#E2B65A" opacity=".55"/>') +
      g('block', 'block', blockSVG()) +
      g('crank', 'crank', '<g class="crk">' + crankSVG() + '</g>') +
      g('head', 'head', headSVG()) +
      '<g class="xp xp-gasl">' + chamber + '<g class="pi"></g><g class="pe"></g></g>' +
      g('piston', 'piston', '<g class="pst">' + pistonSVG() + '</g>') +
      g('rod', 'rod', '<g class="rodg">' + rodSVG() + '</g>') +
      g('pin', 'piston', '<g class="pinr">' + pinSVG() + '</g>') +
      g('ivalve', 'ivalve', '<g transform="translate(' + SI.x + ' ' + SI.y + ') rotate(' + (-TILT) + ')"><path class="spr" fill="none" stroke="#3B6E8F" stroke-width="3.2" stroke-linejoin="round"/></g>' +
        '<g class="vi">' + valveSVG(false) + '<path class="hitv" d="M0 4 V-222" stroke="transparent" stroke-width="46"/></g>') +
      g('evalve', 'evalve', '<g transform="translate(' + SE.x + ' ' + SE.y + ') rotate(' + TILT + ')"><path class="spr" fill="none" stroke="#3B6E8F" stroke-width="3.2" stroke-linejoin="round"/></g>' +
        '<g class="ve">' + valveSVG(true) + '<path class="hitv" d="M0 4 V-222" stroke="transparent" stroke-width="46"/></g>') +
      g('plug', 'plug', plugSVG() + '<g class="spark" opacity="0">' + sparkSVG() + '</g><rect x="-22" y="-590" width="44" height="200" fill="transparent"/>') +
      g('cams', 'cams', '<g class="cam-i"><g class="ci">' + camSVG() + '</g></g><g class="cam-e"><g class="ce">' + camSVG() + '</g></g>') +
      g('cover', '', coverSVG()) +
      (o.ports ? '<g class="plab"><text x="-300" y="-512" text-anchor="middle" class="pl-t">ไอดี</text><text x="-300" y="-382" text-anchor="middle" class="pl-e">AIR + FUEL</text>' +
        '<path d="M-330 -453 H-276" stroke="#3A9BD6" stroke-width="5" marker-end="url(#m-arr-b)"/>' +
        '<text x="300" y="-512" text-anchor="middle" class="pl-t">ไอเสีย</text><text x="300" y="-382" text-anchor="middle" class="pl-e">EXHAUST</text>' +
        '<path d="M276 -453 H330" stroke="#8B7E70" stroke-width="5" marker-end="url(#m-arr-g)"/></g>' : '') +
      (o.dims ? '<g class="dims"><path d="M160 -358 H266 M160 -218 H266" stroke="#5B636B" stroke-width="1.4"/>' +
        '<path class="draw" pathLength="1" style="--d:1300" d="M252 -358 V-218" stroke="#1F2429" stroke-width="2.4" marker-start="url(#m-tick)" marker-end="url(#m-tick)"/>' +
        '<text x="240" y="-298" text-anchor="end" class="dm-a">ช่วงชัก</text><text x="240" y="-266" text-anchor="end" class="dm-b">70 มม.</text></g>' : '') +
      '<g class="xls"></g>' +
      '</g>';
    var q = function (s) { return svg.querySelector(s); };
    var el = { pst: q('.pst'), rod: q('.rodg'), pin: q('.pinr'), crk: q('.crk'), vi: q('.vi'), ve: q('.ve'), si: q('.xp-ivalve .spr'), se: q('.xp-evalve .spr'),
      ci: q('.ci'), ce: q('.ce'), gf: q('.gas-f'), gc: q('.gas-clip'), fl: q('.flame'), sp: q('.spark'), gp: q('.gp'), pi: q('.pi'), pe: q('.pe'), zoom: q('.zoom'), xls: q('.xls') };
    /* gas particles: 18 in the chamber (normalised u,v that squeeze with the piston) and 11 in each port */
    var cp = [], pI = [], pE = [], k;
    function rnd(s) { var x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
    for (k = 0; k < 18; k++) cp.push({ u: rnd(k) * 2 - 1, v: rnd(k + 50), du: 0, dv: 0, e: sv('circle', { r: 5.5 }, el.gp) });
    for (k = 0; k < 11; k++) { pI.push({ s: k / 11, e: sv('circle', { r: 5, fill: rgb(MIX) }, el.pi) }); pE.push({ s: k / 11, e: sv('circle', { r: 5, fill: rgb(EXH) }, el.pe) }); }
    function set(a) {
      var d = a - prev; prev = a; th = a;
      var py = pinY(a), c = crankPin(a), crown = py - CROWN;
      el.pst.setAttribute('transform', 'translate(0 ' + py.toFixed(2) + ')');
      el.pin.setAttribute('transform', 'translate(0 ' + py.toFixed(2) + ')');
      el.crk.setAttribute('transform', 'rotate(' + a.toFixed(2) + ')');
      var ang = Math.atan2(-c.x, -(py - c.y)) / D;
      el.rod.setAttribute('transform', 'translate(' + c.x.toFixed(2) + ' ' + c.y.toFixed(2) + ') rotate(' + ang.toFixed(3) + ')');
      var li = liftI(a), le = liftE(a);
      el.vi.setAttribute('transform', 'translate(' + SI.x + ' ' + SI.y.toFixed(2) + ') rotate(' + (-TILT) + ') translate(0 ' + li.toFixed(2) + ')');
      el.ve.setAttribute('transform', 'translate(' + SE.x + ' ' + SE.y.toFixed(2) + ') rotate(' + TILT + ') translate(0 ' + le.toFixed(2) + ')');
      el.si.setAttribute('d', springD(li)); el.se.setAttribute('d', springD(le));
      el.ci.setAttribute('transform', 'translate(' + (SI.x - 248 * SIN).toFixed(2) + ' ' + (SI.y - 248 * COS).toFixed(2) + ') rotate(' + (166 + (a - 108) / 2).toFixed(2) + ')');
      el.ce.setAttribute('transform', 'translate(' + (SE.x + 248 * SIN).toFixed(2) + ' ' + (SE.y - 248 * COS).toFixed(2) + ') rotate(' + (194 + (a - 612) / 2).toFixed(2) + ')');
      var ch = 'M-80 ' + roofY(80).toFixed(2) + ' L0 ' + ROOF + ' L80 ' + roofY(80).toFixed(2) + ' V' + crown.toFixed(2) + ' H-80 Z';
      el.gc.setAttribute('d', ch); el.gf.setAttribute('d', ch);
      var G = gas(a);
      el.gf.setAttribute('fill', rgb(G.c)); el.gf.setAttribute('fill-opacity', G.a.toFixed(3));
      var fr = G.fl * 190, fo = G.t < 392 ? (G.t >= SPARK ? 1 : 0) : Math.max(0, 1 - (G.t - 392) / 34);
      el.fl.setAttribute('r', fr.toFixed(1)); el.fl.setAttribute('opacity', fo.toFixed(3));
      var spk = G.t >= SPARK - 2 && G.t <= SPARK + 12;
      el.sp.setAttribute('opacity', spk ? 1 : 0);
      var step = Math.min(30, Math.abs(d)), show = Math.round(G.n * cp.length);
      cp.forEach(function (P, i) {
        if (step) {
          P.du += (rnd(i + a * 0.37) - .5) * .02 * step; P.dv += (rnd(i * 3.1 + a * .29) - .5) * .02 * step;
          P.du *= .85; P.dv *= .85; P.u = clamp(P.u + P.du, -1, 1); P.v = clamp(P.v + P.dv, 0, 1);
          if (Math.abs(P.u) >= 1) P.du = -P.du; if (P.v <= 0 || P.v >= 1) P.dv = -P.dv;
        }
        var x = P.u * 70, top = roofY(x) + 8, y = top + P.v * Math.max(0, crown - 8 - top);
        P.e.setAttribute('cx', x.toFixed(1)); P.e.setAttribute('cy', y.toFixed(1));
        var inF = G.fl > 0 && Math.hypot(x, y + 388) < fr;
        P.e.setAttribute('fill', rgb(inF ? POWER : G.c));
        P.e.setAttribute('opacity', i < show ? 1 : 0);
      });
      pI.forEach(function (P) {
        if (step && li > .4) P.s = (P.s + step * .0042 * (li / LIFT)) % 1;
        var b = bez(FLOW_I, P.s); P.e.setAttribute('cx', b.x.toFixed(1)); P.e.setAttribute('cy', b.y.toFixed(1));
        P.e.setAttribute('opacity', P.s > .9 ? ((1 - P.s) * 10).toFixed(2) : 1);
      });
      pE.forEach(function (P) {
        if (step && le > .4) P.s = (P.s + step * .0042 * (le / LIFT)) % 1;
        var b = bez(FLOW_E, P.s); P.e.setAttribute('cx', b.x.toFixed(1)); P.e.setAttribute('cy', b.y.toFixed(1));
        P.e.setAttribute('opacity', (P.s < .1 ? P.s * 10 : P.s > .85 ? (1 - P.s) / .15 : 1).toFixed(2));
      });
      if (api.onset) api.onset(a);
    }
    /* exploded view: every part slides out along its own path (CSS transforms, 0.7 s), the drawing zooms out to fit */
    var VB0 = (o.vb || '-340 -720 680 980').split(' ').map(Number), VB1 = [-700, -930, 1400, 1330], vbT = null, ex = false;
    function setVB(v) { svg.setAttribute('viewBox', v.map(function (n) { return n.toFixed(1); }).join(' ')); }
    function explode(on) {
      on = !!on; if (on === ex) return; ex = on;
      svg.classList.toggle('exploded', on);
      var from = svg.getAttribute('viewBox').split(' ').map(Number), to = on ? VB1 : VB0;
      if (vbT) vbT.cancel();
      vbT = tween(700, function (t) { setVB(from.map(function (f, i) { return f + (to[i] - f) * t; })); });
    }
    /* labels for the exploded view: they ride with their part and fade in once the parts have moved */
    XLAB.forEach(function (x) {
      var grp = svg.querySelector(x[0]); if (!grp) return;
      var t = sv('text', { x: x[2], y: x[3], 'text-anchor': x[4], 'class': 'xl' }, grp); t.textContent = x[1];
    });
    var api = { set: set, get: function () { return th; }, explode: explode, exploded: function () { return ex; }, svg: svg, el: el };
    set(th);
    return api;
  }

  /* ================= slide 1: title, an engine that runs by itself ================= */
  var e1s = $('#m1-eng');
  if (e1s) (function () {
    var E = Engine(e1s, { start: 345, ports: true, dims: true });
    var rpm = $('#m1-rpm'), chips = [].slice.call(document.querySelectorAll('#m1-strokes .sk'));
    E.onset = function (a) { var s = strokeOf(a); chips.forEach(function (c, i) { c.classList.toggle('lit', i === s); }); };
    E.set(345);
    var cnts = [].slice.call(document.querySelectorAll('#m1-facts .cnt')), shown = false;
    function counts(st) {   /* the two numbers count up on beat 1, with thousands separators */
      if (st >= 1 && !shown) { shown = true; cnts.forEach(function (c) { var to = +c.dataset.to; tween(1100, function (t) { c.textContent = thai(Math.round(to * t)); }); }); }
      if (st < 1) shown = false;
    }
    comp(e1s.closest('.slide'), {
      beat: counts,
      active: function (on) { if (on && still()) E.set(345); },
      tick: function (dt) { if (still()) return false; E.set(E.get() + dt * 150); return true; }
    });
    window.__mech = window.__mech || {}; (window.__mech.engines = window.__mech.engines || {}).title = E;
  })();

  /* ================= slide 2: four strokes, crank-angle scrubber ================= */
  var e2s = $('#m2-eng');
  if (e2s) (function () {
    var slide = e2s.closest('.slide'), E = Engine(e2s, { start: 60, ports: true });
    var bar = $('#m2-bar'), head = $('#m2-head'), deg = $('#m2-deg'), bplay = $('#m2-play'), speeds = [].slice.call(document.querySelectorAll('#m2-speed .tb'));
    var segs = [].slice.call(document.querySelectorAll('#m2-bar .seg')), big = [].slice.call(document.querySelectorAll('#m2-big .bs'));
    var sName = $('#m2-sname'), sEn = $('#m2-sen'), sSay = $('#m2-say'), sPis = $('#m2-pis'), sIv = $('#m2-iv'), sEv = $('#m2-ev'), sTurn = $('#m2-turn');
    var dial = $('#m2-dial-n'), lampI = $('#m2-li'), lampE = $('#m2-le'), lampS = $('#m2-ls');
    var playing = !still(), speed = 0.5, lastS = -1;
    function render(a) {
      var t = m720(a), s = strokeOf(a);
      head.style.left = (t / 720 * 100) + '%';
      deg.textContent = Math.round(t) + '°';
      segs.forEach(function (x, i) { x.classList.toggle('lit', i === s); });
      big.forEach(function (x, i) { x.classList.toggle('lit', i === s); });
      if (s !== lastS) {
        lastS = s; var S = STROKES[s];
        sName.textContent = S.th; sEn.textContent = S.en; sSay.textContent = S.say;
        sName.style.color = S.col;
        sPis.textContent = S.piston === 'ลง' ? 'ลง ↓' : 'ขึ้น ↑'; sIv.textContent = S.iv; sEv.textContent = S.ev;
        sIv.classList.toggle('open', S.iv === 'เปิด'); sEv.classList.toggle('open', S.ev === 'เปิด');
      }
      sTurn.textContent = t < 360 ? 'รอบที่ 1' : 'รอบที่ 2';
      dial.setAttribute('transform', 'rotate(' + (a % 360).toFixed(1) + ')');
      lampI.classList.toggle('on', liftI(a) > .3); lampE.classList.toggle('on', liftE(a) > .3);
      lampS.classList.toggle('on', t >= SPARK - 2 && t <= SPARK + 12);
    }
    E.onset = render;
    function setPlay(v) { playing = v; bplay.setAttribute('aria-pressed', v ? 'true' : 'false'); bplay.querySelector('span').textContent = v ? 'หยุด' : 'เล่น'; bplay.querySelector('.ic-play').style.display = v ? 'none' : ''; bplay.querySelector('.ic-pause').style.display = v ? '' : 'none'; if (v) wake(); }
    bplay.addEventListener('click', function (e) { e.stopPropagation(); setPlay(!playing); });
    speeds.forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); speed = +b.dataset.v; speeds.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); if (!playing) setPlay(true); });
    });
    /* drag anywhere on the bar: the angle follows the finger across the whole 0–720° */
    
    function angAt(e) { var r = bar.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1) * 720; }
    function setAng(t) { var cur = m720(E.get()); var nt = E.get() + (t - cur); E.set(nt); }
    drag(bar, {
      down: function (e) { setPlay(false); setAng(angAt(e)); },
      move: function (e) { setAng(angAt(e)); },
      up: function () {}   /* stay paused where the student left it; ▶ starts again */
    });
    bar.tabIndex = 0; bar.setAttribute('role', 'slider'); bar.setAttribute('aria-label', 'มุมเพลาข้อเหวี่ยง'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '720');
    bar.addEventListener('keydown', function (e) {   /* Up/Down nudge the angle; Left/Right stay with the deck */
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setPlay(false); setAng(m720(E.get() + (e.key === 'ArrowUp' ? 5 : -5))); }
    });
    E.set(still() ? 345 : 60);
    comp(slide, {
      active: function (on) { if (on) { setPlay(!still()); if (still()) E.set(345); } },
      tick: function (dt) { if (!playing) return false; E.set(E.get() + dt * 180 * speed); bar.setAttribute('aria-valuenow', Math.round(m720(E.get()))); return true; }
    });
    window.__mech = window.__mech || {}; window.__mech.scrub = { E: E, bar: bar, play: setPlay, playing: function () { return playing; } };
    (window.__mech.engines = window.__mech.engines || {}).strokes = E;
  })();

  /* ================= slide 3: tap a part, explore it, exploded view ================= */
  var PARTS = {
    piston: { th: 'ลูกสูบ', en: 'Piston', no: 1,
      what: 'รับแรงดันจากแก๊สที่เผาไหม้ แล้วส่งแรงผ่านก้านสูบไปหมุนเพลาข้อเหวี่ยง แหวนลูกสูบกันแก๊สรั่วลงห้องข้อเหวี่ยง',
      fact: 'ทำจากอะลูมิเนียม เบาแต่ทนร้อน เลื่อนขึ้น–ลงได้หลายสิบครั้งต่อวินาที', tryit: 'ลากแถบมุมในสไลด์ก่อน ดูว่าลูกสูบอยู่บนสุดที่ 0° และ 360°' },
    rod: { th: 'ก้านสูบ', en: 'Connecting rod', no: 2,
      what: 'เชื่อมลูกสูบกับเพลาข้อเหวี่ยง เปลี่ยนการเคลื่อนที่ขึ้น–ลงของลูกสูบ ให้กลายเป็นการหมุน',
      fact: 'หน้าตัดเป็นรูปตัว I จึงแข็งแรงแต่เบา ปลายใหญ่ประกบข้อเหวี่ยงด้วยโบลต์ 2 ตัว', tryit: 'สังเกตก้านสูบเอียงมากที่สุดตอนข้อเหวี่ยงอยู่ด้านข้าง (90° และ 270°)' },
    crank: { th: 'เพลาข้อเหวี่ยง', en: 'Crankshaft', no: 3,
      what: 'หมุน 2 รอบต่อการทำงานครบ 4 จังหวะ ส่งกำลังต่อไปยังเกียร์และล้อ',
      fact: 'ตุ้มถ่วงฝั่งตรงข้ามข้อเหวี่ยงช่วยถ่วงน้ำหนักลูกสูบ ทำให้หมุนเรียบ สั่นน้อย', tryit: 'เทียบ: ลูกสูบวิ่งขึ้นลง 2 ครั้ง ข้อเหวี่ยงหมุน 1 รอบ' },
    ivalve: { th: 'วาล์วไอดี', en: 'Intake valve', no: 4,
      what: 'เปิดให้ไอดี (อากาศผสมเชื้อเพลิง) ไหลเข้ากระบอกสูบในจังหวะดูด แล้วปิดสนิทเพื่อให้อัดได้',
      fact: 'ลูกเบี้ยวกดให้เปิด สปริงดึงกลับให้ปิด เปิดก่อนจุดบนสุด 12° และปิดหลังจุดล่างสุด 48° เพื่อให้ไอดีเข้าได้มาก', tryit: 'หาช่วงที่วาล์วทั้งสองเปิดพร้อมกันเล็กน้อย (รอบ ๆ 0°)' },
    evalve: { th: 'วาล์วไอเสีย', en: 'Exhaust valve', no: 5,
      what: 'เปิดในจังหวะคาย ให้แก๊สที่เผาไหม้แล้วออกไปทางท่อไอเสีย',
      fact: 'ร้อนที่สุดในเครื่องยนต์ (หลายร้อยองศาเซลเซียส) จึงทำจากเหล็กกล้าทนความร้อน', tryit: 'วาล์วไอเสียเริ่มเปิดก่อนจุดล่างสุดของจังหวะระเบิด 48°' },
    plug: { th: 'หัวเทียน', en: 'Spark plug', no: 6,
      what: 'สร้างประกายไฟข้ามเขี้ยวหัวเทียน จุดไอดีที่ถูกอัดไว้ ให้เริ่มเผาไหม้',
      fact: 'จุดก่อนลูกสูบถึงจุดบนสุดราว 20° เพราะเปลวไฟต้องใช้เวลาลามทั่วห้องเผาไหม้', tryit: 'ลากแถบมุมไปที่ 340° แล้วดูประกายไฟ' },
    block: { th: 'กระบอกสูบ', en: 'Cylinder', no: 7,
      what: 'ท่อที่ลูกสูบเลื่อนขึ้น–ลง ผนังเรียบและกลมพอดีกับลูกสูบ แก๊สจึงไม่รั่ว',
      fact: 'รอบผนังมีช่องน้ำหล่อเย็น (สีฟ้า) ระบายความร้อนจากการเผาไหม้', tryit: 'ปริมาตรเหนือลูกสูบเล็กที่สุดที่จุดบนสุด และใหญ่ที่สุดที่จุดล่างสุด' },
    head: { th: 'ฝาสูบ', en: 'Cylinder head', no: 8,
      what: 'ปิดด้านบนของกระบอกสูบ เป็นที่อยู่ของห้องเผาไหม้ ช่องไอดี ช่องไอเสีย วาล์ว และหัวเทียน',
      fact: 'หลังคาห้องเผาไหม้เอียงสองข้าง (pent roof) ทำให้ใส่วาล์วใหญ่ได้และหัวเทียนอยู่ตรงกลาง', tryit: 'ดูไอดีสีฟ้าไหลผ่านช่องซ้าย และไอเสียสีเทาออกช่องขวา' },
    cams: { th: 'เพลาลูกเบี้ยว', en: 'Camshafts', no: 9,
      what: 'ลูกเบี้ยวรูปไข่กดวาล์วให้เปิดตามจังหวะที่ถูกต้อง',
      fact: 'หมุนครึ่งรอบ ต่อเพลาข้อเหวี่ยง 1 รอบ วาล์วแต่ละตัวจึงเปิดเพียงครั้งเดียวในทุก 2 รอบ', tryit: 'ลูกเบี้ยวชี้ลงหาวาล์วเมื่อวาล์วเปิดกว้างที่สุด' }
  };
  /* close-up drawings for the explore panel: the same part drawings, bigger, with call-outs.
     One frame for all (viewBox −310 −200 620 400); call-out = [x, y on the part, label x, label y, text, anchor] */
  function callouts(list) {
    return list.map(function (c, i) {
      var tx = c[2], ty = c[3], an = c[5] || (tx > c[0] ? 'start' : 'end');
      var ex = an === 'start' ? tx - 10 : an === 'end' ? tx + 10 : tx, ey = an === 'middle' ? (ty < c[1] ? ty + 12 : ty - 30) : ty - 9;
      return '<path class="draw cl" pathLength="1" style="--d:' + (250 + i * 110) + '" d="M' + c[0] + ' ' + c[1] + ' L' + ex + ' ' + ey + '"/>' +
        '<circle class="cl-d" cx="' + c[0] + '" cy="' + c[1] + '" r="5.5"/>' +
        '<text class="cl-t" x="' + tx + '" y="' + ty + '" text-anchor="' + an + '">' + c[4] + '</text>';
    }).join('');
  }
  var CUT = '<clipPath id="cu-cut"><path d="M-170 -390 H170 V-176 C120 -160 60 -192 0 -176 S-120 -160 -170 -176 Z"/></clipPath>';
  var CLOSE = {
    piston: ['<g transform="scale(1.4)">' + pistonSVG() + pinSVG() + '</g>',
      [[-42, -81, -140, -128, 'หัวลูกสูบ'], [-104, -64, -140, -52, 'แหวนอัด 2 วง'], [104, -41, 140, -80, 'แหวนน้ำมัน'], [0, 0, 140, 34, 'สลักลูกสูบ'], [-96, 44, -140, 92, 'กระโปรงลูกสูบ']]],
    rod: ['<g transform="translate(0 105)">' + rodSVG() + '</g>',
      [[-25, -125, -140, -120, 'ปลายเล็ก'], [8, -30, 140, -40, 'หน้าตัดรูปตัว I'], [-46, 105, -140, 128, 'ปลายใหญ่'], [38, 112, 140, 128, 'โบลต์ 2 ตัว']]],
    crank: ['<g transform="translate(0 12) scale(1.2)">' + crankSVG() + '</g>',
      [[0, -72, 140, -112, 'ข้อเหวี่ยง'], [0, 12, -140, -20, 'แกนเพลาหลัก'], [-70, 84, -140, 120, 'ตุ้มถ่วง'], [48, 89, 140, 120, 'รูถ่วงสมดุล']]],
    ivalve: ['<g transform="translate(0 120) scale(1.05)"><path d="' + springD(0) + '" fill="none" stroke="#3B6E8F" stroke-width="3.2"/>' + valveSVG(false) + '</g>',
      [[20, -101, 140, -110, 'ถ้วยรับลูกเบี้ยว'], [16, -48, 140, -36, 'สปริงวาล์ว'], [-5, 25, -140, 30, 'ก้านวาล์ว'], [-29, 116, -140, 128, 'หัววาล์ว']]],
    evalve: ['<g transform="translate(0 120) scale(1.05)"><path d="' + springD(0) + '" fill="none" stroke="#3B6E8F" stroke-width="3.2"/>' + valveSVG(true) + '</g>',
      [[20, -101, 140, -110, 'ถ้วยรับลูกเบี้ยว'], [16, -48, 140, -36, 'สปริงวาล์ว'], [-5, 25, -140, 30, 'ก้านวาล์ว'], [-29, 116, -140, 128, 'หัววาล์ว ร้อนจัด']]],
    plug: ['<g transform="translate(0 581) scale(1.2)">' + plugSVG() + '<g class="spark-c">' + sparkSVG() + '</g></g>',
      [[0, -118, 140, -116, 'ขั้วต่อสายไฟ'], [-12, -31, -140, -36, 'ฉนวนเซรามิก'], [23, 40, 140, 30, 'หกเหลี่ยมไว้ขัน'], [-13, 83, -140, 76, 'เกลียว'], [4, 116, -140, 136, 'เขี้ยว ห่าง 0.8 มม.']]],
    block: [CUT + '<g transform="translate(0 236) scale(.85)"><g clip-path="url(#cu-cut)">' + blockSVG() + '</g><path d="M-170 -176 C120 -160 60 -192 0 -176" fill="none"/><path d="M-170 -176 C-120 -160 -60 -192 0 -176 S120 -160 170 -176" fill="none" stroke="#1F2429" stroke-width="2.2" stroke-dasharray="10 6"/></g>',
      [[-101, -8, -140, -60, 'ช่องน้ำหล่อเย็น'], [70, -40, 140, -86, 'ปลอกสูบ'], [-120, 60, -140, 96, 'เสื้อสูบ'], [0, 30, 140, 40, 'รูสูบ ⌀ 80 มม.']]],
    head: ['<g transform="translate(0 410) scale(.95)">' + headSVG() + '</g>',
      [[-114, -18, -170, -112, 'ช่องไอดี', 'middle'], [114, -18, 170, -112, 'ช่องไอเสีย', 'middle'], [0, 46, 0, 138, 'ห้องเผาไหม้', 'middle'], [-41, -36, -40, -150, 'ช่องน้ำ', 'middle']]],
    cams: ['<g transform="translate(0 12) scale(2.2)">' + camSVG() + '</g>',
      [[0, -94, 140, -112, 'วาล์วเปิด'], [-57, 12, -140, 4, 'วาล์วปิด'], [0, 12, 140, 70, 'เพลาลูกเบี้ยว']]]
  };
  var e3s = $('#m3-eng');
  if (e3s) (function () {
    var slide = e3s.closest('.slide'), E = Engine(e3s, { start: 100, ports: false });
    var panel = $('#m3-panel'), pName = $('#m3-name'), pEn = $('#m3-en'), pNo = $('#m3-no'), pWhat = $('#m3-what'), pFact = $('#m3-fact'), pTry = $('#m3-try'), pSvg = $('#m3-close');
    var bEx = $('#m3-ex'), bRun = $('#m3-run'), list = [].slice.call(document.querySelectorAll('#m3-list .pk'));
    var cur = null, running = !still(), exT = null;
    function pick(key) {
      var P = PARTS[key]; if (!P) return;
      cur = key;
      e3s.classList.add('picking');
      [].forEach.call(e3s.querySelectorAll('.xp'), function (g) { g.classList.toggle('sel', g.dataset.part === key); });
      list.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.k === key ? 'true' : 'false'); });
      pName.textContent = P.th; pEn.textContent = P.en; pNo.textContent = (P.no < 10 ? '0' : '') + P.no; pWhat.textContent = P.what; pFact.textContent = P.fact; pTry.textContent = P.tryit;
      var C = CLOSE[key];
      pSvg.innerHTML = '<g class="cu">' + C[0] + '</g>' + callouts(C[1]);
      panel.classList.remove('show'); void panel.offsetWidth; panel.classList.add('show');
    }
    [].forEach.call(e3s.querySelectorAll('.xp[data-part]'), function (g) {
      g.addEventListener('click', function (e) { e.stopPropagation(); pick(g.dataset.part); });
    });
    list.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); pick(b.dataset.k); }); });
    function setRun(v) { running = v; bRun.setAttribute('aria-pressed', v ? 'true' : 'false'); bRun.querySelector('span').textContent = v ? 'หยุดเครื่อง' : 'เดินเครื่อง'; if (v) wake(); }
    bRun.addEventListener('click', function (e) { e.stopPropagation(); if (E.exploded()) return; setRun(!running); });
    bEx.addEventListener('click', function (e) {
      e.stopPropagation();
      var on = !E.exploded();
      bEx.setAttribute('aria-pressed', on ? 'true' : 'false'); bEx.querySelector('span').textContent = on ? 'ประกอบกลับ' : 'แยกชิ้นส่วน';
      if (on) {   /* bring the crank to top dead centre first (the rod stands straight), then pull the parts apart */
        setRun(false); bRun.disabled = true;
        var a0 = E.get(), a1 = Math.ceil(a0 / 360) * 360; if (exT) exT.cancel();
        exT = tween(Math.min(600, (a1 - a0) * 3 + 1), function (t) { E.set(a0 + (a1 - a0) * t); }, function () { E.explode(true); });
      } else { E.explode(false); bRun.disabled = false; }
    });
    pick('piston');
    comp(slide, {
      active: function (on) { if (on) setRun(!still() && !E.exploded()); },
      tick: function (dt) { if (!running) return false; E.set(E.get() + dt * 60); return true; }
    });
    window.__mech = window.__mech || {}; window.__mech.explorer = { E: E, pick: pick, cur: function () { return cur; } };
  })();

  /* ================= slide 4: gears ================= */
  function inv(a) { return Math.tan(a) - a; }
  function gearPath(N, m) {
    var rp = m * N / 2, ra = rp + m, rf = rp - 1.25 * m, rb = rp * Math.cos(20 * D), r0 = Math.max(rb, rf);
    var half = function (r) { return Math.PI / (2 * N) + inv(20 * D) - inv(Math.acos(Math.min(1, rb / r))); };
    var P = function (r, a) { return (r * Math.cos(a)).toFixed(2) + ' ' + (r * Math.sin(a)).toFixed(2); };
    var d = '', step = 2 * Math.PI / N;
    for (var k = 0; k < N; k++) {
      var c = k * step, i, r;
      d += (k ? ' L' : 'M') + P(rf, c - half(r0));
      for (i = 0; i <= 5; i++) { r = r0 + (ra - r0) * i / 5; d += ' L' + P(r, c - half(r)); }
      d += ' A' + ra.toFixed(2) + ' ' + ra.toFixed(2) + ' 0 0 1 ' + P(ra, c + half(ra));
      for (i = 5; i >= 0; i--) { r = r0 + (ra - r0) * i / 5; d += ' L' + P(r, c + half(r)); }
      d += ' L' + P(rf, c + half(r0));
      d += ' A' + rf.toFixed(2) + ' ' + rf.toFixed(2) + ' 0 0 1 ' + P(rf, c + step - half(r0));
    }
    return d + ' Z';
  }
  function gearBody(N, m, mark) {
    var rp = m * N / 2, rf = rp - 1.25 * m, hub = Math.max(28, rf * .32), holes = '';
    if (rf > 110) for (var k = 0; k < 6; k++) { var a = k * 60 * D + 30 * D, rr = (hub + rf - 18) / 2; holes += '<circle cx="' + (rr * Math.cos(a)).toFixed(1) + '" cy="' + (rr * Math.sin(a)).toFixed(1) + '" r="' + ((rf - hub - 30) / 2.6).toFixed(1) + '" fill="#E6E2D8" stroke="' + INK + '" stroke-width="2"/>'; }
    var mk = (rp + m * .1) , mkw = Math.PI / N;
    return '<path d="' + gearPath(N, m) + '" fill="url(#m-gear)" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<circle r="' + rp.toFixed(1) + '" fill="none" stroke="#5B636B" stroke-width="1.4" stroke-dasharray="14 5 3 5" opacity=".8"/>' + holes +
      '<circle r="' + hub.toFixed(1) + '" fill="url(#m-steel-r)" stroke="' + INK + '" stroke-width="2.2"/><circle r="' + (hub * .45).toFixed(1) + '" fill="#4B555E"/>' +
      '<rect x="' + (-hub * .14).toFixed(1) + '" y="' + (-hub * .62).toFixed(1) + '" width="' + (hub * .28).toFixed(1) + '" height="' + (hub * .25).toFixed(1) + '" fill="#4B555E"/>' +
      '<path d="M' + (rf - 6) + ' 0 L' + (rp + m * .6) + ' 0" stroke="' + mark + '" stroke-width="9" stroke-linecap="round"/>';
  }
  var g4 = $('#m4-svg');
  if (g4) (function () {
    var slide = g4.closest('.slide'), M = 14, OPTS = [10, 12, 15, 18, 20, 24, 30, 36];
    var n1 = 12, n2 = 36, a1 = 0, cx1 = 400, cy = 440, dist = M * (n1 + n2) / 2, auto = false;
    g4.setAttribute('viewBox', '0 0 1240 900');
    g4.innerHTML = '<g class="gl"><line class="gl-c" x1="0" y1="' + cy + '" x2="1240" y2="' + cy + '"/></g>' +
      '<g class="g-in" tabindex="0" role="slider" aria-label="เฟืองขับ ลากเพื่อหมุน"><g class="rot"></g><circle class="ghit" r="10" fill="transparent"/></g>' +
      '<g class="g-out"><g class="rot"></g><circle class="ghit" r="10" fill="transparent"/></g>' +
      '<g class="g-tag t1"><text class="gt-n" text-anchor="middle"></text><text class="gt-l" text-anchor="middle">เฟืองขับ</text></g>' +
      '<g class="g-tag t2"><text class="gt-n" text-anchor="middle"></text><text class="gt-l" text-anchor="middle">เฟืองตาม</text></g>' +
      '<g class="g-hand"><path d="M0 0" class="gh-arc" fill="none" stroke="#E8590C" stroke-width="5" stroke-linecap="round" marker-end="url(#m-arr-o)"/></g>';
    var gin = $('.g-in', g4), gout = $('.g-out', g4), rin = $('.g-in .rot', g4), rout = $('.g-out .rot', g4), hin = $('.g-in .ghit', g4), hout = $('.g-out .ghit', g4);
    var t1 = $('.t1', g4), t2 = $('.t2', g4), arc = $('.gh-arc', g4);
    var oN1 = $('#m4-n1'), oN2 = $('#m4-n2'), oRatio = $('#m4-ratio'), oRd = $('#m4-ratio-d'), oT1 = $('#m4-t1'), oT2 = $('#m4-t2'), oSp = $('#m4-sp'), oTq = $('#m4-tq'), oSpv = $('#m4-spv'), oTqv = $('#m4-tqv'), oDir = $('#m4-dir');
    function gcd(a, b) { return b ? gcd(b, a % b) : a; }
    function draw() {
      rin.innerHTML = gearBody(n1, M, '#E8590C'); rout.innerHTML = gearBody(n2, M, '#3A9BD6');
      hin.setAttribute('r', (M * n1 / 2 + M).toFixed(1)); hout.setAttribute('r', (M * n2 / 2 + M).toFixed(1));
      var arcR = M * n1 / 2 + M + 26;
      arc.setAttribute('d', 'M' + (-arcR * Math.cos(50 * D)).toFixed(1) + ' ' + (-arcR * Math.sin(50 * D)).toFixed(1) + ' A' + arcR + ' ' + arcR + ' 0 0 1 ' + (arcR * Math.cos(50 * D)).toFixed(1) + ' ' + (-arcR * Math.sin(50 * D)).toFixed(1));
      var g = gcd(n1, n2);
      oN1.textContent = n1; oN2.textContent = n2;
      oRatio.textContent = (n2 / g) + ' : ' + (n1 / g);
      oRd.textContent = (n2 / n1 >= 1 ? 'ช้าลง ' : 'เร็วขึ้น ') + f2(Math.max(n2 / n1, n1 / n2)) + ' เท่า';
      oSpv.textContent = f2(n1 / n2) + '×'; oTqv.textContent = f2(n2 / n1) + '×';
      var mx = Math.max(n1 / n2, n2 / n1, 1);
      oSp.style.transform = 'scaleX(' + (n1 / n2 / mx).toFixed(3) + ')'; oTq.style.transform = 'scaleX(' + (n2 / n1 / mx).toFixed(3) + ')';
      t1.querySelector('.gt-n').textContent = n1 + ' ฟัน'; t2.querySelector('.gt-n').textContent = n2 + ' ฟัน';
    }
    function place() {
      var x2 = cx1 + dist;
      gin.setAttribute('transform', 'translate(' + cx1 + ' ' + cy + ')'); gout.setAttribute('transform', 'translate(' + x2.toFixed(1) + ' ' + cy + ')');
      var r1 = M * n1 / 2 + M, r2 = M * n2 / 2 + M;
      t1.setAttribute('transform', 'translate(' + cx1 + ' ' + (cy + Math.max(r1, 90) + 66) + ')');
      t2.setAttribute('transform', 'translate(' + x2.toFixed(1) + ' ' + (cy + r2 + 66) + ')');
      $('.g-hand', g4).setAttribute('transform', 'translate(' + cx1 + ' ' + cy + ')');
    }
    function turn() {
      var a2 = 180 - 180 / n2 - a1 * n1 / n2;
      rin.setAttribute('transform', 'rotate(' + a1.toFixed(2) + ')'); rout.setAttribute('transform', 'rotate(' + a2.toFixed(2) + ')');
      var T1 = a1 / 360, T2 = -a1 * n1 / n2 / 360;
      oT1.textContent = f1(Math.abs(T1)); oT2.textContent = f1(Math.abs(T2));
      oDir.textContent = Math.abs(T1) < .05 ? 'ลากเฟืองสีส้มเพื่อหมุน' : (T1 > 0 ? 'เฟืองขับหมุนตามเข็ม → เฟืองตามหมุนทวนเข็ม' : 'เฟืองขับหมุนทวนเข็ม → เฟืองตามหมุนตามเข็ม');
    }
    var mv = null;
    function setTeeth(k1, k2) {
      var d0 = dist, d1 = M * (k1 + k2) / 2;
      n1 = k1; n2 = k2; a1 = Math.round(a1 / (360 / n1)) * (360 / n1);   /* keep a tooth on the centre line so the new pair meshes */
      draw(); turn();
      if (mv) mv.cancel();
      mv = tween(600, function (t) { dist = d0 + (d1 - d0) * t; place(); });
    }
    [].forEach.call(document.querySelectorAll('#m4-ctl .tb[data-g]'), function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var w = b.dataset.g, dir = +b.dataset.d, k1 = n1, k2 = n2;
        if (w === '1') k1 = OPTS[clamp(OPTS.indexOf(n1) + dir, 0, OPTS.length - 1)]; else k2 = OPTS[clamp(OPTS.indexOf(n2) + dir, 0, OPTS.length - 1)];
        if (k1 !== n1 || k2 !== n2) setTeeth(k1, k2);
      });
    });
    $('#m4-reset').addEventListener('click', function (e) { e.stopPropagation(); a1 = 0; turn(); });
    var bAuto = $('#m4-auto');
    bAuto.addEventListener('click', function (e) { e.stopPropagation(); auto = !auto; bAuto.setAttribute('aria-pressed', auto ? 'true' : 'false'); if (auto) wake(); });
    /* drag: the input follows the finger's angle around its centre; dragging the output turns the pair backwards through the ratio */
    function rotDrag(g, isIn) {
      var lastA = null;
      function ang(e) { var p = svgPt(g4, e), cx = isIn ? cx1 : cx1 + dist; return Math.atan2(p.y - cy, p.x - cx) / D; }
      drag(g, {
        down: function (e) { lastA = ang(e); auto = false; bAuto.setAttribute('aria-pressed', 'false'); g4.classList.add('turning'); },
        move: function (e) {
          var a = ang(e), d = a - lastA; if (d > 180) d -= 360; if (d < -180) d += 360; lastA = a;
          a1 += isIn ? d : -d * n2 / n1; turn();
        },
        up: function () { g4.classList.remove('turning'); }
      });
    }
    rotDrag(gin, true); rotDrag(gout, false);
    gin.addEventListener('keydown', function (e) { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); a1 += e.key === 'ArrowUp' ? 360 / n1 : -360 / n1; turn(); } });
    draw(); place(); turn();
    comp(slide, { tick: function (dt) { if (!auto) return false; a1 += dt * 60; turn(); return true; } });
    window.__mech = window.__mech || {}; window.__mech.gears = { set: setTeeth, state: function () { return { n1: n1, n2: n2, a1: a1, dist: dist }; }, turnTo: function (v) { a1 = v; turn(); } };
  })();

  /* ================= slide 5: lever (first class), moments ================= */
  var l5 = $('#m5-svg');
  if (l5) (function () {
    var PX = 500, X0 = 210, FUL = 1.0, W = 600, FX = X0 + FUL * PX, BY = 627, GY = 770;   /* 3.0 m beam, 500 px per metre, fulcrum 1.0 m from the left end */
    var dW = 0.6, dE = 1.5, tilt = 0, lifted = false;
    l5.setAttribute('viewBox', '0 0 1920 1080');
    l5.innerHTML =
      '<g class="lv-ground"><rect x="150" y="' + GY + '" width="1620" height="20" fill="url(#m-hatch)"/><line x1="150" y1="' + GY + '" x2="1770" y2="' + GY + '" stroke="' + INK + '" stroke-width="3"/></g>' +
      '<g class="lv-ful"><path d="M' + FX + ' ' + (BY + 13) + ' L' + (FX - 70) + ' ' + GY + ' H' + (FX + 70) + ' Z" fill="url(#m-hatch2)" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/><circle cx="' + FX + '" cy="' + (BY + 13) + '" r="7" fill="' + INK + '"/></g>' +
      '<g class="lv-beam"><rect x="' + X0 + '" y="' + (BY - 13) + '" width="' + 3 * PX + '" height="26" rx="5" fill="url(#m-steel-v)" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<g class="lv-ticks"></g>' +
        '<g class="lv-load" tabindex="0" role="slider" aria-label="ตำแหน่งก้อนหิน (น้ำหนัก)"><path d="M-86 -12 C-96 -60 -70 -118 -18 -126 C34 -134 84 -108 90 -60 C94 -30 88 -14 80 -12 Z" fill="url(#m-rock)" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
          '<path d="M-40 -96 C-20 -104 6 -104 24 -96 M-58 -56 C-48 -60 -36 -60 -28 -52 M30 -48 C42 -56 58 -56 66 -46" fill="none" stroke="#6E6152" stroke-width="2.4" stroke-linecap="round"/>' +
          '<text class="lv-kg" y="-52" text-anchor="middle">60 กก.</text><rect x="-100" y="-150" width="200" height="164" fill="transparent"/></g>' +
        '<g class="lv-eff" tabindex="0" role="slider" aria-label="ตำแหน่งที่ออกแรง"><path class="lv-arrow" fill="#E8590C" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/><g class="lv-brk"><path d="M-30 0 L30 -14 M-30 14 L30 0" stroke="#EFECE5" stroke-width="9"/><path d="M-30 0 L30 -14 M-30 14 L30 0" stroke="' + INK + '" stroke-width="2.5"/></g>' +
          '<circle class="lv-grip" r="30" cy="-36" fill="#fff" stroke="' + INK + '" stroke-width="3"/><path d="M-12 -36 H12 M-12 -44 H12 M-12 -28 H12" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/><rect class="lv-ehit" x="-70" width="140" fill="transparent"/></g>' +
      '</g>' +
      '<g class="lv-wl"><path class="lv-warr" d="M0 0" stroke="#5B636B" stroke-width="7" marker-end="url(#m-arr-k)"/><text class="lv-wt" text-anchor="middle"></text></g>' +
      '<g class="lv-dims"><path class="dm dm-w" marker-start="url(#m-tick)" marker-end="url(#m-tick)"/><text class="dm-t dm-wt" text-anchor="middle"></text>' +
        '<path class="dm dm-e" marker-start="url(#m-tick)" marker-end="url(#m-tick)"/><text class="dm-t dm-et" text-anchor="middle"></text>' +
        '<path class="dm-x" d="M0 0"/></g>' +
      '<g class="lv-travel"><path class="tv tv-w"/><text class="tv-t tv-wt" text-anchor="end"></text><path class="tv tv-e"/><text class="tv-t tv-et" text-anchor="start"></text></g>';
    var beam = $('.lv-beam', l5), load = $('.lv-load', l5), eff = $('.lv-eff', l5), arrow = $('.lv-arrow', l5), brk = $('.lv-brk', l5), ehit = $('.lv-ehit', l5);
    var warr = $('.lv-warr', l5), wt = $('.lv-wt', l5), dmw = $('.dm-w', l5), dme = $('.dm-e', l5), dwt = $('.dm-wt', l5), det = $('.dm-et', l5), dmx = $('.dm-x', l5);
    var tvw = $('.tv-w', l5), tve = $('.tv-e', l5), tvwt = $('.tv-wt', l5), tvet = $('.tv-et', l5), ticks = $('.lv-ticks', l5);
    var oMA = $('#m5-ma'), oE = $('#m5-e'), oDW = $('#m5-dw'), oDE = $('#m5-de'), oM1 = $('#m5-m1'), oM2 = $('#m5-m2'), bLift = $('#m5-lift');
    var tk = ''; for (var m = 0; m <= 30; m++) { var x = X0 + m * PX / 10; tk += '<path d="M' + x + ' ' + (BY - 13) + ' v' + (m % 10 === 0 ? 12 : m % 5 === 0 ? 9 : 5) + '" stroke="' + INK + '" stroke-width="1.4"/>'; }
    ticks.innerHTML = tk;
    var eLen = 300, eT = null;
    function rot(x, y) { var a = tilt * D, dx = x - FX, dy = y - (BY + 13); return { x: FX + dx * Math.cos(a) - dy * Math.sin(a), y: BY + 13 + dx * Math.sin(a) + dy * Math.cos(a) }; }
    function arrowD(len) {   /* a downward force arrow whose tip touches the top of the beam */
      var t = -13, sw = 14, hw = 34, hl = 56;
      return 'M' + (-sw) + ' ' + (t - len) + ' H' + sw + ' V' + (t - hl) + ' H' + hw + ' L0 ' + t + ' L' + (-hw) + ' ' + (t - hl) + ' H' + (-sw) + ' Z';
    }
    function render() {
      var xW = FX - dW * PX, xE = FX + dE * PX, E = W * dW / dE, MA = dE / dW;
      beam.setAttribute('transform', 'rotate(' + tilt.toFixed(2) + ' ' + FX + ' ' + (BY + 13) + ')');
      load.setAttribute('transform', 'translate(' + xW.toFixed(1) + ' ' + (BY - 13) + ')');
      var want = clamp(80 + E / W * 220, 90, 360), capped = 80 + E / W * 220 > 360;
      if (eT) eT.cancel();
      var l0 = eLen; eT = tween(450, function (t) { eLen = l0 + (want - l0) * t; arrow.setAttribute('d', arrowD(eLen)); ehit.setAttribute('y', (-13 - eLen).toFixed(1)); ehit.setAttribute('height', (eLen + 30).toFixed(1)); });
      eff.setAttribute('transform', 'translate(' + xE.toFixed(1) + ' ' + (BY) + ')');
      brk.setAttribute('transform', 'translate(0 ' + (-13 - want * .55).toFixed(1) + ')'); brk.style.display = capped ? '' : 'none';
      $('.lv-grip', l5).setAttribute('cy', (-13 - want - 30).toFixed(1));
      [].forEach.call(eff.querySelectorAll('path[stroke-linecap]'), function (p) { p.setAttribute('transform', 'translate(0 ' + (-13 - want - 30 + 36).toFixed(1) + ')'); });
      /* the load's weight acts straight down from the rock's centre */
      var pw = rot(xW, BY + 13);   /* the rock presses down on the bar: W drawn from the underside of the bar */
      warr.setAttribute('d', 'M' + pw.x.toFixed(1) + ' ' + (pw.y + 4).toFixed(1) + ' V' + (pw.y + 112).toFixed(1));
      wt.setAttribute('x', (pw.x - 22).toFixed(1)); wt.setAttribute('y', (pw.y + 96).toFixed(1)); wt.textContent = 'W = ' + W + ' N';
      var dy = GY + 58;
      dmw.setAttribute('d', 'M' + xW.toFixed(1) + ' ' + dy + ' H' + FX); dme.setAttribute('d', 'M' + FX + ' ' + dy + ' H' + xE.toFixed(1));
      var nearW = FX - xW < 190, nearE = xE - FX < 190;   /* short arms: the label moves outside its dimension line */
      dwt.setAttribute('x', (nearW ? xW - 16 : (xW + FX) / 2).toFixed(1)); dwt.setAttribute('text-anchor', nearW ? 'end' : 'middle'); dwt.setAttribute('y', dy + (nearW ? 10 : 46)); dwt.textContent = f2(dW) + ' ม.';
      det.setAttribute('x', (nearE ? xE + 16 : (xE + FX) / 2).toFixed(1)); det.setAttribute('text-anchor', nearE ? 'start' : 'middle'); det.setAttribute('y', dy + (nearE ? 10 : 46)); det.textContent = f2(dE) + ' ม.';
      dmx.setAttribute('d', 'M' + xW.toFixed(1) + ' ' + (BY + 16) + ' V' + (dy + 14) + ' M' + FX + ' ' + (GY) + ' V' + (dy + 14) + ' M' + xE.toFixed(1) + ' ' + (BY + 16) + ' V' + (dy + 14));
      oMA.textContent = f1(MA); oE.textContent = thai(Math.round(E)); oDW.textContent = f2(dW); oDE.textContent = f2(dE);
      oM1.textContent = thai(Math.round(E)) + ' × ' + f2(dE); oM2.textContent = W + ' × ' + f2(dW);
      load.setAttribute('aria-valuenow', f2(dW)); eff.setAttribute('aria-valuenow', f2(dE));
      /* travel while lifting: the rock rises dW·sinα, the hand goes down dE·sinα (work in = work out) */
      var s = Math.sin(Math.abs(tilt) * D), show = Math.abs(tilt) > .5;
      [tvw, tve, tvwt, tvet].forEach(function (n) { n.style.opacity = show ? 1 : 0; });
      if (show) {
        var a = rot(xW, BY - 13), b = rot(xE, BY - 13), left = xE > 1450, tx = xE + (left ? -84 : 84);
        tvw.setAttribute('d', 'M0 0');
        tvwt.setAttribute('x', a.x.toFixed(1)); tvwt.setAttribute('y', (a.y - 150).toFixed(1)); tvwt.setAttribute('text-anchor', 'middle');
        tvwt.textContent = '↑ หินขึ้น ' + f1(dW * s * 100) + ' ซม.';
        tve.setAttribute('d', 'M' + tx + ' ' + (BY - 13) + ' V' + b.y.toFixed(1));
        tvet.setAttribute('x', tx + (left ? -14 : 14)); tvet.setAttribute('y', ((BY - 13 + b.y) / 2 + 10).toFixed(1)); tvet.setAttribute('text-anchor', left ? 'end' : 'start');
        tvet.textContent = '↓ มือกดลง ' + f1(dE * s * 100) + ' ซม.';
      }
    }
    function posDrag(g, which) {
      var off = 0;
      drag(g, {
        down: function (e) { var p = svgPt(l5, e); off = p.x - (which === 'w' ? FX - dW * PX : FX + dE * PX); g.classList.add('held'); },
        move: function (e) {
          var p = svgPt(l5, e), x = p.x - off;
          if (which === 'w') dW = Math.round(clamp((FX - x) / PX, .2, 1.0) * 20) / 20; else dE = Math.round(clamp((x - FX) / PX, .2, 2.0) * 20) / 20;
          render();
        },
        up: function () { g.classList.remove('held'); }
      });
      g.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return; e.preventDefault(); e.stopPropagation();
        var d = e.key === 'ArrowUp' ? .05 : -.05;
        if (which === 'w') dW = clamp(Math.round((dW + d) * 20) / 20, .2, 1); else dE = clamp(Math.round((dE + d) * 20) / 20, .2, 2); render();
      });
    }
    posDrag(load, 'w'); posDrag(eff, 'e');
    var lt = null;
    bLift.addEventListener('click', function (e) {
      e.stopPropagation(); lifted = !lifted; bLift.setAttribute('aria-pressed', lifted ? 'true' : 'false'); bLift.querySelector('span').textContent = lifted ? 'วางลง' : 'ลองยก';
      var t0 = tilt, t1 = lifted ? 7 : 0; if (lt) lt.cancel();
      lt = tween(700, function (t) { tilt = t0 + (t1 - t0) * t; render(); });
    });
    render();
    window.__mech = window.__mech || {}; window.__mech.lever = { set: function (w, e) { dW = w; dE = e; render(); }, state: function () { return { dW: dW, dE: dE, MA: dE / dW, E: W * dW / dE, tilt: tilt }; } };
  })();

  /* ================= slide 6: quick check, a small engine looping its power stroke and two small gears ================= */
  var e6s = $('#m6-eng');
  if (e6s) (function () {
    var slide = e6s.closest('.slide'), E = Engine(e6s, { start: 420 });
    var tag = $('#m6-tag');
    E.onset = function (a) { var S = STROKES[strokeOf(a)]; tag.textContent = S.th; tag.style.background = S.col; };
    E.set(420);
    var gs = $('#m6-gears'), ga = null, gb = null, aa = 0;
    if (gs) {
      gs.setAttribute('viewBox', '0 0 560 340');
      gs.innerHTML = '<g transform="translate(150 170)"><g class="ga">' + gearBody(12, 9, '#E8590C') + '</g></g><g transform="translate(' + (150 + 9 * 24) + ' 170)"><g class="gb">' + gearBody(36, 9, '#3A9BD6') + '</g></g>';
      ga = $('.ga', gs); gb = $('.gb', gs);
    }
    function gturn() { if (!ga) return; ga.setAttribute('transform', 'rotate(' + aa.toFixed(1) + ')'); gb.setAttribute('transform', 'rotate(' + (180 - 5 - aa / 3).toFixed(1) + ')'); }
    gturn();
    comp(slide, {
      active: function (on) { if (on && still()) E.set(420); },
      tick: function (dt) { if (still()) return false; E.set(E.get() + dt * 120); aa += dt * 45; gturn(); return true; }
    });
    (window.__mech = window.__mech || {}); (window.__mech.engines = window.__mech.engines || {}).quiz = E;
  })();

  window.__mech = window.__mech || {};
  window.__mech.kin = { pinY: pinY, liftI: liftI, liftE: liftE, gas: gas, strokeOf: strokeOf, R: R, L: L };
  wake();
})();
