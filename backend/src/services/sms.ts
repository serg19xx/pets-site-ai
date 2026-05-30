import { config } from '../config.js'
import { AppError } from '../lib/errors.js'

export type SmsTransport = 'twilio' | 'console'

export function getSmsTransport(): SmsTransport {
  if (config.twilioAccountSid && config.twilioAuthToken && config.twilioFromNumber) {
    return 'twilio'
  }
  return 'console'
}

export interface SendSmsInput {
  to: string
  body: string
}

function sendToConsole(input: SendSmsInput): void {
  console.info('\n--- PETS SMS (Twilio not configured) ---')
  console.info(`To: ${input.to}`)
  console.info(input.body)
  console.info('--- end SMS ---\n')
}

async function sendViaTwilio(input: SendSmsInput): Promise<void> {
  const accountSid = config.twilioAccountSid
  const authToken = config.twilioAuthToken
  const from = config.twilioFromNumber
  if (!accountSid || !authToken || !from) {
    throw new AppError(500, 'Twilio is not configured', 'SMS_NOT_CONFIGURED')
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const params = new URLSearchParams({
    To: input.to,
    From: from,
    Body: input.body,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400)
    throw new AppError(502, `Could not send SMS (${response.status}): ${detail}`, 'SMS_SEND_FAILED')
  }
}

export async function sendSms(input: SendSmsInput): Promise<void> {
  const mode = getSmsTransport()
  try {
    if (mode === 'twilio') {
      await sendViaTwilio(input)
      return
    }
    sendToConsole(input)
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(502, 'Could not send SMS', 'SMS_SEND_FAILED')
  }
}

export function logSmsSetup(log: {
  info: (msg: string) => void
  warn: (msg: string) => void
}): void {
  const mode = getSmsTransport()
  if (mode === 'console') {
    log.warn(
      'SMS: TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER not set — SMS print to console.',
    )
    return
  }
  log.info('SMS: sending via Twilio')
}
