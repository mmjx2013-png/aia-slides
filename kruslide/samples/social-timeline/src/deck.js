/* deck.js · สุโขทัย รุ่งอรุณแห่งความสุข (ป.4–6) · the live parts of this sample (vanilla JS, no libraries, no network).
   Years are Buddhist Era (พ.ศ.), as taught in Thai schools: สุโขทัย ราว 1792–1981 · อยุธยา 1893–2310 · ธนบุรี 2310–2325 ·
   รัตนโกสินทร์ 2325–ปัจจุบัน. ลายสือไทย พ.ศ. 1826 (the inscription's 1205 ศก), the date in common use.
   Slide 2 (#city): five hotspots on the drawn plan open cards in the photo panel (iris from the plan side); beat 1 = the dam card.
   Slide 3 (#stone): a magnifier that follows the pointer anywhere on the stele; old words flip a modern word above them.
   Slide 4 (#river): drag (or tap, then tap) six event cards onto six landings; Check / Show answer / Reset with no red marks.
       Beat 1 straightens the river into a true-scale axis and grows the lanes into proportional bars that count their years.
   Test hooks: body.ready once fonts are in; __deck.state() also reports {slide, step} for the type-1 QA script. */
(function () {
  'use strict';
  var K = KIT, S = K.S, $ = K.$, $$ = K.$$;
  if (!document.getElementById('stage')) return;
  var NOW = Math.max(2569, new Date().getFullYear() + 543);

  /* ============ slide 2 · the city plan ============ */
  (function () {
    var slide = document.getElementById('city'); if (!slide) return;
    var hs = $$('.hs', slide), cards = {}, z = 1, cur = null;
    $$('.card', slide).forEach(function (c) { cards[c.dataset.k] = c; });
    function open(k, instant) {
      if (cur === k) return;
      var prev = cur ? cards[cur] : null, next = cards[k]; cur = k;
      hs.forEach(function (b) { var on = b.dataset.k === k; b.classList.toggle('cur', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      next.style.zIndex = ++z;
      if (instant || K.rm()) {
        Object.keys(cards).forEach(function (q) { cards[q].classList.remove('was', 'cur'); });
        next.style.transition = 'none'; next.classList.add('cur'); void next.offsetWidth; next.style.transition = '';
        return;
      }
      if (prev) { prev.classList.remove('cur'); prev.classList.add('was'); clearTimeout(prev._t); prev._t = setTimeout(function () { prev.classList.remove('was'); }, 900); }
      next.classList.remove('was'); next.classList.add('cur');
    }
    hs.forEach(function (b) {
      b.setAttribute('aria-label', b.textContent.trim() + ' · เปิดการ์ด');
      b.addEventListener('click', function (e) { e.stopPropagation(); open(b.dataset.k); });
    });
    K.slide('city', { set: function (st, prev) {
      if (prev === -1) { cur = null; open(st >= 1 ? 'dam' : 'mahathat', true); return; }
      if (st === 1) open('dam');
    } });
  })();

  /* ============ slide 3 · the stone ============ */
  (function () {
    var slide = document.getElementById('stone'); if (!slide) return;
    var col = document.getElementById('st-col'), lens = document.getElementById('st-lens'), hint = document.getElementById('st-hint');
    /* the lens image is the inscribed face, column px x 150..700, y 170..910, shown 2x */
    var F = { x0: 150, y0: 170, x1: 700, y1: 910 }, M = 2, R = 160;
    lens.style.backgroundSize = ((F.x1 - F.x0) * M) + 'px ' + ((F.y1 - F.y0) * M) + 'px';
    function place(x, y) {
      x = K.clamp(x, F.x0, F.x1); y = K.clamp(y, F.y0, F.y1);
      lens.style.left = x + 'px'; lens.style.top = y + 'px';
      lens.style.backgroundPosition = (R - (x - F.x0) * M) + 'px ' + (R - (y - F.y0) * M) + 'px';
      col.dataset.lx = Math.round(x); col.dataset.ly = Math.round(y);
    }
    function local(p) { var b = K.box(col); return { x: p.x - b.x, y: p.y - b.y }; }
    K.drag(col, {
      slop: 0,
      start: function (p) { var q = local(p); place(q.x, q.y); hint.classList.add('used'); },
      move: function (p) { var q = local(p); place(q.x, q.y); }
    });
    place(430, 330);

    var words = $$('.ow', slide);
    /* flip one old word to its modern word; the word's box eases to the new width so the line re-flows smoothly */
    function flip(w, on) {
      if (w.classList.contains('flip') === on) return;
      var sz = $('.sz', w), f = $('.f', w).textContent, b = $('.b', w).textContent, w0 = w.getBoundingClientRect().width / K.scale();
      w.classList.toggle('flip', on); w.setAttribute('aria-pressed', on ? 'true' : 'false'); sz.textContent = on ? b : f;
      if (K.rm()) { w.style.width = ''; return; }
      w.style.width = ''; var w1 = w.getBoundingClientRect().width / K.scale();
      w.style.width = w0 + 'px'; void w.offsetWidth; w.style.width = w1 + 'px';
      clearTimeout(w._t); w._t = setTimeout(function () { w.style.width = ''; }, 600);
    }
    words.forEach(function (w) {
      var f = $('.f', w).textContent, b = $('.b', w).textContent;
      w.setAttribute('aria-label', 'คำเก่า ' + f + ' · แตะเพื่อดูคำปัจจุบัน'); w.setAttribute('aria-pressed', 'false');
      w.addEventListener('click', function (e) {
        e.stopPropagation(); var on = !w.classList.contains('flip'); flip(w, on); if (on) K.announce(f + ' คือ ' + b);
      });
    });
    var timers = [];
    function all(on, stagger) {
      timers.forEach(clearTimeout); timers = [];
      words.forEach(function (w, i) {
        if (stagger && !K.rm()) timers.push(setTimeout(function () { flip(w, on); }, 250 + i * 180)); else flip(w, on);
      });
    }
    K.slide('stone', {
      set: function (st, prev) {
        if (prev === -1) { place(430, 330); hint.classList.remove('used'); all(st >= 1, false); return; }
        all(st >= 1, st >= 1);
      },
      leave: function () { timers.forEach(clearTimeout); timers = []; }
    });
  })();

  /* ============ slide 4 · the river of time ============ */
  (function () {
    var slide = document.getElementById('river'); if (!slide) return;
    var svg = document.getElementById('rv-svg'), layer = document.getElementById('rv-layer');
    var KD = {
      s: { th: 'สุโขทัย', a: 1792, b: 1981, col: '#C94F6A', yrs: 'ราว พ.ศ. 1792–1981', pre: 'ราว ' },
      a: { th: 'อยุธยา', a: 1893, b: 2310, col: '#4E62AE', yrs: 'พ.ศ. 1893–2310', pre: '' },
      t: { th: 'ธนบุรี', a: 2310, b: 2325, col: '#DD9228', yrs: 'พ.ศ. 2310–2325', pre: '' },
      r: { th: 'รัตนโกสินทร์', a: 2325, b: NOW, col: '#2C8C80', yrs: 'พ.ศ. 2325–ปัจจุบัน', pre: '' }
    };
    var EV = [
      { y: 1792, yl: 'ราว พ.ศ. 1792', t: 'ตั้งกรุงสุโขทัย', k: 's' },
      { y: 1826, yl: 'พ.ศ. 1826', t: 'พ่อขุนรามคำแหงทรงคิดลายสือไทย', k: 's' },
      { y: 1893, yl: 'พ.ศ. 1893', t: 'สร้างกรุงศรีอยุธยา', k: 'a' },
      { y: 1981, yl: 'ราว พ.ศ. 1981', t: 'สุโขทัยรวมเข้ากับอยุธยา', k: 's' },
      { y: 2310, yl: 'พ.ศ. 2310', t: 'เสียกรุงศรีอยุธยา ตั้งกรุงธนบุรี', k: 't' },
      { y: 2325, yl: 'พ.ศ. 2325', t: 'สร้างกรุงรัตนโกสินทร์', k: 'r' }
    ];
    var TRAY = [3, 5, 1, 4, 0, 2];                       /* which event sits in each tray place (not in time order) */
    var SX = [255, 537, 819, 1101, 1383, 1665], SLOT_Y = 330, CW = 250, CH = 104, TRAY_Y = 760;
    function trayX(j) { return 110 + j * 282; }
    /* beat 0: a winding river; beat 1: a straight, true-scale axis */
    var RX = []; for (var x = -40; x <= 1960; x += 40) RX.push(x);
    function wave(x) { return 548 + 22 * Math.sin((x - 80) / 1920 * Math.PI * 2 * 1.6); }
    function X(y) { return 160 + (y - 1750) * 1.86; }
    var AXIS_Y = 352, ROW = { s: 466, a: 558, t: 650, r: 742 }, BAR_H = 62, LANE = { s: 640, a: 698, t: 698, r: 698 }, LANE_H = 44;
    var ORDER = ['s', 'a', 't', 'r'];
    function laneEnds(k) {
      if (k === 's') return [SX[0], SX[3]]; if (k === 'a') return [SX[2], SX[4]]; if (k === 't') return [SX[4], SX[5]]; return [SX[5], 1880];
    }
    function geo(b) {
      var g = { riv: [], rw: b ? 16 : 58, pins: [], lanes: {}, meds: {} };
      RX.forEach(function (x) { g.riv.push(b ? AXIS_Y : wave(x)); });
      EV.forEach(function (e, i) { g.pins.push(b ? { x: X(e.y), y: AXIS_Y, r: 9 } : { x: SX[i], y: wave(SX[i]), r: 15 }); });
      ORDER.forEach(function (k) {
        var d = KD[k];
        if (b) { var x0 = X(d.a), x1 = X(d.b); g.lanes[k] = { x: x0, y: ROW[k] - BAR_H / 2, w: Math.max(x1 - x0, 6), h: BAR_H }; g.meds[k] = { cx: x0 - 54, cy: ROW[k], d: 76 }; }
        else { var e = laneEnds(k); g.lanes[k] = { x: e[0], y: LANE[k] - LANE_H / 2, w: e[1] - e[0], h: LANE_H }; g.meds[k] = { cx: e[0], cy: LANE[k], d: 56 }; }
      });
      return g;
    }
    var G0 = geo(false), G1 = geo(true);
    function smooth(pts) {                               /* Catmull-Rom through the points, as cubic Béziers */
      var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
      }
      return d;
    }

    /* ---- build the SVG ---- */
    var defs = S('defs', {}, svg);
    var hp = S('pattern', { id: 'rv-hatch', width: 12, height: 12, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    S('rect', { width: 12, height: 12, fill: 'rgba(255,255,255,.0)' }, hp); S('line', { x1: 0, y1: 0, x2: 0, y2: 12, stroke: 'rgba(43,33,53,.35)', 'stroke-width': 4 }, hp);
    var ticks = S('g', { 'class': 'tick' }, svg);
    for (var ty = 1800; ty <= 2500; ty += 100) {
      var tg = S('g', {}, ticks); S('line', { x1: X(ty), x2: X(ty), y1: AXIS_Y - 14, y2: AXIS_Y + 14 }, tg);
      S('text', { x: X(ty), y: AXIS_Y + 46 }, tg).textContent = (ty === 1800 ? 'พ.ศ. ' : '') + ty;
    }
    var riv0 = S('path', { 'class': 'riv0' }, svg), riv = S('path', { 'class': 'riv' }, svg), riv2 = S('path', { 'class': 'riv2' }, svg);
    var today = S('g', { 'class': 'today' }, svg);
    S('circle', { cx: X(NOW), cy: AXIS_Y, r: 10, fill: '#2C8C80', stroke: '#fff', 'stroke-width': 3 }, today);
    S('text', { x: X(NOW), y: AXIS_Y - 26 }, today).textContent = 'วันนี้ พ.ศ. ' + NOW;
    var stems = S('g', {}, svg), stemEls = EV.map(function () { return S('line', { 'class': 'stem' }, stems); });
    var hatch = S('rect', { fill: 'url(#rv-hatch)', rx: 8, opacity: 0 }, svg);
    var laneEls = {};
    ORDER.forEach(function (k) { laneEls[k] = S('rect', { fill: KD[k].col, rx: 22 }, svg); });
    var pins = S('g', {}, svg), pinEls = EV.map(function () { return S('circle', { 'class': 'pin', fill: '#fff', stroke: '#2B2135' }, pins); });

    /* ---- HTML: slots, tray, cards, labels ---- */
    var tray = K.el('div', 'tray'); tray.setAttribute('aria-hidden', 'true'); layer.appendChild(tray);
    var slots = EV.map(function (e, i) {
      var b = K.el('button', 'slot'); b.type = 'button'; b.style.left = (SX[i] - CW / 2) + 'px'; b.style.top = SLOT_Y + 'px';
      b.setAttribute('aria-label', 'ท่าน้ำ ' + e.yl);
      var yr = K.el('span', 'yr', e.yl); b.appendChild(yr); layer.appendChild(b); return b;
    });
    var place = EV.map(function () { return -1; }), at = EV.map(function () { return -1; });   /* card -> slot, slot -> card */
    var sel = -1, beat = 0;
    var cards = EV.map(function (e, i) {
      var c = K.el('div', 'ev-card'); c.tabIndex = 0; c.setAttribute('role', 'button');
      c.style.setProperty('--k', KD[e.k].col);
      c.appendChild(K.el('span', '', e.t)); var mk = K.ico('check'); mk.setAttribute('class', 'mk'); c.appendChild(mk);
      c.setAttribute('aria-label', 'ป้าย: ' + e.t); layer.appendChild(c); return c;
    });
    function home(i) { var j = TRAY.indexOf(i); return { x: trayX(j), y: TRAY_Y }; }
    function setPos(i, x, y) { cards[i].style.left = x + 'px'; cards[i].style.top = y + 'px'; }
    function trayState() { tray.classList.toggle('empty', place.every(function (s) { return s >= 0; })); }
    function clearMarks(i) { cards[i].classList.remove('ok', 'try'); paintPin(place[i]); }
    function toTray(i) { if (place[i] >= 0) { at[place[i]] = -1; paintPin(place[i]); } place[i] = -1; var h = home(i); setPos(i, h.x, h.y); clearMarks(i); trayState(); }
    function put(i, s) {
      if (at[s] >= 0 && at[s] !== i) toTray(at[s]);
      if (place[i] >= 0 && place[i] !== s) { at[place[i]] = -1; paintPin(place[i]); }
      place[i] = s; at[s] = i; setPos(i, SX[s] - CW / 2, SLOT_Y); clearMarks(i); trayState();
      ft.say('');
    }
    function select(i) { sel = i; cards.forEach(function (c, j) { c.classList.toggle('sel', j === i); }); }
    var ftHost = document.getElementById('rv-ft');
    var ft = K.foot(ftHost, { check: check, show: show, reset: reset, hint: 'แตะป้ายแล้วแตะท่าน้ำก็ได้ · วางให้ครบ 6 ป้ายแล้วกดตรวจคำตอบ' });
    function paintPin(s) {
      if (s < 0) return; var i = at[s], ok = i === s && cards[i] && cards[i].classList.contains('ok');
      pinEls[s].setAttribute('fill', (ok || beat === 1) ? KD[EV[s].k].col : '#fff');
    }
    function check() {
      select(-1); var n = 0, wrong = [], empty = 0;
      EV.forEach(function (e, s) {
        var i = at[s]; if (i < 0) { empty++; return; }
        if (i === s) { cards[i].classList.add('ok'); n++; } else { cards[i].classList.add('try'); wrong.push(i); K.shake(cards[i]); }
        paintPin(s);
      });
      if (n === 6) { ft.say('ok', 'ถูกครบทั้ง 6 ป้าย! กด → เพื่อยืดสายน้ำตามจำนวนปีจริง'); return; }
      if (!n && !wrong.length) { ft.say('info', 'ลากป้ายจากถาดไปวางที่ท่าน้ำก่อน แล้วค่อยกดตรวจ'); return; }
      ft.say('info', 'ถูกแล้ว ' + n + ' ป้าย' + (wrong.length ? ' · ป้ายที่ยังไม่ตรงกลับไปที่ถาดแล้ว ลองใหม่' : '') + (empty ? ' · ยังว่าง ' + empty + ' ท่า' : ''));
      K.wait(900, function () { wrong.forEach(function (i) { if (cards[i].classList.contains('try')) toTray(i); }); });
    }
    function show() { select(-1); EV.forEach(function (e, i) { put(i, i); cards[i].classList.add('ok'); paintPin(i); }); ft.say('ok', 'นี่คือคำตอบ · กด → เพื่อดูว่าแต่ละราชธานียาวนานแค่ไหน'); }
    function reset() { select(-1); EV.forEach(function (e, i) { toTray(i); }); ft.say(''); }
    function slotAt(cx, cy) {
      var best = -1, bd = 1e9;
      SX.forEach(function (sx, s) { var dx = Math.abs(cx - sx), dy = Math.abs(cy - (SLOT_Y + CH / 2)); if (dx < CW / 2 + 30 && dy < CH / 2 + 50 && dx + dy < bd) { bd = dx + dy; best = s; } });
      return best;
    }
    cards.forEach(function (c, i) {
      var off = null;
      K.drag(c, {
        start: function (p) { if (beat !== 0) return false; var b = K.box(c); off = { x: p.x - b.x, y: p.y - b.y }; },
        move: function (p) {
          c.classList.add('drag'); var x = p.x - off.x, y = p.y - off.y; setPos(i, x, y);
          var s = slotAt(x + CW / 2, y + CH / 2); slots.forEach(function (b, j) { b.classList.toggle('over', j === s); });
        },
        end: function (p, e, moved, cancelled) {
          c.classList.remove('drag'); slots.forEach(function (b) { b.classList.remove('over'); });
          if (!moved) { select(sel === i ? -1 : i); return; }
          var b = K.box(c), s = cancelled ? -1 : slotAt(b.x + b.w / 2, b.y + b.h / 2);
          select(-1);
          if (s >= 0) put(i, s); else toTray(i);
        }
      });
      c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); select(sel === i ? -1 : i); } });
    });
    slots.forEach(function (b, s) {
      b.addEventListener('click', function (e) {
        e.stopPropagation(); if (beat !== 0) return;
        if (sel >= 0) { put(sel, s); select(-1); } else if (at[s] >= 0) select(at[s]);
      });
    });

    var laneLb = {}, barLb = {}, cnt = {}, meds = {};
    $$('.med', layer).forEach(function (m) { meds[m.dataset.k] = m; });
    ORDER.forEach(function (k) {
      var d = KD[k];
      var l = K.el('span', 'lane-lb', d.th); layer.appendChild(l); laneLb[k] = l;
      var g1 = G1.lanes[k], inBar = g1.w > 200;
      var bl = K.el('span', 'bar-lb ' + (inBar ? 'in-bar' : 'out'));
      bl.appendChild(K.el('b', '', d.th)); bl.appendChild(K.el('small', '', d.yrs)); layer.appendChild(bl); barLb[k] = bl;
      bl.style.top = (g1.y) + 'px'; bl.style.height = g1.h + 'px';
      var cw = K.el('span', 'cnt-w'); cw.style.setProperty('--k', d.col);
      if (d.pre) cw.appendChild(document.createTextNode(d.pre));
      var nb = K.el('b', '', '0'); cw.appendChild(nb); cw.appendChild(document.createTextNode(' ปี')); layer.appendChild(cw);
      cnt[k] = { el: cw, n: nb, v: d.b - d.a };
      if (inBar) { bl.style.left = (g1.x + 20) + 'px'; cw.style.left = (g1.x + g1.w + 22) + 'px'; }
      else { bl.style.left = (g1.x + g1.w + 22) + 'px'; cw.style.left = (g1.x + g1.w + 200) + 'px'; }
      cw.style.top = (ROW[k] - 28) + 'px';
    });

    /* ---- draw one state, mixing beat 0 (a) and beat 1 (b) by p ---- */
    function lerp(a, b, p) { return a + (b - a) * p; }
    function draw(p) {
      var pts = RX.map(function (x, i) { return [x, lerp(G0.riv[i], G1.riv[i], p)]; }), d = smooth(pts), w = lerp(G0.rw, G1.rw, p);
      riv0.setAttribute('d', d); riv0.setAttribute('stroke-width', w + 6); riv.setAttribute('d', d); riv.setAttribute('stroke-width', w); riv2.setAttribute('d', d); riv2.setAttribute('stroke-width', Math.max(3, w * 0.28));
      EV.forEach(function (e, i) {
        var a = G0.pins[i], b = G1.pins[i], x = lerp(a.x, b.x, p), y = lerp(a.y, b.y, p);
        pinEls[i].setAttribute('cx', x.toFixed(1)); pinEls[i].setAttribute('cy', y.toFixed(1)); pinEls[i].setAttribute('r', lerp(a.r, b.r, p).toFixed(1));
        stemEls[i].setAttribute('x1', SX[i]); stemEls[i].setAttribute('y1', SLOT_Y + CH); stemEls[i].setAttribute('x2', x.toFixed(1)); stemEls[i].setAttribute('y2', y.toFixed(1));
        stemEls[i].setAttribute('opacity', (1 - p * 1.6).toFixed(2));
      });
      ORDER.forEach(function (k) {
        var a = G0.lanes[k], b = G1.lanes[k], r = laneEls[k];
        r.setAttribute('x', lerp(a.x, b.x, p).toFixed(1)); r.setAttribute('y', lerp(a.y, b.y, p).toFixed(1));
        r.setAttribute('width', lerp(a.w, b.w, p).toFixed(1)); r.setAttribute('height', lerp(a.h, b.h, p).toFixed(1));
        r.setAttribute('rx', lerp(22, k === 't' ? 4 : 14, p).toFixed(1));
        var ma = G0.meds[k], mb = G1.meds[k], m = meds[k], dd = lerp(ma.d, mb.d, p);
        m.style.width = m.style.height = dd.toFixed(1) + 'px'; m.style.left = (lerp(ma.cx, mb.cx, p) - dd / 2).toFixed(1) + 'px'; m.style.top = (lerp(ma.cy, mb.cy, p) - dd / 2).toFixed(1) + 'px';
        laneLb[k].style.left = (a.x + 38) + 'px'; laneLb[k].style.top = (a.y + 6) + 'px';
      });
      ticks.setAttribute('opacity', Math.max(0, p * 1.6 - 0.6).toFixed(2)); today.setAttribute('opacity', Math.max(0, p * 1.6 - 0.6).toFixed(2));
      var hx0 = X(1893), hx1 = X(1981);
      hatch.setAttribute('x', hx0); hatch.setAttribute('width', hx1 - hx0); hatch.setAttribute('y', ROW.s - BAR_H / 2); hatch.setAttribute('height', ROW.a - ROW.s + BAR_H);
      hatch.setAttribute('opacity', Math.max(0, p * 2 - 1).toFixed(2));
    }
    var anim = K.Anim(), ctimers = [];
    function counts(go) {
      ctimers.forEach(function (t) { t.stop(); }); ctimers = [];
      ORDER.forEach(function (k) {
        var c = cnt[k];
        if (!go) { c.n.textContent = String(c.v); return; }
        c.n.textContent = '0';
        ctimers.push(K.tween(1100, function (q) { c.n.textContent = String(Math.round(c.v * q)); }));
      });
    }
    /* reset the card layout on first load: every card in the tray */
    EV.forEach(function (e, i) { var h = home(i); setPos(i, h.x, h.y); });
    draw(0);
    K.slide('river', {
      set: function (st, prev) {
        beat = st >= 1 ? 1 : 0; select(-1);
        EV.forEach(function (e, s) { paintPin(s); });
        if (prev === -1) { anim.stop(); draw(beat); counts(false); return; }
        if (beat === 1) { anim.run(1300, draw, null, K.eio); K.wait(600, function () { if (beat === 1) counts(true); }); }
        else { anim.run(900, function (q) { draw(1 - q); }, null, K.eio); counts(false); }
      },
      leave: function () { anim.stop(); select(-1); }
    });
  })();

  /* ============ QA hooks: ready flag + {slide, step} ============ */
  if (window.__deck) {
    var st0 = window.__deck.state;
    window.__deck.state = function () { var s = st0(); s.slide = s.i + 1; s.step = s.st; return s; };
  }
  function ready() { requestAnimationFrame(function () { requestAnimationFrame(function () { document.body.classList.add('ready'); }); }); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready, ready); else ready();
})();
