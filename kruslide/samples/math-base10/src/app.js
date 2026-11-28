/* app.js · KruSlide sample math-base10 ("wooden toy blocks"): the wooden table, the place-value blocks, regrouping.
   Every slide has a controller C[id] = { set(st, prev), leave() } (the calculus pattern). set() runs on every beat change;
   prev = -1 when the slide was just entered or jumped to, so going back or jumping lands on a clean, complete state and
   only a forward step plays the transition. ?still / reduced motion (html.rm): every controller shows its final state.
   Drags use pointer events (mouse, pen, touch) with pointer capture, and never change the slide.
   Blocks: a cube is U x U, a rod 10 cubes long, a flat 10 x 10 cubes. Coordinates are stage pixels (1920 x 1080). */
(function () {
  'use strict';
  var root = document.documentElement, stage = document.getElementById('stage'), NS = 'http://www.w3.org/2000/svg';
  if (!stage) return;
  function still() { return root.classList.contains('rm'); }
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  function S(tag, at, p) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (p) p.appendChild(e); return e; }
  function el(tag, cls, txt, p) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (p) p.appendChild(e); return e; }
  /* a cancellable timeline: q.at(ms, fn) · q.clear() */
  function Seq() { var ts = []; return { at: function (ms, f) { ts.push(setTimeout(f, ms)); }, clear: function () { ts.forEach(clearTimeout); ts = []; } }; }
  /* stage coordinates of a pointer event (the stage is scaled by a CSS transform) */
  function sp(e) { var r = stage.getBoundingClientRect(), k = r.width / 1920 || 1; return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; }
  function penOn() { return root.classList.contains('pen-on'); }
  var live = el('div', 'sr', null, document.body); live.setAttribute('aria-live', 'polite');
  function say(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }

  /* ---------- blocks ---------- */
  var KIND = { h: 'hun', t: 'ten', o: 'one' };
  function put(b, x, y, now) {
    b._x = x; b._y = y;
    if (now) { b.style.transition = 'none'; b.style.transform = 'translate(' + x + 'px,' + y + 'px)'; void b.offsetWidth; b.style.transition = ''; }
    else b.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  }
  function blk(k, x, y, p, cls) { var b = el('div', 'blk ' + KIND[k] + (cls ? ' ' + cls : ''), null, p); b._k = k; put(b, x, y, true); return b; }

  /* ---------- the maple table top behind every slide: planks, grain that bends round a knot, seams, a warm vignette ---------- */
  (function wood() {
    var svg = S('svg', { id: 'wood', viewBox: '0 0 1920 1080', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    stage.insertBefore(svg, stage.firstChild);
    var seed = 11; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var defs = S('defs', {}, svg), vg = S('radialGradient', { id: 'wood-vg', cx: '50%', cy: '45%', r: '75%' }, defs);
    S('stop', { offset: '55%', 'stop-color': '#5A2E0A', 'stop-opacity': 0 }, vg); S('stop', { offset: '100%', 'stop-color': '#5A2E0A', 'stop-opacity': 0.3 }, vg);
    var tones = ['#E1B57D', '#DAAD73', '#E4BB84', '#D8AA70', '#DFB37A'], H = 216;
    for (var i = 0; i < 5; i++) {
      var y0 = i * H, g = S('g', { fill: 'none', 'stroke-linecap': 'round' }, svg);
      S('rect', { x: 0, y: y0, width: 1920, height: H, fill: tones[i] }, g);
      var kx = 200 + rnd() * 1500, ky = y0 + 50 + rnd() * (H - 100), knot = rnd() < 0.6;
      for (var j = 0; j < 16; j++) {
        var yb = y0 + 8 + (j + rnd() * 0.6) * (H - 16) / 16, amp = 2 + rnd() * 5, len = 260 + rnd() * 340, ph = rnd() * 6.28, d = '';
        for (var x = -24; x <= 1944; x += 24) {
          var yy = yb + amp * Math.sin(x / len * 6.28 + ph);
          if (knot) { var dx = x - kx, dy = yb - ky; yy += (dy >= 0 ? 1 : -1) * 1400 / ((dx * dx / 9 + dy * dy) / 40 + 60); }
          d += (x < 0 ? 'M' : 'L') + x + ' ' + yy.toFixed(1);
        }
        S('path', { d: d, stroke: rnd() < 0.5 ? '#9C6430' : '#B57A3F', 'stroke-opacity': (0.1 + rnd() * 0.16).toFixed(2), 'stroke-width': (1 + rnd() * 2.2).toFixed(1) }, g);
      }
      if (knot) for (var r = 0; r < 3; r++) S('ellipse', { cx: kx, cy: ky, rx: 16 + r * 12, ry: 3 + r * 3, stroke: '#8A5426', 'stroke-opacity': (0.2 - r * 0.05).toFixed(2), 'stroke-width': 1.6, fill: 'none' }, g);
      if (i) { S('rect', { x: 0, y: y0 - 2, width: 1920, height: 3, fill: '#8A5A2B', opacity: 0.55 }, svg); S('rect', { x: 0, y: y0 + 1, width: 1920, height: 2, fill: '#F5D3A0', opacity: 0.5 }, svg); }
    }
    S('rect', { x: 0, y: 0, width: 1920, height: 1080, fill: 'url(#wood-vg)' }, svg);
  })();

  var C = {};

  /* ============ 1 · title: one cube, one rod, one flat. Beat 1: ten cubes stack and snap into a rod. Beat 2: ten rods snap into a flat. ============ */
  C['b-title'] = (function () {
    var toy = $('#b1-toy'), tok = $('#b1-tok'), q = Seq(), U = 34, BASE = 880, TOP = BASE - 10 * U;   /* pieces stand on y = 880 */
    var CX = 860, RX = 990, GX = 1100, FX = 1520, extra = [];
    var cube0 = blk('o', CX, BASE - U, toy); blk('t', RX, TOP, toy); blk('h', FX, TOP, toy);
    function tokAt(x, y, n) { tok.style.left = x + 'px'; tok.style.top = y + 'px'; if (n != null) tok.textContent = n; }
    function add(k, x, y, cls) { var b = blk(k, x, y, toy, cls); extra.push(b); return b; }
    function clear() { q.clear(); extra.forEach(function (b) { b.remove(); }); extra = []; tok.style.opacity = 0; }
    function pose(st) {
      clear();
      cube0.style.opacity = st >= 1 ? 0 : '';
      if (st >= 1) add('t', CX, TOP);
      if (st >= 2) add('h', GX, TOP);
    }
    /* beat 1: cubes drop in one by one (counted on the token), the gaps close, and the column becomes a rod */
    function play1() {
      clear(); cube0.style.opacity = '';
      var cs = [cube0];
      tokAt(CX + U / 2, BASE - U - 62, '1'); tok.style.opacity = 1;
      for (var k = 1; k < 10; k++) (function (k) {
        var y = BASE - U - k * (U + 6), c = add('o', CX, y - 260); c.style.opacity = 0; cs.push(c);
        q.at(160 + k * 170, function () { c.style.opacity = ''; put(c, CX, y); });
        q.at(160 + k * 170 + 360, function () { tokAt(CX + U / 2, y - 62, String(k + 1)); });
      })(k);
      q.at(2300, function () { cs.forEach(function (c, k) { put(c, CX, BASE - U * (k + 1)); }); tokAt(CX + U / 2, TOP - 62); });
      q.at(2700, function () { add('t', CX, TOP, 'flash'); cs.forEach(function (c) { c.style.opacity = 0; }); tok.style.opacity = 0; say('10 หน่วย เท่ากับ 1 สิบ'); });
    }
    /* beat 2: ten rods drop in side by side (10, 20, … 100), close up, and become a flat */
    function play2() {
      pose(1);
      var rs = [];
      for (var j = 0; j < 10; j++) (function (j) {
        var x = GX + j * (U + 6), r = add('t', x, TOP - 300); r.style.opacity = 0; rs.push(r);
        q.at(150 + j * 170, function () { r.style.opacity = ''; put(r, x, TOP); });
        q.at(150 + j * 170 + 360, function () { tok.style.opacity = 1; tokAt(x + U / 2, TOP - 62, String((j + 1) * 10)); });
      })(j);
      q.at(2400, function () { rs.forEach(function (r, j) { put(r, GX + j * U, TOP); }); tokAt(GX + 5 * U, TOP - 62); });
      q.at(2800, function () { add('h', GX, TOP, 'flash'); rs.forEach(function (r) { r.style.opacity = 0; }); tok.style.opacity = 0; say('10 สิบ เท่ากับ 1 ร้อย'); });
    }
    return {
      set: function (st, prev) {
        if (still() || prev < 0 || st !== prev + 1) { pose(st); return; }
        if (st === 1) play1(); else if (st === 2) play2();
      },
      leave: function () { q.clear(); }
    };
  })();

  /* ============ 2 · build the number on the sign (drag or tap). 10 ones -> a ten, 10 tens -> a hundred. Beat 1: place values. ============ */
  C['b-build'] = (function () {
    var sl = $('#b-build'), layer = $('#b2-layer'), q = Seq();
    var MAT = { x: 130, y: 236, w: 1270, h: 664 };
    var TG = [243, 135, 302, 418, 56, 170, 291, 64, 527, 309], ti = 0;   /* includes numbers with a 0 digit on purpose */
    var cnt = { h: 0, t: 0, o: 0 }, P = { h: [], t: [], o: [] }, busy = false, fx = [];
    var tgtEl = $('#b2-tgt'), fb = $('#b2-fb'), exp = $('#b2-exp'), board = $('.b2-board', sl);
    var dg = { h: $('#b2-dh'), t: $('#b2-dt'), o: $('#b2-do') }, trays = {};
    $$('.b2-tray', sl).forEach(function (t) { trays[t.dataset.k] = t; t.tabIndex = 0; });
    var DIM = { h: [300, 300], t: [30, 300], o: [30, 30] }, KS = ['h', 't', 'o'];
    var NAME = { h: ['หลักร้อย', 'แผ่น'], t: ['หลักสิบ', 'แท่ง'], o: ['หลักหน่วย', 'ก้อน'] };
    function target() { return TG[ti]; }
    function digits(n) { return { h: Math.floor(n / 100), t: Math.floor(n / 10) % 10, o: n % 10 }; }
    function value() { return cnt.h * 100 + cnt.t * 10 + cnt.o; }
    function slot(k, i) {
      if (k === 'h') return { x: 175 + 16 * i, y: 445 - 16 * i };            /* flats stack up and to the right */
      if (k === 't') return { x: 700 + 37 * i, y: 445 };                     /* rods stand side by side */
      return { x: 1195 + (i % 2) * 44, y: 715 - Math.floor(i / 2) * 44 };    /* cubes fill a 2 x 5 frame */
    }
    function home(k) { return { x: 1730 - DIM[k][0] / 2, y: trays[k].offsetTop + 70 - DIM[k][1] / 2 }; }
    function inMat(p) { return p.x >= MAT.x && p.x <= MAT.x + MAT.w && p.y >= MAT.y && p.y <= MAT.y + MAT.h; }

    /* the frame of 10 dashed cells in the ones column, and the little blocks in each tray */
    var frame = $('.b2-frame', sl);
    for (var i = 0; i < 10; i++) { var c = el('i', null, null, frame), s0 = slot('o', i); c.style.left = (s0.x - 130 - 950) + 'px'; c.style.top = (s0.y - 236 - 12) + 'px'; }
    blk('h', 3, 0, $('.b2-art', trays.h));
    for (i = 0; i < 4; i++) blk('t', 24 + 20 * i, 0, $('.b2-art', trays.t));
    [[18, 84], [46, 84], [74, 84], [32, 56], [60, 56], [46, 28]].forEach(function (p) { blk('o', p[0], p[1], $('.b2-art', trays.o)); });

    function words(n) { var d = digits(n), w = []; if (d.h) w.push(d.h + ' ร้อย'); if (d.h || d.t) w.push(d.t + ' สิบ'); w.push(d.o + ' หน่วย'); return w.join(' '); }
    function expand(n) { var d = digits(n), p = []; if (d.h) p.push(d.h * 100); if (d.t) p.push(d.t * 10); if (d.o) p.push(d.o); return n + ' = ' + (p.length ? p.join(' + ') : '0'); }
    function msg(kind, t) { fb.className = 'fb' + (kind ? ' ' + kind : ''); fb.textContent = (kind === 'ok' ? '✓ ' : '') + (t || ''); }
    function update() {
      var v = value();
      KS.forEach(function (k) {
        var f = $('.f', dg[k]);
        f.textContent = cnt[k];
        f.classList.toggle('z', (k === 'h' && cnt.h === 0) || (k === 't' && cnt.h === 0 && cnt.t === 0));
        $('.k', dg[k]).textContent = String(cnt[k] * (k === 'h' ? 100 : k === 't' ? 10 : 1));
      });
      exp.textContent = expand(v);
    }
    function bump(k) { var d = dg[k]; d.classList.remove('bump'); void d.offsetWidth; d.classList.add('bump'); }
    function relayout(k, now) { P[k].forEach(function (b, i) { var s = slot(k, i); put(b, s.x, s.y, now); }); }
    function canAdd(k) { return k === 'h' ? cnt.h < 9 : k === 't' ? (cnt.t < 9 || cnt.h < 9) : (cnt.o < 9 || cnt.t < 9 || cnt.h < 9); }
    function refuse(k) { var t = trays[k]; t.classList.remove('shk'); void t.offsetWidth; t.classList.add('shk'); msg('no', 'แผ่นรองนี้ใส่ได้ถึง 999'); }

    function add(k, from) {
      if (busy) return false;
      if (!canAdd(k)) { refuse(k); return false; }
      var s = from || home(k), b = blk(k, s.x, s.y, layer); hook(b);
      P[k].push(b); cnt[k]++;
      var d = slot(k, P[k].length - 1); put(b, d.x, d.y);
      update(); bump(k); msg('');
      if (cnt.o === 10) regroup('o'); else if (cnt.t === 10) regroup('t');
      return true;
    }
    /* ten of a kind: they slide together, snap into the next block, and that block moves one column left.
       The counts change at once; only the pictures follow, and settle() can finish them instantly at any moment. */
    function regroup(k) {
      busy = true;
      var up = k === 'o' ? 't' : 'h', group = P[k].slice(), nb;
      P[k] = []; cnt[k] = 0;
      nb = blk(up, k === 'o' ? 1217 : 700, 445, layer); nb.style.opacity = 0; hook(nb);
      P[up].push(nb); cnt[up]++;
      fx.push(function () { group.forEach(function (b) { b.remove(); }); nb.style.opacity = ''; nb.classList.remove('flash'); });
      if (still()) { settle(); cascade(); return; }
      q.at(520, function () { group.forEach(function (b, i) { if (k === 'o') put(b, 1217, 715 - 30 * i); else put(b, 700 + 30 * i, 445); }); });
      q.at(940, function () { group.forEach(function (b) { b.remove(); }); nb.style.opacity = ''; nb.classList.add('flash'); say(k === 'o' ? 'ครบ 10 หน่วย ได้ 1 สิบ' : 'ครบ 10 สิบ ได้ 1 ร้อย'); });
      q.at(1340, function () { relayout(up); update(); bump(up); });
      q.at(1880, function () { fx = []; nb.classList.remove('flash'); busy = false; cascade(); });
    }
    function cascade() { if (cnt.t === 10) regroup('t'); }
    function settle() {
      q.clear(); fx.forEach(function (f) { f(); }); fx = []; busy = false;
      KS.forEach(function (k) { P[k].forEach(function (b) { b.style.opacity = ''; b.classList.remove('drag'); }); relayout(k, true); });
      update();
    }
    function remove(b, now) {
      var k = b._k, i = P[k].indexOf(b);
      if (i < 0) return;
      P[k].splice(i, 1); cnt[k]--;
      var h = home(k); b.style.zIndex = 10; put(b, h.x, h.y, now); b.style.opacity = 0;
      setTimeout(function () { b.remove(); }, now ? 0 : 520);
      relayout(k, now); update(); msg('');
    }
    /* set the mat to the number n: extra blocks fly back to the trays, missing ones fly in one by one */
    function setTo(n, anim, done) {
      settle();
      var d = digits(n), delay = 0;
      KS.forEach(function (k) { while (P[k].length > d[k]) remove(P[k][P[k].length - 1], !anim); });
      KS.forEach(function (k) {
        for (var i = P[k].length; i < d[k]; i++) (function (k, i) {
          var h = home(k), b = blk(k, h.x, h.y, layer), s = slot(k, i); hook(b); P[k].push(b); cnt[k]++;
          if (!anim) { put(b, s.x, s.y, true); return; }
          b.style.opacity = 0;
          q.at(delay, function () { b.style.opacity = ''; put(b, s.x, s.y); });
          delay += 110;
        })(k, i);
      });
      update();
      if (done) { if (anim) q.at(delay + 550, done); else done(); }
    }

    /* a block on the mat: drag it off the mat (or tap it) to take it away; drop it on the mat and it goes back to its place */
    function hook(b) {
      b.addEventListener('pointerdown', function (e) {
        if (penOn() || busy || (e.pointerType === 'mouse' && e.button !== 0) || P[b._k].indexOf(b) < 0) return;
        e.preventDefault(); e.stopPropagation();
        var p0 = sp(e), off = { x: p0.x - b._x, y: p0.y - b._y }, moved = false, pid = e.pointerId;
        try { b.setPointerCapture(pid); } catch (er) {}
        function mv(ev) {
          if (ev.pointerId !== pid) return;
          var p = sp(ev);
          if (!moved && Math.hypot(p.x - p0.x, p.y - p0.y) < 9) return;
          if (!moved) { moved = true; b.classList.add('drag'); }
          b.style.transform = 'translate(' + (p.x - off.x) + 'px,' + (p.y - off.y) + 'px)';
        }
        function up(ev) {
          if (ev.pointerId !== pid) return;
          b.removeEventListener('pointermove', mv); b.removeEventListener('pointerup', up); b.removeEventListener('pointercancel', up);
          b.classList.remove('drag');
          if (P[b._k].indexOf(b) < 0) return;
          var p = sp(ev);
          if (ev.type === 'pointerup' && (!moved || !inMat(p))) { remove(b); say('เอาออก 1 ' + NAME[b._k][1]); }
          else put(b, b._x, b._y);
        }
        b.addEventListener('pointermove', mv); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
      });
    }
    /* a tray: tap it to add one block, or drag a block out of it onto the mat */
    KS.forEach(function (k) {
      var t = trays[k], W = DIM[k][0], H = DIM[k][1];
      t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); add(k); } });
      t.addEventListener('pointerdown', function (e) {
        if (penOn() || (e.pointerType === 'mouse' && e.button !== 0)) return;
        e.preventDefault();
        var p0 = sp(e), ghost = null, pid = e.pointerId;
        try { t.setPointerCapture(pid); } catch (er) {}
        function mv(ev) {
          if (ev.pointerId !== pid) return;
          var p = sp(ev);
          if (!ghost) { if (busy || Math.hypot(p.x - p0.x, p.y - p0.y) < 9) return; ghost = blk(k, p.x - W / 2, p.y - H / 2, layer, 'drag'); }
          ghost.style.transform = 'translate(' + (p.x - W / 2) + 'px,' + (p.y - H / 2) + 'px)';
        }
        function up(ev) {
          if (ev.pointerId !== pid) return;
          t.removeEventListener('pointermove', mv); t.removeEventListener('pointerup', up); t.removeEventListener('pointercancel', up);
          var p = sp(ev);
          if (!ghost) { if (ev.type === 'pointerup') add(k); return; }
          var gx = p.x - W / 2, gy = p.y - H / 2; ghost.remove();
          if (ev.type === 'pointerup' && inMat(p) && add(k, { x: gx, y: gy })) return;
          var g2 = blk(k, gx, gy, layer), h = home(k); put(g2, h.x, h.y); g2.style.opacity = 0;   /* not on the mat: back to the tray */
          setTimeout(function () { g2.remove(); }, 520);
        }
        t.addEventListener('pointermove', mv); t.addEventListener('pointerup', up); t.addEventListener('pointercancel', up);
      });
    });

    function check() {
      settle();
      var d = digits(target());
      if (cnt.h === d.h && cnt.t === d.t && cnt.o === d.o) { msg('ok', 'ถูกต้อง! ' + words(target()) + ' = ' + target()); say('ถูกต้อง'); return; }
      for (var j = 0; j < 3; j++) {
        var k = KS[j], diff = d[k] - cnt[k];
        if (diff) { msg('no', 'ตอนนี้ได้ ' + value() + ' · ' + NAME[k][0] + (diff > 0 ? 'ยังขาดอีก ' + diff + ' ' : 'เกินมา ' + (-diff) + ' ') + NAME[k][1]); return; }
      }
    }
    function on(id, f) { $(id).addEventListener('click', function (e) { e.stopPropagation(); f(); }); }
    on('#b2-chk', check);
    on('#b2-ans', function () { setTo(target(), !still(), function () { msg('ok', 'เฉลย: ' + words(target()) + ' = ' + target()); }); });
    on('#b2-rst', function () { setTo(0, !still()); msg(''); });
    on('#b2-new', function () {
      ti = (ti + 1) % TG.length; tgtEl.textContent = target();
      board.classList.remove('swap'); void board.offsetWidth; board.classList.add('swap');
      setTo(0, !still()); msg(''); say('จำนวนใหม่ ' + target());
    });
    function flip(v) { KS.forEach(function (k) { dg[k].classList.toggle('flip', v); }); }
    tgtEl.textContent = target(); update();
    return {
      set: function (st, prev) {
        if (prev < 0) settle();   /* the student's blocks stay when the class comes back to this slide */
        if (st === 1) {
          if (value() === target()) flip(true);
          else if (still() || prev < 0) { setTo(target(), false); flip(true); }
          else { flip(false); setTo(target(), true, function () { flip(true); }); }
        } else flip(false);
      },
      leave: settle
    };
  })();

  /* ============ 3 · 38 + 25 with regrouping. Beat 1: ones slide down (13). Beat 2: ten cubes snap into a ten, carry 1. Beat 3: tens slide down: 63. ============ */
  C['b-add'] = (function () {
    var sl = $('#b-add'), layer = $('#b3-layer'), q = Seq(), bundled = false;
    var btn = $('#b3-bundle'), frame = $('.b3-frame', sl), cap = $('#b3-capt'), cy = $('#b3-cy'), at = $('#b3-at'), ao = $('#b3-ao'), sT = $('.b3-s.t', sl), sO = $('.b3-s.o', sl);
    var CAP = ['เริ่มที่หลักหน่วย: 8 + 5 = ?', '8 + 5 = 13 หน่วย เกิน 10 ช่องแล้ว!', '10 หน่วย มัดเป็น 1 สิบ (ทด 1) เหลือ 3 หน่วย', 'สิบ: 3 + 2 + 1 = 6 ได้ 63'];
    for (var r = 0; r < 2; r++) for (var c = 0; c < 5; c++) { var ce = el('i', null, null, frame); ce.style.left = (7 + 40 * c) + 'px'; ce.style.top = (7 + 40 * r) + 'px'; }
    function A_t(j) { return [360, 292 + 40 * j]; }
    function A_o(k) { return [762 + 40 * (k % 5), 292 + 40 * Math.floor(k / 5)]; }
    function B_t(j) { return [360, 432 + 40 * j]; }
    function B_o(k) { return [762 + 40 * k, 432]; }
    function S_t(j) { return [360, 592 + 40 * j]; }
    function S_o(k) { return k < 10 ? [762 + 40 * (k % 5), 592 + 40 * Math.floor(k / 5)] : [762 + 40 * (k - 10), 702]; }
    var aT, bT, ones, carry;
    function mk(k, p) { return blk(k, p[0], p[1], layer, k === 't' ? 'hz' : ''); }
    function mv(b, p) { put(b, p[0], p[1]); }
    function show(e, v) { e.classList.toggle('vis', v); }
    function marks(st) {
      show(cy, st >= 2); show(ao, st >= 2); show(at, st >= 3);
      sT.textContent = st >= 3 ? '6' : '?'; sO.textContent = st >= 3 ? '3' : '';
      cap.textContent = CAP[Math.min(st, 2)];
      frame.classList.toggle('full', st === 1 && !bundled);
      btn.classList.toggle('on', st === 1 && !bundled);
    }
    function pose(st) {
      q.clear(); layer.textContent = ''; bundled = false;
      aT = []; bT = []; ones = []; carry = null;
      for (var j = 0; j < 3; j++) aT.push(mk('t', st < 3 ? A_t(j) : S_t(1 + j)));
      for (j = 0; j < 2; j++) bT.push(mk('t', st < 3 ? B_t(j) : S_t(4 + j)));
      if (st === 0) { for (var k = 0; k < 8; k++) ones.push(mk('o', A_o(k))); for (k = 0; k < 5; k++) ones.push(mk('o', B_o(k))); }
      else if (st === 1) for (k = 0; k < 13; k++) ones.push(mk('o', S_o(k)));
      else { carry = mk('t', S_t(0)); for (k = 0; k < 3; k++) ones.push(mk('o', S_o(k))); }
      marks(st);
    }
    function play01() {
      pose(0); marks(0);
      ones.forEach(function (b, k) { q.at(120 + 85 * k, function () { mv(b, S_o(k)); }); });
      q.at(120 + 85 * 13 + 450, function () { marks(1); say('8 บวก 5 ได้ 13 หน่วย'); });
    }
    /* the ten cubes in the frame line up, snap into a rod, and the rod moves to the tens; the 3 left over slide into the frame */
    function bundle(after) {
      q.clear(); bundled = true; btn.classList.remove('on'); frame.classList.remove('full');
      var ten = ones.slice(0, 10), rest = ones.slice(10);
      ten.forEach(function (b, i) { q.at(30 * i, function () { put(b, 750 + 30 * i, 612); }); });
      q.at(760, function () { ten.forEach(function (b) { b.remove(); }); carry = mk('t', [750, 612]); carry.classList.add('flash'); });
      q.at(1160, function () { mv(carry, S_t(0)); cap.textContent = CAP[2]; });
      q.at(1500, function () { rest.forEach(function (b, k) { mv(b, S_o(k)); }); ones = rest; show(cy, true); show(ao, true); say('ทด 1 ไปหลักสิบ เหลือ 3 หน่วย'); if (after) after(); });
    }
    function play23() {
      pose(2);
      aT.concat(bT).forEach(function (b, j) { q.at(100 + 140 * j, function () { mv(b, S_t(1 + j)); }); });
      q.at(100 + 140 * 5 + 500, function () { marks(3); say('38 บวก 25 ได้ 63'); });
    }
    function tapBundle(e) { if (e) e.stopPropagation(); if (penOn() || bundled || !sl.classList.contains('b1') || sl.classList.contains('b2')) return; bundle(); }
    btn.addEventListener('click', tapBundle);
    frame.addEventListener('click', tapBundle);
    return {
      set: function (st, prev) {
        if (still() || prev < 0 || st !== prev + 1) { pose(st); return; }
        if (st === 1) play01();
        else if (st === 2) { if (bundled) { marks(2); } else bundle(function () { marks(2); }); }
        else if (st === 3) play23();
      },
      leave: function () { q.clear(); }
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
