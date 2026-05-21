-- Pets with gallery rows but no cover (e.g. before auto-cover) should appear in public gallery.
UPDATE pets p
SET cover_photo_id = (
  SELECT pp.id
  FROM pet_photos pp
  WHERE pp.pet_id = p.id
  ORDER BY pp.sort_order ASC, pp.id ASC
  LIMIT 1
),
updated_at = NOW()
WHERE p.cover_photo_id IS NULL
  AND EXISTS (SELECT 1 FROM pet_photos pp WHERE pp.pet_id = p.id);
