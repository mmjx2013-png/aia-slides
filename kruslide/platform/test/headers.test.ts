import { describe, it, expect } from 'vitest';
import { call, makeBook, makeSub, makeUnit, newMember } from './helpers';
import { inlineScriptHashes } from '../src/lib/deckmeta';
import { SAMPLE_DECK } from './helpers';

function expectBase(res: Response) {
  expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  expect(res.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');
  expect(res.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
  expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  expect(res.headers.get('Permissions-Policy')).toContain('camera=()');
}

describe('security headers', () => {
  it('member pages: strict CSP with no scripts, no framing, no caching', async () => {
    const who = await newMember();
    for (const path of ['/app/', '/app/privacy', '/app/profile']) {
      const res = await call(path, { cookie: who.cookie });
      expect(res.status).toBe(200);
      expectBase(res);
      const csp = res.headers.get('Content-Security-Policy')!;
      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).not.toContain('script-src');           // falls back to default-src 'none': no script runs
      expect(csp).not.toContain('unsafe-inline');
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('Cache-Control')).toBe('no-store');
      expect(res.headers.get('Referrer-Policy')).toBe('same-origin');
    }
  });

  it('deck: CSP pinned to the deck\'s own script hash, frame-ancestors \'self\', no-store, no referrer', async () => {
    const book = await makeBook();
    const unit = await makeUnit(book);
    const who = await newMember();
    await makeSub(who.id, book);
    const res = await call(`/app/deck/${unit}/`, { cookie: who.cookie });
    expect(res.status).toBe(200);
    expectBase(res);
    const csp = res.headers.get('Content-Security-Policy')!;
    const [hash] = await inlineScriptHashes(SAMPLE_DECK);
    expect(csp).toContain(`script-src ${hash}`);
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe/);
    expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(res.headers.get('Cache-Control')).toBe('no-store, private');
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('Permissions-Policy')).toContain('fullscreen=(self)');
  });

  it('error pages and redirects carry the headers too', async () => {
    const notFound = await call('/app/nope');
    expect(notFound.status).toBe(404);
    expectBase(notFound);
    expect(notFound.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
    const redirect = await call('/app/admin/');
    expect(redirect.status).toBe(302);
    expectBase(redirect);
  });

  it('static CSS is cacheable; unknown methods are refused', async () => {
    const css = await call('/app/static/app.css');
    expect(css.status).toBe(200);
    expect(css.headers.get('Content-Type')).toBe('text/css; charset=utf-8');
    expect(css.headers.get('Cache-Control')).toBe('public, max-age=3600');
    expect((await call('/app/', { method: 'DELETE' })).status).toBe(405);
    expect((await call('/', {})).status).toBe(404);
  });
});
