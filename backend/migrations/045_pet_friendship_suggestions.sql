-- Semi-auto pet friendship suggestions (owner approves).
-- Pets only meet other owners' pets of the same species.

CREATE TABLE IF NOT EXISTS pet_friendship_suggestions (
  id BIGSERIAL PRIMARY KEY,
  from_pet_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  to_pet_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT pet_friendship_suggestions_status_check
    CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'declined'::text, 'expired'::text])),
  CONSTRAINT pet_friendship_suggestions_not_self CHECK (from_pet_id <> to_pet_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS pet_friendship_suggestions_pending_pair_uidx
  ON pet_friendship_suggestions (
    LEAST(from_pet_id, to_pet_id),
    GREATEST(from_pet_id, to_pet_id)
  )
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS pet_friendship_suggestions_from_pending_idx
  ON pet_friendship_suggestions (from_pet_id, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS pet_friendship_suggestions_to_pending_idx
  ON pet_friendship_suggestions (to_pet_id, created_at DESC)
  WHERE status = 'pending';

COMMENT ON TABLE pet_friendship_suggestions IS
  'Backend-proposed pet meetings; owner of from_pet approves/declines. '
  'Pet world only — not owner social graph.';
