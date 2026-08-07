import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { PET_EVENT_TYPES, recordPetEvent } from './pet-events.js'

export const PERSONALITY_TRAITS = [
  'energy',
  'friendliness',
  'curiosity',
  'confidence',
  'humor',
  'talkativeness',
  'affection',
  'playfulness',
  'bravery',
  'patience',
] as const

export type PersonalityTrait = (typeof PERSONALITY_TRAITS)[number]

export type PetPersonality = Record<PersonalityTrait, number> & {
  updatedAt: string | null
}

export type PetPersonalityInput = Partial<Record<PersonalityTrait, number>>

const DEFAULT_TRAIT = 5

function defaultPersonality(): PetPersonality {
  return {
    energy: DEFAULT_TRAIT,
    friendliness: DEFAULT_TRAIT,
    curiosity: DEFAULT_TRAIT,
    confidence: DEFAULT_TRAIT,
    humor: DEFAULT_TRAIT,
    talkativeness: DEFAULT_TRAIT,
    affection: DEFAULT_TRAIT,
    playfulness: DEFAULT_TRAIT,
    bravery: DEFAULT_TRAIT,
    patience: DEFAULT_TRAIT,
    updatedAt: null,
  }
}

type PersonalityRow = {
  energy: number
  friendliness: number
  curiosity: number
  confidence: number
  humor: number
  talkativeness: number
  affection: number
  playfulness: number
  bravery: number
  patience: number
  updated_at: Date
}

function mapRow(row: PersonalityRow): PetPersonality {
  return {
    energy: Number(row.energy),
    friendliness: Number(row.friendliness),
    curiosity: Number(row.curiosity),
    confidence: Number(row.confidence),
    humor: Number(row.humor),
    talkativeness: Number(row.talkativeness),
    affection: Number(row.affection),
    playfulness: Number(row.playfulness),
    bravery: Number(row.bravery),
    patience: Number(row.patience),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  }
}

async function assertPetOwned(userId: number, petId: number): Promise<void> {
  const r = await pool.query('SELECT 1 FROM pets WHERE id = $1 AND user_id = $2', [
    petId,
    userId,
  ])
  if (r.rowCount === 0) {
    throw new AppError(404, 'Pet not found', 'NOT_FOUND')
  }
}

function clampTrait(value: unknown, name: string): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 10) {
    throw new AppError(400, `${name} must be an integer from 1 to 10`, 'VALIDATION_ERROR')
  }
  return n
}

export async function getPetPersonality(
  userId: number,
  petId: number,
): Promise<PetPersonality> {
  await assertPetOwned(userId, petId)
  return loadPetPersonalityByPetId(petId)
}

/** Internal AI pipeline — no ownership check (caller must authorize). */
export async function loadPetPersonalityByPetId(
  petId: number,
): Promise<PetPersonality> {
  const r = await pool.query<PersonalityRow>(
    `SELECT energy, friendliness, curiosity, confidence, humor,
            talkativeness, affection, playfulness, bravery, patience, updated_at
     FROM pet_personality WHERE pet_id = $1`,
    [petId],
  )
  const row = r.rows[0]
  return row ? mapRow(row) : defaultPersonality()
}

export async function upsertPetPersonality(
  userId: number,
  petId: number,
  input: PetPersonalityInput,
): Promise<PetPersonality> {
  await assertPetOwned(userId, petId)

  const current = await getPetPersonality(userId, petId)
  const next = {
    energy: current.energy,
    friendliness: current.friendliness,
    curiosity: current.curiosity,
    confidence: current.confidence,
    humor: current.humor,
    talkativeness: current.talkativeness,
    affection: current.affection,
    playfulness: current.playfulness,
    bravery: current.bravery,
    patience: current.patience,
  }
  for (const trait of PERSONALITY_TRAITS) {
    if (input[trait] !== undefined) {
      next[trait] = clampTrait(input[trait], trait)
    }
  }

  await pool.query(
    `INSERT INTO pet_personality (
       pet_id, energy, friendliness, curiosity, confidence, humor,
       talkativeness, affection, playfulness, bravery, patience, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
     )
     ON CONFLICT (pet_id) DO UPDATE SET
       energy = EXCLUDED.energy,
       friendliness = EXCLUDED.friendliness,
       curiosity = EXCLUDED.curiosity,
       confidence = EXCLUDED.confidence,
       humor = EXCLUDED.humor,
       talkativeness = EXCLUDED.talkativeness,
       affection = EXCLUDED.affection,
       playfulness = EXCLUDED.playfulness,
       bravery = EXCLUDED.bravery,
       patience = EXCLUDED.patience,
       updated_at = NOW()`,
    [
      petId,
      next.energy,
      next.friendliness,
      next.curiosity,
      next.confidence,
      next.humor,
      next.talkativeness,
      next.affection,
      next.playfulness,
      next.bravery,
      next.patience,
    ],
  )

  await recordPetEvent({
    petId,
    eventType: PET_EVENT_TYPES.PERSONALITY_UPDATED,
    payload: { ...next },
  })

  return getPetPersonality(userId, petId)
}

/** Compact prompt block for future LLM agents (English labels). */
export function personalityToPromptInstructions(p: PetPersonality): string {
  const lines = PERSONALITY_TRAITS.map((trait) => {
    const label = trait.charAt(0).toUpperCase() + trait.slice(1)
    return `- ${label}: ${p[trait]}/10`
  })
  return `Personality (1=low, 10=high):\n${lines.join('\n')}`
}
