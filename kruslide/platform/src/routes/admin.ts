import type { Book, BookRequest, Ctx } from '../env';
import { html, Safe } from '../lib/html';
import { HttpError, redirect } from '../lib/http';
import { csrfField, initial, fmtDate, fmtDateTime, money, payBadge, subBadge, bookStatusBadge, icon, requestBadge, REQUEST_STATUS, emptyArt } from '../views/layout';
import { buildBrief, QUIZ, QUIZ_LENGTH, answerEn, imagePath } from '../lib/quiz';
import { choiceThumbs, requestFacts } from './requests';
import * as db from '../db';
import { cleanMultiline, cleanText, idParam, int, oneOf, str } from '../lib/validate';
import { MAX_UPLOAD_BYTES } from '../lib/config';
import { audit } from '../lib/audit';
import { monthlyPrice, MONTH_OPTIONS, RATE_MAX, RATE_MIN } from '../lib/pricing';
import { countSlides, inlineScriptHashes, looksLikeHtmlDocument, sha256hex } from '../lib/deckmeta';
import { destroyAllSessions } from '../lib/session';
import { requireAdmin, adminPost, adminPage, tabs, back } from './adminkit';
import { memberAccessPanel, approveForm } from './access';

function paymentsTable(ctx: Ctx, rows: db.PaymentRow[]): Safe {
  if (!rows.length) return html`<div class="empty box"><p>ไม่มีรายการ</p></div>`;
  return html`<div class="table"><table>
  <thead><tr><th>#</th><th>สมาชิก</th><th>หนังสือ</th><th>ยอด</th><th>สถานะ</th><th>หมายเหตุ</th><th>เวลา</th><th></th></tr></thead>
  <tbody>${rows.map((p) => html`<tr>
    <td>${p.id}</td>
    <td><a href="/app/admin/members/${p.teacher_id}">${p.display_name}</a><br><span class="muted small">${p.school}</span></td>
    <td>${p.title}<br><span class="muted small">${p.months} เดือน · ${p.slide_count}×${p.rate_baht}</span></td>
    <td class="nowrap"><b>${money(p.amount_satang / 100)}</b> ฿</td>
    <td>${payBadge(p)}</td>
    <td class="small">${p.ref ?? ''}</td>
    <td class="small nowrap">${fmtDateTime(p.notified_at ?? p.created_at)}</td>
    <td>${p.status === 'pending' ? html`<div class="row">
      <form method="post" action="/app/admin/payments/${p.id}/confirm">${csrfField(ctx)}<input type="hidden" name="amount_satang" value="${p.amount_satang}"><button class="btn ok small" type="submit">ยืนยัน</button></form>
      <form method="post" action="/app/admin/payments/${p.id}/reject">${csrfField(ctx)}<button class="btn danger small" type="submit">ปฏิเสธ</button></form>
    </div>` : html`<span class="small muted">${p.confirmed_by ?? ''}</span>`}</td>
  </tr>`)}</tbody></table></div>`;
}

