import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { buildPublicUploadUrl, saveImageBuffer } from '../lib/uploads.js'
import { isAdminEmail, assertAdmin } from '../lib/admin.js'

export const FEEDBACK_TICKET_TYPES = ['bug', 'improvement'] as const
export type FeedbackTicketType = (typeof FEEDBACK_TICKET_TYPES)[number]

export const FEEDBACK_TICKET_STATUSES = ['open', 'closed'] as const
export type FeedbackTicketStatus = (typeof FEEDBACK_TICKET_STATUSES)[number]

export const FEEDBACK_DEVICE_CLASSES = [
  'desktop',
  'mobile',
  'tablet',
  'unknown',
] as const
export type FeedbackDeviceClass = (typeof FEEDBACK_DEVICE_CLASSES)[number]

export interface FeedbackAuthor {
  id: number
  displayName: string
  email: string
  isAdmin: boolean
}

export interface FeedbackTicketSummary {
  id: number
  type: FeedbackTicketType
  status: FeedbackTicketStatus
  message: string
  pagePath: string | null
  deviceClass: FeedbackDeviceClass
  osLabel: string | null
  browserLabel: string | null
  hasScreenshot: boolean
  hasConsoleText: boolean
  createdAt: string
  updatedAt: string
  author: FeedbackAuthor
  messageCount: number
}

export interface FeedbackMessage {
  id: number
  body: string
  createdAt: string
  author: FeedbackAuthor
}

export interface FeedbackTicketDetail extends FeedbackTicketSummary {
  userAgent: string | null
  consoleText: string | null
  screenshotUrl: string | null
  messages: FeedbackMessage[]
}

type TicketRow = {
  id: string
  user_id: string
  type: FeedbackTicketType
  status: FeedbackTicketStatus
  message: string
  page_path: string | null
  user_agent: string | null
  device_class: FeedbackDeviceClass
  os_label: string | null
  browser_label: string | null
  console_text: string | null
  screenshot_path: string | null
  created_at: Date
  updated_at: Date
  author_full_name: string
  author_nickname: string
  author_email: string
  message_count: string
}

type MessageRow = {
  id: string
  body: string
  created_at: Date
  author_user_id: string
  author_full_name: string
  author_nickname: string
  author_email: string
}

function displayName(fullName: string, nickname: string): string {
  const nick = nickname.trim()
  return nick || fullName.trim()
}

export async function assertBetaTester(userId: number): Promise<{
  email: string
  isAdmin: boolean
}> {
  const result = await pool.query<{
    email: string
    is_beta_tester: boolean
  }>('SELECT email, is_beta_tester FROM users WHERE id = $1', [userId])
  const row = result.rows[0]
  if (!row) {
    throw new AppError(404, 'User not found', 'NOT_FOUND')
  }
  const admin = isAdminEmail(row.email)
  if (!row.is_beta_tester && !admin) {
    throw new AppError(
      403,
      'Only founding beta testers can use feedback. Join via /invite first.',
      'BETA_REQUIRED',
    )
  }
  return { email: row.email, isAdmin: admin }
}

export async function assertFeedbackAdmin(userId: number): Promise<void> {
  await assertAdmin(userId)
}

export async function getFeedbackAccess(userId: number): Promise<{
  isBetaTester: boolean
  isFeedbackAdmin: boolean
}> {
  const result = await pool.query<{
    email: string
    is_beta_tester: boolean
  }>('SELECT email, is_beta_tester FROM users WHERE id = $1', [userId])
  const row = result.rows[0]
  if (!row) {
    throw new AppError(404, 'User not found', 'NOT_FOUND')
  }
  const isFeedbackAdmin = isAdminEmail(row.email)
  return {
    isBetaTester: Boolean(row.is_beta_tester),
    isFeedbackAdmin,
  }
}

function mapAuthor(
  id: number,
  fullName: string,
  nickname: string,
  email: string,
): FeedbackAuthor {
  return {
    id,
    displayName: displayName(fullName, nickname),
    email,
    isAdmin: isAdminEmail(email),
  }
}

