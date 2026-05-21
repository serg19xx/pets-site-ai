import { apiUrl } from '~/lib/api'

/** Resolve API-hosted image path (e.g. /api/uploads/avatars/…). */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return apiUrl(path.startsWith('/') ? path : `/${path}`)
}
