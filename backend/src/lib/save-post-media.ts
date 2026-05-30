import type { MultipartFile } from '@fastify/multipart'
import { randomBytes } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'

import { AppError } from './errors.js'
import { ensureUploadParentDir, resolveUploadAbsolutePath } from './uploads.js'

export type PostMediaKind = 'image' | 'video'

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime'])

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
}

export function normalizePostMediaMime(mime: string, filename?: string | null): string {
  if (mime && mime !== 'application/octet-stream') {
    return mime
  }
  const name = (filename ?? '').toLowerCase()
  if (name.endsWith('.png')) {
    return 'image/png'
  }
  if (name.endsWith('.webp')) {
    return 'image/webp'
  }
  if (name.endsWith('.gif')) {
    return 'image/gif'
  }
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) {
    return 'image/jpeg'
  }
  if (name.endsWith('.mp4')) {
    return 'video/mp4'
  }
  if (name.endsWith('.webm')) {
    return 'video/webm'
  }
  if (name.endsWith('.mov')) {
    return 'video/quicktime'
  }
  return mime || 'application/octet-stream'
}

export function resolvePostMediaKind(mime: string): PostMediaKind | null {
  if (IMAGE_MIME.has(mime)) {
    return 'image'
  }
  if (VIDEO_MIME.has(mime)) {
    return 'video'
  }
  return null
}

export async function savePostMediaBuffer(
  postId: number,
  buffer: Buffer,
  mime: string,
): Promise<{ kind: PostMediaKind; path: string }> {
  const kind = resolvePostMediaKind(mime)
  if (!kind) {
    throw new AppError(
      400,
      'Only JPEG, PNG, WebP, GIF images or MP4, WebM, MOV videos are allowed',
      'INVALID_FILE_TYPE',
    )
  }

  const ext = EXT_BY_MIME[mime] ?? (kind === 'video' ? '.mp4' : '.jpg')
  const relativePath = `posts/post-${postId}-${randomBytes(6).toString('hex')}${ext}`

  await ensureUploadParentDir(relativePath)
  try {
    await writeFile(resolveUploadAbsolutePath(relativePath), buffer)
  } catch {
    throw new AppError(500, 'Could not save uploaded file', 'UPLOAD_FAILED')
  }

  return { kind, path: relativePath }
}

export async function savePostMediaFile(
  postId: number,
  file: MultipartFile,
): Promise<{ kind: PostMediaKind; path: string }> {
  const mime = normalizePostMediaMime(file.mimetype, file.filename)
  const kind = resolvePostMediaKind(mime)
  if (!kind) {
    throw new AppError(
      400,
      'Only JPEG, PNG, WebP, GIF images or MP4, WebM, MOV videos are allowed',
      'INVALID_FILE_TYPE',
    )
  }

  const ext = EXT_BY_MIME[mime] ?? (kind === 'video' ? '.mp4' : '.jpg')
  const relativePath = `posts/post-${postId}-${randomBytes(6).toString('hex')}${ext}`
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

  return { kind, path: relativePath }
}
