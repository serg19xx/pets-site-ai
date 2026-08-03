import { apiUrl } from '~/lib/api'
import { ApiError } from '~/lib/auth-api'
import type {
  CreateFeedbackPayload,
  FeedbackAccess,
  FeedbackTicketDetail,
  FeedbackTicketStatus,
  FeedbackTicketSummary,
} from '~/types/feedback'

interface ApiErrorBody {
  code?: string
  message?: string
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text) {
    return {} as T
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError(
      text.slice(0, 200) || 'Invalid server response',
      response.status,
      'INVALID_RESPONSE',
    )
  }
}

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` }
}

async function requestJson<T>(
  path: string,
  init: RequestInit & { accessToken: string },
): Promise<T> {
  const { accessToken, ...rest } = init
  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string> | undefined),
  }
  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData
  if (rest.body && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }
  Object.assign(headers, authHeaders(accessToken) as Record<string, string>)
  const response = await fetch(apiUrl(path), { ...rest, headers })
  const body = await parseJson<T & ApiErrorBody>(response)
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
  return body as T
}

export async function fetchFeedbackAccess(accessToken: string): Promise<FeedbackAccess> {
  return requestJson('/api/feedback/me', { accessToken })
}

export async function fetchFeedbackTickets(
  accessToken: string,
  scope: 'mine' | 'all' = 'mine',
  params?: { limit?: number; offset?: number },
): Promise<{ tickets: FeedbackTicketSummary[]; total: number }> {
  const search = new URLSearchParams({ scope })
  if (params?.limit !== undefined) {
    search.set('limit', String(params.limit))
  }
  if (params?.offset !== undefined) {
    search.set('offset', String(params.offset))
  }
  return requestJson(`/api/feedback/tickets?${search.toString()}`, { accessToken })
}

export async function fetchFeedbackTicket(
  ticketId: number,
  accessToken: string,
): Promise<{ ticket: FeedbackTicketDetail }> {
  return requestJson(`/api/feedback/tickets/${ticketId}`, { accessToken })
}

export async function createFeedbackTicket(
  accessToken: string,
  payload: CreateFeedbackPayload,
): Promise<{ ticket: FeedbackTicketDetail }> {
  const form = new FormData()
  form.append('type', payload.type)
  form.append('message', payload.message)
  if (payload.pagePath) {
    form.append('pagePath', payload.pagePath)
  }
  if (payload.userAgent) {
    form.append('userAgent', payload.userAgent)
  }
  if (payload.deviceClass) {
    form.append('deviceClass', payload.deviceClass)
  }
  if (payload.osLabel) {
    form.append('osLabel', payload.osLabel)
  }
  if (payload.browserLabel) {
    form.append('browserLabel', payload.browserLabel)
  }
  if (payload.consoleText) {
    form.append('consoleText', payload.consoleText)
  }
  if (payload.type === 'bug' && payload.screenshot) {
    form.append('screenshot', payload.screenshot)
  }
  return requestJson('/api/feedback/tickets', {
    method: 'POST',
    accessToken,
    body: form,
  })
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
