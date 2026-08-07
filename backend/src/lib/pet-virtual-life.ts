import { pool } from '../db/pool.js'

/** Whether this pet may live in the AI ecosystem (events, memory, goals, actions). */
export async function isPetVirtualLifeEnabled(petId: number): Promise<boolean> {
  const r = await pool.query<{ virtual_life_enabled: boolean }>(
    'SELECT virtual_life_enabled FROM pets WHERE id = $1',
    [petId],
  )
  return Boolean(r.rows[0]?.virtual_life_enabled)
}
