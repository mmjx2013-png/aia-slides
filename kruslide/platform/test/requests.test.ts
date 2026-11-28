import { describe, it, expect } from 'vitest';
import { call, env, makeTeacher, loginAs, newAdmin, newMember, nowSec, post, type Who } from './helpers';
import { QUIZ, QUIZ_LENGTH, buildBrief, buildSummary, firstUnanswered, answerEn, type Answers } from '../src/lib/quiz';
import { bangkokDate, startDate } from '../src/routes/requests';
import type { BookRequest } from '../src/env';
import { scriptCsp } from '../src/lib/http';

const inDays = (d: number) => bangkokDate(nowSec() + d * 86400);
const FORM = () => ({
  subject: 'คณิตศาสตร์', grade: 'ม.1', textbook: 'สสวท. คณิตศาสตร์ ม.1 เล่ม 1', units: 'หน่วยที่ 1–4\nจำนวนเต็ม เลขยกกำลัง',
  start_date: inDays(30), note: 'ห้อง EP สอนเป็นภาษาอังกฤษ',
});

async function createReq(who: Who, fields: Record<string, string> = {}): Promise<number> {
  const res = await post('/app/requests', { ...FORM(), ...fields }, who);
  expect(res.status).toBe(303);
  const m = /^\/app\/requests\/(\d+)\/quiz\/1$/.exec(res.headers.get('Location')!);
  expect(m).not.toBeNull();
  return Number(m![1]);
}
const row = (id: number) => env.DB.prepare('SELECT * FROM book_requests WHERE id = ?1').bind(id).first<BookRequest>();
const count = async (sql: string, ...binds: unknown[]) => (await env.DB.prepare(sql).bind(...binds).first<{ n: number }>())!.n;
async function answers(id: number): Promise<Record<string, string>> {
  const { results } = await env.DB.prepare('SELECT question, choice FROM book_request_answers WHERE request_id = ?1').bind(id).all<{ question: string; choice: string }>();
  return Object.fromEntries(results.map((r) => [r.question, r.choice]));
}
async function answerAll(who: Who, id: number, choices: string[]): Promise<Response> {
  let res!: Response;
  for (let n = 1; n <= QUIZ_LENGTH; n++) {
    res = await post(`/app/requests/${id}/quiz/${n}`, { choice: choices[n - 1] }, who);
    expect(res.status).toBe(303);
  }
  return res;
}
// a, b, both in quiz order: style, colour, visuals, density, interaction, animation, charts, font, background, language
const PICKS = ['a', 'a', 'b', 'a', 'a', 'a', 'both', 'a', 'b', 'a'];

