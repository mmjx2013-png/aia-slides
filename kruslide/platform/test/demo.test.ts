import { describe, it, expect } from 'vitest';
import { call, cookieValue, env, makeTeacher, loginAs, SAMPLE_DECK, ORIGIN, nowSec } from './helpers';
import { assetStorage, r2Storage, safeKey, storage } from '../src/lib/storage';
import { DEMO_OWNER_LINE } from '../src/lib/config';
import { PERSONAS } from '../src/demo/seed';
import { DEMO_BOOKS } from '../src/demo/catalog';
import { normPasscode } from '../src/demo/routes';

const PASS = 'Abcd-Efgh-Jkmn';
/** A stand-in for the Workers Static Assets binding: the demo's deck files by key; it records every key asked for. */
function fakeAssets(files: Record<string, string | Uint8Array> = {}) {
  const asked: string[] = [];
  const fetcher = {
    async fetch(input: RequestInfo | URL) {
      const key = new URL(typeof input === 'string' || input instanceof URL ? input : input.url).pathname.slice(1);
      asked.push(key);
      const body = files[key];
      return body === undefined ? new Response('not found', { status: 404 }) : new Response(body, { status: 200, headers: { ETag: '"x"' } });
    },
  } as unknown as Fetcher;
  return { fetcher, asked };
}
const DECK_FILES = Object.fromEntries([
  ...DEMO_BOOKS.flatMap((b) => b.units.map((u) => [u.key, SAMPLE_DECK])),
  ['shared/fonts/Inter-Regular.woff2', new Uint8Array([119, 79, 70, 50])],
]);
function demoVars(o: Record<string, unknown> = {}) {
  const assets = fakeAssets(DECK_FILES);
  return { vars: { DEMO_MODE: 'on', DEMO_PASSCODE: PASS, DECKS: undefined, ASSETS: assets.fetcher, ...o }, assets };
}
const formPost = (path: string, fields: Record<string, string>, o: { cookie?: string; vars: Record<string, unknown>; origin?: string | null; ip?: string }) =>
  call(path, {
    method: 'POST', cookie: o.cookie, vars: o.vars, ip: o.ip,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(o.origin === null ? {} : { Origin: o.origin ?? ORIGIN }) },
    body: new URLSearchParams(fields),
  });
async function unlock(vars: Record<string, unknown>, passcode = PASS, ip?: string) {
  const res = await formPost('/app/demo/unlock', { passcode, next: '/app/' }, { vars, ip });
  return { res, gate: cookieValue(res, '__Host-ks_demo') };
}
async function persona(vars: Record<string, unknown>, gate: string, key: string) {
  const res = await formPost('/app/demo/login', { persona: key }, { vars, cookie: `__Host-ks_demo=${gate}` });
  expect(res.status, key).toBe(303);
  return { res, cookie: `__Host-ks_demo=${gate}; __Host-ks_session=${cookieValue(res, '__Host-ks_session')}` };
}

describe('DEMO_MODE off (production): nothing of the demo is reachable', () => {
  it('no gate, no persona login, LINE login as before, and the demo owner id is not an admin', async () => {
    expect((await call('/app/')).status).toBe(200);
    expect(await (await call('/app/')).text()).toContain('เข้าสู่ระบบด้วย LINE');
    const login = await call('/app/login');
    expect(login.status).toBe(302);
    expect(login.headers.get('Location')).toContain('https://access.line.me/');
    for (const p of ['/app/demo/unlock', '/app/demo/login']) {
      const r = await call(p, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: ORIGIN }, body: 'persona=owner&passcode=x' });
      expect(r.status, p).toBe(404);
    }
    expect((await call('/robots.txt')).status).toBe(404);
    const fakeOwner = await loginAs(await makeTeacher({ line: DEMO_OWNER_LINE }));
    expect((await call('/app/admin/', { cookie: fakeOwner.cookie })).status).toBe(403);
    expect(await (await call('/app/', { cookie: fakeOwner.cookie })).text()).not.toContain('เว็บทดลอง');
  });
});

