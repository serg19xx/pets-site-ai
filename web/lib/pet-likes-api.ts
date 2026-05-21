import { apiUrl } from '~/lib/api'
import { ApiError } from '~/lib/auth-api'

export interface PetLikeStatus {
  liked: boolean
  count: number
}

interface ApiErrorBody {
  code?: string
  message?: string
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export async function fetchPetLikeStatus(
  petId: number,
  accessToken?: string | null,
): Promise<PetLikeStatus> {
  const headers: HeadersInit = {}
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }
  const response = await fetch(apiUrl(`/api/gallery/pets/${petId}/like`), { headers })
  const body = await parseJson<PetLikeStatus & ApiErrorBody>(response)
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
  return body
}

export async function togglePetLike(
  petId: number,
  accessToken: string,
): Promise<PetLikeStatus> {
  const response = await fetch(apiUrl(`/api/gallery/pets/${petId}/like`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const body = await parseJson<PetLikeStatus & ApiErrorBody>(response)
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
  return body
}
