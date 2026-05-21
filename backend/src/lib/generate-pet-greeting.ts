import type { PetSex } from '../types/pet.js'

export type GreetingLocale = 'en' | 'fr'

export interface GreetingInput {
  name: string
  speciesLabel: string
  speciesSlug: string
  sex: PetSex
  locale: GreetingLocale
}

function speciesNounEn(slug: string, label: string): string {
  const map: Record<string, string> = {
    cat: 'cat',
    dog: 'dog',
    rabbit: 'bunny',
    bird: 'bird',
    hamster: 'hamster',
  }
  return map[slug] ?? label.toLowerCase()
}

function speciesNounFr(slug: string, label: string): string {
  const map: Record<string, string> = {
    cat: 'chat',
    dog: 'chien',
    rabbit: 'lapin',
    bird: 'oiseau',
    hamster: 'hamster',
  }
  return map[slug] ?? label.toLowerCase()
}

/** Placeholder until n8n/agent generates greetings. */
export function generatePetGreeting(input: GreetingInput): string {
  const name = input.name.trim()
  if (!name) {
    return ''
  }

  if (input.locale === 'fr') {
    const kind = speciesNounFr(input.speciesSlug, input.speciesLabel)
    return `Bonjour! Je suis ${kind} ${name}. Content·e que vous visitiez ma page!`
  }

  const kind = speciesNounEn(input.speciesSlug, input.speciesLabel)
  return `Hi! I'm ${name}, a little ${kind}. Glad you stopped by my page!`
}

export function parseGreetingLocale(acceptLanguage: string | undefined): GreetingLocale {
  if (!acceptLanguage) {
    return 'en'
  }
  const primary = acceptLanguage.split(',')[0]?.trim().toLowerCase() ?? ''
  if (primary.startsWith('fr')) {
    return 'fr'
  }
  return 'en'
}

export function normalizePetDescription(value: string | undefined | null): string | null {
  if (value === undefined || value === null) {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  if (trimmed.length > 2000) {
    return trimmed.slice(0, 2000)
  }
  return trimmed
}
