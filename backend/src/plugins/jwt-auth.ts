import jwt from '@fastify/jwt'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { config } from '../config.js'
import { AppError } from '../lib/errors.js'
import type { JwtPayload } from '../types/auth.js'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    authenticateOptional: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export async function registerJwtAuth(app: FastifyInstance) {
  await app.register(jwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.jwtExpiresIn },
  })

  app.decorate(
    'authenticate',
    async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
      try {
        await request.jwtVerify()
      } catch {
        throw new AppError(401, 'Authentication required', 'UNAUTHORIZED')
      }
    },
  )

  app.decorate(
    'authenticateOptional',
    async function authenticateOptional(request: FastifyRequest, _reply: FastifyReply) {
      const header = request.headers.authorization
      if (!header?.startsWith('Bearer ')) {
        return
      }
      try {
        await request.jwtVerify()
      } catch {
        /* invalid token — treat as guest */
      }
    },
  )
}

export function getUserId(request: FastifyRequest): number {
  const payload = request.user as JwtPayload
  return payload.sub
}

export function getOptionalUserId(request: FastifyRequest): number | undefined {
  const payload = request.user as JwtPayload | undefined
  if (payload?.sub === undefined) {
    return undefined
  }
  return payload.sub
}
