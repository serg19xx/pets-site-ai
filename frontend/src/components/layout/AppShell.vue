<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppAside from './AppAside.vue'
import AppBottomNav from './AppBottomNav.vue'
import AppHeader from './AppHeader.vue'
import AppNav from './AppNav.vue'
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <slot name="header">
      <AppHeader />
    </slot>

    <div class="mx-auto flex w-full max-w-7xl flex-1">
      <slot name="sidebar-left">
        <AppNav class="hidden lg:block" />
      </slot>

      <main class="min-w-0 flex-1 px-4 py-4 pb-20 lg:pb-4">
        <slot>
          <RouterView />
        </slot>
      </main>

      <slot name="sidebar-right">
        <AppAside class="hidden lg:block" />
      </slot>
    </div>

    <slot name="bottom-nav">
      <AppBottomNav class="lg:hidden" />
    </slot>
  </div>
</template>
