import type { PublicMember } from '~/types/public-member'
import type { PetSex } from '~/types/pet'

/** Public gallery photo item. */
export interface GalleryPetPhoto {
  id: number
  url: string
  caption: string | null
  captionFr: string | null
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
  greetingFr: string | null
  coverCaption: string | null
  coverCaptionFr: string | null
  /** Most recent AI draft reaction (event voice). */
  latestVoice: string | null
  latestVoiceFr: string | null
  latestVoiceTemplate: string | null
  virtualLifeEnabled: boolean
  liked: boolean
  likeCount: number
  /** Present on GET /api/gallery/pets/:id only. */
  member?: PublicMember
  photos: GalleryPetPhoto[]
  /** Present on GET /api/gallery/pets/:id only. */
  friends?: PetFriendSummary[]
  /** Short hello/reply exchanges; present on GET /api/gallery/pets/:id only. */
  friendExchanges?: PetFriendExchange[]
}

/** Public friend card on a gallery pet profile. */
export interface PetFriendSummary {
  id: number
  name: string
  avatarUrl: string | null
  species: { slug: string; label: string }
}

export interface PetFriendExchangeLine {
  speakerPetId: number
  speakerName: string
  turn: number
  body: string
  bodyFr: string
  createdAt: string
}

export interface PetFriendExchange {
  friend: PetFriendSummary
  lines: PetFriendExchangeLine[]
}

export type { PublicMember } from '~/types/public-member'
