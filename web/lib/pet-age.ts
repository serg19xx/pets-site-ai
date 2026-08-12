/** Age label from ISO date (YYYY-MM-DD). Uses UTC so SSR and client match. */
export function formatPetAge(dateOfBirth: string, locale: string): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth)
  if (!parts) {
    return dateOfBirth
  }
  const bornYear = Number(parts[1])
  const bornMonth = Number(parts[2])
  const now = new Date()
  let years = now.getUTCFullYear() - bornYear
  let months = now.getUTCMonth() + 1 - bornMonth
  if (months < 0) {
    years -= 1
    months += 12
  }
  if (years < 0) {
    return dateOfBirth
  }
  if (years >= 2) {
    return new Intl.NumberFormat(locale, { style: 'unit', unit: 'year', unitDisplay: 'long' }).format(
      years,
    )
  }
  if (years === 1) {
    return new Intl.NumberFormat(locale, { style: 'unit', unit: 'year', unitDisplay: 'long' }).format(
      1,
    )
  }
  const totalMonths = years * 12 + months
  if (totalMonths < 1) {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'month')
  }
  return new Intl.NumberFormat(locale, { style: 'unit', unit: 'month', unitDisplay: 'long' }).format(
    totalMonths,
  )
}
