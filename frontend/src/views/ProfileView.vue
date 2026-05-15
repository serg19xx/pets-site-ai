<script setup lang="ts">
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

function signOut() {
  auth.signOut()
  router.push('/')
}
</script>

<template>
  <section class="mx-auto max-w-md">
    <h1 class="text-xl font-semibold">Profile</h1>
    <p v-if="auth.user" class="mt-2 text-sm text-slate-600 dark:text-slate-400">
      {{ auth.user.nickname }} · {{ auth.user.email }}
    </p>
    <button
      type="button"
      class="mt-6 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
      @click="signOut"
    >
      Log out
    </button>
  </section>
</template>
