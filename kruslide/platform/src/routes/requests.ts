import type { BookRequest, Ctx } from '../env';
import { html, Safe } from '../lib/html';
import { HttpError, htmlResponse, redirect, scriptCsp } from '../lib/http';
import { page, flash, csrfField, fmtDateTime, fmtIsoDate, icon, emptyArt, requestBadge, REQUEST_STATUS } from '../views/layout';
import * as db from '../db';
import { checkCsrf } from '../lib/csrf';
import { cleanMultiline, cleanText, idParam, oneOf, readForm, str } from '../lib/validate';
import { rateLimit } from '../lib/ratelimit';
import { LIMITS, lineOa } from '../lib/config';
import { audit } from '../lib/audit';
import { requireTeacher } from './member';
import {
  QUIZ, QUIZ_LENGTH, CHOICES, question, imagePath, firstUnanswered, buildSummary, answerTh, type Answers, type Choice,
} from '../lib/quiz';

export const GRADES = ['อนุบาล', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6', 'อื่น ๆ'] as const;
const SUBJECTS = ['คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ', 'ภาษาไทย', 'สังคมศึกษา', 'ประวัติศาสตร์', 'Mathematics (EP)', 'Science (EP)', 'คอมพิวเตอร์ / วิทยาการคำนวณ'];
const PUBLISHERS = ['สสวท.', 'อจท.', 'พว.', 'แม็ค', 'วพ.', 'ซีเอ็ดยูเคชั่น'];

/** Bangkok calendar date (YYYY-MM-DD) of a Unix time. */
export function bangkokDate(t: number): string {
  return new Date((t + 7 * 3600) * 1000).toISOString().slice(0, 10);
}

/** A real calendar date, from yesterday (time zones) up to two years ahead. */
export function startDate(v: string, now: number): string {
  const s = v.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const bad = () => new HttpError(400, 'กรุณาเลือกวันที่ต้องการเริ่มใช้ให้ถูกต้อง', 'start_date');
  if (!m) throw bad();
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.toISOString().slice(0, 10) !== s) throw bad();             // e.g. 2027-02-30
  if (s < bangkokDate(now - 86400)) throw new HttpError(400, 'วันที่ต้องการเริ่มใช้ต้องไม่ใช่วันที่ผ่านมาแล้ว', 'start_date');
  if (s > bangkokDate(now + 2 * 366 * 86400)) throw new HttpError(400, 'วันที่ต้องการเริ่มใช้ไกลเกินไป (ไม่เกิน 2 ปี)', 'start_date');
  return s;
}

export function readRequest(form: FormData, now: number): db.RequestInput {
  return {
    subject: cleanText(str(form, 'subject'), { min: 1, max: 80, field: 'วิชา' }),
    grade: oneOf(str(form, 'grade'), GRADES, 'ระดับชั้น'),
    textbook: cleanText(str(form, 'textbook'), { min: 2, max: 160, field: 'หนังสือเรียน / สำนักพิมพ์' }),
    units: cleanMultiline(str(form, 'units'), { min: 1, max: 500, field: 'หน่วยหรือบทที่ต้องการ' }),
    startDate: startDate(str(form, 'start_date'), now),
    note: cleanMultiline(str(form, 'note'), { max: 1000, field: 'หมายเหตุ' }),
  };
}

/** The teacher's own request, or 404 (also for an admin: the owner uses the admin page). */
async function myRequest(ctx: Ctx, teacherId: number): Promise<BookRequest> {
  const r = await db.getRequest(ctx.env, idParam(ctx.params.id));
  if (!r || r.teacher_id !== teacherId) throw new HttpError(404, 'ไม่พบคำขอนี้');
  return r;
}

