import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { mapPublicMember } from '../lib/map-public-member.js'
import { notifyInquiryMessage } from './marketplace-inquiry-notify.js'

interface InquiryRow {
  inquiry_id: string
  listing_id: string
  customer_user_id: string
  seller_user_id: string
  listing_title: string
  listing_status: string
  created_at: Date
  updated_at: Date
  seller_last_read_at: Date | null
  customer_last_read_at: Date | null
  customer_id: string
  customer_full_name: string
  customer_nickname: string
  customer_avatar_path: string | null
  customer_show_full_name: boolean
  customer_show_nickname: boolean
  seller_id: string
  seller_full_name: string
  seller_nickname: string
  seller_avatar_path: string | null
  seller_show_full_name: boolean
  seller_show_nickname: boolean
}

interface MessageRow {
  id: string
  inquiry_id: string
  sender_user_id: string
  body: string
  created_at: Date
  sender_id: string
  sender_full_name: string
  sender_nickname: string
  sender_avatar_path: string | null
  sender_show_full_name: boolean
  sender_show_nickname: boolean
}

interface LastMessageRow {
  inquiry_id: string
  body: string
  created_at: Date
  sender_user_id: string
}

export interface MarketplaceInquiryMessage {
  id: number
  senderUserId: number
  body: string
  createdAt: string
  sender: ReturnType<typeof mapPublicMember>
  isMine: boolean
}

export interface MarketplaceInquirySummary {
  id: number
  listingId: number
  listingTitle: string
  listingStatus: string
  createdAt: string
  updatedAt: string
  customer: ReturnType<typeof mapPublicMember>
  seller: ReturnType<typeof mapPublicMember>
  lastMessage: {
    body: string
    createdAt: string
    senderUserId: number
  } | null
  unreadCount: number
  role: 'customer' | 'seller'
}

export interface MarketplaceInquiryThread {
  inquiry: MarketplaceInquirySummary
  messages: MarketplaceInquiryMessage[]
}

const INQUIRY_SELECT = `
  i.id AS inquiry_id,
  i.listing_id,
  i.customer_user_id,
  l.user_id AS seller_user_id,
  l.title AS listing_title,
  l.status AS listing_status,
  i.created_at,
  i.updated_at,
  i.seller_last_read_at,
  i.customer_last_read_at,
  cu.id AS customer_id,
  cu.full_name AS customer_full_name,
  cu.nickname AS customer_nickname,
  cu.avatar_path AS customer_avatar_path,
  cu.show_full_name AS customer_show_full_name,
  cu.show_nickname AS customer_show_nickname,
  su.id AS seller_id,
  su.full_name AS seller_full_name,
  su.nickname AS seller_nickname,
  su.avatar_path AS seller_avatar_path,
  su.show_full_name AS seller_show_full_name,
  su.show_nickname AS seller_show_nickname
`

function mapMember(
  prefix: 'customer' | 'seller',
  row: InquiryRow,
): ReturnType<typeof mapPublicMember> {
  if (prefix === 'customer') {
    return mapPublicMember({
      id: row.customer_id,
      full_name: row.customer_full_name,
      nickname: row.customer_nickname,
      avatar_path: row.customer_avatar_path,
      show_full_name: row.customer_show_full_name,
      show_nickname: row.customer_show_nickname,
    })
  }
  return mapPublicMember({
    id: row.seller_id,
    full_name: row.seller_full_name,
    nickname: row.seller_nickname,
    avatar_path: row.seller_avatar_path,
    show_full_name: row.seller_show_full_name,
    show_nickname: row.seller_show_nickname,
  })
}

function roleForUser(row: InquiryRow, userId: number): 'customer' | 'seller' {
  return Number(row.customer_user_id) === userId ? 'customer' : 'seller'
}

