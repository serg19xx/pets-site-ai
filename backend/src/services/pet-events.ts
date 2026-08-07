import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { isPetVirtualLifeEnabled } from '../lib/pet-virtual-life.js'

/** Backend event types (AI never invents these). */
export const PET_EVENT_TYPES = {
  PET_CREATED: 'PET_CREATED',
  PHOTO_UPLOADED: 'PHOTO_UPLOADED',
  CERTIFICATE_UPLOADED: 'CERTIFICATE_UPLOADED',
  MEDICAL_VISIT: 'MEDICAL_VISIT',
  PERSONALITY_UPDATED: 'PERSONALITY_UPDATED',
  NEW_FRIEND: 'NEW_FRIEND',
} as const

export type PetEventType = (typeof PET_EVENT_TYPES)[keyof typeof PET_EVENT_TYPES]

export interface PetEventRecord {
  id: number
  petId: number
  eventType: string
  payload: Record<string, unknown>
  createdAt: string
}

type EventRow = {
  id: string
  pet_id: string
  event_type: string
  payload: Record<string, unknown> | null
  created_at: Date
}

function mapRow(row: EventRow): PetEventRecord {
  return {
    id: Number(row.id),
    petId: Number(row.pet_id),
    eventType: row.event_type,
    payload: row.payload && typeof row.payload === 'object' ? row.payload : {},
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  }
}

/**
 * Persist a pet lifecycle event. Failures are logged and swallowed so domain
 * writes (create pet, upload photo, …) are never blocked by the event log.
 */
export async function recordPetEvent(input: {
  petId: number
  eventType: PetEventType | string
  payload?: Record<string, unknown>
}): Promise<void> {
  try {
    if (!(await isPetVirtualLifeEnabled(input.petId))) {
      return
    }
    await pool.query(
      `INSERT INTO pet_events (pet_id, event_type, payload)
       VALUES ($1, $2, $3::jsonb)`,
      [input.petId, input.eventType, JSON.stringify(input.payload ?? {})],
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[pet-events] failed to record ${input.eventType}: ${message}`)
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

export async function listPetEvents(
  userId: number,
  petId: number,
  options: { limit?: number; offset?: number } = {},
): Promise<{ events: PetEventRecord[]; total: number }> {
  await assertPetOwned(userId, petId)
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100)
  const offset = Math.max(options.offset ?? 0, 0)

  const countR = await pool.query<{ c: string }>(
    'SELECT COUNT(*)::text AS c FROM pet_events WHERE pet_id = $1',
    [petId],
  )
  const total = Number(countR.rows[0]?.c ?? 0)

  const r = await pool.query<EventRow>(
    `SELECT id, pet_id, event_type, payload, created_at
     FROM pet_events
     WHERE pet_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT $2 OFFSET $3`,
    [petId, limit, offset],
  )

  return { events: r.rows.map(mapRow), total }
}