/** GET /app/admin/ */
export async function dashboard(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const [c, pending, fresh] = await Promise.all([db.counts(ctx.env, ctx.now), db.listPayments(ctx.env, 'pending', 50), db.listRequests(ctx.env, 'new', 5)]);
  const newCount = c?.new_requests ?? 0;
  return adminPage(ctx, 'ภาพรวม', 'dash', html`
<div class="hello"><div><span class="kicker">ผู้ดูแลครูสไลด์</span><h1>ภาพรวม</h1></div></div>
<div class="stats">
  <a class="stat${newCount ? ' hot' : ''}" href="/app/admin/requests?status=new"><span class="ic-tile t-tom">${icon('inbox')}</span><b>${newCount}</b><span>คำขอทำหนังสือใหม่</span></a>
  <a class="stat" href="/app/admin/payments?status=pending"><span class="ic-tile t-sun">${icon('wallet')}</span><b>${c?.pending ?? 0}</b><span>รอยืนยันการชำระเงิน</span></a>
  <a class="stat" href="/app/admin/subscriptions?filter=active"><span class="ic-tile t-mint">${icon('layers')}</span><b>${c?.active ?? 0}</b><span>การสมัครที่ใช้งานอยู่</span></a>
  <a class="stat${c?.waiting ? ' sun' : ''}" href="/app/admin/members?filter=waiting#waiting"><span class="ic-tile t-sun">${icon('hourglass')}</span><b>${c?.waiting ?? 0}</b><span>สมาชิกรออนุมัติ</span></a>
  <a class="stat" href="/app/admin/members"><span class="ic-tile t-sky">${icon('users')}</span><b>${c?.teachers ?? 0}</b><span>สมาชิกทั้งหมด</span></a>
  <a class="stat" href="/app/admin/access"><span class="ic-tile t-mint">${icon('key')}</span><b>${c?.grants ?? 0}</b><span>หน่วยที่ให้สิทธิ์ไว้</span></a>
  <div class="stat"><span class="ic-tile t-lilac">${icon('chart')}</span><b>${money((c?.revenue30 ?? 0) / 100)}</b><span>รายรับ 30 วัน (บาท)</span></div>
</div>
${fresh.length ? html`<div class="sec-head"><h2>คำขอทำหนังสือใหม่</h2><a href="/app/admin/requests">ดูทั้งหมด →</a></div>
<div class="table"><table><thead><tr><th>#</th><th>ครู</th><th>หนังสือ</th><th>สไตล์</th><th>ส่งเมื่อ</th><th></th></tr></thead><tbody>
${fresh.map((r) => html`<tr><td>${r.id}</td><td><a href="/app/admin/members/${r.teacher_id}">${r.display_name}</a><br><span class="muted small">${r.school}</span></td>
<td><b>${r.subject} ${r.grade}</b><br><span class="muted small">${r.textbook}</span></td><td class="small">${r.summary}</td>
<td class="small nowrap">${fmtDateTime(r.submitted_at)}</td><td><a class="btn small" href="/app/admin/requests/${r.id}">เปิด</a></td></tr>`)}
</tbody></table></div>` : ''}
<div class="sec-head"><h2>รอยืนยันการชำระเงิน</h2><a href="/app/admin/payments">ดูทั้งหมด →</a></div>
<p class="muted small">ตรวจยอดในแอปธนาคารให้ตรงกับยอดและเวลา แล้วกด “ยืนยัน” ระบบจะเปิดสิทธิ์ให้สมาชิกทันที</p>
${paymentsTable(ctx, pending)}
<div class="sec-head"><h2>ส่งออกข้อมูล (CSV)</h2></div>
<div class="row"><a class="btn ghost small" href="/app/admin/export/members.csv">${icon('download')}สมาชิก</a>
<a class="btn ghost small" href="/app/admin/export/subscriptions.csv">${icon('download')}การสมัคร</a>
<a class="btn ghost small" href="/app/admin/export/payments.csv">${icon('download')}การชำระเงิน</a>
<a class="btn ghost small" href="/app/admin/export/grants.csv">${icon('download')}สิทธิ์ที่ให้ไว้</a></div>`);
}

/** GET /app/admin/payments?status= */
export async function payments(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const status = oneOf(ctx.url.searchParams.get('status') || 'all', ['all', 'pending', 'confirmed', 'rejected'] as const, 'status');
  const rows = await db.listPayments(ctx.env, status, 300);
  const t = tabs('/app/admin/payments', 'status', status, [['all', 'ทั้งหมด'], ['pending', 'รอยืนยัน'], ['confirmed', 'ยืนยันแล้ว'], ['rejected', 'ไม่ผ่าน']] as const);
  return adminPage(ctx, 'การชำระเงิน', 'payments', html`<h1>การชำระเงิน</h1>${t}${paymentsTable(ctx, rows)}`);
}

