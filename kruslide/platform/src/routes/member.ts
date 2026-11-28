import type { Book, Ctx } from '../env';
import { html, Safe } from '../lib/html';
import { HttpError, needLogin, htmlResponse, redirect, safeNext } from '../lib/http';
import { page, flash, csrfField, bookArt, subBadge, payBadge, fmtDate, fmtDateTime, money, icon, emptyArt, untilText, lineAddUrl } from '../views/layout';
import { teacherLibrary, type BookView, type UnitView } from '../lib/access';
import * as db from '../db';
import { MONTH_OPTIONS, monthlyPrice, perDay, RATE_MAX, RATE_MIN } from '../lib/pricing';
import { checkCsrf } from '../lib/csrf';
import { cleanText, idParam, int, readForm, str } from '../lib/validate';
import { rateLimit } from '../lib/ratelimit';
import { LIMITS, lineOa } from '../lib/config';
import { audit } from '../lib/audit';
import { paymentProvider, providerFor } from '../payments';

/** Marks the refusal of a member whose account waits for approval: the error handler shows the waiting page. */
export const WAITING = 'waiting-for-approval';

/** A logged-in, active member. Members waiting for approval get only the waiting page (and their profile). */
export function requireTeacher(ctx: Ctx, o: { allowWaiting?: boolean } = {}): NonNullable<Ctx['teacher']> {
  if (!ctx.teacher) throw needLogin();
  if (ctx.teacher.status !== 'active') throw new HttpError(403, 'บัญชีนี้ถูกระงับ กรุณาติดต่อทีมงานทาง LINE');
  if (ctx.waiting && !o.allowWaiting) throw new HttpError(403, 'บัญชีของคุณครูกำลังรอทีมงานอนุมัติ', WAITING);
  return ctx.teacher;
}

/** "รออนุมัติ": the friendly page a new member sees until the owner approves them. */
export function waitingPage(ctx: Ctx): Safe {
  const t = ctx.teacher!;
  const oa = lineOa(ctx.env);
  return page(ctx, {
    title: 'รออนุมัติ',
    nav: 'home',
    body: html`${flash(ctx)}<section class="card wait">
  <svg class="hg" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" fill="#FFF1C9"/>
    <rect x="36" y="22" width="48" height="9" rx="4.5" fill="#1C2A55"/><rect x="36" y="89" width="48" height="9" rx="4.5" fill="#1C2A55"/>
    <path d="M41 31c0 16 15 19 15 29S41 73 41 89h38c0-16-15-19-15-29s15-13 15-29z" fill="#fff" stroke="#1C2A55" stroke-width="5" stroke-linejoin="round"/>
    <path class="sand" d="M49 82c3-7 8-9 11-9s8 2 11 9z" fill="#FFC83D"/><circle class="drop" cx="60" cy="64" r="2.6" fill="#FFC83D"/>
    <path d="M50 40h20c-2 5-6 8-10 10-4-2-8-5-10-10z" fill="#FFC83D"/></svg>
  <span class="badge warn">รออนุมัติ</span>
  <h1>สวัสดี ${t.display_name}<br>ทีมงานกำลังตรวจสอบบัญชีของคุณครู</h1>
  <p class="lead">เพื่อให้สไลด์ถึงมือคุณครูตัวจริง เราอนุมัติสมาชิกใหม่ทีละคน ปกติไม่เกิน 1 วันทำการ เมื่ออนุมัติแล้ว กลับมาที่หน้านี้ได้เลย สไลด์ที่ได้รับสิทธิ์จะขึ้นให้ทันที</p>
  <ol class="wsteps">
    <li class="done"><span>${icon('check')}</span>เข้าสู่ระบบด้วย LINE แล้ว</li>
    <li class="${t.school ? 'done' : 'now'}"><span>${t.school ? icon('check') : '2'}</span>${t.school ? html`โรงเรียน: ${t.school}` : html`<a href="/app/profile">กรอกชื่อโรงเรียน</a>`}</li>
    <li class="now"><span>${icon('hourglass')}</span>รอทีมงานอนุมัติ</li>
  </ol>
  <p class="row"><a class="btn line" href="${lineAddUrl(oa)}" rel="noopener">${icon('chat')}ทักทีมงานทาง LINE ${oa}</a>
    <a class="btn ghost" href="/app/profile">${icon('user')}ข้อมูลของฉัน</a></p>
  <p class="small muted">ส่งชื่อ-โรงเรียนให้ทีมงานทาง LINE ได้เลย จะอนุมัติเร็วขึ้น</p>
</section>`,
  });
}

