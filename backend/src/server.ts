import cors from '@fastify/cors'
import Fastify from 'fastify'

import { healthRoutes } from './routes/health.js'

export async function buildServer() {
  const app = Fastify({ logger: true })
  await app.register(cors, { origin: true })
  await app.register(healthRoutes, { prefix: '/api' })
  return app
}
