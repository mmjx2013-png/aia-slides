import type { Book, Ctx, Teacher, Unit, UnitGrant } from '../env';
import { html, raw, Safe } from '../lib/html';
import { HttpError, redirect } from '../lib/http';
import { csrfField, fmtDate, icon, subjectTheme, untilText, bookStatusBadge, emptyArt, initial } from '../views/layout';
import * as db from '../db';
import { cleanText, idParam, int, oneOf, str } from '../lib/validate';
import { audit } from '../lib/audit';
import { accessMap, bkkDay, idList, readExpiry, type BookView, type UnitView } from '../lib/access';
import { adminPage, adminPost, requireAdmin, tabs } from './adminkit';

/**
 * The owner's control of who may open which deck:
 *  - "สิทธิ์เข้าถึงสไลด์" on a member's page (every book and unit, one Save);
 *  - "ใครเข้าถึงได้บ้าง" for a book (who, from where; revoke; add a member);
 *  - "สิทธิ์ทั้งหมด", the teachers × decks matrix (tap a cell; bulk: a whole book to selected teachers);
 *  - approval of new members (optionally with whole books at the same time).
 * Every page works as plain forms; app.js only makes the checkboxes and matrix taps quicker.
 */

// ---------- small parts ----------
/** Expiry for new grants: none / 1 / 3 / 12 months / a date. `compact` = a select (toolbars, small forms). */
export function expiryField(ctx: Ctx, o: { id: string; prefix?: string; compact?: boolean; label?: string }): Safe {
  const p = o.prefix ?? '';
  const today = bkkDay(ctx.now);
  const opts: [string, string][] = [['none', 'ไม่หมดอายุ'], ['1', '1 เดือน'], ['3', '3 เดือน'], ['12', '12 เดือน'], ['date', 'ถึงวันที่…']];
  if (o.compact) {
    return html`<span class="expc"><label class="sr" for="${o.id}">วันหมดอายุ</label><select id="${o.id}" name="${p}expiry">${opts.map(([v, l]) => html`<option value="${v}">${l}</option>`)}</select>
      <label class="sr" for="${o.id}d">ถึงวันที่</label><input id="${o.id}d" type="date" name="${p}expiry_date" min="${today}"></span>`;
  }
  return html`<fieldset class="radios expf"><legend>${o.label ?? 'หมดอายุ (สำหรับสิทธิ์ที่ให้ใหม่)'}</legend>
    ${opts.map(([v, l], i) => html`<label><input type="radio" name="${p}expiry" value="${v}"${i === 0 ? raw(' checked') : ''}><span>${l}</span></label>`)}
    <label class="dt"><span class="sr">ถึงวันที่</span><input id="${o.id}" type="date" name="${p}expiry_date" min="${today}"></label></fieldset>`;
}

/** Where one unit's access comes from: paid, grant, both; or an expired grant. */
function sourceBadges(v: UnitView): Safe {
  return html`${v.sub !== null ? html`<span class="badge ok plain">${icon('wallet')} จ่ายแล้ว · ถึง ${fmtDate(v.sub)}</span>` : ''}
    ${v.grant ? html`<span class="badge info plain">${icon('key')} ให้สิทธิ์ · ${untilText(v.grant.expires_at)}</span>` : ''}
    ${v.expired ? html`<span class="badge plain">สิทธิ์หมดอายุ ${fmtDate(v.expired.expires_at)}</span>` : ''}`;
}

function bookSource(v: BookView): Safe {
  const sub = v.units.some((u) => u.sub !== null);
  const grants = v.units.filter((u) => u.grant).length;
  if (sub && grants) return html`<span class="badge lilac plain">ทั้งสองแบบ</span>`;
  if (sub) return html`<span class="badge ok plain">จ่ายแล้ว</span>`;
  if (grants) return html`<span class="badge info plain">ให้สิทธิ์ ${grants} หน่วย</span>`;
  return html``;
}

/** Return to the admin page the form was on (same origin, under /app/admin/), keeping its query, with a message code. */
function backWith(ctx: Ctx, fallback: string, m: string, hash = ''): string {
  let target = new URL(fallback, ctx.origin);
  const ref = ctx.req.headers.get('Referer');
  if (ref) {
    try {
      const u = new URL(ref);
      if (u.origin === ctx.origin && u.pathname.startsWith('/app/admin/') && !/[\\\s]/.test(u.pathname)) target = u;
    } catch { /* ignore */ }
  }
  target.searchParams.set('m', m);
  return target.pathname + target.search + hash;
}

