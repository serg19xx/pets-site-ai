/** Admins are not allowed on the member app — kick to admin console. */
export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore()
  const localePath = useLocalePath()
  const config = useRuntimeConfig()

  if (!auth.isHydrated && import.meta.client) {
    auth.hydrateFromStorage()
  }

  if (!auth.user?.isAdmin) {
    return
  }

  auth.signOut()
  if (import.meta.client) {
    const adminUrl = String(config.public.adminUrl || 'http://localhost:3001')
    window.location.href = adminUrl
    return abortNavigation()
  }
  return navigateTo({
    path: localePath('/login'),
    query: { adminOnly: '1' },
  })
})
