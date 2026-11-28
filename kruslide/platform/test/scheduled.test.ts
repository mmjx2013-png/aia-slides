import { describe, it, expect } from 'vitest';
import { createExecutionContext, createScheduledController, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../src/index';
import { env, makeBook, makeSub, makeUnit, newMember, nowSec } from './helpers';

describe('daily housekeeping (cron)', () => {
  it('marks finished subscriptions expired and deletes expired sessions, login attempts and old counters', async () => {
    const book = await makeBook();
    await makeUnit(book);
    const a = await newMember();
    const b = await newMember();
    const ended = await makeSub(a.id, book, { start: nowSec() - 40 * 86400, end: nowSec() - 10 });
    const running = await makeSub(b.id, book);
    await env.DB.prepare('UPDATE sessions SET expires_at = ?1 WHERE teacher_id = ?2').bind(nowSec() - 1, a.id).run();
    await env.DB.prepare(`INSERT INTO oauth_states (id_hash, state, nonce, code_verifier, created_at, expires_at) VALUES ('h', 's', 'n', 'v', 1, 2)`).run();
    await env.DB.prepare(`INSERT INTO rate_limits (key, window_start, count) VALUES ('login:x', 1000, 5)`).run();

    const ctx = createExecutionContext();
    await worker.scheduled(createScheduledController({ scheduledTime: Date.now(), cron: '17 3 * * *' }), env, ctx);
    await waitOnExecutionContext(ctx);

    const st = async (id: number) => (await env.DB.prepare('SELECT status FROM subscriptions WHERE id = ?1').bind(id).first<{ status: string }>())!.status;
    expect(await st(ended)).toBe('expired');
    expect(await st(running)).toBe('active');
    const count = async (sql: string) => (await env.DB.prepare(sql).first<{ n: number }>())!.n;
    expect(await count(`SELECT COUNT(*) AS n FROM sessions WHERE teacher_id = ${a.id}`)).toBe(0);
    expect(await count(`SELECT COUNT(*) AS n FROM sessions WHERE teacher_id = ${b.id}`)).toBe(1);
    expect(await count('SELECT COUNT(*) AS n FROM oauth_states')).toBe(0);
    expect(await count('SELECT COUNT(*) AS n FROM rate_limits')).toBe(0);
    expect(await count(`SELECT COUNT(*) AS n FROM audit_log WHERE actor = 'system'`)).toBe(1);
  });
});
