<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const authUiReady = useAuthUiReady()
</script>

<template>
  <div v-if="authUiReady && auth.isAuthenticated">
    <slot />
  </div>
</template>
