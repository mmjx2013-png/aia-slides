import type { Book, Ctx } from '../env';
import { html, Safe } from '../lib/html';
import { HttpError, htmlResponse, redirect } from '../lib/http';
import { page, flash, csrfField, fmtDate, fmtDateTime, money, payBadge, subBadge, bookStatusBadge } from '../views/layout';
import * as db from '../db';
import { checkCsrf } from '../lib/csrf';
import { cleanText, idParam, int, oneOf, readForm, str } from '../lib/validate';
import { rateLimit } from '../lib/ratelimit';
import { LIMITS, MAX_UPLOAD_BYTES } from '../lib/config';
import { audit } from '../lib/audit';
import { monthlyPrice, MONTH_OPTIONS, RATE_MAX, RATE_MIN } from '../lib/pricing';
import { countSlides, inlineScriptHashes, looksLikeHtmlDocument, sha256hex } from '../lib/deckmeta';
import { destroyAllSessions } from '../lib/session';

function requireAdmin(ctx: Ctx) {
  if (!ctx.teacher) throw new HttpError(401, 'กรุณาเข้าสู่ระบบ');
  if (!ctx.isAdmin) throw new HttpError(403, 'หน้านี้สำหรับผู้ดูแลเท่านั้น');
  return ctx.teacher;
}

/** Every admin POST: admin only, CSRF-checked, rate-limited per admin. */
async function adminPost(ctx: Ctx, maxBytes?: number): Promise<{ form: FormData; actor: string }> {
  const t = requireAdmin(ctx);
  const form = await readForm(ctx.req, maxBytes);
  checkCsrf(ctx, form);
  await rateLimit(ctx.env, `admin:${t.id}`, LIMITS.admin, ctx.now);
  return { form, actor: `admin:${t.id}` };
}

const SECTIONS = [
  ['dash', '/app/admin/', 'ภาพรวม'],
  ['payments', '/app/admin/payments', 'การชำระเงิน'],
  ['members', '/app/admin/members', 'สมาชิก'],
  ['subs', '/app/admin/subscriptions', 'การสมัคร'],
  ['books', '/app/admin/books', 'หนังสือและหน่วย'],
  ['audit', '/app/admin/audit', 'บันทึกการใช้งาน'],
] as const;

function adminPage(ctx: Ctx, title: string, current: string, body: Safe): Response {
  const side = html`<nav class="side" aria-label="เมนูผู้ดูแล">${SECTIONS.map(([k, href, label]) =>
    html`<a href="${href}"${k === current ? new Safe(' aria-current="page"') : ''}>${label}</a>`)}</nav>`;
  return htmlResponse(page(ctx, { title: `${title} · ผู้ดูแล`, nav: 'admin', body: html`<div class="admin">${side}<div>${flash(ctx)}${body}</div></div>` }));
}

function paymentsTable(ctx: Ctx, rows: db.PaymentRow[]): Safe {
  if (!rows.length) return html`<div class="card empty">ไม่มีรายการ</div>`;
  return html`<div class="table"><table>
  <thead><tr><th>#</th><th>สมาชิก</th><th>หนังสือ</th><th>ยอด</th><th>สถานะ</th><th>หมายเหตุ</th><th>เวลา</th><th></th></tr></thead>
  <tbody>${rows.map((p) => html`<tr>
    <td>${p.id}</td>
    <td><a href="/app/admin/members/${p.teacher_id}">${p.display_name}</a><br><span class="muted small">${p.school}</span></td>
    <td>${p.title}<br><span class="muted small">${p.months} เดือน · ${p.slide_count}×${p.rate_baht}</span></td>
    <td><b>${money(p.amount_satang / 100)}</b> ฿</td>
    <td>${payBadge(p)}</td>
    <td class="small">${p.ref ?? ''}</td>
    <td class="small">${fmtDateTime(p.notified_at ?? p.created_at)}</td>
    <td>${p.status === 'pending' ? html`<div class="row">
      <form method="post" action="/app/admin/payments/${p.id}/confirm">${csrfField(ctx)}<button class="btn ok small" type="submit">ยืนยัน</button></form>
      <form method="post" action="/app/admin/payments/${p.id}/reject">${csrfField(ctx)}<button class="btn danger small" type="submit">ปฏิเสธ</button></form>
    </div>` : html`<span class="small muted">${p.confirmed_by ?? ''}</span>`}</td>
  </tr>`)}</tbody></table></div>`;
}