async function teacherOr404(ctx: Ctx, id: number): Promise<Teacher> {
  const t = await db.getTeacher(ctx.env, id);
  if (!t || t.line_user_id.startsWith(db.ERASED_PREFIX)) throw new HttpError(404, 'ไม่พบสมาชิก');
  return t;
}

// ---------- member page: "สิทธิ์เข้าถึงสไลด์" ----------
export async function memberAccessPanel(ctx: Ctx, t: Teacher): Promise<Safe> {
  const map = await accessMap(ctx.env, t.id, ctx.now);
  if (!map.length) return html`<section class="card" id="access"><h2>สิทธิ์เข้าถึงสไลด์</h2><p class="muted">ยังไม่มีหนังสือ เพิ่มหนังสือและหน่วยก่อนที่หน้า <a href="/app/admin/books">หนังสือและหน่วย</a></p></section>`;
  const total = map.reduce((n, v) => n + v.openCount, 0);
  return html`<section class="card acc" id="access">
  <div class="row between"><div><h2>สิทธิ์เข้าถึงสไลด์</h2>
    <p class="muted small">ติ๊กหน่วยที่ ${t.display_name} เปิดได้ หรือ “ทั้งเล่ม” แล้วกดบันทึกครั้งเดียว สิทธิ์จากการจ่ายเงินไม่ถูกแก้ที่นี่</p></div>
    <span class="chip t-sky">${icon('play')} เปิดได้ ${total} หน่วย</span></div>
  <form method="post" action="/app/admin/members/${t.id}/access" data-access>${csrfField(ctx)}
    <div class="accbooks">${map.map((v) => accessBook(v))}</div>
    <div class="accfoot">
      ${expiryField(ctx, { id: `exp${t.id}` })}
      <label class="check"><input type="checkbox" name="apply_all" value="1"> ใช้วันหมดอายุนี้กับสิทธิ์เดิมที่ยังติ๊กอยู่ด้วย</label>
    </div>
    <div class="savebar"><button class="btn" type="submit">${icon('check')}บันทึกสิทธิ์</button><span class="small muted">หน่วยที่ไม่ติ๊กจะถูกยกเลิกสิทธิ์ที่ให้ไว้</span></div>
  </form>
</section>`;
}

function accessBook(v: BookView): Safe {
  const { theme, icon: ic } = subjectTheme(v.book.subject, v.book.id);
  const granted = v.units.filter((u) => u.grant).length;
  const all = v.units.length > 0 && granted === v.units.length;
  const partial = granted > 0 && !all;
  return html`<section class="accbook ${theme}">
    <div class="ab-head">
      <span class="ab-ic" aria-hidden="true">${icon(ic)}</span>
      <div class="ab-t"><b>${v.book.title}</b><small>${v.book.subject} · ${v.book.grade} ${v.book.status !== 'published' ? bookStatusBadge(v.book.status) : ''} ${bookSource(v)}</small></div>
      <span class="ab-n" title="หน่วยที่เปิดได้">${v.openCount}/${v.units.length}</span>
      <label class="whole"><input type="checkbox" name="book" value="${v.book.id}"${all ? raw(' checked') : ''}${v.units.length ? '' : raw(' disabled')} data-book="${v.book.id}"><span>ทั้งเล่ม</span></label>
      ${all ? html`<input type="hidden" name="book_was" value="${v.book.id}">` : ''}
    </div>
    ${v.units.length ? html`<details${partial ? raw(' open') : ''}><summary>รายหน่วย (${v.units.length})</summary>
      <ul class="accunits">${v.units.map((u) => html`<li class="${u.open ? 'on' : ''}"><label>
        <input type="checkbox" name="unit" value="${u.unit.id}"${u.grant ? raw(' checked') : ''} data-of="${v.book.id}">
        <span class="n">${u.unit.position}</span>
        <span class="t">${u.unit.title}<small>${u.unit.slide_count} สไลด์${u.unit.r2_key ? '' : ' · ยังไม่มีไฟล์'}</small><span class="src">${sourceBadges(u)}</span></span>
      </label></li>`)}</ul></details>` : html`<p class="small muted">ยังไม่มีหน่วยในเล่มนี้</p>`}
  </section>`;
}

