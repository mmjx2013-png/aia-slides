import type { Book, BookRequest, Env, Payment, Subscription, Teacher, Unit, UnitGrant } from './env';
import type { Answers, Choice } from './lib/quiz';
import { addMonths, monthlyPrice, totalPrice } from './lib/pricing';
import { HttpError } from './lib/http';

/** All SQL lives here. Every query is parameterised with ?N placeholders and .bind(); no string building with input. */

// ---------- teachers ----------
/** `approve`: a new member is approved at once (approval is off, or the LINE id is an admin's); otherwise they wait. */
export async function upsertTeacherFromLine(env: Env, lineId: string, name: string, now: number, approve = true): Promise<{ teacher: Teacher; created: boolean }> {
  const existing = await env.DB.prepare('SELECT * FROM teachers WHERE line_user_id = ?1').bind(lineId).first<Teacher>();
  if (existing) {
    await env.DB.prepare('UPDATE teachers SET last_login_at = ?1 WHERE id = ?2').bind(now, existing.id).run();
    return { teacher: { ...existing, last_login_at: now }, created: false };
  }
  const teacher = await env.DB.prepare(
    `INSERT INTO teachers (line_user_id, display_name, school, status, created_at, last_login_at, approved_at, approved_by)
     VALUES (?1, ?2, '', 'active', ?3, ?3, ?4, ?5)
     ON CONFLICT (line_user_id) DO UPDATE SET last_login_at = excluded.last_login_at RETURNING *`,
  ).bind(lineId, name, now, approve ? now : null, approve ? 'auto' : null).first<Teacher>();
  return { teacher: teacher!, created: true };
}

export function getTeacher(env: Env, id: number) {
  return env.DB.prepare('SELECT * FROM teachers WHERE id = ?1').bind(id).first<Teacher>();
}

export async function updateProfile(env: Env, id: number, name: string, school: string): Promise<void> {
  await env.DB.prepare('UPDATE teachers SET display_name = ?1, school = ?2 WHERE id = ?3').bind(name, school, id).run();
}

export async function setTeacherStatus(env: Env, id: number, status: 'active' | 'blocked'): Promise<void> {
  await env.DB.prepare('UPDATE teachers SET status = ?1 WHERE id = ?2').bind(status, id).run();
}

/** LINE ids of erased members are replaced by this prefix + the row id (see eraseTeacher). */
export const ERASED_PREFIX = 'erased:';

/**
 * PDPA erasure on request: the name, school and LINE user id are removed, the member is blocked and logged out,
 * open subscriptions end and unpaid requests are closed, and their deck grants and book requests (with the quiz answers) are deleted. Payment amounts and dates stay (accounting records);
 * the audit log only ever holds the row id. A later LINE login with the same account starts a fresh, empty member.
 */
export async function eraseTeacher(env: Env, id: number, now: number): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`UPDATE teachers SET line_user_id = ?1, display_name = ?2, school = '', status = 'blocked' WHERE id = ?3`)
      .bind(`${ERASED_PREFIX}${id}`, `ลบข้อมูลแล้ว #${id}`, id),
    env.DB.prepare(
      `UPDATE subscriptions SET status = 'expired', period_end = CASE WHEN period_end IS NULL OR period_end > ?1 THEN ?1 ELSE period_end END,
         updated_at = ?1 WHERE teacher_id = ?2 AND status != 'expired'`,
    ).bind(now, id),
    env.DB.prepare(`UPDATE payments SET status = 'rejected', confirmed_by = 'erased', decided_at = ?1, ref = NULL WHERE teacher_id = ?2 AND status = 'pending'`)
      .bind(now, id),
    env.DB.prepare('DELETE FROM sessions WHERE teacher_id = ?1').bind(id),
    env.DB.prepare('DELETE FROM unit_grants WHERE teacher_id = ?1').bind(id),
    env.DB.prepare('DELETE FROM book_request_answers WHERE request_id IN (SELECT id FROM book_requests WHERE teacher_id = ?1)').bind(id),
    env.DB.prepare('DELETE FROM book_requests WHERE teacher_id = ?1').bind(id),
  ]);
}

