import { describe, it, expect } from 'vitest';
import { call, env, newMember, post, ORIGIN } from './helpers';

const PROFILE = { display_name: 'ครูใหม่', school: 'โรงเรียนใหม่' };
async function schoolOf(id: number) {
  return (await env.DB.prepare('SELECT school FROM teachers WHERE id = ?1').bind(id).first<{ school: string }>())!.school;
}

describe('CSRF protection on every POST', () => {
  it('accepts a same-origin form with the session token', async () => {
    const who = await newMember();
    const res = await post('/app/profile', PROFILE, who);
    expect(res.status).toBe(303);
    expect(await schoolOf(who.id)).toBe('โรงเรียนใหม่');
  });

  it('refuses a POST without the token', async () => {
    const who = await newMember();
    const res = await post('/app/profile', PROFILE, who, { csrf: null });
    expect(res.status).toBe(403);
    expect(await schoolOf(who.id)).toBe('โรงเรียนทดสอบวิทยา');
  });

  it('refuses a wrong token and another member\'s token', async () => {
    const a = await newMember();
    const b = await newMember();
    expect((await post('/app/profile', PROFILE, a, { csrf: 'x'.repeat(43) })).status).toBe(403);
    expect((await post('/app/profile', PROFILE, a, { csrf: b.csrf })).status).toBe(403);
    expect(await schoolOf(a.id)).toBe('โรงเรียนทดสอบวิทยา');
  });

  it('refuses a cross-site request even with a valid token (Origin / Sec-Fetch-Site)', async () => {
    const who = await newMember();
    expect((await post('/app/profile', PROFILE, who, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await post('/app/profile', PROFILE, who, { origin: null, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status).toBe(403);
    expect((await post('/app/profile', PROFILE, who, { origin: null, headers: { 'Sec-Fetch-Site': 'same-site' } })).status).toBe(403);
    // a browser that sends no Origin still needs the token, which it has here
    expect((await post('/app/profile', PROFILE, who, { origin: null })).status).toBe(303);
  });

  it('refuses a POST with no session at all', async () => {
    const res = await post('/app/logout', {}, null, { csrf: 'anything' });
    expect(res.status).toBe(403);
  });

  it('refuses JSON and other body types (only HTML forms are accepted)', async () => {
    const who = await newMember();
    const res = await call('/app/profile', {
      method: 'POST', cookie: who.cookie,
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: JSON.stringify({ ...PROFILE, _csrf: who.csrf }),
    });
    expect(res.status).toBe(415);
  });

  it('refuses form bodies over 64 KB, whether or not the size is declared', async () => {
    const who = await newMember();
    const big = new URLSearchParams({ ...PROFILE, _csrf: who.csrf, pad: 'x'.repeat(70 * 1024) }).toString();
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Origin: ORIGIN };
    const declared = await call('/app/profile', { method: 'POST', cookie: who.cookie, headers: { ...headers, 'Content-Length': String(big.length) }, body: big });
    expect(declared.status).toBe(413);
    const chunked = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(big)); c.close(); } });
    const streamed = await call('/app/profile', { method: 'POST', cookie: who.cookie, headers, body: chunked, duplex: 'half' } as RequestInit);
    expect(streamed.status).toBe(413);
  });

  it('every form on the member pages carries the token', async () => {
    const who = await newMember();
    const page = await (await call('/app/profile', { cookie: who.cookie })).text();
    const forms = page.match(/<form method="post"[\s\S]*?<\/form>/g) || [];
    expect(forms.length).toBeGreaterThanOrEqual(2); // logout + profile
    for (const f of forms) expect(f).toContain(`name="_csrf" value="${who.csrf}"`);
  });

  it('admin POSTs are protected the same way', async () => {
    const { newAdmin } = await import('./helpers');
    const admin = await newAdmin();
    const res = await post('/app/admin/books', { title: 'x', subject: 'y', grade: 'z', rate: '3', status: 'draft' }, admin, { csrf: null });
    expect(res.status).toBe(403);
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM books').first<{ n: number }>();
    expect(n!.n).toBe(0);
  });
});
