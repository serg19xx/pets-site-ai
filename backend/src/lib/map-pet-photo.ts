import { buildPublicUploadUrl } from './uploads.js'

export interface PetPhoto {
  id: number
  url: string
  sortOrder: number
  createdAt: string
  isCover: boolean
  caption: string | null
  captionFr: string | null
}

type PetPhotoRow = {
  id: string
  path: string
  sort_order: number
  created_at: Date
  is_cover: boolean
  caption: string | null
  caption_fr: string | null
}

export type { PetPhotoRow }

export function mapPetPhotoRow(row: PetPhotoRow): PetPhoto {
  const createdAt =
    row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
  return {
    id: Number(row.id),
    url: buildPublicUploadUrl(row.path),
    sortOrder: row.sort_order,
    createdAt,
    isCover: Boolean(row.is_cover),
    caption: row.caption?.trim() || null,
    captionFr: row.caption_fr?.trim() || null,
  }
}
