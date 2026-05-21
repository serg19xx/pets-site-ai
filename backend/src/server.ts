import cors from '@fastify/cors'
import Fastify from 'fastify'

import { registerOpenApi } from './openapi.js'
import { registerJwtAuth } from './plugins/jwt-auth.js'
import { registerUploads } from './plugins/uploads.js'
import { authRoutes, registerAuthErrorHandler } from './routes/auth.js'
import { galleryRoutes } from './routes/gallery.js'
import { healthRoutes } from './routes/health.js'
import { petsRoutes } from './routes/pets.js'

export async function buildServer() {
  const app = Fastify({ logger: true })
  registerAuthErrorHandler(app)
  await app.register(cors, { origin: true })
  await registerJwtAuth(app)
  await registerUploads(app)
  await registerOpenApi(app)
  await app.register(healthRoutes, { prefix: '/api' })
  await app.register(galleryRoutes, { prefix: '/api' })
  await app.register(authRoutes, { prefix: '/api' })
  await app.register(petsRoutes, { prefix: '/api' })
  return app
}
