import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface AuthUser {
  email: string
  nickname: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)

  const isAuthenticated = computed(() => user.value !== null)
  const isGuest = computed(() => !isAuthenticated.value)

  const avatarLabel = computed(() => {
    if (!user.value) {
      return ''
    }
    const source = user.value.nickname.trim() || user.value.email
    return source.charAt(0).toUpperCase()
  })

  /** Temporary until API auth exists. */
  function signInMock(payload: { email: string; nickname?: string }) {
    const nickname = payload.nickname?.trim() || payload.email.split('@')[0] || 'User'
    user.value = { email: payload.email.trim().toLowerCase(), nickname }
  }

  function signOut() {
    user.value = null
  }

  return { user, isAuthenticated, isGuest, avatarLabel, signInMock, signOut }
})
