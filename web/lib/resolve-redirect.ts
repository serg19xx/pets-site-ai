/**
 * After login, stay on the current origin (e.g. :3000 proxy).
 * Stale redirects from another port become a path on the current host.
 */
export function resolvePostLoginPath(redirect: unknown, fallback = '/app/profile'): string {
  if (typeof redirect !== 'string' || redirect.length === 0) {
    return fallback
  }

  if (redirect.startsWith('/')) {
    return redirect
  }

  try {
    const target = new URL(redirect)
    const here = typeof window !== 'undefined' ? window.location : null

    if (here && target.origin === here.origin) {
      return `${target.pathname}${target.search}`
    }

    if (
      here &&
      (target.hostname === 'localhost' || target.hostname === '127.0.0.1') &&
      target.port !== here.port
    ) {
      return `${target.pathname}${target.search}` || '/'
    }
  } catch {
    return fallback
  }

  return fallback
}
