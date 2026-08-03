import type { FastifyPluginAsync } from 'fastify'

import { AppError } from '../lib/errors.js'
import { getUserId } from '../plugins/jwt-auth.js'
import { errorResponseSchema } from '../schemas/auth.js'
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_TYPES,
} from '../services/notifications.js'

const notificationSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    type: { type: 'string', enum: [...NOTIFICATION_TYPES] },
    title: { type: 'string' },
    body: { type: 'string' },
    linkPath: { type: ['string', 'null'] },
    readAt: { type: ['string', 'null'] },
    createdAt: { type: 'string' },
  },
  required: ['id', 'type', 'title', 'body', 'linkPath', 'readAt', 'createdAt'],
} as const

function parseLimit(value: unknown): number {
  if (value === undefined || value === '') {
    return 30
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

function parseNotificationId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError(400, 'Invalid notification id', 'VALIDATION_ERROR')
  }
  return id
}

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.get<{
    Querystring: { limit?: string; offset?: string; unreadOnly?: string }
  }>(
    '/notifications',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['notifications'],
        summary: 'List in-app notifications for the current user',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              notifications: { type: 'array', items: notificationSchema },
              total: { type: 'integer' },
              unreadCount: { type: 'integer' },
            },
            required: ['notifications', 'total', 'unreadCount'],
          },
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return listNotifications({
        userId: getUserId(request),
        limit: parseLimit(request.query.limit),
        offset: parseOffset(request.query.offset),
        unreadOnly:
          request.query.unreadOnly === '1' || request.query.unreadOnly === 'true',
      })
    },
  )

  app.get(
    '/notifications/unread-count',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['notifications'],
        summary: 'Unread notification count',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: { unreadCount: { type: 'integer' } },
            required: ['unreadCount'],
          },
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const unreadCount = await getUnreadNotificationCount(getUserId(request))
      return { unreadCount }
    },
  )

  app.post<{ Params: { id: string } }>(
    '/notifications/:id/read',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['notifications'],
        summary: 'Mark one notification as read',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: { notification: notificationSchema },
            required: ['notification'],
          },
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const notification = await markNotificationRead({
        userId: getUserId(request),
        notificationId: parseNotificationId(request.params.id),
      })
      return { notification }
    },
  )

  app.post(
    '/notifications/read-all',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['notifications'],
        summary: 'Mark all notifications as read',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: { updated: { type: 'integer' } },
            required: ['updated'],
          },
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return markAllNotificationsRead(getUserId(request))
    },
  )
}
