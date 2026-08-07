import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { isPetVirtualLifeEnabled } from '../lib/pet-virtual-life.js'

/** Memory kinds used in prompts (backend vocabulary). */
export const PET_MEMORY_KINDS = {
  FACT: 'fact',
  PREFERENCE: 'preference',
  FEAR: 'fear',
  RELATIONSHIP: 'relationship',
  PLACE: 'place',
  ACHIEVEMENT: 'achievement',
} as const

export type PetMemoryKind = (typeof PET_MEMORY_KINDS)[keyof typeof PET_MEMORY_KINDS]

export interface PetMemoryRecord {
  id: number
  petId: number
  kind: string
  content: string
  importance: number
  sourceEventType: string | null
  isActive: boolean
  createdAt: string
}

type MemoryRow = {
  id: string
  pet_id: string
  kind: string
  content: string
  importance: number
  source_event_type: string | null
  is_active: boolean
  created_at: Date
}

function mapRow(row: MemoryRow): PetMemoryRecord {
  return {
    id: Number(row.id),
    petId: Number(row.pet_id),
    kind: row.kind,
    content: row.content,
    importance: Number(row.importance),
    sourceEventType: row.source_event_type,
    isActive: Boolean(row.is_active),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  }
}

function clampImportance(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) {
    return 5
  }
  return Math.min(10, Math.max(1, Math.round(value)))
}

/**
 * Persist a memory. Failures are swallowed so domain writes are not blocked.
 */
export async function recordPetMemory(input: {
  petId: number
  kind: PetMemoryKind | string
  content: string
  importance?: number
  sourceEventType?: string | null
}): Promise<void> {
  const content = input.content.trim()
  if (!content) {
    return
  }
  try {
    if (!(await isPetVirtualLifeEnabled(input.petId))) {
      return
    }
    await pool.query(
      `INSERT INTO pet_memories (pet_id, kind, content, importance, source_event_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        input.petId,
        input.kind,
        content.slice(0, 500),
        clampImportance(input.importance),
        input.sourceEventType ?? null,
      ],
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[pet-memories] failed to record: ${message}`)
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

export async function listPetMemories(
  userId: number,
  petId: number,
  options: { limit?: number; offset?: number; activeOnly?: boolean } = {},
): Promise<{ memories: PetMemoryRecord[]; total: number }> {
  await assertPetOwned(userId, petId)
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100)
  const offset = Math.max(options.offset ?? 0, 0)
  const activeOnly = options.activeOnly !== false

  const countR = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM pet_memories
     WHERE pet_id = $1 AND ($2::boolean = FALSE OR is_active = TRUE)`,
    [petId, activeOnly],
  )
  const total = Number(countR.rows[0]?.c ?? 0)

  const r = await pool.query<MemoryRow>(
    `SELECT id, pet_id, kind, content, importance, source_event_type, is_active, created_at
     FROM pet_memories
     WHERE pet_id = $1 AND ($2::boolean = FALSE OR is_active = TRUE)
     ORDER BY importance DESC, created_at DESC, id DESC
     LIMIT $3 OFFSET $4`,
    [petId, activeOnly, limit, offset],
  )

  return { memories: r.rows.map(mapRow), total }
}

/** Top memories for LLM context (no ownership check — caller must authorize). */
export async function listMemoriesForPrompt(
  petId: number,
  limit = 12,
): Promise<PetMemoryRecord[]> {
  const capped = Math.min(Math.max(limit, 1), 30)
  const r = await pool.query<MemoryRow>(
    `SELECT id, pet_id, kind, content, importance, source_event_type, is_active, created_at
     FROM pet_memories
     WHERE pet_id = $1 AND is_active = TRUE
     ORDER BY importance DESC, created_at DESC, id DESC
     LIMIT $2`,
    [petId, capped],
  )
  return r.rows.map(mapRow)
}

export function memoriesToPromptBlock(memories: PetMemoryRecord[]): string {
  if (memories.length === 0) {
    return 'Memories: (none yet)'
  }
  const lines = memories.map((m) => `- [${m.kind}] ${m.content}`)
  return `Memories (most important first):\n${lines.join('\n')}`
}
