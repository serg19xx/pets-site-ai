import { pool } from '../db/pool.js'
import { isAdminEmail, isAdminUser } from '../lib/admin.js'
import { AppError } from '../lib/errors.js'
import {
  mapPublicMember,
  resolvePublicDisplayName,
  type PublicMember,
  type PublicMemberRow,
} from '../lib/map-public-member.js'
import { notifyUser } from './notifications.js'

export type FriendRelationStatus = 'none' | 'outgoing' | 'incoming' | 'friends' | 'self'

export interface FriendMember extends PublicMember {
  since: string | null
}

export interface FriendRequestMember extends PublicMember {
  requestedAt: string
}

interface FriendshipRow {
  id: string
  user_a_id: string
  user_b_id: string
  requested_by_user_id: string
  status: 'pending' | 'accepted'
  created_at: Date
  accepted_at: Date | null
}

type MemberJoinRow = PublicMemberRow & {
  email: string
  requested_at: Date
  accepted_at: Date | null
}

function orderedPair(userId: number, otherUserId: number): [number, number] {
  return userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId]
}

function parseUserId(raw: number): number {
  if (!Number.isInteger(raw) || raw < 1) {
    throw new AppError(400, 'Invalid user id', 'VALIDATION_ERROR')
  }
  return raw
}

async function loadPublicMember(userId: number): Promise<PublicMemberRow & { email: string }> {
  const result = await pool.query<PublicMemberRow & { email: string }>(
    `SELECT id, full_name, nickname, avatar_path, show_full_name, show_nickname, email
     FROM users
     WHERE id = $1`,
    [userId],
  )
  const row = result.rows[0]
  if (!row || isAdminEmail(row.email)) {
    throw new AppError(404, 'Member not found', 'NOT_FOUND')
  }
  return row
}

async function getPairRow(
  userId: number,
  otherUserId: number,
): Promise<FriendshipRow | null> {
  const [userA, userB] = orderedPair(userId, otherUserId)
  const result = await pool.query<FriendshipRow>(
    `SELECT id, user_a_id, user_b_id, requested_by_user_id, status, created_at, accepted_at
     FROM user_friendships
     WHERE user_a_id = $1 AND user_b_id = $2`,
    [userA, userB],
  )
  return result.rows[0] ?? null
}

function statusFromRow(
  viewerUserId: number,
  row: FriendshipRow | null,
): Exclude<FriendRelationStatus, 'self'> {
  if (!row) {
    return 'none'
  }
  if (row.status === 'accepted') {
    return 'friends'
  }
  return Number(row.requested_by_user_id) === viewerUserId ? 'outgoing' : 'incoming'
}

async function notifyFriendRequest(fromUserId: number, toUserId: number): Promise<void> {
  const from = await loadPublicMember(fromUserId)
  const who = resolvePublicDisplayName(from)
  try {
    await notifyUser({
      userId: toUserId,
      type: 'friend_request',
      title: 'New friend request',
      body: `${who} wants to be friends on Pet Friends.`,
      linkPath: '/app/friends',
      meta: { fromUserId },
      channels: ['in_app', 'email'],
    })
  } catch (error) {
    console.error('Friend request notification failed:', error)
  }
}

async function notifyFriendAccepted(fromUserId: number, toUserId: number): Promise<void> {
  const from = await loadPublicMember(fromUserId)
  const who = resolvePublicDisplayName(from)
  try {
    await notifyUser({
      userId: toUserId,
      type: 'friend_accepted',
      title: 'Friend request accepted',
      body: `${who} accepted your friend request.`,
      linkPath: `/members/${fromUserId}`,
      meta: { fromUserId },
      channels: ['in_app', 'email'],
    })
  } catch (error) {
    console.error('Friend accepted notification failed:', error)
  }
}

async function acceptPending(
  viewerUserId: number,
  otherUserId: number,
  row: FriendshipRow,
): Promise<{ status: FriendRelationStatus }> {
  if (row.status === 'accepted') {
    return { status: 'friends' }
  }
  if (Number(row.requested_by_user_id) === viewerUserId) {
    throw new AppError(400, 'Friend request is already pending', 'ALREADY_PENDING')
  }

  const updated = await pool.query(
    `UPDATE user_friendships
     SET status = 'accepted', accepted_at = NOW()
     WHERE id = $1 AND status = 'pending'`,
    [row.id],
  )
  if (updated.rowCount !== 1) {
    throw new AppError(409, 'Friend request is no longer pending', 'CONFLICT')
  }

  await notifyFriendAccepted(viewerUserId, otherUserId)
  return { status: 'friends' }
}

export async function getFriendStatus(
  viewerUserId: number,
  otherUserId: number,
): Promise<{ status: FriendRelationStatus }> {
  const targetId = parseUserId(otherUserId)
  if (viewerUserId === targetId) {
    return { status: 'self' }
  }
  await loadPublicMember(targetId)
  const row = await getPairRow(viewerUserId, targetId)
  return { status: statusFromRow(viewerUserId, row) }
}

