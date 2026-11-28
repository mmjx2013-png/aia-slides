import type { Ctx } from '../env';
import { html } from '../lib/html';
import { HttpError, htmlResponse, redirect, safeNext, textResponse } from '../lib/http';
import { page, flash, csrfField, icon, initial } from '../views/layout';
import { demoOn, LIMITS, sessionSecret } from '../lib/config';
import { checkCsrf, checkSameOrigin } from '../lib/csrf';
import { readForm, str } from '../lib/validate';
import { rateLimit } from '../lib/ratelimit';
import { hmac, hmacVerify, safeEqual, sha256hex } from '../lib/crypto';
import { parseCookies, setCookie, clearCookie } from '../lib/cookies';
import { createSession, destroySession } from '../lib/session';
import { audit } from '../lib/audit';
import { PERSONAS, ensureDemoSeeded, seedDemo } from './seed';

/**
 * The clickable demo (DEMO_MODE = "on"): a passcode gate in front of every page, persona buttons instead of LINE
 * login, sample data, and a reset. With DEMO_MODE off none of this is reachable (404) and production is unchanged.
 */
export const DEMO_COOKIE = '__Host-ks_demo';
const DEMO_TTL = 7 * 24 * 3600;

function requireDemo(ctx: Ctx): void {
  if (!demoOn(ctx.env)) throw new HttpError(404, 'ไม่พบหน้านี้');
}

/** Typed passcodes are compared without case, spaces or dashes ("ABCD-efgh" = "abcdefgh"). */
export function normPasscode(v: string): string {
  return v.normalize('NFKC').toLowerCase().replace(/[\s-]+/g, '');
}

function passcode(ctx: Ctx): string {
  const p = normPasscode(ctx.env.DEMO_PASSCODE || '');
  if (p.length < 8) throw new HttpError(500, 'เว็บทดลองยังไม่ได้ตั้งรหัสผ่าน (DEMO_PASSCODE)');
  return p;
}

/** The gate cookie: "<expiry>.<HMAC(expiry + hash of the passcode)>", so changing the passcode locks everyone out. */
async function gateValue(ctx: Ctx, exp: number): Promise<string> {
  return hmac(sessionSecret(ctx.env), `demo:${exp}:${await sha256hex(passcode(ctx))}`);
}

