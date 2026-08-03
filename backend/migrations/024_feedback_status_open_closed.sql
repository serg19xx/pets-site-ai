-- Simplify feedback statuses to open | closed.
UPDATE feedback_tickets SET status = 'open' WHERE status = 'in_progress';
UPDATE feedback_tickets SET status = 'closed' WHERE status = 'resolved';

CREATE TYPE feedback_ticket_status_v2 AS ENUM ('open', 'closed');

ALTER TABLE feedback_tickets
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE feedback_tickets
  ALTER COLUMN status TYPE feedback_ticket_status_v2
  USING status::text::feedback_ticket_status_v2;

DROP TYPE feedback_ticket_status;

ALTER TYPE feedback_ticket_status_v2 RENAME TO feedback_ticket_status;

ALTER TABLE feedback_tickets
  ALTER COLUMN status SET DEFAULT 'open';