describe('request a book: create and validate', () => {
  it('the form needs a login, a school, and carries the CSRF token', async () => {
    const anon = await call('/app/requests/new');
    expect(anon.status).toBe(302);
    expect(anon.headers.get('Location')).toContain('/app/login');
    const noSchool = await newMember({ school: '' });
    const r = await call('/app/requests/new', { cookie: noSchool.cookie });
    expect(r.status).toBe(302);
    expect(r.headers.get('Location')).toContain('/app/profile?m=school');
    const who = await newMember();
    const page = await (await call('/app/requests/new', { cookie: who.cookie })).text();
    expect(page).toContain('ขอทำหนังสือ');
    expect(page).toContain(`name="_csrf" value="${who.csrf}"`);
    for (const f of ['subject', 'textbook', 'units', 'start_date', 'note']) expect(page).toContain(`name="${f}"`);
    expect(page).toContain('type="radio" name="grade" value="ม.1"');
  });

  it('creates a draft request with the cleaned form data and starts the quiz', async () => {
    const who = await newMember();
    const id = await createReq(who, { subject: '  คณิตศาสตร์  ', units: 'หน่วยที่ 1\r\n\r\n\r\nหน่วยที่ 2' });
    const r = (await row(id))!;
    expect(r.teacher_id).toBe(who.id);
    expect(r.status).toBe('draft');
    expect(r.subject).toBe('คณิตศาสตร์');
    expect(r.grade).toBe('ม.1');
    expect(r.units).toBe('หน่วยที่ 1\n\nหน่วยที่ 2');           // line breaks kept, at most one blank line
    expect(r.start_date).toBe(inDays(30));
    expect(r.summary).toBe('');
    expect(r.submitted_at).toBeNull();
    expect(await count(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'request.create' AND target = ?1`, `request:${id}`)).toBe(1);
  });

  it('refuses bad input with a message, keeps what was typed, and stores nothing', async () => {
    const who = await newMember();
    const bad: [Record<string, string>, string][] = [
      [{ subject: '' }, 'กรุณากรอกวิชา'],
      [{ grade: 'ม.9' }, 'ระดับชั้น ไม่ถูกต้อง'],
      [{ textbook: 'x' }, 'กรุณากรอกหนังสือเรียน'],
      [{ units: '   ' }, 'กรุณากรอกหน่วยหรือบทที่ต้องการ'],
      [{ start_date: '2027-02-30' }, 'วันที่ต้องการเริ่มใช้'],
      [{ start_date: inDays(-10) }, 'ต้องไม่ใช่วันที่ผ่านมาแล้ว'],
      [{ start_date: inDays(900) }, 'ไกลเกินไป'],
      [{ start_date: '16/05/2027' }, 'วันที่ต้องการเริ่มใช้'],
      [{ note: 'ก'.repeat(1001) }, 'หมายเหตุยาวเกินไป'],
    ];
    for (const [fields, msg] of bad) {
      const res = await post('/app/requests', { ...FORM(), textbook: 'หนังสือ <b>พิเศษ</b>', ...fields }, who);
      expect(res.status, JSON.stringify(fields)).toBe(400);
      const page = await res.text();
      expect(page).toContain(msg);
      if (!('textbook' in fields)) expect(page).toContain('value="หนังสือ &lt;b&gt;พิเศษ&lt;/b&gt;"'); // kept, escaped
    }
    expect(await count('SELECT COUNT(*) AS n FROM book_requests')).toBe(0);
  });

  it('startDate accepts today and real dates only', () => {
    const now = nowSec();
    expect(startDate(bangkokDate(now), now)).toBe(bangkokDate(now));
    expect(() => startDate('2027-13-01', now)).toThrow();
    expect(() => startDate('', now)).toThrow();
  });

  it('a blocked member cannot ask, and a member may send at most 10 requests a day', async () => {
    const blocked = await newMember({ status: 'blocked' });
    expect((await post('/app/requests', FORM(), blocked)).status).toBe(403);
    const who = await newMember();
    for (let i = 0; i < 10; i++) await createReq(who);
    expect((await post('/app/requests', FORM(), who)).status).toBe(429);
    expect(await count('SELECT COUNT(*) AS n FROM book_requests WHERE teacher_id = ?1', who.id)).toBe(10);
  });
});

describe('style quiz: answers are stored', () => {
  it('shows two sample slides, "both" and the progress; the page may load only our one script', async () => {
    const who = await newMember();
    const id = await createReq(who);
    const res = await call(`/app/requests/${id}/quiz/1`, { cookie: who.cookie });
    expect(res.status).toBe(200);
    const page = await res.text();
    expect(page).toContain('src="/app/static/quiz/style-a.webp"');
    expect(page).toContain('src="/app/static/quiz/style-b.webp"');
    expect(page).toContain('name="choice" value="both"');
    expect(page).toContain('ได้ทั้งคู่');
    expect(page).toContain(`action="/app/requests/${id}/quiz/1"`);
    expect(page).toContain(`name="_csrf" value="${who.csrf}"`);
    expect(page).toContain('<script src="/app/static/app.js" defer></script>');
    const csp = res.headers.get('Content-Security-Policy')!;
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain('script-src https://kruslide.test/app/static/app.js');
    expect(csp).not.toContain("'self' 'unsafe");
    expect(csp).not.toContain('unsafe-inline');
    expect((await call(`/app/requests/${id}/quiz/0`, { cookie: who.cookie })).status).toBe(404);
    expect((await call(`/app/requests/${id}/quiz/11`, { cookie: who.cookie })).status).toBe(404);
  });

  it('stores one answer per question, lets the teacher change it, and moves on', async () => {
    const who = await newMember();
    const id = await createReq(who);
    let res = await post(`/app/requests/${id}/quiz/1`, { choice: 'a' }, who);
    expect(res.headers.get('Location')).toBe(`/app/requests/${id}/quiz/2`);
    res = await post(`/app/requests/${id}/quiz/1`, { choice: 'both' }, who);           // changed their mind
    expect(res.headers.get('Location')).toBe(`/app/requests/${id}/quiz/2`);
    res = await post(`/app/requests/${id}/quiz/3`, { choice: 'b' }, who);              // skipped 2
    expect(res.headers.get('Location')).toBe(`/app/requests/${id}/quiz/4`);
    expect(await answers(id)).toEqual({ style: 'both', visuals: 'b' });
    expect((await row(id))!.status).toBe('draft');
    // the earlier pick is marked on the page when they come back
    expect(await (await call(`/app/requests/${id}/quiz/3`, { cookie: who.cookie })).text()).toMatch(/class="pick was"[^>]*value="b"/);
    // bad choices are refused
    expect((await post(`/app/requests/${id}/quiz/2`, { choice: 'c' }, who)).status).toBe(400);
    expect((await post(`/app/requests/${id}/quiz/2`, {}, who)).status).toBe(400);
    expect((await post(`/app/requests/${id}/quiz/99`, { choice: 'a' }, who)).status).toBe(404);
    expect(Object.keys(await answers(id))).toHaveLength(2);
  });

  it('after the last answer the request is sent with its summary; the teacher sees the thank-you', async () => {
    const who = await newMember();
    const id = await createReq(who);
    // answer 2..10 first, then 1: finishing out of order still sends it
    for (let n = 2; n <= QUIZ_LENGTH; n++) await post(`/app/requests/${id}/quiz/${n}`, { choice: PICKS[n - 1] }, who);
    expect((await row(id))!.status).toBe('draft');
    const res = await post(`/app/requests/${id}/quiz/1`, { choice: PICKS[0] }, who);
    expect(res.headers.get('Location')).toBe(`/app/requests/${id}?m=sent`);
    const r = (await row(id))!;
    expect(r.status).toBe('new');
    expect(r.submitted_at).not.toBeNull();
    expect(r.summary).toBe('Style A modern clean · vivid colours · illustrations · rich animation · one idea per slide · many interactive tasks · Thai · rounded font · playful or formal charts · decorated background');
    expect(Object.keys(await answers(id))).toHaveLength(QUIZ_LENGTH);
    const page = await (await call(`/app/requests/${id}?m=sent`, { cookie: who.cookie })).text();
    expect(page).toContain('ขอบคุณ ทีมงานจะติดต่อกลับทาง LINE');
    expect(page).toContain('/app/static/quiz/style-a-sm.webp');   // thumbnails of the chosen samples
    expect(page).toContain('/app/static/quiz/charts-a-sm.webp');  // "both": both halves
    expect(page).toContain('/app/static/quiz/charts-b-sm.webp');
    expect(page).not.toContain('/app/static/quiz/style-b-sm.webp');
    expect(await count(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'request.submit'`)).toBe(1);
  });

  it('a sent request is locked: answers cannot change and the quiz pages lead to the request', async () => {
    const who = await newMember();
    const id = await createReq(who);
    await answerAll(who, id, PICKS);
    const res = await post(`/app/requests/${id}/quiz/1`, { choice: 'b' }, who);
    expect(res.headers.get('Location')).toBe(`/app/requests/${id}?m=locked`);
    expect((await answers(id)).style).toBe('a');
    const get = await call(`/app/requests/${id}/quiz/2`, { cookie: who.cookie });
    expect(get.status).toBe(302);
    expect(get.headers.get('Location')).toBe(`/app/requests/${id}`);
    expect(await count(`SELECT COUNT(*) AS n FROM audit_log WHERE action = 'request.submit'`)).toBe(1);
  });
});

