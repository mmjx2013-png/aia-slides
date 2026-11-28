import type { Env } from '../env';
import { DEMO_OWNER_LINE } from '../lib/config';
import { addMonths } from '../lib/pricing';
import { QUIZ, buildSummary, type Answers } from '../lib/quiz';
import { DEMO_BOOKS } from './catalog';

/**
 * The demo's sample data (DEMO_MODE only). Everything here is invented: fake LINE ids, sample schools,
 * a dummy payment. "รีเซ็ตข้อมูลทดลอง" in admin runs seedDemo() again.
 */
const fake = (n: number) => `Ud${String(n).padStart(31, '0')}`;

export interface Persona { key: string; label: string; hint: string; teacherId: number; line: string; name: string; school: string; admin?: boolean; waiting?: boolean; }
export const PERSONAS: Persona[] = [
  { key: 'wichai', label: 'ครูวิชัย (ได้สิทธิ์บางหน่วย)', hint: 'ทีมงานเปิดให้ใช้บางหน่วย มีหน่วยที่กำลังจะหมดอายุ', teacherId: 2, line: fake(2), name: 'ครูวิชัย (ตัวอย่าง)', school: 'โรงเรียนบ้านตัวอย่าง' },
  { key: 'somsri', label: 'ครูสมศรี (ซื้อทั้งเล่ม)', hint: 'จ่ายเงินสมัครหนังสือคณิตศาสตร์ทั้งเล่มแล้ว', teacherId: 3, line: fake(3), name: 'ครูสมศรี (ตัวอย่าง)', school: 'โรงเรียนสาธิตตัวอย่าง' },
  { key: 'newbie', label: 'ครูใหม่ (รออนุมัติ)', hint: 'เพิ่งเข้าสู่ระบบครั้งแรก รอทีมงานอนุมัติ', teacherId: 4, line: fake(4), name: 'ครูใหม่ (ตัวอย่าง)', school: 'โรงเรียนวัดตัวอย่าง', waiting: true },
  { key: 'owner', label: 'เจ้าของ (ผู้ดูแล)', hint: 'เลือกว่าใครเปิดสไลด์ไหนได้ อนุมัติสมาชิก ยืนยันการโอน', teacherId: 1, line: DEMO_OWNER_LINE, name: 'เจ้าของครูสไลด์ (ตัวอย่าง)', school: 'KruSlide', admin: true },
];
/** Two more sample teachers (no login button) so the access matrix has rows. */
const EXTRA = [
  { teacherId: 5, line: fake(5), name: 'ครูมานี (ตัวอย่าง)', school: 'โรงเรียนอนุบาลตัวอย่าง' },
  { teacherId: 6, line: fake(6), name: 'ครูปิติ (ตัวอย่าง)', school: 'โรงเรียนมัธยมตัวอย่าง' },
];

