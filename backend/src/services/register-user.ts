import { pool } from '../db/pool.js'
import { config } from '../config.js'
import { AppError } from '../lib/errors.js'
import { generateTemporaryPassword } from '../lib/generate-password.js'
import { hashPassword } from '../lib/password.js'
import { normalizeEmail } from '../lib/map-user.js'
import type { UserGender } from '../types/user.js'
import { USER_GENDERS } from '../types/user.js'
import { issueAuthToken } from './auth-tokens.js'
import { claimBetaTesterSeat, isValidBetaInvite } from './beta-invite.js'
import { deleteUserById } from './delete-user.js'
import {
  buildMagicLoginUrl,
  buildVerifyUrl,
  sendEmail,
} from './email.js'

export interface RegisterInput {
  fullName: string
  nickname: string
  gender: UserGender
  dateOfBirth: string
  phone: string | null
  email: string
  /** Soft-launch invite from /invite; when valid, marks the user as a founding beta tester. */
  betaInvite?: string | null
}

function logDevPassword(email: string, temporaryPassword: string): void {
  if (config.nodeEnv === 'production') {
    return
  }
  console.info(
    `\n[dev] Signup credentials for ${email}\n  Temporary password: ${temporaryPassword}\n  (Also check your inbox if Resend accepted the recipient.)\n`,
  )
}

async function sendSignupEmails(
  input: {
    email: string
    displayName: string
    temporaryPassword: string
    userId: number
  },
): Promise<{ message: string }> {
  const { email, displayName, temporaryPassword, userId } = input

  const verifyToken = await issueAuthToken(
    userId,
    'email_verify',
    config.tokenTtlHours.emailVerify,
  )
  const verifyUrl = buildVerifyUrl(verifyToken)

  if (config.authSignupDelivery === 'link') {
    const magicToken = await issueAuthToken(
      userId,
      'magic_login',
      config.tokenTtlHours.magicLogin,
    )
    const magicUrl = buildMagicLoginUrl(magicToken)

    await sendEmail({
      to: email,
      subject: 'Confirm your PETS account',
      text: [
        `Hello ${displayName},`,
        '',
        'Thanks for signing up. Open the link below to verify your email and sign in:',
        magicUrl,
        '',
        'Do not use the Log in form with a password — this link is your sign-in.',
        'After signing in you will be asked to set a new password.',
        '',
        `This link expires in ${config.tokenTtlHours.magicLogin} hours.`,
      ].join('\n'),
    })

    if (config.nodeEnv !== 'production') {
      console.info(`\n[dev] Magic sign-in link for ${email}:\n  ${magicUrl}\n`)
    }

    return {
      message:
        'Check your email for a sign-in link. Open it to sign in, then set a new password.',
    }
  }

  await sendEmail({
    to: email,
    subject: 'Your PETS account — verify email and temporary password',
    text: [
      `Hello ${displayName},`,
      '',
      'Your account was created. Use the details below to sign in:',
      '',
      `Email: ${email}`,
      `Temporary password: ${temporaryPassword}`,
      '',
      'First verify your email (open this link):',
      verifyUrl,
      '',
      'Then on the Log in tab enter the email and temporary password above.',
      'You will be asked to choose a new password on first sign-in.',
      '',
      `The verification link expires in ${config.tokenTtlHours.emailVerify} hours.`,
    ].join('\n'),
  })

  logDevPassword(email, temporaryPassword)

  return {
    message:
      'Check your email for a verification link and temporary password. Verify your email, then sign in.',
  }
}

export async function registerUser(input: RegisterInput): Promise<{ message: string }> {
  const email = normalizeEmail(input.email)
  const phone = input.phone?.trim() ? input.phone.trim() : null
  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await hashPassword(temporaryPassword)
  const wantsBeta = Boolean(input.betaInvite?.trim())
  const inviteValid = isValidBetaInvite(input.betaInvite)

  if (wantsBeta && !inviteValid) {
    throw new AppError(400, 'Invalid or missing invite', 'INVALID_INVITE')
  }

  const client = await pool.connect()
  let userId: number
  let displayName: string

  try {
    await client.query('BEGIN')

    const existing = await client.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email],
    )
    if (existing.rowCount && existing.rowCount > 0) {
      throw new AppError(409, 'An account with this email already exists', 'EMAIL_TAKEN')
    }

    if (phone) {
      const phoneTaken = await client.query<{ id: string }>(
        'SELECT id FROM users WHERE phone = $1',
        [phone],
      )
      if (phoneTaken.rowCount && phoneTaken.rowCount > 0) {
        throw new AppError(409, 'This phone number is already in use', 'PHONE_TAKEN')
      }
    }

    const inserted = await client.query<{ id: string; nickname: string }>(
      `INSERT INTO users (full_name, nickname, gender, date_of_birth, phone, email)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nickname`,
      [
        input.fullName.trim(),
        input.nickname.trim(),
        input.gender,
        input.dateOfBirth,
        phone,
        email,
      ],
    )

    const user = inserted.rows[0]
    if (!user) {
      throw new AppError(500, 'Failed to create user', 'REGISTER_FAILED')
    }

    userId = Number(user.id)
    displayName = user.nickname

    await client.query(
      `INSERT INTO user_auth (user_id, password_hash, must_change_password)
       VALUES ($1, $2, TRUE)`,
      [user.id, passwordHash],
    )

    if (inviteValid) {
      await claimBetaTesterSeat(client, userId)
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    if (error instanceof AppError) {
      throw error
    }
    const pgError = error as { code?: string }
    if (pgError.code === '23505') {
      throw new AppError(409, 'Email or phone already registered', 'DUPLICATE')
    }
    throw error
  } finally {
    client.release()
  }

  try {
    return await sendSignupEmails({
      email,
      displayName,
      temporaryPassword,
      userId,
    })
  } catch (error) {
    await deleteUserById(userId)
    throw error
  }
}

export function parseGender(value: string): UserGender {
  if ((USER_GENDERS as readonly string[]).includes(value)) {
    return value as UserGender
  }
  throw new AppError(400, 'Invalid gender value', 'VALIDATION_ERROR')
}
