import type { Book, Env, Unit, UnitGrant } from '../env';
import * as db from '../db';
import { HttpError } from './http';
import { addMonths } from './pricing';
import { oneOf, str } from './validate';

/**
 * Who may open a deck: an active, approved teacher with an active subscription to the unit's book (not a draft book)
 * OR an active grant for the unit. Admins always may (preview). This module assembles that view for the pages.
 */
export interface UnitView {
  unit: Unit;
  /** End of the active paid subscription that covers the unit, or null. */
  sub: number | null;
  /** Live grant, or null. */
  grant: Pick<UnitGrant, 'id' | 'expires_at'> | null;
  /** A grant that has run out (shown to the owner, never counted). */
  expired: Pick<UnitGrant, 'id' | 'expires_at'> | null;
  open: boolean;
  /** Until when the teacher can open it: null = no expiry. Only meaningful when open. */
  until: number | null;
}

export interface BookView {
  book: Book;
  units: UnitView[];
  openCount: number;
  /** The teacher's subscription row for this book, any status (for "renew" / "pay" prompts). */
  sub?: db.MySub;
}

export function unitView(unit: Unit, subEnd: number | null, grant: Pick<UnitGrant, 'id' | 'expires_at'> | undefined, now: number): UnitView {
  const live = grant && db.isLive(grant, now) ? grant : null;
  const until = live ? (live.expires_at === null ? null : Math.max(live.expires_at, subEnd ?? 0)) : subEnd;
  return { unit, sub: subEnd, grant: live, expired: grant && !live ? grant : null, open: subEnd !== null || live !== null, until };
}

/** Every book the teacher has something in (a subscription of any status, or a live grant), with each unit's access. */
export async function teacherLibrary(env: Env, teacherId: number, now: number): Promise<BookView[]> {
  const [subs, grants] = await Promise.all([db.listMySubscriptions(env, teacherId), db.grantsOfTeacher(env, teacherId)]);
  const live = grants.filter((g) => db.isLive(g, now));
  const ids = [...new Set([...subs.map((s) => s.book_id), ...live.map((g) => g.book_id)])];
  if (!ids.length) return [];
  const [books, units] = await Promise.all([
    env.DB.prepare('SELECT * FROM books WHERE id IN (SELECT value FROM json_each(?1)) ORDER BY title').bind(JSON.stringify(ids)).all<Book>(),
    env.DB.prepare('SELECT * FROM units WHERE book_id IN (SELECT value FROM json_each(?1)) ORDER BY book_id, position').bind(JSON.stringify(ids)).all<Unit>(),
  ]);
  const grantOf = new Map(live.map((g) => [g.unit_id, g]));
  return books.results.map((book) => {
    const sub = subs.find((s) => s.book_id === book.id);
    const subEnd = sub && book.status !== 'draft' && db.isActive(sub, now) ? sub.period_end : null;
    const views = units.results.filter((u) => u.book_id === book.id).map((u) => unitView(u, subEnd, grantOf.get(u.id), now));
    return { book, units: views, openCount: views.filter((v) => v.open).length, sub };
  });
}

/** A teacher's access to every book (the owner's "สิทธิ์เข้าถึงสไลด์" panel): all books, also the ones without access. */
export async function accessMap(env: Env, teacherId: number, now: number): Promise<BookView[]> {
  const [all, subs, grants] = await Promise.all([db.allBooksWithUnits(env), db.activeSubsOf(env, [teacherId], now), db.grantsOfTeacher(env, teacherId)]);
  const grantOf = new Map(grants.map((g) => [g.unit_id, g]));
  return all.map(({ book, units }) => {
    const subEnd = subs.find((s) => s.book_id === book.id)?.period_end ?? null;
    const views = units.map((u) => unitView(u, subEnd, grantOf.get(u.id), now));
    return { book, units: views, openCount: views.filter((v) => v.open).length };
  });
}

// ---------- expiry of a grant: none / 1 / 3 / 12 months / a date ----------
export const EXPIRY_CHOICES = ['none', '1', '3', '12', 'date'] as const;

/** Bangkok calendar day (YYYY-MM-DD) of a Unix time. */
export function bkkDay(t: number): string {
  return new Date((t + 7 * 3600) * 1000).toISOString().slice(0, 10);
}

/** The expiry chosen in a form (fields `expiry` and `expiry_date`): Unix time, or null for no expiry. */
export function readExpiry(form: FormData, now: number, prefix = ''): number | null {
  const choice = oneOf(str(form, `${prefix}expiry`) || 'none', EXPIRY_CHOICES, 'วันหมดอายุ');
  if (choice === 'none') return null;
  if (choice !== 'date') return addMonths(now, Number(choice));
  const d = str(form, `${prefix}expiry_date`).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  const bad = () => new HttpError(400, 'กรุณาเลือกวันหมดอายุให้ถูกต้อง (วันนี้หรือหลังจากนี้ ไม่เกิน 5 ปี)', 'expiry_date');
  if (!m) throw bad();
  const end = Date.UTC(+m[1], +m[2] - 1, +m[3], 23, 59, 59) / 1000 - 7 * 3600; // end of that day, Bangkok time
  if (new Date((end + 7 * 3600) * 1000).toISOString().slice(0, 10) !== d) throw bad();
  if (end <= now || end > now + 5 * 366 * 86400) throw bad();
  return end;
}

/** Ids from repeated form fields (e.g. name="unit"), as whole numbers; anything else is refused. */
export function idList(form: FormData, name: string, max = 2000): number[] {
  const out = new Set<number>();
  for (const v of form.getAll(name)) {
    if (typeof v !== 'string' || !/^[1-9]\d{0,9}$/.test(v)) throw new HttpError(400, 'ข้อมูลในฟอร์มไม่ถูกต้อง', name);
    out.add(Number(v));
    if (out.size > max) throw new HttpError(413, 'เลือกมากเกินไป', name);
  }
  return [...out];
}
