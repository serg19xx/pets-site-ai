import { apiUrl } from '~/lib/api'
import type { UserGender, UserProfile } from '~/types/user'

export interface RegisterPayload {
  fullName: string
  nickname?: string
  gender: UserGender
  dateOfBirth: string
  phone?: string
  email: string
}

export interface AuthSession {
  accessToken: string
  user: UserProfile
  mustChangePassword: boolean
}

export interface UpdateProfilePayload {
  fullName: string
  nickname?: string
  phone?: string
  gender: UserGender
  dateOfBirth: string
  showFullName: boolean
  showNickname: boolean
  showEmail: boolean
  showPhone: boolean
  showGender: boolean
  showDateOfBirth: boolean
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

function authHeaders(accessToken?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }
  return headers
}

async function requestApi<T>(
  path: string,
  init: RequestInit & { accessToken?: string },
): Promise<T> {
  const { accessToken, ...fetchInit } = init
  const response = await fetch(apiUrl(path), {
    ...fetchInit,
    headers: {
      ...authHeaders(accessToken),
      ...(fetchInit.headers as Record<string, string> | undefined),
    },
  })

  const body = await parseJson<T & ApiErrorBody>(response)

  if (!response.ok) {
    throw new ApiError(
      body.message ?? 'Request failed',
      response.status,
      body.code,
    )
  }

  return body as T
}

export async function registerUser(
  payload: RegisterPayload,
): Promise<{ message: string }> {
  return requestApi('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthSession> {
  return requestApi('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return requestApi('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  return requestApi('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function magicLogin(token: string): Promise<AuthSession> {
  return requestApi('/api/auth/magic-login', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function fetchMe(
  accessToken: string,
): Promise<{ user: UserProfile; mustChangePassword: boolean }> {
  return requestApi('/api/auth/me', { method: 'GET', accessToken })
}

export async function uploadAvatar(
  accessToken: string,
  file: File,
): Promise<{ user: UserProfile }> {
  const form = new FormData()
  form.append('file', file)

  const response = await fetch(apiUrl('/api/auth/avatar'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })

  const body = (await response.json()) as { user?: UserProfile } & ApiErrorBody
  if (!response.ok) {
    throw new ApiError(body.message ?? 'Upload failed', response.status, body.code)
  }
  if (!body.user) {
    throw new ApiError('Invalid server response', response.status)
  }
  return { user: body.user }
}

export async function removeAvatar(accessToken: string): Promise<{ user: UserProfile }> {
  return requestApi('/api/auth/avatar', {
    method: 'DELETE',
    accessToken,
  })
}

export async function updateProfile(
  accessToken: string,
  payload: UpdateProfilePayload,
): Promise<{ user: UserProfile }> {
  return requestApi('/api/auth/profile', {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify(payload),
  })
}

export async function syncTimezone(
  accessToken: string,
  timezone: string,
): Promise<{ user: UserProfile }> {
  return requestApi('/api/auth/timezone', {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify({ timezone }),
  })
}

export async function changePassword(
  accessToken: string,
  newPassword: string,
  currentPassword?: string,
): Promise<{ message: string }> {
  const body: { newPassword: string; currentPassword?: string } = { newPassword }
  if (currentPassword) {
    body.currentPassword = currentPassword
  }
  return requestApi('/api/auth/change-password', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(body),
  })
}