/** POST /app/admin/members/:id/access: the one Save of the panel. */
export async function saveMemberAccess(ctx: Ctx): Promise<Response> {
  const { form, actor } = await adminPost(ctx);
  const t = await teacherOr404(ctx, idParam(ctx.params.id));
  const units = idList(form, 'unit'), books = idList(form, 'book'), was = idList(form, 'book_was');
  const expires = readExpiry(form, ctx.now);
  const applyAll = str(form, 'apply_all') === '1';
  const all = await db.allBooksWithUnits(ctx.env);
  const known = new Set(all.flatMap((b) => b.units.map((u) => u.id)));
  const knownBooks = new Set(all.map((b) => b.book.id));
  if (units.some((u) => !known.has(u)) || [...books, ...was].some((b) => !knownBooks.has(b))) throw new HttpError(400, 'มีหน่วยหรือหนังสือที่ไม่รู้จักในฟอร์ม');
  // The unit boxes decide, except where "ทั้งเล่ม" was changed: ticking it gives the whole book, unticking takes it away.
  const want = new Set(units);
  for (const { book, units: us } of all) {
    const on = books.includes(book.id), before = was.includes(book.id);
    if (on && !before) us.forEach((u) => want.add(u.id));
    if (!on && before) us.forEach((u) => want.delete(u.id));
  }
  const grants = await db.grantsOfTeacher(ctx.env, t.id);
  const live = new Set(grants.filter((g) => db.isLive(g, ctx.now)).map((g) => g.unit_id));
  const toAdd = [...want].filter((u) => !live.has(u));
  const toKeep = [...want].filter((u) => live.has(u));
  const toRemove = grants.map((g) => g.unit_id).filter((u) => !want.has(u));
  const added = await db.grantUnits(ctx.env, t.id, toAdd, expires, actor, ctx.now);
  if (applyAll && toKeep.length) await db.grantUnits(ctx.env, t.id, toKeep, expires, actor, ctx.now, true);
  const removed = await db.revokeUnits(ctx.env, t.id, toRemove);
  if (added.length || removed.length || (applyAll && toKeep.length)) {
    await audit(ctx.env, ctx.now, actor, 'grant.update', `teacher:${t.id}`, { added, removed, extended: applyAll ? toKeep : [], expires });
  }
  return redirect(`/app/admin/members/${t.id}?m=access#access`);
}

// ---------- approval of new members ----------
export function approveForm(ctx: Ctx, t: Teacher, books: Book[], compact = false): Safe {
  const offer = books.filter((b) => b.status !== 'archived');
  return html`<form method="post" action="/app/admin/members/${t.id}/approve" class="approve${compact ? ' compact' : ''}">${csrfField(ctx)}
    ${offer.length ? html`<div class="ap-books"><span class="small muted">ให้สิทธิ์ทั้งเล่มพร้อมอนุมัติ (ไม่บังคับ)</span>
      <div class="cchips">${offer.map((b) => html`<label class="cchip"><input type="checkbox" name="book" value="${b.id}"><span>${b.title}</span></label>`)}</div></div>` : ''}
    <div class="row">${offer.length ? expiryField(ctx, { id: `ap${t.id}`, compact: true }) : ''}
      <button class="btn ok small" type="submit">${icon('check')}อนุมัติ</button></div>
  </form>`;
}

/** POST /app/admin/members/:id/approve (+ optional whole books). */
export async function approve(ctx: Ctx): Promise<Response> {
  const { form, actor } = await adminPost(ctx);
  const t = await teacherOr404(ctx, idParam(ctx.params.id));
  const books = idList(form, 'book');
  const expires = readExpiry(form, ctx.now);
  if (!(await db.approveTeacher(ctx.env, t.id, actor, ctx.now))) return redirect(backWith(ctx, `/app/admin/members/${t.id}`, 'already'));
  const units: number[] = [];
  for (const b of books) {
    if (!(await db.getBook(ctx.env, b))) throw new HttpError(400, 'ไม่พบหนังสือที่เลือก');
    units.push(...(await db.listUnits(ctx.env, b)).map((u) => u.id));
  }
  const added = await db.grantUnits(ctx.env, t.id, units, expires, actor, ctx.now);
  await audit(ctx.env, ctx.now, actor, 'member.approve', `teacher:${t.id}`, { books, units: added.length, expires });
  return redirect(backWith(ctx, `/app/admin/members/${t.id}`, 'approved'));
}

// ---------- a book: "ใครเข้าถึงได้บ้าง" ----------
interface Holder { id: number; name: string; school: string; blocked: boolean; waiting: boolean; subEnd: number | null; grants: (UnitGrant & { position: number; unit_title: string })[]; }

