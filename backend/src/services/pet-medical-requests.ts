import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { createRawToken, hashToken } from '../lib/tokens.js'
import { listPetMedicalRecordsPublic, type PetMedicalRecord } from './pet-medical.js'
import { getPetById } from './pets.js'
import { notifyUser } from './notifications.js'

const COOLDOWN_HOURS = 24
const SHARE_TTL_HOURS = 2

export const MEDICAL_REQUEST_STATUSES = ['pending', 'approved', 'declined'] as const
export type MedicalRequestStatus = (typeof MEDICAL_REQUEST_STATUSES)[number]

export type MedicalShareViewerStatus =
  | 'none'
  | 'pending'
  | 'declined'
  | 'approved'
  | 'expired'

type PetOwnerRow = {
  id: string
  name: string
  user_id: string
}

type UserNameRow = {
  full_name: string
  nickname: string
  show_full_name: boolean
  show_nickname: boolean
}

type RequestRow = {
  id: string
  pet_id: string
  requester_user_id: string
  owner_user_id: string
  status: MedicalRequestStatus
  created_at: Date
  decided_at: Date | null
  share_token_hash: string | null
  share_expires_at: Date | null
  pet_name: string
  requester_full_name: string
  requester_nickname: string
  requester_show_full_name: boolean
  requester_show_nickname: boolean
}

export interface OwnerMedicalRequest {
  id: number
  petId: number
  petName: string
  requesterUserId: number
  requesterLabel: string
  status: MedicalRequestStatus
  createdAt: string
  decidedAt: string | null
  shareExpiresAt: string | null
}

export interface RequesterMedicalStatus {
  status: MedicalShareViewerStatus
  expiresAt: string | null
  sharePath: string | null
}

export interface MedicalShareView {
  pet: { id: number; name: string }
  expiresAt: string
  records: PetMedicalRecord[]
}

function requesterLabel(row: UserNameRow): string {
  if (row.show_nickname && row.nickname.trim()) {
    return row.nickname.trim()
  }
  if (row.show_full_name && row.full_name.trim()) {
    return row.full_name.trim()
  }
  return 'A Pet Friends member'
}

function mapOwnerRequest(row: RequestRow): OwnerMedicalRequest {
  return {
    id: Number(row.id),
    petId: Number(row.pet_id),
    petName: row.pet_name,
    requesterUserId: Number(row.requester_user_id),
    requesterLabel: requesterLabel({
      full_name: row.requester_full_name,
      nickname: row.requester_nickname,
      show_full_name: row.requester_show_full_name,
      show_nickname: row.requester_show_nickname,
    }),
    status: row.status,
    createdAt: row.created_at.toISOString(),
    decidedAt: row.decided_at?.toISOString() ?? null,
    shareExpiresAt: row.share_expires_at?.toISOString() ?? null,
  }
}

const REQUEST_SELECT = `
  r.id,
  r.pet_id,
  r.requester_user_id,
  r.owner_user_id,
  r.status,
  r.created_at,
  r.decided_at,
  r.share_token_hash,
  r.share_expires_at,
  p.name AS pet_name,
  u.full_name AS requester_full_name,
  u.nickname AS requester_nickname,
  u.show_full_name AS requester_show_full_name,
  u.show_nickname AS requester_show_nickname
`

async function loadPetOwner(petId: number): Promise<PetOwnerRow> {
  const petR = await pool.query<PetOwnerRow>(
    'SELECT id, name, user_id FROM pets WHERE id = $1',
    [petId],
  )
  const pet = petR.rows[0]
  if (!pet) {
    throw new AppError(404, 'Pet not found', 'NOT_FOUND')
  }
  return pet
}

function viewerStatusFromRow(row: {
  status: MedicalRequestStatus
  share_expires_at: Date | null
}): MedicalShareViewerStatus {
  if (row.status === 'pending') {
    return 'pending'
  }
  if (row.status === 'declined') {
    return 'declined'
  }
  if (row.share_expires_at && row.share_expires_at.getTime() > Date.now()) {
    return 'approved'
  }
  return 'expired'
}

/**
 * Ask the pet’s owner for medical records. Does not grant access until approved.
 */