function landing(ctx: Ctx): Response {
  return htmlResponse(page(ctx, {
    title: 'เข้าสู่ระบบ',
    body: html`${flash(ctx)}
<section class="hero">
  <div>
    <span class="pill">${icon('school')}สำหรับคุณครูไทยและครู English Program</span>
    <h1><span class="nw">สไลด์ที่ทั้งห้อง<mark>อยากตอบ</mark></span><br><span class="nw">พร้อมสอนทุกหน่วย</span></h1>
    <p class="lead">สมัครเป็นรายเล่มตามหนังสือเรียน เปิดสอนผ่านลิงก์ของครูสไลด์ได้ทันที หรือขอให้เราทำเล่มที่คุณครูสอน พร้อมเลือกสไตล์ที่ชอบเอง</p>
    <p class="row mt-s"><a class="btn line big" href="/app/login">${icon('chat')}เข้าสู่ระบบด้วย LINE</a></p>
    <ul class="ticks"><li>${icon('check')}ไม่ต้องติดตั้งโปรแกรม</li><li>${icon('check')}${RATE_MIN}–${RATE_MAX} บาท/สไลด์/เดือน</li><li>${icon('check')}จ่ายผ่าน PromptPay</li></ul>
    <p class="small muted mt-s">เราเก็บเฉพาะรหัสผู้ใช้ LINE ชื่อที่แสดง และชื่อโรงเรียน ไม่เก็บอีเมล เบอร์โทร หรือข้อมูลนักเรียน · <a href="/app/privacy">อ่านเพิ่มเติม</a></p>
  </div>
  <div class="mock" aria-hidden="true">
    <div class="scr"><div class="q"></div><div class="q s"></div><div class="bars"><i></i><i></i><i></i><i></i></div></div>
    <span class="float f1">${icon('spark')}แอนิเมชันทุกหน้า</span>
    <span class="float f2">${icon('check')}ตอบถูก 28/35 คน</span>
    <span class="float f3">${icon('hand')}แตะ ลาก เขียนบนจอ</span>
  </div>
</section>
<div class="feats">
  <div class="feat"><span class="ic-tile t-sky">${icon('book')}</span><b>สมัครรายเล่ม</b><span>เลือกหนังสือที่เปิดขาย ราคาตามจำนวนสไลด์ เปิดสอนได้ทันทีหลังชำระเงิน</span></div>
  <div class="feat"><span class="ic-tile t-sun">${icon('spark')}</span><b>ขอทำเล่มของคุณครู</b><span>บอกหนังสือและหน่วยที่สอน เลือกสไตล์จากภาพตัวอย่าง 10 ข้อ ทีมงานติดต่อกลับทาง LINE</span></div>
  <div class="feat"><span class="ic-tile t-mint">${icon('play')}</span><b>ใช้ผ่านลิงก์ของเรา</b><span>เปิดบนโปรเจกเตอร์ ทีวี หรือแท็บเล็ต นักเรียนตอบบนจอได้ทุกหน่วย</span></div>
</div>`,
  }));
}

