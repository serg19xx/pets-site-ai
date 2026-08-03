export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  if (!auth.isHydrated) {
    auth.hydrateFromStorage()
  }
  if (to.path === '/login') {
    if (auth.isAuthenticated) {
      return navigateTo('/feedback')
    }
    return
  }
  if (!auth.isAuthenticated) {
    return navigateTo('/login')
  }
})
