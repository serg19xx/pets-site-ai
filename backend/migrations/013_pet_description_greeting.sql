-- Owner-written bio and short first-person greeting (generated on save).

ALTER TABLE pets
  ADD COLUMN description TEXT,
  ADD COLUMN greeting TEXT;

ALTER TABLE pets
  ADD CONSTRAINT pets_description_max CHECK (
    description IS NULL OR char_length(description) <= 2000
  );

ALTER TABLE pets
  ADD CONSTRAINT pets_greeting_max CHECK (
    greeting IS NULL OR char_length(greeting) <= 500
  );
