import { apiUrl } from '~/lib/api'
import { ApiError } from '~/lib/auth-api'
import type {
  MarketplaceInquirySummary,
  MarketplaceInquiryThread,
} from '~/types/marketplace-inquiry'

interface ApiErrorBody {
  code?: string
  message?: string
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
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
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string> | undefined),
    ...(authHeaders(accessToken) as Record<string, string>),
  }
  const response = await fetch(apiUrl(path), { ...rest, headers })
  const body = await parseJson<T & ApiErrorBody>(response)
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
  return body as T
}

function withPagination(params?: { limit?: number; offset?: number }): string {
  const search = new URLSearchParams()
  if (params?.limit !== undefined) {
    search.set('limit', String(params.limit))
  }
  if (params?.offset !== undefined) {
    search.set('offset', String(params.offset))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export async function fetchMarketplaceInquiries(
  accessToken: string,
  role: 'customer' | 'seller' | 'all' = 'all',
  params?: { limit?: number; offset?: number },
): Promise<{ inquiries: MarketplaceInquirySummary[]; total: number }> {
  const search = new URLSearchParams({ role })
  if (params?.limit !== undefined) {
    search.set('limit', String(params.limit))
  }
  if (params?.offset !== undefined) {
    search.set('offset', String(params.offset))
  }
  return requestJson(`/api/marketplace/inquiries?${search.toString()}`, { accessToken })
}

export async function fetchMarketplaceInquiryThread(
  inquiryId: number,
  accessToken: string,
): Promise<MarketplaceInquiryThread> {
  return requestJson(`/api/marketplace/inquiries/${inquiryId}`, { accessToken })
}

export async function sendListingInquiry(
  listingId: number,
  accessToken: string,
  body: string,
): Promise<MarketplaceInquiryThread> {
  return requestJson(`/api/marketplace/listings/${listingId}/inquiries`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ body }),
  })
}

export async function replyMarketplaceInquiry(
  inquiryId: number,
  accessToken: string,
  body: string,
): Promise<MarketplaceInquiryThread> {
  return requestJson(`/api/marketplace/inquiries/${inquiryId}/messages`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ body }),
  })
}
