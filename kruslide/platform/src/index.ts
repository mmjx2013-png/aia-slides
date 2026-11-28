import type { Ctx, Env } from './env';
import { Router } from './router';
import { HttpError, LOGIN_REQUIRED, clientIp, htmlResponse, redirect, secure, textResponse } from './lib/http';
import { adminIds, demoOn, isProduction } from './lib/config';
import * as demo from './demo/routes';
import { csrfToken, readSession } from './lib/session';
import { errorPage } from './views/layout';
import { housekeeping } from './db';
import { audit } from './lib/audit';
import * as auth from './routes/auth';
import * as member from './routes/member';
import * as deck from './routes/deck';
import * as admin from './routes/admin';
import * as statics from './routes/static';
import * as requests from './routes/requests';
import * as access from './routes/access';
import { privacy } from './routes/privacy';
import { stripeWebhook } from './routes/webhooks';

const router = new Router()
  .get('/app/', member.home)
  .get('/app/login', auth.login)
  .get('/app/auth/callback', auth.callback)
  .post('/app/logout', auth.logout)
  .post('/app/demo/unlock', demo.unlock)
  .post('/app/demo/login', demo.personaLogin)
  .post('/app/admin/demo/reset', demo.reset)
  .get('/app/privacy', privacy)
  .get('/app/profile', member.profile)
  .post('/app/profile', member.profile)
  .get('/app/books/:id', member.bookPage)
  .post('/app/books/:id/subscribe', member.subscribe)
  .get('/app/payments/:id', member.paymentPage)
  .post('/app/payments/:id/notify', member.notify)
  .get('/app/requests', requests.myRequests)
  .post('/app/requests', requests.createRequest)
  .get('/app/requests/new', requests.newRequest)
  .get('/app/requests/:id', requests.requestPage)
  .get('/app/requests/:id/quiz/:n', requests.quizPage)
  .post('/app/requests/:id/quiz/:n', requests.answer)
  .get('/app/deck/:id', deck.deckSlash)
  .get('/app/deck/:id/', deck.deck)
  .get('/app/deck/:id/:path*', deck.deckAsset)
  .get('/app/static/app.css', statics.css)
  .get('/app/static/app.js', statics.js)
  .get('/app/static/favicon.svg', statics.favicon)
  .get('/app/static/apple-touch-icon.png', statics.appleTouchIcon)
  .get('/app/static/fonts/:file', statics.font)
  .get('/app/static/quiz/:file', statics.quizImage)
  .get('/app/admin/', admin.dashboard)
  .get('/app/admin/requests', admin.requests)
  .get('/app/admin/requests/:id', admin.request)
  .post('/app/admin/requests/:id', admin.updateRequest)
  .get('/app/admin/payments', admin.payments)
  .post('/app/admin/payments/:id/confirm', admin.confirm)
  .post('/app/admin/payments/:id/reject', admin.reject)
  .get('/app/admin/members', admin.members)
  .get('/app/admin/members/:id', admin.member)
  .post('/app/admin/members/:id/block', (c) => admin.setStatus(c, 'blocked'))
  .post('/app/admin/members/:id/unblock', (c) => admin.setStatus(c, 'active'))
  .post('/app/admin/members/:id/grant', admin.grant)
  .post('/app/admin/members/:id/erase', admin.erase)
  .post('/app/admin/members/:id/access', access.saveMemberAccess)
  .post('/app/admin/members/:id/approve', access.approve)
  .get('/app/admin/access', access.matrix)
  .post('/app/admin/access', access.matrixPost)
  .post('/app/admin/grants/:id/revoke', access.revoke)
  .get('/app/admin/subscriptions', admin.subscriptions)
  .post('/app/admin/subscriptions/:id/extend', admin.extend)
  .post('/app/admin/subscriptions/:id/expire', admin.expire)
  .get('/app/admin/books', admin.books)
  .post('/app/admin/books', admin.createBook)
  .get('/app/admin/books/:id', admin.book)
  .get('/app/admin/books/:id/access', access.bookAccess)
  .post('/app/admin/books/:id/grant', access.grantFromBook)
  .post('/app/admin/books/:id/revoke', access.revokeBook)
  .post('/app/admin/books/:id', admin.updateBook)
  .post('/app/admin/books/:id/delete', admin.deleteBook)
  .post('/app/admin/books/:id/units', admin.createUnit)
  .post('/app/admin/units/:id', admin.updateUnit)
  .post('/app/admin/units/:id/delete', admin.deleteUnit)
  .post('/app/admin/units/:id/upload', admin.upload)
  .get('/app/admin/export/:type.csv', admin.exportCsv)
  .get('/app/admin/audit', admin.auditLog)
  .post('/app/webhooks/stripe', stripeWebhook);

