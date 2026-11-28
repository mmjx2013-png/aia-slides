// QA for the back office. Serve kruslide/backoffice/ on :8772, then:
//   NODE_PATH=/opt/node-tools/node_modules node kruslide/backoffice/qa/qa.cjs kruslide/backoffice/qa/shots
// Screenshots every section at 1440x900 and 390x844, opens every sample in the viewer (focus, arrow keys, Esc),
// runs the order builder (add/remove, copy + fallback, drafts survive a reload), repeats the key checks inside a
// sandboxed iframe and with localStorage throwing, and fails on console errors, 4xx/5xx and external requests.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || 'shots';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8772/';
const APP = BASE + 'dist/index.html';
const SECS = ['overview', 'samples', 'styles', 'mechanics', 'products', 'order', 'prices'];
const problems = [], external = new Set(), notes = [];
const ok = (cond, msg) => { if (!cond) problems.push(msg); return cond; };

function watch(page, label) {
  page.on('console', m => { if (m.type() === 'error') problems.push(`[${label}] console error: ${m.text()}`); });
  page.on('pageerror', e => problems.push(`[${label}] page error: ${e.message}`));
  page.on('request', r => { const u = r.url(); if (!/^(data|blob|about):/.test(u) && !u.startsWith(BASE)) external.add(u); });
  page.on('response', r => { if (r.status() >= 400) problems.push(`[${label}] HTTP ${r.status()} ${r.url()}`); });
  page.on('requestfailed', r => { const f = r.failure(); if (f && !/ERR_ABORTED/.test(f.errorText)) problems.push(`[${label}] failed ${r.url()} ${f.errorText}`); });
}
async function overflow(page, label) {
  const r = await page.evaluate(() => {
    const W = document.documentElement.clientWidth, out = [];
    if (document.documentElement.scrollWidth > W + 1) out.push('page scrollWidth ' + document.documentElement.scrollWidth + ' > ' + W);
    for (const el of document.querySelectorAll('main *, .tray *')) {
      if (el.closest('.tabs,.chips,.chipnav,.tbl,dialog,.seg') ) continue;
      const b = el.getBoundingClientRect();
      if (b.width && b.right > W + 1 && getComputedStyle(el).position !== 'fixed') out.push((el.className || el.tagName) + ' right=' + Math.round(b.right));
    }
    return out.slice(0, 5);
  });
  r.forEach(x => problems.push(`[${label}] overflow: ${x}`));
}
async function deckState(frame) {
  return frame.evaluate(() => window.__deck ? JSON.stringify(window.__deck.state()) : (document.querySelector('.slide.on') || {}).id + '|' + location.hash + '|' + (document.querySelector('#stage') || {}).dataset?.step);
}
async function viewerCycle(page, label, opener, root) {
  root = root || page;
  await opener.click();
  const dlg = root.locator('#viewer');
  await dlg.waitFor({ state: 'visible', timeout: 5000 });
  const ifr = root.locator('#vbody iframe');
  await ifr.waitFor({ timeout: 5000 });
  const handle = await ifr.elementHandle();
  const frame = await handle.contentFrame();
  await frame.waitForLoadState('load');
  await page.waitForTimeout(900);
  const focused = await frame.evaluate(() => document.hasFocus());
  ok(focused, `[${label}] iframe does not have focus after opening`);
  const s0 = await deckState(frame);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  const s1 = await deckState(frame);
  ok(s0 !== s1, `[${label}] ArrowRight did not change the slide (${s0})`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const open = await root.locator('#viewer').evaluate(d => d.open);
  ok(!open, `[${label}] Esc did not close the viewer`);
  if (open) await root.locator('[data-act="vclose"]').click();
  return { focused, moved: s0 !== s1, closed: !open };
}

(async () => {
  const b = await chromium.launch();
  // ---------- 1. screenshots of every section, two sizes ----------
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage(); watch(page, `${w}`);
    await page.goto(APP + '#overview'); await page.waitForTimeout(800);
    for (const s of SECS) {
      await page.evaluate(x => { location.hash = x; }, s); await page.waitForTimeout(700);
      await overflow(page, `${w} ${s}`);
      await page.screenshot({ path: `${OUT}/${w}-${s}.jpg`, type: 'jpeg', quality: 72, fullPage: true });
      await page.screenshot({ path: `${OUT}/${w}-${s}-fold.jpg`, type: 'jpeg', quality: 72 });
    }
    // every products tab and the sub-tabs of styles/mechanics
    await page.evaluate(() => { location.hash = 'products'; }); await page.waitForTimeout(400);
    const tabs = await page.$$eval('[data-act="tab"][data-sec="products"]', els => els.map(e => e.dataset.v));
    for (const tb of tabs) {
      await page.click(`[data-act="tab"][data-sec="products"][data-v="${tb}"]`); await page.waitForTimeout(500);
      await overflow(page, `${w} products/${tb}`);
      await page.screenshot({ path: `${OUT}/${w}-products-${tb}.jpg`, type: 'jpeg', quality: 72, fullPage: true });
    }
    await page.click('[data-act="tab"][data-sec="products"][data-v="video"]');
    await ctx.close();
  }

  // ---------- 2. every sample (and the extras) in the viewer ----------
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage(); watch(page, 'viewer');
    await page.goto(APP + '#samples'); await page.waitForTimeout(600);
    const codes = await page.$$eval('#s-res .thumb[data-code]', els => els.map(e => e.dataset.code));
    const res = {};
    for (const c of codes) res[c] = await viewerCycle(page, `viewer ${c}`, page.locator(`#s-res .thumb[data-code="${c}"]`));
    notes.push(`viewer: ${Object.values(res).filter(r => r.focused && r.moved && r.closed).length}/${codes.length} samples open, take arrow keys and close with Esc`);
    // one sample screenshot inside the viewer
    await page.click(`#s-res .thumb[data-code="${codes[0]}"]`); await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/1440-viewer.jpg`, type: 'jpeg', quality: 72 });
    await page.click('[data-act="vclose"]');
    // extras: Unit 4 at a slide (mechanics chip) and the showcase deck (products)
    await page.evaluate(() => { location.hash = 'mechanics'; }); await page.waitForTimeout(500);
    const r4 = await viewerCycle(page, 'viewer unit4#41', page.locator('[data-card="M-05"] .lk').first());
    const deckOpen = async () => { await page.evaluate(() => { location.hash = 'products'; }); await page.waitForTimeout(300); await page.click('[data-act="tab"][data-sec="products"][data-v="deck"]'); await page.waitForTimeout(300); };
    await deckOpen();
    const rd = await viewerCycle(page, 'viewer deck', page.locator('[data-card="P-03"] .thumb'));
    notes.push(`extras: unit4 ${JSON.stringify(r4)}, deck ${JSON.stringify(rd)}`);
    // an image in the viewer (platform screenshot)
    await page.click('[data-act="tab"][data-sec="products"][data-v="platform"]'); await page.waitForTimeout(300);
    await page.click('.gal figure button >> nth=0'); await page.waitForTimeout(500);
    ok(await page.locator('#viewer').evaluate(d => d.open), 'image viewer did not open');
    await page.screenshot({ path: `${OUT}/1440-viewer-image.jpg`, type: 'jpeg', quality: 72 });
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    ok(!(await page.locator('#viewer').evaluate(d => d.open)), 'image viewer did not close with Esc');
    // palette
    await page.keyboard.press('/'); await page.waitForTimeout(200);
    ok(await page.locator('#palette').evaluate(d => d.open), 'palette did not open with /');
    await page.keyboard.type('m-05'); await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/1440-palette.jpg`, type: 'jpeg', quality: 72 });
    await page.keyboard.press('Shift+Enter'); await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('ksbo:order')).items);
    ok(st.includes('M-05'), 'Shift+Enter in the palette did not add M-05');
    await ctx.close();
  }

  // ---------- 3. order builder: add/remove, copy, drafts survive reload ----------
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE.slice(0, -1) });
    const page = await ctx.newPage(); watch(page, `order ${w}`);
    await page.goto(APP + '#styles'); await page.waitForTimeout(500);
    await page.click('[data-card="ST-01"] [data-act="add"]');
    await page.click('[data-card="ST-02"] [data-act="add"]');
    await page.evaluate(() => { location.hash = 'mechanics'; }); await page.waitForTimeout(400);
    await page.click('[data-card="M-05"] [data-act="add"]');
    await page.click('[data-card="M-11"] [data-act="add"]');
    await page.evaluate(() => { location.hash = 'samples'; }); await page.waitForTimeout(400);
    await page.click('#s-res [data-act="add"] >> nth=0');
    ok(await page.locator('#tray .tray-hd .n').innerText() === '5', `[order ${w}] tray count is not 5`);
    await page.click('#tray .tray-hd'); await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/${w}-tray.jpg`, type: 'jpeg', quality: 72 });
    await page.click('#tray [data-act="rm"][data-code="ST-02"]');
    ok(await page.locator('#tray .tray-hd .n').innerText() === '4', `[order ${w}] remove from tray failed`);
    await page.evaluate(() => { location.hash = 'order'; }); await page.waitForTimeout(400);
    await page.fill('#o-book', 'คณิตศาสตร์ ม.1 เล่ม 1');
    await page.fill('#o-slides', '40');
    await page.fill('#o-quick', 'p1 st-8 zz-9'); await page.press('#o-quick', 'Enter'); await page.waitForTimeout(200);
    const msg = await page.locator('#o-msg').innerText();
    ok(/P-01/.test(msg) && /ZZ-9|zz-9/i.test(msg), `[order ${w}] quick add message wrong: ${msg}`);
    await page.click('[data-act="copy-brief"]'); await page.waitForTimeout(400);
    let clip = '';
    try { clip = await page.evaluate(() => navigator.clipboard.readText()); } catch (e) { clip = ''; }
    ok(clip.includes('ST-01') && clip.includes('M-05') && clip.includes('P-01') && clip.includes('ราคาประเมิน'), `[order ${w}] clipboard text missing items`);
    ok(/120–200/.test(clip), `[order ${w}] estimate for 40 slides is not 120–200`);
    if (w === 1440) fs.writeFileSync(`${OUT}/brief-example.txt`, clip);
    await page.click('[data-act="save-draft"]'); await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/${w}-order-filled.jpg`, type: 'jpeg', quality: 72, fullPage: true });
    await page.reload(); await page.waitForTimeout(600);
    ok(await page.locator('#o-book').inputValue() === 'คณิตศาสตร์ ม.1 เล่ม 1', `[order ${w}] book not restored after reload`);
    ok((await page.locator('#o-picked .pk').count()) === 6, `[order ${w}] items not restored after reload`);
    ok((await page.locator('#o-drafts .row').count()) === 1, `[order ${w}] draft not listed after reload`);
    await page.click('[data-act="new-order"]'); await page.waitForTimeout(200);
    ok((await page.locator('#o-picked .pk').count()) === 0, `[order ${w}] new order not empty`);
    await page.click('#o-drafts [data-act="load-draft"]'); await page.waitForTimeout(200);
    ok((await page.locator('#o-picked .pk').count()) === 6, `[order ${w}] loading the draft failed`);
    for (const job of ['video', 'deck', 'web', 'book', 'custom']) {
      await page.click(`[data-act="oset"][data-k="type"][data-v="${job}"]`); await page.waitForTimeout(150);
      await overflow(page, `order ${w} ${job}`);
    }
    await page.click('[data-act="oset"][data-k="type"][data-v="video"]');
    await page.screenshot({ path: `${OUT}/${w}-order-video.jpg`, type: 'jpeg', quality: 72, fullPage: true });
    await ctx.close();
  }

  // ---------- 4. inside a sandboxed iframe (allow-scripts allow-same-origin) ----------
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage(); watch(page, 'sandbox');
    await page.goto(BASE + 'qa/frame.html'); await page.waitForTimeout(1200);
    const fr = page.frame({ url: /dist\/index\.html/ });
    ok(!!fr, 'sandbox: app frame not found');
    await fr.evaluate(() => { location.hash = 'samples'; }); await page.waitForTimeout(600);
    const r = await viewerCycle(page, 'sandbox viewer', fr.locator('#s-res .thumb[data-code] >> nth=1'), fr);
    notes.push(`sandbox viewer: ${JSON.stringify(r)}`);
    await fr.click('#s-res [data-act="add"] >> nth=2');
    await fr.evaluate(() => { location.hash = 'order'; }); await page.waitForTimeout(500);
    await fr.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('blocked by test')); });
    await fr.click('[data-act="copy-brief"]'); await page.waitForTimeout(400);
    const m = await fr.locator('#o-msg').innerText();
    const sel = await fr.evaluate(() => { const t = document.getElementById('brief'); return document.activeElement === t && t.selectionEnd - t.selectionStart > 50; });
    ok(sel && m.length > 0, `sandbox: copy fallback did not select the brief (${m})`);
    notes.push(`sandbox copy fallback: "${m}"`);
    await page.screenshot({ path: `${OUT}/sandbox-order.jpg`, type: 'jpeg', quality: 72 });
    await fr.evaluate(() => { location.hash = 'overview'; }); await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/sandbox-overview.jpg`, type: 'jpeg', quality: 72 });
    await ctx.close();
  }

  // ---------- 5. localStorage throws ----------
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied by test'); } }); });
    const page = await ctx.newPage(); watch(page, 'no-storage');
    await page.goto(APP + '#order'); await page.waitForTimeout(600);
    await page.fill('#o-quick', 'S-01 M-01'); await page.press('#o-quick', 'Enter'); await page.waitForTimeout(200);
    ok((await page.locator('#o-picked .pk').count()) === 2, 'no-storage: items not added');
    await page.click('[data-act="save-draft"]'); await page.waitForTimeout(200);
    const m = await page.locator('#o-msg').innerText();
    notes.push(`no-storage save message: "${m}"`);
    await ctx.close();
  }
  await b.close();
  console.log(JSON.stringify({ problems, external: [...external], notes }, null, 1));
  process.exit(problems.length || external.size ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
