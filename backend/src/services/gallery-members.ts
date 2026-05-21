import { pool } from '../db/pool.js'
import { mapPublicMember, type PublicMemberRow } from '../lib/map-public-member.js'
import { mapGalleryPetRow, type GalleryRow } from '../lib/map-gallery-pet.js'

export const MEMBER_SELECT = `
  u.id AS member_id,
  u.full_name AS member_full_name,
  u.nickname AS member_nickname,
  u.avatar_path AS member_avatar_path,
  u.show_full_name AS member_show_full_name,
  u.show_nickname AS member_show_nickname
`

export const PET_GALLERY_SELECT = `
  p.id,
  p.name,
  ps.slug AS species_slug,
  ps.label AS species_label,
  pb.label AS breed_label,
  p.date_of_birth,
  p.sex,
  cover_pp.path AS avatar_path,
  p.description,
  p.greeting
`

export interface GalleryMemberJoinRow {
  member_id: string
  member_full_name: string
  member_nickname: string
  member_avatar_path: string | null
  member_show_full_name: boolean
  member_show_nickname: boolean
}

export type GalleryDetailRow = GalleryRow & GalleryMemberJoinRow

export async function getPublicMemberProfile(userId: number) {
  const userR = await pool.query<PublicMemberRow>(
    `SELECT
      id,
      full_name,
      nickname,
      avatar_path,
      show_full_name,
      show_nickname
    FROM users
    WHERE id = $1`,
    [userId],
  )
  const userRow = userR.rows[0]
  if (!userRow) {
    return null
  }

  const petsR = await pool.query<GalleryRow>(
    `SELECT ${PET_GALLERY_SELECT}
    FROM pets p
    INNER JOIN pet_species ps ON ps.id = p.species_id
    LEFT JOIN pet_breeds pb ON pb.id = p.breed_id
    LEFT JOIN pet_photos cover_pp ON cover_pp.id = p.cover_photo_id
    WHERE p.user_id = $1
    ORDER BY p.updated_at DESC, p.id DESC`,
    [userId],
  )

  return {
    member: mapPublicMember(userRow),
    pets: petsR.rows.map((row) => mapGalleryPetRow(row, [])),
  }
}

export function mapMemberFromDetailRow(row: GalleryDetailRow) {
  return mapPublicMember({
    id: row.member_id,
    full_name: row.member_full_name,
    nickname: row.member_nickname,
    avatar_path: row.member_avatar_path,
    show_full_name: row.member_show_full_name,
    show_nickname: row.member_show_nickname,
  })
}
