import { describe, it, expect } from 'vitest';
import { call, env, makeBook, makeSub, makeUnit, newAdmin, newMember, nowSec } from './helpers';

describe('deck serving: members versus non-members', () => {
  it('sends a visitor who is not logged in to LINE login, and back to the deck afterwards', async () => {
    const unit = await makeUnit(await makeBook());
    const res = await call(`/app/deck/${unit}/`);
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe(`/app/login?next=${encodeURIComponent(`/app/deck/${unit}/`)}`);
  });

  it('/app/deck/<unit> without a slash redirects to the canonical URL', async () => {
    const res = await call('/app/deck/7');
    expect(res.status).toBe(308);
    expect(res.headers.get('Location')).toBe('/app/deck/7/');
  });

  it('refuses a member with no subscription, with a pending one, and with one to another book', async () => {
    const book = await makeBook();
    const other = await makeBook({ title: 'อีกเล่ม' });
    const unit = await makeUnit(book);
    const noSub = await newMember();
    const pending = await newMember();
    await makeSub(pending.id, book, { status: 'pending' });
    const otherBook = await newMember();
    await makeSub(otherBook.id, other);
    for (const who of [noSub, pending, otherBook]) {
      const res = await call(`/app/deck/${unit}/`, { cookie: who.cookie });
      expect(res.status).toBe(403);
      const body = await res.text();
      expect(body).not.toContain('SECRET-CONTENT');
      expect(body).toContain(`href="/app/books/${book}"`); // offers the way to subscribe
    }
  });

  it('refuses a member whose period has ended, even before the daily job marks it expired', async () => {
    const book = await makeBook();
    const unit = await makeUnit(book);
    const who = await newMember();
    await makeSub(who.id, book, { start: nowSec() - 40 * 86400, end: nowSec() - 60 });
    expect((await call(`/app/deck/${unit}/`, { cookie: who.cookie })).status).toBe(403);
  });

  it('refuses a blocked member', async () => {
    const book = await makeBook();
    const unit = await makeUnit(book);
    const who = await newMember({ status: 'blocked' });
    await makeSub(who.id, book);
    expect((await call(`/app/deck/${unit}/`, { cookie: who.cookie })).status).toBe(403);
  });

  it('streams the deck to an active subscriber, watermarked with their name and school', async () => {
    const book = await makeBook();
    const unit = await makeUnit(book);
    const who = await newMember({ name: 'ครูมานี', school: 'โรงเรียนบ้านดอน' });
    await makeSub(who.id, book);
    const res = await call(`/app/deck/${unit}/`, { cookie: who.cookie });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('SECRET-CONTENT');
    expect(body).toContain('Licensed to ครูมานี · โรงเรียนบ้านดอน');
    expect(body).not.toContain('units/');           // the private R2 key never reaches the browser
    expect(body).not.toMatch(/r2\.(dev|cloudflarestorage)/);
    const log = await env.DB.prepare(`SELECT target FROM audit_log WHERE action = 'deck.open'`).first<{ target: string }>();
    expect(log!.target).toBe(`unit:${unit}`);
  });

  it('an admin can preview any deck without a subscription', async () => {
    const unit = await makeUnit(await makeBook({ status: 'draft' }));
    const admin = await newAdmin();
    const res = await call(`/app/deck/${unit}/`, { cookie: admin.cookie });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Licensed to แอดมิน · KruSlide');
  });

  it('asks a member without a school name to add it first (the watermark needs it)', async () => {
    const book = await makeBook();
    const unit = await makeUnit(book);
    const who = await newMember({ school: '' });
    await makeSub(who.id, book);
    const res = await call(`/app/deck/${unit}/`, { cookie: who.cookie });
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain('/app/profile');
  });

  it('a unit with no uploaded deck, or an unknown unit, is 404', async () => {
    const book = await makeBook();
    const unit = await makeUnit(book, { html: null });
    const who = await newMember();
    await makeSub(who.id, book);
    expect((await call(`/app/deck/${unit}/`, { cookie: who.cookie })).status).toBe(404);
    expect((await call('/app/deck/99999/', { cookie: who.cookie })).status).toBe(404);
    expect((await call('/app/deck/abc/', { cookie: who.cookie })).status).toBe(404);
  });

  it('deck assets (fonts) follow the same rule, and paths cannot escape the deck', async () => {
    const book = await makeBook();
    const unit = await makeUnit(book);
    await env.DECKS.put('shared/fonts/Inter-Regular.woff2', new Uint8Array([119, 79, 70, 50]));
    const member = await newMember();
    await makeSub(member.id, book);
    const stranger = await newMember();
    const ok = await call(`/app/deck/${unit}/fonts/Inter-Regular.woff2`, { cookie: member.cookie });
    expect(ok.status).toBe(200);
    expect(ok.headers.get('Content-Type')).toBe('font/woff2');
    expect((await call(`/app/deck/${unit}/fonts/Inter-Regular.woff2`, { cookie: stranger.cookie })).status).toBe(403);
    expect((await call(`/app/deck/${unit}/index.html`, { cookie: member.cookie })).status).toBe(404); // not an asset type
    for (const p of ['..%2F..%2Fshared%2Ffonts%2Fx.woff2', 'fonts/..%2F..%2Fx.woff2', '.hidden.png', 'a//b.png']) {
      expect((await call(`/app/deck/${unit}/${p}`, { cookie: member.cookie })).status).toBe(404);
    }
  });
});