function mapTicketSummary(row: TicketRow): FeedbackTicketSummary {
  return {
    id: Number(row.id),
    type: row.type,
    status: row.status,
    message: row.message,
    pagePath: row.page_path,
    deviceClass: row.device_class,
    osLabel: row.os_label,
    browserLabel: row.browser_label,
    hasScreenshot: Boolean(row.screenshot_path),
    hasConsoleText: Boolean(row.console_text?.trim()),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    author: mapAuthor(
      Number(row.user_id),
      row.author_full_name,
      row.author_nickname,
      row.author_email,
    ),
    messageCount: Number(row.message_count),
  }
}

const TICKET_SELECT = `
  t.id, t.user_id, t.type, t.status, t.message, t.page_path, t.user_agent,
  t.device_class, t.os_label, t.browser_label, t.console_text, t.screenshot_path,
  t.created_at, t.updated_at,
  u.full_name AS author_full_name, u.nickname AS author_nickname, u.email AS author_email,
  (SELECT COUNT(*)::text FROM feedback_messages m WHERE m.ticket_id = t.id) AS message_count
`

export interface CreateFeedbackInput {
  userId: number
  type: FeedbackTicketType
  message: string
  pagePath?: string | null
  userAgent?: string | null
  deviceClass?: FeedbackDeviceClass
  osLabel?: string | null
  browserLabel?: string | null
  consoleText?: string | null
  screenshot?: { buffer: Buffer; mimetype: string; filename?: string } | null
}

export async function createFeedbackTicket(
  input: CreateFeedbackInput,
): Promise<FeedbackTicketDetail> {
  await assertBetaTester(input.userId)

  const message = input.message.trim()
  if (message.length < 3) {
    throw new AppError(400, 'Message is too short', 'VALIDATION_ERROR')
  }
  if (message.length > 8000) {
    throw new AppError(400, 'Message is too long', 'VALIDATION_ERROR')
  }

  if (input.type === 'improvement' && input.screenshot) {
    throw new AppError(
      400,
      'Screenshots are only for bug reports',
      'VALIDATION_ERROR',
    )
  }

  let screenshotPath: string | null = null
  if (input.type === 'bug' && input.screenshot) {
    screenshotPath = await saveImageBuffer(
      'feedback',
      input.screenshot.buffer,
      input.screenshot.mimetype,
      input.userId,
    )
  }

  const deviceClass =
    input.deviceClass &&
    (FEEDBACK_DEVICE_CLASSES as readonly string[]).includes(input.deviceClass)
      ? input.deviceClass
      : 'unknown'

  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO feedback_tickets (
       user_id, type, message, page_path, user_agent, device_class,
       os_label, browser_label, console_text, screenshot_path
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      input.userId,
      input.type,
      message,
      input.pagePath?.trim() || null,
      input.userAgent?.trim() || null,
      deviceClass,
      input.osLabel?.trim() || null,
      input.browserLabel?.trim() || null,
      input.type === 'bug' ? input.consoleText?.trim() || null : null,
      screenshotPath,
    ],
  )

  const id = Number(inserted.rows[0]?.id)
  if (!id) {
    throw new AppError(500, 'Failed to create feedback', 'CREATE_FAILED')
  }

  return getFeedbackTicket(input.userId, id)
}

export async function listFeedbackTickets(
  userId: number,
  options: { scope: 'mine' | 'all'; limit: number; offset: number },
): Promise<{ tickets: FeedbackTicketSummary[]; total: number }> {
  const { isAdmin } = await assertBetaTester(userId)
  if (options.scope === 'all' && !isAdmin) {
    throw new AppError(403, 'Admin access required', 'FORBIDDEN')
  }

  const params: unknown[] = []
  let where = ''
  if (options.scope === 'mine') {
    params.push(userId)
    where = 'WHERE t.user_id = $1'
  }

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM feedback_tickets t ${where}`,
    params,
  )
  const total = Number(countResult.rows[0]?.count ?? 0)

  params.push(options.limit)
  const limitIdx = params.length
  params.push(options.offset)
  const offsetIdx = params.length

  const list = await pool.query<TicketRow>(
    `SELECT ${TICKET_SELECT}
     FROM feedback_tickets t
     INNER JOIN users u ON u.id = t.user_id
     ${where}
     ORDER BY t.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
  )

  return {
    tickets: list.rows.map(mapTicketSummary),
    total,
  }
}

