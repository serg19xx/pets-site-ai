import type { FastifyPluginAsync } from 'fastify'

import { AppError } from '../lib/errors.js'
import { getUserId } from '../plugins/jwt-auth.js'
import { errorResponseSchema } from '../schemas/auth.js'
import {
  feedbackDecisionBodySchema,
  feedbackMeSchema,
  feedbackReplyBodySchema,
  feedbackStatusBodySchema,
  feedbackTicketListSchema,
  feedbackTicketResponseSchema,
} from '../schemas/feedback.js'
import {
  createFeedbackTicket,
  decideFeedbackImprovement,
  FEEDBACK_DEVICE_CLASSES,
  FEEDBACK_TICKET_TYPES,
  getFeedbackAccess,
  getFeedbackTicket,
  listFeedbackTickets,
  replyFeedbackTicket,
  updateFeedbackTicketStatus,
  type FeedbackDeviceClass,
  type FeedbackTicketStatus,
  type FeedbackTicketType,
} from '../services/feedback.js'

function parseLimit(value: unknown): number {
  if (value === undefined || value === '') {
    return 30
  }
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 50) {
    throw new AppError(400, 'Invalid limit (1–50)', 'VALIDATION_ERROR')
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

function parseTicketId(id: string): number {
  const n = Number(id)
  if (!Number.isInteger(n) || n < 1) {
    throw new AppError(400, 'Invalid feedback id', 'VALIDATION_ERROR')
  }
  return n
}

function parseType(value: unknown): FeedbackTicketType {
  if (typeof value === 'string' && (FEEDBACK_TICKET_TYPES as readonly string[]).includes(value)) {
    return value as FeedbackTicketType
  }
  throw new AppError(400, 'type must be bug or improvement', 'VALIDATION_ERROR')
}

function parseDeviceClass(value: unknown): FeedbackDeviceClass {
  if (
    typeof value === 'string' &&
    (FEEDBACK_DEVICE_CLASSES as readonly string[]).includes(value)
  ) {
    return value as FeedbackDeviceClass
  }
  return 'unknown'
}

export const feedbackRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/feedback/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['feedback'],
        summary: 'Feedback access flags for current user',
        security: [{ bearerAuth: [] }],
        response: {
          200: feedbackMeSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return getFeedbackAccess(getUserId(request))
    },
  )

  app.get<{ Querystring: { scope?: string; limit?: string; offset?: string } }>(
    '/feedback/tickets',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['feedback'],
        summary: 'List feedback tickets (mine or all if admin)',
        security: [{ bearerAuth: [] }],
        response: {
          200: feedbackTicketListSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const scope = request.query.scope === 'all' ? 'all' : 'mine'
      return listFeedbackTickets(getUserId(request), {
        scope,
        limit: parseLimit(request.query.limit),
        offset: parseOffset(request.query.offset),
      })
    },
  )

  app.get<{ Params: { id: string } }>(
    '/feedback/tickets/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['feedback'],
        summary: 'Get feedback ticket thread',
        security: [{ bearerAuth: [] }],
        response: {
          200: feedbackTicketResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const ticket = await getFeedbackTicket(
        getUserId(request),
        parseTicketId(request.params.id),
      )
      return { ticket }
    },
  )

  app.post(
    '/feedback/tickets',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['feedback'],
        summary: 'Create bug or improvement feedback (multipart)',
        description:
          'Multipart fields: type (bug|improvement), message; for bugs optionally pagePath, userAgent, deviceClass, osLabel, browserLabel, consoleText, screenshot (image).',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        response: {
          201: feedbackTicketResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = getUserId(request)
      const fields: Record<string, string> = {}
      let screenshot: { buffer: Buffer; mimetype: string; filename?: string } | null =
        null

      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (part.fieldname === 'screenshot' || part.fieldname === 'file') {
            const buffer = await part.toBuffer()
            screenshot = {
              buffer,
              mimetype: part.mimetype || 'application/octet-stream',
              filename: part.filename,
            }
          } else {
            await part.toBuffer()
          }
        } else {
          fields[part.fieldname] = String(part.value)
        }
      }

      const type = parseType(fields.type)
      const message = fields.message
      if (!message) {
        throw new AppError(400, 'message is required', 'VALIDATION_ERROR')
      }

      if (type !== 'bug') {
        screenshot = null
      }

      const ticket = await createFeedbackTicket({
        userId,
        type,
        message,
        pagePath: fields.pagePath ?? null,
        userAgent: fields.userAgent ?? null,
        deviceClass: parseDeviceClass(fields.deviceClass),
        osLabel: fields.osLabel ?? null,
        browserLabel: fields.browserLabel ?? null,
        consoleText: fields.consoleText ?? null,
        screenshot,
      })

      return reply.status(201).send({ ticket })
    },
  )

  app.post<{ Params: { id: string }; Body: { body: string } }>(
    '/feedback/tickets/:id/replies',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['feedback'],
        summary: 'Reply on a feedback ticket',
        security: [{ bearerAuth: [] }],
        body: feedbackReplyBodySchema,
        response: {
          200: feedbackTicketResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const ticket = await replyFeedbackTicket({
        userId: getUserId(request),
        ticketId: parseTicketId(request.params.id),
        body: request.body.body,
      })
      return { ticket }
    },
  )

  app.patch<{ Params: { id: string }; Body: { status: FeedbackTicketStatus } }>(
    '/feedback/tickets/:id/status',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['feedback'],
        summary: 'Update feedback ticket status (admin)',
        security: [{ bearerAuth: [] }],
        body: feedbackStatusBodySchema,
        response: {
          200: feedbackTicketResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const ticket = await updateFeedbackTicketStatus({
        userId: getUserId(request),
        ticketId: parseTicketId(request.params.id),
        status: request.body.status,
      })
      return { ticket }
    },
  )

  app.post<{
    Params: { id: string }
    Body: { decision: 'accepted' | 'rejected'; note: string }
  }>(
    '/feedback/tickets/:id/decision',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['feedback'],
        summary: 'Accept or reject an improvement (admin)',
        security: [{ bearerAuth: [] }],
        body: feedbackDecisionBodySchema,
        response: {
          200: feedbackTicketResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const ticket = await decideFeedbackImprovement({
        adminUserId: getUserId(request),
        ticketId: parseTicketId(request.params.id),
        decision: request.body.decision,
        note: request.body.note,
      })
      return { ticket }
    },
  )
}
