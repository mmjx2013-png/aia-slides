/* KruSlide styles sample D · "real glass" (vanilla JS, no libraries, works in Chromium and WebKit).
   Every .glass element gets a CLIPPED COPY of its slide's .scene layer behind its content. That copy is distorted by its own
   SVG filter (filter:url(#id) on a normal element, which WebKit supports; we never rely on backdrop-filter:url()):
     feImage (a displacement map drawn on a canvas for this exact rounded shape) -> feDisplacementMap three times at slightly
     different strengths, one per colour channel, so the rim refracts AND splits colour a little -> optional soft blur.
   On top: a tint, an inner shadow with a thick lower lip, a rim light and a specular highlight that follow the pointer
   (or the tilt of a phone/tablet, or a slow drift when nobody touches the screen).
   The background drifts slowly (one set of CSS variables per slide), so the copies move with it and the bending is visible.
   Kinds: data-glass="panel" (frosted a little, for text) · "clear" (buttons, choices) · "lens" (magnifier, see slide 2).
   Test hooks: window.__glass = {items, light, lens, stack, refresh}. ?still = no motion (screenshots). */
(function () {
  'use strict';
  var root = document.documentElement, stage = document.getElementById('stage');
  if (!stage) return;
  var NS = 'http://www.w3.org/2000/svg', XL = 'http://www.w3.org/1999/xlink', uid = 0;
  function still() { return root.classList.contains('rm'); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(p) { return 1 - Math.pow(1 - p, 3); }
  function sv(tag, at, parent) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; }
  function div(cls, parent) { var d = document.createElement('div'); d.className = cls; if (parent) parent.appendChild(d); return d; }
  var defsSvg = sv('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false', style: 'position:absolute;width:0;height:0;overflow:hidden' });
  document.body.appendChild(defsSvg);
  var defs = sv('defs', {}, defsSvg);

  /* ---------- displacement maps ---------- */
  /* signed distance to a rounded rectangle (positive inside) */
  function sdf(x, y, w, h, r) {
    var qx = Math.abs(x - w / 2) - (w / 2 - r), qy = Math.abs(y - h / 2) - (h / 2 - r);
    return -(Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r);
  }
  var mapCache = {};
  /* The rim of a thick glass slab: inside a bezel of width b the surface curves down like a quarter circle, so the
     refraction grows steeply towards the edge. Each pixel samples the background further OUT along the edge normal:
     the world just outside the glass is bent into the rim (compressed and magnified), as with real thick glass. */
  function makeMap(w, h, r, b, s) {
    var key = [w, h, r, b].join('x');
    if (mapCache[key]) return mapCache[key];
    var k = Math.min(1, 360 / Math.max(w, h)), cw = Math.max(8, Math.ceil(w * k)), ch = Math.max(8, Math.ceil(h * k));
    var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    var cx = cv.getContext('2d'), im = cx.createImageData(cw, ch), D = im.data;
    for (var j = 0; j < ch; j++) for (var i = 0; i < cw; i++) {
      var x = (i + .5) / k, y = (j + .5) / k, d = sdf(x, y, w, h, r), o = (j * cw + i) * 4, vx = 0, vy = 0;
      if (d > 0 && d < b) {
        var t = 1 - d / b, m = .55 * t * t + .45 * (1 - Math.sqrt(Math.max(0, 1 - t * t)));   /* 0 at the inner edge of the bezel, 1 at the rim */
        var gx = sdf(x + 1, y, w, h, r) - sdf(x - 1, y, w, h, r), gy = sdf(x, y + 1, w, h, r) - sdf(x, y - 1, w, h, r), gl = Math.hypot(gx, gy) || 1;
        vx = -gx / gl * m; vy = -gy / gl * m;                                    /* outward normal, scaled */
      }
      D[o] = Math.round(127.5 + 127.5 * vx); D[o + 1] = Math.round(127.5 + 127.5 * vy); D[o + 2] = 128; D[o + 3] = 255;
    }
    cx.putImageData(im, 0, 0);
    return (mapCache[key] = cv.toDataURL('image/png'));
  }
  function makeFilter(w, h, r, o) {
    var id = 'gf' + (++uid), p = o.pad, str = o.str, url = makeMap(w, h, r, o.bezel, str);
    var f = sv('filter', { id: id, x: 0, y: 0, width: w + 2 * p, height: h + 2 * p, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' }, defs);
    var fi = sv('feImage', { x: p, y: p, width: w, height: h, preserveAspectRatio: 'none', result: 'map' }, f);
    fi.setAttribute('href', url); fi.setAttributeNS(XL, 'xlink:href', url);
    var ch = [['r', 1, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'], ['g', .93, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'], ['b', .86, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0']];
    ch.forEach(function (c) {
      sv('feDisplacementMap', { 'in': 'SourceGraphic', in2: 'map', scale: (2 * str * c[1]).toFixed(1), xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' + c[0] }, f);
      sv('feColorMatrix', { 'in': 'd' + c[0], type: 'matrix', values: c[2], result: c[0] }, f);
    });
    sv('feComposite', { 'in': 'r', in2: 'g', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0, result: 'rg' }, f);
    sv('feComposite', { 'in': 'rg', in2: 'b', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0, result: 'rgb' }, f);
    if (o.blur) sv('feGaussianBlur', { 'in': 'rgb', stdDeviation: o.blur }, f);
    return id;
  }

  /* ---------- building one glass element ---------- */
  var KIND = {   /* bezel = width of the curved rim (px; 'r' = the whole half-height, a capsule or a sphere), str = how far the rim
                   bends the light (px; 'r' = a third of the half-height), zoom = the lens over the whole face */
    panel: { bezel: 92, str: 66, blur: 1, zoom: 1 },
    clear: { bezel: 'r', str: 'r', blur: 0, zoom: 1.12 },
    pill: { bezel: 'r', str: 22, blur: .6, zoom: 1 },
    lens: { bezel: 120, str: 84, blur: 0, zoom: 1 }
  };
  var items = [];
  function offsetIn(el, slide) {   /* layout position of el inside its slide (transforms ignored) */
    var x = 0, y = 0, e = el;
    while (e && e !== slide) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
    return { x: x, y: y };
  }
  function build(el) {
    var slide = el.closest('.slide'), scene = slide && slide.querySelector('.scene');
    if (!scene) return null;
    var kind = el.dataset.glass || 'panel', K = KIND[kind] || KIND.panel;
    var w = el.offsetWidth, h = el.offsetHeight, cs = getComputedStyle(el), r = parseFloat(cs.borderTopLeftRadius) || 0;
    r = Math.min(r, w / 2, h / 2);
    var half = Math.min(w, h) / 2, bz = el.dataset.bezel || K.bezel, st = el.dataset.str || K.str;
    var bezel = Math.min(bz === 'r' ? half : +bz, half - 1), str = st === 'r' ? clamp(half * .36, 16, 64) : +st;
    var pad = Math.ceil(str + 8);
    var under = div('g-under'), copy = div('g-copy', under);
    under.style.left = -pad + 'px'; under.style.top = -pad + 'px'; under.style.width = (w + 2 * pad) + 'px'; under.style.height = (h + 2 * pad) + 'px';
    var clone = scene.cloneNode(true); clone.removeAttribute('id'); clone.setAttribute('aria-hidden', 'true');
    [].forEach.call(clone.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
    copy.appendChild(clone);
    var fid = makeFilter(w, h, r, { pad: pad, str: str, bezel: bezel, blur: el.dataset.blur != null ? +el.dataset.blur : K.blur });
    under.style.filter = 'url(#' + fid + ')';
    el.insertBefore(under, el.firstChild);
    var top = div('g-top'); top.innerHTML = '<i class="g-spec"></i><i class="g-rim"></i>';
    el.appendChild(top);
    el.classList.add('g-' + kind, 'g-ready');
    var it = { el: el, slide: slide, copy: copy, w: w, h: h, pad: pad, kind: kind, fixed: el.dataset.move == null, zoom: +(el.dataset.zoom || K.zoom) };
    place(it);
    items.push(it);
    return it;
  }
  /* align the copy with the real background: copy = translate(pad - x, pad - y) [then magnify, rotate...] */
  function place(it, m) {
    if (m) { it.copy.style.transform = m; return; }
    var o = offsetIn(it.el, it.slide), z = it.zoom; it.x = o.x; it.y = o.y;
    it.copy.style.transform = z === 1 ? 'translate(' + (it.pad - o.x) + 'px,' + (it.pad - o.y) + 'px)'
      : 'translate(' + (it.pad + it.w / 2 - z * (o.x + it.w / 2)).toFixed(1) + 'px,' + (it.pad + it.h / 2 - z * (o.y + it.h / 2)).toFixed(1) + 'px) scale(' + z + ')';
  }

  /* ---------- light: pointer, tilt, or a slow drift ---------- */
  var L = { x: 1300, y: 180, src: 'drift', t0: 0 }, lastMove = -1e9;
  function stageXY(cx, cy) { var r = stage.getBoundingClientRect(), k = r.width / 1920; return { x: (cx - r.left) / k, y: (cy - r.top) / k }; }
  addEventListener('pointermove', function (e) { var p = stageXY(e.clientX, e.clientY); L.x = p.x; L.y = p.y; L.src = 'pointer'; lastMove = performance.now(); wake(); }, { passive: true });
  addEventListener('pointerdown', function (e) { var p = stageXY(e.clientX, e.clientY); L.x = p.x; L.y = p.y; lastMove = performance.now(); wake(); }, { passive: true });
  /* phones and tablets: tilt moves the light (iOS asks for permission, so there the touch position drives it instead) */
  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    addEventListener('deviceorientation', function (e) {
      if (e.gamma == null) return;
      L.x = 960 + clamp(e.gamma, -35, 35) / 35 * 900; L.y = 540 + clamp((e.beta || 45) - 45, -35, 35) / 35 * 500; L.src = 'tilt'; lastMove = performance.now(); wake();
    });
  }
  function light(it) {
    var cx = (it.cx != null ? it.cx : it.x + it.w / 2), cy = (it.cy != null ? it.cy : it.y + it.h / 2);
    var dx = L.x - cx, dy = L.y - cy, a = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    var s = it.el.style;
    s.setProperty('--mx', (L.x - (cx - it.w / 2)).toFixed(0) + 'px');
    s.setProperty('--my', (L.y - (cy - it.h / 2)).toFixed(0) + 'px');
    s.setProperty('--la', a.toFixed(1) + 'deg');
    s.setProperty('--li', clamp(1 - Math.hypot(dx, dy) / 1600, .25, 1).toFixed(3));
  }

  /* ---------- one clock: background drift, light, and the per-slide motion ---------- */
  var cur = null, running = false, t0 = performance.now(), hooks = [];
  function frame(t) {
    var any = false;
    if (cur && !still()) {
      var s = (t - t0) / 1000, D = cur._drift;
      if (D) {
        cur.style.setProperty('--dx', (Math.sin(s * D.f) * D.x).toFixed(2) + 'px');
        cur.style.setProperty('--dy', (Math.cos(s * D.f * .8) * D.y).toFixed(2) + 'px');
        cur.style.setProperty('--ds', (1 + D.s * (.5 + .5 * Math.sin(s * D.f * .6))).toFixed(4));
        any = true;
      }
      if (performance.now() - lastMove > 4000) { L.x = 960 + Math.cos(s * .35) * 760; L.y = 300 + Math.sin(s * .5) * 220; L.src = 'drift'; }
      hooks.forEach(function (h) { if (h.slide === cur && h.tick) { if (h.tick(s) !== false) any = true; } });
      any = true;
    }
    if (cur) items.forEach(function (it) { if (it.slide === cur) light(it); });
    if (any) requestAnimationFrame(frame); else running = false;
  }
  function wake() { if (!running) { running = true; requestAnimationFrame(frame); } }
  var curSt = 0;
  function enter(s, st) {
    if (s !== cur) {
      cur = s;
      var d = (s.dataset.drift || '18,10,.02').split(',').map(Number);
      s._drift = { x: d[0], y: d[1], s: d[2], f: d[3] || .16 };
      t0 = performance.now();
      hooks.forEach(function (h) { if (h.active) h.active(h.slide === s); });
    }
    curSt = st;
    hooks.forEach(function (h) { if (h.slide === s && h.beat) h.beat(st); });
    wake();
  }
  document.addEventListener('deck:change', function (e) { enter(e.detail.slide, e.detail.st); });

  /* ---------- start: build every glass element once fonts and images are ready ---------- */
  function buildAll() {
    [].forEach.call(stage.querySelectorAll('.glass'), function (el) { if (!el.classList.contains('g-ready')) build(el); });
    items.forEach(function (it) { if (it.slide === cur || !cur) light(it); });
  }
  function refresh() { items.forEach(function (it) { if (it.fixed) place(it); }); }
  window.__glass = { items: items, light: L, refresh: refresh, build: build, place: place, hook: function (h) { hooks.push(h); if (cur) { if (h.active) h.active(h.slide === cur); if (h.slide === cur && h.beat) h.beat(curSt); } wake(); return h; }, wake: wake, still: still, ease: ease, clamp: clamp, stageXY: stageXY };
  buildAll();
  /* the deck showed its first slide before this file ran */
  (function () { var on = stage.querySelector('.slide.on'); if (on) enter(on, window.__deck ? window.__deck.state().st : 0); })();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { refresh(); });
  addEventListener('load', refresh);
  document.dispatchEvent(new CustomEvent('glass:ready'));
  wake();
})();