export async function hasGateCookie(ctx: Ctx): Promise<boolean> {
  const raw = parseCookies(ctx.req.headers.get('Cookie'))[DEMO_COOKIE];
  const m = raw ? /^(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(raw) : null;
  if (!m || Number(m[1]) <= ctx.now) return false;
  return hmacVerify(sessionSecret(ctx.env), `demo:${m[1]}:${await sha256hex(passcode(ctx))}`, m[2]);
}

function passcodePage(ctx: Ctx, next: string, error = ''): string {
  return page(ctx, {
    title: 'เว็บทดลอง',
    body: html`<section class="card gate">
  <svg class="lockart" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" fill="#E6EEFF"/>
    <rect x="34" y="52" width="52" height="42" rx="10" fill="#1C2A55"/><path d="M44 52V42a16 16 0 0 1 32 0v10" fill="none" stroke="#1C2A55" stroke-width="8" stroke-linecap="round"/>
    <circle cx="60" cy="70" r="6" fill="#FFC83D"/><rect x="57" y="72" width="6" height="12" rx="3" fill="#FFC83D"/></svg>
  <span class="badge info">เว็บทดลอง · ข้อมูลตัวอย่าง</span>
  <h1>ใส่รหัสเพื่อเข้าเว็บทดลอง</h1>
  <p class="muted">เว็บนี้เป็นตัวอย่างของระบบสมาชิกครูสไลด์ ข้อมูลทั้งหมดเป็นข้อมูลสมมติ ไม่มีการเข้าสู่ระบบด้วย LINE และไม่มีการโอนเงินจริง</p>
  ${error ? html`<div class="flash bad" role="alert">${error}</div>` : ''}
  <form method="post" action="/app/demo/unlock" class="gateform">
    <input type="hidden" name="next" value="${next}">
    <label class="sr" for="passcode">รหัสเว็บทดลอง</label>
    <input id="passcode" name="passcode" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" required maxlength="64" placeholder="รหัส 12 ตัว" autofocus>
    <button class="btn big" type="submit">${icon('key')}เข้าเว็บทดลอง</button>
  </form>
</section>`,
  }).value;
}

/**
 * Runs before routing when DEMO_MODE is on. Returns the passcode page (or a refusal) unless the browser holds a valid
 * gate cookie. Our stylesheet, fonts and icons stay reachable so the gate page itself can render.
 */
export async function demoGate(ctx: Ctx): Promise<Response | null> {
  const p = ctx.url.pathname;
  if (p.startsWith('/app/static/')) return null;
  passcode(ctx); // fail closed (500) when the passcode is not set: nobody gets in
  if (p === '/app/demo/unlock' && ctx.req.method === 'POST') return null;
  if (await hasGateCookie(ctx)) return null;
  if (ctx.req.method === 'GET' || ctx.req.method === 'HEAD') {
    return htmlResponse(passcodePage(ctx, safeNext(p + ctx.url.search)));
  }
  return htmlResponse(passcodePage(ctx, '/app/', 'กรุณาใส่รหัสเว็บทดลองก่อน'), 401);
}

/** POST /app/demo/unlock (passcode, next): constant-time check, rate-limited per IP; sets the gate cookie. */
export async function unlock(ctx: Ctx): Promise<Response> {
  requireDemo(ctx);
  checkSameOrigin(ctx);
  await rateLimit(ctx.env, `demo-pass:${ctx.ip}`, LIMITS.demoPasscode, ctx.now);
  const form = await readForm(ctx.req, 4096);
  const next = safeNext(str(form, 'next'));
  // Compare hashes of equal length, so neither the length nor the content leaks through timing.
  const ok = safeEqual(await sha256hex(normPasscode(str(form, 'passcode'))), await sha256hex(passcode(ctx)));
  if (!ok) {
    await audit(ctx.env, ctx.now, 'system', 'demo.passcode.wrong'); // no IP in the log (PDPA)
    return htmlResponse(passcodePage(ctx, next, 'รหัสไม่ถูกต้อง ลองใหม่อีกครั้ง'), 401);
  }
  const exp = ctx.now + DEMO_TTL;
  return redirect(next === '/app/' || next.startsWith('/app/login') ? '/app/login' : next, 303,
    { 'Set-Cookie': setCookie(DEMO_COOKIE, `${exp}.${await gateValue(ctx, exp)}`, { maxAge: DEMO_TTL }) });
}

/** GET /app/login in the demo: persona buttons instead of LINE. */
export async function personaPage(ctx: Ctx): Promise<Response> {
  requireDemo(ctx);
  await ensureDemoSeeded(ctx.env, ctx.now);
  const next = safeNext(ctx.url.searchParams.get('next'), '');
  return htmlResponse(page(ctx, {
    title: 'เลือกผู้ใช้ทดลอง',
    body: html`${flash(ctx)}<div class="hello"><div><span class="kicker">เว็บทดลอง · ไม่ใช้ LINE</span><h1>ลองใช้ในฐานะใคร?</h1>
  <p class="muted">กดปุ่มเพื่อเข้าสู่ระบบเป็นผู้ใช้ตัวอย่าง สลับผู้ใช้ได้ตลอดจากแถบด้านบน</p></div></div>
<div class="personas">${PERSONAS.map((p) => html`<form method="post" action="/app/demo/login" class="persona${p.admin ? ' admin' : ''}">${ctx.csrf ? csrfField(ctx) : ''}
  <input type="hidden" name="persona" value="${p.key}"><input type="hidden" name="next" value="${next}">
  <button type="submit"><span class="ava">${initial(p.name)}</span><span class="pt"><b>${p.label}</b><small>${p.hint}</small></span>${icon('right')}</button></form>`)}</div>`,
  }));
}

/** POST /app/demo/login (persona): a session for a sample teacher. No LINE, no outbound request. */
export async function personaLogin(ctx: Ctx): Promise<Response> {
  requireDemo(ctx);
  const form = await readForm(ctx.req, 4096);
  if (ctx.sessionId) checkCsrf(ctx, form); else checkSameOrigin(ctx);
  await rateLimit(ctx.env, `demo-login:${ctx.ip}`, LIMITS.demoLogin, ctx.now);
  const p = PERSONAS.find((x) => x.key === str(form, 'persona'));
  if (!p) throw new HttpError(400, 'ไม่รู้จักผู้ใช้ทดลองนี้');
  await ensureDemoSeeded(ctx.env, ctx.now);
  const t = await ctx.env.DB.prepare('SELECT id, status FROM teachers WHERE line_user_id = ?1').bind(p.line).first<{ id: number; status: string }>();
  if (!t) throw new HttpError(409, 'ข้อมูลทดลองไม่ครบ กรุณากดรีเซ็ตข้อมูลทดลอง');
  if (t.status !== 'active') throw new HttpError(403, 'ผู้ใช้ทดลองนี้ถูกระงับอยู่ (เจ้าของกด “เปิดใช้งาน” ได้ หรือรีเซ็ตข้อมูลทดลอง)');
  await ctx.env.DB.prepare('UPDATE teachers SET last_login_at = ?1 WHERE id = ?2').bind(ctx.now, t.id).run();
  if (ctx.sessionId) await destroySession(ctx.env, ctx.sessionId);
  const session = await createSession(ctx.env, t.id, ctx.now);
  await audit(ctx.env, ctx.now, `teacher:${t.id}`, 'demo.login', p.key);
  const next = safeNext(str(form, 'next'), p.admin ? '/app/admin/' : '/app/');
  return redirect(next, 303, { 'Set-Cookie': session.cookie });
}

/** POST /app/admin/demo/reset: back to the sample data (everyone is logged out). */
export async function reset(ctx: Ctx): Promise<Response> {
  requireDemo(ctx);
  if (!ctx.isAdmin) throw new HttpError(403, 'หน้านี้สำหรับผู้ดูแลเท่านั้น');
  const form = await readForm(ctx.req, 4096);
  checkCsrf(ctx, form);
  await rateLimit(ctx.env, `admin:${ctx.teacher!.id}`, LIMITS.admin, ctx.now);
  await seedDemo(ctx.env, ctx.now);
  await audit(ctx.env, ctx.now, 'system', 'demo.reset');
  return redirect('/app/login?m=reset', 303, { 'Set-Cookie': clearCookie('__Host-ks_session') });
}

/** GET /robots.txt (the demo Worker serves its whole workers.dev host). */
export function robots(): Response {
  return textResponse('User-agent: *\nDisallow: /\n', 200, { 'Cache-Control': 'public, max-age=86400' });
}
