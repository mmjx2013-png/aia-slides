import type { Ctx } from '../env';
import { html, Safe } from '../lib/html';
import { HttpError, needLogin, htmlResponse, scriptCsp } from '../lib/http';
import { page, flash, icon } from '../views/layout';
import { checkCsrf } from '../lib/csrf';
import { readForm } from '../lib/validate';
import { rateLimit } from '../lib/ratelimit';
import { LIMITS } from '../lib/config';

/** Shared parts of every admin page: access check, POST guard, the frame with the side menu, filter tabs. */
export function requireAdmin(ctx: Ctx) {
  if (!ctx.teacher) throw needLogin();
  if (!ctx.isAdmin) throw new HttpError(403, 'หน้านี้สำหรับผู้ดูแลเท่านั้น');
  return ctx.teacher;
}

/** Every admin POST: admin only, CSRF-checked, rate-limited per admin. */
export async function adminPost(ctx: Ctx, maxBytes?: number): Promise<{ form: FormData; actor: string }> {
  const t = requireAdmin(ctx);
  const form = await readForm(ctx.req, maxBytes);
  checkCsrf(ctx, form);
  await rateLimit(ctx.env, `admin:${t.id}`, LIMITS.admin, ctx.now);
  return { form, actor: `admin:${t.id}` };
}

export const SECTIONS = [
  ['dash', '/app/admin/', 'ภาพรวม', 'grid'],
  ['requests', '/app/admin/requests', 'คำขอทำหนังสือ', 'inbox'],
  ['payments', '/app/admin/payments', 'การชำระเงิน', 'wallet'],
  ['members', '/app/admin/members', 'สมาชิก', 'users'],
  ['access', '/app/admin/access', 'สิทธิ์ทั้งหมด', 'key'],
  ['subs', '/app/admin/subscriptions', 'การสมัคร', 'layers'],
  ['books', '/app/admin/books', 'หนังสือและหน่วย', 'book'],
  ['audit', '/app/admin/audit', 'บันทึกการใช้งาน', 'list'],
] as const;

export async function adminPage(ctx: Ctx, title: string, current: string, body: Safe, o: { script?: boolean; connect?: string } = {}): Promise<Response> {
  const n = await ctx.env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM book_requests WHERE status = 'new') AS fresh,
            (SELECT COUNT(*) FROM teachers WHERE approved_at IS NULL AND status = 'active') AS waiting`,
  ).first<{ fresh: number; waiting: number }>();
  const badge = (k: string) => (k === 'requests' && n?.fresh ? html`<span class="cnt" title="คำขอใหม่">${n.fresh}</span>`
    : k === 'members' && n?.waiting ? html`<span class="cnt" title="รออนุมัติ">${n.waiting}</span>` : '');
  const side = html`<nav class="side" aria-label="เมนูผู้ดูแล"><span class="h">ผู้ดูแล</span>${SECTIONS.map(([k, href, label, ic]) =>
    html`<a href="${href}"${k === current ? new Safe(' aria-current="page"') : ''}>${icon(ic)}${label}${badge(k)}</a>`)}</nav>`;
  return htmlResponse(
    page(ctx, { title: `${title} · ผู้ดูแล`, nav: 'admin', wide: true, script: o.script, body: html`<div class="admin">${side}<div>${flash(ctx)}${body}</div></div>` }),
    200, o.script ? { 'Content-Security-Policy': scriptCsp(ctx.origin, o.connect) } : {},
  );
}

export function tabs<T extends string>(base: string, param: string, current: T, items: readonly (readonly [T, string, number?])[]): Safe {
  return html`<nav class="tabsrow" aria-label="ตัวกรอง">${items.map(([k, label, n]) =>
    html`<a href="${base}?${param}=${k}"${k === current ? new Safe(' aria-current="page"') : ''}>${label}${n !== undefined ? html`<i>${n}</i>` : ''}</a>`)}</nav>`;
}

/** Return to the admin page the form was on (same-origin Referer under /app/admin/ only). */
export function back(ctx: Ctx, fallback: string): string {
  const ref = ctx.req.headers.get('Referer');
  let path = fallback;
  if (ref) {
    try {
      const u = new URL(ref);
      if (u.origin === ctx.origin && u.pathname.startsWith('/app/admin/')) path = u.pathname;
    } catch { /* ignore */ }
  }
  return path + '?';
}

