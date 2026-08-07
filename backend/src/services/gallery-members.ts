import { pool } from '../db/pool.js'
import { isAdminEmail } from '../lib/admin.js'
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

/** Latest ready/published AI draft — the pet’s most recent “event voice”. */
export const LATEST_VOICE_SELECT = `
  (
    SELECT d.body
    FROM pet_ai_drafts d
    WHERE d.pet_id = p.id
      AND d.status IN ('ready', 'published')
    ORDER BY d.created_at DESC, d.id DESC
    LIMIT 1
  ) AS latest_voice,
  (
    SELECT d.body_fr
    FROM pet_ai_drafts d
    WHERE d.pet_id = p.id
      AND d.status IN ('ready', 'published')
    ORDER BY d.created_at DESC, d.id DESC
    LIMIT 1
  ) AS latest_voice_fr,
  (
    SELECT d.template_key
    FROM pet_ai_drafts d
    WHERE d.pet_id = p.id
      AND d.status IN ('ready', 'published')
    ORDER BY d.created_at DESC, d.id DESC
    LIMIT 1
  ) AS latest_voice_template
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
  COALESCE(
    cover_pp.caption,
    (
      SELECT pp.caption
      FROM pet_photos pp
      WHERE pp.pet_id = p.id AND pp.caption IS NOT NULL
      ORDER BY pp.created_at DESC, pp.id DESC
      LIMIT 1
    )
  ) AS cover_caption,
  COALESCE(
    cover_pp.caption_fr,
    (
      SELECT pp.caption_fr
      FROM pet_photos pp
      WHERE pp.pet_id = p.id AND pp.caption_fr IS NOT NULL
      ORDER BY pp.created_at DESC, pp.id DESC
      LIMIT 1
    )
  ) AS cover_caption_fr,
  ${LATEST_VOICE_SELECT},
  p.description,
  p.greeting,
  p.greeting_fr,
  p.virtual_life_enabled,
  false AS liked,
  COALESCE((
    SELECT COUNT(*)::int
    FROM pet_likes pl
    WHERE pl.pet_id = p.id
  ), 0) AS like_count
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
  const userR = await pool.query<PublicMemberRow & { email: string }>(
    `SELECT
      id,
      full_name,
      nickname,
      avatar_path,
      show_full_name,
      show_nickname,
      email
    FROM users
    WHERE id = $1`,
    [userId],
  )
  const userRow = userR.rows[0]
  if (!userRow || isAdminEmail(userRow.email)) {
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
