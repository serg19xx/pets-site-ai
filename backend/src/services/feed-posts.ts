import { pool } from '../db/pool.js'
import { config } from '../config.js'
import { AppError } from '../lib/errors.js'
import {
  mapFeedPostRow,
  type FeedPost,
  type FeedPostRow,
  type PostMediaRow,
} from '../lib/map-feed-post.js'
import { deleteUploadIfExists } from '../lib/uploads.js'
import { normalizePostMediaMime, savePostMediaBuffer } from '../lib/save-post-media.js'

const POST_SELECT = `
  p.id,
  p.user_id,
  p.body,
  p.created_at,
  p.updated_at,
  u.full_name,
  u.nickname,
  u.avatar_path,
  u.show_full_name,
  u.show_nickname,
  (SELECT COUNT(*)::text FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
  (SELECT COUNT(*)::text FROM post_comments pc WHERE pc.post_id = p.id) AS comment_count
`

function optionalUserFlags(userId: number | undefined): string {
  if (userId === undefined) {
    return `,
      NULL::boolean AS liked,
      NULL::boolean AS saved`
  }
  return `,
      EXISTS (
        SELECT 1 FROM post_likes pl
        WHERE pl.post_id = p.id AND pl.user_id = $USER_ID
      ) AS liked,
      EXISTS (
        SELECT 1 FROM post_saves ps
        WHERE ps.post_id = p.id AND ps.user_id = $USER_ID
      ) AS saved`
    .replace(/\$USER_ID/g, String(userId))
}

async function loadMediaForPosts(postIds: number[]): Promise<Map<number, PostMediaRow[]>> {
  const map = new Map<number, PostMediaRow[]>()
  if (postIds.length === 0) {
    return map
  }
  const r = await pool.query<PostMediaRow>(
    `SELECT id, post_id, kind, path, sort_order
     FROM post_media
     WHERE post_id = ANY($1::bigint[])
     ORDER BY sort_order ASC, id ASC`,
    [postIds],
  )
  for (const row of r.rows) {
    const pid = Number(row.post_id)
    const list = map.get(pid) ?? []
    list.push(row)
    map.set(pid, list)
  }
  return map
}

function mapRows(rows: FeedPostRow[], mediaMap: Map<number, PostMediaRow[]>): FeedPost[] {
  return rows.map((row) => mapFeedPostRow(row, mediaMap.get(Number(row.id)) ?? []))
}

export async function listFeedPosts(
  limit: number,
  offset: number,
  viewerUserId?: number,
): Promise<{ posts: FeedPost[]; total: number }> {
  const countR = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM posts')
  const total = Number(countR.rows[0]?.count ?? 0)

  const sql = `
    SELECT ${POST_SELECT}${optionalUserFlags(viewerUserId)}
    FROM posts p
    INNER JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC
    LIMIT $1 OFFSET $2
  `
  const r = await pool.query<FeedPostRow>(sql, [limit, offset])
  const postIds = r.rows.map((row) => Number(row.id))
  const mediaMap = await loadMediaForPosts(postIds)
  return { posts: mapRows(r.rows, mediaMap), total }
}

export async function listMyFeedPosts(
  userId: number,
  limit: number,
  offset: number,
): Promise<{ posts: FeedPost[]; total: number }> {
  const countR = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM posts WHERE user_id = $1',
    [userId],
  )
  const total = Number(countR.rows[0]?.count ?? 0)

  const sql = `
    SELECT ${POST_SELECT}${optionalUserFlags(userId)}
    FROM posts p
    INNER JOIN users u ON u.id = p.user_id
    WHERE p.user_id = $1
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3
  `
  const r = await pool.query<FeedPostRow>(sql, [userId, limit, offset])
  const postIds = r.rows.map((row) => Number(row.id))
  const mediaMap = await loadMediaForPosts(postIds)
  return { posts: mapRows(r.rows, mediaMap), total }
}

export async function listSavedFeedPosts(
  userId: number,
  limit: number,
  offset: number,
): Promise<{ posts: FeedPost[]; total: number }> {
  const countR = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM post_saves WHERE user_id = $1',
    [userId],
  )
  const total = Number(countR.rows[0]?.count ?? 0)

  const sql = `
    SELECT ${POST_SELECT}${optionalUserFlags(userId)}
    FROM post_saves ps
    INNER JOIN posts p ON p.id = ps.post_id
    INNER JOIN users u ON u.id = p.user_id
    WHERE ps.user_id = $1
    ORDER BY ps.created_at DESC
    LIMIT $2 OFFSET $3
  `
  const r = await pool.query<FeedPostRow>(sql, [userId, limit, offset])
  const postIds = r.rows.map((row) => Number(row.id))
  const mediaMap = await loadMediaForPosts(postIds)
  return { posts: mapRows(r.rows, mediaMap), total }
}

