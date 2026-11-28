// A stand-in for LINE Login, for LOCAL development and the smoke test only. Never deployed.
// Implements the three endpoints the Worker uses: authorize (with a "pick a test user" page),
// token (checks the PKCE verifier, client secret and redirect_uri; returns an ES256 ID token), and certs (JWKS).
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.MOCK_LINE_PORT || 8790);
const CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
if (!CHANNEL_ID || !CHANNEL_SECRET) { console.error('mock-line: LINE_CHANNEL_ID and LINE_CHANNEL_SECRET must be set'); process.exit(1); }

// Fictional test users (not real people).
const USERS = {
  teacher: { sub: 'U' + '1a'.repeat(16), name: 'ครูสมศรี (ทดสอบ)' },
  teacher2: { sub: 'U' + '2b'.repeat(16), name: 'ครูวิชัย (ทดสอบ)' },
  admin: { sub: process.env.MOCK_ADMIN_SUB || 'U' + 'ad'.repeat(16), name: 'เจ้าของครูสไลด์ (ทดสอบ)' },
};

const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const KID = 'mock-' + crypto.randomBytes(4).toString('hex');
const pending = new Map(); // request id -> authorize params
const codes = new Map();   // code -> { user, nonce, challenge, redirect_uri, exp }
const b64url = (b) => Buffer.from(b).toString('base64url');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function idToken(user, nonce) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: KID }));
  const body = b64url(JSON.stringify({ iss: 'https://access.line.me', sub: user.sub, aud: CHANNEL_ID, exp: now + 3600, iat: now, nonce, amr: ['linesso'], name: user.name }));
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${b64url(sig)}`;
}

function send(res, status, type, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/oauth2/v2.1/authorize') {
    const q = Object.fromEntries(url.searchParams);
    const problems = [];
    if (q.response_type !== 'code') problems.push('response_type');
    if (q.client_id !== CHANNEL_ID) problems.push('client_id');
    if (!q.redirect_uri || !q.state || !q.nonce) problems.push('redirect_uri/state/nonce');
    if (q.code_challenge_method !== 'S256' || !q.code_challenge) problems.push('PKCE');
    if (!/\bopenid\b/.test(q.scope || '')) problems.push('scope');
    if (problems.length) return send(res, 400, 'text/plain', 'mock LINE: bad request: ' + problems.join(', '));
    const id = crypto.randomBytes(12).toString('hex');
    pending.set(id, q);
    const buttons = Object.entries(USERS).map(([k, u]) => `<a class="u" href="/oauth2/v2.1/approve?req=${id}&user=${k}">${esc(u.name)}</a>`).join('');
    return send(res, 200, 'text/html; charset=utf-8', `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mock LINE Login</title><style>body{font-family:system-ui,sans-serif;background:#f2f3f5;display:grid;place-items:center;min-height:100vh;margin:0}
.c{background:#fff;padding:28px;border-radius:16px;width:min(380px,92vw);box-shadow:0 8px 30px rgba(0,0,0,.08)}h1{font-size:20px;margin:0 0 6px;color:#06C755}
p{color:#555;font-size:14px}.u{display:block;margin:10px 0;padding:14px;border-radius:12px;background:#06C755;color:#fff;text-decoration:none;font-weight:600;text-align:center}
.x{display:block;text-align:center;color:#888;font-size:14px;margin-top:12px}</style>
<div class="c"><h1>Mock LINE Login</h1><p>Local test stand-in for LINE (not the real LINE). Choose a test user:</p>${buttons}
<a class="x" href="/oauth2/v2.1/approve?req=${id}&user=cancel">Cancel</a></div>`);
  }
  if (req.method === 'GET' && url.pathname === '/oauth2/v2.1/approve') {
    const q = pending.get(url.searchParams.get('req') || '');
    if (!q) return send(res, 400, 'text/plain', 'mock LINE: unknown request');
    pending.delete(url.searchParams.get('req'));
    const back = new URL(q.redirect_uri);
    const user = USERS[url.searchParams.get('user')];
    if (!user) {
      back.searchParams.set('error', 'access_denied');
      back.searchParams.set('state', q.state);
      return send(res, 302, 'text/plain', '', { Location: back.href });
    }
    const code = crypto.randomBytes(16).toString('hex');
    codes.set(code, { user, nonce: q.nonce, challenge: q.code_challenge, redirect_uri: q.redirect_uri, exp: Date.now() + 60_000 });
    back.searchParams.set('code', code);
    back.searchParams.set('state', q.state);
    return send(res, 302, 'text/plain', '', { Location: back.href });
  }
  if (req.method === 'POST' && url.pathname === '/oauth2/v2.1/token') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const f = new URLSearchParams(raw);
    const c = codes.get(f.get('code') || '');
    codes.delete(f.get('code') || '');
    const challenge = crypto.createHash('sha256').update(f.get('code_verifier') || '').digest('base64url');
    const ok = c && c.exp > Date.now() && f.get('grant_type') === 'authorization_code' && f.get('client_id') === CHANNEL_ID
      && f.get('client_secret') === CHANNEL_SECRET && f.get('redirect_uri') === c.redirect_uri && challenge === c.challenge;
    if (!ok) return send(res, 400, 'application/json', JSON.stringify({ error: 'invalid_grant' }));
    return send(res, 200, 'application/json', JSON.stringify({
      access_token: crypto.randomBytes(16).toString('hex'), token_type: 'Bearer', expires_in: 2592000, scope: 'openid profile', id_token: idToken(c.user, c.nonce),
    }));
  }
  if (req.method === 'GET' && url.pathname === '/oauth2/v2.1/certs') {
    return send(res, 200, 'application/json', JSON.stringify({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: KID, alg: 'ES256', use: 'sig' }] }));
  }
  send(res, 404, 'text/plain', 'mock LINE: not found');
});
server.listen(PORT, '127.0.0.1', () => console.log(`mock LINE listening on http://127.0.0.1:${PORT}`));
