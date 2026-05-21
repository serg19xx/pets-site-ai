/** /app/auth — only register and password reset; login lives at /login. */
export default defineNuxtRouteMiddleware((to) => {
  const localePath = useLocalePath()
  const mode = to.query.mode
  if (mode !== 'register' && mode !== 'reset') {
    return navigateTo({
      path: localePath('/login'),
      query: {
        redirect: typeof to.query.redirect === 'string' ? to.query.redirect : to.fullPath,
      },
    })
  }
})
