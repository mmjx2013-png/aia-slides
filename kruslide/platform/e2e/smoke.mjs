// Smoke test of the real app under `wrangler dev` (local D1 + R2 + the mock LINE), driven by Playwright.
//   npm run smoke
// Uses a fresh, temporary local state (seeded with the Unit 4 deck), so it never touches your dev data.
// Screenshots go to ./screenshots (or $SHOTS_DIR). Fails if a page logs an error or a CSP violation.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8788);
const MOCK = Number(process.env.MOCK_LINE_PORT || 8791);
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = resolve(process.env.SHOTS_DIR || join(ROOT, 'screenshots'));
const UNIT4 = resolve(ROOT, '../../teacher-slides/unit4/index.html');
mkdirSync(SHOTS, { recursive: true });

const state = mkdtempSync(join(tmpdir(), 'kruslide-smoke-'));
const env = { ...process.env, PERSIST_TO: state, PORT: String(PORT), MOCK_LINE_PORT: String(MOCK), WRANGLER_SEND_METRICS: 'false' };
console.log('seeding a fresh local state in', state);
execFileSync(process.execPath, ['scripts/seed.mjs'], { cwd: ROOT, env, stdio: ['ignore', 'ignore', 'inherit'] });
const dev = spawn(process.execPath, ['scripts/dev.mjs'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
let devLog = '';
dev.stdout.on('data', (d) => { devLog += d; });
dev.stderr.on('data', (d) => { devLog += d; });

const results = [];
const problems = [];
function check(ok, label) { results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}`); if (!ok) problems.push(label); }

async function waitUp() {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(`${BASE}/app/`); if (r.ok) return; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('wrangler dev did not start:\n' + devLog.slice(-2000));
}

let expectRefusal = false; // set while a step deliberately opens a page that answers 403
function watch(page, name) {
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (expectRefusal && /status of 403/.test(m.text())) return;
    problems.push(`${name}: console error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`${name}: page error: ${e.message}`));
}
const fitsWidth = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const shot = async (page, file, full = true) => { await page.screenshot({ path: join(SHOTS, file), fullPage: full, animations: 'disabled' }); console.log('  screenshot', file); };

