import { apiUrl } from '~/lib/api'
import { ApiError } from '~/lib/auth'

interface ApiErrorBody {
  code?: string
  message?: string
}

async function requestJson<T>(
  path: string,
  init: RequestInit & { accessToken: string },
): Promise<T> {
  const { accessToken, ...rest } = init
  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string> | undefined),
  }
  if (rest.body && !(rest.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  headers.Authorization = `Bearer ${accessToken}`
  const response = await fetch(apiUrl(path), { ...rest, headers })
  if (response.status === 204) {
    return undefined as T
  }
  const text = await response.text()
  let body = {} as T & ApiErrorBody
  if (text) {
    try {
      body = JSON.parse(text) as T & ApiErrorBody
    } catch {
      throw new ApiError('Invalid server response', response.status, 'INVALID_RESPONSE')
    }
  }
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
  return body as T
}

export type FeedbackTicketType = 'bug' | 'improvement'
export type FeedbackTicketStatus = 'open' | 'closed'
export type FeedbackImprovementDecision = 'pending' | 'accepted' | 'rejected'

export interface FeedbackAuthor {
  id: number
  displayName: string
  email: string
  isAdmin: boolean
}

export interface FeedbackTicketSummary {
  id: number
  type: FeedbackTicketType
  status: FeedbackTicketStatus
  improvementDecision: FeedbackImprovementDecision | null
  decisionNote: string | null
  decidedAt: string | null
  message: string
  pagePath: string | null
  deviceClass: string
  osLabel: string | null
  browserLabel: string | null
  hasScreenshot: boolean
  hasConsoleText: boolean
  createdAt: string
  updatedAt: string
  author: FeedbackAuthor
  messageCount: number
}

export interface FeedbackTicketDetail extends FeedbackTicketSummary {
  userAgent: string | null
  consoleText: string | null
  screenshotUrl: string | null
  messages: Array<{
    id: number
    body: string
    createdAt: string
    author: FeedbackAuthor
  }>
}

export async function fetchFeedbackTickets(
  accessToken: string,
  params?: { limit?: number; offset?: number },
): Promise<{ tickets: FeedbackTicketSummary[]; total: number }> {
  const search = new URLSearchParams({ scope: 'all' })
  if (params?.limit !== undefined) {
    search.set('limit', String(params.limit))
  }
  if (params?.offset !== undefined) {
    search.set('offset', String(params.offset))
  }
  return requestJson(`/api/feedback/tickets?${search}`, { accessToken })
}

export async function fetchFeedbackTicket(
  ticketId: number,
  accessToken: string,
): Promise<{ ticket: FeedbackTicketDetail }> {
  return requestJson(`/api/feedback/tickets/${ticketId}`, { accessToken })
}

export async function replyFeedbackTicket(
  ticketId: number,
  accessToken: string,
  body: string,
): Promise<{ ticket: FeedbackTicketDetail }> {
  return requestJson(`/api/feedback/tickets/${ticketId}/replies`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ body }),
  })
}

export async function updateFeedbackTicketStatus(
  ticketId: number,
  accessToken: string,
  status: FeedbackTicketStatus,
): Promise<{ ticket: FeedbackTicketDetail }> {
  return requestJson(`/api/feedback/tickets/${ticketId}/status`, {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify({ status }),
  })
}

export async function decideFeedbackImprovement(
  ticketId: number,
  accessToken: string,
  decision: 'accepted' | 'rejected',
  note: string,
): Promise<{ ticket: FeedbackTicketDetail }> {
  return requestJson(`/api/feedback/tickets/${ticketId}/decision`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ decision, note }),
  })
}

export interface AdminUserRow {
  id: number
  fullName: string
  nickname: string
  displayName: string
  email: string
  isBetaTester: boolean
  isAdmin: boolean
  emailVerified: boolean
  createdAt: string
}

export async function fetchAdminUsers(
  accessToken: string,
  params?: { limit?: number; offset?: number; q?: string },
): Promise<{ users: AdminUserRow[]; total: number }> {
  const search = new URLSearchParams()
  if (params?.limit !== undefined) {
    search.set('limit', String(params.limit))
  }
  if (params?.offset !== undefined) {
    search.set('offset', String(params.offset))
  }
  if (params?.q) {
    search.set('q', params.q)
  }
  const qs = search.toString()
  return requestJson(`/api/admin/users${qs ? `?${qs}` : ''}`, { accessToken })
}

export async function deleteAdminUser(
  userId: number,
  accessToken: string,
): Promise<void> {
  await requestJson(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    accessToken,
  })
}

export interface BetaTesterStatsRow {
  id: number
  displayName: string
  email: string
  bugCount: number
  acceptedImprovementCount: number
  pendingImprovementCount: number
  rejectedImprovementCount: number
  joinedAt: string | null
}

export async function fetchBetaTesterStats(
  accessToken: string,
): Promise<{ testers: BetaTesterStatsRow[]; total: number }> {
  return requestJson('/api/admin/testers', { accessToken })
}

export interface BetaAnnouncementRow {
  id: number
  title: string
  body: string
  linkPath: string | null
  createdAt: string
  recipientCount?: number
}

export async function fetchBetaAnnouncements(
  accessToken: string,
): Promise<{ announcements: BetaAnnouncementRow[]; total: number }> {
  return requestJson('/api/admin/announcements', { accessToken })
}

export async function createBetaAnnouncement(
  accessToken: string,
  input: { title: string; body: string; linkPath?: string | null },
): Promise<{ announcement: BetaAnnouncementRow }> {
  return requestJson('/api/admin/announcements', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(input),
  })
}

export interface AdminSpeciesRow {
  id: number
  slug: string
  label: string
  isActive: boolean
  petCount: number
}

export async function fetchAdminSpecies(
  accessToken: string,
): Promise<{ species: AdminSpeciesRow[] }> {
  return requestJson('/api/admin/species', { accessToken })
}

export async function setAdminSpeciesActive(
  speciesId: number,
  isActive: boolean,
  accessToken: string,
): Promise<{ species: AdminSpeciesRow }> {
  return requestJson(`/api/admin/species/${speciesId}`, {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify({ isActive }),
  })
}

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const normalized = path.startsWith('/') ? path : `/${path}`
  const config = useRuntimeConfig()
  const base = String(config.public.apiBase ?? '').replace(/\/$/, '')
  return base ? `${base}${normalized}` : normalized
}
