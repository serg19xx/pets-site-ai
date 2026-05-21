-- pets.avatar_path is replaced by cover_photo_id → pet_photos.path (see 010).

-- Idempotent: ensure any remaining legacy paths are in the gallery before drop.
INSERT INTO pet_photos (pet_id, path, sort_order)
SELECT p.id, p.avatar_path, 0
FROM pets p
WHERE p.avatar_path IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM pet_photos pp
    WHERE pp.pet_id = p.id AND pp.path = p.avatar_path
  );

UPDATE pets p
SET cover_photo_id = (
  SELECT pp.id
  FROM pet_photos pp
  WHERE pp.pet_id = p.id AND pp.path = p.avatar_path
  ORDER BY pp.id
  LIMIT 1
)
WHERE p.avatar_path IS NOT NULL
  AND p.cover_photo_id IS NULL;

ALTER TABLE pets
  DROP COLUMN IF EXISTS avatar_path;
