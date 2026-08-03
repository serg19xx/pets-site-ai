export type PetParentRole = 'dam' | 'sire'
export type PetParentSource = 'owned_pet' | 'site_pet' | 'external'

export interface LinkedPetSummary {
  id: number
  name: string
  speciesLabel: string
  breedLabel: string | null
  avatarUrl: string | null
  ownerUserId: number
  publicPath: string
}

export interface PetParentRecord {
  role: PetParentRole
  source: PetParentSource
  linkedPet: LinkedPetSummary | null
  name: string | null
  breedLabel: string | null
  notes: string | null
  photoUrl: string | null
}

export interface ParentCandidate {
  id: number
  name: string
  speciesLabel: string
  breedLabel: string | null
  avatarUrl: string | null
  scope: 'owned' | 'site'
}

export interface UpsertPetParentInput {
  source: PetParentSource
  linkedPetId?: number | null
  name?: string | null
  breedLabel?: string | null
  notes?: string | null
}
