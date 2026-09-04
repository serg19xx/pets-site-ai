import cors from '@fastify/cors'
import Fastify from 'fastify'
import rawBody from 'fastify-raw-body'

import { registerOpenApi } from './openapi.js'
import { registerJwtAuth } from './plugins/jwt-auth.js'
import { registerUploads } from './plugins/uploads.js'
import { adminRoutes } from './routes/admin.js'
import { authRoutes, registerAuthErrorHandler } from './routes/auth.js'
import { contactRoutes } from './routes/contact.js'
import { feedRoutes } from './routes/feed.js'
import { feedbackRoutes } from './routes/feedback.js'
import { friendsRoutes } from './routes/friends.js'
import { galleryRoutes } from './routes/gallery.js'
import { healthRoutes } from './routes/health.js'
import { marketplaceInquiryRoutes } from './routes/marketplace-inquiries.js'
import { marketplaceRoutes } from './routes/marketplace.js'
import { notificationRoutes } from './routes/notifications.js'
import { petsRoutes } from './routes/pets.js'
import { stripeWebhookRoutes } from './routes/stripe-webhook.js'

export async function buildServer() {
  const app = Fastify({ logger: true, trustProxy: true })
  registerAuthErrorHandler(app)
  await app.register(cors, { origin: true })
  await registerJwtAuth(app)
  await registerUploads(app)
  await app.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: false,
    runFirst: true,
  })
  await registerOpenApi(app)
  await app.register(healthRoutes, { prefix: '/api' })
  await app.register(contactRoutes, { prefix: '/api' })
  await app.register(galleryRoutes, { prefix: '/api' })
  await app.register(feedRoutes, { prefix: '/api' })
  await app.register(marketplaceRoutes, { prefix: '/api' })
  await app.register(marketplaceInquiryRoutes, { prefix: '/api' })
  await app.register(feedbackRoutes, { prefix: '/api' })
  await app.register(notificationRoutes, { prefix: '/api' })
  await app.register(friendsRoutes, { prefix: '/api' })
  await app.register(adminRoutes, { prefix: '/api' })
  await app.register(authRoutes, { prefix: '/api' })
  await app.register(petsRoutes, { prefix: '/api' })
  await app.register(stripeWebhookRoutes, { prefix: '/api' })
  return app
}
