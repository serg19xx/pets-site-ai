<script setup lang="ts">
import { ApiError } from '~/lib/auth-api'
import { listPetAiDrafts } from '~/lib/pets-api'
import type { PetAiDraft } from '~/types/pet-ai-draft'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  petId: number
  /** When false, show a short inactive hint instead of loading. */
  virtualLifeEnabled?: boolean
}>()

const { t, te, locale } = useI18n()
const { formatIso } = useDateTime()
const auth = useAuthStore()
const authUiReady = useAuthUiReady()

const drafts = ref<PetAiDraft[]>([])
const total = ref(0)
const isLoading = ref(false)
const errorMessage = ref('')

function templateLabel(key: string): string {
  const i18nKey = `myPets.aiDrafts.templates.${key}`
  return te(i18nKey) ? t(i18nKey) : key
}

function draftBody(draft: PetAiDraft): string {
  const isFr = String(locale.value).toLowerCase().startsWith('fr')
  if (isFr && draft.bodyFr) {
    return draft.bodyFr
  }
  return draft.body
}

async function load() {
  if (!auth.accessToken || props.virtualLifeEnabled === false) {
    drafts.value = []
    total.value = 0
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  try {
    const result = await listPetAiDrafts(auth.accessToken, props.petId, {
      limit: 20,
    })
    drafts.value = result.drafts
    total.value = result.total
  } catch (error) {
    if (error instanceof ApiError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = t('myPets.aiDrafts.loadError')
    }
  } finally {
    isLoading.value = false
  }
}

watch(
  () =>
    [
      props.petId,
      props.virtualLifeEnabled,
      authUiReady.value,
      auth.accessToken,
    ] as const,
  ([id, virtual, ready, token]) => {
    if (ready && token && id && virtual !== false) {
      void load()
    } else if (virtual === false) {
      drafts.value = []
      total.value = 0
      errorMessage.value = ''
    }
  },
  { immediate: true },
)

defineExpose({ reload: load })
</script>

<template>
  <div class="space-y-3 border-t border-(--ui-border) pt-6">
    <div>
      <h3 class="text-base font-semibold">{{ $t('myPets.aiDrafts.title') }}</h3>
      <p class="ui-hint mt-1">{{ $t('myPets.aiDrafts.hint') }}</p>
    </div>

    <p
      v-if="virtualLifeEnabled === false"
      class="ui-hint"
    >
      {{ $t('myPets.aiDrafts.virtualOff') }}
    </p>

    <template v-else>
      <p v-if="errorMessage" class="ui-error" role="alert">{{ errorMessage }}</p>
      <div v-if="isLoading" class="ui-hint">{{ $t('common.loading') }}</div>
      <p v-else-if="drafts.length === 0" class="ui-hint">
        {{ $t('myPets.aiDrafts.empty') }}
      </p>
      <ul v-else class="space-y-4" role="list">
        <li
          v-for="draft in drafts"
          :key="draft.id"
          class="rounded-lg border border-(--ui-border) bg-(--ui-surface-inset) p-3"
        >
          <div class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <span class="text-sm font-semibold">
              {{ templateLabel(draft.templateKey) }}
            </span>
            <time
              class="text-xs text-(--ui-muted) tabular-nums"
              :datetime="draft.createdAt"
            >
              {{ formatIso(draft.createdAt) }}
            </time>
          </div>
          <p class="text-sm leading-relaxed whitespace-pre-wrap">
            {{ draftBody(draft) }}
          </p>
        </li>
      </ul>
      <p
        v-if="!isLoading && total > drafts.length"
        class="ui-hint text-xs"
      >
        {{ $t('myPets.aiDrafts.showing', { shown: drafts.length, total }) }}
      </p>
    </template>
  </div>
</template>
