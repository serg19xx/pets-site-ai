import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { mapFeedCommentRow, type FeedComment, type FeedCommentRow } from '../lib/map-feed-post.js'

export interface PostEngagementStatus {
  liked: boolean
  likeCount: number
  saved: boolean
}

async function assertPostExists(postId: number): Promise<void> {
  const r = await pool.query('SELECT id FROM posts WHERE id = $1', [postId])
  if (!r.rows[0]) {
    throw new AppError(404, 'Post not found', 'NOT_FOUND')
  }
}

export async function getPostEngagement(
  postId: number,
  userId?: number,
): Promise<PostEngagementStatus> {
  await assertPostExists(postId)

  const countR = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM post_likes WHERE post_id = $1',
    [postId],
  )
  const likeCount = Number(countR.rows[0]?.count ?? 0)

  if (userId === undefined) {
    return { liked: false, likeCount, saved: false }
  }

  const likedR = await pool.query(
    'SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = $2',
    [userId, postId],
  )
  const savedR = await pool.query(
    'SELECT 1 FROM post_saves WHERE user_id = $1 AND post_id = $2',
    [userId, postId],
  )

  return {
    liked: likedR.rows.length > 0,
    likeCount,
    saved: savedR.rows.length > 0,
  }
}

export async function togglePostLike(
  postId: number,
  userId: number,
): Promise<PostEngagementStatus> {
  await assertPostExists(postId)

  const existing = await pool.query(
    'SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = $2',
    [userId, postId],
  )

  if (existing.rows.length > 0) {
    await pool.query('DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2', [
      userId,
      postId,
    ])
  } else {
    await pool.query('INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)', [
      userId,
      postId,
    ])
  }

  return getPostEngagement(postId, userId)
}

export async function togglePostSave(
  postId: number,
  userId: number,
): Promise<{ saved: boolean }> {
  await assertPostExists(postId)

  const existing = await pool.query(
    'SELECT 1 FROM post_saves WHERE user_id = $1 AND post_id = $2',
    [userId, postId],
  )

  if (existing.rows.length > 0) {
    await pool.query('DELETE FROM post_saves WHERE user_id = $1 AND post_id = $2', [
      userId,
      postId,
    ])
    return { saved: false }
  }

  await pool.query('INSERT INTO post_saves (user_id, post_id) VALUES ($1, $2)', [
    userId,
    postId,
  ])
  return { saved: true }
}

export async function listPostComments(postId: number): Promise<FeedComment[]> {
  await assertPostExists(postId)

  const r = await pool.query<FeedCommentRow>(
    `SELECT
      c.id,
      c.post_id,
      c.user_id,
      c.body,
      c.created_at,
      u.full_name,
      u.nickname,
      u.avatar_path,
      u.show_full_name,
      u.show_nickname
    FROM post_comments c
    INNER JOIN users u ON u.id = c.user_id
    WHERE c.post_id = $1
    ORDER BY c.created_at ASC`,
    [postId],
  )

  return r.rows.map(mapFeedCommentRow)
}

export async function deletePostComment(
  postId: number,
  commentId: number,
  userId: number,
): Promise<void> {
  await assertPostExists(postId)

  const r = await pool.query<{ comment_user_id: string; post_user_id: string }>(
    `SELECT c.user_id AS comment_user_id, p.user_id AS post_user_id
     FROM post_comments c
     INNER JOIN posts p ON p.id = c.post_id
     WHERE c.id = $1 AND c.post_id = $2`,
    [commentId, postId],
  )
  const row = r.rows[0]
  if (!row) {
    throw new AppError(404, 'Comment not found', 'NOT_FOUND')
  }

  const isCommentAuthor = Number(row.comment_user_id) === userId
  const isPostAuthor = Number(row.post_user_id) === userId
  if (!isCommentAuthor && !isPostAuthor) {
    throw new AppError(403, 'You cannot delete this comment', 'FORBIDDEN')
  }

  await pool.query('DELETE FROM post_comments WHERE id = $1', [commentId])
}

export async function createPostComment(
  postId: number,
  userId: number,
  body: string,
): Promise<FeedComment> {
  await assertPostExists(postId)

  const trimmed = body.trim()
  if (!trimmed) {
    throw new AppError(400, 'Comment cannot be empty', 'VALIDATION_ERROR')
  }
  if (trimmed.length > 2000) {
    throw new AppError(400, 'Comment is too long (max 2000 characters)', 'VALIDATION_ERROR')
  }

  const r = await pool.query<FeedCommentRow>(
    `WITH ins AS (
       INSERT INTO post_comments (post_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, user_id, body, created_at
     )
     SELECT
       ins.id,
       ins.post_id,
       ins.user_id,
       ins.body,
       ins.created_at,
       u.full_name,
       u.nickname,
       u.avatar_path,
       u.show_full_name,
       u.show_nickname
     FROM ins
     INNER JOIN users u ON u.id = ins.user_id`,
    [postId, userId, trimmed],
  )

  const row = r.rows[0]
  if (!row) {
    throw new AppError(500, 'Could not create comment', 'INTERNAL_ERROR')
  }

  return mapFeedCommentRow(row)
}
