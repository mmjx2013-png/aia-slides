import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../src/index';
import { createSession, csrfToken } from '../src/lib/session';
import { inlineScriptHashes } from '../src/lib/deckmeta';
import { b64url } from '../src/lib/crypto';

export { env };
export const ORIGIN = 'https://kruslide.test';
export const ADMIN_LINE = 'U' + 'a'.repeat(32);
export const nowSec = () => Math.floor(Date.now() / 1000);

let lineSeq = 0;
export function lineId(): string {
  lineSeq++;
  return 'U' + lineSeq.toString(16).padStart(32, 'c');
}

export interface Who { id: number; cookie: string; csrf: string; }

export async function call(path: string, init: RequestInit & { cookie?: string; ip?: string } = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set('Cookie', init.cookie);
  if (!headers.has('CF-Connecting-IP')) headers.set('CF-Connecting-IP', init.ip ?? '203.0.113.7');
  const { cookie: _c, ip: _i, ...rest } = init;
  const req = new Request(ORIGIN + path, { ...rest, headers, redirect: 'manual' });
  const ctx = createExecutionContext();
  const res = await worker.fetch(req, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

export async function makeTeacher(o: { line?: string; name?: string; school?: string; status?: 'active' | 'blocked' } = {}): Promise<number> {
  const row = await env.DB.prepare(
    `INSERT INTO teachers (line_user_id, display_name, school, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5) RETURNING id`,
  ).bind(o.line ?? lineId(), o.name ?? 'ครูทดสอบ', o.school ?? 'โรงเรียนทดสอบวิทยา', o.status ?? 'active', nowSec()).first<{ id: number }>();
  return row!.id;
}

export async function loginAs(teacherId: number): Promise<Who> {
  const s = await createSession(env, teacherId, nowSec());
  return { id: teacherId, cookie: s.cookie.split(';')[0], csrf: await csrfToken(env, s.id) };
}

export async function newMember(o: Parameters<typeof makeTeacher>[0] = {}): Promise<Who> {
  return loginAs(await makeTeacher(o));
}

export async function newAdmin(): Promise<Who> {
  return loginAs(await makeTeacher({ line: ADMIN_LINE, name: 'แอดมิน', school: 'KruSlide' }));
}

export async function post(path: string, fields: Record<string, string>, who: Who | null, o: { origin?: string | null; csrf?: string | null; headers?: Record<string, string>; ip?: string } = {}): Promise<Response> {
  const body = new URLSearchParams(fields);
  const csrf = o.csrf === undefined ? who?.csrf : o.csrf;
  if (csrf !== null && csrf !== undefined) body.set('_csrf', csrf);
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded', ...o.headers };
  const origin = o.origin === undefined ? ORIGIN : o.origin;
  if (origin) headers.Origin = origin;
  return call(path, { method: 'POST', body, headers, cookie: who?.cookie, ip: o.ip });
}

export async function makeBook(o: { rate?: number; status?: string; title?: string } = {}): Promise<number> {
  const t = nowSec();
  const row = await env.DB.prepare(
    `INSERT INTO books (title, subject, grade, slide_count, rate_baht_per_slide, status, created_at, updated_at)
     VALUES (?1, 'คณิตศาสตร์', 'ม.1', 0, ?2, ?3, ?4, ?4) RETURNING id`,
  ).bind(o.title ?? 'คณิตศาสตร์ ม.1 เล่ม 1', o.rate ?? 3, o.status ?? 'published', t).first<{ id: number }>();
  return row!.id;
}

export const SAMPLE_DECK = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Sample deck</title><style>@font-face{font-family:Inter;src:url(fonts/Inter-Regular.woff2)}</style></head>
<body><main id="stage">
<section class="slide" data-steps="0"><h1>Slide one SECRET-CONTENT</h1></section>
<section class="slide" data-steps="1"><h1>Slide two</h1></section>
</main>
<script>document.documentElement.dataset.booted = '1';</script>
</body></html>`;

/** A unit with its deck in the (local) private bucket, like an admin upload would leave it. */
export async function makeUnit(bookId: number, o: { slides?: number; html?: string | null; position?: number } = {}): Promise<number> {
  const t = nowSec();
  const htmlText = o.html === undefined ? SAMPLE_DECK : o.html;
  const row = await env.DB.prepare(
    `INSERT INTO units (book_id, position, title, slide_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?5) RETURNING id`,
  ).bind(bookId, o.position ?? 4, 'หน่วยที่ 4 สถิติ (1)', o.slides ?? 67, t).first<{ id: number }>();
  const id = row!.id;
  if (htmlText !== null) {
    const key = `units/${id}/index.html`;
    await env.DECKS.put(key, htmlText);
    await env.DB.prepare('UPDATE units SET r2_key = ?1, script_hashes = ?2 WHERE id = ?3')
      .bind(key, (await inlineScriptHashes(htmlText)).join(' '), id).run();
  }
  await env.DB.prepare('UPDATE books SET slide_count = (SELECT SUM(slide_count) FROM units WHERE book_id = ?1) WHERE id = ?1').bind(bookId).run();
  return id;
}

export async function makeSub(teacherId: number, bookId: number, o: { status?: string; start?: number; end?: number | null; price?: number } = {}): Promise<number> {
  const t = nowSec();
  const row = await env.DB.prepare(
    `INSERT INTO subscriptions (teacher_id, book_id, period_start, period_end, monthly_price, status, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7) RETURNING id`,
  ).bind(teacherId, bookId, o.status === 'pending' ? null : (o.start ?? t - 86400), o.status === 'pending' ? null : (o.end === undefined ? t + 30 * 86400 : o.end),
    o.price ?? 201, o.status ?? 'active', t).first<{ id: number }>();
  return row!.id;
}

// ---------- a fake LINE (token endpoint + JWKS) for login tests ----------
export interface FakeLine {
  keyPair: CryptoKeyPair;
  kid: string;
  sub: string;
  name: string;
  alg: 'ES256' | 'HS256';
  /** Change the ID token before it is signed (to test bad claims). */
  tamper?: (claims: Record<string, unknown>, header: Record<string, unknown>) => void;
  tokenRequests: URLSearchParams[];
  codeChallenge?: string;
  nonce?: string;
}

const enc = new TextEncoder();
function part(o: unknown) { return b64url(enc.encode(JSON.stringify(o))); }

export async function signJwt(header: Record<string, unknown>, claims: Record<string, unknown>, key: CryptoKey | string): Promise<string> {
  const data = `${part(header)}.${part(claims)}`;
  let sig: ArrayBuffer;
  if (typeof key === 'string') {
    const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    sig = await crypto.subtle.sign('HMAC', k, enc.encode(data));
  } else {
    sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(data));
  }
  return `${data}.${b64url(sig)}`;
}

export async function newFakeLine(o: Partial<FakeLine> = {}): Promise<FakeLine> {
  const keyPair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  return { keyPair, kid: 'test-kid-1', sub: 'U' + 'b'.repeat(32), name: 'ครูสมใจ', alg: 'ES256', tokenRequests: [], ...o };
}

export async function idTokenFor(line: FakeLine, nonce: string): Promise<string> {
  const t = nowSec();
  const claims: Record<string, unknown> = { iss: 'https://access.line.me', sub: line.sub, aud: env.LINE_CHANNEL_ID, exp: t + 3600, iat: t, nonce, amr: ['linesso'], name: line.name };
  const header: Record<string, unknown> = { alg: line.alg, typ: 'JWT', ...(line.alg === 'ES256' ? { kid: line.kid } : {}) };
  line.tamper?.(claims, header);
  return signJwt(header, claims, line.alg === 'ES256' ? line.keyPair.privateKey : env.LINE_CHANNEL_SECRET);
}

/** Stand-in for fetch(): answers LINE's token and certs endpoints like LINE would. */
export function lineFetch(line: FakeLine): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input as RequestInfo, init);
    const url = new URL(req.url);
    if (url.href === 'https://api.line.me/oauth2/v2.1/certs') {
      const jwk = await crypto.subtle.exportKey('jwk', line.keyPair.publicKey) as JsonWebKey;
      return Response.json({ keys: [{ kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, kid: line.kid, alg: 'ES256', use: 'sig' }] });
    }
    if (url.href === 'https://api.line.me/oauth2/v2.1/token' && req.method === 'POST') {
      const fd = await req.formData();
      const form = new URLSearchParams();
      for (const [k, v] of fd) if (typeof v === 'string') form.set(k, v);
      line.tokenRequests.push(form);
      const verifier = form.get('code_verifier') || '';
      const challenge = b64url(await crypto.subtle.digest('SHA-256', enc.encode(verifier)));
      const ok = form.get('grant_type') === 'authorization_code' && form.get('code') === 'good-code'
        && form.get('client_id') === env.LINE_CHANNEL_ID && form.get('client_secret') === env.LINE_CHANNEL_SECRET
        && form.get('redirect_uri') === `${ORIGIN}/app/auth/callback` && challenge === line.codeChallenge;
      if (!ok) return Response.json({ error: 'invalid_grant' }, { status: 400 });
      return Response.json({ access_token: 'at', token_type: 'Bearer', expires_in: 2592000, scope: 'openid profile', id_token: await idTokenFor(line, line.nonce!) });
    }
    return new Response('unexpected fetch ' + url.href, { status: 599 });
  }) as typeof fetch;
}

export function setCookies(res: Response): string[] {
  return res.headers.getSetCookie();
}

export function cookieValue(res: Response, name: string): string | null {
  for (const c of setCookies(res)) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    if (pair.slice(0, i) === name) return pair.slice(i + 1);
  }
  return null;
}
