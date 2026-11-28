// Deploy the clickable demo (DEMO_MODE) as Worker "kruslide-demo" with D1 "kruslide-demo" on a free workers.dev URL.
//   DEMO_PASSCODE_FILE=/private/path/.demo-passcode node scripts/demo-deploy.mjs
// Needs a Cloudflare API token in CLOUDFLARE_API_TOKEN (Workers Scripts + D1 edit, Account read). In a session whose
// proxy injects the token for api.cloudflare.com, set CLOUDFLARE_API_TOKEN=proxy-injected.
// It never prints a secret: the passcode is written only to DEMO_PASSCODE_FILE (mode 600, kept if it exists) and the
// session secret only to Cloudflare. Steps: account -> workers.dev subdomain (created if missing) -> D1 (created if
// missing, id written into wrangler.demo.toml) -> migrations -> deploy -> secrets. Safe to run again.
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { chmodSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = resolve(ROOT, 'wrangler.demo.toml');
const NAME = 'kruslide-demo';
const passFile = process.env.DEMO_PASSCODE_FILE;
if (!process.env.CLOUDFLARE_API_TOKEN) { console.error('Set CLOUDFLARE_API_TOKEN (or "proxy-injected" behind the session proxy).'); process.exit(1); }
if (!passFile) { console.error('Set DEMO_PASSCODE_FILE to a private path for the passcode (it is never printed).'); process.exit(1); }
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' };

/** Cloudflare API through curl (honours the proxy and its CA bundle); the token goes in a header read from stdin. */
function api(method, path, body) {
  const args = ['-sS', '-X', method, `https://api.cloudflare.com/client/v4${path}`, '-H', '@-', '-H', 'Content-Type: application/json'];
  if (body) args.push('--data-binary', '@' + writeTmp(JSON.stringify(body)));
  const out = execFileSync('curl', args, { input: `Authorization: Bearer ${process.env.CLOUDFLARE_API_TOKEN}\n`, env, maxBuffer: 1 << 24 }).toString();
  const json = JSON.parse(out);
  return json;
}
function writeTmp(text) {
  const f = join(ROOT, '.demo-upload.json');
  writeFileSync(f, text, { mode: 0o600 });
  return f;
}
const wrangler = (...a) => execFileSync('npx', ['wrangler', ...a, '-c', CONFIG], { cwd: ROOT, env: { ...env, CLOUDFLARE_ACCOUNT_ID: accountId }, stdio: ['pipe', 'inherit', 'inherit'] });
const wranglerIn = (input, ...a) => execFileSync('npx', ['wrangler', ...a, '-c', CONFIG], { cwd: ROOT, env: { ...env, CLOUDFLARE_ACCOUNT_ID: accountId }, input, stdio: ['pipe', 'inherit', 'inherit'] });

// 1. the account
const accounts = api('GET', '/accounts');
if (!accounts.success || !accounts.result?.length) { console.error('Cannot list accounts:', JSON.stringify(accounts.errors)); process.exit(1); }
const accountId = process.env.CF_ACCOUNT_ID || accounts.result[0].id;
if (accounts.result.length > 1 && !process.env.CF_ACCOUNT_ID) console.log(`Several accounts; using the first (${accounts.result[0].name}). Set CF_ACCOUNT_ID to choose.`);

// 2. the workers.dev subdomain
let sub = api('GET', `/accounts/${accountId}/workers/subdomain`);
let subdomain = sub.success ? sub.result?.subdomain : null;
if (!subdomain) {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  const wanted = `kruslide-demo-${Array.from(crypto.randomBytes(4), (b) => alphabet[b % alphabet.length]).join('')}`;
  sub = api('PUT', `/accounts/${accountId}/workers/subdomain`, { subdomain: wanted });
  if (!sub.success) { console.error('Cannot create the workers.dev subdomain:', JSON.stringify(sub.errors)); process.exit(1); }
  subdomain = sub.result.subdomain;
  console.log(`Created the workers.dev subdomain: ${subdomain}.workers.dev`);
}

// 3. the D1 database
const list = api('GET', `/accounts/${accountId}/d1/database?name=${NAME}`);
let db = list.success ? list.result.find((d) => d.name === NAME) : null;
if (!db) {
  const made = api('POST', `/accounts/${accountId}/d1/database`, { name: NAME });
  if (!made.success) { console.error('Cannot create D1:', JSON.stringify(made.errors)); process.exit(1); }
  db = made.result;
  console.log(`Created D1 database ${NAME}`);
}
// 3b. the KV namespace for the deck files (Static Assets cannot be uploaded through the session proxy)
const KV_TITLE = `${NAME}-files`;
const kvs = api('GET', `/accounts/${accountId}/storage/kv/namespaces?per_page=100`);
let kv = kvs.success ? kvs.result.find((n) => n.title === KV_TITLE) : null;
if (!kv) {
  const made = api('POST', `/accounts/${accountId}/storage/kv/namespaces`, { title: KV_TITLE });
  if (!made.success) { console.error('Cannot create KV:', JSON.stringify(made.errors)); process.exit(1); }
  kv = made.result;
  console.log(`Created KV namespace ${KV_TITLE}`);
}
const toml = readFileSync(CONFIG, 'utf8')
  .replace(/database_id = "[^"]*"/, `database_id = "${db.uuid}"`)
  .replace(/(binding = "DEMO_FILES"\nid = )"[^"]*"/, `$1"${kv.id}"`);
writeFileSync(CONFIG, toml);

// 4. build, upload the files to KV, migrate, deploy
execFileSync(process.execPath, ['scripts/demo-build.mjs'], { cwd: ROOT, stdio: 'inherit' });
const ASSET_DIR = join(ROOT, 'demo/assets');
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
let batch = [], size = 0, sent = 0;
const flush = () => {
  if (!batch.length) return;
  const r = api('PUT', `/accounts/${accountId}/storage/kv/namespaces/${kv.id}/bulk`, batch);
  if (!r.success) { console.error('KV upload failed:', JSON.stringify(r.errors)); process.exit(1); }
  sent += batch.length; batch = []; size = 0;
};
for (const f of walk(ASSET_DIR)) {
  const value = readFileSync(f).toString('base64');
  if (size + value.length > 20e6) flush();
  batch.push({ key: relative(ASSET_DIR, f).split('\\').join('/'), value, base64: true });
  size += value.length;
}
flush();
console.log(`Uploaded ${sent} deck files to KV`);
try { execFileSync('rm', ['-f', join(ROOT, '.demo-upload.json')]); } catch { /* ignore */ }
wrangler('d1', 'migrations', 'apply', 'DB', '--remote');
wrangler('deploy');

// 5. secrets: a random session secret; the passcode from the private file (12 easy characters, made once)
if (!existsSync(passFile)) {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'; // no 0/O/1/l
  writeFileSync(passFile, Array.from(crypto.randomBytes(12), (b) => alphabet[b % alphabet.length]).join('') + '\n', { mode: 0o600 });
}
chmodSync(passFile, 0o600);
wranglerIn(crypto.randomBytes(32).toString('hex'), 'secret', 'put', 'SESSION_SECRET');
wranglerIn(readFileSync(passFile, 'utf8').trim(), 'secret', 'put', 'DEMO_PASSCODE');
console.log(`\nDemo: https://${NAME}.${subdomain}.workers.dev/   (passcode in ${passFile})`);
