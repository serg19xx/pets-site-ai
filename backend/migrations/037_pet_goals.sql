-- Backend-owned pet goals (LLM never invents these).
-- See docs/petsbook-ai-ecosystem.md § Goals.

CREATE TABLE IF NOT EXISTS pet_goals (
  id BIGSERIAL PRIMARY KEY,
  pet_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  priority SMALLINT NOT NULL DEFAULT 5,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pet_goals_type_len CHECK (char_length(goal_type) BETWEEN 1 AND 64),
  CONSTRAINT pet_goals_status_check CHECK (status IN ('active', 'completed', 'cancelled')),
  CONSTRAINT pet_goals_priority_range CHECK (priority BETWEEN 1 AND 10)
);

CREATE UNIQUE INDEX IF NOT EXISTS pet_goals_one_active_type_idx
  ON pet_goals (pet_id, goal_type)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS pet_goals_pet_status_idx
  ON pet_goals (pet_id, status, priority DESC, updated_at DESC);

COMMENT ON TABLE pet_goals IS
  'Rule-generated goals that drive future AI actions; LLM only narrates.';
