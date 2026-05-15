<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

type AuthMode = 'login' | 'register' | 'reset'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const tabs: { mode: AuthMode; label: string }[] = [
  { mode: 'login', label: 'Log in' },
  { mode: 'register', label: 'Sign up' },
  { mode: 'reset', label: 'Password' },
]

const mode = computed<AuthMode>(() => {
  const value = route.query.mode
  if (value === 'register' || value === 'reset') {
    return value
  }
  return 'login'
})

const resetSent = ref(false)

const email = ref('')
const password = ref('')
const fullName = ref('')
const nickname = ref('')

function setMode(next: AuthMode) {
  resetSent.value = false
  router.replace({ name: 'auth', query: { mode: next } })
}

function handleLogin() {
  auth.signInMock({ email: email.value, nickname: nickname.value || undefined })
  router.push('/')
}

function handleRegister() {
  auth.signInMock({ email: email.value, nickname: nickname.value || fullName.value })
  router.push('/')
}

function handleReset() {
  resetSent.value = true
}

const heading = computed(() => {
  if (mode.value === 'login') {
    return 'Welcome back'
  }
  if (mode.value === 'register') {
    return 'Create your account'
  }
  return 'Reset password'
})
</script>

<template>
  <section class="mx-auto max-w-md">
    <RouterLink
      to="/"
      class="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
    >
      ← Back
    </RouterLink>

    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <nav
        class="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
        aria-label="Authentication"
      >
        <button
          v-for="tab in tabs"
          :key="tab.mode"
          type="button"
          class="min-w-0 flex-1 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium transition-colors"
          :class="
            mode === tab.mode
              ? 'bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-slate-100'
              : 'text-slate-600 dark:text-slate-400'
          "
          @click="setMode(tab.mode)"
        >
          {{ tab.label }}
        </button>
      </nav>

      <h1 class="text-xl font-semibold">{{ heading }}</h1>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
        <template v-if="mode === 'reset'">
          We will send a reset link to your email (UI only until API is connected).
        </template>
        <template v-else>
          Submit uses a temporary demo sign-in until the API is ready.
        </template>
      </p>

      <form
        v-if="mode === 'login'"
        class="mt-6 space-y-4"
        @submit.prevent="handleLogin"
      >
        <label class="block text-sm font-medium">
          Email
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
        </label>
        <label class="block text-sm font-medium">
          Password
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
        </label>
        <button
          type="submit"
          class="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Log in
        </button>
      </form>

      <form
        v-else-if="mode === 'register'"
        class="mt-6 space-y-4"
        @submit.prevent="handleRegister"
      >
        <label class="block text-sm font-medium">
          Full name
          <input
            v-model="fullName"
            type="text"
            required
            autocomplete="name"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
        </label>
        <label class="block text-sm font-medium">
          Nickname
          <input
            v-model="nickname"
            type="text"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
        </label>
        <label class="block text-sm font-medium">
          Email
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
        </label>
        <label class="block text-sm font-medium">
          Password
          <input
            v-model="password"
            type="password"
            required
            autocomplete="new-password"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
        </label>
        <button
          type="submit"
          class="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Sign up
        </button>
      </form>

      <form
        v-else
        class="mt-6 space-y-4"
        @submit.prevent="handleReset"
      >
        <p
          v-if="resetSent"
          class="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
          role="status"
        >
          If an account exists for this email, you will receive instructions shortly.
        </p>
        <label class="block text-sm font-medium">
          Email
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
        </label>
        <button
          type="submit"
          class="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Send reset link
        </button>
      </form>
    </div>
  </section>
</template>
