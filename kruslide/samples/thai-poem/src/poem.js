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
    /* แผนผัง: same columns as the verse */
    var plan = $('#p1-plan'), RX = [210, 1010], RY = [752, 880], R = 17;
    var gc = S('g', { 'class': 'g1' }, plan), gr = S('g', { 'class': 'g2' }, plan);
    function cx(w, k) { return RX[w % 2] + 45 + k * 88; }
    function cy(w) { return RY[w < 2 ? 0 : 1]; }
    var hot = { '0-7': 1, '1-2': 1, '1-7': 1, '2-7': 1, '3-2': 1, '1-4': 2, '3-4': 2 };
    POEM.forEach(function (w, i) {
      var lab = S('text', { x: i % 2 ? cx(i, 7) + 17 : cx(i, 0) - 17, y: cy(i) - 34, 'class': 'p1-pl', 'text-anchor': i % 2 ? 'end' : 'start' }, gc); lab.textContent = w.lab;
      for (var k = 0; k < 8; k++) {
        var c = S('circle', { cx: cx(i, k), cy: cy(i), r: R, 'class': 'pop p1-c' + (hot[i + '-' + k] === 1 ? ' rh' : hot[i + '-' + k] === 2 ? ' rh5' : '') }, gc);
        c.style.setProperty('--d', 120 + i * 260 + k * 30);
      }
    });
    function arc(d, cls, delay) { var p = S('path', { d: d, pathLength: 1, 'class': 'draw ' + cls }, gr); p.style.setProperty('--d', delay); return p; }
    var x18 = cx(0, 7), x23 = cx(1, 2), x25 = cx(1, 4), x28 = cx(1, 7), x38 = cx(2, 7), x43 = cx(3, 2), x45 = cx(3, 4), y1 = RY[0], y2 = RY[1];
    arc('M' + x18 + ' ' + (y1 - R) + ' C' + (x18 + 50) + ' ' + (y1 - 92) + ' ' + (x23 - 50) + ' ' + (y1 - 92) + ' ' + x23 + ' ' + (y1 - R), 'p1-a', 150);
    arc('M' + x18 + ' ' + (y1 - R) + ' C' + (x18 + 70) + ' ' + (y1 - 118) + ' ' + (x25 - 70) + ' ' + (y1 - 118) + ' ' + x25 + ' ' + (y1 - R), 'p1-a5', 450);
    arc('M' + x28 + ' ' + (y1 + R) + ' C' + x28 + ' ' + (y1 + 70) + ' ' + x38 + ' ' + (y2 - 70) + ' ' + x38 + ' ' + (y2 - R), 'p1-a', 750);
    arc('M' + x38 + ' ' + (y2 + R) + ' C' + (x38 + 50) + ' ' + (y2 + 62) + ' ' + (x43 - 50) + ' ' + (y2 + 62) + ' ' + x43 + ' ' + (y2 + R), 'p1-a', 1100);
    arc('M' + x38 + ' ' + (y2 + R) + ' C' + (x38 + 70) + ' ' + (y2 + 78) + ' ' + (x45 - 70) + ' ' + (y2 + 78) + ' ' + x45 + ' ' + (y2 + R), 'p1-a5', 1350);
  })();

  /* ================= slide 2 · connect the rhymes ================= */
  (function () {
    var sl = $('#tp-rhyme'), board = $('#p2-board'); if (!board) return;
    var svg = $('#p2-links'), tok = {}, links = [], sel = null, rub = null;
    POEM.forEach(function (w, i) {
      var b = E('div', 'p2-w', null, board); b.style.left = (i % 2 ? 840 : 50) + 'px'; b.style.top = (i < 2 ? 56 : 262) + 'px';
      var row = E('div', 'p2-row', null, b);
      E('div', 'wl', w.lab, b);
      w.s.forEach(function (x, k) {
        var t = E('span', 'p2-t', x, row); t.dataset.id = i + '-' + k; tok[i + '-' + k] = t;
        t.setAttribute('role', 'button'); t.tabIndex = 0; t.setAttribute('aria-label', w.lab + ' คำที่ ' + (k + 1) + ' ' + x);
      });
    });
    /* each วรรค must fit its half of the board: shrink the type until it does (measured after the web font loads) */
    function fit() {
      var fs = 52; board.style.setProperty('--fs', fs + 'px');
      while (fs > 36 && $$('.p2-row', board).some(function (r) { return r.scrollWidth > 736; })) { fs -= 2; board.style.setProperty('--fs', fs + 'px'); }
      redraw();
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    var W = 1620, H = 440;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    function anchor(t, side) { var b = K.box(t), o = K.box(board); return { x: b.cx - o.x, y: (side === 'top' ? b.y + 6 : b.y + b.h - 6) - o.y }; }
    function curve(a, b) {
      var A = K.box(a), B = K.box(b);
      if (Math.abs(A.cy - B.cy) < 30) {
        var p = anchor(a, 'top'), q = anchor(b, 'top'), h = 46 + Math.abs(q.x - p.x) * 0.12;
        return 'M' + p.x + ' ' + p.y + ' C' + (p.x + (q.x - p.x) * 0.15) + ' ' + (p.y - h) + ' ' + (q.x - (q.x - p.x) * 0.15) + ' ' + (q.y - h) + ' ' + q.x + ' ' + q.y;
      }
      var up = A.cy < B.cy ? a : b, dn = up === a ? b : a, P = anchor(up, 'bottom'), Q = anchor(dn, 'top');
      return 'M' + P.x + ' ' + P.y + ' C' + P.x + ' ' + (P.y + 60) + ' ' + Q.x + ' ' + (Q.y - 60) + ' ' + Q.x + ' ' + Q.y;
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
    function addLink(a, b, quiet, cls) {
      var k = key(a, b), old = links.filter(function (l) { return l.k === k; })[0];
      if (old) { K.anim(old.p, [{ strokeWidth: 12 }, { strokeWidth: 6 }], { duration: 400 }); return old; }
      var d = curve(tok[a], tok[b]);
      var g = S('g', { 'class': 'p2-l' + (cls ? ' ' + cls : '') }, svg);
      var p = S('path', { d: d, pathLength: 1, 'class': 'p2-p' }, g);
      var hit = S('path', { d: d, 'class': 'p2-hit' }, g);
      var l = { a: a, b: b, k: k, g: g, p: p };
      links.push(l); mark();
      if (!quiet) K.anim(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 600, easing: 'cubic-bezier(.4,0,.2,1)' });
      hit.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      hit.addEventListener('click', function (e) { e.stopPropagation(); if (ac.shown) return; ac.hide(); removeLink(l); ft.say(''); });
      return l;
    }
    function removeLink(l) {
      links = links.filter(function (x) { return x !== l; });
      var a = K.anim(l.g, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 });
      if (a) a.onfinish = function () { l.g.remove(); }; else l.g.remove();
      mark();
    }
    function select(t) {
      if (sel) sel.classList.remove('sel');
      sel = t; if (sel) sel.classList.add('sel');
    }
    function pick(t) {
      if (ac.shown) return;
      ac.hide(); unmarkAll();
      if (!sel) { select(t); return; }
      if (sel === t) { select(null); return; }
      var a = sel.dataset.id; select(null); addLink(a, t.dataset.id); ft.say('');
    }
    function unmarkAll() { links.forEach(function (l) { l.g.classList.remove('ok', 'no', 'inner'); }); $$('.p2-mk', svg).forEach(function (m) { m.remove(); }); }
    Object.keys(tok).forEach(function (id) {
      var t = tok[id];
      K.drag(t, {
        tap: function () { pick(t); },
        start: function () { if (ac.shown) return; ac.hide(); unmarkAll(); select(t); rub = S('path', { 'class': 'p2-rub' }, svg); },
        move: function (d, e, p) {
          if (!rub) return;
          var o = K.box(board), A = anchor(t, 'top'), x = p.x - o.x, y = p.y - o.y;
          rub.setAttribute('d', 'M' + A.x + ' ' + A.y + ' Q' + ((A.x + x) / 2) + ' ' + (Math.min(A.y, y) - 60) + ' ' + x + ' ' + y);
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
    function midMark(l, ok) {
      var p = l.p.getPointAtLength ? l.p.getPointAtLength(l.p.getTotalLength() / 2) : null; if (!p) return;
      var g = S('g', { 'class': 'p2-mk ' + ok, transform: 'translate(' + p.x + ' ' + p.y + ')' }, svg);
      S('circle', { r: 17 }, g);
      S('path', { d: ok === 'no' ? 'M-6 -6 L6 6 M6 -6 L-6 6' : 'M-7 0 L-2 6 L8 -6' }, g);
    }
    function check() {
      ac.hide(); unmarkAll(); select(null);
      if (!links.length) { ft.say('info', 'โยงเส้นอย่างน้อย 1 คู่ก่อนนะ'); return; }
      var ok = 0, inn = 0, no = 0;
      links.forEach(function (l) { var k = kind(l.a, l.b); l.g.classList.add(k); midMark(l, k); if (k === 'ok') ok++; else if (k === 'inner') inn++; else no++; });
      var extra = (inn ? ' · สัมผัสใน ' + inn + ' คู่ (ไม่บังคับ)' : '') + (no ? ' · ไม่ใช่สัมผัสบังคับ ' + no + ' คู่' : '');
      if (ok === 3 && !no) ft.say('ok', 'ครบทั้ง 3 คู่!' + extra);
      else ft.say(no ? 'no' : 'info', 'สัมผัสบังคับถูก ' + ok + ' จาก 3 คู่' + extra);
    }
    function clear() { links.slice().forEach(function (l) { l.g.remove(); }); links = []; mark(); }
    function reset() { ac.off(); clear(); select(null); ft.say(''); }
    var ac = K.tk.answerCtl(host, ft, {
      snap: function () { return links.map(function (l) { return [l.a, l.b]; }); },
      reveal: function () {
        clear(); select(null);
        REQ.forEach(function (r, n) { var l = addLink(r[0], r[1], K.still(), 'ok'); midMark(l, 'ok'); if (!K.still()) K.anim(l.p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 1, offset: n * 0.25 }, { strokeDashoffset: 0 }], { duration: 600 + n * 250 }); });
      },
      restore: function (s) { clear(); $$('.p2-mk', svg).forEach(function (m) { m.remove(); }); s.forEach(function (x) { addLink(x[0], x[1], true); }); }
    });
    /* layout can change when the web font arrives: redraw every curve from the words' real positions */
    function redraw() { links.forEach(function (l) { var d = curve(tok[l.a], tok[l.b]); l.p.setAttribute('d', d); l.g.querySelector('.p2-hit').setAttribute('d', d); }); }
    K.ctl('tp-rhyme', { set: function (st, prev) { if (prev < 0) setTimeout(redraw, 50); }, leave: function () { select(null); } });
    window.__poem = { links: function () { return links.map(function (l) { return l.k + ':' + (l.g.classList.contains('ok') ? 'ok' : l.g.classList.contains('no') ? 'no' : l.g.classList.contains('inner') ? 'inner' : '-'); }); }, addLink: addLink, check: check, reset: reset, ac: ac };
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
