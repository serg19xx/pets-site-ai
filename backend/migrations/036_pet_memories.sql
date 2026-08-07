-- Persistent pet memories for AI prompt context (backend-owned).
-- See docs/petsbook-ai-ecosystem.md § Memory.

CREATE TABLE IF NOT EXISTS pet_memories (
  id BIGSERIAL PRIMARY KEY,
  pet_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  importance SMALLINT NOT NULL DEFAULT 5,
  source_event_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pet_memories_kind_len CHECK (char_length(kind) BETWEEN 1 AND 32),
  CONSTRAINT pet_memories_content_len CHECK (char_length(content) BETWEEN 1 AND 500),
  CONSTRAINT pet_memories_importance_range CHECK (importance BETWEEN 1 AND 10)
);

CREATE INDEX IF NOT EXISTS pet_memories_pet_active_idx
  ON pet_memories (pet_id, is_active, importance DESC, created_at DESC);

COMMENT ON TABLE pet_memories IS
  'Short facts injected into pet AI prompts; never invented by the LLM.';
