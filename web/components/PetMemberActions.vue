<script setup lang="ts">
import LikeButton from '~/components/LikeButton.vue'
import { useAuthStore } from '~/stores/auth'

defineProps<{
  petId: number
  petName?: string
}>()

const auth = useAuthStore()
const authUiReady = useAuthUiReady()
</script>

<template>
  <div
    v-if="authUiReady && auth.isAuthenticated"
    class="ui-pet-member-actions"
    role="toolbar"
    :aria-label="$t('pet.memberActions')"
  >
    <LikeButton :pet-id="petId" :pet-name="petName" />
  </div>
</template>
