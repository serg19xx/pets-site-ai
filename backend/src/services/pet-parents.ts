import { pool } from '../db/pool.js'
import { adminUsersExclusion } from '../lib/admin.js'
import { AppError } from '../lib/errors.js'
import {
  buildPublicUploadUrl,
  deleteUploadIfExists,
  saveImageBuffer,
} from '../lib/uploads.js'
import { getPetById } from './pets.js'

export const PET_PARENT_ROLES = ['dam', 'sire'] as const
export type PetParentRole = (typeof PET_PARENT_ROLES)[number]

export const PET_PARENT_SOURCES = ['owned_pet', 'site_pet', 'external'] as const
export type PetParentSource = (typeof PET_PARENT_SOURCES)[number]

export interface LinkedPetSummary {
  id: number
  name: string
  speciesLabel: string
  breedLabel: string | null
  avatarUrl: string | null
  ownerUserId: number
  /** Public gallery profile path when the linked pet is site-visible. */
  publicPath: string
}

export interface PetParentRecord {
  role: PetParentRole
  source: PetParentSource
  linkedPet: LinkedPetSummary | null
  name: string | null
  breedLabel: string | null
  notes: string | null
  photoUrl: string | null
}

export interface ParentCandidate {
  id: number
  name: string
  speciesLabel: string
  breedLabel: string | null
  avatarUrl: string | null
  scope: 'owned' | 'site'
}

export interface UpsertParentInput {
  source: PetParentSource
  linkedPetId?: number | null
  name?: string | null
  breedLabel?: string | null
  notes?: string | null
}

type ParentRow = {
  role: PetParentRole
  source: PetParentSource
  linked_pet_id: string | null
  name: string | null
  breed_label: string | null
  notes: string | null
  photo_path: string | null
  linked_name: string | null
  linked_user_id: string | null
  linked_species_label: string | null
  linked_breed_label: string | null
  linked_avatar_path: string | null
}

function isRole(value: string): value is PetParentRole {
  return (PET_PARENT_ROLES as readonly string[]).includes(value)
}

function isSource(value: string): value is PetParentSource {
  return (PET_PARENT_SOURCES as readonly string[]).includes(value)
}

function mapParent(row: ParentRow): PetParentRecord {
  const linkedPet: LinkedPetSummary | null =
    row.linked_pet_id && row.linked_name && row.linked_species_label && row.linked_user_id
      ? {
          id: Number(row.linked_pet_id),
          name: row.linked_name,
          speciesLabel: row.linked_species_label,
          breedLabel: row.linked_breed_label,
          avatarUrl: row.linked_avatar_path
            ? buildPublicUploadUrl(row.linked_avatar_path)
            : null,
          ownerUserId: Number(row.linked_user_id),
          publicPath: `/animals/${Number(row.linked_pet_id)}`,
        }
      : null

  return {
    role: row.role,
    source: row.source,
    linkedPet,
    name: row.name,
    breedLabel: row.breed_label,
    notes: row.notes,
    photoUrl: row.photo_path ? buildPublicUploadUrl(row.photo_path) : null,
  }
}

async function assertOwnsPet(userId: number, petId: number): Promise<void> {
  await getPetById(userId, petId)
}

async function loadChildSpeciesId(petId: number): Promise<number> {
  const result = await pool.query<{ species_id: string }>(
    'SELECT species_id FROM pets WHERE id = $1',
    [petId],
  )
  const row = result.rows[0]
  if (!row) {
    throw new AppError(404, 'Pet not found', 'NOT_FOUND')
  }
  return Number(row.species_id)
}

async function loadLinkedPet(linkedPetId: number): Promise<{
  id: number
  userId: number
  name: string
  speciesId: number
}> {
  const result = await pool.query<{
    id: string
    user_id: string
    name: string
    species_id: string
  }>('SELECT id, user_id, name, species_id FROM pets WHERE id = $1', [
    linkedPetId,
  ])
  const row = result.rows[0]
  if (!row) {
    throw new AppError(400, 'Linked pet not found', 'INVALID_LINKED_PET')
  }
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    name: row.name,
    speciesId: Number(row.species_id),
  }
}

