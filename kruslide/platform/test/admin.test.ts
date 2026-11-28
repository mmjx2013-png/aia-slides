import { describe, it, expect } from 'vitest';
import { call, env, makeBook, makeSub, makeUnit, newAdmin, newMember, nowSec, ORIGIN, post } from './helpers';
import { addMonths } from '../src/lib/pricing';
import { csvCell } from '../src/routes/admin';
import type { Payment, Subscription } from '../src/env';

const sub = (teacher: number, book: number) =>
  env.DB.prepare('SELECT * FROM subscriptions WHERE teacher_id = ?1 AND book_id = ?2').bind(teacher, book).first<Subscription>();
const payment = (id: number) => env.DB.prepare('SELECT * FROM payments WHERE id = ?1').bind(id).first<Payment>();

async function requestPayment(who: Awaited<ReturnType<typeof newMember>>, book: number, months: string, extra: Record<string, string> = {}) {
  const res = await post(`/app/books/${book}/subscribe`, { months, ...extra }, who);
  expect(res.status).toBe(303);
  const id = Number(/\/app\/payments\/(\d+)/.exec(res.headers.get('Location')!)![1]);
  return id;
}

describe('admin: access', () => {
  it('only admins listed in ADMIN_LINE_IDS can open the admin pages', async () => {
    expect((await call('/app/admin/')).status).toBe(302); // not logged in -> login
    const member = await newMember();
    expect((await call('/app/admin/', { cookie: member.cookie })).status).toBe(403);
    expect((await post('/app/admin/books', { title: 'x', subject: 'y', grade: 'z', rate: '3', status: 'draft' }, member)).status).toBe(403);
    const admin = await newAdmin();
    const res = await call('/app/admin/', { cookie: admin.cookie });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('รอยืนยันการชำระเงิน');
  });
});

