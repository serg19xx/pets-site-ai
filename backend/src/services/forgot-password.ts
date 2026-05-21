import { pool } from '../db/pool.js'
import { config } from '../config.js'
import { AppError } from '../lib/errors.js'
import { generateTemporaryPassword } from '../lib/generate-password.js'
import { hashPassword } from '../lib/password.js'
import { normalizeEmail } from '../lib/map-user.js'
import { buildVerifyUrl, sendEmail } from './email.js'
import { issueAuthToken } from './auth-tokens.js'

export async function requestPasswordReset(emailInput: string): Promise<{ message: string }> {
  const email = normalizeEmail(emailInput)
  const genericMessage =
    'If an account exists for this email, you will receive instructions shortly.'

  const result = await pool.query<{
    id: string
    nickname: string
    email_verified_at: Date | null
  }>(
    `SELECT id, nickname, email_verified_at FROM users WHERE email = $1`,
    [email],
  )

  const row = result.rows[0]
  if (!row) {
    return { message: genericMessage }
  }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await hashPassword(temporaryPassword)

  await pool.query(
    `UPDATE user_auth
     SET password_hash = $2,
         must_change_password = TRUE,
         password_updated_at = NOW()
     WHERE user_id = $1`,
    [row.id, passwordHash],
  )

  let verifyLine = ''
  if (!row.email_verified_at) {
    const verifyToken = await issueAuthToken(
      Number(row.id),
      'email_verify',
      config.tokenTtlHours.emailVerify,
    )
    verifyLine = `\nVerify your email first:\n${buildVerifyUrl(verifyToken)}\n`
  }

  try {
    await sendEmail({
      to: email,
      subject: 'Your PETS temporary password',
      text: [
        `Hello ${row.nickname},`,
        '',
        'A new temporary password was generated for your account:',
        '',
        `Temporary password: ${temporaryPassword}`,
        verifyLine,
        'Sign in with this password, then you will be asked to set a new one.',
        '',
        'If you did not request this, contact support.',
      ].join('\n'),
    })
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(502, 'Could not send reset email', 'EMAIL_SEND_FAILED')
  }

  if (config.nodeEnv !== 'production') {
    console.info(
      `\n[dev] Password reset for ${email}\n  Temporary password: ${temporaryPassword}\n`,
    )
  }

  return { message: genericMessage }
}
