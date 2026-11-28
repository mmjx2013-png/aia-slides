import type { Ctx } from '../env';
import { APP_CSS } from '../views/css';
import { HttpError } from '../lib/http';

/** GET /app/static/app.css */
export function css(): Response {
  return new Response(APP_CSS, { headers: { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

/** GET /app/static/fonts/:file: the self-hosted Inter and Anuphan fonts (SIL OFL) from the bucket's shared/ prefix. */
export async function font(ctx: Ctx): Promise<Response> {
  const file = ctx.params.file;
  if (!/^[A-Za-z0-9-]{1,60}\.woff2$/.test(file)) throw new HttpError(404, 'ไม่พบไฟล์');
  const obj = await ctx.env.DECKS.get(`shared/fonts/${file}`);
  if (!obj) throw new HttpError(404, 'ไม่พบไฟล์');
  return new Response(obj.body, { headers: { 'Content-Type': 'font/woff2', 'Cache-Control': 'public, max-age=2592000, immutable' } });
}