function countUnread(
  row: InquiryRow,
  lastMessage: LastMessageRow | undefined,
  userId: number,
): number {
  if (!lastMessage || Number(lastMessage.sender_user_id) === userId) {
    return 0
  }
  const role = roleForUser(row, userId)
  const lastRead =
    role === 'seller' ? row.seller_last_read_at : row.customer_last_read_at
  if (!lastRead) {
    return 1
  }
  return new Date(lastMessage.created_at) > lastRead ? 1 : 0
}

async function loadLastMessages(inquiryIds: number[]): Promise<Map<number, LastMessageRow>> {
  if (inquiryIds.length === 0) {
    return new Map()
  }
  const r = await pool.query<LastMessageRow>(
    `SELECT DISTINCT ON (inquiry_id)
       inquiry_id, body, created_at, sender_user_id
     FROM marketplace_inquiry_messages
     WHERE inquiry_id = ANY($1::bigint[])
     ORDER BY inquiry_id, created_at DESC, id DESC`,
    [inquiryIds],
  )
  const map = new Map<number, LastMessageRow>()
  for (const row of r.rows) {
    map.set(Number(row.inquiry_id), row)
  }
  return map
}

function mapInquirySummary(
  row: InquiryRow,
  userId: number,
  lastMessage: LastMessageRow | undefined,
): MarketplaceInquirySummary {
  const role = roleForUser(row, userId)
  return {
    id: Number(row.inquiry_id),
    listingId: Number(row.listing_id),
    listingTitle: row.listing_title,
    listingStatus: row.listing_status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    customer: mapMember('customer', row),
    seller: mapMember('seller', row),
    lastMessage: lastMessage
      ? {
          body: lastMessage.body,
          createdAt: new Date(lastMessage.created_at).toISOString(),
          senderUserId: Number(lastMessage.sender_user_id),
        }
      : null,
    unreadCount: countUnread(row, lastMessage, userId),
    role,
  }
}

async function getInquiryRow(inquiryId: number): Promise<InquiryRow | null> {
  const r = await pool.query<InquiryRow>(
    `SELECT ${INQUIRY_SELECT}
     FROM marketplace_listing_inquiries i
     INNER JOIN marketplace_listings l ON l.id = i.listing_id
     INNER JOIN users cu ON cu.id = i.customer_user_id
     INNER JOIN users su ON su.id = l.user_id
     WHERE i.id = $1`,
    [inquiryId],
  )
  return r.rows[0] ?? null
}

async function assertInquiryParticipant(inquiryId: number, userId: number): Promise<InquiryRow> {
  const row = await getInquiryRow(inquiryId)
  if (!row) {
    throw new AppError(404, 'Conversation not found', 'NOT_FOUND')
  }
  const sellerId = Number(row.seller_user_id)
  const customerId = Number(row.customer_user_id)
  if (userId !== sellerId && userId !== customerId) {
    throw new AppError(403, 'You are not part of this conversation', 'FORBIDDEN')
  }
  return row
}

function inquiryRoleFilter(role: 'customer' | 'seller' | 'all'): string {
  if (role === 'customer') {
    return 'i.customer_user_id = $1'
  }
  if (role === 'seller') {
    return 'l.user_id = $1'
  }
  return '(i.customer_user_id = $1 OR l.user_id = $1)'
}

export async function listMarketplaceInquiries(
  userId: number,
  role: 'customer' | 'seller' | 'all',
  limit: number,
  offset: number,
): Promise<{ inquiries: MarketplaceInquirySummary[]; total: number }> {
  const where = inquiryRoleFilter(role)

  const countR = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c
     FROM marketplace_listing_inquiries i
     INNER JOIN marketplace_listings l ON l.id = i.listing_id
     WHERE ${where}`,
    [userId],
  )
  const total = Number(countR.rows[0]?.c ?? 0)

  const r = await pool.query<InquiryRow>(
    `SELECT ${INQUIRY_SELECT}
     FROM marketplace_listing_inquiries i
     INNER JOIN marketplace_listings l ON l.id = i.listing_id
     INNER JOIN users cu ON cu.id = i.customer_user_id
     INNER JOIN users su ON su.id = l.user_id
     WHERE ${where}
     ORDER BY i.updated_at DESC, i.id DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  )

  const inquiryIds = r.rows.map((row) => Number(row.inquiry_id))
  const lastMap = await loadLastMessages(inquiryIds)
  const inquiries = r.rows.map((row) =>
    mapInquirySummary(row, userId, lastMap.get(Number(row.inquiry_id))),
  )
  return { inquiries, total }
}