export async function requestFriendship(
  viewerUserId: number,
  otherUserId: number,
): Promise<{ status: FriendRelationStatus }> {
  const targetId = parseUserId(otherUserId)
  if (viewerUserId === targetId) {
    throw new AppError(400, 'You cannot add yourself as a friend', 'VALIDATION_ERROR')
  }
  if (await isAdminUser(viewerUserId)) {
    throw new AppError(403, 'Admin accounts cannot use member friendships', 'FORBIDDEN')
  }
  await loadPublicMember(targetId)

  const existing = await getPairRow(viewerUserId, targetId)
  if (existing) {
    if (existing.status === 'accepted') {
      throw new AppError(409, 'You are already friends', 'ALREADY_FRIENDS')
    }
    if (Number(existing.requested_by_user_id) === viewerUserId) {
      throw new AppError(409, 'Friend request is already pending', 'ALREADY_PENDING')
    }
    return acceptPending(viewerUserId, targetId, existing)
  }

  const [userA, userB] = orderedPair(viewerUserId, targetId)
  try {
    await pool.query(
      `INSERT INTO user_friendships (user_a_id, user_b_id, requested_by_user_id, status)
       VALUES ($1, $2, $3, 'pending')`,
      [userA, userB, viewerUserId],
    )
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (code === '23505') {
      const again = await getPairRow(viewerUserId, targetId)
      if (again?.status === 'accepted') {
        throw new AppError(409, 'You are already friends', 'ALREADY_FRIENDS')
      }
      if (again && Number(again.requested_by_user_id) !== viewerUserId) {
        return acceptPending(viewerUserId, targetId, again)
      }
      throw new AppError(409, 'Friend request is already pending', 'ALREADY_PENDING')
    }
    throw error
  }

  await notifyFriendRequest(viewerUserId, targetId)
  return { status: 'outgoing' }
}

export async function acceptFriendship(
  viewerUserId: number,
  otherUserId: number,
): Promise<{ status: FriendRelationStatus }> {
  const targetId = parseUserId(otherUserId)
  if (viewerUserId === targetId) {
    throw new AppError(400, 'Invalid user id', 'VALIDATION_ERROR')
  }
  const row = await getPairRow(viewerUserId, targetId)
  if (!row || row.status !== 'pending') {
    throw new AppError(404, 'Friend request not found', 'NOT_FOUND')
  }
  return acceptPending(viewerUserId, targetId, row)
}

export async function declineFriendship(
  viewerUserId: number,
  otherUserId: number,
): Promise<void> {
  const targetId = parseUserId(otherUserId)
  const row = await getPairRow(viewerUserId, targetId)
  if (!row || row.status !== 'pending') {
    throw new AppError(404, 'Friend request not found', 'NOT_FOUND')
  }
  if (Number(row.requested_by_user_id) === viewerUserId) {
    throw new AppError(400, 'Cancel your own request instead', 'VALIDATION_ERROR')
  }
  await pool.query(`DELETE FROM user_friendships WHERE id = $1 AND status = 'pending'`, [row.id])
}

export async function removeFriendship(
  viewerUserId: number,
  otherUserId: number,
): Promise<void> {
  const targetId = parseUserId(otherUserId)
  const row = await getPairRow(viewerUserId, targetId)
  if (!row) {
    throw new AppError(404, 'Friendship not found', 'NOT_FOUND')
  }
  const canCancelOutgoing =
    row.status === 'pending' && Number(row.requested_by_user_id) === viewerUserId
  const canUnfriend = row.status === 'accepted'
  if (!canCancelOutgoing && !canUnfriend) {
    throw new AppError(400, 'Decline the incoming request instead', 'VALIDATION_ERROR')
  }
  await pool.query(`DELETE FROM user_friendships WHERE id = $1`, [row.id])
}

const MEMBER_SELECT = `
  u.id,
  u.full_name,
  u.nickname,
  u.avatar_path,
  u.show_full_name,
  u.show_nickname,
  u.email,
  f.created_at AS requested_at,
  f.accepted_at
`

function otherUserJoin(viewerParam: string): string {
  return `INNER JOIN users u ON u.id = CASE
    WHEN f.user_a_id = ${viewerParam} THEN f.user_b_id
    ELSE f.user_a_id
  END`
}

export async function listFriendships(viewerUserId: number): Promise<{
  friends: FriendMember[]
  incoming: FriendRequestMember[]
  outgoing: FriendRequestMember[]
}> {
  const friendsR = await pool.query<MemberJoinRow>(
    `SELECT ${MEMBER_SELECT}
     FROM user_friendships f
     ${otherUserJoin('$1')}
     WHERE (f.user_a_id = $1 OR f.user_b_id = $1)
       AND f.status = 'accepted'
     ORDER BY COALESCE(f.accepted_at, f.created_at) DESC, f.id DESC`,
    [viewerUserId],
  )

  const incomingR = await pool.query<MemberJoinRow>(
    `SELECT ${MEMBER_SELECT}
     FROM user_friendships f
     ${otherUserJoin('$1')}
     WHERE (f.user_a_id = $1 OR f.user_b_id = $1)
       AND f.status = 'pending'
       AND f.requested_by_user_id <> $1
     ORDER BY f.created_at DESC, f.id DESC`,
    [viewerUserId],
  )

  const outgoingR = await pool.query<MemberJoinRow>(
    `SELECT ${MEMBER_SELECT}
     FROM user_friendships f
     ${otherUserJoin('$1')}
     WHERE f.requested_by_user_id = $1
       AND f.status = 'pending'
     ORDER BY f.created_at DESC, f.id DESC`,
    [viewerUserId],
  )

  return {
    friends: friendsR.rows
      .filter((row) => !isAdminEmail(row.email))
      .map((row) => ({
        ...mapPublicMember(row),
        since: row.accepted_at?.toISOString() ?? row.requested_at.toISOString(),
      })),
    incoming: incomingR.rows
      .filter((row) => !isAdminEmail(row.email))
      .map((row) => ({
        ...mapPublicMember(row),
        requestedAt: row.requested_at.toISOString(),
      })),
    outgoing: outgoingR.rows
      .filter((row) => !isAdminEmail(row.email))
      .map((row) => ({
        ...mapPublicMember(row),
        requestedAt: row.requested_at.toISOString(),
      })),
  }
}