/** GET /app/admin/books/:id/access?unit=&q= */
export async function bookAccess(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const book = await db.getBook(ctx.env, idParam(ctx.params.id));
  if (!book) throw new HttpError(404, 'ไม่พบหนังสือ');
  const units = await db.listUnits(ctx.env, book.id);
  const u = ctx.url.searchParams.get('unit');
  const unit = u ? units.find((x) => String(x.id) === u) : undefined;
  if (u && !unit) throw new HttpError(404, 'ไม่พบหน่วยนี้ในหนังสือเล่มนี้');
  const q = cleanText(ctx.url.searchParams.get('q') || '', { max: 80, field: 'คำค้น' });
  const { subs, grants } = await db.accessForBook(ctx.env, book.id, ctx.now);
  const holders = new Map<number, Holder>();
  const holder = (r: db.BookAccessRow): Holder => {
    let h = holders.get(r.teacher_id);
    if (!h) holders.set(r.teacher_id, h = { id: r.teacher_id, name: r.display_name, school: r.school, blocked: r.status !== 'active', waiting: r.approved_at === null, subEnd: null, grants: [] });
    return h;
  };
  subs.forEach((s) => { holder(s).subEnd = s.period_end; });
  grants.forEach((g) => holder(g).grants.push(g));
  let rows = [...holders.values()];
  if (unit) rows = rows.filter((h) => (book.status !== 'draft' && h.subEnd !== null) || h.grants.some((g) => g.unit_id === unit.id));
  rows.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  const canOpen = (h: Holder) => !h.blocked && !h.waiting && ((book.status !== 'draft' && h.subEnd !== null) || h.grants.some((g) => db.isLive(g, ctx.now) && (!unit || g.unit_id === unit.id)));
  const found = q ? (await db.listTeachers(ctx.env, q, ctx.now, 20)).filter((t) => !t.line_user_id.startsWith(db.ERASED_PREFIX)) : [];
  const base = `/app/admin/books/${book.id}/access`;
  const unitTabs = tabs(base, 'unit', unit ? String(unit.id) : '', [['', 'ทุกหน่วย'] as const, ...units.map((x) => [String(x.id), `หน่วย ${x.position}`] as const)]);
  const table = rows.length ? html`<div class="table"><table class="whohas"><thead><tr><th>สมาชิก</th><th>ที่มา</th><th>${unit ? `หน่วย ${unit.position}` : 'หน่วยที่ให้สิทธิ์'}</th><th></th></tr></thead><tbody>
    ${rows.map((h) => {
      const gs = unit ? h.grants.filter((g) => g.unit_id === unit.id) : h.grants;
      const liveN = h.grants.filter((g) => db.isLive(g, ctx.now)).length;
      return html`<tr id="t${h.id}" class="${canOpen(h) ? '' : 'dim'}">
      <td><a class="person" href="/app/admin/members/${h.id}#access"><span class="ava">${initial(h.name)}</span><span><b>${h.name}</b><small>${h.school || '–'}</small></span></a>
        ${h.blocked ? html`<span class="badge bad">ระงับ</span>` : h.waiting ? html`<span class="badge warn">รออนุมัติ</span>` : ''}</td>
      <td>${h.subEnd !== null && liveN ? html`<span class="badge lilac plain">ทั้งสองแบบ</span>` : ''}
        ${h.subEnd !== null ? html`<span class="badge ok plain">${icon('wallet')} จ่ายแล้ว ถึง ${fmtDate(h.subEnd)}${book.status === 'draft' ? ' (เล่มร่าง: ยังไม่นับ)' : ''}</span>` : ''}
        ${liveN ? html`<span class="badge info plain">${icon('key')} ให้สิทธิ์ ${liveN} หน่วย</span>` : ''}</td>
      <td><div class="gchips">${h.subEnd !== null && !unit ? html`<span class="gchip paid">ทุกหน่วย · จ่ายแล้ว</span>` : ''}
        ${gs.map((g) => html`<span class="gchip${db.isLive(g, ctx.now) ? '' : ' old'}">หน่วย ${g.position} · ${db.isLive(g, ctx.now) ? untilText(g.expires_at) : `หมดอายุ ${fmtDate(g.expires_at)}`}
          <form method="post" action="/app/admin/grants/${g.id}/revoke">${csrfField(ctx)}<button type="submit" title="ยกเลิกสิทธิ์หน่วย ${g.position}" aria-label="ยกเลิกสิทธิ์หน่วย ${g.position} ของ ${h.name}">${icon('x')}</button></form></span>`)}</div></td>
      <td>${h.grants.length > 1 && !unit ? html`<form method="post" action="/app/admin/books/${book.id}/revoke">${csrfField(ctx)}<input type="hidden" name="teacher_id" value="${h.id}">
        <button class="btn danger small" type="submit">ยกเลิกทั้งเล่ม</button></form>` : ''}</td></tr>`;
    })}</tbody></table></div>`
    : html`<div class="empty box">${emptyArt()}<h3>ยังไม่มีใครเข้าถึง${unit ? `หน่วย ${unit.position}` : 'เล่มนี้'}</h3><p>ค้นหาสมาชิกด้านล่างเพื่อให้สิทธิ์</p></div>`;
  const add = html`<section class="card mt" id="add"><h2>${icon('plus')} เพิ่มสมาชิก</h2>
    <form method="get" action="${base}#add" class="row">${unit ? html`<input type="hidden" name="unit" value="${unit.id}">` : ''}
      <input type="search" name="q" value="${q}" placeholder="ค้นหาชื่อ โรงเรียน หรือรหัส LINE" aria-label="ค้นหาสมาชิก"><button class="btn" type="submit">${icon('search')}ค้นหา</button></form>
    ${q ? found.length ? html`<ul class="found">${found.map((t) => html`<li>
        <span class="person"><span class="ava">${initial(t.display_name)}</span><span><b>${t.display_name}</b><small>${t.school || '–'}${t.approved_at === null ? ' · รออนุมัติ' : ''}</small></span></span>
        <form method="post" action="/app/admin/books/${book.id}/grant" class="row">${csrfField(ctx)}<input type="hidden" name="teacher_id" value="${t.id}">
          <label class="sr" for="gu${t.id}">หน่วย</label><select id="gu${t.id}" name="unit"><option value="all">ทั้งเล่ม (${units.length} หน่วย)</option>
          ${units.map((x) => html`<option value="${x.id}"${unit?.id === x.id ? raw(' selected') : ''}>หน่วย ${x.position} ${x.title}</option>`)}</select>
          ${expiryField(ctx, { id: `ge${t.id}`, compact: true })}
          <button class="btn small" type="submit">${icon('key')}ให้สิทธิ์</button></form></li>`)}</ul>`
      : html`<p class="muted small mt-s">ไม่พบสมาชิก “${q}”</p>` : ''}
  </section>`;
  return adminPage(ctx, `ใครเข้าถึงได้บ้าง · ${book.title}`, 'books', html`
<a class="back" href="/app/admin/books/${book.id}">${icon('left')}${book.title}</a>
<div class="hello"><div><span class="kicker">ใครเข้าถึงได้บ้าง</span><h1>${book.title}</h1>
  <p class="muted">${rows.filter(canOpen).length} คนเปิด${unit ? `หน่วย ${unit.position}` : 'เล่มนี้'}ได้ตอนนี้ · ${bookStatusBadge(book.status)}</p></div></div>
${unitTabs}${table}${add}`);
}

