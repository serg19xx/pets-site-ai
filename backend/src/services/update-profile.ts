import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { mapProfileRow, normalizeNickname, PROFILE_RETURNING } from '../lib/map-user.js'
import type { UserGender, UserProfile } from '../types/user.js'
import { USER_GENDERS } from '../types/user.js'

export interface UpdateProfileInput {
  userId: number
  fullName: string
  nickname?: string
  phone?: string | null
  city?: string | null
  gender: UserGender
  dateOfBirth: string
  showFullName: boolean
  showNickname: boolean
  showEmail: boolean
  showPhone: boolean
  showGender: boolean
  showDateOfBirth: boolean
  showCity: boolean
}

export async function updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
  const fullName = input.fullName.trim()
  if (!fullName) {
    throw new AppError(400, 'Full name is required', 'VALIDATION_ERROR')
  }

  if (!input.showFullName && !input.showNickname) {
    throw new AppError(
      400,
      'At least full name or nickname must be visible on your public profile',
      'VALIDATION_ERROR',
    )
  }

  if (!(USER_GENDERS as readonly string[]).includes(input.gender)) {
    throw new AppError(400, 'Invalid gender value', 'VALIDATION_ERROR')
  }

  const nickname = normalizeNickname(input.nickname, fullName)
  const phone = input.phone?.trim() ? input.phone.trim() : null
  const city = input.city?.trim() ? input.city.trim().slice(0, 120) : null

  try {
    const result = await pool.query(
      `UPDATE users
       SET full_name = $2,
           nickname = $3,
           phone = $4,
           city = $5,
           gender = $6,
           date_of_birth = $7,
           show_full_name = $8,
           show_nickname = $9,
           show_email = $10,
           show_phone = $11,
           show_gender = $12,
           show_date_of_birth = $13,
           show_city = $14,
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${PROFILE_RETURNING}`,
      [
        input.userId,
        fullName,
        nickname,
        phone,
        city,
        input.gender,
        input.dateOfBirth,
        input.showFullName,
        input.showNickname,
        input.showEmail,
        input.showPhone,
        input.showGender,
        input.showDateOfBirth,
        input.showCity,
      ],
    )

    const row = result.rows[0]
    if (!row) {
      throw new AppError(404, 'User not found', 'NOT_FOUND')
    }

    return mapProfileRow(row)
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    const pgError = error as { code?: string }
    if (pgError.code === '23505') {
      throw new AppError(409, 'This phone number is already in use', 'PHONE_TAKEN')
    }
    throw error
  }
}
