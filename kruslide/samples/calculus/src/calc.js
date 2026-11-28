/* calc.js · the live maths of the KruSlide calculus sample (vanilla JS, no libraries, no network).
   Every slide with live maths has a controller C[id] = { set(st, prev), leave() }.
   set() runs on every beat change; prev = -1 when the slide was just entered (or jumped to), so going back or
   jumping always lands on a clean, complete state, and only a forward step plays the transition.
   Drags use pointer events (mouse, pen, touch) with pointer capture over the WHOLE plot or track, and never change the slide.
   ?still (html.rm) = no motion: every controller shows its final state (used for screenshots). */
(function () {
  'use strict';
  var root = document.documentElement, NS = 'http://www.w3.org/2000/svg';
  if (!document.getElementById('stage')) return;
  var INK = '#1A1B3D', BLUE = '#2D5BFF', RED = '#FF5A36', SUN = '#FFC229', PINK = '#FF3D8B', GREEN = '#12B76A', VIOLET = '#7B61FF', TEAL = '#10B5C9';
  function still() { return root.classList.contains('rm'); }
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  function S(tag, at, parent) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; }
  function T(at, text, parent) { var e = S('text', at, parent); e.textContent = text; return e; }
  function set(el, at) { for (var k in at) el.setAttribute(k, typeof at[k] === 'number' ? +at[k].toFixed(2) : at[k]); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function num(v, d) { var s = Math.abs(v).toFixed(d); return (v < 0 && +s !== 0 ? '−' : '') + s; }   /* real minus sign */
  function eo(t) { return 1 - Math.pow(1 - t, 3); }
  function eio(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  /* one running tween per owner: run(ms, step(p), done) · stop() */
  function Anim() {
    var tok = 0;
    return {
      run: function (ms, step, done) {
        var my = ++tok, t0 = null;
        if (still() || ms <= 0) { step(1); if (done) done(); return; }
        function f(t) {
          if (my !== tok) return;
          if (t0 === null) t0 = t;
          var p = Math.min(1, (t - t0) / ms); step(p);
          if (p < 1) requestAnimationFrame(f); else if (done) done();
        }
        requestAnimationFrame(f);
      },
      stop: function () { tok++; }
    };
  }

  /* a coordinate plane inside an <svg> (user units = stage px). o: x0 x1 y0 y1 (maths), l t w h (px), gx gy (grid), xt yt (labels) */
  function plot(svg, o) {
    var P = { o: o };
    P.sx = function (x) { return o.l + (x - o.x0) / (o.x1 - o.x0) * o.w; };
    P.sy = function (y) { return o.t + (o.y1 - y) / (o.y1 - o.y0) * o.h; };
    P.ix = function (px) { return o.x0 + (px - o.l) / o.w * (o.x1 - o.x0); };
    var defs = S('defs', {}, svg), cid = o.id + '-cl', cp = S('clipPath', { id: cid }, defs);
    S('rect', { x: o.l, y: o.t, width: o.w, height: o.h }, cp);
    P.defs = defs;
    S('rect', { x: 0, y: 0, width: '100%', height: '100%', fill: 'transparent' }, svg);   /* the whole panel catches the pointer */
    var g = S('g', { 'aria-hidden': 'true' }, svg), i, v;
    if (o.gx) for (i = Math.ceil(o.x0 / o.gx - 1e-9); i <= Math.floor(o.x1 / o.gx + 1e-9); i++) {
      v = i * o.gx; S('line', { 'class': 'gl' + (Math.abs(v - Math.round(v)) < 1e-9 ? ' m' : ''), x1: P.sx(v), x2: P.sx(v), y1: o.t, y2: o.t + o.h }, g);
    }
    if (o.gy) for (i = Math.ceil(o.y0 / o.gy - 1e-9); i <= Math.floor(o.y1 / o.gy + 1e-9); i++) {
      v = i * o.gy; S('line', { 'class': 'gl' + (Math.abs(v / (o.gm || 1) - Math.round(v / (o.gm || 1))) < 1e-9 ? ' m' : ''), y1: P.sy(v), y2: P.sy(v), x1: o.l, x2: o.l + o.w }, g);
    }
    P.under = S('g', { 'clip-path': 'url(#' + cid + ')' }, svg);
    var ax = S('g', { 'aria-hidden': 'true' }, svg), X0 = P.sx(0), Y0 = P.sy(0), xr = o.l + o.w, yt = o.t;
    S('line', { 'class': 'ax', x1: o.l, x2: xr + 4, y1: Y0, y2: Y0 }, ax);
    S('path', { 'class': 'axh', d: 'M' + (xr + 22) + ' ' + Y0 + ' l-20 -10 v20 z' }, ax);
    S('line', { 'class': 'ax', x1: X0, x2: X0, y1: o.t + o.h, y2: yt - 4 }, ax);
    S('path', { 'class': 'axh', d: 'M' + X0 + ' ' + (yt - 22) + ' l-10 20 h20 z' }, ax);
    T({ 'class': 'axl', x: xr + 14, y: Y0 + 40, 'text-anchor': 'middle' }, o.xl || 'x', ax);
    T({ 'class': 'axl', x: X0 + 20, y: yt - 6 }, o.yl || 'y', ax);
    (o.xt || []).forEach(function (x) {
      S('line', { 'class': 'ax', x1: P.sx(x), x2: P.sx(x), y1: Y0 - 8, y2: Y0 + 8 }, ax);
      T({ 'class': 'tk', x: P.sx(x), y: Y0 + 36, 'text-anchor': 'middle' }, num(x, String(x).split('.')[1] ? 1 : 0), ax);
    });
    (o.yt || []).forEach(function (y) {
      S('line', { 'class': 'ax', x1: X0 - 8, x2: X0 + 8, y1: P.sy(y), y2: P.sy(y) }, ax);
      T({ 'class': 'tk', x: X0 - 16, y: P.sy(y) + 8, 'text-anchor': 'end' }, num(y, 0), ax);
    });
    if (o.zero !== false) T({ 'class': 'tk', x: X0 - 14, y: Y0 + 34, 'text-anchor': 'end' }, '0', ax);
    P.body = S('g', { 'clip-path': 'url(#' + cid + ')' }, svg);
    P.top = S('g', {}, svg);
    P.path = function (f, a, b, n) {
      n = n || Math.max(2, Math.ceil(Math.abs(b - a) / (o.x1 - o.x0) * 160));
      var d = '';
      for (var k = 0; k <= n; k++) { var x = a + (b - a) * k / n; d += (k ? 'L' : 'M') + P.sx(x).toFixed(1) + ' ' + P.sy(f(x)).toFixed(1); }
      return d;
    };
    P.area = function (f, a, b) { return 'M' + P.sx(a).toFixed(1) + ' ' + Y0.toFixed(1) + P.path(f, a, b).replace(/^M/, 'L') + 'L' + P.sx(b).toFixed(1) + ' ' + Y0.toFixed(1) + 'Z'; };
    return P;
  }

  /* drag anywhere on el (an <svg> with a viewBox, or an HTML box); fn(x, y, phase) in el's own unscaled units */
  function drag(el, fn) {
    var pid = null;
    function loc(e) {
      var r = el.getBoundingClientRect(), vb = el.viewBox && el.viewBox.baseVal;
      var W = vb && vb.width ? vb.width : el.offsetWidth, H = vb && vb.height ? vb.height : el.offsetHeight;
      return { x: (e.clientX - r.left) * W / (r.width || 1), y: (e.clientY - r.top) * H / (r.height || 1) };
    }
    el.addEventListener('pointerdown', function (e) {
      if (root.classList.contains('pen-on') || (e.pointerType === 'mouse' && e.button !== 0)) return;
      pid = e.pointerId; try { el.setPointerCapture(pid); } catch (er) {}
      if (e.cancelable) e.preventDefault();
      var p = loc(e); fn(p.x, p.y, 'start');
    });
    el.addEventListener('pointermove', function (e) { if (e.pointerId !== pid) return; var p = loc(e); fn(p.x, p.y, 'move'); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) {
      el.addEventListener(t, function (e) { if (e.pointerId === pid) { pid = null; fn(null, null, 'end'); } });
    });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  /* "hop": the source glyph (.hs[data-h=key]) flies along an arc to its new place (.ht[data-h=key]); then .hm[data-h=key] pop in */
  function land(sl, key, on) {
    $$('.ht[data-h="' + key + '"],.hm[data-h="' + key + '"]', sl).forEach(function (e) { e.classList.toggle('landed', on); });
    $$('.hs[data-h="' + key + '"]', sl).forEach(function (e) { e.classList.remove('flown'); });
  }
  function fly(sl, key) {
    var src = $('.hs[data-h="' + key + '"]', sl), dst = $('.ht[data-h="' + key + '"]', sl);
    if (!src || !dst) return;
    land(sl, key, false);
    var R = sl.getBoundingClientRect(), k = R.width / 1920 || 1, a = src.getBoundingClientRect(), b = dst.getBoundingClientRect();
    if (still() || !a.height || !b.height || !Element.prototype.animate) { land(sl, key, true); return; }
    var cs = getComputedStyle(src), fl = document.createElement('span');
    fl.className = 'hopfly'; fl.textContent = src.textContent;
    fl.style.fontFamily = cs.fontFamily; fl.style.fontWeight = cs.fontWeight; fl.style.fontSize = cs.fontSize; fl.style.color = cs.color;
    fl.style.lineHeight = (a.height / k) + 'px';
    fl.style.left = ((a.left - R.left) / k) + 'px'; fl.style.top = ((a.top - R.top) / k) + 'px';
    sl.appendChild(fl);
    src.classList.add('flown');
    var s = b.height / a.height, dx = (b.left - a.left) / k, dy = (b.top - a.top) / k;
    var an = fl.animate([
      { transform: 'translate(0px,0px) scale(1)' },
      { transform: 'translate(' + dx * 0.45 + 'px,' + (Math.min(0, dy) * 0.45 - 120) + 'px) scale(' + (1 + s) / 2 + ')', offset: 0.45 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')' }
    ], { duration: 950, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' });
    an.onfinish = function () { fl.remove(); land(sl, key, true); };
    sl._fly = sl._fly || []; sl._fly.push(fl);
  }
  function clearFly(sl) { (sl._fly || []).forEach(function (f) { f.remove(); }); sl._fly = []; }

  var C = {};

  /* ============ 1 · title: car, speedometer, ticker-tape dots ============ */
  C['c-title'] = (function () {
    var arcs = $('#c1-arcs'), ticks = $('#c1-ticks');
    function gp(v, r) { var a = (-120 + 2 * v) * Math.PI / 180; return [320 + r * Math.sin(a), 320 - r * Math.cos(a)]; }
    function arc(v0, v1, r) { var a = gp(v0, r), b = gp(v1, r); return 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + ((v1 - v0) * 2 > 180 ? 1 : 0) + ' 1 ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1); }
    [[0, 30, BLUE], [30, 60, TEAL], [60, 90, SUN], [90, 120, RED]].forEach(function (s) { S('path', { d: arc(s[0], s[1], 262), stroke: s[2], 'stroke-width': 34, fill: 'none' }, arcs); });
    S('path', { d: arc(0, 120, 280), stroke: INK, 'stroke-width': 4, fill: 'none' }, arcs);
    S('path', { d: arc(0, 120, 244), stroke: INK, 'stroke-width': 4, fill: 'none' }, arcs);
    for (var v = 0; v <= 120; v += 10) {
      var big = v % 20 === 0, p1 = gp(v, 236), p2 = gp(v, big ? 204 : 218);
      S('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], stroke: INK, 'stroke-width': big ? 7 : 4, 'stroke-linecap': 'round' }, ticks);
      if (big) { var p3 = gp(v, 172); T({ 'class': 'tl', x: p3[0], y: p3[1] + 11, 'text-anchor': 'middle' }, String(v), ticks); }
    }
    var car = $('#c1-car'), needle = $('#c1-needle'), spd = $('#c1-spd'), wh = $$('#c-title .c1-wh'), lines = $('#c1-lines'), pin = $('#c1-pin'), ask = $('#c1-ask');
    var DRIVE = 4800, GAP = 1100, X0 = 20, L = 1980, REF = 120, VMAX = 110, dots = [];
    for (var k = 0; k <= 12; k++) {
      var uu = k / 12, x = X0 + L * uu * uu + REF;
      if (x < 1900) dots.push({ u: uu, el: S('circle', { cx: x.toFixed(1), cy: 141, r: 9, fill: PINK, stroke: INK, 'stroke-width': 3 }, $('#c1-dots')) });
    }
    var raf = 0, t0 = null, last = 0, rot = 0, u = 0;
    function pose(w, dotsOn) {
      var x = X0 + L * w * w, sp = VMAX * w;
      car.setAttribute('transform', 'translate(' + x.toFixed(1) + ' 10)');
      needle.setAttribute('transform', 'rotate(' + (-120 + 2 * sp).toFixed(2) + ' 320 320)');
      spd.textContent = Math.round(sp);
      lines.setAttribute('opacity', clamp((sp - 35) / 50, 0, 1).toFixed(2));
      dots.forEach(function (d) { d.el.style.opacity = dotsOn && d.u <= w + 1e-9 ? 1 : 0; });
    }
    function frame(t) {
      if (t0 === null) { t0 = t - u * DRIVE; last = t; }
      var e = (t - t0) % (DRIVE + GAP), w = Math.min(1, e / DRIVE), dt = Math.min(64, t - last); last = t;
      rot = (rot + VMAX * w * dt * 0.017) % 360;
      wh.forEach(function (g) { g.setAttribute('transform', 'rotate(' + rot.toFixed(1) + ')'); });
      u = e < DRIVE ? w : 0;
      pose(w, e < DRIVE + GAP * 0.4);
      raf = requestAnimationFrame(frame);
    }
    function stop() { cancelAnimationFrame(raf); raf = 0; t0 = null; }
    pose(0.62, true); u = 0.62;
    return {
      set: function (st, prev) {
        stop();
        if (st === 0) {
          if (still()) { u = 0.62; pose(u, true); } else { if (prev < 0 || u > 0.95) u = 0; pose(u, true); raf = requestAnimationFrame(frame); }
          return;
        }
        if (!(u >= 0.3 && u <= 0.74) || still()) u = 0.62;   /* freeze-frame: "this instant" */
        pose(u, true);
        pin.style.left = (X0 + L * u * u + REF) + 'px';
        ask.textContent = Math.round(VMAX * u);
      },
      leave: stop
    };
  })();

  /* ============ 2 · secant → tangent on y = x², P = (1, 1), Q = (1 + h, (1 + h)²) ============ */
  C['c-secant'] = (function () {
    var sl = $('#c-secant'), svg = $('#c2-svg'), hint = $('#c2-hint'), A = Anim();
    var P = plot(svg, { id: 'c2', x0: -0.5, x1: 2.75, y0: -0.7, y1: 7.3, l: 84, t: 40, w: 900, h: 620, gx: 0.25, gy: 0.5, xt: [1, 2], yt: [2, 4, 6] });
    var f = function (x) { return x * x; };
    var cv = S('path', { 'class': 'cf draw', d: P.path(f, -0.5, 2.75, 220), pathLength: 1 }, P.body); cv.style.setProperty('--d', 450);
    var tan = S('line', { 'class': 'tan', x1: P.sx(-0.5), y1: P.sy(-2), x2: P.sx(2.75), y2: P.sy(4.5) }, P.body);
    var sec = S('line', { 'class': 'sec' }, P.body);
    var run = S('line', { 'class': 'sec dash' }, P.top), rise = S('line', { 'class': 'sec dash' }, P.top);
    T({ 'class': 'lbl halo', x: P.sx(2.05), y: P.sy(6.6), fill: BLUE, 'text-anchor': 'end' }, 'y = x²', P.top);
    var tanL = T({ 'class': 'lbl halo', x: P.sx(1.12), y: P.sy(0.38), fill: RED }, 'เส้นสัมผัส · ความชัน 2', P.top);
    var runL = T({ 'class': 'lbl halo', 'text-anchor': 'middle', fill: PINK }, '', P.top);
    var riseL = T({ 'class': 'lbl halo', fill: PINK }, '', P.top);
    S('circle', { 'class': 'pt', cx: P.sx(1), cy: P.sy(1), r: 14, fill: '#fff' }, P.top);
    var pL = T({ 'class': 'lbl halo', x: P.sx(1) - 24, y: P.sy(1) - 18, 'text-anchor': 'end' }, 'P', P.top);
    var ring = S('circle', { r: 34, fill: 'none', stroke: PINK, 'stroke-width': 4, 'class': 'c2-ring' }, P.top);
    var q = S('circle', { 'class': 'pt', r: 18, fill: PINK }, P.top);
    var qL = T({ 'class': 'lbl halo' }, 'Q', P.top);
    var eh = $('#c2-h'), en = $('#c2-num'), ed = $('#c2-den'), em = $('#c2-m'), rows = $$('#c2-tape tbody tr'), h = 1.5, lock = false;
    function line(m) { set(sec, { x1: P.sx(-0.5), y1: P.sy(1 + m * (-1.5)), x2: P.sx(2.75), y2: P.sy(1 + m * 1.75) }); }
    function setH(v) {
      h = v;
      var qx = 1 + h, qy = f(qx), m = 2 + h, rs = qy - 1, X = P.sx(qx), Y = P.sy(qy), far = Math.abs(h) > 0.2;
      line(m);
      set(run, { x1: P.sx(1), y1: P.sy(1), x2: X, y2: P.sy(1) });
      set(rise, { x1: X, y1: P.sy(1), x2: X, y2: Y });
      set(runL, { x: (P.sx(1) + X) / 2, y: P.sy(1) + (h > 0 ? 42 : -18) }); runL.textContent = 'h';
      set(riseL, { x: X + (h > 0 ? 18 : -18), y: (P.sy(1) + Y) / 2 + 10, 'text-anchor': h > 0 ? 'start' : 'end' }); riseL.textContent = num(rs, 2);
      [run, rise, runL, riseL].forEach(function (e) { e.style.opacity = far ? 1 : 0; });
      set(q, { cx: X, cy: Y }); set(ring, { cx: X, cy: Y });
      set(qL, { x: X + (h > 0 ? -26 : 26), y: Y - 22, 'text-anchor': h > 0 ? 'end' : 'start' }); qL.style.opacity = Math.abs(h) > 0.12 ? 1 : 0;
      var tv = lock ? 1 : clamp((0.3 - Math.abs(h)) / 0.28, 0, 1);
      tan.style.opacity = tv; tanL.style.opacity = tv > 0.95 ? 1 : 0;
      eh.textContent = num(h, 3); en.textContent = num(rs, 3); ed.textContent = num(h, 3); em.textContent = num(m, 3);
      em.classList.toggle('near', Math.abs(h) < 0.0105);
    }
    function showRows(v) { rows.forEach(function (r) { r.classList.toggle('vis', +r.dataset.h >= v - 1e-9); }); }
    drag(svg, function (px, py, ph) {
      if (ph === 'end') return;
      A.stop();
      var hh = clamp(P.ix(px), -0.4, 2.65) - 1;
      if (Math.abs(hh) < 0.004) hh = hh < 0 ? -0.001 : 0.001;
      setH(hh); hint.classList.add('gone');
    });
    setH(1.5);
    return {
      set: function (st, prev) {
        A.stop(); lock = st === 2;
        if (st === 0) { showRows(9); hint.classList.remove('gone'); if (prev > 0) A.run(450, function (p) { setH(h + (1.5 - h) * eo(p)); }); else setH(1.5); return; }
        if (st === 1 && prev === 0 && !still()) {
          showRows(9); var h0 = h;
          A.run(550, function (p) { setH(h0 + (1 - h0) * eo(p)); }, function () {
            A.run(3800, function (p) { var v = Math.pow(10, -3 * eio(p)); setH(v); showRows(v); }, function () { setH(0.001); showRows(0.001); });
          });
          return;
        }
        showRows(0.001);
        if (Math.abs(h - 0.001) > 1e-6 && !still() && prev >= 0) { var h1 = h; A.run(500, function (p) { setH(h1 + (0.001 - h1) * eo(p)); }); }
        else setH(0.001);
      },
      leave: function () { A.stop(); }
    };
  })();

  /* ============ 3 · f(x) = x³ − 3x and its slope function f′(x) = 3x² − 3, one cursor through both ============ */
  C['c-deriv'] = (function () {
    var svg = $('#c3-svg'), hint = $('#c3-hint'), A = Anim(), XM = 2.05;
    var f = function (x) { return x * x * x - 3 * x; }, d = function (x) { return 3 * x * x - 3; };
    var Pa = plot(svg, { id: 'c3a', x0: -2.2, x1: 2.2, y0: -3.4, y1: 3.4, l: 84, t: 40, w: 960, h: 400, gx: 0.5, gy: 1, xt: [-2, -1, 1, 2], yt: [-2, 2], zero: false });
    S('line', { x1: 24, x2: 1066, y1: 474, y2: 474, stroke: INK, 'stroke-width': 3, 'stroke-dasharray': '2 12', 'stroke-linecap': 'round' }, svg);
    var Pb = plot(svg, { id: 'c3b', x0: -2.2, x1: 2.2, y0: -4, y1: 10.5, l: 84, t: 520, w: 960, h: 356, gx: 0.5, gy: 1.5, gm: 3, xt: [-2, -1, 1, 2], yt: [-3, 3, 6, 9], zero: false, yl: 'y' });
    var cf = S('path', { 'class': 'cf draw', d: Pa.path(f, -2.2, 2.2, 240), pathLength: 1 }, Pa.body); cf.style.setProperty('--d', 450);
    var tr = S('path', { 'class': 'cd' }, Pb.body);
    var cur = S('line', { stroke: INK, 'stroke-width': 3, 'stroke-dasharray': '10 9' }, svg);
    var marks = S('g', { 'class': 'g2' }, svg);
    [-1, 1].forEach(function (x) {
      S('line', { x1: Pa.sx(x), x2: Pa.sx(x), y1: Pa.sy(f(x)), y2: Pb.sy(0), stroke: GREEN, 'stroke-width': 5, 'stroke-dasharray': '3 11', 'stroke-linecap': 'round' }, marks);
      S('line', { x1: Pa.sx(x) - 90, x2: Pa.sx(x) + 90, y1: Pa.sy(f(x)), y2: Pa.sy(f(x)), stroke: RED, 'stroke-width': 7, 'stroke-linecap': 'round' }, marks);
      S('circle', { cx: Pa.sx(x), cy: Pa.sy(f(x)), r: 12, fill: GREEN, stroke: INK, 'stroke-width': 4 }, marks);
      S('circle', { cx: Pb.sx(x), cy: Pb.sy(0), r: 13, fill: GREEN, stroke: INK, 'stroke-width': 4 }, marks);
    });
    T({ 'class': 'lbl halo', x: Pa.sx(-1), y: Pa.sy(2) - 30, 'text-anchor': 'middle', fill: '#0B8A50' }, 'ยอดเขา: ความชัน 0', marks);
    T({ 'class': 'lbl halo', x: Pa.sx(1), y: Pa.sy(-2) + 56, 'text-anchor': 'middle', fill: '#0B8A50' }, 'ก้นหุบ: ความชัน 0', marks);
    T({ 'class': 'lbl halo', x: Pb.sx(0), y: Pb.sy(0) + 46, 'text-anchor': 'middle', fill: '#0B8A50' }, 'f′ = 0 ที่ x = −1 และ 1', marks);
    var tg = S('line', { 'class': 'tan' }, svg);
    var da = S('circle', { 'class': 'pt', r: 14, fill: BLUE }, svg), db = S('circle', { 'class': 'pt', r: 14, fill: RED }, svg);
    var ex = $('#c3-x'), em = $('#c3-m'), ea = $('#c3-arrow svg'), es = $('#c3-state'), x = -1.8, lo = -1.8, hi = -1.8;
    function draw(v) {
      x = clamp(v, -XM, XM);
      var X = Pa.sx(x), Ya = Pa.sy(f(x)), m = d(x);
      var vx = Pa.sx(x + 1) - X, vy = Pa.sy(f(x) + m) - Ya, L = Math.hypot(vx, vy) || 1;
      set(tg, { x1: X - vx / L * 150, y1: Ya - vy / L * 150, x2: X + vx / L * 150, y2: Ya + vy / L * 150 });
      set(cur, { x1: X, x2: X, y1: Pa.o.t, y2: Pb.o.t + Pb.o.h });
      set(da, { cx: X, cy: Ya }); set(db, { cx: X, cy: Pb.sy(m) });
      tr.setAttribute('d', hi - lo > 0.005 ? Pb.path(d, lo, hi) : '');
      ex.textContent = num(x, 2); em.textContent = num(m, 2);
      ea.style.setProperty('--a', (Math.atan2(vy, vx) * 180 / Math.PI).toFixed(1) + 'deg');
      es.textContent = Math.abs(m) < 0.15 ? 'จุดราบ · ความชันเป็น 0' : m > 0 ? 'ขาขึ้น · ความชันเป็นบวก' : 'ขาลง · ความชันเป็นลบ';
    }
    drag(svg, function (px, py, ph) {
      if (ph === 'end') return;
      A.stop(); var v = clamp(Pa.ix(px), -XM, XM); lo = Math.min(lo, v); hi = Math.max(hi, v); draw(v); hint.classList.add('gone');
    });
    draw(-1.8);
    return {
      set: function (st, prev) {
        A.stop();
        if (st === 0) { hint.classList.remove('gone'); lo = hi = -1.8; draw(-1.8); return; }
        hint.classList.add('gone');
        if (st === 1 && prev === 0 && !still()) {
          lo = -XM; A.run(4200, function (p) { var v = -XM + 2 * XM * eio(p); hi = Math.max(hi, v); draw(v); });
          return;
        }
        lo = -XM; hi = XM;
        if (st === 1) { draw(prev === 2 ? x : 0.5); return; }
        if (still() || prev < 0) { draw(1); return; }
        var x0 = x; A.run(900, function (p) { draw(x0 + (1 - x0) * eo(p)); });
      },
      leave: function () { A.stop(); }
    };
  })();

  /* ============ 4 · power rule: hops + a mini graph check ============ */
  C['c-rule'] = (function () {
    var sl = $('#c-rule'), gen = 0, A = Anim();
    var f = function (x) { return x * x * x - 3 * x; }, d = function (x) { return 3 * x * x - 3; };
    var P = plot($('#c4-mini'), { id: 'c4m', x0: -0.35, x1: 2.1, y0: -2.6, y1: 2.4, l: 34, t: 14, w: 360, h: 170, xt: [1], zero: false });
    S('path', { 'class': 'cf', d: P.path(f, -0.35, 2.1, 120), style: 'stroke-width:6' }, P.body);
    var tg = S('line', { 'class': 'tan', style: 'stroke-width:6' }, P.top), dot = S('circle', { 'class': 'pt', r: 10, fill: BLUE, 'stroke-width': 3.5 }, P.top);
    function at(x) {
      var X = P.sx(x), Y = P.sy(f(x)), vx = P.sx(x + 1) - X, vy = P.sy(f(x) + d(x)) - Y, L = Math.hypot(vx, vy) || 1;
      set(tg, { x1: X - vx / L * 80, y1: Y - vy / L * 80, x2: X + vx / L * 80, y2: Y + vy / L * 80 }); set(dot, { cx: X, cy: Y });
    }
    at(1);
    var beats = [['r', 'e1', 'e2', 'e3'], ['s1'], [], []];
    function later(ms, fn) { var my = gen; setTimeout(function () { if (my === gen && sl.classList.contains('on')) fn(); }, ms); }
    return {
      set: function (st, prev) {
        gen++; A.stop(); clearFly(sl);
        beats.forEach(function (ks, b) { ks.forEach(function (k) { land(sl, k, b < st || (b === st && (still() || prev !== st - 1))); }); });
        var fwd = !still() && prev === st - 1;
        if (fwd && st === 0) { later(800, function () { fly(sl, 'r'); }); ['e1', 'e2', 'e3'].forEach(function (k, i) { later(2000 + i * 650, function () { fly(sl, k); }); }); }
        if (fwd && st === 1) later(700, function () { fly(sl, 's1'); });
        if (st === 3 && fwd) { at(0.15); later(500, function () { A.run(1300, function (p) { at(0.15 + 0.85 * eio(p)); }); }); }
        else at(1);
      },
      leave: function () { gen++; A.stop(); clearFly(sl); }
    };
  })();

  /* ============ 5 · Riemann sum (right endpoints) for y = x² on [0, 2] ============ */
  C['c-area'] = (function () {
    var sl = $('#c-area'), svg = $('#c5-svg'), A = Anim(), EX = 8 / 3, n = 2;
    var P = plot(svg, { id: 'c5', x0: -0.22, x1: 2.3, y0: -0.45, y1: 4.6, l: 84, t: 40, w: 960, h: 616, gx: 0.25, gy: 0.5, xt: [0.5, 1, 1.5, 2], yt: [1, 2, 3, 4] });
    var f = function (x) { return x * x; };
    var pat = S('pattern', { id: 'c5-hatch', width: 14, height: 14, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, P.defs);
    S('rect', { width: 14, height: 14, fill: '#FFC6DC' }, pat); S('rect', { width: 6, height: 14, fill: PINK }, pat);
    var exact = S('path', { id: 'c5-exact', d: P.area(f, 0, 2), fill: SUN, stroke: INK, 'stroke-width': 3 }, P.under);
    var rects = S('g', { id: 'c5-rects', fill: SUN, stroke: INK }, P.under);
    var exs = S('path', { id: 'c5-exs', fill: 'url(#c5-hatch)', stroke: INK, 'stroke-width': 1.5 }, P.under);
    rects.style.transformBox = 'view-box'; rects.style.transformOrigin = '0px ' + P.sy(0) + 'px';
    var cv = S('path', { 'class': 'cf draw', d: P.path(f, -0.22, 2.3, 200), pathLength: 1 }, P.body); cv.style.setProperty('--d', 350);
    S('line', { x1: P.sx(2), x2: P.sx(2), y1: P.sy(0), y2: P.sy(4.45), stroke: INK, 'stroke-width': 3, 'stroke-dasharray': '4 10', 'stroke-linecap': 'round' }, P.top);
    T({ 'class': 'lbl halo', x: P.sx(2.18), y: P.sy(4.25), fill: BLUE, 'text-anchor': 'end' }, 'y = x²', P.top);
    var eN = $('#c5-nv'), eT = $('#c5-tv'), eS = $('#c5-sv'), eE = $('#c5-ev'), eB = $('#c5-eb'), th = $('#c5-th'), fill = $('#c5-fill'), trk = $('#c5-trk');
    function sumOf(k) { return 4 * (k + 1) * (2 * k + 1) / (3 * k * k); }   /* = Σ (2i/k)² · (2/k), i = 1..k */
    function readout(s) {
      eS.textContent = s.toFixed(3); var e = Math.max(0, s - EX);
      eE.textContent = '+' + e.toFixed(3); eB.style.transform = 'scaleX(' + (e / (5 - EX)).toFixed(4) + ')';
    }
    function setN(v) {
      n = clamp(Math.round(v), 2, 50);
      var w = 2 / n, r = '', e = '', sw = n > 24 ? 1.2 : n > 10 ? 2 : 3;
      for (var i = 1; i <= n; i++) {
        var a = (i - 1) * w, b = i * w, X = P.sx(a), Y = P.sy(f(b));
        r += '<rect x="' + X.toFixed(2) + '" y="' + Y.toFixed(2) + '" width="' + (P.sx(b) - X).toFixed(2) + '" height="' + (P.sy(0) - Y).toFixed(2) + '"/>';
        e += 'M' + X.toFixed(2) + ' ' + Y.toFixed(2);
        for (var j = 0; j <= 8; j++) { var x = b - (b - a) * j / 8; e += 'L' + P.sx(x).toFixed(2) + ' ' + P.sy(f(x)).toFixed(2); }
        e += 'Z';
      }
      rects.innerHTML = r; rects.setAttribute('stroke-width', sw); exs.setAttribute('d', e);
      eN.textContent = n; eT.textContent = n;
      var pc = ((n - 2) / 48 * 100).toFixed(3) + '%'; th.style.left = pc; fill.style.width = pc;
      trk.setAttribute('aria-valuenow', n);
      readout(sumOf(n));
    }
    function lim(on) { sl.classList.toggle('lim', on); }
    function user(v) { A.stop(); lim(false); setN(v); }
    drag(trk, function (px, py, ph) { if (ph !== 'end') user(2 + 48 * clamp(px / (trk.offsetWidth || 1), 0, 1)); });
    $('#c5-minus').addEventListener('click', function (e) { e.stopPropagation(); user(n - 1); });
    $('#c5-plus').addEventListener('click', function (e) { e.stopPropagation(); user(n + 1); });
    setN(2);
    return {
      set: function (st, prev) {
        A.stop();
        if (st === 0) {
          lim(false); setN(2);
          if (prev < 0 && !still() && rects.animate) rects.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 900, delay: 500, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
          return;
        }
        if (st === 1) {
          lim(false);
          if (prev === 0 && !still()) { var n0 = n; A.run(4200, function (p) { setN(n0 + (50 - n0) * p * p); }); }
          else setN(50);
          return;
        }
        setN(50); lim(true);
        if (still() || prev < 0) { readout(EX); return; }
        var s0 = sumOf(50); A.run(1400, function (p) { readout(s0 + (EX - s0) * eo(p)); });
      },
      leave: function () { A.stop(); }
    };
  })();

  /* ============ 6 · fundamental theorem: area under f up to x = height of F; slope of F = height of f ============ */
  C['c-ftc'] = (function () {
    var A = Anim(), sl = $('#c-ftc'), x = 1.2;
    var f = function (t) { return t * t; }, F = function (t) { return t * t * t / 3; };
    var Lp = plot($('#c6-ls'), { id: 'c6l', x0: -0.18, x1: 2.3, y0: -0.42, y1: 4.7, l: 70, t: 30, w: 590, h: 470, gx: 0.25, gy: 0.5, xt: [1, 2], yt: [1, 2, 3, 4] });
    var Rp = plot($('#c6-rs'), { id: 'c6r', x0: -0.18, x1: 2.3, y0: -0.3, y1: 3.25, l: 70, t: 30, w: 590, h: 470, gx: 0.25, gy: 0.5, xt: [1, 2], yt: [1, 2, 3] });
    var area = S('path', { fill: SUN, stroke: INK, 'stroke-width': 3 }, Lp.under);
    var cvL = S('path', { 'class': 'cf draw', d: Lp.path(f, -0.18, 2.3), pathLength: 1 }, Lp.body); cvL.style.setProperty('--d', 450);
    var barL = S('line', { 'class': 'g1', stroke: RED, 'stroke-width': 10, 'stroke-linecap': 'round' }, Lp.top);
    var dotL = S('circle', { 'class': 'pt', r: 13, fill: BLUE }, Lp.top);
    var knL = S('circle', { r: 15, fill: PINK, stroke: INK, 'stroke-width': 4 }, Lp.top);
    var trF = S('path', { 'class': 'cv' }, Rp.body);
    var barR = S('rect', { width: 16, fill: SUN, stroke: INK, 'stroke-width': 3 }, Rp.under);
    var tgR = S('line', { 'class': 'tan g1' }, Rp.top);
    var dotR = S('circle', { 'class': 'pt', r: 13, fill: VIOLET }, Rp.top);
    var knR = S('circle', { r: 15, fill: PINK, stroke: INK, 'stroke-width': 4 }, Rp.top);
    var a1 = $('#c6-a1'), a2 = $('#c6-a2'), h1 = $('#c6-h1'), h2 = $('#c6-h2');
    function draw(v) {
      x = clamp(v, 0.02, 2);
      area.setAttribute('d', Lp.area(f, 0, x));
      set(barL, { x1: Lp.sx(x), x2: Lp.sx(x), y1: Lp.sy(0), y2: Lp.sy(f(x)) });
      set(dotL, { cx: Lp.sx(x), cy: Lp.sy(f(x)) }); set(knL, { cx: Lp.sx(x), cy: Lp.sy(0) });
      trF.setAttribute('d', Rp.path(F, 0, x));
      set(barR, { x: Rp.sx(x) - 8, y: Rp.sy(F(x)), height: Math.max(0, Rp.sy(0) - Rp.sy(F(x))) });
      var X = Rp.sx(x), Y = Rp.sy(F(x)), vx = Rp.sx(x + 1) - X, vy = Rp.sy(F(x) + f(x)) - Y, L = Math.hypot(vx, vy) || 1;
      set(tgR, { x1: X - vx / L * 130, y1: Y - vy / L * 130, x2: X + vx / L * 130, y2: Y + vy / L * 130 });
      set(dotR, { cx: X, cy: Y }); set(knR, { cx: X, cy: Rp.sy(0) });
      a1.textContent = a2.textContent = F(x).toFixed(3);
      h1.textContent = h2.textContent = f(x).toFixed(3);
    }
    [$('#c6-ls'), $('#c6-rs')].forEach(function (s, i) {
      var P = i ? Rp : Lp;
      drag(s, function (px, py, ph) { if (ph !== 'end') { A.stop(); draw(P.ix(px)); } });
    });
    draw(1.2);
    function go(to, ms) { var x0 = x; A.run(ms, function (p) { draw(x0 + (to - x0) * eio(p)); }); }
    return {
      set: function (st, prev) {
        A.stop();
        if (st === 0) { if (prev < 0) { draw(0.02); if (still()) draw(1.2); else go(1.2, 2600); } return; }
        if (st === 1) { if (prev === 2) go(1.2, 900); else if (prev < 0) draw(1.2); return; }
        if (prev === 1 && !still()) go(2, 1500); else draw(2);
      },
      leave: function () { A.stop(); }
    };
  })();

  /* ============ 7 · quick check: hop in Q1's working, area fill in Q2's working ============ */
  C['c-quiz'] = (function () {
    var sl = $('#c-quiz'), A = Anim(), gen = 0;
    var P = plot($('#c7-mini'), { id: 'c7m', x0: -0.25, x1: 3.35, y0: -0.8, y1: 10, l: 36, t: 18, w: 240, h: 166, xt: [3], zero: false });
    var f = function (x) { return x * x; };
    var cp = S('clipPath', { id: 'c7-grow' }, P.defs), cr = S('rect', { x: P.sx(0), y: 0, width: 0, height: 300 }, cp);
    S('path', { d: P.area(f, 0, 3), fill: SUN, stroke: INK, 'stroke-width': 2.5, 'clip-path': 'url(#c7-grow)' }, P.under);
    S('path', { 'class': 'cf', d: P.path(f, -0.25, 3.25), style: 'stroke-width:5' }, P.body);
    function grow(p) { cr.setAttribute('width', (P.sx(3) - P.sx(0)) * p + 2); }
    grow(1);
    return {
      set: function (st, prev) {
        gen++; A.stop(); clearFly(sl);
        var fwd = !still() && prev === st - 1;
        land(sl, 'q1', st > 1 || (st === 1 && !fwd));
        if (st === 1 && fwd) { var my = gen; setTimeout(function () { if (my === gen) fly(sl, 'q1'); }, 650); }
        if (st === 2 && fwd) { grow(0); A.run(1300, function (p) { grow(eio(p)); }); } else grow(1);
      },
      leave: function () { gen++; A.stop(); clearFly(sl); }
    };
  })();

  /* ============ 8 · summary dashboard: speedometer = slope of s(t), odometer = area under v(t) ============ */
  C['c-end'] = (function () {
    var TT = 15, DUR = 7000, HOLD = 2600;   /* a 15-minute trip shown in 7 s */
    function v(t) { return 40 * (1 - Math.cos(2 * Math.PI * t / TT)); }                       /* km/h */
    function s(t) { return (40 / 60) * (t - TT / (2 * Math.PI) * Math.sin(2 * Math.PI * t / TT)); }   /* km, t in minutes */
    function dial(svg, ring) {
      S('circle', { cx: 208, cy: 208, r: 186, fill: INK }, svg);
      S('circle', { cx: 200, cy: 200, r: 186, fill: '#fff', stroke: INK, 'stroke-width': 5 }, svg);
      return svg;
    }
    function gp(a, r) { var t = a * Math.PI / 180; return [200 + r * Math.sin(t), 200 - r * Math.cos(t)]; }
    function arc(a0, a1, r) { var a = gp(a0, r), b = gp(a1, r); return 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1); }
    var sp = dial($('#c8-sp')), od = dial($('#c8-od'));
    [[0, 25, BLUE], [25, 50, TEAL], [50, 75, SUN], [75, 100, RED]].forEach(function (q) { S('path', { d: arc(-120 + q[0] * 2.4, -120 + q[1] * 2.4, 156), stroke: q[2], 'stroke-width': 24, fill: 'none' }, sp); });
    for (var k = 0; k <= 100; k += 10) {
      var a = -120 + k * 2.4, p1 = gp(a, 140), p2 = gp(a, k % 20 ? 128 : 118);
      S('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], stroke: INK, 'stroke-width': k % 20 ? 3 : 5, 'stroke-linecap': 'round' }, sp);
      if (k % 20 === 0) { var p3 = gp(a, 96); T({ 'class': 'tl', x: p3[0], y: p3[1] + 9, 'text-anchor': 'middle' }, String(k), sp); }
    }
    var spv = T({ 'class': 'big2', x: 200, y: 316, 'text-anchor': 'middle' }, '0', sp);
    T({ 'class': 'u', x: 200, y: 350, 'text-anchor': 'middle' }, 'กม./ชม.', sp);
    var ndl = S('path', { d: 'M200 58 L210 200 L190 200 Z', fill: RED, stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }, sp);
    S('circle', { cx: 200, cy: 200, r: 20, fill: INK }, sp); S('circle', { cx: 200, cy: 200, r: 7, fill: SUN }, sp);
    S('path', { d: arc(-120, 120, 156), stroke: '#EEF0F8', 'stroke-width': 30, fill: 'none' }, od);
    var odArc = S('path', { stroke: SUN, 'stroke-width': 30, fill: 'none' }, od);
    S('path', { d: arc(-120, 120, 171), stroke: INK, 'stroke-width': 4, fill: 'none' }, od);
    S('path', { d: arc(-120, 120, 141), stroke: INK, 'stroke-width': 4, fill: 'none' }, od);
    [0, 5, 10].forEach(function (km) { var p = gp(-120 + km * 24, 108); T({ 'class': 'tl', x: p[0], y: p[1] + 9, 'text-anchor': 'middle' }, String(km), od); });
    S('rect', { x: 98, y: 168, width: 204, height: 84, rx: 16, fill: INK }, od);
    var odv = T({ 'class': 'big2', x: 200, y: 233, 'text-anchor': 'middle', style: 'fill:#fff' }, '0.0', od);
    T({ 'class': 'u', x: 200, y: 300, 'text-anchor': 'middle' }, 'กม. (ระยะทางสะสม)', od);
    var Ps = plot($('#c8-sg'), { id: 'c8s', x0: -0.6, x1: 16.2, y0: -0.8, y1: 11.4, l: 54, t: 22, w: 320, h: 222, gx: 2.5, gy: 2.5, xt: [5, 10, 15], yt: [5, 10], xl: 't', yl: 's ระยะทาง', zero: false });
    var Pv = plot($('#c8-vg'), { id: 'c8v', x0: -0.6, x1: 16.2, y0: -7, y1: 96, l: 54, t: 22, w: 320, h: 222, gx: 2.5, gy: 20, xt: [5, 10, 15], yt: [40, 80], xl: 't', yl: 'v ความเร็ว', zero: false });
    S('path', { d: Ps.path(s, 0, TT), fill: 'none', stroke: '#CBD3F2', 'stroke-width': 5, 'stroke-dasharray': '2 9', 'stroke-linecap': 'round' }, Ps.body);
    S('path', { d: Pv.path(v, 0, TT), fill: 'none', stroke: '#CBD3F2', 'stroke-width': 5, 'stroke-dasharray': '2 9', 'stroke-linecap': 'round' }, Pv.body);
    var sCur = S('path', { 'class': 'cf', style: 'stroke-width:6' }, Ps.body), sTan = S('line', { 'class': 'tan', style: 'stroke-width:6' }, Ps.top), sDot = S('circle', { 'class': 'pt', r: 9, fill: BLUE, 'stroke-width': 3 }, Ps.top);
    var vArea = S('path', { fill: SUN, stroke: INK, 'stroke-width': 2.5 }, Pv.under), vCur = S('path', { 'class': 'cf', style: 'stroke-width:6' }, Pv.body), vDot = S('circle', { 'class': 'pt', r: 9, fill: BLUE, 'stroke-width': 3 }, Pv.top);
    function pose(t) {
      t = clamp(t, 0, TT);
      var sp1 = v(t), d1 = s(t);
      ndl.setAttribute('transform', 'rotate(' + (-120 + sp1 * 2.4).toFixed(2) + ' 200 200)');
      spv.textContent = Math.round(sp1); odv.textContent = d1.toFixed(1);
      odArc.setAttribute('d', d1 > 0.02 ? arc(-120, -120 + d1 * 24, 156) : '');
      sCur.setAttribute('d', t > 0.05 ? Ps.path(s, 0, t) : '');
      var X = Ps.sx(t), Y = Ps.sy(d1), vx = Ps.sx(t + 1) - X, vy = Ps.sy(d1 + sp1 / 60) - Y, L = Math.hypot(vx, vy) || 1;
      set(sTan, { x1: X - vx / L * 60, y1: Y - vy / L * 60, x2: X + vx / L * 60, y2: Y + vy / L * 60 }); set(sDot, { cx: X, cy: Y });
      vArea.setAttribute('d', t > 0.05 ? Pv.area(v, 0, t) : ''); vCur.setAttribute('d', t > 0.05 ? Pv.path(v, 0, t) : '');
      set(vDot, { cx: Pv.sx(t), cy: Pv.sy(sp1) });
    }
    var raf = 0, t0 = null;
    function frame(t) {
      if (t0 === null) t0 = t;
      var e = (t - t0) % (DUR + HOLD);
      pose(TT * Math.min(1, e / DUR));
      raf = requestAnimationFrame(frame);
    }
    function stop() { cancelAnimationFrame(raf); raf = 0; t0 = null; }
    pose(6);
    return {
      set: function (st, prev) {
        if (still()) { stop(); pose(6); return; }
        if (prev < 0) { stop(); pose(0); setTimeout(function () { if (!raf && $('#c-end').classList.contains('on')) raf = requestAnimationFrame(frame); }, 700); }
      },
      leave: stop
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
  window.__calc = { C: C };
})();
