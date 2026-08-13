export const contactBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'email', 'message'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 120 },
    email: { type: 'string', format: 'email', maxLength: 320 },
    message: { type: 'string', minLength: 8, maxLength: 4000 },
    company: { type: 'string', maxLength: 200 },
  },
} as const
