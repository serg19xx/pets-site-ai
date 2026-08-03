import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { AuthSession } from '~/lib/auth'
import { loadAdminAuth, saveAdminAuth } from '~/lib/auth-storage'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthSession['user'] | null>(null)
  const accessToken = ref<string | null>(null)
  const isHydrated = ref(false)

  const isAuthenticated = computed(
    () => Boolean(accessToken.value && user.value?.email),
  )

  const displayName = computed(() => {
    if (!user.value) {
      return ''
    }
    return user.value.nickname.trim() || user.value.fullName.trim()
  })

  function hydrateFromStorage() {
    const next = loadAdminAuth()
    if (next) {
      user.value = {
        ...next.user,
        timezone: null,
      }
      accessToken.value = next.accessToken
    } else {
      user.value = null
      accessToken.value = null
    }
    isHydrated.value = true
  }

  function setSession(session: AuthSession) {
    user.value = session.user
    accessToken.value = session.accessToken
    saveAdminAuth({
      accessToken: session.accessToken,
      user: {
        id: session.user.id,
        fullName: session.user.fullName,
        nickname: session.user.nickname,
        email: session.user.email,
        isBetaTester: Boolean(session.user.isBetaTester),
        isAdmin: Boolean(session.user.isAdmin),
      },
    })
    isHydrated.value = true
  }

  function signOut() {
    user.value = null
    accessToken.value = null
    saveAdminAuth(null)
    isHydrated.value = true
  }

  return {
    user,
    accessToken,
    isHydrated,
    isAuthenticated,
    displayName,
    hydrateFromStorage,
    setSession,
    signOut,
  }
})