export interface TeacherRow extends Teacher { active_count: number; pending_count: number; grant_count: number; }
/** filter: 'all', 'waiting' (approval), 'blocked'. */
export async function listTeachers(env: Env, q: string, now: number, limit = 200, filter: 'all' | 'waiting' | 'blocked' = 'all'): Promise<TeacherRow[]> {
  const like = `%${q.replace(/[\\%_]/g, (c) => '\\' + c)}%`;
  const { results } = await env.DB.prepare(
    `SELECT t.*,
       (SELECT COUNT(*) FROM subscriptions s WHERE s.teacher_id = t.id AND s.status = 'active' AND s.period_end > ?2) AS active_count,
       (SELECT COUNT(*) FROM payments p WHERE p.teacher_id = t.id AND p.status = 'pending') AS pending_count,
       (SELECT COUNT(*) FROM unit_grants g WHERE g.teacher_id = t.id AND (g.expires_at IS NULL OR g.expires_at > ?2)) AS grant_count
     FROM teachers t
     WHERE (?1 = '%%' OR t.display_name LIKE ?1 ESCAPE '\\' OR t.school LIKE ?1 ESCAPE '\\' OR t.line_user_id LIKE ?1 ESCAPE '\\')
       AND (?4 = 'all' OR (?4 = 'waiting' AND t.approved_at IS NULL AND t.status = 'active') OR (?4 = 'blocked' AND t.status = 'blocked'))
     ORDER BY t.approved_at IS NOT NULL, t.created_at DESC LIMIT ?3`,
  ).bind(like, now, limit, filter).all<TeacherRow>();
  return results;
}

// ---------- books & units ----------
export function getBook(env: Env, id: number) {
  return env.DB.prepare('SELECT * FROM books WHERE id = ?1').bind(id).first<Book>();
}