function onboarding(t: NonNullable<Ctx['teacher']>, hasChoice: boolean, hasActive: boolean): Safe {
  const steps = [
    { done: !!t.school, title: 'กรอกชื่อโรงเรียน', text: html`ใช้แสดงบนสไลด์ว่าเป็นของคุณครู · <a href="/app/profile">กรอกเลย</a>` },
    { done: hasChoice, title: 'เลือกหนังสือ หรือขอทำเล่มใหม่', text: html`<a href="#catalog">ดูหนังสือที่เปิดขาย</a> หรือ <a href="/app/requests/new">ขอทำหนังสือ</a>` },
    { done: hasActive, title: 'ชำระเงิน แล้วเปิดสอน', text: html`โอนผ่าน PromptPay ทีมงานยืนยันแล้วเปิดสไลด์ได้ทันที` },
  ];
  const n = steps.filter((x) => x.done).length;
  const now = steps.findIndex((x) => !x.done);
  return html`<section class="card onb" aria-label="เริ่มต้นใช้งาน">
    <div><span class="kicker">เริ่มต้นใช้งาน</span><div class="meter"><b>${n}/3</b><span class="muted">ขั้นตอนเสร็จแล้ว</span></div>
      <div class="bar s${n}"><i></i></div></div>
    <ol class="steps-h">${steps.map((x, i) => html`<li class="${x.done ? 'done' : i === now ? 'now' : ''}">
      <span class="dot">${x.done ? icon('check') : i + 1}</span><div><b>${x.title}</b><span>${x.text}</span></div></li>`)}</ol>
  </section>`;
}

/** GET /app/ */
export async function home(ctx: Ctx): Promise<Response> {
  if (!ctx.teacher) return landing(ctx);
  if (ctx.teacher.status === 'active' && ctx.waiting) return htmlResponse(waitingPage(ctx));
  const t = requireTeacher(ctx);
  const [library, books, payments, reqs] = await Promise.all([
    teacherLibrary(ctx.env, t.id, ctx.now),
    db.listBooks(ctx.env, true),
    db.listPaymentsForTeacher(ctx.env, t.id),
    db.listMyRequests(ctx.env, t.id),
  ]);
  const mine = new Set(library.map((v) => v.book.id));
  const pending = payments.filter((p) => p.status === 'pending');
  const openBooks = library.filter((v) => v.openCount > 0);
  const openUnits = library.reduce((n, v) => n + v.units.filter((u) => u.open && u.unit.r2_key).length, 0);
  const openReqs = reqs.filter((r) => r.status !== 'done' && r.status !== 'declined');
  const draft = reqs.find((r) => r.status === 'draft');

  const mySection = library.length
    ? html`${library.map((v) => myBook(v, ctx.now))}`
    : html`<div class="empty box">${emptyArt()}<h3>ชั้นหนังสือของคุณครูยังว่าง</h3>
        <p>เลือกหนังสือที่เปิดขายด้านล่าง หรือบอกเราว่าสอนเล่มไหน แล้วเราจะทำสไลด์ให้ทั้งเล่มตามสไตล์ที่คุณครูเลือก</p>
        <p class="row"><a class="btn" href="#catalog">${icon('book')}ดูหนังสือที่เปิดขาย</a><a class="btn sun" href="/app/requests/new">${icon('spark')}ขอทำหนังสือ</a></p></div>`;

  const catalog = books.filter((b) => !mine.has(b.id));
  const showOnb = !openBooks.length && !reqs.some((r) => r.status !== 'draft');
  return htmlResponse(page(ctx, {
    title: 'หนังสือของฉัน',
    nav: 'home',
    body: html`${flash(ctx)}
<div class="hello"><div><span class="kicker">พื้นที่สมาชิก</span><h1>สวัสดี ${t.display_name}</h1>
<p class="muted">${t.school ? html`${icon('school')} ${t.school}` : html`<a href="/app/profile">เพิ่มชื่อโรงเรียน</a>`}</p></div></div>
${!t.school ? html`<div class="flash warn">กรุณา<a href="/app/profile">กรอกชื่อโรงเรียน</a>ก่อนเปิดสไลด์ (ชื่อจะแสดงมุมสไลด์ว่าเป็นของคุณครู)</div>` : ''}
${showOnb ? onboarding(t, library.length > 0 || reqs.length > 0, openBooks.length > 0) : ''}
<div class="bento">
  <a class="tile sun span2" href="${draft ? `/app/requests/${draft.id}/quiz/${Math.min(draft.answered + 1, 10)}` : '/app/requests/new'}"><span class="deco"></span>
    <span class="kicker">ขอทำหนังสือ</span>
    <h2>${draft ? 'เลือกสไตล์ต่อให้ครบ แล้วส่งคำขอ' : 'ไม่เจอเล่มที่สอน? ให้เราทำให้ทั้งเล่ม'}</h2>
    <p>${draft ? html`คำขอ ${draft.subject} ${draft.grade} เลือกแล้ว ${draft.answered}/10 ข้อ` : 'บอกหนังสือและหน่วยที่สอน แล้วแตะเลือกสไตล์ที่ชอบ 10 ข้อ ใช้เวลาประมาณ 2 นาที'}</p>
    <span class="go">${draft ? 'ทำต่อ' : 'เริ่มขอทำหนังสือ'} ${icon('right')}</span></a>
  <div class="tile"><span class="ic-tile">${icon('play')}</span><b class="num">${openUnits}</b><span class="lbl">สไลด์ที่เปิดสอนได้</span></div>
  <a class="tile tomi" href="/app/requests"><span class="ic-tile">${icon('inbox')}</span><b class="num">${openReqs.length}</b><span class="lbl">คำขอทำหนังสือที่กำลังดำเนินการ</span></a>
</div>
${pending.length ? html`<div class="sec-head"><h2>รอชำระเงิน</h2></div><div class="card stack">${pending.map((p) => html`<div class="row between"><span><b>${p.title}</b> · ${p.months} เดือน · <b>${money(p.amount_satang / 100)} บาท</b> ${payBadge(p)}</span><a class="btn small" href="/app/payments/${p.id}">${icon('wallet')}ดูวิธีชำระเงิน</a></div>`)}</div>` : ''}
<div class="sec-head"><h2>หนังสือของฉัน</h2>${library.length ? html`<span class="muted small">เปิดสอนได้ ${openUnits} สไลด์ จาก ${openBooks.length} เล่ม</span>` : ''}</div>
${mySection}
<div class="sec-head" id="catalog"><h2>หนังสือที่เปิดขาย</h2><a href="/app/requests/new">ไม่เจอเล่มที่สอน? ขอทำหนังสือ →</a></div>
${catalog.length ? html`<div class="grid">${catalog.map((b) => bookCard(b))}</div>` : html`<div class="empty box"><p>คุณครูสมัครครบทุกเล่มที่เปิดขายแล้ว</p></div>`}`,
  }));
}

