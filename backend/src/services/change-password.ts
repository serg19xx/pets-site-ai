import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { hashPassword, verifyPassword } from '../lib/password.js'

export interface ChangePasswordInput {
  userId: number
  currentPassword?: string
  newPassword: string
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  const newPassword = input.newPassword.trim()

  if (newPassword.length < 8) {
    throw new AppError(400, 'New password must be at least 8 characters', 'VALIDATION_ERROR')
  }

  const result = await pool.query<{
    password_hash: string
    must_change_password: boolean
  }>(
    `SELECT password_hash, must_change_password FROM user_auth WHERE user_id = $1`,
    [input.userId],
  )

  const row = result.rows[0]
  if (!row) {
    throw new AppError(404, 'User not found', 'NOT_FOUND')
  }

  if (!row.must_change_password) {
    const currentPassword = input.currentPassword?.trim()
    if (!currentPassword) {
      throw new AppError(400, 'Current password is required', 'VALIDATION_ERROR')
    }

    if (currentPassword === newPassword) {
      throw new AppError(
        400,
        'New password must be different from the current password',
        'VALIDATION_ERROR',
      )
    }

    const currentOk = await verifyPassword(currentPassword, row.password_hash)
    if (!currentOk) {
      throw new AppError(400, 'Current password is incorrect', 'INVALID_PASSWORD')
    }
  }

  const passwordHash = await hashPassword(newPassword)

  await pool.query(
    `UPDATE user_auth
     SET password_hash = $2,
         must_change_password = FALSE,
         password_updated_at = NOW()
     WHERE user_id = $1`,
    [input.userId, passwordHash],
  )
}
