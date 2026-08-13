-- Owner↔owner friendships (request + accept). Separate from pet↔pet friendships.

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'friend_request';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'friend_accepted';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_friendship_status') THEN
    CREATE TYPE user_friendship_status AS ENUM ('pending', 'accepted');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_friendships (
  id BIGSERIAL PRIMARY KEY,
  user_a_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  user_b_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  requested_by_user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status user_friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ NULL,
  CONSTRAINT user_friendships_ordered CHECK (user_a_id < user_b_id),
  CONSTRAINT user_friendships_not_self CHECK (user_a_id <> user_b_id),
  CONSTRAINT user_friendships_requester_is_edge CHECK (
    requested_by_user_id = user_a_id OR requested_by_user_id = user_b_id
  ),
  CONSTRAINT user_friendships_pair UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS user_friendships_user_a_idx ON user_friendships (user_a_id, status);
CREATE INDEX IF NOT EXISTS user_friendships_user_b_idx ON user_friendships (user_b_id, status);
CREATE INDEX IF NOT EXISTS user_friendships_requester_idx
  ON user_friendships (requested_by_user_id, status);

COMMENT ON TABLE user_friendships IS
  'Mutual owner friendships. Pending until the other member accepts. Not pet↔pet friendship.';
