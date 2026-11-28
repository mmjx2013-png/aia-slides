import type { Ctx } from '../env';
import { APP_CSS } from '../views/css';
import { APP_JS } from '../views/js';
import { APPLE_ICON_B64, ICON_SVG } from '../views/brand';
import { HttpError } from '../lib/http';
import { QUIZ_FILES } from '../lib/quiz';

/** GET /app/static/app.css */
export function css(): Response {
  return new Response(APP_CSS, { headers: { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

/** GET /app/static/app.js: progressive enhancement only (see src/views/js.ts). */
export function js(): Response {
  return new Response(APP_JS, { headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

/** GET /app/static/favicon.svg: the KruSlide logo C. */
export function favicon(): Response {
  return new Response(ICON_SVG, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' } });
}

let appleIcon: Uint8Array | null = null;
/** GET /app/static/apple-touch-icon.png */
export function appleTouchIcon(): Response {
  appleIcon ??= Uint8Array.from(atob(APPLE_ICON_B64), (c) => c.charCodeAt(0));
  return new Response(appleIcon, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } });
}

/** GET /app/static/fonts/:file: the self-hosted Inter and Anuphan fonts (SIL OFL) from the bucket's shared/ prefix. */
export async function font(ctx: Ctx): Promise<Response> {
  const file = ctx.params.file;
  if (!/^[A-Za-z0-9-]{1,60}\.woff2$/.test(file)) throw new HttpError(404, 'ไม่พบไฟล์');
  const obj = await ctx.env.DECKS.get(`shared/fonts/${file}`);
  if (!obj) throw new HttpError(404, 'ไม่พบไฟล์');
  return new Response(obj.body, { headers: { 'Content-Type': 'font/woff2', 'Cache-Control': 'public, max-age=2592000, immutable' } });
}

/** GET /app/static/quiz/:file: the sample slides of the style quiz (bucket prefix shared/quiz/). Only known names. */
export async function quizImage(ctx: Ctx): Promise<Response> {
  const file = ctx.params.file;
  if (!QUIZ_FILES.has(file)) throw new HttpError(404, 'ไม่พบไฟล์');
  const obj = await ctx.env.DECKS.get(`shared/quiz/${file}`);
  if (!obj) throw new HttpError(404, 'ไม่พบไฟล์');
  return new Response(obj.body, {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=604800', ETag: obj.httpEtag },
  });
}
