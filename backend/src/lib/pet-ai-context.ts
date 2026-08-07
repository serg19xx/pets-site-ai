import { pool } from '../db/pool.js'
import { AppError } from './errors.js'
import {
  loadPetPersonalityByPetId,
  personalityToPromptInstructions,
} from '../services/pet-personality.js'
import {
  listMemoriesForPrompt,
  memoriesToPromptBlock,
} from '../services/pet-memories.js'
import {
  listActiveGoalsForPrompt,
  goalsToPromptBlock,
} from '../services/pet-goals.js'
import {
  getPetPromptTemplate,
  type PetPromptTemplateKey,
} from './pet-prompt-templates.js'
import { isPetVirtualLifeEnabled } from './pet-virtual-life.js'

export interface PetAiIdentity {
  petId: number
  name: string
  speciesSlug: string
  speciesLabel: string
  breedLabel: string | null
  sex: string
  dateOfBirth: string
  description: string | null
  greeting: string | null
  greetingFr: string | null
}

export interface PetAiPromptContext {
  identity: PetAiIdentity
  personalityBlock: string
  memoriesBlock: string
  goalsBlock: string
  templateKey: PetPromptTemplateKey
  templateInstructions: string
  /** Ready-to-send prompt body for LLM / n8n (English instructions). */
  promptText: string
}

type IdentityRow = {
  id: string
  name: string
  species_slug: string
  species_label: string
  breed_label: string | null
  sex: string
  date_of_birth: Date
  description: string | null
  greeting: string | null
  greeting_fr: string | null
}

function formatDate(d: Date): string {
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10)
}

async function loadIdentity(petId: number): Promise<PetAiIdentity> {
  const r = await pool.query<IdentityRow>(
    `SELECT p.id, p.name, p.sex, p.date_of_birth, p.description,
            p.greeting, p.greeting_fr,
            ps.slug AS species_slug, ps.label AS species_label,
            pb.label AS breed_label
     FROM pets p
     INNER JOIN pet_species ps ON ps.id = p.species_id
     LEFT JOIN pet_breeds pb ON pb.id = p.breed_id
     WHERE p.id = $1`,
    [petId],
  )
  const row = r.rows[0]
  if (!row) {
    throw new AppError(404, 'Pet not found', 'NOT_FOUND')
  }
  return {
    petId: Number(row.id),
    name: row.name,
    speciesSlug: row.species_slug,
    speciesLabel: row.species_label,
    breedLabel: row.breed_label,
    sex: row.sex,
    dateOfBirth: formatDate(row.date_of_birth),
    description: row.description,
    greeting: row.greeting,
    greetingFr: row.greeting_fr,
  }
}

/**
 * Assemble backend-owned context for a prompt template.
 */
export async function buildPetAiPromptContext(
  petId: number,
  templateKey: PetPromptTemplateKey,
  options: { eventHint?: string } = {},
): Promise<PetAiPromptContext> {
  const template = getPetPromptTemplate(templateKey)
  if (!template) {
    throw new AppError(400, 'Unknown prompt template', 'VALIDATION_ERROR')
  }

  const identity = await loadIdentity(petId)
  const personality = await loadPetPersonalityByPetId(petId)
  const memories = await listMemoriesForPrompt(petId)
  const goals = await listActiveGoalsForPrompt(petId)

  const personalityBlock = personalityToPromptInstructions(personality)
  const memoriesBlock = memoriesToPromptBlock(memories)
  const goalsBlock = goalsToPromptBlock(goals)

  const identityLines = [
    `Name: ${identity.name}`,
    `Species: ${identity.speciesLabel} (${identity.speciesSlug})`,
    identity.breedLabel ? `Breed: ${identity.breedLabel}` : null,
    `Sex: ${identity.sex}`,
    `Date of birth: ${identity.dateOfBirth}`,
    identity.description ? `Owner notes: ${identity.description}` : null,
  ].filter(Boolean)

  const parts = [
    `You are writing as the pet "${identity.name}". Never break character. Never mention AI or being virtual.`,
    '',
    'Identity:',
    ...identityLines.map((l) => `- ${l}`),
    '',
    personalityBlock,
    '',
    memoriesBlock,
    '',
    goalsBlock,
    '',
    `Template: ${template.key}`,
    template.instructions,
  ]
  if (options.eventHint) {
    parts.push('', `Trigger / fact (do not invent beyond this): ${options.eventHint}`)
  }

  return {
    identity,
    personalityBlock,
    memoriesBlock,
    goalsBlock,
    templateKey: template.key,
    templateInstructions: template.instructions,
    promptText: parts.join('\n'),
  }
}

export async function assertVirtualLifeForAi(petId: number): Promise<boolean> {
  return isPetVirtualLifeEnabled(petId)
}
