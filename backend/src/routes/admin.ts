import type { FastifyPluginAsync } from 'fastify'

import { AppError } from '../lib/errors.js'
import { assertAdmin } from '../lib/admin.js'
import { getUserId } from '../plugins/jwt-auth.js'
import { errorResponseSchema } from '../schemas/auth.js'
import { listAdminUsers, deleteAdminUser } from '../services/admin-users.js'

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
}
