import 'dotenv/config'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

function readEnv(name: string): string | undefined {
  const value = process.env[name]
  return value === '' ? undefined : value
}

function requireEnv(name: string): string {
  const value = readEnv(name)
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export type SignupDeliveryMode = 'password' | 'link'

function parseSignupDelivery(value: string | undefined): SignupDeliveryMode {
  if (value === 'link') {
    return 'link'
  }
  return 'password'
}

const nodeEnv = readEnv('NODE_ENV') ?? 'development'
const jwtSecret =
  readEnv('JWT_SECRET') ??
  (nodeEnv === 'production' ? undefined : 'pets-dev-jwt-secret-change-in-production')

if (!jwtSecret) {
  throw new Error('Missing required environment variable: JWT_SECRET')
}

export const config = {
  port: Number(readEnv('PORT') ?? '8080'),
  databaseUrl: requireEnv('DATABASE_URL'),
  nodeEnv,
  jwtSecret,
  jwtExpiresIn: readEnv('JWT_EXPIRES_IN') ?? '7d',
  frontendUrl: (readEnv('FRONTEND_URL') ?? 'http://localhost:3000').replace(/\/$/, ''),
  /** After signup: email temporary password (default) or a one-time sign-in link. */
  authSignupDelivery: parseSignupDelivery(readEnv('AUTH_SIGNUP_DELIVERY')),
  emailFrom: readEnv('EMAIL_FROM') ?? 'PETS <onboarding@resend.dev>',
  /** Resend.com API key — simplest way to send real email (https://resend.com/api-keys). */
  resendApiKey: readEnv('RESEND_API_KEY'),
  smtp: {
    host: readEnv('SMTP_HOST'),
    port: Number(readEnv('SMTP_PORT') ?? '587'),
    user: readEnv('SMTP_USER'),
    pass: readEnv('SMTP_PASS'),
    secure: readEnv('SMTP_SECURE') === 'true',
  },
  emailTransport(): 'resend' | 'smtp' | 'console' {
    if (readEnv('RESEND_API_KEY')) {
      return 'resend'
    }
    if (readEnv('SMTP_HOST')) {
      return 'smtp'
    }
    return 'console'
  },
  tokenTtlHours: {
    emailVerify: Number(readEnv('TOKEN_TTL_EMAIL_VERIFY_HOURS') ?? '48'),
    magicLogin: Number(readEnv('TOKEN_TTL_MAGIC_LOGIN_HOURS') ?? '24'),
  },
  uploadsDir: readEnv('UPLOADS_DIR') ?? join(backendRoot, 'uploads'),
  uploadsPublicPrefix: '/api/uploads',
  uploadMaxBytes: Number(readEnv('UPLOAD_MAX_BYTES') ?? String(5 * 1024 * 1024)),
  uploadVideoMaxBytes: Number(
    readEnv('UPLOAD_VIDEO_MAX_BYTES') ?? String(50 * 1024 * 1024),
  ),
  feedMaxMediaPerPost: Number(readEnv('FEED_MAX_MEDIA_PER_POST') ?? '10'),
  marketplaceMaxImagesPerListing: Number(
    readEnv('MARKETPLACE_MAX_IMAGES_PER_LISTING') ?? '5',
  ),
  twilioAccountSid: readEnv('TWILIO_ACCOUNT_SID'),
  twilioAuthToken: readEnv('TWILIO_AUTH_TOKEN'),
  twilioFromNumber: readEnv('TWILIO_FROM_NUMBER'),
}

for (const subdir of ['avatars', 'pets', join('pets', 'gallery'), 'posts', 'listings']) {
  mkdirSync(join(config.uploadsDir, subdir), { recursive: true })
}
