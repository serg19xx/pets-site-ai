-- Virtual life is opt-in (paid ecosystem later). New pets start OFF.
-- Existing rows keep their current value.

ALTER TABLE pets
  ALTER COLUMN virtual_life_enabled SET DEFAULT FALSE;

COMMENT ON COLUMN pets.virtual_life_enabled IS
  'Owner opt-in: pet participates in AI ecosystem (events/memory/goals/friendships/drafts). '
  'Greeting is always generated. Default false — intended as a paid feature.';