describe('the demo passcode gate', () => {
  it('every page shows the passcode page first; our stylesheet stays reachable', async () => {
    const { vars } = demoVars();
    for (const p of ['/app/', '/app/admin/', '/app/login', '/app/deck/1/', '/app/nope']) {
      const res = await call(p, { vars });
      expect(res.status, p).toBe(200);
      const page = await res.text();
      expect(page, p).toContain('ใส่รหัสเพื่อเข้าเว็บทดลอง');
      expect(page, p).toContain('เว็บทดลอง · ข้อมูลตัวอย่าง');
      expect(page, p).not.toContain('SECRET-CONTENT');
      expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    }
    expect((await call('/app/static/app.css', { vars })).status).toBe(200);
    expect((await formPost('/app/profile', { school: 'x' }, { vars })).status).toBe(401);
    expect((await call('/', { vars })).headers.get('Location')).toBe('/app/');
    expect(await (await call('/robots.txt', { vars })).text()).toContain('Disallow: /');
  });

  it('a wrong passcode is refused; the right one (any case, spaces or dashes) sets a signed cookie', async () => {
    const { vars } = demoVars();
    const bad = await unlock(vars, 'abcd-efgh-jkmx');
    expect(bad.res.status).toBe(401);
    expect(bad.gate).toBeNull();
    expect(await bad.res.text()).toContain('รหัสไม่ถูกต้อง');
    const good = await unlock(vars, ' abcdEFGH jkmn ');
    expect(good.res.status).toBe(303);
    expect(good.res.headers.get('Location')).toBe('/app/login');
    const set = good.res.headers.getSetCookie().find((c) => c.startsWith('__Host-ks_demo='))!;
    expect(set).toMatch(/HttpOnly/);
    expect(set).toMatch(/Secure/);
    expect(good.gate).toMatch(/^\d{10}\.[A-Za-z0-9_-]{43}$/);
    const home = await (await call('/app/', { vars, cookie: `__Host-ks_demo=${good.gate}` })).text();
    expect(home).toContain('เลือกผู้ใช้ทดลอง');
    expect(home).not.toContain('ใส่รหัสเพื่อเข้าเว็บทดลอง');
    expect(normPasscode(' AB-cd ef ')).toBe('abcdef');
  });

  it('refuses a forged, expired or old-passcode cookie, a cross-site unlock, and too many tries', async () => {
    const { vars } = demoVars();
    const { gate } = await unlock(vars);
    const gated = async (cookie: string, v = vars) => (await (await call('/app/', { vars: v, cookie })).text()).includes('ใส่รหัสเพื่อเข้าเว็บทดลอง');
    expect(await gated(`__Host-ks_demo=${gate}`)).toBe(false);
    const [exp, sig] = gate!.split('.');
    expect(await gated(`__Host-ks_demo=${Number(exp) + 1}.${sig}`)).toBe(true);           // forged expiry
    expect(await gated(`__Host-ks_demo=${exp}.${'A'.repeat(43)}`)).toBe(true);          // forged signature
    expect(await gated(`__Host-ks_demo=${nowSec() - 5}.${sig}`)).toBe(true);           // expired
    expect(await gated(`__Host-ks_demo=${gate}`, { ...vars, DEMO_PASSCODE: 'new-passcode-99' })).toBe(true); // passcode changed
    expect((await formPost('/app/demo/unlock', { passcode: PASS }, { vars, origin: 'https://evil.example' })).status).toBe(403);
    const ip = '198.51.100.9';
    for (let i = 0; i < 10; i++) expect((await unlock(vars, 'wrong-wrong', ip)).res.status).toBe(401);
    expect((await unlock(vars, PASS, ip)).res.status).toBe(429);                          // even the right one, for a while
  });

  it('fails closed without a real passcode', async () => {
    const { vars } = demoVars({ DEMO_PASSCODE: 'short' });
    expect((await call('/app/', { vars })).status).toBe(500);
  });
});

