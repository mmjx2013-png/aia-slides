/* KruSlide styles sample D · the slides' own interactions, built on glass.js:
   slide 2 a draggable glass lens (2.6× magnification + rim refraction) that reads out the planet under it;
   slide 3 a stack of glass cards to sort (drag or the glass buttons), every card refracting Earth and the cards below it;
   slide 5 glass bubbles that orbit the Sun at speeds in the ratio of the real orbits (Kepler: period ∝ a^1.5).
   Only arrow keys / PageUp / PageDown / ‹ › change the slide: every drag here uses pointer capture and touch-action:none. */
(function () {
  'use strict';
  var G = window.__glass, root = document.documentElement;
  if (!G) return;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  var clamp = G.clamp, still = G.still;
  function thai(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function tween(dur, step, done) {
    var t0 = null, fin = false;
    function end() { if (fin) return; fin = true; step(1); if (done) done(); }
    if (still()) { end(); return { cancel: function () { fin = true; } }; }
    function f(t) { if (fin) return; if (t0 === null) t0 = t; var p = (t - t0) / dur; if (p >= 1) return end(); step(G.ease(p)); requestAnimationFrame(f); }
    requestAnimationFrame(f); setTimeout(end, dur + 250);
    return { cancel: function () { fin = true; } };
  }
  function itemOf(el) { for (var i = 0; i < G.items.length; i++) if (G.items[i].el === el) return G.items[i]; return null; }
  /* pointer drag that never reaches the deck: capture, prevent, stop */
  function drag(el, o) {
    el.style.touchAction = 'none';
    var id = null;
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (root.classList.contains('pen-on')) return;
      e.preventDefault(); e.stopPropagation(); id = e.pointerId;
      try { el.setPointerCapture(id); } catch (er) {}
      el.classList.add('held'); if (o.down) o.down(e);
    });
    el.addEventListener('pointermove', function (e) { if (e.pointerId === id && o.move) o.move(e); });
    function up(e) { if (e.pointerId !== id) return; id = null; el.classList.remove('held'); try { el.releasePointerCapture(e.pointerId); } catch (er) {} if (o.up) o.up(e, e.type === 'pointercancel'); }
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  /* ================= slide 2: the lens ================= */
  var lens = $('#g2-lens');
  if (lens) (function () {
    var it = itemOf(lens), slide = lens.closest('.slide'), R = 160, MAG = 2.6;
    var P = lens.dataset.planets.split(';').map(function (s) { var a = s.split('|'); return { k: a[0], th: a[1], en: a[2], d: +a[3], au: +a[4], ty: a[5], fact: a[6], x: +a[7] }; });
    var name = $('#g2-name'), en = $('#g2-en'), od = $('#g2-d'), ox = $('#g2-x'), oau = $('#g2-au'), fact = $('#g2-fact'), chip = $('#g2-type');
    var cx = 310, cy = 600, curK = null, numT = null;
    function setLens(x, y) {
      cx = clamp(x, R + 10, 1920 - R - 10); cy = clamp(y, 250, 1080 - R - 90);
      lens.style.left = (cx - R) + 'px'; lens.style.top = (cy - R) + 'px';
      it.x = cx - R; it.y = cy - R;
      /* copy: magnify the scene about the lens centre: translate(pad + R − MAG·cx, pad + R − MAG·cy) scale(MAG) */
      G.place(it, 'translate(' + (it.pad + R - MAG * cx).toFixed(1) + 'px,' + (it.pad + R - MAG * cy).toFixed(1) + 'px) scale(' + MAG + ')');
      var best = null, bd = 1e9;
      P.forEach(function (p) { var d = Math.abs(p.x - cx); if (d < bd) { bd = d; best = p; } });
      if (best && best.k !== curK && bd < 190) show(best);
      lens.setAttribute('aria-valuenow', Math.round(cx));
    }
    function show(p) {
      curK = p.k;
      name.textContent = p.th; en.textContent = p.en; fact.textContent = p.fact;
      chip.textContent = p.ty === 'หิน' ? 'ดาวเคราะห์หิน' : 'ดาวเคราะห์แก๊ส'; chip.className = 'chip ' + (p.ty === 'หิน' ? 'rock' : 'gas');
      var from = [+od.textContent.replace(/,/g, '') || 0, parseFloat(ox.textContent) || 0, parseFloat(oau.textContent) || 0], to = [p.d, p.d / 12756, p.au];
      if (numT) numT.cancel();
      numT = tween(500, function (t) {
        od.textContent = thai(Math.round(from[0] + (to[0] - from[0]) * t)); ox.textContent = (from[1] + (to[1] - from[1]) * t).toFixed(2); oau.textContent = (from[2] + (to[2] - from[2]) * t).toFixed(2);
      });
      var card = $('#g2-card .gc'); card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
    }
    var off = null;
    drag(lens, {
      down: function (e) { var p = G.stageXY(e.clientX, e.clientY); off = { x: p.x - cx, y: p.y - cy }; },
      move: function (e) { var p = G.stageXY(e.clientX, e.clientY); setLens(p.x - off.x, p.y - off.y); }
    });
    lens.addEventListener('keydown', function (e) {   /* Up/Down step between planets; Left/Right stay with the deck */
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return; e.preventDefault(); e.stopPropagation();
      var i = P.findIndex(function (p) { return p.k === curK; }); i = clamp(i + (e.key === 'ArrowUp' ? 1 : -1), 0, P.length - 1); setLens(P[i].x, 600);
    });
    setLens(310, 600);
    G.hook({ slide: slide, active: function (on) { if (on) setLens(cx, cy); } });
    window.__glass.lens = { set: setLens, cur: function () { return curK; }, pos: function () { return { x: cx, y: cy }; }, planets: P };
  })();

  /* ================= slide 3: the glass card stack ================= */
  var stackEl = $('#g3-stack');
  if (stackEl) (function () {
    var slide = stackEl.closest('.slide'), cards = $$('.card', stackEl), fb = $('#g3-fb');
    var zones = { rock: $('#g3-rock'), gas: $('#g3-gas') }, placed = { rock: [], gas: [] };
    var SX = 780 + 180, SY = 300 + 234, CW = 360, CH = 468;   /* stack centre, card size */
    var cs = cards.map(function (el, i) {
      var it = itemOf(el);
      return { el: el, it: it, k: el.dataset.k, ty: el.dataset.ty, x: SX, y: SY, a: 0, s: 1, done: null, z: 0, ghosts: [] };
    });
    function seed(i) { var x = Math.sin(i * 91.7 + 3.3) * 43758.5; return x - Math.floor(x); }
    function home(c, i) { var n = cs.length - 1 - i; return { x: SX + (seed(i) - .5) * 26, y: SY + n * -4, a: (seed(i + 9) - .5) * 9, s: 1 }; }
    /* ghosts: each card's copy shows the cards beneath it as faint glass outlines, so stacked glass reads as glass */
    cs.forEach(function (c) {
      cs.forEach(function (o) {
        if (o === c) return;
        var g = document.createElement('i'); g.className = 'ghost'; c.it.copy.appendChild(g); c.ghosts.push({ o: o, el: g });
      });
    });
    function M(c) { return 'translate(' + (c.x - CW / 2).toFixed(1) + 'px,' + (c.y - CH / 2).toFixed(1) + 'px) rotate(' + c.a.toFixed(2) + 'deg) scale(' + c.s.toFixed(3) + ')'; }
    function apply(c) {
      c.el.style.transform = M(c);
      /* the copy undoes the card's own transform: T(pad + W/2, pad + H/2) · S(1/s) · R(−a) · T(−cx, −cy) */
      G.place(c.it, 'translate(' + (c.it.pad + CW / 2) + 'px,' + (c.it.pad + CH / 2) + 'px) scale(' + (1 / c.s).toFixed(4) + ') rotate(' + (-c.a).toFixed(2) + 'deg) translate(' + (-c.x).toFixed(1) + 'px,' + (-c.y).toFixed(1) + 'px)');
      c.it.cx = c.x; c.it.cy = c.y;
    }
    function ghosts() {
      cs.forEach(function (c) {
        c.ghosts.forEach(function (g) {
          var below = g.o.z < c.z;
          g.el.style.display = below ? '' : 'none';
          if (below) g.el.style.transform = 'translate(' + (g.o.x - CW / 2).toFixed(1) + 'px,' + (g.o.y - CH / 2).toFixed(1) + 'px) rotate(' + g.o.a.toFixed(2) + 'deg) scale(' + g.o.s.toFixed(3) + ')';
        });
      });
    }
    function order() {   /* z-order: the unsorted stack on top, sorted cards below */
      var left = cs.filter(function (c) { return !c.done; });
      cs.forEach(function (c, i) { c.z = c.done ? 1 + placed[c.done].indexOf(c) : 20 + left.indexOf(c); c.el.style.zIndex = c.z; });
      left.forEach(function (c) { c.el.classList.toggle('top', c === left[left.length - 1]); c.el.setAttribute('aria-hidden', c === left[left.length - 1] ? 'false' : 'true'); });
      cs.forEach(function (c) { if (c.done) { c.el.classList.remove('top'); c.el.setAttribute('aria-hidden', 'false'); } });
    }
    function topCard() { var left = cs.filter(function (c) { return !c.done; }); return left[left.length - 1] || null; }
    function slotOf(ty, n) {   /* 2 x 2 inside the zone, cards at 42 % */
      var z = zones[ty], zx = parseFloat(z.style.left), zy = parseFloat(z.style.top), col = n % 2, row = Math.floor(n / 2);
      return { x: zx + 145 + col * 230, y: zy + 240 + row * 252, a: (seed(n + (ty === 'gas' ? 5 : 0)) - .5) * 6, s: .5 };
    }
    var moving = 0;
    function animate(c, to, dur, done) {
      var f = { x: c.x, y: c.y, a: c.a, s: c.s }; moving++;
      tween(dur, function (t) { c.x = f.x + (to.x - f.x) * t; c.y = f.y + (to.y - f.y) * t; c.a = f.a + (to.a - f.a) * t; c.s = f.s + (to.s - f.s) * t; apply(c); ghosts(); },
        function () { moving--; if (done) done(); });
    }
    function say(t, k) { fb.textContent = ''; fb.className = 'ab ' + (k || ''); if (t) { var sp = document.createElement('span'); sp.textContent = t; fb.appendChild(sp); } }
    function send(c, ty, quiet) {
      if (!c || c.done) return;
      if (c.ty !== ty) {   /* wrong: back to the stack with a shake and a hint */
        say(c.el.querySelector('b').textContent + (ty === 'rock' ? ' ใหญ่และอยู่ไกล ลองดูอีกที' : ' เล็กและอยู่ใกล้ดวงอาทิตย์ ลองดูอีกที'), 'no');
        var h = home(c, cs.indexOf(c));
        animate(c, { x: h.x + (ty === 'rock' ? -40 : 40), y: h.y, a: h.a, s: 1 }, 180, function () { animate(c, h, 420); });
        return;
      }
      c.done = ty; placed[ty].push(c); order();
      animate(c, slotOf(ty, placed[ty].length - 1), quiet ? 520 : 600);
      var n = placed.rock.length + placed.gas.length;
      if (!quiet) say(n === cs.length ? 'ครบทั้ง 8 ดวงแล้ว เยี่ยมมาก!' : 'ถูกต้อง! ' + c.el.querySelector('b').textContent + (ty === 'rock' ? ' เป็นดาวเคราะห์หิน' : ' เป็นดาวเคราะห์แก๊ส'), 'ok');
      zones[ty].classList.remove('hit'); void zones[ty].offsetWidth; zones[ty].classList.add('hit');
    }
    function reset() {
      placed = { rock: [], gas: [] };
      cs.forEach(function (c, i) { c.done = null; var h = home(c, i); c.x = h.x; c.y = h.y; c.a = h.a; c.s = 1; apply(c); });
      order(); ghosts(); say('');
    }
    /* drag the top card: it follows the finger and tilts; release past 180 px sends it to that side */
    cs.forEach(function (c, i) {
      var start = null;
      drag(c.el, {
        down: function (e) { if (c !== topCard() || moving) { start = null; return; } var p = G.stageXY(e.clientX, e.clientY); start = { px: p.x, py: p.y, x: c.x, y: c.y }; },
        move: function (e) {
          if (!start) return; var p = G.stageXY(e.clientX, e.clientY), dx = p.x - start.px, dy = p.y - start.py;
          c.x = start.x + dx; c.y = start.y + dy * .35; c.a = home(c, i).a + dx / 22; apply(c); ghosts();
          zones.rock.classList.toggle('over', dx < -180); zones.gas.classList.toggle('over', dx > 180);
        },
        up: function (e, cancel) {
          if (!start) return; var dx = c.x - start.x; start = null; zones.rock.classList.remove('over'); zones.gas.classList.remove('over');
          if (!cancel && Math.abs(dx) > 180) send(c, dx < 0 ? 'rock' : 'gas'); else animate(c, home(c, i), 380);
        }
      });
    });
    $('#g3-l').addEventListener('click', function (e) { e.stopPropagation(); if (!moving) send(topCard(), 'rock'); });
    $('#g3-r').addEventListener('click', function (e) { e.stopPropagation(); if (!moving) send(topCard(), 'gas'); });
    reset();
    G.hook({ slide: slide,
      beat: function (st) {   /* beat 1 = the answer: every card still in the stack flies to its group */
        if (st >= 1) { var k = 0; cs.slice().reverse().forEach(function (c) { if (!c.done) { setTimeout(function () { send(c, c.ty, true); }, still() ? 0 : 140 * k++); } }); say('ดาวเคราะห์ชั้นใน 4 ดวงเป็นหิน · ชั้นนอก 4 ดวงเป็นแก๊ส', 'ok'); }
        else if (placed.rock.length + placed.gas.length === cs.length) reset();
      } });
    window.__glass.stack = { send: function (ty) { send(topCard(), ty); }, reset: reset, state: function () { return { rock: placed.rock.map(function (c) { return c.k; }), gas: placed.gas.map(function (c) { return c.k; }), top: topCard() && topCard().k }; }, cards: cs, moving: function () { return moving; } };
  })();

  /* ================= slide 5: glass bubbles orbit the glass Sun ================= */
  var orbs = $$('#g-sun .orb');
  if (orbs.length) (function () {
    var slide = orbs[0].closest('.slide'), C = { x: 600, y: 540 }, AU = [.39, .72, 1, 1.52, 5.2, 9.54, 19.2, 30.1];
    /* even spacing on screen (distances are NOT to scale); angular speed ∝ 1 / period, period ∝ a^1.5, squeezed so the
       outer ones still move: inner bubbles visibly lap the outer ones */
    var os = orbs.map(function (el) {
      var i = +el.dataset.i, it = itemOf(el), r = 268 + i * 39;
      return { el: el, it: it, i: i, rx: r, ry: r * .6, w: .55 / Math.pow(Math.pow(AU[i], 1.5), .45), ph: i * 2.3 };
    });
    function put(s) {
      os.forEach(function (o) {
        var a = o.ph + s * o.w, x = C.x + Math.cos(a) * o.rx, y = C.y + Math.sin(a) * o.ry;
        o.el.style.transform = 'translate(' + (x - 48).toFixed(1) + 'px,' + (y - 48).toFixed(1) + 'px)';
        o.el.style.zIndex = Math.sin(a) > 0 ? 6 : 3;
        var z = o.it.zoom;
        G.place(o.it, 'translate(' + (o.it.pad + 48 - z * x).toFixed(1) + 'px,' + (o.it.pad + 48 - z * y).toFixed(1) + 'px) scale(' + z + ')');
        o.it.cx = x; o.it.cy = y;
      });
    }
    put(4);
    G.hook({ slide: slide, active: function (on) { if (on) put(4); }, tick: function (s) { put(4 + s); } });
  })();

  G.refresh();
})();
