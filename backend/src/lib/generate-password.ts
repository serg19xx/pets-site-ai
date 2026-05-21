import { randomBytes } from 'node:crypto'

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

/** Readable temporary password (no ambiguous 0/O, 1/l). */
export function generateTemporaryPassword(length = 14): string {
  const bytes = randomBytes(length)
  let result = ''
  for (let i = 0; i < length; i += 1) {
    result += CHARSET[bytes[i]! % CHARSET.length]
  }
  return result
}
