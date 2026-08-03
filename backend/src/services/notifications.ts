import { pool } from '../db/pool.js'
import { config } from '../config.js'
import { AppError } from '../lib/errors.js'
import { sendEmail } from './email.js'

export const NOTIFICATION_TYPES = [
  'feature_announce',
  'feedback_reply',
  'feedback_decision',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export type NotificationChannel = 'email' | 'sms'

export interface AppNotification {
  id: number
  type: NotificationType
  title: string
  body: string
  linkPath: string | null
  readAt: string | null
  createdAt: string
}

export interface NotifyUserInput {
  userId: number
  type: NotificationType
  title: string
  body: string
  linkPath?: string | null
  meta?: Record<string, unknown>
  /** Default: in-app + email. SMS adapter reserved for later. */
  channels?: Array<'in_app' | NotificationChannel>
}

function absoluteLink(linkPath: string | null | undefined): string | null {
  if (!linkPath?.trim()) {
    return null
  }
  const path = linkPath.startsWith('/') ? linkPath : `/${linkPath}`
  return `${config.frontendUrl}${path}`
}

async function recordDelivery(input: {
  notificationId: number
  channel: NotificationChannel
  status: 'sent' | 'failed' | 'skipped'
  error?: string | null
}): Promise<void> {
  await pool.query(
    `INSERT INTO notification_deliveries (notification_id, channel, status, error, sent_at)
     VALUES ($1, $2, $3, $4, CASE WHEN $3 = 'sent' THEN NOW() ELSE NULL END)
     ON CONFLICT (notification_id, channel) DO UPDATE
       SET status = EXCLUDED.status,
           error = EXCLUDED.error,
           sent_at = EXCLUDED.sent_at`,
    [input.notificationId, input.channel, input.status, input.error ?? null],
  )
}

async function deliverEmail(input: {
  notificationId: number
  email: string
  title: string
  body: string
  linkPath?: string | null
}): Promise<void> {
  const url = absoluteLink(input.linkPath)
  const text = url
    ? `${input.body}\n\nOpen: ${url}\n`
    : `${input.body}\n`

  try {
    await sendEmail({
      to: input.email,
      subject: input.title,
      text,
    })
    await recordDelivery({
      notificationId: input.notificationId,
      channel: 'email',
      status: 'sent',
    })
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Email send failed'
    console.error('Notification email failed:', message)
    await recordDelivery({
      notificationId: input.notificationId,
      channel: 'email',
      status: 'failed',
      error: message.slice(0, 500),
    })
  }
}

/**
 * Unified notification entry point: always creates in-app row, then optional channel adapters.
 * Email uses existing Resend/SMTP/console transport. SMS adapter can be added later.
 */
export async function notifyUser(input: NotifyUserInput): Promise<AppNotification> {
  const channels = new Set(input.channels ?? ['in_app', 'email'])
  if (!channels.has('in_app')) {
    channels.add('in_app')
  }

  const title = input.title.trim()
  const body = input.body.trim()
  if (!title || !body) {
    throw new AppError(400, 'Notification title and body are required', 'VALIDATION_ERROR')
  }

  const inserted = await pool.query<{
    id: string
    type: NotificationType
    title: string
    body: string
    link_path: string | null
    read_at: Date | null
    created_at: Date
  }>(
    `INSERT INTO notifications (user_id, type, title, body, link_path, meta)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id, type, title, body, link_path, read_at, created_at`,
    [
      input.userId,
      input.type,
      title,
      body,
      input.linkPath?.trim() || null,
      JSON.stringify(input.meta ?? {}),
    ],
  )

  const row = inserted.rows[0]
  if (!row) {
    throw new AppError(500, 'Failed to create notification', 'CREATE_FAILED')
  }

  const notification: AppNotification = {
    id: Number(row.id),
    type: row.type,
    title: row.title,
    body: row.body,
    linkPath: row.link_path,
    readAt: row.read_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  }

  if (channels.has('email')) {
    const user = await pool.query<{ email: string }>(
      'SELECT email FROM users WHERE id = $1',
      [input.userId],
    )
    const email = user.rows[0]?.email
    if (email) {
      await deliverEmail({
        notificationId: notification.id,
        email,
        title: notification.title,
        body: notification.body,
        linkPath: notification.linkPath,
      })
    } else {
      await recordDelivery({
        notificationId: notification.id,
        channel: 'email',
        status: 'skipped',
        error: 'User email missing',
      })
    }
  }

  if (channels.has('sms')) {
    await recordDelivery({
      notificationId: notification.id,
      channel: 'sms',
      status: 'skipped',
      error: 'SMS adapter not configured yet',
    })
  }

  return notification
}

export async function listNotifications(input: {
  userId: number
  limit: number
  offset: number
  unreadOnly?: boolean
}): Promise<{ notifications: AppNotification[]; total: number; unreadCount: number }> {
  const unreadCountResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM notifications
     WHERE user_id = $1 AND read_at IS NULL`,
    [input.userId],
  )
  const unreadCount = Number(unreadCountResult.rows[0]?.count ?? 0)

  const where = input.unreadOnly
    ? 'WHERE user_id = $1 AND read_at IS NULL'
    : 'WHERE user_id = $1'

  const totalResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM notifications ${where}`,
    [input.userId],
  )
  const total = Number(totalResult.rows[0]?.count ?? 0)

  const list = await pool.query<{
    id: string
    type: NotificationType
    title: string
    body: string
    link_path: string | null
    read_at: Date | null
    created_at: Date
  }>(
    `SELECT id, type, title, body, link_path, read_at, created_at
     FROM notifications
     ${where}
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [input.userId, input.limit, input.offset],
  )

  return {
    notifications: list.rows.map((row) => ({
      id: Number(row.id),
      type: row.type,
      title: row.title,
      body: row.body,
      linkPath: row.link_path,
      readAt: row.read_at?.toISOString() ?? null,
      createdAt: row.created_at.toISOString(),
    })),
    total,
    unreadCount,
  }
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM notifications
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId],
  )
  return Number(result.rows[0]?.count ?? 0)
}

export async function markNotificationRead(input: {
  userId: number
  notificationId: number
}): Promise<AppNotification> {
  const result = await pool.query<{
    id: string
    type: NotificationType
    title: string
    body: string
    link_path: string | null
    read_at: Date | null
    created_at: Date
  }>(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, NOW())
     WHERE id = $1 AND user_id = $2
     RETURNING id, type, title, body, link_path, read_at, created_at`,
    [input.notificationId, input.userId],
  )
  const row = result.rows[0]
  if (!row) {
    throw new AppError(404, 'Notification not found', 'NOT_FOUND')
  }
  return {
    id: Number(row.id),
    type: row.type,
    title: row.title,
    body: row.body,
    linkPath: row.link_path,
    readAt: row.read_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  }
}

export async function markAllNotificationsRead(userId: number): Promise<{ updated: number }> {
  const result = await pool.query(
    `UPDATE notifications
     SET read_at = NOW()
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId],
  )
  return { updated: result.rowCount ?? 0 }
}
