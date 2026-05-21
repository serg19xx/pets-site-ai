-- Profile and pet images (path relative to uploads root, e.g. avatars/user-1.webp).

ALTER TABLE users
  ADD COLUMN avatar_path TEXT;

COMMENT ON COLUMN users.avatar_path IS 'Relative path under uploads/ (avatars/…). NULL = use initial letter.';
