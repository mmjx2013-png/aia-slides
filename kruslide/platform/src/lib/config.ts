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
  demoPasscode: [10, 600] as const, // per IP: wrong or right, attempts at the demo passcode
  demoLogin: [60, 600] as const,   // per IP: persona logins in the demo
};

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Fail closed when a secret is missing or weak, instead of running with an empty key. */
export function sessionSecret(env: Env): string {
  const s = env.SESSION_SECRET || '';
  if (s.length < 32) throw new HttpError(500, 'Server is not configured (SESSION_SECRET).');
  return s;
}

/** The clickable demo: passcode gate, persona login instead of LINE, sample data. Off unless DEMO_MODE is "on". */
export function demoOn(env: Env): boolean {
  return /^(on|true|1|yes)$/i.test((env.DEMO_MODE ?? '').trim());
}

/** The demo owner's fake LINE id ("เจ้าของ (ผู้ดูแล)" persona). It is an admin only while DEMO_MODE is on. */
export const DEMO_OWNER_LINE = 'Ud0000000000000000000000000000009';
/** The demo's PromptPay target: a dummy number, never a real account. */
export const DEMO_PROMPTPAY_ID = '0000000000';

export function adminIds(env: Env): Set<string> {
  // In the demo nobody logs in with LINE, so only the demo owner persona is an admin.
  if (demoOn(env)) return new Set([DEMO_OWNER_LINE]);
  return new Set((env.ADMIN_LINE_IDS || '').split(',').map((s) => s.trim()).filter((s) => /^U[0-9a-f]{32}$/.test(s)));
}

/** New members wait for approval unless NEW_MEMBER_APPROVAL is "off" (or "false" / "0"). On by default. */
export function approvalRequired(env: Env): boolean {
  return !/^(off|false|0|no)$/i.test((env.NEW_MEMBER_APPROVAL ?? 'on').trim());
}

export function isProduction(env: Env): boolean {
  return (env.ENVIRONMENT || 'production') === 'production';
}

export function lineOa(env: Env): string {
  return env.LINE_OA_ID || '@368lkkze';
}