export async function listBooks(env: Env, onlyPublished: boolean): Promise<Book[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM books ${onlyPublished ? "WHERE status = 'published'" : ''} ORDER BY status = 'archived', grade, subject, title`,
  ).all<Book>();
  return results;
}

export interface BookInput { title: string; subject: string; grade: string; rate: number; status: Book['status']; }
export async function createBook(env: Env, b: BookInput, now: number): Promise<number> {
  const row = await env.DB.prepare(
    `INSERT INTO books (title, subject, grade, slide_count, rate_baht_per_slide, status, created_at, updated_at)
     VALUES (?1, ?2, ?3, 0, ?4, ?5, ?6, ?6) RETURNING id`,
  ).bind(b.title, b.subject, b.grade, b.rate, b.status, now).first<{ id: number }>();
  return row!.id;
}

export async function updateBook(env: Env, id: number, b: BookInput, now: number): Promise<void> {
  await env.DB.prepare(
    `UPDATE books SET title = ?1, subject = ?2, grade = ?3, rate_baht_per_slide = ?4, status = ?5, updated_at = ?6 WHERE id = ?7`,
  ).bind(b.title, b.subject, b.grade, b.rate, b.status, now, id).run();
}

export async function deleteBook(env: Env, id: number): Promise<string[]> {
  const subs = await env.DB.prepare('SELECT COUNT(*) AS n FROM subscriptions WHERE book_id = ?1').bind(id).first<{ n: number }>();
  if ((subs?.n ?? 0) > 0) throw new HttpError(409, 'หนังสือเล่มนี้มีสมาชิกสมัครแล้ว ลบไม่ได้ ให้เปลี่ยนสถานะเป็น "เก็บถาวร" แทน');
  const { results } = await env.DB.prepare('SELECT r2_key FROM units WHERE book_id = ?1 AND r2_key IS NOT NULL').bind(id).all<{ r2_key: string }>();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM unit_grants WHERE unit_id IN (SELECT id FROM units WHERE book_id = ?1)').bind(id),
    env.DB.prepare('DELETE FROM units WHERE book_id = ?1').bind(id),
    env.DB.prepare('DELETE FROM books WHERE id = ?1').bind(id),
  ]);
  return results.map((r) => r.r2_key);
}

/** The book's slide_count is the sum of its units; prices follow it. */
export async function recalcBookSlides(env: Env, bookId: number, now: number): Promise<void> {
  await env.DB.prepare(
    `UPDATE books SET slide_count = (SELECT COALESCE(SUM(slide_count), 0) FROM units WHERE book_id = ?1), updated_at = ?2 WHERE id = ?1`,
  ).bind(bookId, now).run();
}

export async function listUnits(env: Env, bookId: number): Promise<Unit[]> {
  const { results } = await env.DB.prepare('SELECT * FROM units WHERE book_id = ?1 ORDER BY position').bind(bookId).all<Unit>();
  return results;
}

export function getUnit(env: Env, id: number) {
  return env.DB.prepare('SELECT * FROM units WHERE id = ?1').bind(id).first<Unit>();
}

export interface UnitInput { position: number; title: string; slideCount: number; }
export async function createUnit(env: Env, bookId: number, u: UnitInput, now: number): Promise<number> {
  try {
    const row = await env.DB.prepare(
      `INSERT INTO units (book_id, position, title, slide_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?5) RETURNING id`,
    ).bind(bookId, u.position, u.title, u.slideCount, now).first<{ id: number }>();
    await recalcBookSlides(env, bookId, now);
    return row!.id;
  } catch (e) {
    if (String(e).includes('UNIQUE')) throw new HttpError(409, `ลำดับที่ ${u.position} มีอยู่แล้วในหนังสือเล่มนี้`);
    throw e;
  }
}

export async function updateUnit(env: Env, unit: Unit, u: UnitInput, now: number): Promise<void> {
  try {
    await env.DB.prepare('UPDATE units SET position = ?1, title = ?2, slide_count = ?3, updated_at = ?4 WHERE id = ?5')
      .bind(u.position, u.title, u.slideCount, now, unit.id).run();
  } catch (e) {
    if (String(e).includes('UNIQUE')) throw new HttpError(409, `ลำดับที่ ${u.position} มีอยู่แล้วในหนังสือเล่มนี้`);
    throw e;
  }
  await recalcBookSlides(env, unit.book_id, now);
}

export async function deleteUnit(env: Env, unit: Unit, now: number): Promise<void> {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM unit_grants WHERE unit_id = ?1').bind(unit.id),
    env.DB.prepare('DELETE FROM units WHERE id = ?1').bind(unit.id),
  ]);
  await recalcBookSlides(env, unit.book_id, now);
}

export async function setUnitUpload(env: Env, unit: Unit, o: { key: string; hashes: string[]; sha: string; bytes: number; slides: number }, now: number): Promise<void> {
  await env.DB.prepare(
    `UPDATE units SET r2_key = ?1, script_hashes = ?2, html_sha256 = ?3, html_bytes = ?4, uploaded_at = ?5, updated_at = ?5,
       slide_count = CASE WHEN ?6 > 0 THEN ?6 ELSE slide_count END WHERE id = ?7`,
  ).bind(o.key, o.hashes.join(' '), o.sha, o.bytes, now, o.slides, unit.id).run();
  await recalcBookSlides(env, unit.book_id, now);
}

// ---------- subscriptions ----------
/** A subscription counts as active only while status = active AND the period has not ended. */
export function isActive(s: Subscription | null | undefined, now: number): boolean {
  return !!s && s.status === 'active' && s.period_end !== null && s.period_end > now;
}

export function effectiveStatus(s: Subscription, now: number): Subscription['status'] {
  return s.status === 'active' && !isActive(s, now) ? 'expired' : s.status;
}

export function getSubscription(env: Env, teacherId: number, bookId: number) {
  return env.DB.prepare('SELECT * FROM subscriptions WHERE teacher_id = ?1 AND book_id = ?2').bind(teacherId, bookId).first<Subscription>();
}

export function getSubscriptionById(env: Env, id: number) {
  return env.DB.prepare('SELECT * FROM subscriptions WHERE id = ?1').bind(id).first<Subscription>();
}


export interface MySub extends Subscription { title: string; subject: string; grade: string; book_status: Book['status']; }
export async function listMySubscriptions(env: Env, teacherId: number): Promise<MySub[]> {
  const { results } = await env.DB.prepare(
    `SELECT s.*, b.title, b.subject, b.grade, b.status AS book_status FROM subscriptions s JOIN books b ON b.id = s.book_id
     WHERE s.teacher_id = ?1 ORDER BY b.title`,
  ).bind(teacherId).all<MySub>();
  return results;
}

export interface SubRow extends Subscription { display_name: string; school: string; line_user_id: string; title: string; }
export async function listSubscriptions(env: Env, filter: 'all' | 'active' | 'pending' | 'expired', now: number, teacherId?: number, limit = 500): Promise<SubRow[]> {
  const where = {
    all: '1 = 1',
    active: `s.status = 'active' AND s.period_end > ?1`,
    pending: `s.status = 'pending'`,
    expired: `(s.status = 'expired' OR (s.status = 'active' AND s.period_end <= ?1))`,
  }[filter];
  const { results } = await env.DB.prepare(
    `SELECT s.*, t.display_name, t.school, t.line_user_id, b.title FROM subscriptions s
     JOIN teachers t ON t.id = s.teacher_id JOIN books b ON b.id = s.book_id
     WHERE ${where} AND (?2 IS NULL OR s.teacher_id = ?2) ORDER BY s.updated_at DESC LIMIT ?3`,
  ).bind(now, teacherId ?? null, limit).all<SubRow>();
  return results;
}

/** Admin: add months (also creates the subscription when the member has none, e.g. a free trial). */
export async function extendSubscription(env: Env, teacherId: number, book: Book, months: number, now: number): Promise<Subscription> {
  const current = await getSubscription(env, teacherId, book.id);
  const price = book.slide_count > 0 ? monthlyPrice(book.slide_count, book.rate_baht_per_slide) : 0;
  const base = isActive(current, now) ? current!.period_end! : now;
  const start = isActive(current, now) ? current!.period_start! : now;
  const end = addMonths(base, months);
  const row = await env.DB.prepare(
    `INSERT INTO subscriptions (teacher_id, book_id, period_start, period_end, monthly_price, status, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6, ?6)
     ON CONFLICT (teacher_id, book_id) DO UPDATE SET period_start = ?3, period_end = ?4,
       monthly_price = CASE WHEN subscriptions.monthly_price > 0 THEN subscriptions.monthly_price ELSE ?5 END,
       status = 'active', updated_at = ?6
     RETURNING *`,
  ).bind(teacherId, book.id, start, end, price, now).first<Subscription>();
  return row!;
}

export async function expireSubscription(env: Env, id: number, now: number): Promise<void> {
  await env.DB.prepare(
    `UPDATE subscriptions SET status = 'expired', period_end = CASE WHEN period_end IS NULL OR period_end > ?1 THEN ?1 ELSE period_end END,
       updated_at = ?1 WHERE id = ?2`,
  ).bind(now, id).run();
}

/** Daily job: mark finished periods as expired. */
export async function expireDue(env: Env, now: number): Promise<number> {
  const r = await env.DB.prepare(`UPDATE subscriptions SET status = 'expired', updated_at = ?1 WHERE status = 'active' AND period_end <= ?1`).bind(now).run();
  return r.meta.changes ?? 0;
}

// ---------- payments ----------
/**
 * A member asks to subscribe or renew: make sure the subscription row exists, then create (or refresh) the one
 * pending payment for it. The price is computed here, on the server, from the book: never taken from the form.
 */
export async function requestPayment(env: Env, teacherId: number, book: Book, months: number, provider: Payment['provider'], now: number): Promise<Payment> {
  const monthly = monthlyPrice(book.slide_count, book.rate_baht_per_slide);
  const amount = totalPrice(monthly, months);
  const sub = await env.DB.prepare(
    `INSERT INTO subscriptions (teacher_id, book_id, monthly_price, status, created_at, updated_at) VALUES (?1, ?2, ?3, 'pending', ?4, ?4)
     ON CONFLICT (teacher_id, book_id) DO UPDATE SET updated_at = ?4 RETURNING *`,
  ).bind(teacherId, book.id, monthly, now).first<Subscription>();
  const pending = await env.DB.prepare(`SELECT * FROM payments WHERE subscription_id = ?1 AND status = 'pending' ORDER BY id DESC LIMIT 1`)
    .bind(sub!.id).first<Payment>();
  if (pending) {
    if (pending.notified_at) return pending; // the member already said they paid this amount: never change it
    const row = await env.DB.prepare(
      `UPDATE payments SET months = ?1, slide_count = ?2, rate_baht = ?3, monthly_price = ?4, amount_satang = ?5, provider = ?6, created_at = ?7
       WHERE id = ?8 RETURNING *`,
    ).bind(months, book.slide_count, book.rate_baht_per_slide, monthly, amount * 100, provider, now, pending.id).first<Payment>();
    return row!;
  }
  const row = await env.DB.prepare(
    `INSERT INTO payments (subscription_id, teacher_id, provider, months, slide_count, rate_baht, monthly_price, amount_satang, status, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending', ?9) RETURNING *`,
  ).bind(sub!.id, teacherId, provider, months, book.slide_count, book.rate_baht_per_slide, monthly, amount * 100, now).first<Payment>();
  return row!;
}

