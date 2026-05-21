-- Public profile visibility (owner always sees all fields in account settings).

ALTER TABLE users
  ADD COLUMN show_full_name BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN show_nickname BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN show_email BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN show_phone BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN show_gender BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN show_date_of_birth BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
  ADD CONSTRAINT users_public_name_visibility CHECK (show_full_name OR show_nickname);

COMMENT ON COLUMN users.show_full_name IS 'Show legal/full name on public profile.';
COMMENT ON COLUMN users.show_nickname IS 'Show nickname on public profile; at least one name flag must be true.';