export async function getMarketplaceInquiryThread(
  inquiryId: number,
  userId: number,
): Promise<MarketplaceInquiryThread> {
  const row = await assertInquiryParticipant(inquiryId, userId)
  const lastMap = await loadLastMessages([inquiryId])
  const inquiry = mapInquirySummary(row, userId, lastMap.get(inquiryId))

  const msgR = await pool.query<MessageRow>(
    `SELECT m.id, m.inquiry_id, m.sender_user_id, m.body, m.created_at,
            u.id AS sender_id,
            u.full_name AS sender_full_name,
            u.nickname AS sender_nickname,
            u.avatar_path AS sender_avatar_path,
            u.show_full_name AS sender_show_full_name,
            u.show_nickname AS sender_show_nickname
     FROM marketplace_inquiry_messages m
     INNER JOIN users u ON u.id = m.sender_user_id
     WHERE m.inquiry_id = $1
     ORDER BY m.created_at ASC, m.id ASC`,
    [inquiryId],
  )

  const messages: MarketplaceInquiryMessage[] = msgR.rows.map((m) => ({
    id: Number(m.id),
    senderUserId: Number(m.sender_user_id),
    body: m.body,
    createdAt: m.created_at.toISOString(),
    sender: mapPublicMember({
      id: m.sender_id,
      full_name: m.sender_full_name,
      nickname: m.sender_nickname,
      avatar_path: m.sender_avatar_path,
      show_full_name: m.sender_show_full_name,
      show_nickname: m.sender_show_nickname,
    }),
    isMine: Number(m.sender_user_id) === userId,
  }))

  return { inquiry, messages }
}

export async function markMarketplaceInquiryRead(
  inquiryId: number,
  userId: number,
): Promise<void> {
  const row = await assertInquiryParticipant(inquiryId, userId)
  const role = roleForUser(row, userId)
  if (role === 'seller') {
    await pool.query(
      `UPDATE marketplace_listing_inquiries
       SET seller_last_read_at = NOW()
       WHERE id = $1`,
      [inquiryId],
    )
  } else {
    await pool.query(
      `UPDATE marketplace_listing_inquiries
       SET customer_last_read_at = NOW()
       WHERE id = $1`,
      [inquiryId],
    )
  }
}

