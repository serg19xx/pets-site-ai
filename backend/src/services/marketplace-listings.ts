import type { PoolClient } from 'pg'

import { config } from '../config.js'
import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { mapPublicMember } from '../lib/map-public-member.js'
import {
  normalizeListingMediaMime,
  saveListingMediaBuffer,
} from '../lib/save-listing-media.js'
import { buildPublicUploadUrl, deleteUploadIfExists } from '../lib/uploads.js'

type ListingType = 'sell' | 'buy' | 'exchange' | 'service'
type ListingStatus = 'draft' | 'active' | 'archived' | 'closed'

interface ListingMediaRow {
  id: string
  listing_id: string
  kind: 'image' | 'video'
  path: string
  sort_order: number
}

interface MarketplaceListingRow {
  listing_id: string
  user_id: string
  author_id: string
  author_full_name: string
  author_nickname: string
  author_avatar_path: string | null
  author_show_full_name: boolean
  author_show_nickname: boolean
  type: ListingType
  title: string
  description: string
  price_amount: string | null
  price_currency: string
  city: string | null
  contact_phone: string | null
  contact_method: string | null
  inquiry_notify_email: boolean
  inquiry_notify_sms: boolean
  inquiry_sms_phone: string | null
  status: ListingStatus
  created_at: Date
  updated_at: Date
}

interface MarketplaceListingMedia {
  id: number
  kind: 'image' | 'video'
  url: string
  sortOrder: number
}

export interface MarketplaceListing {
  id: number
  type: ListingType
  title: string
  description: string
  priceAmount: number | null
  priceCurrency: string
  city: string | null
  contactPhone: string | null
  contactMethod: string | null
  status: ListingStatus
  createdAt: string
  updatedAt: string
  author: ReturnType<typeof mapPublicMember>
  media: MarketplaceListingMedia[]
  inquirySettings?: {
    inquiryNotifyEmail: boolean
    inquiryNotifySms: boolean
    inquirySmsPhone: string | null
  }
}

export interface CreateMarketplaceListingInput {
  type: ListingType
  title: string
  description: string
  priceAmount?: number | null
  priceCurrency?: string
  city?: string | null
  contactPhone?: string | null
  contactMethod?: string | null
  status?: ListingStatus
}

export interface PendingListingMedia {
  buffer: Buffer
  mimetype: string
  filename?: string | null
}

export interface UpdateMarketplaceListingInput {
  type?: ListingType
  title?: string
  description?: string
  priceAmount?: number | null
  priceCurrency?: string
  city?: string | null
  contactPhone?: string | null
  contactMethod?: string | null
  status?: ListingStatus
  inquiryNotifyEmail?: boolean
  inquiryNotifySms?: boolean
  inquirySmsPhone?: string | null
}

const LISTING_SELECT = `
  l.id AS listing_id,
  l.user_id,
  l.type,
  l.title,
  l.description,
  l.price_amount,
  l.price_currency,
  l.city,
  l.contact_phone,
  l.contact_method,
  l.inquiry_notify_email,
  l.inquiry_notify_sms,
  l.inquiry_sms_phone,
  l.status,
  l.created_at,
  l.updated_at,
  u.id AS author_id,
  u.full_name AS author_full_name,
  u.nickname AS author_nickname,
  u.avatar_path AS author_avatar_path,
  u.show_full_name AS author_show_full_name,
  u.show_nickname AS author_show_nickname
`

function mapListingRow(
  row: MarketplaceListingRow,
  media: MarketplaceListingMedia[],
  viewerUserId?: number,
): MarketplaceListing {
  const ownerId = Number(row.user_id)
  const listing: MarketplaceListing = {
    id: Number(row.listing_id),
    type: row.type,
    title: row.title,
    description: row.description,
    priceAmount: row.price_amount === null ? null : Number(row.price_amount),
    priceCurrency: row.price_currency,
    city: row.city,
    contactPhone: row.contact_phone,
    contactMethod: row.contact_method,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    author: mapPublicMember({
      id: row.author_id,
      full_name: row.author_full_name,
      nickname: row.author_nickname,
      avatar_path: row.author_avatar_path,
      show_full_name: row.author_show_full_name,
      show_nickname: row.author_show_nickname,
    }),
    media,
  }
  if (viewerUserId !== undefined && viewerUserId === ownerId) {
    listing.inquirySettings = {
      inquiryNotifyEmail: row.inquiry_notify_email,
      inquiryNotifySms: row.inquiry_notify_sms,
      inquirySmsPhone: row.inquiry_sms_phone,
    }
  }
  return listing
}

