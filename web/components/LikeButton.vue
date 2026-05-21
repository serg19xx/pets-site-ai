<script setup lang="ts">
import { fetchPetLikeStatus, togglePetLike } from '~/lib/pet-likes-api'
import { ApiError } from '~/lib/auth-api'
import { UI_ACTION_ICONS } from '~/lib/ui-icons'
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

async function loadStatus() {
  const token = auth.accessToken
  if (!token) {
    liked.value = false
    count.value = 0
    isLoading.value = false
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    const status = await fetchPetLikeStatus(props.petId, token)
    liked.value = status.liked
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
  liked.value
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
      :disabled="isLoading || isToggling"
      :aria-pressed="liked"
      :aria-label="ariaLabel"
      @click="onToggle"
    >
      <Icon
        :icon="UI_ACTION_ICONS.heart"
        class="ui-like-btn-icon"
        aria-hidden="true"
      />
      <span v-if="count > 0" class="ui-like-btn-count">{{ count }}</span>
      <span class="sr-only">{{ liked ? $t('pet.unlike') : $t('pet.like') }}</span>
    </button>
    <p v-if="loadError" class="ui-like-error" role="alert">
      {{ loadError }}
    </p>
  </div>
</template>
