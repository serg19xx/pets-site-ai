import type { FastifyInstance } from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

const openApiInfo = {
  title: 'PETS API',
  description:
    'REST API for the PETS monorepo. Interactive docs (Swagger UI) and the OpenAPI JSON spec are served by the API itself.',
  version: '1.0.0',
}

export async function registerOpenApi(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: openApiInfo,
      servers: [
        {
          url: 'http://localhost:8080',
          description: 'Local development (API on host or Docker mapped port)',
        },
      ],
      tags: [
        {
          name: 'health',
          description: 'Liveness and database connectivity checks',
        },
        {
          name: 'gallery',
          description: 'Public browse (pet photos grid)',
        },
        {
          name: 'auth',
          description: 'Registration, login, and password recovery',
        },
        {
          name: 'pets',
          description: 'User pets, species and breed catalog',
        },
        {
          name: 'feedback',
          description: 'Beta tester bug reports and improvement ideas',
        },
        {
          name: 'admin',
          description: 'Site admin (users, moderation helpers)',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  })
}
