#!/usr/bin/env node
/* Type-1 deck QA: screenshot every beat of every slide, and fail on the bugs the owner has seen before.
   node qa.cjs <deck folder | index.html | http URL> [--out DIR] [--wire] [--sizes 1920x1080,1440x900] [--browser chromium|webkit]
   Checks, per beat: text boxes that overlap each other; text outside the 1920x1080 stage; text cut off by its label/panel;
   and, for every .compare slider on the slide, that a drag from 10% to 90% and back really moves it across the whole width.
   Writes PNGs, contact sheets (ffmpeg) and report.json to --out (default ./qa-out). Exit code 1 if any problem is found.
   The deck must expose window.__deck = {jump, next, state} (the template does). */
const pw = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const target = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--out' && args[args.indexOf(a) - 1] !== '--sizes' && args[args.indexOf(a) - 1] !== '--browser');
if (!target) { console.error('usage: node qa.cjs <deck folder | index.html | URL> [--out DIR] [--wire] [--sizes 1920x1080,1440x900] [--browser webkit]'); process.exit(2); }
const OUT = path.resolve(opt('--out', 'qa-out')), WIRE = args.includes('--wire');
const SIZES = opt('--sizes', '1920x1080,1440x900').split(',').map(s => s.split('x').map(Number));
const BROWSER = opt('--browser', 'chromium');

function serve(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt' };
  return new Promise(res => {
    const s = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(dir, p); if (!f.startsWith(dir) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
    }).listen(0, '127.0.0.1', () => res(s));
  });
}

// runs in the page: every visible, unobstructed text box in stage coordinates, plus label/panel clipping
function inspect() {
  const stage = document.getElementById('stage'), sr = stage.getBoundingClientRect(), k = sr.width / 1920;
  const box = r => ({ x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k });
  const pe = document.createElement('style'); pe.textContent = '#stage *{pointer-events:auto!important}#stage svg,#stage svg *,.grain,.veil{pointer-events:none!important}';
  document.head.appendChild(pe);
  const faceAway = f => { const fl = f.closest('.flip'); if (!fl) return false; const m = getComputedStyle(fl).transform; let c = 1;
    if (m && m !== 'none') { const v = m.match(/-?[\d.e]+/g).map(Number); c = v[0]; } return f.classList.contains('back') ? c > 0 : c < 0; };
  const shown = el => { for (let e = el; e && e !== stage; e = e.parentElement) { const c = getComputedStyle(e);
    if (c.visibility === 'hidden' || c.display === 'none' || +c.opacity < 0.5) return false; if (e.classList.contains('face') && faceAway(e)) return false; } return true; };
  // covered = an OPAQUE layer (panel, label face, sheet, picture) sits above the text's centre; transparent wrappers are ignored
  const opaque = e => { if (/^(IMG|VIDEO|CANVAS)$/.test(e.tagName)) return true; const c = getComputedStyle(e);
    const m = c.backgroundColor.match(/[\d.]+/g); const a = m ? (m.length > 3 ? +m[3] : 1) : 0; return a > 0.85 || (c.backgroundImage !== 'none' && !e.closest('.grain,.veil')); };
  const onTop = (el, r) => { const x = (r.left + r.right) / 2, y = (r.top + r.bottom) / 2;
    for (const h of document.elementsFromPoint(x, y)) { if (h === el || el.contains(h) || h.contains(el)) return true; if (opaque(h)) return false; }
    return true; };
  const texts = [], issues = [];
  // each element's OWN text, measured line by line and shrunk to the ink band (line boxes of big type overlap their neighbours by design)
  stage.querySelectorAll('*').forEach(el => {
    if (el.closest('.sr,#sub,svg')) return;
    const nodes = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
    if (!nodes.length || !shown(el)) return;
    const fs = parseFloat(getComputedStyle(el).fontSize), lines = [];
    nodes.forEach(n => { const range = document.createRange(); range.selectNodeContents(n);
      [...range.getClientRects()].forEach(q => { if (q.width < 2 || q.height < 2) return; const L = box(q), band = Math.min(L.h, 0.78 * fs);
        lines.push({ x: L.x, y: L.y + (L.h - band) / 2, w: L.w, h: band, q }); }); });
    if (!lines.length) return;
    const t = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 60);
    const x0 = Math.min(...lines.map(l => l.x)), y0 = Math.min(...lines.map(l => l.y)), x1 = Math.max(...lines.map(l => l.x + l.w)), y1 = Math.max(...lines.map(l => l.y + l.h));
    if (x0 > 1920 || y0 > 1080 || x1 < 0 || y1 < 0) return;                                  // parked off-stage on purpose
    if (x0 < -2 || y0 < -2 || x1 > 1922 || y1 > 1082) { issues.push(`text partly outside the stage: "${t}"`); return; }
    const vis = lines.filter(l => onTop(el, l.q)); if (!vis.length) return;                // covered by a sheet, panel or label
    texts.push({ el, lines: vis, t });
  });
  for (let a = 0; a < texts.length; a++) for (let b = a + 1; b < texts.length; b++) {
    const A = texts[a], B = texts[b]; if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
    const hit = A.lines.some(p => B.lines.some(q => { const ix = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x), iy = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
      return ix > 3 && iy > 3 && ix * iy > 0.15 * Math.min(p.w * p.h, q.w * q.h); }));
    if (hit) issues.push(`text overlaps: "${A.t}" x "${B.t}"`);
  }
  stage.querySelectorAll('.face').forEach(f => {
    if (!shown(f)) return; const fr = f.getBoundingClientRect();
    texts.forEach(T => { if (!f.contains(T.el)) return;
      if (T.lines.some(l => l.q.right > fr.right + 2 || l.q.bottom > fr.bottom + 2 || l.q.left < fr.left - 2 || l.q.top < fr.top - 2)) issues.push(`text cut off by its label/panel: "${T.t}"`); });
  });
  pe.remove();
  return issues;
}

