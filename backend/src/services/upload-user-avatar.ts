import type { MultipartFile } from '@fastify/multipart'

import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { mapProfileRow } from '../lib/map-user.js'
import { deleteUploadIfExists, saveImageUpload } from '../lib/uploads.js'
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
  show_full_name: boolean
  show_nickname: boolean
  show_email: boolean
  show_phone: boolean
  show_gender: boolean
  show_date_of_birth: boolean
}

const PROFILE_RETURNING = `
  id, full_name, nickname, email, gender, date_of_birth, phone, avatar_path,
  show_full_name, show_nickname, show_email, show_phone, show_gender, show_date_of_birth
`

export async function uploadUserAvatar(
  userId: number,
  file: MultipartFile,
): Promise<UserProfile> {
  const relativePath = await saveImageUpload('avatars', file, userId)

  const existing = await pool.query<{ avatar_path: string | null }>(
    'SELECT avatar_path FROM users WHERE id = $1',
    [userId],
  )
  const previousPath = existing.rows[0]?.avatar_path ?? null

  const updated = await pool.query<ProfileDbRow>(
    `UPDATE users SET avatar_path = $2, updated_at = NOW() WHERE id = $1
     RETURNING ${PROFILE_RETURNING}`,
    [userId, relativePath],
  )

  const row = updated.rows[0]
  if (!row) {
    await deleteUploadIfExists(relativePath)
    throw new AppError(404, 'User not found', 'NOT_FOUND')
  }

  if (previousPath && previousPath !== relativePath) {
    await deleteUploadIfExists(previousPath)
  }

  return mapProfileRow(row)
}

export async function removeUserAvatar(userId: number): Promise<UserProfile> {
  const existing = await pool.query<{ avatar_path: string | null }>(
    'SELECT avatar_path FROM users WHERE id = $1',
    [userId],
  )
  const previousPath = existing.rows[0]?.avatar_path ?? null

  const result = await pool.query<ProfileDbRow>(
    `UPDATE users SET avatar_path = NULL, updated_at = NOW() WHERE id = $1
     RETURNING ${PROFILE_RETURNING}`,
    [userId],
  )

  const row = result.rows[0]
  if (!row) {
    throw new AppError(404, 'User not found', 'NOT_FOUND')
  }

  await deleteUploadIfExists(previousPath)
  return mapProfileRow(row)
}
