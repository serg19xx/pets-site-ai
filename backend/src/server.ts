import cors from '@fastify/cors'
import Fastify from 'fastify'

import { registerOpenApi } from './openapi.js'
import { healthRoutes } from './routes/health.js'

export async function buildServer() {
  const app = Fastify({ logger: true })
  await app.register(cors, { origin: true })
  await registerOpenApi(app)
  await app.register(healthRoutes, { prefix: '/api' })
  return app
}
