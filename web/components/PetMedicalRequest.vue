<script setup lang="ts">
import { ApiError } from '~/lib/auth-api'
import {
  fetchRequesterMedicalStatus,
  requestPetMedicalRecords,
} from '~/lib/pets-api'
import { useAuthStore } from '~/stores/auth'
import type { RequesterMedicalStatus } from '~/types/pet-medical'

const props = defineProps<{
  petId: number
  petName: string
  ownerUserId?: number
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()
const { formatIso } = useDateTime()

const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const status = ref<RequesterMedicalStatus | null>(null)

const isOwnPet = computed(() => {
  const myId = auth.user?.id
  return Boolean(myId && props.ownerUserId && myId === props.ownerUserId)
})

const shareTo = computed(() => {
  const path = status.value?.sharePath
  return path ? localePath(path) : null
})

async function loadStatus() {
  const token = auth.accessToken
  if (!token || isOwnPet.value) {
    return
  }
  try {
    status.value = await fetchRequesterMedicalStatus(props.petId, token)
  } catch {
    status.value = null
  }
}

watch(
  () => [props.petId, auth.accessToken, isOwnPet.value] as const,
  () => {
    void loadStatus()
  },
  { immediate: true },
)

async function onRequest() {
  const token = auth.accessToken
  if (!token || isSubmitting.value || isOwnPet.value) {
    return
  }
  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await requestPetMedicalRecords(props.petId, token)
    successMessage.value = t('pet.medicalRequestSent', { name: props.petName })
    await loadStatus()
  } catch (err) {
    errorMessage.value =
      err instanceof ApiError ? err.message : t('pet.medicalRequestError')
  } finally {
    isSubmitting.value = false
  }
}

const canRequest = computed(() => {
  const current = status.value?.status ?? 'none'
  return current === 'none' || current === 'expired' || current === 'declined'
})
</script>

<template>
  <section class="ui-pet-dossier-block">
    <h2 class="ui-section-title">{{ $t('pet.medicalHeading') }}</h2>
    <p class="ui-hint mt-2">{{ $t('pet.medicalPrivateHint') }}</p>
    <p v-if="isOwnPet" class="ui-hint mt-2">
      {{ $t('pet.medicalOwnPetHint') }}
    </p>
    <template v-else>
      <p v-if="errorMessage" class="ui-alert-error mt-2" role="alert">
        {{ errorMessage }}
      </p>
      <p v-if="successMessage" class="ui-alert-success mt-2">
        {{ successMessage }}
      </p>
      <p v-if="status?.status === 'pending'" class="ui-hint mt-2">
        {{ $t('pet.medicalRequestPending') }}
      </p>
      <p v-else-if="status?.status === 'declined'" class="ui-hint mt-2">
        {{ $t('pet.medicalRequestDeclined') }}
      </p>
      <p v-else-if="status?.status === 'expired'" class="ui-hint mt-2">
        {{ $t('pet.medicalShareExpiredHint') }}
      </p>
      <template v-if="status?.status === 'approved' && shareTo">
        <p class="ui-hint mt-2">
          {{
            $t('pet.medicalShareReady', {
              when: status.expiresAt ? formatIso(status.expiresAt) : '',
            })
          }}
        </p>
        <NuxtLink :to="shareTo" class="ui-btn ui-btn-sm ui-btn-secondary mt-3">
          {{ $t('pet.medicalShareOpen') }}
        </NuxtLink>
      </template>
      <button
        v-else-if="canRequest"
        type="button"
        class="ui-btn ui-btn-sm ui-btn-secondary mt-3"
        :disabled="isSubmitting"
        @click="onRequest"
      >
        {{
          isSubmitting
            ? $t('pet.medicalRequestWorking')
            : $t('pet.medicalRequestCta')
        }}
      </button>
    </template>
  </section>
</template>
