-- Additional photos per pet (avatar remains on pets.avatar_path).

CREATE TABLE pet_photos (
  id BIGSERIAL PRIMARY KEY,
  pet_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX pet_photos_pet_id_sort_idx ON pet_photos (pet_id, sort_order, id);
