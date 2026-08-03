import type { PetSex } from '../types/pet.js'

export type GreetingLocale = 'en' | 'fr'

export interface GreetingInput {
  name: string
  speciesLabel: string
  speciesSlug: string
  breedLabel: string | null
  sex: PetSex
  description: string | null
  dateOfBirth: string
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

export function ageYearsFromDob(dateOfBirth: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth.trim())
  if (!match) {
    return null
  }
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  const birth = new Date(Date.UTC(y, m - 1, d))
  if (Number.isNaN(birth.getTime())) {
    return null
  }
  const now = new Date()
  let years = now.getUTCFullYear() - birth.getUTCFullYear()
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) {
    years -= 1
  }
  return years < 0 ? 0 : years
}

function sexPhraseEn(sex: PetSex): string {
  if (sex === 'male') {
    return 'boy'
  }
  if (sex === 'female') {
    return 'girl'
  }
  return ''
}

function sexPhraseFr(sex: PetSex): string {
  if (sex === 'male') {
    return 'un garçon'
  }
  if (sex === 'female') {
    return 'une fille'
  }
  return ''
}

function clipDescription(description: string | null, max = 120): string | null {
  if (!description) {
    return null
  }
  const trimmed = description.trim().replace(/\s+/g, ' ')
  if (!trimmed) {
    return null
  }
  if (trimmed.length <= max) {
    return trimmed
  }
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

/**
 * Template first-person greeting from General-tab facts.
 * Used when n8n is unset or the LLM webhook fails.
 */
export function generatePetGreeting(input: GreetingInput): string {
  const name = input.name.trim()
  if (!name) {
    return ''
  }

  const years = ageYearsFromDob(input.dateOfBirth)
  const about = clipDescription(input.description)
  const breed = input.breedLabel?.trim() || null

  if (input.locale === 'fr') {
    const kind = speciesNounFr(input.speciesSlug, input.speciesLabel)
    const sexBit = sexPhraseFr(input.sex)
    const who = breed
      ? `Je suis ${name}, ${kind} ${breed}`
      : `Je suis ${name}, ${kind}`
    const ageBit =
      years === null
        ? ''
        : years === 0
          ? ' J’ai moins d’un an.'
          : years === 1
            ? ' J’ai 1 an.'
            : ` J’ai ${years} ans.`
    const sexLine = sexBit ? ` Oui, ${sexBit}.` : ''
    const aboutBit = about ? ` ${about}` : ''
    const text = `Bonjour! ${who}.${ageBit}${sexLine}${aboutBit} Content·e que vous visitiez ma page!`
    return text.length <= 500 ? text : `${text.slice(0, 499).trimEnd()}…`
  }

  const kind = speciesNounEn(input.speciesSlug, input.speciesLabel)
  const sexBit = sexPhraseEn(input.sex)
  const who = breed
    ? `I'm ${name}, a ${breed} ${kind}`
    : `I'm ${name}, a little ${kind}`
  const ageBit =
    years === null
      ? ''
      : years === 0
        ? ` I'm under a year old.`
        : years === 1
          ? ` I'm 1 year old.`
          : ` I'm ${years} years old.`
  const sexLine = sexBit ? ` Yes — a ${sexBit}.` : ''
  const aboutBit = about ? ` ${about}` : ''
  const text = `Hi! ${who}.${ageBit}${sexLine}${aboutBit} Glad you stopped by my page!`
  return text.length <= 500 ? text : `${text.slice(0, 499).trimEnd()}…`
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
