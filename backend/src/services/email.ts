import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

import { config } from '../config.js'
import { AppError } from '../lib/errors.js'

let transporter: Transporter | null = null

export type EmailTransport = 'resend' | 'smtp' | 'console'

export function getEmailTransport(): EmailTransport {
  return config.emailTransport()
}

function getSmtpTransporter(): Transporter | null {
  if (!config.smtp.host) {
    return null
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth:
        config.smtp.user && config.smtp.pass
          ? { user: config.smtp.user, pass: config.smtp.pass }
          : undefined,
    })
  }
  return transporter
}

export interface SendEmailInput {
  to: string
  subject: string
  text: string
  html?: string
}

async function sendViaResend(input: SendEmailInput): Promise<void> {
  const apiKey = config.resendApiKey
  if (!apiKey) {
    throw new AppError(500, 'RESEND_API_KEY is not configured', 'EMAIL_NOT_CONFIGURED')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.emailFrom,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html ?? input.text.replace(/\n/g, '<br>'),
    }),
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400)
    if (response.status === 403 && detail.includes('only send testing emails')) {
      throw new AppError(
        502,
        'Resend test mode: email can only be sent to the address of your Resend account. Sign up with that email, or verify a domain at resend.com.',
        'EMAIL_RECIPIENT_NOT_ALLOWED',
      )
    }
    throw new AppError(
      502,
      `Could not send email (${response.status}): ${detail}`,
      'EMAIL_SEND_FAILED',
    )
  }
}

async function sendViaSmtp(input: SendEmailInput): Promise<void> {
  const transport = getSmtpTransporter()
  if (!transport) {
    throw new AppError(500, 'SMTP is not configured', 'EMAIL_NOT_CONFIGURED')
  }

  await transport.sendMail({
    from: config.emailFrom,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html ?? input.text.replace(/\n/g, '<br>'),
  })
}

function sendToConsole(input: SendEmailInput): void {
  console.info('\n--- PETS email (no RESEND_API_KEY / SMTP_HOST) ---')
  console.info(`To: ${input.to}`)
  console.info(`Subject: ${input.subject}`)
  console.info(input.text)
  console.info('--- end email ---\n')
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const mode = getEmailTransport()

  try {
    if (mode === 'resend') {
      await sendViaResend(input)
      return
    }
    if (mode === 'smtp') {
      await sendViaSmtp(input)
      return
    }
    sendToConsole(input)
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(502, 'Could not send email', 'EMAIL_SEND_FAILED')
  }
}

export function logEmailSetup(log: {
  info: (msg: string) => void
  warn: (msg: string) => void
}): void {
  const mode = getEmailTransport()
  if (mode === 'console') {
    log.warn(
      'Email: RESEND_API_KEY or SMTP_HOST not set — letters print to console. Add RESEND_API_KEY to backend/.env',
    )
    return
  }
  log.info(`Email: sending via ${mode}`)
}

export function buildVerifyUrl(rawToken: string): string {
  return `${config.frontendUrl}/app/auth/verify?token=${encodeURIComponent(rawToken)}`
}

export function buildMagicLoginUrl(rawToken: string): string {
  return `${config.frontendUrl}/app/auth/magic?token=${encodeURIComponent(rawToken)}`
}
