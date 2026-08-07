import { apiUrl } from '~/lib/api'
import { ApiError } from '~/lib/auth-api'
import type { PetFriendSummary } from '~/types/gallery'

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
    throw new ApiError(
      body.message ?? 'Request failed',
      response.status,
      body.code,
    )
  }
  return body as T
}

export async function createPetFriendship(
  fromPetId: number,
  friendPetId: number,
  accessToken: string,
): Promise<{ friends: PetFriendSummary[] }> {
  return requestJson(`/api/pets/${fromPetId}/friends`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ friendPetId }),
  })
}

export async function deletePetFriendship(
  petId: number,
  friendPetId: number,
  accessToken: string,
): Promise<void> {
  const response = await fetch(
    apiUrl(`/api/pets/${petId}/friends/${friendPetId}`),
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )
  if (response.status === 204) {
    return
  }
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody
  throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
}

export interface PetFriendshipSuggestion {
  id: number
  fromPetId: number
  toPetId: number
  status: string
  createdAt: string
  candidate: PetFriendSummary
}

export async function listFriendshipSuggestions(
  petId: number,
  accessToken: string,
): Promise<{ suggestions: PetFriendshipSuggestion[] }> {
  return requestJson(`/api/pets/${petId}/friend-suggestions`, {
    method: 'GET',
    accessToken,
  })
}

export async function generateFriendshipSuggestions(
  petId: number,
  accessToken: string,
): Promise<{ suggestions: PetFriendshipSuggestion[] }> {
  return requestJson(`/api/pets/${petId}/friend-suggestions/generate`, {
    method: 'POST',
    accessToken,
  })
}

export async function approveFriendshipSuggestion(
  petId: number,
  suggestionId: number,
  accessToken: string,
): Promise<{ friends: PetFriendSummary[] }> {
  return requestJson(
    `/api/pets/${petId}/friend-suggestions/${suggestionId}/approve`,
    { method: 'POST', accessToken },
  )
}

export async function declineFriendshipSuggestion(
  petId: number,
  suggestionId: number,
  accessToken: string,
): Promise<void> {
  const response = await fetch(
    apiUrl(`/api/pets/${petId}/friend-suggestions/${suggestionId}/decline`),
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )
  if (response.status === 204) {
    return
  }
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody
  throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
}
