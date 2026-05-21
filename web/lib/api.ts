/** Build URL for API calls. Server-side uses internal backend; client uses same-origin /api. */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (import.meta.server) {
    const config = useRuntimeConfig()
    const internal = String(config.apiInternal ?? 'http://127.0.0.1:8080').replace(/\/$/, '')
    return `${internal}${normalized}`
  }
  const config = useRuntimeConfig()
  const base = String(config.public.apiBase ?? '').replace(/\/$/, '')
  if (base) {
    return `${base}${normalized}`
  }
  return normalized
}
