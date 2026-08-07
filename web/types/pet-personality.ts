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
