<script setup lang="ts">
import { UI_ACTION_ICONS } from '~/lib/ui-icons'

import AppUserMenu from '~/components/layout/AppUserMenu.vue'
import { useAuthStore } from '~/stores/auth'

const localePath = useLocalePath()
const auth = useAuthStore()
const authUiReady = useAuthUiReady()
</script>

<template>
  <span
    v-if="!authUiReady"
    class="ui-header-icon-btn pointer-events-none opacity-0"
    aria-hidden="true"
  />

  <NuxtLink
    v-else-if="auth.isGuest"
    :to="localePath('/login')"
    class="ui-header-icon-btn"
    :aria-label="$t('auth.logIn')"
    :title="$t('auth.logIn')"
  >
    <Icon :icon="UI_ACTION_ICONS.login" class="ui-icon-lg" aria-hidden="true" />
  </NuxtLink>

  <AppUserMenu v-else />
</template>
