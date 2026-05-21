import { pool } from '../db/pool.js'
import { consumeAuthToken } from './auth-tokens.js'

export async function verifyEmailByToken(rawToken: string): Promise<void> {
  const userId = await consumeAuthToken(rawToken, 'email_verify')

  await pool.query(
    `UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW()
     WHERE id = $1`,
    [userId],
  )
}
