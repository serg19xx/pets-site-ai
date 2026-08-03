-- Soft-launch founding beta testers (capacity enforced in app, default 20).
ALTER TABLE users
  ADD COLUMN is_beta_tester BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN beta_terms_accepted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN users.is_beta_tester IS
  'True when the user joined via /invite (founding beta tester cohort).';
COMMENT ON COLUMN users.beta_terms_accepted_at IS
  'When beta tester terms were accepted; NULL if not a tester.';

CREATE INDEX users_is_beta_tester_idx ON users (is_beta_tester)
  WHERE is_beta_tester = TRUE;
