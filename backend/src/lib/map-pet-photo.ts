import { buildPublicUploadUrl } from './uploads.js'

export interface PetPhoto {
  id: number
  url: string
  sortOrder: number
  createdAt: string
  isCover: boolean
}

type PetPhotoRow = {
  id: string
  path: string
  sort_order: number
  created_at: Date
  is_cover: boolean
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
  }
}
