-- Bilingual AI captions for gallery photos (PHOTO_POST drafts publish here).

ALTER TABLE pet_photos
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS caption_fr TEXT;

ALTER TABLE pet_photos
  DROP CONSTRAINT IF EXISTS pet_photos_caption_len;
ALTER TABLE pet_photos
  ADD CONSTRAINT pet_photos_caption_len
  CHECK (caption IS NULL OR char_length(caption) BETWEEN 1 AND 2000);

ALTER TABLE pet_photos
  DROP CONSTRAINT IF EXISTS pet_photos_caption_fr_len;
ALTER TABLE pet_photos
  ADD CONSTRAINT pet_photos_caption_fr_len
  CHECK (caption_fr IS NULL OR char_length(caption_fr) BETWEEN 1 AND 2000);

COMMENT ON COLUMN pet_photos.caption IS 'Pet-voice caption (EN); filled from AI PHOTO_POST draft.';
COMMENT ON COLUMN pet_photos.caption_fr IS 'Pet-voice caption (FR).';

-- Backfill from existing PHOTO_POST drafts (newest per photo).
UPDATE pet_photos pp
SET
  caption = d.body,
  caption_fr = d.body_fr
FROM (
  SELECT DISTINCT ON ((d.payload->>'photoId')::bigint)
    (d.payload->>'photoId')::bigint AS photo_id,
    d.body,
    d.body_fr
  FROM pet_ai_drafts d
  WHERE d.template_key = 'PHOTO_POST'
    AND d.payload ? 'photoId'
    AND (d.payload->>'photoId') ~ '^[0-9]+$'
  ORDER BY (d.payload->>'photoId')::bigint, d.created_at DESC, d.id DESC
) d
WHERE pp.id = d.photo_id
  AND pp.caption IS NULL;
