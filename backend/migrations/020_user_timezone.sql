-- Soft-launch: IANA timezone for display sync and future email/notification times.
ALTER TABLE users
  ADD COLUMN timezone TEXT NULL;

COMMENT ON COLUMN users.timezone IS
  'IANA timezone (e.g. America/Toronto). Auto-synced from the client browser for soft launch.';
