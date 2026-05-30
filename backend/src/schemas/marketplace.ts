import { publicMemberSchema } from './feed.js'

const listingTypeSchema = {
  type: 'string',
  enum: ['sell', 'buy', 'exchange', 'service'],
} as const

const listingStatusSchema = {
  type: 'string',
  enum: ['draft', 'active', 'archived', 'closed'],
} as const

export const marketplaceListingMediaSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    kind: { type: 'string', enum: ['image', 'video'] },
    url: { type: 'string' },
    sortOrder: { type: 'integer' },
  },
  required: ['id', 'kind', 'url', 'sortOrder'],
} as const

export const marketplaceListingInquirySettingsSchema = {
  type: 'object',
  properties: {
    inquiryNotifyEmail: { type: 'boolean' },
    inquiryNotifySms: { type: 'boolean' },
    inquirySmsPhone: { type: ['string', 'null'] },
  },
  required: ['inquiryNotifyEmail', 'inquiryNotifySms', 'inquirySmsPhone'],
} as const

export const marketplaceListingSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    type: listingTypeSchema,
    title: { type: 'string' },
    description: { type: 'string' },
    priceAmount: { type: ['number', 'null'] },
    priceCurrency: { type: 'string' },
    city: { type: ['string', 'null'] },
    contactPhone: { type: ['string', 'null'] },
    contactMethod: { type: ['string', 'null'] },
    status: listingStatusSchema,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    author: publicMemberSchema,
    media: { type: 'array', items: marketplaceListingMediaSchema },
    inquirySettings: marketplaceListingInquirySettingsSchema,
  },
  required: [
    'id',
    'type',
    'title',
    'description',
    'priceAmount',
    'priceCurrency',
    'city',
    'contactPhone',
    'contactMethod',
    'status',
    'createdAt',
    'updatedAt',
    'author',
    'media',
  ],
} as const

export const marketplaceListingsResponseSchema = {
  type: 'object',
  properties: {
    listings: {
      type: 'array',
      items: marketplaceListingSchema,
    },
    total: { type: 'integer' },
  },
  required: ['listings', 'total'],
} as const

export const marketplaceListingResponseSchema = {
  type: 'object',
  properties: {
    listing: marketplaceListingSchema,
  },
  required: ['listing'],
} as const

export const createMarketplaceListingBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'title', 'description'],
  properties: {
    type: listingTypeSchema,
    title: { type: 'string', minLength: 3, maxLength: 180 },
    description: { type: 'string', minLength: 10, maxLength: 5000 },
    priceAmount: { type: 'number', minimum: 0 },
    priceCurrency: { type: 'string', minLength: 3, maxLength: 3 },
    city: { type: 'string', maxLength: 120 },
    contactPhone: { type: 'string', maxLength: 40 },
    contactMethod: { type: 'string', maxLength: 120 },
    status: listingStatusSchema,
  },
} as const

export const updateMarketplaceListingBodySchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    type: listingTypeSchema,
    title: { type: 'string', minLength: 3, maxLength: 180 },
    description: { type: 'string', minLength: 10, maxLength: 5000 },
    priceAmount: { anyOf: [{ type: 'number', minimum: 0 }, { type: 'null' }] },
    priceCurrency: { type: 'string', minLength: 3, maxLength: 3 },
    city: { anyOf: [{ type: 'string', maxLength: 120 }, { type: 'null' }] },
    contactPhone: { anyOf: [{ type: 'string', maxLength: 40 }, { type: 'null' }] },
    contactMethod: { anyOf: [{ type: 'string', maxLength: 120 }, { type: 'null' }] },
    status: listingStatusSchema,
    inquiryNotifyEmail: { type: 'boolean' },
    inquiryNotifySms: { type: 'boolean' },
    inquirySmsPhone: { anyOf: [{ type: 'string', maxLength: 40 }, { type: 'null' }] },
  },
} as const