/** POST /app/admin/books/:id/grant  (teacher_id, unit = all | unit id, expiry) */
export async function grantFromBook(ctx: Ctx): Promise<Response> {
  const { form, actor } = await adminPost(ctx);
  const book = await db.getBook(ctx.env, idParam(ctx.params.id));
  if (!book) throw new HttpError(404, 'ไม่พบหนังสือ');
  const t = await teacherOr404(ctx, int(str(form, 'teacher_id'), { min: 1, max: 1e10, field: 'สมาชิก' }));
  const units = await db.listUnits(ctx.env, book.id);
  const which = str(form, 'unit') || 'all';
  const ids = which === 'all' ? units.map((u) => u.id) : [int(which, { min: 1, max: 1e10, field: 'หน่วย' })];
  if (!ids.every((id) => units.some((u) => u.id === id))) throw new HttpError(400, 'หน่วยนี้ไม่อยู่ในหนังสือเล่มนี้');
  const expires = readExpiry(form, ctx.now);
  // Giving again from this page sets the chosen expiry, also on a grant that already exists.
  await db.grantUnits(ctx.env, t.id, ids, expires, actor, ctx.now, true);
  await audit(ctx.env, ctx.now, actor, 'grant.add', `teacher:${t.id}`, { book: book.id, units: ids, expires });
  return redirect(backWith(ctx, `/app/admin/books/${book.id}/access`, 'granted', `#t${t.id}`));
}

/** POST /app/admin/grants/:id/revoke */
export async function revoke(ctx: Ctx): Promise<Response> {
  const { actor } = await adminPost(ctx);
  const g = await db.revokeGrant(ctx.env, idParam(ctx.params.id));
  if (!g) return redirect(backWith(ctx, '/app/admin/access', 'already'));
  await audit(ctx.env, ctx.now, actor, 'grant.revoke', `teacher:${g.teacher_id}`, { unit: g.unit_id, expires: g.expires_at });
  return redirect(backWith(ctx, '/app/admin/access', 'revoked'));
}

