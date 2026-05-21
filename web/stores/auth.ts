import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { AuthSession } from '~/lib/auth-api'
import { loadAuthFromStorage, saveAuthToStorage, type StoredAuth } from '~/lib/auth-storage'
import { resolveDisplayName, type UserProfile } from '~/types/user'

function loadStored(): StoredAuth | null {
  return loadAuthFromStorage()
}

function persist(state: StoredAuth | null) {
  saveAuthToStorage(state)
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(null)
  const accessToken = ref<string | null>(null)
  const mustChangePassword = ref(false)
  const isHydrated = ref(false)

  const isAuthenticated = computed(() => {
    const token = accessToken.value
    const profile = user.value
    return (
      typeof token === 'string' &&
      token.length > 0 &&
      profile !== null &&
      typeof profile.id === 'number' &&
      typeof profile.email === 'string' &&
      profile.email.length > 0
    )
  })
  const isGuest = computed(() => !isAuthenticated.value)

  const displayName = computed(() => {
    if (!user.value) {
      return ''
    }
    return resolveDisplayName(user.value.fullName, user.value.nickname)
  })

  const avatarLabel = computed(() => {
    const name = user.value?.fullName.trim() || user.value?.email || ''
    return name.charAt(0).toUpperCase()
  })

  function hydrateFromStorage() {
    const next = loadStored()
    if (next) {
      user.value = next.user
      accessToken.value = next.accessToken
      mustChangePassword.value = next.mustChangePassword
    } else {
      user.value = null
      accessToken.value = null
      mustChangePassword.value = false
    }
    isHydrated.value = true
  }

  function setSession(session: AuthSession) {
    user.value = session.user
    accessToken.value = session.accessToken
    mustChangePassword.value = session.mustChangePassword
    persist({
      accessToken: session.accessToken,
      user: session.user,
      mustChangePassword: session.mustChangePassword,
    })
    isHydrated.value = true
  }

  function updateUser(next: UserProfile) {
    user.value = next
    if (accessToken.value) {
      persist({
        accessToken: accessToken.value,
        user: next,
        mustChangePassword: mustChangePassword.value,
      })
    }
  }

  function clearMustChangePassword() {
    mustChangePassword.value = false
    if (accessToken.value && user.value) {
      persist({
        accessToken: accessToken.value,
        user: user.value,
        mustChangePassword: false,
      })
    }
  }

  function signOut() {
    user.value = null
    accessToken.value = null
    mustChangePassword.value = false
    persist(null)
    isHydrated.value = true
  }

  return {
    user,
    accessToken,
    mustChangePassword,
    isHydrated,
    isAuthenticated,
    isGuest,
    displayName,
    avatarLabel,
    hydrateFromStorage,
    setSession,
    updateUser,
    clearMustChangePassword,
    signOut,
  }
})
