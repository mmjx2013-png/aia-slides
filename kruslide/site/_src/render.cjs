/* Renders the _src pages to PNG / PDF with Playwright (fonts are self-hosted, so Thai shapes correctly).
   Usage (serve the repo or site/ over http first, or use file://):
     node render.cjs png <url> <out.png> [width height]
     node render.cjs pdf <url> <out.pdf>                       (A4, backgrounds on) */
const { chromium } = require('playwright');
(async () => {
  const [mode, url, out, w, h] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +(w || 1920), height: +(h || 1080) }, deviceScaleFactor: 1 });
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
  p.on('requestfailed', r => errs.push('failed: ' + r.url()));
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  if (mode === 'pdf') await p.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
  else await p.screenshot({ path: out });
  if (errs.length) console.log('ERRORS', errs);
  console.log('wrote', out);
  await b.close();
})();
