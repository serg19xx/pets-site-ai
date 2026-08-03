import cors from '@fastify/cors'
import Fastify from 'fastify'

import { registerOpenApi } from './openapi.js'
import { registerJwtAuth } from './plugins/jwt-auth.js'
import { registerUploads } from './plugins/uploads.js'
import { adminRoutes } from './routes/admin.js'
import { authRoutes, registerAuthErrorHandler } from './routes/auth.js'
import { feedRoutes } from './routes/feed.js'
import { feedbackRoutes } from './routes/feedback.js'
import { galleryRoutes } from './routes/gallery.js'
import { healthRoutes } from './routes/health.js'
import { marketplaceInquiryRoutes } from './routes/marketplace-inquiries.js'
import { marketplaceRoutes } from './routes/marketplace.js'
import { notificationRoutes } from './routes/notifications.js'
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
  await app.register(feedRoutes, { prefix: '/api' })
  await app.register(marketplaceRoutes, { prefix: '/api' })
  await app.register(marketplaceInquiryRoutes, { prefix: '/api' })
  await app.register(feedbackRoutes, { prefix: '/api' })
  await app.register(notificationRoutes, { prefix: '/api' })
  await app.register(adminRoutes, { prefix: '/api' })
  await app.register(authRoutes, { prefix: '/api' })
  await app.register(petsRoutes, { prefix: '/api' })
  return app
}
