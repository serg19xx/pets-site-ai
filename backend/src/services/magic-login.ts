import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { mapProfileRow, PROFILE_SELECT } from '../lib/map-user.js'
import type { AuthSession } from '../types/auth.js'
import { consumeAuthToken } from './auth-tokens.js'

export async function completeMagicLogin(
  rawToken: string,
  signToken: (payload: { sub: number; email: string }) => string,
): Promise<AuthSession> {
  const userId = await consumeAuthToken(rawToken, 'magic_login')

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
    must_change_password: boolean
  }>(
    `SELECT ${PROFILE_SELECT}, a.must_change_password
     FROM users u
     INNER JOIN user_auth a ON a.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  )

  const row = result.rows[0]
  if (!row) {
    throw new AppError(404, 'User not found', 'NOT_FOUND')
  }

  await pool.query(
    `UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW()
     WHERE id = $1`,
    [userId],
  )

  const user = mapProfileRow(row)
  const accessToken = signToken({ sub: user.id, email: user.email })

  return {
    accessToken,
    user,
    mustChangePassword: true,
  }
}