describe('style quiz: summary and brief', () => {
  it('builds the owner\'s example summary, most important first', () => {
    const a: Answers = { style: 'a', colour: 'a', visuals: 'b', animation: 'a', density: 'a', interaction: 'a', language: 'a', font: 'a' };
    expect(buildSummary(a)).toBe('Style A modern clean · vivid colours · illustrations · rich animation · one idea per slide · many interactive tasks · Thai · rounded font');
  });

  it('handles "both", the other side and unanswered questions', () => {
    expect(buildSummary({})).toBe('');
    expect(buildSummary({ colour: 'both', style: 'b' })).toBe('Style B notebook · vivid or calm colours');
    expect(buildSummary({ language: 'b', background: 'a', charts: 'b', density: 'b' })).toBe('more on one slide · English (EP) · formal charts · plain background');
    const q = QUIZ.find((x) => x.key === 'font')!;
    expect(answerEn(q, 'b')).toBe('sharp font');
    expect(firstUnanswered({})).toBe(1);
    expect(firstUnanswered({ style: 'a', colour: 'b' })).toBe(3);
    expect(firstUnanswered(Object.fromEntries(QUIZ.map((x) => [x.key, 'a'])))).toBe(0);
  });

  it('the brief has what the build needs and no personal data', () => {
    const answers: Answers = Object.fromEntries(QUIZ.map((x, i) => [x.key, PICKS[i]])) as Answers;
    const brief = buildBrief({
      id: 7, subject: 'คณิตศาสตร์', grade: 'ม.1', textbook: 'สสวท. เล่ม 1', units: 'หน่วยที่ 1–4', start_date: '2027-05-16', note: '',
      school: 'โรงเรียนทดสอบ', summary: buildSummary(answers), submitted_at: 1_800_000_000, created_at: 1_799_000_000,
    }, answers);
    expect(brief).toContain('KruSlide book request #7 (2027-01-15)');
    expect(brief).toContain('Subject: คณิตศาสตร์');
    expect(brief).toContain('Units or chapters needed: หน่วยที่ 1–4');
    expect(brief).toContain('Wanted from: 2027-05-16');
    expect(brief).toContain('Style summary: Style A modern clean · vivid colours');
    expect(brief).toContain('- Visuals: illustrations (rather than real photos)');
    expect(brief).toContain('- Charts: either is fine (playful charts / formal charts)');
    expect(brief).toContain('no gradient text');
    expect(brief).not.toMatch(/U[0-9a-f]{32}/);
  });
});

