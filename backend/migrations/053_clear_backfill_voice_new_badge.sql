-- Clear false "New" badges from the initial surface-voice backfill.
-- Only freshly activated voices (activateSurfaceDraft → surfaced_at = NOW()) should show New.

UPDATE pet_ai_drafts
SET
  surfaced_at = created_at - INTERVAL '4 days',
  updated_at = NOW()
WHERE is_surface = TRUE
  AND surfaced_at IS NOT NULL
  AND surfaced_at > NOW() - INTERVAL '3 days';
