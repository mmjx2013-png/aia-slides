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
const imagesLoaded = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].every((i) => i.complete && i.naturalWidth > 0), sel);
const inDays = (d) => new Date(Date.now() + d * 86400000 + 7 * 3600000).toISOString().slice(0, 10);
const decoded = (page) => page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {})))).catch(() => {});
const shotView = async (page, file) => { await decoded(page); return shot(page, file, false); };
// A full-page shot grows the viewport to the whole page first, so the sticky header and the phone tab bar are drawn
// where a reader sees them (top and bottom), not in the middle of the picture.
const shot = async (page, file, full = true) => {
  const vp = page.viewportSize();
  if (full) {
    await page.waitForTimeout(500); // let a page-to-page view transition finish before the viewport changes
    await page.evaluate(() => window.scrollTo(0, 0));
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    if (h > vp.height) { await page.setViewportSize({ width: vp.width, height: h }); await page.waitForTimeout(150); }
  }
  await page.screenshot({ path: join(SHOTS, file), animations: 'disabled' });
  if (full) await page.setViewportSize(vp);
  console.log('  screenshot', file);
};

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
  // --- new members wait for the owner's approval (NEW_MEMBER_APPROVAL on)
  check(await t.getByText('ทีมงานกำลังตรวจสอบบัญชีของคุณครู').isVisible(), 'a new member sees the waiting-for-approval page');
  check(await t.locator('a.btn.line[href="https://line.me/R/ti/p/%40368lkkze"]').isVisible(), 'the waiting page offers LINE @368lkkze');
  check(await fitsWidth(t), 'waiting page fits the phone width');
  await shot(t, '05a-waiting-approval-mobile.png');
  expectRefusal = true;
  const early = await t.goto(`${BASE}/app/books/1`);
  check(early.status() === 403 && (await t.content()).includes('รออนุมัติ'), 'a waiting member cannot open books yet');
  expectRefusal = false;

  // --- admin (desktop) logs in and approves her from the members page
  const actx = await browser.newContext(desktop);
  const a = await actx.newPage(); watch(a, 'admin');
  await lineLogin(a, 'เจ้าของครูสไลด์ (ทดสอบ)');
  if (a.url().includes('/app/profile')) {
    await a.fill('#school', 'KruSlide');
    await a.click('button[type=submit]:has-text("บันทึก")');
    await a.waitForURL(/\/app\/(\?|$)/);
  }
  check(!(await a.content()).includes('ทีมงานกำลังตรวจสอบบัญชี'), 'the owner\'s own LINE account never waits');
  await a.goto(`${BASE}/app/admin/`);
  check(await a.locator('a.stat.sun b').innerText() === '1', 'admin dashboard counts 1 member waiting');
  await a.goto(`${BASE}/app/admin/members`);
  const card1 = a.locator('.wcard', { hasText: 'ครูสมศรี (ทดสอบ)' });
  check(await card1.isVisible(), 'the members page lists the waiting teacher with an approve form');
  await card1.locator('form.approve button[type=submit]').click();
  await a.waitForURL(/m=approved/);
  check(await a.getByText('อนุมัติสมาชิกแล้ว').isVisible(), 'admin approves the teacher');

  await t.goto(`${BASE}/app/`);
  await shot(t, '05-member-home-mobile.png');
  check(await fitsWidth(t), 'member home (onboarding, bento) fits the phone width');

  // --- request a book (ขอทำหนังสือ) + style quiz, on a phone
  await t.click('nav.tabs a.cta');
  await t.waitForURL(/\/app\/requests\/new/);
  check(await t.getByRole('heading', { name: 'ขอทำหนังสือ' }).isVisible(), 'the "ขอทำหนังสือ" tab opens the request form');
  await t.fill('#subject', 'คณิตศาสตร์');
  await t.fill('#textbook', 'สสวท. คณิตศาสตร์ ม.1 เล่ม 1');
  await t.click('label:has(input[name="grade"][value="ม.1"])');
  await t.fill('#units', 'หน่วยที่ 1–4 (จำนวนเต็ม, เลขยกกำลัง, ทศนิยม, รูปเรขาคณิต)');
  await t.fill('#start_date', inDays(45));
  await t.fill('#note', 'นักเรียนชอบเกม อยากได้โจทย์ท้ายหน่วยเยอะ ๆ');
  check(await fitsWidth(t), 'request form fits the phone width');
  await shot(t, '21-request-form-mobile.png');
  await t.click('button:has-text("ถัดไป")');
  await t.waitForURL(/\/app\/requests\/\d+\/quiz\/1$/);
  const reqId = Number(/requests\/(\d+)\//.exec(t.url())[1]);
  await t.waitForLoadState('load');
  check(await imagesLoaded(t, '.pick img'), 'quiz question 1 shows both sample slides');
  check(await fitsWidth(t), 'quiz fits the phone width');
  const fold = await t.evaluate(() => document.querySelector('.bothbtn').getBoundingClientRect().bottom <= window.innerHeight);
  check(fold, 'on a phone, both samples and "ได้ทั้งคู่" fit on one screen');
  check(await t.evaluate(() => document.documentElement.classList.contains('js')), 'app.js runs under the quiz CSP');
  await shotView(t, '22-quiz-q1-mobile.png');
  // tap A: the tick shows before the next question loads
  await t.tap('button.pick[value="a"]');
  await t.waitForTimeout(200);
  check(await t.locator('button.pick.chosen[value="a"]').count() === 1, 'a tap marks the chosen sample (tick) before moving on');
  await shotView(t, '23-quiz-tap-feedback-mobile.png');
  await t.waitForURL(/quiz\/2$/);
  const picks = ['b', 'a', 'a', 'a', 'a', 'both', 'a', 'b', 'a'];
  for (let n = 2; n <= 10; n++) {
    if (n === 5) { await t.waitForLoadState('load'); await shotView(t, '24-quiz-q5-mobile.png'); }
    if (n === 10) { await t.waitForLoadState('load'); await shotView(t, '24b-quiz-q10-language-mobile.png'); }
    await t.tap(picks[n - 2] === 'both' ? 'button.bothbtn' : `button.pick[value="${picks[n - 2]}"]`);
    await t.waitForURL(n < 10 ? new RegExp(`quiz/${n + 1}$`) : /\/app\/requests\/\d+\?m=sent/);
  }
  check(await t.getByText('ขอบคุณ ทีมงานจะติดต่อกลับทาง LINE').isVisible(), 'after 10 taps the teacher sees "ขอบคุณ ทีมงานจะติดต่อกลับทาง LINE"');
  await t.locator('.thumb img').last().scrollIntoViewIfNeeded();
  await t.waitForTimeout(600);
  check(await imagesLoaded(t, '.thumb img'), 'the thank-you page shows thumbnails of the chosen samples');
  await t.evaluate(() => window.scrollTo(0, 0));
  await t.waitForTimeout(2800); // let the confetti finish
  await shot(t, '25-request-thanks-mobile.png');
  // without JavaScript the quiz is plain forms and still works
  const nojs = await browser.newContext({ ...phone, javaScriptEnabled: false, storageState: await tctx.storageState() });
  const nj = await nojs.newPage(); watch(nj, 'quiz-nojs');
  await nj.goto(`${BASE}/app/requests/new`);
  await nj.fill('#subject', 'วิทยาศาสตร์');
  await nj.fill('#textbook', 'สสวท. วิทยาศาสตร์ ม.2 เล่ม 1');
  await nj.click('label:has(input[name="grade"][value="ม.2"])');
  await nj.fill('#units', 'ทั้งเล่ม');
  await nj.fill('#start_date', inDays(60));
  // Keyboard here: Playwright's click checks need page scripts, which this context switches off.
  await nj.press('#textbook', 'Enter');                       // implicit form submission
  await nj.waitForURL(/quiz\/1$/);
  await nj.press('button.pick[value="b"]', 'Enter');          // a plain submit button
  await nj.waitForURL(/quiz\/2$/);
  await nj.press('button.bothbtn', 'Enter');
  await nj.waitForURL(/quiz\/3$/);
  check(true, 'without JavaScript the quiz works as plain forms (2 answers sent)');
  await shotView(nj, '26-quiz-nojs-mobile.png');
  await nojs.close();
  await t.goto(`${BASE}/app/requests`);
  check(await t.getByText('เลือกสไตล์แล้ว 2/10').isVisible(), 'my requests list shows the unfinished one with its progress');
  check(await fitsWidth(t), 'my requests list fits the phone width');
  await shot(t, '27-my-requests-mobile.png');
  // the quiz on a desktop, with the keyboard
  const tdesk = await browser.newContext({ ...desktop, storageState: await tctx.storageState() });
  const td = await tdesk.newPage(); watch(td, 'quiz-desktop');
  await td.goto(`${BASE}/app/requests`);
  await td.click('a:has-text("ทำต่อ")');
  await td.waitForURL(/quiz\/3$/);
  await td.waitForLoadState('load');
  await shotView(td, '28-quiz-desktop.png');
  await td.keyboard.press('ArrowRight');
  await td.waitForURL(/quiz\/4$/);
  check(true, 'on a desktop the arrow keys answer the quiz');
  await td.goto(`${BASE}/app/`);
  await shot(td, '05b-member-home-desktop.png');
  await td.goto(`${BASE}/app/requests`);
  await shot(td, '27b-my-requests-desktop.png');
  await tdesk.close();
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

  // --- admin (desktop): payments, requests, books
  await a.goto(`${BASE}/app/admin/`);
  check(await a.getByText('ครูสมศรี (ทดสอบ)').first().isVisible(), 'admin dashboard lists the pending payment');
  check(await a.locator('a.stat.hot b').innerText() === '1', 'admin dashboard counts 1 new book request');
  await shot(a, '10-admin-dashboard-pending.png');
  await a.click('button:has-text("ยืนยัน")');
  await a.waitForURL(/m=confirmed/);
  await shot(a, '11-admin-payment-confirmed.png');

  // book requests: list, status + owner note, brief
  await actx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  await a.goto(`${BASE}/app/admin/requests`);
  await a.waitForLoadState('load');
  check(await a.getByText('Style A modern clean · calm colours · real photos').first().isVisible(), 'admin sees the request with its style summary');
  await a.locator('.thumb img').last().scrollIntoViewIfNeeded();
  await a.waitForTimeout(600);
  check(await imagesLoaded(a, '.thumb img'), 'admin sees the chosen samples as thumbnails');
  await shot(a, '29-admin-requests-desktop.png');
  await a.locator(`#r${reqId} select[name="status"]`).selectOption('quoted');
  await a.fill(`#on${reqId}`, 'เสนอราคา 990 บาท/เดือน ส่งทาง LINE แล้ว');
  await a.click(`#r${reqId} button:has-text("บันทึก")`);
  await a.waitForURL(/m=request/);
  check(await a.getByText('บันทึกคำขอแล้ว').isVisible(), 'admin changes the status and saves the owner note');
  await a.goto(`${BASE}/app/admin/requests?status=quoted`);
  check(await a.locator(`#r${reqId} .badge`).first().innerText() === 'เสนอราคาแล้ว', 'the request shows as quoted');
  await a.goto(`${BASE}/app/admin/requests/${reqId}`);
  await a.click('button[data-copy="brief"]');
  await a.waitForTimeout(300);
  const clip = await a.evaluate(() => navigator.clipboard.readText());
  check(clip.startsWith(`KruSlide book request #${reqId}`) && clip.includes('Style summary: Style A modern clean · calm colours'), '"copy brief" puts the clean brief on the clipboard');
  check(!clip.includes('ครูสมศรี'), 'the brief holds no teacher name');
  await shot(a, '30-admin-request-brief-desktop.png');

  // books CRUD + upload the real Unit 4 deck through the form
  await a.goto(`${BASE}/app/admin/books`);
  await a.fill('#title', 'วิทยาศาสตร์ ม.2 เล่ม 1 (ตัวอย่าง)');
  await a.fill('#subject', 'วิทยาศาสตร์');
  await a.fill('#grade', 'ม.2');
  await a.selectOption('#rate', '4');
  await a.selectOption('#status', 'published');
  await a.click('button:has-text("เพิ่มหนังสือ")');
  await a.waitForURL(/\/app\/admin\/books\/\d+\?m=saved/);
  const book2 = Number(/books\/(\d+)/.exec(a.url())[1]);
  for (const [title, n] of [['หน่วยที่ 1 เซลล์ (ตัวอย่าง)', '45'], ['หน่วยที่ 2 ระบบร่างกาย (ตัวอย่าง)', '38'], ['หน่วยที่ 3 พลังงาน (ตัวอย่าง)', '30']]) {
    await a.fill('#nt', title);
    await a.fill('#ns', n);
    await a.click('button:has-text("เพิ่มหน่วย")');
    await a.waitForURL(/m=saved/);
  }
  const b2units = await a.locator('form[action$="/upload"]').evaluateAll((fs) => fs.map((f) => Number(/units\/(\d+)\//.exec(f.getAttribute('action'))[1])));
  for (const u of b2units.slice(0, 2)) { // units 1 and 2 get a deck; unit 3 stays "coming soon"
    await a.setInputFiles(`#f${u}`, UNIT4);
    await a.click(`form[action="/app/admin/units/${u}/upload"] button`);
    await a.waitForURL(/m=uploaded/);
  }
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
  await am.goto(`${BASE}/app/admin/requests?status=all`);
  check(await fitsWidth(am), 'admin requests page fits the phone width');
  await shot(am, '31-admin-requests-mobile.png');
  await amctx.close();
  const csv = await actx.request.get(`${BASE}/app/admin/export/payments.csv`);
  check(csv.ok() && (await csv.text()).includes('ครูสมศรี'), 'CSV export works');

  // --- teacher again: the request is quoted; the book is active, open the deck
  await t.goto(`${BASE}/app/requests/${reqId}`);
  check(await t.getByText('ส่งใบเสนอราคาแล้ว').first().isVisible(), 'the teacher sees the new status of the request');
  check(!(await t.content()).includes('990 บาท/เดือน ส่งทาง LINE'), 'the teacher never sees the owner note');
  await shot(t, '32-request-status-mobile.png');
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

  // --- access control: a second teacher, approved with a whole book, then given single decks
  const t2ctx = await browser.newContext(phone);
  const t2 = await t2ctx.newPage(); watch(t2, 'teacher2');
  await lineLogin(t2, 'ครูวิชัย (ทดสอบ)');
  if (t2.url().includes('/app/profile')) {
    await t2.fill('#school', 'โรงเรียนบ้านทดสอบ (ตัวอย่าง)');
    await t2.click('button[type=submit]:has-text("บันทึก")');
    await t2.waitForURL(/\/app\/(\?|$)/);
  }
  const t2desk = await browser.newContext({ ...desktop, storageState: await t2ctx.storageState() });
  const t2d = await t2desk.newPage(); watch(t2d, 'teacher2-desktop');
  await t2d.goto(`${BASE}/app/`);
  await shot(t2d, '33-waiting-approval-desktop.png');
  expectRefusal = true;
  const t2deck = await t2.goto(`${BASE}/app/deck/1/`);
  check(t2deck.status() === 403, 'a waiting teacher cannot open a deck');
  expectRefusal = false;
  await a.goto(`${BASE}/app/admin/members?filter=waiting`);
  const card2 = a.locator('.wcard', { hasText: 'ครูวิชัย (ทดสอบ)' });
  const t2Id = Number(/members\/(\d+)\/approve/.exec(await card2.locator('form.approve').getAttribute('action'))[1]);
  await card2.locator('label.cchip', { hasText: 'คณิตศาสตร์ ม.1 เล่ม 1' }).click();
  await card2.locator('select[name="expiry"]').selectOption('12');
  await shot(a, '34-admin-approve-with-book-desktop.png');
  const amctx2 = await browser.newContext({ ...phone, storageState: await actx.storageState() });
  const am2 = await amctx2.newPage(); watch(am2, 'admin-mobile-2');
  await am2.goto(`${BASE}/app/admin/members?filter=waiting`);
  check(await fitsWidth(am2), 'the approve card fits the phone width');
  await shot(am2, '34b-admin-approve-mobile.png');
  await card2.locator('form.approve button[type=submit]').click();
  await a.waitForURL(/m=approved/);
  check(await a.getByText('อนุมัติสมาชิกแล้ว').isVisible(), 'admin approves the second teacher with a whole book');

  // the member's access panel: tick one unit of book 2, until a date
  await a.goto(`${BASE}/app/admin/members/${t2Id}#access`);
  const panel = a.locator('form[data-access]');
  const b2 = panel.locator('.accbook', { hasText: 'วิทยาศาสตร์ ม.2 เล่ม 1' });
  await b2.locator('summary').click();
  await b2.locator(`input[name="unit"][value="${b2units[0]}"]`).check();
  check(await b2.locator('input[data-book]').evaluate((el) => el.indeterminate), 'ticking one unit marks the book box as partly ticked (script)');
  const until = new Date(Date.now() + 90 * 86400000 + 7 * 3600000).toISOString().slice(0, 10);
  check(!(await panel.locator('input[name="expiry_date"]').isVisible()), 'the date field stays hidden until "ถึงวันที่…" is chosen');
  await panel.locator('.expf label:has(input[value="date"])').click();
  await panel.locator('input[name="expiry_date"]').fill(until);
  check(await panel.locator('input[name="expiry"][value="date"]').isChecked(), 'expiry "ถึงวันที่…" with a date');
  await shot(a, '35-admin-member-access-desktop.png');
  const amp = await amctx2.newPage(); watch(amp, 'admin-mobile-panel');
  await amp.goto(`${BASE}/app/admin/members/${t2Id}#access`);
  await amp.locator('.accbook', { hasText: 'คณิตศาสตร์ ม.1 เล่ม 1' }).locator('summary').click();
  check(await fitsWidth(amp), 'the access panel fits the phone width');
  await shot(amp, '35b-admin-member-access-mobile.png');
  await panel.locator('button:has-text("บันทึกสิทธิ์")').click();
  await a.waitForURL(/m=access/);
  check(await a.getByText('บันทึกสิทธิ์เข้าถึงสไลด์แล้ว').isVisible(), 'one Save stores the deck access');

  // the teacher's home: only the decks they can open, with expiry; "เปิดได้ 1 จาก 3 หน่วย"
  await t2.goto(`${BASE}/app/`);
  check(await t2.getByText('เปิดได้ 1 จาก 3 หน่วย').first().isVisible(), 'teacher home shows partial access "เปิดได้ 1 จาก 3 หน่วย"');
  check(await t2.getByText('เปิดได้ทั้งเล่ม').first().isVisible(), 'teacher home shows the whole book given at approval');
  check(!(await t2.content()).includes('หน่วยที่ 2 ระบบร่างกาย'), 'decks the teacher cannot open are not listed on the home page');
  check(await fitsWidth(t2), 'teacher home with partial access fits the phone width');
  await shot(t2, '36-teacher-partial-access-mobile.png');
  await t2d.goto(`${BASE}/app/`);
  await shot(t2d, '36b-teacher-partial-access-desktop.png');
  const hrefs = await t2.locator('a[href^="/app/"]').evaluateAll((as) => [...new Set(as.map((x) => x.getAttribute('href').split('#')[0]))]);
  let dead = [];
  for (const h of hrefs) { const r = await t2ctx.request.get(`${BASE}${h}`, { maxRedirects: 0 }); if (r.status() >= 400) dead.push(`${h} ${r.status()}`); }
  check(dead.length === 0, `no dead links on the teacher home (${hrefs.length} checked${dead.length ? ': ' + dead.join(', ') : ''})`);
  const ok1 = await t2.goto(`${BASE}/app/deck/${b2units[0]}/`);
  check(ok1.status() === 200, 'the granted deck opens');
  expectRefusal = true;
  const no2 = await t2.goto(`${BASE}/app/deck/${b2units[1]}/`);
  check(no2.status() === 403, 'a deck of the same book without a grant is refused');
  expectRefusal = false;

  // "ใครเข้าถึงได้บ้าง" for book 2: revoke while the teacher's session is open, search and add a member
  await a.goto(`${BASE}/app/admin/books/${book2}/access`);
  check(await a.getByText('ครูวิชัย (ทดสอบ)').first().isVisible(), '"ใครเข้าถึงได้บ้าง" lists the teacher with a grant');
  await a.fill('input[name="q"]', 'สมศรี');
  await a.click('button:has-text("ค้นหา")');
  await a.waitForURL(/q=/);
  await shot(a, '37-admin-who-has-access-desktop.png');
  const amw = await amctx2.newPage(); watch(amw, 'admin-mobile-who');
  await amw.goto(`${BASE}/app/admin/books/${book2}/access?q=${encodeURIComponent('สมศรี')}`);
  check(await fitsWidth(amw), '"ใครเข้าถึงได้บ้าง" fits the phone width');
  await shot(amw, '37b-admin-who-has-access-mobile.png');
  const addRow = a.locator('.found li', { hasText: 'ครูสมศรี (ทดสอบ)' });
  await addRow.locator('select[name="unit"]').selectOption(String(b2units[1]));
  await addRow.locator('button:has-text("ให้สิทธิ์")').click();
  await a.waitForURL(/m=granted/);
  check(await a.getByText('ให้สิทธิ์แล้ว').isVisible(), 'admin adds a member from the search');
  await a.locator(`tr#t${t2Id} .gchip button`).first().click();
  await a.waitForURL(/m=revoked/);
  expectRefusal = true;
  const after = await t2.goto(`${BASE}/app/deck/${b2units[0]}/`);
  check(after.status() === 403, 'a revoke takes effect at once, while the teacher\'s session is open');
  expectRefusal = false;

  // "สิทธิ์ทั้งหมด": the matrix, a tap with script, a bulk grant
  await a.goto(`${BASE}/app/admin/access?open=${book2}`);
  const cell = a.locator(`button[name="cell"][value="u:${t2Id}:${b2units[2]}"]`);
  const before = await cell.getAttribute('class');
  const navs = [];
  a.on('framenavigated', (f) => { if (f === a.mainFrame()) navs.push(f.url()); });
  await cell.click();
  await a.waitForFunction((v) => document.querySelector(`button[value="${v}"]`).classList.contains('g'), `u:${t2Id}:${b2units[2]}`);
  check(navs.length === 0 && !before.includes(' g'), 'a matrix tap grants in the background, without reloading');
  await a.reload();
  check((await a.locator(`button[name="cell"][value="u:${t2Id}:${b2units[2]}"]`).getAttribute('class')).includes(' g'), 'the tapped grant is stored');
  await a.locator('.mx tbody tr').first().scrollIntoViewIfNeeded();
  await shot(a, '38-admin-access-matrix-desktop.png');
  for (const name of ['ครูสมศรี (ทดสอบ)', 'ครูวิชัย (ทดสอบ)']) await a.locator('.mx tbody tr', { hasText: name }).locator('input[name="sel"]').check();
  await a.selectOption('#bulk_book', String(book2));
  await a.click('button[name="bulk"]');
  await a.waitForURL(/m=bulk/);
  check(await a.getByText('ให้สิทธิ์ทั้งเล่มกับสมาชิกที่เลือกแล้ว').isVisible(), 'bulk: a whole book to the selected teachers');
  await a.goto(`${BASE}/app/admin/access`);
  await shot(a, '38b-admin-access-matrix-collapsed-desktop.png');
  const amm = await amctx2.newPage(); watch(amm, 'admin-mobile-matrix');
  await amm.goto(`${BASE}/app/admin/access?open=${book2}`);
  check(await fitsWidth(amm), 'the matrix fits the phone width (the table scrolls inside its box)');
  await shot(amm, '38c-admin-access-matrix-mobile.png');
  await amctx2.close();
  const gcsv = await actx.request.get(`${BASE}/app/admin/export/grants.csv`);
  check(gcsv.ok() && (await gcsv.text()).includes('ครูวิชัย'), 'CSV export of grants works');
  await t2.goto(`${BASE}/app/`);
  await shot(t2, '36c-teacher-after-bulk-mobile.png');
  await t2desk.close();

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
