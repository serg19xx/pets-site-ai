export const healthResponseSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean', examples: [true] },
    service: { type: 'string', examples: ['pets-api'] },
  },
  required: ['ok', 'service'],
} as const

export const healthDbResponseSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean', examples: [true] },
    db: { type: 'boolean', description: 'True when SELECT 1 succeeds', examples: [true] },
  },
  required: ['ok', 'db'],
} as const
