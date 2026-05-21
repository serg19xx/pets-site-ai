import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { mapProfileRow, normalizeEmail, PROFILE_SELECT } from '../lib/map-user.js'
import { verifyPassword } from '../lib/password.js'
import type { AuthSession } from '../types/auth.js'

export interface LoginInput {
  email: string
  password: string
}

export async function loginUser(
  input: LoginInput,
  signToken: (payload: { sub: number; email: string }) => string,
): Promise<AuthSession> {
  const email = normalizeEmail(input.email)

  const result = await pool.query<{
    id: string
    full_name: string
    nickname: string
    email: string
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say'
    date_of_birth: Date
    phone: string | null
    show_full_name: boolean
    show_nickname: boolean
    show_email: boolean
    show_phone: boolean
    show_gender: boolean
    show_date_of_birth: boolean
    email_verified_at: Date | null
    password_hash: string
    must_change_password: boolean
  }>(
    `SELECT ${PROFILE_SELECT}, u.email_verified_at, a.password_hash, a.must_change_password
     FROM users u
     INNER JOIN user_auth a ON a.user_id = u.id
     WHERE u.email = $1`,
    [email],
  )

  const row = result.rows[0]
  if (!row) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS')
  }

  if (!row.email_verified_at) {
    throw new AppError(
      403,
      'Please verify your email before signing in. Check your inbox for the verification link.',
      'EMAIL_NOT_VERIFIED',
    )
  }

  const passwordOk = await verifyPassword(input.password.trim(), row.password_hash)
  if (!passwordOk) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS')
  }

  const user = mapProfileRow(row)
  const accessToken = signToken({ sub: user.id, email: user.email })

  return {
    accessToken,
    user,
    mustChangePassword: row.must_change_password,
  }
}