// ---------- the form ----------
function requestForm(ctx: Ctx, v: Partial<Record<string, string>>, error: string, errField = ''): Safe {
  const today = bangkokDate(ctx.now);
  const grade = v.grade ?? '';
  const invalid = (f: string) => (errField === f ? html` aria-invalid="true"` : '');
  return html`<div class="form-card">
<a class="back" href="/app/requests">${icon('left')}คำขอทำหนังสือ</a>
<div class="card">
  <div class="form-head"><span class="ic-tile">${icon('spark')}</span><div><h1>ขอทำหนังสือ</h1><p>บอกเราว่าสอนเล่มไหน แล้วเลือกสไตล์ที่ชอบ ใช้เวลาประมาณ 2 นาที</p></div></div>
  <ol class="stepper" aria-label="ขั้นตอน"><li class="now"><b>1</b>ข้อมูลหนังสือ</li><li><b>2</b>เลือกสไตล์ ${QUIZ_LENGTH} ข้อ</li><li><b>3</b>ทีมงานติดต่อกลับ</li></ol>
  ${error ? html`<div class="flash bad" role="alert">${error}</div>` : ''}
  <form method="post" action="/app/requests">${csrfField(ctx)}
    <div class="cols">
      <div class="field"><label for="subject">วิชา</label>
        <input id="subject" name="subject" type="text" required maxlength="80" list="subjects" value="${v.subject ?? ''}" placeholder="เช่น คณิตศาสตร์"${invalid('วิชา')}>
        <datalist id="subjects">${SUBJECTS.map((s) => html`<option value="${s}">`)}</datalist></div>
      <div class="field"><label for="textbook">หนังสือเรียน / สำนักพิมพ์</label>
        <input id="textbook" name="textbook" type="text" required minlength="2" maxlength="160" list="publishers" value="${v.textbook ?? ''}" placeholder="เช่น สสวท. คณิตศาสตร์ ม.1 เล่ม 1"${invalid('หนังสือเรียน / สำนักพิมพ์')}>
        <datalist id="publishers">${PUBLISHERS.map((s) => html`<option value="${s}">`)}</datalist></div>
    </div>
    <fieldset class="radios field"><legend>ระดับชั้น</legend>
      ${GRADES.map((g, i) => html`<label><input type="radio" name="grade" value="${g}"${g === grade ? html` checked` : ''}${i === 0 ? html` required` : ''}><span>${g}</span></label>`)}
    </fieldset>
    <div class="field"><label for="units">หน่วยหรือบทที่ต้องการ</label>
      <textarea id="units" name="units" required maxlength="500" rows="3" placeholder="เช่น ทั้งเล่ม หรือ หน่วยที่ 1–4 (จำนวนเต็ม, เลขยกกำลัง, ทศนิยม, รูปเรขาคณิต)"${invalid('หน่วยหรือบทที่ต้องการ')}>${v.units ?? ''}</textarea></div>
    <div class="cols">
      <div class="field"><label for="start_date">อยากเริ่มใช้สอนวันที่</label>
        <input id="start_date" name="start_date" type="date" required min="${today}" value="${v.start_date ?? ''}"${invalid('start_date')}>
        <div class="hint">เราจะวางแผนให้หน่วยแรกพร้อมก่อนวันนี้</div></div>
    </div>
    <div class="field"><label for="note">หมายเหตุ <span class="opt">(ไม่บังคับ)</span></label>
      <textarea id="note" name="note" maxlength="1000" rows="3" placeholder="เช่น นักเรียนชอบเกม อยากได้โจทย์ท้ายหน่วยเยอะ ๆ ห้อง EP สอนเป็นภาษาอังกฤษ">${v.note ?? ''}</textarea></div>
    <button class="btn big block" type="submit">ถัดไป: เลือกสไตล์ ${icon('right')}</button>
    <p class="hint">ยังไม่มีค่าใช้จ่าย ทีมงานจะเสนอราคาให้ทาง LINE ก่อนเริ่มทำ</p>
  </form>
</div></div>`;
}

/** GET /app/requests/new */
export async function newRequest(ctx: Ctx): Promise<Response> {
  const t = requireTeacher(ctx);
  if (!t.school) return redirect(`/app/profile?m=school&next=${encodeURIComponent('/app/requests/new')}`, 302);
  return htmlResponse(page(ctx, { title: 'ขอทำหนังสือ', nav: 'new', body: requestForm(ctx, {}, '') }));
}

/** POST /app/requests: create a draft request, then start the quiz. */
export async function createRequest(ctx: Ctx): Promise<Response> {
  const t = requireTeacher(ctx);
  const form = await readForm(ctx.req);
  checkCsrf(ctx, form);
  await rateLimit(ctx.env, `member:${t.id}`, LIMITS.member, ctx.now);
  if (!t.school) return redirect(`/app/profile?m=school&next=${encodeURIComponent('/app/requests/new')}`);
  let input: db.RequestInput;
  try {
    input = readRequest(form, ctx.now);
  } catch (e) {
    if (!(e instanceof HttpError) || e.status !== 400) throw e;
    const values = Object.fromEntries(['subject', 'grade', 'textbook', 'units', 'start_date', 'note'].map((k) => [k, str(form, k).slice(0, 1000)]));
    return htmlResponse(page(ctx, { title: 'ขอทำหนังสือ', nav: 'new', body: requestForm(ctx, values, e.message, e.detail) }), 400);
  }
  await rateLimit(ctx.env, `requests:${t.id}`, LIMITS.requestDaily, ctx.now);
  const id = await db.createRequest(ctx.env, t.id, input, ctx.now);
  await audit(ctx.env, ctx.now, `teacher:${t.id}`, 'request.create', `request:${id}`, { subject: input.subject, grade: input.grade });
  return redirect(`/app/requests/${id}/quiz/1`);
}

