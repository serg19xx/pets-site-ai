import { config } from '../config.js'
import type { PetAiIdentity } from './pet-ai-context.js'
import {
  generateLocalFriendHello,
  generateLocalFriendReply,
  generateLocalNewFriend,
  generateLocalPhotoCaption,
  generateLocalSelfIntroduction,
  generateLocalVeterinaryVisit,
} from './generate-pet-ai-draft.js'
import type { PetPromptTemplateKey } from './pet-prompt-templates.js'

const DRAFT_MAX = 2000

export type BilingualAiDraft = {
  body: string
  bodyFr: string
  source: 'n8n' | 'local'
}

function clipDraft(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= DRAFT_MAX) {
    return trimmed
  }
  return `${trimmed.slice(0, DRAFT_MAX - 1).trimEnd()}…`
}

function localDraft(
  templateKey: PetPromptTemplateKey,
  identity: PetAiIdentity,
  options: {
    eventHint?: string
    procedureLabel?: string
    friendName?: string
    friendSpeciesLabel?: string
  } = {},
): BilingualAiDraft {
  if (templateKey === 'PHOTO_POST') {
    const local = generateLocalPhotoCaption(identity)
    return { ...local, source: 'local' }
  }
  if (templateKey === 'VETERINARY_VISIT') {
    const local = generateLocalVeterinaryVisit(
      identity,
      options.procedureLabel?.trim() || 'a check-up',
    )
    return { ...local, source: 'local' }
  }
  if (templateKey === 'NEW_FRIEND') {
    const local = generateLocalNewFriend(identity, {
      name: options.friendName?.trim() || 'a new friend',
      speciesLabel: options.friendSpeciesLabel?.trim() || 'friend',
    })
    return { ...local, source: 'local' }
  }
  if (templateKey === 'FRIEND_HELLO') {
    const local = generateLocalFriendHello(
      identity,
      options.friendName?.trim() || 'friend',
    )
    return { ...local, source: 'local' }
  }
  if (templateKey === 'FRIEND_REPLY') {
    const local = generateLocalFriendReply(
      identity,
      options.friendName?.trim() || 'friend',
    )
    return { ...local, source: 'local' }
  }
  const local = generateLocalSelfIntroduction(identity)
  return { ...local, source: 'local' }
}

/**
 * One n8n call → EN + FR draft. Returns null when disabled or on failure.
 */
export async function fetchBilingualAiDraftFromN8n(input: {
  templateKey: PetPromptTemplateKey
  templateInstructions: string
  promptText: string
  eventHint?: string
  procedureLabel?: string
  friendName?: string
  friendSpeciesLabel?: string
  identity: PetAiIdentity
}): Promise<BilingualAiDraft | null> {
  const url = config.n8n.petAiDraftWebhookUrl
  if (!url) {
    return null
  }

  const payload = {
    templateKey: input.templateKey,
    templateInstructions: input.templateInstructions,
    promptText: input.promptText,
    eventHint: input.eventHint ?? null,
    procedureLabel: input.procedureLabel ?? null,
    friendName: input.friendName ?? null,
    friendSpeciesLabel: input.friendSpeciesLabel ?? null,
    identity: {
      name: input.identity.name,
      speciesLabel: input.identity.speciesLabel,
      speciesSlug: input.identity.speciesSlug,
      breedLabel: input.identity.breedLabel,
      sex: input.identity.sex,
      dateOfBirth: input.identity.dateOfBirth,
      description: input.identity.description,
    },
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (config.n8n.webhookSecret) {
    headers['X-Petsbook-Secret'] = config.n8n.webhookSecret
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.n8n.timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      console.warn(
        `[n8n] pet-ai-draft HTTP ${response.status}: ${await response.text().catch(() => '')}`,
      )
      return null
    }

    const data = (await response.json()) as {
      body?: unknown
      bodyFr?: unknown
      bodyEn?: unknown
    }

    const enRaw =
      typeof data.body === 'string'
        ? data.body
        : typeof data.bodyEn === 'string'
          ? data.bodyEn
          : ''
    const frRaw = typeof data.bodyFr === 'string' ? data.bodyFr : ''

    if (!enRaw.trim() || !frRaw.trim()) {
      console.warn('[n8n] pet-ai-draft: missing body / bodyFr in response')
      return null
    }

    return {
      body: clipDraft(enRaw),
      bodyFr: clipDraft(frRaw),
      source: 'n8n',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[n8n] pet-ai-draft failed: ${message}`)
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Prefer n8n/LLM; fall back to local templates. */
export async function resolveBilingualAiDraft(input: {
  templateKey: PetPromptTemplateKey
  templateInstructions: string
  promptText: string
  eventHint?: string
  procedureLabel?: string
  friendName?: string
  friendSpeciesLabel?: string
  identity: PetAiIdentity
}): Promise<BilingualAiDraft> {
  const fromAi = await fetchBilingualAiDraftFromN8n(input)
  if (fromAi) {
    return fromAi
  }
  return localDraft(input.templateKey, input.identity, {
    eventHint: input.eventHint,
    procedureLabel: input.procedureLabel,
    friendName: input.friendName,
    friendSpeciesLabel: input.friendSpeciesLabel,
  })
}
