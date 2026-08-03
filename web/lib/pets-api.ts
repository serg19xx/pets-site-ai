import { apiUrl } from '~/lib/api'
import { ApiError } from '~/lib/auth-api'
import type { GalleryPet } from '~/types/gallery'
import type { PublicMember } from '~/types/public-member'
import type { PetPhoto } from '~/types/pet-photo'
import type { PetCertificate } from '~/types/pet-certificate'
import type {
  PetMedicalPhoto,
  PetMedicalRecord,
  UpsertPetMedicalRecordInput,
} from '~/types/pet-medical'
import type {
  ParentCandidate,
  PetParentRecord,
  PetParentRole,
  UpsertPetParentInput,
} from '~/types/pet-parent'
import type { Pet, PetBreedListItem, PetSex, PetSpeciesListItem } from '~/types/pet'

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

interface ApiErrorBody {
  code?: string
  message?: string
}

function authHeaders(accessToken: string, withJsonContentType: boolean): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  }
  if (withJsonContentType) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}

async function requestJson<T>(
  path: string,
  init: RequestInit & { accessToken: string },
): Promise<T> {
  const { accessToken, ...rest } = init
  const hasBody = rest.body != null && rest.body !== ''
  const response = await fetch(apiUrl(path), {
    ...rest,
    headers: {
      ...authHeaders(accessToken, hasBody),
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
  weightKg?: number | null
  color?: string | null
  lengthCm?: number | null
  heightCm?: number | null
  markings?: string | null
  physicalNotes?: string | null
  pedigreeNotes?: string | null
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

export async function regeneratePetGreeting(
  accessToken: string,
  id: number,
): Promise<{ pet: Pet }> {
  return requestJson(`/api/pets/${id}/greeting/regenerate`, {
    method: 'POST',
    accessToken,
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

export async function getPetParents(
  accessToken: string,
  petId: number,
): Promise<{ dam: PetParentRecord | null; sire: PetParentRecord | null }> {
  return requestJson(`/api/pets/${petId}/parents`, { method: 'GET', accessToken })
}

export async function setPetParents(
  accessToken: string,
  petId: number,
  body: {
    dam?: UpsertPetParentInput | null
    sire?: UpsertPetParentInput | null
  },
): Promise<{ dam: PetParentRecord | null; sire: PetParentRecord | null }> {
  return requestJson(`/api/pets/${petId}/parents`, {
    method: 'PUT',
    accessToken,
    body: JSON.stringify(body),
  })
}

export async function searchParentCandidates(
  accessToken: string,
  params: { q: string; excludePetId: number; limit?: number },
): Promise<{ owned: ParentCandidate[]; site: ParentCandidate[] }> {
  const qs = new URLSearchParams({
    q: params.q,
    excludePetId: String(params.excludePetId),
  })
  if (params.limit != null) {
    qs.set('limit', String(params.limit))
  }
  return requestJson(`/api/pets/parent-candidates?${qs}`, {
    method: 'GET',
    accessToken,
  })
}

export async function uploadExternalParentPhoto(
  accessToken: string,
  petId: number,
  role: PetParentRole,
  file: File,
): Promise<{ parent: PetParentRecord }> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(apiUrl(`/api/pets/${petId}/parents/${role}/photo`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  const body = (await response.json()) as { parent?: PetParentRecord } & ApiErrorBody
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Upload failed', response.status, body.code)
  }
  if (!body.parent) {
    throw new ApiError('Invalid server response', response.status)
  }
  return { parent: body.parent }
}

export async function deleteExternalParentPhoto(
  accessToken: string,
  petId: number,
  role: PetParentRole,
): Promise<{ parent: PetParentRecord }> {
  return requestJson(`/api/pets/${petId}/parents/${role}/photo`, {
    method: 'DELETE',
    accessToken,
  })
}

export async function listPetCertificates(
  accessToken: string,
  petId: number,
): Promise<{ certificates: PetCertificate[] }> {
  return requestJson(`/api/pets/${petId}/certificates`, { method: 'GET', accessToken })
}

export async function uploadPetCertificate(
  accessToken: string,
  petId: number,
  file: File,
): Promise<{ certificate: PetCertificate }> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(apiUrl(`/api/pets/${petId}/certificates`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  const body = (await response.json()) as { certificate?: PetCertificate } & ApiErrorBody
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Upload failed', response.status, body.code)
  }
  if (!body.certificate) {
    throw new ApiError('Invalid server response', response.status)
  }
  return { certificate: body.certificate }
}

export async function replacePetCertificateFile(
  accessToken: string,
  petId: number,
  certificateId: number,
  file: File,
): Promise<{ certificate: PetCertificate }> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(
    apiUrl(`/api/pets/${petId}/certificates/${certificateId}/file`),
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  )
  const body = (await response.json()) as { certificate?: PetCertificate } & ApiErrorBody
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Upload failed', response.status, body.code)
  }
  if (!body.certificate) {
    throw new ApiError('Invalid server response', response.status)
  }
  return { certificate: body.certificate }
}

export async function deletePetCertificate(
  accessToken: string,
  petId: number,
  certificateId: number,
): Promise<void> {
  const response = await fetch(
    apiUrl(`/api/pets/${petId}/certificates/${certificateId}`),
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

export async function listPetMedicalRecords(
  accessToken: string,
  petId: number,
): Promise<{ records: PetMedicalRecord[] }> {
  return requestJson(`/api/pets/${petId}/medical`, { method: 'GET', accessToken })
}

export async function createPetMedicalRecord(
  accessToken: string,
  petId: number,
  body: UpsertPetMedicalRecordInput,
): Promise<{ record: PetMedicalRecord }> {
  return requestJson(`/api/pets/${petId}/medical`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify(body),
  })
}

export async function updatePetMedicalRecord(
  accessToken: string,
  petId: number,
  recordId: number,
  body: UpsertPetMedicalRecordInput,
): Promise<{ record: PetMedicalRecord }> {
  return requestJson(`/api/pets/${petId}/medical/${recordId}`, {
    method: 'PUT',
    accessToken,
    body: JSON.stringify(body),
  })
}

export async function deletePetMedicalRecord(
  accessToken: string,
  petId: number,
  recordId: number,
): Promise<void> {
  const response = await fetch(apiUrl(`/api/pets/${petId}/medical/${recordId}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (response.status === 204) {
    return
  }
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody
  throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
}

export async function uploadPetMedicalPhoto(
  accessToken: string,
  petId: number,
  recordId: number,
  file: File,
): Promise<{ photo: PetMedicalPhoto }> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(apiUrl(`/api/pets/${petId}/medical/${recordId}/photos`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  const body = (await response.json()) as { photo?: PetMedicalPhoto } & ApiErrorBody
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Upload failed', response.status, body.code)
  }
  if (!body.photo) {
    throw new ApiError('Invalid server response', response.status)
  }
  return { photo: body.photo }
}

export async function replacePetMedicalPhotoFile(
  accessToken: string,
  petId: number,
  recordId: number,
  photoId: number,
  file: File,
): Promise<{ photo: PetMedicalPhoto }> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(
    apiUrl(`/api/pets/${petId}/medical/${recordId}/photos/${photoId}/file`),
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  )
  const body = (await response.json()) as { photo?: PetMedicalPhoto } & ApiErrorBody
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Upload failed', response.status, body.code)
  }
  if (!body.photo) {
    throw new ApiError('Invalid server response', response.status)
  }
  return { photo: body.photo }
}

export async function deletePetMedicalPhoto(
  accessToken: string,
  petId: number,
  recordId: number,
  photoId: number,
): Promise<void> {
  const response = await fetch(
    apiUrl(`/api/pets/${petId}/medical/${recordId}/photos/${photoId}`),
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
