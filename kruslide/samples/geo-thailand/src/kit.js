/* kit.js · small helpers shared by the KruSlide sample decks (vanilla JS, no libraries, no network).
   KIT.slide(id, {set(st, prev), leave()})  set() runs on every beat change of that slide; prev = -1 when the slide was
       just entered or jumped to, so going back always lands on a clean, complete state and only a forward step animates.
   KIT.drag(el, {start(p, e) -> false cancels, move(p, d, e), end(p, e, moved, cancelled), slop})
       pointer events (mouse, pen, touch) with pointer capture; p = stage px {x, y}; d = {dx, dy} since the press.
       Drags never change the slide: the engine changes slides only with the arrow keys, PageUp/PageDown and ‹ ›.
   KIT.tween(ms, step(p), done) eased 0..1 (ends at once with reduced motion) · KIT.Anim() one tween at a time.
   KIT.foot(host, {check, show, reset, hint}) Check / Show answer / Reset buttons + feedback line, in the tools look.
   ?still or prefers-reduced-motion adds html.rm (KIT.rm() is true): everything jumps to its final state. */
var KIT = (function () {
  'use strict';
  var root = document.documentElement, stage = document.getElementById('stage'), NS = 'http://www.w3.org/2000/svg';
  function rm() { return root.classList.contains('rm'); }
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function S(tag, at, parent) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function eo(t) { return 1 - Math.pow(1 - t, 3); }
  function eio(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function scale() { var r = stage.getBoundingClientRect(); return r.width / 1920 || 1; }
  /* pointer position in stage pixels (the stage is scaled by a CSS transform) */
  function pt(e) { var r = stage.getBoundingClientRect(), s = r.width / 1920 || 1; return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s }; }
  /* pointer position in an SVG's own user units (works with any viewBox) */
  function svgPt(svg, e) {
    var m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 };
    var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; p = p.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }
  /* an element's box in stage pixels */
  function box(node) {
    var r = node.getBoundingClientRect(), s0 = stage.getBoundingClientRect(), s = s0.width / 1920 || 1;
    return { x: (r.left - s0.left) / s, y: (r.top - s0.top) / s, w: r.width / s, h: r.height / s, cx: (r.left + r.width / 2 - s0.left) / s, cy: (r.top + r.height / 2 - s0.top) / s };
  }

  function tween(ms, step, done) {
    var fin = false, t0 = null;
    function end() { if (fin) return; fin = true; step(1); if (done) done(); }
    if (rm() || ms <= 0) { end(); return { stop: function () {} }; }
    function f(t) { if (fin) return; if (t0 === null) t0 = t; var p = (t - t0) / ms; if (p >= 1) return end(); step(eo(p)); requestAnimationFrame(f); }
    requestAnimationFrame(f);
    return { stop: function () { fin = true; } };
  }
  function Anim() {
    var tok = 0;
    return {
      run: function (ms, step, done, ease) {
        var my = ++tok, t0 = null, E = ease || eo;
        if (rm() || ms <= 0) { step(1); if (done) done(); return; }
        function f(t) {
          if (my !== tok) return;
          if (t0 === null) t0 = t;
          var p = Math.min(1, (t - t0) / ms); step(E(p));
          if (p < 1) requestAnimationFrame(f); else if (done) done();
        }
        requestAnimationFrame(f);
      },
      stop: function () { tok++; },
      busy: function () { return tok; }
    };
  }
  function wait(ms, fn) { return setTimeout(fn, rm() ? 0 : ms); }

  function drag(node, o) {
    var st = null;
    node.addEventListener('pointerdown', function (e) {
      if (root.classList.contains('pen-on')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (st) return;
      var p = pt(e);
      if (o.start && o.start(p, e) === false) return;
      st = { id: e.pointerId, x0: p.x, y0: p.y, moved: false };
      try { node.setPointerCapture(e.pointerId); } catch (er) {}
      e.preventDefault();
    });
    node.addEventListener('pointermove', function (e) {
      if (!st || e.pointerId !== st.id) return;
      var p = pt(e), dx = p.x - st.x0, dy = p.y - st.y0;
      if (!st.moved && Math.hypot(dx, dy) < (o.slop == null ? 7 : o.slop)) return;
      st.moved = true;
      if (o.move) o.move(p, { dx: dx, dy: dy }, e);
    });
    function up(e) {
      if (!st || e.pointerId !== st.id) return;
      var s = st; st = null;
      try { node.releasePointerCapture(e.pointerId); } catch (er) {}
      if (o.end) o.end(pt(e), e, s.moved, e.type === 'pointercancel');
    }
    node.addEventListener('pointerup', up); node.addEventListener('pointercancel', up);
    node.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  /* ---------- Check / Show answer / Reset, in the tools look ---------- */
  var liveEl = el('div', 'sr'); liveEl.setAttribute('aria-live', 'polite'); document.body.appendChild(liveEl);
  function announce(t) { liveEl.textContent = ''; setTimeout(function () { liveEl.textContent = t; }, 30); }
  function ico(name) { var s = S('svg', { 'class': 'tw-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true' }); S('use', { href: '#' + name }, s); return s; }
  function btn(label, cls, fn) {
    var b = el('button', 'tw-btn' + (cls ? ' ' + cls : ''), label); b.type = 'button';
    b.addEventListener('click', function (e) { e.stopPropagation(); fn(e); });
    return b;
  }
  function foot(host, o) {
    var f = el('div', 'tw-foot'), bs = el('div', 'tw-btns'), fb = el('div', 'tw-fb');
    fb.setAttribute('role', 'status'); fb.setAttribute('aria-live', 'polite');
    var api = { el: f, fb: fb };
    if (o.check) bs.appendChild(api.bCheck = btn(o.checkLabel || 'ตรวจคำตอบ', 'pri', o.check));
    if (o.show) bs.appendChild(api.bShow = btn('ดูเฉลย', 'show', o.show));
    if (o.reset) bs.appendChild(api.bReset = btn('เริ่มใหม่', '', o.reset));
    f.appendChild(bs); f.appendChild(fb);
    api.say = function (kind, msg) {
      fb.className = 'tw-fb' + (kind ? ' ' + kind : ''); fb.textContent = '';
      if (kind === 'ok') fb.appendChild(ico('check'));
      if (kind === 'no') fb.appendChild(ico('cross'));
      var m = msg || (kind ? '' : o.hint || ''); if (m) fb.appendChild(el('span', '', m));
      if (msg && kind) announce(msg);
    };
    api.say('');
    if (host) host.appendChild(f);
    return api;
  }
  function shake(node) {
    if (rm() || !node.animate) return;
    node.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(9px)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(0)' }], { duration: 380, composite: 'add' });
  }

  /* ---------- per-slide controllers ---------- */
  var C = {}, cur = null, curSt = 0;
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
  function slide(id, c) {
    C[id] = c;
    if (window.__deck) { var s = window.__deck.state(); if (s.id === id) { cur = null; sync(document.getElementById(id), s.st); } }
  }

  return { rm: rm, $: $, $$: $$, el: el, S: S, clamp: clamp, eo: eo, eio: eio, scale: scale, pt: pt, svgPt: svgPt, box: box,
    tween: tween, Anim: Anim, wait: wait, drag: drag, btn: btn, foot: foot, ico: ico, shake: shake, announce: announce, slide: slide, C: C };
})();
