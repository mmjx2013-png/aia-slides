import type { Ctx, Unit } from '../env';
import { HttpError, htmlResponse, needLogin, redirect } from '../lib/http';
import { html } from '../lib/html';
import { page, emptyArt, icon, lineAddUrl } from '../views/layout';
import { lineOa } from '../lib/config';
import { storage } from '../lib/storage';
import { idParam } from '../lib/validate';
import * as db from '../db';
import { injectWatermark, watermarkText } from '../lib/watermark';
import { audit } from '../lib/audit';
import { requireTeacher } from './member';

/** CSP for a deck: only the deck's own inline scripts (pinned by the hashes computed at upload) may run. */
export function deckCsp(unit: Pick<Unit, 'script_hashes'>): string {
  const scripts = unit.script_hashes.trim() || "'none'";
  return [
    "default-src 'none'",
    `script-src ${scripts}`,
    "style-src 'unsafe-inline'",          // the decks animate with style attributes
    "font-src 'self'",
    "img-src 'self' data:",
    "media-src 'self'",
    "connect-src 'none'",                  // nothing typed into a deck (students' answers) can leave the browser
    "object-src 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'self'",
  ].join('; ');
}

export function deckHeaders(unit: Pick<Unit, 'script_hashes'>): Record<string, string> {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': deckCsp(unit),
    'Cache-Control': 'no-store, private',
    'Pragma': 'no-cache',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'fullscreen=(self), camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    'Content-Disposition': 'inline',
  };
}

/**
 * Who may open a unit: an admin (preview), or an active, approved member with an active subscription to its book
 * (not a draft book) OR an active grant for the unit. Checked on every request, so a revoke or a block works at once.
 */
async function authorise(ctx: Ctx, unitId: number): Promise<{ unit: Unit; name: string; school: string }> {
  const t = requireTeacher(ctx);
  const unit = await db.getUnit(ctx.env, unitId);
  if (!unit || !unit.r2_key) throw new HttpError(404, 'ไม่พบสไลด์หน่วยนี้');
  if (ctx.isAdmin) return { unit, name: t.display_name, school: t.school || 'KruSlide admin preview' };
  if (!db.canOpen(await db.unitAccess(ctx.env, t.id, unit, ctx.now))) {
    const book = await db.getBook(ctx.env, unit.book_id);
    const sellable = !!book && book.status === 'published';
    throw new HttpError(403, sellable ? 'สไลด์นี้เปิดได้เฉพาะสมาชิกที่สมัครหนังสือเล่มนี้ หรือได้รับสิทธิ์จากทีมงาน และยังไม่หมดอายุ'
      : 'สไลด์นี้เปิดได้เฉพาะสมาชิกที่ได้รับสิทธิ์จากทีมงาน และยังไม่หมดอายุ', sellable ? `book:${unit.book_id}` : 'no-access');
  }
  return { unit, name: t.display_name, school: t.school };
}

/** GET /app/deck/:id → /app/deck/:id/ (so the deck's relative font URLs resolve under its own path). */
export function deckSlash(ctx: Ctx): Response {
  return redirect(`/app/deck/${idParam(ctx.params.id)}/`, 308);
}

/** GET /app/deck/:id/: stream the deck HTML from the private bucket with the licence mark added. */
export async function deck(ctx: Ctx): Promise<Response> {
  const id = idParam(ctx.params.id);
  if (!ctx.teacher) return redirect(`/app/login?next=${encodeURIComponent(`/app/deck/${id}/`)}`, 302);
  let auth: Awaited<ReturnType<typeof authorise>>;
  try {
    auth = await authorise(ctx, id);
  } catch (e) {
    if (!(e instanceof HttpError) || e.status !== 403 || !(e.detail === 'no-access' || /^book:\d+$/.test(e.detail || ''))) throw e;
    const book = /^book:(\d+)$/.exec(e.detail || '')?.[1];
    const oa = lineOa(ctx.env);
    return htmlResponse(page(ctx, {
      title: 'ยังเปิดสไลด์นี้ไม่ได้',
      body: html`<div class="card empty">${emptyArt()}<h1>ยังเปิดสไลด์นี้ไม่ได้</h1><p>${e.message}</p>
        <p class="row">${book ? html`<a class="btn" href="/app/books/${book}">ดูหนังสือเล่มนี้และสมัคร ${icon('right')}</a>`
          : html`<a class="btn line" href="${lineAddUrl(oa)}" rel="noopener">${icon('chat')}ขอสิทธิ์ทาง LINE ${oa}</a>`}<a class="btn ghost" href="/app/">หนังสือของฉัน</a></p></div>`,
    }), 403);
  }
  const { unit, name, school } = auth;
  if (!school) return redirect(`/app/profile?m=school&next=${encodeURIComponent(`/app/deck/${id}/`)}`, 302);
  const obj = await storage(ctx.env).get(unit.r2_key!);
  if (!obj) throw new HttpError(404, 'ไม่พบไฟล์สไลด์ กรุณาติดต่อทีมงาน');
  ctx.exec.waitUntil(audit(ctx.env, ctx.now, `${ctx.isAdmin ? 'admin' : 'teacher'}:${ctx.teacher.id}`, 'deck.open', `unit:${unit.id}`).catch(() => {}));
  const res = new Response(obj.body, { status: 200, headers: deckHeaders(unit) });
  return injectWatermark(res, watermarkText(name, school));
}

const ASSET_TYPES: Record<string, string> = {
  woff2: 'font/woff2', woff: 'font/woff', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  svg: 'image/svg+xml', mp3: 'audio/mpeg', mp4: 'video/mp4', webm: 'video/webm', vtt: 'text/vtt; charset=utf-8',
};

/**
 * GET /app/deck/:id/<path>: a deck's asset (fonts, images, media), with the same access check as the deck.
 * Fonts come from the shared prefix; anything else from the unit's own folder. Paths are strictly checked.
 */
export async function deckAsset(ctx: Ctx): Promise<Response> {
  const id = idParam(ctx.params.id);
  const path = ctx.params.path;
  if (!/^[A-Za-z0-9_-][A-Za-z0-9._-]{0,80}(\/[A-Za-z0-9_-][A-Za-z0-9._-]{0,80}){0,3}$/.test(path) || path.includes('..')) {
    throw new HttpError(404, 'ไม่พบไฟล์');
  }
  const ext = path.split('.').pop()!.toLowerCase();
  const type = ASSET_TYPES[ext];
  if (!type) throw new HttpError(404, 'ไม่พบไฟล์');
  if (!ctx.teacher) throw needLogin();
  const { unit } = await authorise(ctx, id);
  const key = path.startsWith('fonts/') ? `shared/${path}` : `${unit.r2_key!.replace(/[^/]+$/, '')}${path}`;
  const obj = await storage(ctx.env).get(key);
  if (!obj) throw new HttpError(404, 'ไม่พบไฟล์');
  return new Response(obj.body, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'private, max-age=86400',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });
}
