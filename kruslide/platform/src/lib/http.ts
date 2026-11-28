import { Safe } from './html';

/** CSP for the member and admin pages: no scripts at all, only our own stylesheet and fonts. */
export const APP_CSP = [
  "default-src 'none'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data:",
  "form-action 'self'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ');

/**
 * CSP for the few pages that load our one script (/app/static/app.js: quiz taps, "copy brief"). The script is allowed
 * by its exact URL, not by 'self', so no other file on the origin (e.g. a deck asset) could ever run as a script here.
 */
export function scriptCsp(origin: string): string {
  const ok = /^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/.test(origin); // never let a bad APP_ORIGIN widen the policy
  return `${APP_CSP}; script-src ${ok ? `${origin}/app/static/app.js` : "'none'"}`;
}

/** Headers every response gets unless the route set its own value. */
export const BASE_HEADERS: Record<string, string> = {
  'Content-Security-Policy': APP_CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Robots-Tag': 'noindex, nofollow',
};

/** Add the base security headers; dynamic responses default to no-store so personal pages are never cached. */
export function secure(res: Response): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(BASE_HEADERS)) if (!out.headers.has(k)) out.headers.set(k, v);
  if (!out.headers.has('Cache-Control')) out.headers.set('Cache-Control', 'no-store');
  return out;
}

export function htmlResponse(body: Safe | string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body instanceof Safe ? body.value : body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

/** 303 after a POST so the browser follows with GET. Only same-site paths are accepted. */
export function redirect(location: string, status = 303, headers: HeadersInit = {}): Response {
  const h = new Headers(headers);
  h.set('Location', location);
  h.set('Cache-Control', 'no-store');
  return new Response(null, { status, headers: h });
}

export function textResponse(text: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(text, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...headers } });
}

export class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly detail?: string) { super(message); }
}

/** "Please log in": a GET is redirected to the LINE login (and back), anything else gets 401. */
export const LOGIN_REQUIRED = 'login-required';
export function needLogin(): HttpError {
  return new HttpError(401, 'กรุณาเข้าสู่ระบบ', LOGIN_REQUIRED);
}

/** Accept only a local /app/ path as a place to return to (prevents open redirects). */
export function safeNext(value: string | null | undefined, fallback = '/app/'): string {
  if (!value || value.length > 300) return fallback;
  if (!value.startsWith('/app/') && value !== '/app') return fallback;
  if (/[\\\s\0]|\/\/|%2f|%5c/i.test(value) || value.includes('/../') || value.endsWith('/..')) return fallback;
  return value;
}

export function clientIp(req: Request): string {
  return (req.headers.get('CF-Connecting-IP') || req.headers.get('X-Real-IP') || '0.0.0.0').slice(0, 64);
}
