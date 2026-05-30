import { randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'

import { AppError } from './errors.js'
import { normalizePostMediaMime, resolvePostMediaKind } from './save-post-media.js'
import { ensureUploadParentDir, resolveUploadAbsolutePath } from './uploads.js'

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function normalizeListingMediaMime(mime: string, filename?: string | null): string {
  return normalizePostMediaMime(mime, filename)
}

export function assertListingImageMime(mime: string): void {
  if (!IMAGE_MIME.has(mime)) {
    throw new AppError(
      400,
      'Only JPEG, PNG, WebP, and GIF images are allowed for listings',
      'INVALID_FILE_TYPE',
    )
  }
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

export async function saveListingMediaBuffer(
  listingId: number,
  buffer: Buffer,
  mime: string,
): Promise<{ kind: 'image'; path: string }> {
  const normalized = normalizeListingMediaMime(mime)
  if (resolvePostMediaKind(normalized) !== 'image') {
    throw new AppError(
      400,
      'Only JPEG, PNG, WebP, and GIF images are allowed for listings',
      'INVALID_FILE_TYPE',
    )
  }
  assertListingImageMime(normalized)

  const ext = EXT_BY_MIME[normalized] ?? '.jpg'
  const relativePath = `listings/listing-${listingId}-${randomBytes(6).toString('hex')}${ext}`

  await ensureUploadParentDir(relativePath)
  try {
    await writeFile(resolveUploadAbsolutePath(relativePath), buffer)
  } catch {
    throw new AppError(500, 'Could not save uploaded file', 'UPLOAD_FAILED')
  }

  return { kind: 'image', path: relativePath }
}
