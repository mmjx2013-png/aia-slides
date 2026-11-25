/* Satit PBRU concept site: language toggle, mobile menu, counting numbers, "how we learn" reveal. No dependencies. */
(function () {
  var doc = document.documentElement, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* language: TH / EN, remembered */
  document.querySelectorAll('.lang [data-l]').forEach(function (b) {
    b.addEventListener('click', function () {
      doc.lang = b.getAttribute('data-l');
      try { localStorage.setItem('lang', doc.lang); } catch (e) {}
    });
  });

  /* mobile menu */
  var mnav = document.getElementById('mnav'), open = document.querySelector('.hdr .menu-btn');
  function setMenu(on) { mnav.classList.toggle('open', on); open.setAttribute('aria-expanded', on ? 'true' : 'false'); if (on) mnav.querySelector('a').focus(); else open.focus(); }
  open.addEventListener('click', function () { setMenu(true); });
  mnav.querySelector('.close').addEventListener('click', function () { setMenu(false); });
  mnav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mnav.classList.contains('open')) setMenu(false); });

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
