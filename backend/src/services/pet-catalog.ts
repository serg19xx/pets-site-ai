import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'

export async function listPetSpecies(): Promise<Array<{ id: number; slug: string; label: string }>> {
  const r = await pool.query<{ id: string; slug: string; label: string }>(
    'SELECT id, slug, label FROM pet_species ORDER BY label ASC',
  )
  return r.rows.map((row) => ({
    id: Number(row.id),
    slug: row.slug,
    label: row.label,
  }))
}

export async function listBreedsForSpecies(
  speciesId: number,
): Promise<Array<{ id: number; label: string }>> {
  const exists = await pool.query('SELECT 1 FROM pet_species WHERE id = $1', [speciesId])
  if (exists.rowCount === 0) {
    throw new AppError(404, 'Species not found', 'NOT_FOUND')
  }
  const r = await pool.query<{ id: string; label: string }>(
    'SELECT id, label FROM pet_breeds WHERE species_id = $1 ORDER BY label ASC',
    [speciesId],
  )
  return r.rows.map((row) => ({ id: Number(row.id), label: row.label }))
}
