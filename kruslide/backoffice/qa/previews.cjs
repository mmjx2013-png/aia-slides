// Capture the preview pictures the back office shows for things it cannot (or need not) open live:
// the sales site (full-page, desktop + phone), the showcase deck's title, and styles D/E/F while they have no shots.
//   python3 -m http.server 8771 -d kruslide &   then   NODE_PATH=/opt/node-tools/node_modules node kruslide/backoffice/qa/previews.cjs <outdir>
// Writes PNGs to <outdir>; kruslide/backoffice/qa/previews.py turns them into data/img/*.webp.
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const BASE = 'http://127.0.0.1:8771/';
(async () => {
  const b = await chromium.launch();
  const shoot = async (path, file, vw, vh, opt = {}) => {
    const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: opt.dpr || 1, reducedMotion: opt.rm ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage();
    await p.goto(BASE + path, { waitUntil: 'load' });
    await p.waitForTimeout(opt.wait || 2500);
    if (opt.scroll) { // walk down so scroll-reveal sections render, then back up
      const h = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < h; y += 500) { await p.evaluate(v => window.scrollTo(0, v), y); await p.waitForTimeout(120); }
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(800);
    }
    await p.screenshot({ path: `${out}/${file}`, fullPage: !!opt.full });
    console.log('shot', file);
    await ctx.close();
  };
  await shoot('deck/index.html#1', 'deck.png', 1600, 900, { wait: 4000 });
  await shoot('site/index.html', 'site-hero.png', 1440, 900, { wait: 2500 });
  await shoot('site/index.html', 'site-desktop.png', 1440, 900, { full: true, scroll: true, rm: true });
  await shoot('site/index.html', 'site-mobile.png', 390, 844, { full: true, scroll: true, rm: true, dpr: 2 });
  for (const [dir, name] of [['glass', 'style-D'], ['photo', 'style-E'], ['mechanics', 'style-F']])
    await shoot(`samples/styles/${dir}/index.html`, `${name}.png`, 1600, 900, { wait: 3500 });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