/** Wipe the demo database and load the sample data again. One D1 batch (a transaction). */
export async function seedDemo(env: Env, now: number): Promise<void> {
  const db = env.DB;
  const day = 86400;
  const s: D1PreparedStatement[] = [];
  for (const t of ['book_request_answers', 'book_requests', 'unit_grants', 'payments', 'subscriptions', 'sessions', 'oauth_states', 'units', 'books', 'teachers', 'audit_log']) {
    s.push(db.prepare(`DELETE FROM ${t}`));
  }
  // teachers
  for (const p of [...PERSONAS, ...EXTRA]) {
    const waiting = 'waiting' in p && p.waiting;
    s.push(db.prepare(
      `INSERT INTO teachers (id, line_user_id, display_name, school, status, created_at, last_login_at, approved_at, approved_by)
       VALUES (?1, ?2, ?3, ?4, 'active', ?5, NULL, ?6, ?7)`,
    ).bind(p.teacherId, p.line, p.name, p.school, now - (waiting ? 3600 : 40 * day), waiting ? null : now - 39 * day, waiting ? null : 'demo'));
  }
  // books and units (the decks ship as static assets; keys and CSP hashes come from the generated catalog)
  for (const b of DEMO_BOOKS) {
    const slides = b.units.reduce((n, u) => n + u.slides, 0);
    s.push(db.prepare(
      `INSERT INTO books (id, title, subject, grade, slide_count, rate_baht_per_slide, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'published', ?7, ?7)`,
    ).bind(b.id, b.title, b.subject, b.grade, slides, b.rate, now - 60 * day));
    for (const u of b.units) {
      s.push(db.prepare(
        `INSERT INTO units (id, book_id, position, title, slide_count, r2_key, script_hashes, html_sha256, html_bytes, uploaded_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10, ?10)`,
      ).bind(u.id, b.id, u.position, u.title, u.slides, u.key, u.hashes.join(' '), u.sha256, u.bytes, now - 60 * day));
    }
  }
  const price = (bookId: number) => { const b = DEMO_BOOKS.find((x) => x.id === bookId)!; return b.units.reduce((n, u) => n + u.slides, 0) * b.rate; };
  // ครูสมศรี paid for the maths book (3 months, confirmed); ครูวิชัย says he paid for science (waiting for the owner)
  const start = now - 10 * day;
  s.push(db.prepare(`INSERT INTO subscriptions (id, teacher_id, book_id, period_start, period_end, monthly_price, status, created_at, updated_at) VALUES (1, 3, 1, ?1, ?2, ?3, 'active', ?1, ?1)`)
    .bind(start, addMonths(start, 3), price(1)));
  s.push(db.prepare(`INSERT INTO payments (id, subscription_id, teacher_id, provider, months, slide_count, rate_baht, monthly_price, amount_satang, ref, status, notified_at, confirmed_by, decided_at, created_at)
     VALUES (1, 1, 3, 'manual', 3, ?1, ?2, ?3, ?4, 'โอนแล้ว (ตัวอย่าง)', 'confirmed', ?5, 'teacher:1', ?5, ?5)`)
    .bind(price(1) / 3, 3, price(1), price(1) * 3 * 100, start));
  s.push(db.prepare(`INSERT INTO subscriptions (id, teacher_id, book_id, period_start, period_end, monthly_price, status, created_at, updated_at) VALUES (2, 2, 2, NULL, NULL, ?1, 'pending', ?2, ?2)`)
    .bind(price(2), now - 2 * day));
  s.push(db.prepare(`INSERT INTO payments (id, subscription_id, teacher_id, provider, months, slide_count, rate_baht, monthly_price, amount_satang, ref, status, notified_at, created_at)
     VALUES (2, 2, 2, 'manual', 1, ?1, 4, ?2, ?3, 'โอนจากแอปธนาคาร (ตัวอย่าง)', 'pending', ?4, ?4)`)
    .bind(price(2) / 4, price(2), price(2) * 100, now - day));
  // grants: ครูวิชัย has some units (one runs out soon); ครูมานี has the whole Thai book
  const grant = (id: number, teacher: number, unit: number, expires: number | null) =>
    db.prepare(`INSERT INTO unit_grants (id, teacher_id, unit_id, granted_by, expires_at, note, created_at, updated_at) VALUES (?1, ?2, ?3, 'admin:1', ?4, 'ตัวอย่าง', ?5, ?5)`)
      .bind(id, teacher, unit, expires, now - 5 * day);
  s.push(grant(1, 2, 4, null), grant(2, 2, 6, now + 12 * day), grant(3, 2, 7, addMonths(now, 3)), grant(4, 5, 7, null), grant(5, 5, 8, null));
  // one book request with a finished style quiz, for the owner's "คำขอทำหนังสือ" page
  const answers: Answers = Object.fromEntries(QUIZ.map((q, i) => [q.key, i === 6 ? 'both' : i % 3 === 2 ? 'b' : 'a']));
  s.push(db.prepare(`INSERT INTO book_requests (id, teacher_id, subject, grade, textbook, units, start_date, note, summary, status, created_at, updated_at, submitted_at)
     VALUES (1, 3, 'วิทยาศาสตร์', 'ม.2', 'สสวท. วิทยาศาสตร์ ม.2 เล่ม 1 (ตัวอย่าง)', 'หน่วยที่ 1–3', ?1, 'คำขอตัวอย่างในเว็บทดลอง', ?2, 'new', ?3, ?3, ?3)`)
    .bind(new Date((now + 45 * day) * 1000).toISOString().slice(0, 10), buildSummary(answers), now - 3 * 3600));
  for (const [q, c] of Object.entries(answers)) {
    s.push(db.prepare(`INSERT INTO book_request_answers (request_id, question, choice, answered_at) VALUES (1, ?1, ?2, ?3)`).bind(q, c, now - 3 * 3600));
  }
  s.push(db.prepare(`INSERT INTO audit_log (at, actor, action, target, detail) VALUES (?1, 'system', 'demo.seed', NULL, NULL)`).bind(now));
  await db.batch(s);
}

/** Load the sample data the first time the demo is used (an empty database after deploy). */
export async function ensureDemoSeeded(env: Env, now: number): Promise<void> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM books').first<{ n: number }>();
  if (!row?.n) await seedDemo(env, now);
}
