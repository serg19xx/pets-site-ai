import type { FastifyPluginAsync } from 'fastify'

import { AppError } from '../lib/errors.js'
import { assertAdmin } from '../lib/admin.js'
import { getUserId } from '../plugins/jwt-auth.js'
import { errorResponseSchema } from '../schemas/auth.js'
import { listAdminUsers, deleteAdminUser } from '../services/admin-users.js'
import {
  createBetaAnnouncement,
  listBetaAnnouncements,
} from '../services/beta-announcements.js'
import { listBetaTesterStats } from '../services/beta-tester-stats.js'
import {
  listAdminPetSpecies,
  setPetSpeciesActive,
} from '../services/pet-catalog.js'

const adminMeSchema = {
  type: 'object',
  properties: {
    isAdmin: { type: 'boolean' },
  },
  required: ['isAdmin'],
} as const

const adminUserSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    fullName: { type: 'string' },
    nickname: { type: 'string' },
    displayName: { type: 'string' },
    email: { type: 'string' },
    isBetaTester: { type: 'boolean' },
    isAdmin: { type: 'boolean' },
    emailVerified: { type: 'boolean' },
    createdAt: { type: 'string' },
  },
  required: [
    'id',
    'fullName',
    'nickname',
    'displayName',
    'email',
    'isBetaTester',
    'isAdmin',
    'emailVerified',
    'createdAt',
  ],
} as const

const adminUsersListSchema = {
  type: 'object',
  properties: {
    users: { type: 'array', items: adminUserSchema },
    total: { type: 'integer' },
  },
  required: ['users', 'total'],
} as const

const announcementSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    title: { type: 'string' },
    body: { type: 'string' },
    linkPath: { type: ['string', 'null'] },
    createdAt: { type: 'string' },
  },
  required: ['id', 'title', 'body', 'linkPath', 'createdAt'],
} as const

const testerStatsSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    displayName: { type: 'string' },
    email: { type: 'string' },
    bugCount: { type: 'integer' },
    acceptedImprovementCount: { type: 'integer' },
    pendingImprovementCount: { type: 'integer' },
    rejectedImprovementCount: { type: 'integer' },
    joinedAt: { type: ['string', 'null'] },
  },
  required: [
    'id',
    'displayName',
    'email',
    'bugCount',
    'acceptedImprovementCount',
    'pendingImprovementCount',
    'rejectedImprovementCount',
    'joinedAt',
  ],
} as const

function parseLimit(value: unknown): number {
  if (value === undefined || value === '') {
    return 50
  }
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 100) {
    throw new AppError(400, 'Invalid limit (1–100)', 'VALIDATION_ERROR')
  }
  return n
}

function parseOffset(value: unknown): number {
  if (value === undefined || value === '') {
    return 0
  }
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) {
    throw new AppError(400, 'Invalid offset', 'VALIDATION_ERROR')
  }
  return n
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/admin/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['admin'],
        summary: 'Confirm current user is a site admin',
        security: [{ bearerAuth: [] }],
        response: {
          200: adminMeSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request) => {
      await assertAdmin(getUserId(request))
      return { isAdmin: true }
    },
  )

  app.get<{ Querystring: { limit?: string; offset?: string; q?: string } }>(
    '/admin/users',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['admin'],
        summary: 'List users (admin)',
        security: [{ bearerAuth: [] }],
        response: {
          200: adminUsersListSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return listAdminUsers({
        userId: getUserId(request),
        limit: parseLimit(request.query.limit),
        offset: parseOffset(request.query.offset),
        q: typeof request.query.q === 'string' ? request.query.q : undefined,
      })
    },
  )

  app.delete<{ Params: { id: string } }>(
    '/admin/users/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['admin'],
        summary: 'Delete a user account (admin)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        response: {
          204: { type: 'null' },
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const id = Number(request.params.id)
      if (!Number.isInteger(id) || id < 1) {
        throw new AppError(400, 'Invalid user id', 'VALIDATION_ERROR')
      }
      await deleteAdminUser({
        actorUserId: getUserId(request),
        targetUserId: id,
      })
      return reply.status(204).send()
    },
  )

  app.get(
    '/admin/testers',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['admin'],
        summary: 'Beta tester activity (bugs + accepted improvements)',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              testers: { type: 'array', items: testerStatsSchema },
              total: { type: 'integer' },
            },
            required: ['testers', 'total'],
          },
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return listBetaTesterStats({ adminUserId: getUserId(request) })
    },
  )

  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/admin/announcements',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['admin'],
        summary: 'List beta feature announcements',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              announcements: { type: 'array', items: announcementSchema },
              total: { type: 'integer' },
            },
            required: ['announcements', 'total'],
          },
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return listBetaAnnouncements({
        adminUserId: getUserId(request),
        limit: parseLimit(request.query.limit),
        offset: parseOffset(request.query.offset),
      })
    },
  )

  app.post<{
    Body: { title: string; body: string; linkPath?: string | null }
  }>(
    '/admin/announcements',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['admin'],
        summary: 'Announce a feature to all beta testers (in-app + email)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'body'],
          properties: {
            title: { type: 'string', minLength: 3, maxLength: 200 },
            body: { type: 'string', minLength: 3, maxLength: 8000 },
            linkPath: { type: ['string', 'null'], maxLength: 500 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              announcement: {
                type: 'object',
                properties: {
                  ...announcementSchema.properties,
                  recipientCount: { type: 'integer' },
                },
                required: [...announcementSchema.required, 'recipientCount'],
              },
            },
            required: ['announcement'],
          },
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const announcement = await createBetaAnnouncement({
        adminUserId: getUserId(request),
        title: request.body.title,
        body: request.body.body,
        linkPath: request.body.linkPath,
      })
      return reply.status(201).send({ announcement })
    },
  )

  app.get(
    '/admin/species',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['admin'],
        summary: 'List all pet species with launch visibility',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              species: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    slug: { type: 'string' },
                    label: { type: 'string' },
                    isActive: { type: 'boolean' },
                    petCount: { type: 'integer' },
                  },
                  required: ['id', 'slug', 'label', 'isActive', 'petCount'],
                },
              },
            },
            required: ['species'],
          },
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request) => {
      await assertAdmin(getUserId(request))
      const species = await listAdminPetSpecies()
      return { species }
    },
  )

  app.patch<{ Params: { id: string }; Body: { isActive: boolean } }>(
    '/admin/species/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['admin'],
        summary: 'Enable or disable a species in create/edit pickers',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['isActive'],
          properties: {
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              species: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  slug: { type: 'string' },
                  label: { type: 'string' },
                  isActive: { type: 'boolean' },
                  petCount: { type: 'integer' },
                },
                required: ['id', 'slug', 'label', 'isActive', 'petCount'],
              },
            },
            required: ['species'],
          },
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      await assertAdmin(getUserId(request))
      const id = Number(request.params.id)
      if (!Number.isInteger(id) || id < 1) {
        throw new AppError(400, 'Invalid species id', 'VALIDATION_ERROR')
      }
      const species = await setPetSpeciesActive(id, request.body.isActive)
      return { species }
    },
  )
}