async function lineLogin(page, who) {
  await page.goto(`${BASE}/app/login`);
  await page.getByText(who).click();
  await page.waitForURL(/\/app\//);
}

async function main() {
  await waitUp();
  const browser = await chromium.launch();
  const desktop = { viewport: { width: 1366, height: 860 }, locale: 'th-TH' };
  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'th-TH' };

  // --- visitor
  const anon = await (await browser.newContext(desktop)).newPage(); watch(anon, 'landing');
  await anon.goto(`${BASE}/app/`);
  check(await anon.getByText('เข้าสู่ระบบด้วย LINE').isVisible(), 'landing shows the LINE login button');
  await shot(anon, '01-landing-desktop.png');
  await anon.goto(`${BASE}/app/privacy`);
  check(await anon.getByText('ไม่เก็บข้อมูลนักเรียนใด ๆ').isVisible(), 'privacy page says no student data is collected');
  await shot(anon, '02-privacy.png');
  const r = await anon.goto(`${BASE}/app/deck/1/`);
  check(new URL(anon.url()).port === String(MOCK), 'a visitor opening a deck is sent to LINE login');

  // --- teacher (phone)
  const tctx = await browser.newContext(phone);
  const t = await tctx.newPage(); watch(t, 'teacher');
  await t.goto(`${BASE}/app/`);
  await shot(t, '03-landing-mobile.png');
  await lineLogin(t, 'ครูสมศรี (ทดสอบ)');
  check(t.url().includes('/app/profile'), 'first login asks for the school name');
  await shot(t, '04-first-login-profile-mobile.png');
  await t.fill('#school', 'โรงเรียนสาธิตทดสอบ (ตัวอย่าง)');
  await t.click('button[type=submit]:has-text("บันทึก")');
  await t.waitForURL(/\/app\/(\?|$)/);
  await shot(t, '05-member-home-mobile.png');
  expectRefusal = true;
  const denied = await t.goto(`${BASE}/app/deck/1/`);
  check(denied.status() === 403, 'a member without a subscription gets 403 on the deck');
  check(!(await t.content()).includes('Statistics'), 'the refused page contains none of the deck');
  await shot(t, '06-deck-not-subscribed-mobile.png');
  expectRefusal = false;
  await t.goto(`${BASE}/app/books/1`);
  check(await t.getByText('67 สไลด์ × 3 บาท').first().isVisible(), 'book page shows 67 slides × 3 baht = 201 baht/month');
  await shot(t, '07-book-page-mobile.png');
  await t.selectOption('#months', '3');
  await t.click('button:has-text("PromptPay")');
  await t.waitForURL(/\/app\/payments\/\d+/);
  check(await t.locator('svg.qr').isVisible(), 'payment page shows a PromptPay QR');
  check(await t.getByText('603 บาท').first().isVisible(), 'payment page shows 3 months = 603 baht');
  check(await fitsWidth(t), 'payment page fits the phone width');
  await shot(t, '08-payment-promptpay-mobile.png');
  await t.fill('#note', 'โอนจากแอปธนาคาร เวลา 10:30');
  await t.click('button:has-text("แจ้งโอนแล้ว")');
  await t.waitForURL(/m=notified/);
  await shot(t, '09-payment-notified-mobile.png');

  // --- admin (desktop)
  const actx = await browser.newContext(desktop);
  const a = await actx.newPage(); watch(a, 'admin');
  await lineLogin(a, 'เจ้าของครูสไลด์ (ทดสอบ)');
  if (a.url().includes('/app/profile')) {
    await a.fill('#school', 'KruSlide');
    await a.click('button[type=submit]:has-text("บันทึก")');
    await a.waitForURL(/\/app\/(\?|$)/);
  }
  await a.goto(`${BASE}/app/admin/`);
  check(await a.getByText('ครูสมศรี (ทดสอบ)').first().isVisible(), 'admin dashboard lists the pending payment');
  await shot(a, '10-admin-dashboard-pending.png');
  await a.click('button:has-text("ยืนยัน")');
  await a.waitForURL(/m=confirmed/);
  await shot(a, '11-admin-payment-confirmed.png');

  // books CRUD + upload the real Unit 4 deck through the form
  await a.goto(`${BASE}/app/admin/books`);
  await a.fill('#title', 'วิทยาศาสตร์ ม.2 เล่ม 1 (ตัวอย่าง)');
  await a.fill('#subject', 'วิทยาศาสตร์');
  await a.fill('#grade', 'ม.2');
  await a.selectOption('#rate', '4');
  await a.selectOption('#status', 'published');
  await a.click('button:has-text("เพิ่มหนังสือ")');
  await a.waitForURL(/\/app\/admin\/books\/\d+\?m=saved/);
  await a.fill('#nt', 'หน่วยที่ 1 เซลล์ (ตัวอย่าง)');
  await a.fill('#ns', '45');
  await a.click('button:has-text("เพิ่มหน่วย")');
  await a.waitForURL(/m=saved/);
  await a.goto(`${BASE}/app/admin/books/1`);
  await a.setInputFiles('#f1', UNIT4);
  await a.click('form[action="/app/admin/units/1/upload"] button');
  await a.waitForURL(/m=uploaded/);
  check(await a.getByText('อัปโหลดสไลด์แล้ว').isVisible(), 'admin uploads the Unit 4 HTML to R2');
  await shot(a, '12-admin-book-units.png');
  await a.goto(`${BASE}/app/admin/books`);
  await shot(a, '13-admin-books.png');
  await a.goto(`${BASE}/app/admin/members`);
  await shot(a, '14-admin-members.png');
  await a.goto(`${BASE}/app/admin/subscriptions`);
  await shot(a, '15-admin-subscriptions.png');
  await a.goto(`${BASE}/app/admin/audit`);
  await shot(a, '16-admin-audit-log.png');
  // the owner may confirm payments from a phone
  const amctx = await browser.newContext({ ...phone, storageState: await actx.storageState() });
  const am = await amctx.newPage(); watch(am, 'admin-mobile');
  await am.goto(`${BASE}/app/admin/payments?status=confirmed`);
  check(await am.getByText('ยืนยันแล้ว').first().isVisible(), 'admin pages work on a phone');
  check(await fitsWidth(am), 'admin page fits the phone width (wide tables scroll inside their box)');
  await shot(am, '16b-admin-payments-mobile.png');
  await amctx.close();
  const csv = await actx.request.get(`${BASE}/app/admin/export/payments.csv`);
  check(csv.ok() && (await csv.text()).includes('ครูสมศรี'), 'CSV export works');

  // --- teacher again: the book is active, open the deck
  await t.goto(`${BASE}/app/`);
  check(await t.getByText('เปิดสไลด์').first().isVisible(), 'after confirmation the member sees "open slides"');
  check(await fitsWidth(t), 'member home fits the phone width');
  await shot(t, '17-member-home-active-mobile.png');

  const dctx = await browser.newContext({ ...desktop, viewport: { width: 1440, height: 810 }, storageState: await tctx.storageState() });
  const d = await dctx.newPage(); watch(d, 'deck');
  const cspViolations = [];
  d.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) cspViolations.push(m.text()); });
  const resp = await d.goto(`${BASE}/app/deck/1/`);
  check(resp.status() === 200, 'an active member opens the deck');
  check((resp.headers()['content-security-policy'] || '').includes("frame-ancestors 'self'"), 'deck has CSP with frame-ancestors self');
  await d.waitForTimeout(1500);
  check(await d.locator('#ks-wm').innerText() === 'Licensed to ครูสมศรี (ทดสอบ) · โรงเรียนสาธิตทดสอบ (ตัวอย่าง)', 'deck shows the licence watermark');
  check(await d.locator('section.slide').count() === 67, 'all 67 slides are in the deck');
  check(await d.evaluate(() => !!document.getElementById('ctl') && getComputedStyle(document.getElementById('ctl')).display !== 'none'), 'the deck engine runs (controls present)');
  await shot(d, '18-deck-watermark-desktop.png', false);
  for (let i = 0; i < 4; i++) { await d.keyboard.press('ArrowRight'); await d.waitForTimeout(700); }
  await shot(d, '19-deck-after-4-steps-desktop.png', false);
  check(cspViolations.length === 0, `no CSP violations in the deck (${cspViolations.length})`);
  const fontOk = await d.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.status === 'loaded').length; });
  check(fontOk > 0, `deck fonts load through the member-only asset route (${fontOk} loaded)`);

  const tm = await tctx.newPage(); watch(tm, 'deck-mobile');
  await tm.goto(`${BASE}/app/deck/1/`);
  await tm.waitForTimeout(1200);
  await shot(tm, '20-deck-watermark-mobile.png', false);

  // the second test teacher never paid: still refused
  const t2ctx = await browser.newContext(desktop);
  const t2 = await t2ctx.newPage();
  await lineLogin(t2, 'ครูวิชัย (ทดสอบ)');
  const t2deck = await t2.goto(`${BASE}/app/deck/1/`);
  check(t2deck.status() === 302 || t2deck.status() === 403 || t2.url().includes('/app/profile'), 'another (non-paying) teacher cannot open the deck');

  // logout
  await t.goto(`${BASE}/app/`);
  await t.click('button:has-text("ออกจากระบบ")');
  await t.waitForURL(/m=loggedout/);
  check(await t.getByText('เข้าสู่ระบบด้วย LINE').isVisible(), 'logout returns to the landing page');

  await browser.close();
}

let failed = false;
try {
  await main();
} catch (e) {
  failed = true;
  console.error('SMOKE ERROR:', e);
} finally {
  try { process.kill(-dev.pid, 'SIGTERM'); } catch { /* already gone */ }
  rmSync(state, { recursive: true, force: true });
}
console.log('\n' + results.join('\n'));
if (problems.length) console.log('\nPROBLEMS:\n- ' + problems.join('\n- '));
process.exit(failed || problems.length ? 1 : 0);
