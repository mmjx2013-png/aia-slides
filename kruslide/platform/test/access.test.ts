import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  call, env, makeBook, makeSub, makeTeacher, makeUnit, loginAs, newAdmin, newMember, nowSec, post, cookieValue,
  newFakeLine, lineFetch, ADMIN_LINE, type Who,
} from './helpers';
import { unitAccess, canOpen, grantUnits } from '../src/db';
import { approvalRequired } from '../src/lib/config';
import { readExpiry } from '../src/lib/access';
import { addMonths } from '../src/lib/pricing';
import { resetJwksCache } from '../src/lib/line';
import type { UnitGrant } from '../src/env';

const DAY = 86400;
const grants = (teacher: number) =>
  env.DB.prepare('SELECT * FROM unit_grants WHERE teacher_id = ?1 ORDER BY unit_id').bind(teacher).all<UnitGrant>().then((r) => r.results);
async function grant(teacher: number, unit: number, expires: number | null = null) {
  await env.DB.prepare(`INSERT INTO unit_grants (teacher_id, unit_id, granted_by, expires_at, note, created_at, updated_at) VALUES (?1, ?2, 'admin:test', ?3, '', ?4, ?4)`)
    .bind(teacher, unit, expires, nowSec()).run();
}
/** A book with two units (both with a deck) and one without a deck. */
async function library(o: { status?: string } = {}) {
  const book = await makeBook({ status: o.status, title: 'วิทยาศาสตร์ ม.2 เล่ม 1' });
  const u1 = await makeUnit(book, { position: 1, title: 'หน่วยที่ 1 เซลล์', slides: 20 });
  const u2 = await makeUnit(book, { position: 2, title: 'หน่วยที่ 2 พลังงาน', slides: 30 });
  const u3 = await makeUnit(book, { position: 3, title: 'หน่วยที่ 3 แสง', slides: 10, html: null });
  return { book, u1, u2, u3 };
}
const deck = (unit: number, who: Who) => call(`/app/deck/${unit}/`, { cookie: who.cookie });
const font = (unit: number, who: Who) => call(`/app/deck/${unit}/fonts/Inter-Regular.woff2`, { cookie: who.cookie });

