-- Community feed: simple posts with optional text + image/video media.

CREATE TABLE posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT posts_body_len CHECK (body IS NULL OR char_length(body) <= 5000)
);

CREATE INDEX posts_created_at_idx ON posts (created_at DESC);
CREATE INDEX posts_user_id_idx ON posts (user_id);

CREATE TABLE post_media (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  path TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT post_media_kind_check CHECK (kind IN ('image', 'video'))
);

CREATE INDEX post_media_post_id_idx ON post_media (post_id, sort_order);

CREATE TABLE post_likes (
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX post_likes_post_id_idx ON post_likes (post_id);

CREATE TABLE post_saves (
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX post_saves_user_id_idx ON post_saves (user_id, created_at DESC);

CREATE TABLE post_comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT post_comments_body_len CHECK (char_length(body) >= 1 AND char_length(body) <= 2000)
);

CREATE INDEX post_comments_post_id_idx ON post_comments (post_id, created_at ASC);