async function loadMediaForListings(listingIds: number[]): Promise<Map<number, MarketplaceListingMedia[]>> {
  if (listingIds.length === 0) {
    return new Map()
  }
  const r = await pool.query<ListingMediaRow>(
    `SELECT id, listing_id, kind, path, sort_order
     FROM marketplace_listing_media
     WHERE listing_id = ANY($1::bigint[])
     ORDER BY listing_id ASC, sort_order ASC, id ASC`,
    [listingIds],
  )
  const map = new Map<number, MarketplaceListingMedia[]>()
  for (const row of r.rows) {
    const listingId = Number(row.listing_id)
    const list = map.get(listingId) ?? []
    list.push({
      id: Number(row.id),
      kind: row.kind,
      url: buildPublicUploadUrl(row.path),
      sortOrder: Number(row.sort_order),
    })
    map.set(listingId, list)
  }
  return map
}

async function assertListingOwner(userId: number, listingId: number): Promise<void> {
  const r = await pool.query<{ user_id: string }>(
    'SELECT user_id FROM marketplace_listings WHERE id = $1',
    [listingId],
  )
  if (!r.rows[0]) {
    throw new AppError(404, 'Listing not found', 'NOT_FOUND')
  }
  if (Number(r.rows[0].user_id) !== userId) {
    throw new AppError(403, 'You can only manage your own listings', 'FORBIDDEN')
  }
}

function normalizePriceCurrency(value: string | undefined): string {
  const currency = (value ?? 'CAD').trim().toUpperCase()
  if (!currency || currency.length !== 3) {
    throw new AppError(400, 'Currency must be a 3-letter code', 'VALIDATION_ERROR')
  }
  return currency
}

function normalizeNullableText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function assertFilesWithinLimit(fileCount: number): void {
  if (fileCount > config.marketplaceMaxImagesPerListing) {
    throw new AppError(
      400,
      `At most ${config.marketplaceMaxImagesPerListing} images per listing`,
      'VALIDATION_ERROR',
    )
  }
}

async function countListingMedia(listingId: number): Promise<number> {
  const r = await pool.query<{ c: string }>(
    'SELECT COUNT(*)::text AS c FROM marketplace_listing_media WHERE listing_id = $1',
    [listingId],
  )
  return Number(r.rows[0]?.c ?? 0)
}

async function insertListingMediaFiles(
  client: PoolClient,
  listingId: number,
  files: PendingListingMedia[],
  startSortOrder: number,
): Promise<string[]> {
  const savedPaths: string[] = []
  let sortOrder = startSortOrder
  for (const file of files) {
    const mime = normalizeListingMediaMime(file.mimetype, file.filename)
    const { path } = await saveListingMediaBuffer(listingId, file.buffer, mime)
    savedPaths.push(path)
    await client.query(
      `INSERT INTO marketplace_listing_media (listing_id, kind, path, sort_order)
       VALUES ($1, 'image', $2, $3)`,
      [listingId, path, sortOrder],
    )
    sortOrder += 1
  }
  return savedPaths
}

async function cleanupSavedPaths(paths: string[]): Promise<void> {
  for (const path of paths) {
    await deleteUploadIfExists(path)
  }
}