describe('admin confirms a payment -> the subscription becomes active', () => {
  it('full flow: subscribe, PromptPay page, "I have paid", confirm, open the deck', async () => {
    const book = await makeBook({ rate: 3 });
    const unit = await makeUnit(book, { slides: 67 });
    const teacher = await newMember();
    const admin = await newAdmin();

    // the member asks for 3 months; a forged "amount" field in the form is ignored, the server computes the price
    const pid = await requestPayment(teacher, book, '3', { amount: '1', amount_satang: '100' });
    const p = (await payment(pid))!;
    expect(p.status).toBe('pending');
    expect(p.monthly_price).toBe(201);            // 67 slides × 3 baht
    expect(p.amount_satang).toBe(603 * 100);      // × 3 months
    expect((await sub(teacher.id, book))!.status).toBe('pending');
    expect((await call(`/app/deck/${unit}/`, { cookie: teacher.cookie })).status).toBe(403);

    const payPage = await (await call(`/app/payments/${pid}`, { cookie: teacher.cookie })).text();
    expect(payPage).toContain('603 บาท');
    expect(payPage).toContain('<svg role="img" aria-label="PromptPay QR"');
    expect(payPage).not.toContain('0812345678');  // the PromptPay number is masked on the page

    expect((await post(`/app/payments/${pid}/notify`, { note: 'โอนจาก KBank 14:05' }, teacher)).status).toBe(303);
    expect((await payment(pid))!.notified_at).not.toBeNull();

    // another member cannot see or act on this payment
    const other = await newMember();
    expect((await call(`/app/payments/${pid}`, { cookie: other.cookie })).status).toBe(404);
    expect((await post(`/app/payments/${pid}/notify`, {}, other)).status).toBe(404);

    const t0 = nowSec();
    const res = await post(`/app/admin/payments/${pid}/confirm`, {}, admin);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toContain('m=confirmed');
    const confirmed = (await payment(pid))!;
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.confirmed_by).toBe(`teacher:${admin.id}`);
    const s = (await sub(teacher.id, book))!;
    expect(s.status).toBe('active');
    expect(s.monthly_price).toBe(201);
    expect(Math.abs(s.period_start! - t0)).toBeLessThan(5);
    expect(Math.abs(s.period_end! - addMonths(t0, 3))).toBeLessThan(5);
    const log = await env.DB.prepare(`SELECT actor, detail FROM audit_log WHERE action = 'payment.confirm'`).first<{ actor: string; detail: string }>();
    expect(log!.actor).toBe(`admin:${admin.id}`);
    expect(JSON.parse(log!.detail).amount).toBe(603);

    const deck = await call(`/app/deck/${unit}/`, { cookie: teacher.cookie });
    expect(deck.status).toBe(200);

    // confirming twice changes nothing
    const again = await post(`/app/admin/payments/${pid}/confirm`, {}, admin);
    expect(again.headers.get('Location')).toContain('m=already');
    expect((await sub(teacher.id, book))!.period_end).toBe(s.period_end);
  });

  it('a renewal while active extends from the current end date', async () => {
    const book = await makeBook({ rate: 5 });
    await makeUnit(book, { slides: 40 });
    const teacher = await newMember();
    const admin = await newAdmin();
    const end = nowSec() + 10 * 86400;
    await makeSub(teacher.id, book, { end, price: 200 });
    const pid = await requestPayment(teacher, book, '1');
    expect((await payment(pid))!.amount_satang).toBe(200 * 100);
    await post(`/app/admin/payments/${pid}/confirm`, {}, admin);
    expect((await sub(teacher.id, book))!.period_end).toBe(addMonths(end, 1));
  });

  it('rejecting a payment leaves the subscription closed', async () => {
    const book = await makeBook();
    const unit = await makeUnit(book);
    const teacher = await newMember();
    const admin = await newAdmin();
    const pid = await requestPayment(teacher, book, '1');
    const res = await post(`/app/admin/payments/${pid}/reject`, {}, admin);
    expect(res.headers.get('Location')).toContain('m=rejected');
    expect((await payment(pid))!.status).toBe('rejected');
    expect((await sub(teacher.id, book))!.status).toBe('pending');
    expect((await call(`/app/deck/${unit}/`, { cookie: teacher.cookie })).status).toBe(403);
    // a rejected payment cannot be confirmed afterwards
    expect((await post(`/app/admin/payments/${pid}/confirm`, {}, admin)).headers.get('Location')).toContain('m=already');
  });

  it('asking again before paying reuses the one pending payment; after "I have paid" its amount is frozen', async () => {
    const book = await makeBook();
    await makeUnit(book);
    const teacher = await newMember();
    const a = await requestPayment(teacher, book, '1');
    const b = await requestPayment(teacher, book, '6');
    expect(b).toBe(a);
    expect((await payment(a))!.months).toBe(6);
    await post(`/app/payments/${a}/notify`, {}, teacher);
    const c = await requestPayment(teacher, book, '12');
    expect(c).toBe(a);
    expect((await payment(a))!.months).toBe(6);
  });

  it('extend and expire from the admin page', async () => {
    const book = await makeBook();
    await makeUnit(book);
    const teacher = await newMember();
    const admin = await newAdmin();
    const end = nowSec() + 5 * 86400;
    const sid = await makeSub(teacher.id, book, { end });
    await post(`/app/admin/subscriptions/${sid}/extend`, { months: '3' }, admin);
    expect((await sub(teacher.id, book))!.period_end).toBe(addMonths(end, 3));
    await post(`/app/admin/subscriptions/${sid}/expire`, {}, admin);
    const s = (await sub(teacher.id, book))!;
    expect(s.status).toBe('expired');
    expect(s.period_end!).toBeLessThanOrEqual(nowSec());
    expect((await post(`/app/admin/subscriptions/${sid}/extend`, { months: '2' }, admin)).status).toBe(400); // only 1/3/6/12
    // grant a free month to a member with no subscription yet
    const fresh = await newMember();
    await post(`/app/admin/members/${fresh.id}/grant`, { book_id: String(book), months: '1' }, admin);
    expect((await sub(fresh.id, book))!.status).toBe('active');
  });

  it('blocking a member ends all their sessions', async () => {
    const teacher = await newMember();
    const admin = await newAdmin();
    await post(`/app/admin/members/${teacher.id}/block`, {}, admin);
    expect((await call('/app/', { cookie: teacher.cookie })).status).toBe(200);
    expect(await (await call('/app/', { cookie: teacher.cookie })).text()).toContain('เข้าสู่ระบบด้วย LINE');
  });
});

