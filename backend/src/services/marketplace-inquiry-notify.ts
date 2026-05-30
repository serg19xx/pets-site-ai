import { config } from '../config.js'
import { normalizeSmsPhone } from '../lib/phone.js'
import { pool } from '../db/pool.js'
import { sendEmail } from './email.js'
import { getSmsTransport, sendSms } from './sms.js'

interface ListingNotifyRow {
  title: string
  inquiry_notify_email: boolean
  inquiry_notify_sms: boolean
  inquiry_sms_phone: string | null
  contact_phone: string | null
  seller_user_id: string
}

interface UserContactRow {
  email: string
  phone: string | null
  full_name: string
  nickname: string
}

export function buildInquiryUrl(inquiryId: number): string {
  return `${config.frontendUrl}/app/marketplace-inquiries/${inquiryId}`
}

async function loadUserContact(userId: number): Promise<UserContactRow | null> {
  const r = await pool.query<UserContactRow>(
    'SELECT email, phone, full_name, nickname FROM users WHERE id = $1',
    [userId],
  )
  return r.rows[0] ?? null
}

function displayName(user: UserContactRow): string {
  return user.nickname?.trim() || user.full_name?.trim() || user.email
}

function truncateBody(body: string, max = 280): string {
  const trimmed = body.trim()
  if (trimmed.length <= max) {
    return trimmed
  }
  return `${trimmed.slice(0, max - 1)}…`
}

async function notifyEmail(to: string, subject: string, text: string): Promise<void> {
  try {
    await sendEmail({ to, subject, text })
  } catch (err) {
    console.error('Inquiry email notification failed:', err)
  }
}

async function notifySms(to: string, body: string): Promise<void> {
  try {
    await sendSms({ to, body })
  } catch (err) {
    console.error('Inquiry SMS notification failed:', err)
  }
}

function resolveSellerSmsPhone(listing: ListingNotifyRow, seller: UserContactRow): string | null {
  const override = listing.inquiry_sms_phone?.trim()
  if (override) {
    return override
  }
  const contact = listing.contact_phone?.trim()
  if (contact) {
    return contact
  }
  return seller.phone?.trim() || null
}

export async function notifyInquiryMessage(params: {
  inquiryId: number
  listingId: number
  senderUserId: number
  recipientUserId: number
  messageBody: string
  isSellerRecipient: boolean
}): Promise<void> {
  const listingR = await pool.query<ListingNotifyRow>(
    `SELECT title, inquiry_notify_email, inquiry_notify_sms, inquiry_sms_phone,
            contact_phone, user_id AS seller_user_id
     FROM marketplace_listings WHERE id = $1`,
    [params.listingId],
  )
  const listing = listingR.rows[0]
  if (!listing) {
    return
  }

  const [sender, recipient] = await Promise.all([
    loadUserContact(params.senderUserId),
    loadUserContact(params.recipientUserId),
  ])
  if (!sender || !recipient) {
    return
  }

  const inquiryUrl = buildInquiryUrl(params.inquiryId)
  const preview = truncateBody(params.messageBody)
  const senderLabel = displayName(sender)
  const subject = `PETS: message about “${listing.title}”`
  const text = [
    `Hello ${displayName(recipient)},`,
    '',
    `${senderLabel} sent you a message about the listing “${listing.title}”:`,
    '',
    preview,
    '',
    `View and reply on PETS: ${inquiryUrl}`,
  ].join('\n')

  const smsBody = `${senderLabel}: ${preview} — ${inquiryUrl}`

  if (params.isSellerRecipient) {
    if (listing.inquiry_notify_email) {
      await notifyEmail(recipient.email, subject, text)
    }
    if (listing.inquiry_notify_sms) {
      const rawPhone = resolveSellerSmsPhone(listing, recipient)
      const phone = rawPhone ? normalizeSmsPhone(rawPhone) : null
      if (!phone) {
        console.warn(
          `[PETS] Inquiry SMS skipped for listing ${params.listingId}: no valid phone (listing SMS field, contact phone, or profile phone)`,
        )
      } else if (getSmsTransport() === 'twilio') {
        await notifySms(phone, smsBody)
      } else {
        await notifySms(phone, smsBody)
        if (!listing.inquiry_notify_email) {
          await notifyEmail(
            recipient.email,
            `PETS: SMS alert — ${listing.title}`,
            [
              'SMS is not configured on the server (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in backend/.env).',
              `Would send to ${phone}:`,
              '',
              smsBody,
              '',
              'Full message:',
              text,
            ].join('\n'),
          )
        }
      }
    }
    return
  }

  await notifyEmail(recipient.email, subject, text)
}
