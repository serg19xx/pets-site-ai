import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { assertAdmin } from '../lib/admin.js'
import { notifyUser } from './notifications.js'

export interface BetaAnnouncement {
  id: number
  title: string
  body: string
  linkPath: string | null
  createdAt: string
  recipientCount: number
}

export async function createBetaAnnouncement(input: {
  adminUserId: number
  title: string
  body: string
  linkPath?: string | null
}): Promise<BetaAnnouncement> {
  await assertAdmin(input.adminUserId)

  const title = input.title.trim()
  const body = input.body.trim()
  if (title.length < 3 || title.length > 200) {
    throw new AppError(400, 'Title must be 3–200 characters', 'VALIDATION_ERROR')
  }
  if (body.length < 3 || body.length > 8000) {
    throw new AppError(400, 'Body must be 3–8000 characters', 'VALIDATION_ERROR')
  }

  const linkPath = input.linkPath?.trim() || null
  if (linkPath && linkPath.length > 500) {
    throw new AppError(400, 'Link path is too long', 'VALIDATION_ERROR')
  }

  const inserted = await pool.query<{
    id: string
    title: string
    body: string
    link_path: string | null
    created_at: Date
  }>(
    `INSERT INTO beta_announcements (author_user_id, title, body, link_path)
     VALUES ($1, $2, $3, $4)
     RETURNING id, title, body, link_path, created_at`,
    [input.adminUserId, title, body, linkPath],
  )
  const row = inserted.rows[0]
  if (!row) {
    throw new AppError(500, 'Failed to create announcement', 'CREATE_FAILED')
  }

  const testers = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE is_beta_tester = TRUE ORDER BY id ASC`,
  )

  let recipientCount = 0
  for (const tester of testers.rows) {
    await notifyUser({
      userId: Number(tester.id),
      type: 'feature_announce',
      title,
      body,
      linkPath,
      meta: { announcementId: Number(row.id) },
    })
    recipientCount += 1
  }

  return {
    id: Number(row.id),
    title: row.title,
    body: row.body,
    linkPath: row.link_path,
    createdAt: row.created_at.toISOString(),
    recipientCount,
  }
}

export async function listBetaAnnouncements(input: {
  adminUserId: number
  limit: number
  offset: number
}): Promise<{ announcements: Omit<BetaAnnouncement, 'recipientCount'>[]; total: number }> {
  await assertAdmin(input.adminUserId)

  const totalResult = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM beta_announcements',
  )
  const total = Number(totalResult.rows[0]?.count ?? 0)

  const list = await pool.query<{
    id: string
    title: string
    body: string
    link_path: string | null
    created_at: Date
  }>(
    `SELECT id, title, body, link_path, created_at
     FROM beta_announcements
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [input.limit, input.offset],
  )

  return {
    announcements: list.rows.map((row) => ({
      id: Number(row.id),
      title: row.title,
      body: row.body,
      linkPath: row.link_path,
      createdAt: row.created_at.toISOString(),
    })),
    total,
  }
}
