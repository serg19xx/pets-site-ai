-- Undirected pet↔pet friendships (canonical pet_a_id < pet_b_id).
-- See docs/petsbook-ai-ecosystem.md § Pet-to-Pet / NEW_FRIEND.

CREATE TABLE IF NOT EXISTS pet_friendships (
  pet_a_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  pet_b_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  initiated_by_pet_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  created_by_user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pet_a_id, pet_b_id),
  CONSTRAINT pet_friendships_ordered CHECK (pet_a_id < pet_b_id),
  CONSTRAINT pet_friendships_initiated_is_edge CHECK (
    initiated_by_pet_id = pet_a_id OR initiated_by_pet_id = pet_b_id
  )
);

CREATE INDEX IF NOT EXISTS pet_friendships_pet_a_idx ON pet_friendships (pet_a_id);
CREATE INDEX IF NOT EXISTS pet_friendships_pet_b_idx ON pet_friendships (pet_b_id);
CREATE INDEX IF NOT EXISTS pet_friendships_initiated_idx ON pet_friendships (initiated_by_pet_id);

COMMENT ON TABLE pet_friendships IS
  'Mutual undirected friendships between same-species pets only (owner entertainment / pet world). '
  'Does NOT imply owner friendship, follow, or any human social obligation — that is a separate feature. '
  'Owners may observe pet activity and receive pet recommendations separately.';
