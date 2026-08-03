-- In-app notifications + beta feature announcements + email delivery log.

CREATE TYPE notification_type AS ENUM (
  'feature_announce',
  'feedback_reply',
  'feedback_decision'
);

CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link_path TEXT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_created_idx
  ON notifications (user_id, created_at DESC);

CREATE INDEX notifications_user_unread_idx
  ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE TABLE notification_deliveries (
  id BIGSERIAL PRIMARY KEY,
  notification_id BIGINT NOT NULL REFERENCES notifications (id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT NULL,
  sent_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_deliveries_channel_chk
    CHECK (channel IN ('email', 'sms')),
  CONSTRAINT notification_deliveries_status_chk
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  CONSTRAINT notification_deliveries_unique
    UNIQUE (notification_id, channel)
);

CREATE TABLE beta_announcements (
  id BIGSERIAL PRIMARY KEY,
  author_user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link_path TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX beta_announcements_created_idx
  ON beta_announcements (created_at DESC);

COMMENT ON TABLE notifications IS
  'In-app messages for members (feature announces, feedback replies/decisions).';
COMMENT ON TABLE notification_deliveries IS
  'Outbound channel attempts (email now; SMS adapters later).';
COMMENT ON TABLE beta_announcements IS
  'Admin feature announces broadcast to founding beta testers.';
