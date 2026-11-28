import type { Ctx } from '../env';
import { authorizeUrl, exchangeCode, lineConfigured, pkce, verifyIdToken } from '../lib/line';
import { randomToken, sha256url, safeEqual } from '../lib/crypto';
import { parseCookies, setCookie, clearCookie } from '../lib/cookies';
import { HttpError, redirect, safeNext } from '../lib/http';
import { rateLimit } from '../lib/ratelimit';
import { LIMITS, OAUTH_COOKIE, OAUTH_TTL, adminIds, approvalRequired } from '../lib/config';
import { createSession, destroySession } from '../lib/session';
import { upsertTeacherFromLine } from '../db';
import { audit } from '../lib/audit';
import { checkCsrf } from '../lib/csrf';
import { readForm, cleanText } from '../lib/validate';

export function callbackUrl(ctx: Ctx): string {
  return `${ctx.origin}/app/auth/callback`;
}

/** GET /app/login → store state/nonce/PKCE (bound to this browser by a cookie) and send the teacher to LINE. */
export async function login(ctx: Ctx): Promise<Response> {
  await rateLimit(ctx.env, `login:${ctx.ip}`, LIMITS.login, ctx.now);
  if (!lineConfigured(ctx.env)) throw new HttpError(503, 'ยังไม่ได้ตั้งค่า LINE Login (LINE_CHANNEL_ID / LINE_CHANNEL_SECRET)');
  const next = safeNext(ctx.url.searchParams.get('next'));
  if (ctx.teacher) return redirect(next, 302);
  const handle = randomToken(32);
  const state = randomToken(24);
  const nonce = randomToken(24);
  const { verifier, challenge } = await pkce();
  await ctx.env.DB.prepare(
    `INSERT INTO oauth_states (id_hash, state, nonce, code_verifier, return_to, created_at, expires_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  ).bind(await sha256url(handle), state, nonce, verifier, next, ctx.now, ctx.now + OAUTH_TTL).run();
  return redirect(authorizeUrl(ctx.env, { redirectUri: callbackUrl(ctx), state, nonce, challenge }), 302, {
    'Set-Cookie': setCookie(OAUTH_COOKIE, handle, { maxAge: OAUTH_TTL }),
  });
}

/** GET /app/auth/callback?code&state → check state, swap the code (with the PKCE verifier), verify the ID token. */
export async function callback(ctx: Ctx): Promise<Response> {
  await rateLimit(ctx.env, `login:${ctx.ip}`, LIMITS.login, ctx.now);
  const q = ctx.url.searchParams;
  if (q.get('error')) {
    // The teacher pressed "cancel" on LINE, or LINE refused. Nothing is stored.
    return redirect('/app/?m=cancelled', 302, { 'Set-Cookie': clearCookie(OAUTH_COOKIE) });
  }
  const code = q.get('code') || '';
  const state = q.get('state') || '';
  const handle = parseCookies(ctx.req.headers.get('Cookie'))[OAUTH_COOKIE] || '';
  if (!code || code.length > 512 || !state || !/^[A-Za-z0-9_-]{43}$/.test(handle)) {
    throw new HttpError(400, 'ลิงก์เข้าสู่ระบบไม่ถูกต้องหรือหมดอายุ กรุณากดเข้าสู่ระบบใหม่', 'missing code/state/cookie');
  }
  // One-time use: the row is deleted as it is read, so a replayed callback finds nothing.
  const row = await ctx.env.DB.prepare(`DELETE FROM oauth_states WHERE id_hash = ?1 RETURNING *`)
    .bind(await sha256url(handle)).first<{ state: string; nonce: string; code_verifier: string; return_to: string; expires_at: number }>();
  if (!row || row.expires_at <= ctx.now || !safeEqual(row.state, state)) {
    throw new HttpError(400, 'ลิงก์เข้าสู่ระบบไม่ถูกต้องหรือหมดอายุ กรุณากดเข้าสู่ระบบใหม่', 'state mismatch');
  }
  const idToken = await exchangeCode(ctx.env, { code, redirectUri: callbackUrl(ctx), verifier: row.code_verifier });
  const who = await verifyIdToken(ctx.env, idToken, { nonce: row.nonce, now: ctx.now });
  let name: string;
  try { name = cleanText(who.name, { max: 80, min: 1, field: 'ชื่อ' }); } catch { name = 'คุณครู'; }
  // A first login waits for the owner's approval (unless approval is off, or it is an admin's LINE account).
  const approve = !approvalRequired(ctx.env) || adminIds(ctx.env).has(who.sub);
  const { teacher, created } = await upsertTeacherFromLine(ctx.env, who.sub, name, ctx.now, approve);
  if (teacher.status === 'blocked') {
    await audit(ctx.env, ctx.now, `teacher:${teacher.id}`, 'login.blocked');
    throw new HttpError(403, 'บัญชีนี้ถูกระงับ กรุณาติดต่อทีมงานทาง LINE');
  }
  if (ctx.sessionId) await destroySession(ctx.env, ctx.sessionId); // never reuse a session id across a login
  const session = await createSession(ctx.env, teacher.id, ctx.now);
  await audit(ctx.env, ctx.now, `teacher:${teacher.id}`, created ? (teacher.approved_at === null ? 'signup.waiting' : 'signup') : 'login');
  const next = !teacher.school ? `/app/profile?next=${encodeURIComponent(row.return_to)}&m=${created ? 'welcome' : 'school'}` : row.return_to;
  const h = new Headers();
  h.append('Set-Cookie', session.cookie);
  h.append('Set-Cookie', clearCookie(OAUTH_COOKIE));
  return redirect(next, 302, h);
}

/** POST /app/logout */
export async function logout(ctx: Ctx): Promise<Response> {
  const form = await readForm(ctx.req);
  checkCsrf(ctx, form);
  if (ctx.teacher) await audit(ctx.env, ctx.now, `teacher:${ctx.teacher.id}`, 'logout');
  return redirect('/app/?m=loggedout', 303, { 'Set-Cookie': await destroySession(ctx.env, ctx.sessionId) });
}