async function assertPostOwner(userId: number, postId: number): Promise<void> {
  const r = await pool.query<{ user_id: string }>(
    'SELECT user_id FROM posts WHERE id = $1',
    [postId],
  )
  if (!r.rows[0]) {
    throw new AppError(404, 'Post not found', 'NOT_FOUND')
  }
  if (Number(r.rows[0].user_id) !== userId) {
    throw new AppError(403, 'You can only manage your own posts', 'FORBIDDEN')
  }
}

export async function updateFeedPostBody(
  userId: number,
  postId: number,
  body: string,
): Promise<FeedPost> {
  await assertPostOwner(userId, postId)
  const trimmed = body.trim()
  if (!trimmed) {
    const mediaR = await pool.query(
      'SELECT 1 FROM post_media WHERE post_id = $1 LIMIT 1',
      [postId],
    )
    if (mediaR.rows.length === 0) {
      throw new AppError(400, 'Post text cannot be empty', 'VALIDATION_ERROR')
    }
    await pool.query(`UPDATE posts SET body = NULL, updated_at = NOW() WHERE id = $1`, [postId])
    return getFeedPostById(postId, userId)
  }
  if (trimmed.length > 5000) {
    throw new AppError(400, 'Post text is too long (max 5000 characters)', 'VALIDATION_ERROR')
  }

  await pool.query(
    `UPDATE posts SET body = $1, updated_at = NOW() WHERE id = $2`,
    [trimmed, postId],
  )
  return getFeedPostById(postId, userId)
}

export async function deleteFeedPost(userId: number, postId: number): Promise<void> {
  await assertPostOwner(userId, postId)

  const mediaR = await pool.query<{ path: string }>(
    'SELECT path FROM post_media WHERE post_id = $1',
    [postId],
  )
  await pool.query('DELETE FROM posts WHERE id = $1', [postId])
  for (const row of mediaR.rows) {
    await deleteUploadIfExists(row.path)
  }
}

export async function getFeedPostById(
  postId: number,
  viewerUserId?: number,
): Promise<FeedPost> {
  const sql = `
    SELECT ${POST_SELECT}${optionalUserFlags(viewerUserId)}
    FROM posts p
    INNER JOIN users u ON u.id = p.user_id
    WHERE p.id = $1
  `
  const r = await pool.query<FeedPostRow>(sql, [postId])
  const row = r.rows[0]
  if (!row) {
    throw new AppError(404, 'Post not found', 'NOT_FOUND')
  }
  const mediaMap = await loadMediaForPosts([postId])
  return mapFeedPostRow(row, mediaMap.get(postId) ?? [])
}

export interface PendingPostMedia {
  buffer: Buffer
  mimetype: string
  filename?: string | null
}

export interface CreatePostInput {
  body: string | null
  files: PendingPostMedia[]
}

export async function createFeedPost(
  userId: number,
  input: CreatePostInput,
): Promise<FeedPost> {
  const body = input.body?.trim() ?? ''
  const files = input.files

  if (!body && files.length === 0) {
    throw new AppError(400, 'Post must include text or at least one file', 'VALIDATION_ERROR')
  }
  if (body.length > 5000) {
    throw new AppError(400, 'Post text is too long (max 5000 characters)', 'VALIDATION_ERROR')
  }
  if (files.length > config.feedMaxMediaPerPost) {
    throw new AppError(
      400,
      `At most ${config.feedMaxMediaPerPost} files per post`,
      'VALIDATION_ERROR',
    )
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const postR = await client.query<{ id: string }>(
      `INSERT INTO posts (user_id, body)
       VALUES ($1, $2)
       RETURNING id`,
      [userId, body || null],
    )
    const postId = Number(postR.rows[0]?.id)
    if (!postId) {
      throw new AppError(500, 'Could not create post', 'INTERNAL_ERROR')
    }

    let sortOrder = 0
    for (const file of files) {
      const mime = normalizePostMediaMime(file.mimetype, file.filename)
      const { kind, path } = await savePostMediaBuffer(postId, file.buffer, mime)
      await client.query(
        `INSERT INTO post_media (post_id, kind, path, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [postId, kind, path, sortOrder],
      )
      sortOrder += 1
    }

    await client.query('COMMIT')
    return getFeedPostById(postId, userId)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
