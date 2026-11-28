/* body.js · the live biology of the KruSlide body-systems sample (vanilla JS, no libraries, no network). All drawings are our own.
   figure(svg): a simplified front view (viewBox 600×1000) in five layers: skeleton, muscles, blood, digestion, breathing.
   Left/right in the drawing are the person's own: the heart leans to the person's left (viewer's right), the liver sits on the right.
   heart: a schematic of the double circulation; one loop of blood, chambers squeeze in order (atria, then ventricles),
   valves open and shut, speed follows the pulse slider. Controllers C[slide id] = { set(beat, prev), leave() }. */
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
  function mir(d) { return d.replace(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g, function (m, x, y) { return (600 - +x) + ' ' + y; }); }   /* mirror a path about x = 300 */
  function smoothClosed(p) {
    var n = p.length, d = 'M' + p[0][0] + ' ' + p[0][1];
    for (var i = 0; i < n; i++) {
      var a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n], e = p[(i + 2) % n];
      d += ' C' + (b[0] + (c[0] - a[0]) / 6).toFixed(1) + ' ' + (b[1] + (c[1] - a[1]) / 6).toFixed(1) + ' ' + (c[0] - (e[0] - b[0]) / 6).toFixed(1) + ' ' + (c[1] - (e[1] - b[1]) / 6).toFixed(1) + ' ' + c[0] + ' ' + c[1];
    }
    return d + 'Z';
  }

  /* ---------------- organs: name, system and job (our own words, ม.2 level) ---------------- */
  var SYS = { skel: 'ระบบโครงกระดูก', mus: 'ระบบกล้ามเนื้อ', circ: 'ระบบหมุนเวียนเลือด', dig: 'ระบบย่อยอาหาร', res: 'ระบบหายใจ' };
  var ORG = {
    heart: ['circ', 'หัวใจ', 'กล้ามเนื้อหัวใจบีบตัวเป็นจังหวะ สูบฉีดเลือดไปทั่วร่างกายและไปปอด', 'มี 4 ห้อง · เต้นประมาณ 60–100 ครั้ง/นาที ขณะพัก'],
    art: ['circ', 'หลอดเลือดแดง', 'นำเลือดออกจากหัวใจไปยังส่วนต่าง ๆ ของร่างกาย ผนังหนาและยืดหยุ่น', 'ส่วนใหญ่มีเลือดที่มีออกซิเจนสูง'],
    vein: ['circ', 'หลอดเลือดดำ', 'นำเลือดจากส่วนต่าง ๆ ของร่างกายกลับเข้าสู่หัวใจ มีลิ้นกันเลือดไหลย้อน', 'ส่วนใหญ่มีเลือดที่มีออกซิเจนต่ำ'],
    lung: ['res', 'ปอด', 'แลกเปลี่ยนแก๊สที่ถุงลม: ออกซิเจนเข้าสู่เลือด คาร์บอนไดออกไซด์ออกจากเลือด', 'ถุงลมจำนวนมากช่วยเพิ่มพื้นที่ผิว'],
    trachea: ['res', 'หลอดลม', 'ทางผ่านของอากาศจากจมูกและปากลงสู่ปอด มีกระดูกอ่อนเป็นวงช่วยให้ไม่แฟบ', 'แตกแขนงเป็นขั้วปอดซ้ายและขวา'],
    diaph: ['res', 'กะบังลม', 'กล้ามเนื้อแผ่นใต้ปอด หดตัวลดต่ำลงเมื่อหายใจเข้า คลายตัวโค้งขึ้นเมื่อหายใจออก', 'ทำงานร่วมกับกล้ามเนื้อยึดซี่โครง'],
    eso: ['dig', 'หลอดอาหาร', 'ลำเลียงอาหารจากปากลงสู่กระเพาะอาหารด้วยการบีบตัวเป็นจังหวะ', 'ไม่มีการย่อยอาหารในหลอดอาหาร'],
    stom: ['dig', 'กระเพาะอาหาร', 'บีบคลุกเคล้าอาหารกับน้ำย่อย เริ่มย่อยโปรตีน', 'มีกรดช่วยทำลายเชื้อโรคบางชนิด'],
    liver: ['dig', 'ตับ', 'สร้างน้ำดีส่งไปช่วยย่อยไขมันในลำไส้เล็ก และเก็บสะสมสารอาหารบางชนิด', 'อวัยวะภายในที่ใหญ่ที่สุด'],
    si: ['dig', 'ลำไส้เล็ก', 'ย่อยอาหารขั้นสุดท้าย และดูดซึมสารอาหารเข้าสู่หลอดเลือด', 'ผนังด้านในมีส่วนยื่นเล็ก ๆ (วิลลัส) เพิ่มพื้นที่ดูดซึม'],
    li: ['dig', 'ลำไส้ใหญ่', 'ดูดซึมน้ำและแร่ธาตุจากกากอาหาร ที่เหลือขับออกเป็นอุจจาระ', 'ล้อมรอบลำไส้เล็กเป็นกรอบ'],
    skull: ['skel', 'กะโหลกศีรษะ', 'กระดูกที่ประกอบกันเป็นกล่องแข็ง ป้องกันสมอง', 'ขากรรไกรล่างเคลื่อนไหวได้'],
    ribs: ['skel', 'กระดูกซี่โครง', 'ล้อมเป็นกรงป้องกันหัวใจและปอด และขยับขึ้นลงช่วยการหายใจ', 'มี 12 คู่'],
    spine: ['skel', 'กระดูกสันหลัง', 'ข้อกระดูกหลายชิ้นต่อกัน ค้ำจุนลำตัว ป้องกันไขสันหลัง', 'โค้งงอได้เพราะมีหลายข้อ'],
    pelvis: ['skel', 'กระดูกเชิงกราน', 'รับน้ำหนักลำตัวและเป็นที่ยึดของกระดูกต้นขา', ''],
    femur: ['skel', 'กระดูกต้นขา', 'กระดูกที่ยาวและแข็งแรงที่สุด รับน้ำหนักร่างกาย', 'ต่อกับเชิงกรานเป็นข้อต่อแบบลูกกลมในเบ้า'],
    arm: ['skel', 'กระดูกแขน', 'ทำงานร่วมกับกล้ามเนื้อให้แขนงอ เหยียด และหมุนได้', 'ต้นแขน 1 ชิ้น ปลายแขน 2 ชิ้น'],
    pec: ['mus', 'กล้ามเนื้ออก', 'ดึงแขนเข้าหาลำตัวและไปด้านหน้า', 'กล้ามเนื้อลายทำงานตามใจนึก'],
    bic: ['mus', 'กล้ามเนื้อต้นแขน', 'หดตัวทำให้แขนงอ ทำงานเป็นคู่กับกล้ามเนื้อด้านหลังแขนที่ทำให้แขนเหยียด', 'กล้ามเนื้อทำงานเป็นคู่ คู่หนึ่งหด อีกมัดคลาย'],
    abs: ['mus', 'กล้ามเนื้อท้อง', 'พยุงอวัยวะภายในช่องท้อง ช่วยให้ลำตัวก้มและบิด', ''],
    quad: ['mus', 'กล้ามเนื้อต้นขา', 'หดตัวทำให้ขาเหยียด ใช้เดิน วิ่ง และกระโดด', 'กล้ามเนื้อมัดใหญ่ที่สุดมัดหนึ่ง']
  };

  /* ---------------- the figure ---------------- */
  function figure(svg) {
    var L = {}, F = {};
    function layer(k) { return (L[k] = S('g', { 'class': 'layer l-' + k }, svg)); }
    function org(parent, key) { var g = S('g', { 'class': 'org', 'data-o': key }, parent); return g; }
    function path(g, d, cls, extra) { var p = S('path', { d: d, 'class': cls }, g); if (extra) for (var k in extra) p.setAttribute(k, extra[k]); return p; }
    function both(g, d, cls) { path(g, d, cls); path(g, mir(d), cls); }
    function bone(g, d) { path(g, d, 'bo-o', { pathLength: 1 }); path(g, d, 'bo-i', { pathLength: 1 }); path(g, d, 'hitv'); }
    function bones(g, d) { bone(g, d); bone(g, mir(d)); }
    function vessel(g, d, cls) { path(g, d, 'vs-o'); path(g, d, cls, { pathLength: 1 }); path(g, d, 'hitv'); }
    function vessels(g, d, cls) { vessel(g, d, cls); vessel(g, mir(d), cls); }
    /* skin */
    var HALF = [[274, 140], [270, 170], [240, 180], [204, 188], [180, 200], [166, 226], [160, 270], [154, 330], [148, 390], [144, 430], [138, 480], [132, 530], [126, 590], [116, 630], [110, 664], [118, 692], [134, 698], [146, 676], [150, 640], [156, 600], [164, 540], [170, 480], [176, 430], [182, 380], [188, 320], [196, 272], [204, 302], [208, 360], [212, 420], [212, 462], [204, 502], [198, 542], [200, 604], [208, 680], [220, 752], [222, 792], [218, 852], [224, 920], [230, 950], [212, 970], [208, 988], [252, 993], [268, 983], [270, 950], [278, 880], [286, 800], [290, 740], [294, 652], [298, 584]];
    var full = HALF.concat(HALF.slice().reverse().map(function (p) { return [600 - p[0], p[1]]; }));
    var skin = S('g', { 'class': 'skin' }, svg);
    path(skin, smoothClosed(full), 'sk');
    S('ellipse', { 'class': 'sk', cx: 300, cy: 80, rx: 50, ry: 64 }, skin);
    path(skin, 'M252 72 C244 70 242 92 252 98', 'sk-l'); path(skin, mir('M252 72 C244 70 242 92 252 98'), 'sk-l');

    /* skeleton */
    var sk = layer('skel'), g;
    g = org(sk, 'spine'); for (var v = 0; v < 22; v++) S('rect', { 'class': 'vert', x: 292, y: 150 + v * 16.5, width: 16, height: 13, rx: 4 }, g);
    g = org(sk, 'ribs');
    var RW = [44, 60, 70, 78, 84, 87, 88, 86, 82, 76];
    RW.forEach(function (w, i) { var y = 206 + i * 19; bones(g, 'M294 ' + y + ' C' + (300 - w * 0.55) + ' ' + (y - 9) + ' ' + (300 - w - 6) + ' ' + (y + 2) + ' ' + (300 - w - 3) + ' ' + (y + 28)); });
    path(g, 'M294 200 C250 196 212 214 210 260 C206 310 210 360 222 392 L378 392 C390 360 394 310 390 260 C388 214 350 196 306 200 Z', 'hitf');
    path(g, 'M291 200 L309 200 L310 312 L300 330 L290 312 Z', 'bo-f');
    bones(g, 'M294 192 C262 182 230 186 204 196');
    g = org(sk, 'skull');
    path(g, 'M300 22 C326 22 342 44 342 72 C342 92 334 100 330 106 C328 122 316 134 300 134 C284 134 272 122 270 106 C266 100 258 92 258 72 C258 44 274 22 300 22 Z', 'bo-f');
    S('ellipse', { 'class': 'eye', cx: 284, cy: 76, rx: 10, ry: 8 }, g); S('ellipse', { 'class': 'eye', cx: 316, cy: 76, rx: 10, ry: 8 }, g);
    path(g, 'M300 86 L294 100 L306 100 Z', 'eye'); path(g, 'M284 114 L316 114 M290 110 L290 118 M300 110 L300 118 M310 110 L310 118', 'bo-l');
    g = org(sk, 'pelvis');
    path(g, 'M300 470 C276 462 232 452 216 476 C206 500 222 532 246 546 C262 554 276 562 286 572 L314 572 C324 562 338 554 354 546 C378 532 394 500 384 476 C368 452 324 462 300 470 Z', 'bo-f');
    S('ellipse', { 'class': 'hole', cx: 272, cy: 548, rx: 10, ry: 8 }, g); S('ellipse', { 'class': 'hole', cx: 328, cy: 548, rx: 10, ry: 8 }, g);
    g = org(sk, 'arm');
    bones(g, 'M188 206 L160 412'); bones(g, 'M156 424 L136 592'); bones(g, 'M166 424 L148 594');
    bones(g, 'M136 602 L124 664 M142 604 L134 676 M148 604 L144 676');
    S('circle', { 'class': 'joint', cx: 188, cy: 205, r: 9 }, g); S('circle', { 'class': 'joint', cx: 412, cy: 205, r: 9 }, g);
    g = org(sk, 'femur');
    bones(g, 'M250 556 L238 762'); bones(g, 'M240 786 L246 950'); bones(g, 'M226 790 L232 946'); bones(g, 'M244 956 L222 986 M246 958 L250 990');
    S('circle', { 'class': 'joint', cx: 252, cy: 552, r: 10 }, g); S('circle', { 'class': 'joint', cx: 348, cy: 552, r: 10 }, g);
    S('circle', { 'class': 'joint', cx: 238, cy: 774, r: 9 }, g); S('circle', { 'class': 'joint', cx: 362, cy: 774, r: 9 }, g);

    /* blood vessels of the belly and legs lie behind the gut */
    var cb = S('g', { 'class': 'layer l-circ' }, svg);
    g = org(cb, 'vein'); vessel(g, 'M292 470 L292 380', 'vn'); vessels(g, 'M292 470 L270 542 L258 604 L252 760 L254 944', 'vn');
    g = org(cb, 'art'); vessel(g, 'M308 380 L308 470', 'ar'); vessels(g, 'M308 470 L280 540 L268 604 L262 760 L264 944', 'ar');
    /* digestion */
    var dg = layer('dig');
    g = org(dg, 'li'); path(g, 'M250 556 L242 474 C240 454 252 448 270 448 L345 448 C360 448 368 458 368 474 L366 534 C364 556 332 556 314 564 L302 584', 'li-o'); path(g, 'M250 556 L242 474 C240 454 252 448 270 448 L345 448 C360 448 368 458 368 474 L366 534 C364 556 332 556 314 564 L302 584', 'li-i', { pathLength: 1 });
    g = org(dg, 'si'); path(g, 'M262 472 C290 464 330 464 350 474 C358 504 356 534 340 542 C310 548 282 546 264 538 C256 518 256 492 262 472 Z', 'si-f');
    path(g, 'M270 482 C282 474 290 490 302 482 C314 474 322 490 336 482 M268 500 C282 492 292 510 306 500 C318 492 328 508 344 500 M270 520 C284 512 292 530 306 520 C318 512 330 528 344 520 M276 536 C290 530 300 542 316 534', 'si-l', { pathLength: 1 });
    g = org(dg, 'liver'); path(g, 'M210 376 C228 356 290 354 322 362 C336 366 340 382 326 392 C300 414 250 430 222 426 C206 418 202 390 210 376 Z', 'lv-f');
    g = org(dg, 'stom'); path(g, 'M322 374 C342 358 380 362 386 388 C394 416 380 444 350 450 C330 452 316 438 326 426 C340 418 350 410 348 396 C346 386 334 386 324 388 Z', 'st-f');
    g = org(dg, 'eso'); path(g, 'M300 168 L302 330 C304 356 314 370 324 378', 'tube-o'); path(g, 'M300 168 L302 330 C304 356 314 370 324 378', 'tube-i', { pathLength: 1 });

    /* breathing */
    var rs = layer('res');
    g = org(rs, 'lung');
    path(g, 'M290 226 C270 212 236 222 222 262 C210 300 210 340 222 364 C250 372 280 368 292 360 Z', 'lu-f');
    path(g, 'M310 226 C330 212 364 222 378 262 C390 300 390 340 378 364 C354 372 334 366 322 360 C332 338 320 318 312 300 Z', 'lu-f');
    path(g, 'M300 246 L280 262 L262 284 M280 262 L276 300 M262 284 L242 300 M262 284 L256 330 M300 246 L320 262 L338 284 M320 262 L324 300 M338 284 L358 300 M338 284 L346 330', 'br', { pathLength: 1 });
    g = org(rs, 'trachea'); S('rect', { 'class': 'tr-f', x: 293, y: 160, width: 14, height: 88, rx: 6 }, g);
    for (var r = 0; r < 10; r++) S('line', { 'class': 'tr-r', x1: 293, x2: 307, y1: 168 + r * 8, y2: 168 + r * 8 }, g);
    g = org(rs, 'diaph'); path(g, 'M210 374 C238 350 280 358 300 368 C320 358 362 350 390 374', 'dia', { pathLength: 1 }); path(g, 'M210 374 C238 350 280 358 300 368 C320 358 362 350 390 374', 'hitv');

    /* blood */
    var cc = layer('circ');
    g = org(cc, 'vein');
    vessel(g, 'M292 380 L292 284 C292 276 298 272 304 274', 'vn');
    vessels(g, 'M286 268 L280 150', 'vn'); vessels(g, 'M290 242 C260 222 232 212 214 214 C196 220 180 236 176 260 L168 412 L156 590', 'vn');
    g = org(cc, 'art');
    vessel(g, 'M312 266 C308 238 334 226 338 250 C340 264 312 290 308 320 L308 380', 'ar');
    vessels(g, 'M296 238 L292 150', 'ar'); vessels(g, 'M300 236 C270 214 232 204 206 210 C188 216 174 232 170 258 L158 410 L144 590', 'ar');
    g = org(cc, 'heart'); path(g, 'M318 262 C330 246 358 250 358 276 C358 302 334 320 316 334 C302 322 286 304 288 282 C290 258 308 250 318 262 Z', 'ht-f');
    path(g, 'M316 268 C314 290 318 310 316 330', 'ht-l');

    /* muscles (on top, see-through) */
    var ms = layer('mus');
    g = org(ms, 'pec'); both(g, 'M296 206 C270 200 214 198 192 216 C196 246 216 276 250 283 C274 286 292 270 296 250 Z', 'mu-f');
    both(g, 'M206 192 C184 190 168 206 166 242 C170 264 178 272 186 262 C190 236 200 216 212 206 Z', 'mu-f');
    g = org(ms, 'bic'); both(g, 'M178 262 C190 290 190 350 174 404 C162 380 158 320 166 272 Z', 'mu-f'); both(g, 'M160 430 C170 470 166 540 150 588 C140 560 140 480 150 440 Z', 'mu-f');
    g = org(ms, 'abs'); [386, 426, 466, 506].forEach(function (y) { both(g, 'M282 ' + y + ' L297 ' + y + ' L297 ' + (y + 36) + ' L282 ' + (y + 36) + ' Z', 'mu-f'); });
    both(g, 'M212 386 C230 420 250 470 262 538 L280 538 L280 386 Z', 'mu-f');
    g = org(ms, 'quad'); both(g, 'M222 560 C206 612 210 700 232 752 C248 762 262 746 270 700 C278 640 276 582 262 556 Z', 'mu-f'); both(g, 'M232 790 C222 830 224 900 238 942 C248 900 250 830 244 792 Z', 'mu-f');
    F.L = L; F.back = cb;
    /* anchors for leader lines (figure units) */
    F.anchor = { heart: [330, 288], art: [262, 700], vein: [176, 330], lung: [240, 300], trachea: [300, 210], diaph: [370, 366], eso: [301, 200], stom: [360, 412], liver: [240, 394], si: [300, 504], li: [246, 504], skull: [300, 60], ribs: [214, 290], spine: [300, 440], pelvis: [370, 500], femur: [244, 680], arm: [148, 520], pec: [236, 244], bic: [176, 330], abs: [290, 460], quad: [240, 660] };
    F.show = function (k, on, an) {
      var l = L[k]; l.classList.toggle('off', !on); if (k === 'circ') cb.classList.toggle('off', !on);
      if (on && an && !still()) $$('[pathLength]', l).concat(k === 'circ' ? $$('[pathLength]', cb) : []).forEach(function (p) { if (p.animate) p.animate([{ strokeDasharray: '1', strokeDashoffset: 1 }, { strokeDasharray: '1', strokeDashoffset: 0 }], { duration: 900, easing: 'ease-out' }); });
    };
    return F;
  }

  var C = {};

  /* ============ 1 · plate I: systems ============ */
  C['a-body'] = (function () {
    var svg = $('#a1-fig'), F = figure(svg), lead = $('#a1-lead'), sel = 'heart', state = { skel: true, mus: false, circ: true, dig: true, res: true };
    function stage(p) { return [550 + p[0] * 0.9, 104 + p[1] * 0.9]; }
    function info(k) {
      sel = k; var o = ORG[k];
      $('#a1-sys').textContent = SYS[o[0]]; $('#a1-sys').className = 'cd-sys s-' + o[0];
      $('#a1-nm').textContent = o[1]; $('#a1-tx').textContent = o[2]; $('#a1-fx').textContent = o[3];
      $$('.org', svg).forEach(function (g) { g.classList.toggle('sel', g.dataset.o === k); });
      leader();
    }
    function leader() {
      lead.textContent = ''; var a = stage(F.anchor[sel]), c = $('#a1-card'), cy = c.offsetTop + 70, x1 = c.offsetLeft - 8;
      if (!state[ORG[sel][0]]) return;
      S('path', { 'class': 'leader', d: 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' L' + (x1 - 40) + ' ' + cy + ' L' + x1 + ' ' + cy }, lead);
      S('circle', { 'class': 'ldot', cx: a[0], cy: a[1], r: 6 }, lead);
    }
    function sync(an) {
      Object.keys(state).forEach(function (k) { F.show(k, state[k], an && an === k); });
      $$('#a1-tgs .tg').forEach(function (b) { b.setAttribute('aria-pressed', state[b.dataset.l] ? 'true' : 'false'); });
      leader();
    }
    $$('#a1-tgs .tg').forEach(function (b) { tap(b, function () { var k = b.dataset.l; state[k] = !state[k]; sync(k); if (state[k]) { var first = Object.keys(ORG).filter(function (o) { return ORG[o][0] === k; })[0]; if (ORG[sel][0] !== k && !state[ORG[sel][0]]) info(first); else if (ORG[sel][0] !== k) info(first); } }); });
    svg.addEventListener('click', function (e) { var g = e.target.closest ? e.target.closest('.org') : null; if (!g) return; e.stopPropagation(); info(g.dataset.o); });
    sync(); info('heart');
    return {
      set: function (st, prev) {
        if (st === 1) { state.res = true; state.circ = true; sync(prev === 0 ? 'res' : null); info('lung'); }
        else if (prev < 0) { state = { skel: true, mus: false, circ: true, dig: true, res: true }; sync(); info('heart'); }
      },
      leave: function () {}
    };
  })();

  /* ============ 2 · plate II: the heart ============ */
  C['a-heart'] = (function () {
    var svg = $('#a2-svg'), bpm = 72, play = true, raf = 0, last = 0, ph = 0, sPos = 0;
    var HI = { RA: ['ห้องหัวใจ', 'ห้องบนขวา', 'รับเลือดที่มีออกซิเจนต่ำจากทั่วร่างกาย ผ่านหลอดเลือดดำใหญ่ แล้วส่งลงห้องล่างขวา'],
      RV: ['ห้องหัวใจ', 'ห้องล่างขวา', 'บีบตัวสูบเลือดที่มีออกซิเจนต่ำไปปอด ทางหลอดเลือดแดงที่ไปปอด'],
      LA: ['ห้องหัวใจ', 'ห้องบนซ้าย', 'รับเลือดที่มีออกซิเจนสูงจากปอด ทางหลอดเลือดดำที่มาจากปอด แล้วส่งลงห้องล่างซ้าย'],
      LV: ['ห้องหัวใจ', 'ห้องล่างซ้าย', 'ผนังหนาที่สุด บีบตัวแรงที่สุด สูบเลือดที่มีออกซิเจนสูงไปทั่วร่างกายทางหลอดเลือดแดงใหญ่ (เอออร์ตา)'],
      vc: ['หลอดเลือด', 'หลอดเลือดดำใหญ่', 'นำเลือดที่มีออกซิเจนต่ำจากร่างกายกลับเข้าห้องบนขวา'],
      ao: ['หลอดเลือด', 'หลอดเลือดแดงใหญ่ (เอออร์ตา)', 'หลอดเลือดที่ใหญ่ที่สุด นำเลือดที่มีออกซิเจนสูงจากห้องล่างซ้ายไปเลี้ยงร่างกาย'],
      pa: ['หลอดเลือด', 'หลอดเลือดแดงที่ไปปอด', 'นำเลือดที่มีออกซิเจนต่ำจากห้องล่างขวาไปปอด เป็นหลอดเลือดแดงที่มีเลือดออกซิเจนต่ำ'],
      pv: ['หลอดเลือด', 'หลอดเลือดดำที่มาจากปอด', 'นำเลือดที่มีออกซิเจนสูงจากปอดกลับเข้าห้องบนซ้าย'],
      lungs: ['อวัยวะ', 'ปอด', 'เลือดรับออกซิเจนและปล่อยคาร์บอนไดออกไซด์ที่ถุงลม เลือดจึงเปลี่ยนเป็นออกซิเจนสูง'],
      body: ['อวัยวะ', 'เซลล์ทั่วร่างกาย', 'เซลล์รับออกซิเจนและสารอาหารจากเลือด ส่งคาร์บอนไดออกไซด์และของเสียกลับเข้าเลือด'] };
    function grp(k, cls) { return S('g', { 'class': 'hp ' + (cls || ''), 'data-h': k }, svg); }
    /* boxes */
    var g = grp('lungs', 'pul'); S('rect', { 'class': 'box lu', x: 150, y: 26, width: 420, height: 92, rx: 46 }, g); T({ 'class': 'box-t', x: 360, y: 72, 'text-anchor': 'middle' }, 'ปอด', g);
    [[226, 72], [494, 72]].forEach(function (c) { path2(g, 'M' + c[0] + ' ' + (c[1] - 26) + ' c-26 0 -38 22 -38 40 c0 14 14 18 38 14 Z', 'lung-i'); path2(g, 'M' + (c[0] + 16) + ' ' + (c[1] - 26) + ' c26 0 38 22 38 40 c0 14 -14 18 -38 14 Z', 'lung-i'); });
    g = grp('body', 'sys'); S('rect', { 'class': 'box bd', x: 150, y: 744, width: 420, height: 92, rx: 46 }, g); T({ 'class': 'box-t', x: 360, y: 786, 'text-anchor': 'middle' }, 'เซลล์ทั่วร่างกาย', g);
    function path2(gg, d, c) { return S('path', { d: d, 'class': c }, gg); }
    /* vessels (tubes) */
    function tube(k, d, cls, circ) { var gg = grp(k, circ); path2(gg, d, 'tb-o'); path2(gg, d, 'tb ' + cls); return gg; }
    tube('vc', 'M160 814 L100 814 Q72 814 72 786 L72 315 L164 315', 'blue', 'sys');
    tube('ao', 'M560 470 L648 470 L648 786 Q648 814 620 814 L560 814', 'red', 'sys');
    tube('pa', 'M344 430 L360 404 L360 112', 'blue', 'pul');
    tube('pv', 'M476 112 L476 244', 'red', 'pul');
    /* chambers */
    var CH = {
      RA: 'M164 300 C164 262 190 244 230 244 L290 244 C318 244 330 262 330 290 L330 372 C330 386 320 394 306 394 L190 394 C174 394 164 384 164 368 Z',
      LA: 'M392 290 C392 262 404 244 432 244 L492 244 C530 244 556 262 556 300 L556 368 C556 384 546 394 530 394 L416 394 C402 394 392 386 392 372 Z',
      RV: 'M176 408 L350 408 L350 612 C352 636 358 650 364 660 C318 648 262 616 222 578 C190 546 176 508 176 470 Z',
      LV: 'M366 408 L560 408 L560 474 C560 552 520 604 470 632 C430 652 394 660 366 660 C368 640 366 624 366 610 Z'
    };
    var cham = {};
    [['RA', 'r', 'sys'], ['RV', 'r', 'pul'], ['LA', 'l', 'pul'], ['LV', 'l', 'sys']].forEach(function (c) {
      var gg = grp(c[0], c[2] + ' ch'); cham[c[0]] = gg;
      path2(gg, CH[c[0]], 'chm ' + c[1] + (c[0] === 'LV' ? ' thick' : c[0] === 'RV' ? ' mid' : ''));
    });
    var labs = [['RA', 247, 326, 'ห้องบนขวา'], ['LA', 474, 326, 'ห้องบนซ้าย'], ['RV', 262, 492, 'ห้องล่างขวา'], ['LV', 466, 500, 'ห้องล่างซ้าย']];
    var labsG = [];
    labs.forEach(function (l) { labsG.push(T({ 'class': 'ch-t', x: l[1], y: l[2], 'text-anchor': 'middle', 'data-for': l[0] }, l[3], null)); });
    /* valves: two flaps each; AV valves between atria and ventricles, semilunar at the exits */
    var V = {};
    /* each flap hangs from the wall: closed = the two flaps meet in the middle, open = they swing down into the next chamber */
    function valve(k, x, y, w, ang) { var gg = S('g', { 'class': 'valve', transform: 'translate(' + x + ',' + y + ') rotate(' + ang + ')' }, svg); V[k] = [S('line', { x1: -w, y1: 0, x2: 0, y2: 0 }, gg), S('line', { x1: w, y1: 0, x2: 0, y2: 0 }, gg), w]; }
    valve('tri', 254, 401, 34, 0); valve('mit', 470, 401, 34, 0); valve('pul', 360, 404, 14, 0); valve('aor', 560, 470, 14, 90);
    function setValve(k, open) { var v = V[k], w = v[2], a = (open ? 72 : 4) * Math.PI / 180, dx = w * Math.cos(a), dy = w * Math.sin(a); v[0].setAttribute('x2', (-w + dx).toFixed(1)); v[0].setAttribute('y2', dy.toFixed(1)); v[1].setAttribute('x2', (w - dx).toFixed(1)); v[1].setAttribute('y2', dy.toFixed(1)); }
    /* vessel labels */
    T({ 'class': 'vs-t', x: 44, y: 560, transform: 'rotate(-90 44 560)', 'text-anchor': 'middle' }, 'หลอดเลือดดำใหญ่', svg);
    T({ 'class': 'vs-t', x: 682, y: 620, transform: 'rotate(90 682 620)', 'text-anchor': 'middle' }, 'หลอดเลือดแดงใหญ่', svg);
    T({ 'class': 'vs-t', x: 330, y: 180, transform: 'rotate(-90 330 180)', 'text-anchor': 'middle' }, 'ไปปอด', svg);
    T({ 'class': 'vs-t', x: 514, y: 180, transform: 'rotate(-90 514 180)', 'text-anchor': 'middle' }, 'จากปอด', svg);
    /* the loop of blood */
    var LOOP = [[360, 814], [160, 814], [100, 814], [72, 790], [72, 315], [164, 315], [246, 318], [254, 404], [262, 505], [322, 466], [350, 424], [360, 396], [360, 112], [370, 100], [466, 100], [476, 112], [476, 244], [474, 318], [470, 404], [458, 520], [520, 486], [560, 470], [648, 470], [648, 790], [624, 814], [560, 814], [360, 814]];
    var segL = [], LT = 0, sLung = 0;
    for (var i = 1; i < LOOP.length; i++) { var d = Math.hypot(LOOP[i][0] - LOOP[i - 1][0], LOOP[i][1] - LOOP[i - 1][1]); segL.push(d); LT += d; if (i === 14) sLung = LT - d / 2; }
    function at(s) { s = ((s % LT) + LT) % LT; for (var i = 0; i < segL.length; i++) { if (s <= segL[i]) { var a = LOOP[i], b = LOOP[i + 1], f = s / segL[i]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; } s -= segL[i]; } return LOOP[0]; }
    var dots = S('g', { 'class': 'dots' }, svg), ND = 46, DOT = [];
    for (var k = 0; k < ND; k++) DOT.push(S('circle', { r: 7 }, dots));
    var labTop = S('g', { 'class': 'labtop' }, svg); labsG.forEach(function (t) { labTop.appendChild(t); });
    var bodyClick = function (e) { var gg = e.target.closest ? e.target.closest('.hp') : null; if (!gg) return; e.stopPropagation(); info(gg.dataset.h); };
    svg.addEventListener('click', bodyClick);
    function info(k) { var o = HI[k]; $('#a2-sys').textContent = o[0]; $('#a2-nm').textContent = o[1]; $('#a2-tx').textContent = o[2]; $$('.hp', svg).forEach(function (gg) { gg.classList.toggle('sel', gg.dataset.h === k); }); }
    function frame(now) {
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      var T = 60 / bpm; if (play) ph = (ph + dt / T) % 1;
      var atr = ph < 0.13 ? Math.sin(Math.PI * ph / 0.13) : 0, ven = ph > 0.15 && ph < 0.47 ? Math.sin(Math.PI * (ph - 0.15) / 0.32) : 0;
      ['RA', 'LA'].forEach(function (c) { cham[c].style.transform = 'scale(' + (1 - 0.06 * atr).toFixed(4) + ')'; });
      ['RV', 'LV'].forEach(function (c) { cham[c].style.transform = 'scale(' + (1 - 0.08 * ven).toFixed(4) + ')'; });
      var vs = ph > 0.15 && ph < 0.47; setValve('tri', !vs); setValve('mit', !vs); setValve('pul', vs); setValve('aor', vs);
      if (play) sPos += dt * 140 * (bpm / 72) * (0.55 + 1.3 * ven + 0.35 * atr);
      for (var k = 0; k < ND; k++) {
        var s = sPos + k * LT / ND, p = at(s), m = ((s % LT) + LT) % LT;
        DOT[k].setAttribute('cx', p[0].toFixed(1)); DOT[k].setAttribute('cy', p[1].toFixed(1));
        DOT[k].setAttribute('class', m < sLung ? 'blue' : 'red');
      }
      if (!still()) raf = requestAnimationFrame(frame); else raf = 0;
    }
    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    var trk = $('#a2-trk'), inr = $('#a2-in');
    function setBpm(b) { bpm = clamp(Math.round(b), 50, 150); var pc = ((bpm - 50) / 100 * 100).toFixed(2) + '%'; $('#a2-th').style.left = pc; $('#a2-fill').style.width = pc; $('#a2-bpm').textContent = bpm; trk.setAttribute('aria-valuenow', bpm);
      $('#a2-per').innerHTML = 'หัวใจบีบตัว 1 ครั้ง ใช้เวลา <b>' + (60 / bpm).toFixed(2) + ' วินาที</b>' + (bpm < 60 ? ' · ช้ากว่าปกติขณะพัก' : bpm <= 100 ? ' · อยู่ในช่วงปกติขณะพัก (60–100)' : ' · เร็วขึ้น เช่น หลังออกกำลังกาย'); }
    slider(trk, inr, 50, 150, 1, setBpm);
    tap($('#a2-play'), function () { play = !play; $('#a2-play').textContent = play ? '❚❚ หยุด' : '▶ เล่น'; });
    $$('#a2-side [data-b]').forEach(function (b) { tap(b, function () { setBpm(+b.dataset.b); }); });
    setBpm(72); info('LV');
    if (still()) frame(0);
    return {
      set: function (st) {
        svg.classList.toggle('show-pul', st === 1); svg.classList.toggle('show-sys', st === 2);
        if (st === 1) info('RV'); else if (st === 2) info('LV');
        if (still()) { frame(0); return; } start();
      },
      leave: stop
    };
  })();

  /* ============ 3 · quick check ============ */
  C['a-quiz'] = (function () {
    var svg = $('#a3-fig'), F = figure(svg), Q = [['lung', 'แตะอวัยวะที่ <b>แลกเปลี่ยนแก๊ส</b> ออกซิเจนกับคาร์บอนไดออกไซด์'], ['si', 'แตะอวัยวะที่ <b>ดูดซึมสารอาหาร</b> เข้าสู่เลือดมากที่สุด'], ['heart', 'แตะอวัยวะที่ <b>สูบฉีดเลือด</b> ไปทั่วร่างกาย']], q = 0, done = [false, false, false];
    F.show('mus', false); F.show('skel', true);
    var marks = S('g', {}, svg);
    function badge(k, n) { var a = F.anchor[k], gg = S('g', { 'class': 'badge' }, marks); S('circle', { cx: a[0] + 26, cy: a[1] - 22, r: 17 }, gg); T({ x: a[0] + 26, y: a[1] - 15, 'text-anchor': 'middle' }, n, gg); }
    function show() {
      $('#a3-t').innerHTML = (q + 1) + '. ' + Q[q][1];
      $$('#a3-dots i').forEach(function (d, i) { d.className = done[i] ? 'ok' : i === q ? 'now' : ''; });
      $('#a3-next').disabled = !done[q] || q === 2;
    }
    function say(k, m) { var f = $('#a3-fb'); f.className = 'qz-fb ' + k; f.textContent = m; }
    svg.addEventListener('click', function (e) {
      var g = e.target.closest ? e.target.closest('.org') : null; if (!g) return; e.stopPropagation();
      var k = g.dataset.o;
      if (k === Q[q][0]) { if (!done[q]) badge(k, q + 1); done[q] = true; say('ok', 'ถูกต้อง! ' + ORG[k][1] + ': ' + ORG[k][2]); }
      else { say('no', 'นั่นคือ' + ORG[k][1] + ' ยังไม่ใช่ ลองอีกครั้ง'); if (!still() && g.animate) g.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], { duration: 300 }); }
      show();
    });
    tap($('#a3-next'), function () { if (q < 2 && done[q]) { q++; say('', ''); show(); } });
    function reset() { q = 0; done = [false, false, false]; marks.textContent = ''; say('', ''); show(); }
    tap($('#a3-reset'), reset);
    reset();
    return {
      set: function (st, prev) {
        var w = $('#a3-sort').__w;
        if (st === 1) { marks.textContent = ''; Q.forEach(function (x, i) { badge(x[0], i + 1); done[i] = true; }); q = 2; show(); say('ok', 'เฉลย: 1 ปอด · 2 ลำไส้เล็ก · 3 หัวใจ'); if (w) w.show(); }
        else if (prev === 1) { reset(); if (w) w.hide(); }
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
  window.__body = { C: C };
})();
