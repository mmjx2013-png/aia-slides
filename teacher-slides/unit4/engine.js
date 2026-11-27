/* Deck engine: stage scaling, beats, navigation, lesson menu, control bar.
   Slides: <section class="slide" data-steps="N" data-lesson="1" data-title="...">. Beats add .b1..b4 to the slide.
   Clicks on .ia / buttons / inputs never advance. While body has .pen-on, clicks and swipes never advance.
   Events: document dispatches 'deck:change' {detail:{i,st,slide}} after every change; listens for 'deck:pen' (tools toggle).
   Test hooks: window.__deck = {next, prev, jump(i, beat), state()}; ?still = no motion (screenshots). */
(function () {
  var root = document.documentElement, stage = document.getElementById('stage');
  var slides = [].slice.call(stage.querySelectorAll('.slide')), N = slides.length, i = 0, st = 0;
  var STEPS = slides.map(function (s) { return +s.dataset.steps || 0; });
  var qs = new URLSearchParams(location.search);
  if (qs.has('still')) root.classList.add('rm', 'shot');
  else if (matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('rm');

  function fit() {
    var s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
    root.style.setProperty('--scale', s);
  }
  addEventListener('resize', fit); fit();

  function count(el) {
    var to = +el.dataset.count, dec = (el.dataset.count.split('.')[1] || '').length, t0 = null;
    if (root.classList.contains('rm')) { el.textContent = to.toFixed(dec); return; }
    function f(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 900); el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(dec); if (p < 1) requestAnimationFrame(f); }
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
      else if (st < at) el.textContent = '';
    });
    var L = lessonOf(i);
    if (menuEl) [].forEach.call(menuEl.children, function (b) { b.setAttribute('aria-current', b._slide === L ? 'true' : 'false'); });
    if (pos) pos.textContent = (i + 1) + ' / ' + N;
    if (live) live.textContent = (L ? L.dataset.title + '. ' : '') + 'Slide ' + (i + 1) + ' of ' + N + (STEPS[i] ? ', step ' + st + ' of ' + STEPS[i] : '');
    if (!qs.has('still')) try { history.replaceState(null, '', '#' + (i + 1)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('deck:change', { detail: { i: i, st: st, slide: s } }));
  }
  function next() { if (st < STEPS[i]) st++; else if (i < N - 1) { i++; st = 0; } else return; show('fwd'); }
  function prev() { if (st > 0) st--; else if (i > 0) { i--; st = STEPS[i]; } else return; show('back'); }
  function jump(k, b) { i = Math.max(0, Math.min(N - 1, k | 0)); st = Math.max(0, Math.min(b | 0, STEPS[i])); show('jump'); }

  function busy(t) { return root.classList.contains('pen-on') || (t && t.closest && t.closest('.ia,a,button,input,textarea,select,label,#ctl,#menu,[contenteditable]')); }
  /* Only a real mouse click on the slide advances. Touch and stylus taps never do, so a student working at the board
     cannot reveal an answer by accident; on touch screens use swipe or the ‹ › buttons. */
  var lastPointer = 'mouse';
  addEventListener('pointerdown', function (e) { lastPointer = e.pointerType || 'mouse'; if (lastPointer !== 'mouse') root.classList.add('touchy'); }, true);
  stage.addEventListener('click', function (e) {
    if (menuEl && menuEl.classList.contains('open')) { closeMenu(); return; }
    if (lastPointer !== 'mouse' || busy(e.target)) return;
    (e.clientX < innerWidth * 0.2) ? prev() : next();
  });
  addEventListener('keydown', function (e) {
    var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    var k = e.key, nav = k === 'PageDown' || k === 'PageUp' || ((k === 'ArrowRight' || k === 'ArrowLeft') && !typing);
    if (!nav) return;
    e.preventDefault(); e.stopPropagation();
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    (k === 'PageDown' || k === 'ArrowRight') ? next() : prev();
  }, true);
  addEventListener('keydown', function (e) {
    var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    var k = e.key;
    if ((k === ' ' || k === 'Enter') && t && t.closest && t.closest('button,.ia,a')) return;
    if (k === 'ArrowRight' || k === ' ' || k === 'PageDown' || k === 'Enter') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); prev(); }
    else if (k === 'Home') jump(0); else if (k === 'End') jump(N - 1, 9);
    else if (k === 'f' || k === 'F') fs();
    else if (k === 'p' || k === 'P') document.dispatchEvent(new CustomEvent('deck:pen'));
    else if (k === 'm' || k === 'M') menu();
    else if (k === 'Escape') closeMenu();
  });
  var x0 = null, y0 = null;
  stage.addEventListener('touchstart', function (e) { if (busy(e.target)) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) { if (e.cancelable) e.preventDefault(); dx < 0 ? next() : prev(); } x0 = null;
  });

  /* control bar: shows on pointer move, hides after 2.5 s */
  var ctl = document.getElementById('ctl'), hideT = null;
  function wake() { if (!ctl) return; ctl.classList.add('show'); clearTimeout(hideT); hideT = setTimeout(function () { ctl.classList.remove('show'); }, 2500); }
  addEventListener('pointermove', wake); addEventListener('touchstart', wake, { passive: true });
  function fs() { if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {}); }
  var menuEl = document.getElementById('menu');
  function closeMenu() { if (menuEl) menuEl.classList.remove('open'); }
  function menu() { if (menuEl) menuEl.classList.toggle('open'); }
  if (menuEl) {
    slides.forEach(function (s, k) {
      if (!s.dataset.lesson) return;
      var b = document.createElement('button'); b.type = 'button';
      b.innerHTML = s.dataset.title + '<small>Slide ' + (k + 1) + '</small>'; b._slide = s;
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
  jump(qs.has('s') ? +qs.get('s') : (h ? h - 1 : 0), +(qs.get('b') || 0));
})();
