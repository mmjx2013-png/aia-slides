/* KruSlide sales site and sample library: language switch, menu, reveals, counters, the hero desk,
   time-back estimator, price calculator, the in-page viewer (live samples and style galleries),
   library filters and search, floating LINE button.
   Vanilla JS, no libraries, no network calls, no innerHTML, no pop-up windows. */
(function () {
  'use strict';
  var root = document.documentElement;
  var RM = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  function lang() { return root.lang === 'en' ? 'en' : 'th'; }
  function nf(v) { return Math.round(v).toLocaleString('en-US'); }
  var IO = 'IntersectionObserver' in window;

  /* ---------- tween a number in an element ---------- */
  function tweenNum(el, to, fmt, dur) {
    fmt = fmt || nf;
    var from = parseFloat(el.dataset.v || el.textContent.replace(/,/g, '')) || 0;
    el.dataset.v = to;
    if (RM.matches || from === to) { el.textContent = fmt(to); return; }
    var t0 = null, tok = el._tok = {};
    function f(t) {
      if (el._tok !== tok) return;
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / (dur || 450)), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }

  /* ================= language ================= */
  var TITLE = { th: document.title, en: document.body.classList.contains('libpage') ? 'Sample library · KruSlide' : 'KruSlide · Interactive lesson slides for your whole textbook' };
  var metaD = $('meta[name="description"]');
  var DESC = { th: metaD ? metaD.content : '', en: 'KruSlide makes interactive lesson slides for every subject and level: animation on every slide, students answer on screen, a teacher guide and step-by-step answers. From 3–5 baht per slide per month.' };
  var ATTRS = ['aria-label', 'alt', 'title'];
  ATTRS.forEach(function (a) {
    $$('[data-en-' + a + ']').forEach(function (el) { el.setAttribute('data-th-' + a, el.getAttribute(a) || ''); });
  });
  var onLang = [];
  function setLang(l, save) {
    l = l === 'en' ? 'en' : 'th';
    root.lang = l;
    document.title = TITLE[l];
    if (metaD) metaD.content = DESC[l];
    ATTRS.forEach(function (a) {
      $$('[data-en-' + a + ']').forEach(function (el) { el.setAttribute(a, el.getAttribute('data-' + l + '-' + a)); });
    });
    $$('[data-ph-' + l + ']').forEach(function (el) { el.placeholder = el.getAttribute('data-ph-' + l); });
    $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lang === l ? 'true' : 'false'); });
    if (save) { try { localStorage.setItem('ks-lang', l); } catch (e) {} }
    onLang.forEach(function (f) { f(l); });
  }
  $$('.lang button').forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.lang, true); }); });

  /* ================= header: shadow, hide on the way down, mobile menu, current section ================= */
  var top = $('.top'), nav = $('#nav'), mbtn = $('.menu-btn');
  var lastY = window.scrollY;
  function onScroll() {
    var y = window.scrollY;
    top.classList.toggle('scrolled', y > 8);
    var away = y > 420 && y > lastY + 2 && !nav.classList.contains('open') && !top.contains(document.activeElement);
    if (away) top.classList.add('away'); else if (y < lastY - 2 || y <= 420) top.classList.remove('away');
    lastY = y;
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  top.addEventListener('focusin', function () { top.classList.remove('away'); });
  function menu(open) {
    nav.classList.toggle('open', open);
    mbtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    var lbl = open ? ['ปิดเมนู', 'Close menu'] : ['เปิดเมนู', 'Open menu'];
    mbtn.setAttribute('data-th-aria-label', lbl[0]); mbtn.setAttribute('data-en-aria-label', lbl[1]);
    mbtn.setAttribute('aria-label', lbl[lang() === 'en' ? 1 : 0]);
  }
  mbtn.addEventListener('click', function () { menu(!nav.classList.contains('open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { menu(false); mbtn.focus(); } });
  document.addEventListener('click', function (e) { if (nav.classList.contains('open') && !e.target.closest('#nav,.menu-btn')) menu(false); });
  if (IO) {
    var links = {};
    $$('.nav>a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var secIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var a = links[e.target.id]; if (!a) return;
        if (e.isIntersecting) { $$('.nav>a.is-cur').forEach(function (x) { x.classList.remove('is-cur'); }); a.classList.add('is-cur'); }
        else a.classList.remove('is-cur');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) secIO.observe(s); });
  }

  /* ================= reveals and counters ================= */
  $$('[data-d]').forEach(function (el) { el.style.setProperty('--d', (+el.dataset.d || 0) + 'ms'); });
  var counters = $$('[data-count]');
  if (!IO || RM.matches) {
    $$('.rv').forEach(function (el) { el.classList.add('in'); });
  } else {
    var rvIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rvIO.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    $$('.rv').forEach(function (el) { rvIO.observe(el); });
    var once = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        once.unobserve(e.target);
        tweenNum(e.target, +e.target.dataset.count, nf, 1300);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { el.dataset.v = 0; el.textContent = '0'; once.observe(el); });
  }

  /* ================= hero desk: one real slide lifts at a time ================= */
  var dks = $$('.desk .dk');
  if (dks.length && !RM.matches) {
    var di = 0, dOn = true, timer = null;
    function lift() { dks.forEach(function (d, k) { d.classList.toggle('lift', k === di); }); di = (di + 1) % dks.length; }
    function run() { if (!timer && dOn) { lift(); timer = setInterval(lift, 2600); } }
    function stop() { clearInterval(timer); timer = null; }
    var desk = $('.desk');
    if (IO) new IntersectionObserver(function (es) { dOn = es[0].isIntersecting; if (dOn) run(); else stop(); }).observe(desk); else run();
    desk.addEventListener('pointerenter', function () { stop(); dks.forEach(function (d) { d.classList.remove('lift'); }); });
    desk.addEventListener('pointerleave', run);
  }

  /* ================= time-back estimator ================= */
  var svOut = $('#sv-out');
  function sv(id) { return +($('#' + id).dataset.val); }
  function saver() {
    var h = sv('sv-min') * sv('sv-n') / 60;
    tweenNum(svOut, h, function (v) { return (Math.round(v * 10) / 10).toLocaleString('en-US'); }, 500);
  }
  $$('.st-b').forEach(function (b) {
    b.addEventListener('click', function () {
      var o = $('#' + b.dataset.for), v = +o.dataset.val + (+b.dataset.step);
      v = Math.max(+o.dataset.min, Math.min(+o.dataset.max, v));
      o.dataset.val = v; o.textContent = v;
      saver();
    });
  });

  /* ================= price calculator: 3–5 baht per slide per month ================= */
  var cr = $('#calc-r'), cn = $('#calc-n');
  if (cr && cn) {
    var out = { lo: $('#calc-lo'), hi: $('#calc-hi'), dlo: $('#calc-dlo'), dhi: $('#calc-dhi') };
    var day = function (v) { return v < 1 ? (Math.round(v * 10) / 10).toString() : nf(v); };
    var calc = function (n, from) {
      n = Math.max(1, Math.min(5000, Math.round(n) || 1));
      if (from !== 'n') cn.value = n;
      if (from !== 'r') cr.value = Math.min(+cr.max, Math.max(+cr.min, n));
      cr.style.setProperty('--p', ((cr.value - cr.min) / (cr.max - cr.min) * 100).toFixed(1) + '%');
      tweenNum(out.lo, n * 3); tweenNum(out.hi, n * 5);
      tweenNum(out.dlo, n * 3 / 30, day); tweenNum(out.dhi, n * 5 / 30, day);
      $$('.chips-q button').forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.n === n ? 'true' : 'false'); });
    };
    cr.addEventListener('input', function () { calc(+cr.value, 'r'); });
    cn.addEventListener('input', function () { if (cn.value !== '') calc(+cn.value, 'n'); });
    cn.addEventListener('change', function () { calc(+cn.value); });
    $$('.chips-q button').forEach(function (b) { b.addEventListener('click', function () { calc(+b.dataset.n); }); });
    calc(+cn.value);
  }

  /* ================= the in-page viewer: live samples (iframe) and style galleries (images) ================= */
  var V = $('#viewer');
  if (V && typeof V.showModal === 'function') {
    var vIn = $('#viewer-in'), vT = $('#viewer-t'), vIf = $('#viewer-if'), vG = $('#vg'), vImg = $('#vg-img'), vN = $('#vg-n');
    var vFull = $('#viewer-full'), vMode = $('#viewer-mode'), vX = $('#viewer-x');
    var cur = null;   /* { el, live, gal: [], gi, th, en } */
    var title = function () { if (cur) vT.textContent = lang() === 'en' ? cur.en : cur.th; };
    onLang.push(title);
    var showImg = function (dir) {
      var g = cur.gal; cur.gi = (cur.gi + g.length) % g.length;
      vImg.src = g[cur.gi]; vImg.alt = vT.textContent + ' ' + (cur.gi + 1);
      vN.textContent = (cur.gi + 1) + ' / ' + g.length;
      vFull.href = g[cur.gi];
      if (dir && !RM.matches) { vImg.style.setProperty('--dx', (dir * 50) + 'px'); vImg.classList.remove('swap'); void vImg.offsetWidth; vImg.classList.add('swap'); }
      if (g.length > 1) { var pre = new Image(); pre.src = g[(cur.gi + 1) % g.length]; }
    };
    var hookFrame = function () {
      /* the sample is our own page (same origin): take the focus so ← → work at once, and let Esc close */
      try {
        var w = vIf.contentWindow;
        w.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }, true);
        vIf.focus(); w.focus();
      } catch (e) { vIf.focus(); }
    };
    vIf.addEventListener('load', function () { if (V.open && !vIf.hidden && vIf.getAttribute('src')) hookFrame(); });
    var showLive = function () {
      vG.hidden = true; vIf.hidden = false; vMode.hidden = true;
      vFull.href = cur.live;
      if (vIf.getAttribute('src') !== cur.live) vIf.src = cur.live; else hookFrame();
    };
    var showGal = function () {
      vIf.hidden = true; vIf.removeAttribute('src');
      vG.hidden = false; vG.classList.toggle('one', cur.gal.length < 2);
      vMode.hidden = !cur.live;
      showImg(0);
      setTimeout(function () { (cur.gal.length > 1 ? $('#vg-next') : vX).focus(); }, 30);
    };
    var zoom = function (back, done) {
      var el = cur && cur.el;
      if (RM.matches || !el || !vIn.animate) { if (done) done(); return; }
      var r = el.getBoundingClientRect(), R = vIn.getBoundingClientRect();
      if (!r.width || !R.width) { if (done) done(); return; }
      var from = { transform: 'translate(' + (r.left - R.left) + 'px,' + (r.top - R.top) + 'px) scale(' + (r.width / R.width) + ',' + (r.height / R.height) + ')', opacity: 0.4 };
      var to = { transform: 'none', opacity: 1 };
      var a = vIn.animate(back ? [to, from] : [from, to], { duration: back ? 360 : 520, easing: 'cubic-bezier(.2,.7,.2,1)' });
      if (done) a.onfinish = done;
    };
    var open = function (el, opt) {
      cur = { el: el, live: opt.live || '', gal: opt.gal || [], gi: 0, th: opt.th || '', en: opt.en || opt.th || '' };
      title();
      V.showModal(); root.classList.add('viewer-open');
      if (opt.start === 'gal' && cur.gal.length) showGal(); else if (cur.live) showLive(); else showGal();
      zoom(false);
    };
    var closing = false;
    var close = function () {
      if (!V.open || closing) return;
      closing = true;
      vIf.removeAttribute('src');   /* stop the sample first: a heavy page (a WebGL globe) must not hold the close back */
      var finished = false;
      var done = function () {
        if (finished) return; finished = true;
        V.close(); closing = false;
        vIf.hidden = true; vG.hidden = true;
        root.classList.remove('viewer-open');
        if (cur && cur.el) cur.el.focus();
      };
      setTimeout(done, 450);
      zoom(true, done);
    };
    vX.addEventListener('click', close);
    V.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    V.addEventListener('click', function (e) { if (e.target === V) close(); });
    vMode.addEventListener('click', function () { showLive(); });
    $('#vg-prev').addEventListener('click', function () { cur.gi--; showImg(-1); });
    $('#vg-next').addEventListener('click', function () { cur.gi++; showImg(1); });
    V.addEventListener('keydown', function (e) {
      if (vG.hidden || !cur || cur.gal.length < 2) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); cur.gi++; showImg(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); cur.gi--; showImg(-1); }
    });
    var sx = null;
    vG.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    vG.addEventListener('pointerup', function (e) {
      if (sx === null || !cur) return; var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50 && cur.gal.length > 1) { cur.gi += dx < 0 ? 1 : -1; showImg(dx < 0 ? 1 : -1); }
    });
    /* cards that open a live sample */
    document.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-view]:not(.sty-shot)');
      if (b) { open(b, { live: b.dataset.view, th: b.dataset.vtTh, en: b.dataset.vtEn }); return; }
      var s = e.target.closest('.sty-shot');
      if (s) {
        var gal = (s.dataset.galList || '').split(',').filter(Boolean);
        var live = s.dataset.view || '';
        open(s, { live: live, gal: gal, th: s.dataset.vtTh, en: s.dataset.vtEn, start: (/[DEF]/.test(s.dataset.style) && live) ? 'live' : 'gal' });
      }
    });
  }

  /* ================= library: filter chips and search ================= */
  var lib = $('#lib');
  if (lib) {
    var cards = $$('#lib-grid .lc'), q = $('#lib-q'), shown = $('#lib-shown'), empty = $('#lib-empty');
    var st = { subject: '', level: '', mech: '' };
    var apply = function () {
      var qq = (q.value || '').trim().toLowerCase(), n = 0;
      cards.forEach(function (c) {
        var ok = (!st.subject || c.dataset.subject === st.subject) && (!st.level || c.dataset.level === st.level) &&
          (!st.mech || (' ' + c.dataset.mech + ' ').indexOf(' ' + st.mech + ' ') >= 0) && (!qq || c.dataset.q.indexOf(qq) >= 0);
        c.hidden = !ok; if (ok) n++;
      });
      shown.textContent = n; empty.hidden = n > 0;
    };
    $$('.lib-f button').forEach(function (b) {
      b.addEventListener('click', function () {
        st[b.dataset.f] = b.dataset.v;
        $$('.lib-f button[data-f="' + b.dataset.f + '"]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        apply();
      });
    });
    q.addEventListener('input', apply);
    apply();
  }

  /* ================= floating LINE button: after the hero CTA, hidden at the final call to action ================= */
  var fab = $('#fab'), heroCta = $('.hero .cta-row') || $('.lib-hero'), finalCard = $('.final-card');
  if (fab && IO && heroCta) {
    var heroOut = false, finalIn = false;
    var upd = function () { fab.classList.toggle('show', heroOut && !finalIn); };
    new IntersectionObserver(function (es) { heroOut = !es[0].isIntersecting && es[0].boundingClientRect.top < 0; upd(); }).observe(heroCta);
    if (finalCard) new IntersectionObserver(function (es) { finalIn = es[0].isIntersecting; upd(); }).observe(finalCard);
  }

  setLang(lang(), false);
})();