(async () => {
  let url = target, server = null;
  if (!/^https?:/.test(target)) {
    const p = path.resolve(target), dir = fs.statSync(p).isDirectory() ? p : path.dirname(p), file = fs.statSync(p).isDirectory() ? 'index.html' : path.basename(p);
    server = await serve(dir); url = `http://127.0.0.1:${server.address().port}/${file}`;
  }
  if (WIRE) url += (url.includes('?') ? '&' : '?') + 'wire';
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await pw[BROWSER].launch();
  const report = { url, browser: BROWSER, problems: [], shots: 0 };
  for (const [W, H] of SIZES) {
    const dir = path.join(OUT, `${W}x${H}`); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__deck && document.body.classList.contains('ready'), null, { timeout: 15000 });
    await page.addStyleTag({ content: '#ctl{display:none!important}' });   // the auto-hiding control bar is not part of the slide
    await page.waitForTimeout(800);
    const n = await page.evaluate(() => window.__deck.state().n || document.querySelectorAll('.slide').length);
    for (let s = 0; s < n; s++) {
      await page.evaluate(k => window.__deck.jump(k), s); await page.waitForTimeout(1900);
      const st = await page.evaluate(() => window.__deck.state());
      let last = st.step;
      for (let b = 0; b <= 12; b++) {                       // step beat by beat until the deck moves to the next slide
        if (b > 0) {
          await page.evaluate(() => window.__deck.next()); await page.waitForTimeout(1700);
          const now = await page.evaluate(() => window.__deck.state()); if (now.slide !== s + 1 || now.step === last) break; last = now.step;
        }
        const name = `${String(s + 1).padStart(2, '0')}-${st.id || 'slide'}-b${b}`;
        await page.screenshot({ path: path.join(dir, name + '.png') }); report.shots++;
        for (const p of await page.evaluate(inspect)) report.problems.push(`${W}x${H} ${name}: ${p}`);
        // sliders: a drag from 10% to 90% and back must move the divider across the whole width
        const cmps = await page.$$('.slide.on .compare');
        for (const c of cmps) {
          const r = await c.boundingBox(); if (!r) continue; const y = r.y + r.height * 0.3;
          const free = await c.evaluate((el, p) => { const h = document.elementFromPoint(p.x, p.y); return !!h && (h === el || el.contains(h)); }, { x: r.x + r.width / 2, y });
          if (!free) continue;
          await page.mouse.move(r.x + r.width * 0.1, y); await page.mouse.down(); await page.mouse.move(r.x + r.width * 0.9, y, { steps: 8 }); await page.mouse.up();
          const hi = +(await c.getAttribute('data-pos'));
          await page.mouse.move(r.x + r.width * 0.95, y); await page.mouse.down(); await page.mouse.move(r.x + r.width * 0.04, y, { steps: 8 }); await page.mouse.up();
          const lo = +(await c.getAttribute('data-pos'));
          const after = await page.evaluate(() => window.__deck.state());
          if (!(hi >= 85 && lo <= 8)) report.problems.push(`${W}x${H} ${name}: slider does not drag across its width (got ${hi}% and ${lo}%)`);
          if (after.slide !== s + 1 || after.step !== b) report.problems.push(`${W}x${H} ${name}: dragging the slider also changed the slide`);
          await page.evaluate(() => document.querySelectorAll('.compare').forEach(c => { c.style.setProperty('--pos', '50%'); c.setAttribute('data-pos', '50'); }));
        }
      }
    }
    errs.forEach(e => report.problems.push(`${W}x${H} page error: ${e}`));
    await page.close();
    try { execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-pattern_type', 'glob', '-i', path.join(dir, '*.png'), '-vf', 'scale=480:-1,tile=4x4:padding=6:color=0x222222', path.join(OUT, `sheet-${W}x${H}-%02d.jpg`)]); } catch (e) { /* no ffmpeg: PNGs only */ }
  }
  await browser.close(); if (server) server.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  console.log(`${report.shots} screenshots in ${OUT}; contact sheets: ${OUT}/sheet-*.jpg`);
  if (report.problems.length) { console.log(`${report.problems.length} PROBLEMS:`); report.problems.forEach(p => console.log('  - ' + p)); process.exit(1); }
  console.log('no problems found');
})();
