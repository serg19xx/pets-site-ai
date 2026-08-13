import { apiUrl } from '~/lib/api'
import { ApiError } from '~/lib/auth-api'
import type { PublicMember } from '~/types/public-member'

export type FriendRelationStatus = 'none' | 'outgoing' | 'incoming' | 'friends' | 'self'

export interface FriendMember extends PublicMember {
  since: string | null
}

export interface FriendRequestMember extends PublicMember {
  requestedAt: string
}

export interface FriendsOverview {
  friends: FriendMember[]
  incoming: FriendRequestMember[]
  outgoing: FriendRequestMember[]
}

interface ApiErrorBody {
  code?: string
  message?: string
}

async function requestJson<T>(
  path: string,
  init: RequestInit & { accessToken: string },
): Promise<T> {
  const { accessToken, ...fetchInit } = init
  const hasBody = fetchInit.body != null && fetchInit.body !== ''
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    ...(fetchInit.headers as Record<string, string> | undefined),
  }
  if (hasBody) {
    headers['Content-Type'] = 'application/json'
  }
  const response = await fetch(apiUrl(path), {
    ...fetchInit,
    headers,
  })
  const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
  return body as T
}

export async function fetchFriendsOverview(accessToken: string): Promise<FriendsOverview> {
  return requestJson('/api/friends', { method: 'GET', accessToken })
}

export async function fetchFriendStatus(
  userId: number,
  accessToken: string,
): Promise<{ status: FriendRelationStatus }> {
  return requestJson(`/api/friends/status/${userId}`, { method: 'GET', accessToken })
}

export async function sendFriendRequest(
  userId: number,
  accessToken: string,
): Promise<{ status: FriendRelationStatus }> {
  return requestJson('/api/friends', {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ userId }),
  })
}

export async function acceptFriendRequest(
  userId: number,
  accessToken: string,
): Promise<{ status: FriendRelationStatus }> {
  return requestJson(`/api/friends/${userId}/accept`, { method: 'POST', accessToken })
}

export async function declineFriendRequest(
  userId: number,
  accessToken: string,
): Promise<void> {
  await requestJson(`/api/friends/${userId}/decline`, { method: 'POST', accessToken })
}

export async function removeFriend(
  userId: number,
  accessToken: string,
): Promise<void> {
  const response = await fetch(apiUrl(`/api/friends/${userId}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (response.status === 204) {
    return
  }
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody
  throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
}
