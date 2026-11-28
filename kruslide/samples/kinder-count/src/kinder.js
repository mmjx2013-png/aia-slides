/* kinder.js · the live parts of the อนุบาล sample (vanilla JS, no libraries, no network).
   Every picture is drawn here as wobbly hand-made crayon lines (a seeded random wobble, Catmull-Rom curves,
   zig-zag scribble fills, and the #cr filter for the waxy grain), so the deck looks drawn by a child.
   Slide 1: tap apples to count (bounce + big number + dots); b1 lines them up with 1–7 under them.
   Slide 2: drag crayon shapes onto their grey shadows. Slide 3: tap a crayon (or a thing) to light up that colour. */
(function () {
  'use strict';
  var $ = K.$, $$ = K.$$, E = K.E, S = K.S;
  var C = { red: '#E8412E', yel: '#F7C12D', blu: '#2F6FE0', grn: '#3BA35A', org: '#F28A2E', pur: '#8E5BD6', pnk: '#F06BA8', brn: '#8A5A35', ink: '#33302B', grey: '#9A958C' };
  var NUM_TH = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า', 'สิบ'], DIG_TH = '๐๑๒๓๔๕๖๗๘๙';

  /* ---------- wobbly geometry ---------- */
  var seed = 11;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function jt(a) { return (rnd() - 0.5) * 2 * a; }
  function f(p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }
  function cat(pts, closed) {
    var n = pts.length, d = 'M' + f(pts[0]);
    for (var i = 0; i < (closed ? n : n - 1); i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      if (!closed) { if (i === 0) p0 = p1; if (i + 2 >= n) p3 = p2; }
      d += 'C' + f([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + ' ' + f([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + ' ' + f(p2);
    }
    return d + (closed ? 'Z' : '');
  }
  function ellPts(cx, cy, rx, ry, j, n) { var p = [], a0 = rnd() * 6.28; n = n || 14; for (var i = 0; i < n; i++) { var a = a0 + i / n * 6.2832; p.push([cx + Math.cos(a) * (rx + jt(j)), cy + Math.sin(a) * (ry + jt(j))]); } return p; }
  function ell(cx, cy, rx, ry, j) { return cat(ellPts(cx, cy, rx, ry, j == null ? Math.min(rx, ry) * 0.06 : j), true); }
  /* polygon with wobbly edges and sharp-ish corners (each corner doubled) */
  function poly(pts, j, step) {
    var out = [];
    pts.forEach(function (a, i) {
      var b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / (step || 40)));
      var c = [a[0] + jt(j / 2), a[1] + jt(j / 2)]; out.push(c, c);
      for (var k = 1; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n + jt(j), a[1] + (b[1] - a[1]) * k / n + jt(j)]);
    });
    return cat(out, true);
  }
  function line(pts, j) { return cat(pts.map(function (p) { return [p[0] + jt(j || 2), p[1] + jt(j || 2)]; }), false); }
  function starPts(cx, cy, R, r) { var p = []; for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; p.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } return p; }
  function heartPts(cx, cy, s) { var p = []; for (var i = 0; i < 24; i++) { var t = i / 24 * 6.2832; p.push([cx + s * 16 * Math.pow(Math.sin(t), 3) + jt(s * .5), cy - s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) + jt(s * .5)]); } return cat(p, true); }
  function bbox(cx, cy, w, h) { return { x: cx - w / 2, y: cy - h / 2, w: w, h: h }; }
  /* scribble: back-and-forth zig-zag lines across a box, tilted */
  function zig(bb, gap, ang) {
    var cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2, R = Math.hypot(bb.w, bb.h) / 2 + 10, pts = [], k = 0;
    for (var y = -R; y <= R; y += gap / 2) { pts.push([(k % 2 ? R : -R) + jt(6), y + jt(2)]); k++; }
    return { d: 'M' + pts.map(f).join(' L'), t: 'translate(' + cx + ' ' + cy + ') rotate(' + ang + ')' };
  }
  var cid = 0;
  /* one crayon object: light wax fill + scribble + wobbly outline (drawn twice), all through the #cr filter */
  function crayon(parent, d, o) {
    var g = S('g', { filter: 'url(#cr)' }, parent);
    if (o.fill) S('path', { d: d, fill: o.fill, 'fill-opacity': o.a == null ? 0.45 : o.a }, g);
    if (o.fill && o.bb !== false && o.bb) {
      var id = 'k-clip' + (++cid), svg = parent.ownerSVGElement || parent, defs = svg.querySelector('defs') || S('defs', {}, svg);
      S('path', { d: d }, S('clipPath', { id: id }, defs));
      var z = zig(o.bb, o.gap || 15, o.ang == null ? -32 : o.ang), cg = S('g', { 'clip-path': 'url(#' + id + ')' }, g);
      S('path', { d: z.d, transform: z.t, fill: 'none', stroke: o.fill, 'stroke-width': o.sw || 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.9 }, cg);
    }
    if (o.line) {
      S('path', { d: d, fill: 'none', stroke: o.line, 'stroke-width': o.w || 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
      S('path', { d: d, fill: 'none', stroke: o.line, 'stroke-width': (o.w || 7) * 0.6, 'stroke-linecap': 'round', opacity: 0.5, transform: 'translate(2 -1.5)' }, g);
    }
    return g;
  }
  function stroke(parent, d, col, w) { return crayon(parent, d, { line: col, w: w }); }
  function crayonText(parent, x, y, txt, size, col, anchor) {
    var t = S('text', { x: x, y: y, 'font-size': size, fill: col, 'text-anchor': anchor || 'start', 'class': 'crt', filter: 'url(#cr)' }, parent); t.textContent = txt; return t;
  }
  /* things to draw */
  function apple(g, x, y, r) {
    crayon(g, ell(x, y, r, r * 0.92), { fill: C.red, a: 0.7, line: '#B8281A', bb: bbox(x, y, 2 * r, 2 * r), w: 6 });
    stroke(g, line([[x, y - r * .8], [x + 3, y - r * 1.25]]), C.brn, 7);
    crayon(g, ell(x + r * .42, y - r * 1.12, r * .34, r * .16, 2), { fill: C.grn, line: '#2C7A43', bb: bbox(x + r * .42, y - r * 1.12, r * .7, r * .4), w: 4, gap: 8, sw: 6 });
  }
  function cloudish(g, x, y, w, h, col, edge) {
    var p = []; for (var i = 0; i < 9; i++) { var a = i / 9 * 6.2832; p.push([x + Math.cos(a) * w / 2 * (1 + (i % 2 ? .06 : -.05)) + jt(6), y + Math.sin(a) * h / 2 * (1 + (i % 2 ? .1 : -.08)) + jt(6)]); }
    return crayon(g, cat(p, true), { fill: col, line: edge, bb: bbox(x, y, w, h), w: 6, gap: 18 });
  }

  /* ================= slide 1 · count the apples ================= */
  (function () {
    var art = $('#k1-art'), fr = $('#k1-fruit'); if (!art) return;
    seed = 21;
    /* grass, tree */
    crayon(art, poly([[60, 840], [1100, 828], [1100, 1000], [60, 1000]], 8, 80), { fill: '#BFE3A4', bb: bbox(580, 914, 1040, 170), a: 0.25, gap: 26, ang: -10, sw: 8 });
    stroke(art, line([[60, 836], [400, 826], [760, 838], [1100, 828]], 4), C.grn, 7);
    cloudish(art, 590, 500, 880, 390, C.grn, '#2C7A43');
    crayon(art, poly([[536, 670], [636, 670], [656, 836], [516, 836]], 6, 50), { fill: C.brn, line: '#5E3B20', bb: bbox(586, 738, 150, 200), w: 7, gap: 14, ang: 80 });
    var SPOT = [[370, 455], [530, 380], [710, 385], [860, 470], [450, 585], [640, 545], [810, 605]];
    var ROW = SPOT.map(function (_, i) { return [200 + i * 136, 852]; });
    var apples = [], order = [], numEl = $('#k1-num'), word = $('#k1-word'), dots = $('#k1-dots'), done = $('#k1-done'), live = $('#k1-live');
    for (var i = 0; i < 7; i++) E('i', '', null, dots);
    SPOT.forEach(function (p, i) {
      var g = S('g', { 'class': 'k1-a' }, fr); g.style.transform = 'translate(' + p[0] + 'px,' + p[1] + 'px)';
      var bob = S('g', { 'class': 'k1-bob' }, g);
      apple(bob, 0, 0, 54);
      var tag = S('g', { 'class': 'k1-tag' }, bob);
      crayon(tag, ell(0, 4, 30, 30, 2), { fill: '#FFFFFF', a: 1, line: C.ink, w: 5 });
      var tn = S('text', { x: 0, y: 18, 'text-anchor': 'middle', 'class': 'k1-tn' }, tag);
      var under = S('text', { x: 0, y: 108, 'text-anchor': 'middle', 'class': 'k1-under' }, g);
      var hit = S('circle', { r: 78, cx: 0, cy: -6, fill: 'transparent', 'class': 'hit' }, g);
      hit.setAttribute('role', 'button'); hit.setAttribute('tabindex', '0'); hit.setAttribute('aria-label', 'แอปเปิ้ลลูกที่ ' + (i + 1));
      var a = { g: g, bob: bob, tag: tag, tn: tn, under: under, i: i };
      apples.push(a);
      K.tap(hit, function () { count(a); });
    });
    function bounce(a) { K.anim(a.bob, [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-46px) scale(1.12,.92)', offset: 0.35 }, { transform: 'translateY(0) scale(1.1,.88)', offset: 0.7 }, { transform: 'none' }], { duration: 560, easing: 'ease-out' }); }
    function paint() {
      var n = order.length;
      numEl.textContent = n;
      word.textContent = n ? DIG_TH[n] + '  ' + NUM_TH[n] : 'ยังไม่ได้นับ';
      [].forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k < n); });
      apples.forEach(function (a) { var k = order.indexOf(a.i); a.tag.classList.toggle('on', k >= 0); a.tn.textContent = k >= 0 ? k + 1 : ''; });
      done.classList.toggle('on', n === 7);
      live.textContent = n ? 'นับได้ ' + n : '';
    }
    function count(a) {
      bounce(a);
      if (order.indexOf(a.i) >= 0) { K.tone(330, 120, 'triangle', 0.03); return; }
      order.push(a.i);
      K.tone(392 * Math.pow(2, (order.length - 1) / 7), 200, 'triangle', 0.05);
      K.anim(numEl, [{ transform: 'scale(.6)', opacity: 0.2 }, { transform: 'scale(1.12)', opacity: 1, offset: 0.6 }, { transform: 'none' }], { duration: 420, easing: 'ease-out' });
      paint();
      if (order.length === 7) { [523, 659, 784, 1046].forEach(function (f, k) { K.tone(f, 260, 'triangle', 0.04, 0.12 + 0.12 * k); }); apples.forEach(function (x, k) { setTimeout(function () { bounce(x); }, 300 + k * 90); }); }
    }
    function place(row) {
      apples.forEach(function (a, k) {
        var at = row ? order.indexOf(a.i) : -1, p = row ? ROW[at < 0 ? k : at] : SPOT[a.i];
        a.g.style.transitionDelay = row ? (at * 0.09) + 's' : '0s';
        a.g.style.transform = 'translate(' + p[0] + 'px,' + p[1] + 'px)';
        a.under.textContent = row ? String((at < 0 ? k : at) + 1) : '';
      });
      fr.classList.toggle('row', row);
    }
    K.tap($('#k1-reset'), function () { order = []; paint(); place(K.C['kc-count'].st >= 1); K.tone(260, 120, 'sine', 0.04); });
    paint();
    var ctl = { st: 0, set: function (st) {
      ctl.st = st;
      if (st >= 1) { apples.forEach(function (a) { if (order.indexOf(a.i) < 0) order.push(a.i); }); paint(); }
      place(st >= 1);
    } };
    K.ctl('kc-count', ctl);
    window.__count = { apples: apples, order: function () { return order.slice(); } };
  })();

  /* ================= slide 2 · shapes and shadows ================= */
  (function () {
    var art = $('#k2-art'), play = $('#k2-play'); if (!play) return;
    seed = 42;
    /* a scribbled tray on the left, a dashed board on the right */
    crayon(art, poly([[120, 300], [860, 290], [870, 880], [130, 890]], 6, 90), { line: '#D9C9A8', w: 6 });
    crayon(art, poly([[930, 300], [1800, 292], [1806, 850], [936, 858]], 6, 90), { fill: '#EDE8DE', a: 0.35, line: '#CFC7B8', w: 6, bb: bbox(1368, 575, 880, 570), gap: 30, sw: 8 });
    var SH = {
      circle: function (x, y) { return ell(x, y, 92, 92, 4); },
      square: function (x, y) { return poly([[x - 84, y - 84], [x + 84, y - 84], [x + 84, y + 84], [x - 84, y + 84]], 5, 42); },
      tri: function (x, y) { return poly([[x, y - 96], [x + 100, y + 78], [x - 100, y + 78]], 5, 42); },
      star: function (x, y) { return cat(starPts(x, y, 104, 46).reduce(function (a, p) { a.push(p, p); return a; }, []), true); },
      heart: function (x, y) { return heartPts(x, y - 6, 5.9); }
    };
    var LIST = [['circle', C.red, 'วงกลม'], ['square', C.blu, 'สี่เหลี่ยม'], ['tri', C.yel, 'สามเหลี่ยม'], ['star', C.org, 'ดาว'], ['heart', C.pnk, 'หัวใจ']];
    var START = { circle: [250, 440], square: [500, 440], tri: [750, 450], star: [370, 730], heart: [630, 730] };
    var HOME = { star: [1080, 440], circle: [1360, 440], heart: [1640, 440], tri: [1210, 720], square: [1500, 720] };
    var shadows = {}, shapes = {}, msg = $('#k2-msg'), matched = {};
    LIST.forEach(function (L) {
      var k = L[0], h = HOME[k], sg = S('g', { 'class': 'k2-sh' }, play);
      crayon(sg, SH[k](h[0], h[1]), { fill: '#8E897F', a: 0.5, bb: bbox(h[0], h[1], 220, 220), gap: 12, sw: 9 });
      var nm = S('text', { x: h[0], y: h[1] + 150, 'text-anchor': 'middle', 'class': 'k2-nm' }, sg); nm.textContent = L[2];
      shadows[k] = { g: sg, x: h[0], y: h[1], nm: nm };
    });
    LIST.forEach(function (L) {
      var k = L[0], s0 = START[k], g = S('g', { 'class': 'k2-shape' }, play);
      var inner = S('g', {}, g);
      crayon(inner, SH[k](0, 0), { fill: L[1], line: C.ink, w: 6, bb: bbox(0, 0, 220, 220), gap: 13 });
      S('circle', { r: 120, fill: 'transparent', 'class': 'hit' }, g);
      g.setAttribute('role', 'button'); g.setAttribute('aria-label', L[2]);
      var o = { k: k, g: g, inner: inner, x: s0[0], y: s0[1], name: L[2] };
      /* the touched shape goes on top (before the drag starts, so the pointer capture is kept) */
      g.addEventListener('pointerdown', function () { if (!matched[k] && g.nextSibling) play.appendChild(g); });
      shapes[k] = o; pos(o, o.x, o.y);
      K.drag(g, {
        can: function () { return !matched[k]; },
        start: function () { g.classList.add('lift'); K.tone(500, 60, 'triangle', 0.03); },
        move: function (d) { pos(o, o.x + d.dx, o.y + d.dy); var t = near(o.x + d.dx, o.y + d.dy); LIST.forEach(function (M) { shadows[M[0]].g.classList.toggle('hot', M[0] === t); }); },
        end: function (d, e, p, cancelled) {
          g.classList.remove('lift'); LIST.forEach(function (M) { shadows[M[0]].g.classList.remove('hot'); });
          var x = o.x + d.dx, y = o.y + d.dy, t = cancelled ? null : near(x, y);
          if (t === k) snap(o, x, y);
          else { if (t) { msg.textContent = 'ยังไม่ใช่ ลองหาเงาที่เหมือนกันนะ'; K.tone(196, 220, 'triangle', 0.04); } glide(o, x, y, o.x, o.y, 420, function () { wobble(o); }); }
        },
        tap: function () { wobble(o); K.tone(440, 90, 'triangle', 0.03); }
      });
    });
    function pos(o, x, y) { o.g.style.transform = 'translate(' + x + 'px,' + y + 'px)'; o.cx = x; o.cy = y; }
    function near(x, y) { var best = null, bd = 150; LIST.forEach(function (L) { var s = shadows[L[0]]; if (matched[L[0]]) return; var dd = Math.hypot(x - s.x, y - s.y); if (dd < bd) { bd = dd; best = L[0]; } }); return best; }
    var A = {};
    function glide(o, x0, y0, x1, y1, ms, done) {
      (A[o.k] = A[o.k] || K.Anim()).run(ms, function (p) { var e = K.eo(p); pos(o, x0 + (x1 - x0) * e, y0 + (y1 - y0) * e); }, done);
    }
    function wobble(o) { K.anim(o.inner, [{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(-4deg)' }, { transform: 'none' }], { duration: 480 }); }
    function snap(o, x, y) {
      var s = shadows[o.k]; matched[o.k] = true; o.g.classList.add('done'); s.g.classList.add('done');
      glide(o, x, y, s.x, s.y, 300, function () {
        K.anim(o.inner, [{ transform: 'scale(1.18)' }, { transform: 'scale(.94)', offset: 0.6 }, { transform: 'none' }], { duration: 420, easing: 'ease-out' });
      });
      K.tone(660, 140, 'triangle', 0.05); K.tone(880, 220, 'triangle', 0.04, 0.12);
      var n = Object.keys(matched).length;
      msg.textContent = n === 5 ? 'เก่งมาก! จับคู่ครบทุกรูปแล้ว' : 'ใช่แล้ว! นี่คือ' + o.name;
      if (n === 5) [523, 659, 784, 1046].forEach(function (f, k) { K.tone(f, 260, 'triangle', 0.04, 0.3 + 0.12 * k); });
    }
    function reset() {
      matched = {}; msg.textContent = '';
      LIST.forEach(function (L) { var o = shapes[L[0]]; o.g.classList.remove('done'); shadows[L[0]].g.classList.remove('done'); glide(o, o.cx, o.cy, o.x, o.y, 500); });
    }
    K.tap($('#k2-reset'), reset);
    K.ctl('kc-shape', { set: function (st) { play.classList.toggle('names', st >= 1); } });
    window.__shapes = { matched: function () { return Object.keys(matched); }, shapes: shapes, shadows: shadows, reset: reset };
  })();

  /* ================= slide 3 · colours ================= */
  (function () {
    var art = $('#k3-art'); if (!art) return;
    seed = 77;
    var bg = S('g', {}, art), scene = S('g', {}, art), rings = S('g', {}, art), pens = S('g', {}, art);
    /* sky and grass: pale scribbles, not things to find */
    crayon(bg, poly([[140, 300], [1780, 292], [1786, 612], [146, 620]], 6, 120), { fill: '#BFDDF7', a: 0.3, bb: bbox(963, 456, 1650, 330), gap: 34, sw: 8, ang: -14 });
    crayon(bg, poly([[146, 612], [1786, 604], [1790, 800], [140, 806]], 6, 120), { fill: '#CDEBB8', a: 0.3, bb: bbox(963, 705, 1650, 200), gap: 30, sw: 8, ang: -10 });
    stroke(bg, poly([[140, 300], [1780, 292], [1790, 800], [140, 806]], 5, 160), '#CFC6B4', 6);
    var objs = [];
    function obj(c, name, draw, cx, cy, rx, ry) { var g = S('g', { 'class': 'k3-o' }, scene); draw(g); g.dataset.c = c; var o = { g: g, c: c, name: name, cx: cx, cy: cy, rx: rx, ry: ry }; objs.push(o); var h = S('ellipse', { cx: cx, cy: cy, rx: rx + 10, ry: ry + 10, fill: 'transparent', 'class': 'tap' }, g); K.tap(h, function () { pick(c, true); }); h.setAttribute('aria-label', name); return o; }
    /* trunk is brown, not one of the four colours */
    crayon(bg, poly([[270, 560], [330, 560], [338, 770], [262, 770]], 4, 40), { fill: C.brn, line: '#5E3B20', bb: bbox(300, 665, 90, 220), w: 6, ang: 80, gap: 12 });
    obj('grn', 'ต้นไม้', function (g) { cloudish(g, 300, 470, 300, 250, C.grn, '#2C7A43'); }, 300, 470, 150, 125);
    obj('red', 'ลูกโป่ง', function (g) { stroke(g, line([[560, 450], [548, 500], [566, 560]], 2), C.ink, 4); crayon(g, ell(560, 380, 62, 74, 3), { fill: C.red, line: '#B8281A', bb: bbox(560, 380, 130, 150), w: 6 }); }, 560, 400, 70, 100);
    obj('blu', 'นก', function (g) { crayon(g, ell(860, 410, 70, 42, 3), { fill: C.blu, line: '#1D4FAA', bb: bbox(860, 410, 140, 90), w: 6 }); crayon(g, poly([[830, 400], [880, 360], [890, 410]], 3, 30), { fill: '#6E9EF0', line: '#1D4FAA', bb: bbox(860, 385, 70, 60), w: 5, gap: 10 }); crayon(g, poly([[928, 402], [956, 412], [928, 422]], 2, 20), { fill: C.org, a: 0.9, line: '#B85F12', w: 4 }); crayon(g, ell(905, 398, 6, 6, 1), { fill: C.ink, a: 1 }); }, 870, 400, 95, 60);
    obj('blu', 'ว่าว', function (g) { crayon(g, poly([[1150, 300], [1210, 380], [1150, 470], [1090, 380]], 4, 40), { fill: C.blu, line: '#1D4FAA', bb: bbox(1150, 385, 130, 180), w: 6 }); stroke(g, line([[1150, 470], [1130, 520], [1170, 560], [1140, 600]], 3), C.ink, 4); }, 1150, 420, 75, 150);
    obj('yel', 'ดวงอาทิตย์', function (g) { for (var a = 0; a < 12; a++) { var t = a / 12 * 6.2832; stroke(g, line([[1640 + Math.cos(t) * 80, 400 + Math.sin(t) * 80], [1640 + Math.cos(t) * 112, 400 + Math.sin(t) * 112]], 2), C.yel, 8); } crayon(g, ell(1640, 400, 64, 64, 3), { fill: C.yel, line: '#C9930E', bb: bbox(1640, 400, 130, 130), w: 6 }); }, 1640, 400, 112, 112);
    obj('red', 'แอปเปิ้ล', function (g) { apple(g, 470, 735, 40); }, 470, 725, 52, 60);
    obj('red', 'ลูกบอล', function (g) { crayon(g, ell(700, 730, 50, 50, 2), { fill: C.red, line: '#B8281A', bb: bbox(700, 730, 100, 100), w: 6 }); stroke(g, line([[656, 712], [700, 728], [744, 712]], 2), '#FFFFFF', 7); }, 700, 730, 54, 54);
    obj('grn', 'กบ', function (g) { crayon(g, ell(930, 742, 66, 42, 3), { fill: C.grn, line: '#2C7A43', bb: bbox(930, 742, 135, 90), w: 6 }); crayon(g, ell(902, 700, 18, 18, 2), { fill: '#FFFFFF', a: 1, line: '#2C7A43', w: 5 }); crayon(g, ell(958, 700, 18, 18, 2), { fill: '#FFFFFF', a: 1, line: '#2C7A43', w: 5 }); crayon(g, ell(904, 702, 6, 6, 1), { fill: C.ink, a: 1 }); crayon(g, ell(960, 702, 6, 6, 1), { fill: C.ink, a: 1 }); stroke(g, line([[905, 752], [930, 762], [955, 752]], 1), '#1E5C31', 4); }, 930, 730, 72, 60);
    obj('yel', 'เป็ด', function (g) { crayon(g, ell(1200, 745, 72, 44, 3), { fill: C.yel, line: '#C9930E', bb: bbox(1200, 745, 150, 95), w: 6 }); crayon(g, ell(1250, 690, 34, 32, 2), { fill: C.yel, line: '#C9930E', bb: bbox(1250, 690, 70, 66), w: 6 }); crayon(g, poly([[1280, 690], [1312, 698], [1280, 708]], 2, 20), { fill: C.org, a: 0.9, line: '#B85F12', w: 4 }); crayon(g, ell(1258, 682, 5, 5, 1), { fill: C.ink, a: 1 }); }, 1220, 725, 100, 75);
    obj('blu', 'ถังน้ำ', function (g) { crayon(g, poly([[1420, 700], [1520, 700], [1506, 790], [1434, 790]], 3, 40), { fill: C.blu, line: '#1D4FAA', bb: bbox(1470, 745, 110, 100), w: 6 }); stroke(g, cat([[1424, 702], [1440, 650], [1500, 650], [1516, 702]], false), C.ink, 4); }, 1470, 730, 66, 80);
    obj('grn', 'พุ่มไม้', function (g) { cloudish(g, 1680, 730, 190, 120, C.grn, '#2C7A43'); }, 1680, 730, 100, 66);
    /* crayons */
    var PEN = [['red', C.red, 'แดง', '#B8281A'], ['yel', C.yel, 'เหลือง', '#C9930E'], ['grn', C.grn, 'เขียว', '#2C7A43'], ['blu', C.blu, 'น้ำเงิน', '#1D4FAA']];
    var penEls = {};
    PEN.forEach(function (P, i) {
      var x = 170 + i * 410, y = 850, g = S('g', { 'class': 'k3-pen' }, pens);
      crayon(g, poly([[x, y], [x + 250, y], [x + 330, y + 45], [x + 250, y + 90], [x, y + 90]], 3, 60), { fill: P[1], a: 0.75, line: P[3], w: 6, bb: bbox(x + 165, y + 45, 330, 90), gap: 12 });
      crayon(g, poly([[x + 40, y + 8], [x + 210, y + 8], [x + 210, y + 82], [x + 40, y + 82]], 2, 60), { fill: '#FFFFFF', a: 0.85, line: P[3], w: 4 });
      var t = S('text', { x: x + 125, y: y + 62, 'text-anchor': 'middle', 'class': 'k3-pl', fill: P[3] }, g); t.textContent = P[2];
      var h = S('rect', { x: x - 10, y: y - 14, width: 352, height: 120, fill: 'transparent', 'class': 'tap' }, g);
      h.setAttribute('role', 'button'); h.setAttribute('tabindex', '0'); h.setAttribute('aria-label', 'สี' + P[2]);
      K.tap(h, function () { pick(P[0]); });
      penEls[P[0]] = g;
    });
    var cur = null, nameEl = $('#k3-name'), say = $('#k3-say');
    function pick(c, keep) {
      cur = cur === c && !keep ? null : c;
      rings.textContent = '';
      art.classList.toggle('picked', !!cur);
      objs.forEach(function (o) { o.g.classList.toggle('lit', o.c === cur); });
      Object.keys(penEls).forEach(function (k) { penEls[k].classList.toggle('lit', k === cur); });
      nameEl.textContent = '';
      if (!cur) { say.textContent = 'แตะสีเทียน แล้วหาของสีนั้นในภาพ'; K.tone(300, 100, 'sine', 0.03); return; }
      var P = PEN.filter(function (p) { return p[0] === cur; })[0], lit = objs.filter(function (o) { return o.c === cur; });
      seed = 900 + PEN.indexOf(P);
      lit.forEach(function (o, k) {
        var r = stroke(rings, ell(o.cx, o.cy, o.rx + 26, o.ry + 26, 5), P[1], 9);
        r.classList.add('k3-ring'); r.style.animationDelay = (k * 0.15) + 's';
        K.anim(o.g, [{ transform: 'translateY(0)' }, { transform: 'translateY(-26px)', offset: 0.4 }, { transform: 'none' }], { duration: 520, delay: k * 150, easing: 'ease-out' });
        K.tone(523 * Math.pow(2, k / 6), 160, 'triangle', 0.04, k * 0.15);
      });
      var b = E('b', '', 'สี' + P[2], nameEl); b.style.color = P[3];
      E('span', '', 'มี ' + lit.length + ' อย่าง', nameEl);
      say.textContent = lit.map(function (o) { return o.name; }).join(' · ');
    }
    K.ctl('kc-color', { set: function () {}, leave: function () { if (cur) pick(cur); } });
    window.__colors = { pick: pick, lit: function () { return objs.filter(function (o) { return o.g.classList.contains('lit'); }).map(function (o) { return o.name; }); } };
  })();

  K.start();
})();
