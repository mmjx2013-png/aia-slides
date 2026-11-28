// QA: screenshot every scene at its final state + check for errors -> build/qa/sNN.png and a contact sheet
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const out = path.join(__dirname, 'build', 'qa'); fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
  await p.goto('file://' + path.join(__dirname, 'build', 'film.html') + '?shot=0'); await p.waitForFunction(() => window.FILM && window.FILM.ready);
  const n = await p.evaluate(() => window.FILM.scenes);
  for (let i = 0; i < n; i++) { if (only && !only.includes(i)) continue;
    await p.goto('file://' + path.join(__dirname, 'build', 'film.html') + '?shot=' + i); await p.waitForFunction(() => window.FILM && window.FILM.ready); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(out, 's' + String(i).padStart(2, '0') + '.png') }); }
  console.log(errs.length ? 'ERRORS ' + [...new Set(errs)].join(' | ') : 'no errors'); await b.close();
})();