/** The member may open the book page: it is not a draft, or they hold a grant in it. */
function bookReachable(v: BookView): boolean {
  return v.book.status !== 'draft' || v.units.some((u) => u.grant);
}

/** One of "my books": only the decks the teacher can open, each with its expiry. */
function myBook(v: BookView, now: number): Safe {
  const total = v.units.length;
  const open = v.units.filter((u) => u.open);
  const status = v.sub ? db.effectiveStatus(v.sub, now) : 'none';
  const full = total > 0 && open.length === total;
  const tag = open.length
    ? full ? html`<span class="badge ok">เปิดได้ทั้งเล่ม</span>` : html`<span class="badge info">เปิดได้ ${open.length} จาก ${total} หน่วย</span>`
    : subBadge(status === 'none' ? 'expired' : status);
  const sellable = v.book.status === 'published' && v.book.slide_count > 0;
  const action = status === 'pending'
    ? html`<a class="btn sun small" href="/app/books/${v.book.id}">ดูวิธีชำระเงิน</a>`
    : sellable && (status === 'active' || status === 'expired') ? html`<a class="btn ${status === 'active' ? 'ghost' : 'sun'} small" href="/app/books/${v.book.id}">ต่ออายุ</a>`
    : sellable && !full ? html`<a class="btn ghost small" href="/app/books/${v.book.id}">สมัครทั้งเล่ม</a>`
    : '';
  return html`<article class="bhead">
    ${bookArt(v.book, tag)}
    <div class="body">
      <div class="row between"><div><h3>${bookReachable(v) ? html`<a href="/app/books/${v.book.id}">${v.book.title}</a>` : v.book.title}</h3>
      <p class="muted small">${v.book.subject} · ${v.book.grade}${!full && open.length ? html` · เปิดได้ ${open.length} จาก ${total} หน่วย` : ''}</p></div>${action}</div>
      ${open.length ? openUnitList(open) : html`<p class="small">${status === 'pending' ? 'รอยืนยันการชำระเงิน เมื่อทีมงานยืนยันแล้วจะเปิดสไลด์ได้ทันที' : 'สิทธิ์หมดอายุแล้ว ต่ออายุเพื่อเปิดสไลด์อีกครั้ง'}</p>`}
    </div>
  </article>`;
}

