// QA pass: walks the whole page at several viewport sizes (Chromium and WebKit), and at each stop
// records every visible text panel's box and text colour, then screenshots the page twice: as seen,
// and with all text made transparent (so the pixels BEHIND each panel's text can be measured).
// tools/qa_check.py then computes WCAG contrast against those real pixels and checks text fit.
// Usage: node tools/qa.cjs URL OUTDIR [chromium|webkit] [sizes] [stepsPerSection]
const { chromium, webkit } = require('playwright');
const fs = require('fs');
(async () => {
  const [url, out, engine = 'chromium', sizesArg = 'full,desk,phone', stepsArg = '4'] = process.argv.slice(2);
  const sizes = { full: [1920, 1080], desk: [1440, 900], phone: [390, 844] };
  fs.mkdirSync(out, { recursive: true });
  const b = await (engine === 'webkit' ? webkit : chromium).launch();
  const report = [];
  for (const name of sizesArg.split(',')) {
    const [W, H] = sizes[name];
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: name === 'phone' && engine !== 'webkit', hasTouch: name === 'phone' });
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.addStyleTag({ content: '.qa-hide, .qa-hide *{color:transparent!important;text-shadow:none!important;-webkit-text-fill-color:transparent!important} .qa-hide svg{visibility:hidden!important} .scrollcue::after{animation:none!important}' });
    const stops = await p.evaluate((steps) => {
      const out = [];
      document.querySelectorAll('[data-room]').forEach(sec => {
        const top = sec.getBoundingClientRect().top + scrollY, span = Math.max(0, sec.offsetHeight - innerHeight);
        const n = span > 10 ? steps : 1;
        for (let i = 0; i < n; i++) out.push({ id: sec.id, y: Math.round(top + span * (n === 1 ? 0 : (i + 0.5) / n)) });
      });
      return out;
    }, +stepsArg);
    let k = 0;
    for (const s of stops) {
      await p.evaluate(y => scrollTo(0, y), s.y);
      await p.waitForTimeout(1300);
      const tag = `${engine}-${name}-${String(k++).padStart(3, '0')}-${s.id}`;
      const items = await p.evaluate(() => {
        const sel = '.label.is-on, .placard.is-on, .captions.is-on .captions__text, .bar, .scrub__head:not(.is-away), .card, .panel.is-on, .scrub__line.is-on, .threshold__inner > *, .rules.is-sheet, .your-answer:not([hidden]), .answer__closing, .colophon__inner > *, .guide, .choice';
        const res = [];
        const vis = el => { const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.5; };
        document.querySelectorAll(sel).forEach((el, i) => {
          if (!vis(el)) return;
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return;
          // text runs inside: their boxes and colours
          const runs = [];
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let n;
          while ((n = walker.nextNode())) {
            const t = n.textContent.trim(); if (!t) continue;
            const pe = n.parentElement; if (!vis(pe)) continue;
            const range = document.createRange(); range.selectNodeContents(n);
            for (const rr of range.getClientRects()) {
              if (rr.width < 1 || rr.bottom < 0 || rr.top > innerHeight) continue;
              const cs = getComputedStyle(pe);
              runs.push({ x: rr.left, y: rr.top, w: rr.width, h: rr.height, color: cs.color, size: parseFloat(cs.fontSize), weight: +cs.fontWeight || 400, text: t.slice(0, 40) });
            }
          }
          const overflow = el.scrollHeight > el.clientHeight + 2 && getComputedStyle(el).overflowY !== 'visible' && getComputedStyle(el).overflowY !== 'auto';
          const offscreen = r.left < -1 || r.right > innerWidth + 1 || (r.bottom > innerHeight + 1 && getComputedStyle(el).position === 'fixed');
          res.push({ cls: el.className.baseVal ?? el.className, box: [r.left, r.top, r.width, r.height], runs, overflow, offscreen });
        });
        // overlapping glass panels (two visible panels on top of each other)
        return res;
      });
      await p.screenshot({ path: `${out}/${tag}.png` });
      await p.evaluate(() => document.body.classList.add('qa-hide'));
      await p.waitForTimeout(80);
      await p.screenshot({ path: `${out}/${tag}.bg.png` });
      await p.evaluate(() => document.body.classList.remove('qa-hide'));
      report.push({ tag, engine, size: name, W, H, room: s.id, y: s.y, items });
    }
    // reduced motion: the page must still work
    if (name === 'desk') {
      const rm = await b.newContext({ viewport: { width: W, height: H }, reducedMotion: 'reduce' });
      const q = await rm.newPage(); const errs = [];
      q.on('pageerror', e => errs.push(e.message));
      await q.goto(url, { waitUntil: 'networkidle' });
      await q.evaluate(() => scrollTo(0, document.body.scrollHeight * 0.3)); await q.waitForTimeout(800);
      await q.screenshot({ path: `${out}/${engine}-reduced-motion.png` });
      report.push({ tag: `${engine}-reduced-motion`, engine, size: 'reduced', errors: errs, items: [] });
      await rm.close();
    }
    report.push({ tag: `${engine}-${name}-errors`, engine, size: name, errors, items: [] });
    await ctx.close();
  }
  fs.writeFileSync(`${out}/report-${engine}.json`, JSON.stringify(report));
  await b.close();
})();
