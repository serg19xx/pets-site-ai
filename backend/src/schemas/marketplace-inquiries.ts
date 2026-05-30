import { publicMemberSchema } from './feed.js'

export const marketplaceInquiryMessageSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    senderUserId: { type: 'integer' },
    body: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    sender: publicMemberSchema,
    isMine: { type: 'boolean' },
  },
  required: ['id', 'senderUserId', 'body', 'createdAt', 'sender', 'isMine'],
} as const

export const marketplaceInquirySummarySchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    listingId: { type: 'integer' },
    listingTitle: { type: 'string' },
    listingStatus: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    customer: publicMemberSchema,
    seller: publicMemberSchema,
    lastMessage: {
      anyOf: [
        {
          type: 'object',
          properties: {
            body: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            senderUserId: { type: 'integer' },
          },
          required: ['body', 'createdAt', 'senderUserId'],
        },
        { type: 'null' },
      ],
    },
    unreadCount: { type: 'integer' },
    role: { type: 'string', enum: ['customer', 'seller'] },
  },
  required: [
    'id',
    'listingId',
    'listingTitle',
    'listingStatus',
    'createdAt',
    'updatedAt',
    'customer',
    'seller',
    'lastMessage',
    'unreadCount',
    'role',
  ],
} as const

export const marketplaceInquiriesResponseSchema = {
  type: 'object',
  properties: {
    inquiries: { type: 'array', items: marketplaceInquirySummarySchema },
    total: { type: 'integer' },
  },
  required: ['inquiries', 'total'],
} as const

export const marketplaceInquiryThreadResponseSchema = {
  type: 'object',
  properties: {
    inquiry: marketplaceInquirySummarySchema,
    messages: { type: 'array', items: marketplaceInquiryMessageSchema },
  },
  required: ['inquiry', 'messages'],
} as const

export const marketplaceInquiryUnreadCountSchema = {
  type: 'object',
  properties: {
    unreadCount: { type: 'integer' },
  },
  required: ['unreadCount'],
} as const

export const createInquiryMessageBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['body'],
  properties: {
    body: { type: 'string', minLength: 1, maxLength: 2000 },
  },
} as const
