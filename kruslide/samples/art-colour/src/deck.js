/* deck.js · แม่สี วงจรสี และวรรณะสี (ป.4–6) · paint drops, the colour wheel and the paintings (vanilla JS, no images).
   Colour theory as taught in Thai primary art (pigment primaries): แม่สี แดง เหลือง น้ำเงิน; สีขั้นที่ 2 ส้ม เขียว ม่วง;
   สีขั้นที่ 3 = แม่สี + สีขั้นที่ 2 ที่อยู่ติดกัน. วรรณะสีร้อน / สีเย็น: เหลืองและม่วงอยู่ได้ทั้งสองวรรณะ.
   Slide 1: drag a drop onto another: they run together and bloom into the mix, which floats to the shelf. Beat 1 shows all mixes.
   Slide 2: drag the 9 missing colours into the wheel; tap a painted wedge to take it back; Check / Show answer / Reset. */
(function () {
  'use strict';
  var K = KIT, S = K.S, $ = K.$, $$ = K.$$;
  if (!document.getElementById('stage')) return;

  /* paper grain behind every slide */
  $$('.slide').forEach(function (sl) {
    var s = S('svg', { 'class': 'paper', viewBox: '0 0 1920 1080', 'aria-hidden': 'true' });
    S('rect', { width: 1920, height: 1080, filter: 'url(#fibre)', opacity: 0.35 }, s);
    S('rect', { width: 1920, height: 1080, filter: 'url(#grain)', opacity: 0.55 }, s);
    sl.insertBefore(s, sl.firstChild);
  });
  /* a wobbly watercolour blob as a path (deterministic per seed) */
  function blobD(r, seed) {
    var n = 40, d = '';
    for (var i = 0; i <= n; i++) {
      var a = i / n * Math.PI * 2, k = 1 + 0.07 * Math.sin(3 * a + seed) + 0.05 * Math.sin(5 * a + seed * 1.7) + 0.03 * Math.sin(9 * a + seed * 2.3);
      d += (i ? 'L' : 'M') + (Math.cos(a) * r * k).toFixed(1) + ' ' + (Math.sin(a) * r * k).toFixed(1);
    }
    return d + 'Z';
  }
  function blob(g, r, col, seed, f) {
    var b = S('g', { filter: 'url(#' + (f || 'wc') + ')' }, g);
    S('path', { d: blobD(r, seed), fill: col, opacity: 0.88 }, b);
    S('path', { d: blobD(r * 0.55, seed + 2), fill: '#FFFFFF', opacity: 0.12, transform: 'translate(' + (-r * 0.2) + ' ' + (-r * 0.25) + ')' }, b);
    return b;
  }
  var C = { r: '#D7263D', y: '#F6C324', b: '#1F4FA0', o: '#EE7A22', g: '#3E9B4F', p: '#6F3C8E' };

  /* ============ slide 1 · mixing ============ */
  (function () {
    var svg = $('#a1-mix'); if (!svg) return;
    var NAME = { r: 'แดง', y: 'เหลือง', b: 'น้ำเงิน' }, HOME = { r: [300, 250], y: [790, 250], b: [545, 650] };
    var MIX = { ry: ['o', 'ส้ม'], yb: ['g', 'เขียว'], rb: ['p', 'ม่วง'] }, ORDER = ['ry', 'yb', 'rb'];
    S('circle', { cx: 545, cy: 400, r: 400, 'class': 'ring' }, svg);
    var hint = S('text', { x: 545, y: 470, 'class': 'hand' }, svg); hint.textContent = 'ลากหยดสีมาทับกัน';
    var layer = S('g', {}, svg), drops = {}, busy = false;
    function put(D) { D.g.setAttribute('transform', 'translate(' + D.x + ' ' + D.y + ') scale(' + D.s + ')'); }
    ['r', 'y', 'b'].forEach(function (k, i) {
      var g = S('g', { 'class': 'drop', tabindex: '0', role: 'button', 'aria-label': 'หยดสี' + NAME[k] }, layer);
      blob(g, 118, C[k], i * 2.1 + 1);
      var t = S('text', { x: 0, y: 11, 'class': 'dlab' + (k === 'y' ? ' dk' : '') }, g); t.textContent = NAME[k];
      var D = drops[k] = { k: k, g: g, x: HOME[k][0], y: HOME[k][1], s: 1 }; put(D);
      var off = null;
      K.drag(g, {
        start: function (p, e) { if (busy) return false; var q = K.svgPt(svg, e); off = { x: q.x - D.x, y: q.y - D.y }; layer.appendChild(g); },
        move: function (p, d, e) { var q = K.svgPt(svg, e); D.x = q.x - off.x; D.y = q.y - off.y; put(D); },
        end: function (p, e, moved) {
          if (!moved) return;
          var other = null, best = 190;
          Object.keys(drops).forEach(function (o) { if (o === k) return; var O = drops[o], dd = Math.hypot(O.x - D.x, O.y - D.y); if (dd < best) { best = dd; other = O; } });
          if (other) mix(D, other); else home(D);
        }
      });
    });
    function home(D, fade) {
      var x0 = D.x, y0 = D.y, h = HOME[D.k];
      if (fade) { D.x = h[0]; D.y = h[1]; D.s = 1; put(D); D.g.style.opacity = 0; K.tween(600, function (q) { D.g.style.opacity = q; }); return; }
      K.tween(500, function (q) { D.x = x0 + (h[0] - x0) * q; D.y = y0 + (h[1] - y0) * q; put(D); });
    }
    /* the shelf: one row per secondary colour */
    var shelf = $('#a1-shelf'), slots = {};
    ORDER.forEach(function (pair) {
      var row = K.el('div', 'slotm'), s = S('svg', { viewBox: '-60 -60 120 120' }), f = K.el('div', 'f');
      var q = S('text', { x: 0, y: 16, 'class': 'q', 'text-anchor': 'middle', style: 'font:800 46px Inter;fill:#D6CFC2' }, s); q.textContent = '?';
      f.textContent = 'ยังไม่ได้ผสม';
      row.appendChild(s); row.appendChild(f); shelf.appendChild(row);
      slots[pair] = { row: row, svg: s, f: f, got: false };
    });
    function got(pair) {
      var sl = slots[pair], m = MIX[pair];
      if (sl.got) return; sl.got = true;
      sl.svg.textContent = ''; blob(sl.svg, 46, C[m[0]], 7, 'wcs');
      sl.f.innerHTML = ''; var b = K.el('b', '', m[1]); b.style.color = C[m[0]]; sl.f.appendChild(b);
      sl.f.appendChild(document.createTextNode(NAME[pair[0]] + ' + ' + NAME[pair[1]]));
      sl.row.classList.add('got');
      if (!K.rm() && sl.svg.animate) sl.svg.animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
    function mix(A, B) {
      busy = true; hint.style.opacity = 0;
      var pair = ['r', 'y', 'b'].filter(function (k) { return k === A.k || k === B.k; }).join(''), m = MIX[pair];
      var mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, a0 = { x: A.x, y: A.y }, b0 = { x: B.x, y: B.y };
      K.tween(450, function (q) {
        A.x = a0.x + (mx - a0.x) * q; A.y = a0.y + (my - a0.y) * q; A.s = 1 - 0.35 * q; put(A);
        B.x = b0.x + (mx - b0.x) * q; B.y = b0.y + (my - b0.y) * q; B.s = 1 - 0.35 * q; put(B);
      }, function () {
        A.g.style.opacity = 0; B.g.style.opacity = 0;
        var g = S('g', { transform: 'translate(' + mx + ' ' + my + ') scale(.4)' }, layer);
        blob(g, 150, C[m[0]], 3.3);
        var t = S('text', { x: 0, y: 14, 'class': 'dlab' }, g); t.textContent = m[1];
        var f = S('text', { x: mx, y: my + 205, 'class': 'mixlab' }, layer); f.textContent = NAME[pair[0]] + ' + ' + NAME[pair[1]] + ' = ' + m[1];
        K.tween(800, function (q) { g.setAttribute('transform', 'translate(' + mx + ' ' + my + ') scale(' + (0.4 + 0.6 * q) + ')'); }, function () {
          K.wait(1100, function () {
            /* float to the shelf (svg origin = stage 720, 80) */
            var sb = K.box(slots[pair].svg), tx = sb.cx - 720, ty = sb.cy - 80;
            f.remove();
            K.tween(750, function (q) { g.setAttribute('transform', 'translate(' + (mx + (tx - mx) * q) + ' ' + (my + (ty - my) * q) + ') scale(' + (1 - 0.66 * q) + ')'); }, function () {
              g.remove(); got(pair); home(A, true); home(B, true); A.s = B.s = 1; busy = false;
              ft.say(all() ? 'ok' : '', all() ? 'ค้นพบสีขั้นที่ 2 ครบทั้งสามสีแล้ว!' : '');
            });
          });
        });
      });
    }
    function all() { return ORDER.every(function (p) { return slots[p].got; }); }
    function reset() {
      ORDER.forEach(function (pair) { var sl = slots[pair]; sl.got = false; sl.row.classList.remove('got'); sl.svg.textContent = ''; var q = S('text', { x: 0, y: 16, 'text-anchor': 'middle', style: 'font:800 46px Inter;fill:#D6CFC2' }, sl.svg); q.textContent = '?'; sl.f.textContent = 'ยังไม่ได้ผสม'; });
      Object.keys(drops).forEach(function (k) { var D = drops[k]; D.g.style.opacity = 1; D.s = 1; D.x = HOME[k][0]; D.y = HOME[k][1]; put(D); });
      hint.style.opacity = 1; ft.say('');
    }
    var ft = K.foot($('#a1-ft'), { reset: reset });
    K.slide('a1', { set: function (st) { if (st >= 1) ORDER.forEach(got); } });
    window.__a1 = { drops: drops, slots: slots, mix: mix, reset: reset };
  })();

  /* ============ slide 2 · the wheel ============ */
  (function () {
    var svg = $('#a2-wheel'); if (!svg) return;
    var W = [['เหลือง', '#F6C324', 1], ['เหลืองส้ม', '#F4A62A', 3], ['ส้ม', '#EE7A22', 2], ['แดงส้ม', '#E4532B', 3], ['แดง', '#D7263D', 1], ['แดงม่วง', '#A8336A', 3],
      ['ม่วง', '#6F3C8E', 2], ['น้ำเงินม่วง', '#4A3F95', 3], ['น้ำเงิน', '#1F4FA0', 1], ['น้ำเงินเขียว', '#1E7F86', 3], ['เขียว', '#3E9B4F', 2], ['เหลืองเขียว', '#9DBF3A', 3]];
    var CX = 450, CY = 450, R1 = 392, R0 = 168, slideEl = $('#a2');
    function pol(r, deg) { var a = deg * Math.PI / 180; return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; }
    function wedgeD(i) {
      var c = -90 + i * 30, a0 = c - 15 + 0.6, a1 = c + 15 - 0.6, p0 = pol(R1, a0), p1 = pol(R1, a1), p2 = pol(R0, a1), p3 = pol(R0, a0);
      return 'M' + p0 + ' A' + R1 + ' ' + R1 + ' 0 0 1 ' + p1 + ' L' + p2 + ' A' + R0 + ' ' + R0 + ' 0 0 0 ' + p3 + 'Z';
    }
    var wg = S('g', {}, svg), lg = S('g', {}, svg), mg = S('g', {}, svg), bg = S('g', { 'class': 'badge' }, svg);
    var wedges = W.map(function (w, i) {
      var g = S('g', {}, wg), e = S('path', { d: wedgeD(i), 'class': 'wedge e' }, g), paint = S('g', { filter: 'url(#wcs)' }, g);
      var lp = pol(R1 + 44, -90 + i * 30), lab = S('text', { x: lp[0], y: lp[1] + 8, 'class': 'wlab' }, lg);
      var bp = pol(R0 + 34, -90 + i * 30), b = S('g', {}, bg); S('circle', { cx: bp[0], cy: bp[1], r: 19 }, b); var bt = S('text', { x: bp[0], y: bp[1] + 8 }, b); bt.textContent = w[2];
      var Wd = { i: i, g: g, e: e, paint: paint, lab: lab, fixed: w[2] === 1, dab: null };
      if (Wd.fixed) fill(Wd, i);
      g.addEventListener('click', function (ev) { ev.stopPropagation(); if (!Wd.fixed && Wd.dab) { back(Wd.dab); ft.say(''); } });
      return Wd;
    });
    function fill(Wd, ci) {
      Wd.paint.textContent = ''; Wd.e.style.display = ci == null ? '' : 'none';
      if (ci == null) { Wd.lab.textContent = ''; return; }
      S('path', { d: wedgeD(Wd.i), fill: W[ci][1], opacity: 0.92 }, Wd.paint);
      Wd.lab.textContent = W[ci][0];
      if (!K.rm() && Wd.paint.animate && !Wd.fixed) Wd.paint.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 });
    }
    function unmark() { mg.textContent = ''; }
    /* the tray of dabs */
    var tray = $('#a2-tray'), ORD = [9, 2, 7, 5, 11, 1, 6, 3, 10], dabs = ORD.map(function (ci) {
      var el = K.el('div', 'dabc'); el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'สี' + W[ci][0]);
      var s = S('svg', { viewBox: '-62 -44 124 88' }); blob(s, 40, W[ci][1], ci * 1.3, 'wcs'); el.appendChild(s); el.appendChild(K.el('span', '', W[ci][0]));
      tray.appendChild(el);
      var D = { ci: ci, el: el, at: null }, ghost = null, off = null;
      K.drag(el, {
        start: function (p) { var b = K.box(el); off = { x: p.x - b.x, y: p.y - b.y }; },
        move: function (p, d, e) {
          if (!ghost) { var b = K.box(el); ghost = el.cloneNode(true); ghost.classList.add('drag'); ghost.style.width = b.w + 'px'; slideEl.appendChild(ghost); el.style.opacity = '.3'; }
          ghost.style.left = (p.x - off.x) + 'px'; ghost.style.top = (p.y - off.y) + 'px';
          var w = hitW(e); wedges.forEach(function (x) { x.e.classList.toggle('over', x === w); });
        },
        end: function (p, e, moved) {
          el.style.opacity = ''; wedges.forEach(function (x) { x.e.classList.remove('over'); });
          if (ghost) { ghost.remove(); ghost = null; }
          if (!moved) return;
          var w = hitW(e); if (w) place(D, w);
        }
      });
      return D;
    });
    function hitW(e) {
      var q = K.svgPt(svg, e), dx = q.x - CX, dy = q.y - CY, r = Math.hypot(dx, dy);
      if (r < R0 - 30 || r > R1 + 50) return null;
      var deg = Math.atan2(dy, dx) * 180 / Math.PI + 90, i = ((Math.round(deg / 30) % 12) + 12) % 12, w = wedges[i];
      return w.fixed ? null : w;
    }
    function place(D, w) {
      unmark(); ft.say('');
      if (D.at) { D.at.dab = null; fill(D.at, null); }
      if (w.dab && w.dab !== D) back(w.dab);
      w.dab = D; D.at = w; D.el.classList.add('used'); fill(w, D.ci);
    }
    function back(D) { if (D.at) { D.at.dab = null; fill(D.at, null); } D.at = null; D.el.classList.remove('used'); unmark(); }
    function check() {
      unmark();
      var placed = dabs.filter(function (D) { return D.at; }), right = 0;
      if (!placed.length) { ft.say('info', 'ลากสีไปวางในวงจรสีก่อนนะ'); return; }
      placed.forEach(function (D) {
        var ok = D.at.i === D.ci; if (ok) right++;
        var p = pol((R0 + R1) / 2 + 40, -90 + D.at.i * 30), g = S('g', {}, mg);
        S('circle', { cx: p[0], cy: p[1], r: 21, fill: '#FFFEFA', stroke: ok ? '#3E8E57' : '#C4422F', 'stroke-width': 3 }, g);
        var t = S('text', { x: p[0], y: p[1] + 8, 'class': 'wmark ' + (ok ? 'wok' : 'wno') }, g); t.textContent = ok ? '✓' : '✗';
      });
      if (right === 9) ft.say('ok', 'ครบทั้ง 12 สี วงจรสีสมบูรณ์!');
      else ft.say(right === placed.length ? 'info' : 'no', 'ถูก ' + right + ' จาก ' + placed.length + ' สี' + (placed.length < 9 ? ' · เหลืออีก ' + (9 - placed.length) : '') + (right < placed.length ? ' · ดูว่าสีนั้นผสมจากสีไหน' : ''));
    }
    function show() { dabs.forEach(function (D) { place(D, wedges[D.ci]); }); check(); ft.say('ok', 'เฉลย: สีขั้นที่ 3 อยู่ระหว่างแม่สีกับสีขั้นที่ 2 ที่ผสมกัน'); }
    function reset() { dabs.forEach(back); ft.say(''); }
    var ft = K.foot($('#a2-ft'), { check: check, show: show, reset: reset, hint: 'แตะช่องที่ทาแล้ว เพื่อเอาสีออก' });
    K.slide('a2', { set: function () {} });
    window.__a2 = { dabs: dabs, wedges: wedges, place: place, check: check, show: show, reset: reset };
  })();

  /* ============ slide 3 · two small paintings (beat 1) ============ */
  (function () {
    var w = $('#a3-warm'), c = $('#a3-cool'); if (!w) return;
    function band(s, y, h, col, seed) { var g = S('g', { filter: 'url(#wcs)' }, s); S('path', { d: 'M-6 ' + y + ' Q95 ' + (y - 10 - seed) + ' 190 ' + (y + 4) + ' T386 ' + y + ' V' + (y + h) + ' H-6Z', fill: col, opacity: 0.8 }, g); }
    function clip(s, id) { var d = S('defs', {}, s), cp = S('clipPath', { id: id }, d); S('rect', { x: 0, y: 0, width: 380, height: 170 }, cp); var g = S('g', { 'clip-path': 'url(#' + id + ')' }, s); return g; }
    function frame(s, cap) { S('rect', { x: 0, y: 0, width: 380, height: 170, fill: 'none', stroke: '#33302B', 'stroke-width': 1.5 }, s); var t = S('text', { x: 12, y: 160, 'class': 'pcap' }, s); t.textContent = cap; }
    var W0 = w, C0 = c; w = clip(W0, 'a3-wc'); c = clip(C0, 'a3-cc');
    band(w, 0, 70, '#F6C324', 2); band(w, 45, 50, '#F4A62A', 5); band(w, 80, 40, '#EE7A22', 3);
    var sun = S('g', { filter: 'url(#wcs)' }, w); S('circle', { cx: 270, cy: 70, r: 30, fill: '#D7263D', opacity: 0.85 }, sun);
    var hill = S('g', { filter: 'url(#wcs)' }, w); S('path', { d: 'M-6 170 L-6 112 Q70 82 140 118 Q220 150 300 104 Q350 86 386 100 V170Z', fill: '#A8336A', opacity: 0.85 }, hill);
    S('path', { d: 'M-6 170 V140 Q120 120 230 146 Q320 160 386 138 V170Z', fill: '#6F3C8E', opacity: 0.8, filter: 'url(#wcs)' }, w);
    frame(W0, 'โทนร้อน: สดใส ร้อนแรง');
    band(c, 0, 70, '#8EC3DA', 2); band(c, 38, 50, '#1E7F86', 4); band(c, 70, 40, '#1F4FA0', 6);
    var mt = S('g', { filter: 'url(#wcs)' }, c); S('path', { d: 'M-6 120 L60 62 L110 100 L170 50 L250 108 L300 80 L386 116 V170 H-6Z', fill: '#4A3F95', opacity: 0.85 }, mt);
    S('path', { d: 'M-6 170 V128 Q100 118 200 130 T386 126 V170Z', fill: '#3E9B4F', opacity: 0.85, filter: 'url(#wcs)' }, c);
    frame(C0, 'โทนเย็น: สงบ สบายตา');
  })();
})();
