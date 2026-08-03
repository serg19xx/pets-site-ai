import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { assertAdmin, isAdminEmail } from '../lib/admin.js'
import { deleteUploadIfExists } from '../lib/uploads.js'
import { resolveDisplayName } from '../types/user.js'

export interface AdminUserSummary {
  id: number
  fullName: string
  nickname: string
  displayName: string
  email: string
  isBetaTester: boolean
  isAdmin: boolean
  emailVerified: boolean
  createdAt: string
}

type UserRow = {
  id: string
  full_name: string
  nickname: string
  email: string
  is_beta_tester: boolean
  email_verified_at: Date | null
  created_at: Date
}

export async function listAdminUsers(options: {
  userId: number
  limit: number
  offset: number
  q?: string
}): Promise<{ users: AdminUserSummary[]; total: number }> {
  await assertAdmin(options.userId)

  const params: unknown[] = []
  let where = ''
  if (options.q?.trim()) {
    params.push(`%${options.q.trim().toLowerCase()}%`)
    where = `WHERE (
      LOWER(u.email) LIKE $1
      OR LOWER(u.full_name) LIKE $1
      OR LOWER(u.nickname) LIKE $1
    )`
  }

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users u ${where}`,
    params,
  )
  const total = Number(countResult.rows[0]?.count ?? 0)

  params.push(options.limit)
  const limitIdx = params.length
  params.push(options.offset)
  const offsetIdx = params.length

  const list = await pool.query<UserRow>(
    `SELECT u.id, u.full_name, u.nickname, u.email, u.is_beta_tester,
            u.email_verified_at, u.created_at
     FROM users u
     ${where}
     ORDER BY u.created_at DESC, u.id DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
  )

  return {
    users: list.rows.map((row) => ({
      id: Number(row.id),
      fullName: row.full_name,
      nickname: row.nickname,
      displayName: resolveDisplayName(row.full_name, row.nickname),
      email: row.email,
      isBetaTester: Boolean(row.is_beta_tester),
      isAdmin: isAdminEmail(row.email),
      emailVerified: Boolean(row.email_verified_at),
      createdAt: row.created_at.toISOString(),
    })),
    total,
  }
}

async function collectUserUploadPaths(userId: number): Promise<string[]> {
  const paths = new Set<string>()

  const avatar = await pool.query<{ avatar_path: string | null }>(
    'SELECT avatar_path FROM users WHERE id = $1',
    [userId],
  )
  if (avatar.rows[0]?.avatar_path) {
    paths.add(avatar.rows[0].avatar_path)
  }

  const petPhotos = await pool.query<{ path: string }>(
    `SELECT pp.path
     FROM pet_photos pp
     INNER JOIN pets p ON p.id = pp.pet_id
     WHERE p.user_id = $1`,
    [userId],
  )
  for (const row of petPhotos.rows) {
    paths.add(row.path)
  }

  const postMedia = await pool.query<{ path: string }>(
    `SELECT pm.path
     FROM post_media pm
     INNER JOIN posts p ON p.id = pm.post_id
     WHERE p.user_id = $1`,
    [userId],
  )
  for (const row of postMedia.rows) {
    paths.add(row.path)
  }

  const listingMedia = await pool.query<{ path: string }>(
    `SELECT mlm.path
     FROM marketplace_listing_media mlm
     INNER JOIN marketplace_listings ml ON ml.id = mlm.listing_id
     WHERE ml.user_id = $1`,
    [userId],
  )
  for (const row of listingMedia.rows) {
    paths.add(row.path)
  }

  const feedbackShots = await pool.query<{ screenshot_path: string | null }>(
    `SELECT screenshot_path FROM feedback_tickets WHERE user_id = $1`,
    [userId],
  )
  for (const row of feedbackShots.rows) {
    if (row.screenshot_path) {
      paths.add(row.screenshot_path)
    }
  }

  return [...paths]
}

/**
 * Hard-delete a non-admin account.
 * DB rows cascade via FK ON DELETE CASCADE; upload files are removed from disk.
 */
export async function deleteAdminUser(options: {
  actorUserId: number
  targetUserId: number
}): Promise<void> {
  await assertAdmin(options.actorUserId)

  if (options.targetUserId === options.actorUserId) {
    throw new AppError(400, 'You cannot delete your own account here', 'VALIDATION_ERROR')
  }

  const result = await pool.query<{ email: string }>(
    'SELECT email FROM users WHERE id = $1',
    [options.targetUserId],
  )
  const row = result.rows[0]
  if (!row) {
    throw new AppError(404, 'User not found', 'NOT_FOUND')
  }
  if (isAdminEmail(row.email)) {
    throw new AppError(400, 'Admin accounts cannot be deleted here', 'VALIDATION_ERROR')
  }

  const uploadPaths = await collectUserUploadPaths(options.targetUserId)

  await pool.query('DELETE FROM users WHERE id = $1', [options.targetUserId])

  await Promise.all(uploadPaths.map((path) => deleteUploadIfExists(path)))
}