export async function listMarketplaceListings(
  limit: number,
  offset: number,
): Promise<{ listings: MarketplaceListing[]; total: number }> {
  const countR = await pool.query<{ c: string }>(
    "SELECT COUNT(*)::text AS c FROM marketplace_listings WHERE status = 'active'",
  )
  const total = Number(countR.rows[0]?.c ?? 0)

  const r = await pool.query<MarketplaceListingRow>(
    `SELECT ${LISTING_SELECT}
     FROM marketplace_listings l
     INNER JOIN users u ON u.id = l.user_id
     WHERE l.status = 'active'
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  )
  const listingIds = r.rows.map((row) => Number(row.listing_id))
  const mediaMap = await loadMediaForListings(listingIds)
  const listings = r.rows.map((row) =>
    mapListingRow(row, mediaMap.get(Number(row.listing_id)) ?? [], undefined),
  )
  return { listings, total }
}

export async function listMyMarketplaceListings(
  userId: number,
  limit: number,
  offset: number,
): Promise<{ listings: MarketplaceListing[]; total: number }> {
  const countR = await pool.query<{ c: string }>(
    'SELECT COUNT(*)::text AS c FROM marketplace_listings WHERE user_id = $1',
    [userId],
  )
  const total = Number(countR.rows[0]?.c ?? 0)
  const r = await pool.query<MarketplaceListingRow>(
    `SELECT ${LISTING_SELECT}
     FROM marketplace_listings l
     INNER JOIN users u ON u.id = l.user_id
     WHERE l.user_id = $1
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  )
  const listingIds = r.rows.map((row) => Number(row.listing_id))
  const mediaMap = await loadMediaForListings(listingIds)
  const listings = r.rows.map((row) =>
    mapListingRow(row, mediaMap.get(Number(row.listing_id)) ?? [], userId),
  )
  return { listings, total }
}

export async function getMarketplaceListingById(
  listingId: number,
  viewerUserId?: number,
): Promise<MarketplaceListing> {
  const r = await pool.query<MarketplaceListingRow>(
    `SELECT ${LISTING_SELECT}
     FROM marketplace_listings l
     INNER JOIN users u ON u.id = l.user_id
     WHERE l.id = $1`,
    [listingId],
  )
  const row = r.rows[0]
  if (!row) {
    throw new AppError(404, 'Listing not found', 'NOT_FOUND')
  }
  const ownerId = Number(row.user_id)
  if (row.status !== 'active' && viewerUserId !== ownerId) {
    throw new AppError(404, 'Listing not found', 'NOT_FOUND')
  }
  const mediaMap = await loadMediaForListings([listingId])
  return mapListingRow(row, mediaMap.get(listingId) ?? [], viewerUserId)
}

export async function createMarketplaceListing(
  userId: number,
  input: CreateMarketplaceListingInput,
  files: PendingListingMedia[] = [],
): Promise<MarketplaceListing> {
  const title = input.title.trim()
  const description = input.description.trim()
  const currency = normalizePriceCurrency(input.priceCurrency)
  const city = normalizeNullableText(input.city)
  const contactPhone = normalizeNullableText(input.contactPhone)
  const contactMethod = normalizeNullableText(input.contactMethod)

  assertFilesWithinLimit(files.length)

  const client = await pool.connect()
  const savedPaths: string[] = []
  try {
    await client.query('BEGIN')
    const r = await client.query<{ id: string }>(
      `INSERT INTO marketplace_listings (
        user_id, type, title, description, price_amount, price_currency,
        city, contact_phone, contact_method, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id`,
      [
        userId,
        input.type,
        title,
        description,
        input.priceAmount ?? null,
        currency,
        city,
        contactPhone,
        contactMethod,
        input.status ?? 'active',
      ],
    )
    const listingId = Number(r.rows[0]?.id)
    if (!listingId) {
      throw new AppError(500, 'Could not create listing', 'INTERNAL_ERROR')
    }

    const paths = await insertListingMediaFiles(client, listingId, files, 0)
    savedPaths.push(...paths)

    await client.query('COMMIT')
    return getMarketplaceListingById(listingId, userId)
  } catch (err) {
    await client.query('ROLLBACK')
    await cleanupSavedPaths(savedPaths)
    throw err
  } finally {
    client.release()
  }
}

export async function addMarketplaceListingMedia(
  userId: number,
  listingId: number,
  files: PendingListingMedia[],
): Promise<MarketplaceListing> {
  await assertListingOwner(userId, listingId)
  if (files.length === 0) {
    throw new AppError(400, 'At least one image is required', 'VALIDATION_ERROR')
  }

  const existingCount = await countListingMedia(listingId)
  if (existingCount + files.length > config.marketplaceMaxImagesPerListing) {
    throw new AppError(
      400,
      `At most ${config.marketplaceMaxImagesPerListing} images per listing`,
      'VALIDATION_ERROR',
    )
  }

  const maxSortR = await pool.query<{ max: string | null }>(
    'SELECT MAX(sort_order)::text AS max FROM marketplace_listing_media WHERE listing_id = $1',
    [listingId],
  )
  const startSortOrder = (maxSortR.rows[0]?.max === null ? -1 : Number(maxSortR.rows[0]?.max)) + 1

  const client = await pool.connect()
  const savedPaths: string[] = []
  try {
    await client.query('BEGIN')
    const paths = await insertListingMediaFiles(client, listingId, files, startSortOrder)
    savedPaths.push(...paths)
    await client.query('COMMIT')
    return getMarketplaceListingById(listingId, userId)
  } catch (err) {
    await client.query('ROLLBACK')
    await cleanupSavedPaths(savedPaths)
    throw err
  } finally {
    client.release()
  }
}

