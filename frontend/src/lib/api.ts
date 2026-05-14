/** Base URL for API (no trailing slash). Empty = same-origin + Vite `/api` proxy. */
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * Build a URL for API calls. When `VITE_API_BASE_URL` is unset, returns a root-relative path
 * so the dev server proxy can forward `/api` to the backend.
 */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (!apiBaseUrl) {
    return normalized
  }
  return `${apiBaseUrl.replace(/\/$/, '')}${normalized}`
}
