/**
 * Gallery surface voice rules: one active message per pet, older kept archived.
 */

/** How long the "New" badge stays after a draft becomes the surface voice. */
export const VOICE_NEW_BADGE_MS = 3 * 24 * 60 * 60 * 1000

/** Days without a fresh surface event before an idle musing may be generated. */
export const IDLE_MUSING_AFTER_DAYS = 5

/** Quiet-period filler — replaces the bubble but must not look like a fresh event. */
export const VOICE_NEW_EXCLUDED_TEMPLATES = new Set(['IDLE_MUSING'])

/** Templates that replace the gallery voice bubble (not photo captions / friend chat). */
export const SURFACE_VOICE_TEMPLATE_KEYS = new Set([
  'SELF_INTRODUCTION',
  'FIRST_DAY',
  'MY_OWNER',
  'GOOD_MORNING',
  'GOOD_NIGHT',
  'QUESTION_TO_FRIENDS',
  'FUNNY_STORY',
  'THANK_YOU',
  'BIRTHDAY',
  'COMPETITION',
  'BREEDING',
  'VETERINARY_VISIT',
  'NEW_FRIEND',
  'IDLE_MUSING',
])

export function isSurfaceVoiceTemplate(templateKey: string): boolean {
  return SURFACE_VOICE_TEMPLATE_KEYS.has(templateKey)
}

export function shouldShowVoiceNewBadge(templateKey: string | null | undefined): boolean {
  if (!templateKey) {
    return true
  }
  return !VOICE_NEW_EXCLUDED_TEMPLATES.has(templateKey)
}

export function isVoiceNew(
  surfacedAt: string | Date | null | undefined,
  now = Date.now(),
  templateKey?: string | null,
): boolean {
  if (!shouldShowVoiceNewBadge(templateKey)) {
    return false
  }
  if (!surfacedAt) {
    return false
  }
  const t = surfacedAt instanceof Date ? surfacedAt.getTime() : Date.parse(String(surfacedAt))
  if (Number.isNaN(t)) {
    return false
  }
  return now - t <= VOICE_NEW_BADGE_MS
}
