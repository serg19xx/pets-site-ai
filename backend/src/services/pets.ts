import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import {
  normalizePetDescription,
} from '../lib/generate-pet-greeting.js'
import { resolveBilingualPetGreetings } from '../lib/n8n-pet-greeting.js'
import { mapPetRow } from '../lib/map-pet.js'
import { getPetSpeciesById } from './pet-catalog.js'
import { PET_EVENT_TYPES, recordPetEvent } from './pet-events.js'
import {
  cancelActivePetGoals,
  ensureDefaultPetGoals,
} from './pet-goals.js'
import { createSelfIntroductionDraft } from './pet-ai-drafts.js'
import { deleteAllPetPhotoFiles } from './pet-photos.js'
import { deleteAllPetCertificateFiles } from './pet-certificates.js'
import { deleteAllPetMedicalFiles } from './pet-medical.js'
import type { PetSex } from '../types/pet.js'

const PET_SELECT = `
  p.id, p.user_id, p.name,
  p.species_id, ps.slug AS species_slug, ps.label AS species_label,
  p.breed_id, pb.label AS breed_label,
  p.cover_photo_id,
  cover_pp.path AS avatar_path,
  p.description, p.greeting, p.greeting_fr,
  p.weight_kg, p.color, p.length_cm, p.height_cm, p.markings, p.physical_notes,
  p.pedigree_notes,
  p.virtual_life_enabled,
  p.date_of_birth, p.sex, p.created_at, p.updated_at
`

const PET_FROM = `
  FROM pets p
  INNER JOIN pet_species ps ON ps.id = p.species_id
  LEFT JOIN pet_breeds pb ON pb.id = p.breed_id
  LEFT JOIN pet_photos cover_pp ON cover_pp.id = p.cover_photo_id
`

