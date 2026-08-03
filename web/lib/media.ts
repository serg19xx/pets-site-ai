/** Resolve API-hosted image path for browser <img src> (e.g. /api/uploads/avatars/…). */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  // Always same-origin / public apiBase — never apiInternal (Docker host is unreachable in the browser).
  const normalized = path.startsWith('/') ? path : `/${path}`
  const config = useRuntimeConfig()
  const base = String(config.public.apiBase ?? '').replace(/\/$/, '')
  if (base) {
    return `${base}${normalized}`
  }
  return normalized
}