/** GET /app/admin/ */
export async function dashboard(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const [c, pending] = await Promise.all([db.counts(ctx.env, ctx.now), db.listPayments(ctx.env, 'pending', 50)]);
  return adminPage(ctx, 'ภาพรวม', 'dash', html`
<h1>ภาพรวม</h1>
<div class="stats">
  <div class="stat"><b>${c?.teachers ?? 0}</b><span>สมาชิกทั้งหมด</span></div>
  <div class="stat"><b>${c?.active ?? 0}</b><span>การสมัครที่ใช้งานอยู่</span></div>
  <div class="stat"><b>${c?.pending ?? 0}</b><span>รอยืนยันการชำระเงิน</span></div>
  <div class="stat"><b>${money((c?.revenue30 ?? 0) / 100)}</b><span>รายรับ 30 วัน (บาท)</span></div>
</div>
<div class="row between"><h2>รอยืนยันการชำระเงิน</h2><a class="small" href="/app/admin/payments">ดูทั้งหมด</a></div>
<p class="muted small">ตรวจยอดในแอปธนาคารให้ตรงกับยอดและเวลา แล้วกด “ยืนยัน” ระบบจะเปิดสิทธิ์ให้สมาชิกทันที</p>
${paymentsTable(ctx, pending)}
<h2 class="mt">ส่งออกข้อมูล (CSV)</h2>
<div class="row"><a class="btn ghost small" href="/app/admin/export/members.csv">สมาชิก</a>
<a class="btn ghost small" href="/app/admin/export/subscriptions.csv">การสมัคร</a>
<a class="btn ghost small" href="/app/admin/export/payments.csv">การชำระเงิน</a></div>`);
}

/** GET /app/admin/payments?status= */
export async function payments(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const status = oneOf(ctx.url.searchParams.get('status') || 'all', ['all', 'pending', 'confirmed', 'rejected'] as const, 'status');
  const rows = await db.listPayments(ctx.env, status, 300);
  const tabs = (['all', 'pending', 'confirmed', 'rejected'] as const).map((s) =>
    html`<a class="btn small ${s === status ? '' : 'ghost'}" href="/app/admin/payments?status=${s}">${{ all: 'ทั้งหมด', pending: 'รอยืนยัน', confirmed: 'ยืนยันแล้ว', rejected: 'ไม่ผ่าน' }[s]}</a>`);
  return adminPage(ctx, 'การชำระเงิน', 'payments', html`<h1>การชำระเงิน</h1><div class="row">${tabs}</div><br>${paymentsTable(ctx, rows)}`);
}

/** POST /app/admin/payments/:id/confirm: activates (or extends) the subscription. */
export async function confirm(ctx: Ctx): Promise<Response> {
  const { actor } = await adminPost(ctx);
  const id = idParam(ctx.params.id);
  const result = await db.confirmPayment(ctx.env, id, `teacher:${ctx.teacher!.id}`, ctx.now);
  if (!result) return redirect('/app/admin/?m=already');
  await audit(ctx.env, ctx.now, actor, 'payment.confirm', `payment:${id}`, {
    amount: result.payment.amount_satang / 100, subscription: result.subscription.id, until: result.subscription.period_end,
  });
  return redirect(back(ctx, '/app/admin/') + 'm=confirmed');
}

/** POST /app/admin/payments/:id/reject */
export async function reject(ctx: Ctx): Promise<Response> {
  const { actor } = await adminPost(ctx);
  const id = idParam(ctx.params.id);
  const ok = await db.rejectPayment(ctx.env, id, `teacher:${ctx.teacher!.id}`, ctx.now);
  if (!ok) return redirect('/app/admin/?m=already');
  await audit(ctx.env, ctx.now, actor, 'payment.reject', `payment:${id}`);
  return redirect(back(ctx, '/app/admin/') + 'm=rejected');
}

/** Return to the admin page the form was on (same-origin Referer under /app/admin/ only). */
function back(ctx: Ctx, fallback: string): string {
  const ref = ctx.req.headers.get('Referer');
  let path = fallback;
  if (ref) {
    try {
      const u = new URL(ref);
      if (u.origin === ctx.origin && u.pathname.startsWith('/app/admin/')) path = u.pathname;
    } catch { /* ignore */ }
  }
  return path + '?';
}

