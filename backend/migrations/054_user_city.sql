-- City / locality for owner discovery (privacy-gated like gender / DOB).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS city TEXT NULL,
  ADD COLUMN IF NOT EXISTS show_city BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.city IS
  'Free-text city or region for soft-launch locality (e.g. Montreal, Laval).';
COMMENT ON COLUMN users.show_city IS
  'Show city on public profile and in member discovery search.';
