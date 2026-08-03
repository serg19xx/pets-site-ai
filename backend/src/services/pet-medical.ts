import type { MultipartFile } from '@fastify/multipart'
import { randomBytes } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'

import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import {
  buildPublicUploadUrl,
  deleteUploadIfExists,
  ensureUploadParentDir,
  replaceImageUpload,
  resolveUploadAbsolutePath,
} from '../lib/uploads.js'
import { getPetById } from './pets.js'

const MAX_RECORDS_PER_PET = 100
const MAX_PHOTOS_PER_RECORD = 6

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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export interface PetMedicalPhoto {
  id: number
  url: string
  sortOrder: number
  createdAt: string
}

export interface PetMedicalRecord {
  id: number
  visitedOn: string
  clinicName: string | null
  doctorName: string | null
  procedureLabel: string
  notes: string | null
  photos: PetMedicalPhoto[]
  createdAt: string
  updatedAt: string
}

export interface UpsertMedicalRecordInput {
  visitedOn: string
  clinicName?: string | null
  doctorName?: string | null
  procedureLabel: string
  notes?: string | null
}

type RecordRow = {
  id: string
  visited_on: Date | string
  clinic_name: string | null
  doctor_name: string | null
  procedure_label: string
  notes: string | null
  created_at: Date
  updated_at: Date
}

type PhotoRow = {
  id: string
  record_id: string
  path: string
  sort_order: number
  created_at: Date
}

function formatDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  const s = String(value)
  return s.length >= 10 ? s.slice(0, 10) : s
}

function formatTs(value: Date): string {
  return value instanceof Date ? value.toISOString() : String(value)
}

function mapPhoto(row: PhotoRow): PetMedicalPhoto {
  return {
    id: Number(row.id),
    url: buildPublicUploadUrl(row.path),
    sortOrder: row.sort_order,
    createdAt: formatTs(row.created_at),
  }
}

function mapRecord(row: RecordRow, photos: PetMedicalPhoto[]): PetMedicalRecord {
  return {
    id: Number(row.id),
    visitedOn: formatDate(row.visited_on),
    clinicName: row.clinic_name,
    doctorName: row.doctor_name,
    procedureLabel: row.procedure_label,
    notes: row.notes,
    photos,
    createdAt: formatTs(row.created_at),
    updatedAt: formatTs(row.updated_at),
  }
}

