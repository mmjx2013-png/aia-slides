import type { Env } from '../env';
import { b64url, b64urlDecode, hmacVerify, randomToken, sha256 } from './crypto';
import { HttpError } from './http';
import { isProduction } from './config';

/**
 * LINE Login v2.1: OAuth 2.0 authorization code flow + OpenID Connect, with state, nonce and PKCE (S256).
 * Docs: https://developers.line.biz/en/docs/line-login/integrate-line-login/
 */
export const LINE_ISSUER = 'https://access.line.me';
const AUTH_ORIGIN = 'https://access.line.me';
const API_ORIGIN = 'https://api.line.me';

export function lineEndpoints(env: Env) {
  // The overrides exist only so the local mock server can stand in for LINE. Production always talks to LINE.
  const dev = !isProduction(env);
  const auth = dev && env.LINE_AUTH_ORIGIN ? env.LINE_AUTH_ORIGIN : AUTH_ORIGIN;
  const api = dev && env.LINE_API_ORIGIN ? env.LINE_API_ORIGIN : API_ORIGIN;
  return {
    authorize: `${auth}/oauth2/v2.1/authorize`,
    token: `${api}/oauth2/v2.1/token`,
    jwks: `${api}/oauth2/v2.1/certs`,
  };
}

export function lineConfigured(env: Env): boolean {
  return /^\d{6,20}$/.test(env.LINE_CHANNEL_ID || '') && (env.LINE_CHANNEL_SECRET || '').length >= 16;
}

export async function pkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomToken(48); // 64 characters, within RFC 7636's 43..128
  return { verifier, challenge: b64url(await sha256(verifier)) };
}

export function authorizeUrl(env: Env, o: { redirectUri: string; state: string; nonce: string; challenge: string }): string {
  const u = new URL(lineEndpoints(env).authorize);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', env.LINE_CHANNEL_ID);
  u.searchParams.set('redirect_uri', o.redirectUri);
  u.searchParams.set('state', o.state);
  u.searchParams.set('scope', 'openid profile');
  u.searchParams.set('nonce', o.nonce);
  u.searchParams.set('code_challenge', o.challenge);
  u.searchParams.set('code_challenge_method', 'S256');
  if (env.LINE_BOT_PROMPT === 'normal' || env.LINE_BOT_PROMPT === 'aggressive') u.searchParams.set('bot_prompt', env.LINE_BOT_PROMPT);
  return u.toString();
}

export async function exchangeCode(env: Env, o: { code: string; redirectUri: string; verifier: string }): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: o.code,
    redirect_uri: o.redirectUri,
    client_id: env.LINE_CHANNEL_ID,
    client_secret: env.LINE_CHANNEL_SECRET,
    code_verifier: o.verifier,
  });
  let res: Response;
  try {
    res = await fetch(lineEndpoints(env).token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new HttpError(502, 'ติดต่อ LINE ไม่ได้ กรุณาลองใหม่');
  }
  if (!res.ok) throw new HttpError(502, 'LINE ไม่ยืนยันการเข้าสู่ระบบ กรุณาลองใหม่', `token endpoint ${res.status}`);
  const data = (await res.json().catch(() => null)) as { id_token?: unknown } | null;
  if (!data || typeof data.id_token !== 'string') throw new HttpError(502, 'LINE ส่งข้อมูลไม่ครบ', 'no id_token');
  return data.id_token;
}

interface Jwk { kid?: string; kty?: string; crv?: string; x?: string; y?: string; alg?: string; use?: string; }
let jwksCache: { at: number; url: string; keys: Jwk[] } | null = null;
export function resetJwksCache(): void { jwksCache = null; }

async function jwks(env: Env, now: number, force = false): Promise<Jwk[]> {
  const url = lineEndpoints(env).jwks;
  if (!force && jwksCache && jwksCache.url === url && now - jwksCache.at < 3600) return jwksCache.keys;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new HttpError(502, 'ตรวจสอบการเข้าสู่ระบบกับ LINE ไม่ได้', `jwks ${res.status}`);
  const data = (await res.json().catch(() => null)) as { keys?: Jwk[] } | null;
  const keys = Array.isArray(data?.keys) ? data!.keys : [];
  jwksCache = { at: now, url, keys };
  return keys;
}

export interface LineIdentity { sub: string; name: string; }

/**
 * Verify a LINE ID token: signature (HS256 with the channel secret, or ES256 with LINE's JWKS), issuer, audience,
 * expiry, issued-at and nonce. Anything else (alg "none", RS256, unknown kid, wrong claims) is refused.
 */
export async function verifyIdToken(env: Env, token: string, o: { nonce: string; now: number }): Promise<LineIdentity> {
  const fail = (why: string): never => { throw new HttpError(401, 'การเข้าสู่ระบบไม่ผ่านการตรวจสอบ กรุณาลองใหม่', why); };
  const parts = token.split('.');
  if (parts.length !== 3 || token.length > 8192) fail('malformed');
  let header: { alg?: string; kid?: string }, payload: Record<string, unknown>;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[0])));
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
  } catch { return fail('undecodable'); }
  const signed = `${parts[0]}.${parts[1]}`;
  let sig: Uint8Array;
  try { sig = b64urlDecode(parts[2]); } catch { return fail('bad signature encoding'); }

  if (header.alg === 'HS256') {
    if (!(await hmacVerify(env.LINE_CHANNEL_SECRET, signed, parts[2]))) fail('bad HS256 signature');
  } else if (header.alg === 'ES256') {
    if (typeof header.kid !== 'string') fail('no kid');
    let jwk = (await jwks(env, o.now)).find((k) => k.kid === header.kid);
    if (!jwk) jwk = (await jwks(env, o.now, true)).find((k) => k.kid === header.kid); // key rotation
    if (!jwk || jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !jwk.x || !jwk.y) return fail('unknown kid');
    const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, ext: true },
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const ok = sig.length === 64 && await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sig, new TextEncoder().encode(signed));
    if (!ok) fail('bad ES256 signature');
  } else {
    fail(`alg ${String(header.alg)} not allowed`);
  }

  const skew = 120;
  if (payload.iss !== LINE_ISSUER) fail('iss');
  const aud = payload.aud;
  if (!(aud === env.LINE_CHANNEL_ID || (Array.isArray(aud) && aud.length === 1 && aud[0] === env.LINE_CHANNEL_ID))) fail('aud');
  if (typeof payload.exp !== 'number' || payload.exp + skew < o.now) fail('expired');
  if (typeof payload.iat !== 'number' || payload.iat - skew > o.now) fail('iat in the future');
  if (typeof payload.nonce !== 'string' || payload.nonce !== o.nonce) fail('nonce');
  if (typeof payload.sub !== 'string' || !/^U[0-9a-f]{32}$/.test(payload.sub)) fail('sub');
  const name = typeof payload.name === 'string' ? payload.name : '';
  return { sub: payload.sub as string, name };
}