describe('a deck opens with a paid subscription OR a grant, and only then', () => {
  it('a grant opens exactly that unit (deck and its assets), not the rest of the book', async () => {
    await env.DECKS.put('shared/fonts/Inter-Regular.woff2', new Uint8Array([1, 2, 3]));
    const { u1, u2 } = await library();
    const who = await newMember();
    expect((await deck(u1, who)).status).toBe(403);
    expect((await font(u1, who)).status).toBe(403);
    await grant(who.id, u1);
    const res = await deck(u1, who);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('SECRET-CONTENT');
    const f = await font(u1, who);
    expect(f.status).toBe(200);
    await f.arrayBuffer();
    expect((await deck(u2, who)).status).toBe(403);
    expect((await font(u2, who)).status).toBe(403);
  });

  it('an expired grant opens nothing; a grant until a later date does', async () => {
    const { u1, u2 } = await library();
    const who = await newMember();
    await grant(who.id, u1, nowSec() - 60);
    await grant(who.id, u2, nowSec() + 5 * DAY);
    expect((await deck(u1, who)).status).toBe(403);
    expect((await font(u1, who)).status).toBe(403);
    expect((await deck(u2, who)).status).toBe(200);
  });

  it('another teacher\'s grant does not help, a blocked or waiting teacher is refused even with a grant', async () => {
    const { u1 } = await library();
    const a = await newMember();
    const b = await newMember();
    await grant(a.id, u1);
    expect((await deck(u1, b)).status).toBe(403);
    const blockedId = await makeTeacher({ status: 'blocked' });
    await grant(blockedId, u1);
    expect((await deck(u1, await loginAs(blockedId))).status).toBe(403);
    const waitingId = await makeTeacher({ waiting: true });
    await grant(waitingId, u1);
    const waiting = await loginAs(waitingId);
    const w = await deck(u1, waiting);
    expect(w.status).toBe(403);
    const body = await w.text();
    expect(body).toContain('รออนุมัติ');
    expect(body).not.toContain('SECRET-CONTENT');
    expect((await font(u1, waiting)).status).toBe(403);
  });

  it('a revoke works at once, while the teacher\'s session is still open', async () => {
    const { u1 } = await library();
    const who = await newMember();
    const admin = await newAdmin();
    await grant(who.id, u1);
    expect((await deck(u1, who)).status).toBe(200);
    const g = (await grants(who.id))[0];
    expect((await post(`/app/admin/grants/${g.id}/revoke`, {}, admin)).status).toBe(303);
    expect((await deck(u1, who)).status).toBe(403);
    expect((await font(u1, who)).status).toBe(403);
    const log = await env.DB.prepare(`SELECT detail FROM audit_log WHERE action = 'grant.revoke'`).first<{ detail: string }>();
    expect(JSON.parse(log!.detail).unit).toBe(u1);
  });

  it('a subscription still opens the whole book; a draft book\'s subscription does not, a grant there does', async () => {
    const { book, u1, u2 } = await library();
    const subscriber = await newMember();
    await makeSub(subscriber.id, book);
    expect((await deck(u1, subscriber)).status).toBe(200);
    expect((await deck(u2, subscriber)).status).toBe(200);
    const draft = await library({ status: 'draft' });
    const s2 = await newMember();
    await makeSub(s2.id, draft.book);
    const refused = await deck(draft.u1, s2);
    expect(refused.status).toBe(403);
    expect(await refused.text()).not.toContain(`href="/app/books/${draft.book}"`); // no link to a page they cannot see
    await grant(s2.id, draft.u1);
    expect((await deck(draft.u1, s2)).status).toBe(200);
  });

  it('unitAccess reports where the right comes from', async () => {
    const { book, u1, u2 } = await library();
    const who = await newMember();
    const now = nowSec();
    expect(canOpen(await unitAccess(env, who.id, { id: u1, book_id: book }, now))).toBe(false);
    await makeSub(who.id, book, { end: now + 10 * DAY });
    await grant(who.id, u1, null);
    const a1 = await unitAccess(env, who.id, { id: u1, book_id: book }, now);
    expect(a1.sub).toBe(now + 10 * DAY);
    expect(a1.grant?.expires_at).toBeNull();
    const a2 = await unitAccess(env, who.id, { id: u2, book_id: book }, now);
    expect(a2.grant).toBeNull();
    expect(canOpen(a2)).toBe(true);
  });

  it('the admin may preview every deck', async () => {
    const draft = await library({ status: 'draft' });
    const admin = await newAdmin();
    expect((await deck(draft.u2, admin)).status).toBe(200);
  });
});

