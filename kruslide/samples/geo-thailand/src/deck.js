/* deck.js · ภูมิภาคของประเทศไทย (ม.1) · the live maps and chart of this sample (vanilla JS, no libraries, no network).
   Map data: window.GEO from data-geo.js (Natural Earth, public domain; made by geo.py).
   Slide 1: tap a region (or its key) -> it lifts and the card shows landforms + a key fact. Beat 1: rivers draw in.
   Slide 2: drag the 6 region tags onto the blank map; Check / Show answer / Reset.
   Slide 3: Bangkok climate normals 1991-2020 (Thai Meteorological Department); drag across the chart to read a month. */
(function () {
  'use strict';
  var G = window.GEO, K = KIT, S = K.S, $ = K.$, $$ = K.$$;
  if (!G || !document.getElementById('stage')) return;
  var ORDER = ['n', 'ne', 'c', 'e', 'w', 's'];
  var BLANK = '#FBF7EC', COL = { n: '#A8714D', ne: '#D4A24C', c: '#A3B86C', e: '#6FA39A', w: '#8B6F84', s: '#4F8A6E' };
  var INFO = {
    n: { land: 'ทิวเขาสูงทอดยาวแนวเหนือ–ใต้ สลับกับแอ่งที่ราบระหว่างหุบเขา เช่น แอ่งเชียงใหม่ แอ่งลำปาง แม่น้ำปิง วัง ยม น่าน ไหลลงใต้ตามหุบเขา',
         fact: 'ดอยอินทนนท์ จ.เชียงใหม่ สูงประมาณ 2,565 เมตร เป็นยอดเขาที่สูงที่สุดของประเทศไทย' },
    ne: { land: 'ที่ราบสูงโคราช ขอบด้านตะวันตกและด้านใต้เป็นทิวเขา พื้นที่ลาดเอียงไปทางตะวันออกเฉียงใต้ แม่น้ำชีและแม่น้ำมูลไหลไปลงแม่น้ำโขง',
         fact: 'เป็นภาคที่ใหญ่ที่สุด มีพื้นที่ราว 1 ใน 3 ของประเทศ และมีแม่น้ำโขงเป็นพรมแดนกับลาว' },
    c: { land: 'ที่ราบลุ่มแม่น้ำเจ้าพระยา กว้างและราบเรียบ ดินตะกอนที่แม่น้ำพัดมาทับถมจึงอุดมสมบูรณ์ ขอบด้านตะวันออกมีทิวเขาเพชรบูรณ์',
         fact: 'ปลูกข้าวได้มาก จึงได้ชื่อว่า “อู่ข้าวอู่น้ำ” ของประเทศไทย แม่น้ำเจ้าพระยาไหลลงอ่าวไทยที่ จ.สมุทรปราการ' },
    e: { land: 'มีทิวเขาจันทบุรีอยู่ตอนกลาง ทิวเขาบรรทัดกั้นพรมแดนกัมพูชา และที่ราบชายฝั่งทะเลแคบ ๆ ริมอ่าวไทย มีเกาะหลายแห่ง',
         fact: 'ฝนชุกและดินดี เป็นแหล่งปลูกผลไม้สำคัญ เช่น ทุเรียน มังคุด เงาะ ที่จันทบุรีและระยอง' },
    w: { land: 'ทิวเขาถนนธงชัยและทิวเขาตะนาวศรีทอดยาวตามแนวพรมแดนเมียนมา มีที่ราบแคบ ๆ ระหว่างหุบเขา และป่าไม้อุดมสมบูรณ์',
         fact: 'แม่น้ำแควน้อยและแควใหญ่ไหลมาบรรจบกันที่ จ.กาญจนบุรี กลายเป็นแม่น้ำแม่กลอง' },
    s: { land: 'คาบสมุทรแคบและยาว ทะเลขนาบสองฝั่ง: อ่าวไทยทางตะวันออก ทะเลอันดามันทางตะวันตก มีทิวเขาภูเก็ต นครศรีธรรมราช และสันกาลาคีรี',
         fact: 'ได้รับลมมรสุมทั้งสองฝั่ง ฝนจึงตกชุกเกือบทั้งปี และมีทะเลสาบสงขลา ทะเลสาบที่ใหญ่ที่สุดของไทย' }
  };

  /* ---------- paper: decorative contours + neat-line frame with ticks (varied per slide) ---------- */
  var BGT = ['', 'translate(1920 0) scale(-1 1)', 'translate(0 1080) scale(1 -1)'];
  $$('.slide').forEach(function (sl, i) {
    var svg = S('svg', { 'class': 'topo-bg', viewBox: '0 0 1920 1080', 'aria-hidden': 'true' });
    var g = S('g', { transform: BGT[i % 3] }, svg);
    G.bg.forEach(function (b) { S('path', { d: b.d, 'class': b.i ? 'i' : '' }, g); });
    S('rect', { x: 14, y: 14, width: 1892, height: 1052, 'class': 'frame' }, svg);
    S('rect', { x: 24, y: 24, width: 1872, height: 1032, 'class': 'frame2' }, svg);
    for (var x = 120; x < 1920; x += 120) { S('line', { x1: x, y1: 14, x2: x, y2: 24, 'class': 'tick' }, svg); S('line', { x1: x, y1: 1056, x2: x, y2: 1066, 'class': 'tick' }, svg); }
    for (var y = 120; y < 1080; y += 120) { S('line', { x1: 14, y1: y, x2: 24, y2: y, 'class': 'tick' }, svg); S('line', { x1: 1896, y1: y, x2: 1906, y2: y, 'class': 'tick' }, svg); }
    sl.insertBefore(svg, sl.firstChild);
  });

  /* ---------- a topographic map in an <svg> ---------- */
  var RIVLAB = { Mekong: ['แม่น้ำโขง', 0.42], 'Chao Phraya': ['เจ้าพระยา', 0.62], Ping: ['ปิง', 0.3], Yom: ['ยม', 0.3], Mun: ['มูล', 0.62], Chi: ['ชี', 0.8], 'Mae Klong': ['แม่กลอง', 0.75] };
  function map(svg, o) {
    var id = svg.id, vb = o.vb;
    svg.setAttribute('viewBox', vb.join(' '));
    var defs = S('defs', {}, svg), ct = S('g', { id: id + '-ct', 'class': 'm-ct' }, defs);
    if (o.contours) G.contours.forEach(function (c) { S('path', { d: c.d, 'class': c.z === 1000 || c.z === 2000 ? 'i' : '' }, ct); });
    S('rect', { x: vb[0] - 50, y: vb[1] - 50, width: vb[2] + 100, height: vb[3] + 100, fill: 'transparent', 'class': 'm-sea' }, svg);
    var gr = S('g', { 'aria-hidden': 'true' }, svg);
    if (o.grat) G.grat.forEach(function (d) { S('path', { d: d, 'class': 'm-grat' }, gr); });
    if (o.ctx !== false) {
      G.water.forEach(function (d) { S('path', { d: d, 'class': 'm-wl' }, gr); });
      G.context.forEach(function (d) { S('path', { d: d, 'class': 'm-ctx' }, gr); });
    }
    var regs = S('g', { 'class': 'm-regs' }, svg), R = {};
    ORDER.forEach(function (k) {
      var r = G.regions[k], cp = S('clipPath', { id: id + '-cl-' + k }, defs);
      S('path', { d: r.d }, cp);
      var g = S('g', { 'class': 'm-reg', 'data-r': k }, regs);
      if (o.tap) { g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', r.th); }
      S('path', { d: r.d, 'class': 'f', fill: o.fill === false ? BLANK : COL[k], 'fill-rule': 'evenodd' }, g);
      if (o.contours) S('use', { href: '#' + id + '-ct', 'clip-path': 'url(#' + id + '-cl-' + k + ')' }, g);
      S('path', { d: r.d, 'class': 'e', 'fill-rule': 'evenodd' }, g);
      R[k] = g;
    });
    var top = S('g', { 'aria-hidden': 'true' }, svg), riv = null;
    if (o.rivers) {
      riv = S('g', { 'class': 'm-rivers' }, top);
      Object.keys(G.rivers).forEach(function (n) {
        var p = S('path', { d: G.rivers[n], 'class': 'm-riv', pathLength: 1 }, riv);
        if (o.rivlab && RIVLAB[n]) {
          var L = p.getTotalLength ? p.getTotalLength() : 0;
          if (L) { var q = p.getPointAtLength(L * RIVLAB[n][1]); var t = S('text', { x: q.x + 7, y: q.y + 4, 'class': 'm-rlab' }, riv); t.textContent = RIVLAB[n][0]; }
        }
      });
    }
    if (o.peaks) {
      [['inthanon', 'ดอยอินทนนท์ 2,565 ม.', -1], ['khaoluang', 'เขาหลวง 1,835 ม.', 1]].forEach(function (pk) {
        var c = G.pts[pk[0]], gg = S('g', {}, top);
        S('path', { d: 'M' + c[0] + ' ' + (c[1] - 9) + ' l8 13 h-16 z', 'class': 'm-pk' }, gg);
        var t = S('text', { x: c[0] + (pk[2] < 0 ? -10 : 10), y: c[1] + 4, 'class': 'm-pklab', 'text-anchor': pk[2] < 0 ? 'end' : 'start' }, gg); t.textContent = pk[1];
      });
    }
    var labs = null;
    if (o.labels) {
      labs = S('g', {}, top);
      ORDER.forEach(function (k) {
        var c = G.regions[k].c, nm = G.regions[k].th.replace('ภาค', ''), lines = k === 'ne' ? ['ตะวันออก', 'เฉียงเหนือ'] : [nm];
        var t = S('text', { x: c[0], y: c[1] - (lines.length - 1) * 9, 'class': 'm-lab' }, labs);
        lines.forEach(function (l, j) { var ts = S('tspan', { x: c[0], dy: j ? 18 : 0 }, t); ts.textContent = l; });
      });
    }
    return { svg: svg, R: R, regs: regs, top: top, riv: riv };
  }
  /* map units -> stage px */
  function toStage(svg, x, y) {
    var m = svg.getScreenCTM(), st = $('#stage').getBoundingClientRect(), s = st.width / 1920 || 1;
    var p = svg.createSVGPoint(); p.x = x; p.y = y; p = p.matrixTransform(m);
    return { x: (p.x - st.left) / s, y: (p.y - st.top) / s };
  }

  /* ============ slide 1 · explore ============ */
  (function () {
    var svg = $('#g1-map'); if (!svg) return;
    var M = map(svg, { vb: [-80, 0, 738, 1048], contours: true, grat: true, rivers: true, rivlab: true, peaks: true, labels: true, tap: true });
    var keys = $('#g1-keys'), sel = null;
    var ns = S('circle', { cx: G.pts.nsawan[0], cy: G.pts.nsawan[1], r: 6, 'class': 'm-dot g1-ns' }, M.top);
    ORDER.forEach(function (k) {
      var b = K.el('button'); b.type = 'button';
      var i = K.el('i'); i.style.background = COL[k]; b.appendChild(i); b.appendChild(document.createTextNode(G.regions[k].th.replace('ภาค', '')));
      b.addEventListener('click', function (e) { e.stopPropagation(); pick(k); });
      keys.appendChild(b);
      var g = M.R[k];
      g.addEventListener('click', function (e) { e.stopPropagation(); pick(k); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); pick(k); } });
    });
    svg.addEventListener('click', function () { pick(null); });
    function pick(k) {
      if (sel) M.R[sel].classList.remove('lift');
      sel = k;
      svg.classList.toggle('dim', !!k);
      $('#g1-pick').hidden = !!k; $('#g1-info').hidden = !k;
      if (!k) return;
      var g = M.R[k]; M.regs.appendChild(g);
      requestAnimationFrame(function () { g.classList.add('lift'); });
      var r = G.regions[k], inf = $('#g1-info');
      $('#g1-sw').style.background = COL[k];
      $('#g1-name').textContent = r.th; $('#g1-en').textContent = r.en + ' region';
      $('#g1-n').textContent = k === 'c' ? (r.n - 1) + ' จังหวัด + กทม.' : r.n + ' จังหวัด';
      $('#g1-land').textContent = INFO[k].land; $('#g1-fact').textContent = INFO[k].fact;
      inf.style.animation = 'none'; void inf.offsetWidth; inf.style.animation = '';
      K.announce(r.th);
    }
    /* scale bar: 0–100–200 km */
    var kmPx = 690 / 738 / G.kmPerUnit, sc = $('#g1-scale');
    sc.innerHTML = '';
    sc.appendChild(K.el('div', '', 'มาตราส่วน'));
    var bar = K.el('div', 'bar'); bar.style.width = Math.round(200 * kmPx) + 'px';
    for (var j = 0; j < 4; j++) bar.appendChild(K.el('i'));
    sc.appendChild(bar);
    var nums = K.el('div', 'nums'); nums.style.width = Math.round(200 * kmPx) + 'px';
    ['0', '200 กม.'].forEach(function (t) { nums.appendChild(K.el('span', '', t)); });
    sc.appendChild(nums);
    K.slide('g1', { set: function (st, prev) { if (prev === -1 && st === 0) pick(null); }, leave: function () {} });
  })();

  /* ============ slide 2 · drag the names ============ */
  (function () {
    var svg = $('#g2-map'); if (!svg) return;
    var slideEl = $('#g2'), tray = $('#g2-tray');
    var M = map(svg, { vb: [-44, 0, 685, 1048], contours: true, grat: true, rivers: true, peaks: false, labels: false, fill: false });
    M.riv.classList.add('static');
    var TAGS = ['ne', 's', 'c', 'w', 'n', 'e'], tags = [];
    /* home slots: 3 columns x 2 rows inside the tray (stage px) */
    function home(i) { return { x: 830 + 30 + (i % 2) * 470, y: 420 + 30 + Math.floor(i / 2) * 96 }; }
    TAGS.forEach(function (k, i) {
      var t = K.el('div', 'tag', G.regions[k].th); t.dataset.r = k; t.tabIndex = 0; t.setAttribute('role', 'button');
      t.setAttribute('aria-label', 'ป้ายชื่อ ' + G.regions[k].th);
      var mk = K.el('span', 'tw-mark'); t.appendChild(mk);
      t.style.left = home(i).x + 'px'; t.style.top = home(i).y + 'px'; t.style.position = 'absolute';
      slideEl.appendChild(t);
      var T = { el: t, k: k, i: i, at: null, x: home(i).x, y: home(i).y }; tags.push(T);
      var gx = 0, gy = 0;
      K.drag(t, {
        start: function (p) { gx = p.x - T.x; gy = p.y - T.y; },
        move: function (p) {
          if (!t.classList.contains('drag')) { t.classList.add('drag'); unmark(T); slideEl.appendChild(t); }
          T.x = p.x - gx; T.y = p.y - gy; t.style.left = T.x + 'px'; t.style.top = T.y + 'px';
        },
        end: function (p, e, moved) {
          if (!moved) { t.classList.remove('drag'); return; }
          var hit = document.elementFromPoint(e.clientX, e.clientY), g = hit && hit.closest ? hit.closest('#g2-map .m-reg') : null;
          t.classList.remove('drag');
          if (g) { T.at = g.dataset.r; t.classList.add('pinned'); place(T, p.x - 20, p.y - 27, false); ft.say(''); }
          else goHome(T);
        }
      });
    });
    function place(T, x, y, anim) {
      var x0 = T.x, y0 = T.y; T.x = x; T.y = y;
      if (!anim) { T.el.style.left = x + 'px'; T.el.style.top = y + 'px'; return; }
      K.tween(600, function (p) { T.el.style.left = (x0 + (x - x0) * p) + 'px'; T.el.style.top = (y0 + (y - y0) * p) + 'px'; });
    }
    function goHome(T, quick) { T.at = null; T.el.classList.remove('pinned'); var h = home(T.i); place(T, h.x, h.y, !quick); }
    function unmark(T) { T.el.classList.remove('ok', 'no'); refill(); }
    function refill() {
      ORDER.forEach(function (k) {
        var ok = tags.some(function (T) { return T.k === k && T.at === k && T.el.classList.contains('ok'); });
        var f = M.R[k].querySelector('.f'); f.setAttribute('fill', ok ? COL[k] : BLANK);
      });
    }
    function mark(T, ok) {
      T.el.classList.remove('ok', 'no'); T.el.classList.add(ok ? 'ok' : 'no');
      var m = T.el.querySelector('.tw-mark'); m.textContent = ''; m.appendChild(K.ico(ok ? 'check' : 'cross'));
      if (!ok) K.shake(T.el);
    }
    function check() {
      var placed = tags.filter(function (T) { return T.at; }), right = 0;
      if (!placed.length) { ft.say('info', 'ลากป้ายชื่อไปวางบนแผนที่ก่อนนะ'); return; }
      placed.forEach(function (T) { var ok = T.at === T.k; if (ok) right++; mark(T, ok); });
      refill();
      if (right === 6) ft.say('ok', 'ถูกทั้ง 6 ภาค เก่งมาก!');
      else ft.say(right === placed.length ? 'info' : 'no', 'ถูก ' + right + ' จาก ' + placed.length + ' ป้าย' + (placed.length < 6 ? ' · เหลืออีก ' + (6 - placed.length) : ''));
    }
    function show() {
      tags.forEach(function (T) {
        var c = G.regions[T.k].c, q = toStage(svg, c[0], c[1]);
        T.at = T.k; T.el.classList.add('pinned'); slideEl.appendChild(T.el);
        place(T, q.x - T.el.offsetWidth / 2, q.y - 27, true); mark(T, true);
      });
      refill(); ft.say('ok', 'นี่คือเฉลย: ป้ายทุกใบอยู่ในภาคของตัวเอง');
    }
    function reset(quick) { tags.forEach(function (T) { unmark(T); goHome(T, quick); }); refill(); ft.say(''); }
    var ft = K.foot($('#g2-ft'), { check: check, show: show, reset: function () { reset(false); }, hint: 'ลากป้ายชื่อไปวางบนภาคที่ถูกต้อง' });
    K.slide('g2', { set: function () {}, leave: function () {} });
    window.__geo2 = { tags: tags, check: check, show: show, reset: reset, svg: svg, toStage: toStage };
  })();

  /* ============ slide 3 · climate chart ============ */
  (function () {
    var svg = $('#g3-chart'); if (!svg) return;
    var MO = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    var MOL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    /* Thai Meteorological Department, climatological normals 1991-2020, Bangkok Metropolis station 48455 */
    var PR = [23.6, 21.4, 51.0, 93.3, 216.8, 198.5, 189.7, 227.1, 335.9, 288.7, 44.6, 11.6];
    var HI = [32.7, 33.7, 34.7, 35.7, 35.1, 34.1, 33.5, 33.3, 33.2, 33.0, 33.1, 32.3];
    var LO = [23.4, 24.8, 26.4, 27.2, 26.9, 26.4, 26.1, 25.9, 25.4, 25.2, 24.7, 23.2];
    var SEA = ['ฤดูหนาว', 'ฤดูหนาว → ฤดูร้อน (กลางเดือน)', 'ฤดูร้อน', 'ฤดูร้อน', 'ฤดูร้อน → ฤดูฝน (กลางเดือน)', 'ฤดูฝน', 'ฤดูฝน', 'ฤดูฝน', 'ฤดูฝน', 'ฤดูฝน → ฤดูหนาว (กลางเดือน)', 'ฤดูหนาว', 'ฤดูหนาว'];
    var L = 120, Rr = 1130, T = 90, B = 570, MW = (Rr - L) / 12;
    function yr(v) { return B - v / 400 * (B - T); }
    function yt(v) { return B - (v - 20) / 20 * (B - T); }
    function xm(m) { return L + (m + 0.5) * MW; }
    var bands = S('g', { 'class': 'sband' }, svg);
    [[L, xm(1), 'ฤดูหนาว', '#6FA39A'], [xm(1), xm(4), 'ฤดูร้อน', '#B5502F'], [xm(4), xm(9), 'ฤดูฝน', '#3F7D93'], [xm(9), Rr, 'ฤดูหนาว', '#6FA39A']].forEach(function (b, i) {
      S('rect', { x: b[0], y: T - 34, width: b[1] - b[0], height: B - T + 34, fill: b[3], opacity: 0.12 }, bands);
      S('rect', { x: b[0], y: T - 34, width: b[1] - b[0], height: 5, fill: b[3] }, bands);
      if (i !== 0) { var t = S('text', { x: (b[0] + b[1]) / 2, y: T - 8, 'class': 'slab', fill: b[3] }, bands); t.textContent = b[2]; }
      else { var t0 = S('text', { x: (b[0] + b[1]) / 2, y: T - 8, 'class': 'slab', fill: b[3], 'font-size': 15 }, bands); t0.textContent = 'หนาว'; }
    });
    var g = S('g', {}, svg), v, j;
    for (v = 0; v <= 400; v += 100) {
      S('line', { x1: L, x2: Rr, y1: yr(v), y2: yr(v), 'class': 'gl' }, g);
      var tl = S('text', { x: L - 14, y: yr(v) + 7, 'class': 'tk', 'text-anchor': 'end' }, g); tl.textContent = v;
    }
    for (v = 20; v <= 40; v += 5) { var tr = S('text', { x: Rr + 14, y: yt(v) + 7, 'class': 'tk' }, g); tr.textContent = v; }
    var a1 = S('text', { x: L - 14, y: 44, 'class': 'axt', 'text-anchor': 'start', fill: '#3F7D93' }, g); a1.textContent = 'ฝน (มม.)';
    a1.setAttribute('x', 20);
    var a2 = S('text', { x: Rr + 60, y: 44, 'class': 'axt', 'text-anchor': 'end', fill: '#B5502F' }, g); a2.textContent = 'อุณหภูมิ (°C)';
    var cband = S('rect', { x: 0, y: T - 34, width: MW, height: B - T + 34, 'class': 'cband' }, svg);
    var bars = [];
    for (j = 0; j < 12; j++) {
      var bw = 54, b = S('rect', { x: xm(j) - bw / 2, y: yr(PR[j]), width: bw, height: B - yr(PR[j]), 'class': 'bar' }, svg);
      bars.push(b);
      var ml = S('text', { x: xm(j), y: B + 36, 'class': 'tkm' }, svg); ml.textContent = MO[j];
    }
    S('path', { d: 'M' + L + ' ' + T + ' V' + B + ' H' + Rr + ' V' + T, 'class': 'ax' }, svg);
    function line(arr, cls) { return 'M' + arr.map(function (t, k) { return xm(k).toFixed(1) + ' ' + yt(t).toFixed(1); }).join(' L'); }
    var lh = S('path', { d: line(HI), 'class': 'lhi', pathLength: 1 }, svg), ll = S('path', { d: line(LO), 'class': 'llo', pathLength: 1 }, svg);
    var dots = S('g', {}, svg);
    for (j = 0; j < 12; j++) { S('circle', { cx: xm(j), cy: yt(HI[j]), r: 7, 'class': 'dhi' }, dots); S('circle', { cx: xm(j), cy: yt(LO[j]), r: 7, 'class': 'dlo' }, dots); }
    var cur = S('line', { x1: 0, x2: 0, y1: T - 34, y2: B, 'class': 'cur' }, svg);
    S('rect', { x: 0, y: 0, width: 1240, height: 660, fill: 'transparent' }, svg);
    var m0 = -1;
    function setM(m) {
      m = K.clamp(m, 0, 11); if (m === m0) return; m0 = m;
      cband.setAttribute('x', L + m * MW); cur.setAttribute('x1', xm(m)); cur.setAttribute('x2', xm(m));
      bars.forEach(function (b, k) { b.classList.toggle('on', k === m); });
      $('#g3-mo').textContent = MOL[m];
      $('#g3-pr').textContent = PR[m].toFixed(1); $('#g3-hi').textContent = HI[m].toFixed(1); $('#g3-lo').textContent = LO[m].toFixed(1);
      $('#g3-se').textContent = SEA[m];
    }
    function fromEv(e) { var p = K.svgPt(svg, e); return Math.floor((p.x - L) / MW); }
    K.drag(svg, { slop: 0, start: function (p, e) { setM(fromEv(e)); }, move: function (p, d, e) { setM(fromEv(e)); } });
    svg.setAttribute('tabindex', '0');
    svg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setM(m0 + 1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setM(m0 - 1); }
    });
    setM(3);
    /* grow on entry: bars rise one after another, the temperature lines draw */
    var A = K.Anim();
    function grow() {
      A.run(1500, function (p) {
        bars.forEach(function (b, k) {
          var q = K.clamp((p * 1500 - k * 60) / 700, 0, 1), h = (B - yr(PR[k])) * K.eo(q);
          b.setAttribute('y', B - h); b.setAttribute('height', h);
        });
        var q2 = K.clamp((p - 0.3) / 0.7, 0, 1);
        lh.style.strokeDasharray = '1'; ll.style.strokeDasharray = '1';
        lh.style.strokeDashoffset = 1 - q2; ll.style.strokeDashoffset = 1 - q2;
        dots.style.opacity = q2 > 0.95 ? 1 : 0;
      }, null, function (t) { return t; });
    }
    /* locator */
    var loc = $('#g3-loc');
    var LM = map(loc, { vb: [-20, -10, 620, 1068], contours: false, grat: false, rivers: false, peaks: false, labels: false, ctx: false });
    var bk = G.pts.bkk;
    S('circle', { cx: bk[0], cy: bk[1], r: 22, 'class': 'm-dot' }, LM.top);
    var tb = S('text', { x: bk[0] + 34, y: bk[1] + 16, 'class': 'loc-lab' }, LM.top); tb.textContent = 'กรุงเทพฯ';
    K.slide('g3', { set: function (st, prev) { if (prev === -1) { setM(3); grow(); } }, leave: function () { A.stop(); } });
  })();
})();
