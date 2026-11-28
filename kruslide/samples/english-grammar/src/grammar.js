/* grammar.js · the live parts of the Simple tenses sample (vanilla JS, no libraries, no network).
   Slide 1: measures "will" and "ed" so the verb can grow and shrink smoothly (the CSS animates widths per beat).
   Slide 2: the w-sort widget from tools.js (laid out as a timeline in tools.css).
   Slide 3: four typed gaps with one Check / Show answer / Reset. */
(function () {
  'use strict';
  var $ = K.$, $$ = K.$$, E = K.E, tk = K.tk;

  /* ================= slide 1 ================= */
  (function () {
    var s = $('#g1-s'); if (!s) return;
    function measure() {
      var w = s.querySelector('.w-will span'), e = s.querySelector('.w-ed span');
      s.style.setProperty('--wW', w.offsetWidth + 'px'); s.style.setProperty('--wE', e.offsetWidth + 'px');
    }
    measure(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    var said = ['I play.', 'I played.', 'I will play.'];
    K.ctl('eg-forms', { set: function (st) { s.setAttribute('aria-label', said[st] || said[0]); } });
  })();

  /* ================= slide 3 · gaps ================= */
  (function () {
    var host = $('#g3-foot'); if (!host) return;
    var ins = $$('#g3-text .g3-in');
    function norm(v) { return String(v).toLowerCase().replace(/[’']/g, "'").replace(/[.,!?]+$/, '').replace(/\s+/g, ' ').trim(); }
    ins.forEach(function (inp) {
      var g = inp.parentNode, m = E('i', 'gk', null, g); m.setAttribute('aria-hidden', 'true'); inp._g = g; inp._m = m;
      inp.addEventListener('input', function () { ac.hide(); mark(inp, ''); if (!ft.fb.classList.contains('no')) ft.say(''); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); check(); inp.blur(); } });
    });
    function mark(inp, k) {
      inp.classList.remove('ok', 'no'); inp._g.classList.remove('ok', 'no');
      if (k) { inp.classList.add(k); inp._g.classList.add(k); inp._m.textContent = k === 'ok' ? '✓' : '✗'; }
    }
    var ft = K.footer(host, { check: check, show: function () { ac.toggle(); }, reset: reset, hint: 'Look at the time words in bold.' });
    function check() {
      ac.hide();
      var filled = ins.filter(function (i) { return i.value.trim(); });
      if (!filled.length) { ft.say('info', 'Type your answers first.'); return; }
      var right = 0;
      ins.forEach(function (i) {
        if (!i.value.trim()) { mark(i, ''); return; }
        var ok = norm(i.value) === i.dataset.a; mark(i, ok ? 'ok' : 'no'); if (ok) right++;
        else K.anim(i, [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'none' }], { duration: 300 });
      });
      if (right === ins.length) ft.say('ok', 'All 4 correct.');
      else ft.say(right === filled.length ? 'info' : 'no', right + ' of ' + ins.length + ' correct' + (filled.length < ins.length ? ' · ' + (ins.length - filled.length) + ' still empty' : ''));
    }
    function reset() { ac.off(); ins.forEach(function (i) { i.value = ''; i.readOnly = false; mark(i, ''); }); ft.say(''); }
    var ac = tk.answerCtl(host, ft, {
      snap: function () { return ins.map(function (i) { return i.value; }); },
      reveal: function () { ins.forEach(function (i) { i.value = i.dataset.a; i.readOnly = true; mark(i, 'ok'); }); },
      restore: function (v) { ins.forEach(function (i, k) { i.value = v[k]; i.readOnly = false; mark(i, ''); }); }
    });
    window.__gaps = { check: check, reset: reset, ins: ins, ac: ac };
  })();

  K.start();
})();
