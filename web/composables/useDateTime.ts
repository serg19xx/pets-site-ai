import { detectBrowserTimeZone, formatDateTime } from '~/lib/format-datetime'
import { useAuthStore } from '~/stores/auth'

/**
 * Soft-launch timezone helper: prefer synced profile timezone, else browser.
 */
export function useDateTime() {
  const { locale } = useI18n()
  const auth = useAuthStore()

  const timeZone = computed(() => {
    return auth.user?.timezone || detectBrowserTimeZone()
  })

  function formatIso(iso: string) {
    return formatDateTime(iso, {
      locale: locale.value,
      timeZone: timeZone.value,
    })
  }

  return { timeZone, formatIso }
}
