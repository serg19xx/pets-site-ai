import type { FastifyInstance, FastifyPluginAsync } from 'fastify'

import { AppError } from '../lib/errors.js'
import { getUserId } from '../plugins/jwt-auth.js'
import {
  authSessionSchema,
  changePasswordBodySchema,
  errorResponseSchema,
  forgotPasswordBodySchema,
  loginBodySchema,
  messageResponseSchema,
  registerBodySchema,
  profileResponseSchema,
  sessionUserSchema,
  tokenBodySchema,
  updateProfileBodySchema,
} from '../schemas/auth.js'
import { changePassword } from '../services/change-password.js'
import { requestPasswordReset } from '../services/forgot-password.js'
import { getSessionForUser } from '../services/get-session.js'
import { loginUser } from '../services/login-user.js'
import { completeMagicLogin } from '../services/magic-login.js'
import { registerUser } from '../services/register-user.js'
import { removeUserAvatar, uploadUserAvatar } from '../services/upload-user-avatar.js'
import { updateProfile } from '../services/update-profile.js'
import { verifyEmailByToken } from '../services/verify-email.js'
import { parseGender } from '../services/register-user.js'

interface RegisterBody {
  fullName: string
  nickname?: string
  gender: string
  dateOfBirth: string
  phone?: string
  email: string
}

interface LoginBody {
  email: string
  password: string
}

interface ChangePasswordBody {
  currentPassword?: string
  newPassword: string
}

interface ForgotPasswordBody {
  email: string
}

interface TokenBody {
  token: string
}

interface UpdateProfileBody {
  fullName: string
  nickname?: string
  phone?: string
  gender: string
  dateOfBirth: string
  showFullName: boolean
  showNickname: boolean
  showEmail: boolean
  showPhone: boolean
  showGender: boolean
  showDateOfBirth: boolean
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: RegisterBody }>(
    '/auth/register',
    {
      schema: {
        tags: ['auth'],
        summary: 'Register (email verification required)',
        description:
          'Creates an account and emails either a temporary password or a one-time sign-in link. No password is chosen in the form.',
        body: registerBodySchema,
        response: {
          201: messageResponseSchema,
          400: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body
      const nickname =
        body.nickname?.trim() ||
        body.fullName.trim().split(/\s+/)[0] ||
        body.email.split('@')[0] ||
        'User'

      const result = await registerUser({
        fullName: body.fullName,
        nickname,
        gender: parseGender(body.gender),
        dateOfBirth: body.dateOfBirth,
        phone: body.phone?.trim() || null,
        email: body.email,
      })

      return reply.status(201).send(result)
    },
  )

  app.post<{ Body: LoginBody }>(
    '/auth/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Sign in with email and password',
        body: loginBodySchema,
        response: {
          200: authSessionSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const session = await loginUser(
        {
          email: request.body.email,
          password: request.body.password.trim(),
        },
        (payload) => app.jwt.sign(payload),
      )
      return session
    },
  )

  app.get(
    '/auth/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Current user session',
        security: [{ bearerAuth: [] }],
        response: {
          200: sessionUserSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return getSessionForUser(getUserId(request))
    },
  )

  app.patch<{ Body: UpdateProfileBody }>(
    '/auth/profile',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Update profile and privacy settings',
        description: 'Email cannot be changed here. At least full name or nickname must stay public.',
        security: [{ bearerAuth: [] }],
        body: updateProfileBodySchema,
        response: {
          200: profileResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const body = request.body
      const user = await updateProfile({
        userId: getUserId(request),
        fullName: body.fullName,
        nickname: body.nickname,
        phone: body.phone?.trim() || null,
        gender: parseGender(body.gender),
        dateOfBirth: body.dateOfBirth,
        showFullName: body.showFullName,
        showNickname: body.showNickname,
        showEmail: body.showEmail,
        showPhone: body.showPhone,
        showGender: body.showGender,
        showDateOfBirth: body.showDateOfBirth,
      })
      return { user }
    },
  )

  app.post(
    '/auth/avatar',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Upload profile avatar',
        description: 'Multipart form field: `file` (JPEG, PNG, WebP, GIF; max 5 MB).',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        response: {
          200: profileResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const file = await request.file()
      if (!file) {
        throw new AppError(400, 'No image file provided (field name: file)', 'VALIDATION_ERROR')
      }
      const user = await uploadUserAvatar(getUserId(request), file)
      return { user }
    },
  )

  app.delete(
    '/auth/avatar',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Remove profile avatar',
        security: [{ bearerAuth: [] }],
        response: {
          200: profileResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const user = await removeUserAvatar(getUserId(request))
      return { user }
    },
  )

  app.post<{ Body: ChangePasswordBody }>(
    '/auth/change-password',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Change password',
        description:
          'Required after a system-generated password (signup or reset). Also available from profile.',
        security: [{ bearerAuth: [] }],
        body: changePasswordBodySchema,
        response: {
          200: messageResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      await changePassword({
        userId: getUserId(request),
        currentPassword: request.body.currentPassword?.trim(),
        newPassword: request.body.newPassword,
      })
      return { message: 'Password updated successfully.' }
    },
  )

  app.post<{ Body: ForgotPasswordBody }>(
    '/auth/forgot-password',
    {
      schema: {
        tags: ['auth'],
        summary: 'Request password reset',
        description: 'Emails a new temporary password if the account exists.',
        body: forgotPasswordBodySchema,
        response: {
          200: messageResponseSchema,
        },
      },
    },
    async (request) => {
      return requestPasswordReset(request.body.email)
    },
  )

  app.post<{ Body: TokenBody }>(
    '/auth/verify-email',
    {
      schema: {
        tags: ['auth'],
        summary: 'Verify email from link',
        body: tokenBodySchema,
        response: {
          200: messageResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request) => {
      await verifyEmailByToken(request.body.token)
      return { message: 'Email verified. You can sign in now.' }
    },
  )

  app.post<{ Body: TokenBody }>(
    '/auth/magic-login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Sign in from email link',
        body: tokenBodySchema,
        response: {
          200: authSessionSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return completeMagicLogin(request.body.token, (payload) => app.jwt.sign(payload))
    },
  )
}

export function registerAuthErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
      })
    }

    if (typeof error === 'object' && error !== null && 'validation' in error) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
      })
    }

    app.log.error(error)
    return reply.status(500).send({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    })
  })
}
