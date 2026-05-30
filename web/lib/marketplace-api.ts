import { apiUrl } from '~/lib/api'
import { ApiError } from '~/lib/auth-api'
import type {
  CreateMarketplaceListingPayload,
  MarketplaceListing,
  UpdateMarketplaceListingPayload,
} from '~/types/marketplace'

interface ApiErrorBody {
  code?: string
  message?: string
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

function authHeaders(accessToken?: string): HeadersInit {
  const headers: Record<string, string> = {}
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }
  return headers
}

function appendListingFields(form: FormData, payload: CreateMarketplaceListingPayload): void {
  form.append('type', payload.type)
  form.append('title', payload.title)
  form.append('description', payload.description)
  if (payload.priceAmount !== undefined && payload.priceAmount !== null) {
    form.append('priceAmount', String(payload.priceAmount))
  }
  if (payload.priceCurrency) {
    form.append('priceCurrency', payload.priceCurrency)
  }
  if (payload.city) {
    form.append('city', payload.city)
  }
  if (payload.contactPhone) {
    form.append('contactPhone', payload.contactPhone)
  }
  if (payload.contactMethod) {
    form.append('contactMethod', payload.contactMethod)
  }
  if (payload.status) {
    form.append('status', payload.status)
  }
}

async function requestJson<T>(
  path: string,
  init: RequestInit & { accessToken?: string },
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

export async function fetchMarketplaceListings(params?: {
  limit?: number
  offset?: number
}): Promise<{ listings: MarketplaceListing[]; total: number }> {
  return requestJson(`/api/marketplace/listings${withPagination(params)}`, {})
}

export async function fetchMarketplaceListing(
  id: number,
  accessToken?: string,
): Promise<{ listing: MarketplaceListing }> {
  return requestJson(`/api/marketplace/listings/${id}`, { accessToken })
}

export async function fetchMyMarketplaceListings(
  accessToken: string,
  params?: { limit?: number; offset?: number },
): Promise<{ listings: MarketplaceListing[]; total: number }> {
  return requestJson(`/api/marketplace/listings/mine${withPagination(params)}`, { accessToken })
}

export async function createMarketplaceListing(
  accessToken: string,
  payload: CreateMarketplaceListingPayload,
  files: File[] = [],
): Promise<{ listing: MarketplaceListing }> {
  const form = new FormData()
  appendListingFields(form, payload)
  for (const file of files) {
    form.append('files', file)
  }
  return requestJson('/api/marketplace/listings', {
    method: 'POST',
    accessToken,
    body: form,
  })
}

export async function updateMarketplaceListing(
  id: number,
  accessToken: string,
  payload: UpdateMarketplaceListingPayload,
): Promise<{ listing: MarketplaceListing }> {
  return requestJson(`/api/marketplace/listings/${id}`, {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify(payload),
  })
}

export async function uploadMarketplaceListingMedia(
  id: number,
  accessToken: string,
  files: File[],
): Promise<{ listing: MarketplaceListing }> {
  const form = new FormData()
  for (const file of files) {
    form.append('files', file)
  }
  return requestJson(`/api/marketplace/listings/${id}/media`, {
    method: 'POST',
    accessToken,
    body: form,
  })
}

export async function deleteMarketplaceListingMedia(
  listingId: number,
  mediaId: number,
  accessToken: string,
): Promise<{ listing: MarketplaceListing }> {
  return requestJson(`/api/marketplace/listings/${listingId}/media/${mediaId}`, {
    method: 'DELETE',
    accessToken,
  })
}

export async function deleteMarketplaceListing(id: number, accessToken: string): Promise<void> {
  const response = await fetch(apiUrl(`/api/marketplace/listings/${id}`), {
    method: 'DELETE',
    headers: authHeaders(accessToken) as Record<string, string>,
  })
  if (response.status === 204) {
    return
  }
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody
  throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
}

export async function syncMarketplaceListingMedia(
  listingId: number,
  accessToken: string,
  newFiles: File[],
  removedMediaIds: number[],
): Promise<MarketplaceListing> {
  let listing: MarketplaceListing | null = null
  for (const mediaId of removedMediaIds) {
    const result = await deleteMarketplaceListingMedia(listingId, mediaId, accessToken)
    listing = result.listing
  }
  if (newFiles.length > 0) {
    const result = await uploadMarketplaceListingMedia(listingId, accessToken, newFiles)
    listing = result.listing
  }
  if (!listing) {
    const result = await fetchMarketplaceListing(listingId, accessToken)
    listing = result.listing
  }
  return listing
}