/** GET /app/admin/members?q= */
export async function members(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const q = cleanText(ctx.url.searchParams.get('q') || '', { max: 80, field: 'คำค้น' });
  const rows = await db.listTeachers(ctx.env, q, ctx.now);
  return adminPage(ctx, 'สมาชิก', 'members', html`<h1>สมาชิก</h1>
<form method="get" action="/app/admin/members" class="row"><input type="search" name="q" value="${q}" placeholder="ค้นหาชื่อ โรงเรียน หรือรหัส LINE" aria-label="ค้นหา"><button class="btn small" type="submit">ค้นหา</button></form><br>
${rows.length ? html`<div class="table"><table><thead><tr><th>ชื่อ</th><th>โรงเรียน</th><th>ใช้งานอยู่</th><th>รอชำระ</th><th>สมัครเมื่อ</th><th>เข้าล่าสุด</th><th>สถานะ</th></tr></thead><tbody>
${rows.map((t) => html`<tr><td><a href="/app/admin/members/${t.id}">${t.display_name}</a></td><td>${t.school || html`<span class="muted">–</span>`}</td>
<td>${t.active_count}</td><td>${t.pending_count}</td><td class="small">${fmtDate(t.created_at)}</td><td class="small">${fmtDateTime(t.last_login_at)}</td>
<td>${t.status === 'active' ? html`<span class="badge ok">ปกติ</span>` : html`<span class="badge bad">ระงับ</span>`}</td></tr>`)}
</tbody></table></div>` : html`<div class="card empty">ไม่พบสมาชิก</div>`}`);
}

/** GET /app/admin/members/:id */
export async function member(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const t = await db.getTeacher(ctx.env, idParam(ctx.params.id));
  if (!t) throw new HttpError(404, 'ไม่พบสมาชิก');
  const [subs, pays, books] = await Promise.all([
    db.listSubscriptions(ctx.env, 'all', ctx.now, t.id), db.listPaymentsForTeacher(ctx.env, t.id), db.listBooks(ctx.env, false),
  ]);
  return adminPage(ctx, t.display_name, 'members', html`
<p class="small"><a href="/app/admin/members">← สมาชิก</a></p>
<div class="card"><div class="row between"><div><h1>${t.display_name}</h1><p class="muted">${t.school || 'ยังไม่กรอกโรงเรียน'}</p>
<p class="mono muted">${t.line_user_id}</p><p class="small">สมัครเมื่อ ${fmtDateTime(t.created_at)} · เข้าล่าสุด ${fmtDateTime(t.last_login_at)}</p></div>
<form method="post" action="/app/admin/members/${t.id}/${t.status === 'active' ? 'block' : 'unblock'}">${csrfField(ctx)}
<button class="btn ${t.status === 'active' ? 'danger' : 'ok'} small" type="submit">${t.status === 'active' ? 'ระงับสมาชิก' : 'เปิดใช้งาน'}</button></form></div></div>
<h2 class="mt">การสมัคร</h2>${subsTable(ctx, subs)}
<div class="card"><h3>ให้สิทธิ์ / ต่ออายุด้วยมือ</h3><p class="muted small">เช่น ทดลองใช้ฟรี หรือรับเงินนอกระบบ (ไม่สร้างรายการชำระเงิน)</p>
<form method="post" action="/app/admin/members/${t.id}/grant" class="row">${csrfField(ctx)}
<select name="book_id" aria-label="หนังสือ">${books.map((b) => html`<option value="${b.id}">${b.title}</option>`)}</select>
<select name="months" aria-label="จำนวนเดือน">${MONTH_OPTIONS.map((m) => html`<option value="${m}">${m} เดือน</option>`)}</select>
<button class="btn small" type="submit">ให้สิทธิ์</button></form></div>
<h2 class="mt">การชำระเงิน</h2>${paymentsTable(ctx, pays)}`);
}

