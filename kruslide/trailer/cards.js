#!/usr/bin/env node
// Render every title card in out/timeline.json to a transparent PNG (3840 x 1606) in out/work/cards/.
// usage: NODE_PATH=<global node_modules> node cards.js   (Playwright + its Chromium)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const HERE = __dirname;
const tl = JSON.parse(fs.readFileSync(path.join(HERE, 'out', 'timeline.json'), 'utf8'));
const outDir = path.join(HERE, 'out', 'work', 'cards');
fs.mkdirSync(outDir, { recursive: true });
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const isLatin = s => !/[฀-๿]/.test(s);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: tl.W, height: tl.PH }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(HERE, 'cards.html'));
  for (const c of tl.cards) {
    let html = '';
    if (c.big) html += `<div class="big">${esc(c.big)}</div><div class="rule"></div>`;
    if (c.small) html += `<div class="small${isLatin(c.small) ? ' latin' : ''}">${esc(c.small)}</div>`;
    if (c.style === 'end') html += `<div class="copy">© KRUSLIDE</div>`;
    const dx = ((c.x ?? 0.5) - 0.5) * tl.W;
    await page.evaluate(([h, s, dx]) => { const el = document.getElementById('card'); el.className = s; el.innerHTML = h; el.style.transform = `translateX(${dx}px)`; }, [html, c.style, dx]);
    await page.evaluate(() => document.fonts.ready);
    const ok = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + f.weight));
    const file = path.join(outDir, c.id + '.png');
    await page.screenshot({ path: file, omitBackground: true });
    console.log('card', c.id, 'fonts:', ok.join(' '));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
