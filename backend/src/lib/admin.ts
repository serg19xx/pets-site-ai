import { config } from '../config.js'
import { AppError } from './errors.js'
import { normalizeEmail } from './map-user.js'
import { pool } from '../db/pool.js'

export function isAdminEmail(email: string): boolean {
  return config.adminEmails.includes(normalizeEmail(email))
}

export async function assertAdmin(userId: number): Promise<{ email: string }> {
  const result = await pool.query<{ email: string }>(
    'SELECT email FROM users WHERE id = $1',
    [userId],
  )
  const row = result.rows[0]
  if (!row || !isAdminEmail(row.email)) {
    throw new AppError(403, 'Admin access required', 'FORBIDDEN')
  }
  return { email: row.email }
}

export async function isAdminUser(userId: number): Promise<boolean> {
  const result = await pool.query<{ email: string }>(
    'SELECT email FROM users WHERE id = $1',
    [userId],
  )
  const row = result.rows[0]
  return Boolean(row && isAdminEmail(row.email))
}

/** SQL fragment: exclude users whose email is in ADMIN_EMAILS. */
export function adminUsersExclusion(
  emailColumn: string,
  startIndex: number,
): { clause: string; params: string[] } {
  if (config.adminEmails.length === 0) {
    return { clause: '', params: [] }
  }
  const placeholders = config.adminEmails.map((_, i) => `$${startIndex + i}`).join(', ')
  return {
    clause: ` AND LOWER(${emailColumn}) NOT IN (${placeholders})`,
    params: [...config.adminEmails],
  }
}
