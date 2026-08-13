import { config } from '../config.js'
import { AppError } from '../lib/errors.js'
import { sendEmail } from './email.js'

const RATE_WINDOW_MS = 60 * 60 * 1000
const RATE_MAX = 4
const hits = new Map<string, number[]>()

export interface ContactMessageInput {
  name: string
  email: string
  message: string
  /** Honeypot — if filled, pretend success and skip send. */
  company?: string
  clientKey: string
}

function prune(timestamps: number[], now: number): number[] {
  return timestamps.filter((at) => now - at < RATE_WINDOW_MS)
}

function assertRateLimit(key: string): void {
  const now = Date.now()
  const next = prune(hits.get(key) ?? [], now)
  if (next.length >= RATE_MAX) {
    throw new AppError(
      429,
      'Too many messages. Please try again later.',
      'RATE_LIMITED',
    )
  }
  next.push(now)
  hits.set(key, next)
}

function escapeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export async function sendContactMessage(input: ContactMessageInput): Promise<void> {
  if (input.company?.trim()) {
    return
  }

  const name = escapeText(input.name)
  const email = input.email.trim().toLowerCase()
  const message = input.message.trim()

  if (!name || !email || !message) {
    throw new AppError(400, 'Name, email, and message are required', 'VALIDATION_ERROR')
  }

  const recipients = config.adminEmails
  if (recipients.length === 0) {
    throw new AppError(503, 'Contact form is not configured', 'CONTACT_NOT_CONFIGURED')
  }

  assertRateLimit(`ip:${input.clientKey}`)
  assertRateLimit(`email:${email}`)

  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    '',
    message,
  ].join('\n')

  await Promise.all(
    recipients.map((to) =>
      sendEmail({
        to,
        replyTo: email,
        subject: `Pet Friends contact: ${name}`,
        text,
      }),
    ),
  )
}
