import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import {
  assertVirtualLifeForAi,
  buildPetAiPromptContext,
} from '../lib/pet-ai-context.js'
import { resolveBilingualAiDraft } from '../lib/n8n-pet-ai-draft.js'
import type { PetPromptTemplateKey } from '../lib/pet-prompt-templates.js'
import {
  IDLE_MUSING_AFTER_DAYS,
  isSurfaceVoiceTemplate,
  shouldShowVoiceNewBadge,
} from '../lib/pet-voice-surface.js'

export interface PetAiDraftRecord {
  id: number
  petId: number
  templateKey: string
  status: string
  body: string
  bodyFr: string
  sourceEventType: string | null
  payload: Record<string, unknown>
  isSurface: boolean
  surfacedAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

type DraftRow = {
  id: string
  pet_id: string
  template_key: string
  status: string
  body: string
  body_fr: string
  source_event_type: string | null
  payload: Record<string, unknown> | null
  is_surface: boolean
  surfaced_at: Date | null
  archived_at: Date | null
  created_at: Date
  updated_at: Date
}

function mapRow(row: DraftRow): PetAiDraftRecord {
  return {
    id: Number(row.id),
    petId: Number(row.pet_id),
    templateKey: row.template_key,
    status: row.status,
    body: row.body,
    bodyFr: row.body_fr,
    sourceEventType: row.source_event_type,
    payload: row.payload && typeof row.payload === 'object' ? row.payload : {},
    isSurface: Boolean(row.is_surface),
    surfacedAt:
      row.surfaced_at instanceof Date
        ? row.surfaced_at.toISOString()
        : row.surfaced_at
          ? String(row.surfaced_at)
          : null,
    archivedAt:
      row.archived_at instanceof Date
        ? row.archived_at.toISOString()
        : row.archived_at
          ? String(row.archived_at)
          : null,
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

const DRAFT_RETURNING = `id, pet_id, template_key, status, body, body_fr,
               source_event_type, payload, is_surface, surfaced_at, archived_at,
               created_at, updated_at`

/**
 * Make `draftId` the gallery surface voice. Previous surface drafts are archived
 * (is_surface=false) but kept for memory — never deleted.
 * Idle musings replace the bubble without lighting the "New" badge.
 */
export async function activateSurfaceDraft(
  petId: number,
  draftId: number,
  options: { showNewBadge?: boolean } = {},
): Promise<void> {
  const showNewBadge = options.showNewBadge !== false
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE pet_ai_drafts
       SET is_surface = FALSE,
           archived_at = COALESCE(archived_at, NOW()),
           updated_at = NOW()
       WHERE pet_id = $1
         AND is_surface = TRUE
         AND id <> $2`,
      [petId, draftId],
    )
    const r = await client.query(
      `UPDATE pet_ai_drafts
       SET is_surface = TRUE,
           surfaced_at = CASE
             WHEN $3::boolean THEN NOW()
             ELSE NOW() - INTERVAL '4 days'
           END,
           archived_at = NULL,
           updated_at = NOW()
       WHERE id = $1
         AND pet_id = $2`,
      [draftId, petId, showNewBadge],
    )
    if ((r.rowCount ?? 0) === 0) {
      throw new AppError(404, 'Draft not found', 'NOT_FOUND')
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function insertDraft(input: {
  petId: number
  templateKey: PetPromptTemplateKey | string
  body: string
  bodyFr: string
  sourceEventType?: string | null
  payload?: Record<string, unknown>
  status?: string
  activateSurface?: boolean
}): Promise<PetAiDraftRecord | null> {
  const r = await pool.query<DraftRow>(
    `INSERT INTO pet_ai_drafts (
       pet_id, template_key, status, body, body_fr, source_event_type, payload
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING ${DRAFT_RETURNING}`,
    [
      input.petId,
      input.templateKey,
      input.status ?? 'ready',
      input.body.slice(0, 2000),
      input.bodyFr.slice(0, 2000),
      input.sourceEventType ?? null,
      JSON.stringify(input.payload ?? {}),
    ],
  )
  const row = r.rows[0]
  if (!row) {
    return null
  }
  const draft = mapRow(row)
  const shouldSurface =
    input.activateSurface ?? isSurfaceVoiceTemplate(String(input.templateKey))
  if (shouldSurface) {
    const showNewBadge = shouldShowVoiceNewBadge(String(input.templateKey))
    await activateSurfaceDraft(input.petId, draft.id, { showNewBadge })
    return {
      ...draft,
      isSurface: true,
      surfacedAt: showNewBadge
        ? new Date().toISOString()
        : new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      archivedAt: null,
    }
  }
  return draft
}

async function createTemplateDraft(input: {
  petId: number
  templateKey: PetPromptTemplateKey
  eventHint: string
  sourceEventType: string
  procedureLabel?: string
  friendName?: string
  friendSpeciesLabel?: string
  payload?: Record<string, unknown>
}): Promise<void> {
  const ctx = await buildPetAiPromptContext(input.petId, input.templateKey, {
    eventHint: input.eventHint,
  })
  const draft = await resolveBilingualAiDraft({
    templateKey: input.templateKey,
    templateInstructions: ctx.templateInstructions,
    promptText: ctx.promptText,
    eventHint: input.eventHint,
    procedureLabel: input.procedureLabel,
    friendName: input.friendName,
    friendSpeciesLabel: input.friendSpeciesLabel,
    identity: ctx.identity,
  })
  await insertDraft({
    petId: input.petId,
    templateKey: input.templateKey,
    body: draft.body,
    bodyFr: draft.bodyFr,
    sourceEventType: input.sourceEventType,
    payload: {
      ...input.payload,
      promptChars: ctx.promptText.length,
      source: draft.source,
    },
  })
}

/**
 * Create SELF_INTRODUCTION draft after pet creation. Swallows errors.
 * Skips if a SELF_INTRODUCTION draft already exists for this pet.
 */
export async function createSelfIntroductionDraft(petId: number): Promise<void> {
  try {
    if (!(await assertVirtualLifeForAi(petId))) {
      return
    }
    const existing = await pool.query(
      `SELECT 1 FROM pet_ai_drafts
       WHERE pet_id = $1 AND template_key = 'SELF_INTRODUCTION'
       LIMIT 1`,
      [petId],
    )
    if ((existing.rowCount ?? 0) > 0) {
      return
    }
    await createTemplateDraft({
      petId,
      templateKey: 'SELF_INTRODUCTION',
      eventHint: 'Pet just joined the community (PET_CREATED).',
      sourceEventType: 'PET_CREATED',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[pet-ai-drafts] SELF_INTRODUCTION failed: ${message}`)
  }
}

/**
 * Create PHOTO_POST draft after gallery upload. Swallows errors.
 * Returns bilingual text when successful (caller may attach to pet_photos).
 */
export async function createPhotoPostDraft(
  petId: number,
  photoId: number,
): Promise<{ body: string; bodyFr: string } | null> {
  try {
    if (!(await assertVirtualLifeForAi(petId))) {
      return null
    }
    const ctx = await buildPetAiPromptContext(petId, 'PHOTO_POST', {
      eventHint: `Owner uploaded gallery photo #${photoId} (PHOTO_UPLOADED).`,
    })
    const draft = await resolveBilingualAiDraft({
      templateKey: 'PHOTO_POST',
      templateInstructions: ctx.templateInstructions,
      promptText: ctx.promptText,
      eventHint: `Owner uploaded gallery photo #${photoId} (PHOTO_UPLOADED).`,
      identity: ctx.identity,
    })
    await insertDraft({
      petId,
      templateKey: 'PHOTO_POST',
      body: draft.body,
      bodyFr: draft.bodyFr,
      sourceEventType: 'PHOTO_UPLOADED',
      payload: {
        photoId,
        promptChars: ctx.promptText.length,
        source: draft.source,
      },
      status: 'published',
      activateSurface: false,
    })
    return { body: draft.body, bodyFr: draft.bodyFr }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[pet-ai-drafts] PHOTO_POST failed: ${message}`)
    return null
  }
}

/**
 * Create VETERINARY_VISIT draft after medical record. Swallows errors.
 */
export async function createVeterinaryVisitDraft(
  petId: number,
  input: { recordId: number; visitedOn: string; procedureLabel: string },
): Promise<void> {
  try {
    if (!(await assertVirtualLifeForAi(petId))) {
      return
    }
    await createTemplateDraft({
      petId,
      templateKey: 'VETERINARY_VISIT',
      eventHint: `Veterinary visit on ${input.visitedOn}: ${input.procedureLabel} (MEDICAL_VISIT).`,
      sourceEventType: 'MEDICAL_VISIT',
      procedureLabel: input.procedureLabel,
      payload: {
        recordId: input.recordId,
        visitedOn: input.visitedOn,
        procedureLabel: input.procedureLabel,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[pet-ai-drafts] VETERINARY_VISIT failed: ${message}`)
  }
}

/**
 * Create NEW_FRIEND draft after a friendship is formed. Swallows errors.
 */
export async function createNewFriendDraft(
  petId: number,
  friend: { id: number; name: string; speciesLabel: string },
): Promise<void> {
  try {
    if (!(await assertVirtualLifeForAi(petId))) {
      return
    }
    await createTemplateDraft({
      petId,
      templateKey: 'NEW_FRIEND',
      eventHint: `Just made friends with ${friend.name} (${friend.speciesLabel}) (NEW_FRIEND).`,
      sourceEventType: 'NEW_FRIEND',
      friendName: friend.name,
      friendSpeciesLabel: friend.speciesLabel,
      payload: {
        friendPetId: friend.id,
        friendName: friend.name,
        friendSpeciesLabel: friend.speciesLabel,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[pet-ai-drafts] NEW_FRIEND failed: ${message}`)
  }
}

/**
 * One short hello + one reply after friendship (not a full chat).
 * Swallows errors. Up to two short LLM/local generations.
 */
export async function createFriendReplicaExchange(input: {
  fromPetId: number
  fromName: string
  toPetId: number
  toName: string
}): Promise<void> {
  try {
    const fromOn = await assertVirtualLifeForAi(input.fromPetId)
    const toOn = await assertVirtualLifeForAi(input.toPetId)
    if (!fromOn && !toOn) {
      return
    }

    const [petA, petB] =
      input.fromPetId < input.toPetId
        ? [input.fromPetId, input.toPetId]
        : [input.toPetId, input.fromPetId]

    let helloBody = `Hey ${input.toName}! Want to play together sometime?`
    let helloBodyFr = `Salut ${input.toName} ! On joue un peu ensemble un de ces jours ?`
    let replyBody = `Hi ${input.fromName}! I'd love that — sniff you later!`
    let replyBodyFr = `Salut ${input.fromName} ! Avec plaisir — à tout à l'heure !`

    if (fromOn) {
      const ctx = await buildPetAiPromptContext(input.fromPetId, 'FRIEND_HELLO', {
        eventHint: `Say hello to new friend ${input.toName}.`,
      })
      const draft = await resolveBilingualAiDraft({
        templateKey: 'FRIEND_HELLO',
        templateInstructions: ctx.templateInstructions,
        promptText: ctx.promptText,
        eventHint: `Say hello to new friend ${input.toName}.`,
        friendName: input.toName,
        identity: ctx.identity,
      })
      helloBody = draft.body.slice(0, 500)
      helloBodyFr = draft.bodyFr.slice(0, 500)
      await pool.query(
        `INSERT INTO pet_friend_messages (
           pet_a_id, pet_b_id, speaker_pet_id, turn, body, body_fr
         ) VALUES ($1, $2, $3, 1, $4, $5)
         ON CONFLICT (pet_a_id, pet_b_id, turn) DO NOTHING`,
        [petA, petB, input.fromPetId, helloBody, helloBodyFr],
      )
    }

    if (toOn) {
      const ctx = await buildPetAiPromptContext(input.toPetId, 'FRIEND_REPLY', {
        eventHint: `${input.fromName} said: "${helloBody}". Reply briefly.`,
      })
      const draft = await resolveBilingualAiDraft({
        templateKey: 'FRIEND_REPLY',
        templateInstructions: ctx.templateInstructions,
        promptText: ctx.promptText,
        eventHint: `${input.fromName} said: "${helloBody}". Reply briefly.`,
        friendName: input.fromName,
        identity: ctx.identity,
      })
      replyBody = draft.body.slice(0, 500)
      replyBodyFr = draft.bodyFr.slice(0, 500)
      await pool.query(
        `INSERT INTO pet_friend_messages (
           pet_a_id, pet_b_id, speaker_pet_id, turn, body, body_fr
         ) VALUES ($1, $2, $3, 2, $4, $5)
         ON CONFLICT (pet_a_id, pet_b_id, turn) DO NOTHING`,
        [petA, petB, input.toPetId, replyBody, replyBodyFr],
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[pet-ai-drafts] friend replica exchange failed: ${message}`)
  }
}

/**
 * Create IDLE_MUSING draft when the pet has been quiet for a while. Swallows errors.
 */
export async function createIdleMusingDraft(petId: number): Promise<void> {
  try {
    if (!(await assertVirtualLifeForAi(petId))) {
      return
    }
    await createTemplateDraft({
      petId,
      templateKey: 'IDLE_MUSING',
      eventHint:
        'Nothing special happened lately. The pet feels a bit bored and restless (IDLE_DAY).',
      sourceEventType: 'IDLE_DAY',
      payload: { reason: 'quiet_period' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[pet-ai-drafts] IDLE_MUSING failed: ${message}`)
  }
}

/**
 * For pets with virtual life on whose surface voice is older than IDLE_MUSING_AFTER_DAYS
 * (or missing), generate a new idle musing. Safe to call periodically.
 */
export async function runIdleMusingSweep(options: {
  limit?: number
} = {}): Promise<{ considered: number; generated: number }> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100)
  const r = await pool.query<{ id: string }>(
    `SELECT p.id
     FROM pets p
     WHERE p.virtual_life_enabled = TRUE
       AND (
         NOT EXISTS (
           SELECT 1 FROM pet_ai_drafts d
           WHERE d.pet_id = p.id AND d.is_surface = TRUE
         )
         OR EXISTS (
           SELECT 1 FROM pet_ai_drafts d
           WHERE d.pet_id = p.id
             AND d.is_surface = TRUE
             AND d.surfaced_at < NOW() - ($1::text || ' days')::interval
         )
       )
       AND NOT EXISTS (
         SELECT 1 FROM pet_ai_drafts d
         WHERE d.pet_id = p.id
           AND d.template_key = 'IDLE_MUSING'
           AND d.created_at > NOW() - ($1::text || ' days')::interval
       )
     ORDER BY p.id
     LIMIT $2`,
    [String(IDLE_MUSING_AFTER_DAYS), limit],
  )

  let generated = 0
  for (const row of r.rows) {
    const petId = Number(row.id)
    try {
      await createIdleMusingDraft(petId)
      generated += 1
    } catch {
      // createIdleMusingDraft already swallows; keep sweep going
    }
  }
  return { considered: r.rows.length, generated }
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

export async function listPetAiDrafts(
  userId: number,
  petId: number,
  options: { limit?: number; offset?: number } = {},
): Promise<{ drafts: PetAiDraftRecord[]; total: number }> {
  await assertPetOwned(userId, petId)
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 100)
  const offset = Math.max(options.offset ?? 0, 0)

  const countR = await pool.query<{ c: string }>(
    'SELECT COUNT(*)::text AS c FROM pet_ai_drafts WHERE pet_id = $1',
    [petId],
  )
  const total = Number(countR.rows[0]?.c ?? 0)

  const r = await pool.query<DraftRow>(
    `SELECT ${DRAFT_RETURNING}
     FROM pet_ai_drafts
     WHERE pet_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT $2 OFFSET $3`,
    [petId, limit, offset],
  )

  return { drafts: r.rows.map(mapRow), total }
}
