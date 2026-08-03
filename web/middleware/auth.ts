export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const localePath = useLocalePath()
  const config = useRuntimeConfig()

  if (!auth.isHydrated && import.meta.client) {
    auth.hydrateFromStorage()
  }

  if (!auth.isAuthenticated) {
    return navigateTo({
      path: localePath('/login'),
      query: { redirect: to.fullPath },
    })
  }

  if (auth.user?.isAdmin) {
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
  }

  if (
    auth.mustChangePassword &&
    to.path !== localePath('/app/auth/change-password') &&
    !to.path.endsWith('/app/auth/magic')
  ) {
    return navigateTo(localePath('/app/auth/change-password'))
  }
})
