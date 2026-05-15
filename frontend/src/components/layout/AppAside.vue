<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <aside class="w-72 shrink-0 border-l border-slate-200 p-4 dark:border-slate-800">
    <slot>
      <div
        v-if="auth.isGuest"
        class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Join PETS</h2>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Sign up to like posts, comment, and share your pets.
        </p>
        <RouterLink
          :to="{ name: 'auth', query: { mode: 'register' } }"
          class="mt-4 block rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700"
        >
          Create account
        </RouterLink>
      </div>

      <p v-else class="text-sm text-slate-500 dark:text-slate-400">
        Tips and suggestions will appear here.
      </p>
    </slot>
  </aside>
</template>