export async function createOrReplyListingInquiry(
  listingId: number,
  senderUserId: number,
  body: string,
): Promise<MarketplaceInquiryThread> {
  const trimmed = body.trim()
  if (!trimmed || trimmed.length > 2000) {
    throw new AppError(400, 'Message must be 1–2000 characters', 'VALIDATION_ERROR')
  }

  const listingR = await pool.query<{ user_id: string; status: string; title: string }>(
    'SELECT user_id, status, title FROM marketplace_listings WHERE id = $1',
    [listingId],
  )
  const listing = listingR.rows[0]
  if (!listing) {
    throw new AppError(404, 'Listing not found', 'NOT_FOUND')
  }
  if (listing.status !== 'active') {
    throw new AppError(400, 'This listing is not accepting messages', 'VALIDATION_ERROR')
  }

  const sellerId = Number(listing.user_id)
  if (senderUserId === sellerId) {
    throw new AppError(400, 'You cannot message your own listing', 'VALIDATION_ERROR')
  }

  const client = await pool.connect()
  let inquiryId: number
  let isNewThread = false
  try {
    await client.query('BEGIN')

    const existingR = await client.query<{ id: string }>(
      `SELECT id FROM marketplace_listing_inquiries
       WHERE listing_id = $1 AND customer_user_id = $2`,
      [listingId, senderUserId],
    )

    if (existingR.rows[0]) {
      inquiryId = Number(existingR.rows[0].id)
    } else {
      const insR = await client.query<{ id: string }>(
        `INSERT INTO marketplace_listing_inquiries (listing_id, customer_user_id)
         VALUES ($1, $2)
         RETURNING id`,
        [listingId, senderUserId],
      )
      inquiryId = Number(insR.rows[0]?.id)
      isNewThread = true
      if (!inquiryId) {
        throw new AppError(500, 'Could not start conversation', 'INTERNAL_ERROR')
      }
    }

    await client.query(
      `INSERT INTO marketplace_inquiry_messages (inquiry_id, sender_user_id, body)
       VALUES ($1, $2, $3)`,
      [inquiryId, senderUserId, trimmed],
    )

    await client.query(
      `UPDATE marketplace_listing_inquiries
       SET updated_at = NOW(),
           customer_last_read_at = CASE WHEN $2 = customer_user_id THEN NOW() ELSE customer_last_read_at END
       WHERE id = $1`,
      [inquiryId, senderUserId],
    )

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  const row = await getInquiryRow(inquiryId)
  if (!row) {
    throw new AppError(500, 'Could not load conversation', 'INTERNAL_ERROR')
  }

  const isSellerSender = senderUserId === sellerId
  const recipientUserId = isSellerSender ? Number(row.customer_user_id) : sellerId

  void notifyInquiryMessage({
    inquiryId,
    listingId,
    senderUserId,
    recipientUserId,
    messageBody: trimmed,
    isSellerRecipient: !isSellerSender,
  })

  if (isNewThread && !isSellerSender) {
    await markMarketplaceInquiryRead(inquiryId, senderUserId)
  }

  return getMarketplaceInquiryThread(inquiryId, senderUserId)
}

export async function replyMarketplaceInquiry(
  inquiryId: number,
  senderUserId: number,
  body: string,
): Promise<MarketplaceInquiryThread> {
  const row = await assertInquiryParticipant(inquiryId, senderUserId)
  const trimmed = body.trim()
  if (!trimmed || trimmed.length > 2000) {
    throw new AppError(400, 'Message must be 1–2000 characters', 'VALIDATION_ERROR')
  }

  const listingR = await pool.query<{ status: string }>(
    'SELECT status FROM marketplace_listings WHERE id = $1',
    [row.listing_id],
  )
  if (listingR.rows[0]?.status !== 'active') {
    throw new AppError(400, 'This listing is not accepting messages', 'VALIDATION_ERROR')
  }

  const sellerId = Number(row.seller_user_id)
  const customerId = Number(row.customer_user_id)

  await pool.query(
    `INSERT INTO marketplace_inquiry_messages (inquiry_id, sender_user_id, body)
     VALUES ($1, $2, $3)`,
    [inquiryId, senderUserId, trimmed],
  )

  const readColumn =
    senderUserId === sellerId ? 'seller_last_read_at' : 'customer_last_read_at'
  await pool.query(
    `UPDATE marketplace_listing_inquiries
     SET updated_at = NOW(), ${readColumn} = NOW()
     WHERE id = $1`,
    [inquiryId],
  )

  const recipientUserId = senderUserId === sellerId ? customerId : sellerId
  void notifyInquiryMessage({
    inquiryId,
    listingId: Number(row.listing_id),
    senderUserId,
    recipientUserId,
    messageBody: trimmed,
    isSellerRecipient: recipientUserId === sellerId,
  })

  return getMarketplaceInquiryThread(inquiryId, senderUserId)
}
