import { apiUrl } from '~/lib/api'
import { ApiError } from '~/lib/auth-api'
import type { FeedComment, FeedPost, PostEngagement } from '~/types/feed'

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

interface ApiErrorBody {
  code?: string
  message?: string
}

function authHeaders(accessToken?: string): HeadersInit {
  const headers: Record<string, string> = {}
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }
  return headers
}

async function requestJson<T>(
  path: string,
  init: RequestInit & { accessToken?: string },
): Promise<T> {
  const { accessToken, ...rest } = init
  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string> | undefined),
  }
  if (rest.body && !(rest.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  Object.assign(headers, authHeaders(accessToken) as Record<string, string>)

  const response = await fetch(apiUrl(path), { ...rest, headers })
  const body = await parseJson<T & ApiErrorBody>(response)
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
  return body as T
}

export async function fetchFeedPosts(
  options: { limit?: number; offset?: number; accessToken?: string } = {},
): Promise<{ posts: FeedPost[]; total: number }> {
  const params = new URLSearchParams()
  if (options.limit !== undefined) {
    params.set('limit', String(options.limit))
  }
  if (options.offset !== undefined) {
    params.set('offset', String(options.offset))
  }
  const qs = params.toString()
  return requestJson(`/api/feed/posts${qs ? `?${qs}` : ''}`, {
    accessToken: options.accessToken,
  })
}

export async function createFeedPost(
  accessToken: string,
  payload: { body: string; files: File[] },
): Promise<{ post: FeedPost }> {
  const form = new FormData()
  const trimmed = payload.body.trim()
  if (trimmed) {
    form.append('body', trimmed)
  }
  for (const file of payload.files) {
    form.append('files', file)
  }

  return requestJson('/api/feed/posts', {
    method: 'POST',
    accessToken,
    body: form,
  })
}

export async function toggleFeedPostLike(
  postId: number,
  accessToken: string,
): Promise<PostEngagement> {
  return requestJson(`/api/feed/posts/${postId}/like`, {
    method: 'POST',
    accessToken,
  })
}

export async function toggleFeedPostSave(
  postId: number,
  accessToken: string,
): Promise<{ saved: boolean }> {
  return requestJson(`/api/feed/posts/${postId}/save`, {
    method: 'POST',
    accessToken,
  })
}

export async function fetchPostComments(postId: number): Promise<{ comments: FeedComment[] }> {
  return requestJson(`/api/feed/posts/${postId}/comments`, {})
}

export async function createPostComment(
  postId: number,
  accessToken: string,
  body: string,
): Promise<{ comment: FeedComment }> {
  return requestJson(`/api/feed/posts/${postId}/comments`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ body }),
  })
}

export async function fetchMyFeedPosts(
  accessToken: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ posts: FeedPost[]; total: number }> {
  const params = new URLSearchParams()
  if (options.limit !== undefined) {
    params.set('limit', String(options.limit))
  }
  if (options.offset !== undefined) {
    params.set('offset', String(options.offset))
  }
  const qs = params.toString()
  return requestJson(`/api/feed/posts/mine${qs ? `?${qs}` : ''}`, { accessToken })
}

export async function fetchSavedFeedPosts(
  accessToken: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ posts: FeedPost[]; total: number }> {
  const params = new URLSearchParams()
  if (options.limit !== undefined) {
    params.set('limit', String(options.limit))
  }
  if (options.offset !== undefined) {
    params.set('offset', String(options.offset))
  }
  const qs = params.toString()
  return requestJson(`/api/feed/posts/saved${qs ? `?${qs}` : ''}`, { accessToken })
}

export async function updateFeedPost(
  postId: number,
  accessToken: string,
  body: string,
): Promise<{ post: FeedPost }> {
  return requestJson(`/api/feed/posts/${postId}`, {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify({ body }),
  })
}

export async function deleteFeedPost(postId: number, accessToken: string): Promise<void> {
  const response = await fetch(apiUrl(`/api/feed/posts/${postId}`), {
    method: 'DELETE',
    headers: authHeaders(accessToken) as Record<string, string>,
  })
  if (!response.ok && response.status !== 204) {
    const body = await parseJson<ApiErrorBody>(response)
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
}

export async function deletePostComment(
  postId: number,
  commentId: number,
  accessToken: string,
): Promise<void> {
  const response = await fetch(apiUrl(`/api/feed/posts/${postId}/comments/${commentId}`), {
    method: 'DELETE',
    headers: authHeaders(accessToken) as Record<string, string>,
  })
  if (!response.ok && response.status !== 204) {
    const body = await parseJson<ApiErrorBody>(response)
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
}
