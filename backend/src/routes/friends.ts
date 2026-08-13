import type { FastifyPluginAsync } from 'fastify'

import { AppError } from '../lib/errors.js'
import { getUserId } from '../plugins/jwt-auth.js'
import { errorResponseSchema, messageResponseSchema } from '../schemas/auth.js'
import {
  createFriendRequestBodySchema,
  friendStatusResponseSchema,
  friendsOverviewResponseSchema,
} from '../schemas/friends.js'
import {
  acceptFriendship,
  declineFriendship,
  getFriendStatus,
  listFriendships,
  removeFriendship,
  requestFriendship,
} from '../services/user-friendships.js'

function parseTargetUserId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError(400, 'Invalid user id', 'VALIDATION_ERROR')
  }
  return id
}

export const friendsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/friends',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['friends'],
        summary: 'List friends and pending friend requests',
        security: [{ bearerAuth: [] }],
        response: {
          200: friendsOverviewResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => listFriendships(getUserId(request)),
  )

  app.get<{ Params: { userId: string } }>(
    '/friends/status/:userId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['friends'],
        summary: 'Friendship status with another member',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { userId: { type: 'integer' } },
          required: ['userId'],
        },
        response: {
          200: friendStatusResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => getFriendStatus(getUserId(request), parseTargetUserId(request.params.userId)),
  )

  app.post<{ Body: { userId: number } }>(
    '/friends',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['friends'],
        summary: 'Send a friend request (or accept if they already asked you)',
        security: [{ bearerAuth: [] }],
        body: createFriendRequestBodySchema,
        response: {
          200: friendStatusResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request) => requestFriendship(getUserId(request), request.body.userId),
  )

  app.post<{ Params: { userId: string } }>(
    '/friends/:userId/accept',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['friends'],
        summary: 'Accept an incoming friend request',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { userId: { type: 'integer' } },
          required: ['userId'],
        },
        response: {
          200: friendStatusResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) =>
      acceptFriendship(getUserId(request), parseTargetUserId(request.params.userId)),
  )

  app.post<{ Params: { userId: string } }>(
    '/friends/:userId/decline',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['friends'],
        summary: 'Decline an incoming friend request',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { userId: { type: 'integer' } },
          required: ['userId'],
        },
        response: {
          200: messageResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      await declineFriendship(getUserId(request), parseTargetUserId(request.params.userId))
      return { message: 'Friend request declined.' }
    },
  )

  app.delete<{ Params: { userId: string } }>(
    '/friends/:userId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['friends'],
        summary: 'Unfriend or cancel an outgoing friend request',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { userId: { type: 'integer' } },
          required: ['userId'],
        },
        response: {
          204: { type: 'null' },
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await removeFriendship(getUserId(request), parseTargetUserId(request.params.userId))
      return reply.code(204).send()
    },
  )
}
