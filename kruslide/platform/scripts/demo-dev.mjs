// Run the clickable demo locally: the same Worker with DEMO_MODE on, the decks as static assets, a local D1.
//   DEMO_PASSCODE=... node scripts/demo-dev.mjs   -> http://127.0.0.1:8789/   (PORT, PERSIST_TO optional)
// The session secret is random on every start; the passcode comes from the environment (or a random one is printed
// as a hint that you should set it). Nothing secret is written to disk.
import { execFileSync, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8789);
const persist = process.env.PERSIST_TO ? ['--persist-to', process.env.PERSIST_TO] : [];
const passcode = process.env.DEMO_PASSCODE;
if (!passcode) {
  console.error('Set DEMO_PASSCODE (at least 8 characters) to choose the local demo passcode.');
  process.exit(1);
}
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' };
execFileSync(process.execPath, ['scripts/demo-build.mjs'], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
execFileSync('npx', ['wrangler', 'd1', 'migrations', 'apply', 'DB', '--local', '-c', 'wrangler.demo.toml', ...persist], { cwd: ROOT, env, stdio: ['ignore', 'ignore', 'inherit'] });
const vars = {
  ENVIRONMENT: 'development', // plain http on 127.0.0.1 (the deployed demo is "production": https only)
  APP_ORIGIN: `http://127.0.0.1:${PORT}`,
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
  DEMO_PASSCODE: passcode,
};
const args = ['wrangler', 'dev', '-c', 'wrangler.demo.toml', '--ip', '127.0.0.1', '--port', String(PORT), '--show-interactive-dev-session=false', ...persist,
  ...Object.entries(vars).flatMap(([k, v]) => ['--var', `${k}:${v}`])];
const child = spawn('npx', args, { cwd: ROOT, env, stdio: 'inherit' });
const stop = () => { if (!child.killed) child.kill('SIGTERM'); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code) => process.exit(code ?? 0));
