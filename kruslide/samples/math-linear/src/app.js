/* app.js · KruSlide sample math-linear ("graphing calculator"): y = mx + c on an LCD.
   m moves in steps of 0.5 (−3 … 3) and c in steps of 1 (−5 … 5), so every number on the screen is exact:
   table values are multiples of 0.5, and the x-intercept −c/m is shown as a reduced fraction when it is not a whole
   number or a short decimal. Every slide has a controller C[id] = { set(st, prev), leave() } (the calculus pattern);
   prev = -1 when the slide was just entered or jumped to. ?still / reduced motion (html.rm): no tweens, final states.
   Faders, keys and the line itself take mouse, pen and touch; nothing here changes the slide. */
(function () {
  'use strict';
  var root = document.documentElement, stage = document.getElementById('stage'), NS = 'http://www.w3.org/2000/svg';
  if (!stage) return;
  function still() { return root.classList.contains('rm'); }
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  function S(tag, at, p) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (p) p.appendChild(e); return e; }
  function T(at, text, p) { var e = S('text', at, p); e.textContent = text; return e; }
  function el(tag, cls, txt, p) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (p) p.appendChild(e); return e; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function penOn() { return root.classList.contains('pen-on'); }
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

  /* ---------- exact numbers ---------- */
  var MINUS = '−';
  function fmt(v) { var r = Math.round(v * 1000) / 1000; if (r === 0) r = 0; return (r < 0 ? MINUS : '') + String(Math.abs(r)); }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  /* n/d reduced: whole number, exact short decimal (only 2s and 5s below), or a fraction */
  function frac(n, d) {
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d); n /= g; d /= g;
    if (d === 1) return fmt(n);
    var e = d; while (e % 2 === 0) e /= 2; while (e % 5 === 0) e /= 5;
    if (e === 1) return fmt(n / d);
    return (n < 0 ? MINUS : '') + Math.abs(n) + '/' + d;
  }
  function eq(m, c) {
    var a = m === 0 ? '' : m === 1 ? 'x' : m === -1 ? MINUS + 'x' : fmt(m) + 'x';
    var b = !a ? fmt(c) : c > 0 ? ' + ' + c : c < 0 ? ' ' + MINUS + ' ' + Math.abs(c) : '';
    return 'y = ' + (a + b || '0');
  }
  /* the x-intercept: m = p/2, so −c/m = −2c/p */
  function xint(m, c) { if (m === 0) return null; return frac(-2 * c, Math.round(2 * m)); }

  /* slider = fader: drag anywhere on the band (mouse or touch), tap a number; Arrow Up/Down when focused */
  function Slider(host, o) {
    var step = o.step || 1, val = o.val;
    host.textContent = ''; host.tabIndex = 0; host.setAttribute('role', 'slider');
    host.setAttribute('aria-valuemin', o.min); host.setAttribute('aria-valuemax', o.max);
    var st = el('div', 'st', null, host), trk = el('div', 'trk', null, st), knob = el('i', 'knob', null, st), tks = [];
    el('i', 'fill', null, trk);
    function pct(v) { return (v - o.min) / (o.max - o.min) * 100; }
    for (var v = o.min; v <= o.max + 1e-9; v += step) {
      var lab = Math.abs(v / (o.label || step) - Math.round(v / (o.label || step))) < 1e-9;
      var t = el('span', 'tk', lab ? fmt(v) : '', st); t.style.left = pct(v) + '%'; if (!lab) { t.style.width = '3px'; t.style.height = '10px'; t.style.background = '#9EA3AB'; t.style.top = '70px'; } tks.push([v, t]);
    }
    function show() { knob.style.left = pct(val) + '%'; tks.forEach(function (t) { t[1].classList.toggle('on', Math.abs(t[0] - val) < 1e-9); }); host.setAttribute('aria-valuenow', val); }
    function set(v) { v = clamp(o.min + Math.round((v - o.min) / step) * step, o.min, o.max); v = +v.toFixed(6); if (v === val) return; val = v; show(); if (o.onchange) o.onchange(val); }
    var pid = null;
    function at(e) { var r = st.getBoundingClientRect(); set(o.min + clamp((e.clientX - r.left) / (r.width || 1), 0, 1) * (o.max - o.min)); }
    st.addEventListener('pointerdown', function (e) { if (penOn() || (e.pointerType === 'mouse' && e.button !== 0)) return; e.preventDefault(); pid = e.pointerId; try { st.setPointerCapture(pid); } catch (er) {} host.classList.add('drag'); at(e); });
    st.addEventListener('pointermove', function (e) { if (e.pointerId === pid) at(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { st.addEventListener(n, function (e) { if (e.pointerId === pid) { pid = null; host.classList.remove('drag'); } }); });
    host.addEventListener('keydown', function (e) { if (e.key === 'ArrowUp') { e.preventDefault(); set(val + step); } else if (e.key === 'ArrowDown') { e.preventDefault(); set(val - step); } });
    show();
    return { get: function () { return val; }, set: function (v) { val = v; show(); }, step: function (d) { set(val + d * step); } };
  }

  /* ---------- an LCD graph: lattice dots, axes, ticks; sx/sy map maths to stage px ---------- */
  var gid = 0;
  function Graph(svg, o) {
    var G = { o: o }, X0 = o.xr[0], X1 = o.xr[1], Y0 = o.yr[0], Y1 = o.yr[1];
    G.sx = function (x) { return o.ox + x * o.u; }; G.sy = function (y) { return o.oy - y * o.u; };
    G.mx = function (px) { return (px - o.ox) / o.u; }; G.my = function (py) { return (o.oy - py) / o.u; };
    var id = 'lcdclip' + (++gid), defs = S('defs', {}, svg), cp = S('clipPath', { id: id }, defs);
    S('rect', { x: G.sx(X0), y: G.sy(Y1), width: (X1 - X0) * o.u, height: (Y1 - Y0) * o.u }, cp);
    S('rect', { x: o.vb[0], y: o.vb[1], width: o.vb[2], height: o.vb[3], fill: 'transparent' }, svg);   /* the whole screen catches the pointer */
    var g = S('g', { 'aria-hidden': 'true' }, svg);
    for (var x = Math.ceil(X0); x <= X1; x++) for (var y = Math.ceil(Y0); y <= Y1; y++) S('rect', { 'class': 'gd', x: G.sx(x) - 2, y: G.sy(y) - 2, width: 4, height: 4 }, g);
    S('path', { 'class': 'ax', d: 'M' + G.sx(X0) + ' ' + G.sy(0) + 'H' + G.sx(X1) + 'M' + G.sx(0) + ' ' + G.sy(Y0) + 'V' + G.sy(Y1) }, g);
    S('path', { d: 'M' + (G.sx(X1) + 16) + ' ' + G.sy(0) + 'l-16 -9v18z M' + G.sx(0) + ' ' + (G.sy(Y1) - 16) + 'l-9 16h18z', fill: '#22301F' }, g);
    T({ x: G.sx(X1) + 10, y: G.sy(0) + 38, style: 'font:800 28px Inter' }, 'x', g);
    T({ x: G.sx(0) + 16, y: G.sy(Y1) - 2, style: 'font:800 28px Inter' }, 'y', g);
    G.ticks = [];
    for (x = Math.ceil(X0 / 2) * 2; x <= X1; x += 2) if (x) { S('path', { 'class': 'ax', d: 'M' + G.sx(x) + ' ' + (G.sy(0) - 7) + 'v14' }, g); G.ticks.push(T({ 'class': 'tk', x: G.sx(x), y: G.sy(0) + 30, 'text-anchor': 'middle' }, fmt(x), g)); }
    for (y = Math.ceil(Y0 / 2) * 2; y <= Y1; y += 2) if (y) { S('path', { 'class': 'ax', d: 'M' + (G.sx(0) - 7) + ' ' + G.sy(y) + 'h14' }, g); G.ticks.push(T({ 'class': 'tk', x: G.sx(0) - 14, y: G.sy(y) + 8, 'text-anchor': 'end' }, fmt(y), g)); }
    /* a tick number that would sit under a label (intercept or slope step) steps aside */
    G.declutter = function () {
      var labs = [].slice.call(svg.querySelectorAll('.ipl,.stl')).map(function (t) { try { return t.getBBox(); } catch (e) { return null; } }).filter(Boolean);
      G.ticks.forEach(function (t) {
        var b; try { b = t.getBBox(); } catch (e) { return; }
        var hit = labs.some(function (a) { return a.x < b.x + b.width + 4 && b.x < a.x + a.width + 4 && a.y < b.y + b.height + 2 && b.y < a.y + a.height + 2; });
        t.style.opacity = hit ? 0 : '';
      });
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { G.declutter(); });
    G.under = S('g', { 'clip-path': 'url(#' + id + ')' }, svg);
    G.main = S('g', { 'clip-path': 'url(#' + id + ')' }, svg);
    G.top = S('g', {}, svg);
    G.d = function (m, c) { return 'M' + G.sx(X0 - 1) + ' ' + G.sy(m * (X0 - 1) + c).toFixed(1) + 'L' + G.sx(X1 + 1) + ' ' + G.sy(m * (X1 + 1) + c).toFixed(1); };
    G.inX = function (x) { return x >= X0 && x <= X1; }; G.inY = function (y) { return y >= Y0 && y <= Y1; };
    return G;
  }
  /* an intercept marker: hollow LCD square with its coordinates */
  function mark(g, G, x, y, txt, dx, anchor) {
    S('rect', { 'class': 'ip', x: G.sx(x) - 11, y: G.sy(y) - 11, width: 22, height: 22 }, g);
    T({ 'class': 'ipl', x: G.sx(x) + dx, y: G.sy(y) + (x === 0 ? 9 : 46), 'text-anchor': anchor }, txt, g);
  }
  function keys(scope, f) { $$('.key[data-k]', scope).forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); f(b.dataset.k); }); }); }

  var C = {};

  /* ============ 1 · explore: faders, live line, table of values, intercepts ============ */
  C['l-exp'] = (function () {
    var sl = $('#l-exp'), svg = $('#l1-g'), A1 = Anim(), m = 2, c = 1, tri = 0;
    var G = Graph(svg, { ox: 1115, oy: 360, u: 48, xr: [-6, 6], yr: [-5.5, 5.5], vb: [800, 70, 970, 580] });
    S('path', { d: 'M1436 92V628', stroke: '#22301F', 'stroke-width': 3, opacity: 0.6 }, svg);
    var line = S('path', { 'class': 'ln' }, G.main), marks = S('g', {}, G.top), stg = S('g', {}, G.top), tab = S('g', {}, svg);
    var hl = S('rect', { x: 1450, width: 304, height: 54, rx: 8, fill: 'rgba(229,138,58,.32)', opacity: 0 }, tab);
    var eqT = T({ x: 1452, y: 128, style: 'font:800 32px Inter' }, '', tab);
    T({ x: 1500, y: 194, 'text-anchor': 'middle', style: 'font:800 28px Inter' }, 'x', tab); T({ x: 1612, y: 194, 'text-anchor': 'middle', style: 'font:800 28px Inter' }, 'y', tab);
    var dH = T({ x: 1718, y: 194, 'text-anchor': 'middle', style: 'font:800 24px Inter', opacity: 0 }, 'เพิ่ม', tab);
    S('path', { d: 'M1452 210H1756M1556 168V532', stroke: '#22301F', 'stroke-width': 2.5 }, tab);
    var rows = [-2, -1, 0, 1, 2].map(function (x, i) { var y = 252 + i * 62; T({ x: 1500, y: y, 'text-anchor': 'middle', style: 'font:700 30px Inter' }, fmt(x), tab); return T({ x: 1612, y: y, 'text-anchor': 'middle', style: 'font:800 30px Inter' }, '', tab); });
    var diffs = [0, 1, 2, 3].map(function (i) { return T({ x: 1718, y: 252 + i * 62 + 39, 'text-anchor': 'middle', style: 'font:800 26px Inter', opacity: 0 }, '', tab); });
    var ix1 = T({ x: 1452, y: 578, style: 'font:700 24px Inter' }, '', tab), ix2 = T({ x: 1452, y: 614, style: 'font:700 24px Inter' }, '', tab);
    hl.setAttribute('y', 252 + 2 * 62 - 38);
    var fm, fc, vm = $('#l1-fm>span'), vc = $('#l1-fc>span');
    function render() {
      line.setAttribute('d', G.d(m, c));
      eqT.textContent = eq(m, c);
      rows.forEach(function (r, i) { r.textContent = fmt(m * (i - 2) + c); });
      diffs.forEach(function (d) { d.textContent = (m >= 0 ? '+' : '') + fmt(m); });
      vm.textContent = fmt(m); vc.textContent = fmt(c); $('#l1-sm').textContent = fmt(m); $('#l1-sc').textContent = fmt(c);
      marks.textContent = '';
      var xi = xint(m, c);
      mark(marks, G, 0, c, '(0, ' + fmt(c) + ')', m > 0 ? -22 : 22, m > 0 ? 'end' : 'start');
      if (xi !== null && G.inX(-c / m) && c !== 0) mark(marks, G, -c / m, 0, '(' + xi + ', 0)', m > 0 ? 14 : -14, m > 0 ? 'start' : 'end');
      ix1.textContent = 'ตัดแกน y ที่ (0, ' + fmt(c) + ')';
      ix2.textContent = m === 0 ? (c === 0 ? 'เส้นทับแกน x' : 'ขนานแกน x: ไม่ตัดแกน x') : 'ตัดแกน x ที่ (' + xi + ', 0)';
      slope(tri); G.declutter();
    }
    /* the slope triangle from (0, c): 1 to the right, then m up (drawn as it walks) */
    function slope(p) {
      stg.textContent = ''; if (p <= 0) return;
      var a = Math.min(1, p * 2), b = clamp(p * 2 - 1, 0, 1), x0 = G.sx(0), y0 = G.sy(c), x1 = G.sx(a), y1 = G.sy(c + m * b);
      S('path', { 'class': 'st', d: 'M' + x0 + ' ' + y0 + 'H' + x1 + (b > 0 ? 'V' + y1.toFixed(1) : '') }, stg);
      T({ 'class': 'stl', x: (x0 + G.sx(1)) / 2, y: y0 + (m >= 0 ? 34 : -14), 'text-anchor': 'middle' }, '1', stg);
      if (b >= 1 && m !== 0) T({ 'class': 'stl', x: G.sx(1) + 14, y: (y0 + G.sy(c + m)) / 2 + 10 }, (m > 0 ? '+' : '') + fmt(m), stg);
      G.declutter();
    }
    function beats(st, anim) {
      A1.stop();
      [dH].concat(diffs).forEach(function (d, i) { d.setAttribute('opacity', st === 1 ? 1 : 0); if (st === 1 && anim && d.animate) d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 900 + i * 120, fill: 'backwards' }); });
      hl.setAttribute('opacity', st === 2 ? 1 : 0);
      if (st === 2) { var y = G.sy(c); marks.querySelector('rect') && marks.querySelector('rect').animate && anim && marks.querySelector('rect').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 700, iterations: 2 }); }
      if (st === 1) { if (anim) A1.run(1100, function (p) { tri = p; slope(p); }); else { tri = 1; slope(1); } }
      else { tri = 0; slope(0); }
      G.declutter();
    }
    fm = Slider($('#l1-fm .sld'), { min: -3, max: 3, step: 0.5, label: 1, val: m, onchange: function (v) { m = v; render(); } });
    fc = Slider($('#l1-fc .sld'), { min: -5, max: 5, step: 1, val: c, onchange: function (v) { c = v; render(); } });
    keys(sl, function (k) {
      if (k === 'reset') { m = 2; c = 1; fm.set(m); fc.set(c); render(); return; }
      (k[0] === 'm' ? fm : fc).step(k[1] === '+' ? 1 : -1);
    });
    render();
    return { set: function (st, prev) { beats(st, !still() && prev >= 0 && st === prev + 1); }, leave: function () { A1.stop(); } };
  })();

  /* ============ 2 · drag the line: near the y-intercept moves c, anywhere else turns it (m) ============ */
  C['l-drag'] = (function () {
    var sl = $('#l-drag'), svg = $('#l2-g'), A1 = Anim(), m = 2, c = 1;
    var G = Graph(svg, { ox: 690, oy: 510, u: 60, xr: [-9, 9], yr: [-6.5, 6.5], vb: [102, 80, 1716, 860] });
    S('path', { d: 'M1262 110V910', stroke: '#22301F', 'stroke-width': 3, opacity: 0.6 }, svg);
    var ghosts = S('g', {}, G.under), line = S('path', { 'class': 'ln', style: 'stroke-width:8px' }, G.main), hand = S('g', {}, G.top);
    var eqEl = $('#l2-eq'), cEl = $('#l2-c');
    function render(lm, lc) {
      lm = lm == null ? m : lm; lc = lc == null ? c : lc;
      line.setAttribute('d', G.d(lm, lc));
      hand.textContent = '';
      S('rect', { 'class': 'ip', x: G.sx(0) - 15, y: G.sy(lc) - 15, width: 30, height: 30, style: 'stroke-width:5px' }, hand);
      var hx = G.inY(lc + 2 * lm) ? 2 : -2;
      if (G.inY(lc + hx * lm)) S('path', { d: 'M' + G.sx(hx) + ' ' + (G.sy(lc + hx * lm) - 18) + 'l18 18l-18 18l-18 -18z', fill: '#22301F' }, hand);
      eqEl.textContent = eq(m, c); cEl.textContent = fmt(c);
    }
    var pid = null, mode = null;
    function loc(e) { var r = svg.getBoundingClientRect(); return { x: 102 + (e.clientX - r.left) * 1716 / r.width, y: 80 + (e.clientY - r.top) * 860 / r.height }; }
    function move(p) {
      if (mode === 'c') { var nc = clamp(Math.round(G.my(p.y)), -5, 5); if (nc !== c) { c = nc; render(); } return; }
      var x = G.mx(p.x); if (Math.abs(x) < 0.35) return;
      var nm = clamp(Math.round((G.my(p.y) - c) / x * 2) / 2, -3, 3); if (nm === 0) nm = 0;
      if (nm !== m) { m = nm; render(); }
    }
    svg.addEventListener('pointerdown', function (e) {
      if (penOn() || (e.pointerType === 'mouse' && e.button !== 0)) return;
      var p = loc(e); if (p.x > 1250) return;
      e.preventDefault(); A1.stop(); render(); pid = e.pointerId; try { svg.setPointerCapture(pid); } catch (er) {}
      mode = Math.hypot(p.x - G.sx(0), p.y - G.sy(c)) < 80 ? 'c' : 'm'; move(p);
    });
    svg.addEventListener('pointermove', function (e) { if (e.pointerId === pid) move(loc(e)); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { svg.addEventListener(n, function (e) { if (e.pointerId === pid) { pid = null; say(eq(m, c)); } }); });
    /* beat 1: c sweeps −4 … 4 leaving parallel lines; beat 2: m sweeps −3 … 3 leaving lines through (0, c) */
    function family(kind, anim) {
      A1.stop(); ghosts.textContent = '';
      var vals = kind === 'c' ? [-4, -3, -2, -1, 0, 1, 2, 3, 4] : [-3, -2, -1, -0.5, 0, 0.5, 1, 2, 3], left = {};
      function ghost(v) { if (left[v]) return; left[v] = 1; S('path', { 'class': 'gh', d: kind === 'c' ? G.d(m, v) : G.d(v, c) }, ghosts); }
      if (!anim) { vals.forEach(ghost); render(); return; }
      var a = vals[0], b = vals[vals.length - 1], home = kind === 'c' ? c : m;
      A1.run(3200, function (p) {
        var v = p < 0.15 ? home + (a - home) * eio(p / 0.15) : p < 0.85 ? a + (b - a) * (p - 0.15) / 0.7 : b + (home - b) * eio((p - 0.85) / 0.15);
        vals.forEach(function (q) { if (p >= 0.15 && p <= 0.86 && v >= q - 1e-9) ghost(q); });
        render(kind === 'm' ? v : null, kind === 'c' ? v : null);
      }, function () { vals.forEach(ghost); render(); });
    }
    render();
    return {
      set: function (st, prev) {
        var anim = !still() && prev >= 0 && st === prev + 1;
        if (st === 0) { A1.stop(); ghosts.textContent = ''; render(); }
        else family(st === 1 ? 'c' : 'm', anim);
      },
      leave: function () { A1.stop(); render(); }
    };
  })();

  /* ============ 3 · match the line: set m and c to lie on the dashed target, then Check ============ */
  C['l-match'] = (function () {
    var sl = $('#l-match'), svg = $('#l3-g'), A1 = Anim();
    var TG = [{ m: 2, c: -1 }, { m: -1, c: 3 }, { m: 0.5, c: -2 }, { m: -1.5, c: 1 }, { m: 3, c: 0 }, { m: 0, c: -4 }], ti = 0, m = 1, c = 0, solved = false;
    var G = Graph(svg, { ox: 670, oy: 361, u: 50, xr: [-9.5, 9.5], yr: [-5.5, 5.5], vb: [160, 76, 1020, 570] });
    var tgt = S('path', { 'class': 'tg' }, G.under), line = S('path', { 'class': 'ln' }, G.main), how = S('g', {}, G.top);
    var badge = S('g', {}, svg); S('rect', { x: 182, y: 92, width: 330, height: 56, rx: 10, fill: '#C4D0A9', stroke: '#22301F', 'stroke-width': 2.5 }, badge);
    var eqT = T({ x: 198, y: 132, style: 'font:800 32px Inter' }, '', badge);
    var ok = T({ x: 1150, y: 132, 'text-anchor': 'end', style: 'font:800 34px Inter', opacity: 0 }, 'ถูกต้อง!', svg);
    var fb = $('#l3-fb'), no = $('#l3-no'), howEl = $('#l3-how'), vm = $('#l3-fm>span'), vc = $('#l3-fc>span');
    function msg(kind, t) { fb.className = 'fb' + (kind ? ' ' + kind : ''); fb.textContent = (kind === 'ok' ? '✓ ' : '') + (t || ''); }
    function render(lm, lc) {
      line.setAttribute('d', G.d(lm == null ? m : lm, lc == null ? c : lc));
      tgt.setAttribute('d', G.d(TG[ti].m, TG[ti].c));
      eqT.textContent = eq(m, c); vm.textContent = fmt(m); vc.textContent = fmt(c); no.textContent = (ti + 1) + '/' + TG.length;
      ok.setAttribute('opacity', solved ? 1 : 0);
    }
    var fm = Slider($('#l3-fm .sld'), { min: -3, max: 3, step: 0.5, label: 1, val: m, onchange: function (v) { m = v; solved = false; render(); msg(''); } });
    var fc = Slider($('#l3-fc .sld'), { min: -5, max: 5, step: 1, val: c, onchange: function (v) { c = v; solved = false; render(); msg(''); } });
    function check() {
      var t = TG[ti];
      if (m === t.m && c === t.c) { solved = true; render(); msg('ok', 'ถูกต้อง! ' + eq(m, c)); say('ถูกต้อง'); return; }
      var parts = [];
      if (c !== t.c) parts.push('จุดตัดแกน y ยังไม่ตรง: ต้องเลื่อน' + (t.c > c ? 'ขึ้น' : 'ลง'));
      if (m !== t.m) parts.push('ความชันยังไม่ตรง: m ต้อง' + (t.m > m ? 'มากขึ้น' : 'น้อยลง'));
      msg('no', (c === t.c ? 'c ถูกแล้ว · ' : m === t.m ? 'm ถูกแล้ว · ' : '') + parts.join(' · '));
      var card = $('#l3-card'); card.classList.remove('shk'); void card.offsetWidth; card.classList.add('shk');
    }
    /* reading the target: c where it crosses the y-axis, then a step across (2 for a half slope) and up or down */
    function explain(on, anim) {
      how.textContent = ''; howEl.innerHTML = '';
      if (!on) { G.declutter(); return; }
      var t = TG[ti], r = Math.abs(t.m % 1) === 0.5 ? 2 : 1, rise = t.m * r;
      var x0 = G.sx(0), y0 = G.sy(t.c), x1 = G.sx(r), y1 = G.sy(t.c + rise);
      S('rect', { 'class': 'ip', x: x0 - 13, y: y0 - 13, width: 26, height: 26 }, how);
      T({ 'class': 'stl', x: x0 - 22, y: y0 + (t.m >= 0 ? -16 : 40), 'text-anchor': 'end' }, 'c = ' + fmt(t.c), how);   /* the corner the line does not pass through */
      if (t.m !== 0) {
        S('path', { 'class': 'st', d: 'M' + x0 + ' ' + y0 + 'H' + x1 + 'V' + y1 }, how);
        T({ 'class': 'stl', x: (x0 + x1) / 2, y: y0 + (rise > 0 ? 36 : -16), 'text-anchor': 'middle' }, 'ขวา ' + r, how);
        T({ 'class': 'stl', x: x1 + 14, y: (y0 + y1) / 2 + 10 }, (rise > 0 ? 'ขึ้น ' : 'ลง ') + Math.abs(rise), how);
      }
      var s2 = t.m === 0 ? 'เส้นนอน ไม่ขึ้นไม่ลง → <b>m = 0</b>' : 'จากจุดนั้นไปขวา ' + r + ' แล้ว' + (rise > 0 ? 'ขึ้น ' : 'ลง ') + Math.abs(rise) + '<br>→ <b>m = ' + (r === 2 ? fmt(rise) + '/2 = ' : '') + fmt(t.m) + '</b>';
      howEl.innerHTML = '1) เส้นประตัดแกน y ที่ ' + fmt(t.c) + ' → <b>c = ' + fmt(t.c) + '</b><br>2) ' + s2 + '<br>ได้ <b>' + eq(t.m, t.c) + '</b>';
      G.declutter();
      if (anim && how.animate) how.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600 });
    }
    function setTo(tm, tc, anim) {
      var m0 = m, c0 = c; m = tm; c = tc; fm.set(m); fc.set(c);
      A1.run(anim ? 700 : 0, function (p) { var e = eio(p); render(m0 + (m - m0) * e, c0 + (c - c0) * e); }, function () { render(); });
    }
    keys(sl, function (k) {
      if (k === 'check') return check();
      if (k === 'next') { ti = (ti + 1) % TG.length; solved = false; msg(''); explain(sl.classList.contains('b1'), true); render(); say('ข้อใหม่'); return; }
      (k[0] === 'm' ? fm : fc).step(k[1] === '+' ? 1 : -1);
    });
    $('#l3-ans').addEventListener('click', function (e) { e.stopPropagation(); setTo(TG[ti].m, TG[ti].c, !still()); solved = true; msg('ok', 'เฉลย: ' + eq(TG[ti].m, TG[ti].c)); render(); });
    render();
    return { set: function (st, prev) { explain(st === 1, !still() && prev === 0); }, leave: function () { A1.stop(); } };
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
