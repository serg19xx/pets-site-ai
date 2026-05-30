import type { FastifyPluginAsync, FastifyRequest } from 'fastify'

import { AppError } from '../lib/errors.js'
import { logProductEvent } from '../lib/product-events.js'
import { getOptionalUserId, getUserId } from '../plugins/jwt-auth.js'
import { errorResponseSchema } from '../schemas/auth.js'
import {
  marketplaceListingResponseSchema,
  marketplaceListingsResponseSchema,
  updateMarketplaceListingBodySchema,
} from '../schemas/marketplace.js'
import {
  addMarketplaceListingMedia,
  createMarketplaceListing,
  deleteMarketplaceListing,
  deleteMarketplaceListingMedia,
  getMarketplaceListingById,
  listMarketplaceListings,
  listMyMarketplaceListings,
  updateMarketplaceListing,
  type CreateMarketplaceListingInput,
  type PendingListingMedia,
} from '../services/marketplace-listings.js'

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

function parseListingId(id: string): number {
  const n = Number(id)
  if (!Number.isInteger(n) || n < 1) {
    throw new AppError(400, 'Invalid listing id', 'VALIDATION_ERROR')
  }
  return n
}

function parseMediaId(id: string): number {
  const n = Number(id)
  if (!Number.isInteger(n) || n < 1) {
    throw new AppError(400, 'Invalid media id', 'VALIDATION_ERROR')
  }
  return n
}

const LISTING_TYPES = new Set(['sell', 'buy', 'exchange', 'service'])
const LISTING_STATUSES = new Set(['draft', 'active', 'archived', 'closed'])

async function parseListingMultipart(
  request: FastifyRequest,
): Promise<{ fields: Record<string, string>; files: PendingListingMedia[] }> {
  const fields: Record<string, string> = {}
  const files: PendingListingMedia[] = []

  for await (const part of request.parts()) {
    if (part.type === 'file') {
      if (part.fieldname === 'files' || part.fieldname === 'file') {
        const buffer = await part.toBuffer()
        files.push({
          buffer,
          mimetype: part.mimetype ?? 'application/octet-stream',
          filename: part.filename,
        })
      } else {
        await part.toBuffer()
      }
    } else {
      fields[part.fieldname] = String(part.value ?? '')
    }
  }

  return { fields, files }
}

function buildCreateInput(fields: Record<string, string>): CreateMarketplaceListingInput {
  const type = fields.type?.trim()
  if (!type || !LISTING_TYPES.has(type)) {
    throw new AppError(400, 'Invalid listing type', 'VALIDATION_ERROR')
  }

  const title = fields.title?.trim() ?? ''
  const description = fields.description?.trim() ?? ''
  if (title.length < 3 || title.length > 180) {
    throw new AppError(400, 'Title must be 3–180 characters', 'VALIDATION_ERROR')
  }
  if (description.length < 10 || description.length > 5000) {
    throw new AppError(400, 'Description must be 10–5000 characters', 'VALIDATION_ERROR')
  }

  let priceAmount: number | null = null
  const priceRaw = fields.priceAmount?.trim()
  if (priceRaw) {
    const parsed = Number(priceRaw)
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new AppError(400, 'Invalid price amount', 'VALIDATION_ERROR')
    }
    priceAmount = parsed
  }

  let status: CreateMarketplaceListingInput['status'] | undefined
  const statusRaw = fields.status?.trim()
  if (statusRaw) {
    if (!LISTING_STATUSES.has(statusRaw)) {
      throw new AppError(400, 'Invalid listing status', 'VALIDATION_ERROR')
    }
    status = statusRaw as CreateMarketplaceListingInput['status']
  }

  return {
    type: type as CreateMarketplaceListingInput['type'],
    title,
    description,
    priceAmount,
    priceCurrency: fields.priceCurrency?.trim() || undefined,
    city: fields.city?.trim() || null,
    contactPhone: fields.contactPhone?.trim() || null,
    contactMethod: fields.contactMethod?.trim() || null,
    status,
  }
}