// ---------- the quiz ----------
function progress(answers: Answers, n: number): Safe {
  const done = QUIZ.filter((q) => answers[q.key]).length;
  return html`<ol class="qprog" aria-hidden="true">${QUIZ.map((q, i) =>
    html`<li class="${i + 1 === n ? 'now' : answers[q.key] ? 'done' : ''}"></li>`)}</ol>
    <span class="qcount" role="status">${n} <span>/ ${QUIZ_LENGTH}</span><span class="sr"> (ตอบแล้ว ${done} ข้อ)</span></span>`;
}

function pickButton(key: string, side: 'a' | 'b', label: string, hint: string, was: boolean, first: boolean): Safe {
  return html`<button class="pick${was ? ' was' : ''}" type="submit" name="choice" value="${side}" aria-label="เลือก ${side.toUpperCase()}: ${label}">
    <img src="${imagePath(key, side)}" srcset="${imagePath(key, side, true)} 480w, ${imagePath(key, side)} 1600w" sizes="(max-width:760px) 92vw, 540px"
      width="1600" height="900" alt="ตัวอย่างสไลด์ ${side.toUpperCase()}: ${label}" decoding="async"${first ? html` fetchpriority="high"` : ''}>
    <span class="cap"><span class="ab" aria-hidden="true">${side.toUpperCase()}</span><span><b>${label}</b><small>${hint}</small></span></span>
    <span class="tick" aria-hidden="true">${icon('check')}</span>
  </button>`;
}

/** GET /app/requests/:id/quiz/:n */
export async function quizPage(ctx: Ctx): Promise<Response> {
  const t = requireTeacher(ctx);
  const r = await myRequest(ctx, t.id);
  if (r.status !== 'draft') return redirect(`/app/requests/${r.id}`, 302);
  const n = Number(ctx.params.n);
  const q = /^\d{1,2}$/.test(ctx.params.n) ? question(n) : undefined;
  if (!q) throw new HttpError(404, 'ไม่พบคำถามข้อนี้');
  const answers = await db.getAnswers(ctx.env, r.id);
  const was = answers[q.key];
  const next = question(n + 1);
  const body = html`<form method="post" action="/app/requests/${r.id}/quiz/${n}" class="quiz" data-quiz
    data-next="${next ? `${imagePath(next.key, 'a')} ${imagePath(next.key, 'b')}` : ''}">${csrfField(ctx)}
  <div class="qh"><span class="kicker">ข้อ ${n} จาก ${QUIZ_LENGTH} · ${r.subject} ${r.grade}</span>
    <h1>${q.q}</h1><p>แตะภาพที่ชอบมากกว่า ไม่มีถูกหรือผิด</p></div>
  <div class="duel">
    ${pickButton(q.key, 'a', q.a.th, q.a.hint, was === 'a', true)}
    <span class="vs" aria-hidden="true">หรือ</span>
    ${pickButton(q.key, 'b', q.b.th, q.b.hint, was === 'b', false)}
  </div>
  <div class="qfoot">
    <button class="btn ghost bothbtn${was === 'both' ? ' was' : ''}" type="submit" name="choice" value="both">ได้ทั้งคู่</button>
    <div class="qnav">${n > 1 ? html`<a href="/app/requests/${r.id}/quiz/${n - 1}">${icon('left')} ข้อก่อนหน้า</a>` : html`<a href="/app/requests">บันทึกไว้ทำต่อทีหลัง</a>`}
      <span class="keys"><kbd>←</kbd> <kbd>→</kbd> เลือก · <kbd>↓</kbd> ได้ทั้งคู่</span></div>
  </div>
</form>`;
  return htmlResponse(
    page(ctx, { title: `เลือกสไตล์ ข้อ ${n}`, focus: { top: progress(answers, n) }, script: true, body }),
    200, { 'Content-Security-Policy': scriptCsp(ctx.origin) },
  );
}

