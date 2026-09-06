import { fetchMe } from '~/lib/auth-api'
import { loadAuthFromStorage, saveAuthToStorage } from '~/lib/auth-storage'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin((nuxtApp) => {
  const auth = useAuthStore()
  const authUiReady = useState('auth-ui-ready', () => false)

  auth.hydrateFromStorage()

  const stored = loadAuthFromStorage()
  if (stored?.accessToken) {
    void fetchMe(stored.accessToken)
      .then((session) => {
        auth.setSession({
          accessToken: stored.accessToken,
          user: session.user,
          mustChangePassword: session.mustChangePassword,
        })
      })
      .catch(() => {
        saveAuthToStorage(null)
        auth.signOut()
      })
  }

  // Must wait until Suspense hydration finishes. Setting this on app:mounted
  // (even behind rAF) flips HeaderAuth/AppAside while SSR HTML is still
  // hydrating → "Hydration completed but contains mismatches" on SSR pages.
  nuxtApp.hook('app:suspense:resolve', () => {
    authUiReady.value = true
  })

  window.addEventListener('storage', (event) => {
    if (event.key === 'pets_auth' || event.key === null) {
      auth.hydrateFromStorage()
    }
  })
})