export async function getFeedbackTicket(
  userId: number,
  ticketId: number,
): Promise<FeedbackTicketDetail> {
  const { isAdmin } = await assertBetaTester(userId)

  const result = await pool.query<TicketRow>(
    `SELECT ${TICKET_SELECT}
     FROM feedback_tickets t
     INNER JOIN users u ON u.id = t.user_id
     WHERE t.id = $1`,
    [ticketId],
  )
  const row = result.rows[0]
  if (!row) {
    throw new AppError(404, 'Feedback not found', 'NOT_FOUND')
  }
  if (!isAdmin && Number(row.user_id) !== userId) {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN')
  }

  const messagesResult = await pool.query<MessageRow>(
    `SELECT m.id, m.body, m.created_at, m.author_user_id,
            u.full_name AS author_full_name, u.nickname AS author_nickname, u.email AS author_email
     FROM feedback_messages m
     INNER JOIN users u ON u.id = m.author_user_id
     WHERE m.ticket_id = $1
     ORDER BY m.created_at ASC`,
    [ticketId],
  )

  const summary = mapTicketSummary(row)
  return {
    ...summary,
    userAgent: row.user_agent,
    consoleText: row.console_text,
    screenshotUrl: row.screenshot_path
      ? buildPublicUploadUrl(row.screenshot_path)
      : null,
    messages: messagesResult.rows.map((m) => ({
      id: Number(m.id),
      body: m.body,
      createdAt: m.created_at.toISOString(),
      author: mapAuthor(
        Number(m.author_user_id),
        m.author_full_name,
        m.author_nickname,
        m.author_email,
      ),
    })),
  }
}

export async function replyFeedbackTicket(input: {
  userId: number
  ticketId: number
  body: string
}): Promise<FeedbackTicketDetail> {
  const { isAdmin } = await assertBetaTester(input.userId)
  const body = input.body.trim()
  if (body.length < 1) {
    throw new AppError(400, 'Reply cannot be empty', 'VALIDATION_ERROR')
  }
  if (body.length > 8000) {
    throw new AppError(400, 'Reply is too long', 'VALIDATION_ERROR')
  }

  const ticket = await pool.query<{ user_id: string; status: FeedbackTicketStatus }>(
    'SELECT user_id, status FROM feedback_tickets WHERE id = $1',
    [input.ticketId],
  )
  const row = ticket.rows[0]
  if (!row) {
    throw new AppError(404, 'Feedback not found', 'NOT_FOUND')
  }
  if (!isAdmin && Number(row.user_id) !== input.userId) {
    throw new AppError(403, 'Forbidden', 'FORBIDDEN')
  }
  if (row.status !== 'open') {
    throw new AppError(
      400,
      'Replies are only allowed while the ticket is open',
      'TICKET_CLOSED',
    )
  }

  await pool.query(
    `INSERT INTO feedback_messages (ticket_id, author_user_id, body)
     VALUES ($1, $2, $3)`,
    [input.ticketId, input.userId, body],
  )

  await pool.query(
    `UPDATE feedback_tickets SET updated_at = NOW() WHERE id = $1`,
    [input.ticketId],
  )

  return getFeedbackTicket(input.userId, input.ticketId)
}

export async function updateFeedbackTicketStatus(input: {
  userId: number
  ticketId: number
  status: FeedbackTicketStatus
}): Promise<FeedbackTicketDetail> {
  await assertFeedbackAdmin(input.userId)
  if (!(FEEDBACK_TICKET_STATUSES as readonly string[]).includes(input.status)) {
    throw new AppError(400, 'Invalid status', 'VALIDATION_ERROR')
  }

  const updated = await pool.query(
    `UPDATE feedback_tickets
     SET status = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [input.ticketId, input.status],
  )
  if (!updated.rowCount) {
    throw new AppError(404, 'Feedback not found', 'NOT_FOUND')
  }

  return getFeedbackTicket(input.userId, input.ticketId)
}