/** POST /app/requests/:id/quiz/:n: store one answer, go to the next open question, or finish. */
export async function answer(ctx: Ctx): Promise<Response> {
  const t = requireTeacher(ctx);
  const form = await readForm(ctx.req);
  checkCsrf(ctx, form);
  await rateLimit(ctx.env, `quiz:${t.id}`, LIMITS.quiz, ctx.now);
  const r = await myRequest(ctx, t.id);
  const n = Number(ctx.params.n);
  const q = /^\d{1,2}$/.test(ctx.params.n) ? question(n) : undefined;
  if (!q) throw new HttpError(404, 'ไม่พบคำถามข้อนี้');
  const choice = oneOf(str(form, 'choice'), CHOICES, 'คำตอบ') as Choice;
  if (r.status !== 'draft' || !(await db.saveAnswer(ctx.env, r.id, q.key, choice, ctx.now))) {
    return redirect(`/app/requests/${r.id}?m=locked`);
  }
  const answers = await db.getAnswers(ctx.env, r.id);
  const after = QUIZ.findIndex((x, i) => i >= n && !answers[x.key]);
  const next = after >= 0 ? after + 1 : firstUnanswered(answers);
  if (next) return redirect(`/app/requests/${r.id}/quiz/${next}`);
  const summary = buildSummary(answers);
  if (await db.submitRequest(ctx.env, r.id, summary, ctx.now)) {
    await audit(ctx.env, ctx.now, `teacher:${t.id}`, 'request.submit', `request:${r.id}`);
  }
  return redirect(`/app/requests/${r.id}?m=sent`);
}

// ---------- the teacher's view of a request ----------
/** Thumbnails of the chosen sample slides (both halves for "ได้ทั้งคู่"). */
export function choiceThumbs(answers: Answers, small = false): Safe {
  const lazy = small ? html` loading="lazy"` : ''; // the admin list can be long; the teacher's page has 10 small images
  const items = QUIZ.filter((q) => answers[q.key]);
  if (!items.length) return html`<p class="muted small">ยังไม่ได้เลือกสไตล์</p>`;
  return html`<div class="picks${small ? ' sm' : ''}">${items.map((q) => {
    const c = answers[q.key]!;
    const sides = c === 'both' ? (['a', 'b'] as const) : ([c] as const);
    return html`<figure class="thumb"><div class="im${sides.length > 1 ? ' two' : ''}">${sides.map((s) =>
      html`<img src="${imagePath(q.key, s, true)}" width="480" height="270" alt=""${lazy} decoding="async">`)}</div>
      <figcaption><b>${answerTh(q, c)}</b>${q.th}</figcaption></figure>`;
  })}</div>`;
}

function trackOf(s: BookRequest['status']): Safe {
  if (s === 'declined') return html``;
  const steps: [BookRequest['status'], string][] = [['new', 'ส่งคำขอ'], ['quoted', 'เสนอราคา'], ['building', 'กำลังทำ'], ['done', 'เสร็จ']];
  const at = steps.findIndex(([k]) => k === s);
  return html`<ol class="track" aria-label="ความคืบหน้า">${steps.map(([, label], i) =>
    html`<li class="${i < at ? 'done' : i === at ? 'done now' : ''}">${label}</li>`)}</ol>`;
}

export function requestFacts(r: BookRequest): Safe {
  return html`<dl class="facts">
    <div><dt>วิชา</dt><dd>${r.subject}</dd></div>
    <div><dt>ระดับชั้น</dt><dd>${r.grade}</dd></div>
    <div><dt>หนังสือเรียน / สำนักพิมพ์</dt><dd>${r.textbook}</dd></div>
    <div><dt>เริ่มใช้</dt><dd>${fmtIsoDate(r.start_date)}</dd></div>
    <div class="full"><dt>หน่วยหรือบทที่ต้องการ</dt><dd class="pre">${r.units}</dd></div>
    ${r.note ? html`<div class="full"><dt>หมายเหตุ</dt><dd class="pre">${r.note}</dd></div>` : ''}
  </dl>`;
}

