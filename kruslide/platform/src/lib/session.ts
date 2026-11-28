import type { Env, Teacher } from '../env';
import { hmac, hmacVerify, randomToken, sha256url } from './crypto';
import { parseCookies, setCookie, clearCookie } from './cookies';
import { SESSION_COOKIE, SESSION_TTL, sessionSecret } from './config';

/**
 * Sessions: the cookie holds "<random id>.<HMAC of the id>". D1 stores only SHA-256(id) with the teacher and expiry,
 * so the cookie must be both well-signed and present in the database. Logout deletes the row.
 */
export async function createSession(env: Env, teacherId: number, now: number): Promise<{ id: string; cookie: string }> {
  const id = randomToken(32);
  await env.DB.prepare('INSERT INTO sessions (id_hash, teacher_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)')
    .bind(await sha256url(id), teacherId, now, now + SESSION_TTL).run();
  const sig = await hmac(sessionSecret(env), 'session:' + id);
  return { id, cookie: setCookie(SESSION_COOKIE, `${id}.${sig}`, { maxAge: SESSION_TTL }) };
}

export async function readSession(env: Env, req: Request, now: number): Promise<{ id: string; teacher: Teacher } | null> {
  const raw = parseCookies(req.headers.get('Cookie'))[SESSION_COOKIE];
  if (!raw) return null;
  const m = /^([A-Za-z0-9_-]{43})\.([A-Za-z0-9_-]{43})$/.exec(raw);
  if (!m) return null;
  if (!(await hmacVerify(sessionSecret(env), 'session:' + m[1], m[2]))) return null;
  const teacher = await env.DB.prepare(
    `SELECT t.* FROM sessions s JOIN teachers t ON t.id = s.teacher_id WHERE s.id_hash = ?1 AND s.expires_at > ?2`,
  ).bind(await sha256url(m[1]), now).first<Teacher>();
  return teacher ? { id: m[1], teacher } : null;
}

export async function destroySession(env: Env, id: string | null): Promise<string> {
  if (id) await env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?1').bind(await sha256url(id)).run();
  return clearCookie(SESSION_COOKIE);
}

export async function destroyAllSessions(env: Env, teacherId: number): Promise<void> {
  await env.DB.prepare('DELETE FROM sessions WHERE teacher_id = ?1').bind(teacherId).run();
}

/** The CSRF token is bound to the session: HMAC(secret, "csrf:" + session id). Nothing extra to store. */
export async function csrfToken(env: Env, sessionId: string | null): Promise<string> {
  if (!sessionId) return '';
  return hmac(sessionSecret(env), 'csrf:' + sessionId);
}
