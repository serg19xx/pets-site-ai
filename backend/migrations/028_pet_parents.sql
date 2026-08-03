-- Beta MVP: one dam and one sire per pet (sources may change after tester feedback).

CREATE TYPE pet_parent_role AS ENUM ('dam', 'sire');
CREATE TYPE pet_parent_source AS ENUM ('owned_pet', 'site_pet', 'external');

CREATE TABLE pet_parents (
  id BIGSERIAL PRIMARY KEY,
  pet_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  role pet_parent_role NOT NULL,
  source pet_parent_source NOT NULL,
  linked_pet_id BIGINT NULL REFERENCES pets (id) ON DELETE SET NULL,
  name TEXT NULL,
  breed_label TEXT NULL,
  notes TEXT NULL,
  photo_path TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pet_parents_pet_role_unique UNIQUE (pet_id, role),
  CONSTRAINT pet_parents_not_self CHECK (
    linked_pet_id IS NULL OR linked_pet_id <> pet_id
  ),
  CONSTRAINT pet_parents_link_or_external CHECK (
    (
      source IN ('owned_pet', 'site_pet')
      AND linked_pet_id IS NOT NULL
    )
    OR (
      source = 'external'
      AND linked_pet_id IS NULL
      AND name IS NOT NULL
      AND char_length(trim(name)) >= 1
    )
  ),
  CONSTRAINT pet_parents_name_max CHECK (name IS NULL OR char_length(name) <= 200),
  CONSTRAINT pet_parents_breed_max CHECK (
    breed_label IS NULL OR char_length(breed_label) <= 200
  ),
  CONSTRAINT pet_parents_notes_max CHECK (notes IS NULL OR char_length(notes) <= 2000)
);

CREATE INDEX pet_parents_linked_pet_id_idx ON pet_parents (linked_pet_id)
  WHERE linked_pet_id IS NOT NULL;

COMMENT ON TABLE pet_parents IS
  'Beta pedigree: at most one dam and one sire per pet; link to site pets or external manual entry.';
