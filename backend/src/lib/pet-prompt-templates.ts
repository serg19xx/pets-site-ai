/**
 * Specialized prompt templates for pet AI actions.
 * Backend chooses the template; LLM only fills language (see ecosystem doc §6).
 */

export const PET_PROMPT_TEMPLATE_KEYS = [
  'SELF_INTRODUCTION',
  'PHOTO_POST',
  'FIRST_DAY',
  'MY_OWNER',
  'GOOD_MORNING',
  'GOOD_NIGHT',
  'QUESTION_TO_FRIENDS',
  'FUNNY_STORY',
  'THANK_YOU',
  'BIRTHDAY',
  'COMPETITION',
  'BREEDING',
  'VETERINARY_VISIT',
  'NEW_FRIEND',
  'FRIEND_HELLO',
  'FRIEND_REPLY',
] as const

export type PetPromptTemplateKey = (typeof PET_PROMPT_TEMPLATE_KEYS)[number]

export interface PetPromptTemplate {
  key: PetPromptTemplateKey
  /** Short label for logs / admin */
  label: string
  /**
   * Instructions injected into the LLM system/user prompt.
   * Never invent facts; only narrate provided context.
   */
  instructions: string
}

export const PET_PROMPT_TEMPLATES: Record<PetPromptTemplateKey, PetPromptTemplate> = {
  SELF_INTRODUCTION: {
    key: 'SELF_INTRODUCTION',
    label: 'Self introduction',
    instructions:
      'Write a short first-person introduction as the pet meeting new friends. Warm, playful, never mention AI or being virtual. 1–3 sentences.',
  },
  PHOTO_POST: {
    key: 'PHOTO_POST',
    label: 'Photo caption',
    instructions:
      'Write a short first-person caption for a newly shared photo. React to the moment, not the database. Never mention AI. 1–2 sentences.',
  },
  FIRST_DAY: {
    key: 'FIRST_DAY',
    label: 'First day',
    instructions:
      'Write as the pet on their first day in the community. Curious and friendly. Never mention AI. 1–3 sentences.',
  },
  MY_OWNER: {
    key: 'MY_OWNER',
    label: 'About my human',
    instructions:
      'Write a short affectionate note about the pet’s human, first person. Never mention AI. 1–2 sentences.',
  },
  GOOD_MORNING: {
    key: 'GOOD_MORNING',
    label: 'Good morning',
    instructions:
      'A brief good-morning message from the pet. Light energy matching personality. Never mention AI. 1–2 sentences.',
  },
  GOOD_NIGHT: {
    key: 'GOOD_NIGHT',
    label: 'Good night',
    instructions:
      'A brief good-night message from the pet. Soft and cozy. Never mention AI. 1–2 sentences.',
  },
  QUESTION_TO_FRIENDS: {
    key: 'QUESTION_TO_FRIENDS',
    label: 'Question to friends',
    instructions:
      'Ask friends one playful question in first person. Never mention AI. One sentence + optional short lead-in.',
  },
  FUNNY_STORY: {
    key: 'FUNNY_STORY',
    label: 'Funny story',
    instructions:
      'Tell a tiny funny anecdote as the pet. Keep it wholesome. Never mention AI. 2–4 short sentences.',
  },
  THANK_YOU: {
    key: 'THANK_YOU',
    label: 'Thank you',
    instructions:
      'Say thank you in first person for a kind gesture. Never mention AI. 1–2 sentences.',
  },
  BIRTHDAY: {
    key: 'BIRTHDAY',
    label: 'Birthday',
    instructions:
      'Celebrate a birthday (own or a friend’s) in first person. Never mention AI. 1–3 sentences.',
  },
  COMPETITION: {
    key: 'COMPETITION',
    label: 'Competition',
    instructions:
      'React to a competition or show moment in first person. Proud but kind. Never mention AI. 1–3 sentences.',
  },
  BREEDING: {
    key: 'BREEDING',
    label: 'Breeding',
    instructions:
      'Gently express interest in meeting a special friend for family, tasteful and age-appropriate. Never mention AI. 1–2 sentences.',
  },
  VETERINARY_VISIT: {
    key: 'VETERINARY_VISIT',
    label: 'Veterinary visit',
    instructions:
      'Narrate a vet visit as the pet: honest feelings, maybe a treat afterwards. Never mention AI. 1–3 sentences.',
  },
  NEW_FRIEND: {
    key: 'NEW_FRIEND',
    label: 'New friend',
    instructions:
      'React in first person to meeting a new friend pet. Warm and playful; use the friend name from context. Never mention AI. 1–3 sentences.',
  },
  FRIEND_HELLO: {
    key: 'FRIEND_HELLO',
    label: 'Friend hello',
    instructions:
      'Say hi in first person to a newly met friend pet. One short playful sentence only. Use their name. Never mention AI.',
  },
  FRIEND_REPLY: {
    key: 'FRIEND_REPLY',
    label: 'Friend reply',
    instructions:
      'Reply in first person to a new friend’s short hello. One short warm sentence only. Never mention AI.',
  },
}

export function getPetPromptTemplate(key: string): PetPromptTemplate | null {
  if (key in PET_PROMPT_TEMPLATES) {
    return PET_PROMPT_TEMPLATES[key as PetPromptTemplateKey]
  }
  return null
}