export function getPayment(env: Env, id: number) {
  return env.DB.prepare('SELECT * FROM payments WHERE id = ?1').bind(id).first<Payment>();
}

export async function notifyPaid(env: Env, payment: Payment, note: string, now: number): Promise<void> {
  await env.DB.prepare(`UPDATE payments SET notified_at = ?1, ref = ?2 WHERE id = ?3 AND status = 'pending'`)
    .bind(now, note || null, payment.id).run();
}

export interface PaymentRow extends Payment { display_name: string; school: string; line_user_id: string; title: string; book_id: number; }
export async function listPayments(env: Env, status: Payment['status'] | 'all', limit = 200): Promise<PaymentRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT p.*, t.display_name, t.school, t.line_user_id, b.title, b.id AS book_id FROM payments p
     JOIN teachers t ON t.id = p.teacher_id JOIN subscriptions s ON s.id = p.subscription_id JOIN books b ON b.id = s.book_id
     WHERE (?1 = 'all' OR p.status = ?1)
     ORDER BY CASE WHEN p.status = 'pending' THEN 0 ELSE 1 END, p.notified_at IS NULL, p.created_at DESC LIMIT ?2`,
  ).bind(status, limit).all<PaymentRow>();
  return results;
}

export async function listPaymentsForTeacher(env: Env, teacherId: number): Promise<PaymentRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT p.*, t.display_name, t.school, t.line_user_id, b.title, b.id AS book_id FROM payments p
     JOIN teachers t ON t.id = p.teacher_id JOIN subscriptions s ON s.id = p.subscription_id JOIN books b ON b.id = s.book_id
     WHERE p.teacher_id = ?1 ORDER BY p.created_at DESC LIMIT 100`,
  ).bind(teacherId).all<PaymentRow>();
  return results;
}