describe('demo personas instead of LINE', () => {
  it('the persona page seeds the sample data and never talks to LINE', async () => {
    const { vars } = demoVars();
    const { gate } = await unlock(vars);
    const page = await (await call('/app/login', { vars, cookie: `__Host-ks_demo=${gate}` })).text();
    for (const p of ['ครูวิชัย (ได้สิทธิ์บางหน่วย)', 'ครูสมศรี (ซื้อทั้งเล่ม)', 'ครูใหม่ (รออนุมัติ)', 'เจ้าของ (ผู้ดูแล)']) expect(page).toContain(p);
    expect(page).not.toContain('access.line.me');
    const n = await env.DB.prepare('SELECT (SELECT COUNT(*) FROM books) AS b, (SELECT COUNT(*) FROM units) AS u, (SELECT COUNT(*) FROM teachers) AS t').first<{ b: number; u: number; t: number }>();
    expect(n).toEqual({ b: 3, u: 8, t: 6 });
    expect((await call('/app/auth/callback?code=x&state=y', { vars, cookie: `__Host-ks_demo=${gate}` })).status).toBe(404);
    expect(PERSONAS.find((p) => p.admin)!.line).toBe(DEMO_OWNER_LINE);
  });

  it('each persona sees their part: partial access, a paid book, waiting, the owner\'s admin', async () => {
    const { vars, assets } = demoVars();
    const { gate } = await unlock(vars);
    const wichai = await persona(vars, gate!, 'wichai');
    expect(wichai.res.headers.get('Location')).toBe('/app/');
    const home = await (await call('/app/', { vars, cookie: wichai.cookie })).text();
    expect(home).toContain('เปิดได้ 2 จาก 3 หน่วย');
    expect(home).toContain('เว็บทดลอง · ข้อมูลตัวอย่าง');
    const deck = await call('/app/deck/4/', { vars, cookie: wichai.cookie });
    expect(deck.status).toBe(200);
    expect(await deck.text()).toContain('Licensed to ครูวิชัย (ตัวอย่าง) · โรงเรียนบ้านตัวอย่าง');
    expect((await call('/app/deck/5/', { vars, cookie: wichai.cookie })).status).toBe(403);
    const font = await call('/app/deck/4/fonts/Inter-Regular.woff2', { vars, cookie: wichai.cookie });
    expect(font.status).toBe(200);
    await font.arrayBuffer();
    expect((await call('/app/deck/5/fonts/Inter-Regular.woff2', { vars, cookie: wichai.cookie })).status).toBe(403);
    const pay = await (await call('/app/payments/2', { vars, cookie: wichai.cookie })).text();
    expect(pay).toContain('ตัวอย่าง ห้ามโอนจริง');
    expect(pay).toContain('••••••0000');
    expect(pay).not.toContain('5678');                    // the env's PROMPTPAY_ID is never used in the demo
    const somsri = await persona(vars, gate!, 'somsri');
    expect(await (await call('/app/', { vars, cookie: somsri.cookie })).text()).toContain('เปิดได้ทั้งเล่ม');
    expect((await call('/app/deck/1/', { vars, cookie: somsri.cookie })).status).toBe(200);
    const newbie = await persona(vars, gate!, 'newbie');
    expect(await (await call('/app/', { vars, cookie: newbie.cookie })).text()).toContain('รออนุมัติ');
    expect((await call('/app/deck/7/', { vars, cookie: newbie.cookie })).status).toBe(403);
    const owner = await persona(vars, gate!, 'owner');
    expect(owner.res.headers.get('Location')).toBe('/app/admin/');
    const dash = await (await call('/app/admin/', { vars, cookie: owner.cookie })).text();
    expect(dash).toContain('รีเซ็ตข้อมูลทดลอง');
    expect(dash).toMatch(/<b>1<\/b><span>สมาชิกรออนุมัติ<\/span>/);
    // no request path ever read a file the access check did not allow
    expect(assets.asked.every((k) => ['units/4/index.html', 'units/1/index.html', 'shared/fonts/Inter-Regular.woff2'].includes(k))).toBe(true);
    // a direct URL of a deck file is never passed to the assets
    const before = assets.asked.length;
    for (const p of ['/units/5/index.html', '/shared/fonts/Inter-Regular.woff2']) expect((await call(p, { vars, cookie: wichai.cookie })).status).toBe(404);
    expect(assets.asked.length).toBe(before);
  });

  it('"รีเซ็ตข้อมูลทดลอง": only the owner, CSRF-checked, back to the sample data, everyone logged out', async () => {
    const { vars } = demoVars();
    const { gate } = await unlock(vars);
    const owner = await persona(vars, gate!, 'owner');
    const wichai = await persona(vars, gate!, 'wichai');
    await env.DB.prepare(`UPDATE teachers SET approved_at = 1 WHERE id = 4`).run();
    await env.DB.prepare(`DELETE FROM unit_grants`).run();
    const csrfOf = async (cookie: string) => /name="_csrf" value="([^"]+)"/.exec(await (await call('/app/admin/', { vars, cookie })).text())![1];
    const ownerCsrf = await csrfOf(owner.cookie);
    expect((await formPost('/app/admin/demo/reset', { _csrf: 'x'.repeat(43) }, { vars, cookie: owner.cookie })).status).toBe(403);
    expect((await formPost('/app/admin/demo/reset', { _csrf: ownerCsrf }, { vars, cookie: wichai.cookie })).status).toBe(403);
    const res = await formPost('/app/admin/demo/reset', { _csrf: ownerCsrf }, { vars, cookie: owner.cookie });
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/app/login?m=reset');
    const n = await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM unit_grants) AS g, (SELECT COUNT(*) FROM sessions) AS s, (SELECT approved_at FROM teachers WHERE id = 4) AS w`).first<{ g: number; s: number; w: number | null }>();
    expect(n).toEqual({ g: 5, s: 0, w: null });
    // reset only exists in the demo
    const prodOwner = await loginAs(await makeTeacher({ line: 'U' + 'a'.repeat(32) }));
    expect((await call('/app/admin/demo/reset', { method: 'POST', cookie: prodOwner.cookie, headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: ORIGIN }, body: `_csrf=${prodOwner.csrf}` })).status).toBe(404);
  });
});

describe('deck storage adapter', () => {
  it('accepts only the app\'s own key shapes', () => {
    for (const k of ['units/1/index.html', 'units/12/img/a.png', 'shared/fonts/Inter-Bold.woff2', 'shared/quiz/style-a.webp']) expect(safeKey(k), k).toBe(true);
    for (const k of ['../units/1/index.html', 'units/1/../../secret', 'units/0/x', 'units//x', '/units/1/x', 'shared/other/x', 'https://evil/x', 'units/1/a\\b', 'units/1/.hidden', '']) expect(safeKey(k), k).toBe(false);
  });

  it('assets backend: reads through the binding, never for an unsafe key; read-only', async () => {
    const { fetcher, asked } = fakeAssets({ 'units/1/index.html': 'hello' });
    const s = assetStorage(fetcher);
    expect(s.kind).toBe('assets');
    const f = await s.get('units/1/index.html');
    expect(await new Response(f!.body).text()).toBe('hello');
    expect(f!.etag).toBe('"x"');
    expect(await s.get('units/2/index.html')).toBeNull();
    expect(await s.get('../wrangler.toml')).toBeNull();
    expect(asked).toEqual(['units/1/index.html', 'units/2/index.html']);
    await expect(s.put('units/1/index.html', 'x', 'text/html')).rejects.toMatchObject({ status: 409 });
    await s.delete('units/1/index.html'); // no-op
  });

  it('R2 backend round-trip; storage() picks R2 when bound, else the assets, else fails closed', async () => {
    const s = r2Storage(env.DECKS);
    await s.put('units/9/index.html', '<p>r2</p>', 'text/html', { sha256: 'abc' });
    expect(await new Response((await s.get('units/9/index.html'))!.body).text()).toBe('<p>r2</p>');
    await expect(s.put('../x', 'x', 'text/html')).rejects.toMatchObject({ status: 400 });
    await s.delete(['units/9/index.html', '../x']);
    expect(await s.get('units/9/index.html')).toBeNull();
    expect(storage(env).kind).toBe('r2');
    expect(storage({ ...env, DECKS: undefined, ASSETS: fakeAssets().fetcher }).kind).toBe('assets');
    expect(() => storage({ ...env, DECKS: undefined, ASSETS: undefined })).toThrow();
  });
});
