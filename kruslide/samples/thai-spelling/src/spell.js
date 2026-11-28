/* spell.js · the live parts of the ประสมคำ sample (vanilla JS, no libraries, no network).
   Slide 2: tap or drag a consonant, a vowel and a tone mark into the slots; the word assembles (Thai writing order is
   worked out here: ไ/เ before the consonant, the tone mark on top, า after), the spelling chant and the reading appear,
   and a picture word goes into the picture book (8 to find).
   Slide 3: the w-sort widget from tools.js, dressed as three paper houses (roofs and memory sentences added here). */
(function () {
  'use strict';
  var $ = K.$, $$ = K.$$, E = K.E, S = K.S;

  /* ---------- letters ---------- */
  var CONS = ['ป', 'ม', 'ต', 'ง', 'ย'];
  var VOW = [
    { k: 'า', name: 'อา', ga: 'อา', gb: '<span class="h">อ</span>า' },
    { k: 'ู', name: 'อู', ga: 'อู', gb: 'อู', cls: 'bot' },
    { k: 'ไ', name: 'ไอ', ga: 'ไอ', gb: 'ไ<span class="h">อ</span>' },
    { k: 'เา', name: 'เอา', ga: 'เอา', gb: 'เ<span class="h">อ</span>า' }
  ];
  var TONE = [
    { k: '่', name: 'ไม้เอก', ga: 'อ่', gb: 'อ่', cls: 'top' },
    { k: '้', name: 'ไม้โท', ga: 'อ้', gb: 'อ้', cls: 'top' },
    { k: '', name: 'ไม่มี' }
  ];
  /* Thai writing order: ไ– and เ–า are written before the consonant; the tone mark sits on the consonant
     (after a below-vowel such as ู in Unicode order); า follows. */
  function compose(c, v, t) {
    if (v === 'า') return c + t + 'า';
    if (v === 'ู') return c + 'ู' + t;
    if (v === 'ไ') return 'ไ' + c + t;
    return 'เ' + c + t + 'า';
  }
  /* our word list: meaning in kid language; pic = one of the 8 paper pictures */
  var DICT = {
    'ปา': 'โยนของออกไป', 'ป่า': 'ที่ที่มีต้นไม้มากมาย', 'ป้า': 'พี่สาวของพ่อหรือแม่', 'ปู': 'สัตว์มีก้าม เดินข้าง ๆ', 'ปู่': 'พ่อของพ่อ',
    'ไป': 'ออกจากที่นี่ เช่น ไปโรงเรียน', 'เป่า': 'พ่นลมออกจากปาก', 'เป้า': 'สิ่งที่เราเล็งให้ถูก',
    'มา': 'เข้ามาหา เช่น มาที่นี่', 'ม้า': 'สัตว์สี่ขา วิ่งเร็ว', 'ไม่': 'คำปฏิเสธ เช่น ไม่ใช่', 'ไม้': 'ได้มาจากต้นไม้',
    'ตา': 'ใช้มองเห็น', 'ตู้': 'ที่เก็บของ มีประตู', 'ไต': 'อวัยวะในร่างกาย', 'ไต่': 'ปีนขึ้นไป', 'เตา': 'ที่ก่อไฟทำอาหาร', 'เต่า': 'สัตว์มีกระดอง เดินช้า',
    'งา': 'เมล็ดเล็ก ๆ ใช้ทำอาหาร', 'งู': 'สัตว์ตัวยาว ไม่มีขา', 'เงา': 'ส่วนมืดที่เกิดเมื่อแสงส่องมา',
    'ยา': 'ใช้รักษาตอนไม่สบาย', 'ย่า': 'แม่ของพ่อ'
  };
  var PICS = [['ปู', 'pic-pu'], ['ม้า', 'pic-ma'], ['เต่า', 'pic-tao'], ['งู', 'pic-ngu'], ['ตา', 'pic-ta'], ['ตู้', 'pic-tu'], ['เป้า', 'pic-pao'], ['ยา', 'pic-ya']];
  var PIC = {}; PICS.forEach(function (p) { PIC[p[0]] = p[1]; });

  function glyph(kind, it) {
    if (kind === 'c') return '<span class="gl">' + it + '</span>';
    if (!it.ga) return '';
    return '<span class="gl"><span class="ga">' + it.ga + '</span><span class="gb' + (it.cls ? ' ' + it.cls : '') + '">' + it.gb + '</span></span>';
  }
  function useSvg(id, cls) { var s = S('svg', { viewBox: '0 0 200 200', 'class': cls || 'pic', 'aria-hidden': 'true' }); S('use', { href: '#' + id }, s); return s; }

  /* ================= slide 2 · builder ================= */
  (function () {
    var sl = $('#ts-build'); if (!sl) return;
    var LIST = { c: CONS, v: VOW, t: TONE };
    var slots = {}, fill = { c: null, v: null, t: null }, trayTiles = { c: [], v: [], t: [] };
    var word = $('#b2-w'), wordCard = $('#b2-word'), chant = $('#b2-chant'), msg = $('#b2-msg');
    var pic = $('#b2-pic'), cap = $('#b2-cap'), grid = $('#b2-grid'), nEl = $('#b2-n'), book = sl.querySelector('.b2-book');
    var found = {}, gen = 0;
    var HINT = 'เลือกพยัญชนะ สระ และวรรณยุกต์ อย่างละ 1 ตัว';
    var NAMES = { c: 'พยัญชนะ', v: 'สระ', t: 'วรรณยุกต์' };

    $$('.b2-slot', sl).forEach(function (s) { slots[s.dataset.kind] = s; });
    function makeTile(kind, i) {
      var it = LIST[kind][i], t = E('div', 'tile k-' + kind + (kind === 't' && !it.k ? ' none' : ''));
      if (kind === 't' && !it.k) t.textContent = 'ไม่มี'; else t.innerHTML = glyph(kind, it);
      t.dataset.kind = kind; t.dataset.i = i;
      t.setAttribute('role', 'button'); t.tabIndex = 0;
      t.setAttribute('aria-label', kind === 'c' ? 'พยัญชนะ ' + it : kind === 'v' ? 'สระ' + it.name : 'วรรณยุกต์ ' + it.name);
      return t;
    }
    /* trays */
    $$('.b2-row', sl).forEach(function (row) {
      var kind = row.dataset.kind;
      LIST[kind].forEach(function (_, i) {
        var t = makeTile(kind, i); row.appendChild(t); trayTiles[kind].push(t);
        var ghost = null, from = null;
        K.drag(t, {
          tap: function () { place(kind, i, K.box(t)); },
          start: function () {
            from = K.box(t);
            ghost = makeTile(kind, i); ghost.classList.add('ghost');
            ghost.style.left = from.x + 'px'; ghost.style.top = from.y + 'px'; ghost.style.width = from.w + 'px'; ghost.style.height = from.h + 'px';
            sl.appendChild(ghost);
          },
          move: function (d, e, p) {
            ghost.style.transform = 'translate(' + d.dx + 'px,' + d.dy + 'px) rotate(3deg) scale(1.08)';
            var h = K.hit(p, [slots.c, slots.v, slots.t], 30);
            ['c', 'v', 't'].forEach(function (k) { slots[k].classList.toggle('hot', h === slots[k] && k === kind); slots[k].classList.toggle('bad', h === slots[k] && k !== kind); });
          },
          end: function (d, e, p, cancelled) {
            var h = cancelled ? null : K.hit(p, [slots.c, slots.v, slots.t], 30);
            ['c', 'v', 't'].forEach(function (k) { slots[k].classList.remove('hot', 'bad'); });
            var g = ghost; ghost = null;
            if (h && h.dataset.kind === kind) { var b = K.box(g); g.remove(); place(kind, i, b); return; }
            if (h) say('no', 'ช่องนี้สำหรับ<b>' + NAMES[h.dataset.kind] + '</b> ลองวางที่ช่อง' + NAMES[kind]);
            /* back to the tray */
            var a = K.anim(g, [{ transform: g.style.transform }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
            if (a) a.onfinish = function () { g.remove(); }; else g.remove();
          }
        });
        t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); place(kind, i, K.box(t)); } });
      });
    });
    /* fly a tile from box `from` into its new place, scaling from the old size */
    function flyIn(el, from, ms) {
      var to = K.box(el);
      K.anim(el, [{ transform: 'translate(' + (from.cx - to.cx) + 'px,' + (from.cy - to.cy) + 'px) scale(' + (from.w / to.w) + ')' }, { transform: 'none' }],
        { duration: ms || 420, easing: 'cubic-bezier(.3,1.25,.5,1)' });
    }
    function place(kind, i, from) {
      var slot = slots[kind], old = slot.querySelector('.tile');
      if (old) old.remove();
      var t = makeTile(kind, i); t.tabIndex = 0;
      t.setAttribute('aria-label', t.getAttribute('aria-label') + ' (แตะเพื่อเอาออก)');
      slot.appendChild(t);
      flyIn(t, from);
      fill[kind] = i;
      trayTiles[kind].forEach(function (x, k) { x.classList.toggle('used', k === i); });
      K.tone(kind === 'c' ? 523 : kind === 'v' ? 659 : 784, 140, 'triangle', 0.035);
      /* a tile in a slot: tap = take it out; drag it away = take it out */
      K.drag(t, {
        tap: function () { remove(kind); },
        move: function (d) { t.style.transform = 'translate(' + d.dx + 'px,' + d.dy + 'px) rotate(-3deg)'; t.classList.add('lift'); },
        end: function (d) {
          if (Math.hypot(d.dx, d.dy) > 110) { remove(kind, true); return; }
          var a = K.anim(t, [{ transform: t.style.transform }, { transform: 'none' }], { duration: 240 }); t.style.transform = '';
        }
      });
      t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); remove(kind); } });
      update();
    }
    function remove(kind, quiet) {
      var t = slots[kind].querySelector('.tile'); if (!t) return;
      var back = trayTiles[kind][fill[kind]], b = K.box(t);
      t.remove(); fill[kind] = null;
      trayTiles[kind].forEach(function (x) { x.classList.remove('used'); });
      if (back && !quiet) {
        var g = back.cloneNode(true); g.classList.add('ghost'); g.classList.remove('used');
        var to = K.box(back); g.style.left = to.x + 'px'; g.style.top = to.y + 'px'; g.style.width = to.w + 'px'; g.style.height = to.h + 'px';
        sl.appendChild(g);
        var a = K.anim(g, [{ transform: 'translate(' + (b.cx - to.cx) + 'px,' + (b.cy - to.cy) + 'px) scale(' + (b.w / to.w) + ')' }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' });
        if (a) a.onfinish = function () { g.remove(); }; else g.remove();
      }
      update();
    }
    function say(kind, html) { msg.className = 'ab b2-msg' + (kind ? ' ' + kind : ''); msg.innerHTML = html; }
    function clearWord() {
      gen++;
      word.textContent = ''; wordCard.classList.remove('has'); chant.textContent = '';
      pic.textContent = ''; E('span', 'b2-q', '?', pic); cap.textContent = 'ภาพของคำ'; cap.className = 'b2-cap dim';
    }
    function update() {
      var ready = fill.c !== null && fill.v !== null && fill.t !== null;
      clearWord();
      if (!ready) {
        var miss = ['c', 'v', 't'].filter(function (k) { return fill[k] === null; }).map(function (k) { return NAMES[k]; });
        say('', fill.c === null && fill.v === null && fill.t === null ? HINT : 'ยังขาด<b>' + miss.join(' และ') + '</b>');
        return;
      }
      var my = gen;
      /* the three tiles fly into the word card, then the word pops out */
      var wc = K.box(wordCard), delay = 0;
      ['c', 'v', 't'].forEach(function (k, n) {
        var t = slots[k].querySelector('.tile'), b = K.box(t), g = t.cloneNode(true);
        g.classList.add('ghost'); g.style.left = b.x + 'px'; g.style.top = b.y + 'px'; g.style.width = b.w + 'px'; g.style.height = b.h + 'px'; g.style.margin = '0';
        sl.appendChild(g);
        var a = K.anim(g, [{ transform: 'none', opacity: 1 }, { transform: 'translate(' + (wc.cx - b.cx + (n - 1) * 60) + 'px,' + (wc.cy - b.cy) + 'px) scale(.55) rotate(' + (n * 6 - 6) + 'deg)', opacity: 0.2 }],
          { duration: 460, delay: n * 70, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' });
        if (a) a.onfinish = function () { g.remove(); }; else g.remove();
      });
      delay = K.still() ? 0 : 560;
      setTimeout(function () { if (my === gen) show(); }, delay);
    }
    function show() {
      var c = CONS[fill.c], v = VOW[fill.v], t = TONE[fill.t];
      var w = compose(c, v.k, t.k), base = compose(c, v.k, '');
      word.textContent = w; wordCard.classList.add('has');
      K.anim(word, [{ transform: 'scale(.5) rotate(-6deg)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'ease-out' });
      K.tone(660, 120, 'sine', 0.05); K.tone(990, 200, 'sine', 0.04, 0.09);
      /* spelling chant: C-อ · vowel name · base · tone name · word */
      var parts = [[c + 'อ', 'k-c'], [v.name, 'k-v']];
      if (t.k) parts.push([base, ''], [t.name, 'k-t']);
      parts.push([w, '']);
      chant.textContent = '';
      parts.forEach(function (p, n) {
        if (n) { var i = E('i', '', '–', chant); K.anim(i, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: n * 260 - 120, fill: 'backwards' }); }
        var s = E('span', p[1], p[0], chant);
        K.anim(s, [{ opacity: 0, transform: 'translateY(14px) scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: n * 260, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'backwards' });
      });
      var m = DICT[w];
      if (PIC[w]) {
        pic.textContent = ''; var sv = useSvg(PIC[w]); pic.appendChild(sv);
        K.anim(sv, [{ transform: 'translateY(-60px) rotate(-10deg) scale(.7)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600, delay: 300, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'backwards' });
        cap.textContent = w; cap.className = 'b2-cap';
        say('ok', 'อ่านว่า <b>“' + w + '”</b> · ' + m);
        if (!found[w]) {
          found[w] = true; var cell = grid.querySelector('[data-w="' + w + '"]');
          cell.classList.add('got', 'new'); setTimeout(function () { cell.classList.remove('new'); }, 800);
          var n = Object.keys(found).length; nEl.textContent = n;
          if (n === 8) { say('ok', 'เก่งมาก! เจอครบทั้ง <b>8</b> ภาพแล้ว'); [523, 659, 784, 1046].forEach(function (f, k) { K.tone(f, 220, 'triangle', 0.04, 0.12 * k); }); }
          else K.tone(1318, 260, 'sine', 0.03, 0.25);
        }
      } else if (m) {
        say('', 'อ่านว่า <b>“' + w + '”</b> · ' + m + ' (คำนี้ไม่มีภาพในสมุด)');
      } else {
        say('no', 'อ่านว่า <b>“' + w + '”</b> · ยังไม่มีในสมุดคำของเรา ลองเปลี่ยนสักตัวนะ');
      }
    }
    /* picture book */
    PICS.forEach(function (p) {
      var c = E('div', 'b2-cell', null, grid); c.dataset.w = p[0];
      c.appendChild(useSvg(p[1])); E('span', '', p[0], c);
    });
    /* buttons: Show answer (the 8 picture words) and Reset */
    var tk = K.tk, bar = $('#b2-btns');
    var bShow = tk.btn('ดูเฉลย', 'show', 'show', function () {
      var on = !book.classList.contains('reveal'); book.classList.toggle('reveal', on);
      bShow.setAttribute('aria-pressed', on ? 'true' : 'false'); bShow.textContent = on ? 'ซ่อนเฉลย' : 'ดูเฉลย';
    });
    bShow.setAttribute('aria-pressed', 'false');
    var bReset = tk.btn('เริ่มใหม่', '', 'reset', function () { reset(); });
    bar.appendChild(bShow); bar.appendChild(bReset);
    function reset() {
      ['c', 'v', 't'].forEach(function (k) { var t = slots[k].querySelector('.tile'); if (t) t.remove(); fill[k] = null; });
      $$('.tile.used', sl).forEach(function (x) { x.classList.remove('used'); });
      found = {}; nEl.textContent = '0';
      $$('.b2-cell', grid).forEach(function (c) { c.classList.remove('got', 'new'); });
      book.classList.remove('reveal'); bShow.setAttribute('aria-pressed', 'false'); bShow.textContent = 'ดูเฉลย';
      clearWord(); say('', HINT);
    }
    clearWord();
    window.__spell = { place: place, remove: remove, reset: reset, fill: fill, compose: compose, found: function () { return Object.keys(found); } };
    K.ctl('ts-build', { set: function () {}, leave: function () { $$('.tile.ghost', sl).forEach(function (g) { g.remove(); }); } });
  })();

  /* ================= slide 3 · paper houses ================= */
  (function () {
    var w = $('#s3-sort'); if (!w) return;
    var MN = ['ผี ฝาก ถุง ข้าว สาร ให้ ฉัน', 'ไก่ จิก เด็ก ตาย บน ปาก โอ่ง', 'ตัวที่เหลือทั้งหมด 24 ตัว'];
    var COL = ['#9A6BA8', '#2E9C95', '#EF7A5A'];
    $$('.tw-bin', w).forEach(function (b, k) {
      var r = S('svg', { 'class': 's3-roof', viewBox: '0 0 600 128', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
      S('rect', { x: 430, y: 14, width: 44, height: 80, rx: 4, fill: '#B98A5E', filter: 'url(#ps)' }, r);
      S('path', { d: 'M300 4 L598 126 L2 126 Z', fill: COL[k], filter: 'url(#ps)' }, r);
      S('path', { d: 'M300 22 L540 120 L60 120 Z', fill: 'rgba(255,255,255,.14)' }, r);
      b.insertBefore(r, b.firstChild);
      var m = E('div', 's3-mn g1', MN[k]); m.style.setProperty('--d', 150 + k * 180);
      var slot = b.querySelector('.tw-slot'); b.insertBefore(m, slot);
    });
    /* all right: the houses hop */
    var fb = w.querySelector('.tw-fb');
    if (fb && window.MutationObserver) new MutationObserver(function () {
      if (fb.classList.contains('ok') && !w.classList.contains('w-shown')) {
        $$('.tw-bin', w).forEach(function (b, k) { K.anim(b, [{ transform: 'none' }, { transform: 'translateY(-14px)' }, { transform: 'none' }], { duration: 520, delay: k * 120, easing: 'ease-in-out' }); });
        [523, 659, 784].forEach(function (f, k) { K.tone(f, 200, 'triangle', 0.035, 0.12 * k); });
      }
    }).observe(fb, { attributes: true, attributeFilter: ['class'] });
  })();

  K.start();
})();
