import { buildPublicUploadUrl } from './uploads.js'
import type { PublicMember } from './map-public-member.js'
import type { PetSex } from '../types/pet.js'

export interface GalleryPetPhoto {
  id: number
  url: string
  caption: string | null
  captionFr: string | null
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
  greetingFr: string | null
  coverCaption: string | null
  coverCaptionFr: string | null
  /** Most recent AI draft (event reaction), bilingual. */
  latestVoice: string | null
  latestVoiceFr: string | null
  latestVoiceTemplate: string | null
  virtualLifeEnabled: boolean
  liked: boolean
  likeCount: number
  member?: PublicMember
  photos: GalleryPetPhoto[]
  /** Present on GET /api/gallery/pets/:id only. */
  friends?: PetFriendSummary[]
  /** Short hello/reply exchanges; present on GET /api/gallery/pets/:id only. */
  friendExchanges?: PetFriendExchange[]
}

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
  greeting_fr: string | null
  cover_caption: string | null
  cover_caption_fr: string | null
  latest_voice: string | null
  latest_voice_fr: string | null
  latest_voice_template: string | null
  virtual_life_enabled: boolean
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
  friends?: PetFriendSummary[],
  friendExchanges?: PetFriendExchange[],
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
    greetingFr: row.greeting_fr,
    coverCaption: row.cover_caption?.trim() || null,
    coverCaptionFr: row.cover_caption_fr?.trim() || null,
    latestVoice: row.latest_voice?.trim() || null,
    latestVoiceFr: row.latest_voice_fr?.trim() || null,
    latestVoiceTemplate: row.latest_voice_template?.trim() || null,
    virtualLifeEnabled: Boolean(row.virtual_life_enabled),
    liked: row.liked,
    likeCount: Number(row.like_count ?? 0),
    ...(member ? { member } : {}),
    photos,
    ...(friends ? { friends } : {}),
    ...(friendExchanges ? { friendExchanges } : {}),
  }
}
