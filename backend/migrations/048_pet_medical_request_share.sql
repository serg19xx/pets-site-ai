-- Owner can approve or decline a medical request.
-- Approval opens a 2-hour read-only share for the requester only.

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'medical_share';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'medical_request_declined';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medical_request_status') THEN
    CREATE TYPE medical_request_status AS ENUM ('pending', 'approved', 'declined');
  END IF;
END
$$;

ALTER TABLE pet_medical_requests
  ADD COLUMN IF NOT EXISTS status medical_request_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS share_token_hash TEXT NULL,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pet_medical_requests_pending_unique
  ON pet_medical_requests (pet_id, requester_user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS pet_medical_requests_share_hash_idx
  ON pet_medical_requests (share_token_hash)
  WHERE share_token_hash IS NOT NULL;

COMMENT ON COLUMN pet_medical_requests.share_expires_at IS
  'When status is approved, requester may view records until this instant.';
