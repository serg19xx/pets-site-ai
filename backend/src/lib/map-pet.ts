import { buildPublicUploadUrl } from './uploads.js'
import type { PetSex } from '../types/pet.js'

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
  createdAt: string
  updatedAt: string
}

type PetRow = {
  id: string
  user_id: string
  name: string
  species_id: string
  species_slug: string
  species_label: string
  breed_id: string | null
  breed_label: string | null
  avatar_path: string | null
  cover_photo_id: string | null
  description: string | null
  greeting: string | null
  date_of_birth: Date
  sex: PetSex
  created_at: Date
  updated_at: Date
}

function formatDate(d: Date): string {
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10)
}

function formatIso(d: Date): string {
  return d instanceof Date ? d.toISOString() : String(d)
}

export function mapPetRow(row: PetRow): Pet {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    name: row.name,
    species: {
      id: Number(row.species_id),
      slug: row.species_slug,
      label: row.species_label,
    },
    breed:
      row.breed_id !== null && row.breed_label !== null
        ? { id: Number(row.breed_id), label: row.breed_label }
        : null,
    dateOfBirth: formatDate(row.date_of_birth),
    sex: row.sex,
    avatarUrl: row.avatar_path ? buildPublicUploadUrl(row.avatar_path) : null,
    coverPhotoId:
      row.cover_photo_id !== null && row.cover_photo_id !== undefined
        ? Number(row.cover_photo_id)
        : null,
    description: row.description,
    greeting: row.greeting,
    createdAt: formatIso(row.created_at),
    updatedAt: formatIso(row.updated_at),
  }
}