describe('the teacher\'s side', () => {
  it('home shows only the decks they can open, each with its expiry, and "เปิดได้ N จาก M หน่วย"', async () => {
    const { book, u1, u2, u3 } = await library();
    const who = await newMember();
    const until = nowSec() + 40 * DAY;
    await grant(who.id, u1, until);
    const page = await (await call('/app/', { cookie: who.cookie })).text();
    expect(page).toContain('เปิดได้ 1 จาก 3 หน่วย');
    expect(page).toContain(`href="/app/deck/${u1}/"`);
    expect(page).not.toContain(`href="/app/deck/${u2}/"`);
    expect(page).not.toContain(`href="/app/deck/${u3}/"`);
    expect(page).not.toContain('หน่วยที่ 2 พลังงาน');           // only the decks they can open
    expect(page).toMatch(/หน่วยที่ 1 เซลล์[\s\S]*?ถึง /);         // with its expiry
    await grant(who.id, u3);                                       // a unit without a deck yet: listed, not linked
    const p2 = await (await call('/app/', { cookie: who.cookie })).text();
    expect(p2).toContain('เปิดได้ 2 จาก 3 หน่วย');
    expect(p2).toContain('ไม่มีวันหมดอายุ');
    expect(p2).toContain('เร็ว ๆ นี้');
    // the book page shows every unit, with the locked ones marked and not linked
    const bp = await (await call(`/app/books/${book}`, { cookie: who.cookie })).text();
    expect(bp).toContain('ยังไม่ได้รับสิทธิ์');
    expect(bp).not.toContain(`href="/app/deck/${u2}/"`);
  });

  it('no dead links: every link on the home page of a member with grants answers', async () => {
    const draft = await library({ status: 'draft' });
    const pub = await library();
    const who = await newMember();
    await grant(who.id, draft.u1);
    await grant(who.id, pub.u2, nowSec() + DAY);
    await makeSub(who.id, pub.book, { status: 'pending' });
    const page = await (await call('/app/', { cookie: who.cookie })).text();
    const links = [...new Set([...page.matchAll(/href="(\/app\/[^"#]*)"/g)].map((m) => m[1]))];
    expect(links).toContain(`/app/books/${draft.book}`);          // a draft book they hold a grant in
    expect(links.length).toBeGreaterThan(5);
    for (const l of links) {
      const res = await call(l, { cookie: who.cookie });
      expect([200, 302], l).toContain(res.status);
      await res.arrayBuffer();
    }
    const other = await newMember();
    expect((await call(`/app/books/${draft.book}`, { cookie: other.cookie })).status).toBe(404); // without a grant: hidden
  });
});

describe('the owner\'s "สิทธิ์เข้าถึงสไลด์" panel on a member\'s page', () => {
  it('shows every book and unit, ticked where a grant is live, and where each right comes from', async () => {
    const { book, u1, u2 } = await library();
    const who = await newMember();
    const admin = await newAdmin();
    await makeSub(who.id, book);
    await grant(who.id, u1);
    await grant(who.id, u2, nowSec() - 10);
    const page = await (await call(`/app/admin/members/${who.id}`, { cookie: admin.cookie })).text();
    expect(page).toContain('สิทธิ์เข้าถึงสไลด์');
    expect(page).toMatch(new RegExp(`name="unit" value="${u1}" checked`));
    expect(page).not.toMatch(new RegExp(`name="unit" value="${u2}" checked`));
    expect(page).toContain('จ่ายแล้ว · ถึง');
    expect(page).toContain('ให้สิทธิ์ · ไม่มีวันหมดอายุ');
    expect(page).toContain('สิทธิ์หมดอายุ');
    expect(page).toContain('ทั้งสองแบบ');
    expect(page).toContain(`action="/app/admin/members/${who.id}/access"`);
    expect(page).toContain('<script src="/app/static/app.js" defer></script>');
  });

  it('one Save adds and removes grants; "ทั้งเล่ม" gives or takes the whole book; expiry options apply', async () => {
    const { book, u1, u2, u3 } = await library();
    const second = await library();
    const who = await newMember();
    const admin = await newAdmin();
    const save = (f: [string, string][]) => call(`/app/admin/members/${who.id}/access`, {
        method: 'POST', cookie: admin.cookie,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://kruslide.test' },
        body: new URLSearchParams([['_csrf', admin.csrf], ...f]),
      });
    // tick two units, no expiry
    let res = await save([['unit', String(u1)], ['unit', String(u2)], ['expiry', 'none']]);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe(`/app/admin/members/${who.id}?m=access#access`);
    expect((await grants(who.id)).map((g) => [g.unit_id, g.expires_at])).toEqual([[u1, null], [u2, null]]);
    // untick u2, add the whole second book for 3 months
    const t0 = nowSec();
    res = await save([['unit', String(u1)], ['book', String(second.book)], ['expiry', '3']]);
    const g2 = await grants(who.id);
    expect(g2.map((g) => g.unit_id)).toEqual([u1, second.u1, second.u2, second.u3]);
    expect(g2.find((g) => g.unit_id === u1)!.expires_at).toBeNull();          // an existing grant keeps its expiry
    expect(Math.abs(g2.find((g) => g.unit_id === second.u1)!.expires_at! - addMonths(t0, 3))).toBeLessThan(5);
    // "ทั้งเล่ม" was ticked and is now unticked: the whole second book goes, even though its unit boxes are still sent
    res = await save([['unit', String(u1)], ['unit', String(second.u1)], ['book_was', String(second.book)], ['expiry', 'none']]);
    expect((await grants(who.id)).map((g) => g.unit_id)).toEqual([u1]);
    // apply the chosen expiry to existing grants too, with a date
    const day = new Date((nowSec() + 30 * DAY + 7 * 3600) * 1000).toISOString().slice(0, 10);
    res = await save([['unit', String(u1)], ['unit', String(u3)], ['expiry', 'date'], ['expiry_date', day], ['apply_all', '1']]);
    const g4 = await grants(who.id);
    expect(g4.map((g) => g.unit_id)).toEqual([u1, u3]);
    for (const g of g4) expect(new Date((g.expires_at! + 7 * 3600) * 1000).toISOString().slice(0, 16)).toBe(`${day}T23:59`);
    // the book box on its own gives the book
    res = await save([['book', String(book)], ['expiry', '12']]);
    expect((await grants(who.id)).map((g) => g.unit_id)).toEqual([u1, u2, u3]);
    // bad input is refused, nothing changes
    expect((await save([['unit', '999999']])).status).toBe(400);
    expect((await save([['unit', 'abc']])).status).toBe(400);
    expect((await save([['unit', String(u1)], ['expiry', 'date'], ['expiry_date', '2020-01-01']])).status).toBe(400);
    expect((await save([['unit', String(u1)], ['expiry', 'forever']])).status).toBe(400);
    expect((await grants(who.id)).length).toBe(3);
    const logs = await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'grant.update' AND target = ?1`).bind(`teacher:${who.id}`).first<{ n: number }>();
    expect(logs!.n).toBe(5);
  });

  it('readExpiry: none, months, a date (end of that day, Bangkok), and bad dates', () => {
    const now = Date.UTC(2027, 0, 31, 3) / 1000;
    const f = (o: Record<string, string>) => { const d = new FormData(); for (const [k, v] of Object.entries(o)) d.set(k, v); return d; };
    expect(readExpiry(f({}), now)).toBeNull();
    expect(readExpiry(f({ expiry: '1' }), now)).toBe(addMonths(now, 1));
    expect(readExpiry(f({ expiry: 'date', expiry_date: '2027-02-15' }), now)).toBe(Date.UTC(2027, 1, 15, 16, 59, 59) / 1000);
    expect(() => readExpiry(f({ expiry: 'date', expiry_date: '2027-02-30' }), now)).toThrow();
    expect(() => readExpiry(f({ expiry: 'date', expiry_date: '2040-01-01' }), now)).toThrow();
  });
});

describe('"ใครเข้าถึงได้บ้าง" for a book', () => {
  it('lists the teachers with access and where it comes from; revoke; search a member and add', async () => {
    const { book, u1, u2 } = await library();
    const admin = await newAdmin();
    const paid = await newMember({ name: 'ครูจ่ายเงิน' });
    const given = await newMember({ name: 'ครูได้สิทธิ์' });
    const newcomer = await newMember({ name: 'ครูมาใหม่', school: 'โรงเรียนค้นเจอ' });
    await makeSub(paid.id, book);
    await grant(given.id, u1);
    await grant(given.id, u2, nowSec() + 9 * DAY);
    let page = await (await call(`/app/admin/books/${book}/access`, { cookie: admin.cookie })).text();
    expect(page).toContain('ครูจ่ายเงิน');
    expect(page).toContain('ครูได้สิทธิ์');
    expect(page).not.toContain('ครูมาใหม่');
    expect(page).toContain('จ่ายแล้ว ถึง');
    expect(page).toContain('ให้สิทธิ์ 2 หน่วย');
    // filter by unit 2: the payer (whole book) and the one with a grant for unit 2
    page = await (await call(`/app/admin/books/${book}/access?unit=${u2}`, { cookie: admin.cookie })).text();
    expect(page).toContain('ครูจ่ายเงิน');
    expect(page).toContain('ครูได้สิทธิ์');
    expect((await call(`/app/admin/books/${book}/access?unit=999`, { cookie: admin.cookie })).status).toBe(404);
    // search and add
    page = await (await call(`/app/admin/books/${book}/access?q=${encodeURIComponent('ค้นเจอ')}`, { cookie: admin.cookie })).text();
    expect(page).toContain('ครูมาใหม่');
    let res = await post(`/app/admin/books/${book}/grant`, { teacher_id: String(newcomer.id), unit: String(u2), expiry: '1' }, admin);
    expect(res.status).toBe(303);
    expect((await grants(newcomer.id)).map((g) => g.unit_id)).toEqual([u2]);
    res = await post(`/app/admin/books/${book}/grant`, { teacher_id: String(newcomer.id), unit: 'all', expiry: 'none' }, admin);
    const all = await grants(newcomer.id);
    expect(all.map((g) => g.unit_id)).toEqual([u1, u2, all[2].unit_id]);
    expect(all.every((g) => g.expires_at === null)).toBe(true);           // giving again from this page sets the chosen expiry
    // a unit of another book is refused
    const other = await library();
    expect((await post(`/app/admin/books/${book}/grant`, { teacher_id: String(newcomer.id), unit: String(other.u1) }, admin)).status).toBe(400);
    // revoke one, then the rest of the book
    const g = (await grants(given.id))[0];
    expect((await post(`/app/admin/grants/${g.id}/revoke`, {}, admin)).status).toBe(303);
    expect((await grants(given.id)).length).toBe(1);
    expect((await post(`/app/admin/books/${book}/revoke`, { teacher_id: String(newcomer.id) }, admin)).status).toBe(303);
    expect(await grants(newcomer.id)).toEqual([]);
    const actions = (await env.DB.prepare('SELECT action FROM audit_log ORDER BY id').all<{ action: string }>()).results.map((r) => r.action);
    expect(actions).toEqual(expect.arrayContaining(['grant.add', 'grant.revoke']));
  });
});

describe('"สิทธิ์ทั้งหมด": the access matrix', () => {
  it('shows teachers × books, opens a book into units, and allows only its own background request', async () => {
    const { book, u1 } = await library();
    const admin = await newAdmin();
    const a = await newMember({ name: 'ครูแถวหนึ่ง' });
    await grant(a.id, u1);
    let res = await call('/app/admin/access', { cookie: admin.cookie });
    expect(res.status).toBe(200);
    const csp = res.headers.get('Content-Security-Policy')!;
    expect(csp).toContain('script-src https://kruslide.test/app/static/app.js');
    expect(csp).toContain('connect-src https://kruslide.test/app/admin/access');
    expect(csp).not.toMatch(/connect-src[^;]*'self'/);
    let page = await res.text();
    expect(page).toContain('ครูแถวหนึ่ง');
    expect(page).toContain(`value="b:${a.id}:${book}"`);
    expect(page).toContain('class="cell b part"');
    res = await call(`/app/admin/access?open=${book}`, { cookie: admin.cookie });
    page = await res.text();
    expect(page).toContain(`value="u:${a.id}:${u1}"`);
    expect(page).toMatch(new RegExp(`class="cell u g"[^>]*value="u:${a.id}:${u1}"`));
    // filters
    const none = await newMember({ name: 'ครูยังไม่มีสิทธิ์' });
    page = await (await call('/app/admin/access?show=access', { cookie: admin.cookie })).text();
    expect(page).toContain('ครูแถวหนึ่ง');
    expect(page).not.toContain('ครูยังไม่มีสิทธิ์');
    page = await (await call('/app/admin/access?show=none', { cookie: admin.cookie })).text();
    expect(page).toContain('ครูยังไม่มีสิทธิ์');
    expect(page).not.toContain('ครูแถวหนึ่ง');
    page = await (await call(`/app/admin/access?q=${encodeURIComponent('แถวหนึ่ง')}`, { cookie: admin.cookie })).text();
    expect(page).not.toContain('ครูยังไม่มีสิทธิ์');
    expect(none.id).toBeGreaterThan(0);
    expect((await call('/app/admin/access', { cookie: a.cookie })).status).toBe(403);
  });

  it('a tap toggles one unit or a whole book, keeping the filters', async () => {
    const { book, u1, u2, u3 } = await library();
    const admin = await newAdmin();
    const t = await newMember();
    let res = await post(`/app/admin/access?open=${book}&show=all`, { cell: `u:${t.id}:${u2}`, expiry: '1' }, admin);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe(`/app/admin/access?open=${book}&m=granted#t${t.id}`);
    expect((await grants(t.id)).map((g) => g.unit_id)).toEqual([u2]);
    expect((await grants(t.id))[0].expires_at).not.toBeNull();
    res = await post('/app/admin/access', { cell: `u:${t.id}:${u2}` }, admin);
    expect(res.headers.get('Location')).toContain('m=revoked');
    expect(await grants(t.id)).toEqual([]);
    await post('/app/admin/access', { cell: `b:${t.id}:${book}` }, admin);                // none -> whole book
    expect((await grants(t.id)).map((g) => g.unit_id)).toEqual([u1, u2, u3]);
    await post('/app/admin/access', { cell: `b:${t.id}:${book}` }, admin);                // whole -> none
    expect(await grants(t.id)).toEqual([]);
    await grant(t.id, u1);
    await post('/app/admin/access', { cell: `b:${t.id}:${book}` }, admin);                // partial -> whole
    expect((await grants(t.id)).length).toBe(3);
    for (const bad of ['x:1:1', `u:${t.id}:abc`, 'u:1', '']) {
      expect((await post('/app/admin/access', { cell: bad }, admin)).status, bad).toBe(400);
    }
    expect((await post('/app/admin/access', { cell: `u:${t.id}:999999` }, admin)).status).toBe(404);
    expect((await post('/app/admin/access', { cell: `u:999999:${u1}` }, admin)).status).toBe(404);
    const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'grant.toggle'`).first<{ n: number }>();
    expect(n!.n).toBe(5);
  });

  it('bulk: give a whole book to the selected teachers, or take it back', async () => {
    const { book, u1, u2, u3 } = await library();
    const admin = await newAdmin();
    const a = await newMember();
    const b = await newMember();
    const c = await newMember();
    const body = new URLSearchParams([['_csrf', admin.csrf], ['bulk', '1'], ['bulk_book', String(book)], ['bulk_action', 'give'], ['expiry', '12'], ['sel', String(a.id)], ['sel', String(b.id)]]);
    const send = (p: URLSearchParams) => call('/app/admin/access', { method: 'POST', cookie: admin.cookie, headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://kruslide.test' }, body: p });
    let res = await send(body);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toContain('m=bulk');
    expect((await grants(a.id)).map((g) => g.unit_id)).toEqual([u1, u2, u3]);
    expect((await grants(b.id)).length).toBe(3);
    expect(await grants(c.id)).toEqual([]);
    body.set('bulk_action', 'take');
    res = await send(body);
    expect(res.headers.get('Location')).toContain('m=bulkoff');
    expect(await grants(a.id)).toEqual([]);
    // nobody selected
    res = await send(new URLSearchParams([['_csrf', admin.csrf], ['bulk', '1'], ['bulk_book', String(book)]]));
    expect(res.headers.get('Location')).toContain('m=pick');
    const log = await env.DB.prepare(`SELECT detail FROM audit_log WHERE action = 'grant.bulk' ORDER BY id LIMIT 1`).first<{ detail: string }>();
    expect(JSON.parse(log!.detail)).toMatchObject({ action: 'give', teachers: [a.id, b.id], units: 3 });
  });
});

describe('new members wait for approval (NEW_MEMBER_APPROVAL, on by default)', () => {
  it('the setting: on unless "off"', () => {
    expect(approvalRequired({} as never)).toBe(true);
    expect(approvalRequired({ NEW_MEMBER_APPROVAL: 'on' } as never)).toBe(true);
    expect(approvalRequired({ NEW_MEMBER_APPROVAL: 'off' } as never)).toBe(false);
    expect(approvalRequired({ NEW_MEMBER_APPROVAL: 'false' } as never)).toBe(false);
  });

  it('a waiting member sees only the friendly waiting page (and their profile)', async () => {
    const { book, u1 } = await library();
    const id = await makeTeacher({ waiting: true, name: 'ครูรอ' });
    const w = await loginAs(id);
    const home = await call('/app/', { cookie: w.cookie });
    expect(home.status).toBe(200);
    const page = await home.text();
    expect(page).toContain('รออนุมัติ');
    expect(page).toContain('ครูรอ');
    expect(page).toContain('https://line.me/R/ti/p/%40368lkkze');
    expect(page).not.toContain('href="/app/requests/new"');
    expect((await call('/app/profile', { cookie: w.cookie })).status).toBe(200);
    for (const path of [`/app/books/${book}`, '/app/requests', '/app/requests/new', `/app/deck/${u1}/`]) {
      const r = await call(path, { cookie: w.cookie });
      expect(r.status, path).toBe(403);
      expect(await r.text(), path).toContain('รออนุมัติ');
    }
    expect((await post(`/app/books/${book}/subscribe`, { months: '1' }, w)).status).toBe(403);
    expect((await post('/app/profile', { display_name: 'ครูรอ', school: 'โรงเรียนรอ' }, w)).status).toBe(303);
  });

  it('the owner approves (optionally with whole books); the dashboard and members page count who waits', async () => {
    const { book, u1, u2, u3 } = await library();
    const admin = await newAdmin();
    const id = await makeTeacher({ waiting: true, name: 'ครูใหม่รออนุมัติ' });
    const w = await loginAs(id);
    const dash = await (await call('/app/admin/', { cookie: admin.cookie })).text();
    expect(dash).toMatch(/<b>1<\/b><span>สมาชิกรออนุมัติ<\/span>/);
    const list = await (await call('/app/admin/members', { cookie: admin.cookie })).text();
    expect(list).toContain('ครูใหม่รออนุมัติ');
    expect(list).toContain(`action="/app/admin/members/${id}/approve"`);
    expect(list).toContain('<span class="cnt" title="รออนุมัติ">1</span>');
    const res = await post(`/app/admin/members/${id}/approve`, { book: String(book), expiry: '3' }, admin);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toContain('m=approved');
    const t = await env.DB.prepare('SELECT approved_at, approved_by FROM teachers WHERE id = ?1').bind(id).first<{ approved_at: number; approved_by: string }>();
    expect(t!.approved_at).not.toBeNull();
    expect(t!.approved_by).toBe(`admin:${admin.id}`);
    expect((await grants(id)).map((g) => g.unit_id)).toEqual([u1, u2, u3]);
    expect((await deck(u1, w)).status).toBe(200);                    // the same session works at once
    const home = await (await call('/app/', { cookie: w.cookie })).text();
    expect(home).toContain('เปิดได้ทั้งเล่ม');
    // approving twice does nothing
    const again = await post(`/app/admin/members/${id}/approve`, {}, admin);
    expect(again.headers.get('Location')).toContain('m=already');
    const log = await env.DB.prepare(`SELECT detail FROM audit_log WHERE action = 'member.approve'`).all<{ detail: string }>();
    expect(log.results).toHaveLength(1);
    expect(JSON.parse(log.results[0].detail)).toMatchObject({ books: [book], units: 3 });
  });

  describe('first LINE login', () => {
    beforeEach(() => resetJwksCache());
    afterEach(() => vi.restoreAllMocks());
    async function lineLogin(sub: string, vars?: Record<string, string>) {
      vi.restoreAllMocks();
      resetJwksCache(); // each fake LINE signs with a new key under the same key id
      const line = await newFakeLine({ sub, name: 'ครูไลน์' });
      vi.spyOn(globalThis, 'fetch').mockImplementation(lineFetch(line));
      const start = await call('/app/login', { vars });
      const loc = new URL(start.headers.get('Location')!);
      line.codeChallenge = loc.searchParams.get('code_challenge')!;
      line.nonce = loc.searchParams.get('nonce')!;
      const cb = await call(`/app/auth/callback?code=good-code&state=${loc.searchParams.get('state')}`, { cookie: `__Host-ks_oauth=${cookieValue(start, '__Host-ks_oauth')}`, vars });
      expect(cb.status).toBe(302);
      return env.DB.prepare('SELECT approved_at FROM teachers WHERE line_user_id = ?1').bind(sub).first<{ approved_at: number | null }>();
    }
    it('waits by default, is approved at once when approval is off, and the owner\'s own account never waits', async () => {
      expect((await lineLogin('U' + '1'.repeat(32)))!.approved_at).toBeNull();
      expect((await lineLogin('U' + '2'.repeat(32), { NEW_MEMBER_APPROVAL: 'off' }))!.approved_at).not.toBeNull();
      expect((await lineLogin(ADMIN_LINE))!.approved_at).not.toBeNull();
    });
  });
});

describe('housekeeping and security', () => {
  it('CSRF and Origin checks guard every new POST; members cannot use them', async () => {
    const { book, u1 } = await library();
    const admin = await newAdmin();
    const t = await newMember();
    const waitingId = await makeTeacher({ waiting: true });
    await grant(t.id, u1);
    const g = (await grants(t.id))[0];
    const cases: [string, Record<string, string>][] = [
      [`/app/admin/members/${t.id}/access`, { unit: String(u1) }],
      [`/app/admin/members/${waitingId}/approve`, {}],
      [`/app/admin/books/${book}/grant`, { teacher_id: String(t.id), unit: 'all' }],
      [`/app/admin/books/${book}/revoke`, { teacher_id: String(t.id) }],
      [`/app/admin/grants/${g.id}/revoke`, {}],
      ['/app/admin/access', { cell: `u:${t.id}:${u1}` }],
    ];
    for (const [path, fields] of cases) {
      expect((await post(path, fields, admin, { csrf: null })).status, path).toBe(403);
      expect((await post(path, fields, admin, { origin: 'https://evil.example' })).status, path).toBe(403);
      expect((await post(path, fields, admin, { origin: null, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, path).toBe(403);
      expect((await post(path, fields, t)).status, path).toBe(403);   // a member, not an admin
    }
    expect((await grants(t.id)).length).toBe(1);
    const w = await env.DB.prepare('SELECT approved_at FROM teachers WHERE id = ?1').bind(waitingId).first<{ approved_at: number | null }>();
    expect(w!.approved_at).toBeNull();
  });

  it('PDPA erasure, deleting a unit or a book removes grants; the CSV export has a grants file', async () => {
    const { book, u1, u2 } = await library();
    const admin = await newAdmin();
    const a = await newMember({ name: 'ครูในไฟล์' });
    const b = await newMember();
    await grant(a.id, u1, nowSec() + DAY);
    await grant(a.id, u2);
    await grant(b.id, u1);
    const csv = await (await call('/app/admin/export/grants.csv', { cookie: admin.cookie })).text();
    expect(csv.split('\r\n')[0]).toContain('"teacher_id","display_name","school","book","unit_position","unit","expires_at","active"');
    expect(csv).toContain('ครูในไฟล์');
    expect(csv.trim().split('\r\n')).toHaveLength(4);
    expect((await post(`/app/admin/members/${b.id}/erase`, { confirm: 'yes' }, admin)).status).toBe(303);
    expect(await grants(b.id)).toEqual([]);
    expect((await post(`/app/admin/units/${u2}/delete`, { confirm: 'yes' }, admin)).status).toBe(303);
    expect((await grants(a.id)).map((g) => g.unit_id)).toEqual([u1]);
    await grantUnits(env, a.id, [u1], null, 'admin:test', nowSec(), true);
    expect((await post(`/app/admin/books/${book}/delete`, { confirm: 'yes' }, admin)).status).toBe(303);
    expect(await grants(a.id)).toEqual([]);
  });
});
