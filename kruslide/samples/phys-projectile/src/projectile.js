/* projectile.js · the live physics of the KruSlide projectile sample (vanilla JS, no libraries, no network).
   Launch from ground level, g = 9.8 m/s², no air resistance:
     x = v cos θ · t,  y = v sin θ · t − ½ g t²,  T = 2 v sin θ / g,  R = v² sin 2θ / g,  H = v² sin² θ / 2g.
   The flight runs in real time. "Measured" values come from the flight itself (highest sampled y; landing time found
   where y crosses 0); the formula card computes the same quantities from the formulas, so students see them agree.
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
  var G = 9.8, RAD = Math.PI / 180;
  function fl(v, deg) { var th = deg * RAD, vx = v * Math.cos(th), vy = v * Math.sin(th), T = 2 * vy / G; return { v: v, deg: deg, vx: vx, vy: vy, T: T, R: vx * T, H: vy * vy / (2 * G) }; }
  function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function f2(x) { return (Math.round(x * 100) / 100).toFixed(2); }

  /* ---------------- seven-segment numerals (scoreboard) ---------------- */
  var SEGS = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '' };
  function Seg(parent, x, y, h, n, dec, white) {
    var g = S('g', { 'class': 'seg' + (white ? ' w' : ''), transform: 'translate(' + x + ',' + y + ') skewX(-7)' }, parent);
    var w = h * 0.52, t = h * 0.13, gap = h * 0.24, digits = [];
    for (var i = 0; i < n; i++) {
      var dg = S('g', { transform: 'translate(' + (i * (w + gap)).toFixed(1) + ',0)' }, g), seg = {};
      var R = { a: [t * 0.75, 0, w - 1.5 * t, t], g: [t * 0.75, h / 2 - t / 2, w - 1.5 * t, t], d: [t * 0.75, h - t, w - 1.5 * t, t],
        f: [0, t * 0.75, t, h / 2 - t * 1.25], b: [w - t, t * 0.75, t, h / 2 - t * 1.25], e: [0, h / 2 + t * 0.5, t, h / 2 - t * 1.25], c: [w - t, h / 2 + t * 0.5, t, h / 2 - t * 1.25] };
      for (var k in R) seg[k] = S('rect', { x: R[k][0].toFixed(1), y: R[k][1].toFixed(1), width: R[k][2].toFixed(1), height: R[k][3].toFixed(1), rx: (t * 0.45).toFixed(1), 'class': 'off' }, dg);
      digits.push(seg);
    }
    var dot = dec ? S('rect', { x: ((n - dec) * (w + gap) - gap / 2 - t / 2).toFixed(1), y: (h - t).toFixed(1), width: t.toFixed(1), height: t.toFixed(1), rx: (t * 0.3).toFixed(1), 'class': 'off' }, g) : null;
    return {
      width: n * (w + gap) - gap,
      set: function (v) {
        var s;
        if (v == null) { s = ''; for (var q = 0; q < n; q++) s += '-'; }
        else { s = dec ? Math.abs(v).toFixed(dec).replace('.', '') : String(Math.round(Math.abs(v))); if (v < 0 && Math.abs(v) >= Math.pow(10, -dec) / 2) s = '-' + s; while (s.length < n) s = ' ' + s; if (s.length > n) s = s.slice(-n); }
        digits.forEach(function (sg, i) { var on = SEGS[s[i]] || ''; for (var k in sg) sg[k].setAttribute('class', on.indexOf(k) >= 0 ? 'on' : 'off'); });
        if (dot) dot.setAttribute('class', v == null ? 'off' : 'on');
      }
    };
  }
  /* a scoreboard: two rows of three cells; spec = [[label, digits, decimals, white], ...] (6 cells) */
  function Board(host, spec) {
    var W = host.offsetWidth || 784, svg = S('svg', { viewBox: '0 0 ' + W + ' 222', width: W, height: 222 }, host), cw = W / 3, out = [];
    S('line', { x1: 18, x2: W - 18, y1: 104, y2: 104, stroke: '#2B3035', 'stroke-width': 2 }, svg);
    [1, 2].forEach(function (k) { S('line', { x1: k * cw, x2: k * cw, y1: 16, y2: 206, stroke: '#2B3035', 'stroke-width': 2 }, svg); });
    spec.forEach(function (c, i) {
      var row = i < 3 ? 0 : 1, col = i % 3, h = row ? 62 : 46, y0 = row ? 120 : 14;
      var lab = H('div', 'sb-h', c[0], host); lab.style.cssText = 'position:absolute;left:' + (col * cw) + 'px;top:' + y0 + 'px;width:' + cw + 'px';
      var probe = Seg(svg, 0, 0, h, c[1], c[2], c[3]), wd = probe.width; probe = null; svg.lastChild.remove();
      out.push(Seg(svg, col * cw + (cw - wd) / 2 + 4, y0 + 28, h, c[1], c[2], c[3]));
    });
    return out;
  }

  /* ---------------- the field: white paint on grass, metres -> px ---------------- */
  function Field(svg, o) {
    var F = { o: o, X: function (m) { return o.x0 + m * o.ppm; }, Y: function (m) { return o.gy - m * o.ppm; } };
    var grid = S('g', {}, svg), k;
    for (k = 10; k <= o.mx; k += 10) S('line', { 'class': 'fl-grid', x1: F.X(k), x2: F.X(k), y1: F.Y(0), y2: F.Y(o.my) }, grid);
    for (k = 5; k <= o.my; k += 5) {
      S('line', { 'class': 'fl-grid', x1: F.X(0), x2: F.X(o.mx), y1: F.Y(k), y2: F.Y(k) }, grid);
      S('line', { 'class': 'fl-tick', x1: F.X(0) - 34, x2: F.X(0) - 22, y1: F.Y(k), y2: F.Y(k) }, grid);
      T({ 'class': 'fl-hl', x: F.X(0) - 40, y: F.Y(k) + 6 }, k + ' m', grid);
    }
    S('line', { 'class': 'fl-line', x1: F.X(0) - 28, x2: F.X(0) - 28, y1: F.Y(0), y2: F.Y(o.my) + 4 }, grid);
    S('line', { 'class': 'fl-line', x1: F.X(-2.5), x2: F.X(o.mx + 1.2), y1: F.Y(0), y2: F.Y(0) }, grid);
    for (k = 0; k <= o.mx; k += 5) {
      S('line', { 'class': 'fl-tick', x1: F.X(k), x2: F.X(k), y1: F.Y(0), y2: F.Y(0) + (k % 10 ? 10 : 18) }, grid);
      if (k % 10 === 0) T({ 'class': 'fl-lab', x: F.X(k), y: F.Y(0) + 40, 'text-anchor': 'middle' }, k + ' m', grid);
    }
    F.ghost = S('g', { 'class': 'ghosts' }, svg);
    F.marks = S('g', {}, svg);
    F.path = S('path', { 'class': 'trail', d: '' }, svg);
    F.dots = S('g', { 'class': 'tdots' }, svg);
    F.arr = S('g', { 'class': 'arrows' }, svg);
    S('path', { 'class': 'tee', d: 'M' + (F.X(0) - 16) + ' ' + F.Y(0) + ' L' + (F.X(0) - 6) + ' ' + (F.Y(0) - 10) + ' L' + (F.X(0) + 6) + ' ' + (F.Y(0) - 10) + ' L' + (F.X(0) + 16) + ' ' + F.Y(0) + ' Z' }, svg);
    F.ball = S('g', { 'class': 'ball' }, svg);
    var r = o.br || 15;
    S('circle', { r: r, 'class': 'b-o' }, F.ball);
    F.spin = S('g', {}, F.ball);
    S('path', { 'class': 'b-p', d: 'M0 -5.5 L5.2 -1.7 L3.2 4.5 L-3.2 4.5 L-5.2 -1.7 Z' }, F.spin);
    [0, 72, 144, 216, 288].forEach(function (a) { var x = Math.cos((a - 90) * RAD) * r * 0.92, y = Math.sin((a - 90) * RAD) * r * 0.92; S('path', { 'class': 'b-p', d: 'M' + (x * 0.98) + ' ' + (y * 0.98) + ' l' + (-x * 0.22) + ' ' + (-y * 0.22) }, F.spin).setAttribute('stroke', '#15181B'); });
    F.r = r;
    F.put = function (xm, ym, spin) { F.ball.setAttribute('transform', 'translate(' + F.X(xm).toFixed(1) + ',' + (F.Y(ym) - r).toFixed(1) + ')'); F.spin.setAttribute('transform', 'rotate(' + (spin || 0).toFixed(1) + ')'); };
    F.put(0, 0, 0);
    return F;
  }
  /* an arrow from (x1,y1) to (x2,y2) in px; cls sets colour and dash */
  function arrow(parent, x1, y1, x2, y2, cls, label, lx, ly) {
    var g = S('g', { 'class': 'arr ' + (cls || '') }, parent), d = Math.hypot(x2 - x1, y2 - y1);
    if (d < 4) return g;
    var ux = (x2 - x1) / d, uy = (y2 - y1) / d;
    S('line', { x1: x1, y1: y1, x2: x2 - ux * 14, y2: y2 - uy * 14 }, g);
    S('path', { d: 'M' + x2 + ' ' + y2 + ' L' + (x2 - ux * 22 - uy * 10) + ' ' + (y2 - uy * 22 + ux * 10) + ' L' + (x2 - ux * 22 + uy * 10) + ' ' + (y2 - uy * 22 - ux * 10) + ' Z' }, g);
    if (label) T({ x: lx, y: ly, 'class': 'arr-t' }, label, g);
    return g;
  }

  /* ---------------- a kick: real-time flight with a trail and a dot every 0.1 s ---------------- */
  function Kicker(F, hooks) {
    var raf = 0, live = null;
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; live = null; }
    function ghost() {
      var d = F.path.getAttribute('d'); if (!d) return;
      var g = S('g', { 'class': 'gpath' }, F.ghost); S('path', { d: d, 'class': 'trail' }, g);
      g.appendChild(F.dots.cloneNode(true)); F.path.setAttribute('d', ''); F.dots.textContent = ''; F.marks.textContent = '';
      while (F.ghost.children.length > 2) F.ghost.firstChild.remove();
    }
    function at(f, t) { return [f.vx * t, f.vy * t - 0.5 * G * t * t]; }
    function kick(v, deg, opt) {
      opt = opt || {}; stop(); if (!opt.keep) ghost(); else { F.path.setAttribute('d', ''); F.dots.textContent = ''; }
      var f = fl(v, deg), d = 'M' + F.X(0).toFixed(1) + ' ' + (F.Y(0) - F.r).toFixed(1), nextDot = 0, maxY = 0, lastT = 0, t0 = null;
      live = f;
      function dot(t) { var p = at(f, t); S('circle', { cx: F.X(p[0]).toFixed(1), cy: (F.Y(p[1]) - F.r).toFixed(1), r: 4.5 }, F.dots); }
      function frame(t) {
        var p = at(f, t); if (p[1] > maxY) maxY = p[1];
        while (nextDot <= t + 1e-9) { dot(nextDot); nextDot = Math.round((nextDot + 0.1) * 10) / 10; }
        d += ' L' + F.X(p[0]).toFixed(1) + ' ' + (F.Y(p[1]) - F.r).toFixed(1); F.path.setAttribute('d', d);
        F.put(p[0], Math.max(0, p[1]), p[0] / (2 * Math.PI * F.r / F.o.ppm) * 360);
        if (hooks.frame) hooks.frame(f, t, p[0], Math.max(0, p[1]));
      }
      function land(tl) {
        /* the crossing of y = 0 between the last sample and this one, by linear interpolation of y(t) */
        var p = at(f, tl); frame(tl);
        var meas = { R: p[0], H: maxY, T: tl };
        mark(f, meas); live = null; raf = 0;
        if (hooks.land) hooks.land(f, meas);
      }
      if (still()) {
        var n = 240; for (var i = 1; i <= n; i++) frame(f.T * i / n);
        land(f.T); return f;
      }
      function step(now) {
        if (t0 === null) t0 = now;
        var t = (now - t0) / 1000 * (opt.speed || 1);
        if (t >= f.T) {
          var y1 = at(f, lastT)[1], y2 = at(f, t)[1], tl = lastT + (t - lastT) * y1 / (y1 - y2);
          land(tl); return;
        }
        frame(t); lastT = t; raf = requestAnimationFrame(step);
      }
      raf = requestAnimationFrame(step);
      return f;
    }
    function mark(f, m) {
      F.marks.textContent = '';
      var xl = F.X(m.R), yl = F.Y(0);
      S('path', { 'class': 'flag', d: 'M' + xl + ' ' + yl + ' V' + (yl - 54) + ' l26 9 l-26 9' }, F.marks);
      var xp = F.X(f.vx * f.vy / G), yp = F.Y(m.H) - F.r;
      S('line', { 'class': 'hmark', x1: xp, x2: xp, y1: yp + 10, y2: yl }, F.marks);
      if (!hooks.quietMarks) {
        T({ 'class': 'mk-t', x: xp + 12, y: (yp + yl) / 2 + 8 }, 'H = ' + f1(m.H) + ' m', F.marks);
        T({ 'class': 'mk-t', x: xl + 32, y: yl - 34 }, 'R = ' + f1(m.R) + ' m', F.marks);
      }
    }
    return { kick: kick, stop: stop, ghost: ghost, live: function () { return live; }, clear: function () { stop(); F.ghost.textContent = ''; F.path.setAttribute('d', ''); F.dots.textContent = ''; F.marks.textContent = ''; F.arr.textContent = ''; F.put(0, 0, 0); } };
  }

  /* ---------------- controls: two sliders + buttons, in the sideline strip ---------------- */
  function Controls(host, o) {
    var api = { deg: o.deg, v: o.v };
    function block(lab, min, max, step, val, unit, dec, onv) {
      var b = H('div', 'sl', null, host), hd = H('div', 'sl-h', null, b);
      H('span', 'sl-l', lab, hd); var vv = H('b', 'sl-v num', '', hd);
      var trk = H('div', 'sl-t hit', null, b), inr = H('div', 'sl-in', null, trk), rail = H('div', 'sl-r', null, inr), fill = H('i', '', null, rail), th = H('div', 'sl-th', null, inr);
      trk.setAttribute('role', 'slider'); trk.setAttribute('aria-label', lab + ' ลากได้ทั้งแถบ'); trk.setAttribute('aria-valuemin', min); trk.setAttribute('aria-valuemax', max);
      for (var t = min; t <= max + 1e-9; t += (max - min) / 8) { var tk = H('span', 'sl-k', null, inr); tk.style.left = ((t - min) / (max - min) * 100) + '%'; }
      function show(v) { var p = ((v - min) / (max - min) * 100).toFixed(2) + '%'; th.style.left = p; fill.style.width = p; vv.textContent = v.toFixed(dec) + unit; trk.setAttribute('aria-valuenow', v); }
      slider(trk, inr, min, max, step, function (v) { v = +clamp(v, min, max).toFixed(dec); show(v); onv(v); });
      show(val); return { show: show, trk: trk };
    }
    api.a = block('มุม θ', 10, 80, 1, o.deg, '°', 0, function (v) { api.deg = v; if (o.change) o.change(); });
    api.s = block('ความเร็ว v', 5, 25, 0.1, o.v, ' m/s', 1, function (v) { api.v = v; if (o.change) o.change(); });
    var bx = H('div', 'sl-b', null, host);
    api.go = H('button', 'kb go', '⚽ เตะ!', bx); api.go.type = 'button';
    api.alt = H('button', 'kb ghost', o.alt, bx); api.alt.type = 'button';
    api.set = function (deg, v) { api.deg = deg; api.v = v; api.a.show(deg); api.s.show(v); };
    return api;
  }

  var C = {};

  /* ============ 1 · simulator ============ */
  C['j-sim'] = (function () {
    var F = Field($('#j1-svg'), { x0: 170, gy: 828, ppm: 20, mx: 80, my: 30 });
    var sb = Board($('#j1-sb'), [['มุม θ (องศา)', 2, 0, true], ['ความเร็ว v (m/s)', 3, 1, true], ['เวลา t (s)', 3, 2], ['ระยะไกล R (m)', 3, 1], ['สูงสุด H (m)', 3, 1], ['เวลาลอย T (s)', 3, 2]]);
    var fx = $('#j1-fx'), comps = false, T1 = [];
    var K = Kicker(F, {
      frame: function (f, t, x, y) { sb[2].set(t); if (comps) ballArrows(f, t, x, y); },
      land: function (f, m) { sb[3].set(m.R); sb[4].set(m.H); sb[5].set(m.T); sb[2].set(m.T); formula(f, m); if (comps) launchArrows(f); }
    });
    var ctl = Controls($('#j1-ctrl'), { deg: 45, v: 20, alt: 'ล้างเส้น', change: function () { sb[0].set(ctl.deg); sb[1].set(ctl.v); if (comps && !K.live()) launchArrows(fl(ctl.v, ctl.deg)); } });
    function formula(f, m) {
      var s2 = Math.round(2 * f.deg), ok = Math.abs(m.R - f.R) < 0.05 && Math.abs(m.H - f.H) < 0.05 && Math.abs(m.T - f.T) < 0.005;
      fx.innerHTML =
        '<div class="fx-r"><b>R</b> = <span class="fr"><span>v² sin 2θ</span><span>g</span></span> = <span class="fr"><span>' + f1(f.v) + '² × sin ' + s2 + '°</span><span>9.8</span></span> = <b class="fx-v">' + f1(f.R) + ' m</b></div>' +
        '<div class="fx-r"><b>H</b> = <span class="fr"><span>v² sin² θ</span><span>2g</span></span> = <span class="fr"><span>' + f1(f.v) + '² × sin² ' + f.deg + '°</span><span>2 × 9.8</span></span> = <b class="fx-v">' + f1(f.H) + ' m</b></div>' +
        '<div class="fx-r"><b>T</b> = <span class="fr"><span>2v sin θ</span><span>g</span></span> = <span class="fr"><span>2 × ' + f1(f.v) + ' × sin ' + f.deg + '°</span><span>9.8</span></span> = <b class="fx-v">' + f2(f.T) + ' s</b></div>' +
        '<p class="fx-ok">' + (ok ? '✓ ตรงกับค่าที่วัดได้บนป้าย' : '') + '</p>';
    }
    function blank() { fx.innerHTML = '<p class="fx-hint">เตะแล้วดูว่า <b>ค่าที่วัดได้</b> บนป้าย ตรงกับ<b>สูตร</b>หรือไม่</p>'; [2, 3, 4, 5].forEach(function (k) { sb[k].set(null); }); }
    function launchArrows(f) {
      F.arr.textContent = ''; var x = F.X(0), y = F.Y(0) - F.r, k = 7;
      arrow(F.arr, x, y, x + f.vx * k, y, 'vx', 'vₓ = ' + f1(f.vx), x + f.vx * k + 14, y + 30);
      arrow(F.arr, x, y, x, y - f.vy * k, 'vy', 'vᵧ = ' + f1(f.vy), x - 20, y - f.vy * k - 14).lastChild.setAttribute('text-anchor', 'end');
      arrow(F.arr, x, y, x + f.vx * k, y - f.vy * k, 'v', 'v = ' + f1(f.v) + ' m/s', x + f.vx * k + 14, y - f.vy * k - 6);
    }
    function ballArrows(f, t, xm, ym) {
      F.arr.textContent = ''; var x = F.X(xm), y = F.Y(ym) - F.r, k = 5, vy = f.vy - G * t;
      arrow(F.arr, x, y, x + f.vx * k, y, 'vx');
      arrow(F.arr, x, y, x, y - vy * k, 'vy');
    }
    tap(ctl.go, function () { F.arr.textContent = ''; K.kick(ctl.v, ctl.deg); });
    tap(ctl.alt, function () { K.clear(); blank(); if (comps) launchArrows(fl(ctl.v, ctl.deg)); });
    sb[0].set(45); sb[1].set(20); blank();
    function clearT() { T1.forEach(clearTimeout); T1 = []; }
    return {
      set: function (st, prev) {
        clearT(); comps = st === 1;
        if (st === 0) { F.arr.textContent = ''; if (prev < 0) { K.clear(); blank(); ctl.set(45, 20); sb[0].set(45); sb[1].set(20); } return; }
        if (st === 1) {
          if (prev !== 0) { K.clear(); blank(); }
          ctl.set(45, 20); sb[0].set(45); sb[1].set(20); launchArrows(fl(20, 45));
          if (!still()) T1.push(setTimeout(function () { K.kick(20, 45); }, 1300)); else K.kick(20, 45);
          return;
        }
        /* beat 2: 30° then 60° at 20 m/s land together */
        F.arr.textContent = ''; K.clear(); blank();
        ctl.set(30, 20); sb[0].set(30); sb[1].set(20);
        if (still()) { K.kick(20, 30); K.kick(20, 60); ctl.set(60, 20); sb[0].set(60); return; }
        T1.push(setTimeout(function () { K.kick(20, 30); }, 600));
        T1.push(setTimeout(function () { ctl.set(60, 20); sb[0].set(60); K.kick(20, 60); }, 600 + 2700));
      },
      leave: function () { clearT(); K.stop(); }
    };
  })();

  /* ============ 2 · hit the target ============ */
  C['j-goal'] = (function () {
    var F = Field($('#j2-svg'), { x0: 170, gy: 828, ppm: 20, mx: 80, my: 30 });
    var sb = Board($('#j2-sb'), [['มุม θ (องศา)', 2, 0, true], ['ความเร็ว v (m/s)', 3, 1, true], ['เป้าอยู่ที่ (m)', 3, 1, true], ['ยิง', 2, 0], ['เข้าเป้า', 2, 0], ['ห่างเป้า (m)', 4, 1]]);
    var D = 35, shots = 0, hits = 0, tg = S('g', { 'class': 'target' }, null);
    F.marks.parentNode.insertBefore(tg, F.marks);
    var say = H('div', 'verdict', '', $('#j-goal'));
    function drawTarget() {
      tg.textContent = ''; var a = F.X(D - 1.5), b = F.X(D + 1.5), y = F.Y(0);
      S('rect', { 'class': 'zone', x: a, y: y - 8, width: b - a, height: 8 }, tg);
      [a, b].forEach(function (x) { S('path', { 'class': 'cone', d: 'M' + (x - 13) + ' ' + y + ' L' + (x - 4) + ' ' + (y - 34) + ' L' + (x + 4) + ' ' + (y - 34) + ' L' + (x + 13) + ' ' + y + ' Z' }, tg); S('rect', { 'class': 'cone-s', x: x - 8, y: y - 22, width: 16, height: 6 }, tg); });
      T({ 'class': 'tg-t', x: F.X(D), y: y - 48, 'text-anchor': 'middle' }, 'เป้า ' + f1(D) + ' m', tg);
      sb[2].set(D);
    }
    var K = Kicker(F, {
      quietMarks: true,
      frame: function () {},
      land: function (f, m) {
        shots++; var off = m.R - D, hit = Math.abs(off) <= 1.5; if (hit) hits++;
        sb[3].set(shots); sb[4].set(hits); sb[5].set(off);
        say.textContent = hit ? 'เข้าเป้า!' : off < 0 ? 'ขาดไป ' + f1(-off) + ' m' : 'เกินไป ' + f1(off) + ' m';
        say.className = 'verdict ' + (hit ? 'hit' : 'miss');
        tg.classList.toggle('won', hit);
        if (hit && !still() && tg.animate) tg.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }, { transform: 'none' }], { duration: 420 });
      }
    });
    var ctl = Controls($('#j2-ctrl'), { deg: 45, v: 15, alt: 'เป้าใหม่', change: function () { sb[0].set(ctl.deg); sb[1].set(ctl.v); } });
    tap(ctl.go, function () { tg.classList.remove('won'); K.kick(ctl.v, ctl.deg); });
    tap(ctl.alt, function () { var n; do { n = 25 + Math.round(Math.random() * 70) / 2; } while (Math.abs(n - D) < 4); D = n; K.clear(); tg.classList.remove('won'); say.textContent = ''; drawTarget(); });
    function reset(d) { D = d; shots = 0; hits = 0; K.clear(); sb[3].set(0); sb[4].set(0); sb[5].set(null); say.textContent = ''; say.className = 'verdict'; drawTarget(); }
    reset(35); sb[0].set(45); sb[1].set(15);
    return {
      set: function (st, prev) {
        if (st === 1 && prev !== 1) { reset(40); ctl.set(45, 15); sb[0].set(45); sb[1].set(15); }
        else if (st === 0 && prev < 0) { reset(35); ctl.set(45, 15); sb[0].set(45); sb[1].set(15); }
      },
      leave: function () { K.stop(); },
      kick: function (v, d) { ctl.set(d, v); K.kick(v, d); }
    };
  })();

  /* ============ 3 · range vs angle ============ */
  C['j-angle'] = (function () {
    var svg = $('#j3-svg'), V = 20, deg = 30, Rmax = V * V / G;
    var P = { l: 110, t: 64, w: 760, h: 276, x1: 90, y1: 45 };
    function px(d) { return P.l + d / P.x1 * P.w; } function py(r) { return P.t + P.h - r / P.y1 * P.h; }
    S('rect', { x: 0, y: 0, width: 940, height: 800, fill: 'transparent' }, svg);
    var g = S('g', {}, svg), k;
    T({ 'class': 'p3-h', x: 40, y: 40 }, 'ระยะไกล R เมื่อเตะด้วย v = 20 m/s', g);
    for (k = 0; k <= 40; k += 10) { S('line', { 'class': 'fl-grid', x1: P.l, x2: P.l + P.w, y1: py(k), y2: py(k) }, g); T({ 'class': 'fl-hl', x: P.l - 14, y: py(k) + 7 }, k + ' m', g); }
    for (k = 0; k <= 90; k += 15) { S('line', { 'class': 'fl-tick', x1: px(k), x2: px(k), y1: py(0), y2: py(0) + 12 }, g); T({ 'class': 'fl-lab', x: px(k), y: py(0) + 38, 'text-anchor': 'middle' }, k + '°', g); }
    S('line', { 'class': 'fl-line', x1: P.l, x2: P.l + P.w + 10, y1: py(0), y2: py(0) }, g);
    S('line', { 'class': 'fl-line', x1: P.l, x2: P.l, y1: py(0), y2: P.t - 10 }, g);
    var d = ''; for (k = 0; k <= 90; k += 1) d += (k ? ' L' : 'M') + px(k).toFixed(1) + ' ' + py(Rmax * Math.sin(2 * k * RAD)).toFixed(1);
    S('path', { 'class': 'rcurve draw', d: d, pathLength: 1 }, g).style.setProperty('--d', 400);
    var mk = S('g', {}, svg), lab = H('div', 'p3-lab num', '', document.querySelector('#j-angle'));
    var M = { x0: 110, gy: 770, ppm: 15 };
    function mX(m) { return M.x0 + m * M.ppm; } function mY(m) { return M.gy - m * M.ppm; }
    var mf = S('g', {}, svg);
    S('line', { 'class': 'fl-line', x1: mX(-1), x2: mX(48), y1: mY(0), y2: mY(0) }, mf);
    for (k = 10; k <= 40; k += 10) { S('line', { 'class': 'fl-tick', x1: mX(k), x2: mX(k), y1: mY(0), y2: mY(0) + 12 }, mf); T({ 'class': 'fl-hl', x: mX(k) + 16, y: mY(0) + 32 }, k + ' m', mf); }
    var trA = S('path', { 'class': 'mtrail' }, svg), trB = S('path', { 'class': 'mtrail alt' }, svg), ball = S('circle', { 'class': 'mball', r: 10 }, svg);
    function traj(dg) { var f = fl(V, dg), s = ''; for (var i = 0; i <= 60; i++) { var t = f.T * i / 60, x = f.vx * t, y = f.vy * t - 0.5 * G * t * t; s += (i ? ' L' : 'M') + mX(x).toFixed(1) + ' ' + mY(Math.max(0, y)).toFixed(1); } return s; }
    function setDeg(dg) {
      deg = clamp(Math.round(dg), 5, 85); var f = fl(V, deg), c = 90 - deg;
      mk.textContent = '';
      S('line', { 'class': 'p3-v', x1: px(deg), x2: px(deg), y1: py(0), y2: py(f.R) }, mk);
      S('line', { 'class': 'p3-v alt', x1: px(c), x2: px(c), y1: py(0), y2: py(f.R) }, mk);
      S('line', { 'class': 'p3-hz', x1: px(Math.min(deg, c)), x2: px(Math.max(deg, c)), y1: py(f.R), y2: py(f.R) }, mk);
      S('circle', { 'class': 'p3-dot alt', cx: px(c), cy: py(f.R), r: 10 }, mk);
      S('circle', { 'class': 'p3-dot', cx: px(deg), cy: py(f.R), r: 13 }, mk);
      lab.innerHTML = 'θ = <b>' + deg + '°</b> → R = <b>' + f1(f.R) + ' m</b>' + (deg !== 45 ? ' <span>· มุม ' + c + '° ก็ได้เท่ากัน</span>' : ' <span>· ไกลที่สุด</span>');
      trA.setAttribute('d', traj(deg)); trB.setAttribute('d', deg !== 45 ? traj(c) : '');
      ball.setAttribute('cx', mX(f.R)); ball.setAttribute('cy', mY(0) - 10);
      svg.setAttribute('aria-valuenow', deg);
    }
    drag(svg, function (x, y, ph) { if (ph === 'start' || ph === 'move') setDeg((x - P.l) / P.w * 90); });
    svg.tabIndex = 0;
    svg.addEventListener('keydown', function (e) { if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return; e.preventDefault(); e.stopPropagation(); setDeg(deg + (e.key === 'ArrowUp' ? 1 : -1)); });
    setDeg(30);
    return { set: function (st, prev) { if (prev < 0 && st === 0) setDeg(30); if (st === 1) setDeg(45); }, leave: function () {} };
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
  window.__proj = { C: C, fl: fl };
})();
