-- Re-run PHOTO_POST → pet_photos caption backfill (040 may have run before drafts existed).
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
    AND NULLIF(BTRIM(d.payload->>'photoId'), '') IS NOT NULL
    AND char_length(d.body) BETWEEN 1 AND 2000
    AND char_length(d.body_fr) BETWEEN 1 AND 2000
  ORDER BY (d.payload->>'photoId')::bigint, d.created_at DESC, d.id DESC
) d
WHERE pp.id = d.photo_id
  AND pp.caption IS NULL;
