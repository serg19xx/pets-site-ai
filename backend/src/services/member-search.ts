import { pool } from '../db/pool.js'
import { adminUsersExclusion } from '../lib/admin.js'
import { AppError } from '../lib/errors.js'
import {
  mapPublicMemberProfile,
  type PublicMemberProfile,
  type PublicMemberRow,
} from '../lib/map-public-member.js'
import { buildPublicUploadUrl } from '../lib/uploads.js'
import type { UserGender } from '../types/user.js'
import { USER_GENDERS } from '../types/user.js'

const MAX_LIMIT = 40
const MAX_PET_SETS = 5

export interface PetFilterSet {
  speciesSlug?: string
  breedLabel?: string
  petSex?: 'male' | 'female' | 'unknown'
}

export interface MemberSearchFilters {
  viewerUserId: number
  /** Match public nickname / full name (privacy-visible fields only). */
  q?: string
  gender?: UserGender
  ageMin?: number
  ageMax?: number
  city?: string
  /** AND between sets: member must match every non-empty set. */
  petSets?: PetFilterSet[]
  /** @deprecated Prefer petSets — kept for simple single-set callers. */
  speciesSlug?: string
  breedLabel?: string
  petSex?: 'male' | 'female' | 'unknown'
  /** Restrict results to accepted owner friends of the viewer. */
  friendsOnly?: boolean
  limit?: number
  offset?: number
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

type SearchUserRow = PublicMemberRow & {
  email: string
  city: string | null
  show_city: boolean
  gender: UserGender
  show_gender: boolean
  date_of_birth: Date
  show_date_of_birth: boolean
}

type SearchPetRow = {
  user_id: string
  id: string
  name: string
  species_slug: string
  species_label: string
  breed_label: string | null
  sex: 'male' | 'female' | 'unknown'
  avatar_path: string | null
}

function clampInt(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback
  }
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

function normalizePetSets(filters: MemberSearchFilters): PetFilterSet[] {
  const fromSets = (filters.petSets ?? [])
    .map((set) => ({
      speciesSlug: set.speciesSlug?.trim().toLowerCase() || undefined,
      breedLabel: set.breedLabel?.trim().toLowerCase() || undefined,
      petSex: set.petSex,
    }))
    .filter((set) => Boolean(set.speciesSlug || set.breedLabel || set.petSex))

  if (fromSets.length > 0) {
    if (fromSets.length > MAX_PET_SETS) {
      throw new AppError(400, `At most ${MAX_PET_SETS} pet filter sets`, 'VALIDATION_ERROR')
    }
    return fromSets
  }

  const legacy: PetFilterSet = {
    speciesSlug: filters.speciesSlug?.trim().toLowerCase() || undefined,
    breedLabel: filters.breedLabel?.trim().toLowerCase() || undefined,
    petSex: filters.petSex,
  }
  if (legacy.speciesSlug || legacy.breedLabel || legacy.petSex) {
    return [legacy]
  }
  return []
}

function appendPetSetExists(
  where: string[],
  params: unknown[],
  set: PetFilterSet,
  setIndex: number,
): void {
  const petClauses: string[] = [`p${setIndex}.user_id = u.id`]
  if (set.speciesSlug) {
    params.push(set.speciesSlug)
    petClauses.push(`ps${setIndex}.slug = $${params.length}`)
  }
  if (set.breedLabel) {
    params.push(set.breedLabel)
    petClauses.push(
      `pb${setIndex}.label IS NOT NULL AND lower(pb${setIndex}.label) = $${params.length}`,
    )
  }
  if (set.petSex) {
    if (!['male', 'female', 'unknown'].includes(set.petSex)) {
      throw new AppError(400, 'Invalid pet sex filter', 'VALIDATION_ERROR')
    }
    params.push(set.petSex)
    petClauses.push(`p${setIndex}.sex = $${params.length}`)
  }

  where.push(`EXISTS (
    SELECT 1
    FROM pets p${setIndex}
    INNER JOIN pet_species ps${setIndex} ON ps${setIndex}.id = p${setIndex}.species_id
    LEFT JOIN pet_breeds pb${setIndex} ON pb${setIndex}.id = p${setIndex}.breed_id
    WHERE ${petClauses.join(' AND ')}
  )`)
}

export async function searchPublicMembers(
  filters: MemberSearchFilters,
): Promise<{ members: MemberSearchHit[]; total: number }> {
  const limit = clampInt(filters.limit, 1, MAX_LIMIT, 24)
  const offset = clampInt(filters.offset, 0, 10_000, 0)

  if (filters.gender && !(USER_GENDERS as readonly string[]).includes(filters.gender)) {
    throw new AppError(400, 'Invalid gender filter', 'VALIDATION_ERROR')
  }
  if (filters.petSex && !['male', 'female', 'unknown'].includes(filters.petSex)) {
    throw new AppError(400, 'Invalid pet sex filter', 'VALIDATION_ERROR')
  }

  const petSets = normalizePetSets(filters)

  const params: unknown[] = [filters.viewerUserId]
  const where: string[] = ['u.id <> $1', 'u.email_verified_at IS NOT NULL']

  const exclude = adminUsersExclusion('u.email', params.length + 1)
  if (exclude.clause) {
    where.push(`TRUE${exclude.clause}`)
    params.push(...exclude.params)
  }

  if (filters.friendsOnly) {
    where.push(`EXISTS (
      SELECT 1
      FROM user_friendships uf
      WHERE uf.status = 'accepted'
        AND (
          (uf.user_a_id = $1 AND uf.user_b_id = u.id)
          OR (uf.user_b_id = $1 AND uf.user_a_id = u.id)
        )
    )`)
  }

  const q = filters.q?.trim().toLowerCase()
  if (q) {
    if (q.length > 80) {
      throw new AppError(400, 'Search text is too long', 'VALIDATION_ERROR')
    }
    params.push(`%${q}%`)
    where.push(`(
      (u.show_nickname = TRUE AND lower(u.nickname) LIKE $${params.length})
      OR (u.show_full_name = TRUE AND lower(u.full_name) LIKE $${params.length})
    )`)
  }

  if (filters.gender) {
    params.push(filters.gender)
    where.push(`u.show_gender = TRUE AND u.gender = $${params.length}`)
  }

  if (filters.city?.trim()) {
    params.push(`%${filters.city.trim().toLowerCase()}%`)
    where.push(
      `u.show_city = TRUE AND u.city IS NOT NULL AND lower(u.city) LIKE $${params.length}`,
    )
  }

  if (filters.ageMin !== undefined || filters.ageMax !== undefined) {
    where.push('u.show_date_of_birth = TRUE AND u.date_of_birth IS NOT NULL')
    if (filters.ageMin !== undefined) {
      const ageMin = clampInt(filters.ageMin, 0, 120, 0)
      params.push(ageMin)
      where.push(
        `date_part('year', age(current_date, u.date_of_birth)) >= $${params.length}`,
      )
    }
    if (filters.ageMax !== undefined) {
      const ageMax = clampInt(filters.ageMax, 0, 120, 120)
      params.push(ageMax)
      where.push(
        `date_part('year', age(current_date, u.date_of_birth)) <= $${params.length}`,
      )
    }
  }

  petSets.forEach((set, index) => {
    appendPetSetExists(where, params, set, index)
  })

  const whereSql = where.join(' AND ')

  const countR = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c
     FROM users u
     WHERE ${whereSql}`,
    params,
  )
  const total = Number(countR.rows[0]?.c ?? 0)

  params.push(limit)
  const limitIdx = params.length
  params.push(offset)
  const offsetIdx = params.length

  const usersR = await pool.query<SearchUserRow>(
    `SELECT
       u.id,
       u.full_name,
       u.nickname,
       u.avatar_path,
       u.show_full_name,
       u.show_nickname,
       u.city,
       u.show_city,
       u.gender,
       u.show_gender,
       u.date_of_birth,
       u.show_date_of_birth,
       u.email
     FROM users u
     WHERE ${whereSql}
     ORDER BY u.nickname ASC, u.full_name ASC, u.id ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
  )

