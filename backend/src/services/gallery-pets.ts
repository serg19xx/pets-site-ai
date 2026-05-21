import { pool } from '../db/pool.js'
import { mapGalleryPetRow, type GalleryRow } from '../lib/map-gallery-pet.js'
import {
  mapMemberFromDetailRow,
  MEMBER_SELECT,
  PET_GALLERY_SELECT,
  type GalleryDetailRow,
} from './gallery-members.js'
import { listPetPhotosPublic } from './pet-photos.js'

const MAX_LIMIT = 60

export async function listGalleryPets(
  limit: number,
  offset: number,
): Promise<{ pets: ReturnType<typeof mapGalleryPetRow>[]; total: number }> {
  const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT)
  const safeOffset = Math.max(0, offset)

  const countR = await pool.query<{ c: string }>('SELECT COUNT(*)::text AS c FROM pets')
  const total = Number(countR.rows[0]?.c ?? 0)

  const r = await pool.query<GalleryRow>(
    `SELECT ${PET_GALLERY_SELECT}
    FROM pets p
    INNER JOIN pet_species ps ON ps.id = p.species_id
    LEFT JOIN pet_breeds pb ON pb.id = p.breed_id
    LEFT JOIN pet_photos cover_pp ON cover_pp.id = p.cover_photo_id
    ORDER BY
      (p.cover_photo_id IS NOT NULL) DESC,
      p.updated_at DESC,
      p.id DESC
    LIMIT $1 OFFSET $2`,
    [safeLimit, safeOffset],
  )

  const pets = r.rows.map((row) => mapGalleryPetRow(row, []))

  return { pets, total }
}

export async function getGalleryPetById(
  id: number,
): Promise<ReturnType<typeof mapGalleryPetRow> | null> {
  const r = await pool.query<GalleryDetailRow>(
    `SELECT
      ${PET_GALLERY_SELECT},
      ${MEMBER_SELECT}
    FROM pets p
    INNER JOIN users u ON u.id = p.user_id
    INNER JOIN pet_species ps ON ps.id = p.species_id
    LEFT JOIN pet_breeds pb ON pb.id = p.breed_id
    LEFT JOIN pet_photos cover_pp ON cover_pp.id = p.cover_photo_id
    WHERE p.id = $1`,
    [id],
  )
  const row = r.rows[0]
  if (!row) {
    return null
  }
  const photos = await listPetPhotosPublic(id)
  const galleryPhotos = photos.map((p) => ({ id: p.id, url: p.url }))
  const member = mapMemberFromDetailRow(row)
  return mapGalleryPetRow(row, galleryPhotos, member)
}
