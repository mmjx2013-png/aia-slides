-- "Request a book" (ขอทำหนังสือ): a teacher asks us to build slides for their textbook, then takes a short
-- style quiz (two sample slides per question). The owner follows each request up on the admin page.

-- One request. status: draft = the form is filled in but the quiz is not finished yet;
-- new = sent to the owner; then quoted / building / done, or declined.
CREATE TABLE book_requests (
  id            INTEGER PRIMARY KEY,
  teacher_id    INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject       TEXT    NOT NULL CHECK (length(subject) BETWEEN 1 AND 80),
  grade         TEXT    NOT NULL CHECK (length(grade) BETWEEN 1 AND 40),
  textbook      TEXT    NOT NULL CHECK (length(textbook) BETWEEN 1 AND 160),   -- textbook and publisher
  units         TEXT    NOT NULL CHECK (length(units) BETWEEN 1 AND 500),      -- the units / chapters needed
  start_date    TEXT    NOT NULL CHECK (start_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  note          TEXT    NOT NULL DEFAULT '' CHECK (length(note) <= 1000),
  summary       TEXT    NOT NULL DEFAULT '' CHECK (length(summary) <= 1000), -- built from the quiz answers when it ends
  status        TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'new', 'quoted', 'building', 'done', 'declined')),
  owner_note    TEXT    NOT NULL DEFAULT '' CHECK (length(owner_note) <= 2000), -- private to the owner, never shown to the teacher
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  submitted_at  INTEGER                                                        -- when the quiz was finished (draft -> new)
);
CREATE INDEX book_requests_teacher ON book_requests(teacher_id, created_at);
CREATE INDEX book_requests_status ON book_requests(status, submitted_at);

-- The raw quiz answers: one row per question. choice a = left sample, b = right sample, both = "ได้ทั้งคู่".
CREATE TABLE book_request_answers (
  request_id   INTEGER NOT NULL REFERENCES book_requests(id) ON DELETE CASCADE,
  question     TEXT    NOT NULL CHECK (length(question) BETWEEN 1 AND 32),
  choice       TEXT    NOT NULL CHECK (choice IN ('a', 'b', 'both')),
  answered_at  INTEGER NOT NULL,
  PRIMARY KEY (request_id, question)
);
