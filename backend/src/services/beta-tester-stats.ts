import { pool } from '../db/pool.js'
import { assertAdmin } from '../lib/admin.js'
import { resolveDisplayName } from '../types/user.js'

export interface BetaTesterStats {
  id: number
  displayName: string
  email: string
  bugCount: number
  acceptedImprovementCount: number
  pendingImprovementCount: number
  rejectedImprovementCount: number
  joinedAt: string | null
}

/**
 * Bonus-oriented tester activity: bugs filed + improvements accepted into work.
 */
export async function listBetaTesterStats(input: {
  adminUserId: number
}): Promise<{ testers: BetaTesterStats[]; total: number }> {
  await assertAdmin(input.adminUserId)

  const result = await pool.query<{
    id: string
    full_name: string
    nickname: string
    email: string
    beta_terms_accepted_at: Date | null
    bug_count: string
    accepted_improvement_count: string
    pending_improvement_count: string
    rejected_improvement_count: string
  }>(
    `SELECT
       u.id,
       u.full_name,
       u.nickname,
       u.email,
       u.beta_terms_accepted_at,
       COUNT(*) FILTER (WHERE t.type = 'bug')::text AS bug_count,
       COUNT(*) FILTER (
         WHERE t.type = 'improvement' AND t.improvement_decision = 'accepted'
       )::text AS accepted_improvement_count,
       COUNT(*) FILTER (
         WHERE t.type = 'improvement' AND t.improvement_decision = 'pending'
       )::text AS pending_improvement_count,
       COUNT(*) FILTER (
         WHERE t.type = 'improvement' AND t.improvement_decision = 'rejected'
       )::text AS rejected_improvement_count
     FROM users u
     LEFT JOIN feedback_tickets t ON t.user_id = u.id
     WHERE u.is_beta_tester = TRUE
     GROUP BY u.id
     ORDER BY
       (COUNT(*) FILTER (WHERE t.type = 'bug')
         + COUNT(*) FILTER (
           WHERE t.type = 'improvement' AND t.improvement_decision = 'accepted'
         )) DESC,
       u.email ASC`,
  )

  const testers = result.rows.map((row) => ({
    id: Number(row.id),
    displayName: resolveDisplayName(row.full_name, row.nickname),
    email: row.email,
    bugCount: Number(row.bug_count),
    acceptedImprovementCount: Number(row.accepted_improvement_count),
    pendingImprovementCount: Number(row.pending_improvement_count),
    rejectedImprovementCount: Number(row.rejected_improvement_count),
    joinedAt: row.beta_terms_accepted_at?.toISOString() ?? null,
  }))

  return { testers, total: testers.length }
}
