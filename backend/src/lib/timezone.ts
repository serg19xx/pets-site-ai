import { AppError } from './errors.js'

const TIMEZONE_MAX_LENGTH = 64

/** Validate an IANA timezone id (e.g. America/Toronto). */
export function assertValidTimeZone(timezone: string): string {
  const trimmed = timezone.trim()
  if (!trimmed || trimmed.length > TIMEZONE_MAX_LENGTH) {
    throw new AppError(400, 'Invalid timezone', 'VALIDATION_ERROR')
  }

  try {
    Intl.DateTimeFormat('en-US', { timeZone: trimmed })
  } catch {
    throw new AppError(400, 'Invalid timezone', 'VALIDATION_ERROR')
  }

  return trimmed
}