describe('admin: books, units and deck upload', () => {
  it('creates a book (rate must be 3–5), adds a unit and uploads its HTML to R2', async () => {
    const admin = await newAdmin();
    expect((await post('/app/admin/books', { title: 'คณิต ม.1', subject: 'คณิตศาสตร์', grade: 'ม.1', rate: '6', status: 'published' }, admin)).status).toBe(400);
    expect((await post('/app/admin/books', { title: '', subject: 'คณิตศาสตร์', grade: 'ม.1', rate: '3', status: 'published' }, admin)).status).toBe(400);
    expect((await post('/app/admin/books', { title: 'x', subject: 'y', grade: 'z', rate: '3', status: 'live' }, admin)).status).toBe(400);
    const res = await post('/app/admin/books', { title: 'คณิตศาสตร์ ม.1 เล่ม 1', subject: 'คณิตศาสตร์', grade: 'ม.1', rate: '4', status: 'published' }, admin);
    const bookId = Number(/books\/(\d+)/.exec(res.headers.get('Location')!)![1]);
    await post(`/app/admin/books/${bookId}/units`, { position: '4', title: 'หน่วยที่ 4 สถิติ', slide_count: '10' }, admin);
    expect((await post(`/app/admin/books/${bookId}/units`, { position: '4', title: 'ซ้ำ', slide_count: '1' }, admin)).status).toBe(409);
    const unit = (await env.DB.prepare('SELECT * FROM units WHERE book_id = ?1').bind(bookId).first<{ id: number }>())!;

    const deck = `<!DOCTYPE html><html><head><title>x</title></head><body>${'<section class="slide" data-steps="0">s</section>'.repeat(12)}<script>boot()</script></body></html>`;
    const form = new FormData();
    form.set('_csrf', admin.csrf);
    form.set('file', new File([deck], 'unit4.html', { type: 'text/html' }));
    const up = await call(`/app/admin/units/${unit.id}/upload`, { method: 'POST', body: form, cookie: admin.cookie, headers: { Origin: ORIGIN } });
    expect(up.status).toBe(303);
    const u = (await env.DB.prepare('SELECT * FROM units WHERE id = ?1').bind(unit.id).first<{ r2_key: string; slide_count: number; script_hashes: string; html_bytes: number }>())!;
    expect(u.r2_key).toBe(`units/${unit.id}/index.html`);
    expect(u.slide_count).toBe(12);                       // counted from the file
    expect(u.script_hashes).toMatch(/^'sha256-[A-Za-z0-9+/]{43}='$/);
    expect(await (await env.DECKS.get(u.r2_key))!.text()).toBe(deck);
    const b = (await env.DB.prepare('SELECT slide_count FROM books WHERE id = ?1').bind(bookId).first<{ slide_count: number }>())!;
    expect(b.slide_count).toBe(12);                       // the book follows its units, so its price does too

    const bad = new FormData();
    bad.set('_csrf', admin.csrf);
    bad.set('file', new File(['just text'], 'x.html', { type: 'text/html' }));
    expect((await call(`/app/admin/units/${unit.id}/upload`, { method: 'POST', body: bad, cookie: admin.cookie, headers: { Origin: ORIGIN } })).status).toBe(400);
  });

  it('a book with subscribers cannot be deleted (archive it instead)', async () => {
    const admin = await newAdmin();
    const book = await makeBook();
    await makeUnit(book);
    const t = await newMember();
    await makeSub(t.id, book);
    expect((await post(`/app/admin/books/${book}/delete`, {}, admin)).status).toBe(400);                 // box not ticked
    expect((await post(`/app/admin/books/${book}/delete`, { confirm: 'yes' }, admin)).status).toBe(409);
  });

  it('member names are escaped on admin pages', async () => {
    const admin = await newAdmin();
    await newMember({ name: '<script>alert(1)</script>', school: '"><img src=x onerror=alert(2)>' });
    const page = await (await call('/app/admin/members', { cookie: admin.cookie })).text();
    expect(page).not.toContain('<script>alert(1)');
    expect(page).not.toContain('<img src=x');
    expect(page).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

describe('admin: deleting', () => {
  it('deletes a unit and its deck from R2 only when confirmed; a book without subscribers can be deleted', async () => {
    const admin = await newAdmin();
    const book = await makeBook();
    const unit = await makeUnit(book);
    expect((await post(`/app/admin/units/${unit}/delete`, {}, admin)).status).toBe(400);
    expect(await env.DECKS.head(`units/${unit}/index.html`)).not.toBeNull();
    expect((await post(`/app/admin/units/${unit}/delete`, { confirm: 'yes' }, admin)).status).toBe(303);
    expect(await env.DECKS.head(`units/${unit}/index.html`)).toBeNull();
    expect((await env.DB.prepare('SELECT slide_count FROM books WHERE id = ?1').bind(book).first<{ slide_count: number }>())!.slide_count).toBe(0);
    expect((await post(`/app/admin/books/${book}/delete`, { confirm: 'yes' }, admin)).status).toBe(303);
    expect(await env.DB.prepare('SELECT id FROM books WHERE id = ?1').bind(book).first()).toBeNull();
  });
});

describe('admin: CSV export and audit log', () => {
  it('exports members as CSV with a BOM, and defuses spreadsheet formulas', async () => {
    const admin = await newAdmin();
    await newMember({ name: '=HYPERLINK("http://evil")', school: '+cmd' });
    const res = await call('/app/admin/export/members.csv', { cookie: admin.cookie });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toMatch(/^attachment; filename="kruslide-members-\d{4}-\d{2}-\d{2}\.csv"$/);
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // UTF-8 BOM so Excel shows Thai correctly
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(text).toContain(`"'+cmd"`);
    expect(csvCell('-1')).toBe(`"'-1"`);
    expect(csvCell('ครู "ดี"')).toBe('"ครู ""ดี"""');
    for (const type of ['subscriptions', 'payments']) expect((await call(`/app/admin/export/${type}.csv`, { cookie: admin.cookie })).status).toBe(200);
    expect((await call('/app/admin/export/secrets.csv', { cookie: admin.cookie })).status).toBe(400);
  });

  it('the audit log page lists admin actions', async () => {
    const admin = await newAdmin();
    await post('/app/admin/books', { title: 'เล่มใหม่', subject: 'วิทย์', grade: 'ม.2', rate: '3', status: 'draft' }, admin);
    const page = await (await call('/app/admin/audit', { cookie: admin.cookie })).text();
    expect(page).toContain('book.create');
  });
});
