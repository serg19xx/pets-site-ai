<script setup lang="ts">
import { RouterLink } from 'vue-router'

import loginIconSrc from '@/assets/icons/icon-login.png'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
  >
    <div class="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
      <RouterLink
        to="/"
        class="text-lg font-bold tracking-tight text-emerald-700 dark:text-emerald-400"
      >
        PETS
      </RouterLink>

      <div class="flex-1" />

      <!-- Guest: open-door icon = log in -->
      <RouterLink
        v-if="auth.isGuest"
        :to="{ name: 'auth', query: { mode: 'login' } }"
        class="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Log in"
        title="Log in"
      >
        <img
          :src="loginIconSrc"
          alt=""
          class="h-6 w-6 object-contain"
          width="24"
          height="24"
        />
      </RouterLink>

      <!-- Signed in: filled avatar (initial until photo is added). -->
      <RouterLink
        v-else
        to="/profile"
        class="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        :aria-label="`Your profile: ${auth.user?.nickname}`"
        :title="auth.user?.nickname"
      >
        {{ auth.avatarLabel }}
        <span
          class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-950"
          aria-hidden="true"
        />
      </RouterLink>
    </div>
  </header>
</template>