/**
 * Confirm a payment and activate (or extend) its subscription, in one D1 batch (a single transaction).
 * Used by the admin page now and by the Stripe webhook later. Confirming twice does nothing the second time.
 * `expectSatang` is the amount the admin saw (and checked in the bank app): if the member changed the request since,
 * nothing is confirmed, so a 1-month transfer can never be confirmed as a 12-month subscription.
 */
export async function confirmPayment(env: Env, paymentId: number, confirmedBy: string, now: number, expectSatang?: number): Promise<{ payment: Payment; subscription: Subscription } | 'changed' | null> {
  const p = await getPayment(env, paymentId);
  if (!p || p.status !== 'pending') return null;
  if (expectSatang !== undefined && p.amount_satang !== expectSatang) return 'changed';
  const sub = await getSubscriptionById(env, p.subscription_id);
  if (!sub) return null;
  const active = isActive(sub, now);
  const start = active ? sub.period_start! : now;
  const end = addMonths(active ? sub.period_end! : now, p.months);
  const [upd] = await env.DB.batch([
    env.DB.prepare(`UPDATE payments SET status = 'confirmed', confirmed_by = ?1, decided_at = ?2
       WHERE id = ?3 AND status = 'pending' AND amount_satang = ?4 AND months = ?5`)
      .bind(confirmedBy, now, p.id, p.amount_satang, p.months),
    env.DB.prepare(
      `UPDATE subscriptions SET status = 'active', period_start = ?1, period_end = ?2, monthly_price = ?3, updated_at = ?4
       WHERE id = ?5 AND EXISTS (SELECT 1 FROM payments WHERE id = ?6 AND status = 'confirmed' AND decided_at = ?4)`,
    ).bind(start, end, p.monthly_price, now, sub.id, p.id),
  ]);
  if (!upd.meta.changes) return null;
  return {
    payment: (await getPayment(env, p.id))!,
    subscription: (await getSubscriptionById(env, sub.id))!,
  };
}

export async function rejectPayment(env: Env, paymentId: number, by: string, now: number): Promise<boolean> {
  const r = await env.DB.prepare(`UPDATE payments SET status = 'rejected', confirmed_by = ?1, decided_at = ?2 WHERE id = ?3 AND status = 'pending'`)
    .bind(by, now, paymentId).run();
  return (r.meta.changes ?? 0) > 0;
}

// ---------- audit ----------
export interface AuditRow { id: number; at: number; actor: string; action: string; target: string | null; detail: string | null; }
export async function listAudit(env: Env, before: number | null, limit = 100): Promise<AuditRow[]> {
  const { results } = await env.DB.prepare('SELECT * FROM audit_log WHERE (?1 IS NULL OR id < ?1) ORDER BY id DESC LIMIT ?2')
    .bind(before, limit).all<AuditRow>();
  return results;
}

export async function counts(env: Env, now: number) {
  return env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM teachers) AS teachers,
            (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND period_end > ?1) AS active,
            (SELECT COUNT(*) FROM payments WHERE status = 'pending') AS pending,
            (SELECT COALESCE(SUM(amount_satang), 0) FROM payments WHERE status = 'confirmed' AND decided_at > ?2) AS revenue30,
            (SELECT COUNT(*) FROM book_requests WHERE status = 'new') AS new_requests,
            (SELECT COUNT(*) FROM teachers WHERE approved_at IS NULL AND status = 'active') AS waiting,
            (SELECT COUNT(*) FROM unit_grants WHERE expires_at IS NULL OR expires_at > ?1) AS grants`,
  ).bind(now, now - 30 * 86400).first<{ teachers: number; active: number; pending: number; revenue30: number; new_requests: number; waiting: number; grants: number }>();
}

// ---------- access: paid subscriptions per book + grants per unit ----------
/**
 * Where a teacher's right to open one unit comes from, right now.
 * sub: end of an active subscription to the unit's book (not for a draft book), or null;
 * grant: an active grant (expires null = no expiry), or null.
 */
export interface UnitAccess { sub: number | null; grant: { id: number; expires_at: number | null } | null; }
export async function unitAccess(env: Env, teacherId: number, unit: Pick<Unit, 'id' | 'book_id'>, now: number): Promise<UnitAccess> {
  const row = await env.DB.prepare(
    `SELECT (SELECT s.period_end FROM subscriptions s JOIN books b ON b.id = s.book_id
              WHERE s.teacher_id = ?1 AND s.book_id = ?2 AND s.status = 'active' AND s.period_end > ?4 AND b.status != 'draft') AS sub_end,
            g.id AS grant_id, g.expires_at AS grant_end
     FROM (SELECT 1) LEFT JOIN unit_grants g ON g.teacher_id = ?1 AND g.unit_id = ?3 AND (g.expires_at IS NULL OR g.expires_at > ?4)`,
  ).bind(teacherId, unit.book_id, unit.id, now).first<{ sub_end: number | null; grant_id: number | null; grant_end: number | null }>();
  return { sub: row?.sub_end ?? null, grant: row?.grant_id ? { id: row.grant_id, expires_at: row.grant_end } : null };
}

export function canOpen(a: UnitAccess): boolean {
  return a.sub !== null || a.grant !== null;
}

export interface GrantRow extends UnitGrant { book_id: number; position: number; unit_title: string; book_title: string; }
/** Every grant of one teacher (also expired ones), with its unit and book. */
export async function grantsOfTeacher(env: Env, teacherId: number): Promise<GrantRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT g.*, u.book_id, u.position, u.title AS unit_title, b.title AS book_title FROM unit_grants g
     JOIN units u ON u.id = g.unit_id JOIN books b ON b.id = u.book_id WHERE g.teacher_id = ?1 ORDER BY b.title, u.position`,
  ).bind(teacherId).all<GrantRow>();
  return results;
}

