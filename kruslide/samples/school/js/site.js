/* Satit PBRU concept site: language toggle, mobile menu, counting numbers, "how we learn" reveal. No dependencies. */
(function () {
  var doc = document.documentElement, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* language: TH / EN, remembered */
  function labels() { // screen-reader labels follow the chosen language too
    var k = doc.lang === 'en' ? 'data-al-en' : 'data-al-th';
    document.querySelectorAll('[data-al-en]').forEach(function (e) { e.setAttribute('aria-label', e.getAttribute(k)); });
  }
  labels();
  document.querySelectorAll('.lang [data-l]').forEach(function (b) {
    b.setAttribute('aria-pressed', b.getAttribute('data-l') === doc.lang ? 'true' : 'false');
    b.addEventListener('click', function () {
      doc.lang = b.getAttribute('data-l');
      try { localStorage.setItem('lang', doc.lang); } catch (e) {}
      document.querySelectorAll('.lang [data-l]').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      labels();
    });
  });

  /* map: Google's map loads only when the visitor asks for it */
  var mb = document.querySelector('[data-map]');
  if (mb) mb.addEventListener('click', function () {
    var box = document.getElementById('map'), f = document.createElement('iframe');
    f.className = 'bigmap'; f.id = 'map'; f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.title = mb.getAttribute(doc.lang === 'en' ? 'data-title-en' : 'data-title-th');
    f.src = mb.getAttribute('data-map'); box.parentNode.replaceChild(f, box); f.focus();
  });

  /* mobile menu */
  var mnav = document.getElementById('mnav'), open = document.querySelector('.hdr .menu-btn');
  if (mnav && open) {
  function setMenu(on) { mnav.classList.toggle('open', on); open.setAttribute('aria-expanded', on ? 'true' : 'false'); if (on) mnav.querySelector('a').focus(); else open.focus(); }
  open.addEventListener('click', function () { setMenu(true); });
  mnav.querySelector('.close').addEventListener('click', function () { setMenu(false); });
  mnav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mnav.classList.contains('open')) setMenu(false); });
  }

  /* numbers count up when they come into view */
  var nums = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; io.unobserve(e.target);
        var el = e.target, to = +el.getAttribute('data-count'), from = Math.round(to * 0.96), t0 = performance.now();
        (function tick(t) { var p = Math.min(1, (t - t0) / 1400), k = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(from + (to - from) * k); if (p < 1) requestAnimationFrame(tick); })(t0);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* how we learn: the chosen card opens its picture with a circle that grows from the card */
  var learn = document.querySelector('.learn');
  if (learn) {
    // its pictures are lazy (they cost nothing on first load); start fetching them as the section comes near
    var wake = function () { learn.querySelectorAll('img[data-wake]').forEach(function (i) { i.loading = 'eager'; }); };
    if ('IntersectionObserver' in window) { var wio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { wake(); wio.disconnect(); } }, { rootMargin: '900px 0px' }); wio.observe(learn); } else wake();
    var layers = learn.querySelectorAll('.stage .ph[data-k]'), cards = learn.querySelectorAll('.lc');
    cards.forEach(function (c) {
      c.addEventListener('click', function () {
        var k = c.getAttribute('data-k'), on = c.getAttribute('aria-pressed') !== 'true';
        var r = learn.getBoundingClientRect(), cr = c.getBoundingClientRect();
        learn.style.setProperty('--cx', ((cr.left + cr.width / 2 - r.left) / r.width * 100) + '%');
        learn.style.setProperty('--cy', ((cr.top + cr.height / 2 - r.top) / r.height * 100) + '%');
        cards.forEach(function (o) { o.setAttribute('aria-pressed', o === c && on ? 'true' : 'false'); });
        layers.forEach(function (l) { l.classList.toggle('on', on && l.getAttribute('data-k') === k); });
      });
    });
  }
})();
/* news filters: the list reflows with a same-page view transition where supported */
(function () {
  var bs = document.querySelectorAll('.filters [data-f]'); if (!bs.length) return;
  var cards = document.querySelectorAll('.nlist .card');
  cards.forEach(function (c, i) { c.style.viewTransitionName = 'n' + i; });
  function apply(f) {
    bs.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-f') === f ? 'true' : 'false'); });
    cards.forEach(function (c) { c.hidden = !(f === 'all' || c.getAttribute('data-cat') === f); });
  }
  bs.forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.getAttribute('data-f');
      if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(function () { apply(f); });
      else apply(f);
    });
  });
})();