function subsTable(ctx: Ctx, rows: db.SubRow[]): Safe {
  if (!rows.length) return html`<div class="card empty">ไม่มีรายการ</div>`;
  return html`<div class="table"><table><thead><tr><th>#</th><th>สมาชิก</th><th>หนังสือ</th><th>สถานะ</th><th>เริ่ม</th><th>หมดอายุ</th><th>ราคา/เดือน</th><th></th></tr></thead><tbody>
${rows.map((s) => html`<tr><td>${s.id}</td><td><a href="/app/admin/members/${s.teacher_id}">${s.display_name}</a><br><span class="muted small">${s.school}</span></td>
<td>${s.title}</td><td>${subBadge(db.effectiveStatus(s, ctx.now))}</td><td class="small">${fmtDate(s.period_start)}</td><td class="small">${fmtDate(s.period_end)}</td><td>${money(s.monthly_price)}</td>
<td><div class="row"><form method="post" action="/app/admin/subscriptions/${s.id}/extend" class="row">${csrfField(ctx)}
<select name="months" aria-label="จำนวนเดือน">${MONTH_OPTIONS.map((m) => html`<option value="${m}">+${m} ด.</option>`)}</select><button class="btn small" type="submit">ต่ออายุ</button></form>
${db.effectiveStatus(s, ctx.now) === 'active' ? html`<form method="post" action="/app/admin/subscriptions/${s.id}/expire">${csrfField(ctx)}<button class="btn danger small" type="submit">ให้หมดอายุ</button></form>` : ''}</div></td></tr>`)}
</tbody></table></div>`;
}

/** POST /app/admin/members/:id/block | unblock */
export async function setStatus(ctx: Ctx, status: 'active' | 'blocked'): Promise<Response> {
  const { actor } = await adminPost(ctx);
  const t = await db.getTeacher(ctx.env, idParam(ctx.params.id));
  if (!t) throw new HttpError(404, 'ไม่พบสมาชิก');
  if (t.id === ctx.teacher!.id) throw new HttpError(400, 'ระงับบัญชีของตัวเองไม่ได้');
  await db.setTeacherStatus(ctx.env, t.id, status);
  if (status === 'blocked') await destroyAllSessions(ctx.env, t.id);
  await audit(ctx.env, ctx.now, actor, status === 'blocked' ? 'member.block' : 'member.unblock', `teacher:${t.id}`);
  return redirect(`/app/admin/members/${t.id}?m=${status === 'blocked' ? 'blocked' : 'unblocked'}`);
}

/** POST /app/admin/members/:id/grant */
export async function grant(ctx: Ctx): Promise<Response> {
  const { form, actor } = await adminPost(ctx);
  const t = await db.getTeacher(ctx.env, idParam(ctx.params.id));
  if (!t) throw new HttpError(404, 'ไม่พบสมาชิก');
  const book = await db.getBook(ctx.env, int(str(form, 'book_id'), { min: 1, max: 1e9, field: 'หนังสือ' }));
  if (!book) throw new HttpError(404, 'ไม่พบหนังสือ');
  const months = monthsField(form);
  const sub = await db.extendSubscription(ctx.env, t.id, book, months, ctx.now);
  await audit(ctx.env, ctx.now, actor, 'subscription.grant', `subscription:${sub.id}`, { teacher: t.id, book: book.id, months, until: sub.period_end });
  return redirect(`/app/admin/members/${t.id}?m=extended`);
}

function monthsField(form: FormData): number {
  const months = int(str(form, 'months'), { min: 1, max: 12, field: 'จำนวนเดือน' });
  if (!(MONTH_OPTIONS as readonly number[]).includes(months)) throw new HttpError(400, 'เลือกได้ 1, 3, 6 หรือ 12 เดือน');
  return months;
}

/** GET /app/admin/subscriptions?filter= */
export async function subscriptions(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const filter = oneOf(ctx.url.searchParams.get('filter') || 'all', ['all', 'active', 'pending', 'expired'] as const, 'filter');
  const rows = await db.listSubscriptions(ctx.env, filter, ctx.now);
  const tabs = (['all', 'active', 'pending', 'expired'] as const).map((s) =>
    html`<a class="btn small ${s === filter ? '' : 'ghost'}" href="/app/admin/subscriptions?filter=${s}">${{ all: 'ทั้งหมด', active: 'ใช้งานอยู่', pending: 'รอชำระ', expired: 'หมดอายุ' }[s]}</a>`);
  return adminPage(ctx, 'การสมัคร', 'subs', html`<h1>การสมัคร</h1><div class="row">${tabs}</div><br>${subsTable(ctx, rows)}`);
}

/** POST /app/admin/subscriptions/:id/extend */
export async function extend(ctx: Ctx): Promise<Response> {
  const { form, actor } = await adminPost(ctx);
  const sub = await db.getSubscriptionById(ctx.env, idParam(ctx.params.id));
  if (!sub) throw new HttpError(404, 'ไม่พบการสมัคร');
  const book = await db.getBook(ctx.env, sub.book_id);
  const months = monthsField(form);
  const out = await db.extendSubscription(ctx.env, sub.teacher_id, book!, months, ctx.now);
  await audit(ctx.env, ctx.now, actor, 'subscription.extend', `subscription:${sub.id}`, { months, until: out.period_end });
  return redirect(back(ctx, '/app/admin/subscriptions') + 'm=extended');
}

