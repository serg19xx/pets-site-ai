import type { FastifyPluginAsync } from 'fastify'

import { pool } from '../db/pool.js'

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({
    ok: true,
    service: 'pets-api',
  }))

  app.get('/health/db', async () => {
    const result = await pool.query<{ one: number }>('SELECT 1 AS one')
    return {
      ok: true,
      db: result.rows[0]?.one === 1,
    }
  })
}
