export const PET_SEXES = ['male', 'female', 'unknown'] as const

export type PetSex = (typeof PET_SEXES)[number]

export const PET_SEX_LABELS: Record<PetSex, string> = {
  male: 'Boy',
  female: 'Girl',
  unknown: 'Unknown',
}

export interface PetSpeciesRef {
  id: number
  slug: string
  label: string
}

export interface PetBreedRef {
  id: number
  label: string
}

export interface Pet {
  id: number
  userId: number
  name: string
  species: PetSpeciesRef
  breed: PetBreedRef | null
  dateOfBirth: string
  sex: PetSex
  avatarUrl: string | null
  coverPhotoId: number | null
  description: string | null
  greeting: string | null
  greetingFr: string | null
  weightKg: number | null
  color: string | null
  lengthCm: number | null
  heightCm: number | null
  markings: string | null
  physicalNotes: string | null
  pedigreeNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface PetSpeciesListItem {
  id: number
  slug: string
  label: string
}

export interface PetBreedListItem {
  id: number
  label: string
}