export async function deleteMarketplaceListingMedia(
  userId: number,
  listingId: number,
  mediaId: number,
): Promise<MarketplaceListing> {
  await assertListingOwner(userId, listingId)

  const r = await pool.query<{ path: string }>(
    'SELECT path FROM marketplace_listing_media WHERE id = $1 AND listing_id = $2',
    [mediaId, listingId],
  )
  const row = r.rows[0]
  if (!row) {
    throw new AppError(404, 'Image not found', 'NOT_FOUND')
  }

  await pool.query('DELETE FROM marketplace_listing_media WHERE id = $1', [mediaId])
  await deleteUploadIfExists(row.path)
  return getMarketplaceListingById(listingId, userId)
}

export async function updateMarketplaceListing(
  userId: number,
  listingId: number,
  patch: UpdateMarketplaceListingInput,
): Promise<MarketplaceListing> {
  await assertListingOwner(userId, listingId)

  const updates: string[] = []
  const values: Array<string | number | boolean | null> = []
  let index = 1

  if (patch.type !== undefined) {
    updates.push(`type = $${index++}`)
    values.push(patch.type)
  }
  if (patch.title !== undefined) {
    updates.push(`title = $${index++}`)
    values.push(patch.title.trim())
  }
  if (patch.description !== undefined) {
    updates.push(`description = $${index++}`)
    values.push(patch.description.trim())
  }
  if (patch.priceAmount !== undefined) {
    updates.push(`price_amount = $${index++}`)
    values.push(patch.priceAmount)
  }
  if (patch.priceCurrency !== undefined) {
    updates.push(`price_currency = $${index++}`)
    values.push(normalizePriceCurrency(patch.priceCurrency))
  }
  if (patch.city !== undefined) {
    updates.push(`city = $${index++}`)
    values.push(normalizeNullableText(patch.city))
  }
  if (patch.contactPhone !== undefined) {
    updates.push(`contact_phone = $${index++}`)
    values.push(normalizeNullableText(patch.contactPhone))
  }
  if (patch.contactMethod !== undefined) {
    updates.push(`contact_method = $${index++}`)
    values.push(normalizeNullableText(patch.contactMethod))
  }
  if (patch.status !== undefined) {
    updates.push(`status = $${index++}`)
    values.push(patch.status)
  }
  if (patch.inquiryNotifyEmail !== undefined) {
    updates.push(`inquiry_notify_email = $${index++}`)
    values.push(patch.inquiryNotifyEmail)
  }
  if (patch.inquiryNotifySms !== undefined) {
    updates.push(`inquiry_notify_sms = $${index++}`)
    values.push(patch.inquiryNotifySms)
  }
  if (patch.inquirySmsPhone !== undefined) {
    updates.push(`inquiry_sms_phone = $${index++}`)
    values.push(normalizeNullableText(patch.inquirySmsPhone))
  }

  if (updates.length === 0) {
    return getMarketplaceListingById(listingId, userId)
  }

  values.push(listingId)
  await pool.query(
    `UPDATE marketplace_listings
     SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${index}`,
    values,
  )
  return getMarketplaceListingById(listingId, userId)
}

export async function deleteMarketplaceListing(userId: number, listingId: number): Promise<void> {
  await assertListingOwner(userId, listingId)

  const mediaR = await pool.query<{ path: string }>(
    'SELECT path FROM marketplace_listing_media WHERE listing_id = $1',
    [listingId],
  )
  await pool.query('DELETE FROM marketplace_listings WHERE id = $1', [listingId])
  for (const row of mediaR.rows) {
    await deleteUploadIfExists(row.path)
  }
}
