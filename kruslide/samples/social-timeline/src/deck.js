/* deck.js · สี่ราชธานีของไทย (ป.5–6) · the live timeline of this sample (vanilla JS, no libraries, no network).
   Years are Buddhist Era (พ.ศ.). Kingdoms as taught in Thai primary schools:
   สุโขทัย ราว พ.ศ. 1792–1981 · อยุธยา พ.ศ. 1893–2310 · ธนบุรี พ.ศ. 2310–2325 · รัตนโกสินทร์ พ.ศ. 2325–ปัจจุบัน.
   Slide 1: drag six event labels into label holders pinned to years; Check / Show answer / Reset.
   Slide 2: a zoomable timeline (slider, kingdom chips, drag to pan); beat 1 lines the slabs up to compare durations; beat 2 zooms to the overlap. */
(function () {
  'use strict';
  var K = KIT, S = K.S, $ = K.$;
  if (!document.getElementById('stage')) return;
  var NOW = Math.max(2569, new Date().getFullYear() + 543);
  var KD = [
    { k: 's', th: 'สุโขทัย', a: 1792, b: 1981, lane: 0, col: '#7F9B7A', from: 'ราว พ.ศ. 1792' },
    { k: 'a', th: 'อยุธยา', a: 1893, b: 2310, lane: 1, col: '#A4553C' },
    { k: 't', th: 'ธนบุรี', a: 2310, b: 2325, lane: 1, col: '#C79C4C' },
    { k: 'r', th: 'รัตนโกสินทร์', a: 2325, b: NOW, lane: 1, col: '#4F7393', now: true }
  ];
  function span(d) { return 'พ.ศ. ' + d.a + '–' + (d.now ? 'ปัจจุบัน' : d.b); }
  function defs(svg) {
    var df = S('defs', {}, svg);
    var lg = S('linearGradient', { id: svg.id + '-brass', x1: 0, y1: 0, x2: 0, y2: 1 }, df);
    S('stop', { offset: 0, 'stop-color': '#E3C996' }, lg); S('stop', { offset: 0.5, 'stop-color': '#C7A56E' }, lg); S('stop', { offset: 1, 'stop-color': '#7E6235' }, lg);
    var pt = S('pattern', { id: svg.id + '-speck', width: 23, height: 17, patternUnits: 'userSpaceOnUse' }, df);
    [[3, 4, .9, 'rgba(255,255,255,.14)'], [14, 10, 1.2, 'rgba(0,0,0,.14)'], [9, 2, .7, 'rgba(0,0,0,.12)'], [19, 14, .8, 'rgba(255,255,255,.1)'], [6, 13, 1, 'rgba(0,0,0,.1)']].forEach(function (c) { S('circle', { cx: c[0], cy: c[1], r: c[2], fill: c[3] }, pt); });
    var h = S('pattern', { id: svg.id + '-hatch', width: 12, height: 12, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, df);
    S('rect', { width: 12, height: 12, fill: 'rgba(241,235,223,.08)' }, h); S('line', { x1: 0, y1: 0, x2: 0, y2: 12, stroke: 'rgba(241,235,223,.55)', 'stroke-width': 3 }, h);
    return df;
  }

  /* ============ slide 1 · the rail ============ */
  (function () {
    var svg = $('#t1-rail'); if (!svg) return;
    var slideEl = $('#t1'), TOP = 226;
    function X(y) { return 140 + (y - 1750) * 2; }
    defs(svg);
    var RY = 294, LA = [214, 264], LB = [306, 356];
    /* slabs */
    KD.forEach(function (d) {
      var y = d.lane ? LB : LA, x0 = X(d.a), x1 = X(Math.min(d.b, 2570));
      S('rect', { x: x0, y: y[0], width: x1 - x0, height: y[1] - y[0], fill: d.col, 'class': 'slab' }, svg);
      S('rect', { x: x0, y: y[0], width: x1 - x0, height: y[1] - y[0], fill: 'url(#t1-rail-speck)' }, svg);
      if (d.k === 't') {
        var tt = S('text', { x: X(2310) - 14, y: LA[0] + 32, 'class': 'slabt', 'text-anchor': 'end', fill: d.col }, svg); tt.style.fill = d.col; tt.textContent = 'ธนบุรี';
        var ty = S('text', { x: X(2310) - 14, y: LA[0] + 52, 'class': 'slaby', 'text-anchor': 'end' }, svg); ty.style.fill = '#B8B1A3'; ty.textContent = 'พ.ศ. 2310–2325';
        S('path', { d: 'M' + (X(2310) - 8) + ' ' + (LA[0] + 26) + ' H' + (X(2317)) + ' V' + LB[0], stroke: d.col, 'stroke-width': 2.5, fill: 'none' }, svg);
      } else {
        var t = S('text', { x: x0 + 16, y: y[0] + 33, 'class': 'slabt' }, svg); t.textContent = d.th;
        var t2 = S('text', { x: x0 + 16 + (d.th.length * 16 + 26), y: y[0] + 32, 'class': 'slaby' }, svg); t2.textContent = span(d).replace('พ.ศ. 1792', 'ราว พ.ศ. 1792');
      }
    });
    /* the brass rail + century ticks */
    S('rect', { x: 120, y: RY - 7, width: 1680, height: 14, rx: 3, fill: 'url(#t1-rail-brass)', stroke: '#6E5530', 'stroke-width': 1.5 }, svg);
    for (var c = 1800; c <= 2500; c += 100) {
      S('line', { x1: X(c), x2: X(c), y1: LB[1] + 4, y2: LB[1] + 14, 'class': 'tick' }, svg);
      if (c === 1900 || c === 2300) continue;   /* a holder's leader runs through these two labels */
      var tc = S('text', { x: X(c), y: LB[1] + 38, 'class': 'tickt' }, svg); tc.textContent = c;
    }
    var tp = S('text', { x: 120, y: LB[1] + 38, 'class': 'tickt', 'text-anchor': 'start' }, svg); tp.textContent = 'พ.ศ.';
    /* holders: [year, centre x, above?] */
    var HOLD = [[1826, 292, 1], [2127, 894, 1], [2325, 1290, 1], [1893, 426, 0], [2310, 1260, 0], [2475, 1590, 0]];
    var holders = HOLD.map(function (h) {
      var yr = h[0], cx = h[1], up = h[2], top = up ? 236 : 650, el = K.el('div', 'holder');
      el.style.left = (cx - 125) + 'px'; el.style.top = top + 'px';
      el.appendChild(K.el('div', 'yr', 'พ.ศ. ' + yr));
      slideEl.insertBefore(el, $('#t1-tray'));
      var yA = up ? (top + 122 - TOP) : (top - TOP), px = X(yr);
      S('path', { d: 'M' + cx + ' ' + yA + ' L' + cx + ' ' + (up ? yA + 26 : yA - 26) + ' L' + px + ' ' + (up ? RY - 20 : RY + 20) + ' L' + px + ' ' + RY, 'class': 'lead-l' }, svg);
      S('circle', { cx: px, cy: RY, r: 9, 'class': 'pin' }, svg);
      return { yr: yr, el: el, x: cx - 125, y: top, card: null };
    });
    /* event labels */
    var EV = [[2127, 'สมเด็จพระนเรศวรประกาศอิสรภาพ'], [2475, 'คณะราษฎรเปลี่ยนแปลงการปกครอง'], [1826, 'พ่อขุนรามคำแหงประดิษฐ์ลายสือไทย'],
      [2325, 'รัชกาลที่ 1 สร้างกรุงรัตนโกสินทร์'], [1893, 'สร้างกรุงศรีอยุธยาเป็นราชธานี'], [2310, 'สมเด็จพระเจ้าตากสินตั้งกรุงธนบุรี']];
    function home(i) { return { x: 156 + (i % 3) * 268, y: 812 + Math.floor(i / 3) * 96 }; }
    var cards = EV.map(function (e, i) {
      var el = K.el('div', 'evt', e[1]); el.tabIndex = 0; el.setAttribute('role', 'button');
      el.appendChild(K.el('span', 'tw-mark'));
      slideEl.appendChild(el);
      var C = { yr: e[0], el: el, i: i, h: null, x: 0, y: 0 }; put(C, home(i).x, home(i).y);
      var gx = 0, gy = 0, from = null;
      K.drag(el, {
        start: function (p) { gx = p.x - C.x; gy = p.y - C.y; from = C.h; },
        move: function (p) {
          if (!el.classList.contains('drag')) { el.classList.add('drag'); unmark(C); if (C.h) { C.h.card = null; C.h.el.classList.remove('full'); C.h = null; } }
          put(C, p.x - gx, p.y - gy);
          holders.forEach(function (h) { h.el.classList.toggle('over', h === hit(p)); });
        },
        end: function (p, e, moved) {
          el.classList.remove('drag'); holders.forEach(function (h) { h.el.classList.remove('over'); });
          if (!moved) return;
          var h = hit(p);
          if (h) drop(C, h, from); else goHome(C);
          ft.say('');
        }
      });
      return C;
    });
    function hit(p) { for (var k = 0; k < holders.length; k++) { var h = holders[k]; if (p.x > h.x - 24 && p.x < h.x + 274 && p.y > h.y - 24 && p.y < h.y + 146) return h; } return null; }
    function put(C, x, y) { C.x = x; C.y = y; C.el.style.left = x + 'px'; C.el.style.top = y + 'px'; }
    function fly(C, x, y) { var x0 = C.x, y0 = C.y; K.tween(520, function (q) { put(C, x0 + (x - x0) * q, y0 + (y - y0) * q); }); C.x = x; C.y = y; }
    function seat(C, h, anim) {
      C.h = h; h.card = C; h.el.classList.add('full');
      if (anim) fly(C, h.x + 2, h.y + 36); else put(C, h.x + 2, h.y + 36);
    }
    function goHome(C, anim) {
      if (C.h) { C.h.card = null; C.h.el.classList.remove('full'); C.h = null; }
      var p = home(C.i); fly(C, p.x, p.y);
    }
    function drop(C, h, from) {
      var other = h.card;
      if (other && other !== C) { unmark(other); h.card = null; if (from) seat(other, from, true); else goHome(other); }
      seat(C, h, false);
    }
    function unmark(C) { C.el.classList.remove('ok', 'no'); var f = C.el.querySelector('.fix'); if (f) f.remove(); }
    function mark(C, ok) {
      unmark(C); C.el.classList.add(ok ? 'ok' : 'no');
      var m = C.el.querySelector('.tw-mark'); m.textContent = ''; m.appendChild(K.ico(ok ? 'check' : 'cross'));
      if (!ok) { C.el.appendChild(K.el('div', 'fix', 'ที่ถูก: พ.ศ. ' + C.yr)); K.shake(C.el); }
    }
    function check() {
      var placed = cards.filter(function (C) { return C.h; }), right = 0;
      if (!placed.length) { ft.say('info', 'ลากป้ายเหตุการณ์ไปใส่ช่องก่อนนะ'); return; }
      placed.forEach(function (C) { var ok = C.h.yr === C.yr; if (ok) right++; mark(C, ok); });
      if (right === cards.length) ft.say('ok', 'ถูกทั้ง 6 ป้าย เรียงเหตุการณ์ได้ครบ!');
      else ft.say(right === placed.length ? 'info' : 'no', 'ถูก ' + right + ' จาก ' + placed.length + ' ป้าย' + (placed.length < 6 ? ' · เหลืออีก ' + (6 - placed.length) : '') + (right < placed.length ? ' · ป้ายสีแดงบอกปีที่ถูกไว้' : ''));
    }
    function show() {
      cards.forEach(function (C) { if (C.h) { C.h.card = null; C.h.el.classList.remove('full'); C.h = null; } });
      cards.forEach(function (C) { var h = holders.filter(function (x) { return x.yr === C.yr; })[0]; C.h = h; h.card = C; h.el.classList.add('full'); fly(C, h.x + 2, h.y + 36); mark(C, true); });
      ft.say('ok', 'เฉลย: ป้ายทุกใบอยู่ที่ปีของตัวเอง');
    }
    function reset() { cards.forEach(function (C) { unmark(C); goHome(C); }); ft.say(''); }
    var ft = K.foot($('#t1-ft'), { check: check, show: show, reset: reset, hint: 'ลากป้ายเหตุการณ์ไปใส่ช่องปี พ.ศ. ที่ถูกต้อง' });
    K.slide('t1', { set: function () {} });
    window.__tl1 = { cards: cards, holders: holders, check: check, show: show, reset: reset };
  })();

  /* ============ slide 2 · zoom ============ */
  (function () {
    var svg = $('#t2-tl'); if (!svg) return;
    defs(svg);
    var W = 1700, LA = [64, 134], LB = [150, 220], AX = 246;
    var FULL = { c: 2165, s: 860 }, v = { c: FULL.c, s: FULL.s };
    var gT = S('g', {}, svg), gB = S('g', {}, svg), gL = S('g', {}, svg);
    var ov = S('rect', { y: LA[0] - 10, height: LB[1] - LA[0] + 20, 'class': 'zov', fill: 'url(#t2-tl-hatch)' }, svg);
    var ovt = S('text', { y: LA[0] - 20, 'class': 'zovt' }, svg); ovt.textContent = 'ซ้อนกัน 88 ปี';
    S('rect', { x: 0, y: 0, width: W, height: 330, fill: 'transparent' }, svg);
    var bars = KD.map(function (d) {
      var y = d.lane ? LB : LA;
      return { d: d, r: S('rect', { y: y[0], height: y[1] - y[0], fill: d.col, 'class': 'zbar' }, gB), sp: S('rect', { y: y[0], height: y[1] - y[0], fill: 'url(#t2-tl-speck)' }, gB), y: y };
    });
    function X(yr) { return (yr - (v.c - v.s / 2)) * W / v.s; }
    function T(at, txt, cls, p) { var t = S('text', at, p); t.setAttribute('class', cls); t.textContent = txt; return t; }
    function render() {
      gT.textContent = ''; gL.textContent = '';
      var pxy = W / v.s, steps = [200, 100, 50, 20, 10, 5, 2, 1], st = steps[0];
      for (var i = 0; i < steps.length; i++) if (steps[i] * pxy >= 120) st = steps[i];
      S('line', { x1: 0, x2: W, y1: AX, y2: AX, 'class': 'zt m' }, gT);
      var first = true;
      for (var y = Math.ceil((v.c - v.s / 2) / st) * st; y <= v.c + v.s / 2; y += st) {
        var x = X(y), major = y % (st * 5) === 0 || st >= 100;
        S('line', { x1: x, x2: x, y1: AX, y2: AX + (major ? 18 : 11), 'class': 'zt' + (major ? ' m' : '') }, gT);
        if (x < 70 || x > W - 40) continue;   /* keep labels inside the case */
        T({ x: x, y: AX + 46 }, (first ? 'พ.ศ. ' : '') + y, 'ztt', gT); first = false;
      }
      bars.forEach(function (B) {
        var d = B.d, x0 = X(d.a), x1 = X(d.b), w = Math.max(0, x1 - x0);
        [B.r, B.sp].forEach(function (r) { r.setAttribute('x', x0); r.setAttribute('width', w); });
        var vis0 = Math.max(x0, 0), vis1 = Math.min(x1, W), vw = vis1 - vis0, yrs = d.b - d.a;
        if (vw <= 0) return;
        var line2 = span(d) + ' · ' + (d.now ? yrs + ' ปี และยังนับต่อ' : (d.k === 's' ? 'ราว ' : '') + yrs + ' ปี');
        if (vw > 330) {
          T({ x: vis0 + 18, y: B.y[0] + 30 }, d.th, 'zname', gL);
          T({ x: vis0 + 18, y: B.y[0] + 56 }, line2, 'zsub', gL);
        } else if (vw > 110) {
          T({ x: vis0 + 12, y: B.y[0] + 42 }, d.th, 'zname', gL);
        } else if (d.k === 't') {   /* Thonburi is narrow: its label sits in the empty upper lane with a leader */
          var cx = Math.min(Math.max((x0 + x1) / 2, 40), W - 40);
          S('path', { d: 'M' + cx + ' ' + (LA[1] - 6) + ' V' + LB[0], stroke: d.col, 'stroke-width': 2.5, fill: 'none' }, gL);
          var t = T({ x: cx, y: LA[1] - 16, 'text-anchor': 'middle' }, 'ธนบุรี · ' + yrs + ' ปี', 'zout', gL); t.style.fill = d.col;
        }
      });
      ov.setAttribute('x', X(1893)); ov.setAttribute('width', X(1981) - X(1893));
      ovt.setAttribute('x', (X(1893) + X(1981)) / 2);
      var z = FULL.s / v.s;
      $('#t2-zv').textContent = (z < 10 ? z.toFixed(1) : Math.round(z)) + '×';
      var t01 = Math.log(z) / Math.log(ZMAX);
      $('#t2-knob').style.left = 'calc(20px + ' + t01.toFixed(4) + ' * (100% - 40px))'; $('#t2-fill').style.width = 'calc(20px + ' + t01.toFixed(4) + ' * (100% - 40px))';
    }
    var ZMAX = 50;
    function clampV() {
      v.s = K.clamp(v.s, FULL.s / ZMAX, FULL.s);
      var lo = 1700 + v.s / 2, hi = 2640 - v.s / 2;
      v.c = lo > hi ? FULL.c : K.clamp(v.c, lo, hi);
    }
    var A = K.Anim();
    function goTo(c, s, ms) {
      var c0 = v.c, s0 = v.s;
      A.run(ms == null ? 800 : ms, function (p) { v.c = c0 + (c - c0) * p; v.s = Math.exp(Math.log(s0) + (Math.log(s) - Math.log(s0)) * p); clampV(); render(); }, null, K.eio);
    }
    /* chips */
    var chips = $('#t2-chips'), cb = [];
    [{ th: 'ทั้งหมด', c: FULL.c, s: FULL.s }].concat(KD.map(function (d) { var len = d.b - d.a; return { th: d.th, c: (d.a + d.b) / 2, s: Math.max(24, len * 1.3), col: d.col }; })).forEach(function (o) {
      var b = K.el('button'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      if (o.col) { var i = K.el('i'); i.style.background = o.col; b.appendChild(i); }
      b.appendChild(document.createTextNode(o.th));
      b.addEventListener('click', function (e) { e.stopPropagation(); cb.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); goTo(o.c, o.s); });
      chips.appendChild(b); cb.push(b);
    });
    function unpress() { cb.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); }
    /* slider: log zoom, around the current centre */
    var track = $('#t2-track');
    track.tabIndex = 0; track.setAttribute('role', 'slider'); track.setAttribute('aria-label', 'ซูมเส้นเวลา');
    function fromTrack(e) { var r = track.getBoundingClientRect(), pad = 20 * r.width / track.offsetWidth, t = K.clamp((e.clientX - r.left - pad) / (r.width - 2 * pad), 0, 1); A.stop(); unpress(); v.s = FULL.s / Math.pow(ZMAX, t); clampV(); render(); }
    K.drag(track, { slop: 0, start: function (p, e) { fromTrack(e); }, move: function (p, d, e) { fromTrack(e); } });
    track.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault(); e.stopPropagation(); A.stop(); unpress(); v.s *= e.key === 'ArrowUp' ? 0.8 : 1.25; clampV(); render();
    });
    /* drag the case to pan */
    var last = null;
    K.drag(svg, { slop: 2,
      start: function (p, e) { last = K.svgPt(svg, e).x; A.stop(); },
      move: function (p, d, e) { var x = K.svgPt(svg, e).x; v.c -= (x - last) * v.s / W; last = x; unpress(); clampV(); render(); } });
    svg.addEventListener('wheel', function (e) { e.preventDefault(); A.stop(); unpress(); v.s *= e.deltaY > 0 ? 1.15 : 0.87; clampV(); render(); }, { passive: false });
    render();

    /* beat 1: comparison rows, flown down from the timeline */
    var cmp = $('#t2-cmp'), KPX = 1040 / 417, rows = KD.map(function (d, i) {
      var r = K.el('div', 'row'); r.style.top = (i * 74) + 'px';
      r.appendChild(K.el('div', 'nm', d.th));
      var bar = K.el('div', 'bar'); bar.style.background = d.col; bar.style.width = ((d.b - d.a) * KPX) + 'px'; r.appendChild(bar);
      var y = K.el('div', 'yrs'); y.style.left = (290 + (d.b - d.a) * KPX + 22) + 'px';
      var n = K.el('span', '', String(d.b - d.a)); y.appendChild(n); y.appendChild(K.el('span', 'u', 'ปี'));
      y.appendChild(K.el('small', '', d.now ? 'ถึง พ.ศ. ' + NOW + ' และยังนับต่อ' : (d.k === 's' ? 'ราว ' : '') + span(d)));
      r.appendChild(y); cmp.appendChild(r);
      return { d: d, bar: bar, n: n };
    });
    function flyDown() {
      rows.forEach(function (R, i) {
        var tb = bars[i].r.getBoundingClientRect(), fb = R.bar.getBoundingClientRect();
        var to = R.d.b - R.d.a;
        if (!K.rm() && R.bar.animate && tb.width > 0 && fb.width > 0) {
          R.bar.animate([{ transform: 'translate(' + ((tb.left - fb.left) / K.scale()) + 'px,' + ((tb.top - fb.top) / K.scale()) + 'px) scale(' + (tb.width / fb.width) + ',' + (tb.height / fb.height) + ')' }, { transform: 'none' }],
            { duration: 900, delay: i * 140, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
        }
        R.n.textContent = '0';
        setTimeout(function () { K.tween(800, function (q) { R.n.textContent = Math.round(to * q); }); }, K.rm() ? 0 : 500 + i * 140);
      });
    }
    K.slide('t2', {
      set: function (st, prev) {
        if (prev === -1) { A.stop(); v.c = FULL.c; v.s = FULL.s; unpress(); render(); if (st >= 1) rows.forEach(function (R) { R.n.textContent = R.d.b - R.d.a; }); if (st >= 2) goTo(1937, 210, 0); return; }
        if (st === 1 && prev === 0) { A.stop(); v.c = FULL.c; v.s = FULL.s; render(); flyDown(); }
        if (st === 2) { unpress(); goTo(1937, 210, 1100); }
        if (st === 1 && prev === 2) { goTo(FULL.c, FULL.s, 800); }
      },
      leave: function () { A.stop(); }
    });
    window.__tl2 = { v: v, render: render, goTo: goTo };
  })();
})();
