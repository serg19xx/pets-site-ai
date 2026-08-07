import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import {
  assertVirtualLifeForAi,
  buildPetAiPromptContext,
} from '../lib/pet-ai-context.js'
import { resolveBilingualAiDraft } from '../lib/n8n-pet-ai-draft.js'
import type { PetPromptTemplateKey } from '../lib/pet-prompt-templates.js'

export interface PetAiDraftRecord {
  id: number
  petId: number
  templateKey: string
  status: string
  body: string
  bodyFr: string
  sourceEventType: string | null
  payload: Record<string, unknown>
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

async function insertDraft(input: {
  petId: number
  templateKey: PetPromptTemplateKey | string
  body: string
  bodyFr: string
  sourceEventType?: string | null
  payload?: Record<string, unknown>
  status?: string
}): Promise<PetAiDraftRecord | null> {
  const r = await pool.query<DraftRow>(
    `INSERT INTO pet_ai_drafts (
       pet_id, template_key, status, body, body_fr, source_event_type, payload
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING id, pet_id, template_key, status, body, body_fr,
               source_event_type, payload, created_at, updated_at`,
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
  return row ? mapRow(row) : null
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
    `SELECT id, pet_id, template_key, status, body, body_fr,
            source_event_type, payload, created_at, updated_at
     FROM pet_ai_drafts
     WHERE pet_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT $2 OFFSET $3`,
    [petId, limit, offset],
  )

  return { drafts: r.rows.map(mapRow), total }
}
