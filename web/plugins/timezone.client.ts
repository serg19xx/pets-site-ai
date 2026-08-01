import { syncTimezone } from '~/lib/auth-api'
import { detectBrowserTimeZone } from '~/lib/format-datetime'
import { useAuthStore } from '~/stores/auth'

/**
 * Soft-launch: keep users.timezone aligned with the browser IANA zone.
 * Runs after session hydrate / login; no-op for guests.
 */
export default defineNuxtPlugin(() => {
  const auth = useAuthStore()
  let syncInFlight: Promise<void> | null = null
  let lastSynced: string | null = null

  async function syncIfNeeded() {
    if (!auth.isAuthenticated || !auth.accessToken || !auth.user) {
      return
    }

    const detected = detectBrowserTimeZone()
    if (!detected) {
      return
    }

    if (auth.user.timezone === detected || lastSynced === detected) {
      return
    }

    if (syncInFlight) {
      return syncInFlight
    }

    syncInFlight = (async () => {
      try {
        const { user } = await syncTimezone(auth.accessToken!, detected)
        auth.updateUser(user)
        lastSynced = detected
      } catch {
        // Non-blocking for soft launch — UI still uses browser TZ via useDateTime.
      } finally {
        syncInFlight = null
      }
    })()

    return syncInFlight
  }

  watch(
    () => [auth.isAuthenticated, auth.user?.id, auth.user?.timezone] as const,
    () => {
      void syncIfNeeded()
    },
    { immediate: true },
  )
})
