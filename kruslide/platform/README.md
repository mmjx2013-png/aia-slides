# KruSlide member platform (ครูสไลด์)

Teachers log in with LINE, subscribe to a textbook's slide decks, pay by PromptPay, and open the decks only
through our link. A teacher can also **ask us to make a book** ("ขอทำหนังสือ"): a short form, then a 10-question
**style quiz** (two sample slides per question, tap the one you prefer, or "ได้ทั้งคู่"). The owner manages members,
payments, books, units and book requests on an admin page, and **chooses which decks each teacher may open**:
per-unit grants (with or without an expiry) next to paid book subscriptions, and approval of new members.

Status: built and tested **locally only**. Nothing has been deployed. The deploy steps are at the end.

## Architecture

One Cloudflare Worker serves everything under `/app/*`; the sales site (Cloudflare Pages) keeps every other
path on the same domain. Pages are rendered on the server as plain HTML forms, so the member and admin pages run
under a strict CSP (`default-src 'none'`) and work without JavaScript. Two kinds of page load one small script,
`/app/static/app.js`, as progressive enhancement only: the style quiz (tap feedback, arrow keys, prefetching the next
images) and the admin request pages ("copy brief"). Those pages allow exactly that URL
(`script-src https://<origin>/app/static/app.js`); every other page has no `script-src` at all. State lives in **D1** (SQLite):
teachers, books, units, subscriptions, payments, sessions, one-time LINE login attempts, rate-limit counters
and an audit log. Deck HTML and fonts live in a **private R2 bucket**. The Worker checks the session and the
subscription, then streams the deck from R2 through `HTMLRewriter`, which adds the "Licensed to <name> · <school>"
mark. The deck is served with its own CSP, pinned to the SHA-256 of its inline script (computed at upload time),
plus `connect-src 'none'`, so nothing a student types into a deck can leave the browser. Login is **LINE Login
v2.1**: authorization code with state, nonce and PKCE (S256); the ID token is verified (HS256 with the channel
secret, or ES256 with LINE's JWKS). Payment is **manual PromptPay** for now: the member sees the exact amount and
a PromptPay QR, presses "I have paid", and the owner confirms in admin. Confirming activates or extends the
subscription in one transaction. `src/payments/` is the seam for Stripe Thailand later.

```
wrangler.toml            Worker config: D1 + R2 bindings (placeholder IDs), vars, daily cron
migrations/0001_init.sql D1 schema
migrations/0002_book_requests.sql  book requests + style-quiz answers
migrations/0003_unit_grants.sql    per-unit grants + approval of new members (teachers.approved_at)
src/index.ts             entry: router, session lookup, errors, security headers, cron handler
src/router.ts            tiny path router
src/env.ts               Env (bindings, secrets) and row types
src/db.ts                every SQL query (parameterised), price snapshot, confirmPayment()
src/lib/line.ts          LINE Login: authorize URL, code exchange, ID-token verification (HS256/ES256 + JWKS)
src/lib/session.ts       signed HttpOnly session cookie + D1 session rows; session-bound CSRF token
src/lib/csrf.ts          CSRF check for every POST (Origin/Sec-Fetch-Site + token)
src/lib/ratelimit.ts     fixed-window limiter in D1 (login per IP, admin per admin, member per teacher)
src/lib/pricing.ts       monthly price = slide_count × rate (3–5 baht), months, calendar month maths
src/lib/promptpay.ts     PromptPay EMVCo payload + CRC, QR as inline SVG
src/lib/watermark.ts     the licence mark (HTML + CSS, injected with HTMLRewriter)
src/lib/deckmeta.ts      CSP hashes of a deck's inline scripts, slide count
src/lib/html.ts          html`` templates that escape every value by default
src/lib/validate.ts      form parsing and input validation
src/lib/http.ts          headers, responses, safe redirects
src/lib/config.ts        cookie names, TTLs, rate limits, secret checks
src/lib/audit.ts         audit log writer
src/payments/            PaymentProvider seam: manual.ts (PromptPay, live), stripe.ts (stub with steps)
src/routes/auth.ts       /app/login, /app/auth/callback, /app/logout
src/routes/member.ts     /app/ (my books + catalogue), /app/books/:id, subscribe, /app/payments/:id, profile
src/routes/deck.ts       /app/deck/:unit/ (+ assets): access check, R2 stream, watermark, deck CSP
src/routes/admin.ts      /app/admin/…: dashboard, book requests, payments, members, subscriptions, books/units, upload, CSV, audit
src/routes/requests.ts   /app/requests…: "ขอทำหนังสือ" form, style quiz, the teacher's own requests
src/routes/access.ts     the owner's access control: member access panel, approve, "ใครเข้าถึงได้บ้าง", the access matrix
src/routes/adminkit.ts   shared admin parts (admin check, POST guard, page frame, filter tabs)
src/lib/access.ts        who may open what (subscription OR grant), the teacher's library, grant expiry parsing
src/lib/quiz.ts          the 10 quiz questions, summary ("Style A modern clean · vivid colours · …"), the brief for Claude
src/routes/privacy.ts    /app/privacy (PDPA notice, Thai)
src/routes/static.ts     /app/static/: app.css, app.js, favicon (logo C), fonts and quiz images (from R2)
src/routes/webhooks.ts   /app/webhooks/stripe placeholder (501 until Stripe is added)
src/views/               layout (icons, cover art, badges), stylesheet, app.js, the logo
scripts/seed.mjs         loads teacher-slides/unit4/index.html, fonts and quiz images into LOCAL D1/R2
scripts/quiz/            the 20 sample slides of the style quiz: slides.mjs (HTML templates), render.mjs (Playwright -> WebP),
                         photos/ (CC BY-SA crops, see photos/CREDITS.md)
quiz/                    the rendered quiz images: <key>-a|b.webp (1600 x 900) and <key>-a|b-sm.webp (480 x 270)
scripts/dev.mjs          local dev: mock LINE + wrangler dev (throwaway secrets, nothing written to disk)
scripts/mock-line.mjs    local stand-in for LINE Login (authorize, token, JWKS); never deployed
test/                    Vitest suites, run inside workerd with @cloudflare/vitest-plugin
e2e/smoke.mjs            Playwright smoke test against wrangler dev; writes screenshots/
```

### Routes

| Path | Who | What |
|---|---|---|
| `GET /app/` | anyone | landing with "เข้าสู่ระบบด้วย LINE"; for members: my books, pending payments, catalogue |
| `GET /app/login`, `/app/auth/callback` | anyone | LINE Login (rate-limited per IP) |
| `POST /app/logout` | member | ends the session (CSRF) |
| `GET/POST /app/profile` | member | display name + school (the school is needed for the watermark) |
| `GET /app/books/:id`, `POST …/subscribe` | member | price, units, subscribe/renew for 1/3/6/12 months |
| `GET /app/payments/:id`, `POST …/notify` | owner of the payment | PromptPay QR + steps, "I have paid" |
| `GET /app/deck/:unit/` | approved member with an active subscription to the book OR an active grant for the unit; admin | the deck, streamed from R2, watermarked (assets: same check) |
| `GET /app/requests`, `GET /app/requests/new`, `POST /app/requests` | member | own book requests; the request form (subject, grade, textbook/publisher, units, start date, note) |
| `GET/POST /app/requests/:id/quiz/:n` | the request's teacher | style quiz question n (1–10): a / b / both; the last answer sends the request |
| `GET /app/requests/:id` | the request's teacher | "ขอบคุณ ทีมงานจะติดต่อกลับทาง LINE", status, chosen samples (never the owner note) |
| `POST /app/admin/members/:id/access` | admins only | "สิทธิ์เข้าถึงสไลด์": every book and unit with a checkbox, "ทั้งเล่ม", expiry none / 1 / 3 / 12 months / a date; one Save |
| `POST /app/admin/members/:id/approve` | admins only | approve a waiting member, optionally with whole books |
| `GET /app/admin/books/:id/access`, `POST …/grant`, `POST …/revoke`, `POST /app/admin/grants/:id/revoke` | admins only | "ใครเข้าถึงได้บ้าง": who can open a book or unit and from where (paid / grant / both); revoke; search a member and add |
| `GET/POST /app/admin/access` | admins only | "สิทธิ์ทั้งหมด": teachers × books/units, tap a cell to toggle, filter and search, bulk: a whole book to selected teachers |
| `GET /app/admin/requests`, `/app/admin/requests/:id`, `POST …/:id` | admins only | every request with its form data, summary, chosen thumbnails; status new / quoted / building / done / declined; private owner note; "copy brief" |
| `GET /app/admin/…` | admins only | dashboard (with the count of new requests), payments (confirm/reject), members (block, grant, PDPA erase), subscriptions (extend/expire), books/units CRUD, HTML upload to R2, CSV export, audit log |
| `GET /app/privacy` | anyone | PDPA notice |

## Local development

Needs Node 20+ (22 used here).

```sh
cd kruslide/platform
npm install            # .npmrc sets legacy-peer-deps (works around an npm bug with vitest's peer set)
npm run seed           # local D1 schema + the Unit 4 deck as book 1 / unit 1 + fonts and quiz images in local R2
npm run dev            # mock LINE on :8790 + wrangler dev on http://127.0.0.1:8787/app/
npm test               # unit + integration tests (workerd, local D1/R2, mocked LINE)
npm run typecheck
npm run smoke          # Playwright against a fresh wrangler dev (ports 8788/8791), screenshots/ updated
node scripts/quiz/render.mjs   # re-render the quiz images after editing scripts/quiz/slides.mjs (then npm run seed)
```

`npm run dev` logs you in through a **mock LINE** page with three fictional test users. "เจ้าของครูสไลด์ (ทดสอบ)"
is the admin. Dev secrets are random on every start and passed on the command line, so no secret is written to
disk. Use Chrome or Edge locally: the session cookie is `Secure` with the `__Host-` prefix, which Chromium accepts
on `http://127.0.0.1` but some browsers do not (Safari).

## Deploy (later, when the owner provides the Cloudflare account)

Run every command from `kruslide/platform`. Replace `kruslide.example` with the real domain.

1. **Log in to Cloudflare:** `npx wrangler login`. Alternatively, set an API token with
   Workers, D1 and R2 edit rights in `CLOUDFLARE_API_TOKEN`, in your shell only.
2. **Create the database**: `npx wrangler d1 create kruslide`. Copy the printed `database_id` into
   `wrangler.toml` (replace the `00000000-…` placeholder).
3. **Create the private bucket**: `npx wrangler r2 bucket create kruslide-decks`. Do **not** enable public
   access or an `r2.dev` URL. The Worker is the only way in.
4. **Create the tables**: `npm run migrate:remote`.
5. **Upload the fonts** (used by the member pages and by every deck) **and the quiz images**:
   ```sh
   for f in ../../teacher-slides/unit4/fonts/*.woff2; do
     npx wrangler r2 object put "kruslide-decks/shared/fonts/$(basename "$f")" --remote --file "$f" --content-type font/woff2
   done
   for f in quiz/*.webp; do
     npx wrangler r2 object put "kruslide-decks/shared/quiz/$(basename "$f")" --remote --file "$f" --content-type image/webp
   done
   ```
6. **Set the secrets** (each command asks for the value; nothing goes into a file):
   ```sh
   npx wrangler secret put LINE_CHANNEL_ID       # LINE Developers > your LINE Login channel > Basic settings > Channel ID
   npx wrangler secret put LINE_CHANNEL_SECRET   # same page > Channel secret
   npx wrangler secret put SESSION_SECRET        # paste the output of: openssl rand -hex 32
   npx wrangler secret put ADMIN_LINE_IDS        # admin LINE user IDs, comma-separated, e.g. U1234…(33 chars)
   npx wrangler secret put PROMPTPAY_ID          # the PromptPay mobile number (10 digits), company tax ID (13) or e-wallet ID (15)
   ```
   If wrangler asks whether to create the Worker `kruslide-platform` first, answer yes.
   Your own LINE user ID is on the LINE Developers console, channel > Basic settings > "Your user ID".
   To set it later: log in once, then run
   `npx wrangler d1 execute DB --remote --command "SELECT id, display_name, line_user_id FROM teachers"`
   and put that ID into `ADMIN_LINE_IDS`.
   **PromptPay warning:** the QR code carries the PromptPay ID in plain text, so every member who scans or
   decodes it can read the whole number (the page itself shows only the last 4 digits). Use a business mobile
   number, a company tax ID or an e-wallet ID. Do **not** use a personal national ID card number.
7. **Edit `wrangler.toml` [vars]**: set `APP_ORIGIN = "https://kruslide.example"`. `NEW_MEMBER_APPROVAL = "on"` makes
   new LINE sign-ups wait for approval on the members page; set it to "off" for open sign-up. Check `LINE_OA_ID` is the
   LINE Official Account ID (already `@368lkkze`). Uncomment `routes` and set your domain.
8. **Deploy**: `npx wrangler deploy`.
9. **LINE Login channel** (LINE Developers console):
   - Create a **LINE Login** channel (not a Messaging API channel) with app type **Web app**.
   - Callback URL: **`https://kruslide.example/app/auth/callback`** (exactly; it must match `APP_ORIGIN`).
   - Scopes: `openid` and `profile` only. Email permission is not needed (and not wanted, for PDPA).
   - Privacy policy URL: `https://kruslide.example/app/privacy`.
   - Switch the channel from **Developing** to **Published**. While it is "Developing", only the channel's
     admins and testers can log in.
   - Optional: link the LINE Official Account to the channel and set `LINE_BOT_PROMPT = "normal"` so new members
     are offered "add friend" during login.
10. **Load the first deck**: open `https://kruslide.example/app/admin/books`, create the book, add a unit, and
    upload `teacher-slides/unit4/index.html`. The slide count and the CSP hash are computed on upload.
11. **Check**: log in as a second LINE account. Subscribe and confirm the payment from the admin account. Open the
    deck and check that the watermark shows.

### Custom domain notes
- Put the domain on Cloudflare (DNS "proxied"). Serve the sales site with Cloudflare Pages on
  `kruslide.example` (Pages > Custom domains). The Worker route `kruslide.example/app/*` then serves `/app/*` on
  the same host, so the sales site can simply link to `/app/`.
- Or give the Worker its own host, e.g. `app.kruslide.example`, via Workers > Settings > Domains & Routes. Paths
  stay under `/app/`. Then set `APP_ORIGIN` and the LINE callback URL to that host.
- SSL/TLS mode "Full (strict)" and "Always Use HTTPS". The Worker also sends HSTS (`includeSubDomains`, one
  year) and redirects http to https, so every subdomain of the domain must serve HTTPS too.
- `workers_dev = false` keeps the app off `*.workers.dev`, so there is only one origin (cookies, CSRF, LINE
  callback all depend on it).

### Operations
- A daily cron (03:17 UTC) marks ended subscriptions as expired. It also deletes expired sessions, old login
  attempts and rate-limit counters older than a day. Access checks never depend on it: an ended period is refused
  at once.
- Backups: D1 Time Travel restores to any minute in the last 30 days:
  `npx wrangler d1 time-travel restore kruslide --timestamp=…`. Export with
  `npx wrangler d1 export kruslide --remote --output backup.sql`.
- Logs: Workers > Observability (enabled in `wrangler.toml`). Only our own error lines are kept; the per-request
  "invocation logs" (URL and request details of every visitor) are switched off for PDPA. To debug, set
  `invocation_logs = true` in `wrangler.toml`, deploy, and switch it off again afterwards.
- PDPA requests: a member who asks to be deleted is erased on their admin page ("ลบข้อมูลสมาชิก"): name, school
  and LINE id are removed, sessions and open subscriptions end, and payment amounts stay as accounting records.
- Schema changes: add `migrations/000N_….sql` and run `npm run migrate:remote` before deploying the code.
  (`0002_book_requests.sql` adds the book requests and quiz answers; step 4 applies it on a fresh database.)

### Adding Stripe Thailand later
The seam is ready: `src/payments/stripe.ts` lists the steps. In short, add the secrets `STRIPE_SECRET_KEY` and
`STRIPE_WEBHOOK_SECRET`, create a Checkout Session in `start()`, verify the webhook signature in
`src/routes/webhooks.ts`, call `confirmPayment()`, and set `PAYMENT_PROVIDER = "stripe"`. Payments already carry
`provider`, `amount_satang` and a unique Stripe `ref`, so no schema change is needed.

## Security summary
- Auth: LINE Login with state (one-time, bound to the browser by an HttpOnly cookie), nonce and PKCE. The ID token
  signature is checked, along with `iss`, `aud`, `exp`, `iat`, `nonce` and `sub`; `alg: none` and RS256 are refused.
- Sessions: `__Host-ks_session` = random 256-bit id + HMAC (HttpOnly, Secure, SameSite=Lax, 30 days). D1 stores
  only SHA-256(id). Logout and blocking a member delete the rows.
- CSRF: every POST needs the session-bound token, and a same-origin `Origin`/`Sec-Fetch-Site` when the browser
  sends one. Only form bodies are accepted, at most 64 KB (25 MB for a deck upload), also when no length is sent.
- Admin: LINE user IDs from the `ADMIN_LINE_IDS` secret; none is in the code.
- Payments: the price is always computed on the server from the book (never taken from the form). The confirm
  button carries the amount the admin is looking at; if the member changed the request in the meantime, nothing
  is confirmed. Confirming is one D1 transaction and is idempotent.
- Rate limits: login 30 per 10 min per IP (a whole school can share one IP); admin POSTs 120 per minute per
  admin; member POSTs 30 per 10 min per teacher.
- Uploaded decks: the CSP hash is computed after CRLF -> LF, as browsers do, so decks saved on Windows still run.
  A deck must be self-contained like `build.py` output: inline script only, no `on…=` handlers, no external URLs.
- Input validation on every field. SQL only with bound parameters. Every output is escaped by the html``
  template. CSV export defuses spreadsheet formulas.
- Deck access: a unit opens for an active, approved member with an active subscription to its book (not a draft
  book) OR an active grant for the unit (`unit_grants`, expiry optional); admins preview everything. It is checked on
  every deck and asset request, so a revoke, an expiry or a block works at once, also in an open session. New members
  wait as "รออนุมัติ" (`NEW_MEMBER_APPROVAL`, default "on"; the admins' own LINE ids never wait) and see only a waiting
  page and their profile. Grant, revoke, bulk, toggle and approve are audit-logged; PDPA erasure and deleting a unit or
  book remove grants; `/app/admin/export/grants.csv` exports them. Only the access matrix page may send a background
  request, and only to its own URL (`connect-src https://<origin>/app/admin/access`).
- Book requests: a teacher sees only their own (another teacher's id answers 404); only admins see all of them.
  Answers can change only while the request is a draft; once sent it is locked. The owner note never reaches the
  teacher's pages. The brief for Claude holds the school but no teacher name or LINE id. PDPA erasure deletes the
  member's requests and answers. New requests: 10 per teacher per day; quiz answers: 200 per 10 minutes.
- Headers: a strict CSP everywhere (no scripts on most app pages; the quiz and admin request pages allow only the
  exact URL of `/app/static/app.js`; hash-pinned script on decks), `frame-ancestors`
  ('none' for the app, 'self' for decks), `X-Frame-Options`, `nosniff`, HSTS, COOP/CORP, Permissions-Policy,
  `no-store` on all HTML, `X-Robots-Tag: noindex`.
- Decks: never a raw R2 URL. Access needs an active member with an active subscription (or an admin). Assets are
  behind the same check, and their paths are strictly validated.
