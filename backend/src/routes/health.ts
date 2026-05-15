import type { FastifyPluginAsync } from 'fastify'

import { pool } from '../db/pool.js'
import { healthDbResponseSchema, healthResponseSchema } from '../schemas/health.js'

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'API liveness',
        description: 'Returns 200 when the HTTP server is up. Does not check the database.',
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async () => ({
      ok: true,
      service: 'pets-api',
    }),
  )

  app.get(
    '/health/db',
    {
      schema: {
        tags: ['health'],
        summary: 'Database connectivity',
        description: 'Runs `SELECT 1` against PostgreSQL using DATABASE_URL.',
        response: {
          200: healthDbResponseSchema,
        },
      },
    },
    async () => {
      const result = await pool.query<{ one: number }>('SELECT 1 AS one')
      return {
        ok: true,
        db: result.rows[0]?.one === 1,
      }
    },
  )
}
