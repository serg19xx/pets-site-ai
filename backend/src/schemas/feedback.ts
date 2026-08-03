import {
  FEEDBACK_DEVICE_CLASSES,
  FEEDBACK_TICKET_STATUSES,
  FEEDBACK_TICKET_TYPES,
} from '../services/feedback.js'

const authorSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    displayName: { type: 'string' },
    email: { type: 'string' },
    isAdmin: { type: 'boolean' },
  },
  required: ['id', 'displayName', 'email', 'isAdmin'],
} as const

const ticketSummarySchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    type: { type: 'string', enum: [...FEEDBACK_TICKET_TYPES] },
    status: { type: 'string', enum: [...FEEDBACK_TICKET_STATUSES] },
    message: { type: 'string' },
    pagePath: { type: ['string', 'null'] },
    deviceClass: { type: 'string', enum: [...FEEDBACK_DEVICE_CLASSES] },
    osLabel: { type: ['string', 'null'] },
    browserLabel: { type: ['string', 'null'] },
    hasScreenshot: { type: 'boolean' },
    hasConsoleText: { type: 'boolean' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    author: authorSchema,
    messageCount: { type: 'integer' },
  },
  required: [
    'id',
    'type',
    'status',
    'message',
    'pagePath',
    'deviceClass',
    'osLabel',
    'browserLabel',
    'hasScreenshot',
    'hasConsoleText',
    'createdAt',
    'updatedAt',
    'author',
    'messageCount',
  ],
} as const

const messageSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    body: { type: 'string' },
    createdAt: { type: 'string' },
    author: authorSchema,
  },
  required: ['id', 'body', 'createdAt', 'author'],
} as const

export const feedbackTicketDetailSchema = {
  type: 'object',
  properties: {
    ...ticketSummarySchema.properties,
    userAgent: { type: ['string', 'null'] },
    consoleText: { type: ['string', 'null'] },
    screenshotUrl: { type: ['string', 'null'] },
    messages: { type: 'array', items: messageSchema },
  },
  required: [
    ...ticketSummarySchema.required,
    'userAgent',
    'consoleText',
    'screenshotUrl',
    'messages',
  ],
} as const

export const feedbackTicketListSchema = {
  type: 'object',
  properties: {
    tickets: { type: 'array', items: ticketSummarySchema },
    total: { type: 'integer' },
  },
  required: ['tickets', 'total'],
} as const

export const feedbackTicketResponseSchema = {
  type: 'object',
  properties: {
    ticket: feedbackTicketDetailSchema,
  },
  required: ['ticket'],
} as const

export const feedbackReplyBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['body'],
  properties: {
    body: { type: 'string', minLength: 1, maxLength: 8000 },
  },
} as const

export const feedbackStatusBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status'],
  properties: {
    status: { type: 'string', enum: [...FEEDBACK_TICKET_STATUSES] },
  },
} as const

export const feedbackMeSchema = {
  type: 'object',
  properties: {
    isBetaTester: { type: 'boolean' },
    isFeedbackAdmin: { type: 'boolean' },
  },
  required: ['isBetaTester', 'isFeedbackAdmin'],
} as const
