import type { MultipartFile } from '@fastify/multipart'
import { randomBytes } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'

import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import {
  deleteUploadIfExists,
  ensureUploadParentDir,
  replaceImageUpload,
  resolveUploadAbsolutePath,
  buildPublicUploadUrl,
} from '../lib/uploads.js'
import { getPetById } from './pets.js'
import { PET_EVENT_TYPES, recordPetEvent } from './pet-events.js'
import { PET_MEMORY_KINDS, recordPetMemory } from './pet-memories.js'

const MAX_CERTIFICATES_PER_PET = 12

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

export interface PetCertificate {
  id: number
  url: string
  sortOrder: number
  createdAt: string
}

type CertificateRow = {
  id: string
  path: string
  sort_order: number
  created_at: Date
}

function mapCertificateRow(row: CertificateRow): PetCertificate {
  const createdAt =
    row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
  return {
    id: Number(row.id),
    url: buildPublicUploadUrl(row.path),
    sortOrder: row.sort_order,
    createdAt,
  }
}

async function saveCertificateFile(
  petId: number,
  file: MultipartFile,
): Promise<string> {
  const mime = file.mimetype
  if (!ALLOWED_MIME.has(mime)) {
    throw new AppError(
      400,
      'Only JPEG, PNG, WebP, or GIF images are allowed',
      'INVALID_FILE_TYPE',
    )
  }
  const ext = EXT_BY_MIME[mime] ?? '.jpg'
  const relativePath = `pets/certificates/pet-${petId}-${randomBytes(6).toString('hex')}${ext}`
  const stream = file.file
  if (!stream) {
    throw new AppError(400, 'No file uploaded', 'VALIDATION_ERROR')
  }
  await ensureUploadParentDir(relativePath)
  try {
    await pipeline(stream, createWriteStream(resolveUploadAbsolutePath(relativePath)))
  } catch {
    throw new AppError(500, 'Could not save uploaded file', 'UPLOAD_FAILED')
  }
  return relativePath
}

export async function listPetCertificates(
  userId: number,
  petId: number,
): Promise<PetCertificate[]> {
  await getPetById(userId, petId)
  const r = await pool.query<CertificateRow>(
    `SELECT id, path, sort_order, created_at
     FROM pet_certificates
     WHERE pet_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [petId],
  )
  return r.rows.map(mapCertificateRow)
}

export async function uploadPetCertificate(
  userId: number,
  petId: number,
  file: MultipartFile,
): Promise<PetCertificate> {
  await getPetById(userId, petId)

  const countR = await pool.query<{ c: string }>(
    'SELECT COUNT(*)::text AS c FROM pet_certificates WHERE pet_id = $1',
    [petId],
  )
  const count = Number(countR.rows[0]?.c ?? 0)
  if (count >= MAX_CERTIFICATES_PER_PET) {
    throw new AppError(
      400,
      `Maximum ${MAX_CERTIFICATES_PER_PET} certificate photos per pet`,
      'CERTIFICATE_LIMIT',
    )
  }

  const relativePath = await saveCertificateFile(petId, file)

  const sortR = await pool.query<{ next: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM pet_certificates WHERE pet_id = $1',
    [petId],
  )
  const sortOrder = sortR.rows[0]?.next ?? 0

  try {
    const inserted = await pool.query<CertificateRow>(
      `INSERT INTO pet_certificates (pet_id, path, sort_order)
       VALUES ($1, $2, $3)
       RETURNING id, path, sort_order, created_at`,
      [petId, relativePath, sortOrder],
    )
    const row = inserted.rows[0]
    if (!row) {
      throw new AppError(500, 'Failed to save certificate', 'INTERNAL_ERROR')
    }
    await pool.query('UPDATE pets SET updated_at = NOW() WHERE id = $1', [petId])
    const certificate = mapCertificateRow(row)
    await recordPetEvent({
      petId,
      eventType: PET_EVENT_TYPES.CERTIFICATE_UPLOADED,
      payload: { certificateId: certificate.id },
    })
    await recordPetMemory({
      petId,
      kind: PET_MEMORY_KINDS.ACHIEVEMENT,
      content: 'Received an official certificate (birth / genetic / other document on file).',
      importance: 7,
      sourceEventType: PET_EVENT_TYPES.CERTIFICATE_UPLOADED,
    })
    return certificate
  } catch (err) {
    await deleteUploadIfExists(relativePath)
    throw err
  }
}

export async function replacePetCertificateFile(
  userId: number,
  petId: number,
  certificateId: number,
  file: MultipartFile,
): Promise<PetCertificate> {
  await getPetById(userId, petId)

  const existing = await pool.query<{ path: string }>(
    'SELECT path FROM pet_certificates WHERE id = $1 AND pet_id = $2',
    [certificateId, petId],
  )
  const row = existing.rows[0]
  if (!row) {
    throw new AppError(404, 'Certificate not found', 'NOT_FOUND')
  }

  await replaceImageUpload(row.path, file)
  await pool.query('UPDATE pets SET updated_at = NOW() WHERE id = $1', [petId])

  const refreshed = await pool.query<CertificateRow>(
    `SELECT id, path, sort_order, created_at
     FROM pet_certificates
     WHERE id = $1 AND pet_id = $2`,
    [certificateId, petId],
  )
  const updated = refreshed.rows[0]
  if (!updated) {
    throw new AppError(500, 'Failed to load certificate', 'INTERNAL_ERROR')
  }
  return mapCertificateRow(updated)
}

export async function deletePetCertificate(
  userId: number,
  petId: number,
  certificateId: number,
): Promise<void> {
  await getPetById(userId, petId)

  const r = await pool.query<{ path: string }>(
    `DELETE FROM pet_certificates
     WHERE id = $1 AND pet_id = $2
     RETURNING path`,
    [certificateId, petId],
  )
  const deleted = r.rows[0]
  if (!deleted) {
    throw new AppError(404, 'Certificate not found', 'NOT_FOUND')
  }
  await deleteUploadIfExists(deleted.path)
  await pool.query('UPDATE pets SET updated_at = NOW() WHERE id = $1', [petId])
}

export async function deleteAllPetCertificateFiles(petId: number): Promise<void> {
  const r = await pool.query<{ path: string }>(
    'SELECT path FROM pet_certificates WHERE pet_id = $1',
    [petId],
  )
  for (const row of r.rows) {
    await deleteUploadIfExists(row.path)
  }
}
