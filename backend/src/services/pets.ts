import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import {
  generatePetGreeting,
  normalizePetDescription,
  type GreetingLocale,
} from '../lib/generate-pet-greeting.js'
import { mapPetRow } from '../lib/map-pet.js'
import { deleteAllPetPhotoFiles } from './pet-photos.js'
import type { PetSex } from '../types/pet.js'

const PET_SELECT = `
  p.id, p.user_id, p.name,
  p.species_id, ps.slug AS species_slug, ps.label AS species_label,
  p.breed_id, pb.label AS breed_label,
  p.cover_photo_id,
  cover_pp.path AS avatar_path,
  p.description, p.greeting,
  p.date_of_birth, p.sex, p.created_at, p.updated_at
`

const PET_FROM = `
  FROM pets p
  INNER JOIN pet_species ps ON ps.id = p.species_id
  LEFT JOIN pet_breeds pb ON pb.id = p.breed_id
  LEFT JOIN pet_photos cover_pp ON cover_pp.id = p.cover_photo_id
`

async function assertSpeciesExists(speciesId: number): Promise<void> {
  const r = await pool.query('SELECT 1 FROM pet_species WHERE id = $1', [speciesId])
  if (r.rowCount === 0) {
    throw new AppError(400, 'Invalid species', 'INVALID_SPECIES')
  }
}

async function assertBreedMatchesSpecies(
  breedId: number | null,
  speciesId: number,
): Promise<void> {
  if (breedId === null) {
    return
  }
  const r = await pool.query<{ species_id: string }>(
    'SELECT species_id FROM pet_breeds WHERE id = $1',
    [breedId],
  )
  const row = r.rows[0]
  if (!row) {
    throw new AppError(400, 'Invalid breed', 'INVALID_BREED')
  }
  if (Number(row.species_id) !== speciesId) {
    throw new AppError(400, 'Breed does not match species', 'BREED_SPECIES_MISMATCH')
  }
}

export async function listPets(userId: number) {
  const r = await pool.query(
    `SELECT ${PET_SELECT} ${PET_FROM} WHERE p.user_id = $1 ORDER BY p.created_at DESC`,
    [userId],
  )
  return r.rows.map((row) => mapPetRow(row))
}

export async function getPetById(userId: number, petId: number) {
  const r = await pool.query(
    `SELECT ${PET_SELECT} ${PET_FROM} WHERE p.id = $1 AND p.user_id = $2`,
    [petId, userId],
  )
  const row = r.rows[0]
  if (!row) {
    throw new AppError(404, 'Pet not found', 'NOT_FOUND')
  }
  return mapPetRow(row)
}

async function loadSpeciesForGreeting(speciesId: number) {
  const r = await pool.query<{ slug: string; label: string }>(
    'SELECT slug, label FROM pet_species WHERE id = $1',
    [speciesId],
  )
  const row = r.rows[0]
  if (!row) {
    throw new AppError(400, 'Invalid species', 'INVALID_SPECIES')
  }
  return row
}

export interface CreatePetInput {
  name: string
  speciesId: number
  breedId: number | null
  dateOfBirth: string
  sex: PetSex
  description?: string | null
  greetingLocale: GreetingLocale
}

export async function createPet(userId: number, input: CreatePetInput) {
  const name = input.name.trim()
  if (!name) {
    throw new AppError(400, 'Name is required', 'VALIDATION_ERROR')
  }

  await assertSpeciesExists(input.speciesId)
  await assertBreedMatchesSpecies(input.breedId, input.speciesId)

  const species = await loadSpeciesForGreeting(input.speciesId)
  const description = normalizePetDescription(input.description)
  const greeting = generatePetGreeting({
    name,
    speciesLabel: species.label,
    speciesSlug: species.slug,
    sex: input.sex,
    locale: input.greetingLocale,
  })

  const r = await pool.query<{ id: string }>(
    `INSERT INTO pets (user_id, name, species_id, breed_id, date_of_birth, sex, description, greeting)
     VALUES ($1, $2, $3, $4, $5::date, $6::pet_sex, $7, $8)
     RETURNING id`,
    [
      userId,
      name,
      input.speciesId,
      input.breedId,
      input.dateOfBirth,
      input.sex,
      description,
      greeting,
    ],
  )
  const id = r.rows[0]?.id
  if (!id) {
    throw new AppError(500, 'Could not create pet', 'INTERNAL_ERROR')
  }
  return getPetById(userId, Number(id))
}

export interface UpdatePetInput {
  name?: string
  speciesId?: number
  breedId?: number | null
  dateOfBirth?: string
  sex?: PetSex
  description?: string | null
  greetingLocale: GreetingLocale
}

export async function updatePet(userId: number, petId: number, input: UpdatePetInput) {
  const existing = await getPetById(userId, petId)

  const name = input.name !== undefined ? input.name.trim() : existing.name
  if (!name) {
    throw new AppError(400, 'Name is required', 'VALIDATION_ERROR')
  }

  const speciesId = input.speciesId !== undefined ? input.speciesId : existing.species.id
  const dateOfBirth =
    input.dateOfBirth !== undefined ? input.dateOfBirth : existing.dateOfBirth
  const sex = input.sex !== undefined ? input.sex : existing.sex

  let breedId: number | null
  if (input.breedId !== undefined) {
    breedId = input.breedId
  } else if (input.speciesId !== undefined && input.speciesId !== existing.species.id) {
    breedId = null
  } else {
    breedId = existing.breed?.id ?? null
  }

  await assertSpeciesExists(speciesId)
  await assertBreedMatchesSpecies(breedId, speciesId)

  const species = await loadSpeciesForGreeting(speciesId)
  const description =
    input.description !== undefined
      ? normalizePetDescription(input.description)
      : existing.description
  const greeting = generatePetGreeting({
    name,
    speciesLabel: species.label,
    speciesSlug: species.slug,
    sex,
    locale: input.greetingLocale,
  })

  await pool.query(
    `UPDATE pets SET
      name = $1,
      species_id = $2,
      breed_id = $3,
      date_of_birth = $4::date,
      sex = $5::pet_sex,
      description = $6,
      greeting = $7,
      updated_at = NOW()
    WHERE id = $8 AND user_id = $9`,
    [name, speciesId, breedId, dateOfBirth, sex, description, greeting, petId, userId],
  )

  return getPetById(userId, petId)
}

export async function deletePet(userId: number, petId: number): Promise<void> {
  const exists = await pool.query('SELECT 1 FROM pets WHERE id = $1 AND user_id = $2', [
    petId,
    userId,
  ])
  if (exists.rowCount === 0) {
    throw new AppError(404, 'Pet not found', 'NOT_FOUND')
  }

  await deleteAllPetPhotoFiles(petId)

  await pool.query('DELETE FROM pets WHERE id = $1 AND user_id = $2', [petId, userId])
}