/** Units the member can open, with "open" (or "coming soon" when no deck is uploaded yet) and the expiry. */
function openUnitList(units: UnitView[]): Safe {
  return html`<ul class="units">${units.map((v) => html`<li>
    <span class="n">${v.unit.position}</span>
    <span class="t">${v.unit.title}<br><span class="muted small">${v.unit.slide_count} สไลด์ · ${icon('clock')} ${untilText(v.until)}</span></span>
    ${v.unit.r2_key ? html`<a class="btn small" href="/app/deck/${v.unit.id}/">${icon('play')}เปิดสไลด์</a>` : html`<span class="badge plain">เร็ว ๆ นี้</span>`}
  </li>`)}</ul>`;
}

function bookCard(b: Book): Safe {
  if (b.slide_count < 1) {
    return html`<article class="bcard">${bookArt(b, html`<span class="badge warn">เร็ว ๆ นี้</span>`)}<div class="body"><h3>${b.title}</h3>
      <p class="muted small">${b.subject} · ${b.grade}</p><a class="btn ghost" href="/app/books/${b.id}">ดูรายละเอียด</a></div></article>`;
  }
  const monthly = monthlyPrice(b.slide_count, b.rate_baht_per_slide);
  return html`<article class="bcard">${bookArt(b, html`<span class="badge plain">${b.slide_count} สไลด์</span>`)}
    <div class="body"><h3>${b.title}</h3>
    <div><div class="price">${money(monthly)} <small>บาท/เดือน</small></div>
    <div class="muted small">${b.slide_count} สไลด์ × ${b.rate_baht_per_slide} บาท · ประมาณ ${perDay(monthly)} บาท/วัน</div></div>
    <a class="btn" href="/app/books/${b.id}">ดูรายละเอียดและสมัคร ${icon('right')}</a></div></article>`;
}

/** Every unit of a book: open ones with their button and expiry, the others shown as not included. */
function unitList(units: UnitView[]): Safe {
  if (!units.length) return html`<p class="muted small">ยังไม่มีหน่วยการเรียนรู้</p>`;
  return html`<ul class="units">${units.map((v) => html`<li class="${v.open ? '' : 'off'}">
    <span class="n">${v.unit.position}</span>
    <span class="t">${v.unit.title}<br><span class="muted small">${v.unit.slide_count} สไลด์${v.open ? html` · ${icon('clock')} ${untilText(v.until)}` : ''}</span></span>
    ${v.open ? v.unit.r2_key ? html`<a class="btn small" href="/app/deck/${v.unit.id}/">${icon('play')}เปิดสไลด์</a>` : html`<span class="badge plain">เร็ว ๆ นี้</span>`
      : html`<span class="badge plain">${icon('lock')} ยังไม่ได้รับสิทธิ์</span>`}
  </li>`)}</ul>`;
}

