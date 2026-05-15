<script setup lang="ts">
import { RouterLink } from 'vue-router'

const navItems = [
  { name: 'gallery', to: '/', label: 'Animals', icon: '🐾' },
  { name: 'feed', to: '/feed', label: 'Feed', icon: '📰' },
  { name: 'learn', to: '/learn', label: 'Learn', icon: '📚' },
] as const
</script>

<template>
  <nav class="w-56 shrink-0 border-r border-slate-200 p-4 dark:border-slate-800">
    <ul class="space-y-1">
      <li v-for="item in navItems" :key="item.name">
        <RouterLink
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          active-class="!bg-emerald-50 !text-emerald-800 dark:!bg-emerald-950/50 dark:!text-emerald-300"
        >
          <span class="text-lg" aria-hidden="true">{{ item.icon }}</span>
          {{ item.label }}
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
