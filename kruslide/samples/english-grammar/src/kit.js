/* kit.js · small helpers shared by the KruSlide sample decks (vanilla JS, no libraries, no network).
   K.ctl(id, {set(st, prev), leave()}) registers a slide controller: set() runs on every beat change; prev = -1 when the
   slide was just entered (or jumped to), so going back or jumping always lands on a clean, complete state.
   K.drag(el, o) = pointer drag (mouse, pen, touch) with pointer capture; distances are in stage pixels (the stage is scaled).
   Taps (< 8 px of movement) call o.tap instead. Nothing here ever changes the slide: only the engine's keys and buttons do.
   ?still (html.rm) = no motion: tweens jump to their end. */
var K = (function () {
  'use strict';
  var root = document.documentElement, stage = document.getElementById('stage'), NS = 'http://www.w3.org/2000/svg';
  var tk = (window.__tools && window.__tools.kit) || {};
  function still() { return root.classList.contains('rm'); }
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  function S(tag, at, parent) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; }
  function E(tag, cls, text, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function eo(t) { return 1 - Math.pow(1 - t, 3); }
  function eio(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function back(t) { var c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function scale() { var r = stage.getBoundingClientRect(); return r.width / 1920 || 1; }
  /* client point -> stage pixels */
  function pt(e) { var r = stage.getBoundingClientRect(), k = r.width / 1920 || 1; return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; }
  /* element box in stage pixels */
  function box(el) {
    var r = el.getBoundingClientRect(), s = stage.getBoundingClientRect(), k = s.width / 1920 || 1;
    return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k, cx: (r.left - s.left + r.width / 2) / k, cy: (r.top - s.top + r.height / 2) / k };
  }
  /* which of the elements is under the stage point p (pad = extra stage px around each); the closest centre wins */
  function hit(p, list, pad) {
    var best = null, bd = 1e9; pad = pad || 0;
    list.forEach(function (el) {
      if (!el || !el.isConnected) return;
      var b = box(el);
      if (p.x < b.x - pad || p.x > b.x + b.w + pad || p.y < b.y - pad || p.y > b.y + b.h + pad) return;
      var d = Math.hypot(p.x - b.cx, p.y - b.cy); if (d < bd) { bd = d; best = el; }
    });
    return best;
  }
  /* one running tween per owner: A.run(ms, step(p 0..1), done) · A.stop() */
  function Anim() {
    var tok = 0;
    return {
      run: function (ms, step, done) {
        var my = ++tok, t0 = null;
        if (still() || ms <= 0) { step(1); if (done) done(); return; }
        function f(t) { if (my !== tok) return; if (t0 === null) t0 = t; var p = Math.min(1, (t - t0) / ms); step(p); if (p < 1) requestAnimationFrame(f); else if (done) done(); }
        requestAnimationFrame(f);
      },
      stop: function () { tok++; }
    };
  }
  /* Web Animations wrapper that respects reduced motion */
  function anim(node, frames, opt) { if (still() || !node.animate) return null; try { return node.animate(frames, opt); } catch (e) { return null; } }
  /* FLIP: el has just moved in the layout; animate it from its old stage box `from` to where it is now */
  function flip(el, from, ms, extra) {
    var to = box(el);
    return anim(el, [{ transform: 'translate(' + (from.x - to.x) + 'px,' + (from.y - to.y) + 'px)' + (extra || '') }, { transform: 'none' }],
      { duration: ms || 450, easing: 'cubic-bezier(.2,.7,.2,1)' });
  }
  /* pointer drag. o = {start(e,p), move(d, e, p), end(d, e, p, cancelled), tap(e, p), threshold}; d = {dx, dy} in stage px */
  function drag(el, o) {
    var st = null, TH = o.threshold == null ? 8 : o.threshold;
    el.classList.add('drag-el');
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (root.classList.contains('pen-on')) return;
      if (st) return;
      if (o.can && !o.can(e)) return;
      var p = pt(e);
      st = { id: e.pointerId, p0: p, moved: TH === 0 };
      try { el.setPointerCapture(e.pointerId); } catch (er) {}
      e.stopPropagation();
      if (TH === 0 && o.start) o.start(e, p);
    });
    el.addEventListener('pointermove', function (e) {
      if (!st || e.pointerId !== st.id) return;
      var p = pt(e), d = { dx: p.x - st.p0.x, dy: p.y - st.p0.y };
      if (!st.moved) { if (Math.hypot(d.dx, d.dy) < TH) return; st.moved = true; if (o.start) o.start(e, st.p0); }
      if (o.move) o.move(d, e, p);
    });
    function up(e) {
      if (!st || e.pointerId !== st.id) return;
      var s = st; st = null;
      try { el.releasePointerCapture(e.pointerId); } catch (er) {}
      var p = pt(e), d = { dx: p.x - s.p0.x, dy: p.y - s.p0.y };
      if (!s.moved) { if (e.type === 'pointerup' && o.tap) o.tap(e, p); return; }
      if (o.end) o.end(d, e, p, e.type !== 'pointerup');
    }
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', function (e) { if (st && e.pointerId === st.id) up({ type: 'pointercancel', pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY }); });
    /* a tap never leaves a click to bubble up as anything else */
    el.addEventListener('click', function (e) { e.stopPropagation(); });
    return { busy: function () { return !!st; } };
  }
  /* tap that works the same with mouse, pen and touch (keyboard: Enter / Space when focusable) */
  function tap(el, fn) {
    el.addEventListener('click', function (e) { e.stopPropagation(); if (root.classList.contains('pen-on')) return; fn(e); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); fn(e); } });
  }
  /* footer with Check / Show answer / Reset (tools.js look + Thai/English labels). o = {check, show, reset, hint} */
  function footer(host, o) { var f = tk.foot(host, o); host.appendChild(f.el); return f; }
  /* gentle Web Audio synth (no files): created on the first sound, which always follows a tap */
  var ac = null;
  function tone(freq, ms, type, vol, when) {
    if (still() && new URLSearchParams(location.search).has('still')) return;
    try {
      if (!ac) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ac = new AC(); }
      if (ac.state === 'suspended') ac.resume();
      var t = ac.currentTime + (when || 0), o = ac.createOscillator(), g = ac.createGain(), d = (ms || 180) / 1000;
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.06, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.05);
    } catch (e) {}
  }
  /* controllers */
  var C = {}, cur = null, curSt = 0;
  function sync(slide, st) {
    if (!slide) return;
    var id = slide.id, c = C[id];
    if (cur !== id) { if (cur && C[cur] && C[cur].leave) C[cur].leave(); cur = id; curSt = st; if (c && c.set) c.set(st, -1); return; }
    var p = curSt; curSt = st;
    if (c && c.set && p !== st) c.set(st, p);
  }
  document.addEventListener('deck:change', function (e) { sync(e.detail.slide, e.detail.st); });
  function ctl(id, c) { C[id] = c; }
  function start() { if (window.__deck) { var s0 = window.__deck.state(); cur = null; sync(document.getElementById(s0.id), s0.st); } window.__kit = { C: C }; }
  return { $: $, $$: $$, S: S, E: E, clamp: clamp, eo: eo, eio: eio, back: back, scale: scale, pt: pt, box: box, hit: hit, Anim: Anim, anim: anim, flip: flip,
    drag: drag, tap: tap, footer: footer, tone: tone, ctl: ctl, start: start, C: C, still: still, tk: tk, tr: tk.tr || function (a) { return a; }, root: root, stage: stage };
})();
