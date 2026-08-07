import type { FastifyPluginAsync } from 'fastify'

import { AppError } from '../lib/errors.js'
import { getOptionalUserId, getUserId } from '../plugins/jwt-auth.js'
import { getPublicMemberProfile } from '../services/gallery-members.js'
import { getGalleryPetById, listGalleryPets, listLikedGalleryPets } from '../services/gallery-pets.js'
import { getPetLikeStatus, togglePetLike } from '../services/pet-likes.js'
import { errorResponseSchema } from '../schemas/auth.js'
import { petLikeStatusSchema } from '../schemas/likes.js'
import {
  galleryMemberResponseSchema,
  galleryPetResponseSchema,
  galleryPetsResponseSchema,
} from '../schemas/gallery.js'

function parseGalleryLimit(value: unknown): number {
  if (value === undefined || value === '') {
    return 24
  }
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) {
    throw new AppError(400, 'Invalid limit', 'VALIDATION_ERROR')
  }
  return n
}

function parseGalleryOffset(value: unknown): number {
  if (value === undefined || value === '') {
    return 0
  }
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) {
    throw new AppError(400, 'Invalid offset', 'VALIDATION_ERROR')
  }
  return n
}

export const galleryRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/gallery/pets',
    {
      onRequest: [app.authenticateOptional],
      schema: {
        tags: ['gallery'],
        summary: 'Public pet gallery',
        description:
          'Paginated public pet gallery. Own pets remain visible (needed for friendships and public profiles). Pets with a profile photo appear first, then by last update. Query: `limit` (1–60, default 24), `offset` (default 0).',
        response: {
          200: galleryPetsResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const q = request.query as Record<string, unknown>
      const limit = parseGalleryLimit(q.limit)
      const offset = parseGalleryOffset(q.offset)
      const userId = getOptionalUserId(request)
      return listGalleryPets(limit, offset, userId)
    },
  )

  app.get(
    '/gallery/pets/liked',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['gallery'],
        summary: 'Liked pets for current member',
        description: 'Members only. Returns gallery pets liked by the current user.',
        security: [{ bearerAuth: [] }],
        response: {
          200: galleryPetsResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const q = request.query as Record<string, unknown>
      const limit = parseGalleryLimit(q.limit)
      const offset = parseGalleryOffset(q.offset)
      return listLikedGalleryPets(getUserId(request), limit, offset)
    },
  )

  app.get(
    '/gallery/pets/:id',
    {
      schema: {
        tags: ['gallery'],
        summary: 'Public pet by id',
        description: 'Single pet card for the public gallery. No authentication.',
        params: {
          type: 'object',
          properties: { id: { type: 'integer' } },
          required: ['id'],
        },
        response: {
          200: galleryPetResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const petId = Number(id)
      if (!Number.isInteger(petId) || petId < 1) {
        throw new AppError(404, 'Pet not found', 'NOT_FOUND')
      }
      const pet = await getGalleryPetById(petId)
      if (!pet) {
        throw new AppError(404, 'Pet not found', 'NOT_FOUND')
      }
      return { pet }
    },
  )

  app.get(
    '/gallery/pets/:id/like',
    {
      onRequest: [app.authenticateOptional],
      schema: {
        tags: ['gallery'],
        summary: 'Pet like status',
        description:
          'Like count for everyone. `liked` is true only when a valid Bearer token belongs to a member who liked this pet.',
        params: {
          type: 'object',
          properties: { id: { type: 'integer' } },
          required: ['id'],
        },
        response: {
          200: petLikeStatusSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const petId = Number(id)
      if (!Number.isInteger(petId) || petId < 1) {
        throw new AppError(404, 'Pet not found', 'NOT_FOUND')
      }
      const userId = getOptionalUserId(request)
      return getPetLikeStatus(petId, userId)
    },
  )

  app.post(
    '/gallery/pets/:id/like',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['gallery'],
        summary: 'Toggle pet like',
        description: 'Members only. Adds or removes the current user’s like on a gallery pet.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'integer' } },
          required: ['id'],
        },
        response: {
          200: petLikeStatusSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const petId = Number(id)
      if (!Number.isInteger(petId) || petId < 1) {
        throw new AppError(404, 'Pet not found', 'NOT_FOUND')
      }
      return togglePetLike(petId, getUserId(request))
    },
  )

  app.get(
    '/gallery/members/:id',
    {
      schema: {
        tags: ['gallery'],
        summary: 'Public member profile',
        description:
          'Display name, avatar, and public pets for a community member (owner, vet, trainer, etc.). Respects profile privacy flags. No authentication.',
        params: {
          type: 'object',
          properties: { id: { type: 'integer' } },
          required: ['id'],
        },
        response: {
          200: galleryMemberResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const userId = Number(id)
      if (!Number.isInteger(userId) || userId < 1) {
        throw new AppError(404, 'Member not found', 'NOT_FOUND')
      }
      const profile = await getPublicMemberProfile(userId)
      if (!profile) {
        throw new AppError(404, 'Member not found', 'NOT_FOUND')
      }
      return profile
    },
  )
}