/** POST /app/admin/subscriptions/:id/expire */
export async function expire(ctx: Ctx): Promise<Response> {
  const { actor } = await adminPost(ctx);
  const sub = await db.getSubscriptionById(ctx.env, idParam(ctx.params.id));
  if (!sub) throw new HttpError(404, 'ไม่พบการสมัคร');
  await db.expireSubscription(ctx.env, sub.id, ctx.now);
  await audit(ctx.env, ctx.now, actor, 'subscription.expire', `subscription:${sub.id}`);
  return redirect(back(ctx, '/app/admin/subscriptions') + 'm=expired');
}

// ---------- books & units ----------
function bookForm(ctx: Ctx, b: Partial<Book>, action: string, label: string): Safe {
  const statuses = [['draft', 'ร่าง (ยังไม่แสดง)'], ['published', 'เปิดขาย'], ['archived', 'เก็บถาวร (ไม่รับสมัครใหม่)']] as const;
  return html`<form method="post" action="${action}">${csrfField(ctx)}
<div class="field"><label for="title">ชื่อหนังสือ</label><input id="title" name="title" type="text" required maxlength="160" value="${b.title ?? ''}"></div>
<div class="cols">
<div class="field"><label for="subject">วิชา</label><input id="subject" name="subject" type="text" required maxlength="80" value="${b.subject ?? ''}"></div>
<div class="field"><label for="grade">ระดับชั้น</label><input id="grade" name="grade" type="text" required maxlength="40" value="${b.grade ?? ''}" placeholder="ม.1"></div>
<div class="field"><label for="rate">บาท/สไลด์/เดือน</label><select id="rate" name="rate">${[3, 4, 5].map((r) => html`<option value="${r}"${r === (b.rate_baht_per_slide ?? 3) ? new Safe(' selected') : ''}>${r} บาท</option>`)}</select></div>
<div class="field"><label for="status">สถานะ</label><select id="status" name="status">${statuses.map(([v, l]) => html`<option value="${v}"${v === (b.status ?? 'draft') ? new Safe(' selected') : ''}>${l}</option>`)}</select></div>
</div><button class="btn" type="submit">${label}</button></form>`;
}

function readBook(form: FormData): db.BookInput {
  return {
    title: cleanText(str(form, 'title'), { min: 1, max: 160, field: 'ชื่อหนังสือ' }),
    subject: cleanText(str(form, 'subject'), { min: 1, max: 80, field: 'วิชา' }),
    grade: cleanText(str(form, 'grade'), { min: 1, max: 40, field: 'ระดับชั้น' }),
    rate: int(str(form, 'rate'), { min: RATE_MIN, max: RATE_MAX, field: 'อัตราต่อสไลด์' }),
    status: oneOf(str(form, 'status'), ['draft', 'published', 'archived'] as const, 'สถานะ'),
  };
}

/** GET /app/admin/books */
export async function books(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const rows = await db.listBooks(ctx.env, false);
  return adminPage(ctx, 'หนังสือ', 'books', html`<h1>หนังสือและหน่วยการเรียนรู้</h1>
${rows.length ? html`<div class="table"><table><thead><tr><th>หนังสือ</th><th>วิชา / ชั้น</th><th>สไลด์</th><th>บาท/สไลด์</th><th>ราคา/เดือน</th><th>สถานะ</th></tr></thead><tbody>
${rows.map((b) => html`<tr><td><a href="/app/admin/books/${b.id}">${b.title}</a></td><td>${b.subject} · ${b.grade}</td><td>${b.slide_count}</td><td>${b.rate_baht_per_slide}</td>
<td><b>${b.slide_count ? money(monthlyPrice(b.slide_count, b.rate_baht_per_slide)) : '–'}</b></td><td>${bookStatusBadge(b.status)}</td></tr>`)}</tbody></table></div>` : html`<div class="card empty">ยังไม่มีหนังสือ</div>`}
<div class="card mt"><h2>เพิ่มหนังสือ</h2>${bookForm(ctx, {}, '/app/admin/books', 'เพิ่มหนังสือ')}</div>`);
}

