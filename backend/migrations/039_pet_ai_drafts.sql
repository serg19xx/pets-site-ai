-- AI action drafts (caption / intro text). Not published to feed yet — needs pet voice later.
-- See docs/petsbook-ai-ecosystem.md § Prompt Templates / AI Posts.

CREATE TABLE IF NOT EXISTS pet_ai_drafts (
  id BIGSERIAL PRIMARY KEY,
  pet_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  body TEXT NOT NULL,
  body_fr TEXT NOT NULL,
  source_event_type TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pet_ai_drafts_template_len CHECK (char_length(template_key) BETWEEN 1 AND 64),
  CONSTRAINT pet_ai_drafts_status_check CHECK (
    status IN ('pending', 'ready', 'published', 'skipped', 'failed')
  ),
  CONSTRAINT pet_ai_drafts_body_len CHECK (char_length(body) BETWEEN 1 AND 2000),
  CONSTRAINT pet_ai_drafts_body_fr_len CHECK (char_length(body_fr) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS pet_ai_drafts_pet_created_idx
  ON pet_ai_drafts (pet_id, created_at DESC);

COMMENT ON TABLE pet_ai_drafts IS
  'Backend-generated bilingual draft texts for future pet-voice posts; LLM may replace local templates later.';
