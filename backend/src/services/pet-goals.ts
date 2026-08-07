import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { isPetVirtualLifeEnabled } from '../lib/pet-virtual-life.js'

/** Goal types from backend rules (LLM never invents these). */
export const PET_GOAL_TYPES = {
  FIND_FRIENDS: 'find_friends',
  FIND_BREEDING_PARTNER: 'find_breeding_partner',
  PREPARE_COMPETITION: 'prepare_competition',
  PLAY: 'play',
  EXPLORE: 'explore',
  VISIT_VETERINARIAN: 'visit_veterinarian',
  CELEBRATE_BIRTHDAY: 'celebrate_birthday',
} as const

export type PetGoalType = (typeof PET_GOAL_TYPES)[keyof typeof PET_GOAL_TYPES]

export const PET_GOAL_STATUSES = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

export type PetGoalStatus = (typeof PET_GOAL_STATUSES)[keyof typeof PET_GOAL_STATUSES]

export interface PetGoalRecord {
  id: number
  petId: number
  goalType: string
  status: string
  priority: number
  payload: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

type GoalRow = {
  id: string
  pet_id: string
  goal_type: string
  status: string
  priority: number
  payload: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
}

function mapRow(row: GoalRow): PetGoalRecord {
  return {
    id: Number(row.id),
    petId: Number(row.pet_id),
    goalType: row.goal_type,
    status: row.status,
    priority: Number(row.priority),
    payload: row.payload && typeof row.payload === 'object' ? row.payload : {},
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  }
}

/**
 * Ensure starter goals exist after pet creation. Idempotent per active type.
 * Failures are swallowed so create-pet is never blocked.
 */
export async function ensureDefaultPetGoals(petId: number): Promise<void> {
  const defaults: Array<{ goalType: PetGoalType; priority: number }> = [
    { goalType: PET_GOAL_TYPES.FIND_FRIENDS, priority: 7 },
    { goalType: PET_GOAL_TYPES.PLAY, priority: 6 },
    { goalType: PET_GOAL_TYPES.EXPLORE, priority: 5 },
    { goalType: PET_GOAL_TYPES.VISIT_VETERINARIAN, priority: 4 },
  ]

  try {
    if (!(await isPetVirtualLifeEnabled(petId))) {
      return
    }
    for (const item of defaults) {
      await pool.query(
        `INSERT INTO pet_goals (pet_id, goal_type, status, priority)
         SELECT $1, $2, 'active', $3
         WHERE NOT EXISTS (
           SELECT 1 FROM pet_goals
           WHERE pet_id = $1 AND goal_type = $2 AND status = 'active'
         )`,
        [petId, item.goalType, item.priority],
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[pet-goals] failed to ensure defaults: ${message}`)
  }
}

/** Cancel all active goals (e.g. when owner turns virtual life off). */
export async function cancelActivePetGoals(petId: number): Promise<void> {
  try {
    await pool.query(
      `UPDATE pet_goals
       SET status = 'cancelled', updated_at = NOW()
       WHERE pet_id = $1 AND status = 'active'`,
      [petId],
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[pet-goals] failed to cancel active goals: ${message}`)
  }
}

/**
 * Complete an active goal of the given type (if any). Swallows errors.
 */
export async function completePetGoal(
  petId: number,
  goalType: PetGoalType | string,
  payload?: Record<string, unknown>,
): Promise<void> {
  try {
    if (!(await isPetVirtualLifeEnabled(petId))) {
      return
    }
    await pool.query(
      `UPDATE pet_goals
       SET status = 'completed',
           updated_at = NOW(),
           payload = CASE
             WHEN $3::jsonb IS NULL THEN payload
             ELSE payload || $3::jsonb
           END
       WHERE pet_id = $1
         AND goal_type = $2
         AND status = 'active'`,
      [
        petId,
        goalType,
        payload ? JSON.stringify(payload) : null,
      ],
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[pet-goals] failed to complete ${goalType}: ${message}`)
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

export async function listPetGoals(
  userId: number,
  petId: number,
  options: { status?: PetGoalStatus | 'all' } = {},
): Promise<{ goals: PetGoalRecord[] }> {
  await assertPetOwned(userId, petId)
  const status = options.status ?? PET_GOAL_STATUSES.ACTIVE

  const r =
    status === 'all'
      ? await pool.query<GoalRow>(
          `SELECT id, pet_id, goal_type, status, priority, payload, created_at, updated_at
           FROM pet_goals
           WHERE pet_id = $1
           ORDER BY
             CASE status WHEN 'active' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END,
             priority DESC, updated_at DESC, id DESC`,
          [petId],
        )
      : await pool.query<GoalRow>(
          `SELECT id, pet_id, goal_type, status, priority, payload, created_at, updated_at
           FROM pet_goals
           WHERE pet_id = $1 AND status = $2
           ORDER BY priority DESC, updated_at DESC, id DESC`,
          [petId, status],
        )

  return { goals: r.rows.map(mapRow) }
}

/** Active goals for LLM context (no ownership check — caller must authorize). */
export async function listActiveGoalsForPrompt(
  petId: number,
  limit = 8,
): Promise<PetGoalRecord[]> {
  const capped = Math.min(Math.max(limit, 1), 20)
  const r = await pool.query<GoalRow>(
    `SELECT id, pet_id, goal_type, status, priority, payload, created_at, updated_at
     FROM pet_goals
     WHERE pet_id = $1 AND status = 'active'
     ORDER BY priority DESC, updated_at DESC, id DESC
     LIMIT $2`,
    [petId, capped],
  )
  return r.rows.map(mapRow)
}

export function goalsToPromptBlock(goals: PetGoalRecord[]): string {
  if (goals.length === 0) {
    return 'Active goals: (none)'
  }
  const lines = goals.map((g) => `- ${g.goalType} (priority ${g.priority}/10)`)
  return `Active goals:\n${lines.join('\n')}`
}
