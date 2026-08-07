-- Owner toggle: virtual pet agent in the AI ecosystem (default on).
-- Greeting generation stays always-on regardless of this flag.

ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS virtual_life_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN pets.virtual_life_enabled IS
  'When true, pet participates in AI ecosystem (events/memory/goals/actions). Greeting always generated.';
