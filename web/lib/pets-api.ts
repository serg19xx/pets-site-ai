import { apiUrl } from '~/lib/api'
import { ApiError } from '~/lib/auth-api'
import type { GalleryPet } from '~/types/gallery'
import type { PublicMember } from '~/types/public-member'
import type { PetPhoto } from '~/types/pet-photo'
import type { Pet, PetBreedListItem, PetSex, PetSpeciesListItem } from '~/types/pet'

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

interface ApiErrorBody {
  code?: string
  message?: string
}

function authHeaders(accessToken: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  }
}

async function requestJson<T>(
  path: string,
  init: RequestInit & { accessToken: string },
): Promise<T> {
  const { accessToken, ...rest } = init
  const response = await fetch(apiUrl(path), {
    ...rest,
    headers: {
      ...authHeaders(accessToken),
      ...(rest.headers as Record<string, string> | undefined),
    },
  })
  const body = await parseJson<T & ApiErrorBody>(response)
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
  return body as T
}

export async function fetchPetSpecies(): Promise<{ species: PetSpeciesListItem[] }> {
  const response = await fetch(apiUrl('/api/pets/species'))
  const body = await parseJson<{ species: PetSpeciesListItem[] } & ApiErrorBody>(response)
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
  return body
}

export async function fetchPetBreeds(speciesId: number): Promise<{ breeds: PetBreedListItem[] }> {
  const response = await fetch(apiUrl(`/api/pets/species/${speciesId}/breeds`))
  const body = await parseJson<{ breeds: PetBreedListItem[] } & ApiErrorBody>(response)
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
  return body
}

export async function fetchGalleryPets(params?: {
  limit?: number
  offset?: number
  accessToken?: string
}): Promise<{ pets: GalleryPet[]; total: number }> {
  const search = new URLSearchParams()
  if (params?.limit !== undefined) {
    search.set('limit', String(params.limit))
  }
  if (params?.offset !== undefined) {
    search.set('offset', String(params.offset))
  }
  const qs = search.toString()
  const path = `/api/gallery/pets${qs ? `?${qs}` : ''}`
  const headers: HeadersInit = {}
  if (params?.accessToken) {
    headers.Authorization = `Bearer ${params.accessToken}`
  }
  const response = await fetch(apiUrl(path), { headers })
  const body = await parseJson<{
    pets: GalleryPet[]
    total: number
  } & ApiErrorBody>(response)
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
  return body
}

export async function fetchLikedGalleryPets(
  accessToken: string,
  params?: {
    limit?: number
    offset?: number
  },
): Promise<{ pets: GalleryPet[]; total: number }> {
  const search = new URLSearchParams()
  if (params?.limit !== undefined) {
    search.set('limit', String(params.limit))
  }
  if (params?.offset !== undefined) {
    search.set('offset', String(params.offset))
  }
  const qs = search.toString()
  const path = `/api/gallery/pets/liked${qs ? `?${qs}` : ''}`
  const response = await fetch(apiUrl(path), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const body = await parseJson<{
    pets: GalleryPet[]
    total: number
  } & ApiErrorBody>(response)
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
  return body
}

export async function fetchGalleryPet(id: number): Promise<{ pet: GalleryPet }> {
  const response = await fetch(apiUrl(`/api/gallery/pets/${id}`))
  const body = await parseJson<{ pet: GalleryPet } & ApiErrorBody>(response)
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
  return body
}

export async function fetchGalleryMember(id: number): Promise<{
  member: PublicMember
  pets: GalleryPet[]
}> {
  const response = await fetch(apiUrl(`/api/gallery/members/${id}`))
  const body = await parseJson<{
    member: PublicMember
    pets: GalleryPet[]
  } & ApiErrorBody>(response)
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
  return body
}

export async function listMyPets(accessToken: string): Promise<{ pets: Pet[] }> {
  return requestJson('/api/pets', { method: 'GET', accessToken })
}

export interface CreatePetPayload {
  name: string
  speciesId: number
  breedId: number | null
  dateOfBirth: string
  sex: PetSex
  description?: string | null
}

export async function createPet(
  accessToken: string,
  payload: CreatePetPayload,
): Promise<{ pet: Pet }> {
  return requestJson('/api/pets', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(payload),
  })
}

export async function getPet(accessToken: string, id: number): Promise<{ pet: Pet }> {
  return requestJson(`/api/pets/${id}`, { method: 'GET', accessToken })
}

export interface UpdatePetPayload {
  name?: string
  speciesId?: number
  breedId?: number | null
  dateOfBirth?: string
  sex?: PetSex
  description?: string | null
}

export async function updatePet(
  accessToken: string,
  id: number,
  payload: UpdatePetPayload,
): Promise<{ pet: Pet }> {
  return requestJson(`/api/pets/${id}`, {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify(payload),
  })
}

export async function deletePet(accessToken: string, id: number): Promise<void> {
  const response = await fetch(apiUrl(`/api/pets/${id}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (response.status === 204) {
    return
  }
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody
  throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
}

export async function setPetCoverPhoto(
  accessToken: string,
  petId: number,
  photoId: number,
): Promise<{ pet: Pet }> {
  return requestJson(`/api/pets/${petId}/cover-photo`, {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify({ photoId }),
  })
}

export async function replacePetPhotoFile(
  accessToken: string,
  petId: number,
  photoId: number,
  file: File,
): Promise<{ photo: PetPhoto }> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(apiUrl(`/api/pets/${petId}/photos/${photoId}/file`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  const body = (await response.json()) as { photo?: PetPhoto } & ApiErrorBody
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Upload failed', response.status, body.code)
  }
  if (!body.photo) {
    throw new ApiError('Invalid server response', response.status)
  }
  return { photo: body.photo }
}

export async function listPetPhotos(
  accessToken: string,
  petId: number,
): Promise<{ photos: PetPhoto[] }> {
  return requestJson(`/api/pets/${petId}/photos`, { method: 'GET', accessToken })
}

export async function uploadPetPhoto(
  accessToken: string,
  petId: number,
  file: File,
): Promise<{ photo: PetPhoto }> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(apiUrl(`/api/pets/${petId}/photos`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  const body = (await response.json()) as { photo?: PetPhoto } & ApiErrorBody
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Upload failed', response.status, body.code)
  }
  if (!body.photo) {
    throw new ApiError('Invalid server response', response.status)
  }
  return { photo: body.photo }
}

export async function deletePetPhoto(
  accessToken: string,
  petId: number,
  photoId: number,
): Promise<void> {
  const response = await fetch(apiUrl(`/api/pets/${petId}/photos/${photoId}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (response.status === 204) {
    return
  }
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody
  throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
}
