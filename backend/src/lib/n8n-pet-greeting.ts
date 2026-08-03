import { config } from '../config.js'
import {
  ageYearsFromDob,
  generatePetGreeting,
  type GreetingInput,
} from './generate-pet-greeting.js'

const GREETING_MAX = 500

export type BilingualGreetings = {
  greeting: string
  greetingFr: string
}

type GreetingFacts = Omit<GreetingInput, 'locale'>

function clipGreeting(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= GREETING_MAX) {
    return trimmed
  }
  return `${trimmed.slice(0, GREETING_MAX - 1).trimEnd()}…`
}

function templateBilingual(input: GreetingFacts): BilingualGreetings {
  return {
    greeting: generatePetGreeting({ ...input, locale: 'en' }),
    greetingFr: generatePetGreeting({ ...input, locale: 'fr' }),
  }
}

/**
 * One n8n call → both EN and FR. Returns null when disabled or on any failure.
 */
export async function fetchBilingualGreetingsFromN8n(
  input: GreetingFacts,
): Promise<BilingualGreetings | null> {
  const url = config.n8n.petGreetingWebhookUrl
  if (!url) {
    return null
  }

  const payload = {
    name: input.name.trim(),
    speciesLabel: input.speciesLabel,
    speciesSlug: input.speciesSlug,
    breedLabel: input.breedLabel,
    sex: input.sex,
    description: input.description,
    dateOfBirth: input.dateOfBirth,
    ageYears: ageYearsFromDob(input.dateOfBirth),
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
        `[n8n] pet-greeting HTTP ${response.status}: ${await response.text().catch(() => '')}`,
      )
      return null
    }

    const data = (await response.json()) as {
      greeting?: unknown
      greetingFr?: unknown
      greetingEn?: unknown
    }

    const enRaw =
      typeof data.greeting === 'string'
        ? data.greeting
        : typeof data.greetingEn === 'string'
          ? data.greetingEn
          : ''
    const frRaw = typeof data.greetingFr === 'string' ? data.greetingFr : ''

    if (!enRaw.trim() || !frRaw.trim()) {
      console.warn('[n8n] pet-greeting: missing greeting / greetingFr in response')
      return null
    }

    return {
      greeting: clipGreeting(enRaw),
      greetingFr: clipGreeting(frRaw),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[n8n] pet-greeting failed: ${message}`)
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Prefer one n8n/LLM call for both languages; fall back to local templates. */
export async function resolveBilingualPetGreetings(
  input: GreetingFacts,
): Promise<BilingualGreetings> {
  const fromAi = await fetchBilingualGreetingsFromN8n(input)
  if (fromAi) {
    return fromAi
  }
  return templateBilingual(input)
}