/** POST /app/admin/books */
export async function createBook(ctx: Ctx): Promise<Response> {
  const { form, actor } = await adminPost(ctx);
  const input = readBook(form);
  const id = await db.createBook(ctx.env, input, ctx.now);
  await audit(ctx.env, ctx.now, actor, 'book.create', `book:${id}`, input);
  return redirect(`/app/admin/books/${id}?m=saved`);
}

/** GET /app/admin/books/:id */
export async function book(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const b = await db.getBook(ctx.env, idParam(ctx.params.id));
  if (!b) throw new HttpError(404, 'ไม่พบหนังสือ');
  const units = await db.listUnits(ctx.env, b.id);
  const nextPos = units.reduce((m, u) => Math.max(m, u.position), 0) + 1;
  return adminPage(ctx, b.title, 'books', html`
<p class="small"><a href="/app/admin/books">← หนังสือ</a></p>
<div class="card"><div class="row between"><h1>${b.title}</h1>${bookStatusBadge(b.status)}</div>
<p class="muted">${b.slide_count} สไลด์ (รวมทุกหน่วย) × ${b.rate_baht_per_slide} บาท = <b>${b.slide_count ? money(monthlyPrice(b.slide_count, b.rate_baht_per_slide)) : 0} บาท/เดือน</b> · ราคาใหม่ใช้กับการสมัครครั้งถัดไป</p>
${bookForm(ctx, b, `/app/admin/books/${b.id}`, 'บันทึก')}</div>
<h2 class="mt">หน่วยการเรียนรู้</h2>
${units.map((u) => html`<div class="card"><form method="post" action="/app/admin/units/${u.id}">${csrfField(ctx)}
<div class="cols"><div class="field"><label for="p${u.id}">ลำดับ</label><input id="p${u.id}" name="position" type="number" min="1" max="999" value="${u.position}"></div>
<div class="field"><label for="t${u.id}">ชื่อหน่วย</label><input id="t${u.id}" name="title" type="text" maxlength="160" required value="${u.title}"></div>
<div class="field"><label for="s${u.id}">จำนวนสไลด์</label><input id="s${u.id}" name="slide_count" type="number" min="0" max="2000" value="${u.slide_count}"></div></div>
<div class="row"><button class="btn small" type="submit">บันทึกหน่วย</button>
${u.r2_key ? html`<a class="btn ghost small" href="/app/deck/${u.id}/">ดูตัวอย่าง</a>` : ''}
<span class="small muted">${u.r2_key ? html`ไฟล์: ${money(Math.round((u.html_bytes ?? 0) / 1024))} KB · อัปโหลด ${fmtDateTime(u.uploaded_at)} · <span class="mono">${(u.html_sha256 ?? '').slice(0, 12)}</span>` : 'ยังไม่มีไฟล์สไลด์'}</span></div></form>
<form method="post" action="/app/admin/units/${u.id}/upload" enctype="multipart/form-data" class="row mt-s">${csrfField(ctx)}
<label class="sr" for="f${u.id}">ไฟล์ HTML</label><input id="f${u.id}" name="file" type="file" accept=".html,text/html" required>
<button class="btn ghost small" type="submit">อัปโหลด HTML</button><span class="small muted">นับสไลด์และคำนวณ CSP ให้อัตโนมัติ</span></form>
<form method="post" action="/app/admin/units/${u.id}/delete" class="mt-s">${csrfField(ctx)}<button class="btn danger small" type="submit">ลบหน่วยนี้</button></form>
</div>`)}
<div class="card mt"><h3>เพิ่มหน่วย</h3><form method="post" action="/app/admin/books/${b.id}/units">${csrfField(ctx)}
<div class="cols"><div class="field"><label for="np">ลำดับ</label><input id="np" name="position" type="number" min="1" max="999" value="${nextPos}"></div>
<div class="field"><label for="nt">ชื่อหน่วย</label><input id="nt" name="title" type="text" maxlength="160" required></div>
<div class="field"><label for="ns">จำนวนสไลด์</label><input id="ns" name="slide_count" type="number" min="0" max="2000" value="0"></div></div>
<button class="btn small" type="submit">เพิ่มหน่วย</button></form></div>
<details class="card mt"><summary>ลบหนังสือเล่มนี้</summary><p class="small muted">ลบได้เฉพาะเล่มที่ยังไม่มีใครสมัคร ถ้ามีสมาชิกแล้ว ให้เปลี่ยนสถานะเป็นเก็บถาวร</p>
<form method="post" action="/app/admin/books/${b.id}/delete">${csrfField(ctx)}<button class="btn danger small" type="submit">ลบหนังสือ</button></form></details>`);
}