/** GET /app/books/:id */
export async function bookPage(ctx: Ctx): Promise<Response> {
  const t = requireTeacher(ctx);
  const book = await db.getBook(ctx.env, idParam(ctx.params.id));
  if (!book) throw new HttpError(404, 'ไม่พบหนังสือเล่มนี้');
  const [units, sub, grants] = await Promise.all([db.listUnits(ctx.env, book.id), db.getSubscription(ctx.env, t.id, book.id), db.grantsOfTeacher(ctx.env, t.id)]);
  const live = new Map(grants.filter((g) => g.book_id === book.id && db.isLive(g, ctx.now)).map((g) => [g.unit_id, g]));
  // A draft book is visible only to a member the owner gave some of its decks to.
  if (book.status === 'draft' && !live.size) throw new HttpError(404, 'ไม่พบหนังสือเล่มนี้');
  const status = sub ? db.effectiveStatus(sub, ctx.now) : 'none';
  const subEnd = sub && status === 'active' && book.status !== 'draft' ? sub.period_end : null;
  const views = units.map((u) => ({ unit: u, sub: subEnd, grant: live.get(u.id) ?? null, expired: null, open: subEnd !== null || live.has(u.id),
    until: live.has(u.id) ? (live.get(u.id)!.expires_at === null ? null : Math.max(live.get(u.id)!.expires_at!, subEnd ?? 0)) : subEnd }));
  const openN = views.filter((v) => v.open).length;
  const sellable = book.status === 'published' && book.slide_count > 0;
  const monthly = book.slide_count > 0 ? monthlyPrice(book.slide_count, book.rate_baht_per_slide) : 0;
  const opts = MONTH_OPTIONS.map((m) => html`<option value="${m}">${m} เดือน · ${money(monthly * m)} บาท</option>`);
  const tag = status !== 'none' ? subBadge(status) : openN ? html`<span class="badge info">เปิดได้ ${openN} จาก ${units.length} หน่วย</span>` : subBadge('none');
  return htmlResponse(page(ctx, {
    title: book.title,
    nav: 'home',
    body: html`${flash(ctx)}
<a class="back" href="/app/">${icon('left')}หนังสือของฉัน</a>
<div class="pay">
  <div class="bcard">${bookArt(book, tag)}<div class="body">
    ${sellable ? html`<div class="price">${money(monthly)} <small>บาท/เดือน</small></div>
    <p class="muted small">${book.slide_count} สไลด์ × ${book.rate_baht_per_slide} บาทต่อสไลด์ต่อเดือน (ประมาณ ${perDay(monthly)} บาท/วัน)</p>` : ''}
    ${status === 'active' ? html`<p class="small">${icon('clock')} ใช้ได้ถึง <b>${fmtDate(sub!.period_end)}</b></p>` : ''}
    ${openN && status !== 'active' ? html`<p class="small">${icon('key')} ทีมงานเปิดให้คุณครูใช้ ${openN} จาก ${units.length} หน่วย</p>` : ''}
    ${sellable ? html`<form method="post" action="/app/books/${book.id}/subscribe">${csrfField(ctx)}
      <div class="field"><label for="months">${status === 'active' ? 'ต่ออายุ' : 'สมัครทั้งเล่ม'}กี่เดือน</label>
      <select id="months" name="months">${opts}</select></div>
      <button class="btn block" type="submit">${icon('wallet')}${status === 'active' || status === 'expired' ? 'ต่ออายุ' : 'สมัคร'} และชำระผ่าน PromptPay</button>
    </form>` : html`<p class="muted small">เล่มนี้ยังไม่เปิดรับสมัครใหม่${openN ? ' ใช้ได้เฉพาะหน่วยที่ทีมงานเปิดให้' : ''}</p>`}
  </div></div>
  <div class="card"><span class="kicker">${book.subject} · ${book.grade}</span><h1>${book.title}</h1>
    <p class="muted">${units.length} หน่วยการเรียนรู้ · ${book.slide_count} สไลด์ · มีแอนิเมชันทุกหน้า นักเรียนตอบบนจอได้ คู่มือครู และเฉลยพร้อมวิธีทำ</p>
    <h3 class="mt">หน่วยการเรียนรู้</h3>${unitList(views)}</div>
</div>`,
  }));
}

/** POST /app/books/:id/subscribe → pending payment → payment page. */
export async function subscribe(ctx: Ctx): Promise<Response> {
  const t = requireTeacher(ctx);
  const form = await readForm(ctx.req);
  checkCsrf(ctx, form);
  await rateLimit(ctx.env, `member:${t.id}`, LIMITS.member, ctx.now);
  if (!t.school) return redirect(`/app/profile?m=school&next=${encodeURIComponent(`/app/books/${ctx.params.id}`)}`);
  const book = await db.getBook(ctx.env, idParam(ctx.params.id));
  if (!book || book.status !== 'published' || book.slide_count < 1) throw new HttpError(404, 'เล่มนี้ยังไม่เปิดรับสมัคร');
  const months = int(str(form, 'months'), { min: 1, max: 12, field: 'จำนวนเดือน' });
  if (!(MONTH_OPTIONS as readonly number[]).includes(months)) throw new HttpError(400, 'เลือกได้ 1, 3, 6 หรือ 12 เดือน');
  const provider = paymentProvider(ctx.env);
  const payment = await db.requestPayment(ctx.env, t.id, book, months, provider.id, ctx.now);
  await audit(ctx.env, ctx.now, `teacher:${t.id}`, 'payment.request', `payment:${payment.id}`, { book: book.id, months, amount: payment.amount_satang / 100 });
  const start = await provider.start(ctx.env, payment, ctx.origin);
  if (start.kind === 'redirect') return redirect(start.url);
  return redirect(`/app/payments/${payment.id}`);
}

