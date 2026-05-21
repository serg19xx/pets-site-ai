import { pool } from '../db/pool.js'

/** Remove a user created during signup if follow-up steps (e.g. email) fail. */
export async function deleteUserById(userId: number): Promise<void> {
  await pool.query('DELETE FROM users WHERE id = $1', [userId])
}