/** POST /app/admin/books/:id */
export async function updateBook(ctx: Ctx): Promise<Response> {
  const { form, actor } = await adminPost(ctx);
  const b = await db.getBook(ctx.env, idParam(ctx.params.id));
  if (!b) throw new HttpError(404, 'ไม่พบหนังสือ');
  const input = readBook(form);
  await db.updateBook(ctx.env, b.id, input, ctx.now);
  await audit(ctx.env, ctx.now, actor, 'book.update', `book:${b.id}`, input);
  return redirect(`/app/admin/books/${b.id}?m=saved`);
}

/** POST /app/admin/books/:id/delete */
export async function deleteBook(ctx: Ctx): Promise<Response> {
  const { actor } = await adminPost(ctx);
  const b = await db.getBook(ctx.env, idParam(ctx.params.id));
  if (!b) throw new HttpError(404, 'ไม่พบหนังสือ');
  const keys = await db.deleteBook(ctx.env, b.id);
  if (keys.length) await ctx.env.DECKS.delete(keys);
  await audit(ctx.env, ctx.now, actor, 'book.delete', `book:${b.id}`, { title: b.title });
  return redirect('/app/admin/books?m=deleted');
}

function readUnit(form: FormData): db.UnitInput {
  return {
    position: int(str(form, 'position'), { min: 1, max: 999, field: 'ลำดับ' }),
    title: cleanText(str(form, 'title'), { min: 1, max: 160, field: 'ชื่อหน่วย' }),
    slideCount: int(str(form, 'slide_count') || '0', { min: 0, max: 2000, field: 'จำนวนสไลด์' }),
  };
}

/** POST /app/admin/books/:id/units */
export async function createUnit(ctx: Ctx): Promise<Response> {
  const { form, actor } = await adminPost(ctx);
  const b = await db.getBook(ctx.env, idParam(ctx.params.id));
  if (!b) throw new HttpError(404, 'ไม่พบหนังสือ');
  const input = readUnit(form);
  const id = await db.createUnit(ctx.env, b.id, input, ctx.now);
  await audit(ctx.env, ctx.now, actor, 'unit.create', `unit:${id}`, { book: b.id, ...input });
  return redirect(`/app/admin/books/${b.id}?m=saved`);
}

/** POST /app/admin/units/:id */
export async function updateUnit(ctx: Ctx): Promise<Response> {
  const { form, actor } = await adminPost(ctx);
  const u = await db.getUnit(ctx.env, idParam(ctx.params.id));
  if (!u) throw new HttpError(404, 'ไม่พบหน่วย');
  const input = readUnit(form);
  await db.updateUnit(ctx.env, u, input, ctx.now);
  await audit(ctx.env, ctx.now, actor, 'unit.update', `unit:${u.id}`, input);
  return redirect(`/app/admin/books/${u.book_id}?m=saved`);
}

/** POST /app/admin/units/:id/delete */
export async function deleteUnit(ctx: Ctx): Promise<Response> {
  const { actor } = await adminPost(ctx);
  const u = await db.getUnit(ctx.env, idParam(ctx.params.id));
  if (!u) throw new HttpError(404, 'ไม่พบหน่วย');
  await db.deleteUnit(ctx.env, u, ctx.now);
  if (u.r2_key) await ctx.env.DECKS.delete(u.r2_key);
  await audit(ctx.env, ctx.now, actor, 'unit.delete', `unit:${u.id}`, { book: u.book_id, title: u.title });
  return redirect(`/app/admin/books/${u.book_id}?m=deleted`);
}