/** POST /app/admin/books/:id/revoke (teacher_id): every grant of one teacher in one book. */
export async function revokeBook(ctx: Ctx): Promise<Response> {
  const { form, actor } = await adminPost(ctx);
  const book = await db.getBook(ctx.env, idParam(ctx.params.id));
  if (!book) throw new HttpError(404, 'ไม่พบหนังสือ');
  const t = await teacherOr404(ctx, int(str(form, 'teacher_id'), { min: 1, max: 1e10, field: 'สมาชิก' }));
  const removed = await db.revokeUnits(ctx.env, t.id, (await db.listUnits(ctx.env, book.id)).map((u) => u.id));
  await audit(ctx.env, ctx.now, actor, 'grant.revoke', `teacher:${t.id}`, { book: book.id, units: removed });
  return redirect(backWith(ctx, `/app/admin/books/${book.id}/access`, 'revoked'));
}

// ---------- "สิทธิ์ทั้งหมด": teachers × decks ----------
const SHOW = ['all', 'access', 'none', 'waiting'] as const;
type Show = typeof SHOW[number];

interface MatrixQuery { q: string; show: Show; open: number[]; }
function readMatrixQuery(ctx: Ctx): MatrixQuery {
  const sp = ctx.url.searchParams;
  const q = cleanText(sp.get('q') || '', { max: 80, field: 'คำค้น' });
  const show = oneOf(sp.get('show') || 'all', SHOW, 'ตัวกรอง');
  const open = (sp.get('open') || '').split(',').filter((x) => /^[1-9]\d{0,9}$/.test(x)).map(Number).slice(0, 50);
  return { q, show, open };
}
function matrixUrl(m: MatrixQuery, change: Partial<MatrixQuery> = {}): string {
  const x = { ...m, ...change };
  const p = new URLSearchParams();
  if (x.q) p.set('q', x.q);
  if (x.show !== 'all') p.set('show', x.show);
  if (x.open.length) p.set('open', x.open.join(','));
  const s = p.toString();
  return `/app/admin/access${s ? `?${s}` : ''}`;
}

