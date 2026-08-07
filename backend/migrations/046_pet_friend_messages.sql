-- Short pet↔pet replica exchange after friendship (not a full chat).
-- One hello + one reply per friendship to keep OpenAI cost low.

CREATE TABLE IF NOT EXISTS pet_friend_messages (
  id BIGSERIAL PRIMARY KEY,
  pet_a_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  pet_b_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  speaker_pet_id BIGINT NOT NULL REFERENCES pets (id) ON DELETE CASCADE,
  turn SMALLINT NOT NULL,
  body TEXT NOT NULL,
  body_fr TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pet_friend_messages_ordered CHECK (pet_a_id < pet_b_id),
  CONSTRAINT pet_friend_messages_turn_check CHECK (turn IN (1, 2)),
  CONSTRAINT pet_friend_messages_speaker_edge CHECK (
    speaker_pet_id = pet_a_id OR speaker_pet_id = pet_b_id
  ),
  CONSTRAINT pet_friend_messages_body_len CHECK (char_length(body) BETWEEN 1 AND 500),
  CONSTRAINT pet_friend_messages_body_fr_len CHECK (char_length(body_fr) BETWEEN 1 AND 500),
  CONSTRAINT pet_friend_messages_pair_turn UNIQUE (pet_a_id, pet_b_id, turn)
);

CREATE INDEX IF NOT EXISTS pet_friend_messages_pet_a_idx
  ON pet_friend_messages (pet_a_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pet_friend_messages_pet_b_idx
  ON pet_friend_messages (pet_b_id, created_at DESC);

COMMENT ON TABLE pet_friend_messages IS
  'One short hello+reply exchange when pets become friends. Not a full dialogue thread.';
