-- Surface voice for gallery cards: one active message per pet; older drafts kept archived (not deleted).
-- "New" badge = surfaced_at within the last 3 days (enforced in API).

ALTER TABLE pet_ai_drafts
  ADD COLUMN IF NOT EXISTS is_surface BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS surfaced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN pet_ai_drafts.is_surface IS
  'True for the single draft currently shown as the pet gallery voice bubble.';
COMMENT ON COLUMN pet_ai_drafts.surfaced_at IS
  'When this draft became the surface voice; used for the 3-day New badge.';
COMMENT ON COLUMN pet_ai_drafts.archived_at IS
  'When this draft was superseded by a newer surface voice; row is kept for memory.';

-- At most one surface draft per pet.
CREATE UNIQUE INDEX IF NOT EXISTS pet_ai_drafts_one_surface_per_pet_idx
  ON pet_ai_drafts (pet_id)
  WHERE is_surface = TRUE;

-- Backfill: latest eligible event voice (not photo captions / friend chat turns).
WITH ranked AS (
  SELECT
    id,
    pet_id,
    ROW_NUMBER() OVER (
      PARTITION BY pet_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM pet_ai_drafts
  WHERE status IN ('ready', 'published')
    AND template_key NOT IN ('PHOTO_POST', 'FRIEND_HELLO', 'FRIEND_REPLY')
)
UPDATE pet_ai_drafts d
SET
  is_surface = TRUE,
  -- Do not treat historical backfill as "New" (badge is only for freshly activated voices).
  surfaced_at = COALESCE(d.surfaced_at, d.created_at) - INTERVAL '4 days',
  archived_at = NULL,
  updated_at = NOW()
FROM ranked r
WHERE d.id = r.id
  AND r.rn = 1
  AND d.is_surface = FALSE;
