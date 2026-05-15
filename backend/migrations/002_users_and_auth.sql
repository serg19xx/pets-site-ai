-- Users (profile) and credentials (email + password). Login uses users.email only.
-- Nickname is display-only (any language); not used for authentication.

CREATE TYPE user_gender AS ENUM (
  'male',
  'female',
  'other',
  'prefer_not_to_say'
);

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  gender user_gender NOT NULL,
  date_of_birth DATE NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  pending_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_phone_unique UNIQUE (phone),
  CONSTRAINT users_pending_email_unique UNIQUE (pending_email),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email)),
  CONSTRAINT users_pending_email_lowercase CHECK (
    pending_email IS NULL OR pending_email = lower(pending_email)
  ),
  CONSTRAINT users_pending_email_differs CHECK (
    pending_email IS NULL OR pending_email <> email
  )
);

CREATE INDEX users_email_verified_at_idx ON users (email_verified_at)
  WHERE email_verified_at IS NOT NULL;

COMMENT ON TABLE users IS 'User profile. Login identifier is email (see user_auth).';
COMMENT ON COLUMN users.nickname IS 'Display name only; not unique; any language.';
COMMENT ON COLUMN users.pending_email IS 'New email awaiting verification before it replaces email.';

CREATE TABLE user_auth (
  user_id BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_auth IS 'Password credentials; one row per user. Login via users.email.';

-- 2FA (TOTP): schema ready; enable flows in application code later.
CREATE TABLE user_mfa (
  user_id BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  totp_secret TEXT,
  enabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_mfa_totp_when_enabled CHECK (
    NOT is_enabled OR (totp_secret IS NOT NULL AND enabled_at IS NOT NULL)
  )
);

COMMENT ON TABLE user_mfa IS 'Two-factor auth (TOTP). totp_secret should be stored encrypted by the app.';
COMMENT ON COLUMN user_mfa.totp_secret IS 'Encrypted TOTP secret; NULL until user enrolls.';
