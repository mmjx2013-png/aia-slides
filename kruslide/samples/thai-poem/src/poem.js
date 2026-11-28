/* poem.js · the live parts of the กลอนสุภาพ sample (vanilla JS, no libraries, no network).
   Draws our own Thai ornaments (frame with กนก flames, ประจำยาม medallions, กรวยเชิง base band) on every slide,
   lays out the verse, the แผนผัง (slide 1), the rhyme-linking board (slide 2) and the syllable counter (slide 3).
   The verse was written for this sample: 4 วรรค × 8 คำ, compulsory rhymes ใส–ไกล, แถว–แนว, แนว–แก้ว. */
(function () {
  'use strict';
  var $ = K.$, $$ = K.$$, E = K.E, S = K.S;
  var POEM = [
    { lab: 'วรรคสดับ', s: ['เช้า', 'วัน', 'ใหม่', 'แสง', 'ทอง', 'ส่อง', 'ฟ้า', 'ใส'] },
    { lab: 'วรรครับ', s: ['ฝูง', 'นก', 'ไกล', 'โผ', 'บิน', 'เป็น', 'ทิว', 'แถว'] },
    { lab: 'วรรครอง', s: ['สาย', 'น้ำ', 'เย็น', 'ไหล', 'ริน', 'เห็น', 'เป็น', 'แนว'] },
    { lab: 'วรรคส่ง', s: ['กลิ่น', 'ดอก', 'แก้ว', 'โชย', 'มา', 'พา', 'ชื่น', 'ชม'] }
  ];
  /* rhyme sound of each syllable that rhymes with another one in the verse (same vowel + same final) */
  var SOUND = { 'ใหม่': 'ai', 'ใส': 'ai', 'ไกล': 'ai', 'ทอง': 'ong', 'ส่อง': 'ong', 'เย็น': 'en', 'เห็น': 'en', 'เป็น': 'en', 'แถว': 'aeo', 'แนว': 'aeo', 'แก้ว': 'aeo', 'บิน': 'in', 'ริน': 'in' };
  var REQ = [['0-7', '1-2'], ['1-7', '2-7'], ['2-7', '3-2']];
  var GOLD = '#D4A84B', GOLD2 = '#F0D58C', RED2 = '#4E0914';

  /* ---------- ornaments ---------- */
  var PETAL = 'M0 -6C7 -13 7 -23 0 -32C-7 -23 -7 -13 0 -6Z';
  function prajamyam(g, r, fill) {   /* four pointed petals, four small leaves, a bead: our ประจำยาม */
    var k = r / 32, gg = S('g', { transform: 'scale(' + k + ')', fill: fill || GOLD }, g);
    [0, 90, 180, 270].forEach(function (a) { S('path', { d: PETAL, transform: 'rotate(' + a + ')' }, gg); });
    [45, 135, 225, 315].forEach(function (a) { S('path', { d: 'M8 0C12 -4 17 -4 21 0C17 4 12 4 8 0Z', transform: 'rotate(' + a + ')' }, gg); });
    S('circle', { r: 5 }, gg);
    return gg;
  }
  /* กนก flame: a pointed leaf whose tip flicks up (base at 0,0, pointing +x); three of them, alternating sides of a line */
  var FLAME = 'M0 0C10 -6 22 -10 36 -10C50 -10 60 -16 64 -30C70 -14 64 -2 50 4C38 9 18 8 0 0Z';
  function flames(g, x, y, rot) {
    var gg = S('g', { transform: 'translate(' + x + ' ' + y + ') rotate(' + rot + ')', fill: GOLD }, g);
    [[0, 1, 1], [52, .82, -1], [94, .66, 1], [128, .5, -1]].forEach(function (f) { S('path', { d: FLAME, transform: 'translate(' + f[0] + ' 0) scale(' + f[1] + ' ' + (f[1] * f[2]) + ')' }, gg); });
    return gg;
  }
  function frame(slide) {
    var s = S('svg', { 'class': 'frame', viewBox: '0 0 1920 1080', 'aria-hidden': 'true' });
    S('rect', { x: 36, y: 30, width: 1848, height: 962, rx: 6, 'class': 'ln', 'stroke-width': 3 }, s);
    S('rect', { x: 48, y: 42, width: 1824, height: 938, rx: 4, 'class': 'ln', 'stroke-width': 1.3 }, s);
    /* base band: กรวยเชิง (pointed pendants) standing on the inner line */
    var band = S('g', {}, s), x;
    for (x = 196; x < 1724; x += 44) {
      S('path', { d: 'M' + x + ' 980 L' + (x + 22) + ' 952 L' + (x + 44) + ' 980 Z', 'class': 'fd', 'stroke-width': 1.6 }, band);
      S('path', { d: 'M' + (x + 22) + ' 962 C' + (x + 27) + ' 968 ' + (x + 27) + ' 974 ' + (x + 22) + ' 978 C' + (x + 17) + ' 974 ' + (x + 17) + ' 968 ' + (x + 22) + ' 962Z', fill: GOLD }, band);
    }
    /* corners: medallion + flames along both edges */
    [[36, 30, 0], [1884, 30, 90], [1884, 992, 180], [36, 992, 270]].forEach(function (c) {
      var g = S('g', { transform: 'translate(' + c[0] + ' ' + c[1] + ') rotate(' + c[2] + ')' }, s);
      S('circle', { r: 30, 'class': 'fd' }, g); S('circle', { r: 23, fill: 'none', stroke: GOLD, 'stroke-width': 1 }, g);
      prajamyam(g, 20);
      flames(g, 36, 6, 0); flames(g, 6, 36, 90);
    });
    /* top centre: a small medallion on the frame */
    var t = S('g', { transform: 'translate(960 30)' }, s);
    flames(t, 30, 6, 0); flames(S('g', { transform: 'scale(-1 1)' }, t), 30, 6, 0);
    S('circle', { r: 22, 'class': 'fd' }, t); prajamyam(t, 15);
    slide.insertBefore(s, slide.firstChild);
  }
  $$('.slide').forEach(frame);

  /* ---------- rhyme-line geometry (slides 1 and 2) ----------
     arcPath: an arc between two points on one line; dir -1 = above, +1 = below; the peak is exactly h away.
     sPath: a cubic from (x1,y1) down to (x2,y2) with vertical tangents at both ends, so it stays between y1 and y2. */
  function arcPath(x1, x2, y, h, dir) {
    var c = h / 0.75, s = Math.min(34, Math.abs(x2 - x1) * 0.12) * (x2 >= x1 ? 1 : -1);
    return 'M' + x1.toFixed(1) + ' ' + y.toFixed(1) + ' C' + (x1 + s).toFixed(1) + ' ' + (y + dir * c).toFixed(1) + ' ' + (x2 - s).toFixed(1) + ' ' + (y + dir * c).toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y.toFixed(1);
  }
  function sPath(x1, y1, x2, y2) {
    var k = (y2 - y1) * 0.55;
    return 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' C' + x1.toFixed(1) + ' ' + (y1 + k).toFixed(1) + ' ' + x2.toFixed(1) + ' ' + (y2 - k).toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1);
  }

  /* ================= slide 1 · verse + แผนผัง ================= */
  (function () {
    var med = $('#p1-med');
    if (med) {
      S('circle', { r: 112, fill: RED2, stroke: GOLD, 'stroke-width': 3 }, med);
      S('circle', { r: 100, fill: 'none', stroke: GOLD, 'stroke-width': 1.2 }, med);
      var ring = S('g', { fill: GOLD }, med);
      for (var a = 0; a < 360; a += 30) S('path', { d: 'M0 -58C9 -68 9 -82 0 -94C-9 -82 -9 -68 0 -58Z', transform: 'rotate(' + a + ')' }, ring);
      for (a = 15; a < 360; a += 30) S('circle', { cx: 0, cy: -78, r: 3.5, transform: 'rotate(' + a + ')' }, ring);
      S('circle', { r: 50, fill: 'none', stroke: GOLD, 'stroke-width': 2 }, med);
      prajamyam(med, 40, GOLD2);
    }
    var v = $('#p1-verse'); if (!v) return;
    POEM.forEach(function (w, i) {
      var b = E('div', 'p1-w', null, v); b.style.left = (i % 2 ? 860 : 60) + 'px'; b.style.top = (i < 2 ? 34 : 134) + 'px';
      E('div', 'wl', w.lab, b);
      var t = E('div', 'p1-t', null, b);
      w.s.forEach(function (x) { E('span', 'sy', x, t); });
    });
    /* แผนผัง: one circle = one คำ. The วรรค names sit at the left of each group, out of the way of every line.
       Same routing as slide 2: the top-row rhyme arcs above its row, the bottom-row rhyme arcs below it, the cross-row
       rhyme is an S-curve with vertical ends inside the gutter; the two lines that share an end get spread anchors. */
    var plan = $('#p1-plan'), RX = [150, 980], RY = [748, 858], R = 15, STEP = 82;
    var gc = S('g', { 'class': 'g1' }, plan), gr = S('g', { 'class': 'g2' }, plan);
    function cx(w, k) { return RX[w % 2] + 124 + k * STEP; }
    function cy(w) { return RY[w < 2 ? 0 : 1]; }
    var hot = { '0-7': 1, '1-2': 1, '1-7': 1, '2-7': 1, '3-2': 1, '1-4': 2, '3-4': 2 };
    POEM.forEach(function (w, i) {
      var lab = S('text', { x: RX[i % 2], y: cy(i) - 5, 'class': 'p1-pl' }, gc);
      S('tspan', { x: RX[i % 2] }, lab).textContent = 'วรรค';
      S('tspan', { x: RX[i % 2], dy: 26 }, lab).textContent = w.lab.replace('วรรค', '');
      for (var k = 0; k < 8; k++) {
        var c = S('circle', { cx: cx(i, k), cy: cy(i), r: R, 'class': 'pop p1-c' + (hot[i + '-' + k] === 1 ? ' rh' : hot[i + '-' + k] === 2 ? ' rh5' : '') }, gc);
        c.style.setProperty('--d', 120 + i * 260 + k * 30);
      }
    });
    function line(d, cls, delay) { var p = S('path', { d: d, pathLength: 1, 'class': 'draw ' + cls }, gr); p.style.setProperty('--d', delay); return p; }
    function dot(x, y, delay) { var c = S('circle', { cx: x, cy: y, r: 5, 'class': 'pop p1-dot' }, gr); c.style.setProperty('--d', delay); }
    var y1 = RY[0], y2 = RY[1];
    /* ท้ายวรรคสดับ → คำที่ 3 (solid) / 5 (dashed) of วรรครับ: above row 1; the wider arc takes the outer (left) anchor */
    var a0 = cx(0, 7), up1 = y1 - R - 3;
    line(arcPath(a0 + 8, cx(1, 2), up1, 52, -1), 'p1-a', 150); dot(a0 + 8, up1, 150); dot(cx(1, 2), up1, 650);
    line(arcPath(a0 - 8, cx(1, 4), up1, 64, -1), 'p1-a5', 450); dot(a0 - 8, up1, 450); dot(cx(1, 4), up1, 950);
    /* ท้ายวรรครับ → ท้ายวรรครอง: S-curve in the gutter */
    line(sPath(cx(1, 7), y1 + R + 3, cx(2, 7), y2 - R - 3), 'p1-a', 800); dot(cx(1, 7), y1 + R + 3, 800); dot(cx(2, 7), y2 - R - 3, 1300);
    /* ท้ายวรรครอง → คำที่ 3 (solid) / 5 (dashed) of วรรคส่ง: below row 2 */
    var a2 = cx(2, 7), dn2 = y2 + R + 3;
    line(arcPath(a2 + 8, cx(3, 2), dn2, 48, 1), 'p1-a', 1150); dot(a2 + 8, dn2, 1150); dot(cx(3, 2), dn2, 1650);
    line(arcPath(a2 - 8, cx(3, 4), dn2, 60, 1), 'p1-a5', 1450); dot(a2 - 8, dn2, 1450); dot(cx(3, 4), dn2, 1950);
  })();

  /* ================= slide 2 · connect the rhymes ================= */
  /* Routing rules (owner, 28 Nov): a top-row pair arcs ABOVE its row, a bottom-row pair arcs BELOW its row, and the arc
     height grows with the distance (capped inside the card). A cross-row pair leaves the upper word's underline and enters
     the lower word's top as an S-curve with vertical ends, inside the gutter between the rows. Several links at one word
     get spread anchors (16 px apart, ordered so they do not cross) with a dot at each anchor. Badges sit on their own curve
     at the point farthest from other curves, badges and words. The words sit above the line layer, so a tap on a word is
     never caught by a line. */
  (function () {
    var sl = $('#tp-rhyme'), board = $('#p2-board'); if (!board) return;
    var svg = $('#p2-links'), tok = {}, links = [], sel = null, rub = null;
    var BW = 1700, BH = 540, ROWY = [112, 336], COLX = [36, 868], AVAIL = 706;
    POEM.forEach(function (w, i) {
      var b = E('div', 'p2-w', null, board); b.style.left = COLX[i % 2] + 'px'; b.style.top = ROWY[i < 2 ? 0 : 1] + 'px';
      var lab = E('span', 'p2-lab', null, b); lab.innerHTML = 'วรรค<br>' + w.lab.replace('วรรค', '');
      var row = E('div', 'p2-row', null, b);
      w.s.forEach(function (x, k) {
        var t = E('span', 'p2-t', x, row); t.dataset.id = i + '-' + k; tok[i + '-' + k] = t;
        t.setAttribute('role', 'button'); t.tabIndex = 0; t.setAttribute('aria-label', w.lab + ' คำที่ ' + (k + 1) + ' ' + x);
      });
    });
    svg.setAttribute('viewBox', '0 0 ' + BW + ' ' + BH);
    var dotsG = null;
    /* each วรรค must fit its half of the board: shrink the type until it does (measured after the web font loads) */
    function fit() {
      var fs = 52; board.style.setProperty('--fs', fs + 'px');
      while (fs > 36 && $$('.p2-row', board).some(function (r) { return r.scrollWidth > AVAIL; })) { fs -= 2; board.style.setProperty('--fs', fs + 'px'); }
      layout();
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    function boxes() {
      var o = K.box(board), B = {};
      Object.keys(tok).forEach(function (id) {
        var b = K.box(tok[id]); B[id] = { cx: b.cx - o.x, x: b.x - o.x, w: b.w, top: b.y - o.y, bot: b.y + b.h - o.y, row: +id.split('-')[0] < 2 ? 0 : 1 };
      });
      return B;
    }
    /* lay out every link from scratch: which side each end uses, spread anchors, then the path */
    function layout() {
      if (!links.length) { if (dotsG) dotsG.textContent = ''; return; }
      var B = boxes(), ends = {};
      function push(word, side, l, otherX) { var k = word + '|' + side; (ends[k] = ends[k] || []).push({ l: l, ox: otherX }); }
      links.forEach(function (l) {
        var A = B[l.a], C = B[l.b]; l.off = {};
        if (A.row === C.row) { l.type = 'arc'; l.side = A.row ? 'bot' : 'top'; push(l.a, l.side, l, C.cx); push(l.b, l.side, l, A.cx); }
        else { l.type = 's'; l.up = A.row ? l.b : l.a; l.dn = A.row ? l.a : l.b; push(l.up, 'bot', l, B[l.dn].cx); push(l.dn, 'top', l, B[l.up].cx); }
      });
      Object.keys(ends).forEach(function (k) {
        var word = k.split('|')[0], wx = B[word].cx, arr = ends[k];
        /* arcs: links going left first; within a direction the wider arc takes the outer anchor. S-curves: in target order */
        arr.sort(function (p, q) {
          if (p.l.type === 's') return p.ox - q.ox;
          var gp = p.ox < wx ? 0 : 1, gq = q.ox < wx ? 0 : 1;
          return gp !== gq ? gp - gq : q.ox - p.ox;
        });
        arr.forEach(function (e, i) { e.l.off[word] = (i - (arr.length - 1) / 2) * 16; });
      });
      links.forEach(function (l) {
        var d;
        if (l.type === 'arc') {
          var top = l.side === 'top', y = top ? B[l.a].top - 3 : B[l.a].bot + 3;
          var x1 = B[l.a].cx + l.off[l.a], x2 = B[l.b].cx + l.off[l.b];
          if (x1 > x2) { var t = x1; x1 = x2; x2 = t; }
          var cap = Math.min(84, top ? y - 26 : BH - 26 - y), h = Math.min(cap, 24 + (x2 - x1) * 0.14) * (l.kind === 'inner' ? 0.6 : 1);
          d = arcPath(x1, x2, y, h, top ? -1 : 1);
          l.p1 = [x1, y]; l.p2 = [x2, y];
        } else {
          var u = B[l.up], n = B[l.dn], ux = u.cx + l.off[l.up], nx = n.cx + l.off[l.dn];
          d = sPath(ux, u.bot + 3, nx, n.top - 3);
          l.p1 = [ux, u.bot + 3]; l.p2 = [nx, n.top - 3];
        }
        l.p.setAttribute('d', d); l.hit.setAttribute('d', d);
        l.d1.setAttribute('cx', l.p1[0]); l.d1.setAttribute('cy', l.p1[1]); l.d2.setAttribute('cx', l.p2[0]); l.d2.setAttribute('cy', l.p2[1]);
      });
      badges();
    }
    function key(a, b) { return [a, b].sort().join('|'); }
    function isReq(a, b) { return REQ.some(function (r) { return key(r[0], r[1]) === key(a, b); }); }
    function kind(a, b) {
      if (isReq(a, b)) return 'ok';
      var sa = SOUND[tok[a].textContent], sb = SOUND[tok[b].textContent];
      if (sa && sa === sb && a.split('-')[0] === b.split('-')[0]) return 'inner';
      return 'no';
    }
    function mark() {
      $$('.p2-t', board).forEach(function (t) { t.classList.remove('lk'); });
      links.forEach(function (l) { tok[l.a].classList.add('lk'); tok[l.b].classList.add('lk'); });
    }
    function drawOn(l, delay) {
      var L = l.p.getTotalLength ? l.p.getTotalLength() : 0; if (!L) return;
      K.anim(l.p, [{ strokeDasharray: L + ' ' + L, strokeDashoffset: L }, { strokeDasharray: L + ' ' + L, strokeDashoffset: 0 }], { duration: 500, delay: delay || 0, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'backwards' });
      [l.d1, l.d2].forEach(function (dt, i) { K.anim(dt, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: (delay || 0) + (i ? 450 : 0), fill: 'backwards' }); });
    }
    function setKind(l, k) { l.kind = k; l.g.classList.remove('ok', 'no', 'inner'); if (k) l.g.classList.add(k); }
    function addLink(a, b, quiet, k, delay) {
      var kk = key(a, b), old = links.filter(function (l) { return l.k === kk; })[0];
      if (old) { K.anim(old.p, [{ strokeWidth: 11 }, { strokeWidth: 6 }], { duration: 400 }); return old; }
      var g = S('g', { 'class': 'p2-l' }, svg);
      var l = { a: a, b: b, k: kk, g: g, kind: '' };
      l.p = S('path', { 'class': 'p2-p' }, g); l.hit = S('path', { 'class': 'p2-hit' }, g);
      l.d1 = S('circle', { r: 5.5, 'class': 'p2-dot' }, g); l.d2 = S('circle', { r: 5.5, 'class': 'p2-dot' }, g);
      if (k) setKind(l, k);
      links.push(l); mark(); layout();
      if (!quiet) drawOn(l, delay);
      l.hit.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      l.hit.addEventListener('click', function (e) { e.stopPropagation(); if (ac.shown) return; ac.hide(); unmarkAll(); removeLink(l); ft.say(''); });
      return l;
    }
    function removeLink(l) {
      links = links.filter(function (x) { return x !== l; });
      var a = K.anim(l.g, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 });
      if (a) a.onfinish = function () { l.g.remove(); }; else l.g.remove();
      mark(); layout();
    }
    /* badges: on its own curve, at the candidate point farthest from other curves, other badges and the words */
    function badges() {
      $$('.p2-mk', svg).forEach(function (m) { m.remove(); });
      var marked = links.filter(function (l) { return l.kind; }); if (!marked.length) return;
      var B = boxes(), rects = Object.keys(B).map(function (id) { return B[id]; });
      var samples = links.map(function (l) { var L = l.p.getTotalLength(), pts = []; for (var i = 0; i <= 48; i++) { var q = l.p.getPointAtLength(L * i / 48); pts.push([q.x, q.y]); } return { l: l, pts: pts, L: L }; });
      var placed = [];
      marked.forEach(function (l) {
        var me = samples.filter(function (s) { return s.l === l; })[0], best = null, bs = -1e9;
        [0.5, 0.42, 0.58, 0.35, 0.65, 0.28, 0.72].forEach(function (t, n) {
          var q = l.p.getPointAtLength(me.L * t), x = q.x, y = q.y, sc = 1e9;
          samples.forEach(function (s) { if (s.l === l) return; s.pts.forEach(function (p) { sc = Math.min(sc, Math.hypot(p[0] - x, p[1] - y) - 20); }); });
          placed.forEach(function (p) { sc = Math.min(sc, Math.hypot(p[0] - x, p[1] - y) - 36); });
          rects.forEach(function (r) { var dx = Math.max(r.x - x, 0, x - r.x - r.w), dy = Math.max(r.top - y, 0, y - r.bot); sc = Math.min(sc, Math.hypot(dx, dy) - 18); });
          sc = Math.min(sc, 40) - n * 0.5;   /* far enough is enough: then prefer the middle of the curve */
          if (sc > bs) { bs = sc; best = [x, y]; }
        });
        placed.push(best);
        var g = S('g', { 'class': 'p2-mk ' + l.kind, transform: 'translate(' + best[0].toFixed(1) + ' ' + best[1].toFixed(1) + ')' }, svg);
        S('circle', { r: 15 }, g);
        S('path', { d: l.kind === 'no' ? 'M-5.5 -5.5 L5.5 5.5 M5.5 -5.5 L-5.5 5.5' : 'M-6.5 0 L-2 5.5 L7 -5.5' }, g);
      });
    }
    function select(t) { if (sel) sel.classList.remove('sel'); sel = t; if (sel) sel.classList.add('sel'); }
    function pick(t) {
      if (ac.shown) return;
      ac.hide(); unmarkAll();
      if (!sel) { select(t); return; }
      if (sel === t) { select(null); return; }
      var a = sel.dataset.id; select(null); addLink(a, t.dataset.id); ft.say('');
    }
    function unmarkAll() { var any = links.some(function (l) { return l.kind; }); links.forEach(function (l) { setKind(l, ''); }); if (any) layout(); else $$('.p2-mk', svg).forEach(function (m) { m.remove(); }); }
    Object.keys(tok).forEach(function (id) {
      var t = tok[id];
      K.drag(t, {
        tap: function () { pick(t); },
        start: function () { if (ac.shown) return; ac.hide(); unmarkAll(); select(t); rub = S('path', { 'class': 'p2-rub' }, svg); },
        move: function (d, e, p) {
          if (!rub) return;
          var o = K.box(board), b = K.box(t), x = p.x - o.x, y = p.y - o.y, down = y > b.cy - o.y, ax = b.cx - o.x, ay = (down ? b.y + b.h : b.y) - o.y;
          rub.setAttribute('d', 'M' + ax + ' ' + ay + ' C' + ax + ' ' + (ay + (down ? 50 : -50)) + ' ' + x + ' ' + (y + (down ? -50 : -50)) + ' ' + x + ' ' + y);
          var h = K.hit(p, Object.keys(tok).map(function (k) { return tok[k]; }), 6);
          $$('.p2-t.hov', board).forEach(function (x) { x.classList.remove('hov'); }); if (h && h !== t) h.classList.add('hov');
        },
        end: function (d, e, p, cancelled) {
          if (rub) { rub.remove(); rub = null; }
          $$('.p2-t.hov', board).forEach(function (x) { x.classList.remove('hov'); });
          var h = cancelled ? null : K.hit(p, Object.keys(tok).map(function (k) { return tok[k]; }), 6);
          select(null);
          if (h && h !== t) { addLink(t.dataset.id, h.dataset.id); ft.say(''); }
        }
      });
      t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); pick(t); } });
    });
    var host = $('#p2-foot');
    var ft = K.footer(host, { check: check, show: function () { ac.toggle(); }, reset: reset, hint: 'แตะคำแรก แล้วแตะคำที่สัมผัสกัน · แตะเส้นเพื่อลบ' });
    function check() {
      ac.hide(); select(null);
      if (!links.length) { ft.say('info', 'โยงเส้นอย่างน้อย 1 คู่ก่อนนะ'); return; }
      var ok = 0, inn = 0, no = 0;
      links.forEach(function (l) { var k = kind(l.a, l.b); setKind(l, k); if (k === 'ok') ok++; else if (k === 'inner') inn++; else no++; });
      layout();
      var extra = (inn ? ' · สัมผัสใน ' + inn + ' คู่ (ไม่บังคับ)' : '') + (no ? ' · ไม่ใช่สัมผัสบังคับ ' + no + ' คู่' : '');
      if (ok === 3 && !no) ft.say('ok', 'ครบทั้ง 3 คู่!' + extra);
      else ft.say(no ? 'no' : 'info', 'สัมผัสบังคับถูก ' + ok + ' จาก 3 คู่' + extra);
    }
    function clear() { links.slice().forEach(function (l) { l.g.remove(); }); links = []; mark(); layout(); $$('.p2-mk', svg).forEach(function (m) { m.remove(); }); }
    function reset() { ac.off(); clear(); select(null); ft.say(''); }
    var ac = K.tk.answerCtl(host, ft, {
      snap: function () { return links.map(function (l) { return [l.a, l.b]; }); },
      reveal: function () { clear(); select(null); REQ.forEach(function (r, n) { addLink(r[0], r[1], K.still(), 'ok', n * 250); }); layout(); },
      restore: function (s) { clear(); s.forEach(function (x) { addLink(x[0], x[1], true); }); }
    });
    K.ctl('tp-rhyme', { set: function (st, prev) { if (prev < 0) setTimeout(layout, 50); }, leave: function () { select(null); } });
    window.__poem = {
      links: function () { return links.map(function (l) { return l.k + ':' + (l.kind || '-'); }); },
      paths: function () { return links.map(function (l) { return { k: l.k, kind: l.kind, d: l.p.getAttribute('d') }; }); },
      addLink: addLink, check: check, reset: reset, ac: ac
    };
  })();

  /* ================= slide 3 · count the syllables ================= */
  (function () {
    var rows = $('#p3-rows'); if (!rows) return;
    var R = [], A = K.Anim(), gen = 0;
    POEM.forEach(function (w, i) {
      var r = E('div', 'p3-r', null, rows);
      E('div', 'p3-lab', w.lab, r);
      var line = E('div', 'p3-line', null, r);
      var cnt = E('div', 'p3-cnt', null, r), num = E('b', '', '0', cnt); E('small', '', 'คำ', cnt);
      var seal = E('div', 'p3-seal', 'ครบ 8 คำ', r);
      var beads = w.s.map(function (x, k) {
        var b = E('span', 'p3-b', null, line); E('span', 'p3-x', x, b); var n = E('i', 'p3-n', '', b);
        b.setAttribute('role', 'button'); b.tabIndex = 0; b.setAttribute('aria-label', 'นับคำ ' + x); b._n = n;
        K.tap(b, function () { gen++; toggle(i, k); });
        return b;
      });
      R.push({ r: r, beads: beads, num: num, cnt: cnt, seal: seal, order: [] });
    });
    function paint(i, bump) {
      var o = R[i];
      o.beads.forEach(function (b, k) { var at = o.order.indexOf(k); b.classList.toggle('ct', at >= 0); b._n.textContent = at >= 0 ? at + 1 : ''; });
      o.num.textContent = o.order.length;
      var full = o.order.length === 8;
      if (bump) K.anim(o.cnt, [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 300 });
      if (full && !o.r.classList.contains('full')) { o.r.classList.add('full'); K.tone(784, 160, 'sine', 0.035); K.tone(1175, 240, 'sine', 0.03, 0.1); }
      if (!full) o.r.classList.remove('full');
    }
    function toggle(i, k) {
      var o = R[i], at = o.order.indexOf(k);
      if (at >= 0) o.order.splice(at, 1); else { o.order.push(k); K.tone(440 + o.order.length * 55, 90, 'triangle', 0.025); }
      paint(i, true);
    }
    function clearAll() { gen++; R.forEach(function (o, i) { o.order = []; paint(i); }); }
    function countAll(fast) {
      var my = ++gen;
      R.forEach(function (o, i) { o.order = []; paint(i); });
      if (K.still() || fast) { R.forEach(function (o, i) { o.order = [0, 1, 2, 3, 4, 5, 6, 7]; paint(i); }); return; }
      var step = 0;
      (function tick() {
        if (my !== gen || step >= 32) return;
        var i = Math.floor(step / 8), k = step % 8; R[i].order.push(k); paint(i, true); step++;
        setTimeout(tick, 110);
      })();
    }
    var bar = $('#p3-btns'), tk = K.tk;
    var bShow = tk.btn('นับให้ดู', 'show', 'show', function () { countAll(); });
    var bReset = tk.btn('เริ่มใหม่', '', 'reset', function () { clearAll(); });
    bar.appendChild(bShow); bar.appendChild(bReset);
    K.ctl('tp-count', {
      set: function (st, prev) { if (st >= 1 && prev >= 0 && prev < st) countAll(); else if (st >= 1 && prev < 0) countAll(true); },
      leave: function () { gen++; }
    });
    window.__count = { R: R, countAll: countAll, clearAll: clearAll, toggle: toggle };
  })();

  K.start();
})();