function parseOptionalText(
  value: string | null | undefined,
  max: number,
  label: string,
): string | null {
  if (value == null) {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  if (trimmed.length > max) {
    throw new AppError(400, `${label} is too long`, 'VALIDATION_ERROR')
  }
  return trimmed
}

function validateRecordInput(input: UpsertMedicalRecordInput): {
  visitedOn: string
  clinicName: string | null
  doctorName: string | null
  procedureLabel: string
  notes: string | null
} {
  const visitedOn = input.visitedOn?.trim() ?? ''
  if (!DATE_RE.test(visitedOn)) {
    throw new AppError(400, 'visitedOn must be YYYY-MM-DD', 'VALIDATION_ERROR')
  }
  const procedureLabel = input.procedureLabel?.trim() ?? ''
  if (procedureLabel.length < 1) {
    throw new AppError(400, 'Procedure / vaccine is required', 'VALIDATION_ERROR')
  }
  if (procedureLabel.length > 300) {
    throw new AppError(400, 'Procedure label is too long', 'VALIDATION_ERROR')
  }
  return {
    visitedOn,
    clinicName: parseOptionalText(input.clinicName, 200, 'Clinic name'),
    doctorName: parseOptionalText(input.doctorName, 200, 'Doctor name'),
    procedureLabel,
    notes: parseOptionalText(input.notes, 2000, 'Notes'),
  }
}

async function assertOwnsRecord(
  userId: number,
  petId: number,
  recordId: number,
): Promise<void> {
  await getPetById(userId, petId)
  const r = await pool.query(
    'SELECT 1 FROM pet_medical_records WHERE id = $1 AND pet_id = $2',
    [recordId, petId],
  )
  if (r.rowCount === 0) {
    throw new AppError(404, 'Medical record not found', 'NOT_FOUND')
  }
}

async function loadPhotosForRecords(
  recordIds: number[],
): Promise<Map<number, PetMedicalPhoto[]>> {
  const map = new Map<number, PetMedicalPhoto[]>()
  if (recordIds.length === 0) {
    return map
  }
  const r = await pool.query<PhotoRow>(
    `SELECT id, record_id, path, sort_order, created_at
     FROM pet_medical_photos
     WHERE record_id = ANY($1::bigint[])
     ORDER BY sort_order ASC, id ASC`,
    [recordIds],
  )
  for (const row of r.rows) {
    const rid = Number(row.record_id)
    const list = map.get(rid) ?? []
    list.push(mapPhoto(row))
    map.set(rid, list)
  }
  return map
}

async function getRecordById(
  petId: number,
  recordId: number,
): Promise<PetMedicalRecord> {
  const r = await pool.query<RecordRow>(
    `SELECT id, visited_on, clinic_name, doctor_name, procedure_label, notes,
            created_at, updated_at
     FROM pet_medical_records
     WHERE id = $1 AND pet_id = $2`,
    [recordId, petId],
  )
  const row = r.rows[0]
  if (!row) {
    throw new AppError(404, 'Medical record not found', 'NOT_FOUND')
  }
  const photosMap = await loadPhotosForRecords([recordId])
  return mapRecord(row, photosMap.get(recordId) ?? [])
}

export async function listPetMedicalRecords(
  userId: number,
  petId: number,
): Promise<PetMedicalRecord[]> {
  await getPetById(userId, petId)
  const r = await pool.query<RecordRow>(
    `SELECT id, visited_on, clinic_name, doctor_name, procedure_label, notes,
            created_at, updated_at
     FROM pet_medical_records
     WHERE pet_id = $1
     ORDER BY visited_on DESC, id DESC`,
    [petId],
  )
  const ids = r.rows.map((row) => Number(row.id))
  const photosMap = await loadPhotosForRecords(ids)
  return r.rows.map((row) => mapRecord(row, photosMap.get(Number(row.id)) ?? []))
}

export async function createPetMedicalRecord(
  userId: number,
  petId: number,
  input: UpsertMedicalRecordInput,
): Promise<PetMedicalRecord> {
  await getPetById(userId, petId)
  const data = validateRecordInput(input)

  const countR = await pool.query<{ c: string }>(
    'SELECT COUNT(*)::text AS c FROM pet_medical_records WHERE pet_id = $1',
    [petId],
  )
  if (Number(countR.rows[0]?.c ?? 0) >= MAX_RECORDS_PER_PET) {
    throw new AppError(
      400,
      `Maximum ${MAX_RECORDS_PER_PET} medical records per pet`,
      'MEDICAL_RECORD_LIMIT',
    )
  }

  const inserted = await pool.query<RecordRow>(
    `INSERT INTO pet_medical_records (
       pet_id, visited_on, clinic_name, doctor_name, procedure_label, notes
     ) VALUES ($1, $2::date, $3, $4, $5, $6)
     RETURNING id, visited_on, clinic_name, doctor_name, procedure_label, notes,
               created_at, updated_at`,
    [
      petId,
      data.visitedOn,
      data.clinicName,
      data.doctorName,
      data.procedureLabel,
      data.notes,
    ],
  )
  const row = inserted.rows[0]
  if (!row) {
    throw new AppError(500, 'Failed to create medical record', 'INTERNAL_ERROR')
  }
  await pool.query('UPDATE pets SET updated_at = NOW() WHERE id = $1', [petId])
  return mapRecord(row, [])
}

export async function updatePetMedicalRecord(
  userId: number,
  petId: number,
  recordId: number,
  input: UpsertMedicalRecordInput,
): Promise<PetMedicalRecord> {
  await assertOwnsRecord(userId, petId, recordId)
  const data = validateRecordInput(input)

  const updated = await pool.query<RecordRow>(
    `UPDATE pet_medical_records SET
       visited_on = $3::date,
       clinic_name = $4,
       doctor_name = $5,
       procedure_label = $6,
       notes = $7,
       updated_at = NOW()
     WHERE id = $1 AND pet_id = $2
     RETURNING id, visited_on, clinic_name, doctor_name, procedure_label, notes,
               created_at, updated_at`,
    [
      recordId,
      petId,
      data.visitedOn,
      data.clinicName,
      data.doctorName,
      data.procedureLabel,
      data.notes,
    ],
  )
  if (!updated.rows[0]) {
    throw new AppError(404, 'Medical record not found', 'NOT_FOUND')
  }
  await pool.query('UPDATE pets SET updated_at = NOW() WHERE id = $1', [petId])
  return getRecordById(petId, recordId)
}

export async function deletePetMedicalRecord(
  userId: number,
  petId: number,
  recordId: number,
): Promise<void> {
  await assertOwnsRecord(userId, petId, recordId)

  const photos = await pool.query<{ path: string }>(
    'SELECT path FROM pet_medical_photos WHERE record_id = $1',
    [recordId],
  )
  const deleted = await pool.query(
    'DELETE FROM pet_medical_records WHERE id = $1 AND pet_id = $2',
    [recordId, petId],
  )
  if (deleted.rowCount === 0) {
    throw new AppError(404, 'Medical record not found', 'NOT_FOUND')
  }
  for (const row of photos.rows) {
    await deleteUploadIfExists(row.path)
  }
  await pool.query('UPDATE pets SET updated_at = NOW() WHERE id = $1', [petId])
}

async function saveMedicalFile(
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
  const relativePath = `pets/medical/pet-${petId}-${randomBytes(6).toString('hex')}${ext}`
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

export async function uploadPetMedicalPhoto(
  userId: number,
  petId: number,
  recordId: number,
  file: MultipartFile,
): Promise<PetMedicalPhoto> {
  await assertOwnsRecord(userId, petId, recordId)

  const countR = await pool.query<{ c: string }>(
    'SELECT COUNT(*)::text AS c FROM pet_medical_photos WHERE record_id = $1',
    [recordId],
  )
  if (Number(countR.rows[0]?.c ?? 0) >= MAX_PHOTOS_PER_RECORD) {
    throw new AppError(
      400,
      `Maximum ${MAX_PHOTOS_PER_RECORD} photos per medical record`,
      'MEDICAL_PHOTO_LIMIT',
    )
  }

  const relativePath = await saveMedicalFile(petId, file)
  const sortR = await pool.query<{ next: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM pet_medical_photos WHERE record_id = $1',
    [recordId],
  )
  const sortOrder = sortR.rows[0]?.next ?? 0

  try {
    const inserted = await pool.query<PhotoRow>(
      `INSERT INTO pet_medical_photos (record_id, path, sort_order)
       VALUES ($1, $2, $3)
       RETURNING id, record_id, path, sort_order, created_at`,
      [recordId, relativePath, sortOrder],
    )
    const row = inserted.rows[0]
    if (!row) {
      throw new AppError(500, 'Failed to save medical photo', 'INTERNAL_ERROR')
    }
    await pool.query(
      'UPDATE pet_medical_records SET updated_at = NOW() WHERE id = $1',
      [recordId],
    )
    await pool.query('UPDATE pets SET updated_at = NOW() WHERE id = $1', [petId])
    return mapPhoto(row)
  } catch (err) {
    await deleteUploadIfExists(relativePath)
    throw err
  }
}

export async function replacePetMedicalPhotoFile(
  userId: number,
  petId: number,
  recordId: number,
  photoId: number,
  file: MultipartFile,
): Promise<PetMedicalPhoto> {
  await assertOwnsRecord(userId, petId, recordId)

  const existing = await pool.query<{ path: string }>(
    'SELECT path FROM pet_medical_photos WHERE id = $1 AND record_id = $2',
    [photoId, recordId],
  )
  const row = existing.rows[0]
  if (!row) {
    throw new AppError(404, 'Medical photo not found', 'NOT_FOUND')
  }

  await replaceImageUpload(row.path, file)
  await pool.query(
    'UPDATE pet_medical_records SET updated_at = NOW() WHERE id = $1',
    [recordId],
  )
  await pool.query('UPDATE pets SET updated_at = NOW() WHERE id = $1', [petId])

  const refreshed = await pool.query<PhotoRow>(
    `SELECT id, record_id, path, sort_order, created_at
     FROM pet_medical_photos
     WHERE id = $1 AND record_id = $2`,
    [photoId, recordId],
  )
  const updated = refreshed.rows[0]
  if (!updated) {
    throw new AppError(500, 'Failed to load medical photo', 'INTERNAL_ERROR')
  }
  return mapPhoto(updated)
}

export async function deletePetMedicalPhoto(
  userId: number,
  petId: number,
  recordId: number,
  photoId: number,
): Promise<void> {
  await assertOwnsRecord(userId, petId, recordId)

  const r = await pool.query<{ path: string }>(
    `DELETE FROM pet_medical_photos
     WHERE id = $1 AND record_id = $2
     RETURNING path`,
    [photoId, recordId],
  )
  const deleted = r.rows[0]
  if (!deleted) {
    throw new AppError(404, 'Medical photo not found', 'NOT_FOUND')
  }
  await deleteUploadIfExists(deleted.path)
  await pool.query(
    'UPDATE pet_medical_records SET updated_at = NOW() WHERE id = $1',
    [recordId],
  )
  await pool.query('UPDATE pets SET updated_at = NOW() WHERE id = $1', [petId])
}

export async function deleteAllPetMedicalFiles(petId: number): Promise<void> {
  const r = await pool.query<{ path: string }>(
    `SELECT mp.path
     FROM pet_medical_photos mp
     INNER JOIN pet_medical_records mr ON mr.id = mp.record_id
     WHERE mr.pet_id = $1`,
    [petId],
  )
  for (const row of r.rows) {
    await deleteUploadIfExists(row.path)
  }
}