export async function getPetParents(
  userId: number,
  petId: number,
): Promise<{ dam: PetParentRecord | null; sire: PetParentRecord | null }> {
  await assertOwnsPet(userId, petId)

  const result = await pool.query<ParentRow>(
    `SELECT
       pp.role, pp.source, pp.linked_pet_id, pp.name, pp.breed_label, pp.notes, pp.photo_path,
       lp.name AS linked_name,
       lp.user_id AS linked_user_id,
       lps.label AS linked_species_label,
       lpb.label AS linked_breed_label,
       cover.path AS linked_avatar_path
     FROM pet_parents pp
     LEFT JOIN pets lp ON lp.id = pp.linked_pet_id
     LEFT JOIN pet_species lps ON lps.id = lp.species_id
     LEFT JOIN pet_breeds lpb ON lpb.id = lp.breed_id
     LEFT JOIN pet_photos cover ON cover.id = lp.cover_photo_id
     WHERE pp.pet_id = $1`,
    [petId],
  )

  let dam: PetParentRecord | null = null
  let sire: PetParentRecord | null = null
  for (const row of result.rows) {
    const mapped = mapParent(row)
    if (mapped.role === 'dam') {
      dam = mapped
    } else {
      sire = mapped
    }
  }
  return { dam, sire }
}

async function clearParentRole(petId: number, role: PetParentRole): Promise<void> {
  const existing = await pool.query<{ photo_path: string | null }>(
    'SELECT photo_path FROM pet_parents WHERE pet_id = $1 AND role = $2',
    [petId, role],
  )
  const photoPath = existing.rows[0]?.photo_path ?? null
  await pool.query('DELETE FROM pet_parents WHERE pet_id = $1 AND role = $2', [
    petId,
    role,
  ])
  await deleteUploadIfExists(photoPath)
}

async function upsertParentRole(
  userId: number,
  petId: number,
  role: PetParentRole,
  input: UpsertParentInput,
): Promise<void> {
  if (!isSource(input.source)) {
    throw new AppError(400, 'Invalid parent source', 'VALIDATION_ERROR')
  }

  const existing = await pool.query<{ photo_path: string | null }>(
    'SELECT photo_path FROM pet_parents WHERE pet_id = $1 AND role = $2',
    [petId, role],
  )
  const previousPhoto = existing.rows[0]?.photo_path ?? null

  if (input.source === 'external') {
    const name = input.name?.trim() ?? ''
    if (name.length < 1) {
      throw new AppError(400, 'External parent name is required', 'VALIDATION_ERROR')
    }
    if (name.length > 200) {
      throw new AppError(400, 'Parent name is too long', 'VALIDATION_ERROR')
    }
    const breedLabel = input.breedLabel?.trim() || null
    if (breedLabel && breedLabel.length > 200) {
      throw new AppError(400, 'Breed label is too long', 'VALIDATION_ERROR')
    }
    const notes = input.notes?.trim() || null
    if (notes && notes.length > 2000) {
      throw new AppError(400, 'Notes are too long', 'VALIDATION_ERROR')
    }

    await pool.query(
      `INSERT INTO pet_parents (
         pet_id, role, source, linked_pet_id, name, breed_label, notes, photo_path
       ) VALUES ($1, $2, 'external', NULL, $3, $4, $5, $6)
       ON CONFLICT (pet_id, role) DO UPDATE SET
         source = 'external',
         linked_pet_id = NULL,
         name = EXCLUDED.name,
         breed_label = EXCLUDED.breed_label,
         notes = EXCLUDED.notes,
         photo_path = COALESCE(pet_parents.photo_path, EXCLUDED.photo_path),
         updated_at = NOW()`,
      [petId, role, name, breedLabel, notes, previousPhoto],
    )
    return
  }

  const linkedPetId = input.linkedPetId ?? null
  if (!linkedPetId) {
    throw new AppError(400, 'linkedPetId is required for linked parents', 'VALIDATION_ERROR')
  }
  if (linkedPetId === petId) {
    throw new AppError(400, 'A pet cannot be its own parent', 'VALIDATION_ERROR')
  }

  const linked = await loadLinkedPet(linkedPetId)
  if (input.source === 'owned_pet' && linked.userId !== userId) {
    throw new AppError(
      400,
      'owned_pet source requires a pet you own',
      'VALIDATION_ERROR',
    )
  }
  if (input.source === 'site_pet' && linked.userId === userId) {
    throw new AppError(
      400,
      'Use owned_pet for a pet you own',
      'VALIDATION_ERROR',
    )
  }

  const childSpeciesId = await loadChildSpeciesId(petId)
  if (linked.speciesId !== childSpeciesId) {
    throw new AppError(
      400,
      'Parent must be the same species as this pet',
      'SPECIES_MISMATCH',
    )
  }

  await pool.query(
    `INSERT INTO pet_parents (
       pet_id, role, source, linked_pet_id, name, breed_label, notes, photo_path
     ) VALUES ($1, $2, $3, $4, NULL, NULL, NULL, NULL)
     ON CONFLICT (pet_id, role) DO UPDATE SET
       source = EXCLUDED.source,
       linked_pet_id = EXCLUDED.linked_pet_id,
       name = NULL,
       breed_label = NULL,
       notes = NULL,
       photo_path = NULL,
       updated_at = NOW()`,
    [petId, role, input.source, linkedPetId],
  )

  if (previousPhoto) {
    await deleteUploadIfExists(previousPhoto)
  }
}

