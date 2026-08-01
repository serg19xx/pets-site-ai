<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const authUiReady = useAuthUiReady()
const route = useRoute()
const localePath = useLocalePath()

const signUpTo = computed(() => {
  const redirect = encodeURIComponent(route.fullPath)
  return localePath({
    path: '/app/auth',
    query: { mode: 'register', redirect },
  })
})
</script>

<template>
  <aside class="w-72 shrink-0 p-4">
    <div
      v-if="!authUiReady"
      class="ui-panel min-h-[9.5rem]"
      aria-hidden="true"
    />

    <div
      v-else-if="auth.isGuest"
      class="ui-panel"
    >
      <h2 class="ui-panel-title">
        {{ $t('aside.joinTitle') }}
      </h2>
      <p class="ui-page-subtitle mt-2">
        {{ $t('aside.joinText') }}
      </p>
      <NuxtLink
        :to="signUpTo"
        class="ui-btn-primary ui-btn-sm ui-btn-block mt-4"
      >
        {{ $t('aside.createAccount') }}
      </NuxtLink>
    </div>

    <UnderConstructionPanel
      v-else
      compact
      :title="$t('aside.tipsTitle')"
      :purpose="$t('aside.tipsPurpose')"
    />
  </aside>
</template>
