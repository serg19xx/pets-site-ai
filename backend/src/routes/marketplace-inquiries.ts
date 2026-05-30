import type { FastifyPluginAsync } from 'fastify'

import { AppError } from '../lib/errors.js'
import { getUserId } from '../plugins/jwt-auth.js'
import { errorResponseSchema } from '../schemas/auth.js'
import {
  createInquiryMessageBodySchema,
  marketplaceInquiriesResponseSchema,
  marketplaceInquiryThreadResponseSchema,
  marketplaceInquiryUnreadCountSchema,
} from '../schemas/marketplace-inquiries.js'
import {
  createOrReplyListingInquiry,
  getMarketplaceInquiryUnreadCount,
  getMarketplaceInquiryThread,
  listMarketplaceInquiries,
  markMarketplaceInquiryRead,
  replyMarketplaceInquiry,
} from '../services/marketplace-inquiries.js'

function parseLimit(value: unknown): number {
  if (value === undefined || value === '') {
    return 20
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

function parseInquiryId(id: string): number {
  const n = Number(id)
  if (!Number.isInteger(n) || n < 1) {
    throw new AppError(400, 'Invalid conversation id', 'VALIDATION_ERROR')
  }
  return n
}

function parseListingId(id: string): number {
  const n = Number(id)
  if (!Number.isInteger(n) || n < 1) {
    throw new AppError(400, 'Invalid listing id', 'VALIDATION_ERROR')
  }
  return n
}

function parseRole(value: unknown): 'customer' | 'seller' | 'all' {
  if (value === undefined || value === '' || value === 'all') {
    return 'all'
  }
  if (value === 'customer' || value === 'seller') {
    return value
  }
  throw new AppError(400, 'Invalid role (all, customer, or seller)', 'VALIDATION_ERROR')
}

export const marketplaceInquiryRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/marketplace/inquiries/unread-count',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['marketplace'],
        summary: 'Get unread marketplace conversation count',
        security: [{ bearerAuth: [] }],
        response: {
          200: marketplaceInquiryUnreadCountSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return { unreadCount: await getMarketplaceInquiryUnreadCount(getUserId(request)) }
    },
  )

  app.get(
    '/marketplace/inquiries',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['marketplace'],
        summary: 'List my marketplace conversations',
        description:
          'Query `role`: `all` (default), `customer` (you are the buyer), or `seller` (you own the listing). Not sent/received — same thread for both parties.',
        security: [{ bearerAuth: [] }],
        response: {
          200: marketplaceInquiriesResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const q = request.query as Record<string, unknown>
      const role = parseRole(q.role)
      return listMarketplaceInquiries(
        getUserId(request),
        role,
        parseLimit(q.limit),
        parseOffset(q.offset),
      )
    },
  )

  app.get(
    '/marketplace/inquiries/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['marketplace'],
        summary: 'Get marketplace conversation thread',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        response: {
          200: marketplaceInquiryThreadResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const inquiryId = parseInquiryId((request.params as { id: string }).id)
      const userId = getUserId(request)
      await markMarketplaceInquiryRead(inquiryId, userId)
      return getMarketplaceInquiryThread(inquiryId, userId)
    },
  )

  app.post<{ Params: { id: string }; Body: { body: string } }>(
    '/marketplace/listings/:id/inquiries',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['marketplace'],
        summary: 'Send first message to listing seller',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        body: createInquiryMessageBodySchema,
        response: {
          200: marketplaceInquiryThreadResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const listingId = parseListingId(request.params.id)
      const { body } = request.body
      return createOrReplyListingInquiry(listingId, getUserId(request), body)
    },
  )

  app.post<{ Params: { id: string }; Body: { body: string } }>(
    '/marketplace/inquiries/:id/messages',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['marketplace'],
        summary: 'Reply in marketplace conversation',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        body: createInquiryMessageBodySchema,
        response: {
          200: marketplaceInquiryThreadResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const inquiryId = parseInquiryId(request.params.id)
      const { body } = request.body
      return replyMarketplaceInquiry(inquiryId, getUserId(request), body)
    },
  )
}
