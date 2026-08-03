import { apiUrl } from '~/lib/api'

export interface AdminUser {
  id: number
  fullName: string
  nickname: string
  email: string
  isBetaTester: boolean
  isAdmin: boolean
  timezone: string | null
}

export interface AuthSession {
  accessToken: string
  user: AdminUser
  mustChangePassword: boolean
}

interface ApiErrorBody {
  code?: string
  message?: string
}

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export async function loginAdmin(
  email: string,
  password: string,
): Promise<AuthSession> {
  const response = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, audience: 'admin' }),
  })
  const body = await parseJson<AuthSession & ApiErrorBody>(response)
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Login failed', response.status, body.code)
  }
  return body as AuthSession
}

export async function fetchAdminMe(accessToken: string): Promise<{ isAdmin: true }> {
  const response = await fetch(apiUrl('/api/admin/me'), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const body = await parseJson<{ isAdmin?: boolean } & ApiErrorBody>(response)
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Not an admin', response.status, body.code)
  }
  return { isAdmin: true }
}

export async function fetchSession(accessToken: string): Promise<{
  user: AdminUser
  mustChangePassword: boolean
}> {
  const response = await fetch(apiUrl('/api/auth/me'), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const body = await parseJson<
    { user: AdminUser; mustChangePassword: boolean } & ApiErrorBody
  >(response)
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Session failed', response.status, body.code)
  }
  return body as { user: AdminUser; mustChangePassword: boolean }
}
