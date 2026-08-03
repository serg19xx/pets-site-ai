-- French greeting (English stays in pets.greeting).

ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS greeting_fr TEXT;

ALTER TABLE pets
  DROP CONSTRAINT IF EXISTS pets_greeting_fr_max;

ALTER TABLE pets
  ADD CONSTRAINT pets_greeting_fr_max CHECK (
    greeting_fr IS NULL OR char_length(greeting_fr) <= 500
  );
