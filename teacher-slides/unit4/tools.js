/* Interactive tools for the Unit 4 deck (vanilla JS, no libraries, no network).
   Renders every widget in CONTRACT.md + a global pen. Markup in, working tool out.
   Widgets: .ch[data-mcq] .w-input .w-write .w-sort .w-bars .w-line .w-pie .w-picto .w-dots
   Optional extras: data-start (bars, line, picto, dots), data-snap (bars, line), data-head="Item,Number" (pie).
   Pen: toggled by the 'deck:pen' document event; adds .pen-on to <html>; dispatches 'pen:state' {detail:{on}}.
   URL: ?still = default state, no motion · ?still&answers = Show answer on every widget (for checking).
   Test hooks: every widget root has .__w (state + helpers); window.__tools = {widgets, showAll, resetAll, pen}. */
(function () {
  'use strict';
  var root = document.documentElement, stage = document.getElementById('stage');
  if (!stage) return;
  var NS = 'http://www.w3.org/2000/svg';
  var qs = new URLSearchParams(location.search);
  var ANSWERS = qs.has('answers');
  var INK = '#0F1B33', BLUE = '#3B6CFF', VIOLET = '#7C5CFF', CORAL = '#FF6B5B', MINT = '#1FBF9F', SUN = '#FFC53D';
  var PAL = [BLUE, VIOLET, CORAL, MINT, SUN, '#5B6785'];
  var uid = 0, widgets = [];

  /* ---------- helpers ---------- */
  function still() { return root.classList.contains('rm'); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function sv(tag, at, parent) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; }
  function ico(name, cls) { var s = sv('svg', { 'class': cls || 'tw-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true' }); sv('use', { href: '#' + name }, s); return s; }
  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
  function list(s) { return s == null || String(s).trim() === '' ? [] : String(s).split(',').map(function (x) { return x.trim(); }); }
  function fmt(v) { return String(Math.round(v * 100) / 100); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function near(a, b) { return Math.abs(a - b) < 1e-6; }
  function btn(label, cls, act, fn) {
    var b = el('button', 'tw-btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; if (act) b.dataset.act = act;
    b.addEventListener('click', function (e) { e.stopPropagation(); fn(e); });
    return b;
  }
  function anim(node, frames, opt) { if (still() || !node.animate) return null; try { return node.animate(frames, opt); } catch (e) { return null; } }
  /* runs step(0..1) with ease-out; always ends with step(1), even without animation frames */
  function tween(dur, step, done) {
    var fin = false, t0 = null;
    function end() { if (fin) return; fin = true; step(1); if (done) done(); }
    if (still()) { end(); return { cancel: function () {} }; }
    function f(t) { if (fin) return; if (t0 === null) t0 = t; var p = (t - t0) / dur; if (p >= 1) return end(); step(1 - Math.pow(1 - p, 3)); requestAnimationFrame(f); }
    requestAnimationFrame(f); setTimeout(end, dur + 120);
    return { cancel: function () { fin = true; } };
  }
  /* pointer position inside a node, in the node's own (unscaled) pixels: the stage is scaled by a CSS transform */
  function local(node, e, W, H) {
    var r = node.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (r.width ? W / r.width : 1), y: (e.clientY - r.top) * (r.height ? H / r.height : 1) };
  }
  function toClient(node, x, y, W, H) { var r = node.getBoundingClientRect(); return { x: r.left + x * r.width / W, y: r.top + y * r.height / H }; }
  function scaleOf(node) { var r = node.getBoundingClientRect(); return node.offsetWidth ? r.width / node.offsetWidth : 1; }
  function key(e, keys) { if (keys.indexOf(e.key) < 0) return false; e.preventDefault(); e.stopPropagation(); return true; }

  var liveEl = el('div', 'sr'); liveEl.setAttribute('aria-live', 'polite'); document.body.appendChild(liveEl);
  function announce(t) { liveEl.textContent = ''; setTimeout(function () { liveEl.textContent = t; }, 30); }

  function say(fb, kind, msg) {
    fb.className = 'tw-fb' + (kind ? ' ' + kind : '');
    fb.textContent = '';
    if (kind === 'ok') fb.appendChild(ico('check'));
    if (kind === 'no') fb.appendChild(ico('cross'));
    if (msg) fb.appendChild(el('span', '', msg));
  }
  /* footer: Check / Show answer / Reset + feedback (aria-live). o = {check, show, reset, hint} */
  function foot(w, o) {
    var f = el('div', 'tw-foot'), bs = el('div', 'tw-btns'), fb = el('div', 'tw-fb');
    fb.setAttribute('role', 'status'); fb.setAttribute('aria-live', 'polite');
    var api = { el: f, fb: fb };
    if (o.check) bs.appendChild(api.bCheck = btn('Check', 'pri', 'check', o.check));
    if (o.show) { bs.appendChild(api.bShow = btn('Show answer', 'show', 'show', o.show)); api.bShow.setAttribute('aria-pressed', 'false'); }
    if (o.reset) bs.appendChild(api.bReset = btn('Reset', '', 'reset', o.reset));
    f.appendChild(bs); f.appendChild(fb);
    api.say = function (kind, msg) { say(fb, kind, msg || (kind ? '' : o.hint || '')); };
    api.say('');
    if (w.clientWidth && w.clientWidth < (o.wide || 900)) w.classList.add('w-narrow');
    return api;
  }
  /* "Show answer" is a deliberate toggle: it saves the student's work, shows the answer in a clear state
     (mint frame + "Answer" tab), and "Hide answer" brings the student's work back. */
  function answerCtl(w, ft, o) {
    var saved = null, c = {
      shown: false,
      show: function () {
        if (c.shown) return;
        saved = o.snap(); c.shown = true; w.classList.add('w-shown');
        ft.bShow.textContent = 'Hide answer'; ft.bShow.setAttribute('aria-pressed', 'true');
        o.reveal(); ft.say('ok', 'Answer shown');
      },
      hide: function () { if (!c.shown) return; c.off(); o.restore(saved); ft.say(''); },
      toggle: function () { if (c.shown) c.hide(); else c.show(); },
      off: function () {
        if (!c.shown) return;
        c.shown = false; w.classList.remove('w-shown');
        ft.bShow.textContent = 'Show answer'; ft.bShow.setAttribute('aria-pressed', 'false');
      }
    };
    return c;
  }
  function register(w, api) { w.__w = api; api.el = w; widgets.push(api); return api; }

  /* ================= shape recognition (Auto shapes) ================= */
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function segDist(p, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    var t = l2 ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1) : 0;
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  }
  function pathLen(p) { var L = 0; for (var i = 1; i < p.length; i++) L += dist(p[i - 1], p[i]); return L; }
  function resample(p, n) {
    var L = pathLen(p), out = [{ x: p[0].x, y: p[0].y }];
    if (!L) { while (out.length < n) out.push({ x: p[0].x, y: p[0].y }); return out; }
    var stepL = L / (n - 1), acc = 0, i = 1, a = p[0];
    while (out.length < n - 1 && i < p.length) {
      var b = p[i], d = dist(a, b);
      if (acc + d >= stepL && d > 0) { var t = (stepL - acc) / d; a = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; out.push(a); acc = 0; }
      else { acc += d; a = b; i++; }
    }
    while (out.length < n) out.push({ x: p[p.length - 1].x, y: p[p.length - 1].y });
    return out;
  }
  function rdp(p, eps) {
    if (p.length < 3) return p.slice();
    var keep = [0, p.length - 1], stack = [[0, p.length - 1]];
    while (stack.length) {
      var s = stack.pop(), md = 0, mi = -1;
      for (var i = s[0] + 1; i < s[1]; i++) { var d = segDist(p[i], p[s[0]], p[s[1]]); if (d > md) { md = d; mi = i; } }
      if (md > eps) { keep.push(mi); stack.push([s[0], mi], [mi, s[1]]); }
    }
    return keep.sort(function (a, b) { return a - b; }).map(function (k) { return p[k]; });
  }
  function area2(p) { var a = 0; for (var i = 0; i < p.length; i++) { var q = p[(i + 1) % p.length]; a += p[i].x * q.y - q.x * p[i].y; } return a; }
  /* Returns {t:'line'|'ellipse'|'rect'|'tri', pts:[...polyline], closed} or null. Strict on purpose:
     small strokes (handwriting) and anything not clearly a shape stay freehand. */
  function recog(raw) {
    var n = raw.length; if (n < 2) return null;
    var L = pathLen(raw), a = raw[0], b = raw[n - 1], chord = dist(a, b), i, d;
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (i = 0; i < n; i++) { minX = Math.min(minX, raw[i].x); maxX = Math.max(maxX, raw[i].x); minY = Math.min(minY, raw[i].y); maxY = Math.max(maxY, raw[i].y); }
    var bw = maxX - minX, bh = maxY - minY, dim = Math.max(bw, bh);
    /* straight line */
    if (chord >= 110 && chord / L >= 0.93) {
      var md = 0; for (i = 1; i < n - 1; i++) md = Math.max(md, segDist(raw[i], a, b));
      if (md <= 4 + 0.045 * chord) {
        var q = { x: b.x, y: b.y }, ang = Math.abs(Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI);
        if (ang < 4 || ang > 176) q.y = a.y; else if (Math.abs(ang - 90) < 4) q.x = a.x;   /* nearly level or upright: make it exact */
        return { t: 'line', pts: [{ x: a.x, y: a.y }, q], closed: false };
      }
      return null;
    }
    /* closed loops only from here */
    if (n < 10 || dim < 110 || Math.min(bw, bh) < 56 || chord > Math.max(26, 0.2 * dim)) return null;
    var p = resample(raw, 72);
    /* frame: the rotation with the smallest bounding box */
    var best = null;
    for (var deg = 0; deg < 90; deg += 2) {
      var th = deg * Math.PI / 180, c = Math.cos(th), s = Math.sin(th), x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (i = 0; i < p.length; i++) { var u = p[i].x * c + p[i].y * s, v = -p[i].x * s + p[i].y * c; x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); }
      var ar = (x1 - x0) * (y1 - y0);
      if (!best || ar < best.ar - 1e-6) best = { ar: ar, deg: deg };
    }
    var bdeg = best.deg > 45 ? best.deg - 90 : best.deg;
    function frame(degr) {
      var th = degr * Math.PI / 180, c = Math.cos(th), s = Math.sin(th), x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, q = [];
      for (var k = 0; k < p.length; k++) { var u = p[k].x * c + p[k].y * s, v = -p[k].x * s + p[k].y * c; q.push({ x: u, y: v }); x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); }
      var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, A = (x1 - x0) / 2, B = (y1 - y0) / 2, eE = 0, eR = 0, bins = [];
      for (k = 0; k < q.length; k++) {
        var x = q[k].x - cx, y = q[k].y - cy;
        eE += Math.abs(Math.hypot(x / A, y / B) - 1);
        eR += Math.min(A - Math.abs(x), B - Math.abs(y));
        bins[Math.floor((Math.atan2(y / B, x / A) + Math.PI) / (2 * Math.PI) * 12) % 12] = 1;
      }
      var cover = 0; for (k = 0; k < 12; k++) if (bins[k]) cover++;
      return { c: c, s: s, cx: cx, cy: cy, A: A, B: B, eE: eE / q.length, eR: eR / q.length / Math.min(A, B), cover: cover, q: q, deg: degr };
    }
    function out(f, x, y) { return { x: x * f.c - y * f.s, y: x * f.s + y * f.c }; }   /* frame -> page */
    var f0 = frame(0), fr = Math.abs(bdeg) < 9 ? f0 : frame(bdeg);
    var ccw = area2(p) < 0;
    /* triangle: three real corners */
    var vs = rdp(p, 0.075 * dim); vs.pop();
    var changed = true;
    while (changed && vs.length > 3) {
      changed = false;
      for (i = 0; i < vs.length; i++) {
        var pa = vs[(i + vs.length - 1) % vs.length], pb = vs[i], pc = vs[(i + 1) % vs.length];
        var a1 = Math.atan2(pa.y - pb.y, pa.x - pb.x), a2 = Math.atan2(pc.y - pb.y, pc.x - pb.x);
        var turn = Math.abs(a1 - a2) * 180 / Math.PI; if (turn > 180) turn = 360 - turn;
        if (turn > 150 || dist(pb, pc) < 0.16 * dim) { vs.splice(i, 1); changed = true; break; }
      }
    }
    var eT = 9;
    if (vs.length === 3) {
      eT = 0;
      for (i = 0; i < p.length; i++) eT += Math.min(segDist(p[i], vs[0], vs[1]), segDist(p[i], vs[1], vs[2]), segDist(p[i], vs[2], vs[0]));
      eT = eT / p.length / dim;
    }
    var sE = (f0.cover === 12 ? Math.min(f0.eE, fr.eE) : 9) / 0.085, sR = (fr.cover === 12 ? fr.eR : 9) / 0.085, sT = eT / 0.03;
    var m = Math.min(sE, sR, sT), pts = [], k;
    if (m > 1) return null;
    if (m === sT) {
      pts = vs.map(function (v) { return { x: v.x, y: v.y }; }); pts.push({ x: pts[0].x, y: pts[0].y });
      return { t: 'tri', pts: pts, closed: true };
    }
    if (m === sR) {
      var cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (g) { return out(fr, fr.cx + g[0] * fr.A, fr.cy + g[1] * fr.B); });
      if (area2(cs) < 0 !== ccw) cs.reverse();
      var st = 0, bd = 1e9; for (k = 0; k < 4; k++) { d = dist(cs[k], a); if (d < bd) { bd = d; st = k; } }
      for (k = 0; k <= 4; k++) pts.push(cs[(st + k) % 4]);
      return { t: 'rect', pts: pts, closed: true };
    }
    var fe = f0.eE <= fr.eE * 1.15 || fr.A / fr.B < 1.25 && fr.B / fr.A < 1.25 ? f0 : fr;
    var A = fe.A, B = fe.B;
    if (A / B < 1.18 && B / A < 1.18) A = B = (A + B) / 2;   /* nearly round: a true circle */
    var la = { x: a.x * fe.c + a.y * fe.s - fe.cx, y: -a.x * fe.s + a.y * fe.c - fe.cy }, t0 = Math.atan2(la.y / B, la.x / A), N = 72;
    var dir = area2(fe.q) < 0 ? -1 : 1;
    for (k = 0; k <= N; k++) { var t = t0 + dir * k / N * 2 * Math.PI; pts.push(out(fe, fe.cx + A * Math.cos(t), fe.cy + B * Math.sin(t))); }
    return { t: A === B ? 'circle' : 'ellipse', pts: pts, closed: true };
  }

  /* ================= ink engine (w-write and the global pen) ================= */
  function paint(ctx, s, pts) {
    var p = pts || s.pts, n = p.length, i;
    if (!n) return;
    ctx.globalAlpha = s.alpha; ctx.strokeStyle = ctx.fillStyle = s.color; ctx.lineCap = ctx.lineJoin = 'round';
    if (n === 1) { ctx.beginPath(); ctx.arc(p[0].x, p[0].y, s.size / 2, 0, 7); ctx.fill(); ctx.globalAlpha = 1; return; }
    if (s.poly || pts) {
      ctx.lineWidth = s.size; ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
      for (i = 1; i < n; i++) ctx.lineTo(p[i].x, p[i].y);
      if (s.closed && !pts) ctx.closePath();
      ctx.stroke();
    } else if (!s.pr) {
      ctx.lineWidth = s.size; ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
      for (i = 1; i < n - 1; i++) ctx.quadraticCurveTo(p[i].x, p[i].y, (p[i].x + p[i + 1].x) / 2, (p[i].y + p[i + 1].y) / 2);
      ctx.lineTo(p[n - 1].x, p[n - 1].y); ctx.stroke();
    } else {   /* stylus pressure: width changes along the stroke */
      var ax = p[0].x, ay = p[0].y;
      for (i = 1; i < n; i++) {
        var lastp = i === n - 1, bx = lastp ? p[i].x : (p[i].x + p[i + 1].x) / 2, by = lastp ? p[i].y : (p[i].y + p[i + 1].y) / 2;
        ctx.lineWidth = s.size * (0.45 + 1.1 * (p[i - 1].p + p[i].p) / 2);
        ctx.beginPath(); ctx.moveTo(ax, ay);
        if (lastp) ctx.lineTo(bx, by); else ctx.quadraticCurveTo(p[i].x, p[i].y, bx, by);
        ctx.stroke(); ax = bx; ay = by;
      }
    }
    ctx.globalAlpha = 1;
  }
  function Ink(host, W, H, maxRatio) {
    var base = el('canvas', 'ink-c'), live = el('canvas', 'ink-c');
    base.setAttribute('aria-hidden', 'true'); live.setAttribute('aria-hidden', 'true');
    host.appendChild(base); host.appendChild(live);
    var bc = base.getContext('2d'), lc = live.getContext('2d');
    var self = { st: { strokes: [], hist: [] }, color: INK, size: 4, alpha: 1, mode: 'draw', enabled: true, auto: true, onchange: null, last: null };
    var ratio = 0, cur = null, pid = null, erasing = false, morph = null;
    function changed() { if (self.onchange) self.onchange(); }
    function redraw() {
      bc.setTransform(ratio, 0, 0, ratio, 0, 0); bc.clearRect(0, 0, W, H);
      self.st.strokes.forEach(function (s) { if (!morph || morph.s !== s) paint(bc, s); });
    }
    function clearLive() { lc.setTransform(ratio, 0, 0, ratio, 0, 0); lc.clearRect(0, 0, W, H); }
    function fit() {
      var q = Math.min(maxRatio, Math.max(1, (window.devicePixelRatio || 1) * scaleOf(host)));
      q = Math.ceil(q * 4) / 4;
      if (q === ratio) return;
      ratio = q;
      [base, live].forEach(function (c) { c.width = Math.round(W * q); c.height = Math.round(H * q); });
      redraw(); if (cur) { clearLive(); paint(lc, cur); }
    }
    function pos(e) { var p = local(host, e, W, H); p.p = e.pressure || 0; return p; }
    function add(e) {
      var p = pos(e), l = cur.pts[cur.pts.length - 1];
      if (l && Math.hypot(p.x - l.x, p.y - l.y) < 1.2) return;
      cur.pts.push(p);
    }
    function hit(s, p, R) {
      var q = s.pts, r = R + s.size / 2;
      if (q.length === 1) return dist(q[0], p) <= r;
      for (var i = 1; i < q.length; i++) if (segDist(p, q[i - 1], q[i]) <= r) return true;
      return s.closed && segDist(p, q[q.length - 1], q[0]) <= r;
    }
    function erase(e) {
      var p = pos(e), gone = [], S = self.st.strokes;
      for (var k = S.length - 1; k >= 0; k--) if (hit(S[k], p, 16)) { gone.push({ s: S[k], k: k }); S.splice(k, 1); }
      if (gone.length) { self.st.hist.push({ t: 'del', items: gone }); redraw(); changed(); }
    }
    function endMorph() {
      if (!morph) return;
      var m = morph; morph = null; m.tw.cancel();
      clearLive(); paint(bc, m.s);
    }
    function snapShape(s) {
      var r = recog(s.pts); self.last = r ? r.t : 'free';
      if (!r) return false;
      var rawPts = s.pts, from = resample(rawPts, 48), to = resample(r.closed ? r.pts : r.pts, 48);
      self.st.hist.push({ t: 'snap', s: s, raw: rawPts, pr: s.pr });
      s.pts = r.pts; s.poly = true; s.closed = r.closed; s.pr = false; s.shape = r.t;
      if (still()) return false;
      morph = { s: s };
      morph.tw = tween(150, function (t) {
        clearLive();
        paint(lc, s, from.map(function (a, i) { return { x: a.x + (to[i].x - a.x) * t, y: a.y + (to[i].y - a.y) * t }; }));
      }, function () { if (morph && morph.s === s) { morph = null; clearLive(); paint(bc, s); } });
      return true;
    }
    function finish() {
      if (pid === null) return;
      try { host.releasePointerCapture(pid); } catch (e) {}
      pid = null; erasing = false;
      if (cur) {
        var s = cur; cur = null;
        self.st.strokes.push(s); self.st.hist.push({ t: 'add', s: s });
        var morphing = self.auto && snapShape(s);
        if (!self.auto) self.last = 'free';
        if (!morphing) { clearLive(); paint(bc, s); }
        changed();
      }
    }
    host.addEventListener('pointerdown', function (e) {
      if (!self.enabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (pid !== null) finish();
      endMorph();
      pid = e.pointerId; try { host.setPointerCapture(pid); } catch (er) {}
      if (e.cancelable) e.preventDefault();
      if (self.mode === 'erase') { erasing = true; erase(e); return; }
      cur = { color: self.color, size: self.size, alpha: self.alpha, pr: e.pointerType === 'pen' && e.pressure > 0 && self.alpha === 1, pts: [] };
      add(e); clearLive(); paint(lc, cur);
    });
    host.addEventListener('pointermove', function (e) {
      if (e.pointerId !== pid) return;
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      if (!evs || !evs.length) evs = [e];
      if (erasing) { evs.forEach(erase); return; }
      if (!cur) return;
      evs.forEach(add); clearLive(); paint(lc, cur);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { host.addEventListener(t, function (e) { if (e.pointerId === pid) finish(); }); });
    self.finish = finish;
    self.undo = function () {
      endMorph();
      var h = self.st.hist.pop(), S = self.st.strokes; if (!h) return;
      if (h.t === 'add') { var k = S.indexOf(h.s); if (k >= 0) S.splice(k, 1); }
      else if (h.t === 'snap') { h.s.pts = h.raw; h.s.poly = false; h.s.closed = false; h.s.pr = h.pr; h.s.shape = null; }
      else if (h.t === 'del') for (var i = h.items.length - 1; i >= 0; i--) S.splice(Math.min(h.items[i].k, S.length), 0, h.items[i].s);
      else if (h.t === 'clear') self.st.strokes = h.all;
      redraw(); changed();
    };
    self.clear = function () {
      endMorph();
      if (!self.st.strokes.length) return;
      self.st.hist.push({ t: 'clear', all: self.st.strokes }); self.st.strokes = [];
      redraw(); changed();
    };
    self.swap = function (st) { finish(); endMorph(); self.st = st; redraw(); changed(); };
    self.count = function () { return self.st.strokes.length; };
    self.shapes = function () { return self.st.strokes.map(function (s) { return s.shape || 'free'; }); };
    self.fit = fit;
    var rt = null; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(fit, 120); });
    fit();
    return self;
  }
  var SHAPES_ICON = '<circle cx="8" cy="8.5" r="5.5"/><rect x="10.5" y="11" width="10.5" height="10" rx="1.5"/>';
  function rawIcon(inner) {
    var s = sv('svg', { 'class': 'tw-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    s.innerHTML = inner; return s;
  }

  /* ================= MCQ ================= */
  function mcq(w) {
    var cs = [].slice.call(w.querySelectorAll('.c'));
    w.setAttribute('role', 'group');
    cs.forEach(function (c) {
      c.tabIndex = 0; c.setAttribute('role', 'button');
      function pick() {
        if (c.classList.contains('ok')) { c.classList.remove('wrong'); c.classList.add('picked'); announce('Correct!'); return; }
        c.classList.add('wrong'); announce('Not quite. Try again.');
        anim(c, [{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(0)' }], { duration: 420 });
        clearTimeout(c._t); c._t = setTimeout(function () { c.classList.remove('wrong'); }, 800);
      }
      c.addEventListener('click', pick);
      c.addEventListener('keydown', function (e) { if (key(e, ['Enter', ' '])) pick(); });
    });
    return register(w, {
      type: 'mcq',
      show: function () { cs.forEach(function (c) { if (c.classList.contains('ok')) c.classList.add('picked'); }); },
      reset: function () { cs.forEach(function (c) { c.classList.remove('picked', 'wrong'); }); }
    });
  }

  /* ================= w-input ================= */
  function clean(s) { return String(s).trim().toLowerCase().replace(/\s+/g, ' '); }
  function parseNum(s, unit) {
    var t = clean(s), u = unit ? clean(unit) : '';
    if (u && t.length > u.length && t.slice(-u.length) === u) t = t.slice(0, -u.length);
    t = t.replace(/[\s,]/g, '').replace(/−/g, '-').replace(/^\+/, '').replace(/[%°]$/, '');
    return /^-?(\d+\.?\d*|\.\d+)$/.test(t) ? parseFloat(t) : null;
  }
  function input(w) {
    var d = w.dataset, answer = (d.answer || '').trim(), unit = d.unit || '', tol = num(d.tol, 0), tries = 0;
    var acc = [answer].concat((d.accept || '').split(';')).map(function (s) { return s.trim(); }).filter(Boolean);
    var numeric = parseNum(answer, unit) !== null, id = 'tw-in-' + (++uid);
    w.textContent = '';
    if (d.label) { var lab = el('label', 'tw-lab', d.label); lab.htmlFor = id; w.appendChild(lab); }
    var row = el('div', 'tw-inrow'), inp = el('input', 'tw-in');
    inp.type = 'text'; inp.id = id; inp.autocomplete = 'off'; inp.spellcheck = false; inp.setAttribute('autocapitalize', 'off');
    if (numeric) inp.inputMode = 'decimal';
    if (!d.label) inp.setAttribute('aria-label', 'Your answer');
    inp.style.width = clamp(answer.length * 24 + 84, 170, 420) + 'px';
    row.appendChild(inp);
    if (unit) row.appendChild(el('span', 'tw-unit', unit));
    w.appendChild(row);
    var ft = foot(w, { check: check, show: function () { ac.toggle(); }, reset: reset, wide: 1 });
    row.appendChild(ft.fb); w.appendChild(ft.el);
    if (w.clientWidth && w.clientWidth < 540) { w.classList.add('w-narrow'); ft.el.appendChild(ft.fb); }
    function match(v) {
      var a = clean(v), an = parseNum(v, unit);
      return acc.some(function (x) {
        var b = clean(x);
        if (a === b || a.replace(/[\s,]/g, '') === b.replace(/[\s,]/g, '')) return true;
        var bn = parseNum(x, unit);
        return an !== null && bn !== null && Math.abs(an - bn) <= tol + 1e-9;
      });
    }
    function mark(k) { inp.classList.remove('ok', 'no'); if (k) inp.classList.add(k); }
    function check() {
      ac.off();
      if (!inp.value.trim()) { mark(''); ft.say('info', 'Type your answer first'); return; }
      if (match(inp.value)) { mark('ok'); ft.say('ok', 'Correct!'); return; }
      tries++; mark('no');
      anim(inp, [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 300 });
      ft.say('no', tries >= 2 ? 'Check your working' : 'Not yet. Try again');
      if (tries >= 2) ft.bShow.classList.add('nudge');
    }
    function reset() { ac.off(); inp.value = ''; tries = 0; mark(''); ft.bShow.classList.remove('nudge'); ft.say(''); }
    var ac = answerCtl(w, ft, {
      snap: function () { return { v: inp.value, cls: inp.className }; },
      reveal: function () { inp.value = answer; mark('ok'); },
      restore: function (s) { inp.value = s.v; mark(''); }
    });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); check(); } });
    inp.addEventListener('input', function () { ac.off(); mark(''); if (ft.fb.classList.contains('ok') || ft.fb.classList.contains('info')) ft.say(''); });
    return register(w, { type: 'input', show: ac.show, hide: ac.hide, reset: reset, check: check, input: inp, tries: function () { return tries; } });
  }

  /* ================= w-write ================= */
  function write(w) {
    var d = w.dataset, lines = Math.max(1, Math.round(num(d.lines, 3)));
    w.textContent = '';
    if (!w.style.height && w.clientHeight < 120) w.style.height = (70 + lines * 64) + 'px';
    var head = el('div', 'tw-head'), pad = el('div', 'tw-pad');
    head.appendChild(el('div', 'tw-lab', d.label || 'Write here'));
    var tools = el('div', 'tw-btns'); head.appendChild(tools);
    w.appendChild(head); w.appendChild(pad);
    var W = pad.clientWidth || 500, H = pad.clientHeight || lines * 64;
    pad.style.setProperty('--lh', (H / lines) + 'px');
    pad.setAttribute('role', 'img'); pad.setAttribute('aria-label', (d.label || 'Writing area') + ': write here with a finger, a stylus or the mouse');
    var ink = Ink(pad, W, H, 2);
    ink.size = 4.5;
    var bAuto = btn('', 'icon', 'auto', function () { ink.auto = !ink.auto; bAuto.setAttribute('aria-pressed', ink.auto ? 'true' : 'false'); });
    bAuto.appendChild(rawIcon(SHAPES_ICON)); bAuto.setAttribute('aria-label', 'Auto shapes'); bAuto.title = 'Auto shapes: tidy lines, circles and boxes'; bAuto.setAttribute('aria-pressed', 'true');
    var bUndo = btn('', 'icon', 'undo', function () { ink.undo(); });
    bUndo.appendChild(rawIcon('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>')); bUndo.setAttribute('aria-label', 'Undo'); bUndo.title = 'Undo';
    var bClear = btn('Clear', '', 'clear', function () { ink.clear(); });
    tools.appendChild(bAuto); tools.appendChild(bUndo); tools.appendChild(bClear);
    function sync() { var none = !ink.st.strokes.length; bClear.disabled = none; bUndo.disabled = !ink.st.hist.length; w.classList.toggle('has-ink', !none); }
    ink.onchange = sync; sync();
    return register(w, { type: 'write', ink: ink, pad: pad, W: W, H: H, reset: function () { ink.clear(); },
      at: function (x, y) { return toClient(pad, x, y, W, H); } });
  }

  /* ================= w-sort ================= */
  function sort(w) {
    var bins = (w.dataset.bins || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    var items = [].slice.call(w.children).filter(function (c) { return c.classList && c.classList.contains('item'); });
    var pool = el('div', 'tw-pool'), row = el('div', 'tw-binrow'), sel = null;
    pool.setAttribute('role', 'button'); pool.tabIndex = -1; pool.setAttribute('aria-label', 'Cards to sort');
    w.textContent = '';
    w.appendChild(pool); w.appendChild(row);
    var binEls = bins.map(function (name, b) {
      var bin = el('div', 'tw-bin b' + (b % 4)), slot = el('div', 'tw-slot');
      bin.tabIndex = 0; bin.setAttribute('role', 'button'); bin.setAttribute('aria-label', 'Box: ' + name);
      bin.appendChild(el('div', 'tw-bint', name)); bin.appendChild(slot); bin._slot = slot; bin._b = b;
      row.appendChild(bin); return bin;
    });
    var ft = foot(w, { check: check, show: function () { ac.toggle(); }, reset: reset, hint: 'Drag each card into a box' });
    w.appendChild(ft.el);
    function slotOf(t) { return t._slot || t; }
    function where(it) { var b = it.parentNode && it.parentNode.parentNode; return b && b.classList.contains('tw-bin') ? b._b : -1; }
    function unmark(it) { it.classList.remove('ok', 'no'); var m = it.querySelector('.tw-mark'); if (m) m.remove(); }
    function mark(it, ok) { unmark(it); it.classList.add(ok ? 'ok' : 'no'); var m = el('span', 'tw-mark'); m.appendChild(ico(ok ? 'check' : 'cross')); it.appendChild(m); }
    function select(it) {
      if (sel) { sel.classList.remove('sel'); sel.setAttribute('aria-pressed', 'false'); }
      sel = it === sel ? null : it;
      if (sel) { sel.classList.add('sel'); sel.setAttribute('aria-pressed', 'true'); }
      w.classList.toggle('picking', !!sel);
    }
    function move(it, target, quiet) {
      var a = it.getBoundingClientRect();
      it.style.transform = ''; it.classList.remove('drag');
      unmark(it); slotOf(target).appendChild(it);
      if (pool.children.length < items.length) pool.style.minHeight = '';
      fitBins();
      if (!quiet) {
        var b = it.getBoundingClientRect(), k = scaleOf(it) || 1;
        anim(it, [{ transform: 'translate(' + (a.left - b.left) / k + 'px,' + (a.top - b.top) / k + 'px)' }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
    }
    /* cards must stay inside their box: first tighten the cards, then let the box scroll */
    function fitBins() {
      w.classList.remove('tight');
      binEls.forEach(function (b) { b._slot.classList.remove('scroll'); });
      function over() { return binEls.some(function (b) { return b._slot.scrollHeight > b._slot.clientHeight + 2; }); }
      if (!over()) return;
      w.classList.add('tight');
      binEls.forEach(function (b) { if (b._slot.scrollHeight > b._slot.clientHeight + 2) b._slot.classList.add('scroll'); });
    }
    function place(it, target) { ac.off(); move(it, target); if (sel === it) select(it); ft.say(''); }
    items.forEach(function (it, k) {
      it._k = k; it.tabIndex = 0; it.setAttribute('role', 'button'); it.setAttribute('aria-pressed', 'false');
      pool.appendChild(it);
      var st = null, dragged = false;
      it.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (st) { it.style.transform = ''; it.classList.remove('drag'); }
        st = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
        try { it.setPointerCapture(e.pointerId); } catch (er) {}
      });
      it.addEventListener('pointermove', function (e) {
        if (!st || e.pointerId !== st.id) return;
        var dx = e.clientX - st.x, dy = e.clientY - st.y;
        if (!st.moved && Math.hypot(dx, dy) < 8) return;
        if (!st.moved) { st.moved = true; st.k = scaleOf(w) || 1; it.classList.add('drag'); w.classList.add('dragging'); }
        it.style.transform = 'translate(' + dx / st.k + 'px,' + dy / st.k + 'px) rotate(2deg)';
        var t = under(e); binEls.concat(pool).forEach(function (b) { b.classList.toggle('over', b === t); });
      });
      function up(e) {
        if (!st || e.pointerId !== st.id) return;
        var s = st; st = null;
        try { it.releasePointerCapture(e.pointerId); } catch (er) {}
        binEls.concat(pool).forEach(function (b) { b.classList.remove('over'); });
        w.classList.remove('dragging');
        if (!s.moved) return;
        dragged = true; setTimeout(function () { dragged = false; }, 60);
        var t = e.type === 'pointerup' ? under(e) : null;
        if (t && slotOf(t) !== it.parentNode) place(it, t);
        else { var a = it.style.transform; it.style.transform = ''; it.classList.remove('drag'); anim(it, [{ transform: a }, { transform: 'none' }], { duration: 200 }); }
      }
      it.addEventListener('pointerup', up); it.addEventListener('pointercancel', up);
      it.addEventListener('click', function (e) { e.stopPropagation(); if (dragged) { dragged = false; return; } select(it); });
      it.addEventListener('keydown', function (e) { if (key(e, ['Enter', ' '])) select(it); });
    });
    function under(e) {
      var t = document.elementFromPoint(e.clientX, e.clientY);
      t = t && t.closest ? t.closest('.tw-bin,.tw-pool') : null;
      return t && w.contains(t) ? t : null;
    }
    binEls.concat(pool).forEach(function (b) {
      function drop() { if (sel && slotOf(b) !== sel.parentNode) { var it = sel; place(it, b); announce('Moved'); } else if (sel) select(sel); }
      b.addEventListener('click', drop);
      b.addEventListener('keydown', function (e) { if (e.target === b && key(e, ['Enter', ' '])) drop(); });
    });
    function check() {
      ac.off();
      var placed = items.filter(function (it) { return where(it) >= 0; }), right = 0;
      if (!placed.length) { ft.say('info', 'Put the cards in the boxes first'); return; }
      placed.forEach(function (it) { var ok = where(it) === +it.dataset.bin; if (ok) right++; mark(it, ok); });
      var np = placed.length, left = items.length - np;
      if (right === items.length) ft.say('ok', 'All correct!');
      else if (!left) ft.say('no', right + ' of ' + items.length + ' correct');
      else ft.say(right === np ? 'info' : 'no', np + ' placed, ' + (right === np ? (np === 1 ? 'right' : np === 2 ? 'both right' : 'all right') : right + ' right') + ' \u00B7 ' + left + ' to go');
    }
    function reset() { ac.off(); if (sel) select(sel); items.forEach(function (it) { move(it, pool, true); }); ft.say(''); }
    var ac = answerCtl(w, ft, {
      snap: function () { return binEls.concat(pool).map(function (b) { return [].slice.call(slotOf(b).children); }); },
      reveal: function () { if (sel) select(sel); items.forEach(function (it) { var b = binEls[+it.dataset.bin]; if (b) { move(it, b); mark(it, true); } }); },
      restore: function (s) { binEls.concat(pool).forEach(function (b, k) { s[k].forEach(function (it) { move(it, b, true); }); }); }
    });
    function lock() { if (pool.children.length === items.length) { pool.style.minHeight = ''; pool.style.minHeight = pool.offsetHeight + 'px'; } }
    lock(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { lock(); fitBins(); });
    return register(w, { type: 'sort', show: ac.show, hide: ac.hide, reset: reset, check: check, items: items, bins: binEls, pool: pool,
      state: function () { return items.map(where); } });
  }

  /* ================= chart axes (bars, line) ================= */
  function fitLabels(labels, cw) {
    function width(s, size) { return s.length * size * 0.56; }
    function split(s) {
      var best = null, mid = s.length / 2;
      for (var i = 1; i < s.length - 1; i++) if (s[i] === ' ' && (best === null || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
      return best === null ? [s] : [s.slice(0, best), s.slice(best + 1)];
    }
    var sizes = [24, 20], res = null;
    for (var k = 0; k < sizes.length && !res; k++) {
      var size = sizes[k];
      if (labels.every(function (s) { return width(s, size) <= cw - 8; })) res = { size: size, rows: labels.map(function (s) { return [s]; }) };
      else if (labels.every(function (s) { return split(s).every(function (t) { return width(t, size) <= cw - 8; }); }))
        res = { size: size, rows: labels.map(function (s) { return width(s, size) <= cw - 8 ? [s] : split(s); }) };
    }
    if (!res) res = { size: 20, rows: labels.map(split) };
    res.lines = Math.max.apply(null, res.rows.map(function (r) { return r.length; }));
    return res;
  }
  function drawLabels(svg, fit, cx, y) {
    return fit.rows.map(function (r, i) {
      var t = sv('text', { x: cx(i), y: y + fit.size, 'class': 'lab', 'text-anchor': 'middle', style: 'font-size:' + fit.size + 'px' }, svg);
      if (r.length === 1) t.textContent = r[0];
      else r.forEach(function (s, k) { sv('tspan', { x: cx(i), dy: k ? fit.size * 1.15 : 0 }, t).textContent = s; });
      return t;
    });
  }
  function axes(svg, W, H, o) {
    var n = o.labels.length, ticksN = Math.max(1, Math.round((o.max - o.min) / o.step));
    var tw = Math.max(fmt(o.max).length, fmt(o.min).length) * 13 + 4;
    var mL = (o.ylabel ? 42 : 4) + tw + 16, mR = 14, mT = 64;
    var x0 = mL, x1 = W - mR, cw = (x1 - x0) / n;
    var fit = fitLabels(o.labels, cw);
    var mB = 12 + fit.lines * fit.size * 1.15 + 8;
    var y0 = H - mB, y1 = mT, ph = y0 - y1, k, v, y;
    function Y(val) { return y0 - (val - o.min) / (o.max - o.min) * ph; }
    var every = Math.max(1, Math.ceil(30 / (ph / ticksN)));
    if (o.minor) for (k = 0; k < ticksN; k++) { y = Y(o.min + (k + 0.5) * o.step); sv('line', { x1: x0, y1: y, x2: x1, y2: y, 'class': 'grid tw-minor' }, svg); }
    for (k = 0; k <= ticksN; k++) {
      v = o.min + k * o.step; y = Y(v);
      sv('line', { x1: x0, y1: y, x2: x1, y2: y, 'class': 'grid' }, svg);
      if (k % every === 0) sv('text', { x: x0 - 12, y: y + 8, 'class': 'tick', 'text-anchor': 'end' }, svg).textContent = fmt(v);
    }
    if (o.ylabel) sv('text', { x: 24, y: (y0 + y1) / 2, 'class': 'lab tw-ylab', 'text-anchor': 'middle', transform: 'rotate(-90 24 ' + (y0 + y1) / 2 + ')' }, svg).textContent = o.ylabel;
    function cx(i) { return x0 + cw * (i + 0.5); }
    var labs = drawLabels(svg, fit, cx, y0 + 10);
    return { x0: x0, x1: x1, y0: y0, y1: y1, cw: cw, Y: Y, cx: cx, labs: labs, n: n,
      V: function (py) { return o.min + (y0 - py) / ph * (o.max - o.min); },
      col: function (px) { return px < x0 - 6 || px > x1 + 6 ? -1 : clamp(Math.floor((px - x0) / cw), 0, n - 1); },
      line: function () { sv('line', { x1: x0, y1: y0, x2: x1, y2: y0, 'class': 'axis' }, svg); sv('line', { x1: x0, y1: y1 - 14, x2: x0, y2: y0, 'class': 'axis' }, svg); } };
  }
  function snapOf(step, ans, start, given) {
    var g = num(given, 0); if (g > 0) return g;
    var all = (ans || []).concat(start || []), div = [1, 2, 5, 10, 20, 50, 100];
    for (var k = 0; k < div.length; k++) {
      var s = step / div[k];
      if (all.every(function (v) { return near(Math.round(v / s) * s, v); })) return s;
    }
    return step / 100;
  }
  /* shared set-up for the two graph builders */
  function graph(w, kind) {
    var d = w.dataset, labels = list(d.labels), n = labels.length;
    var min = num(d.min, 0), step = num(d.step, 1) > 0 ? num(d.step, 1) : 1, max = num(d.max, min + step * 5);
    if (max <= min) max = min + step;
    var ans = d.answer ? list(d.answer).map(Number) : null;
    var given = d.start ? list(d.start).map(Number) : null;
    var snap = snapOf(step, ans, given, d.snap);
    var mid = clamp(min + Math.round((max - min) / 2 / step) * step, min, max);   /* never start from zero: a ready graph to adjust */
    var start = labels.map(function (_, i) { return given && isFinite(given[i]) ? clamp(given[i], min, max) : mid; });
    w.textContent = '';
    if (w.clientHeight < 200 && !w.style.height) w.style.height = '520px';
    if (d.title) w.appendChild(el('div', 'tw-ttl', d.title));
    var box = el('div', 'tw-plot'); w.appendChild(box);
    var g = { labels: labels, n: n, min: min, max: max, step: step, ans: ans, snap: snap, start: start, box: box };
    g.mount = function (o) {
      g.ft = foot(w, o); w.appendChild(g.ft.el);
      var W = g.W = box.clientWidth || 800, H = g.H = box.clientHeight || 400;
      g.svg = sv('svg', { 'class': 'chart tw-svg', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', role: 'group', 'aria-label': (d.title || kind) + '. ' + o.hint }, box);
      g.ax = axes(g.svg, W, H, { labels: labels, min: min, max: max, step: step, ylabel: d.ylabel, minor: near(snap * 2, step) });
      return g.ax;
    };
    g.snapV = function (v) { return clamp(Math.round((v - min) / snap) * snap + min, min, max); };
    g.pt = function (e) { return local(box, e, g.W, g.H); };
    g.at = function (i, v) { return toClient(box, g.ax.cx(i), g.ax.Y(v), g.W, g.H); };
    /* pointer: tap or drag anywhere in a column sets that column */
    g.drag = function (set, cols) {
      var act = null;
      g.svg.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        var p = g.pt(e), i = g.ax.col(p.x); if (i < 0) return;
        act = { id: e.pointerId, i: i }; try { g.svg.setPointerCapture(e.pointerId); } catch (er) {}
        if (e.cancelable) e.preventDefault(); w.classList.add('dragging');
        set(i, g.snapV(g.ax.V(p.y)));
      });
      g.svg.addEventListener('pointermove', function (e) { if (act && e.pointerId === act.id) set(act.i, g.snapV(g.ax.V(g.pt(e).y))); });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) {
        g.svg.addEventListener(t, function (e) { if (act && e.pointerId === act.id) { act = null; w.classList.remove('dragging'); } });
      });
    };
    g.keys = function (col, i, get, set, cols) {
      col.addEventListener('keydown', function (e) {
        var v = get(i);
        if (key(e, ['ArrowUp'])) set(i, g.snapV(v + snap));
        else if (key(e, ['ArrowDown'])) set(i, g.snapV(v - snap));
      });
    };
    return g;
  }
  /* value tag above a bar or point; turns mint/coral with a tick/cross after Check */
  function tag(parent) {
    var g = sv('g', { 'class': 'tw-tag' }, parent), r = sv('rect', { rx: 17, height: 34 }, g), t = sv('text', { 'class': 'val', 'text-anchor': 'middle' }, g);
    var u = sv('use', { width: 22, height: 22 }, g);
    return function (x, y, text, state) {
      var tw = text.length * 14.5, wd = state ? tw + 52 : tw + 20;
      r.setAttribute('x', x - wd / 2); r.setAttribute('y', y - 26); r.setAttribute('width', wd);
      t.setAttribute('x', state ? x - 13 : x); t.setAttribute('y', y); t.textContent = text;
      u.setAttribute('x', x + tw / 2 - 9); u.setAttribute('y', y - 20); u.setAttribute('href', state === 'no' ? '#cross' : '#check');
      g.setAttribute('class', 'tw-tag' + (state ? ' ' + state : ''));
    };
  }

  /* ================= w-bars ================= */
  function bars(w) {
    var g = graph(w, 'Bar chart'), n = g.n, vals = g.start.slice(), shown = vals.slice(), state = [], tw = null;
    var ax = g.mount({ check: g.ans && check, show: g.ans && function () { ac.toggle(); }, reset: reset, hint: 'Drag each bar up or down' });
    var bw = Math.min(ax.cw * 0.62, 150), cols = [], parts = [];
    for (var i = 0; i < n; i++) (function (i) {
      var x = ax.cx(i), c = sv('g', { 'class': 'tw-col', tabindex: 0, role: 'slider', 'aria-label': g.labels[i], 'aria-valuemin': g.min, 'aria-valuemax': g.max, 'data-i': i }, g.svg);
      sv('rect', { x: x - bw / 2, y: ax.y1, width: bw, height: ax.y0 - ax.y1, rx: 10, 'class': 'tw-track' }, c);
      var bar = sv('rect', { x: x - bw / 2, width: bw, rx: 8, 'class': 'tw-bar', fill: PAL[i % 5] }, c);
      var knob = sv('g', { 'class': 'tw-knob' }, c);
      sv('circle', { r: 17, fill: '#fff', stroke: PAL[i % 5], 'stroke-width': 5 }, knob);
      sv('path', { d: 'M-5 -3 L0 -8 L5 -3 M-5 3 L0 8 L5 3', fill: 'none', stroke: PAL[i % 5], 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, knob);
      parts.push({ bar: bar, knob: knob, tag: tag(c) }); cols.push(c);
      g.keys(c, i, function (k) { return vals[k]; }, set, cols);
    })(i);
    ax.line();
    function draw(i) {
      var y = ax.Y(shown[i]), p = parts[i], h = Math.max(0, ax.y0 - y);
      p.bar.setAttribute('y', y); p.bar.setAttribute('height', h); p.bar.setAttribute('rx', Math.min(8, h / 2));
      p.knob.setAttribute('transform', 'translate(' + ax.cx(i) + ' ' + y + ')');
      p.tag(ax.cx(i), y - 28, fmt(vals[i]), state[i]);
      cols[i].setAttribute('class', 'tw-col' + (state[i] ? ' ' + state[i] : ''));
      ax.labs[i].classList.toggle('tw-bad', state[i] === 'no');
      cols[i].setAttribute('aria-valuenow', vals[i]);
    }
    function all() { for (var k = 0; k < n; k++) draw(k); }
    function stop() { if (tw) { tw.cancel(); tw = null; shown = vals.slice(); } }
    function set(i, v) {
      stop(); ac.off();
      if (near(v, vals[i]) && !state[i]) return;
      vals[i] = shown[i] = v; state[i] = ''; draw(i);
      if (g.ft.fb.className !== 'tw-fb') g.ft.say('');
    }
    function glide(to, st, done) {
      stop(); var from = shown.slice(); vals = to.slice(); state = st;
      tw = tween(650, function (t) { for (var k = 0; k < n; k++) shown[k] = from[k] + (to[k] - from[k]) * t; all(); }, function () { tw = null; shown = vals.slice(); all(); if (done) done(); });
    }
    function check() {
      stop(); ac.off(); var bad = 0;
      vals.forEach(function (v, k) { var ok = near(v, g.ans[k]); state[k] = ok ? 'ok' : 'no'; if (!ok) bad++; });
      all();
      g.ft.say(bad ? 'no' : 'ok', bad ? (bad === 1 ? '1 bar is not right yet' : bad + ' bars are not right yet') : 'Correct! Well done');
    }
    function reset() { ac.off(); glide(g.start, []); g.ft.say(''); }
    var ac = answerCtl(w, g.ft || {}, {
      snap: function () { return vals.slice(); },
      reveal: function () { glide(g.ans, g.ans.map(function () { return 'ok'; })); },
      restore: function (s) { glide(s, []); }
    });
    g.drag(set, cols);
    all();
    return register(w, { type: 'bars', show: g.ans ? ac.show : null, hide: ac.hide, reset: reset, check: g.ans ? check : null,
      values: function () { return vals.slice(); }, at: g.at, cols: cols, start: g.start });
  }

  /* ================= w-line ================= */
  function line(w) {
    var g = graph(w, 'Line graph'), n = g.n, vals = g.start.slice(), shown = vals.slice(), state = [], tw = null;
    var ax = g.mount({ check: g.ans && check, show: g.ans && function () { ac.toggle(); }, reset: reset, hint: 'Tap or drag each point' });
    var cols = [], parts = [], i;
    for (i = 0; i < n; i++) sv('line', { x1: ax.cx(i), y1: ax.y1, x2: ax.cx(i), y2: ax.y0, 'class': 'tw-guide' }, g.svg);
    ax.line();
    var path = sv('path', { 'class': 'ln tw-path', pathLength: 1 }, g.svg);
    for (i = 0; i < n; i++) (function (i) {
      var c = sv('g', { 'class': 'tw-col', tabindex: 0, role: 'slider', 'aria-label': g.labels[i], 'aria-valuemin': g.min, 'aria-valuemax': g.max, 'data-i': i }, g.svg);
      sv('rect', { x: ax.cx(i) - Math.min(ax.cw, 90) / 2, y: ax.y1 - 8, width: Math.min(ax.cw, 90), height: ax.y0 - ax.y1 + 16, rx: 12, 'class': 'tw-track' }, c);
      var dot = sv('circle', { r: 14, cx: ax.cx(i), 'class': 'tw-pt' }, c);
      parts.push({ dot: dot, tag: tag(c) }); cols.push(c);
      g.keys(c, i, function (k) { return vals[k]; }, set, cols);
    })(i);
    function draw() {
      var d = '';
      for (var k = 0; k < n; k++) {
        var y = ax.Y(shown[k]);
        d += (k ? ' L' : 'M') + ax.cx(k) + ' ' + y;
        parts[k].dot.setAttribute('cy', y);
        parts[k].tag(ax.cx(k), y - 30, fmt(vals[k]), state[k]);
        cols[k].setAttribute('class', 'tw-col' + (state[k] ? ' ' + state[k] : ''));
        cols[k].setAttribute('aria-valuenow', vals[k]);
        ax.labs[k].classList.toggle('tw-bad', state[k] === 'no');
      }
      path.setAttribute('d', d);
    }
    function stop() { if (tw) { tw.cancel(); tw = null; shown = vals.slice(); } }
    function set(i, v) {
      stop(); ac.off();
      if (near(v, vals[i]) && !state[i]) return;
      vals[i] = shown[i] = v; state[i] = ''; draw();
      if (g.ft.fb.className !== 'tw-fb') g.ft.say('');
    }
    function glide(to, st, drawLine) {
      stop(); var from = shown.slice(); vals = to.slice(); state = st;
      tw = tween(600, function (t) { for (var k = 0; k < n; k++) shown[k] = from[k] + (to[k] - from[k]) * t; draw(); }, function () { tw = null; shown = vals.slice(); draw(); });
      if (drawLine) anim(path, [{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], { duration: 900, easing: 'ease' });
    }
    function check() {
      stop(); ac.off(); var bad = 0;
      vals.forEach(function (v, k) { var ok = near(v, g.ans[k]); state[k] = ok ? 'ok' : 'no'; if (!ok) bad++; });
      draw();
      g.ft.say(bad ? 'no' : 'ok', bad ? (bad === 1 ? '1 point is not right yet' : bad + ' points are not right yet') : 'Correct! Well done');
    }
    function reset() { ac.off(); glide(g.start, []); g.ft.say(''); }
    var ac = answerCtl(w, g.ft || {}, {
      snap: function () { return vals.slice(); },
      reveal: function () { glide(g.ans, g.ans.map(function () { return 'ok'; }), true); },
      restore: function (s) { glide(s, []); }
    });
    g.drag(set, cols);
    draw();
    return register(w, { type: 'line', show: g.ans ? ac.show : null, hide: ac.hide, reset: reset, check: g.ans ? check : null,
      values: function () { return vals.slice(); }, at: g.at, cols: cols, start: g.start });
  }

  /* ================= w-pie ================= */
  function pie(w) {
    var d = w.dataset, labels = list(d.labels), vals = list(d.values).map(Number), n = labels.length;
    var total = vals.reduce(function (a, b) { return a + b; }, 0) || 1;
    var pct = d.mode === 'percent', full = pct ? 100 : 360, tol = pct ? 0.5 : 1, suf = pct ? '%' : '°';
    var ans = vals.map(function (v) { return v / total * full; }), head = list(d.head);
    w.textContent = '';
    if (w.clientHeight < 200 && !w.style.height) w.style.height = '560px';
    if (d.title) w.appendChild(el('div', 'tw-ttl', d.title));
    var body = el('div', 'tw-piebody'), tb = el('table', 'tw-tbl'), box = el('div', 'tw-plot');
    var hr = el('tr'); [head[0] || 'Item', head[1] || 'Number', pct ? 'Percent' : 'Angle'].forEach(function (t, k) { var th = el('th', k ? 'n' : '', t); th.scope = 'col'; hr.appendChild(th); });
    var th0 = el('thead'); th0.appendChild(hr); tb.appendChild(th0);
    var tbody = el('tbody'); tb.appendChild(tbody);
    var inputs = labels.map(function (name, i) {
      var tr = el('tr'), td = el('td', 'tw-pn'), sw = el('i', 'tw-sw'); sw.style.background = PAL[i % PAL.length];
      td.appendChild(sw); td.appendChild(el('span', '', name)); tr.appendChild(td);
      tr.appendChild(el('td', 'n', fmt(vals[i])));
      var cell = el('td', 'n tw-incell'), inp = el('input', 'tw-in');
      inp.type = 'text'; inp.inputMode = 'decimal'; inp.autocomplete = 'off'; inp.setAttribute('aria-label', (pct ? 'Percent for ' : 'Angle for ') + name);
      cell.appendChild(inp); cell.appendChild(el('span', 'tw-unit', suf)); tr.appendChild(cell); tbody.appendChild(tr);
      inp.addEventListener('input', function () { ac.off(); inp.classList.remove('ok', 'no'); draw(); if (ft.fb.className !== 'tw-fb') ft.say(''); });
      inp.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault(); e.stopPropagation();
        if (i < n - 1) inputs[i + 1].focus(); else check();
      });
      return inp;
    });
    var tf = el('tfoot'), fr = el('tr'); fr.appendChild(el('td', '', 'Total')); fr.appendChild(el('td', 'n', fmt(total)));
    var sumCell = el('td', 'n tw-sum'); fr.appendChild(sumCell); tf.appendChild(fr); tb.appendChild(tf);
    body.appendChild(tb); body.appendChild(box); w.appendChild(body);
    var ft = foot(w, { check: check, show: function () { ac.toggle(); }, reset: reset, hint: pct ? 'Type the percent for each slice' : 'Type the angle for each slice' });
    w.appendChild(ft.el);
    var S = 300, R, C, svg = sv('svg', { 'class': 'chart tw-svg tw-piesvg', role: 'img' }, box);
    function layout() {
      var bh = body.clientHeight || 420, bwid = body.clientWidth || 900;
      tb.style.setProperty('--rp', clamp((bh - 124 - n * 60) / (2 * n), 1, 12) + 'px');
      S = Math.round(clamp(Math.min(bh, bwid - tb.offsetWidth - 56), 160, 640)); R = S / 2 - 6; C = S / 2;
      svg.setAttribute('viewBox', '0 0 ' + S + ' ' + S); svg.setAttribute('width', S); svg.setAttribute('height', S);
      box.style.width = svg.style.width = S + 'px'; box.style.height = svg.style.height = S + 'px';
    }
    function typed() { return inputs.map(function (inp) { var v = parseNum(inp.value); return v !== null && v > 0 ? v : 0; }); }
    function pt(deg, r) { var a = (deg - 90) * Math.PI / 180; return [C + r * Math.cos(a), C + r * Math.sin(a)]; }
    function draw() {
      var v = typed(), sum = v.reduce(function (a, b) { return a + b; }, 0), a0 = 0, placed = [], desc = [];
      svg.textContent = '';
      sv('circle', { cx: C, cy: C, r: R, 'class': 'tw-empty' }, svg);
      for (var k = 0; k < 12; k++) { var p1 = pt(k * 30, R), p2 = pt(k * 30, R - (k % 3 ? 10 : 18)); sv('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], 'class': 'tw-ptick' }, svg); }
      var gs = sv('g', {}, svg), gt = sv('g', {}, svg);
      v.forEach(function (val, i) {
        if (!val || a0 >= 360) return;
        var deg = Math.min(val / full * 360, 360 - a0), a1 = a0 + deg, col = PAL[i % PAL.length];
        if (deg >= 359.99) sv('circle', { cx: C, cy: C, r: R, fill: col, 'class': 'tw-slice' }, gs);
        else { var s = pt(a0, R), e = pt(a1, R); sv('path', { d: 'M' + C + ' ' + C + ' L' + s[0] + ' ' + s[1] + ' A' + R + ' ' + R + ' 0 ' + (deg > 180 ? 1 : 0) + ' 1 ' + e[0] + ' ' + e[1] + ' Z', fill: col, 'class': 'tw-slice' }, gs); }
        desc.push(labels[i] + ' ' + fmt(val) + suf);
        /* label inside the slice only when it fits */
        var rl = deg > 200 ? R * 0.42 : R * 0.64, chord = deg >= 180 ? 2 * rl : 2 * rl * Math.sin(deg * Math.PI / 360), m = pt(a0 + deg / 2, rl);
        var vt = fmt(val) + suf, nameW = labels[i].length * 12.6, valW = vt.length * 13;
        var both = deg >= 26 && Math.max(nameW, valW) + 10 <= chord, only = !both && deg >= 16 && valW + 8 <= chord;
        if (both || only) {
          var bx = { x: m[0], y: m[1], w: (both ? Math.max(nameW, valW) : valW) + 6, h: both ? 54 : 28 };
          if (!placed.some(function (o) { return Math.abs(o.x - bx.x) < (o.w + bx.w) / 2 && Math.abs(o.y - bx.y) < (o.h + bx.h) / 2; })) {
            placed.push(bx);
            var t = sv('text', { x: m[0], y: m[1] + (both ? -4 : 8), 'text-anchor': 'middle', 'class': 'tw-slab' + (col === SUN ? ' dark' : '') }, gt);
            if (both) { sv('tspan', { x: m[0] }, t).textContent = labels[i]; sv('tspan', { x: m[0], dy: 26, 'class': 'tw-sval' }, t).textContent = vt; }
            else t.textContent = vt;
          }
        }
        a0 = a1;
      });
      svg.setAttribute('aria-label', 'Pie chart. ' + (desc.length ? desc.join(', ') : 'Empty'));
      sumCell.textContent = '';
      sumCell.appendChild(el('b', '', fmt(sum) + suf)); sumCell.appendChild(document.createTextNode(' of ' + full + suf));
      sumCell.className = 'n tw-sum' + (Math.abs(sum - full) <= tol ? ' ok' : sum > full + tol ? ' no' : '');
    }
    function check() {
      ac.off(); var right = 0;
      inputs.forEach(function (inp, i) { var v = parseNum(inp.value), ok = v !== null && Math.abs(v - ans[i]) <= tol + 1e-9; inp.classList.remove('ok', 'no'); inp.classList.add(ok ? 'ok' : 'no'); if (ok) right++; });
      if (right === n) ft.say('ok', 'Correct! Total ' + full + suf); else ft.say('no', right + ' of ' + n + ' correct');
    }
    function reset() { ac.off(); inputs.forEach(function (inp) { inp.value = ''; inp.classList.remove('ok', 'no'); }); draw(); ft.say(''); }
    var ac = answerCtl(w, ft, {
      snap: function () { return inputs.map(function (inp) { return inp.value; }); },
      reveal: function () { inputs.forEach(function (inp, i) { inp.value = String(Math.round(ans[i] * 10) / 10); inp.classList.remove('no'); inp.classList.add('ok'); }); draw(); },
      restore: function (s) { inputs.forEach(function (inp, i) { inp.value = s[i]; inp.classList.remove('ok', 'no'); }); draw(); }
    });
    layout(); draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); draw(); });
    return register(w, { type: 'pie', show: ac.show, hide: ac.hide, reset: reset, check: check, inputs: inputs, answer: ans });
  }

  /* ================= w-picto ================= */
  function picto(w) {
    var d = w.dataset, labels = list(d.labels), n = labels.length, ans = d.answer ? list(d.answer).map(Number) : null;
    var given = d.start ? list(d.start).map(Number) : null;
    var icon = (d.icon || '').trim().toLowerCase(), sym = icon && document.getElementById(icon);
    if (sym && sym.tagName.toLowerCase() !== 'symbol') sym = null;
    var vb = sym ? sym.getAttribute('viewBox') : '0 0 24 24', vbp = vb.split(/[\s,]+/).map(Number), ratio = vbp[2] / vbp[3];
    var tint = { person: BLUE, book: VIOLET, phone: INK, clipboard: BLUE }[icon] || (sym ? BLUE : CORAL);
    var cap = 12, vals, start, state = [];
    w.textContent = '';
    if (w.clientHeight < 200 && !w.style.height) w.style.height = '520px';
    var head = el('div', 'tw-head');
    head.appendChild(el('div', 'tw-ttl', d.title || ''));
    var keyEl = el('div', 'tw-key'); keyEl.appendChild(mk(false));
    keyEl.appendChild(el('span', '', '= ' + (d.key || '1') + (d.unit ? ' ' + d.unit : '')));
    head.appendChild(keyEl); w.appendChild(head);
    var grid = el('div', 'tw-prows'); w.appendChild(grid);
    function mk(half) {
      var s = el('span', 'tw-ic' + (half ? ' half' : '')), g = sv('svg', { viewBox: vb, 'aria-hidden': 'true' }, s);
      if (sym) sv('use', { href: '#' + icon }, g); else sv('circle', { cx: 12, cy: 12, r: 10.5, fill: 'currentColor' }, g);
      s.style.color = tint; return s;
    }
    var rows = labels.map(function (name, i) {
      var lab = el('div', 'tw-pl', name), area = el('div', 'tw-pa'), ctl = el('div', 'tw-pc'), mark = el('span', 'tw-mark');
      area.setAttribute('role', 'img');
      var minus = btn('−', 'round', 'minus', function () { set(i, vals[i] - (vals[i] % 1 ? 0.5 : 1)); });
      var half = btn('½', 'round', 'half', function () { set(i, vals[i] + 0.5); });
      var plus = btn('+', 'round', 'plus', function () { set(i, vals[i] + 1); });
      minus.setAttribute('aria-label', 'Remove one from ' + name); half.setAttribute('aria-label', 'Add half an icon to ' + name); plus.setAttribute('aria-label', 'Add one icon to ' + name);
      ctl.appendChild(minus); ctl.appendChild(half); ctl.appendChild(plus); ctl.appendChild(mark);
      grid.appendChild(lab); grid.appendChild(area); grid.appendChild(ctl);
      return { area: area, minus: minus, half: half, plus: plus, mark: mark, name: name };
    });
    var ft = foot(w, { check: ans && check, show: ans && function () { ac.toggle(); }, reset: reset, hint: 'Use + and ½ to build each row' });
    w.appendChild(ft.el);
    function measure() {
      var rowH = (grid.clientHeight || 80 * n) / n, ih = clamp(rowH - 18, 30, 100), iw = ih * ratio, gap = 10;
      var aw = (rows[0] ? rows[0].area.clientWidth : 400) - 6;
      var need = Math.max.apply(null, [3].concat(ans || [], given || []).map(Math.ceil)) + 1;
      if ((iw + gap) * need > aw) { iw = Math.max(18, aw / need - gap); ih = iw / ratio; }
      w.style.setProperty('--ir', ratio); w.style.setProperty('--ih', ih + 'px'); w.style.setProperty('--iw', iw + 'px'); w.style.setProperty('--bh', clamp(rowH - 10, 40, 54) + 'px');
      cap = Math.max(need, Math.floor((aw + gap) / (iw + gap)));
    }
    function draw(i, pop) {
      var r = rows[i], v = vals[i], a = r.area, k;
      a.textContent = '';
      for (k = 0; k < Math.floor(v); k++) a.appendChild(mk(false));
      if (v % 1) a.appendChild(mk(true));
      if (pop && a.lastChild) anim(a.lastChild, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' });
      a.setAttribute('aria-label', r.name + ': ' + fmt(v) + (v === 1 ? ' icon' : ' icons'));
      a.dataset.v = v;
      r.minus.disabled = v <= 0; r.plus.disabled = v + 1 > cap; r.half.disabled = v + 0.5 > cap;
      r.mark.textContent = ''; r.mark.className = 'tw-mark' + (state[i] ? ' ' + state[i] : '');
      if (state[i]) r.mark.appendChild(ico(state[i] === 'ok' ? 'check' : 'cross'));
    }
    function all() { for (var k = 0; k < n; k++) draw(k); }
    function set(i, v) {
      ac.off(); v = clamp(Math.round(v * 2) / 2, 0, cap);
      var more = v > vals[i]; vals[i] = v; state[i] = ''; draw(i, more);
      if (ft.fb.className !== 'tw-fb') ft.say('');
    }
    function check() {
      ac.off(); var bad = 0;
      vals.forEach(function (v, k) { var ok = near(v, ans[k]); state[k] = ok ? 'ok' : 'no'; if (!ok) bad++; });
      all();
      ft.say(bad ? 'no' : 'ok', bad ? (bad === 1 ? '1 row is not right yet' : bad + ' rows are not right yet') : 'Correct! Well done');
    }
    function reset() { ac.off(); vals = start.slice(); state = []; all(); ft.say(''); }
    var ac = answerCtl(w, ft, {
      snap: function () { return vals.slice(); },
      reveal: function () { vals = ans.slice(); state = ans.map(function () { return 'ok'; }); all(); },
      restore: function (s) { vals = s.slice(); state = []; all(); }
    });
    measure();
    /* a ready pictogram to adjust: data-start, or 2 icons in every row */
    start = labels.map(function (_, i) { return given && isFinite(given[i]) ? clamp(Math.round(given[i] * 2) / 2, 0, cap) : Math.min(2, cap); });
    vals = start.slice(); all();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); all(); });
    return register(w, { type: 'picto', show: ans ? ac.show : null, hide: ac.hide, reset: reset, check: ans ? check : null, rows: rows,
      values: function () { return vals.slice(); }, start: start });
  }

  /* ================= w-dots ================= */
  function dots(w) {
    var d = w.dataset, labels = list(d.labels), n = labels.length, ans = d.answer ? list(d.answer).map(Number) : null;
    var given = d.start ? list(d.start).map(Number) : null;
    var start = labels.map(function (_, i) { return given && given[i] > 0 ? Math.round(given[i]) : 0; });
    var vals = start.slice(), state = [];
    w.textContent = '';
    if (w.clientHeight < 200 && !w.style.height) w.style.height = '480px';
    if (d.title) w.appendChild(el('div', 'tw-ttl', d.title));
    var box = el('div', 'tw-plot'); w.appendChild(box);
    var hint = 'Tap above a label to add a dot';
    var ft = foot(w, { check: ans && check, show: ans && function () { ac.toggle(); }, reset: reset, hint: hint });
    w.appendChild(ft.el);
    var W = box.clientWidth || 800, H = box.clientHeight || 360;
    var svg = sv('svg', { 'class': 'chart tw-svg', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', role: 'group', 'aria-label': (d.title || 'Dot plot') + '. ' + hint }, box);
    var x0 = 16, x1 = W - 16, cw = (x1 - x0) / n, fit = fitLabels(labels, cw);
    var y0 = H - (12 + fit.lines * fit.size * 1.15 + 8), y1 = 40, capN = Math.floor((y0 - y1) / 13);
    function cx(i) { return x0 + cw * (i + 0.5); }
    var cols = [], layers = [];
    for (var i = 0; i < n; i++) (function (i) {
      var c = sv('g', { 'class': 'tw-col', tabindex: 0, role: 'spinbutton', 'aria-label': labels[i], 'aria-valuemin': 0, 'data-i': i }, svg);
      sv('rect', { x: cx(i) - Math.min(cw - 6, 110) / 2, y: y1 - 30, width: Math.min(cw - 6, 110), height: y0 - y1 + 26, rx: 14, 'class': 'tw-track' }, c);
      layers.push(sv('g', {}, c)); cols.push(c);
      c.addEventListener('keydown', function (e) {
        if (key(e, ['ArrowUp', '+', '=', 'Enter', ' '])) set(i, vals[i] + 1);
        else if (key(e, ['ArrowDown', '-', 'Delete'])) set(i, vals[i] - 1);
      });
    })(i);
    sv('line', { x1: x0 - 6, y1: y0, x2: x1 + 6, y2: y0, 'class': 'axis' }, svg);
    for (i = 0; i < n; i++) sv('line', { x1: cx(i), y1: y0, x2: cx(i), y2: y0 + 8, 'class': 'axis' }, svg);
    var labs = drawLabels(svg, fit, cx, y0 + 10), dia = 40;
    function draw() {
      var most = Math.max.apply(null, vals.concat(ans || [], [0]));
      dia = Math.min(cw * 0.62, 52, (y0 - y1) / Math.max(6, most + 1));
      for (var k = 0; k < n; k++) {
        var g = layers[k], v = vals[k], r = dia / 2 - Math.max(1.5, dia * 0.06);
        g.textContent = '';
        for (var j = 0; j < v; j++) sv('circle', { cx: cx(k), cy: y0 - dia * (j + 0.5), r: r, 'class': 'tw-dot' }, g);
        if (v < capN) {
          var gy = y0 - dia * (v + 0.5), a = Math.min(7, r * 0.45);
          sv('circle', { cx: cx(k), cy: gy, r: r, 'class': 'tw-ghost' }, g);
          sv('path', { d: 'M' + (cx(k) - a) + ' ' + gy + 'h' + 2 * a + 'M' + cx(k) + ' ' + (gy - a) + 'v' + 2 * a, 'class': 'tw-ghostp' }, g);
        }
        cols[k].setAttribute('class', 'tw-col' + (state[k] ? ' ' + state[k] : ''));
        cols[k].setAttribute('aria-valuenow', v);
        labs[k].classList.toggle('tw-bad', state[k] === 'no'); labs[k].classList.toggle('tw-good', state[k] === 'ok');
      }
      if (!ans) { var t = vals.reduce(function (a, b) { return a + b; }, 0); ft.say(t ? 'info' : '', t ? 'Total: ' + t : ''); }
    }
    function set(i, v) {
      ac.off(); v = clamp(v, 0, capN); if (v === vals[i]) return;
      vals[i] = v; state = []; draw();
      if (ans && ft.fb.className !== 'tw-fb') ft.say('');
    }
    svg.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var p = local(box, e, W, H); if (p.x < x0 || p.x > x1) return;
      var k = clamp(Math.floor((p.x - x0) / cw), 0, n - 1);
      if (e.cancelable) e.preventDefault();
      if (vals[k] > 0 && p.y >= y0 - vals[k] * dia && p.y <= y0) set(k, vals[k] - 1); else set(k, vals[k] + 1);
    });
    function check() {
      ac.off(); var bad = 0;
      vals.forEach(function (v, k) { var ok = v === ans[k]; state[k] = ok ? 'ok' : 'no'; if (!ok) bad++; });
      draw();
      ft.say(bad ? 'no' : 'ok', bad ? (bad === 1 ? '1 stack is not right yet' : bad + ' stacks are not right yet') : 'Correct! Well done');
    }
    function reset() { ac.off(); vals = start.slice(); state = []; draw(); if (ans) ft.say(''); }
    var ac = answerCtl(w, ft, {
      snap: function () { return vals.slice(); },
      reveal: function () { vals = ans.slice(); state = ans.map(function () { return 'ok'; }); draw(); },
      restore: function (s) { vals = s.slice(); state = []; draw(); }
    });
    draw();
    return register(w, { type: 'dots', show: ans ? ac.show : null, hide: ac.hide, reset: reset, check: ans ? check : null, cols: cols,
      values: function () { return vals.slice(); },
      at: function (k, j) { return toClient(box, cx(k), y0 - dia * (j + 0.5), W, H); } });
  }

  /* ================= global pen ================= */
  function pen() {
    var layer = el('div'); layer.id = 'pen-layer'; stage.appendChild(layer);
    var ink = Ink(layer, 1920, 1080, 1.5); ink.enabled = false;
    var bar = el('div'); bar.id = 'pen-bar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Pen tools'); bar.setAttribute('aria-orientation', 'vertical');
    stage.appendChild(bar);
    var store = {}, cur = window.__deck ? window.__deck.state().i : 0, on = false, size = 'thin', tool = 'pen';
    ink.st = store[cur] = { strokes: [], hist: [] };
    var groups = { color: [], size: [], tool: [] };
    function tb(label, inner, group, val, fn) {
      var b = el('button', 'pb'); b.type = 'button'; b.setAttribute('aria-label', label); b.title = label; b.dataset.pen = val;
      if (typeof inner === 'string') b.appendChild(rawIcon(inner)); else b.appendChild(inner);
      if (group) { groups[group].push(b); b.setAttribute('aria-pressed', 'false'); }
      b.addEventListener('click', function (e) { e.stopPropagation(); fn(); sync(); });
      bar.appendChild(b); return b;
    }
    function sep() { bar.appendChild(el('i', 'ps')); }
    var colors = [['Ink', INK], ['Blue', BLUE], ['Coral', CORAL], ['Mint', MINT], ['Yellow', SUN]];
    var penColor = INK, hiColor = SUN;   /* the highlighter has its own colour: sun yellow by default */
    colors.forEach(function (c) {
      var sw = el('i', 'pc'); sw.style.background = c[1];
      tb(c[0], sw, 'color', c[1], function () { if (tool === 'erase') tool = 'pen'; if (tool === 'hi') hiColor = c[1]; else penColor = c[1]; });
    });
    sep();
    tb('Thin', '<path d="M4 16 Q9 6 13 12 T20 9" stroke-width="2"/>', 'size', 'thin', function () { size = 'thin'; });
    tb('Thick', '<path d="M4 16 Q9 6 13 12 T20 9" stroke-width="5"/>', 'size', 'thick', function () { size = 'thick'; });
    sep();
    var u = sv('svg', { 'class': 'tw-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true' }); sv('use', { href: '#pencil' }, u);
    tb('Pen', u, 'tool', 'pen', function () { tool = 'pen'; });
    tb('Highlighter', '<path d="M14 4l6 6-8 8H6v-6z"/><path d="M4 21h9" stroke-width="3"/>', 'tool', 'hi', function () { tool = 'hi'; });
    tb('Eraser', '<path d="M8 20l-4.5-4.5a1.5 1.5 0 0 1 0-2.1L13 4l7 7-9 9z"/><path d="M8 20h12M9 8l7 7"/>', 'tool', 'erase', function () { tool = 'erase'; });
    var bAuto = tb('Auto shapes', SHAPES_ICON, null, 'auto', function () { ink.auto = !ink.auto; });
    sep();
    var bUndo = tb('Undo', '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>', null, 'undo', function () { ink.undo(); });
    var bClear = tb('Clear this slide', '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/>', null, 'clear', function () { ink.clear(); });
    sep();
    var x = sv('svg', { 'class': 'tw-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true' }); sv('use', { href: '#cross' }, x);
    tb('Close pen', x, null, 'close', function () { set(false); });
    function sync() {
      ink.mode = tool === 'erase' ? 'erase' : 'draw';
      ink.color = tool === 'hi' ? hiColor : penColor;
      ink.alpha = tool === 'hi' ? (hiColor === SUN ? 0.5 : 0.32) : 1;
      ink.size = tool === 'hi' ? (size === 'thin' ? 22 : 36) : (size === 'thin' ? 5 : 11);
      groups.color.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.pen === ink.color && tool !== 'erase' ? 'true' : 'false'); });
      groups.size.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.pen === size ? 'true' : 'false'); });
      groups.tool.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.pen === tool ? 'true' : 'false'); });
      bAuto.setAttribute('aria-pressed', ink.auto ? 'true' : 'false');
      bUndo.disabled = !ink.st.hist.length; bClear.disabled = !ink.st.strokes.length;
      layer.classList.toggle('erase', tool === 'erase');
    }
    ink.onchange = sync;
    function set(v) {
      v = !!v; if (v === on) return;
      on = v; if (!on) ink.finish();
      ink.enabled = on; root.classList.toggle('pen-on', on);
      if (on) ink.fit();
      document.dispatchEvent(new CustomEvent('pen:state', { detail: { on: on } }));
      announce(on ? 'Pen on' : 'Pen off');
    }
    document.addEventListener('deck:pen', function () { set(!on); });
    document.addEventListener('deck:change', function (e) {
      var k = e.detail.i; if (k === cur) return;
      cur = k; ink.swap(store[k] || (store[k] = { strokes: [], hist: [] }));
    });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && on) set(false); });
    sync();
    return { ink: ink, set: set, on: function () { return on; }, store: store, bar: bar, layer: layer };
  }

  /* ================= tap guard =================
     After a quick finger drag (a flick), Chrome can swallow the click of the next tap ("tap stops the fling").
     On a classroom touch screen that means a dead Check button. If a finger or stylus goes down and up on a
     button without moving and no click follows, send the click ourselves. */
  (function () {
    var down = null, lastClick = -1, synthAt = -1e9, synthT = null;
    addEventListener('pointerdown', function (e) { down = e.pointerType === 'mouse' ? null : { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.target }; }, true);
    addEventListener('click', function (e) {
      if (!e.isTrusted) return;
      if (e.target === synthT && performance.now() - synthAt < 250) { e.stopPropagation(); e.preventDefault(); return; }   /* late twin of a click we already sent */
      lastClick = performance.now();
    }, true);
    /* A tap must never leave keyboard focus on a tool: the next Space / Enter / arrow from the clicker belongs to the deck.
       Text inputs keep their focus. Elements reached with Tab keep working with the keyboard. */
    function unfocus() {
      var a = document.activeElement;
      if (a && a !== document.body && a.tagName !== 'INPUT' && a.tagName !== 'TEXTAREA' && !a.isContentEditable && a.blur) a.blur();
    }
    ['pointerup', 'pointercancel'].forEach(function (t) { addEventListener(t, function () { unfocus(); setTimeout(unfocus, 0); }, true); });
    addEventListener('click', function (e) { if (e.detail > 0) { unfocus(); setTimeout(unfocus, 0); } }, true);   /* detail 0 = pressed with the keyboard: keep focus */
    addEventListener('pointerup', function (e) {
      var d = down; down = null;
      if (!d || d.id !== e.pointerId || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12) return;
      var t = d.t && d.t.closest ? d.t.closest('button,input,[role="button"]') : null;
      if (!t || t.disabled || !(stage.contains(t) || t.closest('#ctl'))) return;
      var at = performance.now();
      setTimeout(function () {
        if (lastClick >= at || !t.isConnected || t.disabled) return;
        synthAt = performance.now(); synthT = t;
        if (t.tagName === 'INPUT') t.focus(); else { t.click(); unfocus(); }
      }, 90);
    }, true);
  })();

  /* ================= start ================= */
  var kinds = [['.ch[data-mcq]', mcq], ['.w-input', input], ['.w-write', write], ['.w-sort', sort], ['.w-bars', bars], ['.w-line', line], ['.w-pie', pie], ['.w-picto', picto], ['.w-dots', dots]];
  kinds.forEach(function (k) {
    [].forEach.call(stage.querySelectorAll(k[0]), function (w) {
      try { k[1](w); } catch (err) { if (window.console) console.error('tools.js: could not render ' + k[0], err); }
    });
  });
  var penApi = pen();
  window.__tools = {
    widgets: widgets, pen: penApi, recog: recog,
    showAll: function () { widgets.forEach(function (x) { if (x.show) x.show(); }); },
    resetAll: function () { widgets.forEach(function (x) { if (x.reset) x.reset(); }); }
  };
  if (ANSWERS) window.__tools.showAll();
})();
