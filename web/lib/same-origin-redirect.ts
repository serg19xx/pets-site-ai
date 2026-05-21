/** Stay on the current site origin after login. Never send users back to /login. */
export function resolveSameOriginRedirect(redirectParam: string | null | undefined): string {
  if (!redirectParam) {
    return '/'
  }
  try {
    const target = new URL(redirectParam, window.location.origin)
    const path = `${target.pathname}${target.search}` || '/'
    if (path === '/login' || path.startsWith('/login?')) {
      return '/'
    }
    if (target.origin === window.location.origin) {
      return path
    }
    return path.startsWith('/') ? path : '/'
  } catch {
    return '/'
  }
}
