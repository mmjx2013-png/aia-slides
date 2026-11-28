import type { Env } from '../env';
import { HttpError } from './http';

/** Fixed-window counter in D1. Returns the count in this window; throws 429 once it passes the limit. */
export async function rateLimit(env: Env, key: string, [limit, windowSec]: readonly [number, number], now: number): Promise<number> {
  const windowStart = Math.floor(now / windowSec) * windowSec;
  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
     ON CONFLICT (key, window_start) DO UPDATE SET count = count + 1 RETURNING count`,
  ).bind(key.slice(0, 200), windowStart).first<{ count: number }>();
  const count = row?.count ?? 1;
  if (count > limit) {
    const retry = windowStart + windowSec - now;
    throw new HttpError(429, `มีการทำรายการถี่เกินไป กรุณารอประมาณ ${Math.ceil(retry / 60)} นาทีแล้วลองใหม่`, String(retry));
  }
  return count;
}
