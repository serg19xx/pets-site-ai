<script setup lang="ts">
import { fetchPetLikeStatus, togglePetLike } from '~/lib/pet-likes-api'
import { ApiError } from '~/lib/auth-api'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  petId: number
  petName?: string
}>()

const { t } = useI18n()
const auth = useAuthStore()

const liked = ref(false)
const count = ref(0)
const isLoading = ref(true)
const isToggling = ref(false)
const loadError = ref('')

const labelName = computed(() => props.petName?.trim() || String(props.petId))
const canToggle = computed(() => Boolean(auth.accessToken))

async function loadStatus() {
  const token = auth.accessToken
  isLoading.value = true
  loadError.value = ''
  try {
    const status = await fetchPetLikeStatus(props.petId, token)
    liked.value = Boolean(token) && status.liked
    count.value = status.count
  } catch (err) {
    loadError.value =
      err instanceof ApiError ? err.message : t('pet.likeLoadError')
  } finally {
    isLoading.value = false
  }
}

async function onToggle() {
  const token = auth.accessToken
  if (!token || isToggling.value || isLoading.value) {
    return
  }
  isToggling.value = true
  loadError.value = ''
  const previousLiked = liked.value
  const previousCount = count.value
  liked.value = !previousLiked
  count.value = previousLiked ? Math.max(0, previousCount - 1) : previousCount + 1
  try {
    const status = await togglePetLike(props.petId, token)
    liked.value = status.liked
    count.value = status.count
  } catch (err) {
    liked.value = previousLiked
    count.value = previousCount
    loadError.value =
      err instanceof ApiError ? err.message : t('pet.likeToggleError')
  } finally {
    isToggling.value = false
  }
}

watch(
  () => [props.petId, auth.accessToken] as const,
  () => {
    void loadStatus()
  },
  { immediate: true },
)

const ariaLabel = computed(() =>
  !canToggle.value
    ? t('pet.likeCountAria', { name: labelName.value, count: count.value })
    : liked.value
    ? t('pet.unlikeAria', { name: labelName.value })
    : t('pet.likeAria', { name: labelName.value }),
)
</script>

<template>
  <div class="ui-like-control">
    <button
      type="button"
      class="ui-like-btn"
      :class="{ 'ui-like-btn--active': liked }"
      :disabled="isLoading || isToggling || !canToggle"
      :aria-pressed="liked"
      :aria-label="ariaLabel"
      @click="onToggle"
    >
      <svg
        viewBox="0 0 24 24"
        class="ui-like-btn-icon"
        :class="{ 'ui-like-btn-icon--active': liked }"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M19.5 12.5721L12 20L4.5 12.5721C3.0052 11.0921 2.75 8.79606 3.87868 7.01777C5.34777 4.70223 8.53553 4.19491 10.6716 5.96447L12 7.06531L13.3284 5.96447C15.4645 4.19491 18.6522 4.70223 20.1213 7.01777C21.25 8.79606 20.9948 11.0921 19.5 12.5721Z"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span v-if="count > 0" class="ui-like-btn-count">{{ count }}</span>
      <span class="sr-only">{{ liked ? $t('pet.unlike') : $t('pet.like') }}</span>
    </button>
    <p v-if="loadError" class="ui-like-error" role="alert">
      {{ loadError }}
    </p>
  </div>
</template>
