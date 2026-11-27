// Screenshot each 1920x1080 slide of mockups.html, then stack each style into one PNG (for LINE).
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.join(__dirname, 'mockups.html'));
  await p.evaluate(() => document.fonts.ready);
  const slides = await p.$$('section.slide');
  let i = 0;
  for (const s of slides) {
    const style = 'ABC'[Math.floor(i / 3)], n = (i % 3) + 1;
    await s.screenshot({ path: path.join(__dirname, `slide-${style}${n}.png`) });
    i++;
  }
  // overlap check: any text box that leaves its slide or overlaps a sibling text box
  const issues = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('section.slide').forEach((sl, k) => {
      const r = sl.getBoundingClientRect();
      sl.querySelectorAll('h1,h2,.q,.verdict,.rule,.choices li,.answer,.chips li,.kicker,.key,.day').forEach(e => {
        const q = e.getBoundingClientRect();
        if (q.right > r.right + 1 || q.bottom > r.bottom + 1) out.push(`slide ${k}: ${e.className || e.tagName} outside`);
        if (e.scrollWidth > e.clientWidth + 2) out.push(`slide ${k}: ${e.className || e.tagName} overflows`);
      });
    });
    return out;
  });
  console.log(issues.length ? issues.join('\n') : 'no layout problems');
  await b.close();
})();