export async function setPetParents(
  userId: number,
  petId: number,
  input: {
    dam?: UpsertParentInput | null
    sire?: UpsertParentInput | null
  },
): Promise<{ dam: PetParentRecord | null; sire: PetParentRecord | null }> {
  await assertOwnsPet(userId, petId)

  if (input.dam !== undefined) {
    if (input.dam === null) {
      await clearParentRole(petId, 'dam')
    } else {
      await upsertParentRole(userId, petId, 'dam', input.dam)
    }
  }

  if (input.sire !== undefined) {
    if (input.sire === null) {
      await clearParentRole(petId, 'sire')
    } else {
      await upsertParentRole(userId, petId, 'sire', input.sire)
    }
  }

  return getPetParents(userId, petId)
}

export async function uploadExternalParentPhoto(
  userId: number,
  petId: number,
  role: string,
  file: { buffer: Buffer; mimetype: string },
): Promise<PetParentRecord> {
  if (!isRole(role)) {
    throw new AppError(400, 'role must be dam or sire', 'VALIDATION_ERROR')
  }
  await assertOwnsPet(userId, petId)

  const existing = await pool.query<{
    source: PetParentSource
    photo_path: string | null
  }>('SELECT source, photo_path FROM pet_parents WHERE pet_id = $1 AND role = $2', [
    petId,
    role,
  ])
  const row = existing.rows[0]
  if (!row) {
    throw new AppError(
      400,
      'Save the external parent first, then upload a photo',
      'VALIDATION_ERROR',
    )
  }
  if (row.source !== 'external') {
    throw new AppError(
      400,
      'Photos are only for external parents',
      'VALIDATION_ERROR',
    )
  }

  const path = await saveImageBuffer('pets', file.buffer, file.mimetype, petId)
  await pool.query(
    `UPDATE pet_parents
     SET photo_path = $3, updated_at = NOW()
     WHERE pet_id = $1 AND role = $2`,
    [petId, role, path],
  )
  await deleteUploadIfExists(row.photo_path)

  const parents = await getPetParents(userId, petId)
  const record = role === 'dam' ? parents.dam : parents.sire
  if (!record) {
    throw new AppError(500, 'Parent missing after photo upload', 'INTERNAL_ERROR')
  }
  return record
}

