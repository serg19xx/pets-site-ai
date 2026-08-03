import { createHmac, timingSafeEqual } from 'node:crypto'
import type { PoolClient } from 'pg'

import { config } from '../config.js'
import { pool } from '../db/pool.js'
import { AppError } from '../lib/errors.js'

export interface BetaStatus {
  acceptedCount: number
  capacity: number
  open: boolean
  /** Public soft-launch invite code for /invite CTAs (same value the API validates). */
  inviteToken: string
}

function expectedInviteToken(): string {
  return config.betaInviteToken
}

export function isValidBetaInvite(token: string | null | undefined): boolean {
  if (!token) {
    return false
  }
  const expected = expectedInviteToken()
  const provided = Buffer.from(token.trim())
  const target = Buffer.from(expected)
  if (provided.length !== target.length) {
    return false
  }
  return timingSafeEqual(provided, target)
}

export async function getBetaStatus(): Promise<BetaStatus> {
  const result = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM users WHERE is_beta_tester = TRUE',
  )
  const acceptedCount = Number(result.rows[0]?.count ?? 0)
  const capacity = config.betaTesterCapacity
  return {
    acceptedCount,
    capacity,
    open: acceptedCount < capacity,
    inviteToken: expectedInviteToken(),
  }
}

/** Claim a beta seat inside an open transaction. Throws if full or already a tester. */
export async function claimBetaTesterSeat(
  client: PoolClient,
  userId: number,
): Promise<void> {
  await client.query(`SELECT pg_advisory_xact_lock(hashtext('pets_beta_tester_cap'))`)

  const lock = await client.query(
    `SELECT id, is_beta_tester FROM users WHERE id = $1 FOR UPDATE`,
    [userId],
  )
  const row = lock.rows[0] as { id: string; is_beta_tester: boolean } | undefined
  if (!row) {
    throw new AppError(404, 'User not found', 'NOT_FOUND')
  }
  if (row.is_beta_tester) {
    return
  }

  const countResult = await client.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM users WHERE is_beta_tester = TRUE',
  )
  const acceptedCount = Number(countResult.rows[0]?.count ?? 0)
  if (acceptedCount >= config.betaTesterCapacity) {
    throw new AppError(
      409,
      'The founding beta tester group is full. You can still use PetFriends as a regular member.',
      'BETA_FULL',
    )
  }

  await client.query(
    `UPDATE users
     SET is_beta_tester = TRUE,
         beta_terms_accepted_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [userId],
  )
}

export async function joinBetaTester(input: {
  userId: number
  betaInvite: string
  acceptedTerms: boolean
}): Promise<{ message: string; isBetaTester: true }> {
  if (!input.acceptedTerms) {
    throw new AppError(400, 'You must accept the beta tester terms', 'TERMS_REQUIRED')
  }
  if (!isValidBetaInvite(input.betaInvite)) {
    throw new AppError(400, 'Invalid or missing invite', 'INVALID_INVITE')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await claimBetaTesterSeat(client, input.userId)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  return {
    message: 'Welcome to the founding beta tester group.',
    isBetaTester: true,
  }
}

/** Dev helper: deterministic token preview (same as config). */
export function previewInviteTokenFromSecret(secret: string): string {
  return createHmac('sha256', secret).update('pets-beta-invite-v1').digest('base64url')
}