export async function requestPetMedicalRecords(
  requesterUserId: number,
  petId: number,
): Promise<{ ok: true }> {
  const pet = await loadPetOwner(petId)
  const ownerId = Number(pet.user_id)
  if (ownerId === requesterUserId) {
    throw new AppError(
      400,
      'You already have this pet’s medical records',
      'OWN_PET',
    )
  }

  const open = await pool.query<{
    status: MedicalRequestStatus
    share_expires_at: Date | null
  }>(
    `SELECT status, share_expires_at
     FROM pet_medical_requests
     WHERE pet_id = $1 AND requester_user_id = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [petId, requesterUserId],
  )
  const latest = open.rows[0]
  if (latest?.status === 'pending') {
    throw new AppError(
      429,
      'Your request is already waiting for the owner.',
      'REQUEST_PENDING',
    )
  }
  if (latest && viewerStatusFromRow(latest) === 'approved') {
    throw new AppError(
      429,
      'The owner already shared records. Open the link you received — it expires soon.',
      'SHARE_ACTIVE',
    )
  }

  const recent = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c
     FROM pet_medical_requests
     WHERE pet_id = $1
       AND requester_user_id = $2
       AND created_at > NOW() - make_interval(hours => $3)`,
    [petId, requesterUserId, COOLDOWN_HOURS],
  )
  if (Number(recent.rows[0]?.c ?? 0) > 0) {
    throw new AppError(
      429,
      'You already requested medical records for this pet. Please wait before asking again.',
      'REQUEST_COOLDOWN',
    )
  }

  const requesterR = await pool.query<UserNameRow>(
    `SELECT full_name, nickname, show_full_name, show_nickname
     FROM users WHERE id = $1`,
    [requesterUserId],
  )
  const requester = requesterR.rows[0]
  if (!requester) {
    throw new AppError(404, 'User not found', 'NOT_FOUND')
  }

  await pool.query(
    `INSERT INTO pet_medical_requests (pet_id, requester_user_id, owner_user_id)
     VALUES ($1, $2, $3)`,
    [petId, requesterUserId, ownerId],
  )

  const who = requesterLabel(requester)
  try {
    await notifyUser({
      userId: ownerId,
      type: 'medical_request',
      title: `Medical records request for ${pet.name}`,
      body:
        `${who} asked to see ${pet.name}’s medical records. ` +
        `Approve or decline in My pets → Medical.`,
      linkPath: `/app/my-pets/${petId}?tab=medical`,
      meta: {
        petId,
        requesterUserId,
      },
      channels: ['in_app', 'email', 'sms'],
    })
  } catch (error) {
    console.error('Medical request notification failed:', error)
  }

  return { ok: true }
}

export async function listOwnerMedicalRequests(
  ownerUserId: number,
  petId: number,
): Promise<{ requests: OwnerMedicalRequest[] }> {
  await getPetById(ownerUserId, petId)
  const r = await pool.query<RequestRow>(
    `SELECT ${REQUEST_SELECT}
     FROM pet_medical_requests r
     INNER JOIN pets p ON p.id = r.pet_id
     INNER JOIN users u ON u.id = r.requester_user_id
     WHERE r.pet_id = $1
       AND r.owner_user_id = $2
       AND r.status = 'pending'
     ORDER BY r.created_at DESC
     LIMIT 40`,
    [petId, ownerUserId],
  )
  return { requests: r.rows.map(mapOwnerRequest) }
}

