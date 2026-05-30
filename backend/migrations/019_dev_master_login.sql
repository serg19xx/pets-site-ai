-- Dev/test login (local only): email master@pets.local, password master (bcrypt, 12 rounds).
-- Idempotent: safe to re-run; refreshes password hash.

WITH upsert_user AS (
  INSERT INTO users (
    full_name,
    nickname,
    gender,
    date_of_birth,
    email,
    email_verified_at,
    show_full_name,
    show_nickname
  )
  VALUES (
    'Master',
    'master',
    'prefer_not_to_say',
    DATE '1990-01-01',
    'master@pets.local',
    NOW(),
    TRUE,
    TRUE
  )
  ON CONFLICT (email) DO UPDATE
  SET
    email_verified_at = COALESCE(users.email_verified_at, NOW()),
    updated_at = NOW()
  RETURNING id
)
INSERT INTO user_auth (user_id, password_hash, must_change_password)
SELECT
  id,
  '$2b$12$ylVxiMtgFM28vjjlueuV5ur2JejlIVauTpSQt.AZ9Bn3fcqkKDCD2',
  FALSE
FROM upsert_user
ON CONFLICT (user_id) DO UPDATE
SET
  password_hash = EXCLUDED.password_hash,
  must_change_password = FALSE,
  password_updated_at = NOW();
