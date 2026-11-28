// Render the style-quiz sample slides (scripts/quiz/slides.mjs) to WebP with Playwright's Chromium.
//   node scripts/quiz/render.mjs            -> quiz/<key>-<a|b>.webp (1600 x 900) and quiz/<key>-<a|b>-sm.webp (480 x 270)
//   node scripts/quiz/render.mjs style      -> only the pairs named
// The WebP is encoded by Chromium itself (canvas.toDataURL), so no image library is needed.
// Then `npm run seed` puts them into the local bucket under shared/quiz/ (README: upload them for production).
import { chromium } from 'playwright';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PAIRS } from './slides.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../../quiz');
const MAX_BYTES = 150 * 1024;
mkdirSync(OUT, { recursive: true });
const only = new Set(process.argv.slice(2));
const tmp = mkdtempSync(join(tmpdir(), 'kruslide-quiz-'));

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  const enc = await browser.newPage();
  for (const pair of PAIRS) {
    if (only.size && !only.has(pair.key)) continue;
    for (const side of ['a', 'b']) {
      const file = join(tmp, `${pair.key}-${side}.html`);
      writeFileSync(file, pair[side]());
      await page.goto(pathToFileURL(file).href);
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });
      await page.waitForTimeout(150);
      const png = (await page.screenshot({ type: 'png' })).toString('base64');
      const { full, small, q } = await enc.evaluate(async ({ png, max }) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + png;
        await img.decode();
        const draw = (w, h, src) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, w, h); return c; };
        const big = draw(1600, 900, img);
        let q = 0.95, full;
        for (;;) { full = big.toDataURL('image/webp', q); if (full.length * 0.75 <= max || q <= 0.5) break; q -= 0.05; }
        const small = draw(480, 270, draw(960, 540, big)).toDataURL('image/webp', 0.82); // two steps: sharper than one
        return { full, small, q };
      }, { png, max: MAX_BYTES });
      const save = (name, dataUrl) => { const b = Buffer.from(dataUrl.split(',')[1], 'base64'); writeFileSync(join(OUT, name), b); return b.length; };
      const n1 = save(`${pair.key}-${side}.webp`, full);
      const n2 = save(`${pair.key}-${side}-sm.webp`, small);
      console.log(`${pair.key}-${side}: ${(n1 / 1024).toFixed(0)} KB (q ${q.toFixed(2)}), thumb ${(n2 / 1024).toFixed(0)} KB`);
    }
  }
} finally {
  await browser.close();
  rmSync(tmp, { recursive: true, force: true });
}