describe('admin: book requests', () => {
  it('the owner sees every teacher\'s requests; a member cannot', async () => {
    const t1 = await newMember({ name: 'ครูหนึ่ง' });
    const t2 = await newMember({ name: 'ครูสอง' });
    const r1 = await createReq(t1, { subject: 'วิชาของครูหนึ่ง' });
    await answerAll(t1, r1, PICKS);
    const r2 = await createReq(t2, { subject: 'วิชาของครูสอง' });   // still a draft
    const admin = await newAdmin();
    const list = await (await call('/app/admin/requests?status=all', { cookie: admin.cookie })).text();
    expect(list).toContain('วิชาของครูหนึ่ง');
    expect(list).toContain('วิชาของครูสอง');
    expect(list).toContain('ยังไม่จบแบบทดสอบ');
    const open = await (await call('/app/admin/requests', { cookie: admin.cookie })).text();  // default: the ones to act on
    expect(open).toContain('วิชาของครูหนึ่ง');
    expect(open).not.toContain('วิชาของครูสอง');
    expect(open).toContain('/app/static/quiz/style-a-sm.webp');
    expect(open).toContain(`data-copy="brief-${r1}"`);
    expect(open).toContain(`<template id="brief-${r1}">KruSlide book request #${r1}`);
    for (const path of ['/app/admin/requests', `/app/admin/requests/${r1}`]) {
      expect((await call(path, { cookie: t1.cookie })).status).toBe(403);
    }
    expect((await post(`/app/admin/requests/${r2}`, { status: 'done', owner_note: 'x' }, t1)).status).toBe(403);
    expect((await row(r2))!.status).toBe('draft');
  });

  it('the dashboard counts new requests', async () => {
    const admin = await newAdmin();
    const t = await newMember();
    for (let i = 0; i < 2; i++) await answerAll(t, await createReq(t), PICKS);
    await createReq(t); // a draft does not count
    const dash = await (await call('/app/admin/', { cookie: admin.cookie })).text();
    expect(dash).toMatch(/<b>2<\/b><span>คำขอทำหนังสือใหม่<\/span>/);
    expect(dash).toContain('<span class="cnt" title="คำขอใหม่">2</span>');
  });

  it('the owner changes the status and keeps a private note; the teacher never sees the note', async () => {
    const t = await newMember();
    const id = await createReq(t);
    await answerAll(t, id, PICKS);
    const admin = await newAdmin();
    for (const status of ['quoted', 'building', 'done', 'declined', 'new'] as const) {
      const res = await post(`/app/admin/requests/${id}`, { status, owner_note: `โน้ตลับ ${status}\nบรรทัดสอง` }, admin);
      expect(res.status).toBe(303);
      expect((await row(id))!.status).toBe(status);
    }
    await post(`/app/admin/requests/${id}`, { status: 'quoted', owner_note: 'เสนอ 990 บาท ส่งแล้ว' }, admin);
    const r = (await row(id))!;
    expect(r.status).toBe('quoted');
    expect(r.owner_note).toBe('เสนอ 990 บาท ส่งแล้ว');
    const log = await env.DB.prepare(`SELECT actor, detail FROM audit_log WHERE action = 'request.update' ORDER BY id DESC`).first<{ actor: string; detail: string }>();
    expect(log!.actor).toBe(`admin:${admin.id}`);
    expect(JSON.parse(log!.detail)).toEqual({ from: 'new', to: 'quoted' });
    const teacherView = await (await call(`/app/requests/${id}`, { cookie: t.cookie })).text();
    expect(teacherView).toContain('ส่งใบเสนอราคาแล้ว');
    expect(teacherView).not.toContain('เสนอ 990 บาท');
    // bad values are refused
    expect((await post(`/app/admin/requests/${id}`, { status: 'hacked', owner_note: '' }, admin)).status).toBe(400);
    expect((await post(`/app/admin/requests/${id}`, { status: 'draft', owner_note: '' }, admin)).status).toBe(400);
    expect((await post(`/app/admin/requests/${id}`, { status: 'done', owner_note: 'x'.repeat(2001) }, admin)).status).toBe(400);
    expect((await post('/app/admin/requests/999999', { status: 'done', owner_note: '' }, admin)).status).toBe(404);
    expect((await row(id))!.status).toBe('quoted');
  });

  it('the request page shows the brief to copy, the answers with thumbnails, and allows our script only', async () => {
    const t = await newMember({ school: 'โรงเรียน <สาธิต>' });
    const id = await createReq(t, { note: 'ขอโจทย์ท้ายหน่วย' });
    await answerAll(t, id, PICKS);
    const admin = await newAdmin();
    const res = await call(`/app/admin/requests/${id}`, { cookie: admin.cookie });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Security-Policy')).toContain('script-src https://kruslide.test/app/static/app.js');
    const page = await res.text();
    expect(page).toContain('<textarea id="brief" class="brief" readonly>KruSlide book request');
    expect(page).toContain('School: โรงเรียน &lt;สาธิต&gt;');
    expect(page).toContain('data-copy="brief"');
    expect(page).toContain('/app/static/quiz/language-b-sm.webp');
    expect(page).toContain('ขอโจทย์ท้ายหน่วย');
    expect((await call('/app/admin/requests/999999', { cookie: admin.cookie })).status).toBe(404);
  });
});

