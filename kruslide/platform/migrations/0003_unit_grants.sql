-- Access per deck ("unit grants") and approval of new members.
-- The owner chooses which decks each teacher may open, alongside paid book subscriptions:
-- a teacher may open a unit with an active subscription to its book OR an active grant for the unit
-- (and only while the account is active and approved).

-- One grant per teacher and unit. expires_at NULL = no expiry. Revoking deletes the row (the audit log keeps it).
CREATE TABLE unit_grants (
  id          INTEGER PRIMARY KEY,
  teacher_id  INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  unit_id     INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  granted_by  TEXT    NOT NULL CHECK (length(granted_by) BETWEEN 1 AND 64),   -- 'admin:<teacher id>'
  expires_at  INTEGER,
  note        TEXT    NOT NULL DEFAULT '' CHECK (length(note) <= 200),
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  UNIQUE (teacher_id, unit_id)
);
CREATE INDEX unit_grants_unit ON unit_grants(unit_id);

-- New members can wait for the owner's approval (config NEW_MEMBER_APPROVAL, on by default).
-- approved_at NULL = waiting ("รออนุมัติ"). Everybody who is already a member stays approved.
ALTER TABLE teachers ADD COLUMN approved_at INTEGER;
ALTER TABLE teachers ADD COLUMN approved_by TEXT;
UPDATE teachers SET approved_at = created_at, approved_by = 'migration';
CREATE INDEX teachers_waiting ON teachers(created_at) WHERE approved_at IS NULL;
