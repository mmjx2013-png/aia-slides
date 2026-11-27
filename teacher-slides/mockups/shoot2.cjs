// Still PNG of every slide at its last step (animations jump to the end), plus a layout check.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const url = 'file://' + path.join(__dirname, 'index.html');
  await p.goto(url + '?still');
  await p.evaluate(() => document.fonts.ready);
  const n = await p.evaluate(() => __deck.state().n);
  const problems = [];
  for (let k = 0; k < n; k++) {
    await p.evaluate(k => { __deck.jump(k, 9); }, k);
    await p.waitForTimeout(700);
    const st = await p.evaluate(() => { const s = document.querySelectorAll('.slide')[__deck.state().i]; return s.dataset.style + (__deck.state().i % 3 + 1); });
    await p.locator('#stage').screenshot({ path: path.join(__dirname, `v2-${st}.png`) });
    const bad = await p.evaluate(() => {
      const s = document.querySelector('.slide.on'), r = s.getBoundingClientRect(), out = [];
      s.querySelectorAll('h1,h2,p,.q,.c,.badge,.lbl,.t,.day,.tt,.st,.idea,.ans,.tip,.story,li,td,th,.kick,.kicker,.k,.v,.rule,.line,.big').forEach(e => {
        const q = e.getBoundingClientRect();
        if (!q.width) return;
        if (q.right > r.right + 2 || q.bottom > r.bottom + 2 || q.left < r.left - 2) out.push((e.className.baseVal ?? e.className) + ' outside');
        if (e.scrollWidth > e.clientWidth + 3 && getComputedStyle(e).overflow !== 'visible') out.push((e.className.baseVal ?? e.className) + ' clipped');
      });
      return out;
    });
    if (bad.length) problems.push(st + ': ' + [...new Set(bad)].join(', '));
  }
  console.log(problems.length ? problems.join('\n') : 'no layout problems');
  await b.close();
})();
