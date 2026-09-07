import { apiUrl } from '~/lib/api'
import { ApiError } from '~/lib/auth-api'
import type { PublicMemberProfile } from '~/types/public-member'
import type { UserGender } from '~/types/user'

interface ApiErrorBody {
  code?: string
  message?: string
}

export interface MemberSearchPetSnippet {
  id: number
  name: string
  speciesSlug: string
  speciesLabel: string
  breedLabel: string | null
  sex: 'male' | 'female' | 'unknown'
  avatarUrl: string | null
}

export interface MemberSearchHit {
  member: PublicMemberProfile
  pets: MemberSearchPetSnippet[]
}

export interface MemberPetFilterSet {
  species?: string
  breed?: string
  petSex?: 'male' | 'female' | 'unknown' | ''
}

export interface MemberSearchParams {
  q?: string
  gender?: UserGender | ''
  ageMin?: number | null
  ageMax?: number | null
  city?: string
  friendsOnly?: boolean
  petSets?: MemberPetFilterSet[]
  limit?: number
  offset?: number
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export async function searchMembers(
  accessToken: string,
  params: MemberSearchParams = {},
): Promise<{ members: MemberSearchHit[]; total: number }> {
  const petSets = (params.petSets ?? [])
    .map((set) => ({
      species: set.species?.trim() || undefined,
      breed: set.breed?.trim() || undefined,
      petSex: set.petSex || undefined,
    }))
    .filter((set) => Boolean(set.species || set.breed || set.petSex))

  const payload: Record<string, unknown> = {
    friendsOnly: Boolean(params.friendsOnly),
  }
  if (params.q?.trim()) {
    payload.q = params.q.trim()
  }
  if (params.gender) {
    payload.gender = params.gender
  }
  if (params.ageMin !== undefined && params.ageMin !== null) {
    payload.ageMin = params.ageMin
  }
  if (params.ageMax !== undefined && params.ageMax !== null) {
    payload.ageMax = params.ageMax
  }
  if (params.city?.trim()) {
    payload.city = params.city.trim()
  }
  if (petSets.length > 0) {
    payload.petSets = petSets
  }
  if (params.limit !== undefined) {
    payload.limit = params.limit
  }
  if (params.offset !== undefined) {
    payload.offset = params.offset
  }

  const response = await fetch(apiUrl('/api/members/search'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const body = await parseJson<{ members: MemberSearchHit[]; total: number } & ApiErrorBody>(
    response,
  )
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
  return { members: body.members, total: body.total }
}