/** Active subscriptions of one teacher: book id -> period end (draft books do not count). */
export async function activeSubsOf(env: Env, teacherIds: number[], now: number): Promise<{ teacher_id: number; book_id: number; period_end: number }[]> {
  if (!teacherIds.length) return [];
  const { results } = await env.DB.prepare(
    `SELECT s.teacher_id, s.book_id, s.period_end FROM subscriptions s JOIN books b ON b.id = s.book_id
     WHERE s.teacher_id IN (SELECT value FROM json_each(?1)) AND s.status = 'active' AND s.period_end > ?2 AND b.status != 'draft'`,
  ).bind(JSON.stringify(teacherIds), now).all<{ teacher_id: number; book_id: number; period_end: number }>();
  return results;
}

/** Grants of many teachers (also expired ones). */
export async function grantsOf(env: Env, teacherIds: number[]): Promise<(UnitGrant & { book_id: number })[]> {
  if (!teacherIds.length) return [];
  const { results } = await env.DB.prepare(
    `SELECT g.*, u.book_id FROM unit_grants g JOIN units u ON u.id = g.unit_id WHERE g.teacher_id IN (SELECT value FROM json_each(?1))`,
  ).bind(JSON.stringify(teacherIds)).all<UnitGrant & { book_id: number }>();
  return results;
}

/** Every unit, grouped by book (all book statuses: the owner may give a deck that is not for sale). */
export async function allBooksWithUnits(env: Env): Promise<{ book: Book; units: Unit[] }[]> {
  const [books, units] = await Promise.all([
    env.DB.prepare(`SELECT * FROM books ORDER BY status = 'archived', status = 'draft', grade, subject, title`).all<Book>(),
    env.DB.prepare('SELECT * FROM units ORDER BY book_id, position').all<Unit>(),
  ]);
  return books.results.map((book) => ({ book, units: units.results.filter((u) => u.book_id === book.id) }));
}

export function isLive(g: Pick<UnitGrant, 'expires_at'>, now: number): boolean {
  return g.expires_at === null || g.expires_at > now;
}

/**
 * Give units to a teacher. A unit without a grant (or with an expired one) gets `expiresAt`;
 * an active grant keeps its expiry unless `overwrite` is set. Returns the ids that were newly given.
 */
export async function grantUnits(env: Env, teacherId: number, unitIds: number[], expiresAt: number | null, by: string, now: number, overwrite = false, note = ''): Promise<number[]> {
  if (!unitIds.length) return [];
  const before = new Map((await env.DB.prepare(
    'SELECT unit_id, expires_at FROM unit_grants WHERE teacher_id = ?1 AND unit_id IN (SELECT value FROM json_each(?2))',
  ).bind(teacherId, JSON.stringify(unitIds)).all<{ unit_id: number; expires_at: number | null }>()).results.map((r) => [r.unit_id, r]));
  await env.DB.batch(unitIds.map((u) => env.DB.prepare(
    `INSERT INTO unit_grants (teacher_id, unit_id, granted_by, expires_at, note, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
     ON CONFLICT (teacher_id, unit_id) DO UPDATE SET expires_at = excluded.expires_at, granted_by = excluded.granted_by,
       note = CASE WHEN excluded.note != '' THEN excluded.note ELSE unit_grants.note END, updated_at = excluded.updated_at
     WHERE ?7 = 1 OR (unit_grants.expires_at IS NOT NULL AND unit_grants.expires_at <= ?6)`,
  ).bind(teacherId, u, by, expiresAt, note, now, overwrite ? 1 : 0)));
  return unitIds.filter((u) => { const b = before.get(u); return !b || !isLive(b, now); });
}