async function assertSpeciesAssignable(
  speciesId: number,
  options: { requireActive: boolean },
): Promise<void> {
  const species = await getPetSpeciesById(speciesId)
  if (!species) {
    throw new AppError(400, 'Invalid species', 'INVALID_SPECIES')
  }
  if (options.requireActive && !species.isActive) {
    throw new AppError(
      400,
      'This species is not available for new pets yet',
      'SPECIES_INACTIVE',
    )
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

async function loadBreedLabel(breedId: number | null): Promise<string | null> {
  if (breedId === null) {
    return null
  }
  const r = await pool.query<{ label: string }>(
    'SELECT label FROM pet_breeds WHERE id = $1',
    [breedId],
  )
  return r.rows[0]?.label ?? null
}

async function buildBilingualGreetings(input: {
  name: string
  speciesSlug: string
  speciesLabel: string
  breedLabel: string | null
  sex: PetSex
  description: string | null
  dateOfBirth: string
}): Promise<{ greeting: string; greetingFr: string }> {
  return resolveBilingualPetGreetings(input)
}

export interface CreatePetInput {
  name: string
  speciesId: number
  breedId: number | null
  dateOfBirth: string
  sex: PetSex
  description?: string | null
}

export async function createPet(userId: number, input: CreatePetInput) {
  const name = input.name.trim()
  if (!name) {
    throw new AppError(400, 'Name is required', 'VALIDATION_ERROR')
  }

  await assertSpeciesAssignable(input.speciesId, { requireActive: true })
  await assertBreedMatchesSpecies(input.breedId, input.speciesId)

  const species = await loadSpeciesForGreeting(input.speciesId)
  const breedLabel = await loadBreedLabel(input.breedId)
  const description = normalizePetDescription(input.description)
  const { greeting, greetingFr } = await buildBilingualGreetings({
    name,
    speciesLabel: species.label,
    speciesSlug: species.slug,
    breedLabel,
    sex: input.sex,
    description,
    dateOfBirth: input.dateOfBirth,
  })

  const r = await pool.query<{ id: string }>(
    `INSERT INTO pets (user_id, name, species_id, breed_id, date_of_birth, sex, description, greeting, greeting_fr)
     VALUES ($1, $2, $3, $4, $5::date, $6::pet_sex, $7, $8, $9)
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
      greetingFr,
    ],
  )
  const id = r.rows[0]?.id
  if (!id) {
    throw new AppError(500, 'Could not create pet', 'INTERNAL_ERROR')
  }
  const petId = Number(id)
  await recordPetEvent({
    petId,
    eventType: PET_EVENT_TYPES.PET_CREATED,
    payload: {
      name,
      speciesId: input.speciesId,
      speciesSlug: species.slug,
      breedId: input.breedId,
      sex: input.sex,
    },
  })
  await ensureDefaultPetGoals(petId)
  await createSelfIntroductionDraft(petId)
  return getPetById(userId, petId)
}

export interface UpdatePetInput {
  name?: string
  speciesId?: number
  breedId?: number | null
  dateOfBirth?: string
  sex?: PetSex
  description?: string | null
  weightKg?: number | null
  color?: string | null
  lengthCm?: number | null
  heightCm?: number | null
  markings?: string | null
  physicalNotes?: string | null
  pedigreeNotes?: string | null
  virtualLifeEnabled?: boolean
}

function normalizeOptionalText(
  value: string | null | undefined,
  max: number,
  field: string,
): string | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  if (trimmed.length > max) {
    throw new AppError(400, `${field} is too long`, 'VALIDATION_ERROR')
  }
  return trimmed
}

function normalizeOptionalNumber(
  value: number | null | undefined,
  field: string,
): number | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }
  if (!Number.isFinite(value) || value < 0) {
    throw new AppError(400, `Invalid ${field}`, 'VALIDATION_ERROR')
  }
  return value
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

  await assertSpeciesAssignable(speciesId, {
    requireActive: speciesId !== existing.species.id,
  })
  await assertBreedMatchesSpecies(breedId, speciesId)

  const description =
    input.description !== undefined
      ? normalizePetDescription(input.description)
      : existing.description
  // Greeting is generated on create and via regenerateGreeting — not on every save.
  const greeting = existing.greeting
  const greetingFr = existing.greetingFr

  const weightKg =
    input.weightKg !== undefined
      ? normalizeOptionalNumber(input.weightKg, 'weightKg')
      : existing.weightKg
  const color =
    input.color !== undefined
      ? normalizeOptionalText(input.color, 120, 'color')
      : existing.color
  const lengthCm =
    input.lengthCm !== undefined
      ? normalizeOptionalNumber(input.lengthCm, 'lengthCm')
      : existing.lengthCm
  const heightCm =
    input.heightCm !== undefined
      ? normalizeOptionalNumber(input.heightCm, 'heightCm')
      : existing.heightCm
  const markings =
    input.markings !== undefined
      ? normalizeOptionalText(input.markings, 500, 'markings')
      : existing.markings
  const physicalNotes =
    input.physicalNotes !== undefined
      ? normalizeOptionalText(input.physicalNotes, 2000, 'physicalNotes')
      : existing.physicalNotes
  const pedigreeNotes =
    input.pedigreeNotes !== undefined
      ? normalizeOptionalText(input.pedigreeNotes, 2000, 'pedigreeNotes')
      : existing.pedigreeNotes
  const virtualLifeEnabled =
    input.virtualLifeEnabled !== undefined
      ? Boolean(input.virtualLifeEnabled)
      : existing.virtualLifeEnabled

  await pool.query(
    `UPDATE pets SET
      name = $1,
      species_id = $2,
      breed_id = $3,
      date_of_birth = $4::date,
      sex = $5::pet_sex,
      description = $6,
      greeting = $7,
      greeting_fr = $8,
      weight_kg = $9,
      color = $10,
      length_cm = $11,
      height_cm = $12,
      markings = $13,
      physical_notes = $14,
      pedigree_notes = $15,
      virtual_life_enabled = $16,
      updated_at = NOW()
    WHERE id = $17 AND user_id = $18`,
    [
      name,
      speciesId,
      breedId,
      dateOfBirth,
      sex,
      description,
      greeting,
      greetingFr,
      weightKg ?? null,
      color ?? null,
      lengthCm ?? null,
      heightCm ?? null,
      markings ?? null,
      physicalNotes ?? null,
      pedigreeNotes ?? null,
      virtualLifeEnabled,
      petId,
      userId,
    ],
  )

  if (virtualLifeEnabled !== existing.virtualLifeEnabled) {
    if (virtualLifeEnabled) {
      await ensureDefaultPetGoals(petId)
      await createSelfIntroductionDraft(petId)
    } else {
      await cancelActivePetGoals(petId)
    }
  }

  return getPetById(userId, petId)
}

/** Rebuild EN + FR greetings from current General-tab facts (owner-triggered). */
export async function regeneratePetGreeting(userId: number, petId: number) {
  const existing = await getPetById(userId, petId)
  const { greeting, greetingFr } = await buildBilingualGreetings({
    name: existing.name,
    speciesLabel: existing.species.label,
    speciesSlug: existing.species.slug,
    breedLabel: existing.breed?.label ?? null,
    sex: existing.sex,
    description: existing.description,
    dateOfBirth: existing.dateOfBirth,
  })

  await pool.query(
    `UPDATE pets SET greeting = $1, greeting_fr = $2, updated_at = NOW()
     WHERE id = $3 AND user_id = $4`,
    [greeting, greetingFr, petId, userId],
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
  await deleteAllPetCertificateFiles(petId)
  await deleteAllPetMedicalFiles(petId)

  await pool.query('DELETE FROM pets WHERE id = $1 AND user_id = $2', [petId, userId])
}