/** POST /app/admin/payments/:id/confirm: activates (or extends) the subscription. */
export async function confirm(ctx: Ctx): Promise<Response> {
  const { form, actor } = await adminPost(ctx);
  const id = idParam(ctx.params.id);
  const expect = int(str(form, 'amount_satang'), { min: 1, max: 999_999_999, field: 'ยอดเงิน' });
  const result = await db.confirmPayment(ctx.env, id, `teacher:${ctx.teacher!.id}`, ctx.now, expect);
  if (result === 'changed') return redirect(back(ctx, '/app/admin/') + 'm=changed');
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

/** GET /app/admin/members?q=&filter= */
export async function members(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const q = cleanText(ctx.url.searchParams.get('q') || '', { max: 80, field: 'คำค้น' });
  const filter = oneOf(ctx.url.searchParams.get('filter') || 'all', ['all', 'waiting', 'blocked'] as const, 'ตัวกรอง');
  const [rows, waiting, books, c] = await Promise.all([
    db.listTeachers(ctx.env, q, ctx.now, 200, filter), db.listTeachers(ctx.env, '', ctx.now, 50, 'waiting'), db.listBooks(ctx.env, false), db.counts(ctx.env, ctx.now),
  ]);
  const t = tabs('/app/admin/members', 'filter', filter, [['all', 'ทั้งหมด', c?.teachers ?? 0], ['waiting', 'รออนุมัติ', c?.waiting ?? 0], ['blocked', 'ระงับ']] as const);
  return adminPage(ctx, 'สมาชิก', 'members', html`<div class="hello"><div><span class="kicker">ครูที่เข้าสู่ระบบด้วย LINE</span><h1>สมาชิก</h1></div>
  <a class="btn ghost" href="/app/admin/access">${icon('key')}สิทธิ์ทั้งหมด</a></div>
${waiting.length && filter !== 'blocked' ? html`<section class="waitlist" id="waiting"><div class="sec-head"><h2>${icon('hourglass')} รออนุมัติ <span class="cntb">${waiting.length}</span></h2></div>
  <div class="wcards">${waiting.map((w) => html`<article class="card wcard">
    <div class="person"><span class="ava">${initial(w.display_name)}</span><span><b><a href="/app/admin/members/${w.id}">${w.display_name}</a></b>
      <small>${w.school || 'ยังไม่กรอกโรงเรียน'} · เข้าสู่ระบบ ${fmtDateTime(w.created_at)}</small></span></div>
    ${approveForm(ctx, w, books, true)}
    <form method="post" action="/app/admin/members/${w.id}/block" class="wblock">${csrfField(ctx)}<button class="link" type="submit">ไม่อนุมัติ (ระงับ)</button></form>
  </article>`)}</div></section>` : ''}
<div class="sec-head"><h2>สมาชิกทั้งหมด</h2></div>
<form method="get" action="/app/admin/members" class="row"><input type="search" name="q" value="${q}" placeholder="ค้นหาชื่อ โรงเรียน หรือรหัส LINE" aria-label="ค้นหา">
<input type="hidden" name="filter" value="${filter}"><button class="btn" type="submit">${icon('search')}ค้นหา</button></form>${t}
${rows.length ? html`<div class="table"><table><thead><tr><th>ชื่อ</th><th>โรงเรียน</th><th>สมัครแล้ว</th><th>ให้สิทธิ์</th><th>รอชำระ</th><th>เข้าล่าสุด</th><th>สถานะ</th></tr></thead><tbody>
${rows.map((r) => html`<tr><td><a href="/app/admin/members/${r.id}">${r.display_name}</a></td><td>${r.school || html`<span class="muted">–</span>`}</td>
<td>${r.active_count} เล่ม</td><td>${r.grant_count ? html`<a href="/app/admin/members/${r.id}#access">${r.grant_count} หน่วย</a>` : '0'}</td><td>${r.pending_count}</td><td class="small">${fmtDateTime(r.last_login_at)}</td>
<td>${r.status !== 'active' ? html`<span class="badge bad">ระงับ</span>` : r.approved_at === null ? html`<span class="badge warn">รออนุมัติ</span>` : html`<span class="badge ok">ปกติ</span>`}</td></tr>`)}
</tbody></table></div>` : html`<div class="empty box"><p>ไม่พบสมาชิก</p></div>`}`);
}

/** GET /app/admin/members/:id */
export async function member(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const t = await db.getTeacher(ctx.env, idParam(ctx.params.id));
  if (!t) throw new HttpError(404, 'ไม่พบสมาชิก');
  const erased = t.line_user_id.startsWith(db.ERASED_PREFIX);
  const [subs, pays, books] = await Promise.all([
    db.listSubscriptions(ctx.env, 'all', ctx.now, t.id), db.listPaymentsForTeacher(ctx.env, t.id), db.listBooks(ctx.env, false),
  ]);
  const waiting = t.approved_at === null && t.status === 'active';
  return adminPage(ctx, t.display_name, 'members', html`
<a class="back" href="/app/admin/members">${icon('left')}สมาชิก</a>
<div class="card"><div class="row between"><div class="person big"><span class="ava">${initial(t.display_name)}</span><span><h1>${t.display_name}</h1>
<small>${t.school || 'ยังไม่กรอกโรงเรียน'}</small></span></div>
<div class="row">${t.status !== 'active' ? html`<span class="badge bad">ระงับ</span>` : waiting ? html`<span class="badge warn">รออนุมัติ</span>` : html`<span class="badge ok">อนุมัติแล้ว</span>`}
<form method="post" action="/app/admin/members/${t.id}/${t.status === 'active' ? 'block' : 'unblock'}">${csrfField(ctx)}
<button class="btn ${t.status === 'active' ? 'danger' : 'ok'} small" type="submit">${t.status === 'active' ? 'ระงับสมาชิก' : 'เปิดใช้งาน'}</button></form></div></div>
<p class="mono muted mt-s">${t.line_user_id}</p><p class="small">สมัครเมื่อ ${fmtDateTime(t.created_at)} · เข้าล่าสุด ${fmtDateTime(t.last_login_at)}${t.approved_at ? html` · อนุมัติ ${fmtDateTime(t.approved_at)}` : ''}</p></div>
${waiting ? html`<section class="card wbanner"><h2>${icon('hourglass')} รออนุมัติ</h2><p class="muted small">ครูคนนี้เข้าสู่ระบบด้วย LINE ครั้งแรกแล้ว ยังเปิดอะไรไม่ได้จนกว่าจะอนุมัติ อนุมัติพร้อมให้สิทธิ์ทั้งเล่มได้เลย หรือเลือกรายหน่วยด้านล่างหลังอนุมัติ</p>
  ${approveForm(ctx, t, books)}</section>` : ''}
${erased ? '' : await memberAccessPanel(ctx, t)}
<div class="sec-head"><h2>การสมัคร (จ่ายเงิน)</h2></div>${subsTable(ctx, subs)}
<div class="card mt-s"><h3>ต่ออายุการสมัครด้วยมือ</h3><p class="muted small">เช่น รับเงินนอกระบบ (ไม่สร้างรายการชำระเงิน) ถ้าจะให้ใช้ฟรีรายหน่วย ใช้ “สิทธิ์เข้าถึงสไลด์” ด้านบน</p>
<form method="post" action="/app/admin/members/${t.id}/grant" class="row">${csrfField(ctx)}
<select name="book_id" aria-label="หนังสือ">${books.map((b) => html`<option value="${b.id}">${b.title}</option>`)}</select>
<select name="months" aria-label="จำนวนเดือน">${MONTH_OPTIONS.map((m) => html`<option value="${m}">${m} เดือน</option>`)}</select>
<button class="btn small" type="submit">ต่ออายุ</button></form></div>
<div class="sec-head"><h2>การชำระเงิน</h2></div>${paymentsTable(ctx, pays)}
${erased || t.id === ctx.teacher!.id ? '' : html`<details class="card mt"><summary>ลบข้อมูลส่วนตัวของสมาชิก (ตามคำขอ PDPA)</summary>
<p class="small muted">ลบชื่อ โรงเรียน รหัส LINE สิทธิ์ที่ให้ไว้ และคำขอทำหนังสือ ระงับบัญชี ออกจากระบบทุกเครื่อง และปิดการสมัครที่ยังเปิดอยู่ ยอดและวันที่ชำระเงินยังเก็บไว้เป็นหลักฐานทางบัญชี ย้อนกลับไม่ได้</p>
<form method="post" action="/app/admin/members/${t.id}/erase" class="row">${csrfField(ctx)}<label class="check"><input type="checkbox" name="confirm" value="yes" required> ยืนยันการลบข้อมูล</label><button class="btn danger small" type="submit">ลบข้อมูลสมาชิก</button></form></details>`}`, { script: true });
}

/** POST /app/admin/members/:id/erase: PDPA erasure (needs the "confirm" box). */
export async function erase(ctx: Ctx): Promise<Response> {
  const { form, actor } = await adminPost(ctx);
  requireConfirm(form);
  const t = await db.getTeacher(ctx.env, idParam(ctx.params.id));
  if (!t) throw new HttpError(404, 'ไม่พบสมาชิก');
  if (t.id === ctx.teacher!.id) throw new HttpError(400, 'ลบข้อมูลบัญชีของตัวเองไม่ได้');
  await db.eraseTeacher(ctx.env, t.id, ctx.now);
  await audit(ctx.env, ctx.now, actor, 'member.erase', `teacher:${t.id}`);
  return redirect(`/app/admin/members/${t.id}?m=erased`);
}

function subsTable(ctx: Ctx, rows: db.SubRow[]): Safe {
  if (!rows.length) return html`<div class="empty box"><p>ไม่มีรายการ</p></div>`;
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
  const t = tabs('/app/admin/subscriptions', 'filter', filter, [['all', 'ทั้งหมด'], ['active', 'ใช้งานอยู่'], ['pending', 'รอชำระ'], ['expired', 'หมดอายุ']] as const);
  return adminPage(ctx, 'การสมัคร', 'subs', html`<h1>การสมัคร</h1>${t}${subsTable(ctx, rows)}`);
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
<td><b>${b.slide_count ? money(monthlyPrice(b.slide_count, b.rate_baht_per_slide)) : '–'}</b></td><td>${bookStatusBadge(b.status)}</td></tr>`)}</tbody></table></div>` : html`<div class="empty box"><p>ยังไม่มีหนังสือ</p></div>`}
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
<a class="back" href="/app/admin/books">${icon('left')}หนังสือ</a>
<div class="card"><div class="row between"><h1>${b.title}</h1><div class="row">${bookStatusBadge(b.status)}<a class="btn ghost small" href="/app/admin/books/${b.id}/access">${icon('users')}ใครเข้าถึงได้บ้าง</a></div></div>
<p class="muted">${b.slide_count} สไลด์ (รวมทุกหน่วย) × ${b.rate_baht_per_slide} บาท = <b>${b.slide_count ? money(monthlyPrice(b.slide_count, b.rate_baht_per_slide)) : 0} บาท/เดือน</b> · ราคาใหม่ใช้กับการสมัครครั้งถัดไป</p>
${bookForm(ctx, b, `/app/admin/books/${b.id}`, 'บันทึก')}</div>
<h2 class="mt">หน่วยการเรียนรู้</h2>
${units.map((u) => html`<div class="card"><form method="post" action="/app/admin/units/${u.id}">${csrfField(ctx)}
<div class="cols"><div class="field"><label for="p${u.id}">ลำดับ</label><input id="p${u.id}" name="position" type="number" min="1" max="999" value="${u.position}"></div>
<div class="field"><label for="t${u.id}">ชื่อหน่วย</label><input id="t${u.id}" name="title" type="text" maxlength="160" required value="${u.title}"></div>
<div class="field"><label for="s${u.id}">จำนวนสไลด์</label><input id="s${u.id}" name="slide_count" type="number" min="0" max="2000" value="${u.slide_count}"></div></div>
<div class="row"><button class="btn small" type="submit">บันทึกหน่วย</button>
${u.r2_key ? html`<a class="btn ghost small" href="/app/deck/${u.id}/">ดูตัวอย่าง</a>` : ''}
<a class="btn ghost small" href="/app/admin/books/${b.id}/access?unit=${u.id}">${icon('users')}ใครเข้าถึงได้</a>
<span class="small muted">${u.r2_key ? html`ไฟล์: ${money(Math.round((u.html_bytes ?? 0) / 1024))} KB · อัปโหลด ${fmtDateTime(u.uploaded_at)} · <span class="mono">${(u.html_sha256 ?? '').slice(0, 12)}</span>` : 'ยังไม่มีไฟล์สไลด์'}</span></div></form>
<form method="post" action="/app/admin/units/${u.id}/upload" enctype="multipart/form-data" class="row mt-s">${csrfField(ctx)}
<label class="sr" for="f${u.id}">ไฟล์ HTML</label><input id="f${u.id}" name="file" type="file" accept=".html,text/html" required>
<button class="btn ghost small" type="submit">อัปโหลด HTML</button><span class="small muted">นับสไลด์และคำนวณ CSP ให้อัตโนมัติ</span></form>
<form method="post" action="/app/admin/units/${u.id}/delete" class="row mt-s">${csrfField(ctx)}<label class="check"><input type="checkbox" name="confirm" value="yes" required> ยืนยันการลบ (ลบไฟล์สไลด์ด้วย)</label><button class="btn danger small" type="submit">ลบหน่วยนี้</button></form>
</div>`)}
<div class="card mt"><h3>เพิ่มหน่วย</h3><form method="post" action="/app/admin/books/${b.id}/units">${csrfField(ctx)}
<div class="cols"><div class="field"><label for="np">ลำดับ</label><input id="np" name="position" type="number" min="1" max="999" value="${nextPos}"></div>
<div class="field"><label for="nt">ชื่อหน่วย</label><input id="nt" name="title" type="text" maxlength="160" required></div>
<div class="field"><label for="ns">จำนวนสไลด์</label><input id="ns" name="slide_count" type="number" min="0" max="2000" value="0"></div></div>
<button class="btn small" type="submit">เพิ่มหน่วย</button></form></div>
<details class="card mt"><summary>ลบหนังสือเล่มนี้</summary><p class="small muted">ลบได้เฉพาะเล่มที่ยังไม่มีใครสมัคร ถ้ามีสมาชิกแล้ว ให้เปลี่ยนสถานะเป็นเก็บถาวร</p>
<form method="post" action="/app/admin/books/${b.id}/delete" class="row">${csrfField(ctx)}<label class="check"><input type="checkbox" name="confirm" value="yes" required> ยืนยันการลบ</label><button class="btn danger small" type="submit">ลบหนังสือ</button></form></details>`);
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

/** Deleting needs the "confirm" box ticked: there is no script on the page, so the check is in the form. */
function requireConfirm(form: FormData): void {
  if (str(form, 'confirm') !== 'yes') throw new HttpError(400, 'กรุณาติ๊ก "ยืนยันการลบ" ก่อนกดลบ');
}

/** POST /app/admin/books/:id/delete */
export async function deleteBook(ctx: Ctx): Promise<Response> {
  const { form, actor } = await adminPost(ctx);
  requireConfirm(form);
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
  const { form, actor } = await adminPost(ctx);
  requireConfirm(form);
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
  const type = oneOf(ctx.params.type, ['members', 'subscriptions', 'payments', 'grants'] as const, 'type');
  let body: string;
  if (type === 'members') {
    const rows = await db.listTeachers(ctx.env, '', ctx.now, 100000);
    body = toCsv(['id', 'line_user_id', 'display_name', 'school', 'status', 'active_subscriptions', 'created_at', 'last_login_at'],
      rows.map((t) => [t.id, t.line_user_id, t.display_name, t.school, t.status, t.active_count, iso(t.created_at), iso(t.last_login_at)]));
  } else if (type === 'subscriptions') {
    const rows = await db.listSubscriptions(ctx.env, 'all', ctx.now, undefined, 100000);
    body = toCsv(['id', 'teacher_id', 'display_name', 'school', 'book', 'status', 'period_start', 'period_end', 'monthly_price_baht'],
      rows.map((s) => [s.id, s.teacher_id, s.display_name, s.school, s.title, db.effectiveStatus(s, ctx.now), iso(s.period_start), iso(s.period_end), s.monthly_price]));
  } else if (type === 'grants') {
    const rows = await db.listAllGrants(ctx.env);
    body = toCsv(['id', 'teacher_id', 'display_name', 'school', 'book', 'unit_position', 'unit', 'expires_at', 'active', 'granted_by', 'note', 'created_at'],
      rows.map((g) => [g.id, g.teacher_id, g.display_name, g.school, g.book_title, g.position, g.unit_title, iso(g.expires_at), db.isLive(g, ctx.now) ? 'yes' : 'no', g.granted_by, g.note, iso(g.created_at)]));
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
</tbody></table></div>${rows.length === 100 ? html`<p class="mt-s"><a class="btn ghost small" href="/app/admin/audit?before=${rows[rows.length - 1].id}">เก่ากว่า →</a></p>` : ''}` : html`<div class="empty box"><p>ยังไม่มีบันทึก</p></div>`}`);
}

// ---------- book requests (คำขอทำหนังสือ) ----------
const ADMIN_STATUSES = ['new', 'quoted', 'building', 'done', 'declined'] as const;
const FILTERS = ['open', 'new', 'quoted', 'building', 'done', 'declined', 'draft', 'all'] as const;

function briefOf(r: db.AdminRequestRow | (BookRequest & { school: string }), answers: Parameters<typeof buildBrief>[1]): string {
  return buildBrief(r, answers);
}

function statusForm(ctx: Ctx, r: BookRequest, o: { copy?: boolean; brief?: string } = {}): Safe {
  return html`<form class="act" method="post" action="/app/admin/requests/${r.id}">${csrfField(ctx)}
    <div><label for="st${r.id}">สถานะ</label>
    <select id="st${r.id}" name="status">${ADMIN_STATUSES.map((s) =>
      html`<option value="${s}"${s === r.status ? new Safe(' selected') : ''}>${REQUEST_STATUS[s].admin}</option>`)}
      ${r.status === 'draft' ? html`<option value="draft" selected disabled>${REQUEST_STATUS.draft.admin}</option>` : ''}</select></div>
    <div><label for="on${r.id}">โน้ตของเจ้าของ <span class="opt">(ครูไม่เห็น)</span></label>
    <textarea id="on${r.id}" name="owner_note" maxlength="2000" rows="3" placeholder="เช่น เสนอราคา 990 บาท/เดือน ส่งทาง LINE แล้ว 28 พ.ย.">${r.owner_note}</textarea></div>
    <div class="row"><button class="btn small" type="submit">${icon('check')}บันทึก</button>
    ${o.copy ? html`<button class="btn ghost small" type="button" data-copy="brief-${r.id}" hidden>${icon('copy')}<span class="lbl">คัดลอก brief</span></button>` : ''}
    </div>
    ${o.brief !== undefined ? html`<template id="brief-${r.id}">${o.brief}</template>` : ''}
  </form>`;
}

/** GET /app/admin/requests?status= */
export async function requests(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const filter = oneOf(ctx.url.searchParams.get('status') || 'open', FILTERS, 'status');
  const [rows, n] = await Promise.all([db.listRequests(ctx.env, filter, 200), db.requestCounts(ctx.env)]);
  const answers = await db.answersFor(ctx.env, rows.map((r) => r.id));
  const all = Object.values(n).reduce((a, b) => a + b, 0);
  const t = tabs('/app/admin/requests', 'status', filter, [
    ['open', 'ที่ต้องดูแล', n.new + n.quoted + n.building], ['new', 'ใหม่', n.new], ['quoted', 'เสนอราคาแล้ว', n.quoted],
    ['building', 'กำลังทำ', n.building], ['done', 'เสร็จแล้ว', n.done], ['declined', 'ไม่รับทำ', n.declined],
    ['draft', 'ทำแบบทดสอบไม่จบ', n.draft], ['all', 'ทั้งหมด', all],
  ] as const);
  const cards = rows.length ? html`<div class="reqs">${rows.map((r) => {
    const a = answers.get(r.id) ?? {};
    return html`<article class="card areq" id="r${r.id}">
      <div class="hd"><span class="num">#${r.id}</span><h3><a href="/app/admin/requests/${r.id}">${r.subject} ${r.grade}</a></h3>
        <span class="muted small"><a href="/app/admin/members/${r.teacher_id}">${r.display_name}</a> · ${r.school || '–'} · ${r.submitted_at ? html`ส่ง ${fmtDateTime(r.submitted_at)}` : html`เริ่ม ${fmtDateTime(r.created_at)}`}</span>
        ${requestBadge(r.status, 'admin')}</div>
      <div class="bd">
        <div>${requestFacts(r)}
          <div class="sum${r.summary ? '' : ' none'}">${r.summary || `ยังไม่จบแบบทดสอบ (ตอบแล้ว ${r.answered}/${QUIZ_LENGTH} ข้อ)`}</div>
          <h4 class="mt">ภาพที่เลือก</h4>${choiceThumbs(a, true)}</div>
        <div>${statusForm(ctx, r, { copy: true, brief: briefOf(r, a) })}
          <p class="small mt-s"><a href="/app/admin/requests/${r.id}">ดู brief และคำตอบทั้งหมด →</a></p></div>
      </div></article>`;
  })}</div>`
    : html`<div class="empty box">${emptyArt()}<h3>ไม่มีคำขอในหมวดนี้</h3><p>เมื่อคุณครูกด “ขอทำหนังสือ” และเลือกสไตล์ครบ คำขอจะขึ้นที่นี่</p></div>`;
  return adminPage(ctx, 'คำขอทำหนังสือ', 'requests', html`<div class="hello"><div><span class="kicker">ขอทำหนังสือ + แบบทดสอบสไตล์</span><h1>คำขอทำหนังสือ</h1></div></div>${t}${cards}`, { script: true });
}

/** GET /app/admin/requests/:id: one request with the full brief to copy. */
export async function request(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const r = await db.getRequest(ctx.env, idParam(ctx.params.id));
  if (!r) throw new HttpError(404, 'ไม่พบคำขอนี้');
  const [teacher, answers] = await Promise.all([db.getTeacher(ctx.env, r.teacher_id), db.getAnswers(ctx.env, r.id)]);
  const brief = buildBrief({ ...r, school: teacher?.school ?? '' }, answers);
  const rows = QUIZ.map((q) => {
    const c = answers[q.key];
    const side = (s: 'a' | 'b') => html`<figure class="thumb${c === s || c === 'both' ? ' on' : ' off'}"><div class="im"><img src="${imagePath(q.key, s, true)}" width="480" height="270" alt="" loading="lazy"></div>
      <figcaption><b>${s.toUpperCase()} · ${q[s].th}</b>${q[s].en}</figcaption></figure>`;
    return html`<tr><td><b>${q.th}</b><br><span class="muted small">${q.dim}</span></td>
      <td>${c ? html`<b>${c === 'both' ? 'ได้ทั้งคู่' : c.toUpperCase()}</b><br><span class="small muted">${answerEn(q, c)}</span>` : html`<span class="badge warn">ยังไม่ตอบ</span>`}</td>
      <td><div class="ab2">${side('a')}${side('b')}</div></td></tr>`;
  });
  return adminPage(ctx, `คำขอ #${r.id}`, 'requests', html`
