// QA of the clickable demo (DEMO_MODE), driven by Playwright, with phone and desktop screenshots.
//   npm run demo:smoke                                    -> a fresh local demo (wrangler dev, port 8792)
//   DEMO_URL=https://kruslide-demo.<sub>.workers.dev DEMO_PASSCODE_FILE=/path/.demo-passcode npm run demo:smoke
// The passcode is read from the environment or a file and is never printed. Screenshots: screenshots/demo/.
// The run ends with "รีเซ็ตข้อมูลทดลอง", so the demo is left with its sample data.
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = resolve(process.env.SHOTS_DIR || join(ROOT, 'screenshots/demo'));
mkdirSync(SHOTS, { recursive: true });
const LIVE = process.env.DEMO_URL || '';
const PORT = Number(process.env.PORT || 8792);
const BASE = (LIVE || `http://127.0.0.1:${PORT}`).replace(/\/+$/, '');
const PASSCODE = (process.env.DEMO_PASSCODE || (process.env.DEMO_PASSCODE_FILE ? readFileSync(process.env.DEMO_PASSCODE_FILE, 'utf8') : '') || (LIVE ? '' : crypto.randomBytes(9).toString('base64url'))).trim();
if (!PASSCODE) { console.error('Set DEMO_PASSCODE or DEMO_PASSCODE_FILE for a live run.'); process.exit(1); }

