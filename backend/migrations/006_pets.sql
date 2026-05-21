-- Pets owned by users; species and breed reference tables (seeded).

CREATE TYPE pet_sex AS ENUM ('male', 'female', 'unknown');

CREATE TABLE pet_species (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL
);

CREATE TABLE pet_breeds (
  id BIGSERIAL PRIMARY KEY,
  species_id BIGINT NOT NULL REFERENCES pet_species (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  UNIQUE (species_id, label)
);

CREATE INDEX pet_breeds_species_id_idx ON pet_breeds (species_id);

CREATE TABLE pets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species_id BIGINT NOT NULL REFERENCES pet_species (id),
  breed_id BIGINT REFERENCES pet_breeds (id) ON DELETE SET NULL,
  avatar_path TEXT,
  date_of_birth DATE NOT NULL,
  sex pet_sex NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pets_name_length CHECK (char_length(trim(name)) >= 1),
  CONSTRAINT pets_name_max CHECK (char_length(name) <= 200)
);

CREATE INDEX pets_user_id_idx ON pets (user_id);

-- Seed species
INSERT INTO pet_species (slug, label) VALUES
  ('cat', 'Cat'),
  ('dog', 'Dog'),
  ('snake', 'Snake'),
  ('elephant', 'Elephant'),
  ('rabbit', 'Rabbit'),
  ('bird', 'Bird'),
  ('hamster', 'Hamster');

-- Seed breeds (cats and dogs); other species have no rows — breed stays NULL on pet
INSERT INTO pet_breeds (species_id, label)
SELECT s.id, v.label
FROM (VALUES
  ('cat', 'Persian'),
  ('cat', 'Maine Coon'),
  ('cat', 'Siamese'),
  ('cat', 'British Shorthair'),
  ('cat', 'Domestic Shorthair'),
  ('dog', 'Labrador Retriever'),
  ('dog', 'German Shepherd'),
  ('dog', 'Golden Retriever'),
  ('dog', 'Bulldog'),
  ('dog', 'Mixed breed')
) AS v(species_slug, label)
JOIN pet_species s ON s.slug = v.species_slug;
