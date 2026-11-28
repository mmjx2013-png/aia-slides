/* deck.js · ธงโภชนาการและจานสุขภาพ (ป.4–6) · the flag, the plate and our own flat food drawings (vanilla JS, no images).
   Facts: ธงโภชนาการ, กรมอนามัย กระทรวงสาธารณสุข. Four levels, top = eat most: 1 ข้าว-แป้ง · 2 ผัก | ผลไม้ ·
   3 เนื้อสัตว์ (รวมถั่วเมล็ดแห้ง ไข่ เต้าหู้) | นม · 4 น้ำมัน น้ำตาล เกลือ (ใช้แต่น้อยเท่าที่จำเป็น).
   Daily amounts for children aged 6–13 (the 1,600 kcal column): ข้าว-แป้ง 8 ทัพพี · ผัก 4 ทัพพี · ผลไม้ 3 ส่วน · เนื้อสัตว์ 6 ช้อนกินข้าว · นม 2 แก้ว.
   Plate: กรมอนามัย 2:1:1 — half the plate vegetables, a quarter rice or starch, a quarter meat, plus fruit. */
(function () {
  'use strict';
  var K = KIT, S = K.S, $ = K.$, $$ = K.$$;
  if (!document.getElementById('stage')) return;
  var INK = '#26324D', ST = 'stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';

  /* ---------- flat food drawings (64x64) ---------- */
  var BOWL = function (c) { return '<path d="M7 32h50c0 13-11 23-25 23S7 45 7 32z" fill="' + c + '" ' + ST + '/><path d="M24 55h16" ' + ST + '/>'; };
  var ICON = {
    rice: '<path d="M11 32c1-10 10-17 21-17s20 7 21 17z" fill="#fff" ' + ST + '/><path d="M20 24l3-2M30 20l3 1M40 23l3 2M26 28l2-1" stroke="#C9CFDA" stroke-width="2.5" stroke-linecap="round"/>' + BOWL('#4FA3D9'),
    brown: '<path d="M11 32c1-10 10-17 21-17s20 7 21 17z" fill="#D9B48A" ' + ST + '/><path d="M20 24l3-2M30 20l3 1M40 23l3 2" stroke="#A97C4F" stroke-width="2.5" stroke-linecap="round"/>' + BOWL('#3BAA5C'),
    bread: '<path d="M14 55V31c-6-2-8-8-6-13 3-7 12-10 24-10s21 3 24 10c2 5 0 11-6 13v24z" fill="#D9963F" ' + ST + '/><path d="M20 50V29c-4-1-5-5-3-8 2-4 8-6 15-6s13 2 15 6c2 3 1 7-3 8v21z" fill="#FFE2A0"/>',
    noodle: '<path d="M16 32c4-7 6-7 8 0s5 7 8 0 5-7 8 0 5 7 8 0" fill="none" stroke="#F2C94C" stroke-width="5" stroke-linecap="round"/><path d="M40 8L24 30M48 10L32 30" stroke="#A86C36" stroke-width="4" stroke-linecap="round"/>' + BOWL('#F2542D'),
    veg: '<path d="M32 58C32 44 30 30 22 16" fill="none" stroke="#2E8B4A" stroke-width="4" stroke-linecap="round"/><path d="M22 16c-8 4-12 14-8 20 6-2 10-10 8-20z" fill="#3BAA5C" ' + ST + '/><path d="M32 40c-2-12 6-22 18-24-2 12-8 22-18 24z" fill="#5CC46F" ' + ST + '/><path d="M30 28C24 20 26 8 34 4c4 8 2 18-4 24z" fill="#3BAA5C" ' + ST + '/>',
    carrot: '<path d="M18 20l30 8-26 30c-4 2-8-2-6-6z" fill="#F28A2E" ' + ST + '/><path d="M26 34l8 2M22 44l6 1" stroke="#C9601A" stroke-width="2.5" stroke-linecap="round"/><path d="M40 24c2-8 8-14 16-14-2 8-8 14-16 14zM36 22c-6-6-6-14-2-18 4 6 4 12 2 18z" fill="#3BAA5C" ' + ST + '/>',
    banana: '<path d="M10 20c6 22 24 34 46 28-2 8-16 12-28 8C14 50 6 34 10 20z" fill="#FFD23F" ' + ST + '/><path d="M10 20l-2-6 5 1z" fill="#6B4A1E" ' + ST + '/><path d="M18 30c6 10 16 16 28 18" fill="none" stroke="#E0A800" stroke-width="2.5" stroke-linecap="round"/>',
    melon: '<path d="M6 24h52c0 16-12 28-26 28S6 40 6 24z" fill="#3BAA5C" ' + ST + '/><path d="M12 24h40c0 12-9 21-20 21s-20-9-20-21z" fill="#F2545B"/><path d="M22 31v3M32 33v3M42 31v3M27 38v3M37 38v3" stroke="#26324D" stroke-width="3" stroke-linecap="round"/>',
    papaya: '<path d="M10 32c0-14 10-24 22-24s22 10 22 24-10 24-22 24-22-10-22-24z" fill="#F28A2E" ' + ST + '/><ellipse cx="32" cy="32" rx="9" ry="13" fill="#FFC36A"/><path d="M29 26v2M35 28v2M30 34v2M34 37v2" stroke="#26324D" stroke-width="3" stroke-linecap="round"/>',
    orange: '<circle cx="32" cy="36" r="20" fill="#F7931E" ' + ST + '/><path d="M32 16c2-6 8-8 12-6-2 6-8 8-12 6z" fill="#3BAA5C" ' + ST + '/><circle cx="26" cy="32" r="2" fill="#FFC36A"/><circle cx="38" cy="42" r="2" fill="#FFC36A"/>',
    fish: '<path d="M6 32c8-12 22-16 34-10l10-8v36l-10-8C28 48 14 44 6 32z" fill="#6FB7E0" ' + ST + '/><circle cx="18" cy="29" r="2.5" fill="#26324D"/><path d="M26 26c3 4 3 8 0 12" fill="none" stroke="#26324D" stroke-width="2.5" stroke-linecap="round"/>',
    grill: '<path d="M6 32c8-12 22-16 34-10l10-8v36l-10-8C28 48 14 44 6 32z" fill="#C98B4E" ' + ST + '/><path d="M20 22l-6 20M30 21l-6 22M40 24l-5 18" stroke="#7A4A20" stroke-width="3" stroke-linecap="round"/><circle cx="14" cy="30" r="2.5" fill="#26324D"/>',
    egg: '<path d="M32 8c10 0 18 16 18 28 0 11-8 20-18 20s-18-9-18-20C14 24 22 8 32 8z" fill="#FFF8EC" ' + ST + '/><circle cx="32" cy="38" r="8" fill="#FFC93C"/>',
    tofu: '<path d="M10 26l14-8 18 6-14 8z" fill="#FFF6DA" ' + ST + '/><path d="M10 26v18l18 8V32z" fill="#F1E2B8" ' + ST + '/><path d="M28 32v20l14-8V24z" fill="#E7D3A0" ' + ST + '/><path d="M36 30l14-6 6 4v14l-14 6z" fill="#F1E2B8" ' + ST + '/>',
    milk: '<path d="M20 20l6-10h12l6 10v36H20z" fill="#fff" ' + ST + '/><path d="M20 34h24v22H20z" fill="#45A6DD" ' + ST + '/><path d="M26 10h12" ' + ST + '/><path d="M24 44c4-4 12-4 16 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
    oil: '<path d="M26 6h12v8l6 8v32a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4V22l6-8z" fill="#FFD23F" ' + ST + '/><path d="M24 6h16" ' + ST + '/><path d="M20 34h24v12H20z" fill="#fff" opacity=".7"/><path d="M28 40h8" stroke="#E0A800" stroke-width="3" stroke-linecap="round"/>',
    sugar: '<path d="M8 36l12-6 12 6-12 6z" fill="#fff" ' + ST + '/><path d="M8 36v12l12 6V42z" fill="#EEF1F6" ' + ST + '/><path d="M20 42v12l12-6V36z" fill="#DDE2EB" ' + ST + '/><path d="M30 22l12-6 12 6-12 6z" fill="#fff" ' + ST + '/><path d="M30 22v12l12 6V28z" fill="#EEF1F6" ' + ST + '/><path d="M42 28v12l12-6V22z" fill="#DDE2EB" ' + ST + '/>',
    salad: '<circle cx="22" cy="26" r="9" fill="#5CC46F" ' + ST + '/><circle cx="36" cy="22" r="9" fill="#3BAA5C" ' + ST + '/><circle cx="46" cy="28" r="7" fill="#F2545B" ' + ST + '/>' + BOWL('#FFFFFF'),
    chicken: '<path d="M14 42c-6-10 2-26 16-28 14-2 22 10 18 20-3 8-14 12-24 10z" fill="#D9963F" ' + ST + '/><path d="M24 44l-8 8M16 52l-4-2M16 52l2 4" ' + ST + '/><path d="M24 24l3 4M34 20l2 5M40 28l-3 3" stroke="#A86C36" stroke-width="2.5" stroke-linecap="round"/>',
    cake: '<path d="M8 40l40-20 8 8v22H8z" fill="#FFE2A0" ' + ST + '/><path d="M8 40l40-20 8 8-40 12z" fill="#F7A1C4" ' + ST + '/><circle cx="44" cy="16" r="5" fill="#F2545B" ' + ST + '/><path d="M8 50h48" stroke="#F7A1C4" stroke-width="5"/>'
  };
  function icon(k, size) { var s = S('svg', { viewBox: '0 0 64 64', width: size || 64, height: size || 64, 'aria-hidden': 'true' }); s.innerHTML = ICON[k]; return s; }

  /* awning + ground on every slide, a different stripe colour per slide */
  var AWN = ['#3BAA5C', '#F28A2E', '#F2542D'];
  $$('.slide').forEach(function (sl, i) {
    var a = S('svg', { 'class': 'awn', viewBox: '0 0 1920 78', 'aria-hidden': 'true' });
    for (var x = 0; x < 1920; x += 120) {
      S('path', { d: 'M' + x + ' 0h60v52a30 30 0 0 1-60 0z', fill: AWN[i % 3] }, a);
      S('path', { d: 'M' + (x + 60) + ' 0h60v52a30 30 0 0 1-60 0z', fill: '#FFFFFF' }, a);
    }
    S('rect', { x: 0, y: 0, width: 1920, height: 10, fill: '#26324D', opacity: 0.85 }, a);
    sl.insertBefore(a, sl.firstChild);
    var g = K.el('div', 'ground'); sl.insertBefore(g, a.nextSibling);
  });

  /* drag a crate item with a floating copy; o = {start, over(e), drop(e)} */
  function crateDrag(el, slideEl, o) {
    var ghost = null, off = null;
    K.drag(el, {
      start: function (p) { if (o.start && o.start() === false) return false; var b = K.box(el); off = { x: p.x - b.x, y: p.y - b.y }; },
      move: function (p, d, e) {
        if (!ghost) { var b = K.box(el); ghost = el.cloneNode(true); ghost.classList.remove('used'); ghost.classList.add('drag'); ghost.style.width = b.w + 'px'; ghost.style.height = b.h + 'px'; slideEl.appendChild(ghost); el.style.opacity = '.35'; }
        ghost.style.left = (p.x - off.x) + 'px'; ghost.style.top = (p.y - off.y) + 'px'; if (o.over) o.over(e);
      },
      end: function (p, e, moved) { el.style.opacity = ''; if (ghost) { ghost.remove(); ghost = null; } if (o.over) o.over(null); if (moved) o.drop(e); else if (o.tap) o.tap(); }
    });
  }

  /* ============ slide 1 · the flag ============ */
  (function () {
    var svg = $('#h1-flag'); if (!svg) return;
    var slideEl = $('#h1');
    function xl(y) { return 480 - (840 - y) / 2; } function xr(y) { return 480 + (840 - y) / 2; }
    function poly(y0, y1, side) {   /* side: 0 whole, -1 left half, 1 right half */
      var a = side === 1 ? 480 : xl(y0), b = side === -1 ? 480 : xr(y0), c = side === -1 ? 480 : xr(y1), d = side === 1 ? 480 : xl(y1);
      return 'M' + a + ' ' + y0 + ' L' + b + ' ' + y0 + ' L' + c + ' ' + y1 + ' L' + d + ' ' + y1 + 'Z';
    }
    S('rect', { x: 50, y: 6, width: 14, height: 880, rx: 7, 'class': 'pole' }, svg);
    S('circle', { cx: 57, cy: 8, r: 14, fill: '#F2C94C', stroke: INK, 'stroke-width': 3 }, svg);
    var Z = [
      { id: 'z1', d: poly(20, 225, 0), col: '#E9B949', lab: 'ข้าว-แป้ง', sub: 'กินมากที่สุด', lx: 480, ly: 72, slots: [[250, 160], [345, 160], [440, 160], [535, 160], [630, 160], [725, 160]] },
      { id: 'z2a', d: poly(225, 430, -1), col: '#3BAA5C', lab: 'ผัก', sub: 'กินมาก', lx: 360, ly: 272, slots: [[300, 362], [372, 362], [444, 362]] },
      { id: 'z2b', d: poly(225, 430, 1), col: '#F59E1B', lab: 'ผลไม้', sub: 'กินพอควร', lx: 600, ly: 272, slots: [[516, 362], [588, 362], [660, 362]] },
      { id: 'z3a', d: poly(430, 635, -1), col: '#EE6E5A', lab: 'เนื้อสัตว์', sub: 'ถั่ว ไข่', lx: 405, ly: 470, slots: [[372, 545], [438, 545], [410, 604]] },
      { id: 'z3b', d: poly(430, 635, 1), col: '#45A6DD', lab: 'นม', sub: 'ดื่มทุกวัน', lx: 548, ly: 470, slots: [[522, 545], [588, 545], [550, 604]] },
      { id: 'z4', d: poly(635, 840, 0), col: '#9AA1AE', lab: '', sub: '', lx: 480, ly: 0, slots: [[446, 690], [514, 690], [480, 752]] }
    ];
    Z.forEach(function (z, i) {
      z.i = i; z.el = S('path', { d: z.d, fill: z.col, 'class': 'band' }, svg); z.toks = [];
      if (z.lab) { var t = S('text', { x: z.lx, y: z.ly, 'class': 'zlab' }, svg); t.textContent = z.lab; var s = S('text', { x: z.lx, y: z.ly + 26, 'class': 'zsub' }, svg); s.textContent = z.sub; }
    });
    var l4 = S('text', { x: 400, y: 790, 'class': 'zout', 'text-anchor': 'end' }, svg); l4.textContent = 'น้ำมัน น้ำตาล เกลือ';
    var l4b = S('text', { x: 400, y: 818, 'class': 'zout', 'text-anchor': 'end', style: 'font-weight:600;font-size:19px;fill:#5E6678' }, svg); l4b.textContent = 'กินแต่น้อยเท่าที่จำเป็น';
    S('path', { d: 'M408 782 L444 770', stroke: INK, 'stroke-width': 2.5, fill: 'none' }, svg);
    /* beat 1: daily amounts for children 6-13 */
    var amt = S('g', { 'class': 'amt' }, svg);
    var ah = S('text', { x: 900, y: 68, 'class': 'h' }, amt); ah.textContent = 'เด็ก 6–13 ปี ควรกินต่อวัน';
    [[870, 120, 'ข้าว-แป้ง 8 ทัพพี'], [760, 300, 'ผัก 4 ทัพพี'], [760, 340, 'ผลไม้ 3 ส่วน'], [660, 510, 'เนื้อสัตว์ 6 ช้อนกินข้าว'], [660, 550, 'นม 2 แก้ว'], [560, 720, 'ใช้น้อยเท่าที่จำเป็น']].forEach(function (a) {
      var t = S('text', { x: a[0] + 14, y: a[1] + 8 }, amt); t.textContent = a[2];
      S('circle', { cx: a[0], cy: a[1], r: 6, fill: '#F2542D' }, amt);
    });
    /* foods */
    var FOODS = [['rice', 'ข้าวสวย', 0], ['fish', 'ปลา', 3], ['veg', 'ผักบุ้ง', 1], ['milk', 'นมจืด', 4], ['banana', 'กล้วย', 2], ['bread', 'ขนมปัง', 0], ['egg', 'ไข่ไก่', 3],
      ['oil', 'น้ำมัน', 5], ['carrot', 'แครอท', 1], ['noodle', 'ก๋วยเตี๋ยว', 0], ['melon', 'แตงโม', 2], ['tofu', 'เต้าหู้', 3], ['sugar', 'น้ำตาล', 5]];
    var crate = $('#h1-crate'), toks = FOODS.map(function (f, i) {
      var el = K.el('div', 'food'); el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', f[1]);
      el.appendChild(icon(f[0])); el.appendChild(K.el('span', '', f[1])); crate.appendChild(el);
      var T = { i: i, k: f[0], name: f[1], ans: f[2], el: el, z: null, g: null };
      crateDrag(el, slideEl, { over: function (e) { var z = e ? zoneAt(e) : null; Z.forEach(function (q) { q.el.classList.toggle('over', q === z); }); }, drop: function (e) { var z = zoneAt(e); if (z) place(T, z); } });
      return T;
    });
    function zoneAt(e) {
      var q = K.svgPt(svg, e), y = q.y, x = q.x;
      if (y < 20 || y > 840 || x < xl(y) - 10 || x > xr(y) + 10) return null;
      if (y < 225) return Z[0]; if (y >= 635) return Z[5];
      var r = x >= 480 ? 1 : 0; return y < 430 ? Z[1 + r] : Z[3 + r];
    }
    function layout(z) {
      z.toks.forEach(function (T, k) {
        var s = z.slots[Math.min(k, z.slots.length - 1)], dx = k >= z.slots.length ? (k - z.slots.length + 1) * 14 : 0;
        T.g.setAttribute('transform', 'translate(' + (s[0] + dx) + ' ' + s[1] + ')');
      });
    }
    function place(T, z) {
      ft.say(''); if (T.z) unplace(T);
      T.z = z; z.toks.push(T); T.el.classList.add('used');
      var g = S('g', { 'class': 'tok', role: 'button', tabindex: '0', 'aria-label': T.name + ' (แตะเพื่อนำออก)' }, svg);
      S('circle', { r: 31 }, g); var ic = icon(T.k, 44); ic.setAttribute('x', -22); ic.setAttribute('y', -22); g.appendChild(ic);
      T.g = g; layout(z);
      if (!K.rm() && g.animate) g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      g.addEventListener('click', function (e) { e.stopPropagation(); unplace(T); ft.say(''); });
    }
    function unplace(T) { if (!T.z) return; var z = T.z; z.toks.splice(z.toks.indexOf(T), 1); T.g.remove(); T.g = null; T.z = null; T.el.classList.remove('used'); layout(z); }
    function check() {
      var placed = toks.filter(function (T) { return T.z; }), right = 0;
      if (!placed.length) { ft.say('info', 'ลากอาหารขึ้นธงก่อนนะ'); return; }
      placed.forEach(function (T) {
        var ok = T.z.i === T.ans; if (ok) right++;
        T.g.classList.remove('ok', 'no'); T.g.classList.add(ok ? 'ok' : 'no');
        var m = T.g.querySelector('.tmk'); if (m) m.remove();
        var c = S('circle', { cx: 24, cy: -24, r: 13, fill: ok ? '#2F9E57' : '#E04B32', 'class': 'tmk' }, T.g);
        var t = S('text', { x: 24, y: -17, 'class': 'tmk', fill: '#fff' }, T.g); t.textContent = ok ? '✓' : '✗';
        if (!ok) K.shake(T.g);
      });
      if (right === toks.length) ft.say('ok', 'ถูกทั้ง ' + toks.length + ' อย่าง วางอาหารบนธงได้ครบ!');
      else ft.say(right === placed.length ? 'info' : 'no', 'ถูก ' + right + ' จาก ' + placed.length + ' อย่าง' + (placed.length < toks.length ? ' · เหลืออีก ' + (toks.length - placed.length) : '') + (right < placed.length ? ' · แตะอันที่ผิดเพื่อนำออก' : ''));
    }
    function show() { toks.forEach(function (T) { place(T, Z[T.ans]); }); check(); ft.say('ok', 'เฉลย: อาหารทุกอย่างอยู่ในชั้นของตัวเองแล้ว'); }
    function reset() { toks.forEach(unplace); ft.say(''); }
    var ft = K.foot($('#h1-ft'), { check: check, show: show, reset: reset, hint: 'แตะอาหารบนธงเพื่อนำกลับลงลัง' });
    K.slide('h1', { set: function () {} });
    window.__h1 = { toks: toks, Z: Z, place: place, check: check };
  })();

  /* ============ slide 2 · the 2:1:1 plate ============ */
  (function () {
    var svg = $('#h2-plate'); if (!svg) return;
    var slideEl = $('#h2'), CX = 330, CY = 370, R = 292;
    var ITEMS = [['veg', 'ผัดผักบุ้ง', 'v'], ['salad', 'สลัดผัก', 'v'], ['carrot', 'แครอทต้ม', 'v'], ['rice', 'ข้าวสวย', 'c'], ['brown', 'ข้าวกล้อง', 'c'], ['grill', 'ปลาย่าง', 'p'],
      ['egg', 'ไข่ต้ม', 'p'], ['chicken', 'ไก่ทอด', 'p', 1], ['cake', 'ขนมหวาน', 'x'], ['papaya', 'มะละกอ', 'f'], ['orange', 'ส้ม', 'f'], ['tofu', 'เต้าหู้', 'p']];
    var COL = { v: '#DFF3DE', c: '#FFF1C9', p: '#FFE0D8', x: '#FCE1EC', f: '#FFE9C7' };
    S('circle', { cx: CX, cy: CY + 8, r: R + 6, fill: 'rgba(38,50,77,.10)' }, svg);
    S('circle', { cx: CX, cy: CY, r: R, 'class': 'plate' }, svg);
    S('circle', { cx: CX, cy: CY, r: R - 34, 'class': 'plate2' }, svg);
    var Q = [0, 1, 2, 3].map(function (q) {
      var a0 = (-180 + q * 90) * Math.PI / 180, a1 = a0 + Math.PI / 2, r = R - 40;
      var d = 'M' + CX + ' ' + CY + ' L' + (CX + r * Math.cos(a0)) + ' ' + (CY + r * Math.sin(a0)) + ' A' + r + ' ' + r + ' 0 0 1 ' + (CX + r * Math.cos(a1)) + ' ' + (CY + r * Math.sin(a1)) + 'Z';
      var am = (a0 + a1) / 2, g = S('g', {}, svg);
      return { q: q, d: d, g: g, c: [CX + 140 * Math.cos(am), CY + 140 * Math.sin(am)], item: null };
    });
    S('line', { x1: CX - R + 40, y1: CY, x2: CX + R - 40, y2: CY, 'class': 'guide' }, svg);
    S('line', { x1: CX, y1: CY - R + 40, x2: CX, y2: CY + R - 40, 'class': 'guide' }, svg);
    var hints = S('g', {}, svg);
    [['ผัก', 0], ['ผัก', 3], ['ข้าว-แป้ง', 1], ['เนื้อสัตว์', 2]].forEach(function (h) { var c = Q[h[1]].c, t = S('text', { x: c[0], y: c[1] + 60, 'class': 'qlab' }, hints); t.textContent = h[0]; Q[h[1]].hint = t; });
    var BX = 615, BY = 92;
    S('circle', { cx: BX, cy: BY, r: 74, 'class': 'bowl' }, svg);
    var bl = S('text', { x: BX, y: BY + 104, 'class': 'qlab' }, svg); bl.textContent = 'ผลไม้';
    var bowl = { g: S('g', {}, svg), item: null };
    var crate = $('#h2-crate'), items = ITEMS.map(function (f, i) {
      var el = K.el('div', 'food'); el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', f[1]);
      el.appendChild(icon(f[0])); el.appendChild(K.el('span', '', f[1])); crate.appendChild(el);
      var I = { i: i, k: f[0], name: f[1], t: f[2], fried: !!f[3], el: el, at: null };
      crateDrag(el, slideEl, { drop: function (e) { dropAt(I, e); }, tap: function () { dropAt(I, null); } });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); dropAt(I, null); } });
      return I;
    });
    function dropAt(I, e) {
      if (I.at) return;
      if (I.t === 'f') { if (bowl.item) take(bowl.item); put(I, bowl); return; }
      var q = null;
      if (e) {
        var p = K.svgPt(svg, e), dx = p.x - CX, dy = p.y - CY;
        if (Math.hypot(dx, dy) > R + 60) { if (Math.hypot(p.x - BX, p.y - BY) < 110) { tip('no', 'ถ้วยนี้สำหรับผลไม้'); } return; }
        var a = Math.atan2(dy, dx) * 180 / Math.PI; var qi = Math.floor(((a + 180) % 360 + 360) % 360 / 90); q = Q[qi];
        if (q.item) q = null;
      }
      if (!q) q = Q.filter(function (x) { return !x.item; })[0];
      if (!q) { tip('no', 'จานเต็มแล้ว แตะอาหารบนจานเพื่อเอาออก'); return; }
      put(I, q);
    }
    function put(I, slot) {
      I.at = slot; slot.item = I; I.el.classList.add('used'); if (slot.hint) slot.hint.style.display = 'none';
      var g = slot.g; g.textContent = '';
      var grp = S('g', { 'class': 'portion', role: 'button', tabindex: '0', 'aria-label': I.name + ' (แตะเพื่อเอาออก)' }, g);
      if (slot === bowl) { S('circle', { cx: BX, cy: BY, r: 60, fill: COL.f }, grp); var ic = icon(I.k, 84); ic.setAttribute('x', BX - 42); ic.setAttribute('y', BY - 42); grp.appendChild(ic); }
      else {
        S('path', { d: slot.d, fill: COL[I.t], stroke: '#fff', 'stroke-width': 4 }, grp);
        [[0, -26, 70], [-48, 26, 58], [44, 30, 58]].forEach(function (o) { var ic = icon(I.k, o[2]); ic.setAttribute('x', slot.c[0] + o[0] - o[2] / 2); ic.setAttribute('y', slot.c[1] + o[1] - o[2] / 2); grp.appendChild(ic); });
      }
      K.drag(grp, { end: function (pp, ev, moved) { if (!moved) take(I); } });
      grp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); take(I); } });
      if (!K.rm() && grp.animate) grp.animate([{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' });
      grp.style.transformOrigin = (slot === bowl ? BX + 'px ' + BY + 'px' : slot.c[0] + 'px ' + slot.c[1] + 'px');
      update();
    }
    function take(I) { if (!I.at) return; if (I.at.hint) I.at.hint.style.display = ''; I.at.item = null; I.at.g.textContent = ''; I.at = null; I.el.classList.remove('used'); update(); }
    /* gauge */
    var gs = $('#h2-gauge'), GX = 170, GY = 180, GR = 140;
    function arc(a0, a1, col) { var p0 = [GX + GR * Math.cos(a0), GY + GR * Math.sin(a0)], p1 = [GX + GR * Math.cos(a1), GY + GR * Math.sin(a1)]; S('path', { d: 'M' + p0 + ' A' + GR + ' ' + GR + ' 0 0 1 ' + p1, stroke: col, 'stroke-width': 28, fill: 'none' }, gs); }
    arc(Math.PI, Math.PI * 1.4, '#F2545B'); arc(Math.PI * 1.4, Math.PI * 1.72, '#FFC93C'); arc(Math.PI * 1.72, Math.PI * 2, '#3BAA5C');
    var needle = S('g', {}, gs); S('path', { d: 'M' + GX + ' ' + (GY - 8) + ' L' + (GX + 118) + ' ' + GY + ' L' + GX + ' ' + (GY + 8) + 'Z', fill: INK }, needle); S('circle', { cx: GX, cy: GY, r: 14, fill: INK }, gs);
    var ang = 180, A = K.Anim();
    function setNeedle(score) {
      var to = 180 + 180 * score / 100, from = ang;
      A.run(600, function (p) { ang = from + (to - from) * p; needle.setAttribute('transform', 'rotate(' + ang + ' ' + GX + ' ' + GY + ')'); });
    }
    needle.setAttribute('transform', 'rotate(180 ' + GX + ' ' + GY + ')');
    var bars = $('#h2-bars'), BR = [['v', 'ผัก', 2, '#3BAA5C'], ['c', 'ข้าว-แป้ง', 1, '#E9B949'], ['p', 'เนื้อสัตว์', 1, '#EE6E5A'], ['f', 'ผลไม้', 1, '#F59E1B']].map(function (b) {
      var row = K.el('div', 'brow'); row.appendChild(K.el('span', '', b[1]));
      var tr = K.el('div', 'tr'), fill = K.el('i'), mark = K.el('b'); fill.style.background = b[3]; mark.style.left = (b[2] / 3 * 100) + '%';
      tr.appendChild(fill); tr.appendChild(mark); row.appendChild(tr); var n = K.el('em', '', '0/' + b[2]); row.appendChild(n); bars.appendChild(row);
      return { t: b[0], want: b[2], fill: fill, n: n, col: b[3] };
    });
    function tip(kind, msg) { var t = $('#h2-tip'); t.className = 'tip' + (kind ? ' ' + kind : ''); t.textContent = msg; }
    function update() {
      var n = { v: 0, c: 0, p: 0, f: 0, x: 0 }, fried = 0;
      items.forEach(function (I) { if (I.at) { n[I.t]++; if (I.fried) fried++; } });
      BR.forEach(function (b) { b.fill.style.width = Math.min(100, n[b.t] / 3 * 100) + '%'; b.n.textContent = n[b.t] + '/' + b.want; b.fill.style.background = n[b.t] > b.want ? '#F2545B' : b.col; });
      var any = n.v + n.c + n.p + n.f + n.x, s = 0;
      if (any) s = K.clamp(100 - 25 * Math.abs(n.v - 2) - 25 * Math.abs(n.c - 1) - 25 * Math.abs(n.p - 1) - (n.f < 1 ? 15 : 0) - 25 * n.x - 15 * fried, 0, 100);
      setNeedle(s);
      $('#h2-mv').textContent = !any ? 'ยังว่างอยู่' : s >= 100 ? 'สมดุลดีมาก' : s >= 70 ? 'เกือบสมดุล' : 'ยังไม่สมดุล';
      if (!any) tip('', 'ลากอาหารจากลังมาวางบนจาน หรือแตะอาหารเพื่อวาง');
      else if (n.x) tip('no', 'ขนมหวานมีน้ำตาลมาก ลองเปลี่ยนเป็นผลไม้');
      else if (fried) tip('no', 'ไก่ทอดอมน้ำมัน ลองเลือกปลาย่างหรือไข่ต้มแทน');
      else if (n.v < 2) tip('', 'เพิ่มผักอีก ' + (2 - n.v) + ' ส่วน ให้ได้ครึ่งจาน');
      else if (n.c > 1) tip('no', 'ข้าว-แป้งมากไป ใส่แค่ 1 ส่วนพอ');
      else if (n.p > 1) tip('no', 'เนื้อสัตว์มากไป ใส่แค่ 1 ส่วนพอ');
      else if (n.v > 2) tip('no', 'ผักเยอะดี แต่จานต้องมีข้าวและเนื้อสัตว์ด้วย');
      else if (n.c < 1) tip('', 'ยังขาดข้าว-แป้ง 1 ส่วน');
      else if (n.p < 1) tip('', 'ยังขาดเนื้อสัตว์ 1 ส่วน');
      else if (n.f < 1) tip('', 'จานครบแล้ว อย่าลืมผลไม้ในถ้วย');
      else tip('ok', 'เยี่ยม! จานนี้เป็นไปตามสูตร 2:1:1 พร้อมผลไม้');
    }
    $('#h2-clear').addEventListener('click', function (e) { e.stopPropagation(); items.forEach(take); });
    update();
    K.slide('h2', { set: function () {} });
    var tg = K.$$('#h3 .tag')[2]; if (tg) { var mi = icon('milk', 120); mi.style.position = 'absolute'; mi.style.left = '380px'; mi.style.top = '460px'; tg.appendChild(mi); }
    window.__h2 = { items: items, Q: Q, bowl: bowl, dropAt: dropAt, take: take };
  })();
})();
