/* periodic.js · the live chemistry of the KruSlide periodic-table sample (vanilla JS, no libraries, no network).
   Every slide has a controller C[id] = { set(beat, previous beat or -1 on entering), leave() }.
   1 · table: 118 cells built from the data below; tap = element card (Bohr model with orbiting electrons for Z 1–20); filter pills.
   2 · shells: drag Z from 1 to 20 anywhere on the bar; electrons fill the shells 2, 8, 8, 2; the mini table and the rules follow.
   3 · molecule builder: drag H / O / C from the tray; a bond snaps to a free arm; bond orders fill in by themselves (O=C=O).
   Facts: standard atomic masses (IUPAC, rounded as in Thai textbooks); neutrons = the most common isotope;
   shells for Z ≤ 20 fill 2, 8, 8, then the 4th shell (K = 2, 8, 8, 1; Ca = 2, 8, 8, 2), as taught in ม.4.
   ?still (html.rm) = no motion: final states only (screenshots, reduced motion). */
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

  /* ---------------- data ---------------- */
  var SYM = ('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe ' +
    'Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr ' +
    'Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og').split(' ');
  var EN = ('Hydrogen Helium Lithium Beryllium Boron Carbon Nitrogen Oxygen Fluorine Neon Sodium Magnesium Aluminium Silicon Phosphorus Sulfur Chlorine Argon Potassium Calcium ' +
    'Scandium Titanium Vanadium Chromium Manganese Iron Cobalt Nickel Copper Zinc Gallium Germanium Arsenic Selenium Bromine Krypton Rubidium Strontium Yttrium Zirconium ' +
    'Niobium Molybdenum Technetium Ruthenium Rhodium Palladium Silver Cadmium Indium Tin Antimony Tellurium Iodine Xenon Caesium Barium Lanthanum Cerium Praseodymium Neodymium ' +
    'Promethium Samarium Europium Gadolinium Terbium Dysprosium Holmium Erbium Thulium Ytterbium Lutetium Hafnium Tantalum Tungsten Rhenium Osmium Iridium Platinum Gold Mercury ' +
    'Thallium Lead Bismuth Polonium Astatine Radon Francium Radium Actinium Thorium Protactinium Uranium Neptunium Plutonium Americium Curium Berkelium Californium Einsteinium Fermium ' +
    'Mendelevium Nobelium Lawrencium Rutherfordium Dubnium Seaborgium Bohrium Hassium Meitnerium Darmstadtium Roentgenium Copernicium Nihonium Flerovium Moscovium Livermorium Tennessine Oganesson').split(' ');
  var TH = 'ไฮโดรเจน ฮีเลียม ลิเทียม เบริลเลียม โบรอน คาร์บอน ไนโตรเจน ออกซิเจน ฟลูออรีน นีออน โซเดียม แมกนีเซียม อะลูมิเนียม ซิลิคอน ฟอสฟอรัส กำมะถัน คลอรีน อาร์กอน โพแทสเซียม แคลเซียม'.split(' ');
  var THX = { 26: 'เหล็ก', 28: 'นิกเกิล', 29: 'ทองแดง', 30: 'สังกะสี', 35: 'โบรมีน', 36: 'คริปทอน', 47: 'เงิน', 50: 'ดีบุก', 53: 'ไอโอดีน', 54: 'ซีนอน', 78: 'แพลทินัม', 79: 'ทองคำ', 80: 'ปรอท', 82: 'ตะกั่ว', 86: 'เรดอน', 92: 'ยูเรเนียม' };
  var MASS = ['1.008', '4.003', '6.94', '9.012', '10.81', '12.01', '14.01', '16.00', '19.00', '20.18', '22.99', '24.31', '26.98', '28.09', '30.97', '32.06', '35.45', '39.95', '39.10', '40.08'];
  var NEUT = [0, 2, 4, 5, 6, 6, 7, 8, 10, 10, 12, 12, 14, 14, 16, 16, 18, 22, 20, 20];
  var NON = [1, 6, 7, 8, 9, 15, 16, 17, 34, 35, 53, 85], SEMI = [5, 14, 32, 33, 51, 52], NOBLE = [2, 10, 18, 36, 54, 86];
  var CATN = { metal: 'โลหะ', semi: 'กึ่งโลหะ', non: 'อโลหะ', noble: 'แก๊สมีตระกูล', unk: 'ยังไม่ทราบสมบัติแน่ชัด' };
  var ROMAN = { 1: 'IA', 2: 'IIA', 13: 'IIIA', 14: 'IVA', 15: 'VA', 16: 'VIA', 17: 'VIIA', 18: 'VIIIA' };
  if (SYM.length !== 118 || EN.length !== 118) console.error('periodic.js: element data is incomplete');
  function cat(z) { return z >= 109 ? 'unk' : NOBLE.indexOf(z) >= 0 ? 'noble' : SEMI.indexOf(z) >= 0 ? 'semi' : NON.indexOf(z) >= 0 ? 'non' : 'metal'; }
  /* place in the table: [row, col]; rows 8 and 9 are the two f-block rows drawn under the table */
  function place(z) {
    if (z === 1) return [1, 1]; if (z === 2) return [1, 18];
    if (z <= 4) return [2, z - 2]; if (z <= 10) return [2, z + 8];
    if (z <= 12) return [3, z - 10]; if (z <= 18) return [3, z];
    if (z <= 36) return [4, z - 18]; if (z <= 54) return [5, z - 36];
    if (z <= 56) return [6, z - 54]; if (z <= 71) return [8, z - 54]; if (z <= 86) return [6, z - 68];
    if (z <= 88) return [7, z - 86]; if (z <= 103) return [9, z - 86]; return [7, z - 100];
  }
  function shells(z) { var caps = [2, 8, 8, 2], out = [], left = z; for (var i = 0; i < 4 && left > 0; i++) { var n = Math.min(caps[i], left); out.push(n); left -= n; } return out; }
  function periodOf(z) { var p = place(z); return p[0] > 7 ? p[0] - 2 : p[0]; }
  function groupOf(z) { var p = place(z); return p[0] > 7 ? 0 : p[1]; }
  function groupText(z) { var g = groupOf(z); if (!g) return place(z)[0] === 8 ? 'กลุ่มแลนทาไนด์' : 'กลุ่มแอกทิไนด์'; return g + (ROMAN[g] ? ' (' + ROMAN[g] + ')' : ''); }
  function typeText(z) {
    var c = cat(z), p = place(z);
    if (c !== 'metal') return CATN[c];
    if (p[0] === 8) return 'โลหะ · แลนทาไนด์'; if (p[0] === 9) return 'โลหะ · แอกทิไนด์';
    if (p[1] >= 3 && p[1] <= 12) return 'โลหะ · ธาตุแทรนซิชัน';
    return 'โลหะ';
  }
  function nameTH(z) { return z <= 20 ? TH[z - 1] : (THX[z] || EN[z - 1]); }
  /* the teaching line: shells -> period, outer electrons -> group A */
  function tip(z) {
    if (z > 20) return '';
    var sh = shells(z), n = sh.length, v = sh[n - 1];
    if (z === 2) return '1 ชั้น → คาบ 1 · ชั้นนอกเต็ม 2 ตัว → หมู่ VIIIA';
    return n + ' ชั้น → คาบ ' + n + ' · วงนอกสุด ' + v + ' ตัว → หมู่ ' + ROMAN[groupOf(z)];
  }

  /* ---------------- Bohr model: rings + spinning electron groups; set(z, animate) re-spaces electrons with a tween ---------------- */
  function Bohr(svg, R, er, nucR) {
    var g = S('g', {}, svg), rings = [], spins = [], dots = [[], [], [], []], ang = [[], [], [], []], A = Anim();
    var speeds = [9, 15, 22, 30];
    for (var i = 0; i < 4; i++) {
      rings.push(S('circle', { 'class': 'ring', r: R[i], cx: 0, cy: 0 }, g));
      var sp = S('g', { 'class': 'spin' }, g); sp.style.animationDuration = speeds[i] + 's';
      S('circle', { r: R[i] + er + 1, fill: 'none', stroke: 'none' }, sp);   /* keeps the spinning box centred on the nucleus */
      spins.push(sp);
    }
    S('circle', { 'class': 'nuc', r: nucR }, g);
    var tp = T({ 'class': 'nuct', y: -3 }, '', g), tn = T({ 'class': 'nuct s', y: nucR * 0.48 }, '', g);
    function pos(i) {
      dots[i].forEach(function (d, k) { var a = ang[i][k] * Math.PI / 180; d.setAttribute('cx', (R[i] * Math.cos(a)).toFixed(2)); d.setAttribute('cy', (R[i] * Math.sin(a)).toFixed(2)); });
    }
    function pop(d) { d.style.transformBox = 'fill-box'; d.style.transformOrigin = 'center'; if (!still() && d.animate) d.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.6)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)' }], { duration: 480, easing: 'ease-out' }); }
    function gone(d, an) {
      if (!an || still() || !d.animate) { d.remove(); return; }
      d.style.transformBox = 'fill-box'; d.style.transformOrigin = 'center';
      d.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0)', opacity: 0 }], { duration: 300, fill: 'forwards' }).onfinish = function () { d.remove(); };
    }
    return {
      set: function (z, an) {
        var sh = shells(z), from = [], to = [];
        for (var i = 0; i < 4; i++) {
          var n = sh[i] || 0;
          rings[i].classList.toggle('vis', n > 0); rings[i].style.opacity = n > 0 ? 1 : 0.35;
          from.push(ang[i].slice());
          while (dots[i].length < n) { var d = S('circle', { 'class': 'elec', r: er }, spins[i]); dots[i].push(d); from[i].push(null); if (an) pop(d); }
          while (dots[i].length > n) { gone(dots[i].pop(), an); from[i].pop(); }
          to.push([]); for (var k = 0; k < n; k++) to[i].push(-90 + 360 * k / n);
          var last = i === sh.length - 1;
          dots[i].forEach(function (d) { d.classList.toggle('val', last); });
          ang[i] = to[i].map(function (t, k2) { return from[i][k2] == null ? t : from[i][k2]; });
        }
        A.run(an ? 460 : 0, function (p) {
          var e = eio(p);
          for (var i = 0; i < 4; i++) {
            for (var k = 0; k < to[i].length; k++) { var f = from[i][k]; if (f == null) { ang[i][k] = to[i][k]; continue; } var d = ((to[i][k] - f) % 360 + 540) % 360 - 180; ang[i][k] = f + d * e; }
            pos(i);
          }
        });
        tp.textContent = z + 'p'; tn.textContent = NEUT[z - 1] + 'n';
      }
    };
  }

  var C = {};

  /* ============ 1 · the periodic table ============ */
  C['p-table'] = (function () {
    var tab = $('#p1-tab'), card = $('#p1-card'), P = 68, cells = {}, sel = 0;
    var bohr = Bohr($('#p1-bohr'), [52, 92, 132, 170], 8, 34);
    function xy(r, c) { return [(c - 1) * P, r <= 7 ? (r - 1) * P : 7 * P + 20 + (r - 8) * P]; }
    for (var z = 1; z <= 118; z++) {
      var p = place(z), q = xy(p[0], p[1]), b = H('button', 'el ' + cat(z) + (z <= 20 ? ' top' : ''), null, tab);
      b.type = 'button'; b.style.left = q[0] + 'px'; b.style.top = q[1] + 'px';
      b.style.setProperty('--z', z); b.style.setProperty('--c', p[1]);
      H('i', '', z, b); H('b', '', SYM[z - 1], b); if (z <= 20) H('s', '', MASS[z - 1], b);
      b.dataset.z = z; b.setAttribute('aria-label', SYM[z - 1] + ' ' + nameTH(z) + ' เลขอะตอม ' + z + ' ' + CATN[cat(z)]);
      cells[z] = b;
    }
    [[6, '57–71'], [7, '89–103']].forEach(function (a) { var q = xy(a[0], 3), b = H('div', 'el ph', null, tab); b.style.left = q[0] + 'px'; b.style.top = q[1] + 'px'; H('b', '', a[1], b); });
    for (var g = 1; g <= 18; g++) { var gn = H('div', 'gn', g, tab); gn.style.left = (g - 1) * P + 'px'; }
    for (var r = 1; r <= 7; r++) { var pn = H('div', 'pn', r, tab); pn.style.top = (r - 1) * P + 'px'; }
    [['แลนทาไนด์', 8], ['แอกทิไนด์', 9]].forEach(function (a) { var f = H('div', 'fl', a[0], tab), q = xy(a[1], 1); f.style.left = q[0] + 'px'; f.style.top = (q[1] + 24) + 'px'; });
    /* the staircase between metals and non-metals, along the left/bottom edges of the metalloids */
    function ex(c) { return (c - 1) * P - 2; } function ey(r) { return (r - 1) * P - 2; }
    $('#p1-stp').setAttribute('d', 'M' + ex(13) + ' 20 L' + ex(13) + ' ' + ey(3) + ' L' + ex(14) + ' ' + ey(3) + ' L' + ex(14) + ' ' + ey(5) + ' L' + ex(15) + ' ' + ey(5) +
      ' L' + ex(15) + ' ' + ey(6) + ' L' + ex(17) + ' ' + ey(6) + ' L' + ex(17) + ' ' + ey(7));
    var tag = $('#p1-sttag'); tag.style.left = (96 + ex(13) - 52) + 'px'; tag.style.top = (272 - 6) + 'px';

    function show(z, an) {
      if (sel && cells[sel]) cells[sel].classList.remove('sel');
      sel = z; cells[z].classList.add('sel');
      $('#p1-cz').textContent = z; $('#p1-cs').textContent = SYM[z - 1];
      $('#p1-cn').textContent = nameTH(z); $('#p1-ce').textContent = z <= 20 || THX[z] ? EN[z - 1] : 'ธาตุลำดับที่ ' + z;
      $('#p1-cm').textContent = z <= 20 ? MASS[z - 1] : '—';
      $('#p1-cg').textContent = groupText(z); $('#p1-cp').textContent = periodOf(z);
      $('#p1-ca').textContent = z <= 20 ? shells(z).join(', ') : '—';
      $('#p1-ct').textContent = typeText(z);
      $('#p1-tip').textContent = tip(z);
      card.classList.toggle('far', z > 20);
      if (z <= 20) bohr.set(z, an);
      if (an && !still() && card.animate) $('#p1-cs').animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
    tab.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.el[data-z]') : null; if (!b) return;
      e.stopPropagation(); show(+b.dataset.z, true);
    });
    var pills = $$('#p1-flt .pill');
    pills.forEach(function (b) {
      tap(b, function () { pills.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); }); tab.dataset.f = b.dataset.f; });
    });
    show(11, false);
    return { set: function () {}, leave: function () {}, show: show };
  })();

  /* ============ 2 · electron shells, Z = 1..20 ============ */
  C['p-shells'] = (function () {
    var bohr = Bohr($('#p2-bohr'), [72, 138, 204, 266], 12, 48), A = Anim(), z = 0;
    var mini = $('#p2-mini'), cols = [1, 2, 13, 14, 15, 16, 17, 18], MC = {}, Q = 96;
    cols.forEach(function (g, k) { var h = H('div', 'mh', null, mini); h.style.left = k * Q + 'px'; H('b', '', g, h); h.appendChild(document.createTextNode(ROMAN[g])); });
    for (var r = 1; r <= 4; r++) { var pn = H('div', 'mp', r, mini); pn.style.top = (54 + (r - 1) * Q) + 'px'; }
    for (var zz = 1; zz <= 20; zz++) {
      var p = place(zz), c = H('div', 'mc', null, mini);
      c.style.left = cols.indexOf(p[1]) * Q + 'px'; c.style.top = (54 + (p[0] - 1) * Q) + 'px';
      H('i', '', zz, c); H('b', '', SYM[zz - 1], c); MC[zz] = c;
    }
    var hiR = H('div', 'hi', null, mini), hiC = H('div', 'hi', null, mini);
    var trk = $('#p2-trk'), inr = $('#p2-in'), ticks = $('#p2-ticks');
    for (var t = 1; t <= 20; t++) {
      var x = ((t - 1) / 19 * 100).toFixed(3) + '%', s = H('span', [1, 3, 11, 19].indexOf(t) >= 0 ? 'p' : '', t, ticks); s.style.left = x;
      var i2 = H('i', '', null, ticks); i2.style.left = x;
    }
    function setZ(nz, an) {
      nz = clamp(Math.round(nz), 1, 20); if (nz === z) return; z = nz;
      bohr.set(z, an);
      var sh = shells(z), n = sh.length, v = sh[n - 1], g = groupOf(z), pc = ((z - 1) / 19 * 100).toFixed(3) + '%';
      $('#p2-sym').textContent = SYM[z - 1]; $('#p2-nm').textContent = TH[z - 1];
      $('#p2-zz').textContent = 'Z = ' + z + ' · โปรตอน ' + z + ' · อิเล็กตรอน ' + z;
      var arr = $('#p2-arr'); arr.textContent = '';
      sh.forEach(function (x2, k) { if (k) arr.appendChild(document.createTextNode(', ')); if (k === n - 1) H('em', '', x2, arr); else arr.appendChild(document.createTextNode(x2)); });
      $('#p2-nsh').textContent = n; $('#p2-per').textContent = n; $('#p2-val').textContent = v;
      var gd = $('#p2-grp'); gd.textContent = '→ อยู่'; H('b', '', 'หมู่ ' + g + ' (' + ROMAN[g] + ')' + (z === 2 ? ' ชั้นนอกเต็ม' : ''), gd);
      for (var k = 1; k <= 20; k++) { MC[k].classList.toggle('done', k < z); MC[k].classList.toggle('now', k === z); }
      var pr = place(z), ci = cols.indexOf(pr[1]);
      hiR.style.cssText = 'left:-6px;top:' + (54 + (pr[0] - 1) * Q - 6) + 'px;width:' + (8 * Q + 4) + 'px;height:100px';
      hiC.style.cssText = 'left:' + (ci * Q - 6) + 'px;top:-6px;width:100px;height:' + (54 + pr[0] * Q + 4) + 'px';
      $('#p2-th').style.left = pc; $('#p2-fill').style.width = pc; $('#p2-tv').textContent = z;
      trk.setAttribute('aria-valuenow', z); trk.setAttribute('aria-valuetext', SYM[z - 1] + ' ' + sh.join(', '));
    }
    slider(trk, inr, 1, 20, 1, function (v) { A.stop(); setZ(v, true); });
    setZ(11, false);
    return {
      set: function (st, prev) {
        if (st === 1 && prev === 0 && !still()) {
          setZ(1, true);
          A.run(9500, function (p) { setZ(1 + Math.min(19, Math.floor(p * 20)), true); });
        } else if (st === 1 && prev < 0) { A.stop(); setZ(20, false); }
        else if (st === 1 && still()) setZ(20, false);
        else if (st === 0 && prev < 0) { A.stop(); setZ(11, false); }
        else if (st === 2) { A.stop(); }
      },
      leave: function () { A.stop(); }
    };
  })();

  /* ============ 3 · build a molecule ============ */
  C['p-mol'] = (function () {
    var svg = $('#p3-svg'), VAL = { H: 1, O: 2, C: 4 }, SITES = { H: [0], O: [0, 104.5], C: [0, 90, 180, 270] }, RAD = { H: 34, O: 42, C: 42 }, L = 130;
    var TRAY = { H: [110, 210], O: [110, 420], C: [110, 630] }, WX0 = 236, WX1 = 1206, WY0 = 14, WY1 = 786;
    var GOAL = {
      h2o: { n: { H: 2, O: 1, C: 0 }, goal: 'น้ำ: O 1 อะตอม ต่อกับ H 2 อะตอม', name: 'H<sub>2</sub>O',
        info: [['พันธะ', 'เดี่ยว 2 พันธะ (O–H)'], ['อิเล็กตรอนคู่ร่วมพันธะ', '2 คู่'], ['รูปร่างโมเลกุล', 'มุมงอ 104.5°']] },
      co2: { n: { H: 0, O: 2, C: 1 }, goal: 'คาร์บอนไดออกไซด์: C 1 อะตอม ต่อกับ O 2 อะตอม', name: 'CO<sub>2</sub>',
        info: [['พันธะ', 'คู่ 2 พันธะ (O=C=O)'], ['อิเล็กตรอนคู่ร่วมพันธะ', '4 คู่'], ['รูปร่างโมเลกุล', 'เส้นตรง 180°']] },
      ch4: { n: { H: 4, O: 0, C: 1 }, goal: 'มีเทน: C 1 อะตอม ต่อกับ H 4 อะตอม', name: 'CH<sub>4</sub>',
        info: [['พันธะ', 'เดี่ยว 4 พันธะ (C–H)'], ['อิเล็กตรอนคู่ร่วมพันธะ', '4 คู่'], ['รูปร่างโมเลกุล', 'ทรงสี่หน้า 109.5° (ภาพนี้วาดแบบ 2 มิติ)']] }
    };
    var goal = 'h2o', atoms = [], bonds = [], uid = 0, held = null, off = [0, 0], busy = false, A = Anim(), timers = [];
    var defs = S('defs', {}, svg), pat = S('pattern', { id: 'p3-dots', width: 32, height: 32, patternUnits: 'userSpaceOnUse', x: WX0, y: WY0 }, defs);
    S('rect', { width: 32, height: 32, fill: '#fff' }, pat); S('circle', { cx: 16, cy: 16, r: 1.6, fill: '#C9D2D8' }, pat);
    S('rect', { 'class': 'wsp', x: WX0, y: WY0, width: WX1 - WX0, height: WY1 - WY0, rx: 4 }, svg);
    S('rect', { 'class': 'tray', x: 14, y: 14, width: 192, height: 772, rx: 4 }, svg);
    T({ 'class': 'tlab', x: 110, y: 76, 'text-anchor': 'middle' }, 'ถาดอะตอม', svg);
    var gX = S('g', {}, svg), gB = S('g', {}, svg), gA = S('g', {}, svg), snapC = S('circle', { 'class': 'snap', r: 52, opacity: 0 }, svg);
    var fb = $('#p3-fb'), info = $('#p3-info'), countEl = $('#p3-count');

    function atomG(t, parent) { var g = S('g', { 'class': 'atom t-' + t }, parent); g._st = S('g', {}, g); S('circle', { 'class': 'a-c', r: RAD[t] }, g); T({ 'class': 'a-t' }, t, g); return g; }
    function stub(g, t, deg) { var r = deg * Math.PI / 180, a = RAD[t] + 3, b = RAD[t] + 24; S('line', { 'class': 'stub', x1: a * Math.cos(r), y1: a * Math.sin(r), x2: b * Math.cos(r), y2: b * Math.sin(r) }, g); }
    ['H', 'O', 'C'].forEach(function (t) {
      var g = atomG(t, svg), p = TRAY[t], base = t === 'O' ? 37.75 : 0;
      g.setAttribute('transform', 'translate(' + p[0] + ',' + p[1] + ')'); g.dataset.tray = t; g.setAttribute('aria-label', 'อะตอม ' + t);
      SITES[t].forEach(function (s) { stub(g._st, t, base + s); });
      T({ 'class': 'tval', x: p[0], y: p[1] + 92, 'text-anchor': 'middle' }, VAL[t] + ' แขน', svg);
    });

    function byId(id) { for (var i = 0; i < atoms.length; i++) if (atoms[i].id === id) return atoms[i]; return null; }
    function mk(t, x, y) {
      var a = { id: ++uid, t: t, x: x, y: y, rot: t === 'O' ? 37.75 : 0, dir: 1, g: atomG(t, gA) };
      a.g.dataset.atom = a.id; atoms.push(a); put(a); return a;
    }
    function put(a) { a.g.setAttribute('transform', 'translate(' + a.x.toFixed(1) + ',' + a.y.toFixed(1) + ')'); }
    function sAng(a, k) { return a.rot + a.dir * SITES[a.t][k]; }
    function sPos(a, k) { var r = sAng(a, k) * Math.PI / 180; return [a.x + L * Math.cos(r), a.y + L * Math.sin(r)]; }
    function bondsOf(a) { return bonds.filter(function (b) { return b.a === a || b.b === a; }); }
    function used(a, k) { return bonds.some(function (b) { return (b.a === a && b.sa === k) || (b.b === a && b.sb === k); }); }
    function free(a) { return VAL[a.t] - bondsOf(a).reduce(function (s, b) { return s + b.order; }, 0); }
    function inside(p, m) { return p[0] > WX0 + m && p[0] < WX1 - m && p[1] > WY0 + m && p[1] < WY1 - m; }
    function blocked(p, skip) { return atoms.some(function (o) { return o !== skip && Math.hypot(o.x - p[0], o.y - p[1]) < L * 0.72; }); }
    function openSites(a, skip) {
      if (bondsOf(a).length >= VAL[a.t]) return [];
      var out = [];
      SITES[a.t].forEach(function (s, k) { if (used(a, k)) return; var p = sPos(a, k); if (inside(p, 36) && !blocked(p, skip)) out.push(k); });
      return out;
    }
    function findSnap(d) {
      var best = null, bd = 95;
      if (VAL[d.t] < 1) return null;
      atoms.forEach(function (a) {
        if (a === d) return;
        openSites(a, d).forEach(function (k) { var p = sPos(a, k), dd = Math.hypot(p[0] - d.x, p[1] - d.y); if (dd < bd) { bd = dd; best = { a: a, k: k, p: p }; } });
      });
      return best;
    }
    function attach(d, s) {
      var ang = sAng(s.a, s.k);
      d.rot = ang + 180; d.dir = 1;
      if (d.t === 'O') {   /* the bent arm goes where there is room; ties go upwards */
        var score = [1, -1].map(function (dir) { d.dir = dir; var p = [s.p[0] + L * Math.cos(sAng(d, 1) * Math.PI / 180), s.p[1] + L * Math.sin(sAng(d, 1) * Math.PI / 180)];
          return (inside(p, 36) ? 0 : 1000) + (blocked(p, d) ? 500 : 0) + p[1] * 0.01; });
        d.dir = score[0] <= score[1] ? 1 : -1;
      }
      bonds.push({ a: s.a, b: d, sa: s.k, sb: 0, order: 1, fresh: true });
    }
    function orders() {
      bonds.forEach(function (b) { b.order = 1; });
      var ch = true; while (ch) { ch = false; bonds.forEach(function (b) { if (b.order < 3 && free(b.a) > 0 && free(b.b) > 0) { b.order++; ch = true; } }); }
    }
    function draw() {
      gB.textContent = '';
      bonds.forEach(function (b) {
        var dx = b.b.x - b.a.x, dy = b.b.y - b.a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
        var offs = b.order === 1 ? [0] : b.order === 2 ? [-9, 9] : [-14, 0, 14];
        offs.forEach(function (o) {
          var l = S('line', { 'class': 'bond', x1: b.a.x + nx * o, y1: b.a.y + ny * o, x2: b.b.x + nx * o, y2: b.b.y + ny * o, pathLength: 1 }, gB);
          if (b.fresh && !still() && l.animate) l.animate([{ strokeDasharray: '0 1' }, { strokeDasharray: '1 0' }], { duration: 380, easing: 'ease-out' });
        });
        b.fresh = false;
      });
      atoms.forEach(function (a) {
        a.g._st.textContent = '';
        var f = free(a), ks = SITES[a.t].map(function (s, k) { return k; }).filter(function (k) { return !used(a, k); });
        ks.slice(0, Math.max(0, f)).forEach(function (k) { stub(a.g._st, a.t, sAng(a, k)); });
      });
      counts();
    }
    function tally() { var n = { H: 0, O: 0, C: 0 }; atoms.forEach(function (a) { n[a.t]++; }); return n; }
    function counts() {
      var n = tally(), G = GOAL[goal].n; countEl.textContent = '';
      ['C', 'O', 'H'].forEach(function (t) { if (!G[t] && !n[t]) return; var s = H('span', n[t] === G[t] ? 'ok' : '', null, countEl); s.appendChild(document.createTextNode(t + ' ')); H('b', '', n[t], s); s.appendChild(document.createTextNode(' / ' + G[t])); });
    }
    function say(k, m) { fb.className = 'p3-fb' + (k ? ' ' + k : ''); fb.textContent = m || ''; }
    function clearResult() { info.classList.remove('show'); gX.textContent = ''; }
    function shake(a) { var c = a.g.querySelector('.a-c'); c.style.transformBox = 'fill-box'; c.style.transformOrigin = 'center'; if (!still() && c.animate) c.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 320 }); }
    function remove(a, an) {
      bonds = bonds.filter(function (b) { return b.a !== a && b.b !== a; }); atoms.splice(atoms.indexOf(a), 1);
      if (an && !still() && a.g.animate) { a.g.style.transition = 'opacity .3s'; a.g.style.opacity = 0; setTimeout(function () { a.g.remove(); }, 320); } else a.g.remove();
    }
    function glide(a, to, ms, done) {
      var x0 = a.x, y0 = a.y;
      if (still()) { a.x = to[0]; a.y = to[1]; put(a); if (done) done(); return; }
      var t0 = null; (function f(t) { if (t0 === null) t0 = t; var p = Math.min(1, (t - t0) / ms), e = eo(p); a.x = lerp(x0, to[0], e); a.y = lerp(y0, to[1], e); put(a); draw(); if (p < 1) requestAnimationFrame(f); else if (done) done(); })(performance.now());
    }
    function drop(a, ok) {
      snapC.setAttribute('opacity', 0);
      var s = ok ? findSnap(a) : null;
      if (s) { attach(a, s); orders(); glide(a, s.p, 220, function () { draw(); }); draw(); say('', ''); return; }
      var room = atoms.every(function (o) { return o === a || Math.hypot(o.x - a.x, o.y - a.y) > RAD[o.t] + RAD[a.t] + 12; });
      if (ok && inside([a.x, a.y], RAD[a.t] + 4) && room) { orders(); draw(); return; }
      remove(a, true); orders(); draw();
    }
    drag(svg, function (x, y, ph, e) {
      if (ph === 'start') {
        if (busy) return false;
        var tg = e.target && e.target.closest ? e.target.closest('[data-tray],[data-atom]') : null; if (!tg) return false;
        clearResult();
        if (tg.dataset.tray) {
          if (atoms.length >= 9) { say('no', 'อะตอมเต็มพื้นที่แล้ว ลากอะตอมที่ไม่ใช้กลับไปที่ถาด'); return false; }
          held = mk(tg.dataset.tray, x, y); off = [0, 0];
        } else {
          var a = byId(+tg.dataset.atom); if (!a) return false;
          if (bondsOf(a).length > 1) { shake(a); say('', 'อะตอมนี้ต่ออยู่หลายพันธะ ย้ายอะตอมรอบนอกออกก่อน'); return false; }
          held = a; bonds = bonds.filter(function (b) { return b.a !== a && b.b !== a; }); off = [a.x - x, a.y - y];
          if (a.t === 'O') { a.rot = 37.75; a.dir = 1; }
          orders();
        }
        held.g.classList.add('held'); gA.appendChild(held.g); draw(); return true;
      }
      if (!held) return;
      if (ph === 'move') {
        held.x = clamp(x + off[0], 0, 1220); held.y = clamp(y + off[1], 0, 800); put(held);
        var s = findSnap(held);
        if (s) { snapC.setAttribute('cx', s.p[0]); snapC.setAttribute('cy', s.p[1]); snapC.setAttribute('opacity', 1); } else snapC.setAttribute('opacity', 0);
        return;
      }
      var h = held; held = null; h.g.classList.remove('held'); drop(h, ph === 'end');
    });

    function connected() {
      if (!atoms.length) return true;
      var seen = [atoms[0]], q = [atoms[0]];
      while (q.length) { var a = q.shift(); bondsOf(a).forEach(function (b) { var o = b.a === a ? b.b : b.a; if (seen.indexOf(o) < 0) { seen.push(o); q.push(o); } }); }
      return seen.length === atoms.length;
    }
    function check() {
      clearResult();
      var n = tally(), G = GOAL[goal].n;
      if (!atoms.length) { say('', 'ลากอะตอมจากถาดมาต่อก่อนนะ'); return false; }
      if (n.H !== G.H || n.O !== G.O || n.C !== G.C) {
        var need = ['C', 'O', 'H'].filter(function (t) { return G[t]; }).map(function (t) { return t + ' ' + G[t]; }).join(', ');
        say('no', 'จำนวนอะตอมยังไม่ตรงกับสูตร ต้องมี ' + need + ' อะตอม'); return false;
      }
      if (!connected()) { say('no', 'ทุกอะตอมต้องต่อกันเป็นโมเลกุลเดียว'); return false; }
      var open = atoms.filter(function (a) { return free(a) > 0; });
      if (open.length) { var a = open[0]; atoms.forEach(function (o) { if (free(o) > 0) shake(o); }); say('no', a.t + ' ยังมีแขนว่าง ' + free(a) + ' แขน ลองต่อใหม่ให้ทุกแขนใช้หมด'); return false; }
      win(); return true;
    }
    function win() {
      say('ok', 'ถูกต้อง! ได้โมเลกุล ' + GOAL[goal].name.replace(/<\/?sub>/g, '') + ' ทุกอะตอมครบออกเตต');
      info.innerHTML = ''; var dl = H('dl', '', null, info);
      GOAL[goal].info.forEach(function (r) { var d = H('div', '', null, dl); H('dt', '', r[0], d); H('dd', '', r[1], d); });
      info.classList.add('show');
      /* mark the shape on the molecule itself */
      var mid = goal === 'ch4' || goal === 'co2' ? atoms.filter(function (a) { return a.t === 'C'; })[0] : atoms.filter(function (a) { return a.t === 'O'; })[0];
      if (!mid) return;
      var nb = bondsOf(mid).map(function (b) { var o = b.a === mid ? b.b : b.a; return Math.atan2(o.y - mid.y, o.x - mid.x); });
      if (goal === 'h2o' && nb.length === 2) {
        var a1 = nb[0], a2 = nb[1], d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        var r = 74, p1 = [mid.x + r * Math.cos(a1), mid.y + r * Math.sin(a1)], p2 = [mid.x + r * Math.cos(a1 + d), mid.y + r * Math.sin(a1 + d)];
        var arc = S('path', { 'class': 'ang', d: 'M' + p1 + ' A' + r + ' ' + r + ' 0 0 ' + (d > 0 ? 1 : 0) + ' ' + p2, pathLength: 1 }, gX);
        var am = a1 + d / 2; T({ 'class': 'blab', x: mid.x + 112 * Math.cos(am), y: mid.y + 112 * Math.sin(am) + 6 }, '104.5°', gX);
        if (!still() && arc.animate) arc.animate([{ strokeDasharray: '0 1' }, { strokeDasharray: '1 0' }], { duration: 600 });
      } else if (goal === 'co2') {
        T({ 'class': 'blab', x: mid.x, y: mid.y - 74 }, '180°', gX);
        T({ 'class': 'blab', x: mid.x, y: mid.y + 92 }, 'พันธะคู่ 2 พันธะ', gX);
      } else if (goal === 'ch4') {
        T({ 'class': 'blab', x: mid.x + 96, y: mid.y - 96 }, '90° บนกระดาษ · 109.5° ในสามมิติ', gX).setAttribute('text-anchor', 'start');
      }
    }
    function clearAll(an) { timers.forEach(clearTimeout); timers = []; A.stop(); atoms.slice().forEach(function (a) { remove(a, an); }); bonds = []; clearResult(); draw(); }
    var PLAN = {
      h2o: [['O', null, null, [720, 330]], ['H', 0, 0], ['H', 0, 1]],
      co2: [['C', null, null, [720, 400]], ['O', 0, 0], ['O', 0, 2]],
      ch4: [['C', null, null, [720, 400]], ['H', 0, 0], ['H', 0, 1], ['H', 0, 2], ['H', 0, 3]]
    };
    function showAnswer() {
      clearAll(false); busy = true; say('', 'กำลังต่อโมเลกุลให้ดู…');
      var made = [], plan = PLAN[goal], k = 0;
      function step() {
        if (k >= plan.length) { busy = false; orders(); draw(); win(); fb.textContent = 'เฉลย: ' + fb.textContent.replace('ถูกต้อง! ', ''); return; }
        var s = plan[k++], a = mk(s[0], TRAY[s[0]][0], TRAY[s[0]][1]), to;
        if (s[1] === null) to = s[3]; else { var par = made[s[1]], sn = { a: par, k: s[2], p: sPos(par, s[2]) }; attach(a, sn); to = sn.p; }
        made.push(a); orders();
        glide(a, to, 520, function () { draw(); timers.push(setTimeout(step, still() ? 0 : 160)); });
      }
      step();
    }
    function setGoal(g) {
      goal = g; $$('#p3-tabs .pill').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.m === g ? 'true' : 'false'); });
      $('#p3-goal').textContent = GOAL[g].goal; clearAll(true); say('', '');
    }
    $$('#p3-tabs .pill').forEach(function (b) { tap(b, function () { if (!busy) setGoal(b.dataset.m); }); });
    tap($('#p3-check'), function () { if (!busy) check(); });
    tap($('#p3-show'), function () { if (!busy) showAnswer(); });
    tap($('#p3-reset'), function () { if (!busy) { clearAll(true); say('', ''); } });
    draw();
    return { set: function () {}, leave: function () {}, showAnswer: showAnswer, setGoal: setGoal, check: check, atoms: function () { return atoms; } };
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
  window.__chem = { C: C };
})();
