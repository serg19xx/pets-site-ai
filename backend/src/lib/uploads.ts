import { createWriteStream } from 'node:fs'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { randomBytes } from 'node:crypto'

import type { MultipartFile } from '@fastify/multipart'

import { config } from '../config.js'
import { AppError } from './errors.js'

/** Subfolders under uploads/ — `pets` reserved for animal photos. */
export type UploadCategory = 'avatars' | 'pets' | 'feedback'

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

export function buildPublicUploadUrl(relativePath: string): string {
  return `${config.uploadsPublicPrefix}/${relativePath.replace(/^\//, '')}`
}

export function resolveUploadAbsolutePath(relativePath: string): string {
  const normalized = relativePath.replace(/^\//, '').replace(/\.\./g, '')
  return join(config.uploadsDir, normalized)
}

export async function ensureUploadParentDir(relativePath: string): Promise<void> {
  await mkdir(dirname(resolveUploadAbsolutePath(relativePath)), { recursive: true })
}

export async function saveImageUpload(
  category: UploadCategory,
  file: MultipartFile,
  ownerId: number,
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
  const ownerPrefix =
    category === 'avatars' ? 'user' : category === 'feedback' ? 'fb' : 'pet'
  const relativePath = `${category}/${ownerPrefix}-${ownerId}-${randomBytes(6).toString('hex')}${ext}`
  const absolutePath = resolveUploadAbsolutePath(relativePath)

  const stream = file.file
  if (!stream) {
    throw new AppError(400, 'No file uploaded', 'VALIDATION_ERROR')
  }

  await pipeline(stream, createWriteStream(absolutePath))

  return relativePath
}

/** Prefer this for multipart handlers that must drain each part before the next. */
export async function saveImageBuffer(
  category: UploadCategory,
  buffer: Buffer,
  mime: string,
  ownerId: number,
): Promise<string> {
  if (!ALLOWED_MIME.has(mime)) {
    throw new AppError(
      400,
      'Only JPEG, PNG, WebP, or GIF images are allowed',
      'INVALID_FILE_TYPE',
    )
  }

  const ext = EXT_BY_MIME[mime] ?? '.jpg'
  const ownerPrefix =
    category === 'avatars' ? 'user' : category === 'feedback' ? 'fb' : 'pet'
  const relativePath = `${category}/${ownerPrefix}-${ownerId}-${randomBytes(6).toString('hex')}${ext}`

  await ensureUploadParentDir(relativePath)
  try {
    await writeFile(resolveUploadAbsolutePath(relativePath), buffer)
  } catch {
    throw new AppError(500, 'Could not save uploaded file', 'UPLOAD_FAILED')
  }

  return relativePath
}

export async function replaceImageUpload(
  relativePath: string,
  file: MultipartFile,
): Promise<void> {
  const mime = file.mimetype
  if (!ALLOWED_MIME.has(mime)) {
    throw new AppError(
      400,
      'Only JPEG, PNG, WebP, or GIF images are allowed',
      'INVALID_FILE_TYPE',
    )
  }
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
}

export async function deleteUploadIfExists(relativePath: string | null): Promise<void> {
  if (!relativePath) {
    return
  }
  try {
    await unlink(resolveUploadAbsolutePath(relativePath))
  } catch {
    /* file may already be gone */
  }
}
