import type { UserProfile } from '~/types/user'

export const AUTH_STORAGE_KEY = 'pets_auth'

export interface StoredAuth {
  accessToken: string
  user: UserProfile
  mustChangePassword: boolean
}

function normalizeUser(raw: unknown): UserProfile | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const row = raw as Record<string, unknown>
  const id = Number(row.id)
  const email = typeof row.email === 'string' ? row.email.trim() : ''
  if (!Number.isFinite(id) || id < 1 || !email) {
    return null
  }
  return {
    ...row,
    id,
    email,
  } as UserProfile
}

function normalizeStored(data: unknown): StoredAuth | null {
  if (!data || typeof data !== 'object') {
    return null
  }
  const row = data as Record<string, unknown>
  const token = row.accessToken
  const user = normalizeUser(row.user)
  if (typeof token !== 'string' || !token || !user) {
    return null
  }
  return {
    accessToken: token,
    user,
    mustChangePassword: Boolean(row.mustChangePassword),
  }
}

export function loadAuthFromStorage(): StoredAuth | null {
  if (typeof localStorage === 'undefined') {
    return null
  }
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const stored = normalizeStored(JSON.parse(raw))
    if (!stored) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
    return stored
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function saveAuthToStorage(data: StoredAuth | null) {
  if (typeof localStorage === 'undefined') {
    return
  }
  if (!data) {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return
  }
  const user = normalizeUser(data.user)
  if (!user || !data.accessToken) {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return
  }
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      accessToken: data.accessToken,
      user,
      mustChangePassword: data.mustChangePassword,
    }),
  )
}