<a class="back" href="/app/admin/requests">${icon('left')}คำขอทำหนังสือ</a>
<article class="card areq">
  <div class="hd"><span class="num">#${r.id}</span><h3>${r.subject} ${r.grade}</h3>
    <span class="muted small">${teacher ? html`<a href="/app/admin/members/${teacher.id}">${teacher.display_name}</a> · ${teacher.school || '–'}` : ''} · ${r.submitted_at ? html`ส่ง ${fmtDateTime(r.submitted_at)}` : html`เริ่ม ${fmtDateTime(r.created_at)} (ยังไม่จบแบบทดสอบ)`}</span>
    ${requestBadge(r.status, 'admin')}</div>
  <div class="bd"><div>${requestFacts(r)}<div class="sum${r.summary ? '' : ' none'}">${r.summary || 'ยังไม่จบแบบทดสอบ'}</div></div>
    <div>${statusForm(ctx, r)}</div></div>
</article>
<div class="card">
  <div class="row between"><div><h2>Brief สำหรับสั่งงาน Claude</h2><p class="muted small">คัดลอกข้อความนี้ไปวางให้ Claude เพื่อเริ่มทำสไลด์ (ไม่มีชื่อครูหรือรหัส LINE)</p></div>
  <button class="btn sun" type="button" data-copy="brief" hidden>${icon('copy')}<span class="lbl">คัดลอก brief</span></button></div>
  <label class="sr" for="brief">Brief</label><textarea id="brief" class="brief" readonly>${brief}</textarea>
</div>
<div class="sec-head"><h2>คำตอบแบบทดสอบสไตล์</h2></div>
<div class="table"><table class="answers"><thead><tr><th>หัวข้อ</th><th>คำตอบ</th><th>ภาพ A / B</th></tr></thead><tbody>${rows}</tbody></table></div>`, { script: true });
}

/** POST /app/admin/requests/:id: status + owner note. */
export async function updateRequest(ctx: Ctx): Promise<Response> {
  const { form, actor } = await adminPost(ctx);
  const r = await db.getRequest(ctx.env, idParam(ctx.params.id));
  if (!r) throw new HttpError(404, 'ไม่พบคำขอนี้');
  const status = oneOf(str(form, 'status') || r.status, [...ADMIN_STATUSES, ...(r.status === 'draft' ? ['draft' as const] : [])], 'สถานะ');
  const note = cleanMultiline(str(form, 'owner_note'), { max: 2000, field: 'โน้ต' });
  await db.updateRequestAdmin(ctx.env, r.id, status, note, ctx.now);
  await audit(ctx.env, ctx.now, actor, 'request.update', `request:${r.id}`, { from: r.status, to: status });
  return redirect(back(ctx, '/app/admin/requests') + `m=request#r${r.id}`);
}
