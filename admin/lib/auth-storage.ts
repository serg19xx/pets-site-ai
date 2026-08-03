export const AUTH_STORAGE_KEY = 'pets_admin_auth'

export interface StoredAdminAuth {
  accessToken: string
  user: {
    id: number
    fullName: string
    nickname: string
    email: string
    isBetaTester: boolean
    isAdmin: boolean
  }
}

export function loadAdminAuth(): StoredAdminAuth | null {
  if (typeof localStorage === 'undefined') {
    return null
  }
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const data = JSON.parse(raw) as StoredAdminAuth
    if (!data?.accessToken || !data?.user?.email) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
    return data
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function saveAdminAuth(data: StoredAdminAuth | null) {
  if (typeof localStorage === 'undefined') {
    return
  }
  if (!data) {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data))
}
