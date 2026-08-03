<script setup lang="ts">
import AppAside from '~/components/layout/AppAside.vue'
import AppBottomNav from '~/components/layout/AppBottomNav.vue'
import AppHeader from '~/components/layout/AppHeader.vue'
import AppNav from '~/components/layout/AppNav.vue'
import FeedbackFab from '~/components/FeedbackFab.vue'
</script>

<template>
  <div class="ui-shell">
    <AppHeader />

    <div class="ui-shell-body">
      <AppNav class="hidden lg:block" />

      <main class="ui-shell-main">
        <slot />
      </main>

      <AppAside class="hidden lg:block" />
    </div>

    <AppBottomNav />
    <FeedbackFab />
  </div>
</template>
