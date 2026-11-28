/* deck.js · สั่งหุ่นยนต์ด้วยโค้ด (ป.4–6) · the pixel world, the block puzzle and the binary switches (vanilla JS, no libraries).
   Pixel text: our own 5x7 bitmap font, drawn as one SVG path of squares (no font file).
   Slide 1: beat 1 drops a demo program into place block by block, then runs it with the current block highlighted.
   Slide 2: 3 levels. Drag blocks from the palette into the program (tap = add at the end); drag a block out to remove it;
            tap ×N on a repeat block to change its count. RUN / STEP / RESET / CLEAR / Show answer.
   Slide 3: 8 bit switches; beat 1 shows ×2 between places; beat 2 stores the letter A as 65 = 01000001. */
(function () {
  'use strict';
  var K = KIT, S = K.S, $ = K.$, $$ = K.$$;
  if (!document.getElementById('stage')) return;
  var INK = '#1B1B2F';

  /* ---------- 5x7 bitmap font ---------- */
  var FONT = {
    A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110',
    D: '11110100011000110001100011000111110', E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000',
    G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001', I: '01110001000010000100001000010001110',
    J: '00111000100001000010000101001001100', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111',
    M: '10001110111010110101100011000110001', N: '10001100011100110101100111000110001', O: '01110100011000110001100011000101110',
    P: '11110100011000111110100001000010000', Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001',
    S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100', U: '10001100011000110001100011000101110',
    V: '10001100011000110001100010101000100', W: '10001100011000110101101011010101010', X: '10001100010101000100010101000110001',
    Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111',
    '0': '01110100011001110101110011000101110', '1': '00100011000010000100001000010001110', '2': '01110100010000100010001000100011111',
    '3': '11111000100010000010000011000101110', '4': '00010001100101010010111110001000010', '5': '11111100001111000001000011000101110',
    '6': '00110010001000011110100011000101110', '7': '11111000010001000100010000100001000', '8': '01110100011000101110100011000101110',
    '9': '01110100011000101111000010001001100', '-': '00000000000000011111000000000000000', 'x': '00000100010101000100010101000100000',
    ':': '00000011000110000000011000110000000', '!': '00100001000010000100001000000000100', '?': '01110100010000100010001000000000100',
    '=': '00000000001111100000111110000000000', '+': '00000001000010011111001000010000000', '/': '00001000100001000100010001000010000', ' ': '00000000000000000000000000000000000'
  };
  /* draws text into an <svg>; o = {s: pixel size, fill, sh: shadow colour} */
  function pxText(svg, str, o) {
    var s = o.s || 6, d = '', x = 0;
    String(str).toUpperCase().split('').forEach(function (ch) {
      var g = FONT[ch] || FONT['?'];
      for (var r = 0; r < 7; r++) for (var c = 0; c < 5; c++) if (g[r * 5 + c] === '1') d += 'M' + (x + c) + ' ' + r + 'h1v1h-1z';
      x += 6;
    });
    var w = Math.max(1, x - 1), m = o.sh ? 1 : 0, VW = w + 1 + 2 * m, VH = 8 + 2 * m;
    svg.textContent = '';
    svg.setAttribute('viewBox', (-m) + ' ' + (-m) + ' ' + VW + ' ' + VH);
    svg.setAttribute('width', VW * s); svg.setAttribute('height', VH * s);
    svg.style.width = (VW * s) + 'px'; svg.style.height = (VH * s) + 'px';
    /* outline: the glyphs drawn dark one pixel around, then a drop shadow, then the letters */
    if (o.sh) [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1], [1, 2], [0, 2]].forEach(function (q) { S('path', { d: d, fill: o.sh, transform: 'translate(' + q[0] + ' ' + q[1] + ')' }, svg); });
    S('path', { d: d, fill: o.fill || INK }, svg);
    return svg;
  }
  /* a pixel picture from rows of characters; pal maps a character to a colour */
  function pix(g, rows, pal, x0, y0) {
    var by = {};
    rows.forEach(function (row, y) { row.split('').forEach(function (ch, x) { if (pal[ch]) (by[ch] = by[ch] || []).push('M' + (x0 + x) + ' ' + (y0 + y) + 'h1v1h-1z'); }); });
    Object.keys(by).forEach(function (ch) { S('path', { d: by[ch].join(''), fill: pal[ch] }, g); });
    return g;
  }

  /* ---------- the world behind every slide: pixel clouds and grass ---------- */
  var CLOUD = ['....####......', '..########....', '.###########..', '##############', '.############.'];
  $$('.slide').forEach(function (sl, i) {
    var w = S('svg', { 'class': 'world', viewBox: '0 0 480 270', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    var pos = [[[30, 22], [300, 14], [404, 46]], [[220, 10], [380, 24]], [[60, 16], [250, 8], [420, 30]]][i % 3];
    pos.forEach(function (p) { pix(S('g', {}, w), CLOUD, { '#': '#FFFFFF' }, p[0], p[1]); pix(S('g', {}, w), ['..............', '..............', '..............', '..............', '.############.'], { '#': '#DDEFFA' }, p[0], p[1] + 1); });
    S('rect', { x: 0, y: 251, width: 480, height: 19, fill: '#5DBB4A' }, w);
    S('rect', { x: 0, y: 251, width: 480, height: 2, fill: '#86D46F' }, w);
    var tufts = '';
    for (var x = 3; x < 480; x += 11) tufts += 'M' + x + ' 250h1v1h-1z M' + (x + 4) + ' 256h1v1h-1z M' + (x + 7) + ' 262h2v1h-2z ';
    S('path', { d: tufts, fill: '#3E9A30' }, w);
    sl.insertBefore(w, sl.firstChild);
  });

  /* ---------- block icons (8x8) ---------- */
  var ICON = {
    F: ['...##...', '..####..', '.######.', '...##...', '...##...', '...##...', '...##...', '........'],
    L: ['..#.....', '.##.....', '######..', '.##..#..', '..#..#..', '.....#..', '.....#..', '........'],
    R: ['.....#..', '.....##.', '..######', '..#..##.', '..#..#..', '..#.....', '..#.....', '........'],
    P: ['..####..', '.#....#.', '#......#', '#......#', '#....###', '.#....#.', '..##.#..', '........']
  };
  var NAME = { F: 'เดินหน้า', L: 'หันซ้าย', R: 'หันขวา', P: 'ทำซ้ำ' };
  function icon(t) { var s = S('svg', { viewBox: '0 0 8 8', 'aria-hidden': 'true' }); pix(s, ICON[t], { '#': '#FFFFFF' }, 0, 0); return s; }
  function block(t, n) {
    var b = K.el('div', 'blk ' + t); b.appendChild(icon(t)); b.appendChild(K.el('span', '', NAME[t]));
    if (t === 'P') { var c = K.el('span', 'n', '×' + (n || 3)); b.appendChild(c); b._n = c; }
    b.setAttribute('aria-label', NAME[t] + (t === 'P' ? ' ' + (n || 3) + ' ครั้ง' : ''));
    return b;
  }

  /* ---------- map tiles + robot sprite (16 units per tile) ---------- */
  var ROBOT = ['...kkkkkk...', '..kggggggk..', '..kkkkkkkk..', '.kwwwwwwwwk.', '.kwwwwwwbbk.', '.kwwwyywwbk.', '.kwwwyywwbk.', '.kwwwwwwbbk.', '.kwwwwwwwwk.', '..kkkkkkkk..', '..kggggggk..', '...kkkkkk...'];
  var RPAL = { k: INK, g: '#6B6F80', w: '#F2F2F2', b: '#2F9BD6', y: '#FFC43D' };
  var DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
  function hash(x, y) { var h = (x * 374761393 + y * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return h; }
  function drawTile(g, ch, x, y) {
    var X = x * 16, Y = y * 16, h = hash(x + 3, y + 7), d = '', k;
    S('rect', { x: X, y: Y, width: 16, height: 16, fill: (x + y) % 2 ? '#7BC96F' : '#83CF76' }, g);
    for (k = 0; k < 6; k++) { var px = (h >> (k * 4)) & 15, py = (h >> (k * 4 + 2)) & 15; d += 'M' + (X + px) + ' ' + (Y + py) + 'h1v1h-1z'; }
    S('path', { d: d, fill: '#5FB052' }, g);
    if (ch === '#') {
      S('rect', { x: X, y: Y, width: 16, height: 16, fill: '#8A8FA3' }, g);
      S('path', { d: 'M' + X + ' ' + (Y + 5) + 'h16v1h-16z M' + X + ' ' + (Y + 11) + 'h16v1h-16z M' + (X + 7) + ' ' + Y + 'v5h1v-5z M' + (X + 3) + ' ' + (Y + 6) + 'v5h1v-5z M' + (X + 11) + ' ' + (Y + 6) + 'v5h1v-5z M' + (X + 7) + ' ' + (Y + 12) + 'v4h1v-4z', fill: '#5E6378' }, g);
      S('path', { d: 'M' + X + ' ' + Y + 'h16v1h-16z M' + X + ' ' + Y + 'v16h1v-16z', fill: '#B3B7C8' }, g);
      S('path', { d: 'M' + X + ' ' + (Y + 15) + 'h16v1h-16z M' + (X + 15) + ' ' + Y + 'v16h1v-16z', fill: '#4A4E61' }, g);
    }
    if (ch === 'S') S('rect', { x: X + 2, y: Y + 2, width: 12, height: 12, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 1, 'stroke-dasharray': '2 2', opacity: 0.8 }, g);
    if (ch === 'G') pix(S('g', { 'class': 'flag' }, g), ['.....', '.krrr', '.krrrr', '.krrr', '.k...', '.k...', '.k...', '.k...', '.k...', 'kkk..'], { k: INK, r: '#D9452B' }, X + 5, Y + 3);
    if (ch === '*') pix(S('g', { 'class': 'flag' }, g), ['....k....', '...kyk...', 'kkkkyykkk', '.kyyyyyk.', '..kyyyk..', '.kyykyyk.', '.kk...kk.'], { k: INK, y: '#FFC43D' }, X + 3, Y + 4);
  }
  function World(svg, rows) {
    var g = S('g', {}, svg), W = rows[0].length, H = rows.length, st = null, goal = null;
    rows.forEach(function (row, y) { row.split('').forEach(function (ch, x) { drawTile(g, ch, x, y); if (ch === 'S') st = { x: x, y: y }; if (ch === 'G' || ch === '*') goal = { x: x, y: y }; }); });
    S('rect', { x: 0, y: 0, width: W * 16, height: H * 16, fill: 'none', stroke: INK, 'stroke-width': 1 }, svg);
    var rob = S('g', {}, svg), body = S('g', {}, rob);
    pix(body, ROBOT, RPAL, -6, -6);
    var o = { x: 0, y: 0, d: 0, ang: 0 };
    function place() { rob.setAttribute('transform', 'translate(' + (o.x * 16 + 8) + ' ' + (o.y * 16 + 8) + ') rotate(' + o.ang + ')'); }
    var A = K.Anim();
    return {
      rows: rows, start: st, goal: goal, o: o,
      free: function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && rows[y][x] !== '#'; },
      set: function (x, y, d) { A.stop(); o.x = x; o.y = y; o.d = d; o.ang = d * 90; place(); },
      move: function (x, y, ms, done) { var x0 = o.x, y0 = o.y; A.run(ms, function (p) { o.x = x0 + (x - x0) * p; o.y = y0 + (y - y0) * p; place(); }, done, K.eio); },
      turn: function (d, dir, ms, done) { var a0 = o.ang, a1 = a0 + dir * 90; o.d = d; A.run(ms, function (p) { o.ang = a0 + (a1 - a0) * p; place(); }, done, K.eio); },
      bump: function (ms, done) {
        var x0 = o.x, y0 = o.y, dx = DX[o.d] * 0.3, dy = DY[o.d] * 0.3;
        A.run(ms, function (p) { var q = p < 0.5 ? p * 2 : (1 - p) * 2; o.x = x0 + dx * q; o.y = y0 + dy * q; place(); }, done, function (t) { return t; });
      },
      stop: function () { A.stop(); }
    };
  }

  /* ---------- running a program ---------- */
  function flatten(prog) {
    var out = [];
    prog.forEach(function (it) {
      if (it.t === 'P') { for (var k = 1; k <= it.n; k++) it.body.forEach(function (b) { out.push({ it: b, rep: it, k: k }); }); }
      else out.push({ it: it });
    });
    return out;
  }
  /* Runner: steps a world through a program; ui = {status(kind, text), done(ok)} */
  function Runner(world, ui) {
    var steps = [], at = 0, timer = null, live = false, x, y, d;
    function clear() { $$('.blk.now,.blk.bad').forEach(function (b) { b.classList.remove('now', 'bad'); }); }
    function reps(prog) { prog.forEach(function (it) { if (it.t === 'P' && it.el && it.el._n) it.el._n.textContent = '×' + it.n; }); }
    var R = {
      running: function () { return live; },
      load: function (prog) { R.stop(); clear(); reps(prog); steps = flatten(prog); at = 0; R.fin = false; x = world.start.x; y = world.start.y; d = world.startD || 0; world.set(x, y, d); R.prog = prog; },
      stop: function () { clearTimeout(timer); timer = null; live = false; },
      step: function (cb) {
        if (R.fin) return false;
        if (at >= steps.length) { R.stop(); ui.status('no', 'โปรแกรมจบแล้ว แต่หุ่นยนต์ยังไม่ถึงเป้าหมาย ลองแก้โปรแกรม'); ui.done(false); return false; }
        var s = steps[at++], t = s.it.t, ms = K.rm() ? 0 : 380;
        clear(); if (s.it.el) s.it.el.classList.add('now');
        if (s.rep && s.rep.el) { s.rep.el.classList.add('now'); s.rep.el._n.textContent = s.k + '/' + s.rep.n; }
        if (t === 'L' || t === 'R') { d = (d + (t === 'L' ? 3 : 1)) % 4; ui.status('', at + '. ' + NAME[t]); world.turn(d, t === 'L' ? -1 : 1, ms, cb); return true; }
        var nx = x + DX[d], ny = y + DY[d];
        if (!world.free(nx, ny)) {
          if (s.it.el) s.it.el.classList.add('bad');
          world.bump(K.rm() ? 0 : 420); R.stop(); ui.status('no', 'ชนกำแพง! ดูบล็อกสีแดง แล้วแก้โปรแกรม'); ui.done(false); return false;
        }
        x = nx; y = ny;
        ui.status('', at + '. ' + NAME[t]);
        world.move(x, y, ms, function () {
          if (x === world.goal.x && y === world.goal.y) { R.stop(); R.fin = true; clear(); reps(R.prog); ui.status('ok', 'ถึงเป้าหมายแล้ว ผ่านด่าน!'); ui.done(true); return; }
          if (cb) cb();
        });
        return true;
      },
      run: function () {
        if (live) return; live = true;
        (function next() {
          if (!live) return;
          var ok = R.step(function () { if (live) timer = setTimeout(next, K.rm() ? 120 : 170); });
          if (!ok) live = false;
        })();
      }
    };
    return R;
  }

  /* ============ slide 1 · demo ============ */
  (function () {
    var svg = $('#c1-map'); if (!svg) return;
    pxText($('#c1-logo'), 'CODE ROBOT', { s: 12, fill: '#FFFFFF', sh: INK });
    var leg = $('#c1-leg');
    [['F', 'เดินไปข้างหน้า 1 ช่อง ตามทิศที่หุ่นยนต์หันอยู่'], ['L', 'หมุนตัวไปทางซ้าย 90° (อยู่ช่องเดิม)'], ['R', 'หมุนตัวไปทางขวา 90° (อยู่ช่องเดิม)'], ['P', 'ทำบล็อกข้างในซ้ำตามจำนวนครั้ง']].forEach(function (r) {
      var row = K.el('div', 'row'); var b = block(r[0], 3); b.style.cursor = 'default'; row.appendChild(b); row.appendChild(K.el('p', '', r[1])); leg.appendChild(row);
    });
    var W = World(svg, ['S....#..', '......#.', '.#..*...']);
    var prog = [{ t: 'P', n: 3, body: [{ t: 'F' }] }, { t: 'R' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }];
    var box = $('#c1-prog'), stat = $('#c1-stat');
    var ui = { status: function (k, t) { stat.className = 'stat' + (k ? ' ' + k : ''); stat.textContent = t; }, done: function () {} };
    var run = Runner(W, ui), tm = [];
    function render(fall) {
      box.textContent = ''; var k = 0;
      prog.forEach(function (it) {
        if (it.t === 'P') {
          var rep = K.el('div', 'rep'), h = block('P', it.n); it.el = h; rep.appendChild(h);
          it.body.forEach(function (b) { b.el = block(b.t); rep.appendChild(b.el); if (fall) { b.el.classList.add('fall'); b.el.style.animationDelay = (++k * 170) + 'ms'; } });
          if (fall) { h.classList.add('fall'); h.style.animationDelay = (k++ * 170 - 170) + 'ms'; }
          box.appendChild(rep);
        } else { it.el = block(it.t); if (fall) { it.el.classList.add('fall'); it.el.style.animationDelay = (++k * 170) + 'ms'; } box.appendChild(it.el); }
      });
    }
    function stopAll() { tm.forEach(clearTimeout); tm = []; run.stop(); W.stop(); }
    function idle() { stopAll(); box.textContent = ''; W.set(0, 0, 0); ui.status('', 'กด → เพื่อดูหุ่นยนต์ทำตามโปรแกรม'); }
    function play(fall) {
      stopAll(); render(fall && !K.rm()); run.load(prog);
      ui.status('', 'หุ่นยนต์อ่านโปรแกรมจากบนลงล่าง ทีละบล็อก');
      if (K.rm()) { var g = 0; while (run.step(null) && g++ < 50) {} return; }
      tm.push(setTimeout(function () { run.run(); }, fall ? 1500 : 300));
    }
    $('#c1-again').addEventListener('click', function (e) { e.stopPropagation(); play(false); });
    W.start = { x: 0, y: 0 }; W.goal = { x: 4, y: 2 };
    K.slide('c1', { set: function (st, prev) { if (st === 0) idle(); else play(prev === 0); }, leave: stopAll });
  })();

  /* ============ slide 2 · the puzzle ============ */
  (function () {
    var svg = $('#c2-map'); if (!svg) return;
    var LV = [
      { rows: ['......', '.#....', '.#.G#.', '....#.', '.##...', 'S.....'], max: 8, sol: [{ t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'F' }],
        goal: 'พาหุ่นยนต์ไปที่<b>ธงแดง</b> · ใช้บล็อกได้ไม่เกิน <b>8</b> บล็อก' },
      { rows: ['######', '####G#', '###..#', '##..##', '#..###', 'S.####'], max: 6, sol: [{ t: 'P', n: 4, body: [{ t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'R' }] }],
        goal: 'เดินขึ้นบันได · ใช้ได้ไม่เกิน <b>6</b> บล็อก ต้องใช้<b>ทำซ้ำ</b>' },
      { rows: ['######', '####G#', '####.#', '##...#', '##.###', 'S..###'], max: 7, sol: [{ t: 'P', n: 2, body: [{ t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'R' }] }],
        goal: 'บันไดขั้นยาว · ใช้ได้ไม่เกิน <b>7</b> บล็อก หารูปแบบที่ซ้ำกัน' }
    ];
    var slideEl = $('#c2'), progEl = $('#c2-prog'), stat = $('#c2-stat'), lv = 0, W = null, prog = [], solved = [false, false, false];
    var mark = K.el('div', 'mark');
    var ui = { status: function (k, t) { stat.className = 'stat' + (k ? ' ' + k : ''); stat.textContent = t; },
      done: function (ok) { runB.querySelector('span').textContent = '▶ เริ่ม'; if (ok) { solved[lv] = true; tabs(); } } };
    var run = null;
    /* tabs */
    var tabsEl = $('#c2-tabs'), tabBtns = [];
    LV.forEach(function (L, i) {
      var b = K.el('button'); b.type = 'button'; b.setAttribute('aria-label', 'ด่าน ' + (i + 1));
      var t = S('svg', { 'class': 'px' }); t.style.position = 'relative'; pxText(t, 'LEVEL ' + (i + 1), { s: 4 }); b.appendChild(t);
      var st = S('svg', { 'class': 'star', viewBox: '0 0 9 9' }); b.appendChild(st); b._st = st;
      b.addEventListener('click', function (e) { e.stopPropagation(); load(i, true); });
      tabsEl.appendChild(b); tabBtns.push(b);
    });
    function tabs() {
      tabBtns.forEach(function (b, i) {
        b.setAttribute('aria-pressed', i === lv ? 'true' : 'false'); b._st.textContent = '';
        pix(b._st, ['....k....', '...kyk...', 'kkkkyykkk', '.kyyyyyk.', '..kyyyk..', '.kyykyyk.', '.kk...kk.'], { k: INK, y: solved[i] ? '#FFC43D' : '#FFFFFF' }, 0, 1);
      });
    }
    function count(p) { return p.reduce(function (a, it) { return a + 1 + (it.body ? it.body.length : 0); }, 0); }
    function copy(p) { return p.map(function (it) { return it.t === 'P' ? { t: 'P', n: it.n, body: it.body.map(function (b) { return { t: b.t }; }) } : { t: it.t }; }); }
    function load(i, keep) {
      if (run) run.stop();
      lv = i; svg.textContent = '';
      W = World(svg, LV[i].rows); W.startD = 0;
      run = Runner(W, ui);
      if (!keep || !LV[i].saved) prog = []; else prog = LV[i].saved;
      $('#c2-goal').innerHTML = LV[i].goal;
      tabs(); render(); reset();
    }
    function reset() { if (run) run.load(prog); runB.querySelector('span').textContent = '▶ เริ่ม'; ui.status('', 'หุ่นยนต์หันไปทางขวา เริ่มที่กรอบประ'); }
    /* render the program */
    function render() {
      LV[lv].saved = prog;
      progEl.textContent = ''; progEl.appendChild(mark);
      if (!prog.length) progEl.appendChild(K.el('p', 'empty', 'ลากบล็อกมาวางที่นี่\nหรือแตะบล็อกด้านบน'));
      prog.forEach(function (it, i) {
        if (it.t === 'P') {
          var rep = K.el('div', 'rep'), h = block('P', it.n); h._path = [i]; it.el = h; rep.appendChild(h); rep._i = i;
          h._n.addEventListener('click', function (e) { e.stopPropagation(); it.n = it.n >= 5 ? 2 : it.n + 1; h._n.textContent = '×' + it.n; h.setAttribute('aria-label', 'ทำซ้ำ ' + it.n + ' ครั้ง'); reset(); });
          var body = K.el('div', 'body'); rep._body = body;
          if (!it.body.length) body.appendChild(K.el('div', 'hole', 'วางบล็อกข้างในนี้'));
          it.body.forEach(function (b, j) { var e = block(b.t); e._path = [i, j]; b.el = e; body.appendChild(e); hook(e); });
          rep.appendChild(body); rep.appendChild(K.el('div', 'cap'));
          progEl.appendChild(rep); hook(h);
        } else { var e = block(it.t); e._path = [i]; it.el = e; progEl.appendChild(e); hook(e); }
      });
      $('#c2-count').textContent = 'ใช้ ' + count(prog) + ' / ' + LV[lv].max + ' บล็อก';
    }
    /* where would a drop at stage point p go? -> {i, j} (j = index inside repeat i) or null when outside */
    function target(p, moving) {
      var pb = K.box(progEl);
      if (p.x < pb.x - 30 || p.x > pb.x + pb.w + 30 || p.y < pb.y - 30 || p.y > pb.y + pb.h + 30) return null;
      var kids = [].slice.call(progEl.children).filter(function (c) { return c.classList.contains('blk') || c.classList.contains('rep'); });
      for (var i = 0; i < kids.length; i++) {
        var c = kids[i], b = K.box(c);
        if (c.classList.contains('rep') && (!moving || moving.t !== 'P')) {
          var bb = K.box(c._body);
          if (p.y > bb.y - 6 && p.y < bb.y + bb.h + 4 && p.x > b.x + 16) {
            var inner = [].slice.call(c._body.children).filter(function (e) { return e.classList.contains('blk'); });
            for (var j = 0; j < inner.length; j++) { var ib = K.box(inner[j]); if (p.y < ib.y + ib.h / 2) return { i: c._i, j: j, y: ib.y - 3, x: ib.x }; }
            var last = inner.length ? K.box(inner[inner.length - 1]) : null;
            return { i: c._i, j: inner.length, y: last ? last.y + last.h + 1 : bb.y + 2, x: bb.x + 10 };
          }
        }
        if (p.y < b.y + Math.min(b.h, 52) / 2) return { i: i, y: b.y - 3, x: b.x };
      }
      var lb = kids.length ? K.box(kids[kids.length - 1]) : null;
      return { i: kids.length, y: lb ? lb.y + lb.h + 1 : pb.y + 12, x: pb.x + 12 };
    }
    function showMark(t) {
      if (!t) { mark.classList.remove('on'); progEl.classList.remove('over'); return; }
      var pb = K.box(progEl); mark.classList.add('on'); progEl.classList.add('over');
      mark.style.top = (t.y - pb.y) + 'px'; mark.style.left = (t.x - pb.x) + 'px';
    }
    function insert(it, t) { if (t.j != null && prog[t.i] && prog[t.i].t === 'P') prog[t.i].body.splice(t.j, 0, it); else prog.splice(t.i, 0, it); }
    function take(path) { return path.length === 2 ? prog[path[0]].body.splice(path[1], 1)[0] : prog.splice(path[0], 1)[0]; }
    function tooMany(extra) { if (count(prog) + extra <= LV[lv].max) return false; ui.status('no', 'ด่านนี้ใช้ได้ไม่เกิน ' + LV[lv].max + ' บล็อก ลองใช้บล็อกทำซ้ำ'); return true; }
    var ghost = null, gofs = null;
    function lift(src, p) {
      var b = K.box(src); gofs = { x: p.x - b.x, y: p.y - b.y };
      ghost = src.cloneNode(true); ghost.classList.add('drag'); ghost.style.width = b.w + 'px';
      ghost.style.left = b.x + 'px'; ghost.style.top = b.y + 'px'; slideEl.appendChild(ghost);
    }
    function moveGhost(p) { if (ghost) { ghost.style.left = (p.x - gofs.x) + 'px'; ghost.style.top = (p.y - gofs.y) + 'px'; } }
    function drop() { if (ghost) ghost.remove(); ghost = null; showMark(null); }
    /* palette */
    var pal = $('#c2-pal');
    ['F', 'L', 'R', 'P'].forEach(function (t) {
      var b = block(t, 3); b.tabIndex = 0; b.setAttribute('role', 'button'); pal.appendChild(b);
      function add() { if (run.running()) return; if (tooMany(1)) { K.shake(b); return; } prog.push(t === 'P' ? { t: 'P', n: 3, body: [] } : { t: t }); render(); reset(); }
      K.drag(b, {
        start: function (p) { if (run.running()) return false; },
        move: function (p) { if (!ghost) lift(b, p); moveGhost(p); showMark(target(p, { t: t })); },
        end: function (p, e, moved, cancelled) {
          if (!moved) { drop(); add(); return; }
          var tg = cancelled ? null : target(p, { t: t }); drop();
          if (!tg) return;
          if (tooMany(1)) return;
          insert(t === 'P' ? { t: 'P', n: 3, body: [] } : { t: t }, tg); render(); reset();
        }
      });
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); add(); } });
    });
    /* program blocks: drag to move, drag out to remove */
    function hook(el) {
      K.drag(el, {
        start: function (p, e) { if (run.running() || (e.target.closest && e.target.closest('.n'))) return false; },
        move: function (p) { if (!ghost) { lift(el, p); el.style.opacity = '.35'; } moveGhost(p); var it = el._path.length === 2 ? prog[el._path[0]].body[el._path[1]] : prog[el._path[0]]; showMark(target(p, it)); },
        end: function (p, e, moved, cancelled) {
          el.style.opacity = '';
          if (!moved) { drop(); return; }
          var path = el._path, it = path.length === 2 ? prog[path[0]].body[path[1]] : prog[path[0]];
          var tg = cancelled ? { keep: 1 } : target(p, it); drop();
          if (tg && tg.keep) return;
          if (!tg) { take(path); render(); reset(); ui.status('', 'นำบล็อก "' + NAME[it.t] + '" ออกแล้ว'); return; }
          /* adjust the target index if the block is removed from before it in the same list */
          var same = (path.length === 1 && tg.j == null) || (path.length === 2 && tg.j != null && tg.i === path[0]);
          take(path);
          if (same) { var k = path.length === 1 ? path[0] : path[1]; if (tg.j == null && tg.i > k) tg.i--; if (tg.j != null && tg.j > k) tg.j--; }
          else if (path.length === 1 && tg.j != null && tg.i > path[0]) tg.i--;
          insert(it, tg); render(); reset();
        }
      });
    }
    /* controls */
    var ctl = $('#c2-ctl');
    function pb(label, cls, fn) { var b = K.el('button', 'pbtn ' + (cls || '')); b.type = 'button'; b.appendChild(K.el('span', '', label)); b.addEventListener('click', function (e) { e.stopPropagation(); fn(); }); ctl.appendChild(b); return b; }
    var runB = pb('▶ เริ่ม', 'go', function () {
      if (run.running()) { run.stop(); runB.querySelector('span').textContent = '▶ เริ่ม'; ui.status('', 'หยุดแล้ว'); return; }
      if (!prog.length) { ui.status('no', 'ยังไม่มีโปรแกรม ลากบล็อกมาวางก่อน'); return; }
      run.load(prog); runB.querySelector('span').textContent = '■ หยุด'; run.run();
    });
    pb('⏭ ทีละขั้น', '', function () {
      if (run.running()) return;
      if (!prog.length) { ui.status('no', 'ยังไม่มีโปรแกรม ลากบล็อกมาวางก่อน'); return; }
      if (!run.prog || run._done) { run.load(prog); run._done = false; }
      if (!run.step(null)) run._done = true;
    });
    pb('↺ กลับจุดเริ่ม', '', function () { reset(); run._done = false; });
    pb('✕ ล้างโปรแกรม', '', function () { prog = []; render(); reset(); });
    pb('ดูเฉลย', 'ans', function () { prog = copy(LV[lv].sol); render(); reset(); ui.status('ok', 'เฉลยด่าน ' + (lv + 1) + ': กดเริ่มเพื่อดูหุ่นยนต์เดิน'); });
    var oldDone = ui.done; ui.done = function (ok) { oldDone(ok); run._done = true; };
    load(0);
    K.slide('c2', { set: function () {}, leave: function () { if (run) run.stop(); runB.querySelector('span').textContent = '▶ เริ่ม'; } });
    window.__robot = { load: load, get prog() { return prog; }, set prog(p) { prog = p; render(); reset(); }, run: function () { return run; }, W: function () { return W; }, solved: solved, LV: LV, copy: copy };
  })();

  /* ============ slide 3 · binary ============ */
  (function () {
    var host = $('#c3-bits'); if (!host) return;
    pxText($('#c3-logo'), 'BINARY', { s: 12, fill: '#FFFFFF', sh: INK });
    var V = [128, 64, 32, 16, 8, 4, 2, 1], on = [0, 0, 0, 0, 0, 0, 0, 0], cols = [];
    var LAMP_ON = ['..kkkkkkkk..', '.kyyyyyyyyk.', 'kyywwyyyyyyk', 'kywwyyyyyyyk', 'kyyyyyyyyyyk', 'kyyyyyyyyyyk', 'kyyyyyyyyyok', 'kyyyyyyyyook', 'kyyyyyyyoook', '.kyyyyyoook.', '..kkkkkkkk..', '...kggggk...'];
    var LAMP_OFF = LAMP_ON.map(function (r) { return r.replace(/[yo]/g, 'd').replace(/w/g, 'l'); });
    var LPAL = { k: INK, y: '#FFD447', o: '#F2A93B', w: '#FFFBE0', d: '#5C6075', l: '#7D8197', g: '#9A9EB0' };
    function sw(up) {
      var r = ['kkkkkkkk', 'kssssssk', 'kssssssk', 'kssssssk', 'kssssssk', 'kssssssk', 'kssssssk', 'kssssssk', 'kssssssk', 'kssssssk', 'kssssssk', 'kssssssk', 'kkkkkkkk'];
      var knob = ['khhhhhhk', 'khrrrrdk', 'krrrrrdk', 'kddddddk'];
      var at = up ? 1 : 8;
      knob.forEach(function (row, k) { r[at + k] = row; });
      return r;
    }
    var SPAL = { k: INK, s: '#3B3F55', h: '#FF8A7A', r: '#E2513A', d: '#A8321F' };
    V.forEach(function (v, i) {
      var c = K.el('div', 'bit'); c.tabIndex = 0; c.setAttribute('role', 'switch'); c.setAttribute('aria-checked', 'false'); c.setAttribute('aria-label', 'บิตค่า ' + v);
      var pv = S('svg', { 'class': 'px pv' }); pv.style.position = 'relative'; pxText(pv, String(v), { s: 6, fill: '#26324D' });
      var lamp = S('svg', { 'class': 'lamp', viewBox: '0 0 12 12' });
      var s = S('svg', { 'class': 'sw', viewBox: '0 0 8 13' });
      var dg = S('svg', { 'class': 'px d' }); dg.style.position = 'relative';
      c.appendChild(pv); c.appendChild(lamp); c.appendChild(s); c.appendChild(dg);
      if (i > 0) { var x = K.el('span', 'x2', '×2 ←'); x.style.left = '-36px'; c.appendChild(x); }
      host.appendChild(c);
      var C = { c: c, lamp: lamp, s: s, dg: dg };
      c.addEventListener('click', function (e) { e.stopPropagation(); flip(i); });
      c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); flip(i); } });
      cols.push(C);
    });
    function draw(i) {
      var C = cols[i]; C.lamp.textContent = ''; C.s.textContent = '';
      pix(C.lamp, on[i] ? LAMP_ON : LAMP_OFF, LPAL, 0, 0); pix(C.s, sw(on[i]), SPAL, 0, 0);
      pxText(C.dg, on[i] ? '1' : '0', { s: 7, fill: on[i] ? '#1B1B2F' : '#7D8197' });
      C.c.setAttribute('aria-checked', on[i] ? 'true' : 'false');
    }
    var tg = null, tgBtns = [], fb = $('#c3-fb');
    function total() { return on.reduce(function (a, b, i) { return a + (b ? V[i] : 0); }, 0); }
    function sum() {
      var n = total();
      pxText($('#c3-sum'), '= ' + n, { s: 11, fill: '#1B1B2F' });
      var parts = V.filter(function (v, i) { return on[i]; });
      $('#c3-eq').textContent = parts.length ? parts.join(' + ') + ' = ' + n : 'ยังไม่ได้เปิดไฟดวงไหน = 0';
      if (tg != null) {
        if (n === tg) { fb.className = 'stat ok'; fb.textContent = 'ถูกต้อง! ' + tg + ' = ' + parts.join(' + '); tgBtns.forEach(function (b) { if (+b.dataset.v === tg) b.classList.add('done'); }); }
        else { fb.className = 'stat'; fb.textContent = 'ตอนนี้ได้ ' + n + (n > tg ? ' มากเกินไป ลองปิดบางดวง' : ' ยังขาดอีก ' + (tg - n)); }
      }
    }
    function flip(i) { on[i] = on[i] ? 0 : 1; draw(i); sum(); if (!K.rm() && cols[i].lamp.animate) cols[i].lamp.animate([{ transform: 'scale(.86)' }, { transform: 'none' }], { duration: 220 }); }
    function setAll(bits, anim, done) {
      var k = 0;
      (function nx() {
        if (k >= 8) { if (done) done(); return; }
        var i = k++; if (on[i] !== bits[i]) { on[i] = bits[i]; draw(i); sum(); if (anim && !K.rm()) return setTimeout(nx, 130); }
        nx();
      })();
    }
    [5, 13, 100, 255].forEach(function (v) {
      var b = K.el('button', 'pbtn'); b.type = 'button'; b.dataset.v = v; b.appendChild(K.el('span', '', String(v))); b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function (e) { e.stopPropagation(); tg = v; tgBtns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); fb.className = 'stat'; sum(); });
      $('#c3-tg').appendChild(b); tgBtns.push(b);
    });
    fb.textContent = 'แตะตัวเลขเป้าหมาย แล้วเปิดสวิตช์ให้ได้เลขนั้น';
    pxText($('#c3-Apx'), 'A', { s: 22, fill: '#7A45B5' });
    for (var i = 0; i < 8; i++) draw(i);
    sum();
    var saved = null;
    K.slide('c3', {
      set: function (st, prev) {
        if (st === 2) { if (prev !== 2) saved = on.slice(); setAll([0, 1, 0, 0, 0, 0, 0, 1], prev === 1); }
        else if (prev === 2 && saved) { setAll(saved, false); }
      }
    });
    window.__bin = { on: on, flip: flip, total: total };
  })();
})();
