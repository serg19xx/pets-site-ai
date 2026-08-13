import { apiUrl } from '~/lib/api'
import { ApiError } from '~/lib/auth-api'

interface ApiErrorBody {
  code?: string
  message?: string
}

export interface ContactPayload {
  name: string
  email: string
  message: string
  company?: string
}

export async function sendContactMessage(
  payload: ContactPayload,
): Promise<{ message: string }> {
  const response = await fetch(apiUrl('/api/contact'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = (await response.json()) as { message?: string } & ApiErrorBody
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Request failed', response.status, body.code)
  }
  return { message: body.message ?? 'Message sent.' }
}
