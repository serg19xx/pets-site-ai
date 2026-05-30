import type { PublicMember } from '~/types/public-member'
import type { PetSex } from '~/types/pet'

/** Public gallery photo item. */
export interface GalleryPetPhoto {
  id: number
  url: string
}

/** Public gallery card (API: GET /api/gallery/pets). */
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
  /** Present on GET /api/gallery/pets/:id only. */
  member?: PublicMember
  photos: GalleryPetPhoto[]
}

export type { PublicMember } from '~/types/public-member'
