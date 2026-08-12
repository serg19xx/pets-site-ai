-- Medical records stay private. Members may request them from the owner.
-- Owner is notified (in-app + email) and decides whether to share.

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'medical_request';

CREATE TABLE IF NOT EXISTS pet_medical_requests (
  id BIGSERIAL PRIMARY KEY,
  pet_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  requester_user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  owner_user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pet_medical_requests_not_self CHECK (requester_user_id <> owner_user_id)
);

CREATE INDEX IF NOT EXISTS pet_medical_requests_pet_requester_created_idx
  ON pet_medical_requests (pet_id, requester_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS pet_medical_requests_owner_created_idx
  ON pet_medical_requests (owner_user_id, created_at DESC);

COMMENT ON TABLE pet_medical_requests IS
  'Logged-in member asked the pet owner for medical records. Does not grant access; owner is notified.';