/** GET /app/requests/:id */
export async function requestPage(ctx: Ctx): Promise<Response> {
  const t = requireTeacher(ctx);
  const r = await myRequest(ctx, t.id);
  const answers = await db.getAnswers(ctx.env, r.id);
  const justSent = ctx.url.searchParams.get('m') === 'sent' && r.status !== 'draft';
  const oa = lineOa(ctx.env);
  const head = justSent
    ? html`<section class="thanks"><div class="confetti" aria-hidden="true">${Array.from({ length: 12 }, () => html`<i></i>`)}</div>
        <div class="seal">${icon('check')}</div>
        <h1>ขอบคุณ ทีมงานจะติดต่อกลับทาง LINE</h1>
        <p>เราได้รับคำขอทำหนังสือ ${r.subject} ${r.grade} และสไตล์ที่คุณครูเลือกแล้ว ทีมงานจะส่งตัวอย่างและราคาให้ทาง LINE ${oa}</p>
        <a class="btn sun" href="/app/">${icon('book')}กลับไปหน้าหนังสือของฉัน</a></section>`
    : html`<a class="back" href="/app/requests">${icon('left')}คำขอทำหนังสือ</a>${flash(ctx)}`;
  const answeredCount = QUIZ.filter((q) => answers[q.key]).length;
  return htmlResponse(page(ctx, {
    title: `คำขอ #${r.id}`,
    nav: 'requests',
    body: html`${head}
<div class="card">
  <div class="row between"><div><span class="muted small">คำขอ #${r.id} · ${fmtDateTime(r.submitted_at ?? r.created_at)}</span><h2>${r.subject} ${r.grade}</h2></div>${requestBadge(r.status, 'teacher')}</div>
  ${r.status === 'draft'
    ? html`<div class="flash warn">ยังเลือกสไตล์ไม่ครบ ${answeredCount}/${QUIZ_LENGTH} ข้อ ทีมงานจะเห็นคำขอเมื่อเลือกครบ
        <a href="/app/requests/${r.id}/quiz/${firstUnanswered(answers) || 1}">ทำต่อ</a></div>`
    : html`<div class="mt-s">${trackOf(r.status)}</div>`}
  <div class="mt">${requestFacts(r)}</div>
</div>
<div class="card">
  <h3>สไตล์ที่คุณครูเลือก</h3>
  ${answeredCount ? html`<div class="chips mt-s">${QUIZ.filter((q) => answers[q.key]).map((q, i) =>
    html`<span class="chip ${['t-sky', 't-mint', 't-tom', 't-sun', 't-lilac'][i % 5]}">${answerTh(q, answers[q.key]!)}</span>`)}</div>` : ''}
  <div class="mt">${choiceThumbs(answers)}</div>
</div>
<p class="small muted mt">ต้องการแก้ไขคำขอ ติดต่อทีมงานทาง LINE ${oa}</p>`,
  }));
}

/** GET /app/requests: the teacher's own requests. */
export async function myRequests(ctx: Ctx): Promise<Response> {
  const t = requireTeacher(ctx);
  const rows = await db.listMyRequests(ctx.env, t.id);
  const list = rows.length
    ? html`<div class="reqs">${rows.map((r) => html`<article class="card req lift">
        <div><span class="muted small">คำขอ #${r.id} · ${fmtDateTime(r.submitted_at ?? r.created_at)}</span>
          <h3><a href="/app/requests/${r.id}">${r.subject} ${r.grade}</a></h3>
          <div class="meta">${r.textbook} · ${r.units}</div>
          ${r.status === 'draft'
            ? html`<div class="qmini"><ol class="qprog" aria-hidden="true">${QUIZ.map((_, i) => html`<li class="${i < r.answered ? 'done' : ''}"></li>`)}</ol>เลือกสไตล์แล้ว ${r.answered}/${QUIZ_LENGTH}</div>`
            : html`<div class="chips">${r.summary.split(' · ').slice(0, 4).map((s) => html`<span class="chip">${s}</span>`)}</div>`}
        </div>
        <div class="row">${requestBadge(r.status, 'teacher')}${r.status === 'draft'
          ? html`<a class="btn small sun" href="/app/requests/${r.id}/quiz/${Math.min(r.answered + 1, QUIZ_LENGTH)}">ทำต่อ ${icon('right')}</a>`
          : html`<a class="btn small ghost" href="/app/requests/${r.id}">ดูรายละเอียด</a>`}</div>
      </article>`)}</div>`
    : html`<div class="empty box">${emptyArt()}<h2>ยังไม่มีคำขอ</h2>
        <p>ไม่เจอหนังสือที่คุณครูสอนในร้าน? บอกเราว่าใช้เล่มไหน เลือกสไตล์ที่ชอบ ${QUIZ_LENGTH} ข้อ แล้วทีมงานจะทำสไลด์ให้ทั้งเล่ม</p>
        <p class="row"><a class="btn sun big" href="/app/requests/new">${icon('spark')}ขอทำหนังสือ</a></p></div>`;
  return htmlResponse(page(ctx, {
    title: 'คำขอทำหนังสือ',
    nav: 'requests',
    body: html`${flash(ctx)}<div class="hello"><div><span class="kicker">ทำสไลด์ให้ตรงเล่มที่สอน</span><h1>คำขอทำหนังสือ</h1></div>
      ${rows.length ? html`<a class="btn sun" href="/app/requests/new">${icon('plus')}ขอทำหนังสือเล่มใหม่</a>` : ''}</div>${list}`,
  }));
}

export const STATUS_KEYS = Object.keys(REQUEST_STATUS) as BookRequest['status'][];