export async function getRequesterMedicalStatus(
  requesterUserId: number,
  petId: number,
): Promise<RequesterMedicalStatus> {
  const r = await pool.query<{
    status: MedicalRequestStatus
    share_expires_at: Date | null
  }>(
    `SELECT status, share_expires_at
     FROM pet_medical_requests
     WHERE pet_id = $1 AND requester_user_id = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [petId, requesterUserId],
  )
  const row = r.rows[0]
  if (!row) {
    return { status: 'none', expiresAt: null, sharePath: null }
  }
  const status = viewerStatusFromRow(row)
  return {
    status,
    expiresAt: row.share_expires_at?.toISOString() ?? null,
    sharePath: status === 'approved' ? `/app/medical-share/pet/${petId}` : null,
  }
}

export async function approveMedicalRequest(
  ownerUserId: number,
  petId: number,
  requestId: number,
): Promise<OwnerMedicalRequest> {
  await getPetById(ownerUserId, petId)
  const rawToken = createRawToken()
  const tokenHash = hashToken(rawToken)

  const r = await pool.query<RequestRow>(
    `UPDATE pet_medical_requests r
     SET status = 'approved',
         decided_at = NOW(),
         share_token_hash = $4,
         share_expires_at = NOW() + make_interval(hours => $5)
     FROM pets p, users u
     WHERE r.id = $1
       AND r.pet_id = $2
       AND r.owner_user_id = $3
       AND r.status = 'pending'
       AND p.id = r.pet_id
       AND u.id = r.requester_user_id
     RETURNING ${REQUEST_SELECT}`,
    [requestId, petId, ownerUserId, tokenHash, SHARE_TTL_HOURS],
  )
  const row = r.rows[0]
  if (!row) {
    throw new AppError(404, 'Request not found or already decided', 'NOT_FOUND')
  }

  const mapped = mapOwnerRequest(row)
  try {
    await notifyUser({
      userId: mapped.requesterUserId,
      type: 'medical_share',
      title: `${mapped.petName}: medical records shared`,
      body:
        `The owner approved your request. The read-only page is available for ${SHARE_TTL_HOURS} hours.`,
      linkPath: `/app/medical-share/${rawToken}`,
      meta: {
        petId,
        requestId,
        expiresAt: mapped.shareExpiresAt,
      },
      channels: ['in_app', 'email', 'sms'],
    })
  } catch (error) {
    console.error('Medical share notification failed:', error)
  }

  return mapped
}

export async function declineMedicalRequest(
  ownerUserId: number,
  petId: number,
  requestId: number,
): Promise<OwnerMedicalRequest> {
  await getPetById(ownerUserId, petId)
  const r = await pool.query<RequestRow>(
    `UPDATE pet_medical_requests r
     SET status = 'declined',
         decided_at = NOW()
     FROM pets p, users u
     WHERE r.id = $1
       AND r.pet_id = $2
       AND r.owner_user_id = $3
       AND r.status = 'pending'
       AND p.id = r.pet_id
       AND u.id = r.requester_user_id
     RETURNING ${REQUEST_SELECT}`,
    [requestId, petId, ownerUserId],
  )
  const row = r.rows[0]
  if (!row) {
    throw new AppError(404, 'Request not found or already decided', 'NOT_FOUND')
  }

  const mapped = mapOwnerRequest(row)
  try {
    await notifyUser({
      userId: mapped.requesterUserId,
      type: 'medical_request_declined',
      title: `${mapped.petName}: medical request declined`,
      body: `The owner declined to share ${mapped.petName}’s medical records.`,
      linkPath: `/animals/${petId}`,
      meta: { petId, requestId },
      channels: ['in_app', 'email', 'sms'],
    })
  } catch (error) {
    console.error('Medical decline notification failed:', error)
  }

  return mapped
}

async function loadShareRecords(petId: number, petName: string, expiresAt: Date) {
  const records = await listPetMedicalRecordsPublic(petId)
  return {
    pet: { id: petId, name: petName },
    expiresAt: expiresAt.toISOString(),
    records,
  } satisfies MedicalShareView
}

export async function getMedicalShareByToken(
  viewerUserId: number,
  rawToken: string,
): Promise<MedicalShareView> {
  const tokenHash = hashToken(rawToken.trim())
  const r = await pool.query<{
    pet_id: string
    pet_name: string
    requester_user_id: string
    status: MedicalRequestStatus
    share_expires_at: Date | null
  }>(
    `SELECT r.pet_id, p.name AS pet_name, r.requester_user_id, r.status, r.share_expires_at
     FROM pet_medical_requests r
     INNER JOIN pets p ON p.id = r.pet_id
     WHERE r.share_token_hash = $1
     LIMIT 1`,
    [tokenHash],
  )
  const row = r.rows[0]
  if (!row || row.status !== 'approved' || !row.share_expires_at) {
    throw new AppError(404, 'This medical share is not available', 'SHARE_NOT_FOUND')
  }
  if (Number(row.requester_user_id) !== viewerUserId) {
    throw new AppError(403, 'This medical share is not for your account', 'FORBIDDEN')
  }
  if (row.share_expires_at.getTime() <= Date.now()) {
    throw new AppError(410, 'This medical share has expired', 'SHARE_EXPIRED')
  }
  return loadShareRecords(Number(row.pet_id), row.pet_name, row.share_expires_at)
}

export async function getMedicalShareByPet(
  viewerUserId: number,
  petId: number,
): Promise<MedicalShareView> {
  const r = await pool.query<{
    pet_name: string
    status: MedicalRequestStatus
    share_expires_at: Date | null
  }>(
    `SELECT p.name AS pet_name, r.status, r.share_expires_at
     FROM pet_medical_requests r
     INNER JOIN pets p ON p.id = r.pet_id
     WHERE r.pet_id = $1
       AND r.requester_user_id = $2
       AND r.status = 'approved'
     ORDER BY r.decided_at DESC NULLS LAST
     LIMIT 1`,
    [petId, viewerUserId],
  )
  const row = r.rows[0]
  if (!row || !row.share_expires_at) {
    throw new AppError(404, 'This medical share is not available', 'SHARE_NOT_FOUND')
  }
  if (row.share_expires_at.getTime() <= Date.now()) {
    throw new AppError(410, 'This medical share has expired', 'SHARE_EXPIRED')
  }
  return loadShareRecords(petId, row.pet_name, row.share_expires_at)
}
