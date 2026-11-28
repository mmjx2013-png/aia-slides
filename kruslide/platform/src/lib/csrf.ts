import type { Ctx } from '../env';
import { safeEqual } from './crypto';
import { HttpError } from './http';

/**
 * CSRF protection for every POST, two layers:
 *  1. Origin / Sec-Fetch-Site must say the request came from our own pages (when the browser sends them);
 *  2. the form must carry the session-bound token `_csrf` (synchronizer token).
 * A POST without a session is refused: there is no anonymous form on the platform.
 */
/** Origin / Sec-Fetch-Site must say the request came from our own pages (when the browser sends them). */
export function checkSameOrigin(ctx: Ctx): void {
  const origin = ctx.req.headers.get('Origin');
  if (origin && origin !== ctx.origin) throw new HttpError(403, 'คำขอนี้ไม่ได้มาจากหน้าเว็บของเรา (CSRF)');
  const site = ctx.req.headers.get('Sec-Fetch-Site');
  if (site && site !== 'same-origin' && site !== 'none') throw new HttpError(403, 'คำขอนี้ไม่ได้มาจากหน้าเว็บของเรา (CSRF)');
}

export function checkCsrf(ctx: Ctx, form: FormData): void {
  checkSameOrigin(ctx);
  const token = form.get('_csrf');
  if (!ctx.sessionId || !ctx.csrf || typeof token !== 'string' || !safeEqual(token, ctx.csrf)) {
    throw new HttpError(403, 'หน้าเว็บหมดอายุ กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง (CSRF)');
  }
}
