<script setup lang="ts">
import { ApiError } from '~/lib/auth-api'
import { getPetPersonality, updatePetPersonality } from '~/lib/pets-api'
import {
  PERSONALITY_TRAITS,
  type PersonalityTrait,
  type PetPersonality,
} from '~/types/pet-personality'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  petId: number
}>()

const { t } = useI18n()
const auth = useAuthStore()
const authUiReady = useAuthUiReady()

const values = ref<Record<PersonalityTrait, number>>({
  energy: 5,
  friendliness: 5,
  curiosity: 5,
  confidence: 5,
  humor: 5,
  talkativeness: 5,
  affection: 5,
  playfulness: 5,
  bravery: 5,
  patience: 5,
})

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const updatedAt = ref<string | null>(null)

function applyPersonality(p: PetPersonality) {
  for (const trait of PERSONALITY_TRAITS) {
    values.value[trait] = p[trait]
  }
  updatedAt.value = p.updatedAt
}

async function load() {
  if (!auth.accessToken) {
    return
  }
  isLoading.value = true
  errorMessage.value = ''
  try {
    const { personality } = await getPetPersonality(auth.accessToken, props.petId)
    applyPersonality(personality)
  } catch (error) {
    if (error instanceof ApiError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = t('myPets.personality.loadError')
    }
  } finally {
    isLoading.value = false
  }
}

async function save() {
  if (!auth.accessToken) {
    return
  }
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const { personality } = await updatePetPersonality(auth.accessToken, props.petId, {
      ...values.value,
    })
    applyPersonality(personality)
    successMessage.value = t('myPets.personality.saved')
  } catch (error) {
    if (error instanceof ApiError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = t('myPets.personality.saveError')
    }
  } finally {
    isSaving.value = false
  }
}

watch(
  () => [props.petId, authUiReady.value, auth.accessToken] as const,
  ([id, ready, token]) => {
    if (ready && token && id) {
      void load()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="mt-2 space-y-4">
    <p class="ui-hint">{{ $t('myPets.personality.hint') }}</p>

    <p v-if="errorMessage" class="ui-error" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" class="ui-alert-success">{{ successMessage }}</p>

    <div v-if="isLoading" class="ui-hint">{{ $t('common.loading') }}</div>

    <form
      v-else
      class="space-y-5"
      @submit.prevent="save"
    >
      <div
        v-for="trait in PERSONALITY_TRAITS"
        :key="trait"
        class="grid gap-1 sm:grid-cols-[minmax(0,9rem)_1fr_2rem] sm:items-center sm:gap-3"
      >
        <label class="text-sm font-medium" :for="`personality-${trait}`">
          {{ $t(`myPets.personality.traits.${trait}`) }}
        </label>
        <input
          :id="`personality-${trait}`"
          v-model.number="values[trait]"
          type="range"
          min="1"
          max="10"
          step="1"
          class="w-full accent-(--ui-accent)"
        />
        <span class="text-sm tabular-nums text-(--ui-muted)">{{ values[trait] }}</span>
      </div>

      <div class="ui-form-actions">
        <button
          type="submit"
          class="ui-btn-primary ui-btn-md"
          :disabled="isSaving"
        >
          {{ isSaving ? $t('common.saving') : $t('common.save') }}
        </button>
      </div>
    </form>
  </div>
</template>