/** Take units away from a teacher (grants only; a paid subscription is not touched). Returns the removed unit ids. */
export async function revokeUnits(env: Env, teacherId: number, unitIds: number[]): Promise<number[]> {
  if (!unitIds.length) return [];
  const { results } = await env.DB.prepare(
    'DELETE FROM unit_grants WHERE teacher_id = ?1 AND unit_id IN (SELECT value FROM json_each(?2)) RETURNING unit_id',
  ).bind(teacherId, JSON.stringify(unitIds)).all<{ unit_id: number }>();
  return results.map((r) => r.unit_id);
}

export async function revokeGrant(env: Env, id: number) {
  return env.DB.prepare('DELETE FROM unit_grants WHERE id = ?1 RETURNING *').bind(id).first<UnitGrant>();
}

export interface BookAccessRow { teacher_id: number; display_name: string; school: string; status: Teacher['status']; approved_at: number | null; }
/** Who can open (or could open) a book's units: active subscribers and every grant (also expired), with teacher info. */
export async function accessForBook(env: Env, bookId: number, now: number) {
  const [subs, grants] = await Promise.all([
    env.DB.prepare(
      `SELECT s.teacher_id, s.period_end, t.display_name, t.school, t.status, t.approved_at FROM subscriptions s JOIN teachers t ON t.id = s.teacher_id
       WHERE s.book_id = ?1 AND s.status = 'active' AND s.period_end > ?2 ORDER BY t.display_name`,
    ).bind(bookId, now).all<BookAccessRow & { period_end: number }>(),
    env.DB.prepare(
      `SELECT g.*, u.position, u.title AS unit_title, t.display_name, t.school, t.status, t.approved_at FROM unit_grants g
       JOIN units u ON u.id = g.unit_id JOIN teachers t ON t.id = g.teacher_id WHERE u.book_id = ?1 ORDER BY t.display_name, u.position`,
    ).bind(bookId).all<UnitGrant & BookAccessRow & { position: number; unit_title: string }>(),
  ]);
  return { subs: subs.results, grants: grants.results };
}

export interface GrantExportRow extends UnitGrant { display_name: string; school: string; book_title: string; unit_title: string; position: number; }
export async function listAllGrants(env: Env, limit = 100000): Promise<GrantExportRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT g.*, t.display_name, t.school, b.title AS book_title, u.title AS unit_title, u.position FROM unit_grants g
     JOIN teachers t ON t.id = g.teacher_id JOIN units u ON u.id = g.unit_id JOIN books b ON b.id = u.book_id
     ORDER BY t.display_name, b.title, u.position LIMIT ?1`,
  ).bind(limit).all<GrantExportRow>();
  return results;
}

// ---------- approval of new members ----------
export async function approveTeacher(env: Env, id: number, by: string, now: number): Promise<boolean> {
  const r = await env.DB.prepare(`UPDATE teachers SET approved_at = ?2, approved_by = ?3 WHERE id = ?1 AND approved_at IS NULL AND status = 'active'`)
    .bind(id, now, by).run();
  return (r.meta.changes ?? 0) > 0;
}

// ---------- book requests (ขอทำหนังสือ) ----------
export interface RequestInput { subject: string; grade: string; textbook: string; units: string; startDate: string; note: string; }

export async function createRequest(env: Env, teacherId: number, r: RequestInput, now: number): Promise<number> {
  const row = await env.DB.prepare(
    `INSERT INTO book_requests (teacher_id, subject, grade, textbook, units, start_date, note, status, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'draft', ?8, ?8) RETURNING id`,
  ).bind(teacherId, r.subject, r.grade, r.textbook, r.units, r.startDate, r.note, now).first<{ id: number }>();
  return row!.id;
}

export function getRequest(env: Env, id: number) {
  return env.DB.prepare('SELECT * FROM book_requests WHERE id = ?1').bind(id).first<BookRequest>();
}

export interface RequestRow extends BookRequest { answered: number; }
/** A teacher's own requests, newest first (with how many quiz questions are answered). */
export async function listMyRequests(env: Env, teacherId: number): Promise<RequestRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT r.*, (SELECT COUNT(*) FROM book_request_answers a WHERE a.request_id = r.id) AS answered
     FROM book_requests r WHERE r.teacher_id = ?1 ORDER BY r.created_at DESC, r.id DESC LIMIT 100`,
  ).bind(teacherId).all<RequestRow>();
  return results;
}