export const marketplaceRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/marketplace/listings',
    {
      schema: {
        tags: ['marketplace'],
        summary: 'List active marketplace listings',
        description:
          'Newest first. Public endpoint. Query: `limit` (1–50, default 20), `offset`.',
        response: {
          200: marketplaceListingsResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const q = request.query as Record<string, unknown>
      return listMarketplaceListings(parseLimit(q.limit), parseOffset(q.offset))
    },
  )

  app.get(
    '/marketplace/listings/mine',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['marketplace'],
        summary: 'List my marketplace listings',
        security: [{ bearerAuth: [] }],
        response: {
          200: marketplaceListingsResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const q = request.query as Record<string, unknown>
      return listMyMarketplaceListings(getUserId(request), parseLimit(q.limit), parseOffset(q.offset))
    },
  )

  app.get(
    '/marketplace/listings/:id',
    {
      onRequest: [app.authenticateOptional],
      schema: {
        tags: ['marketplace'],
        summary: 'Get marketplace listing by id',
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        response: {
          200: marketplaceListingResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const listingId = parseListingId(id)
      const viewerUserId = getOptionalUserId(request)
      const listing = await getMarketplaceListingById(listingId, viewerUserId)
      logProductEvent('listing_viewed', {
        listingId,
        viewerUserId: viewerUserId ?? null,
      })
      return { listing }
    },
  )

  app.post(
    '/marketplace/listings',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['marketplace'],
        summary: 'Create marketplace listing',
        description:
          'Multipart: fields `type`, `title`, `description`, optional `priceAmount`, `priceCurrency`, `city`, `contactPhone`, `contactMethod`, `status`. Optional images as `files` (max 5).',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        response: {
          200: marketplaceListingResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const { fields, files } = await parseListingMultipart(request)
      const input = buildCreateInput(fields)
      const listing = await createMarketplaceListing(getUserId(request), input, files)
      return { listing }
    },
  )

  app.post(
    '/marketplace/listings/:id/media',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['marketplace'],
        summary: 'Add images to my marketplace listing',
        description: 'Multipart: one or more files as `files`. Total images per listing is capped at 5.',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        response: {
          200: marketplaceListingResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const listingId = parseListingId((request.params as { id: string }).id)
      const files: PendingListingMedia[] = []
      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (part.fieldname === 'files' || part.fieldname === 'file') {
            files.push({
              buffer: await part.toBuffer(),
              mimetype: part.mimetype ?? 'application/octet-stream',
              filename: part.filename,
            })
          } else {
            await part.toBuffer()
          }
        }
      }
      const listing = await addMarketplaceListingMedia(getUserId(request), listingId, files)
      return { listing }
    },
  )

  app.delete<{ Params: { id: string; mediaId: string } }>(
    '/marketplace/listings/:id/media/:mediaId',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['marketplace'],
        summary: 'Remove an image from my marketplace listing',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            mediaId: { type: 'string' },
          },
          required: ['id', 'mediaId'],
        },
        response: {
          200: marketplaceListingResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const listingId = parseListingId(request.params.id)
      const mediaId = parseMediaId(request.params.mediaId)
      const listing = await deleteMarketplaceListingMedia(
        getUserId(request),
        listingId,
        mediaId,
      )
      return { listing }
    },
  )

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/marketplace/listings/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['marketplace'],
        summary: 'Update my marketplace listing',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        body: updateMarketplaceListingBodySchema,
        response: {
          200: marketplaceListingResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const listingId = parseListingId(request.params.id)
      const patch = request.body as {
        type?: 'sell' | 'buy' | 'exchange' | 'service'
        title?: string
        description?: string
        priceAmount?: number | null
        priceCurrency?: string
        city?: string | null
        contactPhone?: string | null
        contactMethod?: string | null
        status?: 'draft' | 'active' | 'archived' | 'closed'
        inquiryNotifyEmail?: boolean
        inquiryNotifySms?: boolean
        inquirySmsPhone?: string | null
      }
      const listing = await updateMarketplaceListing(getUserId(request), listingId, patch)
      return { listing }
    },
  )

  app.delete<{ Params: { id: string } }>(
    '/marketplace/listings/:id',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['marketplace'],
        summary: 'Delete my marketplace listing',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        response: {
          204: { type: 'null', description: 'No content' },
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const listingId = parseListingId(request.params.id)
      await deleteMarketplaceListing(getUserId(request), listingId)
      return reply.status(204).send()
    },
  )
}