/** GET /app/admin/access */
export async function matrix(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const m = readMatrixQuery(ctx);
  const [teachersAll, books] = await Promise.all([
    db.listTeachers(ctx.env, m.q, ctx.now, 300, m.show === 'waiting' ? 'waiting' : 'all'),
    db.allBooksWithUnits(ctx.env),
  ]);
  const people = teachersAll.filter((t) => !t.line_user_id.startsWith(db.ERASED_PREFIX));
  const ids = people.map((t) => t.id);
  const [subs, grants] = await Promise.all([db.activeSubsOf(ctx.env, ids, ctx.now), db.grantsOf(ctx.env, ids)]);
  const subEnd = new Map(subs.map((s) => [`${s.teacher_id}:${s.book_id}`, s.period_end]));
  const grantOf = new Map(grants.map((g) => [`${g.teacher_id}:${g.unit_id}`, g]));
  const has = (t: number) => subs.some((s) => s.teacher_id === t) || grants.some((g) => g.teacher_id === t && db.isLive(g, ctx.now));
  const rows = m.show === 'access' ? people.filter((t) => has(t.id)) : m.show === 'none' ? people.filter((t) => !has(t.id)) : people;
  const shown = books.filter((b) => b.book.status !== 'archived' || rows.some((t) => b.units.some((u) => grantOf.has(`${t.id}:${u.id}`))));
  const isOpen = (b: Book) => m.open.includes(b.id);
  const toggleUrl = (b: Book) => matrixUrl(m, { open: isOpen(b) ? m.open.filter((x) => x !== b.id) : [...m.open, b.id] });

  const unitCell = (t: db.TeacherRow, b: Book, u: Unit) => {
    const g = grantOf.get(`${t.id}:${u.id}`);
    const gl = g && db.isLive(g, ctx.now);
    const s = subEnd.get(`${t.id}:${b.id}`);
    const st = gl && s ? 'gs' : gl ? 'g' : s ? 's' : g ? 'x' : '';
    const title = `${t.display_name} · หน่วย ${u.position} ${u.title}: ${gl ? `ให้สิทธิ์ ${untilText(g!.expires_at)}` : g ? `สิทธิ์หมดอายุ ${fmtDate(g.expires_at)}` : 'ไม่มีสิทธิ์ที่ให้'}${s ? ` · จ่ายแล้วถึง ${fmtDate(s)}` : ''}`;
    return html`<td><button class="cell u ${st}" type="submit" name="cell" value="u:${t.id}:${u.id}" title="${title}" aria-label="${title}" data-g="${gl ? 1 : 0}" data-s="${s ? 1 : 0}"><i></i></button></td>`;
  };
  const bookCell = (t: db.TeacherRow, b: Book, units: Unit[]) => {
    const g = units.filter((u) => { const x = grantOf.get(`${t.id}:${u.id}`); return x && db.isLive(x, ctx.now); }).length;
    const s = subEnd.get(`${t.id}:${b.id}`);
    const st = s ? 's' : !units.length ? 'na' : g === units.length ? 'full' : g ? 'part' : '';
    const title = `${t.display_name} · ${b.title}: ${s ? `จ่ายแล้วถึง ${fmtDate(s)}` : `ให้สิทธิ์ ${g}/${units.length} หน่วย`}`;
    return html`<td><button class="cell b ${st}" type="submit" name="cell" value="b:${t.id}:${b.id}" title="${title}" aria-label="${title}" data-g="${g}" data-m="${units.length}" data-s="${s ? 1 : 0}"${units.length ? '' : raw(' disabled')}><i></i><em>${s ? '฿' : g && g < units.length ? `${g}/${units.length}` : ''}</em></button></td>`;
  };

  const head1 = shown.map(({ book: b, units }) => isOpen(b) && units.length
    ? html`<th class="bk open" colspan="${units.length}" scope="colgroup"><a href="${toggleUrl(b)}" title="ย่อ">${b.title} <span aria-hidden="true">▾</span></a></th>`
    : html`<th class="bk" rowspan="2" scope="col"><a href="${toggleUrl(b)}" title="แสดงรายหน่วย"><span>${b.title}</span> <small>${units.length} หน่วย ▸</small></a></th>`);
  const head2 = shown.filter(({ book: b, units }) => isOpen(b) && units.length).flatMap(({ units }) => units.map((u) => html`<th class="un" scope="col" title="${u.title}">${u.position}</th>`));
  const qs = matrixUrl(m);
  const body = rows.length ? html`
<form method="post" action="${qs}" class="mxform" data-matrix>${csrfField(ctx)}
  <div class="mxbar">
    <span class="mxsel">${icon('users')} กับสมาชิกที่ติ๊ก:</span>
    <label class="sr" for="bulk_book">หนังสือ</label><select id="bulk_book" name="bulk_book">${books.map(({ book: b, units }) => html`<option value="${b.id}">${b.title} (${units.length} หน่วย)</option>`)}</select>
    <label class="sr" for="bulk_action">ทำอะไร</label><select id="bulk_action" name="bulk_action"><option value="give">ให้สิทธิ์ทั้งเล่ม</option><option value="take">ยกเลิกสิทธิ์ทั้งเล่ม</option></select>
    ${expiryField(ctx, { id: 'mxexp', compact: true })}
    <button class="btn small" type="submit" name="bulk" value="1">${icon('check')}ทำเลย</button>
    <span class="small muted">วันหมดอายุนี้ใช้กับช่องที่แตะด้วย</span>
  </div>
  <div class="mx" tabindex="0" role="region" aria-label="ตารางสิทธิ์ เลื่อนซ้ายขวาได้"><table>
    <thead><tr><th class="pcol" rowspan="2" scope="col">สมาชิก <small>${rows.length} คน</small></th>${head1}</tr><tr>${head2}</tr></thead>
    <tbody>${rows.map((t) => html`<tr id="t${t.id}" class="${t.status !== 'active' ? 'blocked' : t.approved_at === null ? 'waiting' : ''}">
      <th class="pcol" scope="row"><div class="whoin"><label><input type="checkbox" name="sel" value="${t.id}"><span class="ava">${initial(t.display_name)}</span>
        <span class="nm"><b>${t.display_name}</b><small>${t.status !== 'active' ? 'ระงับ' : t.approved_at === null ? 'รออนุมัติ' : t.school || '–'}</small></span></label>
        <a class="go" href="/app/admin/members/${t.id}#access" title="สิทธิ์ของ ${t.display_name}">${icon('right')}</a></div></th>
      ${shown.map(({ book: b, units }) => isOpen(b) && units.length ? units.map((u) => unitCell(t, b, u)) : bookCell(t, b, units))}</tr>`)}</tbody>
  </table></div>
</form>` : html`<div class="empty box">${emptyArt()}<h3>ไม่พบสมาชิก</h3><p>ลองเปลี่ยนคำค้นหรือตัวกรอง</p></div>`;
  return adminPage(ctx, 'สิทธิ์ทั้งหมด', 'access', html`
<div class="hello"><div><span class="kicker">ใครเปิดสไลด์ไหนได้</span><h1>สิทธิ์ทั้งหมด</h1>
  <p class="muted small">แตะช่องเพื่อให้หรือยกเลิกสิทธิ์ · แตะชื่อเล่มเพื่อดูรายหน่วย</p></div>
  <div class="legend"><span><i class="cell g"></i>ให้สิทธิ์</span><span><i class="cell s"></i>จ่ายแล้ว</span><span><i class="cell gs"></i>ทั้งสองแบบ</span><span><i class="cell part"></i>บางหน่วย</span><span><i class="cell"></i>ไม่มี</span></div></div>
<form method="get" action="/app/admin/access" class="row mxfilter">
  <input type="search" name="q" value="${m.q}" placeholder="ค้นหาชื่อ โรงเรียน หรือรหัส LINE" aria-label="ค้นหา">
  <label class="sr" for="show">แสดง</label><select id="show" name="show">${([['all', 'ทุกคน'], ['access', 'มีสิทธิ์อยู่'], ['none', 'ยังไม่มีสิทธิ์'], ['waiting', 'รออนุมัติ']] as const).map(([v, l]) => html`<option value="${v}"${v === m.show ? raw(' selected') : ''}>${l}</option>`)}</select>
  ${m.open.length ? html`<input type="hidden" name="open" value="${m.open.join(',')}">` : ''}
  <button class="btn" type="submit">${icon('search')}กรอง</button>
</form>
${body}`, { script: true, connect: '/app/admin/access' });
}

