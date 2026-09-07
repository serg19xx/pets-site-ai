-- Idle musings replace the gallery bubble but are not "New" events.
-- Age out badges left by the bulk IDLE_MUSING sweep so New only means a real surface event.

UPDATE pet_ai_drafts
SET
  surfaced_at = created_at - INTERVAL '4 days',
  updated_at = NOW()
WHERE is_surface = TRUE
  AND template_key = 'IDLE_MUSING'
  AND surfaced_at IS NOT NULL
  AND surfaced_at > NOW() - INTERVAL '3 days';
