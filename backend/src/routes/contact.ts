import type { FastifyPluginAsync } from 'fastify'

import { errorResponseSchema, messageResponseSchema } from '../schemas/auth.js'
import { contactBodySchema } from '../schemas/contact.js'
import { sendContactMessage } from '../services/contact.js'

interface ContactBody {
  name: string
  email: string
  message: string
  company?: string
}

export const contactRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: ContactBody }>(
    '/contact',
    {
      schema: {
        tags: ['contact'],
        summary: 'Send a public contact message',
        body: contactBodySchema,
        response: {
          200: messageResponseSchema,
          400: errorResponseSchema,
          429: errorResponseSchema,
          503: errorResponseSchema,
        },
      },
    },
    async (request) => {
      await sendContactMessage({
        name: request.body.name,
        email: request.body.email,
        message: request.body.message,
        company: request.body.company,
        clientKey: request.ip || 'unknown',
      })
      return { message: 'Message sent.' }
    },
  )
}