export type RequestFilter = BookRequest['status'] | 'open' | 'all';
export interface AdminRequestRow extends RequestRow { display_name: string; school: string; }
/** Admin: every teacher's requests. 'open' = new + quoted + building. */
export async function listRequests(env: Env, filter: RequestFilter, limit = 200): Promise<AdminRequestRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT r.*, t.display_name, t.school, (SELECT COUNT(*) FROM book_request_answers a WHERE a.request_id = r.id) AS answered
     FROM book_requests r JOIN teachers t ON t.id = r.teacher_id
     WHERE (?1 = 'all' OR r.status = ?1 OR (?1 = 'open' AND r.status IN ('new', 'quoted', 'building')))
     ORDER BY CASE r.status WHEN 'new' THEN 0 WHEN 'quoted' THEN 1 WHEN 'building' THEN 2 WHEN 'draft' THEN 3 ELSE 4 END,
       COALESCE(r.submitted_at, r.created_at) DESC, r.id DESC LIMIT ?2`,
  ).bind(filter, limit).all<AdminRequestRow>();
  return results;
}

export async function requestCounts(env: Env): Promise<Record<BookRequest['status'], number>> {
  const { results } = await env.DB.prepare('SELECT status, COUNT(*) AS n FROM book_requests GROUP BY status').all<{ status: BookRequest['status']; n: number }>();
  const out = { draft: 0, new: 0, quoted: 0, building: 0, done: 0, declined: 0 };
  for (const r of results) out[r.status] = r.n;
  return out;
}

export async function getAnswers(env: Env, requestId: number): Promise<Answers> {
  const { results } = await env.DB.prepare('SELECT question, choice FROM book_request_answers WHERE request_id = ?1')
    .bind(requestId).all<{ question: string; choice: Choice }>();
  const out: Answers = {};
  for (const r of results) out[r.question] = r.choice;
  return out;
}

/** Answers of many requests at once (admin list). */
export async function answersFor(env: Env, ids: number[]): Promise<Map<number, Answers>> {
  const out = new Map<number, Answers>(ids.map((id) => [id, {}]));
  if (!ids.length) return out;
  const { results } = await env.DB.prepare(
    'SELECT request_id, question, choice FROM book_request_answers WHERE request_id IN (SELECT value FROM json_each(?1))',
  ).bind(JSON.stringify(ids)).all<{ request_id: number; question: string; choice: Choice }>();
  for (const r of results) out.get(r.request_id)![r.question] = r.choice;
  return out;
}

/** Store (or change) one quiz answer. Only while the request is still a draft; returns false otherwise. */
export async function saveAnswer(env: Env, requestId: number, question: string, choice: Choice, now: number): Promise<boolean> {
  const [ins] = await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO book_request_answers (request_id, question, choice, answered_at)
       SELECT ?1, ?2, ?3, ?4 WHERE EXISTS (SELECT 1 FROM book_requests WHERE id = ?1 AND status = 'draft')
       ON CONFLICT (request_id, question) DO UPDATE SET choice = excluded.choice, answered_at = excluded.answered_at`,
    ).bind(requestId, question, choice, now),
    env.DB.prepare(`UPDATE book_requests SET updated_at = ?2 WHERE id = ?1 AND status = 'draft'`).bind(requestId, now),
  ]);
  return (ins.meta.changes ?? 0) > 0;
}

/** The quiz is finished: keep the summary and send the request to the owner (draft -> new), once. */
export async function submitRequest(env: Env, requestId: number, summary: string, now: number): Promise<boolean> {
  const r = await env.DB.prepare(
    `UPDATE book_requests SET status = 'new', summary = ?2, submitted_at = ?3, updated_at = ?3 WHERE id = ?1 AND status = 'draft'`,
  ).bind(requestId, summary, now).run();
  return (r.meta.changes ?? 0) > 0;
}

/** Admin: set the status and the private owner note. */
export async function updateRequestAdmin(env: Env, requestId: number, status: BookRequest['status'], ownerNote: string, now: number): Promise<boolean> {
  const r = await env.DB.prepare('UPDATE book_requests SET status = ?2, owner_note = ?3, updated_at = ?4 WHERE id = ?1')
    .bind(requestId, status, ownerNote, now).run();
  return (r.meta.changes ?? 0) > 0;
}

/** Daily housekeeping. */
export async function housekeeping(env: Env, now: number): Promise<{ expired: number }> {
  const expired = await expireDue(env, now);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?1').bind(now),
    env.DB.prepare('DELETE FROM oauth_states WHERE expires_at <= ?1').bind(now),
    env.DB.prepare('DELETE FROM rate_limits WHERE window_start < ?1').bind(now - 86400),
  ]);
  return { expired };
}
