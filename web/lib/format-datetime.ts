/** Detect the browser IANA timezone (e.g. America/Toronto). */
export function detectBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export interface FormatDateTimeOptions {
  locale: string
  /** IANA timezone; falls back to the runtime default when omitted. */
  timeZone?: string | null
  dateStyle?: Intl.DateTimeFormatOptions['dateStyle']
  timeStyle?: Intl.DateTimeFormatOptions['timeStyle']
}

/** Format an ISO UTC timestamp in the given locale + timezone. */
export function formatDateTime(
  iso: string,
  { locale, timeZone, dateStyle = 'medium', timeStyle = 'short' }: FormatDateTimeOptions,
): string {
  const options: Intl.DateTimeFormatOptions = { dateStyle, timeStyle }
  if (timeZone) {
    options.timeZone = timeZone
  }
  return new Date(iso).toLocaleString(locale, options)
}