function publicOrigin(env: Env, url: URL): string {
  const o = (env.APP_ORIGIN || '').replace(/\/+$/, '');
  return /^https?:\/\/[^/]+$/.test(o) ? o : url.origin;
}

async function handle(req: Request, env: Env, exec: ExecutionContext): Promise<Response> {
  const url = new URL(req.url);
  const ctx: Ctx = {
    req, env, exec, url, origin: publicOrigin(env, url), ip: clientIp(req), now: Math.floor(Date.now() / 1000),
    params: {}, sessionId: null, teacher: null, isAdmin: false, waiting: false, csrf: '',
  };
  try {
    if (url.pathname === '/app' || url.pathname === '/app/admin') return redirect(url.pathname + '/', 308);
    if (demoOn(env) && url.pathname === '/robots.txt') return demo.robots();
    if (demoOn(env) && url.pathname === '/') return redirect('/app/', 302);
    if (!url.pathname.startsWith('/app/')) throw new HttpError(404, 'ไม่พบหน้านี้');
    if (isProduction(env) && url.protocol !== 'https:') return redirect(`https://${url.host}${url.pathname}${url.search}`, 308);
    if (demoOn(env)) {
      const gate = await demo.demoGate(ctx); // the passcode page, unless this browser has unlocked the demo
      if (gate) return gate;
    }
    const m = router.match(req.method, url.pathname);
    if (m === 'method') return textResponse('Method not allowed', 405, { Allow: 'GET, POST' });
    if (!m) throw new HttpError(404, 'ไม่พบหน้านี้');
    ctx.params = m.params;
    if (!url.pathname.startsWith('/app/static/')) {
      const s = await readSession(env, req, ctx.now);
      if (s) {
        ctx.sessionId = s.id;
        ctx.teacher = s.teacher;
        ctx.isAdmin = s.teacher.status === 'active' && adminIds(env).has(s.teacher.line_user_id);
        ctx.waiting = !ctx.isAdmin && s.teacher.approved_at === null;
        ctx.csrf = await csrfToken(env, s.id);
      }
    }
    return await m.handler(ctx);
  } catch (e) {
    if (e instanceof HttpError) {
      if (e.detail === LOGIN_REQUIRED && (req.method === 'GET' || req.method === 'HEAD')) return redirect(`/app/login?next=${encodeURIComponent(url.pathname)}`, 302);
      if (e.detail === member.WAITING && ctx.teacher) return htmlResponse(member.waitingPage(ctx), 403);
      if (e.status >= 500) console.error('error', e.status, e.message, e.detail ?? '');
      const headers: Record<string, string> = e.status === 429 && e.detail ? { 'Retry-After': e.detail } : {};
      return htmlResponse(errorPage(ctx, e.status, e.message), e.status, headers);
    }
    console.error('unhandled', e instanceof Error ? e.stack : String(e));
    return htmlResponse(errorPage(ctx, 500, 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง'), 500);
  }
}

export default {
  async fetch(req: Request, env: Env, exec: ExecutionContext): Promise<Response> {
    const res = await handle(req, env, exec);
    return secure(req.method === 'HEAD' ? new Response(null, res) : res);
  },
  async scheduled(_c: ScheduledController, env: Env, exec: ExecutionContext): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    exec.waitUntil((async () => {
      const r = await housekeeping(env, now);
      if (r.expired) await audit(env, now, 'system', 'subscription.expire.daily', null, r);
    })());
  },
} satisfies ExportedHandler<Env>;
