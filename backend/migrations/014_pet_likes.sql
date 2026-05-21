-- Per-member likes on public gallery pets (one like per user per pet).

CREATE TABLE pet_likes (
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  pet_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, pet_id)
);

CREATE INDEX pet_likes_pet_id_idx ON pet_likes (pet_id);