let dev = null, state = null, devLog = '';
if (!LIVE) {
  state = mkdtempSync(join(tmpdir(), 'kruslide-demo-'));
  dev = spawn(process.execPath, ['scripts/demo-dev.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), PERSIST_TO: state, DEMO_PASSCODE: PASSCODE }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  dev.stdout.on('data', (d) => { devLog += d; });
  dev.stderr.on('data', (d) => { devLog += d; });
}

const results = [], problems = [];
const check = (ok, label) => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}`); if (!ok) problems.push(label); };
let expect4xx = false;
function watch(page, name) {
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (expect4xx && /status of (401|403|404)/.test(m.text())) return;
    problems.push(`${name}: console error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`${name}: page error: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400 && !expect4xx) problems.push(`${name}: ${r.status()} ${new URL(r.url()).pathname}`); });
}
const fits = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function shot(page, file, full = true) {
  await page.waitForTimeout(500);
  const vp = page.viewportSize();
  if (full) {
    await page.evaluate(() => window.scrollTo(0, 0));
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    if (h > vp.height) { await page.setViewportSize({ width: vp.width, height: h }); await page.waitForTimeout(150); }
  }
  await page.screenshot({ path: join(SHOTS, file), animations: 'disabled' });
  if (full) await page.setViewportSize(vp);
  console.log('  screenshot', file);
}
async function waitUp() {
  for (let i = 0; i < 160; i++) {
    try { const r = await fetch(`${BASE}/app/static/app.css`); if (r.ok) return; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('demo did not start:\n' + devLog.slice(-2000));
}
async function unlock(page) {
  await page.goto(`${BASE}/`);
  await page.fill('#passcode', PASSCODE);
  await page.click('button:has-text("เข้าเว็บทดลอง")');
  await page.waitForURL(/\/app\/login/);
}
async function as(page, label) {
  await page.goto(`${BASE}/app/login`);
  await page.locator('.persona', { hasText: label }).locator('button').click();
  await page.waitForLoadState('load');
}

async function main() {
  await waitUp();
  // Direct requests: no file is reachable without the gate and the access check.
  for (const p of ['/units/1/index.html', '/shared/fonts/Inter-Regular.woff2', '/shared/quiz/style-a.webp', '/index.html', '/app/deck/1/']) {
    const r = await fetch(`${BASE}${p}`, { redirect: 'manual' });
    const body = await r.text();
    check(r.status !== 200 || !/class="slide|wOF2/.test(body), `direct ${p} does not serve the file (${r.status})`);
    check(!body.includes('section class="slide'), `direct ${p} contains no deck markup`);
  }
  const browser = await chromium.launch();
  const desktop = { viewport: { width: 1366, height: 860 }, locale: 'th-TH' };
  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'th-TH' };

  // --- the passcode gate
  const g = await (await browser.newContext(phone)).newPage(); watch(g, 'gate');
  await g.goto(`${BASE}/`);
  check(await g.getByText('ใส่รหัสเพื่อเข้าเว็บทดลอง').isVisible(), 'every page starts with the passcode page');
  check(await g.getByText('เว็บทดลอง · ข้อมูลตัวอย่าง').first().isVisible(), 'the demo banner is shown');
  await shot(g, '01-passcode-mobile.png');
  expect4xx = true;
  await g.fill('#passcode', 'wrong-passcode-123');
  await g.click('button:has-text("เข้าเว็บทดลอง")');
  check(await g.getByText('รหัสไม่ถูกต้อง').isVisible(), 'a wrong passcode is refused');
  expect4xx = false;
  await shot(g, '02-passcode-wrong-mobile.png');
  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  check(/Disallow: \//.test(robots), 'robots.txt disallows everything');
  const hdr = await fetch(`${BASE}/app/`);
  check((hdr.headers.get('x-robots-tag') || '').includes('noindex'), 'X-Robots-Tag noindex on every page');

  // --- teacher personas (phone)
  const wctx = await browser.newContext(phone);
  const w = await wctx.newPage(); watch(w, 'wichai');
  await unlock(w);
  check(await w.getByText('ลองใช้ในฐานะใคร?').isVisible(), 'the right passcode opens the persona page (no LINE)');
  await shot(w, '03-personas-mobile.png');
  await as(w, 'ครูวิชัย');
  check(await w.getByText('เปิดได้ 2 จาก 3 หน่วย').first().isVisible(), 'ครูวิชัย: partial access "เปิดได้ 2 จาก 3 หน่วย"');
  check(await fits(w), 'teacher home fits the phone width');
  await shot(w, '04-wichai-home-mobile.png');
  const deckOk = await w.goto(`${BASE}/app/deck/4/`);
  await w.waitForTimeout(1200);
  check(deckOk.status() === 200, 'ครูวิชัย opens a granted deck (unit 4)');
  check((await w.locator('#ks-wm').innerText()).startsWith('Licensed to ครูวิชัย (ตัวอย่าง)'), 'the deck carries the "Licensed to …" watermark');
  check(await w.evaluate(async () => { await document.fonts.ready; return [...document.fonts].some((f) => f.status === 'loaded'); }), 'deck fonts load through the access-checked route');
  await shot(w, '05-deck-watermark-mobile.png', false);
  expect4xx = true;
  check((await w.goto(`${BASE}/app/deck/5/`)).status() === 403, 'ครูวิชัย cannot open a unit without a grant (unit 5)');
  const fontNo = await w.goto(`${BASE}/app/deck/5/fonts/Inter-Regular.woff2`);
  check(fontNo.status() === 403, `a deck asset URL without access is refused (${fontNo.status()})`);
  expect4xx = false;
  await w.goto(`${BASE}/app/payments/2`);
  check(await w.getByText('ตัวอย่าง ห้ามโอนจริง').isVisible(), 'PromptPay shows "ตัวอย่าง ห้ามโอนจริง"');
  check(!(await w.content()).match(/0812345678/), 'no real PromptPay number on the page');
  await shot(w, '06-payment-fake-mobile.png');

  const sctx = await browser.newContext(phone);
  const so = await sctx.newPage(); watch(so, 'somsri');
  await unlock(so); await as(so, 'ครูสมศรี');
  check(await so.getByText('เปิดได้ทั้งเล่ม').first().isVisible(), 'ครูสมศรี: the whole maths book (paid)');
  await shot(so, '07-somsri-home-mobile.png');
  check((await so.goto(`${BASE}/app/deck/1/`)).status() === 200, 'ครูสมศรี opens the calculus deck');

  const nctx = await browser.newContext(phone);
  const nb = await nctx.newPage(); watch(nb, 'newbie');
  await unlock(nb); await as(nb, 'ครูใหม่');
  check(await nb.getByText('ทีมงานกำลังตรวจสอบบัญชีของคุณครู').isVisible(), 'ครูใหม่ waits for approval');
  await shot(nb, '08-newbie-waiting-mobile.png');

  // --- the owner (desktop)
  const actx = await browser.newContext(desktop);
  const a = await actx.newPage(); watch(a, 'owner');
  await unlock(a); await as(a, 'เจ้าของ');
  check(a.url().includes('/app/admin/'), 'the owner persona lands on the admin dashboard');
  check(await a.locator('a.stat.sun b').innerText() === '1', 'the dashboard counts 1 waiting member');
  await shot(a, '09-owner-dashboard-desktop.png');
  await a.goto(`${BASE}/app/admin/members`);
  const card = a.locator('.wcard', { hasText: 'ครูใหม่' });
  await card.locator('label.cchip', { hasText: 'ภาษาไทย' }).click();
  await shot(a, '10-owner-approve-desktop.png');
  await card.locator('form.approve button[type=submit]').click();
  await a.waitForURL(/m=approved/);
  await nb.goto(`${BASE}/app/`);
  check(await nb.getByText('เปิดได้ทั้งเล่ม').first().isVisible(), 'after approval with the Thai book, ครูใหม่ sees it');
  await shot(nb, '11-newbie-approved-mobile.png');

  // tick unit 5 for ครูวิชัย -> he can open it; untick -> blocked again
  await a.goto(`${BASE}/app/admin/members/2#access`);
  const panel = a.locator('form[data-access]');
  const sci = panel.locator('.accbook', { hasText: 'วิทยาศาสตร์' });
  if (!(await sci.locator('details').evaluate((d) => d.open))) await sci.locator('summary').click();
  await sci.locator('input[name="unit"][value="5"]').check();
  await shot(a, '12-owner-member-access-desktop.png');
  await panel.locator('button:has-text("บันทึกสิทธิ์")').click();
  await a.waitForURL(/m=access/);
  check((await w.goto(`${BASE}/app/deck/5/`)).status() === 200, 'after the owner ticks unit 5, ครูวิชัย opens it');
  await a.goto(`${BASE}/app/admin/members/2#access`);
  const sci2 = a.locator('form[data-access] .accbook', { hasText: 'วิทยาศาสตร์' });
  if (!(await sci2.locator('details').evaluate((d) => d.open))) await sci2.locator('summary').click();
  await sci2.locator('input[name="unit"][value="5"]').uncheck();
  await a.locator('form[data-access] button:has-text("บันทึกสิทธิ์")').click();
  await a.waitForURL(/m=access/);
  expect4xx = true;
  check((await w.goto(`${BASE}/app/deck/5/`)).status() === 403, 'after the owner unticks it, unit 5 is blocked again (same session)');
  expect4xx = false;

  // matrix toggle and bulk
  await a.goto(`${BASE}/app/admin/access?open=2`);
  const cell = a.locator('button[name="cell"][value="u:6:5"]');
  await cell.click();
  await a.waitForFunction(() => document.querySelector('button[value="u:6:5"]').classList.contains('g'));
  check(true, 'a matrix tap grants a unit in the background');
  await a.reload();
  check((await a.locator('button[name="cell"][value="u:6:5"]').getAttribute('class')).includes(' g'), 'the matrix toggle is stored');
  for (const name of ['ครูปิติ', 'ครูใหม่']) await a.locator('.mx tbody tr', { hasText: name }).locator('input[name="sel"]').check();
  await a.selectOption('#bulk_book', '2');
  await a.click('button[name="bulk"]');
  await a.waitForURL(/m=bulk/);
  check(await a.getByText('ให้สิทธิ์ทั้งเล่มกับสมาชิกที่เลือกแล้ว').isVisible(), 'bulk: the science book to two selected teachers');
  await a.goto(`${BASE}/app/admin/access?open=2`);
  await shot(a, '13-owner-matrix-desktop.png');
  const amctx = await browser.newContext({ ...phone, storageState: await actx.storageState() });
  const am = await amctx.newPage(); watch(am, 'owner-mobile');
  await am.goto(`${BASE}/app/admin/access`);
  check(await fits(am), 'the matrix fits the phone width');
  await shot(am, '14-owner-matrix-mobile.png');
  await am.goto(`${BASE}/app/admin/books/2/access`);
  await shot(am, '15-owner-who-has-access-mobile.png');
  await a.goto(`${BASE}/app/admin/books/2/access`);
  await shot(a, '16-owner-who-has-access-desktop.png');
  await nb.goto(`${BASE}/app/`);
  await shot(nb, '17-newbie-after-bulk-mobile.png');
  const wd = await (await browser.newContext({ ...desktop, storageState: await wctx.storageState() })).newPage(); watch(wd, 'wichai-desktop');
  await wd.goto(`${BASE}/app/`);
  await shot(wd, '18-wichai-home-desktop.png');
  await wd.goto(`${BASE}/app/deck/4/`);
  await wd.waitForTimeout(1500);
  await shot(wd, '19-deck-watermark-desktop.png', false);

  // reset leaves the demo as it was
  await a.goto(`${BASE}/app/admin/`);
  await a.click('button:has-text("รีเซ็ตข้อมูลทดลอง")');
  await a.waitForURL(/m=reset/);
  check(await a.getByText('รีเซ็ตข้อมูลทดลองแล้ว').isVisible(), '"รีเซ็ตข้อมูลทดลอง" re-seeds and logs everyone out');
  await as(a, 'เจ้าของ');
  check(await a.locator('a.stat.sun b').innerText() === '1', 'after the reset, ครูใหม่ waits again');
  await browser.close();
}

let failed = false;
try {
  await main();
} catch (e) {
  failed = true;
  console.error('DEMO SMOKE ERROR:', e);
} finally {
  if (dev) { try { process.kill(-dev.pid, 'SIGTERM'); } catch { /* gone */ } }
  if (state) rmSync(state, { recursive: true, force: true });
}
console.log('\n' + results.join('\n'));
if (problems.length) console.log('\nPROBLEMS:\n- ' + problems.join('\n- '));
process.exit(failed || problems.length ? 1 : 0);