/** POST /app/admin/access: tap a cell (cell=u:<teacher>:<unit> | b:<teacher>:<book>) or bulk (bulk=1, sel, bulk_book, bulk_action). */
export async function matrixPost(ctx: Ctx): Promise<Response> {
  const { form, actor } = await adminPost(ctx);
  const m = readMatrixQuery(ctx);
  const back = (code: string, hash = '') => redirect(`${matrixUrl(m)}${matrixUrl(m).includes('?') ? '&' : '?'}m=${code}${hash}`);
  const expires = readExpiry(form, ctx.now);
  const cell = str(form, 'cell');
  if (cell) {
    const c = /^([ub]):([1-9]\d{0,9}):([1-9]\d{0,9})$/.exec(cell);
    if (!c) throw new HttpError(400, 'ช่องในตารางไม่ถูกต้อง');
    const t = await teacherOr404(ctx, Number(c[2]));
    let units: number[];
    if (c[1] === 'u') {
      const u = await db.getUnit(ctx.env, Number(c[3]));
      if (!u) throw new HttpError(404, 'ไม่พบหน่วย');
      units = [u.id];
    } else {
      if (!(await db.getBook(ctx.env, Number(c[3])))) throw new HttpError(404, 'ไม่พบหนังสือ');
      units = (await db.listUnits(ctx.env, Number(c[3]))).map((u) => u.id);
    }
    const live = new Set((await db.grantsOfTeacher(ctx.env, t.id)).filter((g) => db.isLive(g, ctx.now)).map((g) => g.unit_id));
    const allOn = units.length > 0 && units.every((u) => live.has(u));
    if (allOn) {
      const removed = await db.revokeUnits(ctx.env, t.id, units);
      await audit(ctx.env, ctx.now, actor, 'grant.toggle', `teacher:${t.id}`, { off: removed });
    } else {
      const added = await db.grantUnits(ctx.env, t.id, units, expires, actor, ctx.now);
      await audit(ctx.env, ctx.now, actor, 'grant.toggle', `teacher:${t.id}`, { on: added, expires });
    }
    return back(allOn ? 'revoked' : 'granted', `#t${t.id}`);
  }
  if (str(form, 'bulk') !== '1') throw new HttpError(400, 'ไม่รู้ว่าจะทำอะไร');
  const sel = idList(form, 'sel', 500);
  if (!sel.length) return back('pick');
  const bookId = int(str(form, 'bulk_book'), { min: 1, max: 1e10, field: 'หนังสือ' });
  if (!(await db.getBook(ctx.env, bookId))) throw new HttpError(404, 'ไม่พบหนังสือ');
  const action = oneOf(str(form, 'bulk_action') || 'give', ['give', 'take'] as const, 'คำสั่ง');
  const units = (await db.listUnits(ctx.env, bookId)).map((u) => u.id);
  const people: number[] = [];
  for (const id of sel) {
    const t = await teacherOr404(ctx, id);
    if (action === 'give') await db.grantUnits(ctx.env, t.id, units, expires, actor, ctx.now);
    else await db.revokeUnits(ctx.env, t.id, units);
    people.push(t.id);
  }
  await audit(ctx.env, ctx.now, actor, 'grant.bulk', `book:${bookId}`, { action, teachers: people, units: units.length, expires: action === 'give' ? expires : undefined });
  return back(action === 'give' ? 'bulk' : 'bulkoff');
}


