-- Improvement accept/reject for bonus scoring + tester notification reason.

CREATE TYPE feedback_improvement_decision AS ENUM (
  'pending',
  'accepted',
  'rejected'
);

ALTER TABLE feedback_tickets
  ADD COLUMN improvement_decision feedback_improvement_decision NULL,
  ADD COLUMN decision_note TEXT NULL,
  ADD COLUMN decided_at TIMESTAMPTZ NULL,
  ADD COLUMN decided_by_user_id BIGINT NULL REFERENCES users (id) ON DELETE SET NULL;

UPDATE feedback_tickets
SET improvement_decision = 'pending'
WHERE type = 'improvement'
  AND improvement_decision IS NULL;

COMMENT ON COLUMN feedback_tickets.improvement_decision IS
  'For improvements only: pending until admin accepts/rejects; accepted counts toward tester bonuses.';
COMMENT ON COLUMN feedback_tickets.decision_note IS
  'Admin reason sent to the tester when accepting or rejecting an improvement.';
