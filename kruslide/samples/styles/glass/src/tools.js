/* KruSlide styles sample (glass): trimmed copy of teacher-slides/unit4/tools.js (via the calculus sample) with Thai labels.
   Kept: tap a choice, typed answer with Check, sort cards into boxes, the global pen with auto-shapes, the tap guard.
   Dropped (unused here): handwriting box and the chart builders.
   Interactive tools for the Unit 4 deck (vanilla JS, no libraries, no network).
   Renders every widget in CONTRACT.md + a global pen. Markup in, working tool out.
   Widgets: .ch[data-mcq] .w-input .w-sort
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
  var INK = '#FFFFFF', BLUE = '#2F7BF6', VIOLET = '#7A5AF8', CORAL = '#FF6A3D', MINT = '#1FB57A', SUN = '#FFC53D';   /* deck D colours */
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
    if (o.check) bs.appendChild(api.bCheck = btn('ตรวจคำตอบ', 'pri', 'check', o.check));
    if (o.show) { bs.appendChild(api.bShow = btn('ดูเฉลย', 'show', 'show', o.show)); api.bShow.setAttribute('aria-pressed', 'false'); }
    if (o.reset) bs.appendChild(api.bReset = btn('เริ่มใหม่', '', 'reset', o.reset));
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
        ft.bShow.textContent = 'ซ่อนเฉลย'; ft.bShow.setAttribute('aria-pressed', 'true');
        o.reveal(); ft.say('ok', 'แสดงเฉลยแล้ว');
      },
      /* back to the student's own work. Check and every edit call this first, so the revealed key is never graded
         and never becomes the student's work. Only Reset drops the saved work (off). */
      hide: function () { if (!c.shown) return; c.off(); o.restore(saved); ft.say(''); },
      toggle: function () { if (c.shown) c.hide(); else c.show(); },
      off: function () {
        if (!c.shown) return;
        c.shown = false; w.classList.remove('w-shown');
        ft.bShow.textContent = 'ดูเฉลย'; ft.bShow.setAttribute('aria-pressed', 'false');
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
    /* the drawing area changed size (web font loaded, label wrapped...): same pixels, new canvas, ink kept as drawn */
    self.resize = function (w2, h2) { finish(); endMorph(); W = w2; H = h2; ratio = 0; fit(); };
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
        if (c.classList.contains('ok')) { c.classList.remove('wrong'); c.classList.add('picked'); announce('ถูกต้อง!'); return; }
        c.classList.add('wrong'); announce('ยังไม่ใช่ ลองอีกครั้ง');
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
  /* A typed number, or null. Commas (or spaces) count only as proper groups of three: "1,250" is 1250, but
     "3,5", "1,00" or "1 2" are not numbers. A typed unit, "%", the degree sign, and the words "more" / "than ..." are
     ignored: "6 more girls" is 6 when the unit is girls. */
  function parseNum(s, unit) {
    var t = clean(s).replace(/−/g, '-'), u = unit ? clean(unit) : '';
    t = t.replace(/\s+than\b.*$/, '').replace(/(\d)\s*\bmore\b/g, '$1 ').replace(/\s+/g, ' ').trim();
    if (u && t.length > u.length && t.slice(-u.length) === u) t = t.slice(0, -u.length).trim();
    t = t.replace(/\s*[%°]$/, '').replace(/^\+/, '');
    var m = /^(-?)(\d{1,3}(?:,\d{3})+|\d{1,3}(?: \d{3})+|\d+)?(\.\d*)?$/.exec(t);
    if (!m || (!m[2] && !(m[3] && m[3].length > 1))) return null;
    return parseFloat(m[1] + (m[2] || '0').replace(/[, ]/g, '') + (m[3] || ''));
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
    if (!d.label) inp.setAttribute('aria-label', 'คำตอบของคุณ');
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
        if (a === b) return true;
        /* spaces may differ ("110cups"), but never inside or between numbers: "1 2" is not "12" */
        if (!/\d[\s,]+\d/.test(a) && a.replace(/\s/g, '') === b.replace(/\s/g, '')) return true;
        var bn = parseNum(x, unit);
        return an !== null && bn !== null && Math.abs(an - bn) <= tol + 1e-9;
      });
    }
    function mark(k) { inp.classList.remove('ok', 'no'); if (k) inp.classList.add(k); }
    function check() {
      ac.hide();
      if (!inp.value.trim()) { mark(''); ft.say('info', 'พิมพ์คำตอบก่อนนะ'); return; }
      if (match(inp.value)) { mark('ok'); ft.say('ok', 'ถูกต้อง!'); return; }
      tries++; mark('no');
      anim(inp, [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 300 });
      ft.say('no', tries >= 2 ? 'ลองตรวจวิธีทำอีกครั้ง' : 'ยังไม่ถูก ลองอีกครั้ง');
      if (tries >= 2) ft.bShow.classList.add('nudge');
    }
    function reset() { ac.off(); inp.readOnly = false; inp.value = ''; tries = 0; mark(''); ft.bShow.classList.remove('nudge'); ft.say(''); }
    var ac = answerCtl(w, ft, {
      snap: function () { return { v: inp.value, cls: inp.className }; },
      reveal: function () { inp.value = answer; inp.readOnly = true; mark('ok'); },
      restore: function (s) { inp.value = s.v; inp.readOnly = false; mark(''); }
    });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); check(); inp.blur(); } });   /* blur: the arrows go back to the deck */
    inp.addEventListener('input', function () { ac.hide(); mark(''); if (ft.fb.classList.contains('ok') || ft.fb.classList.contains('info')) ft.say(''); });
    return register(w, { type: 'input', show: ac.show, hide: ac.hide, reset: reset, check: check, input: inp, tries: function () { return tries; } });
  }

  /* ================= w-sort ================= */
  function sort(w) {
    var bins = (w.dataset.bins || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    var items = [].slice.call(w.children).filter(function (c) { return c.classList && c.classList.contains('item'); });
    var pool = el('div', 'tw-pool'), row = el('div', 'tw-binrow'), sel = null;
    pool.setAttribute('role', 'button'); pool.tabIndex = -1; pool.setAttribute('aria-label', 'การ์ดที่ยังไม่ได้จัด');
    w.textContent = '';
    w.appendChild(pool); w.appendChild(row);
    var binEls = bins.map(function (name, b) {
      var bin = el('div', 'tw-bin b' + (b % 4)), slot = el('div', 'tw-slot');
      bin.tabIndex = 0; bin.setAttribute('role', 'button'); bin.setAttribute('aria-label', 'กล่อง: ' + name);
      bin.appendChild(el('div', 'tw-bint', name)); bin.appendChild(slot); bin._slot = slot; bin._b = b;
      row.appendChild(bin); return bin;
    });
    var ft = foot(w, { check: check, show: function () { ac.toggle(); }, reset: reset, hint: 'ลากแต่ละภาพไปใส่กลุ่มที่ถูก' });
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
    function place(it, target) { ac.hide(); move(it, target); if (sel === it) select(it); ft.say(''); }
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
      function drop() { if (sel && slotOf(b) !== sel.parentNode) { var it = sel; place(it, b); announce('ย้ายแล้ว'); } else if (sel) select(sel); }
      b.addEventListener('click', drop);
      b.addEventListener('keydown', function (e) { if (e.target === b && key(e, ['Enter', ' '])) drop(); });
    });
    function check() {
      ac.hide();
      var placed = items.filter(function (it) { return where(it) >= 0; }), right = 0;
      if (!placed.length) { ft.say('info', 'ลากภาพลงกลุ่มก่อนนะ'); return; }
      placed.forEach(function (it) { var ok = where(it) === +it.dataset.bin; if (ok) right++; mark(it, ok); });
      var np = placed.length, left = items.length - np;
      if (right === items.length) ft.say('ok', 'ถูกทั้งหมด เยี่ยมมาก!');
      else if (!left) ft.say('no', 'ถูก ' + right + ' จาก ' + items.length + ' ภาพ');
      else ft.say(right === np ? 'info' : 'no', 'วางแล้ว ' + np + ' ภาพ ถูก ' + right + ' \u00B7 เหลืออีก ' + left);
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

  /* ================= global pen ================= */
  function pen() {
    var layer = el('div'); layer.id = 'pen-layer'; stage.appendChild(layer);
    var ink = Ink(layer, 1920, 1080, 1.5); ink.enabled = false;
    var bar = el('div'); bar.id = 'pen-bar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'เครื่องมือปากกา'); bar.setAttribute('aria-orientation', 'vertical');
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
    var colors = [['หมึก', INK], ['น้ำเงิน', BLUE], ['ส้มแดง', CORAL], ['เขียว', MINT], ['เหลือง', SUN]];
    var penColor = INK, hiColor = SUN;   /* the highlighter has its own colour: sun yellow by default */
    colors.forEach(function (c) {
      var sw = el('i', 'pc'); sw.style.background = c[1];
      tb(c[0], sw, 'color', c[1], function () { if (tool === 'erase') tool = 'pen'; if (tool === 'hi') hiColor = c[1]; else penColor = c[1]; });
    });
    sep();
    tb('เส้นบาง', '<path d="M4 16 Q9 6 13 12 T20 9" stroke-width="2"/>', 'size', 'thin', function () { size = 'thin'; });
    tb('เส้นหนา', '<path d="M4 16 Q9 6 13 12 T20 9" stroke-width="5"/>', 'size', 'thick', function () { size = 'thick'; });
    sep();
    var u = sv('svg', { 'class': 'tw-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true' }); sv('use', { href: '#pencil' }, u);
    tb('ปากกา', u, 'tool', 'pen', function () { tool = 'pen'; });
    tb('ปากกาเน้น', '<path d="M14 4l6 6-8 8H6v-6z"/><path d="M4 21h9" stroke-width="3"/>', 'tool', 'hi', function () { tool = 'hi'; });
    tb('ยางลบ', '<path d="M8 20l-4.5-4.5a1.5 1.5 0 0 1 0-2.1L13 4l7 7-9 9z"/><path d="M8 20h12M9 8l7 7"/>', 'tool', 'erase', function () { tool = 'erase'; });
    var bAuto = tb('จัดรูปทรงอัตโนมัติ', SHAPES_ICON, null, 'auto', function () { ink.auto = !ink.auto; });
    sep();
    var bUndo = tb('ย้อนกลับ', '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>', null, 'undo', function () { ink.undo(); });
    var bClear = tb('ลบทั้งสไลด์นี้', '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/>', null, 'clear', function () { ink.clear(); });
    sep();
    var x = sv('svg', { 'class': 'tw-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true' }); sv('use', { href: '#cross' }, x);
    tb('ปิดปากกา', x, null, 'close', function () { set(false); });
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
      announce(on ? 'เปิดปากกา' : 'ปิดปากกา');
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
      if (synthT && synthT.contains(e.target) && performance.now() - synthAt < 250) { e.stopPropagation(); e.preventDefault(); return; }   /* late twin of a click we already sent */
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
  var kinds = [['.ch[data-mcq]', mcq], ['.w-input', input], ['.w-sort', sort]];
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
