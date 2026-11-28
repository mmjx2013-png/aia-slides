/* app.js · KruSlide sample math-probability ("game night"): dice and coins, experiment against theory.
   Rolls use a seeded random generator (a fixed seed under ?still, so screenshots repeat; otherwise seeded from the clock).
   Theory is exact: one die 1/6 per face; two dice (6 − |s − 7|)/36 for the total s; two coins 1/4 per ordered outcome.
   Experiments show counts and percentages rounded to 0.1 %. Every slide has a controller C[id] = { set(st, prev), leave() }
   (the calculus pattern); prev = -1 when the slide was just entered or jumped to.
   ?still / reduced motion (html.rm): no tumbling, final states. Taps, flicks and buttons never change the slide. */
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
  function penOn() { return root.classList.contains('pen-on'); }
  var live = el('div', 'sr', null, document.body); live.setAttribute('aria-live', 'polite');
  function say(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }
  /* mulberry32 */
  var seed = new URLSearchParams(location.search).has('still') ? 20261128 : (Date.now() >>> 0);
  function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function die() { return 1 + Math.floor(rnd() * 6); }
  function pct(n, N) { return N ? (n / N * 100).toFixed(1) + '%' : '–'; }
  /* run `total` trials spread over ~ms of frames (instant when still), calling one() each trial and draw() per frame */
  function batch(total, ms, one, draw, done) {
    if (still() || total <= 1) { for (var i = 0; i < total; i++) one(); draw(); if (done) done(); return { stop: function () {} }; }
    var t0 = null, did = 0, stop = false;
    function f(t) { if (stop) return; if (t0 === null) t0 = t; var want = Math.min(total, Math.ceil(total * Math.min(1, (t - t0) / ms))); while (did < want) { one(); did++; } draw(); if (did < total) requestAnimationFrame(f); else if (done) done(); }
    requestAnimationFrame(f);
    return { stop: function () { if (stop) return; stop = true; while (did < total) { one(); did++; } draw(); } };
  }

  /* ---------- a die: a CSS cube. front 1, back 6, top 2, bottom 5, right 3, left 4 (opposites add to 7) ---------- */
  var PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  var FACE = { 1: 'translateZ(H)', 6: 'rotateY(180deg) translateZ(H)', 2: 'rotateX(90deg) translateZ(H)', 5: 'rotateX(-90deg) translateZ(H)', 3: 'rotateY(90deg) translateZ(H)', 4: 'rotateY(-90deg) translateZ(H)' };
  var TO = { 1: [0, 0], 6: [0, 180], 2: [-90, 0], 5: [90, 0], 3: [0, -90], 4: [0, 90] };
  function Die(host, onTap) {
    var s = parseFloat(getComputedStyle(host).getPropertyValue('--s')) || 200, h = s / 2;
    el('i', 'shadow', null, host);
    var cam = el('div', 'cam', null, host), hop = el('div', 'hop', null, cam), cube = el('div', 'cube', null, hop), rx = -15, ry = 25, val = 1;
    [1, 2, 3, 4, 5, 6].forEach(function (n) {
      var f = el('div', 'f' + (n === 1 || n === 4 ? ' r' : '') + (n === 1 ? ' one' : ''), null, cube); f.style.transform = FACE[n].replace('H', h + 'px');
      for (var k = 1; k <= 9; k++) { var c = el('span', null, null, f); if (PIPS[n].indexOf(k) >= 0) el('i', null, null, c); }
    });
    function show(n, spin) {
      val = n; var t = TO[n];
      if (spin && !still()) {
        var turns = 2 + Math.floor(rnd() * 2);
        rx = t[0] + 360 * Math.ceil((rx + 360 * turns - t[0]) / 360); ry = t[1] + 360 * Math.ceil((ry + 360 * turns - t[1]) / 360);
        host.classList.remove('roll'); void host.offsetWidth; host.classList.add('roll');
      } else { rx = t[0]; ry = t[1]; cube.style.transition = 'none'; }
      cube.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
      if (!spin || still()) { void cube.offsetWidth; cube.style.transition = ''; }
    }
    show(1, false);
    /* tap or flick the die: it tumbles */
    var d0 = null;
    host.addEventListener('pointerdown', function (e) { if (penOn() || (e.pointerType === 'mouse' && e.button !== 0)) return; e.preventDefault(); d0 = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { host.setPointerCapture(e.pointerId); } catch (er) {} });
    host.addEventListener('pointerup', function (e) { if (!d0 || d0.id !== e.pointerId) return; d0 = null; onTap(); });
    host.addEventListener('pointercancel', function () { d0 = null; });
    host.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onTap(); } });
    return { show: show, get: function () { return val; } };
  }
  function faceIcon(p, x, y, n, s) {   /* a small flat die face for chart labels */
    var g = S('g', { transform: 'translate(' + x + ' ' + y + ')' }, p);
    S('rect', { x: -s / 2, y: -s / 2, width: s, height: s, rx: s * 0.2, fill: '#fff', stroke: '#C9B89C', 'stroke-width': 2 }, g);
    PIPS[n].forEach(function (k) { var cx = ((k - 1) % 3 - 1) * s * 0.28, cy = (Math.floor((k - 1) / 3) - 1) * s * 0.28; S('circle', { cx: cx, cy: cy, r: n === 1 ? s * 0.13 : s * 0.085, fill: n === 1 || n === 4 ? '#D2452A' : '#2B2118' }, g); });
    return g;
  }

  /* ---------- bar chart in a card: bars = experiment (share of trials), dashed marks = theory ---------- */
  function Chart(svg, o) {   /* o: {W, H, l, r, t, b, n, label(g, i, x, y), theory: [p...]} */
    var g = S('g', {}, svg), grid = S('g', {}, g), bars = S('g', {}, g), th = S('g', { opacity: 0 }, g), top = S('g', {}, g);
    var pw = o.W - o.l - o.r, ph = o.H - o.t - o.b, cw = pw / o.n, bw = cw * 0.62, ymax = 0.3, els = [];
    for (var i = 0; i < o.n; i++) {
      var cx = o.l + cw * (i + 0.5);
      els.push({ bar: S('rect', { 'class': 'bar', x: cx - bw / 2, width: bw, y: o.t + ph, height: 0, rx: 6 }, bars), v: T({ 'class': 'vl', x: cx, 'text-anchor': 'middle' }, '', top), cx: cx });
      o.label(top, i, cx, o.t + ph + 40);
    }
    function axes() {
      grid.textContent = '';
      var step = ymax <= 0.3 ? 0.05 : ymax <= 0.6 ? 0.1 : 0.2;
      for (var v = 0; v <= ymax + 1e-9; v += step) { var y = o.t + ph - v / ymax * ph; S('line', { 'class': 'gl', x1: o.l, x2: o.l + pw, y1: y, y2: y }, grid); T({ 'class': 'yl', x: o.l - 14, y: y + 7, 'text-anchor': 'end' }, Math.round(v * 100) + '%', grid); }
      th.textContent = '';
      o.theory.forEach(function (p, i) { var y = o.t + ph - p / ymax * ph; S('path', { 'class': 'th', d: 'M' + (els[i].cx - cw / 2 + 6) + ' ' + y + 'H' + (els[i].cx + cw / 2 - 6) }, th); if (o.thLabel) o.thLabel(th, i, els[i].cx, y); });
    }
    function draw(counts, N, hi) {
      var mx = 0; counts.forEach(function (c) { mx = Math.max(mx, N ? c / N : 0); });
      var ym = mx <= 0.3 ? 0.3 : mx <= 0.6 ? 0.6 : 1; if (ym !== ymax) { ymax = ym; axes(); }
      counts.forEach(function (c, i) {
        var f = N ? c / N : 0, hgt = f / ymax * ph, e = els[i];
        e.bar.setAttribute('y', (o.t + ph - hgt).toFixed(1)); e.bar.setAttribute('height', hgt.toFixed(1));
        e.bar.classList.toggle('hi', hi === i);
        e.v.setAttribute('y', (o.t + ph - hgt - 12).toFixed(1)); e.v.textContent = N ? c : '';
      });
    }
    axes();
    return { draw: draw, theory: function (v) { th.setAttribute('opacity', v ? 1 : 0); } };
  }

  var C = {};

  /* ============ 1 · one die ============ */
  C['p-one'] = (function () {
    var sl = $('#p-one'), counts = [0, 0, 0, 0, 0, 0], N = 0, run = null, rv = $('#p1-rv'), nEl = $('#p1-n');
    var ch = Chart($('#p1-ch'), { W: 1030, H: 700, l: 110, r: 50, t: 50, b: 90, n: 6, theory: [1, 1, 1, 1, 1, 1].map(function () { return 1 / 6; }),
      label: function (g, i, x, y) { faceIcon(g, x, y - 4, i + 1, 54); } });
    var d = Die($('#p1-d'), function () { roll(1); });
    function draw(hi) { ch.draw(counts, N, hi); nEl.textContent = N.toLocaleString('en-US'); }
    function roll(n) {
      if (run) run.stop();
      if (n === 0) { counts = [0, 0, 0, 0, 0, 0]; N = 0; rv.textContent = '–'; draw(); return; }
      var last = 1;
      if (n === 1) { last = die(); d.show(last, true); setTimeout(function () { counts[last - 1]++; N++; rv.textContent = last; draw(last - 1); say('ออก ' + last); }, still() ? 0 : 900); return; }
      d.show(1 + Math.floor(rnd() * 6), true);
      run = batch(n, n >= 1000 ? 1800 : 1100, function () { last = die(); counts[last - 1]++; N++; }, function () { draw(); }, function () { run = null; rv.textContent = last; d.show(last, false); say('ทอยแล้ว ' + N + ' ครั้ง'); });
    }
    $$('#p-one .btns .gbtn').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); roll(+b.dataset.n); }); });
    draw();
    return {
      set: function (st, prev) {
        ch.theory(st >= 1);
        if (still() && N === 0) { counts = [0, 0, 0, 0, 0, 0]; N = 0; roll(st === 2 ? 1000 : st === 1 ? 100 : 12); return; }
        if (st === 2 && prev === 1 && N < 1000) roll(1000);
      },
      leave: function () { if (run) run.stop(); }
    };
  })();

  /* ============ 2 · two dice: totals 2..12 ============ */
  C['p-two'] = (function () {
    var counts = [], N = 0, run = null, rv = $('#p2-rv'), nEl = $('#p2-n'); for (var i = 0; i < 11; i++) counts.push(0);
    var TH = []; for (i = 2; i <= 12; i++) TH.push((6 - Math.abs(i - 7)) / 36);
    var ch = Chart($('#p2-ch'), { W: 1110, H: 430, l: 100, r: 40, t: 40, b: 96, n: 11, theory: TH,
      label: function (g, i, x, y) { T({ 'class': 'xl', x: x, y: y, 'text-anchor': 'middle' }, String(i + 2), g); },
      thLabel: function (g, i, x) { T({ 'class': 'tl', x: x, y: 410, 'text-anchor': 'middle' }, (6 - Math.abs(i - 5)) + '/36', g); } });
    var d1 = Die($('#p2-d1'), function () { roll(1); }), d2 = Die($('#p2-d2'), function () { roll(1); });
    function draw(hi) { ch.draw(counts, N, hi); nEl.textContent = N.toLocaleString('en-US'); }
    function roll(n) {
      if (run) run.stop();
      if (n === 0) { for (var k = 0; k < 11; k++) counts[k] = 0; N = 0; rv.textContent = '–'; draw(); return; }
      if (n === 1) { var a = die(), b = die(); d1.show(a, true); d2.show(b, true); setTimeout(function () { counts[a + b - 2]++; N++; rv.textContent = a + ' + ' + b + ' = ' + (a + b); draw(a + b - 2); say(a + ' บวก ' + b + ' ได้ ' + (a + b)); }, still() ? 0 : 900); return; }
      d1.show(die(), true); d2.show(die(), true);
      var la = 1, lb = 1;
      run = batch(n, n >= 1000 ? 1800 : 1100, function () { la = die(); lb = die(); counts[la + lb - 2]++; N++; }, function () { draw(); }, function () { run = null; rv.textContent = la + ' + ' + lb + ' = ' + (la + lb); d1.show(la, false); d2.show(lb, false); });
    }
    $$('#p-two .btns .gbtn').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); roll(+b.dataset.n); }); });
    /* the 36 outcomes: first die across, second die down; the six that make 7 light up */
    var grid = $('#p2-grid'), svgIcon = function (n) { var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '-30 -30 60 60'); faceIcon(s, 0, 0, n, 52); return s; };
    el('span', 'hd', '+', grid);
    for (i = 1; i <= 6; i++) el('span', 'hd', null, grid).appendChild(svgIcon(i));
    var k7 = 0;
    for (var r = 1; r <= 6; r++) { el('span', 'hd', null, grid).appendChild(svgIcon(r)); for (var c2 = 1; c2 <= 6; c2++) { var sp = el('span', r + c2 === 7 ? 's7' : '', String(r + c2), grid); if (r + c2 === 7) sp.style.setProperty('--i', k7++); } }
    var mc = $('#p2-mc'), why = $('#p2-why');
    mc.addEventListener('click', function () { setTimeout(function () { why.classList.toggle('vis', !!mc.querySelector('.c.ok.picked')); }, 0); });
    draw();
    return {
      set: function (st, prev) {
        ch.theory(st >= 1);
        if (still() && N === 0) { roll(st >= 1 ? 1000 : 60); return; }
        if (st === 1 && prev === 0 && N < 1000) roll(1000);
      },
      leave: function () { if (run) run.stop(); }
    };
  })();

  /* ============ 3 · two coins ============ */
  C['p-coin'] = (function () {
    var KEYS = ['HH', 'HT', 'TH', 'TT'], NAME = { H: 'หัว', T: 'ก้อย' }, counts = [0, 0, 0, 0], N = 0, run = null, nEl = $('#p3-n');
    var rows = $('#p3-rows'), R = [];
    KEYS.concat(['MIX']).forEach(function (k) {
      var r = el('div', 'p3-r' + (k === 'MIX' ? ' sum' : ''), null, rows), kk = el('span', 'k', null, r);
      if (k === 'MIX') kk.textContent = 'หัวหนึ่ง ก้อยหนึ่ง (รวม)';
      else { el('i', k[0] === 'H' ? 'h' : 't', null, kk); el('i', k[1] === 'H' ? 'h' : 't', null, kk); el('span', null, NAME[k[0]] + ' · ' + NAME[k[1]], kk); }
      var n = el('span', 'n', '0', r), bar = el('span', 'bar', null, r), fill = el('i', null, null, bar), th = el('b', null, null, bar), p = el('span', 'p', '–', r);
      th.style.left = (k === 'MIX' ? 50 : 25) + '%';
      R.push({ n: n, fill: fill, p: p });
    });
    function draw() {
      var all = counts.concat([counts[1] + counts[2]]);
      all.forEach(function (c, i) { R[i].n.textContent = c; R[i].fill.style.width = (N ? c / N * 100 : 0) + '%'; R[i].p.textContent = pct(c, N); });
      nEl.textContent = N;
    }
    /* a coin: heads up = rotateX(0), tails up = rotateX(180); a flip adds whole turns */
    function Coin(host) {
      var f = $('.cf', host), deg = 0;
      return { show: function (side, spin) {
        var want = side === 'H' ? 0 : 180;
        if (spin && !still()) { deg = want + 360 * Math.ceil((deg + 1440 - want) / 360); host.classList.remove('flip'); void host.offsetWidth; host.classList.add('flip'); f.style.transform = 'rotateX(' + deg + 'deg)'; }
        else { deg = want; f.style.transition = 'none'; f.style.transform = 'rotateX(' + deg + 'deg)'; void f.offsetWidth; f.style.transition = ''; }
      } };
    }
    var ca = Coin($('#p3-a')), cb = Coin($('#p3-b'));
    function side() { return rnd() < 0.5 ? 'H' : 'T'; }
    function flip(n) {
      if (run) run.stop();
      if (n === 0) { counts = [0, 0, 0, 0]; N = 0; draw(); return; }
      if (n === 1) { var a = side(), b = side(); ca.show(a, true); cb.show(b, true); setTimeout(function () { counts[KEYS.indexOf(a + b)]++; N++; draw(); say(NAME[a] + ' และ ' + NAME[b]); }, still() ? 0 : 950); return; }
      var la = 'H', lb = 'H'; ca.show(side(), true); cb.show(side(), true);
      run = batch(n, 1200, function () { la = side(); lb = side(); counts[KEYS.indexOf(la + lb)]++; N++; }, draw, function () { run = null; ca.show(la, false); cb.show(lb, false); });
    }
    $$('#p-coin .btns .gbtn').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); flip(+b.dataset.n); }); });
    ['#p3-a', '#p3-b'].forEach(function (id) {
      var h = $(id), d0 = null;
      h.addEventListener('pointerdown', function (e) { if (penOn() || (e.pointerType === 'mouse' && e.button !== 0)) return; e.preventDefault(); d0 = e.pointerId; });
      h.addEventListener('pointerup', function (e) { if (d0 !== e.pointerId) return; d0 = null; flip(1); });
      h.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); flip(1); } });
    });
    /* the tree diagram: first coin, second coin, four equally likely ends */
    var tr = $('#p3-tr'), lines = [];
    var L1 = [{ s: 'H', y: 128 }, { s: 'T', y: 342 }], L2 = [72, 180, 290, 398];
    T({ 'class': 'nd', x: 70, y: 245, 'text-anchor': 'middle' }, 'เริ่ม', tr);
    T({ 'class': 'yl', x: 340, y: 40, 'text-anchor': 'middle' }, 'เหรียญที่ 1', tr); T({ 'class': 'yl', x: 640, y: 40, 'text-anchor': 'middle' }, 'เหรียญที่ 2', tr);
    L1.forEach(function (n, i) {
      lines.push(S('path', { 'class': 'br', d: 'M118 235L300 ' + n.y, pathLength: 1 }, tr));
      T({ 'class': 'bl', x: 200, y: (235 + n.y) / 2 + (i ? 34 : -14), 'text-anchor': 'middle' }, '1/2', tr);
      T({ 'class': 'nd', x: 340, y: n.y + 10, 'text-anchor': 'middle' }, NAME[n.s], tr);
      [0, 1].forEach(function (j) {
        var y2 = L2[i * 2 + j], s2 = j ? 'T' : 'H';
        lines.push(S('path', { 'class': 'br', d: 'M386 ' + n.y + 'L600 ' + y2, pathLength: 1 }, tr));
        T({ 'class': 'bl', x: 492, y: (n.y + y2) / 2 + (j ? 30 : -12), 'text-anchor': 'middle' }, '1/2', tr);
        T({ 'class': 'nd', x: 640, y: y2 + 10, 'text-anchor': 'middle' }, NAME[s2], tr);
        var mix = n.s !== s2;
        T({ 'class': 'lf', x: 712, y: y2 + 10 }, NAME[n.s] + ' ' + NAME[s2], tr).style.fill = mix ? '#E4572E' : '#2B2118';
        T({ 'class': 'lf', x: 880, y: y2 + 10, 'text-anchor': 'end' }, '1/4', tr).style.fill = mix ? '#E4572E' : '#2B2118';
      });
    });
    S('path', { d: 'M898 170 h16 v130 h-16', fill: 'none', stroke: '#E4572E', 'stroke-width': 4 }, tr);
    T({ 'class': 'bl', x: 928, y: 228 }, '2/4', tr); T({ 'class': 'bl', x: 928, y: 260 }, '= 1/2', tr);
    function grow(anim) { lines.forEach(function (l, i) { l.style.strokeDasharray = '1'; l.style.strokeDashoffset = anim ? 1 : 0; if (anim && l.animate) l.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 500, delay: 200 + (i < 3 ? i : i) * 160, fill: 'forwards', easing: 'ease-out' }); }); }
    draw();
    return {
      set: function (st, prev) {
        if (still() && N === 0) flip(st ? 100 : 40);
        grow(st === 1 && !still() && prev === 0);
      },
      leave: function () { if (run) run.stop(); }
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
