/* KruSlide styles sample E · photo interactions (vanilla JS, no libraries):
   - tap any photo (.ph) to open it full screen inside the deck with its caption and credit; the frame grows from the photo
     itself; tap anywhere, × or Esc closes it;
   - slide 3 "find it in the photo": tap the right place in each of four photos; a filmstrip switches photos;
   - slide 5 before / after: drag anywhere across the picture (the whole width) to compare two satellite images.
   Only arrow keys / PageUp / PageDown / ‹ › change the slide: drags use pointer capture and touch-action:none.
   Test hooks: window.__photo = {open, close, find, ba}. */
(function () {
  'use strict';
  var root = document.documentElement, stage = document.getElementById('stage');
  if (!stage) return;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function still() { return root.classList.contains('rm'); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function k() { var r = stage.getBoundingClientRect(); return { s: r.width / 1920, x: r.left, y: r.top }; }
  function inStage(el) { var r = el.getBoundingClientRect(), K = k(); return { x: (r.left - K.x) / K.s, y: (r.top - K.y) / K.s, w: r.width / K.s, h: r.height / K.s }; }
  var ZI = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15.5 15.5 L21 21 M10.5 7.5 V13.5 M7.5 10.5 H13.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  var liveEl = document.createElement('div'); liveEl.className = 'sr'; liveEl.setAttribute('aria-live', 'polite'); document.body.appendChild(liveEl);
  function announce(t) { liveEl.textContent = ''; setTimeout(function () { liveEl.textContent = t; }, 30); }

  /* ================= the photo viewer ================= */
  var lb = document.createElement('div'); lb.id = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'ภาพขยาย');
  lb.innerHTML = '<img class="lb-img" alt=""><p class="lb-cap"></p><button type="button" class="lb-x" aria-label="ปิดภาพ"><svg viewBox="0 0 24 24"><path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button><span class="lb-hint">แตะที่ใดก็ได้เพื่อปิด</span>';
  stage.appendChild(lb);
  var lbImg = $('.lb-img', lb), lbCap = $('.lb-cap', lb), from = null, anim = null, opener = null;
  function rectFit(nw, nh) { var mw = 1640, mh = 840, s = Math.min(mw / nw, mh / nh); var w = nw * s, h = nh * s; return { x: 960 - w / 2, y: 470 - h / 2, w: w, h: h }; }
  function setBox(r) { lbImg.style.left = r.x + 'px'; lbImg.style.top = r.y + 'px'; lbImg.style.width = r.w + 'px'; lbImg.style.height = r.h + 'px'; }
  function open(ph) {
    var img = $('img', ph); if (!img) return;
    opener = ph; from = inStage(ph);
    lbImg.src = img.currentSrc || img.src; lbImg.alt = img.alt || '';
    lbCap.innerHTML = '';
    var b = document.createElement('b'); b.textContent = ph.dataset.cap || ''; lbCap.appendChild(b);
    var i = document.createElement('i'); i.textContent = ph.dataset.credit || ''; lbCap.appendChild(i);
    lb.classList.add('open'); lb.classList.remove('shown');
    var to = rectFit(img.naturalWidth || 1600, img.naturalHeight || 1000);
    setBox(to);
    if (anim) anim.cancel();
    if (!still() && lbImg.animate) {
      anim = lbImg.animate([{ left: from.x + 'px', top: from.y + 'px', width: from.w + 'px', height: from.h + 'px' }, { left: to.x + 'px', top: to.y + 'px', width: to.w + 'px', height: to.h + 'px' }], { duration: 520, easing: 'cubic-bezier(.22,.7,.2,1)' });
      lb.animate([{ backgroundColor: 'rgba(10,14,11,0)' }, { backgroundColor: 'rgba(10,14,11,.94)' }], { duration: 420, easing: 'ease' });
      anim.onfinish = function () { lb.classList.add('shown'); };
    } else lb.classList.add('shown');
    announce('เปิดภาพ: ' + (ph.dataset.cap || ''));
    setTimeout(function () { $('.lb-x', lb).focus({ preventScroll: true }); }, 30);
  }
  function close(now) {
    if (!lb.classList.contains('open')) return;
    lb.classList.remove('shown');
    var fin = function () { lb.classList.remove('open'); if (opener && !now) try { opener.focus({ preventScroll: true }); opener.blur(); } catch (e) {} };
    if (now || still() || !lbImg.animate || !from) return fin();
    var cur = { left: lbImg.style.left, top: lbImg.style.top, width: lbImg.style.width, height: lbImg.style.height };
    anim = lbImg.animate([cur, { left: from.x + 'px', top: from.y + 'px', width: from.w + 'px', height: from.h + 'px' }], { duration: 380, easing: 'cubic-bezier(.22,.7,.2,1)' });
    lb.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease' });
    anim.onfinish = fin;
  }
  lb.addEventListener('click', function (e) { e.stopPropagation(); close(); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb.classList.contains('open')) { e.stopPropagation(); close(); } }, true);
  document.addEventListener('deck:change', function () { close(true); });
  function zoomable(ph) {
    if (ph._z) return; ph._z = true;
    var zb = document.createElement('span'); zb.className = 'zoomi'; zb.innerHTML = ZI; ph.appendChild(zb);
    if (ph.dataset.nozoom != null) return;   /* (sort cards and the hotspot photo zoom from their own button) */
    ph.tabIndex = 0; ph.setAttribute('role', 'button'); ph.setAttribute('aria-label', 'ขยายภาพ: ' + (ph.dataset.cap || ''));
    ph.addEventListener('click', function (e) { e.stopPropagation(); open(ph); });
    ph.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); open(ph); } });
  }
  $$('.ph[data-cap]').forEach(zoomable);
  /* small zoom buttons (inside sort cards): never start a drag or select the card */
  $$('.zbtn').forEach(function (b) {
    b.innerHTML = ZI; b.type = 'button'; b.setAttribute('aria-label', 'ขยายภาพ');
    b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    b.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); var ph = b.closest('[data-cap]') || b.parentNode; open(ph); });
  });

  /* ================= slide 3: find it in the photo ================= */
  var fs = $('#e3-stage');
  if (fs) (function () {
    var frames = $$('#e3-strip .fr'), img = $('img', fs), ring = $('#e3-ring'), miss = $('#e3-miss'), q = $('#e3-q'), cnt = $('#e3-n'), fb = $('#e3-fb'), lab = $('#e3-lab');
    var cur = 0, found = frames.map(function () { return false; }), answers = false, swapT = null;
    function data(i) { var f = frames[i].dataset; return { src: $('img', frames[i]).getAttribute('src'), x: +f.x, y: +f.y, r: +f.r, q: f.q, lab: f.lab, cap: f.cap, credit: f.credit, op: f.op || '50% 50%' }; }
    function show(i, quiet) {
      cur = i; var d = data(i);
      frames.forEach(function (f, j) { f.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      fs.dataset.cap = d.cap; fs.dataset.credit = d.credit;
      if (!quiet && !still() && img.animate) img.animate([{ opacity: 0, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.22,.7,.2,1)' });
      img.src = d.src; img.style.objectPosition = d.op;
      q.textContent = d.q; fb.textContent = ''; fb.className = '';
      mark(found[i] || answers);
      if (!quiet && !still() && q.animate) q.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.22,.7,.2,1)' });
    }
    function mark(on) {
      var d = data(cur);
      ring.style.left = d.x + '%'; ring.style.top = d.y + '%'; ring.style.width = ring.style.height = (d.r * 2) + '%';
      ring.classList.toggle('on', !!on); lab.textContent = d.lab;
      lab.style.left = d.x + '%'; lab.style.top = 'calc(' + d.y + '% + ' + (d.r * fs.offsetWidth / 100 + 18) + 'px)';
      lab.classList.toggle('on', !!on);
      lab.classList.toggle('up', d.y > 70);
      if (d.y > 70) lab.style.top = 'calc(' + d.y + '% - ' + (d.r * fs.offsetWidth / 100 + 62) + 'px)';
    }
    function count() { var n = found.filter(Boolean).length; cnt.textContent = n; frames.forEach(function (f, j) { f.classList.toggle('done', found[j] || answers); }); return n; }
    fs.style.touchAction = 'manipulation';
    fs.addEventListener('click', function (e) {
      e.stopPropagation();
      if (e.target.closest('.zbtn')) return;
      var r = fs.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100, d = data(cur);
      var dx = (x - d.x) * r.width / 100, dy = (y - d.y) * r.height / 100;
      if (Math.hypot(dx, dy) <= d.r * r.width / 100 * 1.15) {
        if (!found[cur]) { found[cur] = true; var n = count(); fb.textContent = n === frames.length ? 'เก่งมาก! หาเจอครบทั้ง ' + n + ' ภาพ' : 'เจอแล้ว!'; fb.className = 'ok'; announce('เจอแล้ว: ' + d.lab); }
        mark(true);
        var nx = found.indexOf(false);
        if (nx >= 0) { clearTimeout(swapT); swapT = setTimeout(function () { show(nx); }, still() ? 0 : 1500); }
      } else {
        miss.style.left = x + '%'; miss.style.top = y + '%';
        miss.classList.remove('go'); void miss.offsetWidth; miss.classList.add('go');
        fb.textContent = 'ยังไม่ใช่ ลองดูใหม่'; fb.className = 'no';
      }
    });
    frames.forEach(function (f, j) { f.addEventListener('click', function (e) { e.stopPropagation(); clearTimeout(swapT); show(j); }); });
    $('#e3-reset').addEventListener('click', function (e) { e.stopPropagation(); found = found.map(function () { return false; }); answers = false; count(); show(0); });
    document.addEventListener('deck:change', function (e) {
      if (e.detail.slide !== fs.closest('.slide')) return;
      var a = e.detail.st >= 1; if (a !== answers) { answers = a; count(); mark(found[cur] || answers); }
    });
    show(0, true); count();
    window.__photo = window.__photo || {}; window.__photo.find = { show: show, state: function () { return { cur: cur, found: found.slice() }; }, target: function () { return data(cur); } };
  })();

  /* ================= slide 5: before / after ================= */
  var ba = $('#e5-ba');
  if (ba) (function () {
    var top = $('.ba-after', ba), hd = $('.ba-h', ba), v = 50;
    function set(p) { v = clamp(p, 0, 100); top.style.clipPath = 'inset(0 0 0 ' + v + '%)'; hd.style.left = v + '%'; ba.setAttribute('aria-valuenow', Math.round(v)); }
    ba.style.touchAction = 'none';
    var id = null;
    function at(e) { var r = ba.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; }
    ba.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (root.classList.contains('pen-on')) return;
      e.preventDefault(); e.stopPropagation(); id = e.pointerId; try { ba.setPointerCapture(id); } catch (er) {}
      ba.classList.add('held'); set(at(e));
    });
    ba.addEventListener('pointermove', function (e) { if (e.pointerId === id) set(at(e)); });
    function up(e) { if (e.pointerId !== id) return; id = null; ba.classList.remove('held'); try { ba.releasePointerCapture(e.pointerId); } catch (er) {} }
    ba.addEventListener('pointerup', up); ba.addEventListener('pointercancel', up);
    ba.addEventListener('click', function (e) { e.stopPropagation(); });
    ba.addEventListener('keydown', function (e) { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); set(v + (e.key === 'ArrowUp' ? 5 : -5)); } });
    /* on entering the slide the divider sweeps once from 1987 to 1999 and back to the middle, to show it can move */
    document.addEventListener('deck:change', function (e) {
      if (e.detail.slide !== ba.closest('.slide') || e.detail.st !== 0 || still() || !ba.animate) { if (still()) set(50); return; }
      var t0 = null; set(12);
      (function f(t) { if (t0 === null) t0 = t; var p = Math.min(1, (t - t0 - 900) / 1800); if (p > 0) set(12 + 76 * Math.sin(p * Math.PI) * (1 - .55 * p) + 38 * p * p); if (p < 1) requestAnimationFrame(f); })(performance.now());
    });
    set(50);
    window.__photo = window.__photo || {}; window.__photo.ba = { set: set, get: function () { return v; } };
  })();

  window.__photo = window.__photo || {}; window.__photo.open = function (sel) { open($(sel)); }; window.__photo.close = close;
})();
