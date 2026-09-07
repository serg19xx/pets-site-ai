import type { FastifyPluginAsync } from 'fastify'

import { AppError } from '../lib/errors.js'
import { getUserId } from '../plugins/jwt-auth.js'
import { errorResponseSchema } from '../schemas/auth.js'
import { publicMemberProfileSchema } from '../schemas/gallery.js'
import {
  searchPublicMembers,
  type MemberSearchFilters,
  type PetFilterSet,
} from '../services/member-search.js'
import { USER_GENDERS, type UserGender } from '../types/user.js'

const memberSearchPetSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    speciesSlug: { type: 'string' },
    speciesLabel: { type: 'string' },
    breedLabel: { type: ['string', 'null'] },
    sex: { type: 'string', enum: ['male', 'female', 'unknown'] },
    avatarUrl: { type: ['string', 'null'] },
  },
  required: ['id', 'name', 'speciesSlug', 'speciesLabel', 'breedLabel', 'sex', 'avatarUrl'],
} as const

const memberSearchHitSchema = {
  type: 'object',
  properties: {
    member: publicMemberProfileSchema,
    pets: { type: 'array', items: memberSearchPetSchema },
  },
  required: ['member', 'pets'],
} as const

const memberSearchResponseSchema = {
  type: 'object',
  properties: {
    members: { type: 'array', items: memberSearchHitSchema },
    total: { type: 'integer' },
  },
  required: ['members', 'total'],
} as const

const petFilterSetSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    species: { type: 'string', maxLength: 64 },
    breed: { type: 'string', maxLength: 120 },
    petSex: { type: 'string', enum: ['male', 'female', 'unknown'] },
  },
} as const

const memberSearchBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    q: { type: 'string', maxLength: 80 },
    gender: { type: 'string', enum: [...USER_GENDERS] },
    ageMin: { type: 'integer', minimum: 0, maximum: 120 },
    ageMax: { type: 'integer', minimum: 0, maximum: 120 },
    city: { type: 'string', maxLength: 120 },
    friendsOnly: { type: 'boolean' },
    petSets: {
      type: 'array',
      maxItems: 5,
      items: petFilterSetSchema,
    },
    species: { type: 'string', maxLength: 64 },
    breed: { type: 'string', maxLength: 120 },
    petSex: { type: 'string', enum: ['male', 'female', 'unknown'] },
    limit: { type: 'integer', minimum: 1, maximum: 40 },
    offset: { type: 'integer', minimum: 0 },
  },
} as const

function parseOptionalInt(raw: string | number | undefined): number | undefined {
  if (raw === undefined || raw === '') {
    return undefined
  }
  const value = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isInteger(value)) {
    throw new AppError(400, 'Invalid integer query parameter', 'VALIDATION_ERROR')
  }
  return value
}

function parseOptionalGender(raw: string | undefined): UserGender | undefined {
  if (!raw) {
    return undefined
  }
  if (!(USER_GENDERS as readonly string[]).includes(raw)) {
    throw new AppError(400, 'Invalid gender filter', 'VALIDATION_ERROR')
  }
  return raw as UserGender
}

function parseOptionalPetSex(
  raw: string | undefined,
): 'male' | 'female' | 'unknown' | undefined {
  if (!raw) {
    return undefined
  }
  if (raw !== 'male' && raw !== 'female' && raw !== 'unknown') {
    throw new AppError(400, 'Invalid pet sex filter', 'VALIDATION_ERROR')
  }
  return raw
}

function parsePetSetsFromBody(
  raw: Array<{ species?: string; breed?: string; petSex?: string }> | undefined,
): PetFilterSet[] | undefined {
  if (!raw || raw.length === 0) {
    return undefined
  }
  return raw.map((set) => ({
    speciesSlug: set.species,
    breedLabel: set.breed,
    petSex: parseOptionalPetSex(set.petSex),
  }))
}

function parseFriendsOnly(raw: string | boolean | undefined): boolean {
  if (raw === true || raw === 'true' || raw === '1') {
    return true
  }
  return false
}

function filtersFromQuery(q: {
  q?: string
  gender?: string
  ageMin?: string
  ageMax?: string
  city?: string
  species?: string
  breed?: string
  petSex?: string
  friendsOnly?: string
  limit?: string
  offset?: string
}): Omit<MemberSearchFilters, 'viewerUserId'> {
  return {
    q: q.q,
    gender: parseOptionalGender(q.gender),
    ageMin: parseOptionalInt(q.ageMin),
    ageMax: parseOptionalInt(q.ageMax),
    city: q.city,
    speciesSlug: q.species,
    breedLabel: q.breed,
    petSex: parseOptionalPetSex(q.petSex),
    friendsOnly: parseFriendsOnly(q.friendsOnly),
    limit: parseOptionalInt(q.limit),
    offset: parseOptionalInt(q.offset),
  }
}

export const membersRoutes: FastifyPluginAsync = async (app) => {
  app.get<{
    Querystring: {
      q?: string
      gender?: string
      ageMin?: string
      ageMax?: string
      city?: string
      species?: string
      breed?: string
      petSex?: string
      friendsOnly?: string
      limit?: string
      offset?: string
    }
  }>(
    '/members/search',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['members'],
        summary: 'Discover community members (simple query)',
        description:
          'Search by public human fields and one pet filter. For multiple pet sets use POST /api/members/search.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            q: { type: 'string', maxLength: 80 },
            gender: { type: 'string', enum: [...USER_GENDERS] },
            ageMin: { type: 'integer', minimum: 0, maximum: 120 },
            ageMax: { type: 'integer', minimum: 0, maximum: 120 },
            city: { type: 'string', maxLength: 120 },
            species: { type: 'string', maxLength: 64 },
            breed: { type: 'string', maxLength: 120 },
            petSex: { type: 'string', enum: ['male', 'female', 'unknown'] },
            friendsOnly: { type: 'boolean' },
            limit: { type: 'integer', minimum: 1, maximum: 40 },
            offset: { type: 'integer', minimum: 0 },
          },
        },
        response: {
          200: memberSearchResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return searchPublicMembers({
        viewerUserId: getUserId(request),
        ...filtersFromQuery(request.query),
      })
    },
  )

  app.post<{
    Body: {
      q?: string
      gender?: string
      ageMin?: number
      ageMax?: number
      city?: string
      friendsOnly?: boolean
      petSets?: Array<{ species?: string; breed?: string; petSex?: string }>
      species?: string
      breed?: string
      petSex?: string
      limit?: number
      offset?: number
    }
  }>(
    '/members/search',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['members'],
        summary: 'Discover community members',
        description:
          'Search other members by public human fields and pet filter sets (AND across sets). Only privacy-visible fields match. Optional friendsOnly limits to accepted owner friends.',
        security: [{ bearerAuth: [] }],
        body: memberSearchBodySchema,
        response: {
          200: memberSearchResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const body = request.body
      return searchPublicMembers({
        viewerUserId: getUserId(request),
        q: body.q,
        gender: parseOptionalGender(body.gender),
        ageMin: body.ageMin,
        ageMax: body.ageMax,
        city: body.city,
        friendsOnly: Boolean(body.friendsOnly),
        petSets: parsePetSetsFromBody(body.petSets),
        speciesSlug: body.species,
        breedLabel: body.breed,
        petSex: parseOptionalPetSex(body.petSex),
        limit: body.limit,
        offset: body.offset,
      })
    },
  )
}
