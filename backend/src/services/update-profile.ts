import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { mapProfileRow, normalizeNickname } from '../lib/map-user.js'
import type { UserGender, UserProfile } from '../types/user.js'
import { USER_GENDERS } from '../types/user.js'

export interface UpdateProfileInput {
  userId: number
  fullName: string
  nickname?: string
  phone?: string | null
  gender: UserGender
  dateOfBirth: string
  showFullName: boolean
  showNickname: boolean
  showEmail: boolean
  showPhone: boolean
  showGender: boolean
  showDateOfBirth: boolean
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

  try {
    const result = await pool.query<{
      id: string
      full_name: string
      nickname: string
      email: string
      gender: UserGender
      date_of_birth: Date
    phone: string | null
    avatar_path: string | null
    show_full_name: boolean
      show_nickname: boolean
      show_email: boolean
      show_phone: boolean
      show_gender: boolean
      show_date_of_birth: boolean
    }>(
      `UPDATE users
       SET full_name = $2,
           nickname = $3,
           phone = $4,
           gender = $5,
           date_of_birth = $6,
           show_full_name = $7,
           show_nickname = $8,
           show_email = $9,
           show_phone = $10,
           show_gender = $11,
           show_date_of_birth = $12,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, full_name, nickname, email, gender, date_of_birth, phone, avatar_path,
                 show_full_name, show_nickname, show_email, show_phone,
                 show_gender, show_date_of_birth`,
      [
        input.userId,
        fullName,
        nickname,
        phone,
        input.gender,
        input.dateOfBirth,
        input.showFullName,
        input.showNickname,
        input.showEmail,
        input.showPhone,
        input.showGender,
        input.showDateOfBirth,
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
