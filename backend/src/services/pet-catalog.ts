import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'

export type PetSpeciesListItem = { id: number; slug: string; label: string }

export type AdminPetSpecies = PetSpeciesListItem & {
  isActive: boolean
  petCount: number
}

/** Active (launch) species for create / species picker. */
export async function listPetSpecies(): Promise<PetSpeciesListItem[]> {
  const r = await pool.query<{ id: string; slug: string; label: string }>(
    `SELECT id, slug, label
     FROM pet_species
     WHERE is_active = true
     ORDER BY label ASC`,
  )
  return r.rows.map((row) => ({
    id: Number(row.id),
    slug: row.slug,
    label: row.label,
  }))
}

/** All species for admin catalog management. */
export async function listAdminPetSpecies(): Promise<AdminPetSpecies[]> {
  const r = await pool.query<{
    id: string
    slug: string
    label: string
    is_active: boolean
    pet_count: string
  }>(
    `SELECT
       s.id,
       s.slug,
       s.label,
       s.is_active,
       COUNT(p.id)::text AS pet_count
     FROM pet_species s
     LEFT JOIN pets p ON p.species_id = s.id
     GROUP BY s.id, s.slug, s.label, s.is_active
     ORDER BY s.is_active DESC, s.label ASC`,
  )
  return r.rows.map((row) => ({
    id: Number(row.id),
    slug: row.slug,
    label: row.label,
    isActive: row.is_active,
    petCount: Number(row.pet_count),
  }))
}

export async function setPetSpeciesActive(
  speciesId: number,
  isActive: boolean,
): Promise<AdminPetSpecies> {
  const updated = await pool.query<{ id: string }>(
    `UPDATE pet_species
     SET is_active = $2
     WHERE id = $1
     RETURNING id`,
    [speciesId, isActive],
  )
  if (!updated.rows[0]) {
    throw new AppError(404, 'Species not found', 'NOT_FOUND')
  }
  const list = await listAdminPetSpecies()
  const row = list.find((s) => s.id === speciesId)
  if (!row) {
    throw new AppError(404, 'Species not found', 'NOT_FOUND')
  }
  return row
}

export async function getPetSpeciesById(
  speciesId: number,
): Promise<{ id: number; slug: string; label: string; isActive: boolean } | null> {
  const r = await pool.query<{
    id: string
    slug: string
    label: string
    is_active: boolean
  }>('SELECT id, slug, label, is_active FROM pet_species WHERE id = $1', [speciesId])
  const row = r.rows[0]
  if (!row) {
    return null
  }
  return {
    id: Number(row.id),
    slug: row.slug,
    label: row.label,
    isActive: row.is_active,
  }
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
