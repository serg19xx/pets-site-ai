-- Profile/cover image is a gallery row (pets.cover_photo_id), not a separate upload.

ALTER TABLE pets
  ADD COLUMN cover_photo_id BIGINT REFERENCES pet_photos (id) ON DELETE SET NULL;

-- Move legacy avatar_path into gallery and set as cover.
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

UPDATE pets p
SET cover_photo_id = (
  SELECT pp.id
  FROM pet_photos pp
  WHERE pp.pet_id = p.id
  ORDER BY pp.sort_order ASC, pp.id ASC
  LIMIT 1
)
WHERE p.cover_photo_id IS NULL
  AND EXISTS (SELECT 1 FROM pet_photos pp WHERE pp.pet_id = p.id);
