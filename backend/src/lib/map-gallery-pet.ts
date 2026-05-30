import { buildPublicUploadUrl } from './uploads.js'
import type { PublicMember } from './map-public-member.js'
import type { PetSex } from '../types/pet.js'

export interface GalleryPetPhoto {
  id: number
  url: string
}

export interface GalleryPet {
  id: number
  name: string
  species: { slug: string; label: string }
  breed: { label: string } | null
  dateOfBirth: string
  sex: PetSex
  avatarUrl: string | null
  description: string | null
  greeting: string | null
  liked: boolean
  likeCount: number
  member?: PublicMember
  photos: GalleryPetPhoto[]
}

export type GalleryRow = {
  id: string
  name: string
  species_slug: string
  species_label: string
  breed_label: string | null
  date_of_birth: Date
  sex: PetSex
  avatar_path: string | null
  description: string | null
  greeting: string | null
  liked: boolean
  like_count: number
}

function formatDate(d: Date): string {
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10)
}

export function mapGalleryPetRow(
  row: GalleryRow,
  photos: GalleryPetPhoto[] = [],
  member?: PublicMember,
): GalleryPet {
  return {
    id: Number(row.id),
    name: row.name,
    species: { slug: row.species_slug, label: row.species_label },
    breed: row.breed_label ? { label: row.breed_label } : null,
    dateOfBirth: formatDate(row.date_of_birth),
    sex: row.sex,
    avatarUrl: row.avatar_path ? buildPublicUploadUrl(row.avatar_path) : null,
    description: row.description,
    greeting: row.greeting,
    liked: row.liked,
    likeCount: Number(row.like_count ?? 0),
    ...(member ? { member } : {}),
    photos,
  }
}
