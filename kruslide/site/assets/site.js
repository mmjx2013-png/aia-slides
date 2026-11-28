/* KruSlide sales site: language switch, menu, scroll reveals, counters, time-back estimator,
   price calculator, live demo tabs, style gallery lightbox, trailer slot, floating LINE button.
   Vanilla JS, no libraries, no network calls, no innerHTML. */
(function () {
  'use strict';
  var root = document.documentElement;
  var RM = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  function lang() { return root.lang === 'en' ? 'en' : 'th'; }
  function nf(v) { return Math.round(v).toLocaleString('en-US'); }

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
  var TITLE = { th: document.title, en: 'KruSlide · Interactive lesson slides for your whole textbook' };
  var metaD = $('meta[name="description"]');
  var DESC = { th: metaD ? metaD.content : '', en: 'KruSlide turns your whole textbook into interactive slides: animation on every slide, students answer on screen, a teacher guide and step-by-step answers. From 3–5 baht per slide per month.' };
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
    $$('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lang === l ? 'true' : 'false'); });
    if (save) { try { localStorage.setItem('ks-lang', l); } catch (e) {} }
    onLang.forEach(function (f) { f(l); });
  }
  $$('.lang button').forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.lang, true); }); });

  /* ================= header: shadow, mobile menu, current section ================= */
  var top = $('.top'), nav = $('#nav'), mbtn = $('.menu-btn');
  function onScroll() { top.classList.toggle('scrolled', window.scrollY > 8); }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
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

  var IO = 'IntersectionObserver' in window;
  if (IO) {
    var links = {};
    $$('.nav>a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var secIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var a = links[e.target.id]; if (!a) return;
        if (e.isIntersecting) { $$('.nav>a.is-cur').forEach(function (x) { x.classList.remove('is-cur'); }); a.classList.add('is-cur'); }
        else a.classList.remove('is-cur');   /* back in the hero or between sections: nothing is marked */
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) secIO.observe(s); });
  }

  /* ================= reveals, counters, step line ================= */
  $$('[data-d]').forEach(function (el) { el.style.setProperty('--d', (+el.dataset.d || 0) + 'ms'); });
  var counters = $$('[data-count]');
  function count(el) { tweenNum(el, +el.dataset.count, nf, 1400); }
  if (!IO || RM.matches) {
    $$('.rv').forEach(function (el) { el.classList.add('in'); });
    $$('.steps-row').forEach(function (el) { el.classList.add('lit'); });
  } else {
    var rvIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rvIO.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.rv').forEach(function (el) { rvIO.observe(el); });
    var once = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        once.unobserve(e.target);
        if (e.target.hasAttribute('data-count')) count(e.target); else e.target.classList.add('lit');
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { el.dataset.v = 0; el.textContent = '0'; once.observe(el); });
    $$('.steps-row').forEach(function (el) { once.observe(el); });
  }

  /* hero loop: pause when the classroom is off screen */
  var stage = $('.stage');
  if (stage && IO) new IntersectionObserver(function (es) { stage.classList.toggle('paused', !es[0].isIntersecting); }).observe(stage);

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
  var out = { lo: $('#calc-lo'), hi: $('#calc-hi'), dlo: $('#calc-dlo'), dhi: $('#calc-dhi') };
  function day(v) { return v < 1 ? (Math.round(v * 10) / 10).toString() : nf(v); }
  function calc(n, from) {
    n = Math.max(1, Math.min(5000, Math.round(n) || 1));
    if (from !== 'n') cn.value = n;
    if (from !== 'r') cr.value = Math.min(+cr.max, Math.max(+cr.min, n));
    cr.style.setProperty('--p', ((cr.value - cr.min) / (cr.max - cr.min) * 100).toFixed(1) + '%');
    tweenNum(out.lo, n * 3); tweenNum(out.hi, n * 5);
    tweenNum(out.dlo, n * 3 / 30, day); tweenNum(out.dhi, n * 5 / 30, day);
    $$('.chips-q button').forEach(function (b) { b.setAttribute('aria-pressed', +b.dataset.n === n ? 'true' : 'false'); });
  }
  if (cr && cn) {
    cr.addEventListener('input', function () { calc(+cr.value, 'r'); });
    cn.addEventListener('input', function () { if (cn.value !== '') calc(+cn.value, 'n'); });
    cn.addEventListener('change', function () { calc(+cn.value); });
    $$('.chips-q button').forEach(function (b) { b.addEventListener('click', function () { calc(+b.dataset.n); }); });
    calc(+cn.value);
  }

  /* ================= live demo: one tab per mechanic, each sets the iframe's #N hash ================= */
  var tabs = $$('.tabs [role="tab"]'), frame = $('#demo-if'), hint = $('#demo-hint'), openA = $('#demo-open'), panel = $('#demo-panel');
  var BASE = 'demo/index.html';
  var curTab = tabs[0];
  function deckWin() {
    try { var w = frame.contentWindow; return w && w.__deck ? w : null; } catch (e) { return null; }
  }
  function penOn(w) { try { return w.document.documentElement.classList.contains('pen-on'); } catch (e) { return false; } }
  function setPen(w, on) { try { if (penOn(w) !== on) w.document.dispatchEvent(new w.CustomEvent('deck:pen')); } catch (e) {} }
  function whenDeck(fn) {
    var w = deckWin();
    if (w) { fn(w); return; }
    frame.addEventListener('load', function h() { frame.removeEventListener('load', h); setTimeout(function () { var x = deckWin(); if (x) fn(x); }, 60); });
  }
  function showHint(t) {
    hint.textContent = t.getAttribute('data-hint-' + lang());
    hint.classList.remove('flash'); void hint.offsetWidth; hint.classList.add('flash');
  }
  function select(t, focus) {
    if (!t) return;
    curTab = t;
    tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; });
    if (focus) t.focus();
    panel.setAttribute('aria-labelledby', t.id);
    var n = +t.dataset.slide, url = BASE + '#' + n;
    openA.href = url;
    showHint(t);
    var w = deckWin();
    if (w) {
      var st = w.__deck.state();
      if (st.i === n - 1) w.__deck.jump(n - 1, 0);      /* same slide: back to step 0 (answers hidden) */
      else w.location.hash = '#' + n;                    /* the deck listens for hashchange */
    } else {
      frame.src = url;
    }
    whenDeck(function (x) { setPen(x, !!t.dataset.pen); });
  }
  tabs.forEach(function (t, k) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      var j = null;
      if (e.key === 'ArrowRight') j = (k + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') j = (k - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = tabs.length - 1;
      if (j === null) return;
      e.preventDefault(); select(tabs[j], true);
      if (tabs[j].scrollIntoView) tabs[j].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: RM.matches ? 'auto' : 'smooth' });
    });
  });
  onLang.push(function () { if (curTab) hint.textContent = curTab.getAttribute('data-hint-' + lang()); });

  /* ================= style gallery lightbox ================= */
  var G = [
    ['img/style-A-1.webp', 'สไตล์ A · โมเดิร์น คลีน: หน้าปกหน่วยที่ 4 สถิติ', 'Style A · Modern clean: the Unit 4 Statistics title slide'],
    ['img/style-A-2.webp', 'สไตล์ A · โมเดิร์น คลีน: คำถามเชิงสถิติคืออะไร', 'Style A · Modern clean: is it a statistical question?'],
    ['img/style-A-3.webp', 'สไตล์ A · โมเดิร์น คลีน: แบบฝึกหัดแผนภูมิรูปภาพ', 'Style A · Modern clean: pictogram practice'],
    ['img/style-B-1.webp', 'สไตล์ B · สมุดจด: หน้าปกหน่วยที่ 4 สถิติ', 'Style B · Notebook: the Unit 4 Statistics title slide'],
    ['img/style-B-2.webp', 'สไตล์ B · สมุดจด: คำถามเชิงสถิติคืออะไร', 'Style B · Notebook: is it a statistical question?'],
    ['img/style-B-3.webp', 'สไตล์ B · สมุดจด: แบบฝึกหัดแผนภูมิรูปภาพ', 'Style B · Notebook: pictogram practice'],
    ['img/style-C.webp', 'สไตล์ C · อินโฟกราฟิก: โรงอาหารในตัวเลข', 'Style C · Infographic: the canteen in numbers'],
    ['img/theme-navy-gold.webp', 'ธีมโรงเรียน: กรมท่า-ทอง (โลโก้และชื่อโรงเรียนเป็นตัวอย่าง)', 'School theme: navy and gold (sample logo and school name)'],
    ['img/theme-green-white.webp', 'ธีมโรงเรียน: เขียว-ขาว', 'School theme: green and white'],
    ['img/theme-maroon-cream.webp', 'ธีมโรงเรียน: เลือดหมู-ครีม', 'School theme: maroon and cream']
  ];
  var lb = $('#lb'), lbImg = $('#lb-img'), lbCap = $('#lb-cap'), lbN = $('#lb-n'), gi = 0;
  function show(i, dir) {
    gi = (i + G.length) % G.length;
    var g = G[gi], k = lang() === 'en' ? 2 : 1;
    lbImg.src = g[0]; lbImg.alt = g[k]; lbCap.textContent = g[k]; lbN.textContent = (gi + 1) + ' / ' + G.length;
    if (dir && !RM.matches) { lbImg.style.setProperty('--dx', (dir * 40) + 'px'); lbImg.classList.remove('swap'); void lbImg.offsetWidth; lbImg.classList.add('swap'); }
    var pre = new Image(); pre.src = G[(gi + 1) % G.length][0];
  }
  if (lb && typeof lb.showModal === 'function') {
    $$('[data-gal]').forEach(function (b) { b.addEventListener('click', function () { show(+b.dataset.gal); lb.showModal(); }); });
    $('#lb-prev').addEventListener('click', function () { show(gi - 1, -1); });
    $('#lb-next').addEventListener('click', function () { show(gi + 1, 1); });
    $('#lb-x').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(gi + 1, 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); show(gi - 1, -1); }
    });
    var sx = null;
    lb.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    lb.addEventListener('pointerup', function (e) {
      if (sx === null) return; var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) show(gi + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
    onLang.push(function () { if (lb.open) show(gi); });
  } else {
    /* very old browsers: open the picture itself */
    $$('[data-gal]').forEach(function (b) { b.addEventListener('click', function () { location.href = G[+b.dataset.gal][0]; }); });
  }

  /* ================= trailer slot (media/ayutthaya-1080.mp4 is copied in later) ================= */
  var vid = $('#trailer'), soon = $('#vid-soon');
  if (vid && soon) {
    var src = vid.querySelector('source');
    function missing() { soon.hidden = false; }
    if (src) src.addEventListener('error', missing);
    vid.addEventListener('error', missing);
    vid.addEventListener('playing', function () { soon.hidden = true; });
  }

  /* ================= floating LINE button: after the hero, hidden at the final call to action ================= */
  var fab = $('#fab'), heroCta = $('.hero .cta-row'), finalCard = $('.final-card');
  if (fab && IO && heroCta) {
    var heroOut = false, finalIn = false;
    function upd() { fab.classList.toggle('show', heroOut && !finalIn); }
    new IntersectionObserver(function (es) { heroOut = !es[0].isIntersecting && es[0].boundingClientRect.top < 0; upd(); }).observe(heroCta);
    if (finalCard) new IntersectionObserver(function (es) { finalIn = es[0].isIntersecting; upd(); }).observe(finalCard);
  }

  setLang(lang(), false);
})();
