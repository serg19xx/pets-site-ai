export const publicMemberSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    displayName: { type: 'string' },
    avatarUrl: { type: ['string', 'null'] },
  },
  required: ['id', 'displayName', 'avatarUrl'],
} as const

export const feedPostMediaSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    kind: { type: 'string', enum: ['image', 'video'] },
    url: { type: 'string' },
    sortOrder: { type: 'integer' },
  },
  required: ['id', 'kind', 'url', 'sortOrder'],
} as const

export const feedPostSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    body: { type: ['string', 'null'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    author: publicMemberSchema,
    media: { type: 'array', items: feedPostMediaSchema },
    likeCount: { type: 'integer' },
    commentCount: { type: 'integer' },
    liked: { type: 'boolean' },
    saved: { type: 'boolean' },
  },
  required: [
    'id',
    'body',
    'createdAt',
    'updatedAt',
    'author',
    'media',
    'likeCount',
    'commentCount',
    'liked',
    'saved',
  ],
} as const

export const feedPostsResponseSchema = {
  type: 'object',
  properties: {
    posts: { type: 'array', items: feedPostSchema },
    total: { type: 'integer' },
  },
  required: ['posts', 'total'],
} as const

export const feedPostResponseSchema = {
  type: 'object',
  properties: {
    post: feedPostSchema,
  },
  required: ['post'],
} as const

export const feedCommentSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    body: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    author: publicMemberSchema,
  },
  required: ['id', 'body', 'createdAt', 'author'],
} as const

export const feedCommentsResponseSchema = {
  type: 'object',
  properties: {
    comments: { type: 'array', items: feedCommentSchema },
  },
  required: ['comments'],
} as const

export const postEngagementSchema = {
  type: 'object',
  properties: {
    liked: { type: 'boolean' },
    likeCount: { type: 'integer' },
    saved: { type: 'boolean' },
  },
  required: ['liked', 'likeCount', 'saved'],
} as const

export const postSaveSchema = {
  type: 'object',
  properties: {
    saved: { type: 'boolean' },
  },
  required: ['saved'],
} as const
