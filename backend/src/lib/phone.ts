/**
 * Normalize a phone string for SMS providers (E.164).
 * Defaults to +1 for 10-digit North American numbers (project default currency CAD).
 */
export function normalizeSmsPhone(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '')
    return digits.length >= 8 ? `+${digits}` : null
  }

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+1${digits}`
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  if (digits.length >= 8) {
    return `+${digits}`
  }

  return null
}