export async function deleteExternalParentPhoto(
  userId: number,
  petId: number,
  role: string,
): Promise<PetParentRecord> {
  if (!isRole(role)) {
    throw new AppError(400, 'role must be dam or sire', 'VALIDATION_ERROR')
  }
  await assertOwnsPet(userId, petId)

  const existing = await pool.query<{
    source: PetParentSource
    photo_path: string | null
  }>('SELECT source, photo_path FROM pet_parents WHERE pet_id = $1 AND role = $2', [
    petId,
    role,
  ])
  const row = existing.rows[0]
  if (!row) {
    throw new AppError(404, 'Parent not found', 'NOT_FOUND')
  }
  if (row.source !== 'external') {
    throw new AppError(
      400,
      'Photos are only for external parents',
      'VALIDATION_ERROR',
    )
  }

  await pool.query(
    `UPDATE pet_parents
     SET photo_path = NULL, updated_at = NOW()
     WHERE pet_id = $1 AND role = $2`,
    [petId, role],
  )
  await deleteUploadIfExists(row.photo_path)

  const parents = await getPetParents(userId, petId)
  const record = role === 'dam' ? parents.dam : parents.sire
  if (!record) {
    throw new AppError(404, 'Parent not found', 'NOT_FOUND')
  }
  return record
}

export async function searchParentCandidates(input: {
  userId: number
  excludePetId: number
  q: string
  limit: number
}): Promise<{ owned: ParentCandidate[]; site: ParentCandidate[] }> {
  await assertOwnsPet(input.userId, input.excludePetId)

  const q = input.q.trim()
  const limit = Math.min(Math.max(1, input.limit), 20)
  if (q.length < 1) {
    return { owned: [], site: [] }
  }

  const speciesId = await loadChildSpeciesId(input.excludePetId)
  const like = `%${q.toLowerCase()}%`

  const ownedResult = await pool.query<{
    id: string
    name: string
    species_label: string
    breed_label: string | null
    avatar_path: string | null
  }>(
    `SELECT
       p.id, p.name, ps.label AS species_label, pb.label AS breed_label,
       cover.path AS avatar_path
     FROM pets p
     INNER JOIN pet_species ps ON ps.id = p.species_id
     LEFT JOIN pet_breeds pb ON pb.id = p.breed_id
     LEFT JOIN pet_photos cover ON cover.id = p.cover_photo_id
     WHERE p.user_id = $1
       AND p.id <> $2
       AND p.species_id = $3
       AND LOWER(p.name) LIKE $4
     ORDER BY p.name ASC
     LIMIT $5`,
    [input.userId, input.excludePetId, speciesId, like, limit],
  )

  const excludeAdmins = adminUsersExclusion('u.email', 6)
  const siteResult = await pool.query<{
    id: string
    name: string
    species_label: string
    breed_label: string | null
    avatar_path: string | null
  }>(
    `SELECT
       p.id, p.name, ps.label AS species_label, pb.label AS breed_label,
       cover.path AS avatar_path
     FROM pets p
     INNER JOIN users u ON u.id = p.user_id
     INNER JOIN pet_species ps ON ps.id = p.species_id
     LEFT JOIN pet_breeds pb ON pb.id = p.breed_id
     LEFT JOIN pet_photos cover ON cover.id = p.cover_photo_id
     WHERE p.id <> $1
       AND p.user_id <> $2
       AND p.species_id = $3
       AND LOWER(p.name) LIKE $4
       ${excludeAdmins.clause}
     ORDER BY p.name ASC
     LIMIT $5`,
    [input.excludePetId, input.userId, speciesId, like, limit, ...excludeAdmins.params],
  )

  const mapCandidate = (
    row: {
      id: string
      name: string
      species_label: string
      breed_label: string | null
      avatar_path: string | null
    },
    scope: 'owned' | 'site',
  ): ParentCandidate => ({
    id: Number(row.id),
    name: row.name,
    speciesLabel: row.species_label,
    breedLabel: row.breed_label,
    avatarUrl: row.avatar_path ? buildPublicUploadUrl(row.avatar_path) : null,
    scope,
  })

  return {
    owned: ownedResult.rows.map((row) => mapCandidate(row, 'owned')),
    site: siteResult.rows.map((row) => mapCandidate(row, 'site')),
  }
}
