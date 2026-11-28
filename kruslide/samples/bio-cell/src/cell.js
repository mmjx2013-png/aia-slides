/* cell.js · the live biology of the KruSlide cell sample (vanilla JS, no libraries, no network). All drawings are our own.
   1 · one cell in stain colours; t = 0 is the animal cell, t = 1 the plant cell, and every shape is interpolated by t, so the
       toggle morphs one into the other (outline, cell wall, chloroplasts, vacuole, nucleus position). Tap a part for its job.
   2 · onion skin (iodine) and cheek cells (methylene blue) drawn roughly to scale on a canvas. Field of view = 18 mm ÷
       objective (field number 18): 4.5 mm at 40×, 1.8 mm at 100×, 0.45 mm at 400×; the scale bar follows.
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
  var seed = 11; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function smooth(p) {   /* closed Catmull-Rom spline through the points, as cubic Béziers */
    var n = p.length, d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
    for (var i = 0; i < n; i++) {
      var a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], e = p[(i + 2) % n];
      d += ' C' + (b[0] + (c[0] - a[0]) / 6).toFixed(1) + ' ' + (b[1] + (c[1] - a[1]) / 6).toFixed(1) + ' ' + (c[0] - (e[0] - b[0]) / 6).toFixed(1) + ' ' + (c[1] - (e[1] - b[1]) / 6).toFixed(1) + ' ' + c[0].toFixed(1) + ' ' + c[1].toFixed(1);
    }
    return d + 'Z';
  }
  function sstep(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }

  /* ---------------- organelles: names and jobs (our own words, ม.1 level) ---------------- */
  var ORG = {
    nuc: { th: 'นิวเคลียส', en: 'Nucleus', c: '#5B3A86', p: 'มี', a: 'มี', tx: 'ศูนย์ควบคุมการทำงานของเซลล์ ภายในมีสารพันธุกรรม (DNA) ที่ใช้ถ่ายทอดลักษณะไปสู่รุ่นต่อไป' },
    cyto: { th: 'ไซโทพลาซึม', en: 'Cytoplasm', c: '#E7A2B8', p: 'มี', a: 'มี', tx: 'ของเหลวภายในเซลล์ มีออร์แกเนลล์ต่าง ๆ อยู่ เป็นที่เกิดปฏิกิริยาเคมีหลายอย่างของเซลล์' },
    mem: { th: 'เยื่อหุ้มเซลล์', en: 'Cell membrane', c: '#C2577A', p: 'มี', a: 'มี', tx: 'เยื่อบาง ๆ ห่อหุ้มเซลล์ ควบคุมว่าสารใดผ่านเข้าหรือออกจากเซลล์ได้' },
    mito: { th: 'ไมโทคอนเดรีย', en: 'Mitochondrion', c: '#B0466E', p: 'มี', a: 'มี', tx: 'สลายสารอาหารด้วยการหายใจระดับเซลล์ ได้พลังงานไปใช้ในกิจกรรมต่าง ๆ ของเซลล์' },
    vac: { th: 'แวคิวโอล', en: 'Vacuole', c: '#9C8CC4', p: 'มี ขนาดใหญ่', a: 'บางชนิด ขนาดเล็ก', tx: 'ถุงเก็บน้ำ อาหาร และของเสีย แวคิวโอลขนาดใหญ่ในเซลล์พืชดันให้เซลล์เต่ง' },
    wall: { th: 'ผนังเซลล์', en: 'Cell wall', c: '#C9A35E', p: 'มี', a: 'ไม่มี', tx: 'ชั้นแข็งอยู่นอกเยื่อหุ้มเซลล์ ช่วยค้ำจุนและทำให้เซลล์พืชคงรูปร่าง' },
    chl: { th: 'คลอโรพลาสต์', en: 'Chloroplast', c: '#5E9A45', p: 'มี (ส่วนสีเขียว)', a: 'ไม่มี', tx: 'มีคลอโรฟิลล์สีเขียว ใช้พลังงานแสงสร้างอาหารด้วยการสังเคราะห์ด้วยแสง' }
  };
  var ORDER = ['wall', 'mem', 'cyto', 'nuc', 'vac', 'mito', 'chl'];

  var C = {};

  /* ============ 1 · the cell explorer ============ */
  C['m-cell'] = (function () {
    var svg = $('#m1-svg'), lab = $('#m1-lab'), FX = 760, FY = 580, NP = 96, t = 0, sel = 'nuc', A = Anim();
    function blob(q) { var f = 1 + 0.05 * Math.sin(3 * q + 0.7) + 0.035 * Math.sin(5 * q + 2); return [290 * Math.cos(q) * f, 232 * Math.sin(q) * f]; }
    function box(q) { var c = Math.cos(q), s = Math.sin(q); return [290 * Math.sign(c) * Math.pow(Math.abs(c), 1 / 3), 205 * Math.sign(s) * Math.pow(Math.abs(s), 1 / 3)]; }
    function outline(tt, grow) {
      var pts = [];
      for (var i = 0; i < NP; i++) {
        var q = i / NP * 2 * Math.PI, a = blob(q), b = box(q), x = lerp(a[0], b[0], tt), y = lerp(a[1], b[1], tt);
        if (grow) { var r = Math.hypot(x, y); x *= (r + grow) / r; y *= (r + grow) / r; }
        pts.push([x, y]);
      }
      return pts;
    }
    var defs = S('defs', {}, svg), pat = S('pattern', { id: 'm1-gran', width: 46, height: 46, patternUnits: 'userSpaceOnUse' }, defs);
    S('rect', { width: 46, height: 46, fill: '#F2BFCF' }, pat);
    for (var gi = 0; gi < 9; gi++) S('circle', { cx: (rnd() * 46).toFixed(1), cy: (rnd() * 46).toFixed(1), r: (0.9 + rnd() * 1.4).toFixed(1), fill: '#D98AA5', opacity: 0.55 }, pat);
    /* neighbouring cells at the edge of the field: spaced apart (animal) or wall to wall (plant) */
    var NA = [[-660, 40], [660, -30], [40, -520], [-30, 520], [-700, -520], [700, 520]], NPL = [[-606, 0], [606, 0], [0, -436], [0, 436], [-606, -436], [606, 436]];
    var gNb = S('g', { 'class': 'nbrs', 'aria-hidden': 'true' }, svg), nbs = NA.map(function () { var g = S('g', {}, gNb); return { g: g, w: S('path', { 'class': 'nb-w' }, g), c: S('path', { 'class': 'nb-c' }, g), n: S('circle', { 'class': 'nb-n', r: 40 }, g) }; });
    var gWall = S('g', { 'class': 'org', 'data-org': 'wall' }, svg), wall = S('path', { 'class': 'wall' }, gWall), wallHit = S('path', { 'class': 'hitline' }, gWall);
    var gCyto = S('g', { 'class': 'org', 'data-org': 'cyto' }, svg), cyto = S('path', { 'class': 'cyto' }, gCyto);
    var gVac2 = S('g', { 'class': 'org', 'data-org': 'vac' }, svg), vac2 = S('ellipse', { 'class': 'vac' }, gVac2);
    var gVac = S('g', { 'class': 'org', 'data-org': 'vac' }, svg), vac = S('ellipse', { 'class': 'vac' }, gVac);
    var gMito = S('g', { 'class': 'org', 'data-org': 'mito' }, svg), mitos = [];
    var MA = [[150, -112, 25], [-172, 52, -30], [40, 152, 10], [212, 18, 80], [-142, -132, -20]];
    var MP = [[25, -165, 0], [200, -155, 15], [258, -20, 90], [95, 178, 0], [-250, 30, 90]];
    MA.forEach(function () {
      var g = S('g', {}, gMito);
      S('rect', { 'class': 'mito', x: -30, y: -14, width: 60, height: 28, rx: 14 }, g);
      S('path', { 'class': 'crist', d: 'M-20 0 L-14 -8 L-8 7 L-2 -8 L4 7 L10 -8 L16 6 L21 0' }, g);
      mitos.push(g);
    });
    var gChl = S('g', { 'class': 'org', 'data-org': 'chl' }, svg), chls = [];
    [[-60, -160, 0], [110, -160, 0], [250, -100, 90], [255, 70, 90], [190, 174, 0], [0, 176, 0], [-130, 174, 0], [-252, 115, 90]].forEach(function (c) {
      var g = S('g', {}, gChl); g._p = [c[0], c[1]]; g._r = c[2]; g._k = chls.length;
      S('ellipse', { 'class': 'chl', rx: 31, ry: 15 }, g);
      S('path', { 'class': 'grana', d: 'M-16 -4 v8 M-6 -6 v12 M4 -6 v12 M14 -4 v8' }, g);
      chls.push(g);
    });
    var gNuc = S('g', { 'class': 'org', 'data-org': 'nuc' }, svg), nuc = S('circle', { 'class': 'nuc' }, gNuc), nucl = S('circle', { 'class': 'nucl' }, gNuc);
    var gMem = S('g', { 'class': 'org', 'data-org': 'mem' }, svg), mem = S('path', { 'class': 'mem' }, gMem), memHit = S('path', { 'class': 'hitline thin' }, gMem);
    var needle = S('path', { 'class': 'needle' }, svg);
    var G = {};
    function geo(tt) {
      var o = outline(tt), e = eio(tt);
      return {
        o: o, w: outline(tt, 13),
        nuc: [lerp(-20, -190, e), lerp(-20, -95, e), lerp(64, 50, e)],
        vac: [lerp(150, 40, e), lerp(120, 25, e), lerp(30, 180, e), lerp(22, 120, e)],
        mito: MA.map(function (a, i) { return [lerp(a[0], MP[i][0], e), lerp(a[1], MP[i][1], e), lerp(a[2], MP[i][2], e)]; })
      };
    }
    function anchor(id, g) {
      if (id === 'nuc') return [g.nuc[0], g.nuc[1]];
      if (id === 'vac') return [g.vac[0] - g.vac[2] * 0.35, g.vac[1] + g.vac[3] * 0.25];
      if (id === 'mito') return [g.mito[4][0], g.mito[4][1]];
      if (id === 'chl') { var c = chls[6]; return [c._p[0], c._p[1]]; }
      if (id === 'cyto') return [lerp(140, -80, t), lerp(-60, -112, t)];
      if (id === 'mem') { var p = g.o[Math.round(NP * 0.58)]; return p; }
      if (id === 'wall') { var w = g.w[Math.round(NP * 0.42)]; return w; }
    }
    function render() {
      var g = G = geo(t), d = smooth(g.o);
      cyto.setAttribute('d', d); mem.setAttribute('d', d); memHit.setAttribute('d', d);
      var dw = smooth(g.w); wall.setAttribute('d', dw); wallHit.setAttribute('d', dw);
      nbs.forEach(function (nb, i) {
        var ox = lerp(NA[i][0], NPL[i][0], eio(t)), oy = lerp(NA[i][1], NPL[i][1], eio(t));
        nb.g.setAttribute('transform', 'translate(' + ox.toFixed(1) + ',' + oy.toFixed(1) + ')');
        nb.c.setAttribute('d', d); nb.w.setAttribute('d', dw); nb.w.style.opacity = sstep((t - 0.25) / 0.6);
        nb.n.setAttribute('cx', (-0.28 * ox + (i % 2 ? 30 : -30)).toFixed(1)); nb.n.setAttribute('cy', (-0.3 * oy + (i < 2 ? -40 : 0)).toFixed(1));
      });
      gWall.style.opacity = sstep((t - 0.25) / 0.6); gWall.style.pointerEvents = t > 0.5 ? 'auto' : 'none';
      nuc.setAttribute('cx', g.nuc[0]); nuc.setAttribute('cy', g.nuc[1]); nuc.setAttribute('r', g.nuc[2]);
      nucl.setAttribute('cx', g.nuc[0] + g.nuc[2] * 0.22); nucl.setAttribute('cy', g.nuc[1] - g.nuc[2] * 0.15); nucl.setAttribute('r', g.nuc[2] * 0.3);
      vac.setAttribute('cx', g.vac[0]); vac.setAttribute('cy', g.vac[1]); vac.setAttribute('rx', g.vac[2]); vac.setAttribute('ry', g.vac[3]);
      vac2.setAttribute('cx', -92); vac2.setAttribute('cy', 140); vac2.setAttribute('rx', 18 * (1 - t)); vac2.setAttribute('ry', 14 * (1 - t)); gVac2.style.opacity = 1 - t;
      mitos.forEach(function (m, i) { var p = g.mito[i]; m.setAttribute('transform', 'translate(' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ') rotate(' + p[2].toFixed(1) + ')'); });
      chls.forEach(function (c) { var s = sstep((t - 0.35 - c._k * 0.035) / 0.35); c.setAttribute('transform', 'translate(' + c._p[0].toFixed(1) + ',' + c._p[1].toFixed(1) + ') rotate(' + c._r.toFixed(1) + ') scale(' + s.toFixed(3) + ')'); c.style.opacity = s; });
      gChl.style.pointerEvents = t > 0.5 ? 'auto' : 'none';
      point(); labels();
    }
    function present(id) { return !((id === 'wall' || id === 'chl') && t < 0.5); }
    function point() {   /* the eyepiece pointer: a needle from the right edge of the field to the selected part */
      if (!present(sel)) { needle.setAttribute('d', ''); return; }
      var a = anchor(sel, G), y = clamp(a[1], -330, 330), sg = a[0] < -60 ? -1 : 1, x0 = sg * (Math.sqrt(420 * 420 - y * y) + 4), tip = a[0] + 8 * sg;
      needle.setAttribute('d', 'M' + x0 + ' ' + (y - 6) + ' L' + (tip + 2 * sg) + ' ' + (a[1] - 1.2) + ' L' + tip + ' ' + a[1] + ' L' + (tip + 2 * sg) + ' ' + (a[1] + 1.2) + ' L' + x0 + ' ' + (y + 6) + ' Z');
    }
    var shown = false;
    function labels() {
      lab.textContent = ''; if (!shown) return;
      var rows = ORDER.filter(present).map(function (id) { var a = anchor(id, G); return { id: id, x: FX + a[0], y: FY + a[1] }; });
      rows.sort(function (p, q) { return p.y - q.y; });
      var y0 = 300, step = Math.min(96, 600 / Math.max(1, rows.length - 1));
      rows.forEach(function (r, i) {
        var ly = y0 + i * step, g = S('g', { 'class': 'lbl-g' }, lab);
        S('path', { 'class': 'leader', d: 'M318 ' + ly + ' L352 ' + ly + ' L' + r.x.toFixed(1) + ' ' + r.y.toFixed(1) }, g);
        S('circle', { 'class': 'ldot', cx: r.x, cy: r.y, r: 5 }, g);
        T({ 'class': 'ltx', x: 306, y: ly + 8, 'text-anchor': 'end' }, ORG[r.id].th, g);
      });
    }
    function info(id) {
      sel = id; var o = ORG[id];
      $('#m1-sw').style.background = o.c; $('#m1-nm').textContent = o.th; $('#m1-en').textContent = o.en; $('#m1-tx').textContent = o.tx;
      $('#m1-p').textContent = 'เซลล์พืช: ' + o.p; $('#m1-a').textContent = 'เซลล์สัตว์: ' + o.a;
      $('#m1-a').className = o.a === 'ไม่มี' ? 'no' : '';
      $$('.org', svg).forEach(function (g) { g.classList.toggle('sel', g.dataset.org === id); });
      $$('#m1-chips .chip').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.org === id ? 'true' : 'false'); });
      point();
    }
    var chipsEl = $('#m1-chips');
    ORDER.forEach(function (id) { var b = H('button', 'chip', null, chipsEl); b.type = 'button'; b.dataset.org = id; H('i', '', null, b).style.background = ORG[id].c; b.appendChild(document.createTextNode(ORG[id].th)); tap(b, function () { info(id); }); });
    svg.addEventListener('click', function (e) { var g = e.target.closest ? e.target.closest('.org') : null; if (!g) return; e.stopPropagation(); info(g.dataset.org); });
    function chips() { $$('#m1-chips .chip').forEach(function (c) { c.classList.toggle('absent', !present(c.dataset.org)); }); }
    function morph(to) {
      $$('#m1-side .m1-tog .pill').forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.k === to ? 'true' : 'false'); });
      var t0 = t; A.run(still() ? 0 : 1300, function (p) { t = lerp(t0, to, eio(p)); render(); }, function () { t = to; render(); chips(); if (!present(sel)) info('nuc'); else info(sel); });
    }
    $$('#m1-side .m1-tog .pill').forEach(function (b) { tap(b, function () { morph(+b.dataset.k); }); });
    render(); info('nuc'); chips();
    return {
      set: function (st, prev) { shown = st >= 1; labels(); if (prev < 0 && st === 0) { A.stop(); t = 0; render(); chips(); info('nuc'); $$('#m1-side .m1-tog .pill').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.k === '0' ? 'true' : 'false'); }); } },
      leave: function () { A.stop(); },
      morph: morph, info: info
    };
  })();

  /* ============ 2 · zoom from tissue to cell ============ */
  C['m-zoom'] = (function () {
    var cv = $('#m2-cv'), ctx = cv.getContext('2d'), D = 800, M = 40, spec = 'onion', A = Anim(), dpr = 1;
    /* onion epidermis: rows of long box-shaped cells (µm), centred so one cell sits at the middle */
    seed = 29; var onion = [], y = -3300;
    while (y < 3300) { var h = 64 + rnd() * 24, x = -3600 - rnd() * 300; while (x < 3600) { var L = 210 + rnd() * 200; onion.push({ x0: x, x1: x + L, y0: y, y1: y + h, nx: x + L * (0.3 + rnd() * 0.4), ny: y + h * (0.38 + rnd() * 0.24), nr: 11 + rnd() * 4 }); x += L; } y += h; }
    var mid = onion.filter(function (c) { return c.x0 <= 0 && c.x1 >= 0 && c.y0 <= 0 && c.y1 >= 0; })[0];
    var ox = (mid.x0 + mid.x1) / 2, oy = (mid.y0 + mid.y1) / 2; onion.forEach(function (c) { c.x0 -= ox; c.x1 -= ox; c.y0 -= oy; c.y1 -= oy; c.nx -= ox; c.ny -= oy; });
    /* cheek cells: flat, rounded polygons, alone or in small clumps */
    seed = 5; var cheek = [];
    function cheekCell(cx, cy, r) {
      var n = 11, rot = rnd() * 6.28, pts = [];
      for (var i = 0; i < n; i++) { var a = rot + i / n * 6.28, rr = r * (0.82 + rnd() * 0.32); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
      cheek.push({ p: pts, nx: cx + (rnd() - 0.5) * r * 0.3, ny: cy + (rnd() - 0.5) * r * 0.3, nr: 4.2 + rnd() * 1.3, r: r, f: rnd() * 6.28 });
    }
    cheekCell(0, 0, 33);
    cheekCell(150, -110, 30); cheekCell(-170, 90, 31); cheekCell(60, 175, 28);
    for (var k = 0; k < 70; k++) { var a = rnd() * 6.28, d = 260 + rnd() * 2300, n = 1 + Math.floor(rnd() * 6), cx = Math.cos(a) * d, cy = Math.sin(a) * d; for (var j = 0; j < n; j++) cheekCell(cx + (rnd() - 0.5) * 140, cy + (rnd() - 0.5) * 140, 26 + rnd() * 10); }
    function poly(p) { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (var i = 1; i < p.length; i++) { var a = p[i - 1], b = p[i]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } ctx.closePath(); }
    function draw() {
      var s = D * M / 180000, R = D / 2 / s;   /* px per µm, and the field radius in µm */
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, D, D);
      ctx.fillStyle = spec === 'onion' ? '#F1E5C4' : '#E9EFF2'; ctx.fillRect(0, 0, D, D);
      ctx.save(); ctx.translate(D / 2, D / 2); ctx.scale(s, s);
      if (spec === 'onion') {
        ctx.rotate(-0.12);
        onion.forEach(function (c) {
          if (c.x1 < -R * 1.2 || c.x0 > R * 1.2 || c.y1 < -R * 1.2 || c.y0 > R * 1.2) return;
          ctx.fillStyle = 'rgba(214,158,66,0.20)'; ctx.fillRect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0);
          ctx.lineWidth = Math.max(3.2, 1.1 / s); ctx.strokeStyle = 'rgba(150,96,30,0.85)'; ctx.strokeRect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0);
          if (s > 0.9) { ctx.lineWidth = Math.max(0.9, 0.6 / s); ctx.strokeStyle = 'rgba(250,236,200,0.7)'; ctx.strokeRect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0); }
          ctx.fillStyle = 'rgba(128,80,22,0.82)'; ctx.beginPath(); ctx.ellipse(c.nx, c.ny, c.nr, c.nr * 0.72, 0, 0, 6.2832); ctx.fill();
          if (s > 0.8) { ctx.fillStyle = 'rgba(80,46,10,0.9)'; ctx.beginPath(); ctx.arc(c.nx + c.nr * 0.25, c.ny - c.nr * 0.1, c.nr * 0.28, 0, 6.2832); ctx.fill(); }
        });
      } else {
        cheek.forEach(function (c) {
          if (Math.abs(c.p[0][0]) > R * 1.3 + 60 || Math.abs(c.p[0][1]) > R * 1.3 + 60) return;
          poly(c.p); ctx.fillStyle = 'rgba(61,111,180,0.16)'; ctx.fill();
          ctx.lineWidth = Math.max(1.2, 1 / s); ctx.strokeStyle = 'rgba(44,84,150,0.62)'; ctx.stroke();
          if (s > 0.8) {   /* folds of the thin flat cell */
            ctx.lineWidth = Math.max(0.6, 0.6 / s); ctx.strokeStyle = 'rgba(44,84,150,0.35)'; ctx.beginPath();
            ctx.moveTo(c.nx + Math.cos(c.f) * c.r * 0.5, c.ny + Math.sin(c.f) * c.r * 0.5); ctx.quadraticCurveTo(c.nx + Math.cos(c.f + 1) * c.r * 0.9, c.ny + Math.sin(c.f + 1) * c.r * 0.9, c.nx + Math.cos(c.f + 2) * c.r * 0.7, c.ny + Math.sin(c.f + 2) * c.r * 0.7); ctx.stroke();
          }
          ctx.fillStyle = 'rgba(34,70,140,0.88)'; ctx.beginPath(); ctx.arc(c.nx, c.ny, c.nr, 0, 6.2832); ctx.fill();
        });
      }
      ctx.restore();
      /* scale bar */
      var opts = [1000, 500, 200, 100, 50, 20], Lm = opts[opts.length - 1];
      for (var i = 0; i < opts.length; i++) if (opts[i] * s <= 230) { Lm = opts[i]; break; }
      var bar = $('#m2-bar'); bar.firstChild.style.width = (Lm * s).toFixed(1) + 'px'; bar.lastChild.textContent = Lm >= 1000 ? (Lm / 1000) + ' mm' : Lm + ' µm';
    }
    function fit() { var r = cv.getBoundingClientRect(); dpr = clamp((r.width || D) / D * (window.devicePixelRatio || 1), 1, 2); cv.width = Math.round(D * dpr); cv.height = Math.round(D * dpr); draw(); }
    addEventListener('resize', fit);
    var trk = $('#m2-trk'), inr = $('#m2-in');
    function pos(m) { return Math.log(m / 40) / Math.log(10); }
    function readout() {
      var o = M < 63 ? 4 : M < 200 ? 10 : 40, pc = (pos(M) * 100).toFixed(2) + '%';
      $('#m2-th').style.left = pc; $('#m2-fill').style.width = pc; trk.setAttribute('aria-valuenow', Math.round(M));
      $$('#m2-obj [data-o]').forEach(function (d) { d.classList.toggle('on', +d.dataset.o === o); });
      var exact = Math.abs(M - o * 10) < 0.5;
      $('#m2-mag').innerHTML = exact ? 'เลนส์ใกล้ตา 10× × เลนส์ใกล้วัตถุ ' + o + '× = <b>' + (o * 10) + ' เท่า</b>' : 'กำลังเปลี่ยนเลนส์… ≈ <b>' + Math.round(M) + ' เท่า</b>';
      var fov = 18 / (M / 10);
      $('#m2-lvl').innerHTML = (M < 70 ? '<b>ระดับเนื้อเยื่อ</b> เห็นเซลล์จำนวนมากอยู่ติดกัน' : M < 250 ? '<b>เริ่มเห็นเซลล์</b> แต่ละเซลล์ชัดขึ้น' : '<b>ระดับเซลล์</b> เห็น' + (spec === 'onion' ? 'ผนังเซลล์และนิวเคลียส' : 'เยื่อหุ้มเซลล์และนิวเคลียส')) +
        '<br><span>ภาพกว้างประมาณ ' + (fov >= 1 ? fov.toFixed(1) + ' มม.' : Math.round(fov * 1000) + ' ไมโครเมตร') + '</span>';
    }
    function setM(m) { M = clamp(m, 40, 400); readout(); draw(); }
    function snap() { var opts = [40, 100, 400], best = opts.reduce(function (a, b) { return Math.abs(pos(b) - pos(M)) < Math.abs(pos(a) - pos(M)) ? b : a; }); tween(best, 450); }
    function tween(to, ms) { var m0 = M; A.run(still() ? 0 : ms, function (p) { setM(Math.exp(lerp(Math.log(m0), Math.log(to), eio(p)))); }, function () { setM(to); }); }
    drag(trk, function (x, y2, ph) {
      if (ph === 'end' || ph === 'cancel') { snap(); return; }
      A.stop(); var r = clamp((x - inr.offsetLeft) / (inr.offsetWidth || 1), 0, 1); setM(40 * Math.pow(10, r));
    });
    trk.tabIndex = 0;
    trk.addEventListener('keydown', function (e) { if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return; e.preventDefault(); e.stopPropagation(); var o = [40, 100, 400], i = o.indexOf(Math.round(M)); i = clamp((i < 0 ? 0 : i) + (e.key === 'ArrowUp' ? 1 : -1), 0, 2); tween(o[i], 450); });
    function setSpec(s2) { spec = s2; $$('#m2-side .m2-spec .pill').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.s === s2 ? 'true' : 'false'); }); readout(); draw(); }
    $$('#m2-side .m2-spec .pill').forEach(function (b) { tap(b, function () { setSpec(b.dataset.s); }); });
    setM(40); fit();
    return {
      set: function (st, prev) {
        fit();
        if (st === 0) { A.stop(); if (prev < 0 || prev === 1 || prev === 2) { setSpec('onion'); setM(40); } }
        else if (st === 1) { setSpec('onion'); if (prev === 0 && !still()) { setM(40); setTimeout(function () { tween(100, 1100); setTimeout(function () { if (Math.round(M) === 100) tween(400, 1300); }, 1700); }, 300); } else setM(400); }
        else { A.stop(); setSpec('cheek'); setM(400); }
      },
      leave: function () { A.stop(); }
    };
  })();

  /* ============ 3 · quiz: beat 1 shows the answers ============ */
  C['m-quiz'] = (function () {
    return { set: function (st, prev) { var w = $('#m3-sort').__w; if (!w) return; if (st === 1) w.show(); else if (prev === 1) w.hide(); }, leave: function () {} };
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
  window.__cell = { C: C };
})();
