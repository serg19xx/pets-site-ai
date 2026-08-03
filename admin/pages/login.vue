<script setup lang="ts">
import { ApiError, fetchAdminMe, loginAdmin } from '~/lib/auth'

definePageMeta({ middleware: 'admin' })

const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const isSubmitting = ref(false)

async function onSubmit() {
  if (isSubmitting.value) {
    return
  }
  isSubmitting.value = true
  error.value = ''
  try {
    const session = await loginAdmin(email.value.trim(), password.value)
    await fetchAdminMe(session.accessToken)
    auth.setSession(session)
    await navigateTo('/feedback')
  } catch (err) {
    auth.signOut()
    error.value =
      err instanceof ApiError
        ? err.status === 403
          ? 'This account is not an admin.'
          : err.message
        : 'Login failed.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="mx-auto mt-16 max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
    <h1 class="text-xl font-semibold text-zinc-900">Admin sign in</h1>
    <p class="mt-2 text-sm text-zinc-600">
      For operators only. Testers use the main Pet Friends site.
    </p>
    <form class="mt-6 flex flex-col gap-3" @submit.prevent="onSubmit">
      <label class="flex flex-col gap-1 text-sm">
        Email
        <input
          v-model="email"
          type="email"
          required
          autocomplete="username"
          class="rounded border border-zinc-300 px-3 py-2"
        />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        Password
        <input
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="rounded border border-zinc-300 px-3 py-2"
        />
      </label>
      <p v-if="error" class="text-sm text-red-700" role="alert">{{ error }}</p>
      <button
        type="submit"
        class="rounded bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </section>
</template>
