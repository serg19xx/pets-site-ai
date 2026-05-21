import type { MultipartFile } from '@fastify/multipart'
import { randomBytes } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'

import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'
import { mapPetPhotoRow, type PetPhoto, type PetPhotoRow } from '../lib/map-pet-photo.js'
import {
  deleteUploadIfExists,
  ensureUploadParentDir,
  replaceImageUpload,
  resolveUploadAbsolutePath,
} from '../lib/uploads.js'
import { getPetById } from './pets.js'

const MAX_PHOTOS_PER_PET = 24

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

async function savePetGalleryFile(
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
  const relativePath = `pets/gallery/pet-${petId}-${randomBytes(6).toString('hex')}${ext}`
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

async function listPetPhotoRows(petId: number): Promise<PetPhotoRow[]> {
  const r = await pool.query<PetPhotoRow>(
    `SELECT
      pp.id,
      pp.path,
      pp.sort_order,
      pp.created_at,
      (pp.id = p.cover_photo_id) AS is_cover
    FROM pet_photos pp
    INNER JOIN pets p ON p.id = pp.pet_id
    WHERE pp.pet_id = $1
    ORDER BY pp.sort_order ASC, pp.id ASC`,
    [petId],
  )
  return r.rows
}

export async function listPetPhotosForOwner(userId: number, petId: number): Promise<PetPhoto[]> {
  await getPetById(userId, petId)
  const rows = await listPetPhotoRows(petId)
  return rows.map((row) => mapPetPhotoRow(row))
}

export async function listPetPhotosPublic(petId: number): Promise<PetPhoto[]> {
  const rows = await listPetPhotoRows(petId)
  return rows.map((row) => mapPetPhotoRow(row))
}

export async function uploadPetPhoto(
  userId: number,
  petId: number,
  file: MultipartFile,
): Promise<PetPhoto> {
  await getPetById(userId, petId)

  const countR = await pool.query<{ c: string }>(
    'SELECT COUNT(*)::text AS c FROM pet_photos WHERE pet_id = $1',
    [petId],
  )
  const count = Number(countR.rows[0]?.c ?? 0)
  if (count >= MAX_PHOTOS_PER_PET) {
    throw new AppError(
      400,
      `Maximum ${MAX_PHOTOS_PER_PET} gallery photos per pet`,
      'PHOTO_LIMIT',
    )
  }

  const relativePath = await savePetGalleryFile(petId, file)

  const sortR = await pool.query<{ next: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM pet_photos WHERE pet_id = $1',
    [petId],
  )
  const sortOrder = sortR.rows[0]?.next ?? 0

  try {
    const inserted = await pool.query<PetPhotoRow>(
      `INSERT INTO pet_photos (pet_id, path, sort_order)
       VALUES ($1, $2, $3)
       RETURNING id, path, sort_order, created_at, FALSE AS is_cover`,
      [petId, relativePath, sortOrder],
    )
    const row = inserted.rows[0]
    if (!row) {
      throw new AppError(500, 'Failed to save photo', 'INTERNAL_ERROR')
    }

    const photoId = Number(row.id)
    const coverR = await pool.query<{ cover_photo_id: string | null }>(
      'SELECT cover_photo_id FROM pets WHERE id = $1',
      [petId],
    )
    if (!coverR.rows[0]?.cover_photo_id) {
      await pool.query(
        'UPDATE pets SET cover_photo_id = $1, updated_at = NOW() WHERE id = $2',
        [photoId, petId],
      )
      row.is_cover = true
    } else {
      await pool.query('UPDATE pets SET updated_at = NOW() WHERE id = $1', [petId])
    }

    return mapPetPhotoRow(row)
  } catch (err) {
    await deleteUploadIfExists(relativePath)
    throw err
  }
}

export async function setPetCoverPhoto(
  userId: number,
  petId: number,
  photoId: number,
): Promise<Awaited<ReturnType<typeof getPetById>>> {
  await getPetById(userId, petId)

  const photo = await pool.query('SELECT 1 FROM pet_photos WHERE id = $1 AND pet_id = $2', [
    photoId,
    petId,
  ])
  if (photo.rowCount === 0) {
    throw new AppError(404, 'Photo not found', 'NOT_FOUND')
  }

  await pool.query(
    'UPDATE pets SET cover_photo_id = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
    [photoId, petId, userId],
  )

  return getPetById(userId, petId)
}

export async function replacePetPhotoFile(
  userId: number,
  petId: number,
  photoId: number,
  file: MultipartFile,
): Promise<PetPhoto> {
  await getPetById(userId, petId)

  const existing = await pool.query<{ path: string }>(
    'SELECT path FROM pet_photos WHERE id = $1 AND pet_id = $2',
    [photoId, petId],
  )
  const row = existing.rows[0]
  if (!row) {
    throw new AppError(404, 'Photo not found', 'NOT_FOUND')
  }

  await replaceImageUpload(row.path, file)
  await pool.query('UPDATE pets SET updated_at = NOW() WHERE id = $1', [petId])

  const refreshed = await pool.query<PetPhotoRow>(
    `SELECT
      pp.id,
      pp.path,
      pp.sort_order,
      pp.created_at,
      (pp.id = p.cover_photo_id) AS is_cover
    FROM pet_photos pp
    INNER JOIN pets p ON p.id = pp.pet_id
    WHERE pp.id = $1 AND pp.pet_id = $2`,
    [photoId, petId],
  )
  const updated = refreshed.rows[0]
  if (!updated) {
    throw new AppError(500, 'Failed to load photo', 'INTERNAL_ERROR')
  }
  return mapPetPhotoRow(updated)
}

export async function deletePetPhoto(
  userId: number,
  petId: number,
  photoId: number,
): Promise<void> {
  await getPetById(userId, petId)

  const coverR = await pool.query<{ cover_photo_id: string | null }>(
    'SELECT cover_photo_id FROM pets WHERE id = $1',
    [petId],
  )
  const coverId = coverR.rows[0]?.cover_photo_id
  if (coverId !== null && Number(coverId) === photoId) {
    throw new AppError(
      400,
      'Cannot delete the profile photo. Choose another photo as profile first.',
      'COVER_PHOTO',
    )
  }

  const r = await pool.query<{ path: string }>(
    `DELETE FROM pet_photos
     WHERE id = $1 AND pet_id = $2
     RETURNING path`,
    [photoId, petId],
  )
  const deleted = r.rows[0]
  if (!deleted) {
    throw new AppError(404, 'Photo not found', 'NOT_FOUND')
  }
  await deleteUploadIfExists(deleted.path)
  await pool.query('UPDATE pets SET updated_at = NOW() WHERE id = $1', [petId])
}

export async function deleteAllPetPhotoFiles(petId: number): Promise<void> {
  const r = await pool.query<{ path: string }>(
    'SELECT path FROM pet_photos WHERE pet_id = $1',
    [petId],
  )
  for (const row of r.rows) {
    await deleteUploadIfExists(row.path)
  }
}
