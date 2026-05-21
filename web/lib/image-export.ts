export interface ExportImageOptions {
  fileName: string
  maxSize: number
  mimeType?: 'image/jpeg' | 'image/webp'
  quality?: number
}

function scaleCanvas(source: HTMLCanvasElement, maxSize: number): HTMLCanvasElement {
  const largest = Math.max(source.width, source.height)
  if (largest <= maxSize) {
    return source
  }

  const scale = maxSize / largest
  const width = Math.round(source.width * scale)
  const height = Math.round(source.height * scale)
  const scaled = document.createElement('canvas')
  scaled.width = width
  scaled.height = height

  const ctx = scaled.getContext('2d')
  if (!ctx) {
    return source
  }

  ctx.drawImage(source, 0, 0, width, height)
  return scaled
}

export function exportCanvasToFile(
  canvas: HTMLCanvasElement,
  options: ExportImageOptions,
): Promise<File> {
  const {
    fileName,
    maxSize,
    mimeType = 'image/jpeg',
    quality = 0.88,
  } = options

  const scaled = scaleCanvas(canvas, maxSize)

  return new Promise((resolve, reject) => {
    scaled.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not process image'))
          return
        }
        resolve(new File([blob], fileName, { type: mimeType }))
      },
      mimeType,
      quality,
    )
  })
}

export const MAX_IMAGE_PICK_BYTES = 12 * 1024 * 1024

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Please choose an image file.'
  }
  if (file.size > MAX_IMAGE_PICK_BYTES) {
    return 'Image is too large (max 12 MB).'
  }
  return null
}
