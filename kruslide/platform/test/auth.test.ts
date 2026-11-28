import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { call, cookieValue, env, newFakeLine, lineFetch, idTokenFor, signJwt, nowSec, post, newMember, type FakeLine, ORIGIN } from './helpers';
import { resetJwksCache, verifyIdToken } from '../src/lib/line';

async function startLogin(next?: string) {
  const res = await call('/app/login' + (next ? `?next=${encodeURIComponent(next)}` : ''));
  const loc = new URL(res.headers.get('Location')!);
  return { res, loc, handle: cookieValue(res, '__Host-ks_oauth')! };
}

describe('LINE login flow (mocked token endpoint + JWKS)', () => {
  let line: FakeLine;
  beforeEach(async () => {
    resetJwksCache();
    line = await newFakeLine();
    vi.spyOn(globalThis, 'fetch').mockImplementation(lineFetch(line));
  });
  afterEach(() => vi.restoreAllMocks());

  it('GET /app/login redirects to LINE with state, nonce and PKCE S256, and binds the attempt to a cookie', async () => {
    const { res, loc, handle } = await startLogin();
    expect(res.status).toBe(302);
    expect(loc.origin + loc.pathname).toBe('https://access.line.me/oauth2/v2.1/authorize');
    const q = loc.searchParams;
    expect(q.get('response_type')).toBe('code');
    expect(q.get('client_id')).toBe(env.LINE_CHANNEL_ID);
    expect(q.get('redirect_uri')).toBe(`${ORIGIN}/app/auth/callback`);
    expect(q.get('scope')).toBe('openid profile');
    expect(q.get('state')).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(q.get('nonce')).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(q.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(q.get('code_challenge_method')).toBe('S256');
    expect(handle).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const set = res.headers.getSetCookie()[0];
    expect(set).toContain('HttpOnly');
    expect(set).toContain('Secure');
    expect(set).toContain('SameSite=Lax');
    // the verifier never leaves the server
    const row = await env.DB.prepare('SELECT code_verifier FROM oauth_states').first<{ code_verifier: string }>();
    expect(loc.href).not.toContain(row!.code_verifier);
  });

  it('callback swaps the code with the PKCE verifier, verifies the ES256 ID token, creates the teacher and a session', async () => {
    const { loc, handle } = await startLogin('/app/books/1');
    line.codeChallenge = loc.searchParams.get('code_challenge')!;
    line.nonce = loc.searchParams.get('nonce')!;
    const cb = await call(`/app/auth/callback?code=good-code&state=${loc.searchParams.get('state')}`, { cookie: `__Host-ks_oauth=${handle}` });
    expect(cb.status).toBe(302);
    // first login: no school yet, so the teacher is asked for it, then sent on to where they were going
    expect(cb.headers.get('Location')).toBe('/app/profile?next=%2Fapp%2Fbooks%2F1&m=welcome');
    const session = cookieValue(cb, '__Host-ks_session');
    expect(session).toMatch(/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/);
    expect(cookieValue(cb, '__Host-ks_oauth')).toBe('');
    const sc = cb.headers.getSetCookie().find((c) => c.startsWith('__Host-ks_session='))!;
    expect(sc).toMatch(/HttpOnly/);
    expect(sc).toMatch(/Secure/);
    expect(sc).toMatch(/SameSite=Lax/);
    expect(sc).toMatch(/Path=\//);
    expect(line.tokenRequests).toHaveLength(1);

    const teacher = await env.DB.prepare('SELECT * FROM teachers WHERE line_user_id = ?1').bind(line.sub).first<{ id: number; display_name: string; approved_at: number | null }>();
    expect(teacher!.display_name).toBe('ครูสมใจ');
    // the session row stores only a hash of the id
    const s = await env.DB.prepare('SELECT id_hash, expires_at FROM sessions WHERE teacher_id = ?1').bind(teacher!.id).first<{ id_hash: string; expires_at: number }>();
    expect(s!.id_hash).not.toBe(session!.split('.')[0]);
    expect(s!.expires_at).toBeGreaterThan(nowSec() + 29 * 86400);

    const home = await call('/app/', { cookie: `__Host-ks_session=${session}` });
    expect(home.status).toBe(200);
    const text = await home.text();
    expect(text).toContain('ครูสมใจ');
    // NEW_MEMBER_APPROVAL is on by default: a first login waits for the owner's approval
    expect(text).toContain('รออนุมัติ');
    expect(teacher!.approved_at).toBeNull();
    const audit = await env.DB.prepare(`SELECT action FROM audit_log WHERE actor = ?1`).bind(`teacher:${teacher!.id}`).first<{ action: string }>();
    expect(audit!.action).toBe('signup.waiting');
  });

  it('the same callback cannot be replayed (state is one-time)', async () => {
    const { loc, handle } = await startLogin();
    line.codeChallenge = loc.searchParams.get('code_challenge')!;
    line.nonce = loc.searchParams.get('nonce')!;
    const url = `/app/auth/callback?code=good-code&state=${loc.searchParams.get('state')}`;
    expect((await call(url, { cookie: `__Host-ks_oauth=${handle}` })).status).toBe(302);
    expect((await call(url, { cookie: `__Host-ks_oauth=${handle}` })).status).toBe(400);
  });

  it('refuses a wrong state, a missing browser cookie, and another browser\'s cookie', async () => {
    const a = await startLogin();
    const b = await startLogin();
    const state = a.loc.searchParams.get('state');
    expect((await call(`/app/auth/callback?code=good-code&state=WRONG`, { cookie: `__Host-ks_oauth=${a.handle}` })).status).toBe(400);
    const a2 = await startLogin();
    expect((await call(`/app/auth/callback?code=good-code&state=${a2.loc.searchParams.get('state')}`)).status).toBe(400);
    expect((await call(`/app/auth/callback?code=good-code&state=${state}`, { cookie: `__Host-ks_oauth=${b.handle}` })).status).toBe(400);
    expect(line.tokenRequests).toHaveLength(0); // LINE was never asked
  });

  it('a nonce that does not match the login attempt is refused', async () => {
    const { loc, handle } = await startLogin();
    line.codeChallenge = loc.searchParams.get('code_challenge')!;
    line.nonce = 'some-other-nonce';
    const cb = await call(`/app/auth/callback?code=good-code&state=${loc.searchParams.get('state')}`, { cookie: `__Host-ks_oauth=${handle}` });
    expect(cb.status).toBe(401);
    expect(cookieValue(cb, '__Host-ks_session')).toBeNull();
  });

  it('LINE refusing the code (e.g. wrong PKCE verifier) ends the login without a session', async () => {
    const { loc, handle } = await startLogin();
    line.codeChallenge = 'not-the-challenge';
    line.nonce = loc.searchParams.get('nonce')!;
    const cb = await call(`/app/auth/callback?code=good-code&state=${loc.searchParams.get('state')}`, { cookie: `__Host-ks_oauth=${handle}` });
    expect(cb.status).toBe(502);
    expect(cookieValue(cb, '__Host-ks_session')).toBeNull();
  });

  it('a blocked teacher cannot log in', async () => {
    await env.DB.prepare(`INSERT INTO teachers (line_user_id, display_name, school, status, created_at) VALUES (?1, 'x', 'y', 'blocked', 1)`).bind(line.sub).run();
    const { loc, handle } = await startLogin();
    line.codeChallenge = loc.searchParams.get('code_challenge')!;
    line.nonce = loc.searchParams.get('nonce')!;
    const cb = await call(`/app/auth/callback?code=good-code&state=${loc.searchParams.get('state')}`, { cookie: `__Host-ks_oauth=${handle}` });
    expect(cb.status).toBe(403);
    expect(cookieValue(cb, '__Host-ks_session')).toBeNull();
  });

  it('next= only accepts local /app/ paths (no open redirect)', async () => {
    for (const evil of ['https://evil.example/', '//evil.example/app/', '/app/..//evil', '/\\evil.example']) {
      await startLogin(evil);
    }
    const { results } = await env.DB.prepare('SELECT return_to FROM oauth_states').all<{ return_to: string }>();
    expect(results.every((r) => r.return_to === '/app/')).toBe(true);
  });

  it('logout (POST + CSRF) deletes the session server-side', async () => {
    const who = await newMember();
    const res = await post('/app/logout', {}, who);
    expect(res.status).toBe(303);
    expect(cookieValue(res, '__Host-ks_session')).toBe('');
    const again = await call('/app/profile', { cookie: who.cookie });
    expect(again.status).toBe(302); // the old cookie no longer works
    expect(again.headers.get('Location')).toContain('/app/login');
  });

  it('a forged or tampered session cookie is ignored', async () => {
    const who = await newMember();
    const [id, sig] = who.cookie.split('=')[1].split('.');
    const forged = `__Host-ks_session=${id}.${sig.slice(0, -2)}AA`;
    const res = await call('/app/profile', { cookie: forged });
    expect(res.status).toBe(302);
  });
});

describe('ID token verification', () => {
  let line: FakeLine;
  beforeEach(async () => {
    resetJwksCache();
    line = await newFakeLine();
    vi.spyOn(globalThis, 'fetch').mockImplementation(lineFetch(line));
  });
  afterEach(() => vi.restoreAllMocks());
  const now = () => nowSec();

  it('accepts a good ES256 token (key from JWKS) and a good HS256 token (channel secret)', async () => {
    expect((await verifyIdToken(env, await idTokenFor(line, 'n1'), { nonce: 'n1', now: now() })).sub).toBe(line.sub);
    line.alg = 'HS256';
    expect((await verifyIdToken(env, await idTokenFor(line, 'n2'), { nonce: 'n2', now: now() })).name).toBe('ครูสมใจ');
  });

  const bad: [string, (c: Record<string, unknown>, h: Record<string, unknown>) => void][] = [
    ['wrong audience', (c) => { c.aud = '999999'; }],
    ['wrong issuer', (c) => { c.iss = 'https://evil.example'; }],
    ['expired', (c) => { c.exp = nowSec() - 3600; }],
    ['issued in the future', (c) => { c.iat = nowSec() + 3600; }],
    ['bad subject', (c) => { c.sub = 'not-a-line-id'; }],
    ['unknown key id', (_c, h) => { h.kid = 'other'; }],
    ['RS256', (_c, h) => { h.alg = 'RS256'; }],
  ];
  for (const [label, tamper] of bad) {
    it(`refuses: ${label}`, async () => {
      line.tamper = tamper;
      await expect(verifyIdToken(env, await idTokenFor(line, 'n'), { nonce: 'n', now: now() })).rejects.toMatchObject({ status: 401 });
    });
  }

  it('refuses alg "none", a tampered payload and an HS256 token signed with the wrong secret', async () => {
    const good = await idTokenFor(line, 'n');
    const [h, , s] = good.split('.');
    const evilPayload = btoa(JSON.stringify({ iss: 'https://access.line.me', sub: 'U' + 'f'.repeat(32), aud: env.LINE_CHANNEL_ID, exp: now() + 99, iat: now(), nonce: 'n' })).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    await expect(verifyIdToken(env, `${h}.${evilPayload}.${s}`, { nonce: 'n', now: now() })).rejects.toMatchObject({ status: 401 });
    const none = await signJwt({ alg: 'none' }, { iss: 'https://access.line.me' }, 'x');
    await expect(verifyIdToken(env, none.split('.').slice(0, 2).join('.') + '.', { nonce: 'n', now: now() })).rejects.toMatchObject({ status: 401 });
    const hs = await signJwt({ alg: 'HS256' }, { iss: 'https://access.line.me', sub: line.sub, aud: env.LINE_CHANNEL_ID, exp: now() + 99, iat: now(), nonce: 'n' }, 'wrong-secret');
    await expect(verifyIdToken(env, hs, { nonce: 'n', now: now() })).rejects.toMatchObject({ status: 401 });
  });
});
