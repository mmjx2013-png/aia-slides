import type { Env } from '../env';
import { HttpError } from './http';

export const SESSION_COOKIE = '__Host-ks_session';
export const OAUTH_COOKIE = '__Host-ks_oauth';
export const SESSION_TTL = 30 * 24 * 3600;      // 30 days
export const OAUTH_TTL = 10 * 60;               // a login must finish within 10 minutes

/** Rate limits: [max requests, window in seconds]. A school's teachers can share one IP, so login is generous. */
export const LIMITS = {
  login: [30, 600] as const,       // per IP: /app/login and /app/auth/callback
  member: [30, 600] as const,      // per teacher: subscribe, profile, "I have paid"
  admin: [120, 60] as const,       // per admin: every admin POST
  requestDaily: [10, 86400] as const, // per teacher: new book requests per day
  quiz: [200, 600] as const,       // per teacher: style-quiz answers (10 taps per request, changes allowed)
};

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Fail closed when a secret is missing or weak, instead of running with an empty key. */
export function sessionSecret(env: Env): string {
  const s = env.SESSION_SECRET || '';
  if (s.length < 32) throw new HttpError(500, 'Server is not configured (SESSION_SECRET).');
  return s;
}

export function adminIds(env: Env): Set<string> {
  return new Set((env.ADMIN_LINE_IDS || '').split(',').map((s) => s.trim()).filter((s) => /^U[0-9a-f]{32}$/.test(s)));
}

export function isProduction(env: Env): boolean {
  return (env.ENVIRONMENT || 'production') === 'production';
}

export function lineOa(env: Env): string {
  return env.LINE_OA_ID || '@kruslide'; // TODO-LINE-ID: the owner sends the real LINE Official Account ID
}
