/* KruSlide sample math-equation-balance: copy of kruslide/samples/calculus/src/engine.js (from teacher-slides/unit4, Thai status text).
   Deck engine: stage scaling, beats, navigation, lesson menu, control bar.
   Slides: <section class="slide" data-steps="N" data-lesson="1" data-title="...">. Beats add .b1..b4 to the slide.
   Only arrow keys, PageUp/PageDown and the ‹ › buttons change the slide; clicks, taps and swipes never do.
   Events: document dispatches 'deck:change' {detail:{i,st,slide}} after every change; listens for 'deck:pen' (tools toggle).
   Test hooks: window.__deck = {next, prev, jump(i, beat), state()}; ?still = no motion (screenshots). */
(function () {
  var root = document.documentElement, stage = document.getElementById('stage');
  var slides = [].slice.call(stage.querySelectorAll('.slide')), N = slides.length, i = 0, st = 0;
  var STEPS = slides.map(function (s) { return +s.dataset.steps || 0; });
  var qs = new URLSearchParams(location.search);
  if (qs.has('still')) root.classList.add('rm', 'shot');
  else if (matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('rm');

  /* Size from the visible area (clientWidth/Height), not innerWidth: on phones and tablets innerWidth can report a
     larger layout viewport, which made the slide zoom in and get cut off. */
  function vw() { return root.clientWidth || innerWidth; }
  function vh() { return root.clientHeight || innerHeight; }
  function fit() {
    var s = Math.min(vw() / 1920, vh() / 1080);
    stage.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
    root.style.setProperty('--scale', s);
  }
  addEventListener('resize', fit); addEventListener('orientationchange', fit);
  if (window.visualViewport) visualViewport.addEventListener('resize', fit);
  fit();

  function count(el) {
    var to = +el.dataset.count, dec = (el.dataset.count.split('.')[1] || '').length, t0 = null, tok = el._tok = {};
    if (root.classList.contains('rm')) { el.textContent = to.toFixed(dec); return; }
    function f(t) { if (el._tok !== tok) return; if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 900); el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(dec); if (p < 1) requestAnimationFrame(f); }
    el.textContent = (0).toFixed(dec); requestAnimationFrame(f);
  }

  var pos = document.getElementById('pos'), live = document.getElementById('live');
  function lessonOf(k) { for (var j = k; j >= 0; j--) if (slides[j].dataset.lesson) return slides[j]; return null; }
  function show(dir) {
    slides.forEach(function (s, k) {
      var on = k === i;
      s.classList.toggle('on', on);
      for (var b = 1; b <= 4; b++) s.classList.toggle('b' + b, on && st >= b);
      if (on) { s.removeAttribute('inert'); s.setAttribute('aria-hidden', 'false'); }
      else { s.setAttribute('inert', ''); s.setAttribute('aria-hidden', 'true'); }
    });
    var s = slides[i];
    s.querySelectorAll('[data-count]').forEach(function (el) {
      var at = +(el.dataset.at || 0);
      if (st === at || (dir === 'jump' && st >= at)) count(el);
      else if (st < at) { el._tok = null; el.textContent = ''; }
    });
    var L = lessonOf(i);
    if (menuEl) [].forEach.call(menuEl.children, function (b) { b.setAttribute('aria-current', b._slide === L ? 'true' : 'false'); });
    if (pos) pos.textContent = (i + 1) + ' / ' + N + (STEPS[i] ? '  ·  ขั้น ' + st + '/' + STEPS[i] : '');
    if (live) live.textContent = (L ? L.dataset.title + '. ' : '') + 'สไลด์ ' + (i + 1) + ' จาก ' + N + (STEPS[i] ? ', ขั้น ' + st + ' จาก ' + STEPS[i] : '');
    if (!qs.has('still')) try { history.replaceState(null, '', '#' + (i + 1)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('deck:change', { detail: { i: i, st: st, slide: s } }));
  }
  function next() { if (st < STEPS[i]) st++; else if (i < N - 1) { i++; st = 0; } else return; show('fwd'); }
  function prev() { if (st > 0) st--; else if (i > 0) { i--; st = STEPS[i]; } else return; show('back'); }
  function jump(k, b) { i = Math.max(0, Math.min(N - 1, k | 0)); st = Math.max(0, Math.min(b | 0, STEPS[i])); show('jump'); }

  function busy(t) { return root.classList.contains('pen-on') || (t && t.closest && t.closest('.ia,a,button,input,textarea,select,label,#ctl,#menu,[contenteditable]')); }
  /* The slide changes ONLY with the arrow keys (or a clicker's PageUp/PageDown) and the ‹ › buttons (owner, 27 Nov).
     Clicking, tapping or swiping on the slide never changes it, so a wrong click at the board cannot skip ahead. */
  if (matchMedia('(pointer: coarse)').matches) root.classList.add('touchy');   /* touch screens: the bar is visible from the start */
  addEventListener('pointerdown', function (e) { if ((e.pointerType || 'mouse') !== 'mouse') root.classList.add('touchy'); }, true);
  stage.addEventListener('click', function () { if (menuOpen()) closeMenu(); });
  addEventListener('keydown', function (e) {
    var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    var k = e.key, nav = k === 'PageDown' || k === 'PageUp' || ((k === 'ArrowRight' || k === 'ArrowLeft') && !typing);
    if (menuOpen()) {   /* while the lesson menu is open, keys move inside it and never change the slide */
      var items = [].slice.call(menuEl.children), at = items.indexOf(document.activeElement);
      if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); e.stopPropagation(); items[Math.min(items.length - 1, at + 1)].focus(); }
      else if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); e.stopPropagation(); items[Math.max(0, at - 1)].focus(); }
      else if (k === 'Escape' || k === 'm' || k === 'M') { e.preventDefault(); e.stopPropagation(); closeMenu(); }
      else if (!(t && t.closest && t.closest('#menu'))) { e.preventDefault(); e.stopPropagation(); }
      return;
    }
    if (!nav) return;
    e.preventDefault(); e.stopPropagation();
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    (k === 'PageDown' || k === 'ArrowRight') ? next() : prev();
  }, true);
  addEventListener('keydown', function (e) {
    var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    var k = e.key;
    if ((k === ' ' || k === 'Enter') && t && t.closest && t.closest('button,.ia,a')) return;
    if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(); }
    else if (k === 'Home') jump(0); else if (k === 'End') jump(N - 1, 9);
    else if (k === 'f' || k === 'F') fs();
    else if (k === 'p' || k === 'P') document.dispatchEvent(new CustomEvent('deck:pen'));
    else if (k === 'm' || k === 'M') menu();
    else if (k === 'Escape') closeMenu();
  });
  /* control bar: shows on pointer move, hides after 2.5 s */
  var ctl = document.getElementById('ctl'), hideT = null;
  function wake() { if (!ctl) return; ctl.classList.add('show'); clearTimeout(hideT); hideT = setTimeout(function () { ctl.classList.remove('show'); }, 2500); }
  addEventListener('pointermove', wake); addEventListener('touchstart', wake, { passive: true });
  function fs() { if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {}); }
  var menuEl = document.getElementById('menu');
  function menuOpen() { return !!(menuEl && menuEl.classList.contains('open')); }
  function closeMenu() {
    if (!menuOpen()) return;
    menuEl.classList.remove('open'); var mb = document.getElementById('mn'); if (mb) mb.setAttribute('aria-expanded', 'false');
    if (menuEl.contains(document.activeElement)) document.activeElement.blur();
  }
  function menu() {
    if (!menuEl) return; if (menuOpen()) { closeMenu(); return; }
    menuEl.classList.add('open'); var mb = document.getElementById('mn'); if (mb) mb.setAttribute('aria-expanded', 'true');
    var cur = menuEl.querySelector('[aria-current="true"]') || menuEl.firstChild; if (cur) cur.focus();
  }
  if (menuEl) {
    slides.forEach(function (s, k) {
      if (!s.dataset.lesson) return;
      var b = document.createElement('button'); b.type = 'button';
      b.textContent = s.dataset.title; var sm = document.createElement('small'); sm.textContent = 'Slide ' + (k + 1); b.appendChild(sm); b._slide = s;
      b.addEventListener('click', function () { closeMenu(); jump(k); });
      menuEl.appendChild(b);
    });
  }
  function on(id, f) { var el = document.getElementById(id); if (el) el.addEventListener('click', function (e) { e.stopPropagation(); f(); }); }
  on('pv', prev); on('nx', next); on('mn', menu); on('fs', fs);
  on('pen', function () { document.dispatchEvent(new CustomEvent('deck:pen')); });
  document.addEventListener('pen:state', function (e) { var b = document.getElementById('pen'); if (b) b.setAttribute('aria-pressed', e.detail.on ? 'true' : 'false'); });

  addEventListener('hashchange', function () { var n = parseInt((location.hash || '').slice(1), 10); if (n && n - 1 !== i) jump(n - 1); });
  window.__deck = { next: next, prev: prev, jump: jump, state: function () { return { i: i, st: st, steps: STEPS[i], n: N, id: slides[i].id }; } };
  var h = parseInt((location.hash || '').slice(1), 10);
  jump(h ? h - 1 : (qs.has('s') ? +qs.get('s') : 0), h ? 0 : +(qs.get('b') || 0));
})();
