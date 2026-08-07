-- Structured pet personality traits (1–10). Used later as LLM prompt instructions.
-- See docs/petsbook-ai-ecosystem.md § Personality.

CREATE TABLE IF NOT EXISTS pet_personality (
  pet_id BIGINT PRIMARY KEY REFERENCES pets (id) ON DELETE CASCADE,
  energy SMALLINT NOT NULL DEFAULT 5,
  friendliness SMALLINT NOT NULL DEFAULT 5,
  curiosity SMALLINT NOT NULL DEFAULT 5,
  confidence SMALLINT NOT NULL DEFAULT 5,
  humor SMALLINT NOT NULL DEFAULT 5,
  talkativeness SMALLINT NOT NULL DEFAULT 5,
  affection SMALLINT NOT NULL DEFAULT 5,
  playfulness SMALLINT NOT NULL DEFAULT 5,
  bravery SMALLINT NOT NULL DEFAULT 5,
  patience SMALLINT NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pet_personality_energy_range CHECK (energy BETWEEN 1 AND 10),
  CONSTRAINT pet_personality_friendliness_range CHECK (friendliness BETWEEN 1 AND 10),
  CONSTRAINT pet_personality_curiosity_range CHECK (curiosity BETWEEN 1 AND 10),
  CONSTRAINT pet_personality_confidence_range CHECK (confidence BETWEEN 1 AND 10),
  CONSTRAINT pet_personality_humor_range CHECK (humor BETWEEN 1 AND 10),
  CONSTRAINT pet_personality_talkativeness_range CHECK (talkativeness BETWEEN 1 AND 10),
  CONSTRAINT pet_personality_affection_range CHECK (affection BETWEEN 1 AND 10),
  CONSTRAINT pet_personality_playfulness_range CHECK (playfulness BETWEEN 1 AND 10),
  CONSTRAINT pet_personality_bravery_range CHECK (bravery BETWEEN 1 AND 10),
  CONSTRAINT pet_personality_patience_range CHECK (patience BETWEEN 1 AND 10)
);

COMMENT ON TABLE pet_personality IS 'Owner-tuned personality sliders for pet AI prompts (not free text).';