describe('CSRF on the new POSTs', () => {
  it('creating a request needs the token and a same-origin request', async () => {
    const who = await newMember();
    expect((await post('/app/requests', FORM(), who, { csrf: null })).status).toBe(403);
    expect((await post('/app/requests', FORM(), who, { csrf: 'x'.repeat(43) })).status).toBe(403);
    expect((await post('/app/requests', FORM(), who, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await post('/app/requests', FORM(), who, { origin: null, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status).toBe(403);
    expect((await post('/app/requests', FORM(), null, { csrf: 'anything' })).status).toBe(401); // no session: refused before anything is read
    expect(await count('SELECT COUNT(*) AS n FROM book_requests')).toBe(0);
  });

  it('a quiz answer needs the token', async () => {
    const who = await newMember();
    const other = await newMember();
    const id = await createReq(who);
    expect((await post(`/app/requests/${id}/quiz/1`, { choice: 'a' }, who, { csrf: null })).status).toBe(403);
    expect((await post(`/app/requests/${id}/quiz/1`, { choice: 'a' }, who, { csrf: other.csrf })).status).toBe(403);
    expect((await post(`/app/requests/${id}/quiz/1`, { choice: 'a' }, who, { origin: 'https://evil.example' })).status).toBe(403);
    expect(await answers(id)).toEqual({});
  });

  it('an admin status change needs the token', async () => {
    const t = await newMember();
    const id = await createReq(t);
    await answerAll(t, id, PICKS);
    const admin = await newAdmin();
    expect((await post(`/app/admin/requests/${id}`, { status: 'done', owner_note: 'x' }, admin, { csrf: null })).status).toBe(403);
    expect((await post(`/app/admin/requests/${id}`, { status: 'done', owner_note: 'x' }, admin, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await row(id))!.status).toBe('new');
  });

  it('every form on the new pages carries the token', async () => {
    const t = await newMember();
    const id = await createReq(t);
    const admin = await newAdmin();
    await answerAll(t, id, PICKS);
    const id2 = await createReq(t);
    const pages: [Who, string][] = [[t, '/app/requests/new'], [t, `/app/requests/${id2}/quiz/1`], [t, '/app/requests'], [admin, '/app/admin/requests'], [admin, `/app/admin/requests/${id}`]];
    for (const [who, path] of pages) {
      const html = await (await call(path, { cookie: who.cookie })).text();
      const forms = html.match(/<form method="post"[\s\S]*?<\/form>/g) || [];
      expect(forms.length, path).toBeGreaterThanOrEqual(1);
      for (const f of forms) expect(f, path).toContain(`name="_csrf" value="${who.csrf}"`);
    }
  });
});

describe('a teacher sees only their own requests', () => {
  it('lists only their own, and another teacher\'s request is "not found" everywhere', async () => {
    const a = await newMember();
    const b = await newMember();
    const ida = await createReq(a, { subject: 'วิชาของเอ' });
    await answerAll(a, ida, PICKS);
    const idb = await createReq(b, { subject: 'วิชาของบี' });
    const listA = await (await call('/app/requests', { cookie: a.cookie })).text();
    expect(listA).toContain('วิชาของเอ');
    expect(listA).not.toContain('วิชาของบี');
    expect((await call(`/app/requests/${idb}`, { cookie: a.cookie })).status).toBe(404);
    expect((await call(`/app/requests/${idb}/quiz/1`, { cookie: a.cookie })).status).toBe(404);
    expect((await post(`/app/requests/${idb}/quiz/1`, { choice: 'a' }, a)).status).toBe(404);
    expect(await answers(idb)).toEqual({});
    expect((await call(`/app/requests/${ida}`, { cookie: b.cookie })).status).toBe(404);
    // the owner too uses the admin page, not the teacher's
    const admin = await newAdmin();
    expect((await call(`/app/requests/${ida}`, { cookie: admin.cookie })).status).toBe(404);
  });

  it('PDPA erasure deletes the member\'s requests and their answers', async () => {
    const tid = await makeTeacher({ name: 'ครูลบ' });
    const t = await loginAs(tid);
    const id = await createReq(t);
    await answerAll(t, id, PICKS);
    const admin = await newAdmin();
    expect((await post(`/app/admin/members/${tid}/erase`, { confirm: 'yes' }, admin)).status).toBe(303);
    expect(await count('SELECT COUNT(*) AS n FROM book_requests WHERE teacher_id = ?1', tid)).toBe(0);
    expect(await count('SELECT COUNT(*) AS n FROM book_request_answers WHERE request_id = ?1', id)).toBe(0);
  });
});

describe('quiz images and the app script', () => {
  it('serves known quiz images from the bucket, nothing else', async () => {
    await env.DECKS.put('shared/quiz/style-a.webp', new Uint8Array([82, 73, 70, 70]));
    await env.DECKS.put('shared/quiz/secret.webp', new Uint8Array([1]));
    const ok = await call('/app/static/quiz/style-a.webp');
    expect(ok.status).toBe(200);
    expect(ok.headers.get('Content-Type')).toBe('image/webp');
    expect(ok.headers.get('Cache-Control')).toContain('public');
    expect([...new Uint8Array(await ok.arrayBuffer())]).toEqual([82, 73, 70, 70]);
    expect((await call('/app/static/quiz/secret.webp')).status).toBe(404);     // not a quiz file name
    expect((await call('/app/static/quiz/style-b.webp')).status).toBe(404);    // known name, not uploaded
    expect((await call('/app/static/quiz/..%2Ffonts%2FInter-Bold.woff2')).status).toBe(404);
  });

  it('the script policy names one exact URL, and a malformed origin allows no script at all', () => {
    expect(scriptCsp('https://kruslide.example')).toMatch(/; script-src https:\/\/kruslide\.example\/app\/static\/app\.js$/);
    expect(scriptCsp('http://127.0.0.1:8787')).toContain('script-src http://127.0.0.1:8787/app/static/app.js');
    expect(scriptCsp('https://a.example; script-src *')).toMatch(/script-src 'none'$/);
  });

  it('serves the script and the logo; the logo is the official mark C', async () => {
    const js = await call('/app/static/app.js');
    expect(js.status).toBe(200);
    expect(js.headers.get('Content-Type')).toBe('text/javascript; charset=utf-8');
    expect(await js.text()).toContain('data-quiz');
    const svg = await call('/app/static/favicon.svg');
    expect(svg.headers.get('Content-Type')).toBe('image/svg+xml');
    expect(await svg.text()).toContain('fill="#FFC83D"');
    const png = await call('/app/static/apple-touch-icon.png');
    expect(png.headers.get('Content-Type')).toBe('image/png');
    expect([...new Uint8Array(await png.arrayBuffer()).slice(1, 4)]).toEqual([80, 78, 71]); // "PNG"
  });
});
