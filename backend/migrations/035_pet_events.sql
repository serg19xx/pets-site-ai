-- Lifecycle / domain events for pet AI agents (backend-owned, not LLM).
-- See docs/petsbook-ai-ecosystem.md § Events.

CREATE TABLE IF NOT EXISTS pet_events (
  id BIGSERIAL PRIMARY KEY,
  pet_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pet_events_type_len CHECK (char_length(event_type) BETWEEN 1 AND 64)
);

CREATE INDEX IF NOT EXISTS pet_events_pet_created_idx
  ON pet_events (pet_id, created_at DESC);

COMMENT ON TABLE pet_events IS
  'Immutable-ish log of pet life events; future AI actions subscribe to these.';
