// Seed LOCAL D1 + R2 with the Unit 4 deck as a sample unit (never touches the remote database or bucket).
//   npm run seed
// Creates book 1 "คณิตศาสตร์ ม.1 เล่ม 1" (published, 3 baht/slide) with unit 1 = teacher-slides/unit4/index.html,
// the self-hosted fonts under shared/fonts/ (used by the decks and by the member pages), and the style-quiz
// sample slides (quiz/*.webp, made by scripts/quiz/render.mjs) under shared/quiz/.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const QUIZ = join(ROOT, 'quiz');
const UNIT4 = resolve(ROOT, '../../teacher-slides/unit4');
const DECK = join(UNIT4, 'index.html');
const FONTS = join(UNIT4, 'fonts');
const BUCKET = 'kruslide-decks';
const persist = process.env.PERSIST_TO ? ['--persist-to', process.env.PERSIST_TO] : [];

function wrangler(...args) {
  execFileSync('npx', ['wrangler', ...args, ...persist], { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
}

// The same rules as src/lib/deckmeta.ts (CSP hashes of inline scripts; slides = <section class="slide">).
function scriptHashes(html) {
  const out = new Set();
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\bsrc\s*=/i.test(m[1])) continue;
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(m[1])?.[1]?.toLowerCase();
    if (type && !['text/javascript', 'module', 'application/javascript'].includes(type)) continue;
    out.add(`'sha256-${createHash('sha256').update(m[2].replace(/\r\n?/g, '\n'), 'utf8').digest('base64')}'`); // CRLF -> LF, as the HTML parser does
  }
  return [...out];
}
const sql = (s) => `'${String(s).replace(/'/g, "''")}'`;

const html = readFileSync(DECK, 'utf8');
const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
const slides = (markup.match(/<section\b[^>]*class="(?:[^"]*\s)?slide(?:\s[^"]*)?"/g) || []).length;
const hashes = scriptHashes(html);
const sha = createHash('sha256').update(html, 'utf8').digest('hex');
const bytes = statSync(DECK).size;
const now = Math.floor(Date.now() / 1000);
const key = 'units/1/index.html';

console.log(`Unit 4 deck: ${slides} slides, ${hashes.length} inline script(s), ${(bytes / 1024).toFixed(0)} KB`);
wrangler('d1', 'migrations', 'apply', 'DB', '--local');

const dir = mkdtempSync(join(tmpdir(), 'kruslide-seed-'));
try {
  const file = join(dir, 'seed.sql');
  writeFileSync(file, `
INSERT INTO books (id, title, subject, grade, slide_count, rate_baht_per_slide, status, created_at, updated_at)
VALUES (1, ${sql('คณิตศาสตร์ ม.1 เล่ม 1')}, ${sql('คณิตศาสตร์')}, ${sql('ม.1')}, 0, 3, 'published', ${now}, ${now})
ON CONFLICT (id) DO UPDATE SET title = excluded.title, subject = excluded.subject, grade = excluded.grade, updated_at = excluded.updated_at;
INSERT INTO units (id, book_id, position, title, slide_count, r2_key, script_hashes, html_sha256, html_bytes, uploaded_at, created_at, updated_at)
VALUES (1, 1, 4, ${sql('หน่วยที่ 4 สถิติ (1)')}, ${slides}, ${sql(key)}, ${sql(hashes.join(' '))}, ${sql(sha)}, ${bytes}, ${now}, ${now}, ${now})
ON CONFLICT (id) DO UPDATE SET slide_count = excluded.slide_count, r2_key = excluded.r2_key, script_hashes = excluded.script_hashes,
  html_sha256 = excluded.html_sha256, html_bytes = excluded.html_bytes, uploaded_at = excluded.uploaded_at, updated_at = excluded.updated_at;
UPDATE books SET slide_count = (SELECT COALESCE(SUM(slide_count), 0) FROM units WHERE book_id = 1) WHERE id = 1;
`);
  wrangler('d1', 'execute', 'DB', '--local', '--file', file);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

wrangler('r2', 'object', 'put', `${BUCKET}/${key}`, '--local', '--file', DECK, '--content-type', 'text/html; charset=utf-8');

// Fonts and quiz images: one bulk upload each (much faster than one wrangler call per file).
function bulk(prefix, dir, ext, type) {
  const files = readdirSync(dir).filter((n) => n.endsWith(ext));
  const list = join(mkdtempSync(join(tmpdir(), 'kruslide-bulk-')), 'list.json');
  writeFileSync(list, JSON.stringify(files.map((f) => ({ key: `${prefix}${f}`, file: join(dir, f) }))));
  try {
    wrangler('r2', 'bulk', 'put', BUCKET, '--local', '--filename', list, '--content-type', type);
  } finally {
    rmSync(dirname(list), { recursive: true, force: true });
  }
  return files.length;
}
const nFonts = bulk('shared/fonts/', FONTS, '.woff2', 'font/woff2');
const nQuiz = bulk('shared/quiz/', QUIZ, '.webp', 'image/webp');
console.log(`Seeded local D1 + R2 (${nFonts} fonts, ${nQuiz} quiz images). Start the app with: npm run dev  ->  http://127.0.0.1:8787/app/`);
