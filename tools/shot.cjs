// dev helper: screenshot the site at chosen places and viewport sizes
// node tools/shot.cjs URL OUTPREFIX sizes positions [webkit]
//   sizes: desk,full,phone     positions: "0,1500" (pixels) or "bolt:0.5,pattern:0.3" (room id : fraction of its scroll)
const pw = require('playwright');
(async () => {
  const [url, out, sizesArg = 'desk', posArg = '0', engine = 'chromium'] = process.argv.slice(2);
  const sizes = { desk: [1440, 900], full: [1920, 1080], phone: [390, 844] };
  const b = await pw[engine].launch();
  for (const w of sizesArg.split(',')) {
    const [W, H] = sizes[w];
    const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: w === 'phone' && engine === 'chromium', hasTouch: w === 'phone' });
    p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) console.log('console.error:', m.text()); });
    p.on('pageerror', e => console.log('pageerror:', e.message));
    await p.goto(url, { waitUntil: 'networkidle' });
    for (const pos of posArg.split(',')) {
      const y = await p.evaluate(pos => {
        if (!pos.includes(':')) return +pos < 0 ? document.body.scrollHeight : +pos;
        const [id, fr] = pos.split(':'); const el = document.getElementById(id);
        if (!el) return 0;
        const top = el.getBoundingClientRect().top + scrollY;
        return top + Math.max(0, el.offsetHeight - innerHeight) * +fr;
      }, pos);
      await p.evaluate(y => scrollTo(0, y), y);
      await p.waitForTimeout(1500);
      await p.screenshot({ path: `${out}-${w}-${pos.replace(':', '_')}.png` });
    }
    await p.close();
  }
  await b.close();
})();
