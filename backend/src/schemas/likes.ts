export const petLikeStatusSchema = {
  type: 'object',
  properties: {
    liked: { type: 'boolean' },
    count: { type: 'integer' },
  },
  required: ['liked', 'count'],
} as const
