import { describe, it, expect, vi, afterEach } from 'vitest';
import { call, env, newAdmin, newMember, post } from './helpers';
import { LIMITS } from '../src/lib/config';
import { rateLimit } from '../src/lib/ratelimit';

afterEach(() => vi.restoreAllMocks());
// Freeze the clock in the middle of a window so a test never straddles a window boundary.
function freeze(windowSec: number) {
  const t = (Math.floor(Date.now() / 1000 / windowSec) * windowSec + Math.floor(windowSec / 2)) * 1000;
  vi.spyOn(Date, 'now').mockReturnValue(t);
  return t / 1000;
}

describe('rate limits', () => {
  it('login: at most 30 attempts per IP per 10 minutes, then 429 with Retry-After', async () => {
    freeze(LIMITS.login[1]);
    const [max] = LIMITS.login;
    for (let i = 0; i < max; i++) expect((await call('/app/login', { ip: '198.51.100.1' })).status).toBe(302);
    const blocked = await call('/app/login', { ip: '198.51.100.1' });
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
    // the callback shares the same budget
    expect((await call('/app/auth/callback?code=x&state=y', { ip: '198.51.100.1' })).status).toBe(429);
    // another IP is not affected
    expect((await call('/app/login', { ip: '198.51.100.2' })).status).toBe(302);
  });

  it('admin POSTs: 120 per admin per minute', async () => {
    const now = freeze(LIMITS.admin[1]);
    const admin = await newAdmin();
    const [max, win] = LIMITS.admin;
    await env.DB.prepare('INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, ?3)')
      .bind(`admin:${admin.id}`, Math.floor(now / win) * win, max - 1).run();
    const form = { title: 'เล่ม', subject: 'วิชา', grade: 'ม.1', rate: '3', status: 'draft' };
    expect((await post('/app/admin/books', form, admin)).status).toBe(303);   // the 120th
    expect((await post('/app/admin/books', form, admin)).status).toBe(429);   // the 121st
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM books').first<{ n: number }>();
    expect(n!.n).toBe(1);
  });

  it('member POSTs (subscribe, profile, "I have paid") are limited per teacher', async () => {
    freeze(LIMITS.member[1]);
    const who = await newMember();
    const [max] = LIMITS.member;
    for (let i = 0; i < max; i++) expect((await post('/app/profile', { display_name: 'ครู', school: 'โรงเรียน' + i }, who)).status).toBe(303);
    expect((await post('/app/profile', { display_name: 'ครู', school: 'โรงเรียนX' }, who)).status).toBe(429);
  });

  it('the counter resets in the next window', async () => {
    const t = 1_800_000_000;
    for (let i = 0; i < 3; i++) await rateLimit(env, 'k', [3, 60], t);
    await expect(rateLimit(env, 'k', [3, 60], t + 10)).rejects.toMatchObject({ status: 429 });
    expect(await rateLimit(env, 'k', [3, 60], t + 60)).toBe(1);
  });
});
