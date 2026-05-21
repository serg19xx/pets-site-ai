-- Demo pets for UI/testing: no avatar (SVG placeholders in app), varied species and sex.
-- Round-robin across all users (by `users.id`). Idempotent per user + name.
-- If there are no users or no species, inserts nothing.

WITH
  ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 AS ord
    FROM users
  ),
  ucount AS (SELECT COUNT(*)::int AS c FROM ranked),
  species_count AS (SELECT COUNT(*)::int AS n FROM pet_species),
  series AS (SELECT generate_series(1, 50) AS i)
INSERT INTO pets (user_id, name, species_id, breed_id, avatar_path, date_of_birth, sex)
SELECT
  u.id,
  'Seed Pet ' || lpad(s.i::text, 3, '0'),
  sp.id,
  NULL,
  NULL,
  (DATE '2016-06-01' + ((s.i * 19) % 2900))::date,
  (ARRAY['male', 'female', 'unknown']::pet_sex[])[1 + ((s.i - 1) % 3)]
FROM series s
CROSS JOIN species_count sc
CROSS JOIN ucount uc
JOIN ranked u ON u.ord = ((s.i - 1) % uc.c)
JOIN LATERAL (
  SELECT id
  FROM pet_species
  ORDER BY id
  LIMIT 1 OFFSET ((s.i - 1) % GREATEST(sc.n, 1))
) sp ON sc.n >= 1
WHERE uc.c >= 1
  AND sc.n >= 1
  AND NOT EXISTS (
    SELECT 1
    FROM pets p
    WHERE p.user_id = u.id
      AND p.name = 'Seed Pet ' || lpad(s.i::text, 3, '0')
  );
