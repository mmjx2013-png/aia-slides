/* clock.js · the live parts of the เวลาและเงิน sample (vanilla JS, no libraries, no network).
   One clay clock model is used on slides 1 and 2. Its state is T = minutes after 12.00; the minute hand is at
   (T mod 60)·6°, the hour hand at (T mod 720)·0.5°, so turning the minute hand always moves the hour hand like gears.
   Slide 2: drag either hand from anywhere on the face (the hand nearest the finger is picked); it snaps to 5 minutes.
   Slide 3: drag or tap toy coins and notes (drawn here, not photos of money) into the tray; the total counts up; Check. */
(function () {
  'use strict';
  var $ = K.$, $$ = K.$$, E = K.E, S = K.S, tk = K.tk;
  function fmt(T) { T = ((Math.round(T) % 720) + 720) % 720; var h = Math.floor(T / 60), m = T % 60; return (h || 12) + '.' + (m < 10 ? '0' : '') + m + ' น.'; }
  function words(T) { T = ((Math.round(T) % 720) + 720) % 720; var h = Math.floor(T / 60), m = T % 60; return (h || 12) + ' นาฬิกา' + (m ? ' ' + m + ' นาที' : ''); }
  var gid = 0;
  function grad(defs, id, c1, c2, c3) {
    var g = S('radialGradient', { id: id, cx: '.36', cy: '.3', r: '.8' }, defs);
    S('stop', { offset: '0', 'stop-color': c1 }, g); S('stop', { offset: '.45', 'stop-color': c2 }, g); S('stop', { offset: '1', 'stop-color': c3 }, g);
    return 'url(#' + id + ')';
  }
  function makeClock(svg) {
    var n = ++gid, defs = S('defs', {}, svg);
    var rimG = grad(defs, 'rim' + n, '#FFC9BC', '#FF8F7A', '#E06A54'), faceG = grad(defs, 'face' + n, '#FFFFFF', '#FFF8EE', '#EFE2D0');
    var hG = grad(defs, 'hh' + n, '#FFB3A4', '#F07A64', '#C9543F'), mG = grad(defs, 'mm' + n, '#BBD9FF', '#5E9BEA', '#3366BF'), cG = grad(defs, 'cap' + n, '#FFF4C9', '#FFD978', '#D9A93A');
    var sh = S('filter', { id: 'csh' + n, x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
    S('feDropShadow', { dx: 4, dy: 8, stdDeviation: 6, 'flood-color': '#463B57', 'flood-opacity': '.28' }, sh);
    S('ellipse', { cx: 14, cy: 30, rx: 350, ry: 344, fill: 'rgba(70,59,87,.14)' }, svg);
    S('circle', { r: 348, fill: rimG, 'class': 'rim' }, svg);
    S('circle', { r: 348, fill: 'none', stroke: 'rgba(255,255,255,.5)', 'stroke-width': 6, transform: 'translate(-5 -6)', 'stroke-dasharray': '700 2000', 'stroke-linecap': 'round' }, svg);
    for (var k = 0; k < 12; k++) {
      var a = k * 30 * Math.PI / 180, t = S('text', { x: Math.sin(a) * 318, y: -Math.cos(a) * 318 + 9, 'text-anchor': 'middle', 'class': 'mn' }, svg);
      t.textContent = k * 5;
    }
    S('circle', { r: 292, fill: faceG }, svg);
    S('circle', { r: 292, fill: 'none', stroke: 'rgba(70,59,87,.10)', 'stroke-width': 10 }, svg);
    var sweep = S('path', { d: '', fill: 'rgba(94,155,234,.22)', 'class': 'sweep' }, svg);
    for (k = 0; k < 60; k++) {
      var b = k * 6 * Math.PI / 180, big = k % 5 === 0;
      S('circle', { cx: Math.sin(b) * 266, cy: -Math.cos(b) * 266, r: big ? 8 : 3.5, fill: big ? '#9B8FAE' : '#CFC4B6' }, svg);
    }
    for (k = 1; k <= 12; k++) {
      var c = k * 30 * Math.PI / 180, nt = S('text', { x: Math.sin(c) * 212, y: -Math.cos(c) * 212 + 22, 'text-anchor': 'middle', 'class': 'num' }, svg);
      nt.textContent = k;
    }
    var hh = S('g', { 'class': 'hand hh', filter: 'url(#csh' + n + ')' }, svg), mh = S('g', { 'class': 'hand mh', filter: 'url(#csh' + n + ')' }, svg);
    S('rect', { x: -19, y: -158, width: 38, height: 190, rx: 19, fill: hG, 'class': 'hb' }, hh);
    S('rect', { x: -13, y: -258, width: 26, height: 290, rx: 13, fill: mG, 'class': 'hb' }, mh);
    S('circle', { r: 30, fill: cG, filter: 'url(#csh' + n + ')' }, svg);
    S('circle', { r: 10, cx: -7, cy: -8, fill: 'rgba(255,255,255,.7)' }, svg);
    var api = { T: 0, svg: svg, hh: hh, mh: mh, sweep: sweep };
    api.set = function (T) {
      api.T = T;
      var hm = ((T % 720) + 720) % 720 * 0.5, mm = ((T % 60) + 60) % 60 * 6;
      hh.setAttribute('transform', 'rotate(' + hm.toFixed(2) + ')'); mh.setAttribute('transform', 'rotate(' + mm.toFixed(2) + ')');
    };
    /* light-blue wedge from 12 to the minute hand: how far the minute hand has walked (0..60 minutes) */
    api.wedge = function (mins) {
      if (mins <= 0) { sweep.setAttribute('d', ''); return; }
      if (mins >= 59.9) { sweep.setAttribute('d', 'M0 -250 A250 250 0 1 1 -0.1 -250 Z'); return; }
      var a = mins * 6 * Math.PI / 180, x = Math.sin(a) * 250, y = -Math.cos(a) * 250;
      sweep.setAttribute('d', 'M0 0 L0 -250 A250 250 0 ' + (mins > 30 ? 1 : 0) + ' 1 ' + x.toFixed(1) + ' ' + y.toFixed(1) + ' Z');
    };
    api.set(0);
    return api;
  }

  /* ================= slide 1 · title + how the hands move ================= */
  (function () {
    var svg = $('#m1-clock'); if (!svg) return;
    var clk = makeClock(svg), A = K.Anim(), read = $('#m1-read'), minEl = $('#m1-min');
    function show(T, w, txt) { clk.set(T); clk.wedge(w); read.textContent = txt == null ? fmt(T) : txt; }
    show(480, 0);
    K.ctl('cm-title', {
      set: function (st, prev) {
        A.stop();
        if (st === 0) { show(480, 0); minEl.textContent = '0'; return; }
        if (st === 1) {
          if (prev !== 0) { show(540, 60); minEl.textContent = '60'; return; }
          A.run(3600, function (p) { var e = K.eio(p), m = 60 * e; show(480 + m, m); minEl.textContent = Math.round(m); });
          return;
        }
        clk.wedge(0); read.textContent = '? น.';
        if (prev !== 1) { clk.set(555); return; }
        A.run(1100, function (p) { clk.set(540 + 15 * K.eio(p)); });
      },
      leave: function () { A.stop(); }
    });
  })();

  /* ================= slide 2 · set the clock ================= */
  (function () {
    var svg = $('#m2-clock'); if (!svg) return;
    var clk = makeClock(svg), A = K.Anim(), hand = null, prevA = 0;
    var TASKS = [['ตื่นนอน', 390, 'sun'], ['เข้าแถวเคารพธงชาติ', 465, 'flag'], ['เริ่มเรียนคาบแรก', 495, 'book'], ['กินข้าวกลางวัน', 700, 'rice']];
    var ti = 0, done = {}, nt = $('#m2-nt'), nw = $('#m2-nw'), steps = $('#m2-steps');
    TASKS.forEach(function () { E('i', '', null, steps); });
    var ICON = {
      sun: '<circle cx="65" cy="65" r="30" fill="#FFD978"/><g stroke="#F2B640" stroke-width="9" stroke-linecap="round"><path d="M65 12v12M65 106v12M12 65h12M106 65h12M28 28l9 9M93 93l9 9M102 28l-9 9M37 93l-9 9"/></g>',
      flag: '<rect x="22" y="14" width="9" height="104" rx="4" fill="#9B8FAE"/><rect x="31" y="18" width="78" height="52" rx="6" fill="#E9555A"/><rect x="31" y="26" width="78" height="36" fill="#fff"/><rect x="31" y="35" width="78" height="18" fill="#3F5FB8"/>',
      book: '<rect x="20" y="70" width="90" height="22" rx="8" fill="#8EC5FF"/><rect x="26" y="48" width="80" height="22" rx="8" fill="#FF8F7A"/><rect x="18" y="26" width="92" height="22" rx="8" fill="#7FD6BA"/>',
      rice: '<path d="M16 62h98a49 40 0 0 1-98 0z" fill="#8EC5FF"/><ellipse cx="65" cy="60" rx="46" ry="16" fill="#fff"/><circle cx="50" cy="52" r="10" fill="#fff"/><circle cx="72" cy="48" r="12" fill="#fff"/><path d="M84 16 L104 50" stroke="#C49A6C" stroke-width="6" stroke-linecap="round"/>'
    };
    function paintTask() {
      var t = TASKS[ti]; $('#m2-tl').textContent = t[0]; $('#m2-tt').textContent = fmt(t[1]);
      $('#m2-ic').innerHTML = '<svg viewBox="0 0 130 130" aria-hidden="true">' + ICON[t[2]] + '</svg>';
      [].forEach.call(steps.children, function (s, k) { s.className = done[k] ? 'ok' : k === ti ? 'cur' : ''; });
    }
    function setT(T) { clk.set(T); nt.textContent = fmt(T); nw.textContent = words(T); svg.setAttribute('aria-valuetext', words(T)); }
    function angle(e) {
      var m = svg.getScreenCTM(); if (!m) return 0;
      var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; p = p.matrixTransform(m.inverse());
      return { a: (Math.atan2(p.x, -p.y) * 180 / Math.PI + 360) % 360, r: Math.hypot(p.x, p.y) };
    }
    function adiff(a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
    function snapTo(to, ms) { var from = clk.T; A.run(ms || 220, function (p) { setT(from + (to - from) * K.eo(p)); }); }
    K.drag(svg, {
      threshold: 0,
      start: function (e) {
        A.stop(); ac.hide(); ft.say('');
        var q = angle(e), mA = ((clk.T % 60) + 60) % 60 * 6, hA = ((clk.T % 720) + 720) % 720 * 0.5;
        var dm = adiff(q.a, mA), dh = adiff(q.a, hA);
        hand = (dh + 10 < dm) || (q.r < 175 && dh < 25 && dm > 25) ? 'h' : 'm';
        (hand === 'h' ? clk.hh : clk.mh).classList.add('active'); svg.classList.add('dragging');
        prevA = q.a;
        /* grabbing away from the hand: the hand jumps to the finger first */
        var jump = (q.a - (hand === 'm' ? mA : hA) + 540) % 360 - 180;
        setT(clk.T + (hand === 'm' ? jump / 6 : jump * 2));
      },
      move: function (d, e) {
        var q = angle(e), delta = (q.a - prevA + 540) % 360 - 180; prevA = q.a;
        setT(clk.T + (hand === 'm' ? delta / 6 : delta * 2));
      },
      end: function () {
        clk.hh.classList.remove('active'); clk.mh.classList.remove('active'); svg.classList.remove('dragging');
        snapTo(Math.round(clk.T / 5) * 5);
        K.tone(660, 70, 'triangle', 0.025);
      }
    });
    svg.addEventListener('keydown', function (e) {
      if (e.key === '+' || e.key === '=') { e.preventDefault(); bump(5); } else if (e.key === '-' || e.key === '_') { e.preventDefault(); bump(-5); }
    });
    function bump(m) { A.stop(); ac.hide(); ft.say(''); snapTo(Math.round(clk.T / 5) * 5 + m, 260); K.tone(m > 0 ? 700 : 560, 60, 'triangle', 0.025); }
    K.tap($('#m2-plus'), function () { bump(5); }); K.tap($('#m2-minus'), function () { bump(-5); });
    var ft = K.footer($('#m2-foot'), { check: check, show: function () { ac.toggle(); }, reset: reset, hint: 'ลากเข็ม แล้วกดตรวจคำตอบ' });
    function norm(T) { return ((Math.round(T) % 720) + 720) % 720; }
    function check() {
      ac.hide();
      var T = norm(clk.T), G = TASKS[ti][1];
      if (T === G) {
        done[ti] = true; paintTask(); ft.say('ok', 'ถูกต้อง! ' + fmt(G));
        [523, 659, 784].forEach(function (f, k) { K.tone(f, 200, 'triangle', 0.04, 0.1 * k); });
        K.anim(svg, [{ transform: 'rotate(0)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' }, { transform: 'none' }], { duration: 500 });
        return;
      }
      var hOk = Math.floor(T / 60) === Math.floor(G / 60), mOk = T % 60 === G % 60;
      ft.say('no', mOk ? 'เข็มยาวถูกแล้ว ลองดูเข็มสั้นอีกที' : hOk ? 'เข็มสั้นถูกแล้ว ลองดูเข็มยาวอีกที' : 'ตอนนี้ ' + fmt(T) + ' ยังไม่ใช่ ลองอีกครั้ง');
    }
    function reset() { ac.off(); A.stop(); snapTo(0, 500); ft.say(''); }
    var ac = tk.answerCtl($('#m2-foot'), ft, {
      snap: function () { return norm(clk.T); },
      reveal: function () {
        var from = clk.T, G = TASKS[ti][1], to = from + ((G - norm(from)) + 720) % 720;   /* turn forwards, like a real clock */
        A.run(Math.min(1800, 300 + (to - from) * 6), function (p) { setT(from + (to - from) * K.eio(p)); });
      },
      restore: function (T) { A.stop(); snapTo(T, 400); }
    });
    K.tap($('#m2-next'), function () { ac.off(); A.stop(); ti = (ti + 1) % TASKS.length; paintTask(); ft.say(''); K.tone(520, 90, 'sine', 0.03); });
    paintTask(); setT(0);
    window.__clock = { T: function () { return norm(clk.T); }, set: setT, task: function () { return ti; }, check: check, ac: ac };
    K.ctl('cm-clock', { set: function () {}, leave: function () { A.stop(); } });
  })();

  /* ================= slide 3 · pay the exact price ================= */
  (function () {
    var sl = $('#cm-money'); if (!sl) return;
    var tray = $('#m3-tray'), inn = $('#m3-in'), sumEl = $('#m3-sum'), steps = $('#m3-steps');
    var ITEMS = [['สีเทียน', 37, 'crayon'], ['ยางลบ', 8, 'eraser'], ['สมุดระบายสี', 64, 'book'], ['ลูกบอล', 95, 'ball']];
    var PIC = {
      crayon: '<rect x="50" y="90" width="180" height="130" rx="26" fill="#FFD978"/><g><rect x="70" y="40" width="30" height="70" rx="10" fill="#FF8F7A"/><path d="M70 50 L85 18 L100 50Z" fill="#E06A54"/></g><g><rect x="110" y="34" width="30" height="76" rx="10" fill="#8EC5FF"/><path d="M110 44 L125 12 L140 44Z" fill="#3F7FD8"/></g><g><rect x="150" y="40" width="30" height="70" rx="10" fill="#7FD6BA"/><path d="M150 50 L165 18 L180 50Z" fill="#2F9C7B"/></g><g><rect x="190" y="48" width="30" height="62" rx="10" fill="#C9B6FF"/><path d="M190 58 L205 26 L220 58Z" fill="#8E74E0"/></g><rect x="50" y="110" width="180" height="40" fill="#FFF1C7"/><rect x="50" y="90" width="180" height="130" rx="26" fill="none" stroke="rgba(70,59,87,.12)" stroke-width="8"/>',
      eraser: '<g transform="rotate(-14 140 120)"><rect x="40" y="80" width="200" height="90" rx="30" fill="#FFB3C7"/><rect x="130" y="80" width="110" height="90" rx="10" fill="#8EC5FF"/><rect x="40" y="80" width="200" height="90" rx="30" fill="none" stroke="rgba(70,59,87,.12)" stroke-width="8"/><rect x="58" y="94" width="60" height="18" rx="9" fill="rgba(255,255,255,.55)"/></g>',
      book: '<rect x="60" y="30" width="170" height="200" rx="18" fill="#C9B6FF"/><rect x="74" y="44" width="142" height="172" rx="12" fill="#FFFBF6"/><circle cx="145" cy="112" r="18" fill="#FFD978"/><g fill="#FF8F7A"><circle cx="145" cy="82" r="16"/><circle cx="175" cy="112" r="16"/><circle cx="145" cy="142" r="16"/><circle cx="115" cy="112" r="16"/></g><circle cx="145" cy="112" r="14" fill="#FFD978"/><rect x="60" y="30" width="22" height="200" rx="10" fill="#8E74E0"/>',
      ball: '<circle cx="140" cy="124" r="96" fill="#FF8F7A"/><path d="M48 104 C100 140 180 140 232 104" fill="none" stroke="#FFFBF6" stroke-width="20" stroke-linecap="round"/><path d="M60 170 C110 196 170 196 220 170" fill="none" stroke="#FFD978" stroke-width="18" stroke-linecap="round"/><circle cx="106" cy="76" r="22" fill="rgba(255,255,255,.55)"/>'
    };
    var VALS = [1, 2, 5, 10, 20, 50, 100], src = {}, ii = 0, sum = 0, okd = {}, SA = K.Anim();
    function money(v) {
      var m = E('span', 'money ' + (v >= 20 ? 'note n' + v : 'coin c' + v)); m.dataset.v = v;
      E('b', '', String(v), m); E('small', '', 'บาท', m);
      return m;
    }
    ITEMS.forEach(function () { E('i', '', null, steps); });
    VALS.forEach(function (v) {
      var m = money(v); (v >= 20 ? $('#m3-notes') : $('#m3-coins')).appendChild(m); src[v] = m;
      m.setAttribute('role', 'button'); m.tabIndex = 0; m.setAttribute('aria-label', 'จ่าย ' + v + ' บาท');
      var g = null;
      K.drag(m, {
        tap: function () { add(v, K.box(m)); },
        start: function () {
          var b = K.box(m); g = money(v); g.classList.add('ghost'); g.style.left = b.x + 'px'; g.style.top = b.y + 'px'; sl.appendChild(g);
          K.tone(1200, 40, 'sine', 0.02);
        },
        move: function (d, e, p) { g.style.transform = 'translate(' + d.dx + 'px,' + d.dy + 'px) scale(1.1) rotate(-6deg)'; tray.classList.toggle('hot', !!K.hit(p, [tray], 10)); },
        end: function (d, e, p, cancelled) {
          tray.classList.remove('hot');
          var over = !cancelled && K.hit(p, [tray], 10), b = K.box(g), gg = g; g = null;
          if (over) { gg.remove(); add(v, b); return; }
          var a = K.anim(gg, [{ transform: gg.style.transform }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.7,.2,1)' });
          if (a) a.onfinish = function () { gg.remove(); }; else gg.remove();
        }
      });
      m.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); add(v, K.box(m)); } });
    });
    function total() { return [].reduce.call(inn.children, function (s, x) { return s + (+x.dataset.v); }, 0); }
    function showSum() {
      var from = sum, to = total(); sum = to;
      SA.run(380, function (p) { sumEl.textContent = Math.round(from + (to - from) * K.eo(p)); });
    }
    function add(v, from, quiet) {
      if (!quiet) { ac.hide(); tray.classList.remove('ok'); ft.say(''); }
      if (inn.children.length >= 14) { ft.say('info', 'ถาดเต็มแล้ว ลองใช้ธนบัตรหรือเหรียญที่ใหญ่ขึ้น'); return null; }
      var m = money(v), before = [].map.call(inn.children, function (x) { return K.box(x); });
      /* keep the tray tidy: notes first (big to small), then coins */
      var at = [].filter.call(inn.children, function (x) { return +x.dataset.v >= v; }).length;
      inn.insertBefore(m, inn.children[at] || null);
      m.setAttribute('role', 'button'); m.tabIndex = 0; m.setAttribute('aria-label', 'เอา ' + v + ' บาท คืน');
      K.tap(m, function () { take(m); });
      [].forEach.call(inn.children, function (x, k) { var j = k < at ? k : k - 1; if (x !== m && before[j]) { var a = before[j], b = K.box(x); if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 1) K.anim(x, [{ transform: 'translate(' + (a.x - b.x) + 'px,' + (a.y - b.y) + 'px)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.7,.2,1)' }); } });
      if (from) { var to = K.box(m); K.anim(m, [{ transform: 'translate(' + (from.cx - to.cx) + 'px,' + (from.cy - to.cy) + 'px) scale(1.1)' }, { transform: 'translateY(-14px) scale(1.05)', offset: 0.75 }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.3,1.2,.5,1)' }); }
      if (!quiet) { K.tone(v >= 20 ? 520 : 1320, 70, 'sine', 0.03); K.tone(v >= 20 ? 660 : 1760, 90, 'sine', 0.025, 0.06); }
      showSum();
      return m;
    }
    function take(m) {
      ac.hide(); tray.classList.remove('ok'); ft.say('');
      var v = +m.dataset.v, a = K.box(m), b = K.box(src[v]), g = money(v);
      g.classList.add('ghost'); g.style.left = a.x + 'px'; g.style.top = a.y + 'px'; sl.appendChild(g);
      m.remove(); showSum();
      var an = K.anim(g, [{ transform: 'none' }, { transform: 'translate(' + (b.x - a.x) + 'px,' + (b.y - a.y) + 'px) scale(.9)', opacity: 0.4 }], { duration: 380, easing: 'cubic-bezier(.4,0,.2,1)' });
      if (an) an.onfinish = function () { g.remove(); }; else g.remove();
      K.tone(440, 70, 'triangle', 0.025);
    }
    function clear() { inn.textContent = ''; showSum(); tray.classList.remove('ok'); }
    function paintItem() {
      var it = ITEMS[ii]; $('#m3-name').textContent = it[0]; $('#m3-price').textContent = it[1];
      $('#m3-pic').innerHTML = '<svg viewBox="0 0 280 240" aria-hidden="true">' + PIC[it[2]] + '</svg>';
      [].forEach.call(steps.children, function (s, k) { s.className = okd[k] ? 'ok' : k === ii ? 'cur' : ''; });
    }
    function fewest(p) { var out = []; [100, 50, 20, 10, 5, 2, 1].forEach(function (v) { while (p >= v) { out.push(v); p -= v; } }); return out; }
    var ft = K.footer($('#m3-foot'), { check: check, show: function () { ac.toggle(); }, reset: function () { ac.off(); clear(); ft.say(''); }, hint: 'ลากเงินลงถาด แล้วกดตรวจคำตอบ' });
    function check() {
      ac.hide();
      var t = total(), p = ITEMS[ii][1];
      if (!t) { ft.say('info', 'ลากเงินใส่ถาดก่อนนะ'); return; }
      if (t === p) {
        okd[ii] = true; paintItem(); tray.classList.add('ok'); ft.say('ok', 'พอดีเลย! จ่าย ' + p + ' บาท');
        [784, 988, 1175].forEach(function (f, k) { K.tone(f, 180, 'sine', 0.04, 0.09 * k); });
        [].forEach.call(inn.children, function (x, k) { K.anim(x, [{ transform: 'none' }, { transform: 'translateY(-16px)' }, { transform: 'none' }], { duration: 420, delay: k * 50 }); });
      } else if (t > p) ft.say('no', 'เกินไป ' + (t - p) + ' บาท ลองแตะเงินในถาดเพื่อเอาออก');
      else ft.say('no', 'ยังขาดอีก ' + (p - t) + ' บาท');
    }
    var ac = tk.answerCtl($('#m3-foot'), ft, {
      snap: function () { return [].map.call(inn.children, function (x) { return +x.dataset.v; }); },
      reveal: function () { clear(); fewest(ITEMS[ii][1]).forEach(function (v) { add(v, K.box(src[v]), true); }); tray.classList.add('ok'); },
      restore: function (s) { clear(); s.forEach(function (v) { add(v, null, true); }); }
    });
    K.tap($('#m3-next'), function () { ac.off(); clear(); ii = (ii + 1) % ITEMS.length; paintItem(); ft.say(''); K.tone(520, 90, 'sine', 0.03); });
    paintItem();
    window.__money = { total: total, add: add, item: function () { return ITEMS[ii]; }, check: check, ac: ac };
    K.ctl('cm-money', { set: function () {}, leave: function () { $$('.ghost', sl).forEach(function (g) { g.remove(); }); } });
  })();

  K.start();
})();
