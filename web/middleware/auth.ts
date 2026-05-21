export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const localePath = useLocalePath()

  if (!auth.isHydrated && import.meta.client) {
    auth.hydrateFromStorage()
  }

  if (!auth.isAuthenticated) {
    return navigateTo({
      path: localePath('/login'),
      query: { redirect: to.fullPath },
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
