// QA for the deck: still screenshots of every slide (first and last beat) + layout, font-size and console checks.
// node qa.cjs <file.html> [outdir]   -> outdir/sNN-bK.png (960x540) and a printed problem list. Exit code 1 if problems.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const file = path.resolve(process.argv[2] || 'index.html');
const out = path.resolve(process.argv[3] || path.join(path.dirname(file), 'qa-out'));
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (f.endsWith('.png')) fs.unlinkSync(path.join(out, f));
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', e => errs.push('page error: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  p.on('requestfailed', r => errs.push('failed request: ' + r.url()));
  await p.goto('file://' + file + '?still');
  await p.evaluate(() => document.fonts.ready);
  const n = await p.evaluate(() => __deck.state().n);
  const problems = [];
  for (let k = 0; k < n; k++) {
    const steps = await p.evaluate(k => { __deck.jump(k, 0); return __deck.state().steps; }, k);
    const beats = steps ? [0, steps] : [0];
    for (const bt of beats) {
      await p.evaluate(([k, bt]) => __deck.jump(k, bt), [k, bt]);
      await p.waitForTimeout(260);
      const tag = 's' + String(k + 1).padStart(2, '0') + '-b' + bt;
      await p.screenshot({ path: path.join(out, tag + '.png') });
      const bad = await p.evaluate(() => {
        const s = document.querySelector('.slide.on'), R = s.getBoundingClientRect(), sc = R.width / 1920, out = [];
        const vis = e => e.checkVisibility({ opacityProperty: true, visibilityProperty: true });
        const name = e => (e.id ? '#' + e.id : '') + '.' + String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).trim().split(/\s+/).slice(0, 2).join('.') + ' "' + (e.textContent || '').trim().slice(0, 28) + '"';
        const leaves = [];
        s.querySelectorAll('*').forEach(e => {
          if (e.closest('[data-qa-ok],.notes')) return;
          const own = [...e.childNodes].some(c => c.nodeType === 3 && c.textContent.trim());
          if (!own || !vis(e)) return;
          const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
          leaves.push([e, r]);
          if (r.right > R.right + 2 || r.bottom > R.bottom + 2 || r.left < R.left - 2 || r.top < R.top - 2) out.push('outside slide: ' + name(e));
          const fsz = parseFloat(getComputedStyle(e).fontSize);
          const inSvg = !!e.closest('svg');
          const caps = getComputedStyle(e).textTransform === 'uppercase' && parseInt(getComputedStyle(e).fontWeight) >= 600;
          if (fsz < 18 || (!inSvg && fsz < (caps ? 22 : 24) && !e.closest('[data-small-ok]'))) out.push('text too small (' + fsz + 'px): ' + name(e));
        });
        s.querySelectorAll('*').forEach(e => {
          if (e.closest('svg,[data-qa-ok]') || !vis(e)) return;
          const cs = getComputedStyle(e);
          if (['hidden', 'clip', 'auto', 'scroll'].includes(cs.overflow) && (e.scrollWidth > e.clientWidth + 3 || e.scrollHeight > e.clientHeight + 3) && e.textContent.trim() && !e.matches('.slide'))
            out.push('content clipped: ' + name(e));
        });
        for (let a = 0; a < leaves.length; a++) for (let c = a + 1; c < leaves.length; c++) {
          const [ea, ra] = leaves[a], [ec, rc] = leaves[c];
          if (ea.contains(ec) || ec.contains(ea)) continue;
          const w = Math.min(ra.right, rc.right) - Math.max(ra.left, rc.left), h = Math.min(ra.bottom, rc.bottom) - Math.max(ra.top, rc.top);
          if (w > 3 * sc && h > 3 * sc) out.push('text overlap: ' + name(ea) + ' x ' + name(ec));
        }
        s.querySelectorAll('[class^="w-"],[class*=" w-"]').forEach(w => { if (vis(w) && !w.children.length) out.push('widget not rendered: ' + name(w)); });
        return [...new Set(out)];
      });
      if (bad.length) problems.push(tag + '\n   ' + bad.join('\n   '));
    }
  }
  if (errs.length) problems.push('errors\n   ' + [...new Set(errs)].join('\n   '));
  console.log(problems.length ? 'PROBLEMS\n' + problems.join('\n') : 'no problems found');
  console.log('screens in ' + out);
  await b.close();
  process.exit(problems.length ? 1 : 0);
})();
