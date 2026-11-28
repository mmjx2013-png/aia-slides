/* app.js · KruSlide sample math-fractions ("food and kitchen"): pizza slicer, chocolate-bar comparison, cake equivalents.
   Every slide has a controller C[id] = { set(st, prev), leave() } (the calculus pattern). set() runs on every beat change;
   prev = -1 when the slide was just entered or jumped to, so going back or jumping lands on a clean, complete state and
   only a forward step plays the transition. ?still / reduced motion (html.rm): every controller shows its final state.
   Taps and drags use pointer events (mouse, pen, touch) and never change the slide.
   All comparisons use whole numbers only (a/b vs c/d  <=>  a·d vs c·b), so every sign shown is exact. */
(function () {
  'use strict';
  var root = document.documentElement, stage = document.getElementById('stage'), NS = 'http://www.w3.org/2000/svg';
  if (!stage) return;
  function still() { return root.classList.contains('rm'); }
  function $(s, c) { return (c || document).querySelector(s); }
  function S(tag, at, p) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (p) p.appendChild(e); return e; }
  function el(tag, cls, txt, p) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (p) p.appendChild(e); return e; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function penOn() { return root.classList.contains('pen-on'); }
  function Seq() { var ts = []; return { at: function (ms, f) { ts.push(setTimeout(f, ms)); }, clear: function () { ts.forEach(clearTimeout); ts = []; } }; }
  /* one running tween per owner */
  function Anim() {
    var tok = 0;
    return { run: function (ms, step, done) {
      var my = ++tok, t0 = null;
      if (still() || ms <= 0) { step(1); if (done) done(); return; }
      function f(t) { if (my !== tok) return; if (t0 === null) t0 = t; var p = Math.min(1, (t - t0) / ms); step(p); if (p < 1) requestAnimationFrame(f); else if (done) done(); }
      requestAnimationFrame(f);
    }, stop: function () { tok++; } };
  }
  function eio(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  var live = el('div', 'sr', null, document.body); live.setAttribute('aria-live', 'polite');
  function say(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }
  var TH = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า', 'สิบ', 'สิบเอ็ด', 'สิบสอง'];
  function cmp(a, b, c, d) { var l = a * d, r = c * b; return l > r ? '>' : l < r ? '<' : '='; }
  function pop(e) { e.classList.remove('bump'); void e.getBoundingClientRect(); e.classList.add('bump'); }
  function shake(e) { e.classList.remove('shk'); void e.offsetWidth; e.classList.add('shk'); }

  /* slider: drag anywhere on the band (mouse or touch), tap a number, or − / +. Arrow Up/Down when focused
     (Left/Right always belong to the deck). o = {min, max, step, val, onchange(v)} */
  function Slider(host, o) {
    var step = o.step || 1, val = o.val;
    host.textContent = ''; host.tabIndex = 0; host.setAttribute('role', 'slider');
    host.setAttribute('aria-valuemin', o.min); host.setAttribute('aria-valuemax', o.max);
    var minus = el('button', 'sb', '−', host), st = el('div', 'st', null, host), trk = el('div', 'trk', null, st), fill = el('i', 'fill', null, trk), knob = el('i', 'knob', null, st), plus = el('button', 'sb', '+', host), tks = [];
    minus.type = plus.type = 'button'; minus.setAttribute('aria-label', 'ลด'); plus.setAttribute('aria-label', 'เพิ่ม'); minus.tabIndex = plus.tabIndex = -1;
    function pct(v) { return (v - o.min) / (o.max - o.min) * 100; }
    for (var v = o.min; v <= o.max + 1e-9; v += step) { var t = el('span', 'tk', String(v), st); t.style.left = pct(v) + '%'; tks.push([v, t]); }
    function show() {
      knob.style.left = pct(val) + '%'; fill.style.width = pct(val) + '%';
      tks.forEach(function (t) { t[1].classList.toggle('on', Math.abs(t[0] - val) < 1e-9); });
      host.setAttribute('aria-valuenow', val); minus.disabled = val <= o.min; plus.disabled = val >= o.max;
    }
    function set(v) { v = clamp(o.min + Math.round((v - o.min) / step) * step, o.min, o.max); v = +v.toFixed(6); if (v === val) return; val = v; show(); if (o.onchange) o.onchange(val); }
    minus.addEventListener('click', function (e) { e.stopPropagation(); set(val - step); });
    plus.addEventListener('click', function (e) { e.stopPropagation(); set(val + step); });
    var pid = null;
    function at(e) { var r = st.getBoundingClientRect(); set(o.min + clamp((e.clientX - r.left) / (r.width || 1), 0, 1) * (o.max - o.min)); }
    st.addEventListener('pointerdown', function (e) {
      if (penOn() || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault(); pid = e.pointerId; try { st.setPointerCapture(pid); } catch (er) {}
      host.classList.add('drag'); at(e);
    });
    st.addEventListener('pointermove', function (e) { if (e.pointerId === pid) at(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { st.addEventListener(n, function (e) { if (e.pointerId === pid) { pid = null; host.classList.remove('drag'); } }); });
    host.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') { e.preventDefault(); set(val + step); } else if (e.key === 'ArrowDown') { e.preventDefault(); set(val - step); }
    });
    show();
    return { get: function () { return val; }, set: function (v, quiet) { val = v; show(); if (!quiet && o.onchange) o.onchange(val); } };
  }

  var C = {};

  /* ============ 1 · pizza: cut into n equal slices, tap slices to choose them ============ */
  C['f-pizza'] = (function () {
    var svg = $('#f1-pz'), R = 300, n = 8, sel = [], cutTok = 0;
    var defs = S('defs', {}, svg), art = S('g', { id: 'pz-art' }, defs);
    var seed = 5; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    /* the board under the pizza */
    S('circle', { r: 352, fill: '#C98B4E', stroke: '#3B2A20', 'stroke-width': 5 }, svg);
    [340, 316, 290, 262].forEach(function (r, i) { S('circle', { r: r, fill: 'none', stroke: i ? '#B97A40' : '#E0A867', 'stroke-width': i ? 2 : 5, opacity: i ? 0.55 : 0.8 }, svg); });
    S('circle', { cx: 6, cy: 10, r: 306, fill: 'rgba(59,42,32,.25)' }, svg);
    /* the pizza art (drawn once, every slice shows its own part of it through a clip) */
    S('circle', { r: R, fill: '#E3A453', stroke: '#9A5A22', 'stroke-width': 5 }, art);
    S('circle', { r: R - 13, fill: 'none', stroke: '#F3C27C', 'stroke-width': 7, opacity: 0.75 }, art);
    S('circle', { r: 262, fill: '#D9412E' }, art);
    var d = '';
    for (var k = 0; k <= 72; k++) { var th = k / 72 * 2 * Math.PI, r = 246 + 7 * Math.sin(5 * th) + 5 * Math.sin(11 * th + 1); d += (k ? 'L' : 'M') + (r * Math.cos(th)).toFixed(1) + ' ' + (r * Math.sin(th)).toFixed(1); }
    S('path', { d: d + 'Z', fill: '#FFD15C' }, art);
    for (k = 0; k < 22; k++) { var a = rnd() * 6.283, rr = 30 + rnd() * 200; S('ellipse', { cx: (rr * Math.cos(a)).toFixed(1), cy: (rr * Math.sin(a)).toFixed(1), rx: 12 + rnd() * 16, ry: 6 + rnd() * 8, fill: '#FFE597', opacity: 0.85, transform: 'rotate(' + (rnd() * 180).toFixed(0) + ' ' + (rr * Math.cos(a)).toFixed(1) + ' ' + (rr * Math.sin(a)).toFixed(1) + ')' }, art); }
    [[0, -150], [130, -78], [148, 70], [40, 168], [-110, 120], [-160, -30], [-70, -110], [60, 20], [-40, 50]].forEach(function (p) {
      S('circle', { cx: p[0], cy: p[1], r: 32, fill: '#C2362A', stroke: '#8E2218', 'stroke-width': 3 }, art);
      for (var j = 0; j < 3; j++) S('circle', { cx: p[0] + (rnd() - 0.5) * 30, cy: p[1] + (rnd() - 0.5) * 30, r: 3.5, fill: '#8E2218' }, art);
    });
    [[95, -170, 30], [200, -10, -40], [-30, 205, 70], [-190, 60, 10], [-150, -140, -60], [20, -60, 45]].forEach(function (p) {
      var g = S('g', { transform: 'translate(' + p[0] + ' ' + p[1] + ') rotate(' + p[2] + ')' }, art);
      S('path', { d: 'M-24 0 Q0 -16 24 0 Q0 16 -24 0Z', fill: '#3E9B57', stroke: '#2B6E3D', 'stroke-width': 2 }, g);
      S('path', { d: 'M-18 0 L18 0', stroke: '#2B6E3D', 'stroke-width': 2 }, g);
    });
    var clips = S('g', {}, defs), slices = S('g', {}, svg), cuts = S('g', {}, svg);
    function ang(i) { return (-90 + 360 * i / n) * Math.PI / 180; }
    function sector(i, r) {
      if (n === 1) return 'M' + r + ' 0A' + r + ' ' + r + ' 0 1 1 ' + (-r) + ' 0A' + r + ' ' + r + ' 0 1 1 ' + r + ' 0Z';
      var a0 = ang(i), a1 = ang(i + 1);
      return 'M0 0L' + (r * Math.cos(a0)).toFixed(2) + ' ' + (r * Math.sin(a0)).toFixed(2) + 'A' + r + ' ' + r + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 1 ' + (r * Math.cos(a1)).toFixed(2) + ' ' + (r * Math.sin(a1)).toFixed(2) + 'Z';
    }
    var aEl = $('#f1-a'), bEl = $('#f1-b'), nEl = $('#f1-n'), rd = $('#f1-rd'), ca = $('#f1-ca'), cb = $('#f1-cb'), fb = $('#f1-fb');
    function count() { return sel.filter(Boolean).length; }
    function readout() {
      var a = count();
      aEl.textContent = a; bEl.textContent = n; nEl.textContent = n; ca.textContent = a; cb.textContent = n;
      rd.textContent = 'เศษ' + TH[a] + 'ส่วน' + TH[n] + (a === n ? ' (ทั้งถาด)' : '');
    }
    function build(animate) {
      clips.textContent = ''; slices.textContent = ''; cuts.textContent = '';
      for (var i = 0; i < n; i++) {
        var cp = S('clipPath', { id: 'pz-c' + i }, clips); S('path', { d: sector(i, R + 6) }, cp);
        var g = S('g', { 'class': 'slc' }, slices);
        S('use', { href: '#pz-art', 'clip-path': 'url(#pz-c' + i + ')' }, g);
        S('path', { 'class': 'ol', d: sector(i, R + 2), fill: 'none', stroke: '#D9412E', 'stroke-width': 9, 'stroke-linejoin': 'round', opacity: 0 }, g);
        g._i = i;
      }
      if (n > 1) for (i = 0; i < n; i++) {
        var c = S('path', { 'class': 'cut' + (animate && !still() ? ' go' : ''), d: 'M0 0L' + (R * Math.cos(ang(i))).toFixed(2) + ' ' + (R * Math.sin(ang(i))).toFixed(2), pathLength: 1 }, cuts);
        c.style.animationDelay = (i * 40) + 'ms';
      }
      paint(); readout();
    }
    function paint() {
      [].forEach.call(slices.children, function (g) {
        var on = !!sel[g._i], m = n === 1 ? -Math.PI / 2 : (ang(g._i) + ang(g._i + 1)) / 2, lift = on ? (n === 1 ? 0 : 20) : 0;
        g.classList.toggle('on', on);
        g.style.transform = 'translate(' + (lift * Math.cos(m)).toFixed(1) + 'px,' + (lift * Math.sin(m)).toFixed(1) + 'px)';
        g.lastChild.setAttribute('opacity', on ? 1 : 0);
      });
      /* chosen slices on top, so their red outline is never hidden */
      [].slice.call(slices.children).filter(function (g) { return g.classList.contains('on'); }).forEach(function (g) { slices.appendChild(g); });
      readout();
    }
    function setN(v, keep) {
      var m = Math.min(keep == null ? count() : keep, v);
      n = v; sel = []; for (var i = 0; i < n; i++) sel[i] = i < m;
      build(true);
    }
    var sld = Slider($('#f1-sld'), { min: 1, max: 12, val: n, onchange: function (v) { setN(v); msg(''); say('แบ่งเป็น ' + v + ' ชิ้น'); } });
    /* tap anywhere on the pizza: the slice under the finger is chosen or put back */
    var down = null;
    svg.addEventListener('pointerdown', function (e) { if (penOn() || (e.pointerType === 'mouse' && e.button !== 0)) return; e.preventDefault(); down = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
    svg.addEventListener('pointerup', function (e) {
      if (!down || down.id !== e.pointerId) return;
      var d0 = down; down = null;
      if (Math.hypot(e.clientX - d0.x, e.clientY - d0.y) > 14) return;
      var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 740 - 370, y = (e.clientY - r.top) / r.height * 740 - 370;
      if (Math.hypot(x, y) > 340) return;
      var deg = (Math.atan2(y, x) * 180 / Math.PI + 90 + 720) % 360, i = Math.min(n - 1, Math.floor(deg / (360 / n)));
      sel[i] = !sel[i]; paint(); msg('');
      say((sel[i] ? 'เลือก' : 'ไม่เลือก') + ' ได้ ' + count() + ' ส่วน ' + n);
    });
    svg.addEventListener('pointercancel', function () { down = null; });
    function msg(kind, t) { fb.className = 'fb' + (kind ? ' ' + kind : ''); fb.textContent = (kind === 'ok' ? '✓ ' : '') + (t || ''); }
    function on(id, f) { $(id).addEventListener('click', function (e) { e.stopPropagation(); f(); }); }
    on('#f1-chk', function () {
      var a = count();
      if (a * 4 === 3 * n) msg('ok', n === 4 ? 'ถูกต้อง! ได้ 3/4' : 'ถูกต้อง! ' + a + '/' + n + ' เท่ากับ 3/4');
      else if (n % 4) { msg('no', 'แบ่ง ' + n + ' ชิ้น แบ่งเป็น 4 ส่วนเท่า ๆ กันไม่ได้'); shake($('#f1-task')); }
      else { msg('no', 'ตอนนี้ได้ ' + a + '/' + n + ' ยังไม่เท่ากับ 3/4'); shake($('#f1-task')); }
    });
    on('#f1-ans', function () { sld.set(4, true); setN(4, 3); msg('ok', 'เฉลย: แบ่ง 4 ชิ้น เลือก 3 ชิ้น'); });
    on('#f1-rst', function () { sld.set(8, true); setN(8, 3); msg(''); });
    setN(8, 3);
    return { set: function () {}, leave: function () { down = null; } };
  })();

  /* ============ 2 · two chocolate bars side by side: tap pieces to choose, − / + to cut ============ */
  C['f-choc'] = (function () {
    var sl = $('#f-choc'), sg = $('#f2-sg'), sayEl = $('#f2-say');
    var bars = [{ a: 2, d: 5, svg: $('#f2-sa'), stp: $('#f2-pa'), fr: $('#f2-fa') }, { a: 3, d: 5, svg: $('#f2-sb'), stp: $('#f2-pb'), fr: $('#f2-fb') }];
    var TOP = 14, BOT = 506, GAP = 8;
    function ph(X) { return (BOT - TOP - (X.d - 1) * GAP) / X.d; }
    function draw(X, fresh) {
      var s = X.svg; s.textContent = '';
      S('rect', { x: 0, y: 0, width: 220, height: 520, rx: 18, fill: '#43200F', stroke: '#3B2A20', 'stroke-width': 4 }, s);
      var h = ph(X);
      for (var i = 0; i < X.d; i++) {
        var y = BOT - (i + 1) * h - i * GAP, on = i < X.a, g = S('g', { 'class': fresh ? 'pc' : '' }, s);
        if (fresh) g.style.animationDelay = (i * 35) + 'ms';
        S('rect', { x: 14, y: y.toFixed(1), width: 192, height: h.toFixed(1), rx: 9, fill: on ? '#5A2E1A' : '#C99A6E' }, g);
        S('rect', { x: 24, y: (y + 7).toFixed(1), width: 172, height: Math.max(4, h - 16).toFixed(1), rx: 6, fill: 'none', stroke: on ? '#7C4529' : '#E2BD92', 'stroke-width': 4 }, g);
        if (on && h > 30) S('path', { d: 'M34 ' + (y + h - 12).toFixed(1) + ' L' + (34 + Math.min(60, h)).toFixed(1) + ' ' + (y + 12).toFixed(1), stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.22 }, g);
      }
      X.fr.firstElementChild.textContent = X.a; X.fr.lastElementChild.textContent = X.d;
      X.stp.querySelector('b').textContent = X.d;
      X.stp.querySelector('[data-d="-1"]').disabled = X.d <= 1; X.stp.querySelector('[data-d="1"]').disabled = X.d >= 12;
    }
    function compare(anim) {
      var A = bars[0], B = bars[1], c = cmp(A.a, A.d, B.a, B.d);
      if (sg.textContent !== c && anim) pop(sg);
      sg.textContent = c;
      sayEl.textContent = c === '>' ? 'แท่งซ้ายได้มากกว่า' : c === '<' ? 'แท่งขวาได้มากกว่า' : 'ได้เท่ากันพอดี';
      sg.setAttribute('aria-label', A.a + ' ส่วน ' + A.d + (c === '>' ? ' มากกว่า ' : c === '<' ? ' น้อยกว่า ' : ' เท่ากับ ') + B.a + ' ส่วน ' + B.d);
    }
    function setBar(X, a, d, fresh) { var nd = d !== X.d; X.a = a; X.d = d; draw(X, fresh || nd); }
    function setBoth(a1, d1, a2, d2) { setBar(bars[0], a1, d1, !still()); setBar(bars[1], a2, d2, !still()); compare(true); }
    bars.forEach(function (X) {
      var down = null;
      X.svg.addEventListener('pointerdown', function (e) { if (penOn() || (e.pointerType === 'mouse' && e.button !== 0)) return; e.preventDefault(); down = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
      X.svg.addEventListener('pointerup', function (e) {
        if (!down || down.id !== e.pointerId) return; var d0 = down; down = null;
        if (Math.hypot(e.clientX - d0.x, e.clientY - d0.y) > 14) return;
        var r = X.svg.getBoundingClientRect(), y = (e.clientY - r.top) / r.height * 520;
        var i = clamp(Math.floor((BOT - y) / (ph(X) + GAP)), 0, X.d - 1);
        X.a = X.a === i + 1 ? i : i + 1; draw(X, false); compare(true);
        say(X.a + ' ส่วน ' + X.d);
      });
      X.svg.addEventListener('pointercancel', function () { down = null; });
      X.stp.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return; e.stopPropagation();
        var d = clamp(X.d + +b.dataset.d, 1, 12); if (d === X.d) return;
        setBar(X, Math.min(X.a, d), d, true); compare(true); say('แบ่ง ' + d + ' ชิ้น');
      });
    });
    /* predict first (tap a sign), then check it on the bars */
    var ch = $('#f2-ch'), why = $('#f2-why');
    ch.addEventListener('click', function () { setTimeout(function () { why.classList.toggle('vis', !!ch.querySelector('.c.ok.picked')); }, 0); });
    $('#f2-try').addEventListener('click', function (e) { e.stopPropagation(); setBoth(3, 4, 5, 8); });
    draw(bars[0]); draw(bars[1]); compare(false);
    return {
      set: function (st, prev) {
        if (st === 1) setBoth(2, 5, 3, 5);
        else if (st === 2) setBoth(1, 3, 1, 4);
        else if (prev > 0) setBoth(2, 5, 3, 5);
      },
      leave: function () {}
    };
  })();

  /* ============ 3 · cake: 1/2 -> 2/4 -> 4/8 by cutting every piece in two; the strawberry part keeps its length ============ */
  C['f-cake'] = (function () {
    var svg = $('#f3-cake'), A = Anim(), q = Seq();
    var X0 = 20, L = 980, G = 8, ROWY = [6, 196, 386], LX = 1090;
    var ghost = S('g', { opacity: 0.5 }, svg);
    [1, 2].forEach(function (i) { var y = ROWY[i]; S('rect', { x: X0 - 14, y: y + 150, width: L + 28, height: 12, rx: 6, fill: '#E9D3B4' }, ghost); S('rect', { x: X0, y: y + 22, width: L, height: 128, rx: 12, fill: 'none', stroke: '#C9A57E', 'stroke-width': 3, 'stroke-dasharray': '10 12' }, ghost); });
    var rowsG = S('g', {}, svg), top = S('g', {}, svg);
    var dash = S('path', { 'class': 'dash', d: 'M' + (X0 + L / 2) + ' -12V' + (ROWY[2] + 172) }, top);
    var knife = S('g', { opacity: 0 }, top);
    S('path', { d: 'M-12 -150 L12 -150 L12 -20 Q0 6 -12 -20 Z', fill: '#DDE3EA', stroke: '#3B2A20', 'stroke-width': 4, 'stroke-linejoin': 'round' }, knife);
    S('rect', { x: -15, y: -236, width: 30, height: 88, rx: 10, fill: '#8A5A33', stroke: '#3B2A20', 'stroke-width': 4 }, knife);
    var labs = [], muls = [];
    ROWY.forEach(function (y, i) {
      var g = S('g', {}, svg);
      var nn = S('text', { 'class': 'fl n', x: LX, y: y + 62, 'text-anchor': 'middle' }, g); S('rect', { x: LX - 46, y: y + 80, width: 92, height: 7, rx: 3, fill: '#3B2A20' }, g);
      var dd = S('text', { 'class': 'fl', x: LX, y: y + 150, 'text-anchor': 'middle' }, g);
      labs.push({ g: g, n: nn, d: dd });
      if (i) { var m = S('g', { opacity: 0 }, svg); S('path', { d: 'M' + (LX + 66) + ' ' + (ROWY[i - 1] + 90) + ' q36 95 0 190', fill: 'none', stroke: '#E84D86', 'stroke-width': 5, 'stroke-linecap': 'round' }, m);
        S('path', { d: 'M' + (LX + 54) + ' ' + (ROWY[i] + 72) + ' l12 8 l4 -14', fill: 'none', stroke: '#E84D86', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, m);
        S('text', { 'class': 'mul', x: LX + 74, y: ROWY[i - 1] + 196 }, m).textContent = '×2'; muls.push(m); }
    });
    /* one row of cake: n pieces, the first a are strawberry; newCut(j) = the cut after piece j is being made (gap t·G) */
    function row(y, n, a, t, newCut, dy) {
      var g = S('g', { transform: 'translate(0 ' + (dy || 0) + ')' }, rowsG), gaps = 0, j;
      for (j = 0; j < n - 1; j++) gaps += newCut && newCut(j) ? G * t : G;
      var w = (L - gaps) / n, x = X0;
      S('rect', { x: X0 - 14, y: y + 150, width: L + 28, height: 12, rx: 6, fill: '#E9D3B4', stroke: '#3B2A20', 'stroke-width': 3 }, g);
      for (j = 0; j < n; j++) {
        var on = j < a, p = S('g', {}, g);
        S('rect', { x: x.toFixed(1), y: y + 34, width: w.toFixed(1), height: 116, rx: 8, fill: '#F2C98A', stroke: '#3B2A20', 'stroke-width': 3 }, p);
        S('rect', { x: (x + 2).toFixed(1), y: y + 76, width: (w - 4).toFixed(1), height: 11, fill: '#FFF6E6' }, p);
        S('rect', { x: (x + 2).toFixed(1), y: y + 112, width: (w - 4).toFixed(1), height: 11, fill: on ? '#F59BB8' : '#FFF6E6' }, p);
        S('path', { d: 'M' + x.toFixed(1) + ' ' + (y + 52) + 'v-18q0-12 12-12h' + (w - 24).toFixed(1) + 'q12 0 12 12v18' + (on ? 'q-' + (w / 8).toFixed(1) + ' 14 -' + (w / 4).toFixed(1) + ' 0q-' + (w / 8).toFixed(1) + ' 16 -' + (w / 4).toFixed(1) + ' 0q-' + (w / 8).toFixed(1) + ' 12 -' + (w / 4).toFixed(1) + ' 0q-' + (w / 8).toFixed(1) + ' 16 -' + (w / 4).toFixed(1) + ' 0z' : 'z'),
          fill: on ? '#E84D86' : '#FFF3DC', stroke: '#3B2A20', 'stroke-width': 3, 'stroke-linejoin': 'round' }, p);
        if (on && w > 40) { var cx = x + w / 2; S('path', { d: 'M' + cx + ' ' + (y + 30) + 'c-14 -2 -18 -18 -8 -24c4 -2 6 0 8 2c2 -2 4 -4 8 -2c10 6 6 22 -8 24z', fill: '#D9283F', stroke: '#3B2A20', 'stroke-width': 2.5 }, p); S('path', { d: 'M' + (cx - 5) + ' ' + (y + 6) + 'l5 -6l5 6', fill: 'none', stroke: '#3E9B57', 'stroke-width': 3, 'stroke-linecap': 'round' }, p); }
        x += w + (j < n - 1 ? (newCut && newCut(j) ? G * t : G) : 0);
      }
      return g;
    }
    function label(i, n, d, vis) { labs[i].n.textContent = n; labs[i].d.textContent = d; labs[i].g.setAttribute('opacity', vis ? 1 : 0); }
    var kv = $('#f3-kv'), k3 = 4;
    function pose(st) {
      A.stop(); q.clear(); rowsG.textContent = ''; knife.setAttribute('opacity', 0);
      row(ROWY[0], 2, 1); label(0, 1, 2, true);
      if (st >= 1) row(ROWY[1], 4, 2); label(1, 2, 4, st >= 1);
      var k = st >= 3 ? k3 : 4;
      if (st >= 2) row(ROWY[2], 2 * k, k); label(2, st >= 3 ? k : 4, st >= 3 ? 2 * k : 8, st >= 2);
      muls[0].setAttribute('opacity', st >= 1 ? 1 : 0); muls[1].setAttribute('opacity', st === 2 ? 1 : 0);
      dash.style.opacity = st >= 1 ? 1 : 0;
    }
    /* row i appears as a copy sliding down from the row above, then the knife cuts every piece in two */
    function cutRow(i, st) {
      pose(st - 1); var n = i === 1 ? 2 : 4, a = n / 2, fromY = ROWY[i - 1] - ROWY[i];
      var r = row(ROWY[i], n, a, 1, null, fromY);
      A.run(550, function (p) { r.setAttribute('transform', 'translate(0 ' + (fromY * (1 - eio(p))).toFixed(1) + ')'); }, function () {
        /* the knife passes through the middle of each piece, one after another */
        var w = (L - (n - 1) * G) / n, xs = []; for (var j = 0; j < n; j++) xs.push(X0 + j * (w + G) + w / 2);
        var cutsDone = 0, lines = S('g', {}, rowsG);
        knife.setAttribute('opacity', 1);
        A.run(n * 380, function (p) {
          var u = p * n, j = Math.min(n - 1, Math.floor(u)), f = u - j, ky = ROWY[i] - 30 + 200 * Math.sin(Math.PI * f) * 0.9;
          knife.setAttribute('transform', 'translate(' + xs[j].toFixed(1) + ' ' + ky.toFixed(1) + ')');
          while (cutsDone < j || (p === 1 && cutsDone < n)) { S('path', { d: 'M' + xs[cutsDone].toFixed(1) + ' ' + (ROWY[i] + 24) + 'V' + (ROWY[i] + 150), stroke: '#3B2A20', 'stroke-width': 3 }, lines); cutsDone++; }
        }, function () {
          knife.setAttribute('opacity', 0); lines.remove();
          A.run(450, function (p) { rowsG.removeChild(rowsG.lastChild); row(ROWY[i], 2 * n, n, eio(p), function (j) { return j % 2 === 0; }); }, function () {
            label(i, 2 * a, 2 * n, true); muls[i - 1].setAttribute('opacity', 1); if (i === 2) muls[0].setAttribute('opacity', 1);
            dash.style.opacity = 1; say(i === 1 ? 'หนึ่งส่วนสอง เท่ากับ สองส่วนสี่' : 'สองส่วนสี่ เท่ากับ สี่ส่วนแปด');
          });
        });
      });
      dash.style.opacity = i === 1 ? 0 : 1;
    }
    var sld = Slider($('#f3-sld'), { min: 1, max: 6, val: k3, onchange: function (k) {
      k3 = k; kv.textContent = k;
      if (!$('#f-cake').classList.contains('b3')) return;
      rowsG.removeChild(rowsG.lastChild); var r = row(ROWY[2], 2 * k, k); label(2, k, 2 * k, true);
      r.style.transformOrigin = '510px ' + (ROWY[2] + 90) + 'px'; if (r.animate && !still()) r.animate([{ opacity: 0.4, transform: 'scaleY(.96)' }, { opacity: 1, transform: 'none' }], { duration: 300 });
      say(k + ' ส่วน ' + (2 * k) + ' เท่ากับ หนึ่งส่วนสอง');
    } });
    kv.textContent = k3;
    return {
      set: function (st, prev) {
        if (st === 3) { if (prev !== 3) { k3 = 4; sld.set(4, true); kv.textContent = 4; } pose(3); muls[1].setAttribute('opacity', 0); return; }
        if (still() || prev < 0 || st !== prev + 1 || st === 0) { pose(st); return; }
        cutRow(st, st);
      },
      leave: function () { A.stop(); q.clear(); }
    };
  })();

  /* ============ wiring ============ */
  var cur = null, curSt = 0;
  function sync(slide, st) {
    if (!slide) return;
    var id = slide.id, c = C[id];
    if (cur !== id) {
      if (cur && C[cur] && C[cur].leave) C[cur].leave();
      cur = id; curSt = st;
      if (c) c.set(st, -1);
      return;
    }
    var p = curSt; curSt = st;
    if (c && p !== st) c.set(st, p);
  }
  document.addEventListener('deck:change', function (e) { sync(e.detail.slide, e.detail.st); });
  if (window.__deck) { var s0 = window.__deck.state(); sync(document.getElementById(s0.id), s0.st); }
  window.__app = { C: C };
})();
