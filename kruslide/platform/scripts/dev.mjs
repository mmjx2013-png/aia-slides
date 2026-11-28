// Local development: the mock LINE server + `wrangler dev` with local D1 and R2.
//   npm run seed   (once: apply migrations and load the Unit 4 sample deck)
//   npm run dev    -> http://127.0.0.1:8787/app/
// Dev "secrets" are random throwaway values generated on every run and passed on the command line,
// so nothing secret is ever written to a file. The real secrets are set with `wrangler secret put` (README).
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 8787);
const MOCK_PORT = Number(process.env.MOCK_LINE_PORT || 8790);
const rand = (n) => crypto.randomBytes(n).toString('hex');
const ADMIN_SUB = 'U' + 'ad'.repeat(16);   // the mock LINE "admin" test user
const vars = {
  ENVIRONMENT: 'development',
  APP_ORIGIN: `http://127.0.0.1:${PORT}`,
  LINE_CHANNEL_ID: '1650000000',
  LINE_CHANNEL_SECRET: rand(16),
  SESSION_SECRET: rand(32),
  ADMIN_LINE_IDS: ADMIN_SUB,
  PROMPTPAY_ID: process.env.DEV_PROMPTPAY_ID || '0000000000000', // a dummy, unpayable target for local screens
  LINE_AUTH_ORIGIN: `http://127.0.0.1:${MOCK_PORT}`,
  LINE_API_ORIGIN: `http://127.0.0.1:${MOCK_PORT}`,
};

const children = [];
function run(cmd, args, env = {}) {
  const p = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  children.push(p);
  p.on('exit', (code) => { if (code && code !== 0) { console.error(`${cmd} exited with ${code}`); stop(code); } });
  return p;
}
function stop(code = 0) {
  for (const c of children) if (!c.killed) c.kill('SIGTERM');
  process.exit(code);
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

run(process.execPath, ['scripts/mock-line.mjs'], {
  MOCK_LINE_PORT: String(MOCK_PORT), LINE_CHANNEL_ID: vars.LINE_CHANNEL_ID, LINE_CHANNEL_SECRET: vars.LINE_CHANNEL_SECRET, MOCK_ADMIN_SUB: ADMIN_SUB,
});
const varArgs = Object.entries(vars).flatMap(([k, v]) => ['--var', `${k}:${v}`]);
run('npx', ['wrangler', 'dev', '--ip', '127.0.0.1', '--port', String(PORT), '--show-interactive-dev-session=false', ...varArgs], { WRANGLER_SEND_METRICS: 'false' });
