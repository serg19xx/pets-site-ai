import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { mapProfileRow, PROFILE_SELECT } from '../lib/map-user.js'
import type { AuthSession } from '../types/auth.js'
import type { UserGender } from '../types/user.js'

export async function getSessionForUser(userId: number): Promise<Omit<AuthSession, 'accessToken'>> {
  const result = await pool.query<{
    id: string
    full_name: string
    nickname: string
    email: string
    gender: UserGender
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

  return {
    user: mapProfileRow(row),
    mustChangePassword: row.must_change_password,
  }
}
