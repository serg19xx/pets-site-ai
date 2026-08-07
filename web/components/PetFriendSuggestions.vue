<script setup lang="ts">
import PetAvatar from '~/components/PetAvatar.vue'
import { ApiError } from '~/lib/auth-api'
import {
  approveFriendshipSuggestion,
  declineFriendshipSuggestion,
  generateFriendshipSuggestions,
  listFriendshipSuggestions,
  type PetFriendshipSuggestion,
} from '~/lib/pet-friendships-api'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  petId: number
  virtualLifeEnabled: boolean
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()

const suggestions = ref<PetFriendshipSuggestion[]>([])
const isLoading = ref(false)
const isGenerating = ref(false)
const busyId = ref<number | null>(null)
const errorMessage = ref('')
const infoMessage = ref('')

async function loadSuggestions() {
  const token = auth.accessToken
  if (!token || !props.virtualLifeEnabled) {
    suggestions.value = []
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  try {
    const { suggestions: list } = await listFriendshipSuggestions(
      props.petId,
      token,
    )
    suggestions.value = list
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('pet.friendsSuggestionsLoadError')
  } finally {
    isLoading.value = false
  }
}

async function onFindFriends() {
  const token = auth.accessToken
  if (!token || isGenerating.value) {
    return
  }
  if (!props.virtualLifeEnabled) {
    errorMessage.value = t('pet.friendsSuggestionsNeedVirtualLife')
    return
  }
  isGenerating.value = true
  errorMessage.value = ''
  infoMessage.value = ''
  try {
    const { suggestions: list } = await generateFriendshipSuggestions(
      props.petId,
      token,
    )
    suggestions.value = list
    infoMessage.value =
      list.length === 0
        ? t('pet.friendsSuggestionsNone')
        : t('pet.friendsSuggestionsFound', { count: list.length })
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('pet.friendsSuggestionsGenerateError')
  } finally {
    isGenerating.value = false
  }
}

async function onApprove(suggestion: PetFriendshipSuggestion) {
  const token = auth.accessToken
  if (!token || busyId.value != null) {
    return
  }
  busyId.value = suggestion.id
  errorMessage.value = ''
  try {
    await approveFriendshipSuggestion(props.petId, suggestion.id, token)
    suggestions.value = suggestions.value.filter((s) => s.id !== suggestion.id)
    infoMessage.value = t('pet.friendsSuggestionsApproved', {
      name: suggestion.candidate.name,
    })
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('pet.friendsCreateError')
  } finally {
    busyId.value = null
  }
}

async function onDecline(suggestion: PetFriendshipSuggestion) {
  const token = auth.accessToken
  if (!token || busyId.value != null) {
    return
  }
  busyId.value = suggestion.id
  errorMessage.value = ''
  try {
    await declineFriendshipSuggestion(props.petId, suggestion.id, token)
    suggestions.value = suggestions.value.filter((s) => s.id !== suggestion.id)
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('pet.friendsSuggestionsDeclineError')
  } finally {
    busyId.value = null
  }
}

function candidatePath(id: number) {
  return localePath(`/animals/${id}`)
}

watch(
  () => [props.petId, props.virtualLifeEnabled, auth.accessToken] as const,
  () => {
    void loadSuggestions()
  },
  { immediate: true },
)
</script>

<template>
  <div class="ui-card space-y-3 p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold">{{ $t('pet.friendsSuggestionsTitle') }}</h2>
        <p class="ui-hint mt-1">{{ $t('pet.friendsSuggestionsHint') }}</p>
      </div>
      <button
        type="button"
        class="ui-btn ui-btn-sm ui-btn-secondary"
        :disabled="!virtualLifeEnabled || isGenerating || isLoading"
        @click="onFindFriends"
      >
        {{
          isGenerating
            ? $t('pet.friendsWorking')
            : $t('pet.friendsSuggestionsFind')
        }}
      </button>
    </div>

    <p v-if="!virtualLifeEnabled" class="ui-hint">
      {{ $t('pet.friendsSuggestionsNeedVirtualLife') }}
    </p>
    <p v-else-if="isLoading" class="ui-loading">{{ $t('common.loading') }}</p>
    <p v-if="errorMessage" class="ui-alert-error" role="alert">{{ errorMessage }}</p>
    <p v-else-if="infoMessage" class="ui-hint">{{ infoMessage }}</p>

    <ul
      v-if="virtualLifeEnabled && suggestions.length > 0"
      class="m-0 list-none space-y-2 p-0"
    >
      <li
        v-for="item in suggestions"
        :key="item.id"
        class="flex flex-wrap items-center justify-between gap-3 rounded-(--radius-card) border border-(--ui-border) px-3 py-2"
      >
        <NuxtLink
          :to="candidatePath(item.candidate.id)"
          class="flex min-w-0 items-center gap-3 text-inherit no-underline"
        >
          <PetAvatar :pet="item.candidate" size="sm" />
          <span class="min-w-0">
            <span class="block truncate font-medium">{{ item.candidate.name }}</span>
            <span class="block truncate text-sm text-(--ui-text-muted)">
              {{ item.candidate.species.label }}
            </span>
          </span>
        </NuxtLink>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="ui-btn ui-btn-sm ui-btn-primary"
            :disabled="busyId != null"
            @click="onApprove(item)"
          >
            {{ $t('pet.friendsSuggestionsApprove') }}
          </button>
          <button
            type="button"
            class="ui-btn ui-btn-sm ui-btn-ghost"
            :disabled="busyId != null"
            @click="onDecline(item)"
          >
            {{ $t('pet.friendsSuggestionsDecline') }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
