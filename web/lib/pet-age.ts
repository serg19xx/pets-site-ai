/** Age label from ISO date (YYYY-MM-DD). */
export function formatPetAge(dateOfBirth: string, locale: string): string {
  const born = new Date(`${dateOfBirth}T12:00:00`)
  if (Number.isNaN(born.getTime())) {
    return dateOfBirth
  }
  const now = new Date()
  let years = now.getFullYear() - born.getFullYear()
  let months = now.getMonth() - born.getMonth()
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