/** GET /app/payments/:id: PromptPay QR and instructions. */
export async function paymentPage(ctx: Ctx): Promise<Response> {
  const t = requireTeacher(ctx);
  const p = await db.getPayment(ctx.env, idParam(ctx.params.id));
  if (!p || (p.teacher_id !== t.id && !ctx.isAdmin)) throw new HttpError(404, 'ไม่พบรายการนี้');
  const sub = await db.getSubscriptionById(ctx.env, p.subscription_id);
  const book = sub ? await db.getBook(ctx.env, sub.book_id) : null;
  const start = await providerFor(p).start(ctx.env, p, ctx.origin);
  const amount = p.amount_satang / 100;
  const qr = start.kind === 'instructions' && start.qrSvg
    ? html`<div class="qrbox"><div class="pp">PromptPay</div>${new Safe(start.qrSvg)}<div class="small muted">บัญชี ${start.targetMasked}</div></div>`
    : html`<div class="qrbox"><p class="muted small">ยังไม่ได้ตั้งค่าบัญชี PromptPay กรุณาติดต่อทีมงานทาง LINE ${lineOa(ctx.env)}</p></div>`;
  return htmlResponse(page(ctx, {
    title: 'ชำระเงิน',
    body: html`${flash(ctx)}
<a class="back" href="/app/">${icon('left')}หนังสือของฉัน</a>
<h1>ชำระเงินผ่าน PromptPay</h1>
<div class="pay">
  ${p.status === 'pending' ? qr : html`<div class="qrbox"><p>${payBadge(p)}</p></div>`}
  <div class="card stack">
    <div><span class="muted small">ยอดที่ต้องโอน</span><div class="amount">${money(amount)} บาท</div>
    <div class="muted small">${book?.title ?? ''} · ${p.months} เดือน (${p.slide_count} สไลด์ × ${p.rate_baht} บาท = ${money(p.monthly_price)} บาท/เดือน)</div></div>
    <div>${payBadge(p)} <span class="small muted">รายการที่ ${p.id} · สร้างเมื่อ ${fmtDateTime(p.created_at)}</span></div>
    ${p.status === 'pending' ? html`
    <ol class="steps">
      <li>เปิดแอปธนาคาร เลือก <b>สแกนจ่าย</b> แล้วสแกน QR นี้ (ยอดเงินขึ้นให้อัตโนมัติ)</li>
      <li>ตรวจชื่อบัญชีผู้รับในแอปธนาคารก่อนกดยืนยัน</li>
      <li>โอนเสร็จแล้ว กด <b>แจ้งโอนแล้ว</b> ด้านล่าง หรือส่งสลิปทาง LINE <b>${lineOa(ctx.env)}</b></li>
      <li>ทีมงานตรวจยอดแล้วเปิดสิทธิ์ให้ คุณครูจะเห็นปุ่ม <b>เปิดสไลด์</b> ในหน้าหนังสือของฉัน</li>
    </ol>
    ${p.notified_at ? html`<p class="flash ok">แจ้งโอนแล้วเมื่อ ${fmtDateTime(p.notified_at)} · รอทีมงานตรวจสอบ</p>` : p.teacher_id === t.id ? html`
    <form method="post" action="/app/payments/${p.id}/notify">${csrfField(ctx)}
      <div class="field"><label for="note">หมายเหตุถึงทีมงาน (ไม่บังคับ)</label>
      <input id="note" name="note" type="text" maxlength="200" placeholder="เช่น โอนจาก KBank เวลา 14:05"></div>
      <button class="btn ok" type="submit">${icon('check')}แจ้งโอนแล้ว</button>
    </form>` : ''}` : ''}
  </div>
</div>`,
  }));
}

