import { publicMemberSchema } from './gallery.js'

export const friendRelationStatusSchema = {
  type: 'string',
  enum: ['none', 'outgoing', 'incoming', 'friends', 'self'],
} as const

export const friendMemberSchema = {
  type: 'object',
  properties: {
    id: publicMemberSchema.properties.id,
    displayName: publicMemberSchema.properties.displayName,
    avatarUrl: publicMemberSchema.properties.avatarUrl,
    since: { type: ['string', 'null'] },
  },
  required: ['id', 'displayName', 'avatarUrl', 'since'],
} as const

export const friendRequestSchema = {
  type: 'object',
  properties: {
    id: publicMemberSchema.properties.id,
    displayName: publicMemberSchema.properties.displayName,
    avatarUrl: publicMemberSchema.properties.avatarUrl,
    requestedAt: { type: 'string' },
  },
  required: ['id', 'displayName', 'avatarUrl', 'requestedAt'],
} as const

export const friendsOverviewResponseSchema = {
  type: 'object',
  properties: {
    friends: { type: 'array', items: friendMemberSchema },
    incoming: { type: 'array', items: friendRequestSchema },
    outgoing: { type: 'array', items: friendRequestSchema },
  },
  required: ['friends', 'incoming', 'outgoing'],
} as const

export const friendStatusResponseSchema = {
  type: 'object',
  properties: {
    status: friendRelationStatusSchema,
  },
  required: ['status'],
} as const

export const createFriendRequestBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['userId'],
  properties: {
    userId: { type: 'integer', minimum: 1 },
  },
} as const
