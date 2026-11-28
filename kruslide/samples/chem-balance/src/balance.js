/* balance.js · the live chemistry of the KruSlide balancing sample (vanilla JS, no libraries, no network).
   An Eq widget is built from data-eq="H2,O2|H2O": +/- coefficient steppers (1..6), formulas, ball models that multiply,
   atom tallies per element (reactants left, products right) that turn green when equal, and a status panel.
   When an equation is balanced, "ดูอะตอมจัดเรียงใหม่" flies every atom from the reactant molecules into the product
   molecules (conservation of mass). Controllers C[slide id] = { set(beat, previous beat or -1), leave() }.
   ?still (html.rm) = no motion: final states only. */
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

  /* chalk dust: drawn once on a canvas behind every slide (speckles, two eraser smudges, a few faint old strokes) */
  (function dust() {
    var st = document.getElementById('stage'), c = document.createElement('canvas'); c.id = 'dust'; c.width = 1920; c.height = 1080;
    st.insertBefore(c, st.firstChild);
    var x = c.getContext('2d'), seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    [[540, 760, 520, 0.035], [1500, 300, 600, 0.03], [1200, 900, 380, 0.025]].forEach(function (s) {
      var g = x.createRadialGradient(s[0], s[1], 0, s[0], s[1], s[2]); g.addColorStop(0, 'rgba(236,234,226,' + s[3] + ')'); g.addColorStop(1, 'rgba(236,234,226,0)');
      x.fillStyle = g; x.fillRect(0, 0, 1920, 1080);
    });
    x.lineCap = 'round';
    for (var k = 0; k < 5; k++) {   /* eraser sweeps */
      var y = 120 + rnd() * 840, x0 = rnd() * 900; x.strokeStyle = 'rgba(236,234,226,0.012)'; x.lineWidth = 50 + rnd() * 40;
      x.beginPath(); x.moveTo(x0, y); x.bezierCurveTo(x0 + 300, y - 40 + rnd() * 80, x0 + 600, y - 40 + rnd() * 80, x0 + 900 + rnd() * 300, y + rnd() * 40); x.stroke();
    }
    for (var i = 0; i < 26000; i++) { x.fillStyle = 'rgba(236,234,226,' + (0.02 + rnd() * 0.07).toFixed(3) + ')'; x.fillRect(rnd() * 1920, rnd() * 1080, 1 + rnd() * 1.6, 1 + rnd() * 1.6); }
  })();

  /* ---------------- molecules: ball positions (px from the molecule centre) ---------------- */
  var MOL = {
    H2: { f: 'H<sub>2</sub>', t: 'H₂', at: [['H', -14, 0], ['H', 14, 0]] },
    O2: { f: 'O<sub>2</sub>', t: 'O₂', at: [['O', -18, 0], ['O', 18, 0]] },
    N2: { f: 'N<sub>2</sub>', t: 'N₂', at: [['N', -17, 0], ['N', 17, 0]] },
    H2O: { f: 'H<sub>2</sub>O', t: 'H₂O', at: [['O', 0, -6], ['H', -23, 12], ['H', 23, 12]] },
    CH4: { f: 'CH<sub>4</sub>', t: 'CH₄', at: [['C', 0, 0], ['H', 0, -27], ['H', 27, 0], ['H', 0, 27], ['H', -27, 0]] },
    CO2: { f: 'CO<sub>2</sub>', t: 'CO₂', at: [['O', -34, 0], ['C', 0, 0], ['O', 34, 0]] },
    NH3: { f: 'NH<sub>3</sub>', t: 'NH₃', at: [['N', 0, 3], ['H', -23, 16], ['H', 23, 16], ['H', 0, -24]] }
  };
  var AR = { H: 12, O: 18, C: 18, N: 17 }, ORDER = ['C', 'N', 'H', 'O'];
  var ANAME = { H: 'H', O: 'O', C: 'C', N: 'N' };
  function count(m, e) { return MOL[m].at.filter(function (a) { return a[0] === e; }).length; }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  /* ---------------- the Eq widget ---------------- */
  var LAY = {
    'b1-eq': { k: 1.6, stepY: 296, formY: 406, band: [462, 732], cx: 660, cy: 748, row: 66, half: 330, st: [1250, 736, 574] },
    'b2-eq': { k: 1.15, stepY: 296, formY: 406, band: [462, 712], cx: 640, cy: 730, row: 62, half: 380, st: [1250, 730, 574] },
    'b3-eq': { k: 1.15, stepY: 282, formY: 388, band: [440, 640], cx: 610, cy: 650, row: 62, half: 300, st: [96, 846, 1080], wide: true }
  };
  function Eq(host) {
    var id = host.id, L = LAY[id], sides = host.dataset.eq.split('|').map(function (s) { return s.split(','); });
    var sp = [], cxs = host.dataset.cx.split(',').map(Number), ans = host.dataset.ans.split(',').map(Number), hide = !!host.dataset.hide;
    sides.forEach(function (list, side) { list.forEach(function (m) { sp.push({ m: m, side: side, n: 1, cx: cxs[sp.length], mols: [] }); }); });
    var els = []; sp.forEach(function (s) { MOL[s.m].at.forEach(function (a) { if (els.indexOf(a[0]) < 0) els.push(a[0]); }); });
    els.sort(function (a, b) { return ORDER.indexOf(a) - ORDER.indexOf(b); });
    var api = { sp: sp, els: els, ans: ans, onchange: null, busy: false }, shown = !hide;

    /* signs between the substances */
    sp.forEach(function (s, k) {
      if (!k) return; var prev = sp[k - 1], sg = H('div', 'sign ck2', s.side !== prev.side ? '→' : '+', host);
      sg.style.left = ((prev.cx + s.cx) / 2 - 60) + 'px'; sg.style.top = (L.formY - 52) + 'px';
      if (s.side !== prev.side) sg.classList.add('arrow');
    });
    /* steppers + formulas */
    sp.forEach(function (s, k) {
      var w = H('div', 'stp', null, host); w.style.left = (s.cx - 150) + 'px'; w.style.top = (L.stepY - 50) + 'px';
      var mi = H('button', 'pm', '−', w), nv = H('span', 'cf ck num y', '1', w), pl = H('button', 'pm', '+', w);
      mi.type = pl.type = 'button'; mi.setAttribute('aria-label', 'ลดเลขหน้า ' + MOL[s.m].t); pl.setAttribute('aria-label', 'เพิ่มเลขหน้า ' + MOL[s.m].t);
      tap(mi, function () { if (!api.busy) setN(k, s.n - 1, true); });
      tap(pl, function () { if (!api.busy) setN(k, s.n + 1, true); });
      s.nv = nv; s.mi = mi; s.pl = pl;
      var f = H('div', 'form ck', null, host); f.innerHTML = MOL[s.m].f; f.style.left = (s.cx - 160) + 'px'; f.style.top = (L.formY - 50) + 'px';
    });
    /* the ball band: one SVG for every substance, so atoms can fly between them */
    var bh = L.band[1] - L.band[0], svg = S('svg', { 'class': 'balls', viewBox: '0 0 1920 ' + bh, width: 1920, height: bh, 'aria-hidden': 'true' }, host);
    svg.style.top = L.band[0] + 'px';
    sp.forEach(function (s) { s.g = S('g', { 'class': 'sg' }, svg); });
    var fly = S('g', {}, svg);
    function ball(parent, e, x, y) {
      var R = AR[e] * L.k, c = S('circle', { 'class': 'ball e-' + e, cx: x, cy: y, r: R }, parent);
      S('circle', { 'class': 'shine', cx: x - R * 0.35, cy: y - R * 0.38, r: R * 0.28 }, parent);
      return c;
    }
    function molG(s) {
      var g = S('g', { 'class': 'mol' }, s.g);
      MOL[s.m].at.forEach(function (a) { ball(g, a[0], a[1] * L.k, a[2] * L.k); });
      return g;
    }
    function slots(s, n) {   /* where the n molecules sit: rows of up to 3, centred in the band */
      var cols = n <= 3 ? n : n === 4 ? 2 : 3, rows = Math.ceil(n / cols), cw = 96 * L.k, rh = 80 * L.k, out = [];
      for (var i = 0; i < n; i++) {
        var r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, n - r * cols);
        out.push([s.cx + (c - (inRow - 1) / 2) * cw, bh / 2 + (r - (rows - 1) / 2) * rh]);
      }
      return out;
    }
    function layout(s, an) {
      var pos = slots(s, s.n);
      while (s.mols.length < s.n) { var g = molG(s); g._new = true; s.mols.push(g); }
      while (s.mols.length > s.n) { var o = s.mols.pop(); if (an && !still()) { o.style.transform += ' scale(0)'; o.style.opacity = 0; (function (o) { setTimeout(function () { o.remove(); }, 450); })(o); } else o.remove(); }
      s.mols.forEach(function (g, i) {
        var t = 'translate(' + pos[i][0].toFixed(1) + 'px,' + pos[i][1].toFixed(1) + 'px)';
        if (g._new) {
          g._new = false; g.style.transition = 'none'; g.style.transform = t + ' scale(0)'; g.style.opacity = 0;
          g.getBoundingClientRect();
          g.style.transition = ''; requestAnimationFrame(function () { g.style.transform = t + ' scale(1)'; g.style.opacity = 1; });
          if (!an || still()) { g.style.transform = t + ' scale(1)'; g.style.opacity = 1; }
        } else g.style.transform = t + ' scale(1)';
      });
    }
    /* tallies */
    var rows = {}, tw = H('div', 'tally' + (hide ? ' hid' : ''), null, host);
    tw.style.left = (L.cx - L.half - 115) + 'px'; tw.style.top = L.cy + 'px'; tw.style.width = (2 * L.half + 150) + 'px';
    var hd = H('div', 'trow thead', null, tw); H('span', 'tl', '', hd);
    H('span', 'tbar l', 'สารตั้งต้น (ซ้าย)', hd); H('span', 'tsg', '', hd); H('span', 'tbar r', 'ผลิตภัณฑ์ (ขวา)', hd);
    els.forEach(function (e) {
      var r = H('div', 'trow', null, tw), lab = H('span', 'tl', null, r);
      var dot = H('i', 'tdot e-' + e, null, lab); lab.appendChild(document.createTextNode(ANAME[e]));
      var bl = H('span', 'tbar l', null, r), sg = H('span', 'tsg ck2', '≠', r), br = H('span', 'tbar r', null, r), nl = H('b', 'tn num', '0', bl), nr = H('b', 'tn num', '0', br);
      rows[e] = { r: r, nl: nl, nr: nr, bl: bl, br: br, sg: sg };
    });
    var hideMsg = H('div', 'thid', 'ตัวนับซ่อนอยู่ · นับเองก่อน แล้วกดตรวจคำตอบ', tw);
    function sq(bar, n, size, an, num) {   /* squares (one per atom) grow from the centre line; the count rides at their outer end */
      var qs = bar.getElementsByTagName('i');
      while (qs.length < n) { var q = H('i', an && !still() ? 'new' : '', null, null); bar.insertBefore(q, num); q.style.animationDelay = ((qs.length % 8) * 25) + 'ms'; }
      while (qs.length > n) qs[qs.length - 1].remove();
      [].forEach.call(qs, function (q) { q.style.width = q.style.height = size + 'px'; });
    }
    function tallies(an) {
      var res = {};
      els.forEach(function (e) {
        var l = 0, r = 0; sp.forEach(function (s) { var c = count(s.m, e) * s.n; if (s.side) r += c; else l += c; });
        res[e] = [l, r];
        var R = rows[e], m = Math.max(l, r), size = Math.max(9, Math.min(24, Math.floor((L.half - 90 - 4 * (m - 1)) / m)));
        R.nl.textContent = l; R.nr.textContent = r; sq(R.bl, l, size, an, R.nl); sq(R.br, r, size, an, R.nr);
        R.r.classList.toggle('same', l === r); R.sg.textContent = l === r ? '=' : '≠';
      });
      return res;
    }
    /* status panel */
    var st = H('div', 'status' + (L.wide ? ' wide' : ''), null, host);
    st.style.left = L.st[0] + 'px'; st.style.top = L.st[1] + 'px'; st.style.width = L.st[2] + 'px';
    var sBig = H('div', 'sbig ck2', '', st), sLine = H('div', 'sline num', '', st), sMsg = H('p', 'smsg', '', st), sBtns = H('div', 'sbtns ia', null, st);
    var bReact = null, bCheck = null, bShow = null, bReveal = null;
    if (hide) {
      bCheck = H('button', 'cb pri', 'ตรวจคำตอบ', sBtns); bShow = H('button', 'cb', 'ดูเฉลย', sBtns); bReveal = H('button', 'cb', 'แสดงตัวนับ', sBtns);
      bReveal.setAttribute('aria-pressed', 'false');
    } else bReact = H('button', 'cb pri', '▶ ดูอะตอมจัดเรียงใหม่', sBtns);
    var bReset = H('button', 'cb', 'เริ่มใหม่', sBtns);
    [bReact, bCheck, bShow, bReveal, bReset].forEach(function (b) { if (b) b.type = 'button'; });

    function eqText() {
      var t = '', prev = null;
      sp.forEach(function (s) { if (prev) t += s.side !== prev.side ? ' → ' : ' + '; t += (s.n > 1 ? s.n : '') + MOL[s.m].t; prev = s; });
      return t;
    }
    function state() {
      var res = tallies(false), bad = els.filter(function (e) { return res[e][0] !== res[e][1]; });
      var g = sp.reduce(function (a, s) { return gcd(a, s.n); }, 0);
      return { res: res, bad: bad, balanced: !bad.length, lowest: g === 1, g: g };
    }
    function status(an, checked) {
      var res = tallies(an), s = state();
      sLine.textContent = eqText();
      st.classList.toggle('ok', s.balanced && s.lowest);
      if (hide && !shown && !checked) { sBig.textContent = 'ลองดู'; sMsg.textContent = 'เปลี่ยนเลขหน้าสาร แล้วกดตรวจคำตอบ'; st.classList.remove('ok', 'no'); return s; }
      st.classList.toggle('no', !s.balanced);
      if (!s.balanced) {
        sBig.textContent = 'ยังไม่ดุล';
        sMsg.textContent = s.bad.map(function (e) { return e + ' ซ้าย ' + res[e][0] + ' · ขวา ' + res[e][1]; }).join('   ');
      } else if (!s.lowest) {
        sBig.textContent = 'ดุลแล้ว แต่…'; st.classList.remove('no');
        sMsg.textContent = 'เลขหน้าสารทุกตัวหารด้วย ' + s.g + ' ได้ ลดเป็นอัตราส่วนอย่างต่ำ';
      } else {
        sBig.textContent = 'ดุลแล้ว!';
        sMsg.textContent = 'อะตอมทุกชนิดซ้ายเท่ากับขวา';
      }
      if (bReact) bReact.disabled = !s.balanced;
      return s;
    }
    function setN(k, n, an) {
      n = clamp(n, 1, 6); var s = sp[k];
      if (n === s.n) { if (an && !still() && s.nv.animate) s.nv.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 260 }); return; }
      s.n = n; s.nv.textContent = n; s.mi.disabled = n <= 1; s.pl.disabled = n >= 6;
      if (an && !still() && s.nv.animate) s.nv.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' });
      layout(s, an); status(an);
      if (api.onchange) api.onchange();
    }
    function setAll(ns, an) { ns.forEach(function (n, k) { var s = sp[k]; s.n = clamp(n, 1, 6); s.nv.textContent = s.n; s.mi.disabled = s.n <= 1; s.pl.disabled = s.n >= 6; layout(s, an); }); status(an); }

    /* atoms regroup: every reactant ball flies (on an arc) to a ball of the same element in a product molecule */
    var RA = Anim();
    function atomsOf(side) {
      var out = [];
      sp.forEach(function (s) {
        if (s.side !== side) return; var pos = slots(s, s.n);
        pos.forEach(function (p) { MOL[s.m].at.forEach(function (a) { out.push({ e: a[0], x: p[0] + a[1] * L.k, y: p[1] + a[2] * L.k }); }); });
      });
      return out;
    }
    function react(done) {
      var s = state(); if (!s.balanced || api.busy) return;
      api.busy = true; host.classList.add('reacting');
      var A0 = atomsOf(0), A1 = atomsOf(1), pairs = [];
      els.forEach(function (e) {
        var a = A0.filter(function (q) { return q.e === e; }).sort(function (p, q) { return p.x - q.x; });
        var b = A1.filter(function (q) { return q.e === e; }).sort(function (p, q) { return p.x - q.x; });
        a.forEach(function (q, i) { pairs.push([q, b[i]]); });
      });
      fly.textContent = '';
      var balls = pairs.map(function (p) { var g = S('g', {}, fly); ball(g, p[0].e, 0, 0); g.setAttribute('transform', 'translate(' + p[0].x + ',' + p[0].y + ')'); return g; });
      sp.forEach(function (q) { q.g.style.transition = 'opacity .25s'; q.g.style.opacity = 0; });
      function end() {
        sp.forEach(function (q) { if (q.side) q.g.style.opacity = 1; });
        setTimeout(function () { fly.textContent = ''; sp.forEach(function (q) { q.g.style.opacity = 1; }); host.classList.remove('reacting'); api.busy = false; if (done) done(); }, still() ? 0 : 500);
      }
      if (still()) { end(); return; }
      var dur = 1500 + pairs.length * 18;
      RA.run(dur, function (p) {
        balls.forEach(function (g, i) {
          var a = pairs[i][0], b = pairs[i][1], d = i * 18 / dur, t = clamp((p - d) / (1 - pairs.length * 18 / dur), 0, 1), e = eio(t);
          var lift = -90 - (i % 3) * 22, x = lerp(a.x, b.x, e), y = lerp(a.y, b.y, e) + lift * 4 * e * (1 - e);
          g.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')');
        });
      }, end);
    }
    function reset() { RA.stop(); fly.textContent = ''; sp.forEach(function (q) { q.g.style.opacity = 1; }); host.classList.remove('reacting'); api.busy = false; setAll(sp.map(function () { return 1; }), true); }
    function reveal(on) {
      shown = on; tw.classList.toggle('hid', hide && !on);
      if (bReveal) { bReveal.setAttribute('aria-pressed', on ? 'true' : 'false'); bReveal.textContent = on ? 'ซ่อนตัวนับ' : 'แสดงตัวนับ'; }
      status(true);
    }
    if (bReact) tap(bReact, function () { react(); });
    tap(bReset, function () { if (!api.busy) { reset(); if (hide) reveal(false); } });
    if (bCheck) tap(bCheck, function () {
      var s = status(false, true);
      if (!s.balanced) { sBig.textContent = 'ยังไม่ดุล'; sMsg.textContent = 'ลองนับ ' + s.bad.join(' และ ') + ' ทั้งสองข้างอีกครั้ง'; }
      if (!still() && st.animate) st.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 300 });
    });
    if (bShow) tap(bShow, function () { setAll(ans, true); reveal(true); });
    if (bReveal) tap(bReveal, function () { reveal(!shown); });
    setAll(sp.map(function () { return 1; }), false);
    api.setN = setN; api.setAll = setAll; api.react = react; api.reset = reset; api.state = state; api.reveal = reveal; api.rows = rows;
    api.n = function () { return sp.map(function (s) { return s.n; }); };
    return api;
  }

  var C = {}, EQ = {};
  $$('.eq[data-eq]').forEach(function (h) { EQ[h.id] = Eq(h); });

  /* ============ 1 · water ============ */
  C['b-water'] = (function () {
    var q = EQ['b1-eq'], T1 = [];
    function clear() { T1.forEach(clearTimeout); T1 = []; }
    return {
      set: function (st, prev) {
        clear();
        if (st === 1 && prev === 0) {
          var bal = q.state().balanced;
          if (!bal) { q.setAll(q.ans, true); }
          T1.push(setTimeout(function () { q.react(); }, bal ? 300 : 900));
        } else if (st >= 1 && prev < 0) q.setAll(q.ans, false);
        var s = q.state(); $('#b1-mh').textContent = s.res.H[0]; $('#b1-mo').textContent = s.res.O[0];
      },
      leave: clear
    };
  })();

  /* ============ 2 · methane: the worked method plays on beat 2 ============ */
  C['b-methane'] = (function () {
    var q = EQ['b2-eq'], T2 = [], items = $$('#b2-plan li');
    function mark(k) { items.forEach(function (li) { li.classList.toggle('act', li.dataset.k === k); li.classList.toggle('done', k === 'all' || (k === 'H' && li.dataset.k === 'C') || (k === 'O' && li.dataset.k !== 'O')); }); }
    function hl(e) { Object.keys(q.rows).forEach(function (k) { q.rows[k].r.classList.toggle('hl', k === e); }); }
    function clear() { T2.forEach(clearTimeout); T2 = []; }
    var STEPS = [[[1, 1, 1, 1], 'C'], [[1, 1, 1, 2], 'H'], [[1, 2, 1, 2], 'O']];
    function play() {
      clear(); q.setAll([1, 1, 1, 1], true); mark(''); hl('');
      if (still()) { q.setAll([1, 2, 1, 2], false); mark('all'); return; }
      STEPS.forEach(function (s, i) {
        T2.push(setTimeout(function () { mark(s[1]); hl(s[1]); }, 700 + i * 2200));
        T2.push(setTimeout(function () { q.setAll(s[0], true); }, 1500 + i * 2200));
      });
      T2.push(setTimeout(function () { mark('all'); hl(''); }, 700 + 3 * 2200));
    }
    return {
      set: function (st, prev) {
        if (st === 2 && prev === 1) play();
        else if (st === 2) { clear(); q.setAll([1, 2, 1, 2], false); mark('all'); hl(''); }
        else { clear(); mark(''); hl(''); }
      },
      leave: function () { clear(); hl(''); }
    };
  })();

  /* ============ 3 · try it: beat 1 shows both answers ============ */
  C['b-try'] = (function () {
    var q = EQ['b3-eq'];
    return {
      set: function (st, prev) {
        var w = $('#b3-in').__w;
        if (st === 1) { q.setAll(q.ans, prev >= 0); q.reveal(true); if (w) w.show(); }
        else if (prev === 1) { if (w) w.hide(); }
      },
      leave: function () {}
    };
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
  window.__bal = { C: C, EQ: EQ };
})();