/** POST /app/payments/:id/notify: the member says "I have paid". */
export async function notify(ctx: Ctx): Promise<Response> {
  const t = requireTeacher(ctx);
  const form = await readForm(ctx.req);
  checkCsrf(ctx, form);
  await rateLimit(ctx.env, `member:${t.id}`, LIMITS.member, ctx.now);
  const p = await db.getPayment(ctx.env, idParam(ctx.params.id));
  if (!p || p.teacher_id !== t.id) throw new HttpError(404, 'ไม่พบรายการนี้');
  if (p.status !== 'pending') return redirect(`/app/payments/${p.id}?m=already`);
  const note = cleanText(str(form, 'note'), { max: 200, field: 'หมายเหตุ' });
  await db.notifyPaid(ctx.env, p, note, ctx.now);
  await audit(ctx.env, ctx.now, `teacher:${t.id}`, 'payment.notify', `payment:${p.id}`);
  return redirect(`/app/payments/${p.id}?m=notified`);
}

/** GET/POST /app/profile */
export async function profile(ctx: Ctx): Promise<Response> {
  const t = requireTeacher(ctx, { allowWaiting: true });
  let error = '';
  let name = t.display_name, school = t.school;
  const next = safeNext(ctx.url.searchParams.get('next'), '');
  if (ctx.req.method === 'POST') {
    const form = await readForm(ctx.req);
    checkCsrf(ctx, form);
    await rateLimit(ctx.env, `member:${t.id}`, LIMITS.member, ctx.now);
    name = str(form, 'display_name'); school = str(form, 'school');
    try {
      name = cleanText(name, { min: 1, max: 80, field: 'ชื่อที่แสดง' });
      school = cleanText(school, { min: 2, max: 120, field: 'ชื่อโรงเรียน' });
      await db.updateProfile(ctx.env, t.id, name, school);
      await audit(ctx.env, ctx.now, `teacher:${t.id}`, 'profile.update');
      return redirect(safeNext(str(form, 'next'), '/app/profile?m=profile'));
    } catch (e) {
      if (!(e instanceof HttpError) || e.status !== 400) throw e;
      error = e.message;
    }
  }
  return htmlResponse(page(ctx, {
    title: 'ข้อมูลของฉัน',
    nav: 'profile',
    body: html`${flash(ctx)}${error ? html`<div class="flash bad" role="alert">${error}</div>` : ''}
<div class="card form-card">
  <div class="form-head"><span class="ic-tile t-sky">${icon('user')}</span><div><h1>ข้อมูลของฉัน</h1>
  <p>ชื่อและโรงเรียนจะแสดงจาง ๆ บนสไลด์ว่า “Licensed to ชื่อ · โรงเรียน” เพื่อยืนยันสิทธิ์การใช้งาน</p></div></div>
  <form method="post" action="/app/profile">${csrfField(ctx)}
    <input type="hidden" name="next" value="${next}">
    <div class="field"><label for="display_name">ชื่อที่แสดง</label>
      <input id="display_name" name="display_name" type="text" required maxlength="80" value="${name}" autocomplete="name"></div>
    <div class="field"><label for="school">ชื่อโรงเรียน</label>
      <input id="school" name="school" type="text" required minlength="2" maxlength="120" value="${school}" placeholder="เช่น โรงเรียนสาธิต…" autocomplete="organization">
      <div class="hint">ใช้ชื่อโรงเรียนที่สอนจริง</div></div>
    <button class="btn" type="submit">${icon('check')}บันทึก</button>
  </form>
  <p class="small muted mt">สมาชิกตั้งแต่ ${fmtDate(t.created_at)} · ต้องการลบบัญชีหรือขอดูข้อมูล ติดต่อ LINE ${lineOa(ctx.env)}</p>
</div>`,
  }));
}
