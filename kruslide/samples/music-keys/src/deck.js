/* deck.js · เปียโนและการอ่านโน้ต (ม.1) · the keyboard, the synth and the staff (vanilla JS, no libraries, no files fetched).
   Sound: Web Audio oscillators shaped into a soft piano-like tone, made in the page; the audio starts on the first tap or key.
   Keys: tap, slide a finger across, or the computer keys A S D F G H J K (white) and W E T Y U (black) while a keyboard slide is on.
   Slide 1: every note is written on the staff as it sounds; beat 1 plays the C major scale.
   Slide 2: listen to a tune, then play it back; right notes tick green, a wrong note shows red.
   Slide 3: name the note (tap); place a note (drag the note head up or down, then Check). Beat 1: lines E G B D F, spaces F A C E. */
(function () {
  'use strict';
  var K = KIT, S = K.S, $ = K.$;
  if (!document.getElementById('stage')) return;

  /* ---------- synth ---------- */
  var AC = null, master = null;
  function audio() {
    if (!AC) {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      try { AC = new C(); } catch (e) { return null; }
      var comp = AC.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
      master = AC.createGain(); master.gain.value = 0.55; master.connect(comp); comp.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(midi, len) {
    var a = audio(); if (!a) return;
    var t = a.currentTime + 0.005, f = 440 * Math.pow(2, (midi - 69) / 12), L = len || 1.6;
    var env = a.createGain(), lp = a.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 0.7; lp.frequency.setValueAtTime(Math.min(9000, f * 7), t); lp.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2), t + 0.9);
    env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(0.9, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.28, t + 0.22); env.gain.exponentialRampToValueAtTime(0.0006, t + L);
    lp.connect(env); env.connect(master);
    [[1, 0.55, 'triangle'], [2, 0.22, 'sine'], [3, 0.08, 'sine'], [4, 0.035, 'sine']].forEach(function (h) {
      var o = a.createOscillator(), g = a.createGain();
      o.type = h[2]; o.frequency.value = f * h[0] * (1 + 0.0006 * (h[0] - 1)); g.gain.value = h[1];
      o.connect(g); g.connect(lp); o.start(t); o.stop(t + L + 0.05);
    });
  }

  /* ---------- notes C4..C5 ---------- */
  var KEYS = [
    { m: 60, l: 'C', th: 'โด', p: -2, k: 'a' }, { m: 61, l: 'C♯', th: 'โด ชาร์ป', p: -2, s: 1, k: 'w' }, { m: 62, l: 'D', th: 'เร', p: -1, k: 's' },
    { m: 63, l: 'D♯', th: 'เร ชาร์ป', p: -1, s: 1, k: 'e' }, { m: 64, l: 'E', th: 'มี', p: 0, k: 'd' }, { m: 65, l: 'F', th: 'ฟา', p: 1, k: 'f' },
    { m: 66, l: 'F♯', th: 'ฟา ชาร์ป', p: 1, s: 1, k: 't' }, { m: 67, l: 'G', th: 'ซอล', p: 2, k: 'g' }, { m: 68, l: 'G♯', th: 'ซอล ชาร์ป', p: 2, s: 1, k: 'y' },
    { m: 69, l: 'A', th: 'ลา', p: 3, k: 'h' }, { m: 70, l: 'A♯', th: 'ลา ชาร์ป', p: 3, s: 1, k: 'u' }, { m: 71, l: 'B', th: 'ที', p: 4, k: 'j' }, { m: 72, l: 'C', th: 'โด', p: 5, k: 'k' }
  ];
  var BYM = {}; KEYS.forEach(function (k) { BYM[k.m] = k; });
  /* naturals by staff position (E4 = 0) for reading: C4 .. G5 */
  var LET = ['C', 'D', 'E', 'F', 'G', 'A', 'B'], TH = ['โด', 'เร', 'มี', 'ฟา', 'ซอล', 'ลา', 'ที'];
  function natural(p) { var i = ((p + 2) % 7 + 7) % 7; return { p: p, l: LET[i], th: TH[i], m: [60, 62, 64, 65, 67, 69, 71][i] + 12 * Math.floor((p + 2) / 7) }; }

  /* ---------- staff ---------- */
  var CLEF = 'M33 100 C25 101 22 90 29 84 C39 77 50 88 47 101 C44 114 30 120 18 114 C6 107 5 88 16 76 C25 66 36 60 41 46 C45 33 43 16 37 10 C31 5 25 18 26 30 C27 44 30 62 32 80 L35 130 C36 144 28 149 19 144';
  function Staff(svg, o) {
    var g = o.gap, top = o.top, x0 = o.x0, w = o.w, root = S('g', {}, svg);
    for (var i = 0; i < 5; i++) S('line', { x1: x0, x2: x0 + w, y1: top + i * g, y2: top + i * g, 'class': 'st-line' }, root);
    S('line', { x1: x0, x2: x0, y1: top, y2: top + 4 * g, 'class': 'st-bar' }, root);
    if (o.end) { S('line', { x1: x0 + w - 10, x2: x0 + w - 10, y1: top, y2: top + 4 * g, 'class': 'st-bar' }, root); S('line', { x1: x0 + w - 2, x2: x0 + w - 2, y1: top, y2: top + 4 * g, 'class': 'st-end' }, root); }
    var cg = S('g', { transform: 'translate(' + (x0 + 14) + ' ' + (top - 2 * g) + ') scale(' + (g / 20) + ')' }, root);
    S('path', { d: CLEF, 'class': 'st-clef' }, cg);
    S('path', { d: 'M47 101 C44 114 30 120 18 114 C6 107 5 88 16 76', 'class': 'st-clef2' }, cg);
    S('circle', { cx: 20, cy: 139, r: 6.5, 'class': 'st-ball' }, cg);
    var notes = S('g', {}, svg);
    function y(p) { return top + 4 * g - p * g / 2; }
    function note(x, p, cls, label, sharp) {
      var n = S('g', { 'class': 'nt ' + (cls || '') }, notes), yy = y(p), rx = g * 0.66, ry = g * 0.47;
      for (var q = -2; q >= p; q -= 2) S('line', { x1: x - rx - 9, x2: x + rx + 9, y1: y(q), y2: y(q), 'class': 'led' }, n);
      for (var q2 = 10; q2 <= p; q2 += 2) S('line', { x1: x - rx - 9, x2: x + rx + 9, y1: y(q2), y2: y(q2), 'class': 'led' }, n);
      if (sharp) {
        var sx = x - rx - 22, sg = S('g', {}, n);
        S('rect', { x: sx - 5, y: yy - g * 0.95, width: 2.4, height: g * 1.9, 'class': 'sh' }, sg);
        S('rect', { x: sx + 4, y: yy - g * 1.05, width: 2.4, height: g * 1.9, 'class': 'sh' }, sg);
        S('path', { d: 'M' + (sx - 9) + ' ' + (yy - g * 0.22) + ' l20 -6 v5 l-20 6 z M' + (sx - 9) + ' ' + (yy + g * 0.42) + ' l20 -6 v5 l-20 6 z', 'class': 'sh' }, sg);
      }
      S('ellipse', { cx: x, cy: yy, rx: rx, ry: ry, transform: 'rotate(-22 ' + x + ' ' + yy + ')', 'class': 'hd' }, n);
      if (p < 4) S('line', { x1: x + rx - 1.6, x2: x + rx - 1.6, y1: yy - 2, y2: yy - g * 3.4, 'class': 'stem' }, n);
      else S('line', { x1: x - rx + 1.6, x2: x - rx + 1.6, y1: yy + 2, y2: yy + g * 3.4, 'class': 'stem' }, n);
      if (label) { var t = S('text', { x: x, y: top + 4 * g + g * 2.9, 'class': 'lab' }, n); t.textContent = label; }
      return n;
    }
    return { y: y, note: note, notes: notes, root: root, clear: function () { notes.textContent = ''; } };
  }

  /* ---------- keyboard ---------- */
  var active = null;   /* the keyboard of the slide on screen gets the computer keys */
  function Keyboard(host, onNote) {
    var W = host.offsetWidth || 1690, ww = W / 8, bw = ww * 0.58, els = {}, wi = 0;
    KEYS.forEach(function (k) {
      var e = K.el('div', k.s ? 'b' : 'w'); e._k = k; els[k.m] = e;
      if (k.s) { e.style.left = (wi * ww - bw / 2) + 'px'; e.style.width = bw + 'px'; e.appendChild(K.el('span', 'k1', k.l)); }
      else { e.style.left = (wi * ww) + 'px'; e.style.width = (ww + 2) + 'px'; wi++; e.appendChild(K.el('span', 'k1', k.l)); e.appendChild(K.el('span', 'k2', k.th)); }
      e.appendChild(K.el('span', 'k3', k.k.toUpperCase()));
      host.appendChild(e);
    });
    host.setAttribute('role', 'group'); host.setAttribute('aria-label', 'คีย์บอร์ดเปียโน');
    function down(k) { var e = els[k.m]; e.classList.add('down'); clearTimeout(e._t); e._t = setTimeout(function () { e.classList.remove('down'); }, 260); }
    function play(k, quiet) { down(k); if (!quiet) tone(k.m); if (onNote) onNote(k); }
    var cur = null, pid = null;
    function keyAt(e) { var t = document.elementFromPoint(e.clientX, e.clientY); t = t && t.closest ? t.closest('.w,.b') : null; return t && host.contains(t) ? t._k : null; }
    host.addEventListener('pointerdown', function (e) {
      if (document.documentElement.classList.contains('pen-on') || (e.pointerType === 'mouse' && e.button !== 0)) return;
      var k = keyAt(e); if (!k) return;
      pid = e.pointerId; try { host.setPointerCapture(pid); } catch (er) {} e.preventDefault();
      cur = k; play(k);
    });
    host.addEventListener('pointermove', function (e) { if (e.pointerId !== pid) return; var k = keyAt(e); if (k && k !== cur) { cur = k; play(k); } });
    function up(e) { if (e.pointerId !== pid) return; pid = null; cur = null; try { host.releasePointerCapture(e.pointerId); } catch (er) {} }
    host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
    var api = { play: play, els: els, keys: KEYS };
    return api;
  }
  var BYK = {}; KEYS.forEach(function (k) { BYK[k.k] = k; });
  document.addEventListener('keydown', function (e) {
    if (!active || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    var k = BYK[(e.key || '').toLowerCase()]; if (!k) return;
    e.preventDefault(); e.stopPropagation();
    if (!e.repeat) active.play(k);
  }, true);

  /* ============ slide 1 · play and see ============ */
  (function () {
    var svg = $('#m1-staff'); if (!svg) return;
    var ST = Staff(svg, { x0: 40, top: 96, gap: 30, w: 910 }), list = [], MAX = 9, X0 = 210, DXN = 82;
    function layout() { list.forEach(function (n, i) { n.setAttribute('transform', 'translate(' + (i * DXN) + ' 0)'); }); }
    function add(k) {
      list.forEach(function (n) { n.classList.remove('play'); });
      var n = ST.note(X0, k.p, 'play' + (K.rm() ? '' : ' ink'), k.s ? k.l : k.th, k.s);
      list.push(n);
      if (list.length > MAX) { var old = list.shift(); old.remove(); }
      layout();
      $('#m1-now').textContent = k.th + ' · ' + k.l;
    }
    var KB = Keyboard($('#m1-kb'), add), tm = [];
    function stop() { tm.forEach(clearTimeout); tm = []; }
    function scale() {
      stop(); var seq = [60, 62, 64, 65, 67, 69, 71, 72];
      seq.forEach(function (m, i) { tm.push(setTimeout(function () { KB.play(BYM[m]); }, 250 + i * 430)); });
    }
    K.slide('m1', {
      set: function (st, prev) { active = KB; if (st === 1 && prev === 0) scale(); else if (st === 1 && prev === -1 && K.rm()) [60, 62, 64, 65, 67, 69, 71, 72].forEach(function (m) { KB.play(BYM[m], true); }); },
      leave: function () { stop(); if (active === KB) active = null; }
    });
    window.__m1 = { KB: KB, list: list };
  })();

  /* ============ slide 2 · listen and play back ============ */
  (function () {
    var svg = $('#m2-staff'); if (!svg) return;
    var TUNES = [
      { th: 'สามโน้ตลง', sub: 'มี เร โด', m: [64, 62, 60] },
      { th: 'ไต่บันไดเสียง', sub: 'โด เร มี ฟา ซอล', m: [60, 62, 64, 65, 67] },
      { th: 'ทวิงเคิล ทวิงเคิล', sub: 'ท่อนแรก · ทำนองพื้นบ้าน', m: [60, 60, 67, 67, 69, 69, 67] }
    ];
    var ST = Staff(svg, { x0: 40, top: 130, gap: 32, w: 910, end: true }), tune = 0, at = 0, heard = false, playing = false, tm = [], slots = [];
    var info = S('text', { x: 520, y: 70, 'class': 'turn', 'text-anchor': 'middle' }, svg);
    function X(i) { var n = TUNES[tune].m.length; return 200 + i * Math.min(110, 700 / Math.max(1, n - 1)); }
    function draw(mode) {
      ST.clear(); slots = [];
      TUNES[tune].m.forEach(function (m, i) { var k = BYM[m]; slots.push(ST.note(X(i), k.p, mode === 'ghost' ? 'ghost' : mode, k.th, k.s)); });
    }
    function stop() { tm.forEach(clearTimeout); tm = []; playing = false; }
    function listen() {
      stop(); playing = true; at = 0; ST.clear(); slots = []; info.textContent = 'ฟังให้ดี…';
      var seq = TUNES[tune].m, gap = 560;
      seq.forEach(function (m, i) {
        tm.push(setTimeout(function () {
          var k = BYM[m]; KB.play(k); slots.push(ST.note(X(i), k.p, 'play' + (K.rm() ? '' : ' ink'), k.th, k.s));
          slots.forEach(function (n, j) { if (j < i) n.classList.remove('play'); });
        }, 200 + i * gap));
      });
      tm.push(setTimeout(function () {
        playing = false; heard = true; draw('ghost'); info.textContent = 'ถึงตาคุณ: เล่นตามทีละตัว (ตัวที่ 1 จาก ' + seq.length + ')';
        ft.say('info', 'เล่นตามบนคีย์บอร์ด เริ่มจากโน้ตตัวแรก');
      }, 200 + seq.length * gap + 500));
    }
    var bad = null;
    function onNote(k) {
      if (playing || !heard) return;
      var seq = TUNES[tune].m; if (at >= seq.length) return;
      if (bad) { bad.remove(); bad = null; }
      if (k.m === seq[at]) {
        slots[at].setAttribute('class', 'nt ok' + (K.rm() ? '' : ' ink'));
        at++;
        if (at === seq.length) { info.textContent = 'เล่นตามได้ครบ ' + seq.length + ' ตัว!'; ft.say('ok', 'เก่งมาก! ลองเพลงต่อไปได้เลย'); }
        else info.textContent = 'ถูก! ต่อไปตัวที่ ' + (at + 1) + ' จาก ' + seq.length;
      } else {
        bad = ST.note(X(at), k.p, 'bad' + (K.rm() ? '' : ' ink'), k.th, k.s);
        var want = BYM[seq[at]];
        info.textContent = 'ยังไม่ใช่ ลองตัวที่ ' + (at + 1) + ' อีกครั้ง';
        ft.say('no', 'คุณกด ' + k.th + ' แต่โน้ตตัวที่ ' + (at + 1) + ' อยู่' + (want.p > k.p ? 'สูงกว่า' : 'ต่ำกว่า') + 'นี้');
        var b = bad; tm.push(setTimeout(function () { if (bad === b) { b.remove(); bad = null; } }, 1300));
      }
    }
    function pick(i) {
      stop(); tune = i; at = 0; heard = false; if (bad) { bad.remove(); bad = null; }
      tb.forEach(function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      ST.clear(); info.textContent = 'กด “ฟังทำนอง” แล้วเล่นตาม'; ft.say('');
    }
    var host = $('#m2-tunes'), tb = [];
    TUNES.forEach(function (T, i) {
      var b = K.el('button'); b.type = 'button';
      b.appendChild(K.el('b', '', String(i + 1))); b.appendChild(document.createTextNode(T.th)); b.appendChild(K.el('small', '', T.m.length + ' ตัว'));
      b.addEventListener('click', function (e) { e.stopPropagation(); pick(i); });
      host.appendChild(b); tb.push(b);
    });
    var ft = K.foot($('#m2-ft'), { check: listen, checkLabel: '▶ ฟังทำนอง', show: function () { stop(); heard = true; at = TUNES[tune].m.length; draw(''); info.textContent = 'เฉลย: ' + TUNES[tune].sub; ft.say('ok', 'ชื่อโน้ต: ' + TUNES[tune].m.map(function (m) { return BYM[m].th; }).join(' ')); }, reset: function () { pick(tune); }, hint: '' });
    var KB = Keyboard($('#m2-kb'), onNote);
    pick(0);
    K.slide('m2', { set: function () { active = KB; }, leave: function () { stop(); if (active === KB) active = null; } });
    window.__m2 = { KB: KB, pick: pick, listen: listen, state: function () { return { tune: tune, at: at, heard: heard, playing: playing }; } };
  })();

  /* ============ slide 3 · read and place ============ */
  (function () {
    var svg = $('#m3-staff'); if (!svg) return;
    var ST = Staff(svg, { x0: 40, top: 110, gap: 34, w: 740 });
    /* memory aid (beat 1): line and space letters at the right end of the staff */
    var mg = S('g', {}, svg);
    ['E', 'G', 'B', 'D', 'F'].forEach(function (l, i) { var t = S('text', { x: 392, y: ST.y(i * 2) + 6, 'class': 'lnm' }, mg); t.textContent = l; });
    ['F', 'A', 'C', 'E'].forEach(function (l, i) { var t = S('text', { x: 418, y: ST.y(i * 2 + 1) + 6, 'class': 'lnm' }, mg); t.textContent = l; });
    var POOL = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8], cur = null, right = 0, tries = 0, last = null, fb = $('#m3-fb'), busy = false;
    var names = $('#m3-names'), nb = [];
    LET.forEach(function (l, i) {
      var b = K.el('button'); b.type = 'button'; b.appendChild(K.el('b', '', TH[i])); b.appendChild(K.el('span', '', l));
      b.addEventListener('click', function (e) { e.stopPropagation(); answer(i, b); });
      names.appendChild(b); nb.push(b);
    });
    var seq = [2, 0, 5, -2, 7, 3, 8, 1, 4, -1, 6], si = 0;
    function next() {
      busy = false; nb.forEach(function (b) { b.classList.remove('ok', 'no'); });
      var p = seq[si++ % seq.length]; if (p === last) p = seq[si++ % seq.length]; last = p;
      cur = natural(p); ST.clear(); ST.note(300, p, 'play' + (K.rm() ? '' : ' ink'));
      fb.className = 'ab fbk'; fb.textContent = 'แตะชื่อของโน้ตสีแดง';
    }
    function answer(i, b) {
      if (busy || !cur) return; tries++;
      if (LET[i] === cur.l) {
        right++; busy = true; b.classList.add('ok'); tone(cur.m); fb.className = 'ab fbk ok';
        fb.textContent = 'ถูกต้อง! โน้ตตัวนี้คือ ' + cur.th + ' (' + cur.l + ')';
        setTimeout(next, K.rm() ? 300 : 1200);
      } else { b.classList.add('no'); K.shake(b); fb.className = 'ab fbk no'; fb.textContent = 'ยังไม่ใช่ ลองนับเส้นและช่องจากเส้นล่างสุด (มี · E)'; }
      $('#m3-score').textContent = 'ถูก ' + right + ' จาก ' + tries + ' ครั้ง';
    }
    next(); $('#m3-score').textContent = 'ถูก 0 จาก 0 ครั้ง';

    /* place a note */
    var pv = $('#m3-place'), PS = Staff(pv, { x0: 30, top: 110, gap: 34, w: 680 }), np = 4, nEl = null, ask = 0;
    var ASK = [2, 0, 5, 1, 3, -2, 6, 4];
    function drawN(cls) { if (nEl) nEl.remove(); nEl = PS.note(380, np, (cls || 'stud') + ' grab'); }
    function setAsk() { var t = natural(ASK[ask % ASK.length]); $('#m3-ask').innerHTML = 'วางโน้ต <b>' + t.th + ' (' + t.l + ')</b>'; np = 4; drawN(); pf.say(''); }
    function fromEv(e) { var q = K.svgPt(pv, e); return K.clamp(Math.round((PS.y(0) - q.y) / 17), -2, 9); }
    K.drag(pv, { slop: 0,
      start: function (p, e) { var n = fromEv(e); if (n !== np) { np = n; drawN(); } pf.say(''); },
      move: function (p, d, e) { var n = fromEv(e); if (n !== np) { np = n; drawN(); } } });
    pv.setAttribute('tabindex', '0');
    pv.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault(); e.stopPropagation(); np = K.clamp(np + (e.key === 'ArrowUp' ? 1 : -1), -2, 9); drawN();
    });
    var pf = K.foot($('#m3-pft'), {
      check: function () {
        var t = natural(ASK[ask % ASK.length]), n = natural(np);
        if (np === t.p) { drawN('ok'); tone(t.m); pf.say('ok', 'ถูกต้อง! ' + t.th + ' (' + t.l + ') อยู่' + (t.p % 2 ? 'ในช่อง' : 'บนเส้น') + 'ตรงนี้'); }
        else { drawN('bad'); pf.say('no', 'ตอนนี้วางไว้ที่ ' + n.th + ' (' + n.l + ') ลอง' + (t.p > np ? 'เลื่อนขึ้น' : 'เลื่อนลง')); }
      },
      show: function () { np = ASK[ask % ASK.length]; drawN('ok'); var t = natural(np); pf.say('ok', 'เฉลย: ' + t.th + ' (' + t.l + ')'); },
      reset: function () { ask++; setAsk(); }
    });
    pf.bReset.textContent = 'ข้อต่อไป';
    setAsk();
    K.slide('m3', { set: function () {} });
    window.__m3 = { answer: answer, cur: function () { return cur; }, place: function () { return np; }, ask: function () { return ASK[ask % ASK.length]; } };
  })();
})();
