// dev helper: screenshot the site at several scroll positions and viewport sizes
const { chromium } = require('playwright');
(async () => {
const [url, out, ...rest] = process.argv.slice(2);
const sizes = { desk: [1440, 900], full: [1920, 1080], phone: [390, 844] };
const which = (rest[0] || 'desk').split(',');
const ys = (rest[1] || '0').split(',').map(Number);
const b = await chromium.launch();
for (const w of which) {
  const [W, H] = sizes[w];
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: w === 'phone', hasTouch: w === 'phone' });
  p.on('console', m => { if (m.type() === 'error') console.log('console.error:', m.text()); });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto(url, { waitUntil: 'networkidle' });
  for (const y of ys) {
    await p.evaluate(y => scrollTo(0, y < 0 ? document.body.scrollHeight : y), y);
    await p.waitForTimeout(1400);
    await p.screenshot({ path: `${out}-${w}-${y}.png` });
  }
  await p.close();
}
await b.close();
})();
