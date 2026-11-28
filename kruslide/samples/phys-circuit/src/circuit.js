/* circuit.js · the live electricity of the KruSlide circuit sample (vanilla JS, no libraries, no network).
   A Board is a set of nodes and edges drawn on the blueprint. Edges are fixed parts (battery, ammeter, wire, bulb, switch)
   or dashed slots that take a part dragged from the tray (cell 1.5 V, bulb 6 Ω, switch, wire).
   Every change is solved by nodal analysis (Kirchhoff + Ohm): each cell is an EMF with a tiny internal resistance,
   wires, switches and ammeters are near-zero resistances, an empty slot or an open switch is no connection.
   Bulb brightness follows its power P = I²R (1.5 W = one bulb on 3 V = full). A cell always drives current "forward"
   along its slot (clockwise in the series loop, down the branches in the parallel board). Conventional current flows
   from + to − outside the battery; the moving dots show its direction and speed (faster = more current).
   A source current above 50 A means a short circuit: the board warns and nothing lights.
   Controllers C[slide id] = { set(beat, previous beat or -1), leave() }. ?still (html.rm) = no motion. */
(function () {
  'use strict';
  var root = document.documentElement, NS = 'http://www.w3.org/2000/svg';
  if (!document.getElementById('stage')) return;
  function still() { return root.classList.contains('rm'); }
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  function S(tag, at, parent) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; }
  function T(at, text, parent) { var e = S('text', at, parent); e.textContent = text; return e; }
  function H(tag, cls, text, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function eo(t) { return 1 - Math.pow(1 - t, 3); }
  function eio(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function fx(v, d) { var s = Math.abs(v).toFixed(d); return (v < 0 && +s !== 0 ? '−' : '') + s; }   /* real minus sign */
  function tap(el, fn) { el.addEventListener('click', function (e) { e.stopPropagation(); fn(e); }); }

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
  /* drag anywhere on el (an <svg> with a viewBox, or an HTML box); fn(x, y, phase, e) in el's own unscaled units.
     Pointer capture keeps the drag alive outside the element; the pen and right clicks are ignored.
     fn returning false on 'start' declines the drag (the pointer goes on to whatever is under it). */
  function drag(el, fn) {
    var pid = null;
    function loc(e) {
      var r = el.getBoundingClientRect(), vb = el.viewBox && el.viewBox.baseVal;
      var W = vb && vb.width ? vb.width : el.offsetWidth, H = vb && vb.height ? vb.height : el.offsetHeight;
      return { x: (vb ? vb.x : 0) + (e.clientX - r.left) * W / (r.width || 1), y: (vb ? vb.y : 0) + (e.clientY - r.top) * H / (r.height || 1) };
    }
    el.addEventListener('pointerdown', function (e) {
      if (root.classList.contains('pen-on') || (e.pointerType === 'mouse' && e.button !== 0) || pid !== null) return;
      var p = loc(e); if (fn(p.x, p.y, 'start', e) === false) return;
      pid = e.pointerId; try { el.setPointerCapture(pid); } catch (er) {}
      if (e.cancelable) e.preventDefault();
    });
    el.addEventListener('pointermove', function (e) { if (e.pointerId !== pid) return; var p = loc(e); fn(p.x, p.y, 'move', e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) {
      el.addEventListener(t, function (e) { if (e.pointerId === pid) { pid = null; var p = loc(e); fn(p.x, p.y, t === 'pointerup' ? 'end' : 'cancel', e); } });
    });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    return { loc: loc };
  }
  /* a slider: drag anywhere on the track element (its whole band); onv(value) gets min..max rounded to step.
     inner = the element whose left/width map to min/max. Up/Down keys step it (Left/Right stay with the deck). */
  function slider(track, inner, min, max, step, onv) {
    drag(track, function (x, y, ph) {
      if (ph === 'cancel') return;
      var r = (x - inner.offsetLeft) / (inner.offsetWidth || 1), v = min + clamp(r, 0, 1) * (max - min);
      onv(Math.round(v / step) * step);
    });
    track.tabIndex = 0;
    track.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault(); e.stopPropagation();
      onv(clamp(+track.getAttribute('aria-valuenow') + (e.key === 'ArrowUp' ? step : -step), min, max));
    });
  }
  var R_BULB = 6, E_CELL = 1.5, R_TINY = 1e-6, P_FULL = 1.5;
  var NAME = { cell: 'เซลล์ไฟฟ้า', bat: 'แบตเตอรี่', bulb: 'หลอดไฟ', sw: 'สวิตช์', wire: 'สายไฟ', amm: 'แอมมิเตอร์' };
  function fA(i) { i = Math.abs(i); return i.toFixed(Math.abs(i * 100 - Math.round(i * 100)) < 0.02 ? 2 : 3); }
  function fV(v) { v = Math.abs(v); return v.toFixed(Math.abs(v * 10 - Math.round(v * 10)) < 0.02 ? 1 : 2); }

  /* ---------------- nodal analysis: G·V = J with node 0 as ground ---------------- */
  function solve(n, els) {
    var G = [], J = [], i, j;
    for (i = 0; i < n; i++) { G.push(new Array(n).fill(0)); J.push(0); G[i][i] = 1e-9; }
    els.forEach(function (e) {
      var g = 1 / e.r; G[e.a][e.a] += g; G[e.b][e.b] += g; G[e.a][e.b] -= g; G[e.b][e.a] -= g;
      if (e.E) { J[e.b] += e.E * g; J[e.a] -= e.E * g; }
    });
    /* drop the ground row/column and solve by Gaussian elimination with partial pivoting */
    var m = n - 1, A = [];
    for (i = 1; i < n; i++) { A.push(G[i].slice(1).concat([J[i]])); }
    for (i = 0; i < m; i++) {
      var p = i; for (j = i + 1; j < m; j++) if (Math.abs(A[j][i]) > Math.abs(A[p][i])) p = j;
      var t = A[i]; A[i] = A[p]; A[p] = t;
      for (j = i + 1; j < m; j++) { var f = A[j][i] / A[i][i]; if (!f) continue; for (var k = i; k <= m; k++) A[j][k] -= f * A[i][k]; }
    }
    var V = new Array(n).fill(0);
    for (i = m - 1; i >= 0; i--) { var s = A[i][m]; for (j = i + 1; j < m; j++) s -= A[i][j] * V[j + 1]; V[i + 1] = s / A[i][i]; }
    els.forEach(function (e) { e.I = (V[e.a] - V[e.b]) / e.r + (e.E ? e.E / e.r : 0); });
    return V;
  }

  /* ---------------- schematic symbols, drawn horizontally around (0,0); half-length 60 ---------------- */
  function sym(g, t, o) {
    o = o || {};
    if (t === 'wire') { S('line', { 'class': 'w', x1: -60, x2: 60, y1: 0, y2: 0 }, g); return; }
    if (t === 'cell') {
      S('line', { 'class': 'w', x1: -60, x2: -7, y1: 0, y2: 0 }, g); S('line', { 'class': 'w', x1: 7, x2: 60, y1: 0, y2: 0 }, g);
      S('line', { 'class': 'w thick', x1: -7, x2: -7, y1: -15, y2: 15 }, g); S('line', { 'class': 'w', x1: 7, x2: 7, y1: -30, y2: 30 }, g);
      return;
    }
    if (t === 'bat') {
      S('line', { 'class': 'w', x1: -60, x2: -31, y1: 0, y2: 0 }, g); S('line', { 'class': 'w', x1: 31, x2: 60, y1: 0, y2: 0 }, g);
      [-24, 10].forEach(function (x) { S('line', { 'class': 'w thick', x1: x - 7, x2: x - 7, y1: -15, y2: 15 }, g); S('line', { 'class': 'w', x1: x + 7, x2: x + 7, y1: -30, y2: 30 }, g); });
      S('line', { 'class': 'w dash', x1: -16, x2: 2, y1: 0, y2: 0 }, g);
      return;
    }
    if (t === 'bulb') {
      g._glow = S('g', { 'class': 'glow' }, g);
      g._fill = S('circle', { 'class': 'bfill', r: 26 }, g);
      S('line', { 'class': 'w', x1: -60, x2: -26, y1: 0, y2: 0 }, g); S('line', { 'class': 'w', x1: 26, x2: 60, y1: 0, y2: 0 }, g);
      if (o.out) { S('circle', { 'class': 'w socket', r: 26 }, g); return; }
      S('circle', { 'class': 'w', r: 26 }, g);
      S('path', { 'class': 'w', d: 'M-18 -18 L18 18 M18 -18 L-18 18' }, g);
      return;
    }
    if (t === 'sw') {
      S('line', { 'class': 'w', x1: -60, x2: -26, y1: 0, y2: 0 }, g); S('line', { 'class': 'w', x1: 26, x2: 60, y1: 0, y2: 0 }, g);
      S('circle', { 'class': 'w node', cx: -26, cy: 0, r: 5 }, g); S('circle', { 'class': 'w node', cx: 26, cy: 0, r: 5 }, g);
      g._lever = S('line', { 'class': 'w lever', x1: -26, y1: 0, x2: 26, y2: 0 }, g);
      g._lever.style.transformOrigin = '-26px 0px';
      g._lever.style.transform = o.on ? 'rotate(0deg)' : 'rotate(-32deg)';
      return;
    }
    if (t === 'amm' || t === 'volt') {
      var r = o.small ? 22 : 26;
      if (!o.bare) { S('line', { 'class': 'w', x1: -60, x2: -r, y1: 0, y2: 0 }, g); S('line', { 'class': 'w', x1: r, x2: 60, y1: 0, y2: 0 }, g); }
      S('circle', { 'class': 'w meter', r: r }, g);
    }
  }

  /* ---------------- a Board ---------------- */
  function Board(svg, spec) {
    var N = spec.nodes, E = spec.edges, tray = spec.tray || [], api = { sel: spec.sel || 0, onupdate: null };
    var W = +svg.getAttribute('viewBox').split(' ')[2];
    S('rect', { x: 0, y: 0, width: W, height: +svg.getAttribute('viewBox').split(' ')[3], fill: 'transparent' }, svg);
    var gT = S('g', { 'class': 'trayg' }, svg), gE = S('g', {}, svg), gF = S('g', { 'class': 'flows' }, svg), gN = S('g', {}, svg), gM = S('g', {}, svg), gL = S('g', {}, svg), gH = S('g', {}, svg);
    var counts = {}, ids = { bulb: 0 };
    E.forEach(function (e, k) {
      e.k = k; var A = N[e.a], B = N[e.b];
      e.len = Math.hypot(B[0] - A[0], B[1] - A[1]); e.u = [(B[0] - A[0]) / e.len, (B[1] - A[1]) / e.len];
      e.mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; e.ang = Math.atan2(e.u[1], e.u[0]) * 180 / Math.PI;
      e.half = e.t === 'amm' && e.small ? 36 : 60;
      e.g = S('g', { 'class': 'edge' + (e.t === 'slot' ? ' slotted' : ''), 'data-edge': k }, gE);
      if (e.t === 'bulb' || e.t === 'sw') e.part = { t: e.t, on: e.t === 'sw' ? e.on !== false : true, id: e.id, fixed: true };
    });
    /* junction dots where three or more wires meet */
    var deg = N.map(function () { return 0; }); E.forEach(function (e) { deg[e.a]++; deg[e.b]++; });
    N.forEach(function (p, i) { if (deg[i] >= 3) S('circle', { 'class': 'jdot', cx: p[0], cy: p[1], r: 7 }, gN); });

    /* tray */
    var TR = {};
    tray.forEach(function (it, i) {
      var t = it[0], y = it[2], g = S('g', { 'class': 'tray-it', 'data-tray': t, transform: 'translate(114,' + y + ')' }, gT);
      S('rect', { 'class': 'tray-b', x: -94, y: -62, width: 188, height: 124, rx: 4 }, g);
      var sg = S('g', { transform: 'translate(0,-8) scale(.92)' }, g); sym(sg, t, { on: true });
      var lab = T({ 'class': 'tray-t', x: 0, y: 48, 'text-anchor': 'middle' }, NAME[t] + (t === 'cell' ? ' 1.5 V' : t === 'bulb' ? ' 6 Ω' : ''), g);
      var cnt = T({ 'class': 'tray-n', x: 86, y: -40, 'text-anchor': 'end' }, '', g);
      counts[t] = it[1]; TR[t] = { g: g, cnt: cnt, max: it[1] };
    });
    if (tray.length) T({ 'class': 'tray-h', x: 114, y: 34, 'text-anchor': 'middle' }, 'กล่องชิ้นส่วน', gT);
    function trayCounts() { Object.keys(TR).forEach(function (t) { TR[t].cnt.textContent = '×' + counts[t]; TR[t].g.classList.toggle('empty', counts[t] <= 0); }); }

    /* drawing one edge */
    function seg(a, b) { return 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1); }
    function pt(e, d) { return [e.mid[0] + e.u[0] * d, e.mid[1] + e.u[1] * d]; }
    function kind(e) { return e.t === 'slot' ? (e.part ? e.part.t : null) : e.t; }
    function drawEdge(e) {
      var g = e.g; g.textContent = ''; var A = N[e.a], B = N[e.b], t = kind(e);
      if (t === 'wire' || !t) {
        if (t === 'wire') S('path', { 'class': 'w', d: seg(A, B) }, g);
        else {   /* empty slot: leads + dashed box */
          S('path', { 'class': 'w', d: seg(A, pt(e, -76)) + seg(pt(e, 76), B) }, g);
          var bx = S('g', { transform: 'translate(' + e.mid[0] + ',' + e.mid[1] + ') rotate(' + e.ang + ')' }, g);
          S('rect', { 'class': 'slotbox', x: -76, y: -44, width: 152, height: 88, rx: 4 }, bx);
          T({ 'class': 'slot-plus', x: e.mid[0], y: e.mid[1] + 12, 'text-anchor': 'middle' }, '+', g);
        }
      } else {
        S('path', { 'class': 'w', d: seg(A, pt(e, -e.half)) + seg(pt(e, e.half), B) }, g);
        var c = S('g', { 'class': 'comp c-' + t, transform: 'translate(' + e.mid[0] + ',' + e.mid[1] + ') rotate(' + e.ang + ')' }, g);
        var o = { on: e.part ? e.part.on : true, small: e.small, out: e.part && e.part.out };
        if (e.half !== 60) { var sc = S('g', { transform: 'scale(' + (e.half / 60) + ')' }, c); sym(sc, t, o); c._s = sc; } else sym(c, t, o);
        e.c = c.firstChild && c._s ? c._s : c;
        if (t === 'amm') T({ 'class': 'sym-t', x: e.mid[0], y: e.mid[1] + 9, 'text-anchor': 'middle' }, 'A', g);
        if (e.part && !e.part.fixed && e.t === 'slot') { var hit = S('rect', { 'class': 'grab', x: -70, y: -46, width: 140, height: 92 }, c); hit.setAttribute('fill', 'transparent'); }
        if (e.part && (t === 'bulb' || t === 'sw') && e.t !== 'slot') { var hit2 = S('rect', { x: -66, y: -46, width: 132, height: 92, fill: 'transparent' }, c); }
      }
      g.classList.toggle('picked', api.sel === e.k);
    }
    function labelEdge(e, txt, cls) {
      if (!txt) return;
      var sd = e.lside || e.side, off = sd === 'up' ? [0, -58] : sd === 'down' ? [0, 74] : sd === 'left' ? [-62, 8] : [62, 8];
      T({ 'class': 'lab ' + (cls || ''), x: e.mid[0] + off[0], y: e.mid[1] + off[1], 'text-anchor': sd === 'left' ? 'end' : sd === 'right' ? 'start' : 'middle' }, txt, gL);
    }

    /* solve + paint */
    var last = null;
    function update() {
      var els = [], open = [], swOpen = false, cells = 0;
      E.forEach(function (e) {
        var t = kind(e), p = e.part;
        e.el = null;
        if (!t) { if (e.t === 'slot') open.push(e); return; }
        if (t === 'sw' && !p.on) { swOpen = true; return; }
        if (t === 'bulb' && p && p.out) { open.push(e); return; }
        var el = { a: e.a, b: e.b, r: t === 'bulb' ? R_BULB : t === 'cell' ? R_TINY : t === 'bat' ? 2 * R_TINY : R_TINY, E: t === 'cell' ? E_CELL : t === 'bat' ? 2 * E_CELL : 0, e: e };
        if (t === 'cell') cells++; if (t === 'bat') cells += 2;
        e.el = el; els.push(el);
      });
      var V = solve(N.length, els);
      var short = els.some(function (el) { return el.E && Math.abs(el.I) > 50; });
      var src = els.filter(function (el) { return el.E; }), Isrc = src.length ? Math.max.apply(null, src.map(function (el) { return Math.abs(el.I); })) : 0;
      last = { V: V, short: short, open: open, swOpen: swOpen, cells: cells, I: Isrc };
      gL.textContent = ''; gF.textContent = '';
      E.forEach(function (e) {
        drawEdge(e);
        var t = kind(e), I = e.el && !short ? e.el.I : 0;
        e.I = I;
        if (t === 'bulb' && e.c) {
          var P = I * I * R_BULB, b = clamp(P / P_FULL, 0, 1.3), on = b > 0.004;
          e.c._fill.style.fillOpacity = on ? (0.22 + 0.78 * Math.min(1, b)).toFixed(3) : 0;
          e.g.classList.toggle('lit', on);
          if (on) for (var r = 0; r < 8; r++) {
            var a = (r * 45 + 22.5) * Math.PI / 180, L = 6 + 20 * Math.sqrt(Math.min(1.3, b));
            S('line', { 'class': 'ray', x1: Math.cos(a) * 34, y1: Math.sin(a) * 34, x2: Math.cos(a) * (34 + L), y2: Math.sin(a) * (34 + L) }, e.c._glow).style.opacity = (0.35 + 0.65 * Math.min(1, b)).toFixed(2);
          }
          labelEdge(e, (e.part && e.part.id ? 'หลอด ' + e.part.id : 'หลอด') + (e.part && e.part.out ? ' (ถอดออก)' : ''), on ? 'lit' : '');
        }
        if (t === 'cell') labelEdge(e, '1.5 V');
        if (t === 'bat') { labelEdge(e, '3.0 V'); e.g.classList.toggle('hot', short); }
        if (t === 'sw') labelEdge(e, (spec.shortLab ? '' : 'สวิตช์') + (e.part.on ? 'ปิด' : 'เปิด'), e.part.on ? '' : 'warn');
        if (t === 'amm') labelEdge(e, short ? '— A' : fA(I) + ' A', 'meter-t');
        /* moving dots along the wire parts of this edge, in the direction of the current */
        if (Math.abs(I) > 0.004) {
          var A2 = N[e.a], B2 = N[e.b], h = (t === 'wire' ? 0 : e.half), fwd = I > 0;
          var parts = t === 'wire' ? [[A2, B2]] : [[A2, pt(e, -h)], [pt(e, h), B2]];
          var dur = clamp(24 / (150 * Math.abs(I)), 0.08, 3).toFixed(3) + 's';
          parts.forEach(function (q) {
            var p0 = fwd ? q[0] : q[1], p1 = fwd ? q[1] : q[0];
            if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < 8) return;
            var f = S('path', { 'class': 'flow', d: seg(p0, p1) }, gF); f.style.animationDuration = dur;
            var mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2, ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180 / Math.PI;
            if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 70) S('path', { 'class': 'chev', d: 'M-8 -9 L4 0 L-8 9', transform: 'translate(' + mx.toFixed(1) + ',' + my.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')' }, gF);
          });
        }
      });
      meter();
      trayCounts();
      if (api.onupdate) api.onupdate(last);
    }
    /* the voltmeter clipped across the selected edge */
    function meter() {
      gM.textContent = ''; var e = E[api.sel]; if (!e) return;
      var sd = e.mside || e.side, off = sd === 'up' ? [0, -1] : sd === 'down' ? [0, 1] : sd === 'left' ? [-1, 0] : [1, 0], D = sd === 'up' || sd === 'down' ? 100 : 110;
      if (e.mdist) D = e.mdist;
      var c = [e.mid[0] + off[0] * D, e.mid[1] + off[1] * D], h = e.half + 6, p1 = pt(e, -h), p2 = pt(e, h);
      var q1 = [c[0] - (off[1] ? 26 : 0) * 1 + (off[0] ? 0 : 0), c[1]], q2 = [c[0] + 26, c[1]];
      if (off[0]) { q1 = [c[0], c[1] - 26]; q2 = [c[0], c[1] + 26]; } else { q1 = [c[0] - 26, c[1]]; q2 = [c[0] + 26, c[1]]; }
      var l1 = e.u[0] < 0 || e.u[1] < 0 ? p2 : p1, l2 = l1 === p1 ? p2 : p1;
      S('path', { 'class': 'probe', d: 'M' + q1[0] + ' ' + q1[1] + ' Q' + (q1[0] + l1[0]) / 2 + ' ' + (q1[1] + l1[1]) / 2 + ' ' + l1[0] + ' ' + l1[1] }, gM);
      S('path', { 'class': 'probe', d: 'M' + q2[0] + ' ' + q2[1] + ' Q' + (q2[0] + l2[0]) / 2 + ' ' + (q2[1] + l2[1]) / 2 + ' ' + l2[0] + ' ' + l2[1] }, gM);
      S('circle', { 'class': 'probe-tip', cx: l1[0], cy: l1[1], r: 6 }, gM); S('circle', { 'class': 'probe-tip', cx: l2[0], cy: l2[1], r: 6 }, gM);
      var mg = S('g', { transform: 'translate(' + c[0] + ',' + c[1] + ')' }, gM);
      S('circle', { 'class': 'vm', r: 30 }, mg); T({ 'class': 'sym-t', y: 10, 'text-anchor': 'middle' }, 'V', mg);
      var v = last ? Math.abs(last.V[e.a] - last.V[e.b]) : 0;
      if (last && last.short) v = 0;
      T({ 'class': 'vm-t', x: off[0] ? 0 : 44, y: off[0] ? 58 : 9, 'text-anchor': off[0] ? 'middle' : 'start' }, fV(v) + ' V', mg);
      api.vsel = v;
    }

    /* ---------------- pointer: drag parts from the tray / between slots; tap = switch + voltmeter ---------------- */
    var held = null, press = null;
    function nearestSlot(x, y) {
      var best = null, bd = 120;
      E.forEach(function (e) { if (e.t !== 'slot') return; var d = Math.hypot(e.mid[0] - x, e.mid[1] - y); if (d < bd) { bd = d; best = e; } });
      return best;
    }
    function float(t, x, y) { var g = S('g', { 'class': 'held c-' + t }, gH); sym(g, t, { on: true }); g.setAttribute('transform', 'translate(' + x + ',' + y + ')'); return g; }
    function hover(e) { E.forEach(function (q) { q.g.classList.toggle('snap', q === e); }); }
    drag(svg, function (x, y, ph, ev) {
      if (ph === 'start') {
        var tg = ev.target && ev.target.closest ? ev.target.closest('[data-tray],[data-edge]') : null;
        if (!tg) return false;
        press = { x: x, y: y, tray: tg.dataset.tray, edge: tg.dataset.edge != null ? E[+tg.dataset.edge] : null, moved: false };
        if (press.tray && counts[press.tray] <= 0) { press = null; return false; }
        return true;
      }
      if (!press) return;
      if (ph === 'move') {
        if (!press.moved && Math.hypot(x - press.x, y - press.y) > 10) {
          press.moved = true;
          if (press.tray) { counts[press.tray]--; held = { t: press.tray, g: float(press.tray, x, y) }; if (press.tray === 'bulb') held.id = nextBulb(); trayCounts(); }
          else if (press.edge && press.edge.t === 'slot' && press.edge.part) { var p = press.edge.part; press.edge.part = null; held = { t: p.t, id: p.id, on: p.on, g: float(p.t, x, y), from: press.edge }; update(); }
        }
        if (held) { held.g.setAttribute('transform', 'translate(' + x + ',' + y + ')'); hover(nearestSlot(x, y)); }
        return;
      }
      var pr = press; press = null; hover(null);
      if (held) {
        var h = held; held = null; h.g.remove();
        var s = ph === 'end' ? nearestSlot(x, y) : null;
        if (s) { if (s.part) back(s.part); s.part = { t: h.t, id: h.id, on: h.t === 'sw' ? (h.on !== false) : true }; if (h.t === 'sw' && h.on === undefined) s.part.on = true; api.sel = s.k; }
        else back(h);
        update(); return;
      }
      if (ph === 'end' && pr && pr.edge && !pr.moved) tapEdge(pr.edge);
    });
    function nextBulb() { var used = []; E.forEach(function (e) { if (e.part && e.part.t === 'bulb') used.push(e.part.id); }); for (var i = 1; i < 9; i++) if (used.indexOf(i) < 0) return i; return 1; }
    function back(p) { counts[p.t] = Math.min((TR[p.t] || { max: 99 }).max, (counts[p.t] || 0) + 1); }
    function tapEdge(e) {
      var t = kind(e);
      if (t === 'sw') e.part.on = !e.part.on;
      if (t === 'bulb' && spec.unscrew) e.part.out = !e.part.out;
      if (t || e.t !== 'slot') api.sel = e.k;
      update();
    }
    api.place = function (k, t, extra) {   /* used by the demos: put part t in slot k (taking it from the tray) */
      var e = E[k]; if (e.part) back(e.part);
      if (counts[t] > 0) counts[t]--;
      e.part = { t: t, id: t === 'bulb' ? nextBulb() : 0, on: true };
      if (extra) for (var q in extra) e.part[q] = extra[q];
    };
    api.clear = function () { E.forEach(function (e) { if (e.t === 'slot' && e.part) { back(e.part); e.part = null; } }); api.sel = spec.sel || 0; update(); };
    api.edge = function (k) { return E[k]; };
    api.update = update; api.state = function () { return last; }; api.E = E;
    api.flip = function (k, on) { var e = E[k]; if (e.part && e.part.t === 'sw') { e.part.on = on; update(); } };
    trayCounts(); update();
    return api;
  }

  /* side panel readouts */
  function panel(side) { var o = {}; $$('[data-r]', side).forEach(function (el) { o[el.dataset.r] = el; }); return o; }
  function explain(B, P, e, st, extra) {
    var t = e.t === 'slot' ? (e.part ? e.part.t : null) : e.t, v = B.vsel;
    P.vw.textContent = 'คร่อม' + (t === 'bulb' ? (e.part && e.part.id ? 'หลอด ' + e.part.id : 'หลอด') : t ? NAME[t] : 'ช่องว่าง');
    P.v.textContent = fV(v) + ' V';
    var o = '';
    if (st.short) o = 'กระแสไหลผ่านทางที่ไม่มีหลอด (ความต้านทานเกือบ 0) ได้มากมาก หลอดทุกดวงจึงดับ';
    else if (t === 'bulb' && Math.abs(e.I) > 0.004) o = 'กฎของโอห์ม V = I × R<br><b>' + fV(v) + ' V</b> = <b>' + fA(e.I) + ' A</b> × <b>6 Ω</b>';
    else if (t === 'bulb') o = 'ไม่มีกระแสผ่านหลอดนี้ จึงไม่สว่าง';
    else if (t === 'sw' && !e.part.on) o = 'สวิตช์เปิด: วัดแรงดันคร่อมได้ <b>' + fV(v) + ' V</b> แต่ไม่มีกระแส';
    else if (t === 'cell' || t === 'bat') o = (t === 'bat' ? 'แบตเตอรี่ 2 เซลล์ ' : 'เซลล์ไฟฟ้า ') + 'แรงดัน <b>' + fV(v) + ' V</b>' + (st.I > 0.004 ? ' จ่ายกระแส <b>' + fA(st.I) + ' A</b>' : '');
    else if (t) o = NAME[t] + ': แรงดันคร่อมเกือบ <b>0 V</b>';
    else o = 'ช่องว่าง: ใส่ชิ้นส่วนก่อน';
    P.ohm.innerHTML = o;
    var s, cls = '';
    if (st.short) { s = '⚠ ลัดวงจร! กระแสไหลผ่านสายไฟโดยไม่ผ่านหลอด อันตราย'; cls = 'warn'; }
    else if (st.I > 0.004) { s = 'วงจรปิด · มีกระแสไหล'; cls = 'ok'; }
    else if (!st.cells) s = 'ยังไม่มีเซลล์ไฟฟ้า';
    else if (extra && extra.loop && st.open.length) s = 'วงจรเปิด · ยังมีช่องว่าง ' + st.open.length + ' ช่อง';
    else if (st.swOpen) s = 'วงจรเปิด · สวิตช์เปิดอยู่';
    else s = 'วงจรเปิด · ไม่มีทางให้กระแสไหลครบรอบ';
    P.st.textContent = s; P.st.className = 'tb-st ' + cls;
  }

  var C = {};

  /* ============ 1 · series board ============ */
  C['k-series'] = (function () {
    var nodes = [[360, 130], [700, 130], [1040, 130], [1040, 610], [700, 610], [360, 610]];
    var B = Board($('#k1-svg'), {
      nodes: nodes, sel: 0,
      edges: [{ a: 5, b: 0, t: 'slot', side: 'left', lside: 'right', mdist: 92 }, { a: 0, b: 1, t: 'slot', side: 'up', lside: 'down' }, { a: 1, b: 2, t: 'slot', side: 'up', lside: 'down' },
        { a: 2, b: 3, t: 'slot', side: 'right', lside: 'left' }, { a: 3, b: 4, t: 'amm', side: 'down', lside: 'up' }, { a: 4, b: 5, t: 'slot', side: 'down', lside: 'up' }],
      tray: [['cell', 2, 118], ['bulb', 3, 300], ['sw', 1, 482], ['wire', 3, 664]]
    });
    var P = panel($('#k1-side'));
    B.onupdate = function (st) { P.a0.textContent = st.short ? '— A' : fA(st.I) + ' A'; explain(B, P, B.E[B.sel], st, { loop: true }); };
    B.update();
    $$('#k1-side [data-a]').forEach(function (b) { tap(b, function () { if (b.dataset.a === 'reset') B.clear(); else demo(); }); });
    function demo() { B.clear(); B.place(0, 'cell'); B.place(5, 'cell'); B.place(1, 'bulb'); B.place(2, 'bulb'); B.place(3, 'sw'); B.sel = 1; B.update(); }
    return {
      set: function (st, prev) {
        if (st === 1 && prev !== 2) demo();
        if (st === 2) { if (prev !== 1) demo(); B.sel = 3; B.flip(3, false); }
        if (st === 1 && prev === 2) { B.flip(3, true); B.sel = 1; B.update(); }
      },
      leave: function () {}
    };
  })();

  /* ============ 2 · parallel board ============ */
  C['k-par'] = (function () {
    var xs = [520, 800, 1080], nodes = [[340, 640], [340, 120]];   /* 0 = B0 (−), 1 = T0 (+) */
    xs.forEach(function (x) { nodes.push([x, 120], [x, 300], [x, 480], [x, 640]); });   /* per branch: T, U, D, B */
    var edges = [{ a: 0, b: 1, t: 'bat', side: 'right', lside: 'left' }, { a: 1, b: 2, t: 'amm', side: 'up', lside: 'down' }, { a: 2, b: 6, t: 'wire' }, { a: 6, b: 10, t: 'wire' }];
    xs.forEach(function (x, i) {
      var T0 = 2 + i * 4;
      edges.push({ a: T0, b: T0 + 1, t: 'slot', side: 'left', lside: 'right' }, { a: T0 + 1, b: T0 + 2, t: 'slot', side: 'left', lside: 'right' }, { a: T0 + 2, b: T0 + 3, t: 'amm', small: true, side: 'left', lside: 'right' });
    });
    edges.push({ a: 13, b: 9, t: 'wire' }, { a: 9, b: 5, t: 'wire' }, { a: 5, b: 0, t: 'wire' });
    var B = Board($('#k2-svg'), { nodes: nodes, edges: edges, sel: 0, shortLab: true, tray: [['bulb', 3, 150], ['sw', 3, 360], ['wire', 3, 570]] });
    var P = panel($('#k2-side')), AMM = [1, 6, 9, 12];
    B.onupdate = function (st) {
      P.a0.textContent = st.short ? '— A' : fA(B.E[1].I) + ' A';
      ['a1', 'a2', 'a3'].forEach(function (k, i) { P[k].textContent = st.short ? '—' : fA(B.E[AMM[i + 1]].I); });
      explain(B, P, B.E[B.sel], st, { loop: false });
    };
    B.update();
    $$('#k2-side [data-a]').forEach(function (b) { tap(b, function () { if (b.dataset.a === 'reset') B.clear(); else demo(); }); });
    function demo() { B.clear(); B.place(4, 'bulb'); B.place(5, 'sw'); B.place(7, 'bulb'); B.place(8, 'sw'); B.sel = 7; B.update(); }
    return {
      set: function (st, prev) {
        if (st === 1 && prev !== 2) demo();
        if (st === 2) { if (prev !== 1) demo(); B.flip(5, false); B.sel = 7; B.update(); }
        if (st === 1 && prev === 2) { B.flip(5, true); }
      },
      leave: function () {}
    };
  })();

  /* ============ 3 · series vs parallel, tap a bulb to unscrew it ============ */
  C['k-cmp'] = (function () {
    var A = Board($('#k3a-svg'), {
      nodes: [[120, 330], [120, 80], [420, 80], [720, 80], [720, 330], [420, 330]], unscrew: true, sel: 1,
      edges: [{ a: 0, b: 1, t: 'bat', side: 'left' }, { a: 1, b: 2, t: 'bulb', id: 1, side: 'up', lside: 'down', mdist: 86 }, { a: 2, b: 3, t: 'bulb', id: 2, side: 'up', lside: 'down', mdist: 86 },
        { a: 3, b: 4, t: 'wire' }, { a: 4, b: 5, t: 'amm', side: 'down', lside: 'up' }, { a: 5, b: 0, t: 'wire' }]
    });
    var Bp = Board($('#k3b-svg'), {
      nodes: [[120, 330], [120, 80], [320, 80], [520, 80], [740, 80], [520, 330], [740, 330], [320, 330]], unscrew: true, sel: 4,
      edges: [{ a: 0, b: 1, t: 'bat', side: 'left' }, { a: 1, b: 2, t: 'amm', side: 'up', lside: 'down' }, { a: 2, b: 3, t: 'wire' }, { a: 3, b: 4, t: 'wire' },
        { a: 3, b: 5, t: 'bulb', id: 1, side: 'left', lside: 'right' }, { a: 4, b: 6, t: 'bulb', id: 2, side: 'left', lside: 'right' }, { a: 6, b: 5, t: 'wire' }, { a: 5, b: 7, t: 'wire' }, { a: 7, b: 0, t: 'wire' }]
    });
    [A, Bp].forEach(function (b) { b.E.forEach(function (e) { if (e.t === 'bulb') e.part.fixed = false; }); b.update(); });
    function reset() { [A, Bp].forEach(function (b) { b.E.forEach(function (e) { if (e.part) e.part.out = false; }); b.update(); }); }
    return { set: function (st, prev) { if (prev < 0) reset(); var w = $('#k3-in').__w; if (st === 1 && w) w.show(); else if (prev === 1 && w) w.hide(); }, leave: function () {} };
  })();

  /* ============ wiring: deck:change -> controller.set(beat, previous beat or -1 on entering) ============ */
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
  window.__circ = { C: C, solve: solve };
})();
