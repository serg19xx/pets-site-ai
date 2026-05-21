-- System-generated passwords and email verification / magic links.

ALTER TABLE user_auth
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN user_auth.must_change_password IS
  'TRUE after signup or password reset when the app emailed a temporary password; user must set a new password.';

CREATE TYPE auth_token_purpose AS ENUM (
  'email_verify',
  'magic_login'
);

CREATE TABLE auth_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  purpose auth_token_purpose NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT auth_tokens_token_hash_unique UNIQUE (token_hash)
);

CREATE INDEX auth_tokens_user_active_idx ON auth_tokens (user_id, purpose)
  WHERE used_at IS NULL;

COMMENT ON TABLE auth_tokens IS 'One-time tokens for email verification and passwordless sign-in links.';
