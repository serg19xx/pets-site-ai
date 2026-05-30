/**
 * Set a user's password (bcrypt). Usage:
 *   npx tsx src/db/set-password-cli.ts <email> <plain-password>
 */
import 'dotenv/config'

import { pool } from './pool.js'
import { normalizeEmail } from '../lib/map-user.js'
import { hashPassword } from '../lib/password.js'

async function main() {
  const email = normalizeEmail(process.argv[2] ?? '')
  const plain = process.argv[3] ?? ''
  if (!email || !plain) {
    console.error('Usage: npx tsx src/db/set-password-cli.ts <email> <password>')
    process.exit(1)
  }

  const userR = await pool.query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1',
    [email],
  )
  const userId = userR.rows[0]?.id
  if (!userId) {
    console.error(`No user with email ${email}`)
    process.exit(1)
  }

  const passwordHash = await hashPassword(plain)
  await pool.query(
    `INSERT INTO user_auth (user_id, password_hash, must_change_password)
     VALUES ($1, $2, FALSE)
     ON CONFLICT (user_id) DO UPDATE
     SET password_hash = EXCLUDED.password_hash,
         must_change_password = FALSE,
         password_updated_at = NOW()`,
    [userId, passwordHash],
  )

  console.log(`Password updated for ${email}`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
