/* app.js · KruSlide sample math-geometry ("architect drafting"): draggable triangles measured live.
   Exact by construction: when a vertex V is dragged, the two angles at the OTHER vertices are rounded to whole degrees
   and V is rebuilt as the meeting point of the two rays (law of sines). So every triangle on screen has whole-degree
   angles, the three shown always add to exactly 180°, and two equal angles really give two equal sides.
   Every slide has a controller C[id] = { set(st, prev), leave() } (the calculus pattern); prev = -1 when the slide
   was just entered or jumped to. ?still / reduced motion (html.rm): final states, no motion.
   A press anywhere on the drawing grabs the nearest vertex (mouse, pen or touch); it never changes the slide. */
(function () {
  'use strict';
  var root = document.documentElement, stage = document.getElementById('stage'), NS = 'http://www.w3.org/2000/svg';
  if (!stage) return;
  var D = Math.PI / 180;
  function still() { return root.classList.contains('rm'); }
  function $(s, c) { return (c || document).querySelector(s); }
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
  var COL = ['#C8432B', '#2F5F9E', '#B97F0F'], FILL = ['rgba(200,67,43,.22)', 'rgba(47,95,158,.22)', 'rgba(185,127,15,.24)'], TEAL = '#1F8582';
  var NAMES = ['A', 'B', 'C'];

  /* ---------- vectors ---------- */
  function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
  function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
  function mul(a, k) { return { x: a.x * k, y: a.y * k }; }
  function len(a) { return Math.hypot(a.x, a.y); }
  function cross(a, b) { return a.x * b.y - a.y * b.x; }
  function rot(v, deg) { var c = Math.cos(deg * D), s = Math.sin(deg * D); return { x: v.x * c - v.y * s, y: v.x * s + v.y * c }; }
  function between(u, v) { return Math.acos(clamp((u.x * v.x + u.y * v.y) / (len(u) * len(v) || 1), -1, 1)) / D; }
  function phi(v) { return (Math.atan2(-v.y, v.x) / D + 360) % 360; }            /* direction, degrees anticlockwise (y up) */
  function at(V, f, r) { return { x: V.x + r * Math.cos(f * D), y: V.y - r * Math.sin(f * D) }; }
  function lerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
  function f1(v) { return v.toFixed(1); }
  /* the vertex V made from P and Q with whole-degree angles tP (at P) and tQ (at Q), on side s of PQ */
  function build(P, Q, tP, tQ, s) { var u = sub(Q, P), d = rot(mul(u, 1 / len(u)), s * tP); return add(P, mul(d, len(u) * Math.sin(tQ * D) / Math.sin((tP + tQ) * D))); }

  /* a triangle: p = [A, B, C] points, a = [α, β, γ] whole degrees */
  function Tri(A, B, al, be, up) { var t = { p: [A, B, null], a: [al, be, 180 - al - be] }; t.p[2] = build(A, B, al, be, up ? -1 : 1); return t; }
  /* the interior angle at vertex i: start direction f0 and size th (degrees, anticlockwise) */
  function wedge(t, i) {
    var V = t.p[i], fP = phi(sub(t.p[(i + 1) % 3], V)), fQ = phi(sub(t.p[(i + 2) % 3], V)), th = t.a[i];
    var f0 = Math.abs(((fQ - fP + 360) % 360) - th) < 1 ? fP : fQ;
    return { V: V, f0: f0, th: th, mid: f0 + th / 2 };
  }
  function sector(V, f0, th, r) { var a = at(V, f0, r), b = at(V, f0 + th, r); return 'M' + f1(V.x) + ' ' + f1(V.y) + 'L' + f1(a.x) + ' ' + f1(a.y) + 'A' + r + ' ' + r + ' 0 0 0 ' + f1(b.x) + ' ' + f1(b.y) + 'Z'; }
  function arc(V, f0, th, r) { var a = at(V, f0, r), b = at(V, f0 + th, r); return 'M' + f1(a.x) + ' ' + f1(a.y) + 'A' + r + ' ' + r + ' 0 ' + (th > 180 ? 1 : 0) + ' 0 ' + f1(b.x) + ' ' + f1(b.y); }
  /* a torn-off corner: a sector with a ragged edge, in its own frame (vertex at 0,0, spanning 0..th anticlockwise) */
  function torn(th, R) {
    var d = 'M0 0L' + R + ' 0', K = Math.max(4, Math.round(th / 5));
    for (var k = 1; k <= K; k++) { var a = th * k / K * D, r = k === K ? R : R - (k % 2) * 10; d += 'L' + f1(r * Math.cos(a)) + ' ' + f1(-r * Math.sin(a)); }
    return d + 'Z';
  }

  /* ---------- dragging one vertex with the other two fixed ---------- */
  function magnet(tP, tQ) {
    var tV = 180 - tP - tQ;
    if (Math.abs(tP - 60) <= 2 && Math.abs(tQ - 60) <= 2) return [60, 60];
    if (Math.abs(tP - tQ) <= 2) { var m = Math.round((tP + tQ) / 2); return [m, m]; }
    if (Math.abs(tV - tP) <= 2) return [tP, 180 - 2 * tP];
    if (Math.abs(tV - tQ) <= 2) return [180 - 2 * tQ, tQ];
    if (Math.abs(tP - 90) <= 2) return [90, tQ];
    if (Math.abs(tQ - 90) <= 2) return [tP, 90];
    if (Math.abs(tV - 90) <= 2) return [tP, 90 - tP];
    return [tP, tQ];
  }
  function dragVertex(t, i, M, o) {
    var P = t.p[(i + 1) % 3], Q = t.p[(i + 2) % 3], u = sub(Q, P), cr = cross(u, sub(M, P));
    if (Math.abs(cr) < 1) return false;
    if (o.side && Math.sign(cr) !== o.side) return false;
    var tP = Math.round(between(u, sub(M, P))), tQ = Math.round(between(sub(P, Q), sub(M, Q)));
    if (o.magnet) { var g = magnet(tP, tQ); tP = g[0]; tQ = g[1]; }
    tP = clamp(tP, 10, 160); tQ = clamp(tQ, 10, 170 - tP);
    var V = build(P, Q, tP, tQ, cr > 0 ? 1 : -1), A = o.area;
    if (V.x < A[0] || V.x > A[2] || V.y < A[1] || V.y > A[3] || len(sub(V, P)) < o.min || len(sub(V, Q)) < o.min) return false;
    t.p[i] = V; t.a[(i + 1) % 3] = tP; t.a[(i + 2) % 3] = tQ; t.a[i] = 180 - tP - tQ;
    return true;
  }
  /* press anywhere on the drawing: the nearest vertex follows the pointer */
  function grab(svg, getT, onMove, onEnd, pick) {
    var pid = null, idx = -1, off = null;
    function loc(e) { var r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) * 1920 / r.width, y: (e.clientY - r.top) * 1080 / r.height }; }
    svg.addEventListener('pointerdown', function (e) {
      if (penOn() || (e.pointerType === 'mouse' && e.button !== 0)) return;
      var M = loc(e), t = getT(); if (!t) return;
      var best = -1, bd = pick || 200;
      t.p.forEach(function (p, i) { var d = len(sub(p, M)); if (d < bd) { bd = d; best = i; } });
      if (best < 0) return;
      e.preventDefault(); pid = e.pointerId; idx = best; off = sub(t.p[best], M);
      try { svg.setPointerCapture(pid); } catch (er) {}
      svg.classList.add('grab');
    });
    svg.addEventListener('pointermove', function (e) { if (e.pointerId !== pid) return; onMove(idx, add(loc(e), off)); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) {
      svg.addEventListener(n, function (e) { if (e.pointerId !== pid) return; pid = null; svg.classList.remove('grab'); if (onEnd) onEnd(idx); });
    });
  }

  /* ---------- drawing a triangle (sides, construction lines, angle marks, vertex handles) ---------- */
  function drawTri(g, t, o) {
    g.textContent = ''; o = o || {};
    var P = t.p;
    for (var i = 0; i < 3; i++) {   /* faint construction lines run past every vertex */
      var a = P[i], b = P[(i + 1) % 3], u = mul(sub(b, a), 1 / len(sub(b, a)));
      if (!o.noExt) S('path', { 'class': 'ext', d: 'M' + f1(a.x - u.x * 70) + ' ' + f1(a.y - u.y * 70) + 'L' + f1(b.x + u.x * 70) + ' ' + f1(b.y + u.y * 70) }, g);
    }
    S('path', { 'class': 'side', d: 'M' + f1(P[0].x) + ' ' + f1(P[0].y) + 'L' + f1(P[1].x) + ' ' + f1(P[1].y) + 'L' + f1(P[2].x) + ' ' + f1(P[2].y) + 'Z', fill: 'rgba(251,248,239,.55)' }, g);
    for (i = 0; i < 3; i++) {
      var w = wedge(t, i), r = 62;
      if (w.th === 90) {
        var q1 = at(w.V, w.f0, 44), q2 = at(w.V, w.f0 + 90, 44), q3 = add(q1, sub(q2, w.V));
        S('path', { d: 'M' + f1(q1.x) + ' ' + f1(q1.y) + 'L' + f1(q3.x) + ' ' + f1(q3.y) + 'L' + f1(q2.x) + ' ' + f1(q2.y), fill: FILL[i], stroke: COL[i], 'stroke-width': 3 }, g);
      } else {
        S('path', { d: sector(w.V, w.f0, w.th, r), fill: FILL[i] }, g);
        S('path', { d: arc(w.V, w.f0, w.th, r), fill: 'none', stroke: COL[i], 'stroke-width': 3.5 }, g);
      }
      if (!o.noLab) { var lp = at(w.V, w.mid, w.th < 32 ? 128 : 104); T({ 'class': 'al', x: f1(lp.x), y: f1(lp.y + 12), 'text-anchor': 'middle', fill: COL[i] }, t.a[i] + '°', g).style.fill = COL[i]; }
      var np = at(w.V, w.mid + 180, 46);
      T({ 'class': 'vn', x: f1(np.x), y: f1(np.y + 15), 'text-anchor': 'middle' }, (o.names || NAMES)[i], g);
    }
    P.forEach(function (p, i) {
      if (o.fixed && o.fixed.indexOf(i) >= 0) { S('circle', { cx: f1(p.x), cy: f1(p.y), r: 7, fill: '#2C2D31' }, g); return; }
      S('circle', { 'class': 'vx', cx: f1(p.x), cy: f1(p.y), r: 15 }, g);
      S('path', { 'class': 'vx2', d: 'M' + f1(p.x - 24) + ' ' + f1(p.y) + 'h48M' + f1(p.x) + ' ' + f1(p.y - 24) + 'v48' }, g);
    });
  }

  var C = {};

  /* ============ 1 · the angle sum: tear the three corners off and line them up on a protractor ============ */
  C['g-sum'] = (function () {
    var sl = $('#g-sum'), svg = $('#g1-sv'), A1 = Anim(), O = { x: 1570, y: 790 }, R = 96;
    var AREA = [140, 300, 1240, 940], A0 = { x: 260, y: 900 }, B0 = { x: 1100, y: 900 };
    var t = Tri(A0, B0, 45, 55, true), torn_ = false;
    /* the protractor */
    var pro = S('g', { opacity: 0.55 }, svg), PR = 232;
    S('path', { d: 'M' + (O.x - PR) + ' ' + O.y + 'A' + PR + ' ' + PR + ' 0 0 1 ' + (O.x + PR) + ' ' + O.y + 'Z', fill: 'rgba(251,248,239,.85)', stroke: '#2C2D31', 'stroke-width': 2.5 }, pro);
    S('path', { d: 'M' + (O.x - 150) + ' ' + O.y + 'A150 150 0 0 1 ' + (O.x + 150) + ' ' + O.y, fill: 'none', stroke: '#2C2D31', 'stroke-width': 1.5, opacity: 0.5 }, pro);
    for (var k = 0; k <= 180; k += 5) { var a = at(O, k, PR), b = at(O, k, PR - (k % 10 ? 12 : k % 30 ? 20 : 30)); S('path', { d: 'M' + f1(a.x) + ' ' + f1(a.y) + 'L' + f1(b.x) + ' ' + f1(b.y), stroke: '#2C2D31', 'stroke-width': k % 30 ? 1.5 : 2.5 }, pro); }
    for (k = 0; k <= 180; k += 30) { var tp = at(O, k, PR - 40); T({ x: f1(tp.x), y: f1(tp.y + (k % 180 ? 8 : -6)), 'text-anchor': k === 0 ? 'end' : k === 180 ? 'start' : 'middle', fill: '#6C675C', style: 'font:700 22px Inter' }, String(k), pro); }
    S('path', { d: 'M' + (O.x - PR - 30) + ' ' + O.y + 'H' + (O.x + PR + 30), stroke: '#2C2D31', 'stroke-width': 4, 'stroke-linecap': 'round' }, pro);
    S('circle', { cx: O.x, cy: O.y, r: 6, fill: '#2C2D31' }, pro);
    var tri = S('g', {}, svg), wg = S('g', {}, svg), wl = S('g', {}, svg), wedges = [];
    for (k = 0; k < 3; k++) { var gg = S('g', { opacity: 0 }, wg); gg._p = S('path', { fill: FILL[k].replace(/[\d.]+\)$/, '.42)'), stroke: COL[k], 'stroke-width': 3, 'stroke-linejoin': 'round' }, gg); wedges.push(gg); }
    var labs = [0, 1, 2].map(function (k) { var e = T({ 'class': 'al', 'text-anchor': 'middle', opacity: 0 }, '', wl); e.style.fill = COL[k]; return e; });
    var vals = [$('#g1-a'), $('#g1-b'), $('#g1-c')], sum = $('#g1-s');
    /* where each corner goes on the protractor: B from 0°, then C, then A up to 180° */
    function target(i) { var st = i === 1 ? 0 : i === 2 ? t.a[1] : t.a[1] + t.a[2]; return { V: O, f0: st }; }
    function place(i, V, f, op) { var g = wedges[i]; g.setAttribute('transform', 'translate(' + f1(V.x) + ' ' + f1(V.y) + ') rotate(' + f1(-f) + ')'); if (op != null) g.setAttribute('opacity', op); }
    function readout() {
      vals.forEach(function (e, i) { e.textContent = t.a[i] + '°'; });
      sum.textContent = t.a[0] + '° + ' + t.a[1] + '° + ' + t.a[2] + '°';
    }
    function render() {
      drawTri(tri, t, { noLab: false });
      readout();
      wedges.forEach(function (g, i) { g._p.setAttribute('d', torn(t.a[i], R)); });
      if (torn_) settleWedges();
    }
    function settleWedges() {
      wedges.forEach(function (g, i) { var q = target(i); place(i, q.V, q.f0, 1); var lp = at(O, q.f0 + t.a[i] / 2, t.a[i] < 30 ? R - 30 : R + 26); labs[i].setAttribute('x', f1(lp.x)); labs[i].setAttribute('y', f1(lp.y + 12)); labs[i].textContent = t.a[i] + '°'; labs[i].setAttribute('opacity', 1); });
      pro.setAttribute('opacity', 1);
    }
    function untear() { torn_ = false; wedges.forEach(function (g) { g.setAttribute('opacity', 0); }); labs.forEach(function (l) { l.setAttribute('opacity', 0); }); pro.setAttribute('opacity', 0.55); }
    /* beat 1: each corner lifts off its vertex, then flies to the protractor turning on the way */
    function tear() {
      torn_ = true;
      wedges.forEach(function (g, i) { var w = wedge(t, i); place(i, w.V, w.f0, 1); g._from = { V: w.V, f: w.f0 }; });
      labs.forEach(function (l) { l.setAttribute('opacity', 0); });
      A1.run(1500, function (p) {
        pro.setAttribute('opacity', 0.55 + 0.45 * Math.min(1, p * 2));
        wedges.forEach(function (g, i) {
          var q = target(i), u = clamp((p - 0.12 * i - 0.1) / 0.66, 0, 1), e = eio(u), df = ((q.f0 - g._from.f) % 360 + 540) % 360 - 180;
          place(i, lerp(g._from.V, q.V, e), g._from.f + df * e);
        });
      }, function () { settleWedges(); say('มุมทั้งสามวางต่อกันเป็นเส้นตรง 180 องศา'); });
    }
    /* beat 2: the triangle changes shape by itself (whole degrees all the way); the corners stay a straight line */
    var PATH = [[45, 55], [30, 100], [35, 35], [65, 25], [45, 55]];
    function morph() {
      var n = PATH.length - 1;
      A1.run(n * 1500, function (p) {
        var u = p * n, j = Math.min(n - 1, Math.floor(u)), e = eio(u - j), a = PATH[j], b = PATH[j + 1];
        var al = Math.round(a[0] + (b[0] - a[0]) * e), be = Math.round(a[1] + (b[1] - a[1]) * e);
        t = Tri(A0, B0, al, be, true); render();
      }, function () { t = Tri(A0, B0, 45, 55, true); render(); });
    }
    grab(svg, function () { return t; }, function (i, M) {
      if (!sl.classList.contains('on')) return;
      A1.stop(); if (torn_ && !sl.classList.contains('b1')) untear();
      if (dragVertex(t, i, M, { area: AREA, min: 230 })) render();
    }, null, 400);
    render();
    return {
      set: function (st, prev) {
        A1.stop();
        if (st === 0) { untear(); if (prev > 0) t = Tri(A0, B0, 45, 55, true); render(); return; }
        if (st === 1) { if (still() || prev !== 0) { torn_ = true; render(); } else tear(); return; }
        if (st === 2) { torn_ = true; t = Tri(A0, B0, 45, 55, true); render(); if (!still() && prev === 1) morph(); }
      },
      leave: function () { A1.stop(); }
    };
  })();

  /* ============ 2 · the exterior angle at C: copies of B (slid) and A (half-turned) fill it exactly ============ */
  C['g-ext'] = (function () {
    var sl = $('#g-ext'), svg = $('#g2-sv'), A1 = Anim(), BY = 800, XD = 1800, R = 92;
    var t = Tri({ x: 800, y: BY }, { x: 1350, y: BY }, 50, 70, true);
    t = { p: [t.p[2], { x: 800, y: BY }, { x: 1350, y: BY }], a: [60, 50, 70] };
    /* the ruler under the base line */
    var ru = S('g', {}, svg);
    S('rect', { x: 690, y: BY + 8, width: 1150, height: 66, rx: 6, fill: '#F8F1DC', stroke: '#2C2D31', 'stroke-width': 2.5 }, ru);
    for (var k = 0; k <= 110; k++) { var x = 710 + k * 10; S('path', { d: 'M' + x + ' ' + (BY + 8) + 'v' + (k % 10 ? (k % 5 ? 12 : 20) : 30), stroke: '#2C2D31', 'stroke-width': k % 10 ? 1.4 : 2.4 }, ru); if (k % 10 === 0) T({ x: x, y: BY + 64, 'text-anchor': 'middle', fill: '#6C675C', style: 'font:700 20px Inter' }, String(k / 10), ru); }
    var tri = S('g', {}, svg), ext = S('g', {}, svg), wg = S('g', {}, svg), wedges = [];
    [0, 1].forEach(function (k) { var g = S('g', { opacity: 0 }, wg); g._p = S('path', { fill: FILL[k].replace(/[\d.]+\)$/, '.42)'), stroke: COL[k], 'stroke-width': 3, 'stroke-linejoin': 'round' }, g); wedges.push(g); });
    var vA = $('#g2-a'), vB = $('#g2-b'), vC = $('#g2-c'), vX = $('#g2-x'), eX = $('#g2-ex'), eA = $('#g2-ea'), eB = $('#g2-eb'), filled = false;
    function place(g, V, f) { g.setAttribute('transform', 'translate(' + f1(V.x) + ' ' + f1(V.y) + ') rotate(' + f1(-f) + ')'); }
    function render() {
      drawTri(tri, t, { noExt: true });
      ext.textContent = '';
      var Cp = t.p[2], X = 180 - t.a[2];
      S('path', { d: 'M' + f1(t.p[1].x - 60) + ' ' + BY + 'H' + XD, stroke: '#2C2D31', 'stroke-width': 3, 'stroke-linecap': 'round' }, ext);
      S('circle', { cx: XD, cy: BY, r: 7, fill: '#2C2D31' }, ext);
      T({ 'class': 'vn', x: XD + 8, y: BY - 22 }, 'D', ext);
      S('path', { d: sector(Cp, 0, X, 118), fill: 'rgba(31,133,130,.16)' }, ext);
      S('path', { d: arc(Cp, 0, X, 118), fill: 'none', stroke: TEAL, 'stroke-width': 4, 'stroke-dasharray': '10 7' }, ext);
      var lp = at(Cp, X / 2, 168); T({ 'class': 'al', x: f1(lp.x), y: f1(lp.y + 12), 'text-anchor': 'middle' }, X + '°', ext).style.fill = TEAL;
      vA.textContent = eA.textContent = t.a[0] + '°'; vB.textContent = eB.textContent = t.a[1] + '°'; vC.textContent = t.a[2] + '°'; vX.textContent = eX.textContent = X + '°';
      wedges[0]._p.setAttribute('d', torn(t.a[0], R)); wedges[1]._p.setAttribute('d', torn(t.a[1], R));
      if (filled) fillNow();
    }
    /* A's corner starts pointing along AB (180° + β) and ends at C from β to β + α: half a turn. B's corner just slides. */
    function fillNow() { place(wedges[1], t.p[2], 0); place(wedges[0], t.p[2], t.a[1]); wedges.forEach(function (g) { g.setAttribute('opacity', 1); }); }
    function play() {
      filled = true;
      var B = t.p[1], Cp = t.p[2], A = t.p[0], fA = 180 + t.a[1];
      place(wedges[1], B, 0); place(wedges[0], A, fA); wedges.forEach(function (g) { g.setAttribute('opacity', 1); });
      A1.run(2200, function (p) {
        var u = eio(clamp(p / 0.42, 0, 1)), v = eio(clamp((p - 0.45) / 0.55, 0, 1));
        place(wedges[1], lerp(B, Cp, u), 0);
        place(wedges[0], lerp(A, Cp, v), fA - 180 * v);
      }, function () { fillNow(); say('มุม A บวกมุม B เท่ากับมุมภายนอก'); });
    }
    function unfill() { filled = false; wedges.forEach(function (g) { g.setAttribute('opacity', 0); }); }
    var AREA = [720, 250, 1780, BY - 90];
    grab(svg, function () { return t; }, function (i, M) {
      if (!sl.classList.contains('on')) return;
      A1.stop();
      var A = t.p[0], B = t.p[1], Cp = t.p[2], h, ok = false;
      if (i === 0) { M.y = Math.min(M.y, BY - 90); ok = dragVertex(t, 0, M, { area: AREA, min: 160, side: -1 }); }
      else {
        h = BY - A.y;
        var Mx = clamp(M.x, 720, 1640), here = { x: Mx, y: BY };
        if (i === 1) {
          var be = clamp(Math.round(between(sub(Cp, here), sub(A, here))), 10, 170 - t.a[2]), bx = A.x - h / Math.tan(be * D);
          if (bx >= 720 && Cp.x - bx >= 220) { t.p[1] = { x: bx, y: BY }; t.a[1] = be; t.a[0] = 180 - be - t.a[2]; ok = true; }
        } else {
          var ga = clamp(Math.round(between(sub(B, here), sub(A, here))), 10, 170 - t.a[1]), cx = A.x + h / Math.tan(ga * D);
          if (cx <= 1640 && cx - B.x >= 220) { t.p[2] = { x: cx, y: BY }; t.a[2] = ga; t.a[0] = 180 - ga - t.a[1]; ok = true; }
        }
      }
      if (ok) render();
    }, null, 400);
    render();
    return {
      set: function (st, prev) {
        A1.stop();
        if (st === 0) { unfill(); render(); return; }
        if (st === 1 && prev === 0 && !still()) { render(); play(); return; }
        filled = true; render();
      },
      leave: function () { A1.stop(); }
    };
  })();

  /* ============ 3 · which kind? sides (scalene / isosceles / equilateral) and angles (acute / right / obtuse) ============ */
  C['g-type'] = (function () {
    var sl = $('#g-type'), svg = $('#g3-sv'), A1 = Anim(), A2 = Anim(), U = 40;   /* 1 unit = 40 px */
    var AREA = [150, 270, 1250, 940];
    var t = Tri({ x: 280, y: 900 }, { x: 1100, y: 900 }, 40, 75, true);
    var dims = S('g', {}, svg), tri = S('g', {}, svg), cmp = S('g', {}, svg);
    var s1 = $('#g3-s1'), s2 = $('#g3-s2'), lenEl = $('#g3-len'), fb = $('#g3-fb'), last = { k1: '', k2: '', apex: -2 }, moving = false;
    /* side opposite vertex i, by the law of sines from AB: equal angles give exactly equal numbers */
    function sides() { var k = len(sub(t.p[1], t.p[0])) / Math.sin(t.a[2] * D); return [k * Math.sin(t.a[0] * D), k * Math.sin(t.a[1] * D), len(sub(t.p[1], t.p[0]))]; }
    function kind() {
      var a = t.a, eq = a[0] === a[1] && a[1] === a[2], apex = -1;
      if (!eq) for (var i = 0; i < 3; i++) if (a[(i + 1) % 3] === a[(i + 2) % 3]) apex = i;
      var mx = Math.max(a[0], a[1], a[2]);
      return { eq: eq, apex: apex, k1: eq ? 'ด้านเท่า' : apex >= 0 ? 'หน้าจั่ว' : 'ด้านไม่เท่า', k2: mx === 90 ? 'มุมฉาก' : mx > 90 ? 'มุมป้าน' : 'มุมแหลม' };
    }
    function stamp(e, txt) { if (e.textContent !== txt || !e.classList.contains('on')) { e.textContent = txt; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); } }
    function render(quiet) {
      drawTri(tri, t, { noLab: moving });
      dims.textContent = '';
      var L = sides(), K = kind(), P = t.p;
      /* dimension lines outside each side, with the length in units; equal sides get a tick */
      for (var i = 0; i < 3; i++) {
        var a = P[(i + 1) % 3], b = P[(i + 2) % 3], u = mul(sub(b, a), 1 / len(sub(b, a))), n = { x: u.y, y: -u.x };
        var c = mul(add(P[0], add(P[1], P[2])), 1 / 3); if ((n.x * (a.x - c.x) + n.y * (a.y - c.y)) < 0) n = mul(n, -1);
        var o = 46, a2 = add(a, mul(n, o)), b2 = add(b, mul(n, o)), m = lerp(a2, b2, 0.5);
        S('path', { 'class': 'dim', d: 'M' + f1(a.x + n.x * 14) + ' ' + f1(a.y + n.y * 14) + 'L' + f1(a.x + n.x * 56) + ' ' + f1(a.y + n.y * 56) + 'M' + f1(b.x + n.x * 14) + ' ' + f1(b.y + n.y * 14) + 'L' + f1(b.x + n.x * 56) + ' ' + f1(b.y + n.y * 56) + 'M' + f1(a2.x) + ' ' + f1(a2.y) + 'L' + f1(b2.x) + ' ' + f1(b2.y) }, dims);
        [a2, b2].forEach(function (q, j) { var s = j ? -1 : 1, h1 = add(q, add(mul(u, 16 * s), mul(n, 7))), h2 = add(q, add(mul(u, 16 * s), mul(n, -7))); S('path', { d: 'M' + f1(h1.x) + ' ' + f1(h1.y) + 'L' + f1(q.x) + ' ' + f1(q.y) + 'L' + f1(h2.x) + ' ' + f1(h2.y), fill: 'none', stroke: '#6C675C', 'stroke-width': 2 }, dims); });
        var lt = add(m, mul(n, 26)); T({ 'class': 'dimt', x: f1(lt.x), y: f1(lt.y + 9), 'text-anchor': 'middle' }, (L[i] / U).toFixed(1), dims);
        var equal = K.eq || (K.apex >= 0 && i !== K.apex);
        if (equal) { var mm = lerp(a, b, 0.5), t1 = add(mm, mul(n, 16)), t2 = add(mm, mul(n, -16)); S('path', { 'class': 'tk', d: 'M' + f1(t1.x) + ' ' + f1(t1.y) + 'L' + f1(t2.x) + ' ' + f1(t2.y), stroke: TEAL }, tri).style.stroke = TEAL; }
      }
      lenEl.textContent = 'AB = ' + (L[2] / U).toFixed(1) + ' · BC = ' + (L[0] / U).toFixed(1) + ' · CA = ' + (L[1] / U).toFixed(1) + ' หน่วย';
      if (moving) return;
      stamp(s1, K.k1); stamp(s2, K.k2);
      var apex = K.eq ? 2 : K.apex;
      if (apex !== last.apex) { compass(apex, !quiet); last.apex = apex; }
      else if (apex >= 0) compass(apex, false);
      if (sl.classList.contains('b1') && !sl.classList.contains('b2')) { fb.className = 'fb' + (K.eq ? ' ok' : ''); fb.textContent = K.eq ? '✓ ด้านเท่าแล้ว!' : ''; }
      if (K.k1 !== last.k1) say('สามเหลี่ยม' + K.k1 + ' ' + K.k2);
      last.k1 = K.k1;
    }
    /* the compass: needle on the apex, the pencil swings a short mark through each end of the two equal sides
       (both ends lie on one circle round the apex, so the two sides are the same length) */
    function compass(i, anim) {
      A2.stop(); cmp.textContent = '';
      if (i < 0) return;
      var V = t.p[i], ends = [t.p[(i + 1) % 3], t.p[(i + 2) % 3]], r = len(sub(ends[0], V)), SW = Math.min(14, 2600 / r);
      var marks = ends.map(function () { return S('path', { fill: 'none', stroke: TEAL, 'stroke-width': 4, 'stroke-linecap': 'round' }, cmp); });
      var leg = S('g', { opacity: 0 }, cmp), l1 = S('path', { stroke: '#2C2D31', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }, leg), hinge = S('circle', { r: 12, fill: '#2C2D31' }, leg), pen = S('circle', { r: 7, fill: TEAL }, leg);
      function draw(p) {   /* p 0..1: first mark in the first half, second mark in the second half */
        ends.forEach(function (E, k) {
          var q = clamp(p * 2 - k, 0, 1), f = phi(sub(E, V)), a0 = f - SW, a1 = f - SW + 2 * SW * q, A = at(V, a0, r), B = at(V, a1, r);
          marks[k].setAttribute('d', q > 0 ? 'M' + f1(A.x) + ' ' + f1(A.y) + 'A' + f1(r) + ' ' + f1(r) + ' 0 0 0 ' + f1(B.x) + ' ' + f1(B.y) : '');
          if (q > 0 && q < 1 || (k === 1 && q === 1)) {
            var mid = lerp(V, B, 0.5), nn = rot(mul(sub(B, V), 1 / r), -90), H = add(mid, mul(nn, Math.min(150, r * 0.26)));
            l1.setAttribute('d', 'M' + f1(V.x) + ' ' + f1(V.y) + 'L' + f1(H.x) + ' ' + f1(H.y) + 'L' + f1(B.x) + ' ' + f1(B.y));
            hinge.setAttribute('cx', f1(H.x)); hinge.setAttribute('cy', f1(H.y)); pen.setAttribute('cx', f1(B.x)); pen.setAttribute('cy', f1(B.y));
          }
        });
      }
      if (!anim || still()) { draw(1); return; }
      leg.setAttribute('opacity', 1);
      A2.run(1100, function (p) { draw(p); }, function () { leg.setAttribute('opacity', 0); });
    }
    grab(svg, function () { return t; }, function (i, M) {
      if (!sl.classList.contains('on')) return;
      A1.stop(); moving = false;
      if (dragVertex(t, i, M, { area: AREA, min: 200, magnet: true })) render();
    }, null, 400);
    /* show answer: the triangle glides to an equilateral one (labels hide while it moves, so no angle is ever shown wrong) */
    var EQ = Tri({ x: 340, y: 900 }, { x: 1040, y: 900 }, 60, 60, true);
    $('#g3-ans').addEventListener('click', function (e) {
      e.stopPropagation(); A2.stop(); cmp.textContent = '';
      var from = t.p.map(function (p) { return { x: p.x, y: p.y }; });
      moving = true;
      A1.run(800, function (p) {
        var e2 = eio(p); t.p = from.map(function (q, i) { return lerp(q, EQ.p[i], e2); });
        t.a = [0, 1, 2].map(function (i) { return between(sub(t.p[(i + 1) % 3], t.p[i]), sub(t.p[(i + 2) % 3], t.p[i])); });   /* drawing only: labels are hidden while it moves */
        if (p < 1) render();
      },
        function () { moving = false; t = { p: EQ.p.slice(), a: [60, 60, 60] }; render(); });
    });
    var START = Tri({ x: 280, y: 900 }, { x: 1100, y: 900 }, 40, 75, true);
    render(true);
    return {
      set: function (st, prev) {
        A1.stop(); moving = false;
        if (prev < 0 && st === 0) { render(true); return; }
        if (st === 0 && prev > 0) { t = { p: START.p.slice(), a: START.a.slice() }; last.apex = -2; }
        fb.textContent = ''; render(!(prev >= 0 && !still()));
      },
      leave: function () { A1.stop(); A2.stop(); }
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
