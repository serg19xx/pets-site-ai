import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { createRawToken, hashToken } from '../lib/tokens.js'

export type AuthTokenPurpose = 'email_verify' | 'magic_login'

export async function issueAuthToken(
  userId: number,
  purpose: AuthTokenPurpose,
  ttlHours: number,
): Promise<string> {
  const raw = createRawToken()
  const tokenHash = hashToken(raw)
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)

  await pool.query(
    `INSERT INTO auth_tokens (user_id, token_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, purpose, expiresAt],
  )

  return raw
}

export async function consumeAuthToken(
  rawToken: string,
  purpose: AuthTokenPurpose,
): Promise<number> {
  const tokenHash = hashToken(rawToken)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query<{
      id: string
      user_id: string
    }>(
      `SELECT id, user_id FROM auth_tokens
       WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash, purpose],
    )

    const row = result.rows[0]
    if (!row) {
      throw new AppError(400, 'Invalid or expired link', 'INVALID_TOKEN')
    }

    await client.query(
      `UPDATE auth_tokens SET used_at = NOW() WHERE id = $1`,
      [row.id],
    )

    await client.query('COMMIT')
    return Number(row.user_id)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