  const userIds = usersR.rows.map((row) => Number(row.id))
  const petsByUser = new Map<number, MemberSearchPetSnippet[]>()

  if (userIds.length > 0) {
    const petsR = await pool.query<SearchPetRow>(
      `SELECT
         p.user_id,
         p.id,
         p.name,
         ps.slug AS species_slug,
         ps.label AS species_label,
         pb.label AS breed_label,
         p.sex,
         cover_pp.path AS avatar_path
       FROM pets p
       INNER JOIN pet_species ps ON ps.id = p.species_id
       LEFT JOIN pet_breeds pb ON pb.id = p.breed_id
       LEFT JOIN pet_photos cover_pp ON cover_pp.id = p.cover_photo_id
       WHERE p.user_id = ANY($1::bigint[])
       ORDER BY p.updated_at DESC, p.id DESC`,
      [userIds],
    )

    for (const row of petsR.rows) {
      const ownerId = Number(row.user_id)
      const list = petsByUser.get(ownerId) ?? []
      if (list.length >= 4) {
        continue
      }
      list.push({
        id: Number(row.id),
        name: row.name,
        speciesSlug: row.species_slug,
        speciesLabel: row.species_label,
        breedLabel: row.breed_label,
        sex: row.sex,
        avatarUrl: row.avatar_path ? buildPublicUploadUrl(row.avatar_path) : null,
      })
      petsByUser.set(ownerId, list)
    }
  }

  const members: MemberSearchHit[] = usersR.rows.map((row) => ({
    member: mapPublicMemberProfile(row),
    pets: petsByUser.get(Number(row.id)) ?? [],
  }))

  return { members, total }
}
