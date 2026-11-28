/* app.js · KruSlide sample math-equation-balance ("playful balance scale").
   One Scale component drives all three slides. A teal box is the unknown x (its hidden weight is the solution of the
   slide's equation), a coral weight is 1. The beam is a damped spring: it swings to an angle set by the difference in
   weight and settles, so an unbalanced scale tips physically. The equation and the scratch paper are worked out from
   the counts on the pans; a step is written down only when the scale is level again.
   Every slide has a controller C[id] = { set(st, prev), leave() } (the calculus pattern); prev = -1 when the slide was
   just entered or jumped to. ?still / reduced motion (html.rm): no swinging, no flights, final states.
   Drags and taps use pointer events (mouse, pen, touch) and never change the slide. */
(function () {
  'use strict';
  var root = document.documentElement, stage = document.getElementById('stage'), NS = 'http://www.w3.org/2000/svg';
  if (!stage) return;
  var D = Math.PI / 180, NAVY = '#1F2A5C', TEAL = '#0E9E9E', CORAL = '#FF6B57', CREAM = '#FFF8E7';
  function still() { return root.classList.contains('rm'); }
  function $(s, c) { return (c || document).querySelector(s); }
  function S(tag, at, p) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (p) p.appendChild(e); return e; }
  function T(at, text, p) { var e = S('text', at, p); e.textContent = text; return e; }
  function el(tag, cls, txt, p) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (p) p.appendChild(e); return e; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function penOn() { return root.classList.contains('pen-on'); }
  function eo(t) { return 1 - Math.pow(1 - t, 3); }
  function Seq() { var ts = []; return { at: function (ms, f) { ts.push(setTimeout(f, ms)); }, clear: function () { ts.forEach(clearTimeout); ts = []; } }; }
  var live = el('div', 'sr', null, document.body); live.setAttribute('aria-live', 'polite');
  function say(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }

  /* ---------- writing equations: 3x + 2, with a teal x ---------- */
  function side(s) {
    var p = [];
    if (s.x) p.push((s.x > 1 ? s.x : '') + '<i class="vx">x</i>');
    if (s.u || !s.x) p.push(String(s.u));
    return p.join(' + ');
  }
  function plain(s) { var p = []; if (s.x) p.push((s.x > 1 ? s.x : '') + 'x'); if (s.u || !s.x) p.push(String(s.u)); return p.join(' + '); }
  function eqHTML(st, X) { var ok = st.L.x * X + st.L.u === st.R.x * X + st.R.u; return side(st.L) + (ok ? ' = ' : ' <span class="ne">=</span> ') + side(st.R); }

  /* ================= the scale ================= */
  /* o: {svg, px, py (pivot), half (beam half-length), hang (beam end to pan), X (hidden weight of x), L, R (start counts),
         bins: [{k:'x'|'u', x, y}], onchange(state), k (size factor)} */
  function Scale(o) {
    var svg = o.svg, k = o.k || 1, BX = 66 * k, UD = 52 * k, GAP = 8 * k, PW = 330 * k, MAXT = 14, KT = 2.6;
    var th = 0, om = 0, raf = 0, last = 0, items = [], sides = [{ x: [], u: [] }, { x: [], u: [] }], groups = null, enabled = true;
    var gBase = S('g', {}, svg), gBeam = S('g', {}, svg), gPans = S('g', {}, svg), gGrp = S('g', {}, svg), gItems = S('g', {}, svg);
    /* stand */
    var baseY = o.py + o.hang + 150 * k;
    S('path', { d: 'M' + (o.px - 26 * k) + ' ' + o.py + 'L' + (o.px - 46 * k) + ' ' + baseY + 'H' + (o.px + 46 * k) + 'L' + (o.px + 26 * k) + ' ' + o.py + 'Z', fill: NAVY }, gBase);
    S('rect', { x: o.px - 170 * k, y: baseY - 4, width: 340 * k, height: 34 * k, rx: 17 * k, fill: NAVY }, gBase);
    /* beam */
    S('rect', { x: o.px - o.half - 24 * k, y: o.py - 14 * k, width: 2 * o.half + 48 * k, height: 28 * k, rx: 14 * k, fill: NAVY }, gBeam);
    S('circle', { cx: o.px, cy: o.py, r: 30 * k, fill: '#FFC93C' }, gBeam); S('circle', { cx: o.px, cy: o.py, r: 12 * k, fill: NAVY }, gBeam);
    var pointer = S('path', { d: 'M' + o.px + ' ' + (o.py - 100 * k) + 'l-14 ' + (40 * k) + 'h28z', fill: NAVY }, gBeam);
    var pans = [0, 1].map(function () {
      var g = S('g', {}, gPans);
      g._s = S('path', { fill: 'none', stroke: NAVY, 'stroke-width': 5 * k, 'stroke-linejoin': 'round' }, g);
      g._b = S('path', { fill: NAVY }, g);
      g._k = S('circle', { r: 12 * k, fill: NAVY }, g);
      return g;
    });
    /* the boxes you take new pieces from */
    (o.bins || []).forEach(function (b) {
      var g = S('g', { 'class': 'bin', transform: 'translate(' + b.x + ' ' + b.y + ')' }, svg);
      S('rect', { width: 220, height: 112, rx: 26, fill: '#fff' }, g);
      if (b.k === 'x') drawX(g, 62, 56, 1); else drawU(g, 62, 56, 1);
      T({ 'class': 'binl', x: 118, y: 66 }, 'ลากออก', g);
      g._k = b.k; g._x = b.x + 62; g._y = b.y + 56;
    });
    function drawX(g, x, y, s) { var a = 33 * s; S('rect', { x: x - a, y: y - a, width: 2 * a, height: 2 * a, rx: 12 * s, fill: TEAL }, g); S('rect', { x: x - a, y: y - a, width: 2 * a, height: 10 * s, rx: 5 * s, fill: '#0A7C7C', opacity: 0.5 }, g); T({ x: x, y: y + 15 * s, 'text-anchor': 'middle', fill: '#fff', 'font-size': 44 * s }, 'x', g); }
    function drawU(g, x, y, s) { var r = 26 * s; S('circle', { cx: x, cy: y - r + 4 * s, r: 9 * s, fill: 'none', stroke: '#D9483A', 'stroke-width': 6 * s }, g); S('circle', { cx: x, cy: y + 3 * s, r: r, fill: CORAL }, g); T({ x: x, y: y + 14 * s, 'text-anchor': 'middle', fill: '#fff', 'font-size': 30 * s }, '1', g); }
    function ends() { var c = Math.cos(th * D), s = Math.sin(th * D); return [{ x: o.px - o.half * c, y: o.py - o.half * s }, { x: o.px + o.half * c, y: o.py + o.half * s }]; }
    function panAt(i) { var e = ends()[i]; return { x: e.x, y: e.y + o.hang }; }
    /* where piece j of kind kk sits on pan i (boxes in the bottom row, weights stacked above in rows of 5) */
    function slot(i, kk, j) {
      var P = panAt(i), nx = sides[i].x.length, nu = sides[i].u.length, xr = nx ? Math.ceil(nx / 4) : 0;
      if (kk === 'x') { var r = Math.floor(j / 4), cols = Math.min(4, nx - r * 4), c = j % 4; return { x: P.x + (c - (cols - 1) / 2) * (BX + GAP), y: P.y - BX / 2 - 6 * k - r * (BX + GAP) }; }
      var y0 = P.y - 6 * k - xr * (BX + GAP), per = 5, rr, cc, n;
      if (groups && groups.side === i) { per = groups.size; }
      rr = Math.floor(j / per); cc = j % per; n = Math.min(per, nu - rr * per);
      return { x: P.x + (cc - (n - 1) / 2) * (UD + GAP), y: y0 - UD / 2 - 4 * k - rr * (UD + GAP) };
    }
    function mk(kk) { var g = S('g', { 'class': 'it' }, gItems); if (kk === 'x') drawX(g, 0, 0, k); else drawU(g, 0, 0, k); return { el: g, k: kk, side: -1, pos: { x: 0, y: 0 }, landed: false, fly: null, drag: null }; }
    function put(it, p) { it.pos = p; it.el.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')'); }
    function weights() { var w = [0, 0]; items.forEach(function (it) { if (it.side >= 0 && it.landed) w[it.side] += it.k === 'x' ? o.X : 1; }); return w; }
    function model() { return { L: { x: sides[0].x.length, u: sides[0].u.length }, R: { x: sides[1].x.length, u: sides[1].u.length } }; }
    function draw() {
      gBeam.setAttribute('transform', 'rotate(' + th.toFixed(3) + ' ' + o.px + ' ' + o.py + ')');
      [0, 1].forEach(function (i) {
        var e = ends()[i], P = panAt(i), w = PW / 2;
        pans[i]._s.setAttribute('d', 'M' + (P.x - w + 10) + ' ' + (P.y - 2) + 'L' + e.x.toFixed(1) + ' ' + e.y.toFixed(1) + 'L' + (P.x + w - 10) + ' ' + (P.y - 2));
        pans[i]._b.setAttribute('d', 'M' + (P.x - w) + ' ' + P.y + 'H' + (P.x + w) + 'Q' + (P.x + w - 20 * k) + ' ' + (P.y + 44 * k) + ' ' + P.x + ' ' + (P.y + 44 * k) + 'Q' + (P.x - w + 20 * k) + ' ' + (P.y + 44 * k) + ' ' + (P.x - w) + ' ' + P.y + 'Z');
        pans[i]._k.setAttribute('cx', e.x.toFixed(1)); pans[i]._k.setAttribute('cy', e.y.toFixed(1));
      });
      var now = performance.now();
      items.slice().forEach(function (it) {
        if (it.drag) { put(it, it.drag); return; }
        var tgt = it.side >= 0 ? slot(it.side, it.k, sides[it.side][it.k].indexOf(it)) : it.home;
        if (it.fly) {
          var p = still() ? 1 : clamp((now - it.fly.t0) / it.fly.dur, 0, 1), e2 = eo(p), arcH = it.fly.arc * Math.sin(Math.PI * p);
          put(it, { x: it.fly.from.x + (tgt.x - it.fly.from.x) * e2, y: it.fly.from.y + (tgt.y - it.fly.from.y) * e2 - arcH });
          if (p >= 1) { it.fly = null; if (it.side >= 0) it.landed = true; else { it.el.remove(); items.splice(items.indexOf(it), 1); } }
        } else if (it.side >= 0) put(it, tgt);
      });
      drawGroups();
    }
    function drawGroups() {
      gGrp.textContent = '';
      if (!groups) return;
      var cols = ['#FFC93C', '#B9A7FF', '#FF8FAB', '#7CCBF2'];
      for (var g = 0; g < groups.n; g++) {
        var bx = sides[groups.xs].x[g]; if (bx) { var p = bx.pos; S('rect', { x: p.x - BX / 2 - 8, y: p.y - BX / 2 - 8, width: BX + 16, height: BX + 16, rx: 16, fill: cols[g % 4] }, gGrp); }
        var us = sides[groups.side].u.slice(g * groups.size, (g + 1) * groups.size);
        if (us.length) { var a = us[0].pos, b = us[us.length - 1].pos; S('rect', { x: Math.min(a.x, b.x) - UD / 2 - 8, y: a.y - UD / 2 - 12, width: Math.abs(b.x - a.x) + UD + 16, height: UD + 20, rx: 20, fill: cols[g % 4] }, gGrp); }
      }
    }
    function frame(t) {
      var dt = last ? clamp((t - last) / 1000, 0.001, 0.033) : 0.016; last = t;
      var w = weights(), target = clamp(KT * (w[1] - w[0]), -MAXT, MAXT);
      if (still()) { th = target; om = 0; } else { om += (-42 * (th - target) - 5.2 * om) * dt; th += om * dt; }
      draw();
      var busy = items.some(function (it) { return it.fly || it.drag; });
      w = weights(); target = clamp(KT * (w[1] - w[0]), -MAXT, MAXT);   /* a piece may have landed during draw() */
      if (!busy && Math.abs(th - target) < 0.01 && Math.abs(om) < 0.01) { th = target; draw(); raf = 0; return; }
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    function changed() { if (o.onchange) o.onchange(model()); }
    var self = {
      model: model, X: o.X,
      balanced: function () { var m = model(); return m.L.x * o.X + m.L.u === m.R.x * o.X + m.R.u; },
      /* instant: exactly these counts, level or tilted at rest */
      set: function (L, R) {
        groups = null; items.forEach(function (it) { it.el.remove(); }); items = []; sides = [{ x: [], u: [] }, { x: [], u: [] }];
        [L, R].forEach(function (s, i) { ['x', 'u'].forEach(function (kk) { for (var j = 0; j < s[kk]; j++) { var it = mk(kk); it.side = i; it.landed = true; sides[i][kk].push(it); items.push(it); } }); });
        var w = weights(); th = clamp(KT * (w[1] - w[0]), -MAXT, MAXT); om = 0; draw(); changed();
      },
      add: function (i, kk, from) {
        var s = sides[i];
        if ((kk === 'x' && s.x.length >= 4) || (kk === 'u' && s.u.length >= 15)) return false;
        var it = mk(kk); it.side = i; s[kk].push(it); items.push(it);
        var b = (o.bins || []).filter(function (q) { return q.k === kk; })[0];
        it.fly = { from: from || (b ? { x: b.x + 62, y: b.y + 56 } : { x: panAt(i).x, y: -80 }), t0: performance.now(), dur: 520, arc: from ? 30 : 90 };
        groups = null; kick(); changed(); return true;
      },
      remove: function (it, to) {
        if (it.side < 0) return;
        var s = sides[it.side][it.k]; s.splice(s.indexOf(it), 1);
        var b = (o.bins || []).filter(function (q) { return q.k === it.k; })[0];
        it.home = to || (b ? { x: b.x + 62, y: b.y + 56 } : { x: it.pos.x + (it.side ? 160 : -160), y: -120 });
        it.side = -1; it.landed = false; it.fly = { from: it.pos, t0: performance.now(), dur: 560, arc: 110 };
        it.el.style.opacity = 0.85; groups = null; kick(); changed();
      },
      take: function (i, kk) { var s = sides[i][kk]; if (s.length) self.remove(s[s.length - 1]); },
      /* ÷n: when one pan holds only n boxes and the other only weights (and it is level), show n equal groups, then keep one */
      canDivide: function () {
        var m = model(); if (!self.balanced()) return 0;
        if (m.L.u === 0 && m.R.x === 0 && m.L.x > 1 && m.R.u % m.L.x === 0) return m.L.x;
        if (m.R.u === 0 && m.L.x === 0 && m.R.x > 1 && m.L.u % m.R.x === 0) return m.R.x;
        return 0;
      },
      divide: function (done) {
        var n = self.canDivide(); if (!n) return false;
        var m = model(), xs = m.L.x ? 0 : 1, us = 1 - xs, size = sides[us].u.length / n;
        groups = { n: n, size: size, side: us, xs: xs }; kick();
        var q = Seq(); self._q = q;
        q.at(still() ? 0 : 1400, function () {
          self.silent = true;   /* one written step for the whole division, not one per piece */
          sides[xs].x.slice(1).forEach(function (it) { self.remove(it); });
          sides[us].u.slice(size).forEach(function (it) { self.remove(it); });
          self.silent = false;
          groups = null; kick(); if (done) done(n);
        });
        return n;
      },
      enable: function (v) { enabled = v; },
      stop: function () { if (self._q) self._q.clear(); }
    };
    /* pointer: drag a piece off its pan (or tap it) to take it away; drag from a box onto a pan to add one */
    function loc(e) { var r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) * 1920 / r.width, y: (e.clientY - r.top) * 1080 / r.height }; }
    function panHit(p) { for (var i = 0; i < 2; i++) { var P = panAt(i); if (Math.abs(p.x - P.x) < PW / 2 + 70 && p.y > P.y - 330 * k && p.y < P.y + 90) return i; } return -1; }
    var act = null;
    svg.addEventListener('pointerdown', function (e) {
      if (!enabled || penOn() || (e.pointerType === 'mouse' && e.button !== 0)) return;
      var tEl = e.target.closest && e.target.closest('.it,.bin'); if (!tEl) return;
      var p = loc(e), it = null;
      if (tEl.classList.contains('it')) { items.forEach(function (q) { if (q.el === tEl) it = q; }); if (!it || it.side < 0 || it.fly) return; }
      e.preventDefault();
      act = { id: e.pointerId, p0: p, it: it, bin: it ? null : tEl, moved: false, off: it ? { x: it.pos.x - p.x, y: it.pos.y - p.y } : { x: 0, y: 0 } };
      try { svg.setPointerCapture(e.pointerId); } catch (er) {}
    });
    svg.addEventListener('pointermove', function (e) {
      if (!act || e.pointerId !== act.id) return;
      var p = loc(e);
      if (!act.moved && Math.hypot(p.x - act.p0.x, p.y - act.p0.y) < 10) return;
      if (!act.moved) {
        act.moved = true;
        if (act.bin) { act.it = mk(act.bin._k); items.push(act.it); act.off = { x: 0, y: 0 }; }
        act.it.el.classList.add('drag'); gItems.appendChild(act.it.el);
      }
      act.it.drag = { x: p.x + act.off.x, y: p.y + act.off.y }; kick();
    });
    function end(e) {
      if (!act || e.pointerId !== act.id) return;
      var a = act; act = null; var p = loc(e);
      if (!a.moved) { if (a.it && e.type === 'pointerup') { self.remove(a.it); say('หยิบออก 1 ชิ้น'); } return; }
      var it = a.it, i = e.type === 'pointerup' ? panHit(p) : -1; it.drag = null; it.el.classList.remove('drag');
      if (a.bin) {   /* a new piece from a box */
        items.splice(items.indexOf(it), 1); it.el.remove();
        if (i < 0 || !self.add(i, a.bin._k, { x: p.x, y: p.y })) kick(); else say('ใส่เพิ่ม 1 ชิ้น');
        return;
      }
      if (i === it.side) { it.fly = { from: it.pos, t0: performance.now(), dur: 300, arc: 0 }; kick(); return; }
      if (i >= 0) { var s = sides[it.side][it.k]; s.splice(s.indexOf(it), 1); it.side = i; it.landed = false; sides[i][it.k].push(it); it.fly = { from: it.pos, t0: performance.now(), dur: 380, arc: 20 }; groups = null; kick(); changed(); return; }
      self.remove(it); say('หยิบออก 1 ชิ้น');
    }
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    self.set(o.L, o.R);
    return self;
  }

  /* ================= the scratch paper: the live equation, and a line for every level step ================= */
  function Paper(o) {   /* o: {sc, now, tip, list, start:{L,R}} */
    var base = null, X = o.sc.X;
    function opText(a, b) {
      var dx = b.L.x - a.L.x, du = b.L.u - a.L.u;
      if (dx !== b.R.x - a.R.x || du !== b.R.u - a.R.u) return 'ยังสมดุล';
      var p = [];
      if (dx) p.push((dx < 0 ? '−' : '+') + (Math.abs(dx) > 1 ? Math.abs(dx) : '') + 'x');
      if (du) p.push((du < 0 ? '−' : '+') + Math.abs(du));
      return p.join(' ') + ' ทั้งสองข้าง';
    }
    function line(html, op, first) {
      var li = el('li', first ? 'first' : '', null, o.list); li.innerHTML = '<b>' + html + '</b>'; el('span', null, op, li);
      while (o.list.children.length > 2 && o.list.scrollHeight > o.list.clientHeight + 2) o.list.removeChild(o.list.children[1]);   /* keep the task and the newest steps */
    }
    var api = {
      reset: function (st) { o.list.textContent = ''; base = st; line(side(st.L) + ' = ' + side(st.R), 'โจทย์', true); api.show(st); },
      show: function (st) {
        var ok = st.L.x * X + st.L.u === st.R.x * X + st.R.u;
        o.now.innerHTML = eqHTML(st, X);
        o.tip.className = 'e-tip' + (ok ? ' ok' : '');
        o.tip.textContent = ok ? 'ตาชั่งตรง: สมการเป็นจริง' : 'ตาชั่งเอียง: ทำอีกข้างให้เหมือนกัน';
      },
      change: function (st) {
        api.show(st);
        var ok = st.L.x * X + st.L.u === st.R.x * X + st.R.u;
        if (!ok || !base) return;
        if (st.L.x === base.L.x && st.L.u === base.L.u && st.R.x === base.R.x && st.R.u === base.R.u) return;
        line(side(st.L) + ' = ' + side(st.R), opText(base, st)); base = st;
        say(plain(st.L) + ' เท่ากับ ' + plain(st.R));
      },
      divided: function (st, n) { line(side(st.L) + ' = ' + side(st.R), '÷' + n + ' ทั้งสองข้าง'); base = st; api.show(st); },
      solved: function (st) { return (st.L.x === 1 && !st.L.u && !st.R.x && st.R.u === X) || (st.R.x === 1 && !st.R.u && !st.L.x && st.L.u === X); }
    };
    return api;
  }

  var C = {};

  /* ============ 1 · title: x + 2 = 5 (x = 3). Beat 1: take 1 off the left -> it tips. Beat 2: take 1 off the right -> level. ============ */
  C['e-title'] = (function () {
    var eq = $('#e1-eq'), q = Seq();
    var sc = Scale({ svg: $('#e1-sv'), px: 1270, py: 390, half: 320, hang: 240, X: 3, k: 0.92, L: { x: 1, u: 2 }, R: { x: 0, u: 5 },
      onchange: function (m) { eq.innerHTML = eqHTML(m, 3); } });
    function pose(st) { q.clear(); sc.set({ x: 1, u: st ? 1 : 2 }, { x: 0, u: st === 2 ? 4 : 5 }); }
    return {
      set: function (st, prev) {
        if (still() || prev < 0 || st !== prev + 1) { pose(st); return; }
        if (st === 1) { pose(0); q.at(300, function () { sc.take(0, 'u'); }); }
        if (st === 2) { pose(1); q.at(300, function () { sc.take(1, 'u'); }); }
      },
      leave: function () { q.clear(); }
    };
  })();

  /* a solving slide: scale + scratch paper + buttons; script = the solution as a list of moves */
  function Solver(o) {
    var q = Seq(), paper, sc;
    sc = Scale({ svg: o.svg, px: o.px, py: o.py, half: o.half, hang: o.hang, X: o.X, L: o.L, R: o.R, bins: o.bins,
      onchange: function (m) { if (!sc || sc.silent) return; if (paper) paper.change(m); if (o.div) o.div.disabled = !sc.canDivide(); msg(''); } });
    paper = Paper({ sc: sc, now: o.now, tip: o.tip, list: o.list });
    function msg(kind, t) { if (!o.fb) return; o.fb.className = 'fb' + (kind ? ' ' + kind : ''); o.fb.textContent = (kind === 'ok' ? '✓ ' : '') + (t || ''); }
    function reset() { q.clear(); sc.stop(); sc.set(o.L, o.R); paper.reset(sc.model()); if (o.div) o.div.disabled = true; msg(''); sc.enable(true); }
    function divide() { var n = sc.divide(function (n2) { paper.divided(sc.model(), n2); if (o.div) o.div.disabled = true; say('หารด้วย ' + n2 + ' ทั้งสองข้าง ได้ x = ' + o.X); }); if (!n) msg('no', 'ให้ข้างหนึ่งเหลือแต่กล่อง x อีกข้างเหลือแต่ลูกตุ้มก่อน'); }
    /* the worked solution, one move at a time: a move takes the same piece off both pans, then waits for the scale */
    function play() {
      reset(); sc.enable(false);
      var t = still() ? 0 : 500;
      o.script.forEach(function (m) {
        if (m === 'div') { q.at(t, divide); t += still() ? 0 : 2600; return; }
        /* n off the left (the scale tips), then n off the right (level again): one written step */
        for (var j = 0; j < m.n; j++) q.at(t + (still() ? 0 : 260 * j), function () { sc.take(0, m.k); });
        t += still() ? 0 : 260 * m.n + 1100;
        for (j = 0; j < m.n; j++) q.at(t + (still() ? 0 : 260 * j), function () { sc.take(1, m.k); });
        t += still() ? 0 : 260 * m.n + 1400;
      });
      q.at(t, function () { sc.enable(true); });
    }
    if (o.div) o.div.addEventListener('click', function (e) { e.stopPropagation(); divide(); });
    if (o.chk) o.chk.addEventListener('click', function (e) {
      e.stopPropagation();
      var m = sc.model();
      if (paper.solved(m)) msg('ok', 'ถูกต้อง! x = ' + o.X + ' (ตรวจ: ' + o.checkText + ')');
      else if (!sc.balanced()) msg('no', 'ตาชั่งยังเอียงอยู่ ทำให้ตรงก่อน');
      else msg('no', 'ยังไม่เสร็จ: ให้เหลือ x ตัวเดียวข้างหนึ่ง');
    });
    o.ans.addEventListener('click', function (e) { e.stopPropagation(); play(); });
    o.rst.addEventListener('click', function (e) { e.stopPropagation(); reset(); });
    paper.reset(sc.model());
    return {
      set: function (st, prev) {
        if (st === 1 && prev === 0) { if (!paper.solved(sc.model())) play(); return; }
        if (prev < 0 || st === 0) { if (st === 1) { play(); return; } if (prev > 0) reset(); }
      },
      leave: function () { q.clear(); sc.stop(); sc.enable(true); }
    };
  }

  /* ============ 2 · 3x + 2 = 11 (x = 3): −2 both sides, then ÷3 both sides ============ */
  C['e-solve'] = Solver({ svg: $('#e2-sv'), px: 790, py: 470, half: 360, hang: 250, X: 3, L: { x: 3, u: 2 }, R: { x: 0, u: 11 },
    bins: [{ k: 'x', x: 110, y: 304 }, { k: 'u', x: 350, y: 304 }],
    now: $('#e2-now'), tip: $('#e2-tip'), list: $('#e2-steps'), div: $('#e2-div'), chk: $('#e2-chk'), ans: $('#e2-ans'), rst: $('#e2-rst'), fb: $('#e2-fb'),
    script: [{ k: 'u', n: 2 }, 'div'], checkText: '3 × 3 + 2 = 11' });

  /* ============ 3 · 2x + 5 = x + 9 (x = 4): −x both sides, then −5 both sides ============ */
  C['e-try'] = Solver({ svg: $('#e3-sv'), px: 1290, py: 470, half: 340, hang: 250, X: 4, L: { x: 2, u: 5 }, R: { x: 1, u: 9 },
    bins: [{ k: 'x', x: 1360, y: 222 }, { k: 'u', x: 1600, y: 222 }],
    now: $('#e3-now'), tip: $('#e3-tip'), list: $('#e3-steps'), ans: $('#e3-ans'), rst: $('#e3-rst'),
    script: [{ k: 'x', n: 1 }, { k: 'u', n: 5 }], checkText: '' });

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
