import { apiUrl } from '~/lib/api'
import { ApiError } from '~/lib/auth-api'

interface ApiErrorBody {
  code?: string
  message?: string
}

async function requestJson<T>(
  path: string,
  init: RequestInit & { accessToken: string },
): Promise<T> {
  const { accessToken, ...rest } = init
  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string> | undefined),
  }
  if (rest.body && !(rest.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  headers.Authorization = `Bearer ${accessToken}`
  const response = await fetch(apiUrl(path), { ...rest, headers })
  const text = await response.text()
  let body = {} as T & ApiErrorBody
  if (text) {
    try {
      body = JSON.parse(text) as T & ApiErrorBody
    } catch {
      throw new ApiError('Invalid server response', response.status, 'INVALID_RESPONSE')
    }
  }
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
  return body as T
}

export type AppNotificationType =
  | 'feature_announce'
  | 'feedback_reply'
  | 'feedback_decision'

export interface AppNotification {
  id: number
  type: AppNotificationType
  title: string
  body: string
  linkPath: string | null
  readAt: string | null
  createdAt: string
}

export async function fetchNotifications(
  accessToken: string,
  params?: { limit?: number; offset?: number; unreadOnly?: boolean },
): Promise<{ notifications: AppNotification[]; total: number; unreadCount: number }> {
  const search = new URLSearchParams()
  if (params?.limit !== undefined) {
    search.set('limit', String(params.limit))
  }
  if (params?.offset !== undefined) {
    search.set('offset', String(params.offset))
  }
  if (params?.unreadOnly) {
    search.set('unreadOnly', '1')
  }
  const qs = search.toString()
  return requestJson(`/api/notifications${qs ? `?${qs}` : ''}`, { accessToken })
}

export async function fetchUnreadNotificationCount(
  accessToken: string,
): Promise<{ unreadCount: number }> {
  return requestJson('/api/notifications/unread-count', { accessToken })
}

export async function markNotificationRead(
  notificationId: number,
  accessToken: string,
): Promise<{ notification: AppNotification }> {
  return requestJson(`/api/notifications/${notificationId}/read`, {
    method: 'POST',
    accessToken,
  })
}

export async function markAllNotificationsRead(
  accessToken: string,
): Promise<{ updated: number }> {
  return requestJson('/api/notifications/read-all', {
    method: 'POST',
    accessToken,
  })
}
