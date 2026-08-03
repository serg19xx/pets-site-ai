import { pool } from '../db/pool.js'
import { adminUsersExclusion } from '../lib/admin.js'
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
  viewerUserId?: number,
): Promise<{ pets: ReturnType<typeof mapGalleryPetRow>[]; total: number }> {
  const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT)
  const safeOffset = Math.max(0, offset)

  const excludeForCount = adminUsersExclusion('u.email', 1)
  const countR = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c
     FROM pets p
     INNER JOIN users u ON u.id = p.user_id
     WHERE TRUE${excludeForCount.clause}`,
    excludeForCount.params,
  )
  const total = Number(countR.rows[0]?.c ?? 0)

  const likedSelect =
    viewerUserId === undefined
      ? 'false AS liked'
      : `EXISTS(
          SELECT 1
          FROM pet_likes plv
          WHERE plv.pet_id = p.id AND plv.user_id = $3
        ) AS liked`

  const excludeForList =
    viewerUserId === undefined
      ? adminUsersExclusion('u.email', 3)
      : adminUsersExclusion('u.email', 4)

  const listParams: unknown[] =
    viewerUserId === undefined
      ? [safeLimit, safeOffset, ...excludeForList.params]
      : [safeLimit, safeOffset, viewerUserId, ...excludeForList.params]

  const r = await pool.query<GalleryRow>(
    `SELECT
      p.id,
      p.name,
      ps.slug AS species_slug,
      ps.label AS species_label,
      pb.label AS breed_label,
      p.date_of_birth,
      p.sex,
      cover_pp.path AS avatar_path,
      p.description,
      p.greeting,
      p.greeting_fr,
      ${likedSelect},
      COALESCE((
        SELECT COUNT(*)::int
        FROM pet_likes plc
        WHERE plc.pet_id = p.id
      ), 0) AS like_count
    FROM pets p
    INNER JOIN users u ON u.id = p.user_id
    INNER JOIN pet_species ps ON ps.id = p.species_id
    LEFT JOIN pet_breeds pb ON pb.id = p.breed_id
    LEFT JOIN pet_photos cover_pp ON cover_pp.id = p.cover_photo_id
    WHERE TRUE${excludeForList.clause}
    ORDER BY
      (p.cover_photo_id IS NOT NULL) DESC,
      p.updated_at DESC,
      p.id DESC
    LIMIT $1 OFFSET $2`,
    listParams,
  )

  const pets = r.rows.map((row) => mapGalleryPetRow(row, []))

  return { pets, total }
}

export async function listLikedGalleryPets(
  userId: number,
  limit: number,
  offset: number,
): Promise<{ pets: ReturnType<typeof mapGalleryPetRow>[]; total: number }> {
  const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT)
  const safeOffset = Math.max(0, offset)

  const countR = await pool.query<{ c: string }>(
    'SELECT COUNT(*)::text AS c FROM pet_likes WHERE user_id = $1',
    [userId],
  )
  const total = Number(countR.rows[0]?.c ?? 0)

  const r = await pool.query<GalleryRow>(
    `SELECT
      p.id,
      p.name,
      ps.slug AS species_slug,
      ps.label AS species_label,
      pb.label AS breed_label,
      p.date_of_birth,
      p.sex,
      cover_pp.path AS avatar_path,
      p.description,
      p.greeting,
      p.greeting_fr,
      true AS liked,
      COALESCE((
        SELECT COUNT(*)::int
        FROM pet_likes plc
        WHERE plc.pet_id = p.id
      ), 0) AS like_count
    FROM pet_likes pl
    INNER JOIN pets p ON p.id = pl.pet_id
    INNER JOIN pet_species ps ON ps.id = p.species_id
    LEFT JOIN pet_breeds pb ON pb.id = p.breed_id
    LEFT JOIN pet_photos cover_pp ON cover_pp.id = p.cover_photo_id
    WHERE pl.user_id = $1
    ORDER BY pl.created_at DESC, pl.pet_id DESC
    LIMIT $2 OFFSET $3`,
    [userId, safeLimit, safeOffset],
  )
  const pets = r.rows.map((row) => mapGalleryPetRow(row, []))
  return { pets, total }
}

export async function getGalleryPetById(
  id: number,
): Promise<ReturnType<typeof mapGalleryPetRow> | null> {
  const exclude = adminUsersExclusion('u.email', 2)
  const r = await pool.query<GalleryDetailRow>(
    `SELECT
      ${PET_GALLERY_SELECT},
      ${MEMBER_SELECT}
    FROM pets p
    INNER JOIN users u ON u.id = p.user_id
    INNER JOIN pet_species ps ON ps.id = p.species_id
    LEFT JOIN pet_breeds pb ON pb.id = p.breed_id
    LEFT JOIN pet_photos cover_pp ON cover_pp.id = p.cover_photo_id
    WHERE p.id = $1${exclude.clause}`,
    [id, ...exclude.params],
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
