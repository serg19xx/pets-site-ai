<script setup lang="ts">
import { RouterLink } from 'vue-router'

/** Public site navigation (profile lives under header avatar menu after login). */
const navItems = [
  { name: 'gallery', to: '/', label: 'Animals', icon: '🐾' },
  { name: 'feed', to: '/feed', label: 'Feed', icon: '📰' },
  { name: 'learn', to: '/learn', label: 'Learn', icon: '📚' },
] as const
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
    aria-label="Main navigation"
  >
    <ul class="mx-auto flex h-16 max-w-lg items-stretch justify-around">
      <li v-for="item in navItems" :key="item.name" class="flex flex-1">
        <RouterLink
          :to="item.to"
          class="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium text-slate-600 dark:text-slate-400"
          active-class="!text-emerald-700 dark:!text-emerald-400"
        >
          <span class="text-xl" aria-hidden="true">{{ item.icon }}</span>
          {{ item.label }}
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