/** POST /app/admin/units/:id/upload (multipart): put the deck HTML into the private bucket. */
export async function upload(ctx: Ctx): Promise<Response> {
  const { form, actor } = await adminPost(ctx, MAX_UPLOAD_BYTES + 64 * 1024);
  const u = await db.getUnit(ctx.env, idParam(ctx.params.id));
  if (!u) throw new HttpError(404, 'ไม่พบหน่วย');
  const file = form.get('file');
  if (!file || typeof file === 'string') throw new HttpError(400, 'กรุณาเลือกไฟล์ HTML');
  if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, `ไฟล์ต้องไม่เกิน ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`);
  if (!/\.html?$/i.test(file.name || '')) throw new HttpError(400, 'ต้องเป็นไฟล์ .html');
  const text = await file.text();
  if (!looksLikeHtmlDocument(text) || !/<head\b/i.test(text) || !/<body\b/i.test(text)) {
    throw new HttpError(400, 'ไฟล์นี้ไม่ใช่หน้า HTML ที่สมบูรณ์ (ต้องมี <!DOCTYPE html>, <head> และ <body>)');
  }
  const [hashes, sha] = await Promise.all([inlineScriptHashes(text), sha256hex(text)]);
  const slides = countSlides(text);
  const key = `units/${u.id}/index.html`;
  await ctx.env.DECKS.put(key, text, { httpMetadata: { contentType: 'text/html; charset=utf-8' }, customMetadata: { sha256: sha } });
  await db.setUnitUpload(ctx.env, u, { key, hashes, sha, bytes: file.size, slides }, ctx.now);
  await audit(ctx.env, ctx.now, actor, 'unit.upload', `unit:${u.id}`, { bytes: file.size, slides, sha256: sha, scripts: hashes.length });
  return redirect(`/app/admin/books/${u.book_id}?m=uploaded`);
}

// ---------- CSV export & audit ----------
/** Cells are quoted; a leading = + - @ or tab is defused so a spreadsheet never runs it as a formula. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

const iso = (t: number | null) => (t ? new Date(t * 1000).toISOString() : '');

/** GET /app/admin/export/:type.csv */
export async function exportCsv(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const type = oneOf(ctx.params.type, ['members', 'subscriptions', 'payments'] as const, 'type');
  let body: string;
  if (type === 'members') {
    const rows = await db.listTeachers(ctx.env, '', ctx.now, 100000);
    body = toCsv(['id', 'line_user_id', 'display_name', 'school', 'status', 'active_subscriptions', 'created_at', 'last_login_at'],
      rows.map((t) => [t.id, t.line_user_id, t.display_name, t.school, t.status, t.active_count, iso(t.created_at), iso(t.last_login_at)]));
  } else if (type === 'subscriptions') {
    const rows = await db.listSubscriptions(ctx.env, 'all', ctx.now);
    body = toCsv(['id', 'teacher_id', 'display_name', 'school', 'book', 'status', 'period_start', 'period_end', 'monthly_price_baht'],
      rows.map((s) => [s.id, s.teacher_id, s.display_name, s.school, s.title, db.effectiveStatus(s, ctx.now), iso(s.period_start), iso(s.period_end), s.monthly_price]));
  } else {
    const rows = await db.listPayments(ctx.env, 'all', 100000);
    body = toCsv(['id', 'teacher_id', 'display_name', 'school', 'book', 'provider', 'months', 'amount_baht', 'status', 'ref', 'confirmed_by', 'created_at', 'decided_at'],
      rows.map((p) => [p.id, p.teacher_id, p.display_name, p.school, p.title, p.provider, p.months, p.amount_satang / 100, p.status, p.ref, p.confirmed_by, iso(p.created_at), iso(p.decided_at)]));
  }
  await audit(ctx.env, ctx.now, `admin:${ctx.teacher!.id}`, 'export.csv', type);
  const day = new Date(ctx.now * 1000).toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="kruslide-${type}-${day}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}

/** GET /app/admin/audit?before= */
export async function auditLog(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const b = ctx.url.searchParams.get('before');
  const before = b ? int(b, { min: 1, max: 1e12, field: 'before' }) : null;
  const rows = await db.listAudit(ctx.env, before, 100);
  return adminPage(ctx, 'บันทึกการใช้งาน', 'audit', html`<h1>บันทึกการใช้งาน</h1>
${rows.length ? html`<div class="table"><table><thead><tr><th>#</th><th>เวลา</th><th>ผู้กระทำ</th><th>การกระทำ</th><th>เป้าหมาย</th><th>รายละเอียด</th></tr></thead><tbody>
${rows.map((r) => html`<tr><td>${r.id}</td><td class="small">${fmtDateTime(r.at)}</td><td class="mono">${r.actor}</td><td><b>${r.action}</b></td><td class="mono">${r.target ?? ''}</td><td class="mono small">${r.detail ?? ''}</td></tr>`)}
</tbody></table></div>${rows.length === 100 ? html`<p><a class="btn ghost small" href="/app/admin/audit?before=${rows[rows.length - 1].id}">เก่ากว่า →</a></p>` : ''}` : html`<div class="card empty">ยังไม่มีบันทึก</div>`}`);
}
