-- KruSlide member platform: initial schema (D1 / SQLite).
-- Times are Unix seconds (UTC). Money is whole baht for prices; payments also keep satang for Stripe later.


-- A teacher (member). Only what the service needs: no e-mail, phone, photo or student data.
CREATE TABLE teachers (
  id             INTEGER PRIMARY KEY,
  line_user_id   TEXT    NOT NULL UNIQUE CHECK (length(line_user_id) BETWEEN 2 AND 64),
  display_name   TEXT    NOT NULL CHECK (length(display_name) BETWEEN 1 AND 80),
  school         TEXT    NOT NULL DEFAULT '' CHECK (length(school) <= 120),
  status         TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at     INTEGER NOT NULL,
  last_login_at  INTEGER
);

-- A textbook sold as a monthly subscription. slide_count is the sum of its units (kept in step by the app).
CREATE TABLE books (
  id                   INTEGER PRIMARY KEY,
  title                TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  subject              TEXT    NOT NULL CHECK (length(subject) BETWEEN 1 AND 80),
  grade                TEXT    NOT NULL CHECK (length(grade) BETWEEN 1 AND 40),
  slide_count          INTEGER NOT NULL DEFAULT 0 CHECK (slide_count >= 0),
  rate_baht_per_slide  INTEGER NOT NULL CHECK (rate_baht_per_slide BETWEEN 3 AND 5),
  status               TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at           INTEGER NOT NULL,
  updated_at           INTEGER NOT NULL
);

-- A unit (one deck) inside a book. r2_key points into the PRIVATE bucket and is never sent to a browser.
CREATE TABLE units (
  id             INTEGER PRIMARY KEY,
  book_id        INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  position       INTEGER NOT NULL CHECK (position BETWEEN 1 AND 999),
  title          TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  slide_count    INTEGER NOT NULL DEFAULT 0 CHECK (slide_count BETWEEN 0 AND 2000),
  r2_key         TEXT,
  script_hashes  TEXT    NOT NULL DEFAULT '',   -- CSP 'sha256-…' sources of the deck's inline scripts, space separated
  html_sha256    TEXT,
  html_bytes     INTEGER,
  uploaded_at    INTEGER,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  UNIQUE (book_id, position)
);
CREATE INDEX units_book ON units(book_id, position);

-- One subscription per teacher and book. Renewals extend the same row.
-- monthly_price = slide_count × rate at the time of the last confirmed (or requested) payment.
CREATE TABLE subscriptions (
  id             INTEGER PRIMARY KEY,
  teacher_id     INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  book_id        INTEGER NOT NULL REFERENCES books(id),
  period_start   INTEGER,
  period_end     INTEGER,
  monthly_price  INTEGER NOT NULL CHECK (monthly_price >= 0),
  status         TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired')),
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  UNIQUE (teacher_id, book_id),
  CHECK (status != 'active' OR (period_start IS NOT NULL AND period_end IS NOT NULL))
);
CREATE INDEX subscriptions_status ON subscriptions(status, period_end);

-- A payment for N months of a subscription. provider 'manual' = PromptPay transfer confirmed by the owner.
CREATE TABLE payments (
  id               INTEGER PRIMARY KEY,
  subscription_id  INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  teacher_id       INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  provider         TEXT    NOT NULL CHECK (provider IN ('manual', 'stripe')),
  months           INTEGER NOT NULL CHECK (months BETWEEN 1 AND 12),
  slide_count      INTEGER NOT NULL CHECK (slide_count >= 0),
  rate_baht        INTEGER NOT NULL CHECK (rate_baht BETWEEN 3 AND 5),
  monthly_price    INTEGER NOT NULL CHECK (monthly_price >= 0),
  amount_satang    INTEGER NOT NULL CHECK (amount_satang > 0),
  ref              TEXT    CHECK (ref IS NULL OR length(ref) <= 200),  -- member's transfer note, or the Stripe PaymentIntent id
  status           TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  notified_at      INTEGER,          -- the member pressed "I have paid"
  confirmed_by     TEXT,             -- 'teacher:<id>' of the admin, or 'stripe'
  decided_at       INTEGER,
  created_at       INTEGER NOT NULL
);
CREATE INDEX payments_status ON payments(status, created_at);
CREATE INDEX payments_subscription ON payments(subscription_id);
CREATE UNIQUE INDEX payments_stripe_ref ON payments(ref) WHERE provider = 'stripe';

-- Server-side sessions. Only a SHA-256 of the session id is stored, so a database copy cannot be replayed.
CREATE TABLE sessions (
  id_hash     TEXT    PRIMARY KEY,
  teacher_id  INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX sessions_teacher ON sessions(teacher_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);

-- One row per LINE login attempt: state, nonce and the PKCE verifier. Used once, valid for 10 minutes.
CREATE TABLE oauth_states (
  id_hash        TEXT    PRIMARY KEY,
  state          TEXT    NOT NULL,
  nonce          TEXT    NOT NULL,
  code_verifier  TEXT    NOT NULL,
  return_to      TEXT    NOT NULL DEFAULT '/app/',
  created_at     INTEGER NOT NULL,
  expires_at     INTEGER NOT NULL
);

-- Fixed-window rate-limit counters (key = purpose + IP or teacher). Rows older than a day are deleted.
CREATE TABLE rate_limits (
  key           TEXT    NOT NULL,
  window_start  INTEGER NOT NULL,
  count         INTEGER NOT NULL,
  PRIMARY KEY (key, window_start)
);

-- Who did what, when. actor = 'teacher:<id>', 'admin:<id>' or 'system'.
CREATE TABLE audit_log (
  id      INTEGER PRIMARY KEY,
  at      INTEGER NOT NULL,
  actor   TEXT    NOT NULL,
  action  TEXT    NOT NULL,
  target  TEXT,
  detail  TEXT
);
CREATE INDEX audit_at ON audit_log(at);
