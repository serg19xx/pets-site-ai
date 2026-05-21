import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import type { FastifyInstance } from 'fastify'

import { config } from '../config.js'

export async function registerUploads(app: FastifyInstance) {
  await app.register(multipart, {
    limits: {
      fileSize: config.uploadMaxBytes,
      files: 1,
    },
  })

  await app.register(fastifyStatic, {
    root: config.uploadsDir,
    prefix: `${config.uploadsPublicPrefix}/`,
    decorateReply: false,
  })
}
