-- Soft-launch feedback from founding beta testers (bugs + improvements) with reply thread.

CREATE TYPE feedback_ticket_type AS ENUM ('bug', 'improvement');
CREATE TYPE feedback_ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE feedback_device_class AS ENUM ('desktop', 'mobile', 'tablet', 'unknown');

CREATE TABLE feedback_tickets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type feedback_ticket_type NOT NULL,
  status feedback_ticket_status NOT NULL DEFAULT 'open',
  message TEXT NOT NULL,
  page_path TEXT NULL,
  user_agent TEXT NULL,
  device_class feedback_device_class NOT NULL DEFAULT 'unknown',
  os_label TEXT NULL,
  browser_label TEXT NULL,
  console_text TEXT NULL,
  screenshot_path TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX feedback_tickets_user_id_idx ON feedback_tickets (user_id);
CREATE INDEX feedback_tickets_status_created_idx ON feedback_tickets (status, created_at DESC);
CREATE INDEX feedback_tickets_type_created_idx ON feedback_tickets (type, created_at DESC);

CREATE TABLE feedback_messages (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES feedback_tickets (id) ON DELETE CASCADE,
  author_user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX feedback_messages_ticket_id_idx ON feedback_messages (ticket_id, created_at ASC);

COMMENT ON TABLE feedback_tickets IS
  'Bug reports and improvement ideas from beta testers; optional screenshot/console context for bugs.';
COMMENT ON TABLE feedback_messages IS
  'Thread replies on a feedback ticket (tester + admin).';
