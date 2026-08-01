import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { mapProfileRow, PROFILE_RETURNING } from '../lib/map-user.js'
import { assertValidTimeZone } from '../lib/timezone.js'
import type { UserGender, UserProfile } from '../types/user.js'

type ProfileDbRow = {
  id: string
  full_name: string
  nickname: string
  email: string
  gender: UserGender
  date_of_birth: Date
  phone: string | null
  avatar_path: string | null
  timezone: string | null
  show_full_name: boolean
  show_nickname: boolean
  show_email: boolean
  show_phone: boolean
  show_gender: boolean
  show_date_of_birth: boolean
}

export async function updateUserTimezone(
  userId: number,
  timezoneInput: string,
): Promise<UserProfile> {
  const timezone = assertValidTimeZone(timezoneInput)

  const result = await pool.query<ProfileDbRow>(
    `UPDATE users
     SET timezone = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING ${PROFILE_RETURNING}`,
    [userId, timezone],
  )

  const row = result.rows[0]
  if (!row) {
    throw new AppError(404, 'User not found', 'NOT_FOUND')
  }

  return mapProfileRow(row)
}
